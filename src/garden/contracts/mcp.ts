/**
 * L2 contract — MCP tool registry
 * ===============================
 *
 * Today the MCP tool list is hardcoded in THREE places that drift
 * (`api/v1/mcp/route.ts` registers 12; `public/llms.txt` claims 18;
 * `app/mcp/page.tsx` lists its own). This contract makes the registry the
 * single source of truth: the MCP route, the /mcp + /install-mcp pages, the
 * OpenAPI spec, and a dynamic llms.txt all read from it (plan Phase 2–3).
 *
 * The discovery MACHINERY (route handler, .mcpb bridge/packer, OpenAPI
 * renderer, capability-stats) is engine-generic; the tool DEFINITIONS are
 * garden config. BKG's lookup_code/estimate_cost/get_permits/crm_* tools
 * become `gardens/builders` data.
 */

export interface McpContext {
  /** Authenticated user id, if any. */
  userId?: string;
  /** Agent API key id, if request came via X-MCP-API-KEY. */
  agentKeyId?: string;
}

export interface McpTool {
  /** Tool name exposed to agents (e.g. 'search_knowledge'). */
  name: string;
  description: string;
  /** JSON Schema for the tool's parameters. */
  inputSchema: Record<string, unknown>;
  /** Require an authenticated principal (user or agent key). */
  requiresAuth?: boolean;
  /** Execute the tool. */
  run(params: unknown, ctx: McpContext): Promise<unknown>;
}

export type McpToolRegistry = McpTool[];
