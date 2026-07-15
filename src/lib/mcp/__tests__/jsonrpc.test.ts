/**
 * Tests for the MCP-over-HTTP JSON-RPC handler (protocol surface).
 */
import { describe, it, expect } from "vitest";
import { handleMcpMessage, parseJsonRpcBody, type McpServerContext, type ToolCallResult } from "../jsonrpc";
import type { ToolDef } from "../registry";

const TOOLS: ToolDef[] = [
  {
    name: "echo",
    title: "Echo",
    description: "echoes",
    inputSchema: { type: "object", properties: { msg: { type: "string" } }, required: ["msg"] },
    readOnlyHint: true,
  },
];

function ctx(over: Partial<McpServerContext> = {}): McpServerContext {
  return {
    serverName: "test",
    serverVersion: "0.0.1",
    protocolVersion: "2025-06-18",
    instructions: "be cited",
    tools: TOOLS,
    execute: async (name, args): Promise<ToolCallResult> => ({
      content: [{ type: "text", text: `echo:${String(args.msg)}` }],
      structuredContent: { name, args },
    }),
    ...over,
  };
}

describe("initialize", () => {
  it("returns protocol version, tools capability, serverInfo, instructions", async () => {
    const r = await handleMcpMessage({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }, ctx());
    expect(r.status).toBe(200);
    const body = r.body as { result: { protocolVersion: string; capabilities: { tools: unknown }; serverInfo: { name: string }; instructions: string } };
    expect(body.result.protocolVersion).toBe("2025-06-18");
    expect(body.result.capabilities.tools).toBeTruthy();
    expect(body.result.serverInfo.name).toBe("test");
    expect(body.result.instructions).toMatch(/cited/);
  });
});

describe("notifications", () => {
  it("notifications/initialized yields 202 with no body", async () => {
    const r = await handleMcpMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, ctx());
    expect(r.status).toBe(202);
    expect(r.body).toBeNull();
  });
});

describe("tools/list", () => {
  it("lists tools with schema + readOnly annotation", async () => {
    const r = await handleMcpMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" }, ctx());
    const body = r.body as { result: { tools: Array<{ name: string; annotations: { readOnlyHint: boolean } }> } };
    expect(body.result.tools[0].name).toBe("echo");
    expect(body.result.tools[0].annotations.readOnlyHint).toBe(true);
  });
});

describe("tools/call", () => {
  it("executes and returns content + fires the metering hook", async () => {
    const calls: Array<{ name: string; ok: boolean }> = [];
    const r = await handleMcpMessage(
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "echo", arguments: { msg: "hi" } } },
      ctx({ onToolCall: (i) => void calls.push({ name: i.name, ok: i.ok }) }),
    );
    const body = r.body as { result: { content: Array<{ text: string }> } };
    expect(body.result.content[0].text).toBe("echo:hi");
    expect(calls).toEqual([{ name: "echo", ok: true }]);
  });

  it("returns isError result (not a JSON-RPC error) when the tool throws", async () => {
    const r = await handleMcpMessage(
      { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "echo", arguments: {} } },
      ctx({ execute: async () => { throw new Error("boom"); } }),
    );
    const body = r.body as { result: { isError: boolean; content: Array<{ text: string }> } };
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toMatch(/boom/);
  });

  it("rejects an unknown tool with INVALID_PARAMS and lists available tools", async () => {
    const r = await handleMcpMessage(
      { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "nope" } },
      ctx(),
    );
    const body = r.body as { error: { code: number; data: { available: string[] } } };
    expect(body.error.code).toBe(-32602);
    expect(body.error.data.available).toContain("echo");
  });
});

describe("errors", () => {
  it("unknown method → METHOD_NOT_FOUND", async () => {
    const r = await handleMcpMessage({ jsonrpc: "2.0", id: 6, method: "frobnicate" }, ctx());
    expect((r.body as { error: { code: number } }).error.code).toBe(-32601);
  });

  it("malformed request → INVALID_REQUEST", async () => {
    const r = await handleMcpMessage({ id: 7, method: "tools/list" }, ctx());
    expect((r.body as { error: { code: number } }).error.code).toBe(-32600);
  });

  it("parseJsonRpcBody flags non-JSON with PARSE_ERROR", () => {
    const { parseError } = parseJsonRpcBody("not json{");
    expect(parseError).toBeTruthy();
    expect((parseError!.body as { error: { code: number } }).error.code).toBe(-32700);
  });
});
