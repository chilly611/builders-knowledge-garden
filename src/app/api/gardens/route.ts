/**
 * RKG — agent-discoverable garden directory (machine-readable index).
 *
 *   GET /api/gardens
 *
 * The front door for external agents: one JSON document listing every garden,
 * its MCP endpoint, tools, auth posture/pricing, llms.txt, and live usage.
 * Mirrored statically at /.well-known/knowledge-gardens.json and referenced
 * from /llms.txt.
 */
import { NextResponse } from "next/server";
import { GARDENS, GARDEN_IDS, MCP_PROTOCOL_VERSION, RKG_VERSION, RKG_PRICING, publicBaseUrl } from "@/lib/mcp/registry";
import { getUsageSummary } from "@/lib/mcp/metering";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  const base = publicBaseUrl();

  const gardens = await Promise.all(
    GARDEN_IDS.map(async (id) => {
      const g = GARDENS[id];
      const usage = await getUsageSummary(id);
      return {
        id: g.id,
        name: g.name,
        tagline: g.tagline,
        description: g.description,
        domains: g.domains,
        status: g.status,
        dataNote: g.dataNote,
        mcp_endpoint: `${base}${g.mcpPath}`,
        transport: "streamable-http",
        llms_txt: `${base}${g.llmsTxtPath}`,
        tools: g.tools.map((t) => ({ name: t.name, title: t.title, description: t.description, readOnly: true })),
        usage: usage ? { total_calls: usage.total_calls } : { total_calls: null, note: "metering ledger not yet provisioned" },
      };
    }),
  );

  return NextResponse.json(
    {
      service: "Robot Knowledge Garden (RKG) directory",
      version: RKG_VERSION,
      description:
        "Machine-readable index of the Knowledge Gardens exposed as MCP endpoints. Every garden serves " +
        "read-only, interpreted, cited tools over the Model Context Protocol (Streamable HTTP).",
      protocol: { type: "mcp", version: MCP_PROTOCOL_VERSION, transport: "streamable-http" },
      generated_at: new Date().toISOString(),
      gardens,
      pricing: RKG_PRICING,
      agent_commerce: {
        status: "metered-not-enforced",
        rails: ["coinbase-x402", "google-ap2", "visa-intelligent-commerce", "mastercard-agent-pay"],
        note:
          "Usage is metered today; settlement over agent-payment rails turns on without changing the tool " +
          "contract. See /docs/rkg/agent-commerce-readiness.md.",
      },
      links: {
        self: `${base}/api/gardens`,
        well_known: `${base}/.well-known/knowledge-gardens.json`,
        llms_txt: `${base}/llms.txt`,
      },
    },
    { headers: CORS },
  );
}
