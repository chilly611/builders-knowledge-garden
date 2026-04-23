// Builder's Knowledge Garden — AI Specialist Runner
// Server-side helper for invoking specialists from StepCard
// Week 1 AI wiring: load prompts, call Claude, parse structured responses

import { readFileSync } from "fs";
import { resolve } from "path";
import Anthropic from "@anthropic-ai/sdk";
import { retrieveEntities, type KnowledgeEntity } from "./rag";
import {
  queryAllSources,
  hasMultipleSources,
  type CodeQuery,
  type CodeSourceResult,
} from "./code-sources";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface SpecialistContext {
  scope_description: string;
  jurisdiction?: string;
  trade?: string;
  lane?: "gc" | "diy" | "specialty" | "worker" | "supplier" | "equipment" | "service" | "agent";
  project_phase?: string;
  extra?: Record<string, unknown>;
}

export interface SpecialistCitation {
  entity_id: string;
  code_body?: string;
  section?: string;
  jurisdiction?: string;
  edition?: string;
  updated_at?: string;
  relevance?: string;
}

export interface DisciplineHandoff {
  detected: "electrical" | "structural" | "plumbing" | "mechanical" | "fire";
  suggestStep: string;
  message: string;
}

export interface SupersededNotice {
  oldSection: string;
  newSection: string;
  summary: string;
}

export interface SpecialistResult {
  narrative: string;
  structured: Record<string, unknown>;
  citations: SpecialistCitation[];
  confidence: "high" | "medium" | "low";
  deferred_to_human?: string;
  raw_response: string;
  model: string;
  latency_ms: number;
  promptVersion: "v1" | "v2";
  disciplineHandoff?: DisciplineHandoff;
  supersededNotice?: SupersededNotice;
  code_sections?: { section: string; title: string; requirement: string; status?: string }[];
  warnings?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 2500;

// Specialists that default to v2 prompts; all others default to v1
const DEFAULT_VERSION_BY_SPECIALIST: Record<string, "v1" | "v2"> = {
  "estimating-takeoff": "v2", // q2
  "compliance-structural": "v2", // q5
  "sub-bid-analysis": "v2", // q9
};

// ─────────────────────────────────────────────────────────────────────────────
// CODE QUERY BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Infer discipline from question text by keyword scoring
 */
function inferDisciplineFromText(
  text: string
): "electrical" | "structural" | "plumbing" | "mechanical" | "fire" {
  const lower = text.toLowerCase();

  const scores = {
    electrical: ["plug", "outlet", "receptacle", "gfci", "afci", "wire", "nec", "circuit", "panel", "amp", "volt", "conduit", "romex"].filter(
      (k) => lower.includes(k)
    ).length,
    structural: ["beam", "column", "load", "framing", "ibc", "irc", "seismic", "shear", "lateral", "foundation", "joist", "rafter"].filter(
      (k) => lower.includes(k)
    ).length,
    plumbing: ["pipe", "drain", "vent", "trap", "ipc", "fixture", "gpf", "sewer", "backflow", "riser"].filter((k) => lower.includes(k))
      .length,
    mechanical: ["hvac", "duct", "imc", "ventilation", "cfm", "refrigerant", "heat", "pump", "ahu", "vav"].filter((k) =>
      lower.includes(k)
    ).length,
    fire: ["sprinkler", "alarm", "nfpa", "smoke", "egress", "fire-rated", "life-safety"].filter((k) => lower.includes(k)).length,
  };

  let maxDiscipline: "electrical" | "structural" | "plumbing" | "mechanical" | "fire" = "electrical";
  let maxScore = 0;

  for (const [discipline, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxDiscipline = discipline as "electrical" | "structural" | "plumbing" | "mechanical" | "fire";
    }
  }

  return maxDiscipline;
}

/**
 * Build a CodeQuery from a scope description and context.
 * Infers discipline from question text; extracts section numbers and keywords.
 * Detects discipline mismatch (e.g., kitchen plug question in structural specialist).
 */
function buildCodeQuery(
  scopeDescription: string,
  context: SpecialistContext
): CodeQuery & { disciplineMismatch?: { inferred: string; specialist: string } } {
  // Extract section numbers (e.g., "210.52(C)(5)", "Article 210")
  const sectionMatch = scopeDescription.match(/(?:Article\s+)?(\d{3}(?:\.\d+)?(?:\([A-Z]\))?(?:\(\d+\))?)/);
  const section = sectionMatch ? sectionMatch[1] : undefined;

  // Infer discipline from question text
  const inferredDiscipline = inferDisciplineFromText(scopeDescription);

  // Fallback to context.trade if no clear inference
  let discipline: "electrical" | "structural" | "plumbing" | "mechanical" | "fire" = inferredDiscipline;
  let specialistDiscipline = inferredDiscipline;

  if (context.trade) {
    if (context.trade.includes("structural")) specialistDiscipline = "structural";
    else if (context.trade.includes("plumbing")) specialistDiscipline = "plumbing";
    else if (context.trade.includes("mechanical")) specialistDiscipline = "mechanical";
    else if (context.trade.includes("fire")) specialistDiscipline = "fire";
    else specialistDiscipline = "electrical";
  }

  // Use inferred discipline if it differs from specialist; otherwise use specialist context
  const disciplineMismatch =
    inferredDiscipline !== specialistDiscipline ? { inferred: inferredDiscipline, specialist: specialistDiscipline } : undefined;

  // If we detected a mismatch, prefer the inferred one (user's question intent)
  if (disciplineMismatch) {
    discipline = inferredDiscipline;
  } else {
    discipline = specialistDiscipline;
  }

  // Extract keywords from scope description, including code section-like tokens
  const rawKeywords = scopeDescription
    .toLowerCase()
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 && !["that", "with", "from", "your", "this", "what", "when", "does", "is", "for", "the", "and", "or"].includes(w)
    )
    .slice(0, 10);

  const keywords = Array.from(new Set(rawKeywords)); // deduplicate

  return {
    discipline,
    section,
    keywords,
    jurisdiction: context.jurisdiction,
    disciplineMismatch,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RUNNER
// ─────────────────────────────────────────────────────────────────────────────

export async function callSpecialist(
  specialistId: string,
  context: SpecialistContext,
  options?: { mockIfNoKey?: boolean; preferProductionPrompt?: boolean; version?: "v1" | "v2" }
): Promise<SpecialistResult> {
  const start = Date.now();
  const mockIfNoKey = options?.mockIfNoKey !== false;
  const preferProductionPrompt = options?.preferProductionPrompt !== false;
  // Resolve version: use explicit option if provided, otherwise use default for this specialist
  const version =
    options?.version || DEFAULT_VERSION_BY_SPECIALIST[specialistId] || "v1";

  // 1. LOAD THE PROMPT
  const systemPrompt = loadSpecialistPrompt(specialistId, preferProductionPrompt, version);

  // 2. BUILD USER MESSAGE WITH OPTIONAL RUNTIME CONTEXT
  let userMessage = context.scope_description;

  // Append runtime context if available
  if (context.trade || context.jurisdiction || context.lane) {
    const contextParts: string[] = [];
    if (context.trade) contextParts.push(`trade: ${context.trade}`);
    if (context.jurisdiction) contextParts.push(`jurisdiction: ${context.jurisdiction}`);
    if (context.lane) contextParts.push(`lane: ${context.lane}`);
    userMessage += `\n\nContext: ${contextParts.join(", ")}`;
  }

  // 3. RETRIEVE RELEVANT ENTITIES / CODE SOURCES
  let entityContext = "";
  let citations: SpecialistCitation[] = [];
  let codeSourceConfidenceData: {
    multiSource: boolean;
    sourceCount: number;
    hasPrimary: boolean;
  } | null = null;

  // For compliance specialists, use queryAllSources instead of retrieveEntities
  const isComplianceSpecialist = specialistId.startsWith("compliance-");

  if (context.jurisdiction && isComplianceSpecialist) {
    // Build CodeQuery from scope description (cheap pre-parse for section numbers and keywords)
    const codeQueryRaw = buildCodeQuery(context.scope_description, context);
    const codeQuery = { discipline: codeQueryRaw.discipline, section: codeQueryRaw.section, keywords: codeQueryRaw.keywords, jurisdiction: codeQueryRaw.jurisdiction } as CodeQuery;

    const codeResults = await queryAllSources(codeQuery);

    if (codeResults.length > 0) {
      const multiSource = hasMultipleSources(codeResults);
      const hasPrimary = codeResults.some((r) => r.confidenceTier === "primary");

      // Store confidence data for the LLM to use
      codeSourceConfidenceData = {
        multiSource,
        sourceCount: new Set(codeResults.map((r) => r.source)).size,
        hasPrimary,
      };

      // Format code sources as structured context for the model
      entityContext =
        "Multi-Source Code Verification (BKG + ICC + NFPA + Local Amendments):\n";
      entityContext += codeResults
        .map(
          (r, idx) =>
            `[${idx}] ${r.citation} (${r.source})\nEdition: ${r.edition} | Tier: ${r.confidenceTier}${r.historical ? " [HISTORICAL]" : ""}\n${truncate(r.text, 300)}`
        )
        .join("\n\n");

      // Inject at the top of the user message
      userMessage = `${entityContext}\n\n---\n\n${userMessage}`;

      // Inject confidence gating instructions
      userMessage += `\n\nCODE SOURCE SUMMARY:\n- Multiple sources present: ${multiSource ? "YES (confidence: high)" : "NO (confidence: medium)"}\n- Primary tier results: ${hasPrimary ? "YES" : "NO"}\n- Total sources: ${codeSourceConfidenceData.sourceCount}`;

      // Prepare citations for later extraction
      citations = codeResults.map((r) => ({
        entity_id: `${r.source}/${r.section}`,
        code_body: r.edition,
        section: r.section,
        jurisdiction: r.jurisdiction,
        edition: r.edition,
        updated_at: r.retrievedAt,
        relevance: r.confidenceTier === "primary" ? "high" : "medium",
      }));
    } else {
      userMessage += `\n\nCRITICAL: queryAllSources returned no results for this query. You MUST return confidence: low and tell the user: "I don't have a cross-verified answer; do not proceed without AHJ confirmation." Include specific questions the user should ask their AHJ.`;
      codeSourceConfidenceData = { multiSource: false, sourceCount: 0, hasPrimary: false };
    }
  } else if (context.jurisdiction && !isComplianceSpecialist) {
    // Use legacy retrieveEntities for non-compliance specialists
    const result = await retrieveEntities(context.scope_description, {
      jurisdiction: context.jurisdiction,
      limit: 10,
    });

    if (result.entities.length > 0) {
      // Format entities as a BKG database excerpt for the model
      entityContext = "BKG Database Excerpt (relevant to your jurisdiction):\n";
      entityContext += result.entities
        .map(
          (e, idx) =>
            `[${idx}] ${e.title} (${e.entity_type})\n${e.summary}${e.body ? "\n" + truncate(e.body, 200) : ""}`
        )
        .join("\n\n");

      // Inject at the top of the user message so model can cite them
      userMessage = `${entityContext}\n\n---\n\n${userMessage}`;

      // Prepare citations array for extraction later
      citations = result.entities.map((e) => ({
        entity_id: e.id,
        code_body: e.domain,
        section: e.title,
        jurisdiction: context.jurisdiction,
        relevance: "medium", // Will be overridden by model output if present
      }));
    } else {
      userMessage += `\n\nNote: BKG database does not yet cover ${context.jurisdiction} — return confidence: low if citation required.`;
    }
  }

  // 4. CHECK FOR API KEY AND DECIDE MOCK VS. REAL
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey && mockIfNoKey) {
    return generateMockResult(specialistId, context, start, version);
  }

  if (!apiKey) {
    throw new Error(
      `ANTHROPIC_API_KEY not configured and mockIfNoKey is false. Cannot call specialist.`
    );
  }

  // 5. CALL CLAUDE
  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const rawResponse = content.text;

    // 6. PARSE RESPONSE
    let narrative = rawResponse;
    let structured: Record<string, unknown> = {};
    let confidence: "high" | "medium" | "low" = "medium";
    let disciplineHandoff: DisciplineHandoff | undefined;
    let supersededNotice: SupersededNotice | undefined;

    // Try to extract JSON from <json>...</json> block (production prompt style)
    const jsonMatch = rawResponse.match(/<json>([\s\S]*?)<\/json>/);
    if (jsonMatch) {
      try {
        structured = JSON.parse(jsonMatch[1].trim());
        // Narrative is everything before the JSON block
        narrative = rawResponse.substring(0, jsonMatch.index).trim();

        // Extract confidence and citations from structured output
        if (structured.confidence) {
          confidence = structured.confidence as "high" | "medium" | "low";
        }
        if (structured.citations && Array.isArray(structured.citations)) {
          citations = structured.citations;
        }

        // Extract disciplineHandoff if present
        if (structured.disciplineHandoff && typeof structured.disciplineHandoff === "object") {
          const dh = structured.disciplineHandoff as Record<string, unknown>;
          if (dh.detected && dh.suggestStep && dh.message) {
            disciplineHandoff = {
              detected: dh.detected as DisciplineHandoff["detected"],
              suggestStep: dh.suggestStep as string,
              message: dh.message as string,
            };
          }
        }

        // Extract supersededNotice if present
        if (structured.supersededNotice && typeof structured.supersededNotice === "object") {
          const sn = structured.supersededNotice as Record<string, unknown>;
          if (sn.oldSection && sn.newSection && sn.summary) {
            supersededNotice = {
              oldSection: sn.oldSection as string,
              newSection: sn.newSection as string,
              summary: sn.summary as string,
            };
          }
        }
      } catch {
        // Fallback: treat entire response as narrative
        narrative = rawResponse;
      }
    }

    return {
      narrative,
      structured,
      citations,
      confidence,
      raw_response: rawResponse,
      model: MODEL,
      latency_ms: Date.now() - start,
      promptVersion: version,
      disciplineHandoff,
      supersededNotice,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Specialist ${specialistId} failed: ${errMsg}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT LOADING
// ─────────────────────────────────────────────────────────────────────────────

function loadSpecialistPrompt(
  specialistId: string,
  preferProduction: boolean,
  version: "v1" | "v2" = "v1"
): string {
  // Try v2 version if explicitly requested
  if (version === "v2") {
    const v2Path = resolve(process.cwd(), `docs/ai-prompts/${specialistId}.v2.md`);
    try {
      const content = readFileSync(v2Path, "utf-8");
      return extractSystemPrompt(content, "v2");
    } catch {
      console.warn(
        `v2 prompt not found for ${specialistId}, falling back to v1: ${v2Path}`
      );
      // Fall through to v1
    }
  }

  // Try production version first
  if (preferProduction) {
    const prodPath = resolve(process.cwd(), `docs/ai-prompts/${specialistId}.production.md`);
    try {
      const content = readFileSync(prodPath, "utf-8");
      return extractSystemPrompt(content, "production");
    } catch {
      // Fall through to prototype
    }
  }

  // Fall back to prototype version
  const prototypePath = resolve(process.cwd(), `docs/ai-prompts/${specialistId}.md`);
  try {
    const content = readFileSync(prototypePath, "utf-8");
    return extractSystemPrompt(content, "prototype");
  } catch {
    throw new Error(
      `Specialist prompt not found: ${specialistId} (tried ${specialistId}.v2.md, ${specialistId}.production.md, and ${specialistId}.md)`
    );
  }
}

function extractSystemPrompt(
  mdContent: string,
  variant: "production" | "prototype" | "v2"
): string {
  // Remove frontmatter if present
  let content = mdContent;
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    content = content.substring(frontmatterMatch[0].length);
  }

  if (variant === "v2" || variant === "production") {
    // v2 and production prompts have "## System Prompt" heading
    const match = content.match(/##\s+System Prompt\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (match) {
      return match[1].trim();
    }
  }

  // Prototype prompts have "## Original prototype system prompt" with backticks
  const match = content.match(/##\s+Original prototype system prompt\s*\n```\n([\s\S]*?)\n```/i);
  if (match) {
    return match[1].trim();
  }

  // Fallback: try to extract the first code block
  const codeMatch = content.match(/```\n([\s\S]*?)\n```/);
  if (codeMatch) {
    return codeMatch[1].trim();
  }

  // Last resort: return the entire content minus headers
  const lines = content.split("\n").filter((line) => !line.startsWith("#"));
  return lines.join("\n").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK GENERATION (for development without API key)
// ─────────────────────────────────────────────────────────────────────────────

function generateMockResult(
  specialistId: string,
  context: SpecialistContext,
  startTime: number,
  version: "v1" | "v2" = "v1"
): SpecialistResult {
  const mockResponses: Record<string, { narrative: string; structured: Record<string, unknown> }> = {
    "estimating-takeoff": {
      narrative: `Estimated build cost: $52,350 (±18% confidence), most likely $48,200

For the scope you described, here's the itemized breakdown by trade:

| Trade / Phase | Low $ | High $ | % of Total |
|---|---|---|---|
| Demo + dumpster | $2,800 | $3,600 | 6% |
| Framing tweaks | $4,200 | $5,400 | 10% |
| Electrical | $4,800 | $6,000 | 11% |
| Plumbing | $3,400 | $4,400 | 8% |
| Cabinetry + quartz | $16,500 | $20,500 | 38% |
| Flooring | $5,600 | $7,200 | 13% |
| Paint + trim | $3,200 | $4,000 | 7% |
| GC overhead + margin | $6,550 | $7,850 | 15% |

**Regional Note:** California coastal premium applies. Labor runs 1.18–1.25× national average in LA/SD metro areas. Materials +8% for logistics. No significant union scale unless public funding involved.

**Key Variables:** Site access and soil conditions can swing foundation costs ±$4k. Window/door specification (standard vs. high-performance) swings $6k–$12k. Appliance selection adds $3k–$8k variance.

**Scope Exclusions:** This estimate does NOT include site survey, soils engineering, structural PE stamping, architectural plans, or mitigation of existing conditions. General liability and bonding are included in overhead.

**Confidence:** ±18% confidence if scope stays as described and no unexpected conditions arise. Next step: site walk to confirm bearing-wall status and soil type.

This is a mock response because ANTHROPIC_API_KEY is not configured. Please configure it to get real LLM-powered estimates.`,
      structured: {
        confidence: "medium",
        line_items: [
          { label: "Demo + dumpster", amount: 3200 },
          { label: "Framing tweaks", amount: 4800 },
          { label: "Electrical (3 circuits)", amount: 5400 },
          { label: "Plumbing rough-in", amount: 3900 },
          { label: "Cabinetry + quartz", amount: 18500 },
          { label: "Flooring (320 sqft)", amount: 6400 },
          { label: "Paint + trim", amount: 3600 },
          { label: "GC overhead + margin", amount: 6550 },
        ],
        rough_total: 52350,
        assumptions: [
          "Existing HVAC stays put",
          "No structural PE needed",
          "Owner-grade appliances",
          "Standard finishes (not high-end)",
        ],
        confidence_rationale: "Clear scope but bearing-wall status unconfirmed; could swing ±$4k.",
        next_step: "Site walk to confirm wall-removal status and verify existing conditions.",
      },
    },
    "compliance-structural": {
      narrative: `Structural scope analysis for ${context.scope_description.substring(0, 50)}...

This is a mock response because ANTHROPIC_API_KEY is not configured.

For the scope you described, here are the key structural considerations:
1. Foundation requirements vary by jurisdiction and soil type
2. Framing standards depend on building type and occupancy
3. Engineering review is typically required for complex spans or loads

Please configure ANTHROPIC_API_KEY to get real LLM-powered analysis with database citations.`,
      structured: {
        confidence: "medium",
        requires_engineer: true,
        citations: [
          {
            entity_id: "mock-ibc-2021-section-2305",
            code_body: "IBC",
            section: "2305",
            jurisdiction: context.jurisdiction || "unknown",
            edition: "2021",
            relevance: "high",
          },
        ],
        edition: context.jurisdiction ? `IBC (${context.jurisdiction})` : "IBC",
        amendments: [],
        requires_special_inspection: false,
        open_questions: ["What is the exact building type and occupancy?"],
        deferred_to_human: [],
      },
    },
    "compliance-electrical": {
      narrative: `Electrical scope analysis for ${context.scope_description.substring(0, 50)}...

This is a mock response because ANTHROPIC_API_KEY is not configured.

For the scope you described, key electrical compliance points:
1. GFCI/AFCI protection requirements vary by location and occupancy
2. Wire sizing depends on load and distance
3. NEC article citations depend on jurisdiction and code edition

Please configure ANTHROPIC_API_KEY to get real LLM-powered analysis.`,
      structured: {
        confidence: "medium",
        citations: [
          {
            entity_id: "mock-nec-210",
            code_body: "NEC",
            section: "Article 210",
            jurisdiction: context.jurisdiction || "unknown",
            relevance: "high",
          },
        ],
      },
    },
    "compliance-router": {
      narrative: `Code compliance question: ${context.scope_description.substring(0, 50)}...

This is a mock response because ANTHROPIC_API_KEY is not configured.

The router specialist helps classify your question and route it to the right specialist. For your question, here's what to consider:

1. Determine the primary discipline (electrical, structural, plumbing, fire, mechanical)
2. Check code edition and local amendments for your jurisdiction
3. Rate your confidence level based on available sources

Please configure ANTHROPIC_API_KEY to get real LLM-powered routing and analysis.`,
      structured: {
        confidence: "medium",
        detected_discipline: "electrical",
        code_sections: [],
        warnings: ["Mock response — configure ANTHROPIC_API_KEY for real analysis"],
        supersededNotice: null,
        next_step_suggestion: {
          stepId: "s5-2",
          label: "Electrical — NEC deep dive",
          reason: "For deeper analysis on electrical compliance, visit the specialist step.",
        },
      },
    },
    "sequencing-bottlenecks": {
      narrative: `**Critical path identified — 18 weeks door-to-door.**

Here's how the job sequences, longest-pole first:

| # | Phase | Duration | Depends on | Notes |
|---|---|---|---|---|
| 1 | Site prep + demo | 1 wk | — | Start immediately |
| 2 | Foundation + underslab MEP | 3 wks | Demo | Pull permits during week 1 |
| 3 | Framing + roof dry-in | 4 wks | Foundation cure | Order trusses now, 3-wk lead |
| 4 | MEP rough-in | 3 wks | Framing 75% | Runs parallel with window install |
| 5 | Insulation + drywall | 2 wks | MEP rough + inspections | Can't start until rough inspections pass |
| 6 | Interior finishes | 3 wks | Drywall + paint | Cabinets 4-wk lead, order during week 4 |
| 7 | Final MEP trim + appliances | 1 wk | Finishes | |
| 8 | Final inspections + punch | 1 wk | Everything | |

**Bottlenecks**
1. **Truss lead time (3 wks)** — order during week 1 or framing slides
2. **Electrical rough inspection** — schedules fill; book the inspection the day MEP rough starts
3. **Cabinetry** — 4-wk lead; confirm order during week 4 latest

**Parallel opportunities**
- Windows install during MEP rough (week 5)
- Paint prep + primer during drywall tape-and-float
- Landscaping + driveway during interior finish (weeks 12–14)

**Schedule risk**
- Weather: framing + roof dry-in is the weather-sensitive window. Build a 1-wk float.
- Subs: your electrician's calendar is tightest. Lock them at contract signing.

*Draft sequence. Revisit after framing inspection; real schedule lives on your GC calendar.*`,
      structured: {
        critical_path: ["Site prep", "Foundation", "Framing", "MEP rough", "Drywall", "Finishes", "Final"],
        total_weeks: 18,
        bottlenecks: [
          { phase: "Truss fabrication", lead_weeks: 3, mitigation: "Order week 1" },
          { phase: "Electrical rough inspection", risk: "Schedule fills 2 weeks out" },
          { phase: "Cabinetry", lead_weeks: 4, mitigation: "Order by week 4" },
        ],
        parallel_tracks: ["Windows during MEP rough", "Paint prep during drywall tape"],
        schedule_risks: ["Weather during roof dry-in", "Electrician calendar"],
      },
    },
    "crew-optimization": {
      narrative: `**Current plan runs $182k in labor. Optimized plan: $164k (10% savings).**

Here's where the fat is:

| Phase | Current crew | Optimal crew | Saving |
|---|---|---|---|
| Framing | 4 carps, 2 wks | 3 carps, 2 wks | $4,200 |
| MEP rough | All trades sequential | Electrical + Plumbing parallel | $6,800 |
| Drywall | 3 hangers + 2 finishers, 2 wks | 2 hangers + 2 finishers, 10 days | $3,400 |
| Finish | 5 trades overlapping | Staggered 3-trade rotation | $3,200 |

**Trade-off:** Optimized plan adds 4 days to total schedule because electrical + plumbing can't fully overlap in tight spaces. Cost saving usually wins unless you're pushing a hard finish date.

**What this means for bidding**
- Bid $182k → win rate drops, but margin's there if you land it
- Bid $164k + 4-day cushion → competitive + still profitable
- Keep $6k overhead buffer for either path

*Draft labor plan. Numbers firm up after walk-through; regional wage rate assumed $42/hr loaded.*`,
      structured: {
        current_labor: 182000,
        optimized_labor: 164000,
        savings: 18000,
        schedule_impact_days: 4,
        trade_offs: ["Slightly longer schedule", "Tighter coordination required"],
      },
    },
  };

  // Stage-aware generic fallback so we NEVER leak compliance content into an
  // unrelated workflow. If a specialist has no mock entry, return a neutral
  // "demo mode" placeholder that matches the workflow's category.
  const fallback = {
    narrative: `**Draft analysis — demo mode active.**

Your input: "${context.scope_description.substring(0, 100)}${context.scope_description.length > 100 ? "…" : ""}"

This specialist ships real analysis when connected to the live LLM backend. In demo mode we return a neutral placeholder so nothing misleads you — for the production run, we'd return a specific, sourced recommendation based on your project data.

**What this specialist does when live:**
- Pulls from the BKG database for your jurisdiction, materials, and crew history
- Runs a 3-source verification (primary code + amendments + local AHJ)
- Returns a confidence-rated answer with citations you can take to an inspector

**Demo paths that ARE live right now:**
- Code Compliance (q5) — real 3-source verification with NEC 2023 + IBC + local amendments
- Supply Ordering (q11) — live cost matrix from Home Depot Pro, 84 Lumber, White Cap
- Estimating (q2) — itemized cost breakdown by trade

*Placeholder response. Real specialist output available when ANTHROPIC_API_KEY is configured in this environment.*`,
    structured: {
      mode: "demo",
      specialist_id: specialistId,
      note: "Neutral placeholder — no specialist-specific mock registered for this ID.",
    },
  };

  const mockResponse = mockResponses[specialistId] || fallback;

  return {
    narrative: mockResponse.narrative,
    structured: mockResponse.structured,
    citations: (mockResponse.structured.citations as SpecialistCitation[]) || [],
    confidence: "medium",
    deferred_to_human: "Mock response — ANTHROPIC_API_KEY not configured",
    raw_response: mockResponse.narrative,
    model: MODEL,
    latency_ms: Date.now() - startTime,
    promptVersion: version,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "...";
}
