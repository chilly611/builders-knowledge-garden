/**
 * RKG — Builder's Knowledge Garden tools.
 *
 * These wrap the liability-aware compliance engine (`lookupCodeCitations`),
 * which resolves a jurisdiction against the structured registry and returns
 * cited code sections — or an explicit "not covered" — and NEVER guesses. We
 * reshape its output into the interpreted+cited RKG envelope.
 *
 *   lookup_jurisdiction_requirements — code requirements for a topic + place
 *   permit_checklist_for_scope       — interpreted permit checklist for a scope
 *   citation_for_claim               — corroborating sources for a claim
 */
import {
  lookupCodeCitations,
  type ComplianceLookupResult,
  type CodeCitation,
  type Discipline,
} from "@/lib/compliance-lookup";
import {
  interpret,
  notCovered,
  toToolResult,
  verdictFromSources,
  type Citation,
  type VerdictTier,
} from "../citations";
import type { ToolCallResult } from "../jsonrpc";

const GARDEN = "bkg";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function truncate(s: string, n = 220): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/** A readable place phrase — a broad query (e.g. "California") can resolve to
 *  many jurisdictions; don't dump the whole list into the prose. */
function describePlaces(places: Array<{ name: string }>): string {
  const names = places.map((p) => p.name);
  if (names.length <= 2) return names.join(" and ");
  const anchor = names.find((n) => /california|county|city/i.test(n)) ?? names[0];
  return `${anchor} (and ${names.length - 1} more matching jurisdictions)`;
}

/** Map a compliance CodeCitation into the RKG Citation shape. */
function toCitation(c: CodeCitation): Citation {
  return {
    label: c.citation || c.title,
    source: "knowledge_entities",
    url: c.sourceUrls?.[0] ?? null,
    jurisdiction: c.jurisdiction?.name ?? c.jurisdiction?.slug ?? null,
    verification: c.verification,
    detail: truncate(c.summary || c.title),
  };
}

/** Verdict for requirement/checklist tools. Honest about corroboration:
 *  3+ distinct governing sections with at least one verified entry reads as
 *  authoritative; otherwise it is capped at corroborated/single. */
function requirementVerdict(citations: CodeCitation[]): VerdictTier {
  const distinct = new Set(citations.map((c) => c.entityId)).size;
  const anyVerified = citations.some((c) => c.verification === "manually_verified");
  const base = verdictFromSources(distinct);
  if (base === "authoritative" && !anyVerified) return "corroborated";
  return base;
}

async function runLookup(args: {
  query: string;
  jurisdiction: string;
  discipline?: Discipline;
  limit?: number;
}): Promise<ComplianceLookupResult> {
  return lookupCodeCitations({
    query: args.query,
    jurisdiction: args.jurisdiction,
    discipline: args.discipline,
    limit: args.limit,
  });
}

// ─── lookup_jurisdiction_requirements ───
async function lookupJurisdictionRequirements(args: Record<string, unknown>): Promise<ToolCallResult> {
  const jurisdiction = str(args.jurisdiction);
  const topic = str(args.topic);
  const discipline = str(args.discipline) as Discipline | "";
  const limit = Math.min(num(args.limit) ?? 8, 25);

  if (!jurisdiction) {
    return toToolResult(
      notCovered({
        garden: GARDEN,
        tool: "lookup_jurisdiction_requirements",
        answer: "A jurisdiction is required (e.g. 'ca-sf', 'CA', or 'San Francisco').",
        reason: "missing_jurisdiction",
      }),
    );
  }

  const res = await runLookup({
    query: topic,
    jurisdiction,
    discipline: discipline || undefined,
    limit,
  });

  if (res.status !== "covered" || res.citations.length === 0) {
    return toToolResult(
      notCovered({
        garden: GARDEN,
        tool: "lookup_jurisdiction_requirements",
        answer: res.message,
        reason: res.coverage.reason ?? "no_results",
      }),
    );
  }

  const place = describePlaces(res.resolvedJurisdictions);
  const lead = topic
    ? `In ${place}, the following code requirements apply to "${topic}":`
    : `In ${place}, the following governing code requirements are on record:`;
  const body = res.citations.map((c) => `• ${c.citation} — ${truncate(c.summary || c.title, 160)}`).join("\n");

  return toToolResult(
    interpret({
      garden: GARDEN,
      tool: "lookup_jurisdiction_requirements",
      answer: `${lead}\n${body}`,
      citations: res.citations.map(toCitation),
      verdict: requirementVerdict(res.citations),
      coverage: { covered: true },
    }),
  );
}

// ─── permit_checklist_for_scope ───
async function permitChecklistForScope(args: Record<string, unknown>): Promise<ToolCallResult> {
  const jurisdiction = str(args.jurisdiction);
  const scope = str(args.scope);

  if (!jurisdiction || !scope) {
    return toToolResult(
      notCovered({
        garden: GARDEN,
        tool: "permit_checklist_for_scope",
        answer: "Both a jurisdiction and a scope of work are required.",
        reason: "missing_input",
      }),
    );
  }

  // Bias the retrieval toward permitting/inspection-relevant sections for the scope.
  const res = await runLookup({
    query: `${scope} permit inspection compliance requirements`,
    jurisdiction,
    limit: 12,
  });

  if (res.status !== "covered" || res.citations.length === 0) {
    return toToolResult(
      notCovered({
        garden: GARDEN,
        tool: "permit_checklist_for_scope",
        answer:
          res.coverage.reason === "unknown_jurisdiction"
            ? res.message
            : `No permit checklist could be grounded in code for "${scope}" in ${jurisdiction}. ` +
              `This scope/jurisdiction is not yet covered — no checklist is invented.`,
        reason: res.coverage.reason ?? "no_results",
      }),
    );
  }

  const place = describePlaces(res.resolvedJurisdictions);
  const items = res.citations
    .map((c) => `[ ] ${c.citation} — ${truncate(c.summary || c.title, 150)}`)
    .join("\n");
  const answer =
    `Permit / compliance checklist for "${scope}" in ${place}, grounded in the governing code ` +
    `sections below. Each line is cited; confirm submittal specifics with the local building ` +
    `department.\n${items}`;

  return toToolResult(
    interpret({
      garden: GARDEN,
      tool: "permit_checklist_for_scope",
      answer,
      citations: res.citations.map(toCitation),
      verdict: requirementVerdict(res.citations),
      coverage: { covered: true },
    }),
  );
}

// ─── citation_for_claim ───
async function citationForClaim(args: Record<string, unknown>): Promise<ToolCallResult> {
  const claim = str(args.claim);
  const jurisdiction = str(args.jurisdiction) || "California"; // CA-first corpus + global model codes

  if (!claim) {
    return toToolResult(
      notCovered({
        garden: GARDEN,
        tool: "citation_for_claim",
        answer: "A claim to verify is required.",
        reason: "missing_claim",
      }),
    );
  }

  const res = await runLookup({ query: claim, jurisdiction, limit: 10 });

  if (res.status !== "covered" || res.citations.length === 0) {
    return toToolResult(
      notCovered({
        garden: GARDEN,
        tool: "citation_for_claim",
        answer:
          `No corroborating code section was found for: "${claim}"` +
          (str(args.jurisdiction) ? ` in ${jurisdiction}.` : ` (searched ${jurisdiction} + global model codes).`) +
          " Treat the claim as unverified by this garden.",
        reason: res.coverage.reason ?? "no_results",
      }),
    );
  }

  // Corroboration verdict: distinct sources backing THIS claim.
  const distinct = new Set(res.citations.map((c) => c.entityId)).size;
  const verdict = requirementVerdict(res.citations);
  const place = describePlaces(res.resolvedJurisdictions);
  const answer =
    `"${claim}" is backed by ${distinct} code section${distinct === 1 ? "" : "s"} on record ` +
    `(${place} + applicable model codes). Verdict: ${verdict}. See citations.`;

  return toToolResult(
    interpret({
      garden: GARDEN,
      tool: "citation_for_claim",
      answer,
      citations: res.citations.map(toCitation),
      verdict,
      coverage: { covered: true },
    }),
  );
}

export const bkgExecutors: Record<string, (args: Record<string, unknown>) => Promise<ToolCallResult>> = {
  lookup_jurisdiction_requirements: lookupJurisdictionRequirements,
  permit_checklist_for_scope: permitChecklistForScope,
  citation_for_claim: citationForClaim,
};
