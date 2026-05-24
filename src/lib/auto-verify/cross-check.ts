/**
 * AUTO-VERIFY: Claude cross-check (2026-05-25)
 * ============================================
 *
 * Given a knowledge_entities row, ask Claude Haiku to judge whether the
 * row's title + summary + metadata are CONSISTENT with the canonical
 * code/standard it claims to represent. Return a structured verdict
 * we can persist + display.
 *
 * Calibration philosophy:
 *   - Default to "not confident enough" when the row is too thin to
 *     check (e.g. summary is "Sustainability practice for X." with no
 *     factual claim). These rows still need a human eye.
 *   - "Clean" requires: model is >=0.85 sure AND found zero factual
 *     discrepancies AND the claim is concrete enough to be checkable.
 *   - "Flagged" when: model found a discrepancy, OR confidence in [0.5, 0.85).
 *   - Anything below 0.5 we do NOT auto-stamp — fall back to human queue.
 *
 * The prompt is deliberately conservative — we'd rather flag a row that
 * was probably fine than auto-clear a row that was wrong. Better to ask
 * the human "is this OK?" than to silently bless a misstatement.
 */

import Anthropic from "@anthropic-ai/sdk";
import crypto from "node:crypto";

// Use Haiku 4.5 for bulk pre-screening — cheap + fast. We can re-run
// any flagged row through Sonnet later if we want a second opinion.
export const CROSS_CHECK_MODEL = "claude-haiku-4-5-20251001";

// Threshold: rows at or above this confidence with zero discrepancies
// get the yellow tick. Lower and we flag.
export const CLEAN_THRESHOLD = 0.85;
// Anything below this we don't even bother stamping — leave for human.
export const STAMP_THRESHOLD = 0.5;

// Versioned prompt template. Bumping this string invalidates all prior
// `auto_verified_*` stamps (they were checked under the old logic). We
// don't auto-invalidate on bump — we just record the version in the
// notes JSONB so we can know which prompt version was used.
export const PROMPT_VERSION = "auto-verify/v1@2026-05-25";

export interface KnowledgeRowForCheck {
  id: string;
  slug: string;
  entity_type: string;
  title: { en?: string } | string | null;
  summary: { en?: string } | string | null;
  jurisdiction_ids: string[] | null;
  source_urls: string[] | null;
  metadata: Record<string, unknown> | null;
}

export interface CrossCheckVerdict {
  /** Model self-reported confidence in [0,1]. */
  confidence: number;
  /** Concrete factual issues the model identified. Empty when clean. */
  discrepancies: string[];
  /** Whether this row is concrete enough to be checked at all. */
  checkable: boolean;
  /** True iff confidence >= CLEAN_THRESHOLD AND discrepancies empty AND checkable. */
  clean: boolean;
  /** True iff STAMP_THRESHOLD <= confidence < CLEAN_THRESHOLD OR any discrepancy OR uncheckable. */
  flagged: boolean;
  /** Free-text rationale from the model — shown to human reviewer. */
  rationale: string;
  /** Raw text the model returned, for audit. */
  model_response: string;
  /** SHA-256 of (PROMPT_VERSION + prompt body) — for audit re-derivation. */
  prompt_hash: string;
  /** Wall-clock when we ran the check. */
  ran_at: string;
  /** Which model we asked. */
  model: string;
}

function unwrap(v: { en?: string } | string | null | undefined): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v.en || "";
}

/**
 * Build the user prompt. Kept synchronous + deterministic so we can hash
 * it for audit. The model gets enough context to make a call but not so
 * much that we're spending tokens unnecessarily.
 */
export function buildCheckPrompt(row: KnowledgeRowForCheck): string {
  const title = unwrap(row.title);
  const summary = unwrap(row.summary);
  const metaJson = row.metadata
    ? JSON.stringify(row.metadata).slice(0, 800) // cap to keep tokens bounded
    : "{}";
  const urls = (row.source_urls ?? []).slice(0, 5).join(", ") || "(none)";

  return [
    `You are auditing one row of a construction-code knowledge base. We will publish this row to California general contractors who rely on it for permit applications, bid pricing, and code compliance. Your job is to flag anything that is factually wrong, misleading, or inconsistent with the canonical code/standard the row claims to describe.`,
    ``,
    `ROW UNDER REVIEW:`,
    `  id: ${row.id}`,
    `  slug: ${row.slug}`,
    `  entity_type: ${row.entity_type}`,
    `  title: ${title || "(empty)"}`,
    `  summary: ${summary || "(empty)"}`,
    `  metadata: ${metaJson}`,
    `  source_urls: ${urls}`,
    ``,
    `RUBRIC:`,
    `  1. Is the title + summary internally consistent? (Does the summary actually describe what the title names?)`,
    `  2. Does the claim match your training knowledge of the cited code/standard? (NEC, IBC, CBC, ASHRAE, OSHA, Title 24, etc.)`,
    `  3. Is the claim concrete enough to be checkable? A summary like "Sustainability practice for X." with no factual assertion is NOT checkable — mark checkable=false.`,
    `  4. If the row cites a specific section/article/chapter, does that citation correspond to the right content?`,
    `  5. If the row gives a numeric threshold (e.g. "20 amps", "R-19", "1/4-inch"), does that number match canon?`,
    ``,
    `OUTPUT — respond with ONLY a JSON object, no prose before or after:`,
    `{`,
    `  "checkable": boolean,                  // false if the row is too vague to verify`,
    `  "confidence": number,                  // your confidence in [0,1] that this row is accurate as-stated`,
    `  "discrepancies": [string, ...],        // empty array if none. Each entry is a SHORT factual issue.`,
    `  "rationale": string                    // 1-3 sentences explaining your verdict`,
    `}`,
    ``,
    `Be conservative. If you are not sure about a fact, lower the confidence rather than guess. Empty discrepancies + high confidence is reserved for rows where you are sure the claim is correct.`,
  ].join("\n");
}

interface ParsedModelJson {
  checkable?: boolean;
  confidence?: number;
  discrepancies?: unknown;
  rationale?: string;
}

/**
 * Tolerant JSON extractor — Haiku sometimes wraps the JSON in ```json
 * fences or adds a sentence. We try a few strategies.
 */
function extractJson(text: string): ParsedModelJson | null {
  // Strategy 1: parse the whole thing.
  try {
    return JSON.parse(text) as ParsedModelJson;
  } catch {
    // fall through
  }
  // Strategy 2: code fence.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1]) as ParsedModelJson;
    } catch {
      // fall through
    }
  }
  // Strategy 3: first balanced { … }.
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(text.slice(first, last + 1)) as ParsedModelJson;
    } catch {
      // fall through
    }
  }
  return null;
}

function asNumberInUnit(v: unknown): number {
  if (typeof v !== "number" || Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return Math.min(v / 100, 1); // tolerate "85" instead of "0.85"
  return v;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((s) => s.length > 0)
    .slice(0, 12);
}

/**
 * Run a cross-check for ONE row. Caller is responsible for persistence.
 * Throws only on outright API failure; bad/missing JSON from the model
 * is downgraded to a flagged verdict so the row goes to human review.
 */
export async function crossCheckRow(
  row: KnowledgeRowForCheck,
  opts?: { client?: Anthropic; model?: string }
): Promise<CrossCheckVerdict> {
  const client =
    opts?.client ??
    new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  const model = opts?.model ?? CROSS_CHECK_MODEL;
  const prompt = buildCheckPrompt(row);
  const prompt_hash = crypto
    .createHash("sha256")
    .update(`${PROMPT_VERSION}\n${prompt}`)
    .digest("hex")
    .slice(0, 16);
  const ran_at = new Date().toISOString();

  let model_response = "";
  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 600,
      temperature: 0.0,
      system:
        "You are a meticulous building-code auditor. Output strictly the requested JSON object. Do not include any prose outside the JSON.",
      messages: [{ role: "user", content: prompt }],
    });
    model_response = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  } catch (err) {
    return {
      confidence: 0,
      discrepancies: [
        `cross_check_api_error: ${(err as Error)?.message ?? "unknown"}`,
      ],
      checkable: false,
      clean: false,
      flagged: true,
      rationale:
        "Could not run cross-check — model API errored. Defer to human review.",
      model_response: "",
      prompt_hash,
      ran_at,
      model,
    };
  }

  const parsed = extractJson(model_response);
  if (!parsed) {
    return {
      confidence: 0,
      discrepancies: ["cross_check_parse_error: model did not return JSON"],
      checkable: false,
      clean: false,
      flagged: true,
      rationale:
        "Model response was not parseable JSON. Defer to human review.",
      model_response,
      prompt_hash,
      ran_at,
      model,
    };
  }

  const confidence = asNumberInUnit(parsed.confidence);
  const discrepancies = asStringArray(parsed.discrepancies);
  const checkable = parsed.checkable !== false; // default true when missing
  const rationale =
    typeof parsed.rationale === "string"
      ? parsed.rationale.slice(0, 800)
      : "";

  const clean =
    checkable && discrepancies.length === 0 && confidence >= CLEAN_THRESHOLD;
  const flagged = !clean && confidence >= STAMP_THRESHOLD;

  return {
    confidence,
    discrepancies,
    checkable,
    clean,
    flagged,
    rationale,
    model_response,
    prompt_hash,
    ran_at,
    model,
  };
}
