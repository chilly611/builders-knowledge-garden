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

const MODEL = "claude-sonnet-4-20250514";

// Import types for type safety
import type { KnowledgeEntity } from "@/lib/rag";

// Stage-aware system prompts and action suggestions
const STAGE_SYSTEM_PROMPTS: Record<number, string> = {
  0: `You're the builder's concierge. Help them pick a workflow and understand the journey ahead.`,
  1: `You're a GC's estimator and risk-scorer. Help with bids, client lookup, markup strategy, and project qualification.`,
  2: `You're a contracts and code-compliance specialist. Help with contract templates, code compliance, permits, and risk mitigation.`,
  3: `You're a scheduler and resource planner. Help sequence trades, size crews, source materials, and optimize job flow.`,
  4: `You're a field ops foreman. Help with daily logs, safety briefings, weather adaptation, and expense tracking.`,
  5: `You're a change-order specialist. Help scope change requests, price them accurately, and update the schedule.`,
  6: `You're a billing and collections specialist. Help with draw requests, lien waivers, payroll, and cash flow.`,
  7: `You're a post-project reviewer. Help with warranty claims, retrospectives, lessons learned, and referral generation.`,
};

// Suggested action buttons per stage. Each stage gets 3 contextual buttons.
const STAGE_ACTION_BUTTONS: Record<number, Array<{ label: string; route: string }>> = {
  0: [
    { label: "Estimate the job", route: "/killerapp/workflows/estimating" },
    { label: "See all workflows", route: "/killerapp" },
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


  // 1. RETRIEVE — pull relevant knowledge entities
  const retrieval = await retrieveEntities(query, {
    jurisdiction,
    limit: 8,
  });

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
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              fullText += text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "chunk", text })}\n\n`
                )
              );
            }
          }

          // Append action buttons if not already present
          const buttons = STAGE_ACTION_BUTTONS[validatedStage] || STAGE_ACTION_BUTTONS[0];
          if (!fullText.includes("What next?")) {
            const buttonMarkdown = buttons
              .map((btn) => `- [${btn.label}](action:${btn.route})`)
              .join("\n");
            const buttonsText = `\n\n**What next?**\n${buttonMarkdown}`;
            fullText += buttonsText;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "chunk", text: buttonsText })}\n\n`
              )
            );
          }

          // Send completion with citation info
          const citedIds = extractCitations(fullText, retrieval.entities);

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

  return `${baseAnswer}

**What next?**
${buttonMarkdown}`;
}
