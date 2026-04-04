// Builder's Knowledge Garden — AI Construction Copilot API
// POST /api/v1/copilot
// Streaming SSE endpoint: query → retrieve → augment → stream cited response
// Feeds RSI Loop 5 (Copilot Quality Improvement)

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

export async function POST(request: NextRequest) {
  const start = Date.now();

  let body: { query: string; jurisdiction?: string; lane?: string; project_context?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { query, jurisdiction, lane, project_context } = body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return new Response(JSON.stringify({ error: "query is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 1. RETRIEVE — pull relevant knowledge entities
  const retrieval = await retrieveEntities(query, {
    jurisdiction,
    limit: 8,
  });

  // 2. AUGMENT — build system prompt with retrieved entities + lane personality
  const systemPrompt = buildSystemPrompt(retrieval.entities, jurisdiction, lane);

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
    return streamMockResponse(query, retrieval.entities, start);
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
  startTime: number
) {
  const encoder = new TextEncoder();

  // Build a realistic mock response based on the query
  const mockAnswer = generateMockAnswer(query, entities);

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
  entities: { id: string; slug: string; title: string; entity_type: string }[]
): string {
  const q = query.toLowerCase();

  if (q.includes("sprinkler") || q.includes("fire")) {
    return `Based on the knowledge base, here's what you need to know about fire protection requirements:

Per [IBC Section 903.2.1 — Automatic Sprinkler Systems](entity:0), automatic sprinkler systems are required throughout all buildings based on occupancy and area thresholds. For Group A (assembly) occupancies, NFPA 13 systems are required when the fire area exceeds 12,000 square feet. Group I (institutional) and Group R-1/R-2 (residential) occupancies require sprinklers regardless of size.

The type of system depends on your building type:
- **NFPA 13** — Full systems for commercial and institutional buildings
- **NFPA 13R** — Permitted for Group R occupancies up to 4 stories
- **NFPA 13D** — Permitted for one- and two-family dwellings

⚠️ **Important:** Fire protection requirements are life-safety critical. Always verify requirements with the Authority Having Jurisdiction (AHJ) for your specific project location and building type. Local amendments may impose stricter requirements than the base IBC.`;
  }

  if (q.includes("fall") || q.includes("safety") || q.includes("osha")) {
    return `Here are the fall protection requirements from the knowledge base:

According to [OSHA 1926.502 — Fall Protection Requirements](entity:1), fall protection is required for any construction worker on a walking/working surface with an unprotected side or edge **6 feet or more** above a lower level.

Three approved fall protection methods:
1. **Guardrail systems** — Top rail at 42 inches (±3 inches), capable of withstanding 200 lbs of force
2. **Safety net systems** — Installed as close as practicable, no more than 30 feet below the working surface
3. **Personal fall arrest systems** — Must limit maximum arresting force to 1,800 pounds

For hoisting areas, a chain, gate, or removable guardrail section must be placed across the access opening.

⚠️ **Critical safety note:** Fall protection is the #1 cited OSHA violation in construction. Always ensure your crew has proper training, equipment inspection, and site-specific fall protection plans. Consult OSHA 1926 Subpart M for complete requirements.`;
  }

  if (q.includes("concrete") || q.includes("foundation")) {
    return `Here's what the knowledge base contains about concrete specifications:

Per [Concrete — 4000 PSI Normal Weight](entity:2), the standard structural concrete mix has these properties:

- **Compressive strength:** 4,000 psi (27.6 MPa) at 28 days
- **Unit weight:** 150 lb/ft³ (2,400 kg/m³)
- **Water-cement ratio:** 0.45-0.50
- **Slump:** 4-6 inches for general structural use
- **Air entrainment:** 5-7% for freeze-thaw exposure environments

**Critical placement conditions:**
- Minimum temperature: 50°F (10°C) — cold weather concrete requires heating and insulation
- Maximum temperature: 90°F (32°C) — hot weather requires retarders and evaporation protection
- Maintain moist curing for minimum 7 days

**Form stripping schedule:**
- Walls: 24 hours minimum
- Slabs and beams: 7 days
- Cantilevered sections: 14 days

Design governed by ACI 318. Falls under CSI Division 03 31 00.`;
  }

  // Generic response
  const entityRefs = entities
    .slice(0, 3)
    .map((e, i) => `[${e.title}](entity:${i})`)
    .join(", ");

  return `Based on the Builder's Knowledge Garden, here's what I found related to your question:

The knowledge base contains relevant information across ${entities.length} entities: ${entityRefs || "various construction knowledge sources"}.

For your specific question about "${query}", I'd recommend:

1. **Check applicable codes** for your jurisdiction — requirements vary significantly by location
2. **Review material specifications** to ensure compliance with project requirements
3. **Consult with licensed professionals** for safety-critical decisions

The Builder's Knowledge Garden covers 40,000+ entities across 142+ jurisdictions. For more specific guidance, try narrowing your question to a specific jurisdiction, building type, or code section.

Would you like me to dive deeper into any specific aspect?`;
}
