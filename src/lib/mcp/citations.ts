/**
 * RKG — Interpreted + Cited answer envelope.
 *
 * The moat is trust. Every RKG tool returns an `InterpretedAnswer`, never a
 * raw corpus dump. The envelope carries:
 *   - a synthesised `answer` (prose an agent can act on / quote),
 *   - structured `citations` (where each claim comes from),
 *   - a `verdict` tier derived from how many INDEPENDENT sources corroborate it
 *     (the "Three-Source Rule": 3+ = authoritative, 2 = corroborated, 1 = single),
 *   - explicit `coverage` so a miss reads as "not covered", never as "safe"
 *     or "no requirement".
 *
 * This module is pure (no I/O) so it is trivially unit-testable.
 */

export type VerdictTier = "authoritative" | "corroborated" | "single" | "uncovered";

export interface Citation {
  /** Canonical label, e.g. "IBC 2024 §903.2.1" or "EPA MCL — Arsenic (0.01 mg/L)". */
  label: string;
  /** Source kind/provenance, e.g. "knowledge_entities", "EPA", "EWG", "source_document". */
  source: string;
  url?: string | null;
  /** BKG citations carry a jurisdiction; TKG citations carry an agency. */
  jurisdiction?: string | null;
  agency?: string | null;
  /** ISO timestamp the source was last verified / fetched, when known. */
  verifiedAt?: string | null;
  /** "manually_verified" | "auto_verified" | "unverified" | evidence level. */
  verification?: string | null;
  /** Short value/snippet backing the claim (e.g. a limit value or section text). */
  detail?: string | null;
}

export interface InterpretedAnswer {
  answer: string;
  verdict: VerdictTier;
  citations: Citation[];
  coverage: { covered: boolean; reason?: string };
  disclaimer: string;
  meta: {
    garden: string;
    tool: string;
    source: "structured-data";
    generatedAt: string;
    citationCount: number;
  };
}

export const RKG_DISCLAIMER =
  "Interpreted from structured Knowledge Garden data and cited to source. Not legal, " +
  "engineering, or medical advice — verify against the authority having jurisdiction " +
  "before relying on it.";

/** Map a count of independent corroborating sources to a verdict tier. */
export function verdictFromSources(independentSources: number): VerdictTier {
  if (independentSources >= 3) return "authoritative";
  if (independentSources === 2) return "corroborated";
  if (independentSources === 1) return "single";
  return "uncovered";
}

/** Count INDEPENDENT sources behind a citation list. Citations that point at
 *  the SAME url collapse to one (e.g. an EWG limit + the EWG contaminant page
 *  for the same substance is one source, not two), so a single document can't
 *  masquerade as "authoritative". */
export function countIndependentSources(citations: Citation[]): number {
  const keys = new Set<string>();
  for (const c of citations) {
    const key = c.url
      ? `url:${c.url.trim().toLowerCase()}`
      : `src:${(c.source || "").toLowerCase()}|${(c.agency || c.jurisdiction || "").toLowerCase()}`;
    keys.add(key);
  }
  return keys.size;
}

interface InterpretArgs {
  garden: string;
  tool: string;
  answer: string;
  citations: Citation[];
  /** Override the auto-derived verdict (e.g. a single authoritative statute). */
  verdict?: VerdictTier;
  coverage?: { covered: boolean; reason?: string };
  now?: () => string;
}

/** Build a covered, cited answer. Verdict is derived from independent source
 *  count unless explicitly overridden. */
export function interpret(args: InterpretArgs): InterpretedAnswer {
  const generatedAt = (args.now ?? (() => new Date().toISOString()))();
  const independent = countIndependentSources(args.citations);
  const verdict = args.verdict ?? verdictFromSources(independent);
  return {
    answer: args.answer,
    verdict,
    citations: args.citations,
    coverage: args.coverage ?? { covered: args.citations.length > 0 },
    disclaimer: RKG_DISCLAIMER,
    meta: {
      garden: args.garden,
      tool: args.tool,
      source: "structured-data",
      generatedAt,
      citationCount: args.citations.length,
    },
  };
}

/** Build an honest "not covered" answer — NEVER implies absence of risk or
 *  requirement. Used when the subject is unknown or the corpus has no data. */
export function notCovered(args: {
  garden: string;
  tool: string;
  answer: string;
  reason: string;
  now?: () => string;
}): InterpretedAnswer {
  const generatedAt = (args.now ?? (() => new Date().toISOString()))();
  return {
    answer: args.answer,
    verdict: "uncovered",
    citations: [],
    coverage: { covered: false, reason: args.reason },
    disclaimer: RKG_DISCLAIMER,
    meta: {
      garden: args.garden,
      tool: args.tool,
      source: "structured-data",
      generatedAt,
      citationCount: 0,
    },
  };
}

/** Render an InterpretedAnswer as MCP `tools/call` result content. We return
 *  both a human-readable text block (for any client) AND structuredContent (for
 *  MCP clients that understand it), so the cited shape is never lost. */
export function toToolResult(answer: InterpretedAnswer) {
  const lines: string[] = [];
  lines.push(answer.answer.trim());
  lines.push("");
  lines.push(`Verdict: ${answer.verdict} (${answer.meta.citationCount} citation${answer.meta.citationCount === 1 ? "" : "s"})`);
  if (answer.citations.length > 0) {
    lines.push("");
    lines.push("Citations:");
    for (const c of answer.citations) {
      const bits = [c.label];
      if (c.detail) bits.push(`— ${c.detail}`);
      const tail = [c.agency || c.jurisdiction, c.verification, c.url].filter(Boolean).join(" · ");
      lines.push(`  • ${bits.join(" ")}${tail ? `  [${tail}]` : ""}`);
    }
  }
  if (!answer.coverage.covered) {
    lines.push("");
    lines.push(`Coverage: not covered${answer.coverage.reason ? ` (${answer.coverage.reason})` : ""}.`);
  }
  lines.push("");
  lines.push(answer.disclaimer);

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    structuredContent: answer as unknown as Record<string, unknown>,
  };
}
