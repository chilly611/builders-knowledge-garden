// Builder's Knowledge Garden — RAG Pipeline
// Retrieve-Augment-Generate for the AI Construction Copilot
// Feeds RSI Loop 5 (Copilot Quality) with every interaction

import { supabase, isSupabaseConfigured } from "./supabase";

export interface KnowledgeEntity {
  id: string;
  slug: string;
  title: string;
  summary: string;
  entity_type: string;
  domain: string;
  tags: string[];
  body?: string;
  metadata?: Record<string, unknown>;
}

export interface RetrievalResult {
  entities: KnowledgeEntity[];
  query: string;
  retrieval_method: "supabase_fts" | "mock";
  latency_ms: number;
}

export interface CopilotInteraction {
  query: string;
  jurisdiction?: string;
  entities_retrieved: string[];
  entities_cited: string[];
  prompt_version: string;
  model: string;
  feedback?: "positive" | "negative" | "inaccuracy_report" | null;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// 1. RETRIEVE — Pull top-K knowledge entities relevant to the query
// ---------------------------------------------------------------------------
export async function retrieveEntities(
  query: string,
  options: {
    jurisdiction?: string;
    domain?: string;
    entityType?: string;
    limit?: number;
  } = {}
): Promise<RetrievalResult> {
  const start = Date.now();
  const limit = options.limit || 8;

  // Try Supabase full-text search first
  if (isSupabaseConfigured()) {
    try {
      let qb = supabase
        .from("knowledge_entities")
        .select("id, slug, title, summary, entity_type, domain, tags, body, metadata")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (query) {
        // Use plain text search (AND matching) first
        qb = qb.textSearch("search_text", query, { type: "plain", config: "english" });
      }
      if (options.domain) qb = qb.eq("domain", options.domain);
      if (options.entityType) qb = qb.eq("entity_type", options.entityType);

      const { data, error } = await qb;

      // If FTS found nothing, fall back to ilike OR on search_text
      let resultData = data;
      if ((!data || data.length === 0) && query && !error) {
        const words = query.split(/\s+/).filter(w => w.length > 2).slice(0, 4);
        if (words.length > 0) {
          const orFilter = words.map(w => `search_text.ilike.%${w}%`).join(",");
          const fb = await supabase
            .from("knowledge_entities")
            .select("id, slug, title, summary, entity_type, domain, tags, body, metadata")
            .eq("status", "published")
            .or(orFilter)
            .limit(limit);
          if (!fb.error && fb.data) resultData = fb.data;
        }
      }

      if (!error && resultData && resultData.length > 0) {
        // Transform JSONB fields to strings
        const entities: KnowledgeEntity[] = resultData.map((e) => ({
          id: e.id,
          slug: e.slug,
          title: typeof e.title === "object" ? (e.title as Record<string, string>).en || JSON.stringify(e.title) : e.title,
          summary: typeof e.summary === "object" ? (e.summary as Record<string, string>).en || JSON.stringify(e.summary) : e.summary,
          entity_type: e.entity_type,
          domain: e.domain,
          tags: e.tags || [],
          body: typeof e.body === "object" ? (e.body as Record<string, string>).en || "" : e.body,
          metadata: e.metadata as Record<string, unknown>,
        }));

        return {
          entities,
          query,
          retrieval_method: "supabase_fts",
          latency_ms: Date.now() - start,
        };
      }
    } catch (err) {
      console.error("RAG: Supabase retrieval error:", err);
    }
  }

  // Fallback: mock entities for development
  return {
    entities: getMockEntities(query),
    query,
    retrieval_method: "mock",
    latency_ms: Date.now() - start,
  };
}

// ---------------------------------------------------------------------------
// 2. AUGMENT — Build the context window for Claude
// ---------------------------------------------------------------------------
export const COPILOT_PROMPT_VERSION = "v0.1.0";

export function buildSystemPrompt(
  entities: KnowledgeEntity[],
  jurisdiction?: string
): string {
  const entityContext = entities
    .map(
      (e, i) =>
        `<entity index="${i}" id="${e.id}" type="${e.entity_type}" title="${e.title}">
${e.summary}${e.body ? "\n" + truncate(e.body, 800) : ""}
</entity>`
    )
    .join("\n\n");

  return `You are the AI Construction Copilot for the Builder's Knowledge Garden — the operating system for the $17 trillion global construction economy.

You have access to a knowledge base of 40,000+ entities covering building codes, materials, construction methods, safety regulations, building types, and more — across 142+ jurisdictions worldwide.

RULES:
1. Answer construction questions accurately using the provided knowledge entities.
2. ALWAYS cite your sources using [Entity Title](entity:INDEX) format, where INDEX is the entity index number. Every factual claim must have a citation.
3. If the knowledge entities don't contain enough information, say so honestly. Never fabricate codes, standards, or safety information.
4. For safety-critical topics (structural, fire, electrical, fall protection), always recommend consulting a licensed professional and the Authority Having Jurisdiction (AHJ).
5. Be concise but thorough. Construction professionals need actionable answers, not essays.
6. When jurisdiction matters, specify which jurisdiction your answer applies to.${jurisdiction ? `\n7. The user is asking about jurisdiction: ${jurisdiction}. Prioritize information relevant to this jurisdiction.` : ""}

KNOWLEDGE ENTITIES (retrieved for this query):
${entityContext || "No entities retrieved — answer from your general construction knowledge and note that you're answering without specific knowledge base citations."}

Remember: You're the AI COO for construction. Be authoritative, precise, and practical. Cite everything.`;
}

// ---------------------------------------------------------------------------
// 3. CITATION PARSING — Extract entity references from the response
// ---------------------------------------------------------------------------
export function extractCitations(text: string, entities: KnowledgeEntity[]): string[] {
  const cited: Set<string> = new Set();
  // Match [Any Title](entity:INDEX) pattern
  const pattern = /\[([^\]]+)\]\(entity:(\d+)\)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const idx = parseInt(match[2], 10);
    if (idx >= 0 && idx < entities.length) {
      cited.add(entities[idx].id);
    }
  }
  return Array.from(cited);
}

// ---------------------------------------------------------------------------
// 4. MOCK DATA — Rich construction entities for dev without Supabase
// ---------------------------------------------------------------------------
function getMockEntities(query: string): KnowledgeEntity[] {
  const allMocks: KnowledgeEntity[] = [
    {
      id: "ke-ibc-903",
      slug: "ibc-903-2-1-sprinkler-systems",
      title: "IBC Section 903.2.1 — Automatic Sprinkler Systems",
      summary: "Requirements for automatic sprinkler systems in buildings based on occupancy and area thresholds.",
      entity_type: "code_section",
      domain: "codes",
      tags: ["fire-protection", "sprinkler", "IBC", "life-safety"],
      body: "An automatic sprinkler system shall be provided throughout all buildings. NFPA 13 systems are required in Group A occupancies where fire area exceeds 12,000 sf, Group B where any fire area exceeds 12,000 sf, Group E educational occupancies, Group F-1 factory where fire area exceeds 12,000 sf, Group H high-hazard, Group I institutional, Group M mercantile where fire area exceeds 12,000 sf, Group R-1 and R-2 residential, and Group S-1 storage where fire area exceeds 12,000 sf. NFPA 13R systems are permitted in Group R occupancies up to 4 stories. NFPA 13D systems are permitted in one- and two-family dwellings.",
    },
    {
      id: "ke-osha-1926-502",
      slug: "osha-1926-502-fall-protection",
      title: "OSHA 1926.502 — Fall Protection Requirements",
      summary: "Duty to provide fall protection systems for construction workers at elevations of 6 feet or more.",
      entity_type: "safety_rule",
      domain: "safety",
      tags: ["fall-protection", "OSHA", "safety", "guardrails", "harness"],
      body: "Each employee on a walking/working surface with an unprotected side or edge which is 6 feet (1.8 m) or more above a lower level shall be protected from falling by the use of guardrail systems, safety net systems, or personal fall arrest systems. Top edge height of guardrail systems shall be 42 inches (1.1 m) plus or minus 3 inches. When guardrail systems are used at hoisting areas, a chain, gate, or removable guardrail section shall be placed across the access opening. Personal fall arrest systems shall limit maximum arresting force to 1,800 pounds. Safety net systems shall be installed as close as practicable under the walking/working surface, but no more than 30 feet below.",
    },
    {
      id: "ke-concrete-4000",
      slug: "concrete-4000psi-normal-weight",
      title: "Concrete — 4000 PSI Normal Weight",
      summary: "Standard concrete mix for structural applications. 150 pcf unit weight. 28-day strength.",
      entity_type: "material",
      domain: "materials",
      tags: ["concrete", "structural", "foundation", "4000psi"],
      body: "Standard normal-weight concrete with 28-day compressive strength of 4,000 psi (27.6 MPa). Unit weight approximately 150 lb/ft³ (2,400 kg/m³). Typical water-cement ratio: 0.45-0.50. Slump: 4-6 inches for general structural use. Minimum cement content: 564 lb/yd³. Air entrainment: 5-7% for freeze-thaw exposure. Curing: maintain moist conditions for minimum 7 days. Minimum temperature for placing: 50°F (10°C). Maximum temperature: 90°F (32°C). Forms may be stripped after 24 hours for walls, 7 days for slabs and beams, 14 days for cantilevered sections. ACI 318 governs structural concrete design. CSI Division 03 31 00.",
    },
    {
      id: "ke-ibc-chapter-10",
      slug: "ibc-chapter-10-means-of-egress",
      title: "IBC Chapter 10 — Means of Egress",
      summary: "Requirements for the design, construction, and maintenance of means of egress in buildings.",
      entity_type: "code_section",
      domain: "codes",
      tags: ["egress", "exit", "life-safety", "IBC", "stairs", "corridors"],
      body: "Means of egress shall provide a continuous and unobstructed path of vertical and horizontal egress travel from any occupied portion of a building to a public way. Occupant load is calculated by dividing the floor area by the occupant load factor (Table 1004.5). Minimum corridor width: 44 inches (36 inches for occupant load < 50). Exit doors: minimum 32-inch clear width, maximum 48 inches. Number of exits: 2 exits required when occupant load exceeds 500 (1 exit may serve occupant load ≤ 49 with proper travel distance). Maximum common path of egress travel varies by occupancy (75 feet typical). Exit stairways: minimum 44 inches wide for occupant load > 50.",
    },
    {
      id: "ke-ashrae-90-1",
      slug: "ashrae-90-1-energy-standard",
      title: "ASHRAE 90.1 — Energy Standard for Buildings",
      summary: "Minimum energy efficiency requirements for commercial buildings covering envelope, HVAC, lighting, and power.",
      entity_type: "code_section",
      domain: "codes",
      tags: ["energy", "ASHRAE", "envelope", "HVAC", "lighting", "efficiency"],
      body: "ASHRAE Standard 90.1 establishes minimum energy efficiency requirements for the design and construction of new buildings and major renovations. Key sections: Building Envelope (Section 5) — insulation R-values by climate zone, window U-factor and SHGC limits, air barrier requirements. HVAC (Section 6) — equipment efficiency minimums, economizer requirements, energy recovery, controls. Lighting (Section 9) — LPD allowances by space type (0.5-1.2 W/sf typical). Three compliance paths: prescriptive, building envelope trade-off, or energy cost budget method. Climate zones 1-8 with requirements increasing in colder zones.",
    },
    {
      id: "ke-nec-210",
      slug: "nec-article-210-branch-circuits",
      title: "NEC Article 210 — Branch Circuits",
      summary: "National Electrical Code requirements for branch circuits including ratings, outlets, and GFCI/AFCI protection.",
      entity_type: "code_section",
      domain: "codes",
      tags: ["electrical", "NEC", "branch-circuit", "GFCI", "AFCI", "wiring"],
      body: "Branch circuits rated 15 and 20 amperes serve general lighting and receptacle outlets. 20A circuits required for kitchen, bathroom, laundry, and garage receptacles. GFCI protection required for: bathrooms, garages, outdoors, crawl spaces, unfinished basements, kitchens (within 6 feet of sink), laundry areas, and areas near swimming pools. AFCI protection required for: bedrooms, living rooms, dining rooms, family rooms, closets, hallways, and similar rooms in dwelling units. Minimum number of receptacles: every wall space 2 feet or wider, no point along floor line more than 6 feet from a receptacle. Kitchen: minimum two 20A small-appliance circuits.",
    },
    {
      id: "ke-clt-mass-timber",
      slug: "cross-laminated-timber-clt",
      title: "Cross-Laminated Timber (CLT) — Mass Timber",
      summary: "Engineered wood panels used for walls, floors, and roofs. Sustainable alternative to concrete and steel for mid-rise construction.",
      entity_type: "material",
      domain: "materials",
      tags: ["timber", "CLT", "mass-timber", "sustainable", "structural", "wood"],
      body: "Cross-laminated timber (CLT) consists of layers of dimension lumber oriented at right angles to one another, bonded with structural adhesive. Typical panel sizes: 2-10 feet wide, up to 60 feet long, 3-20 inches thick. Structural capacity comparable to concrete for many applications. IBC 2021 permits CLT buildings up to 18 stories (Type IV-A construction). Fire performance: CLT chars at a predictable rate (~1.5 inches per hour), maintaining structural integrity. Connections: self-tapping screws, lag bolts, angle brackets, and specialized CLT connections. Carbon benefit: CLT sequesters CO2 (approximately 1 tonne CO2 per cubic meter). Cost: $25-$45 per square foot installed. Lead time: 8-16 weeks from order to delivery.",
    },
    {
      id: "ke-data-center-cooling",
      slug: "data-center-cooling-systems",
      title: "Data Center Cooling Systems",
      summary: "Cooling architectures for mission-critical facilities: CRAC/CRAH, hot/cold aisle containment, liquid cooling, and free cooling strategies.",
      entity_type: "building_type",
      domain: "specialty",
      tags: ["data-center", "cooling", "HVAC", "CRAC", "CRAH", "PUE", "mission-critical"],
      body: "Data center cooling accounts for 30-40% of total energy consumption. Primary systems: Computer Room Air Conditioning (CRAC) — DX cooling, suitable for smaller facilities. Computer Room Air Handling (CRAH) — chilled water, more efficient for larger facilities. Hot Aisle / Cold Aisle containment reduces mixing of hot and cold air, improving efficiency by 20-40%. Liquid cooling (direct-to-chip or immersion) supports >30 kW/rack densities. Free cooling (economizer) uses outside air when ambient temperature is below setpoint, reducing mechanical cooling by 30-70% depending on climate. ASHRAE A1 thermal envelope: 64-80°F (18-27°C) supply air. Target PUE: <1.3 for modern facilities. Tier III requires N+1 cooling redundancy. Tier IV requires 2N.",
    },
  ];

  // Simple keyword relevance scoring
  const q = query.toLowerCase();
  const scored = allMocks.map((e) => {
    let score = 0;
    const fields = [e.title, e.summary, e.body || "", ...e.tags].join(" ").toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    for (const w of words) {
      if (fields.includes(w)) score += 1;
      if (e.title.toLowerCase().includes(w)) score += 2;
      if (e.tags.some((t) => t.includes(w))) score += 1.5;
    }
    return { entity: e, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.entity);
}

// ---------------------------------------------------------------------------
// UTILS
// ---------------------------------------------------------------------------
function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "...";
}
