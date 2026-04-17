// Builder's Knowledge Garden — AI Specialist Runner
// Server-side helper for invoking specialists from StepCard
// Week 1 AI wiring: load prompts, call Claude, parse structured responses

import { readFileSync } from "fs";
import { resolve } from "path";
import Anthropic from "@anthropic-ai/sdk";
import { retrieveEntities, type KnowledgeEntity } from "./rag";

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

export interface SpecialistResult {
  narrative: string;
  structured: Record<string, unknown>;
  citations: SpecialistCitation[];
  confidence: "high" | "medium" | "low";
  deferred_to_human?: string;
  raw_response: string;
  model: string;
  latency_ms: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RUNNER
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 2500;

export async function callSpecialist(
  specialistId: string,
  context: SpecialistContext,
  options?: { mockIfNoKey?: boolean; preferProductionPrompt?: boolean }
): Promise<SpecialistResult> {
  const start = Date.now();
  const mockIfNoKey = options?.mockIfNoKey !== false;
  const preferProductionPrompt = options?.preferProductionPrompt !== false;

  // 1. LOAD THE PROMPT
  const systemPrompt = loadSpecialistPrompt(specialistId, preferProductionPrompt);

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

  // 3. RETRIEVE RELEVANT ENTITIES IF JURISDICTION PROVIDED
  let entityContext = "";
  let citations: SpecialistCitation[] = [];

  if (context.jurisdiction) {
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
    return generateMockResult(specialistId, context, start);
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
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Specialist ${specialistId} failed: ${errMsg}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT LOADING
// ─────────────────────────────────────────────────────────────────────────────

function loadSpecialistPrompt(specialistId: string, preferProduction: boolean): string {
  // Try production version first
  if (preferProduction) {
    const prodPath = resolve(process.cwd(), `app/docs/ai-prompts/${specialistId}.production.md`);
    try {
      const content = readFileSync(prodPath, "utf-8");
      return extractSystemPrompt(content, "production");
    } catch {
      // Fall through to prototype
    }
  }

  // Fall back to prototype version
  const prototypePath = resolve(process.cwd(), `app/docs/ai-prompts/${specialistId}.md`);
  try {
    const content = readFileSync(prototypePath, "utf-8");
    return extractSystemPrompt(content, "prototype");
  } catch {
    throw new Error(
      `Specialist prompt not found: ${specialistId} (tried ${specialistId}.production.md and ${specialistId}.md)`
    );
  }
}

function extractSystemPrompt(mdContent: string, variant: "production" | "prototype"): string {
  // Remove frontmatter if present
  let content = mdContent;
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    content = content.substring(frontmatterMatch[0].length);
  }

  if (variant === "production") {
    // Production prompts have "## Production system prompt" heading followed by free text
    const match = content.match(/##\s+Production system prompt\s*\n([\s\S]*?)(?=\n##|$)/i);
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
  startTime: number
): SpecialistResult {
  const mockResponses: Record<string, { narrative: string; structured: Record<string, unknown> }> = {
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
  };

  const mockResponse = mockResponses[specialistId] || mockResponses["compliance-structural"];

  return {
    narrative: mockResponse.narrative,
    structured: mockResponse.structured,
    citations: (mockResponse.structured.citations as SpecialistCitation[]) || [],
    confidence: "medium",
    deferred_to_human: "Mock response — ANTHROPIC_API_KEY not configured",
    raw_response: mockResponse.narrative,
    model: MODEL,
    latency_ms: Date.now() - startTime,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "...";
}
