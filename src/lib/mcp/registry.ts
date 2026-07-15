/**
 * Robot Knowledge Garden (RKG) — Garden Registry
 * ================================================
 * The single source of truth for the agent-legible layer over the deployed
 * Knowledge Gardens. Everything else derives from this file:
 *
 *   - the per-garden MCP endpoints      (app/api/mcp/[garden]/route.ts)
 *   - the agent-discoverable directory  (app/api/gardens/route.ts)
 *   - the llms.txt index + per garden   (public/llms.txt, public/gardens/*)
 *
 * Design constraints (CODE-4 "Seed the Robot Knowledge Garden"):
 *   1. READ-ONLY. Every tool is a lookup; none mutate corpus state.
 *   2. INTERPRETED + CITED. Tools never dump raw corpus rows — they return a
 *      synthesised answer plus structured citations (see ./citations.ts).
 *   3. API-KEY GATED with a free EVAL tier (see ./auth.ts).
 *   4. METERED. Every call is recorded so we can answer the day-90 question:
 *      "did any agent actually call us?" (see ./metering.ts).
 *
 * Adding a garden = add an entry here + a handler module under ./gardens/.
 */

export type GardenId = "bkg" | "tkg";

export interface ToolDef {
  /** MCP tool name (snake_case) — stable identifier agents call. */
  name: string;
  /** Human title for directory/UI. */
  title: string;
  /** What it answers + the citation guarantee. Shown verbatim in tools/list. */
  description: string;
  /** JSON Schema for arguments (MCP `inputSchema`). */
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  /** Read-only hint surfaced via MCP tool annotations. Always true here. */
  readOnlyHint: true;
}

export interface GardenDef {
  id: GardenId;
  /** Display name. */
  name: string;
  /** One-line positioning. */
  tagline: string;
  /** Longer machine/human description of what the garden knows. */
  description: string;
  /** Top-level knowledge domains. */
  domains: string[];
  /** live = real corpus wired; preview = partial; planned = stub. */
  status: "live" | "preview" | "planned";
  /** Path of the MCP Streamable-HTTP endpoint. */
  mcpPath: string;
  /** Path of the per-garden llms.txt. */
  llmsTxtPath: string;
  /** Human-facing site (best-effort). */
  sitePath: string;
  /** Honest description of the backing corpus + coverage limits. */
  dataNote: string;
  tools: ToolDef[];
}

/** Pricing / metering posture — shared across gardens. Per-call billing is
 *  not enforced yet; the eval tier is open so agents can discover + try us.
 *  See ./metering.ts + docs/rkg/agent-commerce-readiness.md. */
export const RKG_PRICING = {
  eval: {
    label: "Eval (free)",
    description:
      "No API key required. Open for discovery and trial. Rate limited per IP; result sizes capped.",
    rate_limit_per_hour: 40,
    requires_key: false,
  },
  metered: {
    label: "Metered",
    description:
      "API-key gated. Higher limits; every call metered for usage-based billing (per-query). Settles over Coinbase x402 / AP2 rails once enabled.",
    rate_limit_per_hour: 1000,
    requires_key: true,
    indicative_unit_price_usd: 0.002,
  },
} as const;

const BKG_TOOLS: ToolDef[] = [
  {
    name: "lookup_jurisdiction_requirements",
    title: "Look up jurisdiction requirements",
    description:
      "Return the building-code requirements that apply to a topic in a specific jurisdiction. " +
      "Answers are interpreted and cited to specific code sections (system, year, section, source URL, " +
      "verification level) — never a raw corpus dump. If the jurisdiction is not covered, or no entry " +
      "matches, that is stated plainly instead of guessing.",
    inputSchema: {
      type: "object",
      properties: {
        jurisdiction: {
          type: "string",
          description:
            "Jurisdiction: slug ('ca-sf'), state code ('CA'), or place name ('San Francisco', 'Marin County').",
        },
        topic: {
          type: "string",
          description:
            "What to look up, e.g. 'emergency egress windows in bedrooms', 'energy code for ADUs'.",
        },
        discipline: {
          type: "string",
          enum: ["electrical", "structural", "plumbing", "mechanical", "fire", "general"],
          description: "Optional discipline hint — narrows ranking only; never invents results.",
        },
        limit: { type: "number", description: "Max citations to return (default 8, max 25)." },
      },
      required: ["jurisdiction"],
      additionalProperties: false,
    },
    readOnlyHint: true,
  },
  {
    name: "permit_checklist_for_scope",
    title: "Permit checklist for a scope of work",
    description:
      "Given a jurisdiction and a scope of work (e.g. 'kitchen remodel', 'detached ADU', 'reroof'), " +
      "return an interpreted permit/compliance checklist grounded in the code sections that govern that " +
      "scope, each line cited. Returns an honest 'not yet covered' when the jurisdiction or scope is " +
      "outside the corpus.",
    inputSchema: {
      type: "object",
      properties: {
        jurisdiction: {
          type: "string",
          description: "Jurisdiction slug, state code, or place name.",
        },
        scope: {
          type: "string",
          description:
            "Scope of work, e.g. 'kitchen remodel', 'detached ADU', 'reroof', 'service panel upgrade'.",
        },
      },
      required: ["jurisdiction", "scope"],
      additionalProperties: false,
    },
    readOnlyHint: true,
  },
  {
    name: "citation_for_claim",
    title: "Cite a construction/code claim",
    description:
      "Given a construction or code claim and an optional jurisdiction, return the corroborating code " +
      "sections with a verdict tier (authoritative / corroborated / single-source / uncovered) based on " +
      "how many independent sources back it. Use this to verify a statement before relying on it.",
    inputSchema: {
      type: "object",
      properties: {
        claim: {
          type: "string",
          description: "The claim to verify, e.g. 'Fall protection is required above 6 feet.'",
        },
        jurisdiction: {
          type: "string",
          description: "Optional jurisdiction scope for the claim.",
        },
      },
      required: ["claim"],
      additionalProperties: false,
    },
    readOnlyHint: true,
  },
];

const TKG_TOOLS: ToolDef[] = [
  {
    name: "is_substance_restricted",
    title: "Is a substance restricted / regulated?",
    description:
      "Resolve a substance by name, CAS number, or trade name and report whether it carries regulatory " +
      "limits or hazard classifications (EPA MCL, EWG guideline, carcinogen class, PFAS, etc.). Returns an " +
      "interpreted verdict with each limit cited to its agency and source. Says 'no restriction found in " +
      "corpus' rather than implying a substance is safe.",
    inputSchema: {
      type: "object",
      properties: {
        substance: {
          type: "string",
          description: "Substance name, CAS number, or trade name/alias (e.g. 'Arsenic', '7440-38-2', 'PFOA').",
        },
        context: {
          type: "string",
          description: "Optional use context, e.g. 'drinking water', 'building materials', 'cleaning product'.",
        },
      },
      required: ["substance"],
      additionalProperties: false,
    },
    readOnlyHint: true,
  },
  {
    name: "non_toxic_alternatives_for",
    title: "Lower-hazard alternatives for a substance",
    description:
      "Given a substance (or a use), surface lower-hazard alternatives drawn from the toxicology corpus, " +
      "comparing hazard classifications and regulatory restriction. Every suggestion is cited and framed by " +
      "evidence level. Returns 'no curated alternative in corpus' rather than fabricating a recommendation.",
    inputSchema: {
      type: "object",
      properties: {
        substance: {
          type: "string",
          description: "The substance (or use) to find alternatives for, e.g. 'Lead', 'PFOA', 'chlorine bleach'.",
        },
        limit: { type: "number", description: "Max alternatives to return (default 5, max 10)." },
      },
      required: ["substance"],
      additionalProperties: false,
    },
    readOnlyHint: true,
  },
  {
    name: "citation_for_claim",
    title: "Cite a toxicology claim",
    description:
      "Given a toxicology/safety claim (optionally scoped to a substance), return the corroborating " +
      "evidence — regulatory limits, health-effect links, source documents — with a verdict tier based on " +
      "how many independent sources back it. Use this to verify a statement before relying on it.",
    inputSchema: {
      type: "object",
      properties: {
        claim: {
          type: "string",
          description: "The claim to verify, e.g. 'Arsenic in drinking water is linked to cancer.'",
        },
        substance: {
          type: "string",
          description: "Optional substance to scope the evidence search.",
        },
      },
      required: ["claim"],
      additionalProperties: false,
    },
    readOnlyHint: true,
  },
];

export const GARDENS: Record<GardenId, GardenDef> = {
  bkg: {
    id: "bkg",
    name: "Builder's Knowledge Garden",
    tagline: "Cited construction code, permitting, and jurisdiction knowledge for agents.",
    description:
      "An AI-native construction knowledge base: building codes, permitting, materials, methods, and " +
      "safety, organised by jurisdiction (California-first). Every answer is interpreted from structured, " +
      "version-tracked entities and cited to its code section and source.",
    domains: ["building-codes", "permitting", "jurisdictions", "safety", "materials"],
    status: "live",
    mcpPath: "/api/mcp/bkg",
    llmsTxtPath: "/gardens/bkg/llms.txt",
    sitePath: "/",
    dataNote:
      "Backed by the published `knowledge_entities` (2k+ entities) and `jurisdictions` (44, California-" +
      "first) tables. Coverage is honest: out-of-corpus jurisdictions return 'not yet covered'.",
    tools: BKG_TOOLS,
  },
  tkg: {
    id: "tkg",
    name: "Toxicology Knowledge Garden",
    tagline: "Cited substance-restriction and non-toxic-verification knowledge for agents.",
    description:
      "A toxicology knowledge base: substances, regulatory limits, hazard classifications, and " +
      "health-effect links, seeded from the EWG Tap Water Database and enriched with PubChem. Every answer " +
      "is interpreted and cited to its agency limit or source document.",
    domains: ["toxicology", "regulatory-limits", "water-quality", "non-toxic-verification"],
    status: "live",
    mcpPath: "/api/mcp/tkg",
    llmsTxtPath: "/gardens/tkg/llms.txt",
    sitePath: "/",
    dataNote:
      "Backed by the shared `substances` (329), `regulatory_limits` (100), `substance_health_effects` " +
      "(800+), `ewg_contaminants` (231), and `source_documents` tables. Restriction data is strongest for " +
      "drinking-water contaminants; absence of a limit is reported as such, never as a safety claim.",
    tools: TKG_TOOLS,
  },
};

export const GARDEN_IDS = Object.keys(GARDENS) as GardenId[];

export function getGarden(id: string): GardenDef | undefined {
  return (GARDENS as Record<string, GardenDef>)[id];
}

/** Public base URL for absolute links in the directory / llms.txt. */
export function publicBaseUrl(): string {
  const explicit = process.env.RKG_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://builders.theknowledgegardens.com";
}

/** MCP protocol version we speak (Streamable HTTP). We accept older client
 *  versions and echo back this one. */
export const MCP_PROTOCOL_VERSION = "2025-06-18";

export const RKG_VERSION = "0.1.0";
