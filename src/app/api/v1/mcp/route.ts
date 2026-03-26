// Builder's Knowledge Garden — MCP Server
// Model Context Protocol server for AI agent integration
// Any AI system (Claude, GPT, Gemini, robots, drones) can query construction knowledge
//
// GET  /api/v1/mcp         → List available tools
// POST /api/v1/mcp         → Execute a tool
// POST /api/v1/mcp/stream  → Execute with streaming (future)
//
// This is what makes us infrastructure for the AI construction ecosystem.
// When Bedrock's autonomous excavator needs excavation depth by jurisdiction, it asks this API.

import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { emitMCPSignal } from "@/lib/events";
import {
  BUILDING_TYPES,
  JURISDICTIONS,
  getCodeRequirements,
  getPermitRequirements,
  getTeamNeeds,
  generateEstimate,
  getMaterialSuggestions,
  generateSchedule,
} from "@/lib/knowledge-data";

// ─── TOOL DEFINITIONS ───
const TOOLS = [
  {
    name: "lookup_code",
    description: "Look up building codes by jurisdiction and building type. Returns applicable code sections with priority levels.",
    parameters: {
      type: "object",
      properties: {
        jurisdiction: { type: "string", description: "Jurisdiction ID (e.g., 'ca-la', 'ny-nyc', 'ibc-2024')" },
        building_type: { type: "string", description: "Building type ID (e.g., 'sfr', 'datacenter', 'hospital')" },
      },
      required: ["jurisdiction", "building_type"],
    },
  },
  {
    name: "search_knowledge",
    description: "Search the construction knowledge base (40K+ entities). Full-text search across codes, materials, methods, safety rules, and building types.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query in natural language" },
        domain: { type: "string", description: "Filter by domain: codes, materials, methods, safety, building_types" },
        entity_type: { type: "string", description: "Filter by entity type: code_section, material, method, safety_rule, building_type, hazard, equipment" },
        limit: { type: "number", description: "Max results (default 10, max 50)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_material",
    description: "Get material specifications, code compliance status, cost ranges, and sustainability ratings for a building type and quality level.",
    parameters: {
      type: "object",
      properties: {
        building_type: { type: "string", description: "Building type ID" },
        jurisdiction: { type: "string", description: "Jurisdiction ID" },
        quality: { type: "string", enum: ["economy", "standard", "premium"], description: "Quality level" },
      },
      required: ["building_type"],
    },
  },
  {
    name: "get_safety",
    description: "Get safety requirements, hazards, and PPE requirements for a specific construction task or activity.",
    parameters: {
      type: "object",
      properties: {
        task: { type: "string", description: "Construction task or activity (e.g., 'roof work', 'excavation', 'welding')" },
        jurisdiction: { type: "string", description: "Jurisdiction ID for local safety regulations" },
      },
      required: ["task"],
    },
  },
  {
    name: "estimate_cost",
    description: "Generate a preliminary cost estimate by CSI MasterFormat division for a building project.",
    parameters: {
      type: "object",
      properties: {
        building_type: { type: "string", description: "Building type ID" },
        sqft: { type: "number", description: "Square footage" },
        quality: { type: "string", enum: ["economy", "standard", "premium"], description: "Quality level" },
      },
      required: ["building_type", "sqft"],
    },
  },
  {
    name: "get_permits",
    description: "Get required permits for a building type in a specific jurisdiction, including timelines and fees.",
    parameters: {
      type: "object",
      properties: {
        building_type: { type: "string", description: "Building type ID" },
        jurisdiction: { type: "string", description: "Jurisdiction ID" },
      },
      required: ["building_type", "jurisdiction"],
    },
  },
  {
    name: "generate_schedule",
    description: "Generate a constraint-aware construction schedule with dependencies, hold points, and critical path analysis.",
    parameters: {
      type: "object",
      properties: {
        building_type: { type: "string", description: "Building type ID" },
        sqft: { type: "number", description: "Square footage (affects duration scaling)" },
        jurisdiction: { type: "string", description: "Jurisdiction ID (affects inspection requirements)" },
      },
      required: ["building_type", "sqft"],
    },
  },
  {
    name: "get_team",
    description: "Get recommended team composition (roles, required vs optional, typical fees) for a building type.",
    parameters: {
      type: "object",
      properties: {
        building_type: { type: "string", description: "Building type ID" },
      },
      required: ["building_type"],
    },
  },
  {
    name: "list_building_types",
    description: "List all supported building types with categories, typical costs, and durations.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "list_jurisdictions",
    description: "List all supported jurisdictions (142+) with code references and years.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "crm_list_contacts",
    description: "List CRM contacts with optional filters. Returns pipeline data for AI-powered lead scoring and follow-up recommendations.",
    parameters: {
      type: "object",
      properties: {
        stage: { type: "string", description: "Pipeline stage: new, contacted, qualified, proposal, negotiation, won, lost, dormant" },
        temperature: { type: "string", description: "Lead temperature: hot, warm, cool, cold" },
        search: { type: "string", description: "Search by name, company, email, or tags" },
      },
    },
  },
  {
    name: "crm_pipeline_stats",
    description: "Get CRM pipeline summary: contacts by stage, total value, avg lead score, follow-ups due.",
    parameters: { type: "object", properties: {} },
  },
];

// ─── GET: List available tools ───
export async function GET() {
  return NextResponse.json({
    name: "builders-knowledge-garden",
    version: "0.1.0",
    description: "Construction knowledge API for AI agents. 40K+ entities, 142+ jurisdictions, codes, materials, methods, safety.",
    tools: TOOLS,
    capabilities: {
      entities: "40,000+",
      jurisdictions: "142+",
      domains: ["codes", "materials", "methods", "safety", "building_types", "hazards", "equipment"],
      languages: "30+ (planned)",
    },
    pricing: {
      explorer: "5 calls/day (free)",
      pro: "1,000 calls/day ($49/mo)",
      team: "10,000 calls/day ($199/mo)",
      enterprise: "unlimited (custom)",
      platform: "bulk access + SLA (custom)",
    },
    _links: {
      docs: "/api/v1/mcp",
      search: "/api/v1/search",
      entities: "/api/v1/entities/:id",
      copilot: "/api/v1/copilot",
    },
  });
}

// ─── POST: Execute a tool ───
export async function POST(request: NextRequest) {
  const start = Date.now();

  let body: { tool: string; parameters: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tool, parameters: params } = body;

  if (!tool || typeof tool !== "string") {
    return NextResponse.json({ error: "tool is required", available_tools: TOOLS.map(t => t.name) }, { status: 400 });
  }

  const toolDef = TOOLS.find(t => t.name === tool);
  if (!toolDef) {
    return NextResponse.json({ error: `Unknown tool: ${tool}`, available_tools: TOOLS.map(t => t.name) }, { status: 400 });
  }

  try {
    const result = await executeTool(tool, params || {});
    const latency = Date.now() - start;

    // Emit event for RSI tracking
    emitMCPSignal({ tool, parameters: params || {}, latency_ms: latency });

    return NextResponse.json({
      tool,
      result,
      _meta: {
        latency_ms: latency,
        source: isSupabaseConfigured() ? "supabase" : "mock",
        version: "0.1.0",
      },
    });
  } catch (err) {
    return NextResponse.json({
      error: "Tool execution failed",
      tool,
      details: err instanceof Error ? err.message : "Unknown error",
    }, { status: 500 });
  }
}

// ─── TOOL EXECUTION ───
async function executeTool(tool: string, params: Record<string, unknown>): Promise<unknown> {
  switch (tool) {
    case "lookup_code": {
      const jurisdiction = String(params.jurisdiction || "ibc-2024");
      const buildingType = String(params.building_type || "sfr");
      const codes = getCodeRequirements(buildingType, jurisdiction);
      const jd = JURISDICTIONS.find(j => j.id === jurisdiction);
      return {
        jurisdiction: jd ? { id: jd.id, name: jd.name, code: jd.code, year: jd.year } : jurisdiction,
        building_type: buildingType,
        codes,
        total: codes.length,
      };
    }

    case "search_knowledge": {
      const query = String(params.query || "");
      const limit = Math.min(Number(params.limit) || 10, 50);
      if (isSupabaseConfigured()) {
        let qb = supabase
          .from("knowledge_entities")
          .select("id, slug, title, summary, entity_type, domain_id, tags, metadata")
          .order("updated_at", { ascending: false })
          .limit(limit);
        if (query) qb = qb.textSearch("body_plain", query, { type: "websearch", config: "english" });
        if (params.domain) qb = qb.eq("domain_id", String(params.domain));
        if (params.entity_type) qb = qb.eq("entity_type", String(params.entity_type));
        const { data, error } = await qb;
        if (!error && data) return { results: data, total: data.length, query, source: "supabase" };
      }
      // Mock fallback
      return {
        results: [
          { id: "mock-1", title: "IBC Section 903.2.1 — Automatic Sprinkler Systems", type: "code_section", summary: "Requirements for automatic sprinkler systems based on occupancy and area." },
          { id: "mock-2", title: "OSHA 1926.502 — Fall Protection", type: "safety_rule", summary: "Fall protection at 6+ feet elevation." },
          { id: "mock-3", title: "Concrete — 4000 PSI Normal Weight", type: "material", summary: "Standard structural concrete, 28-day strength, ACI 318." },
        ],
        total: 3, query, source: "mock",
        note: "Connect Supabase for 40K+ real entities",
      };
    }

    case "get_material": {
      const bt = String(params.building_type || "sfr");
      const jd = String(params.jurisdiction || "ibc-2024");
      const quality = String(params.quality || "standard");
      return { materials: getMaterialSuggestions(bt, jd, quality), building_type: bt, quality };
    }

    case "get_safety": {
      const task = String(params.task || "").toLowerCase();
      // Safety data based on task keywords
      const safetyData: Record<string, { hazards: string[]; ppe: string[]; regulations: string[]; precautions: string[] }> = {
        "roof": { hazards: ["Falls from elevation", "Unstable surfaces", "Weather exposure", "Electrical contact"], ppe: ["Full body harness", "Hard hat", "Non-slip boots", "Safety glasses"], regulations: ["OSHA 1926.501(b)(13)", "OSHA 1926.502", "ANSI Z359.1"], precautions: ["100% tie-off required", "Guardrails at 42\" on leading edges", "Safety nets within 30' of work surface", "Daily inspection of fall arrest equipment"] },
        "excavat": { hazards: ["Cave-in/collapse", "Falling into trench", "Utility strikes", "Hazardous atmosphere"], ppe: ["Hard hat", "High-vis vest", "Steel-toe boots", "Respirator (if needed)"], regulations: ["OSHA 1926.651", "OSHA 1926.652", "OSHA 1926.651(b)"], precautions: ["Competent person required on-site", "Protective systems for trenches >5ft", "Locate underground utilities (811) before digging", "Spoil pile 2' back from edge"] },
        "weld": { hazards: ["Burns", "UV radiation", "Fume inhalation", "Fire/explosion", "Electrical shock"], ppe: ["Welding helmet (shade 10-14)", "Leather gloves", "Fire-resistant clothing", "Respirator with HEPA"], regulations: ["OSHA 1926.351-354", "AWS D1.1", "NFPA 51B Hot Work"], precautions: ["Hot work permit required", "Fire watch for 30min after welding", "Ventilation in confined areas", "Inspect equipment before each use"] },
        "electr": { hazards: ["Electrocution", "Arc flash", "Burns", "Falls from ladders"], ppe: ["Insulated gloves (rated for voltage)", "Arc flash suit", "Safety glasses", "Non-conductive hard hat"], regulations: ["OSHA 1926.405", "NFPA 70E", "NEC Article 110"], precautions: ["Lockout/tagout before work", "Test circuits before touching", "Qualified persons only for energized work", "Maintain safe working distances"] },
        "confin": { hazards: ["Oxygen deficiency", "Toxic atmosphere", "Engulfment", "Entrapment"], ppe: ["4-gas monitor", "Self-contained breathing apparatus", "Full body harness with retrieval line", "Hard hat"], regulations: ["OSHA 1926.1203-1213", "ANSI Z117.1"], precautions: ["Entry permit required", "Atmospheric testing before entry", "Attendant stationed at opening", "Rescue plan and equipment ready"] },
        "scaffold": { hazards: ["Falls from platform", "Struck by falling objects", "Scaffold collapse", "Electrocution"], ppe: ["Hard hat", "Full body harness (above 10')", "Non-slip boots", "Tool lanyards"], regulations: ["OSHA 1926.451-454", "ANSI A10.8"], precautions: ["Competent person must inspect before each shift", "Guardrails on all open sides above 10'", "Maximum load capacity posted", "4:1 base-to-height ratio for supported scaffolds"] },
        "crane": { hazards: ["Struck by load", "Tip-over", "Contact with power lines", "Rigging failure"], ppe: ["Hard hat", "High-vis vest", "Steel-toe boots", "Safety glasses"], regulations: ["OSHA 1926.1400-1442", "ASME B30 series"], precautions: ["Certified operator required", "Maintain 20' from power lines (or de-energize)", "Pre-lift plan for critical lifts", "Daily inspection of rigging and crane components"] },
      };
      // Find matching safety data
      let matched = null;
      for (const [key, data] of Object.entries(safetyData)) {
        if (task.includes(key)) { matched = { task: key, ...data }; break; }
      }
      if (!matched) {
        return { task: params.task, hazards: ["Assess site-specific hazards"], ppe: ["Hard hat", "Safety glasses", "High-vis vest", "Steel-toe boots"], regulations: ["OSHA 1926 Subpart C — General Safety"], precautions: ["Conduct job hazard analysis (JHA) before work begins", "Ensure all workers have proper training", "Review site-specific safety plan"], note: "Generic safety info — specify a more specific task for detailed requirements" };
      }
      return matched;
    }

    case "estimate_cost": {
      const bt = String(params.building_type || "sfr");
      const sqft = Number(params.sqft) || 2500;
      const quality = String(params.quality || "standard");
      const estimate = generateEstimate(bt, sqft, quality);
      const total = estimate.reduce((s, e) => s + e.amount, 0);
      return { building_type: bt, sqft, quality, estimate, total_cost: total, cost_per_sf: Math.round(total / sqft) };
    }

    case "get_permits": {
      const bt = String(params.building_type || "sfr");
      const jd = String(params.jurisdiction || "ibc-2024");
      return { permits: getPermitRequirements(bt, jd), building_type: bt, jurisdiction: jd };
    }

    case "generate_schedule": {
      const bt = String(params.building_type || "sfr");
      const sqft = Number(params.sqft) || 2500;
      const jd = String(params.jurisdiction || "ibc-2024");
      const sched = generateSchedule(bt, sqft, jd);
      return { ...sched, building_type: bt, sqft, jurisdiction: jd };
    }

    case "get_team": {
      const bt = String(params.building_type || "sfr");
      return { team: getTeamNeeds(bt), building_type: bt };
    }

    case "list_building_types":
      return { building_types: BUILDING_TYPES };

    case "list_jurisdictions":
      return { jurisdictions: JURISDICTIONS, total: JURISDICTIONS.length };

    case "crm_list_contacts": {
      const q = new URLSearchParams();
      if (params.stage) q.set("stage", String(params.stage));
      if (params.temperature) q.set("temperature", String(params.temperature));
      if (params.search) q.set("q", String(params.search));
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/v1/crm?${q.toString()}`);
      return await res.json();
    }

    case "crm_pipeline_stats": {
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/v1/crm?stats=1`);
      return await res.json();
    }

    default:
      throw new Error(`Tool ${tool} not implemented`);
  }
}
