/**
 * RKG — per-garden MCP endpoint (Model Context Protocol, Streamable HTTP).
 *
 *   GET  /api/mcp/:garden  → human + machine discovery doc (how to connect, tools, pricing)
 *   POST /api/mcp/:garden  → JSON-RPC: initialize | tools/list | tools/call | ping
 *
 * Read-only. API-key gated with a free eval tier. Every tools/call is metered.
 * This is the surface external agents (Claude, Cursor, drones, etc.) connect to.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getGarden,
  GARDEN_IDS,
  MCP_PROTOCOL_VERSION,
  RKG_VERSION,
  RKG_PRICING,
  publicBaseUrl,
  type GardenId,
} from "@/lib/mcp/registry";
import { getExecutors } from "@/lib/mcp/gardens";
import { resolveCaller, checkRateLimit } from "@/lib/mcp/auth";
import { recordUsage, billingHeaders } from "@/lib/mcp/metering";
import { handleMcpMessage, parseJsonRpcBody, type McpServerContext } from "@/lib/mcp/jsonrpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function instructionsFor(gardenName: string): string {
  return (
    `${gardenName} — read-only knowledge tools. Answers are INTERPRETED and CITED to source; ` +
    `they are never raw corpus dumps. When the corpus does not cover a request, the tool says so ` +
    `explicitly rather than guessing — absence of a result is never a safety or compliance assurance.`
  );
}

// ─── GET: discovery ───
export async function GET(_req: NextRequest, ctx: { params: Promise<{ garden: string }> }) {
  const { garden: gardenId } = await ctx.params;
  const garden = getGarden(gardenId);
  if (!garden) {
    return NextResponse.json(
      { error: `Unknown garden: ${gardenId}`, available: GARDEN_IDS, directory: "/api/gardens" },
      { status: 404, headers: CORS },
    );
  }
  const base = publicBaseUrl();
  const endpoint = `${base}${garden.mcpPath}`;
  return NextResponse.json(
    {
      protocol: "mcp",
      transport: "streamable-http",
      protocolVersion: MCP_PROTOCOL_VERSION,
      server: { name: `knowledge-garden-${garden.id}`, version: RKG_VERSION },
      garden: {
        id: garden.id,
        name: garden.name,
        tagline: garden.tagline,
        description: garden.description,
        domains: garden.domains,
        status: garden.status,
        dataNote: garden.dataNote,
      },
      endpoint,
      tools: garden.tools.map((t) => ({
        name: t.name,
        title: t.title,
        description: t.description,
        inputSchema: t.inputSchema,
        readOnly: true,
      })),
      auth: {
        eval: RKG_PRICING.eval,
        metered: RKG_PRICING.metered,
        how: "Send `Authorization: Bearer <key>` or `X-API-Key: <key>` for the metered tier; omit for free eval.",
      },
      links: {
        llms_txt: `${base}${garden.llmsTxtPath}`,
        directory: `${base}/api/gardens`,
        well_known: `${base}/.well-known/knowledge-gardens.json`,
      },
      connect: {
        claude_code: `claude mcp add --transport http ${garden.id} ${endpoint}`,
        json: { mcpServers: { [garden.id]: { type: "http", url: endpoint } } },
      },
    },
    { headers: CORS },
  );
}

// ─── POST: JSON-RPC ───
export async function POST(req: NextRequest, ctx: { params: Promise<{ garden: string }> }) {
  const { garden: gardenId } = await ctx.params;
  const garden = getGarden(gardenId);
  if (!garden) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32601, message: `Unknown garden: ${gardenId}`, data: { available: GARDEN_IDS } } },
      { status: 404, headers: CORS },
    );
  }

  const caller = resolveCaller(req);
  const raw = await req.text();
  const { message, parseError } = parseJsonRpcBody(raw);
  if (parseError) {
    return NextResponse.json(parseError.body, { status: parseError.status, headers: CORS });
  }

  // Only meter/limit the spend-heavy surface (tools/call). Handshake +
  // discovery (initialize, tools/list, ping) are free so connecting never
  // burns an agent's eval quota.
  const methods = Array.isArray(message)
    ? message.map((m) => (m as { method?: string })?.method)
    : [(message as { method?: string })?.method];
  const wantsToolCall = methods.includes("tools/call");

  let rateHeaders: Record<string, string> = {};
  if (wantsToolCall) {
    const rl = checkRateLimit(caller);
    rateHeaders = {
      "X-RateLimit-Limit": String(rl.limit),
      "X-RateLimit-Remaining": String(rl.remaining),
      "X-RateLimit-Reset": rl.resetAt,
    };
    if (!rl.allowed) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: (Array.isArray(message) ? null : (message as { id?: unknown })?.id) ?? null,
          error: {
            code: -32000,
            message: `Rate limit exceeded for ${caller.tier} tier (${rl.limit}/hour).`,
            data: { tier: caller.tier, resetAt: rl.resetAt, upgrade: "Supply an API key for the metered tier." },
          },
        },
        { status: 429, headers: { ...CORS, ...rateHeaders, ...billingHeaders(caller) } },
      );
    }
  }

  const executors = getExecutors(gardenId as GardenId);
  const serverCtx: McpServerContext = {
    serverName: `knowledge-garden-${garden.id}`,
    serverVersion: RKG_VERSION,
    protocolVersion: MCP_PROTOCOL_VERSION,
    instructions: instructionsFor(garden.name),
    tools: garden.tools,
    execute: async (name, args) => {
      const fn = executors[name];
      if (!fn) throw new Error(`Tool '${name}' has no executor`);
      return fn(args);
    },
    onToolCall: (info) =>
      recordUsage({
        garden: garden.id,
        tool: info.name,
        tier: caller.tier,
        key_id: caller.keyId,
        label: caller.label,
        ip: caller.ip,
        ok: info.ok,
        latency_ms: info.latencyMs,
      }),
  };

  const result = await handleMcpMessage(message, serverCtx);
  const headers = { ...CORS, ...rateHeaders, ...billingHeaders(caller) };
  if (result.body === null) {
    return new NextResponse(null, { status: result.status, headers });
  }
  return NextResponse.json(result.body, { status: result.status, headers });
}
