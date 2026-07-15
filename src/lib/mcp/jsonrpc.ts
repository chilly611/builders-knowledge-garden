/**
 * RKG — Minimal MCP-over-HTTP (Streamable HTTP) JSON-RPC handler.
 *
 * Implements the slice of the Model Context Protocol that a read-only tool
 * server needs, with NO SDK dependency (keeps the bundle + cost near zero and
 * works on Vercel's Node/edge runtimes):
 *
 *   initialize                → handshake, advertise tools capability
 *   notifications/initialized → client ack (notification, no response)
 *   tools/list                → tool catalogue
 *   tools/call                → run a tool, return content + structuredContent
 *   ping                      → liveness
 *
 * Transport contract: a POST carrying one JSON-RPC request returns one JSON-RPC
 * response (200). A notification (no `id`) returns 202 with no body. Tool
 * EXECUTION errors are returned as a normal result with `isError: true` (per
 * MCP), reserving JSON-RPC errors for protocol-level failures.
 */
import type { ToolDef } from "./registry";

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

export interface ToolCallResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface McpServerContext {
  serverName: string;
  serverVersion: string;
  protocolVersion: string;
  instructions?: string;
  tools: ToolDef[];
  execute: (name: string, args: Record<string, unknown>) => Promise<ToolCallResult>;
  /** Metering/telemetry hook fired after every tools/call. */
  onToolCall?: (info: { name: string; ok: boolean; latencyMs: number }) => void | Promise<void>;
}

// JSON-RPC 2.0 error codes
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

function ok(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0" as const, id: id ?? null, result };
}
function err(id: JsonRpcId, code: number, message: string, data?: unknown) {
  return { jsonrpc: "2.0" as const, id: id ?? null, error: { code, message, ...(data ? { data } : {}) } };
}

export interface HandleResult {
  status: number;
  /** null body = 202 ack for notifications. */
  body: unknown | null;
}

async function dispatch(req: JsonRpcRequest, ctx: McpServerContext): Promise<unknown | null> {
  const { id, method, params } = req;
  const isNotification = id === undefined;

  switch (method) {
    case "initialize":
      return ok(id ?? null, {
        protocolVersion: ctx.protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: ctx.serverName, version: ctx.serverVersion },
        ...(ctx.instructions ? { instructions: ctx.instructions } : {}),
      });

    case "notifications/initialized":
    case "notifications/cancelled":
      return null; // notifications: no response

    case "ping":
      return ok(id ?? null, {});

    case "tools/list":
      return ok(id ?? null, {
        tools: ctx.tools.map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: { title: t.title, readOnlyHint: t.readOnlyHint },
        })),
      });

    case "tools/call": {
      if (isNotification) return null;
      const name = typeof params?.name === "string" ? params.name : "";
      const args = (params?.arguments && typeof params.arguments === "object"
        ? (params.arguments as Record<string, unknown>)
        : {}) as Record<string, unknown>;
      const tool = ctx.tools.find((t) => t.name === name);
      if (!tool) {
        return err(id ?? null, INVALID_PARAMS, `Unknown tool: ${name || "(none)"}`, {
          available: ctx.tools.map((t) => t.name),
        });
      }
      const start = Date.now();
      try {
        const result = await ctx.execute(name, args);
        await ctx.onToolCall?.({ name, ok: !result.isError, latencyMs: Date.now() - start });
        return ok(id ?? null, result);
      } catch (e) {
        await ctx.onToolCall?.({ name, ok: false, latencyMs: Date.now() - start });
        // Tool failures are returned as result-level errors (MCP convention).
        return ok(id ?? null, {
          content: [{ type: "text", text: `Tool '${name}' failed: ${e instanceof Error ? e.message : "unknown error"}` }],
          isError: true,
        });
      }
    }

    default:
      if (isNotification) return null;
      return err(id ?? null, METHOD_NOT_FOUND, `Method not found: ${method}`);
  }
}

/** Handle a parsed JSON-RPC message (object or batch array). */
export async function handleMcpMessage(message: unknown, ctx: McpServerContext): Promise<HandleResult> {
  if (Array.isArray(message)) {
    const responses = (await Promise.all(message.map((m) => dispatch(m as JsonRpcRequest, ctx)))).filter(
      (r) => r !== null,
    );
    return responses.length === 0 ? { status: 202, body: null } : { status: 200, body: responses };
  }

  if (!message || typeof message !== "object") {
    return { status: 200, body: err(null, INVALID_REQUEST, "Invalid JSON-RPC message") };
  }

  const req = message as JsonRpcRequest;
  if (req.jsonrpc !== "2.0" || typeof req.method !== "string") {
    return { status: 200, body: err(req.id ?? null, INVALID_REQUEST, "Malformed JSON-RPC 2.0 request") };
  }

  try {
    const body = await dispatch(req, ctx);
    return body === null ? { status: 202, body: null } : { status: 200, body };
  } catch (e) {
    return { status: 200, body: err(req.id ?? null, INTERNAL_ERROR, e instanceof Error ? e.message : "Internal error") };
  }
}

/** Parse a raw request body string into a JSON-RPC message, or return a parse error. */
export function parseJsonRpcBody(raw: string): { message?: unknown; parseError?: HandleResult } {
  try {
    return { message: JSON.parse(raw) };
  } catch {
    return { parseError: { status: 200, body: err(null, PARSE_ERROR, "Parse error: body is not valid JSON") } };
  }
}
