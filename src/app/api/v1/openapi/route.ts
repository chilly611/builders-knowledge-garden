// Builder's Knowledge Garden — OpenAPI Specification
// GET /api/v1/openapi → full OpenAPI 3.1 spec for all endpoints
// This serves as both documentation and machine-readable API contract

import { NextResponse } from "next/server";

export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Builder's Knowledge Garden API",
      version: "0.1.0",
      description: "The AI-native construction knowledge API. 40,000+ entities, 142+ jurisdictions, full lifecycle coverage. Serves humans via web, AI agents via MCP, robots via structured JSON.",
      contact: { url: "https://builders.theknowledgegardens.com" },
    },
    servers: [
      { url: "/api/v1", description: "API v1" },
    ],
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          operationId: "getHealth",
          tags: ["System"],
          responses: { "200": { description: "Service status", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, timestamp: { type: "string" } } } } } } },
        },
      },
      "/search": {
        get: {
          summary: "Search knowledge base",
          operationId: "searchKnowledge",
          tags: ["Knowledge"],
          description: "Full-text + semantic search across 40K+ entities. Supports domain and type filtering.",
          parameters: [
            { name: "q", in: "query", required: false, schema: { type: "string" }, description: "Search query" },
            { name: "domain", in: "query", required: false, schema: { type: "string", enum: ["codes","materials","methods","safety","building_types"] } },
            { name: "type", in: "query", required: false, schema: { type: "string" }, description: "Entity type filter" },
            { name: "jurisdiction", in: "query", required: false, schema: { type: "string" } },
            { name: "limit", in: "query", required: false, schema: { type: "integer", default: 20, maximum: 100 } },
            { name: "offset", in: "query", required: false, schema: { type: "integer", default: 0 } },
          ],
          responses: { "200": { description: "Search results with RSI signals" } },
        },
      },
      "/entities/{id}": {
        get: {
          summary: "Get entity by ID or slug",
          operationId: "getEntity",
          tags: ["Knowledge"],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Entity ID (UUID) or slug" }],
          responses: { "200": { description: "Full entity with metadata" }, "404": { description: "Entity not found" } },
        },
      },
      "/copilot": {
        post: {
          summary: "AI Construction Copilot (streaming)",
          operationId: "copilotQuery",
          tags: ["AI"],
          description: "RAG pipeline: query → retrieve entities → Claude API → stream cited response. Returns Server-Sent Events.",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", required: ["query"], properties: {
              query: { type: "string", description: "Construction question in natural language" },
              jurisdiction: { type: "string", description: "Jurisdiction ID for context" },
              project_context: { type: "object", description: "Optional project context (building_type, sqft, quality)" },
            } } } },
          },
          responses: { "200": { description: "SSE stream: meta → chunk[] → done", content: { "text/event-stream": {} } } },
        },
      },
      "/mcp": {
        get: {
          summary: "MCP tool discovery",
          operationId: "mcpListTools",
          tags: ["MCP"],
          description: "List all available MCP tools with descriptions, parameters, and pricing tiers.",
          responses: { "200": { description: "Tool catalog" } },
        },
        post: {
          summary: "Execute MCP tool",
          operationId: "mcpExecuteTool",
          tags: ["MCP"],
          description: "Execute a construction knowledge tool. Used by AI agents, robots, and autonomous systems.",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", required: ["tool"], properties: {
              tool: { type: "string", enum: ["lookup_code","search_knowledge","get_material","get_safety","estimate_cost","get_permits","generate_schedule","get_team","list_building_types","list_jurisdictions","crm_list_contacts","crm_pipeline_stats"] },
              parameters: { type: "object", description: "Tool-specific parameters (see GET /mcp for schemas)" },
            } } } },
          },
          responses: { "200": { description: "Tool result with metadata" }, "400": { description: "Unknown tool or invalid parameters" } },
        },
      },
      "/api/v1/crm": {
        get: {
          summary: "List CRM contacts or pipeline stats",
          operationId: "crmList",
          tags: ["CRM"],
          parameters: [
            { name: "id", in: "query", schema: { type: "string" }, description: "Contact ID (returns single contact with activities)" },
            { name: "stats", in: "query", schema: { type: "string" }, description: "Set to 1 for pipeline summary" },
            { name: "stage", in: "query", schema: { type: "string", enum: ["new","contacted","qualified","proposal","negotiation","won","lost","dormant"] } },
            { name: "temperature", in: "query", schema: { type: "string", enum: ["hot","warm","cool","cold"] } },
            { name: "q", in: "query", schema: { type: "string" }, description: "Search contacts" },
          ],
          responses: { "200": { description: "Contacts list or pipeline stats" } },
        },
        post: {
          summary: "Create CRM contact",
          operationId: "crmCreate",
          tags: ["CRM"],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["first_name"], properties: {
            first_name: { type: "string" }, last_name: { type: "string" }, company: { type: "string" },
            email: { type: "string" }, phone: { type: "string" }, contact_type: { type: "string" },
            stage: { type: "string" }, project_type: { type: "string" }, estimated_value: { type: "number" },
          } } } } },
          responses: { "201": { description: "Contact created" } },
        },
        patch: {
          summary: "Update CRM contact",
          operationId: "crmUpdate",
          tags: ["CRM"],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["id"] } } } },
          responses: { "200": { description: "Contact updated" } },
        },
      },
    },
    tags: [
      { name: "Knowledge", description: "Search and retrieve construction knowledge entities" },
      { name: "AI", description: "AI-powered copilot and generation" },
      { name: "MCP", description: "Model Context Protocol for AI agent integration" },
      { name: "CRM", description: "Construction CRM — leads, pipeline, activities (Killer App)" },
      { name: "System", description: "Health and configuration" },
    ],
  };

  return NextResponse.json(spec, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
