// Builder's Knowledge Garden — AI Construction Copilot API
// POST /api/v1/copilot
// Streaming SSE endpoint: query → retrieve → augment → stream cited response
// Feeds RSI Loop 5 (Copilot Quality Improvement)
//
// STAGE-AWARE: Accepts `stage` (0-7) to tailor role, context, and action buttons to the project lifecycle.
// ALWAYS returns 3 action buttons in markdown format.

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { emitCopilotSignal } from "@/lib/events";
import {
  retrieveEntities,
  buildSystemPrompt,
  extractCitations,
  COPILOT_PROMPT_VERSION,
} from "@/lib/rag";
import { getServiceClient } from "@/lib/auth-server";

const MODEL = "claude-sonnet-4-20250514";

// Import types for type safety
import type { KnowledgeEntity } from "@/lib/rag";

// ─────────────────────────────────────────────────────────────────────────────
// Project Spine v1 (2026-05-03) — best-effort persistence helpers
// ─────────────────────────────────────────────────────────────────────────────
// When a /api/v1/copilot request includes a real project UUID, persist
// the user query + assistant response to project_conversations and
// best-effort UPDATE the project record (ai_summary, jurisdiction,
// project_type, cost range). Fire-and-forget; never block the stream.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isProjectId(s: string | undefined | null): s is string {
  return !!s && s !== "default" && UUID_RE.test(s);
}

// Cost range patterns ordered most-specific first.
// Group 3 (when present) is the unit suffix: k/thousand → ×1000, m/million → ×1,000,000.
//
// Examples that should match:
//   "$30,000–$45,000"           → low=30000, high=45000  (no unit)
//   "$1.4M–$1.8M"               → low=1400000, high=1800000  (M unit on both)
//   "$1.4M to $1.8M"            → same
//   "30k–45k"                   → low=30000, high=45000
//   "between 30 and 45 thousand" → low=30000, high=45000
//
// Real ADU/wellness builds quote in millions; the original regex only
// caught k/thousand and missed every realistic high-end ADU estimate
// (the founder's San Diego ADU prod test landed $1.4M–$1.8M and
// estimated_cost_low/high stayed null). Adding the m/million capture
// fixes that.
const COST_RANGE_PATTERNS: RegExp[] = [
  // "$X[m|M|k]–$Y[m|M|k]" — both endpoints carry the same unit suffix
  /\$\s?([\d,]+(?:\.\d+)?)\s?(m|million|k|thousand)?\s?(?:[-–—]|to)\s?\$\s?([\d,]+(?:\.\d+)?)\s?(m|million|k|thousand)?/i,
  // "X–Y k|thousand|m|million" — unit suffix only at the end
  /([\d,]+(?:\.\d+)?)\s?(?:[-–—]|to)\s?([\d,]+(?:\.\d+)?)\s?(k|thousand|m|million)/i,
];

function parseDollarToken(token: string, unit?: string): number | null {
  const cleaned = token.replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (!unit) return Math.round(n);
  const u = unit.toLowerCase();
  if (u === "k" || u === "thousand") return Math.round(n * 1000);
  if (u === "m" || u === "million") return Math.round(n * 1_000_000);
  return Math.round(n);
}

interface ParsedFromResponse {
  ai_summary?: string;
  jurisdiction?: string;
  project_type?: string;
  estimated_cost_low?: number;
  estimated_cost_high?: number;
}

function parseAiResponse(
  fullText: string,
  request: { jurisdiction?: string }
): ParsedFromResponse {
  const out: ParsedFromResponse = {};
  out.ai_summary =
    fullText.length > 600 ? `${fullText.slice(0, 597).trimEnd()}…` : fullText;

  if (request.jurisdiction) {
    out.jurisdiction = request.jurisdiction;
  } else {
    const m = fullText.match(/Jurisdiction:\s*([^\n.]{2,40})/i);
    if (m) out.jurisdiction = m[1].trim();
  }

  const ptMatch = fullText.match(/Project type:\s*([^\n.]{2,40})/i);
  if (ptMatch) out.project_type = ptMatch[1].trim();

  // Pattern 1 captures: ($lowNum, lowUnit, $highNum, highUnit) — unit
  //   suffixes can appear on either or both endpoints.
  // Pattern 2 captures: (lowNum, highNum, sharedUnit) — unit only at end.
  // Both patterns share the same downstream resolution: prefer an
  // endpoint-local unit, fall back to a shared one. If only one endpoint
  // has a unit (e.g. "$1.4M to $1.8M" written as "$1.4–1.8M"), the
  // unit is shared.
  for (let i = 0; i < COST_RANGE_PATTERNS.length; i++) {
    const re = COST_RANGE_PATTERNS[i];
    const m = fullText.match(re);
    if (!m) continue;
    let lowToken: string;
    let highToken: string;
    let lowUnit: string | undefined;
    let highUnit: string | undefined;
    if (i === 0) {
      // Pattern 1: $X[unit] – $Y[unit]
      lowToken = m[1];
      lowUnit = m[2];
      highToken = m[3];
      highUnit = m[4];
      // If only one side specified a unit, share it across both.
      if (lowUnit && !highUnit) highUnit = lowUnit;
      if (highUnit && !lowUnit) lowUnit = highUnit;
    } else {
      // Pattern 2: X – Y unit
      lowToken = m[1];
      highToken = m[2];
      lowUnit = m[3];
      highUnit = m[3];
    }
    const low = parseDollarToken(lowToken, lowUnit);
    const high = parseDollarToken(highToken, highUnit);
    if (low !== null && high !== null && low <= high) {
      out.estimated_cost_low = low;
      out.estimated_cost_high = high;
      break;
    }
  }
  return out;
}

async function persistProjectExchange(args: {
  project_id: string;
  query: string;
  response: string;
  jurisdiction?: string;
}): Promise<void> {
  try {
    const client = getServiceClient();
    await client.from("project_conversations").insert([
      { project_id: args.project_id, role: "user", content: args.query },
      { project_id: args.project_id, role: "assistant", content: args.response },
    ]);

    const parsed = parseAiResponse(args.response, { jurisdiction: args.jurisdiction });
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.ai_summary !== undefined) update.ai_summary = parsed.ai_summary;
    if (parsed.jurisdiction) update.jurisdiction = parsed.jurisdiction;
    if (parsed.project_type) update.project_type = parsed.project_type;
    if (parsed.estimated_cost_low !== undefined) update.estimated_cost_low = parsed.estimated_cost_low;
    if (parsed.estimated_cost_high !== undefined) update.estimated_cost_high = parsed.estimated_cost_high;

    if (Object.keys(update).length > 1) {
      await client
        .from("command_center_projects")
        .update(update)
        .eq("id", args.project_id);
    }
  } catch (err) {
    console.error("Copilot project persistence failed:", err);
  }
}

// Stage-aware system prompts and action suggestions
const STAGE_SYSTEM_PROMPTS: Record<number, string> = {
  0: `You're a foreman giving a site walkthrough orientation at the landing page. When someone describes a project scope, respond with SUBSTANTIVE, SPECIFIC observations — not a workflow router.

RESPOND WITH:
1. Opening: "Alright, here's how I'd read it:" or "Let me think this through:"
2. Then 2–4 concrete observations drawn from the scope:
   - BALLPARK COST RANGE: Give a rough $X–$Y estimate in appropriate territory (e.g., "$1.2M–$1.6M for a modernist coastal ADU with spa/plunge features")
   - RISK FLAGS: Name 2–3 specific cost drivers or complexity triggers from the scope (e.g., "Wellness features + radiant heating + plunge pool = waterproofing detail = cost can balloon fast"; "San Diego coastal site = Title 24 compliance + potential WUI zone restrictions")
   - SEQUENCE IMPLICATIONS: What trades matter most? What's long-lead? (e.g., "Spa/gym/cold plunge = MEP complexity, specialty finishes, permit path gets longer")
   - SITE-SPECIFIC CONCERNS: Jurisdiction, climate, site constraints that affect the build (e.g., coastal, seismic, flood zones, Title 24)
3. Close: Plain sentence like "Here's where I'd start:" then present 3 action buttons in the EXACT format below.

VOICE: Foreman. Direct. Confident. NO disclaimers, NO "consult an architect," NO hedging. Use SPECIFIC numbers where possible.
LENGTH: 180-260 words. Substantive but fast-read.

CRITICAL: After your response, ALWAYS include exactly this block verbatim (do NOT modify):

**What next?**
- [Estimate the job](action:/killerapp/workflows/estimating)
- [Check codes](action:/killerapp/workflows/code-compliance)
- [Contract templates](action:/killerapp/workflows/contract-templates)

Do NOT write labels as plain text. Do NOT use asterisks around labels. The markdown format [label](action:/path) is REQUIRED.

EXAMPLE RESPONSE for "2500 sqft ADU in San Diego with spa, gym, cold plunge":
---
Alright, here's how I'd read it: You're building a high-spec ADU in a coastal market with luxury wellness features. That puts you in the $1.2M–$1.6M range depending on finishes and your radiant system choice.

Here's what jumps out:
— Wellness (spa + cold plunge + gym) means radiant floor systems + heavy waterproofing + tile/specialty surfaces. That detail work is where budgets go sideways. Slope it wrong or skimp on the membrane and you're eating a costly repair two years in.
— San Diego coastal = Title 24 energy compliance is strict. Your thermal envelope, window U-values, and HVAC efficiency have to pencil or permitting stalls. Radiant + high-performance envelope = higher upfront cost.
— Long-lead: custom spa equipment (8–10 week lead), cabinetry if semi-custom (6–8 weeks). Get those orders in early or your finish schedule slips.
— MEP complexity: separate circuits for the plunge chiller, ventilation for humidity control, upgraded electrical service. Coordinator's nightmare if you don't stage it right.

Here's where I'd start:

**What next?**
- [Estimate the job](action:/killerapp/workflows/estimating)
- [Check codes](action:/killerapp/workflows/code-compliance)
- [Contract templates](action:/killerapp/workflows/contract-templates)
---`,

  1: `You're a GC's estimator and risk-scorer at the Size up stage. If the user describes a project scope, respond with: (a) a rough cost range in $X–$Y form, (b) 3 risk flags, (c) a markup recommendation. Do NOT quote code sections, zoning rules, or ADU regulations. Those are Lock-it-in concerns — route there if asked.

CRITICAL: After your response, ALWAYS include exactly this block verbatim (do NOT modify):

**What next?**
- [Run a cost estimate](action:/killerapp/workflows/estimating)
- [Check code compliance](action:/killerapp/workflows/code-compliance)
- [Manage contractors](action:/killerapp/workflows/sub-management)

Do NOT write labels as plain text. Do NOT use asterisks around labels. The markdown format [label](action:/path) is REQUIRED.`,

  2: `You're a contracts and code-compliance specialist at the Lock it in stage. Cite codes with [Title](entity:INDEX). Name the local jurisdiction by its actual Building Department name (e.g., "San Diego Development Services") — NEVER the generic phrase "Authority Having Jurisdiction" or "AHJ". State what IS required confidently. If scope exceeds a threshold (like 2500 sqft vs 1200 sqft ADU cap), STATE it as a design constraint, never as a denial.

CRITICAL: After your response, ALWAYS include exactly this block verbatim (do NOT modify):

**What next?**
- [Jump to Code Compliance](action:/killerapp/workflows/code-compliance)
- [Apply for permits](action:/killerapp/workflows/permit-applications)
- [Review contracts](action:/killerapp/workflows/contract-templates)

Do NOT write labels as plain text. Do NOT use asterisks around labels. The markdown format [label](action:/path) is REQUIRED.`,

  3: `You're a scheduler and sequencing specialist at the Plan it out stage.

  HARD RULE: If the user describes a project (e.g. "2500 sqft ADU in San Diego"), you MUST respond with a SEQUENCE PLAN. Give them: (a) an 18-24 week critical path broken into phases, (b) parallel work opportunities, (c) the two or three bottlenecks (long-lead items like trusses, cabinetry, inspections). Format: markdown table with Phase / Duration / Depends-on / Notes columns.

  DO NOT discuss code compliance, zoning regulations, ADU size limits, permitting rules, or whether something is "permitted". Those are Lock-it-in questions — if asked, answer in ONE line and point them to code-compliance with a button.

  You are a scheduler. You sequence work. That is your entire job.

CRITICAL: After your response, ALWAYS include exactly this block verbatim (do NOT modify):

**What next?**
- [Sequence the trades](action:/killerapp/workflows/job-sequencing)
- [Plan crew size](action:/killerapp/workflows/worker-count)
- [Source materials](action:/killerapp/workflows/supply-ordering)

Do NOT write labels as plain text. Do NOT use asterisks around labels. The markdown format [label](action:/path) is REQUIRED.`,

  4: `You're a field ops foreman at the Build stage. Answer about daily logs, weather, safety, expenses, crew management. If asked about codes or regulations, redirect to Lock-it-in.

CRITICAL: After your response, ALWAYS include exactly this block verbatim (do NOT modify):

**What next?**
- [Log the day](action:/killerapp/workflows/daily-log)
- [Track expenses](action:/killerapp/workflows/expenses)
- [Safety briefing](action:/killerapp/workflows/osha-toolbox)

Do NOT write labels as plain text. Do NOT use asterisks around labels. The markdown format [label](action:/path) is REQUIRED.`,

  5: `You're a change-order specialist at the Adapt stage. When changes come up: scope them, price them, update the schedule impact.

CRITICAL: After your response, ALWAYS include exactly this block verbatim (do NOT modify):

**What next?**
- [Scope the change](action:/killerapp/workflows/compass-nav)
- [Update the schedule](action:/killerapp/workflows/job-sequencing)
- [Track expenses](action:/killerapp/workflows/expenses)

Do NOT write labels as plain text. Do NOT use asterisks around labels. The markdown format [label](action:/path) is REQUIRED.`,

  6: `You're a billing and collections specialist at the Collect stage. Draw requests, lien waivers, payroll, retainage chase.

CRITICAL: After your response, ALWAYS include exactly this block verbatim (do NOT modify):

**What next?**
- [Submit draw request](action:/killerapp/workflows/compass-nav)
- [Track payments](action:/killerapp/workflows/expenses)
- [Manage payroll](action:/killerapp/workflows/hiring)

Do NOT write labels as plain text. Do NOT use asterisks around labels. The markdown format [label](action:/path) is REQUIRED.`,

  7: `You're a post-project reviewer at the Reflect stage. Warranty notes, retrospective, referral generation, lessons learned.

CRITICAL: After your response, ALWAYS include exactly this block verbatim (do NOT modify):

**What next?**
- [Warranty notes](action:/killerapp/workflows/compass-nav)
- [Project retrospective](action:/killerapp)
- [Generate referrals](action:/killerapp/workflows/outreach)

Do NOT write labels as plain text. Do NOT use asterisks around labels. The markdown format [label](action:/path) is REQUIRED.`,
};

// Only RAG-retrieve code entities on stages where code content is relevant.
// Prevents code entities from bleeding into sequencing/scheduling/field-ops responses.
const STAGES_THAT_USE_CODE_RAG = new Set<number>([2]); // Only Lock-it-in pulls compliance docs

// Suggested action buttons per stage. Each stage gets 3 contextual buttons.
const STAGE_ACTION_BUTTONS: Record<number, Array<{ label: string; route: string }>> = {
  0: [
    { label: "Estimate the job", route: "/killerapp/workflows/estimating" },
    { label: "Check codes", route: "/killerapp/workflows/code-compliance" },
    { label: "Contract templates", route: "/killerapp/workflows/contract-templates" },
  ],
  1: [
    { label: "Run a cost estimate", route: "/killerapp/workflows/estimating" },
    { label: "Check code compliance", route: "/killerapp/workflows/code-compliance" },
    { label: "Manage contractors", route: "/killerapp/workflows/sub-management" },
  ],
  2: [
    { label: "Jump to Code Compliance", route: "/killerapp/workflows/code-compliance" },
    { label: "Apply for permits", route: "/killerapp/workflows/permit-applications" },
    { label: "Review contracts", route: "/killerapp/workflows/contract-templates" },
  ],
  3: [
    { label: "Sequence the trades", route: "/killerapp/workflows/job-sequencing" },
    { label: "Plan crew size", route: "/killerapp/workflows/worker-count" },
    { label: "Source materials", route: "/killerapp/workflows/supply-ordering" },
  ],
  4: [
    { label: "Log the day", route: "/killerapp/workflows/daily-log" },
    { label: "Track expenses", route: "/killerapp/workflows/expenses" },
    { label: "Safety briefing", route: "/killerapp/workflows/osha-toolbox" },
  ],
  5: [
    { label: "Scope the change", route: "/killerapp/workflows/compass-nav" },
    { label: "Update the schedule", route: "/killerapp/workflows/job-sequencing" },
    { label: "Track expenses", route: "/killerapp/workflows/expenses" },
  ],
  6: [
    { label: "Submit draw request", route: "/killerapp/workflows/compass-nav" },
    { label: "Track payments", route: "/killerapp/workflows/expenses" },
    { label: "Manage payroll", route: "/killerapp/workflows/hiring" },
  ],
  7: [
    { label: "Warranty notes", route: "/killerapp/workflows/compass-nav" },
    { label: "Project retrospective", route: "/killerapp" },
    { label: "Generate referrals", route: "/killerapp/workflows/outreach" },
  ],
};

// ---------------------------------------------------------------------------
// POST-PROCESSING SANITIZER: Strip banned CYA vocabulary
// ---------------------------------------------------------------------------
/**
 * Sanitizes copilot responses by removing banned phrases and sentences.
 * Applies the following transformations:
 * 1. Replace "Authority Having Jurisdiction" / "AHJ" → "the local building department"
 * 2. Replace "consult (with) a licensed..." → "work with a qualified"
 * 3. Replace "(not permitted|cannot be built|is illegal)" → "subject to a design-path choice"
 * 4. Strip "Important:" headers
 * 5. Remove entire sentences containing CYA-prone phrases
 */
function sanitizeCopilotResponse(text: string): string {
  if (!text) return text;

  let result = text;

  // 1. Replace "Authority Having Jurisdiction" or "AHJ" → "the local building department"
  // Handle "The Authority Having Jurisdiction" (case variations)
  result = result.replace(/\bThe\s+Authority Having Jurisdiction\b/gi, (match) =>
    match.startsWith('T') ? "The local building department" : "the local building department"
  );
  // Handle "the Authority Having Jurisdiction" (lowercase variations)
  result = result.replace(/\bthe\s+Authority Having Jurisdiction\b/gi, "the local building department");
  // Handle standalone "Authority Having Jurisdiction" (case-insensitive)
  result = result.replace(/\bAuthority Having Jurisdiction\b/gi, "the local building department");
  // Handle "The AHJ" (case variations)
  result = result.replace(/\bThe\s+AHJ\b/g, "The local building department");
  result = result.replace(/\bthe\s+AHJ\b/g, "the local building department");
  // Handle remaining standalone AHJ (whole word)
  result = result.replace(/\bAHJ\b/g, "the local building department");

  // 2. Replace "consult (with) a licensed (architect|engineer|attorney|professional)" → "work with a qualified"
  result = result.replace(
    /[Cc]onsult\s+(with\s+)?a\s+licensed\s+(architect|engineer|attorney|professional)/gi,
    "work with a qualified"
  );

  // 3. Replace phrases indicating prohibition → "subject to a design-path choice"
  result = result.replace(
    /(not permitted|cannot be built|is illegal)/gi,
    "subject to a design-path choice"
  );

  // 4. Strip "**Important:**" and "*Important:" patterns completely
  result = result.replace(/\*\*Important:\*\*\s*/gi, "");
  result = result.replace(/\*Important:\*\s*/gi, "");
  result = result.replace(/^Important:\s*/gim, "");

  // 5. Remove entire sentences containing CYA-prone phrases
  const cyaPatterns = [
    /[^.!?\n]*\bConsult\s+with\b[^.!?\n]*[.!?\n]/gi,
    /[^.!?\n]*\bYou\s+should\s+retain\b[^.!?\n]*[.!?\n]/gi,
    /[^.!?\n]*\bVerify\s+with\s+your\s+building\s+department\b[^.!?\n]*[.!?\n]/gi,
    /[^.!?\n]*\bWe\s+recommend\s+engaging\b[^.!?\n]*[.!?\n]/gi,
  ];

  for (const pattern of cyaPatterns) {
    result = result.replace(pattern, "");
  }

  return result.trim();
}

// ---------------------------------------------------------------------------
// Stage-aware system prompt builder
// ---------------------------------------------------------------------------
function buildStageAwareSystemPrompt(
  entities: KnowledgeEntity[],
  jurisdiction: string | undefined,
  lane: string | undefined,
  stage: number,
  stageRole: string
): string {
  const entityContext = entities
    .map(
      (e, i) =>
        `<entity index="${i}" id="${e.id}" type="${e.entity_type}" title="${e.title}">
${e.summary}${e.body ? "\n" + truncate(e.body, 800) : ""}
</entity>`
    )
    .join("\n\n");

  return `You are the AI Construction Copilot for the Builder's Knowledge Garden.

STAGE ROLE: ${stageRole}

CORE RULES:
1. Answer in the voice of your role. Be direct, practical, and foreman-like. No corporate jargon.
2. Cite all factual claims using [Title](entity:INDEX) format where INDEX is the entity index number.
3. If knowledge entities don't have enough info, say so honestly. Never fabricate codes or safety info.
4. BAN CYA VOCABULARY:
   - Do NOT say "consult a licensed architect/engineer/attorney"
   - Do NOT mention "Authority Having Jurisdiction" (AHJ) unless the user asked
   - Do NOT punt to external professionals
   - Answer concretely. If truly out of scope, offer a button to jump to the right workflow.
5. Be concise. Construction professionals need actionable answers, not essays.
6. ALWAYS end your response with exactly 3 action buttons in this markdown format:
   **What next?**
   - [Button Label](action:/killerapp/workflows/workflow-name)
   - [Button Label](action:/killerapp/workflows/workflow-name)
   - [Button Label](action:/killerapp/workflows/workflow-name)

CRITICAL: The 3 action buttons MUST be included in every response. Never omit them.
${jurisdiction ? `\n7. User jurisdiction: ${jurisdiction}. Prioritize relevant info for this location.` : ""}

KNOWLEDGE ENTITIES (retrieved for this query):
${entityContext || "No entities retrieved — answer from your construction knowledge."}

Remember: You're the foreman's copilot at stage ${stage}. Be authoritative, practical, and solve the problem.`;
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "...";
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  let body: {
    query: string;
    jurisdiction?: string;
    lane?: string;
    stage?: number;
    workflowId?: string;
    projectId?: string;
    project_context?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { query, jurisdiction, lane, stage = 0, workflowId, projectId, project_context } = body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return new Response(JSON.stringify({ error: "query is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate stage
  const validatedStage = Math.max(0, Math.min(7, Math.floor(Number(stage) || 0)));


  // 1. RETRIEVE — only pull knowledge entities on stages where code content is relevant.
  // W9.D.5 fix: Plan-it-out / Build / Adapt stages no longer get code entities
  // injected, which was causing the LLM to respond with zoning/permit answers
  // when the user asked about sequencing or field ops.
  const shouldUseRAG = STAGES_THAT_USE_CODE_RAG.has(validatedStage);
  const retrieval = shouldUseRAG
    ? await retrieveEntities(query, { jurisdiction, limit: 8 })
    : { entities: [] as KnowledgeEntity[], retrieval_method: "skipped" as const, latency_ms: 0 };

  // 2. AUGMENT — build stage-aware system prompt with retrieved entities + lane personality
  const stageRole = STAGE_SYSTEM_PROMPTS[validatedStage];
  const systemPrompt = buildStageAwareSystemPrompt(
    retrieval.entities,
    jurisdiction,
    lane,
    validatedStage,
    stageRole
  );

  // Build user message with optional project context
  let userMessage = query;
  if (project_context) {
    const ctx = project_context;
    const parts: string[] = [];
    if (ctx.building_type) parts.push(`Building type: ${ctx.building_type}`);
    if (ctx.jurisdiction) parts.push(`Jurisdiction: ${ctx.jurisdiction}`);
    if (ctx.sqft) parts.push(`Size: ${ctx.sqft} sf`);
    if (ctx.quality) parts.push(`Quality: ${ctx.quality}`);
    if (parts.length > 0) {
      userMessage = `[Project context: ${parts.join(", ")}]\n\n${query}`;
    }
  }

  // 3. GENERATE — stream response from Claude (or mock)
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Mock streaming response for development without API key
    return streamMockResponse(query, retrieval.entities, start, validatedStage);
  }

  // Real Claude API streaming
  try {
    const anthropic = new Anthropic({ apiKey });

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const encoder = new TextEncoder();
    let fullText = "";

    const readable = new ReadableStream({
      async start(controller) {
        // Send metadata first
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "meta",
              entities_retrieved: retrieval.entities.map((e) => ({
                id: e.id,
                slug: e.slug,
                title: e.title,
                type: e.entity_type,
              })),
              retrieval_method: retrieval.retrieval_method,
              retrieval_latency_ms: retrieval.latency_ms,
              prompt_version: COPILOT_PROMPT_VERSION,
              model: MODEL,
              stage: validatedStage,
            })}\n\n`
          )
        );

        try {
          // Collect full response from stream (NO per-token deltas sent to client)
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              fullText += text;
              // NO LONGER emit per-chunk deltas — accumulate server-side only
            }
          }

          // SANITIZE: Apply post-processing filter to remove banned CYA vocabulary
          const sanitizedText = sanitizeCopilotResponse(fullText);

          // Append action buttons if not already present
          const buttons = STAGE_ACTION_BUTTONS[validatedStage] || STAGE_ACTION_BUTTONS[0];
          let finalText = sanitizedText;
          // Check if response already has action buttons: look for [label](action: pattern
          const hasActionButtons = /\[.+?\]\(action:/.test(sanitizedText);
          if (!sanitizedText.includes("What next?") && !hasActionButtons) {
            const buttonMarkdown = buttons
              .map((btn) => `- [${btn.label}](action:${btn.route})`)
              .join("\n");
            const buttonsText = `\n\n**What next?**\n${buttonMarkdown}`;
            finalText += buttonsText;
          }

          // Emit SINGLE complete event with full sanitized text
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "complete", text: finalText })}\n\n`
            )
          );

          // Send completion with citation info
          const citedIds = extractCitations(finalText, retrieval.entities);

          // Emit RSI Loop 5 signal via event bus
          emitCopilotSignal({
            query, entities_retrieved: retrieval.entities.map((e) => e.id),
            entities_cited: citedIds, prompt_version: COPILOT_PROMPT_VERSION,
            model: MODEL, latency_ms: Date.now() - start,
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                entities_cited: citedIds,
                total_latency_ms: Date.now() - start,
                _rsi: {
                  loop: 5,
                  query,
                  jurisdiction,
                  entities_retrieved: retrieval.entities.map((e) => e.id),
                  entities_cited: citedIds,
                  prompt_version: COPILOT_PROMPT_VERSION,
                  model: MODEL,
                  latency_ms: Date.now() - start,
                  timestamp: new Date().toISOString(),
                },
              })}\n\n`
            )
          );

          // Project Spine v1: persist user query + assistant response to
          // project_conversations and best-effort update the project
          // record. Fire-and-forget; never block stream close.
          if (isProjectId(projectId)) {
            void persistProjectExchange({
              project_id: projectId,
              query,
              response: finalText,
              jurisdiction,
            });
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: err instanceof Error ? err.message : "Stream error",
              })}\n\n`
            )
          );
        }

        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Retrieval-Method": retrieval.retrieval_method,
        "X-Entities-Retrieved": String(retrieval.entities.length),
      },
    });
  } catch (err) {
    console.error("Copilot API error:", err);
    return new Response(
      JSON.stringify({
        error: "AI copilot error",
        details: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ---------------------------------------------------------------------------
// MOCK STREAMING — Simulates Claude response for development
// ---------------------------------------------------------------------------
function streamMockResponse(
  query: string,
  entities: { id: string; slug: string; title: string; entity_type: string }[],
  startTime: number,
  stage: number = 0
) {
  const encoder = new TextEncoder();

  // Build a realistic mock response based on the query and stage
  const mockAnswer = generateMockAnswer(query, entities, stage);

  const readable = new ReadableStream({
    async start(controller) {
      // Meta event
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "meta",
            entities_retrieved: entities.map((e) => ({
              id: e.id,
              slug: e.slug,
              title: e.title,
              type: e.entity_type,
            })),
            retrieval_method: "mock",
            retrieval_latency_ms: 0,
            prompt_version: COPILOT_PROMPT_VERSION,
            model: "mock",
          })}\n\n`
        )
      );

      // Stream text in chunks to simulate real LLM streaming
      const words = mockAnswer.split(" ");
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? "" : " ") + words[i];
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: chunk })}\n\n`)
        );
        // Simulate 20-60ms per token
        await new Promise((r) => setTimeout(r, 20 + Math.random() * 40));
      }

      // Done event
      const citedIds = entities.slice(0, 3).map((e) => e.id);

      // Emit RSI Loop 5 signal via event bus (mock path)
      emitCopilotSignal({
        query, entities_retrieved: entities.map((e) => e.id),
        entities_cited: citedIds, prompt_version: COPILOT_PROMPT_VERSION,
        model: "mock", latency_ms: Date.now() - startTime,
      });

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "done",
            entities_cited: citedIds,
            total_latency_ms: Date.now() - startTime,
            _mock: true,
            _rsi: {
              loop: 5,
              query,
              entities_retrieved: entities.map((e) => e.id),
              entities_cited: citedIds,
              prompt_version: COPILOT_PROMPT_VERSION,
              model: "mock",
              latency_ms: Date.now() - startTime,
              timestamp: new Date().toISOString(),
            },
          })}\n\n`
        )
      );

      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Retrieval-Method": "mock",
      "X-Mock": "true",
    },
  });
}

function generateMockAnswer(
  query: string,
  entities: { id: string; slug: string; title: string; entity_type: string }[],
  stage: number = 0
): string {
  const q = query.toLowerCase();
  const buttons = STAGE_ACTION_BUTTONS[stage] || STAGE_ACTION_BUTTONS[0];

  // Generate stage-appropriate response
  let baseAnswer = "";

  if (stage === 2 && (q.includes("sprinkler") || q.includes("fire"))) {
    // Stage 2 is Lock-it-in: focus on compliance
    baseAnswer = `Got it. Fire protection is a critical code requirement. Here's what I found:

Per [IBC Section 903.2.1 — Automatic Sprinkler Systems](entity:0), automatic sprinkler systems are required throughout all buildings based on occupancy and area thresholds. For Group A (assembly) occupancies, NFPA 13 systems are required when the fire area exceeds 12,000 square feet. Group I (institutional) and Group R-1/R-2 (residential) occupancies require sprinklers regardless of size.

System types depend on your building:
- **NFPA 13** — Full systems for commercial and institutional buildings
- **NFPA 13R** — Permitted for Group R occupancies up to 4 stories
- **NFPA 13D** — Permitted for one- and two-family dwellings

Make sure to check requirements for your specific jurisdiction and building type.`;
  } else if (stage === 4 && (q.includes("fall") || q.includes("safety") || q.includes("osha"))) {
    // Stage 4 is Build: focus on field ops and safety
    baseAnswer = `Safety first. Here's what you need to know about fall protection on your crew:

According to [OSHA 1926.502 — Fall Protection Requirements](entity:1), fall protection is required for any worker on a walking/working surface with an unprotected side or edge **6 feet or more** above a lower level.

Three approved methods:
1. **Guardrail systems** — Top rail at 42 inches (±3 inches), capable of withstanding 200 lbs of force
2. **Safety net systems** — Installed as close as practicable, no more than 30 feet below the working surface
3. **Personal fall arrest systems** — Must limit maximum arresting force to 1,800 pounds

Make sure your crew has proper training, equipment inspection, and site-specific fall protection plans.`;
  } else if (q.includes("concrete") || q.includes("foundation")) {
    baseAnswer = `Here's the concrete spec you need:

Per [Concrete — 4000 PSI Normal Weight](entity:2), the standard structural concrete mix:

- **Compressive strength:** 4,000 psi (27.6 MPa) at 28 days
- **Unit weight:** 150 lb/ft³ (2,400 kg/m³)
- **Water-cement ratio:** 0.45-0.50
- **Slump:** 4-6 inches for general structural use
- **Air entrainment:** 5-7% for freeze-thaw environments

**Placement:**
- Minimum temperature: 50°F (10°C) — cold weather needs heating and insulation
- Maximum temperature: 90°F (32°C) — hot weather needs retarders and evaporation protection
- Moist cure for minimum 7 days

**Form stripping:**
- Walls: 24 hours minimum
- Slabs and beams: 7 days
- Cantilevered sections: 14 days`;
  } else {
    // Generic stage-aware response
    const entityRefs = entities
      .slice(0, 3)
      .map((e, i) => `[${e.title}](entity:${i})`)
      .join(", ");

    const stageName = ["Landing", "Size up", "Lock it in", "Plan it out", "Build", "Adapt", "Collect", "Reflect"][stage];
    baseAnswer = `Got it. At the **${stageName}** stage, here's what I found related to your question:

The knowledge base contains relevant information across ${entities.length} entities: ${entityRefs || "various construction knowledge sources"}.

For your specific question about "${query}", here's what I can help with at this stage. Let me point you to the right workflow.`;
  }

  // ALWAYS append 3 action buttons in markdown format
  const buttonMarkdown = buttons
    .map((btn) => `- [${btn.label}](action:${btn.route})`)
    .join("\n");

  const answer = `${baseAnswer}

**What next?**
${buttonMarkdown}`;

  // Apply sanitizer to mock answer as well
  return sanitizeCopilotResponse(answer);
}
