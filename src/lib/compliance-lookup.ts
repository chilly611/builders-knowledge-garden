/**
 * Code Compliance Lookup — Service Layer
 * Stage 1: API/lib only. UI waits behind Stage 2.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LIABILITY CONTRACT (non-negotiable — a builder may act on these answers):
 *
 *   1. Every citation returned is a REAL row from `knowledge_entities`,
 *      scoped to a REAL row in `jurisdictions`. Each carries its own
 *      `entityId` (audit anchor), `sourceUrls` (provenance copied verbatim
 *      from the row), the matched jurisdiction, and its verification state.
 *
 *   2. We NEVER fabricate, guess, or infer a code from model memory. There
 *      is no LLM call anywhere on this path — it is pure structured-data
 *      retrieval. The `citation` label is *derived* (formatted) from fields
 *      stored on the row; when a field is absent we emit `null`, never a
 *      plausible-sounding placeholder.
 *
 *   3. If we hold no structured code data for a jurisdiction, we say
 *      "not yet covered for {jurisdiction}" — never a guessed citation.
 *
 *   4. On any data-source failure we FAIL CLOSED: we throw
 *      `ComplianceDataError` rather than return a fabricated or
 *      misleading "not covered". A returned result is always a real,
 *      data-backed answer; an error is surfaced as an error.
 *
 * This service is deliberately NARROWER than `src/lib/code-sources` (the
 * 6-source RAG orchestrator). That layer blends external citation-only
 * publishers (ICC/NFPA deep links) and fuzzy vector recall. This service
 * answers ONLY from the structured jurisdiction/knowledge tables we own,
 * which is the right trust posture for a compliance answer.
 *
 * Data model (see knowledge-gardens-prod):
 *   - jurisdictions(id, slug, name, code_system, code_year, state_province,
 *                   city, level, parent_id, ...)   — 44 rows
 *   - knowledge_entities(id, slug, entity_type, title/summary/body jsonb,
 *                   tags[], jurisdiction_ids uuid[], applies_globally,
 *                   source_urls[], metadata jsonb, manually_verified_at,
 *                   auto_verified_at, auto_verification_flagged, status)
 *     Code sections live here as entity_type IN (building_code, code_section,
 *     safety_regulation, standard, code), linked to jurisdictions via
 *     `jurisdiction_ids` (or flagged `applies_globally`). Section / code
 *     system live in `metadata` under INCONSISTENT keys — see deriveSection /
 *     deriveCodeSystem for the fallback chains.
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// ─── Public types ──────────────────────────────────────────────────────────

export type ComplianceCoverageStatus = "covered" | "no_results" | "not_covered";

export type Discipline =
  | "electrical"
  | "structural"
  | "plumbing"
  | "mechanical"
  | "fire"
  | "general";

export interface ComplianceLookupInput {
  /** Free-text query, e.g. "emergency egress windows in bedrooms". */
  query: string;
  /** Slug ("ca-sf"), state code ("CA"), state/city name ("California", "San Francisco"). */
  jurisdiction: string;
  /** Optional discipline hint — narrows RANKING only; never invents results. */
  discipline?: Discipline;
  /** Max citations to return. Default 10, hard-capped at 25. */
  limit?: number;
}

export type CitationScope = "jurisdiction" | "ancestor" | "global";
export type VerificationLevel = "manually_verified" | "auto_verified" | "unverified";

export interface CitationJurisdiction {
  id: string | null;
  slug: string | null;
  name: string | null;
  level: string | null;
  /** How this row reaches the requested jurisdiction: directly, via an
   *  ancestor in the parent_id chain, or as a globally-applicable model code. */
  scope: CitationScope;
}

export interface CodeCitation {
  /** Audit anchor — the knowledge_entities.id this citation came from. */
  entityId: string;
  slug: string;
  title: string;
  summary: string;
  /** Canonical reference label, derived from stored fields (never invented). */
  citation: string;
  codeSystem: string | null;
  codeYear: number | null;
  section: string | null;
  entityType: string;
  appliesGlobally: boolean;
  jurisdiction: CitationJurisdiction;
  /** Provenance — copied verbatim from the row. */
  sourceUrls: string[];
  sourceDocs: string[];
  verification: VerificationLevel;
  /** Why this row surfaced (matched tokens / section / tags) — for transparency. */
  matchedOn: string[];
  relevance: number;
}

export interface ComplianceLookupResult {
  status: ComplianceCoverageStatus;
  message: string;
  query: string;
  jurisdictionInput: string;
  resolvedJurisdictions: Array<{
    id: string;
    slug: string;
    name: string;
    level: string | null;
  }>;
  citations: CodeCitation[];
  coverage: {
    /** Resolved to ≥1 row in `jurisdictions`. */
    jurisdictionKnown: boolean;
    /** ≥1 code entity is scoped to this jurisdiction or an ancestor (query-independent). */
    jurisdictionHasCodeData: boolean;
    scopedCitationCount: number;
    globalCitationCount: number;
    reason?:
      | "unknown_jurisdiction"
      | "no_code_data_for_jurisdiction"
      | "no_match_for_query";
  };
  provenance: {
    source: "structured-data";
    tables: string[];
    disclaimer: string;
    generatedAt: string;
  };
}

// ─── Row shapes (subset of columns we read) ─────────────────────────────────

export interface JurisdictionRow {
  id: string;
  slug: string;
  name: string;
  code_system: string | null;
  code_year: number | null;
  country: string | null;
  state_province: string | null;
  city: string | null;
  level: string | null;
  parent_id: string | null;
}

export interface CodeEntityRow {
  id: string;
  slug: string;
  entity_type: string;
  title: unknown; // jsonb { en: string } | string
  summary: unknown; // jsonb { en: string } | string
  tags: string[] | null;
  category: string | null;
  jurisdiction_ids: string[] | null;
  applies_globally: boolean | null;
  source_urls: string[] | null;
  source_docs: string[] | null;
  metadata: Record<string, unknown> | null;
  manually_verified_at: string | null;
  auto_verified_at: string | null;
  auto_verification_flagged: boolean | null;
}

/**
 * The only DB surface this service touches. Kept tiny and injectable so the
 * orchestration + mapping logic can be unit-tested against canned rows with
 * NO network, NO RLS, and NO flakiness — and so the liability guarantees are
 * provable in tests.
 */
export interface ComplianceDataSource {
  listJurisdictions(): Promise<JurisdictionRow[]>;
  /** Count code entities scoped (via jurisdiction_ids) to the given ids. */
  countScopedCodeEntities(jurisdictionIds: string[]): Promise<number>;
  searchCodeEntities(args: {
    jurisdictionIds: string[];
    includeGlobal: boolean;
    queryText: string;
    limit: number;
  }): Promise<CodeEntityRow[]>;
}

/** Thrown when the underlying data store is unreachable / errors. Callers
 *  MUST treat this as "could not verify" — never as "not covered". */
export class ComplianceDataError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ComplianceDataError";
  }
}

// ─── Constants ───────────────────────────────────────────────────────────--

/**
 * entity_type values that represent a compliance code / regulation / standard.
 * Superset of code-sources/rag.ts CODE_ENTITY_TYPES (adds the lone `code`
 * row) so nothing code-like is silently excluded.
 */
export const COMPLIANCE_CODE_ENTITY_TYPES = [
  "building_code",
  "code_section",
  "safety_regulation",
  "standard",
  "code",
] as const;

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;
const DISCLAIMER =
  "Citations are returned verbatim from Builder's Knowledge Garden structured " +
  "data (jurisdictions + knowledge_entities). Nothing is inferred or generated. " +
  "Always confirm against the cited source and the adopting authority before relying on it.";

const SELECT_COLUMNS =
  "id, slug, entity_type, title, summary, tags, category, jurisdiction_ids, " +
  "applies_globally, source_urls, source_docs, metadata, manually_verified_at, " +
  "auto_verified_at, auto_verification_flagged";

const STOPWORDS = new Set([
  "the", "and", "for", "are", "with", "what", "which", "does", "code",
  "codes", "section", "requirement", "requirements", "rule", "rules", "must",
  "need", "needs", "about", "from", "into", "this", "that", "have",
]);

/** US state code ↔ name aliases. Static geography reference (NOT code data),
 *  used only to resolve a jurisdiction string against the inconsistent
 *  `state_province` values in the table ("CA" vs "California"). */
const US_STATE_ALIASES: Record<string, string> = {
  al: "alabama", ak: "alaska", az: "arizona", ar: "arkansas", ca: "california",
  co: "colorado", ct: "connecticut", de: "delaware", fl: "florida", ga: "georgia",
  hi: "hawaii", id: "idaho", il: "illinois", in: "indiana", ia: "iowa",
  ks: "kansas", ky: "kentucky", la: "louisiana", me: "maine", md: "maryland",
  ma: "massachusetts", mi: "michigan", mn: "minnesota", ms: "mississippi",
  mo: "missouri", mt: "montana", ne: "nebraska", nv: "nevada", nh: "new hampshire",
  nj: "new jersey", nm: "new mexico", ny: "new york", nc: "north carolina",
  nd: "north dakota", oh: "ohio", ok: "oklahoma", or: "oregon", pa: "pennsylvania",
  ri: "rhode island", sc: "south carolina", sd: "south dakota", tn: "tennessee",
  tx: "texas", ut: "utah", vt: "vermont", va: "virginia", wa: "washington",
  wv: "west virginia", wi: "wisconsin", wy: "wyoming", dc: "district of columbia",
};

// Reverse: full name → code.
const US_STATE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATE_ALIASES).map(([code, name]) => [name, code])
);

// Section-number tokens: "1027", "210.52", "210.52(C)(5)", "R602.10", "1107.6.1".
const SECTION_TOKEN_RE = /\b[A-Z]?\d{2,4}(?:\.\d+)*(?:\([A-Za-z0-9]+\))*/g;

// ─── Pure helpers (exported for unit tests) ─────────────────────────────────

/** JSONB text fields are stored as `{ en: "..." }`. Unwrap to a plain string. */
export function unwrapJsonbText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.en === "string") return obj.en;
    const firstString = Object.values(obj).find((v) => typeof v === "string");
    if (typeof firstString === "string") return firstString;
    return "";
  }
  return String(value);
}

function metaString(metadata: Record<string, unknown> | null, key: string): string | null {
  if (!metadata) return null;
  const v = metadata[key];
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  return null;
}

/** Extract a section reference from a stored title (our own data, not memory). */
export function extractSectionFromTitle(title: string): string | null {
  if (!title) return null;
  const labelled = title.match(/(?:Section|Sec\.?|§|Article|Chapter)\s+([\d.]+(?:\([A-Za-z0-9]+\))*|[A-Z]?\d{2,4}[\d.()A-Za-z-]*)/i);
  if (labelled) return labelled[1];
  const bare = title.match(SECTION_TOKEN_RE);
  return bare && bare.length > 0 ? bare[0] : null;
}

/**
 * Derive the code section. Handles BOTH metadata conventions seen in the
 * data (`section` and `code_section`), falling back to the stored title.
 * Returns null — never a guess — when nothing is present.
 */
export function deriveSection(row: Pick<CodeEntityRow, "metadata" | "title">): string | null {
  const fromMeta = metaString(row.metadata, "section") ?? metaString(row.metadata, "code_section");
  if (fromMeta) return fromMeta;
  return extractSectionFromTitle(unwrapJsonbText(row.title));
}

/**
 * Derive the code system / body. Handles both `code_system` and `code_body`
 * metadata keys, then a leading ALL-CAPS acronym in the stored title.
 */
export function deriveCodeSystem(row: Pick<CodeEntityRow, "metadata" | "title">): string | null {
  const fromMeta = metaString(row.metadata, "code_system") ?? metaString(row.metadata, "code_body");
  if (fromMeta) return fromMeta;
  const title = unwrapJsonbText(row.title);
  const acronym = title.match(/^([A-Z]{2,6})(?:\b|\s|\d)/);
  return acronym ? acronym[1] : null;
}

/** Derive the code year/edition. Numeric editions count; non-numeric editions
 *  (e.g. textual) are ignored to avoid emitting a misleading year. */
export function deriveCodeYear(row: Pick<CodeEntityRow, "metadata">): number | null {
  const m = row.metadata;
  if (!m) return null;
  for (const key of ["code_year", "year", "edition"]) {
    const v = m[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const match = v.match(/\b(1[89]\d{2}|20\d{2})\b/);
      if (match) return Number(match[1]);
    }
  }
  return null;
}

/** Build a canonical citation label from derived fields. Falls back to the
 *  stored title, then the slug — all real data, never invented. */
export function buildCitationLabel(args: {
  codeSystem: string | null;
  section: string | null;
  codeYear: number | null;
  title: string;
  slug: string;
}): string {
  const { codeSystem, section, codeYear, title, slug } = args;
  if (codeSystem && section) {
    const sectionLabel = /^\d/.test(section) ? `Section ${section}` : section;
    return `${codeSystem} ${sectionLabel}${codeYear ? ` (${codeYear})` : ""}`.trim();
  }
  if (codeSystem && codeYear) return `${codeSystem} (${codeYear})`;
  if (title) return title;
  return slug;
}

/** Verification level from the row's attestation columns. Mirrors the rule in
 *  code-sources/rag.ts: auto only counts when present AND not flagged. */
export function toVerification(
  row: Pick<CodeEntityRow, "manually_verified_at" | "auto_verified_at" | "auto_verification_flagged">
): VerificationLevel {
  if (row.manually_verified_at != null) return "manually_verified";
  if (row.auto_verified_at != null && row.auto_verification_flagged === false) {
    return "auto_verified";
  }
  return "unverified";
}

/** Normalize a string for case-insensitive comparison. */
function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Resolve a jurisdiction string against the (small) jurisdictions table, in
 * priority order: exact slug → state code/name (+US alias) → exact name →
 * substring on name/city/slug. Pure & deterministic so it is fully testable.
 */
export function matchJurisdictions(all: JurisdictionRow[], input: string): JurisdictionRow[] {
  const q = norm(input);
  if (!q) return [];

  // 1. Exact slug.
  const bySlug = all.filter((j) => norm(j.slug) === q);
  if (bySlug.length) return bySlug;

  // 2. State code / name, expanding US code↔name aliases both directions.
  const stateForms = new Set<string>([q]);
  if (US_STATE_ALIASES[q]) stateForms.add(US_STATE_ALIASES[q]); // "ca" → "california"
  if (US_STATE_NAME_TO_CODE[q]) stateForms.add(US_STATE_NAME_TO_CODE[q]); // "california" → "ca"
  const byState = all.filter((j) => stateForms.has(norm(j.state_province)));
  if (byState.length) return byState;

  // 3. Exact name.
  const byName = all.filter((j) => norm(j.name) === q);
  if (byName.length) return byName;

  // 4. Substring on name / city / slug (length-gated to avoid noise).
  if (q.length >= 3) {
    const byContains = all.filter(
      (j) =>
        norm(j.name).includes(q) ||
        norm(j.city).includes(q) ||
        norm(j.slug).includes(q)
    );
    if (byContains.length) return byContains;
  }

  return [];
}

/** Expand a matched set with its ancestor chain via parent_id (codes cascade:
 *  a county/city inherits state + model codes). Returns matched ∪ ancestors. */
export function collectWithAncestors(
  all: JurisdictionRow[],
  matched: JurisdictionRow[]
): JurisdictionRow[] {
  const byId = new Map(all.map((j) => [j.id, j]));
  const out = new Map<string, JurisdictionRow>();
  for (const j of matched) {
    out.set(j.id, j);
    let parentId = j.parent_id;
    const guard = new Set<string>([j.id]); // cycle guard
    while (parentId && !guard.has(parentId)) {
      const parent = byId.get(parentId);
      if (!parent) break;
      out.set(parent.id, parent);
      guard.add(parent.id);
      parentId = parent.parent_id;
    }
  }
  return Array.from(out.values());
}

/** Split a free-text query into meaningful tokens (+ keep section numbers). */
export function tokenize(query: string): string[] {
  const lower = norm(query);
  if (!lower) return [];
  const sectionTokens = (query.match(SECTION_TOKEN_RE) ?? []).map((s) => s.toLowerCase());
  const words = lower
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return Array.from(new Set([...words, ...sectionTokens]));
}

/** Extract section-number tokens from a query. */
export function extractSections(query: string): string[] {
  const matches = query.match(SECTION_TOKEN_RE) ?? [];
  return Array.from(new Set(matches.map((s) => s.toLowerCase())));
}

const DISCIPLINE_KEYWORDS: Record<Discipline, string[]> = {
  electrical: ["electrical", "nec", "circuit", "receptacle", "gfci", "afci", "wiring", "panel", "conduit", "outlet"],
  structural: ["ibc", "irc", "framing", "load", "seismic", "shear", "lateral", "foundation", "beam", "column", "joist"],
  plumbing: ["ipc", "pipe", "drain", "vent", "trap", "fixture", "sewer", "backflow", "dwv"],
  mechanical: ["hvac", "duct", "imc", "ventilation", "refrigerant", "boiler", "ahu", "combustion"],
  fire: ["sprinkler", "alarm", "nfpa", "smoke", "egress", "escape", "fire", "exit", "occupant"],
  general: [],
};

/**
 * Score a row's relevance to the query. DB full-text already filtered to
 * matches; this orders them and records WHY each matched (transparency).
 * A floor of 0.1 keeps genuine FTS hits whose terms live only in body/
 * search_text (not title/summary) from being dropped.
 */
export function scoreRelevance(
  row: CodeEntityRow,
  tokens: string[],
  sections: string[],
  discipline?: Discipline
): { score: number; matchedOn: string[] } {
  const title = unwrapJsonbText(row.title).toLowerCase();
  const summary = unwrapJsonbText(row.summary).toLowerCase();
  const tags = (row.tags ?? []).map((t) => t.toLowerCase());
  const slug = norm(row.slug);
  const slugNorm = slug.replace(/[^a-z0-9]+/g, "-");
  const haystack = `${title} ${summary} ${tags.join(" ")} ${slug}`;

  const matchedOn: string[] = [];
  let score = 0;

  for (const sec of sections) {
    const secNorm = sec.replace(/[^a-z0-9]+/g, "-");
    if (secNorm.length >= 2 && (slugNorm.includes(secNorm) || title.includes(sec))) {
      score += 5; // section precision is the strongest signal
      matchedOn.push(`section:${sec}`);
    }
  }
  for (const tok of tokens) {
    if (sections.includes(tok)) continue; // already scored as a section
    if (tags.includes(tok)) {
      score += 2;
      matchedOn.push(`tag:${tok}`);
    } else if (haystack.includes(tok)) {
      score += 1;
      matchedOn.push(`term:${tok}`);
    }
  }
  if (discipline && discipline !== "general") {
    const hit = DISCIPLINE_KEYWORDS[discipline].some((k) => haystack.includes(k));
    if (hit) {
      score += 1;
      matchedOn.push(`discipline:${discipline}`);
    }
  }

  if (score === 0) {
    // Returned by the DB text filter but matched only in body/search_text.
    matchedOn.push("full-text");
    score = 0.1;
  }
  return { score, matchedOn };
}

/**
 * Map a raw row to a CodeCitation, resolving its scope against the requested
 * jurisdiction set. EVERY field is copied or derived from the row — there is
 * no path here that invents content.
 */
export function rowToCitation(
  row: CodeEntityRow,
  jurisdictionsById: Map<string, JurisdictionRow>,
  matchedIdSet: Set<string>,
  candidateIdSet: Set<string>,
  tokens: string[],
  sections: string[],
  discipline?: Discipline
): CodeCitation {
  const title = unwrapJsonbText(row.title);
  const summary = unwrapJsonbText(row.summary);
  const codeSystem = deriveCodeSystem(row);
  const section = deriveSection(row);
  const codeYear = deriveCodeYear(row);
  const jurIds = row.jurisdiction_ids ?? [];

  // Prefer the most specific reachable jurisdiction for display.
  const directHit = jurIds.find((id) => matchedIdSet.has(id));
  const ancestorHit = jurIds.find((id) => candidateIdSet.has(id));
  let jurisdiction: CitationJurisdiction;
  if (directHit) {
    const j = jurisdictionsById.get(directHit)!;
    jurisdiction = { id: j.id, slug: j.slug, name: j.name, level: j.level, scope: "jurisdiction" };
  } else if (ancestorHit) {
    const j = jurisdictionsById.get(ancestorHit)!;
    jurisdiction = { id: j.id, slug: j.slug, name: j.name, level: j.level, scope: "ancestor" };
  } else {
    // Reached only via applies_globally — a model code with no local adoption row.
    jurisdiction = {
      id: null,
      slug: null,
      name: "Globally applicable (model code / standard)",
      level: null,
      scope: "global",
    };
  }

  const { score, matchedOn } = scoreRelevance(row, tokens, sections, discipline);

  return {
    entityId: row.id,
    slug: row.slug,
    title,
    summary,
    citation: buildCitationLabel({ codeSystem, section, codeYear, title, slug: row.slug }),
    codeSystem,
    codeYear,
    section,
    entityType: row.entity_type,
    appliesGlobally: row.applies_globally === true,
    jurisdiction,
    sourceUrls: Array.isArray(row.source_urls) ? row.source_urls.filter(Boolean) : [],
    sourceDocs: Array.isArray(row.source_docs) ? row.source_docs.filter(Boolean) : [],
    verification: toVerification(row),
    matchedOn,
    relevance: Number(score.toFixed(2)),
  };
}

function describeJurisdictions(matched: JurisdictionRow[], input: string): string {
  if (matched.length === 1) return matched[0].name;
  return `${input} (${matched.length} matching jurisdictions)`;
}

function makeProvenance(generatedAt: string): ComplianceLookupResult["provenance"] {
  return {
    source: "structured-data",
    tables: ["jurisdictions", "knowledge_entities"],
    disclaimer: DISCLAIMER,
    generatedAt,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.trunc(n)));
}

// ─── Orchestrator ────────────────────────────────────────────────────────--

/**
 * Look up code citations for a free-text query within a jurisdiction, ONLY
 * from structured data. See the LIABILITY CONTRACT at the top of this file.
 *
 * @throws ComplianceDataError if the data source is unreachable (fail closed).
 */
export async function lookupCodeCitations(
  input: ComplianceLookupInput,
  deps: { dataSource?: ComplianceDataSource; now?: () => string } = {}
): Promise<ComplianceLookupResult> {
  const dataSource = deps.dataSource ?? createSupabaseDataSource();
  const generatedAt = (deps.now ?? (() => new Date().toISOString()))();
  const provenance = makeProvenance(generatedAt);

  const query = (input.query ?? "").trim();
  const jurisdictionInput = (input.jurisdiction ?? "").trim();
  const limit = clamp(input.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT);
  const discipline = input.discipline;

  const base = {
    query,
    jurisdictionInput,
    resolvedJurisdictions: [] as ComplianceLookupResult["resolvedJurisdictions"],
    citations: [] as CodeCitation[],
    provenance,
  };

  // Resolve the jurisdiction against the structured registry.
  const all = await dataSource.listJurisdictions();
  const matched = matchJurisdictions(all, jurisdictionInput);

  if (matched.length === 0) {
    return {
      ...base,
      status: "not_covered",
      message: `not yet covered for ${jurisdictionInput || "(no jurisdiction specified)"}`,
      coverage: {
        jurisdictionKnown: false,
        jurisdictionHasCodeData: false,
        scopedCitationCount: 0,
        globalCitationCount: 0,
        reason: "unknown_jurisdiction",
      },
    };
  }

  const resolvedJurisdictions = matched.map((j) => ({
    id: j.id,
    slug: j.slug,
    name: j.name,
    level: j.level,
  }));

  const withAncestors = collectWithAncestors(all, matched);
  const candidateIds = withAncestors.map((j) => j.id);
  const matchedIdSet = new Set(matched.map((j) => j.id));
  const candidateIdSet = new Set(candidateIds);
  const jurisdictionsById = new Map(all.map((j) => [j.id, j]));

  // Coverage is established by SCOPED data only — global model codes do not
  // make a jurisdiction "covered" (they apply everywhere by definition).
  const scopedCount = await dataSource.countScopedCodeEntities(candidateIds);
  if (scopedCount === 0) {
    return {
      ...base,
      resolvedJurisdictions,
      status: "not_covered",
      message: `not yet covered for ${jurisdictionInput}`,
      coverage: {
        jurisdictionKnown: true,
        jurisdictionHasCodeData: false,
        scopedCitationCount: 0,
        globalCitationCount: 0,
        reason: "no_code_data_for_jurisdiction",
      },
    };
  }

  // Jurisdiction is covered — retrieve matching citations from structured data.
  const tokens = tokenize(query);
  const sections = extractSections(query);
  const rows = await dataSource.searchCodeEntities({
    jurisdictionIds: candidateIds,
    includeGlobal: true,
    queryText: query,
    limit: limit * 3, // over-fetch, then rank + trim
  });

  // Dedupe by id (a row may match both the scoped and global sub-queries).
  const seen = new Set<string>();
  const citations = rows
    .filter((r) => {
      if (!r || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .map((r) =>
      rowToCitation(r, jurisdictionsById, matchedIdSet, candidateIdSet, tokens, sections, discipline)
    )
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);

  const scopedCitationCount = citations.filter((c) => c.jurisdiction.scope !== "global").length;
  const globalCitationCount = citations.length - scopedCitationCount;

  if (citations.length === 0) {
    return {
      ...base,
      resolvedJurisdictions,
      status: "no_results",
      message:
        `No matching code section found in ${describeJurisdictions(matched, jurisdictionInput)} ` +
        `for "${query}". This jurisdiction is covered, but no entry matches that query — ` +
        `no guess is offered.`,
      coverage: {
        jurisdictionKnown: true,
        jurisdictionHasCodeData: true,
        scopedCitationCount: 0,
        globalCitationCount: 0,
        reason: "no_match_for_query",
      },
    };
  }

  return {
    ...base,
    resolvedJurisdictions,
    status: "covered",
    message:
      `Found ${citations.length} code citation${citations.length === 1 ? "" : "s"} in ` +
      `${describeJurisdictions(matched, jurisdictionInput)} for "${query}".`,
    citations,
    coverage: {
      jurisdictionKnown: true,
      jurisdictionHasCodeData: true,
      scopedCitationCount,
      globalCitationCount,
    },
  };
}

// ─── Supabase-backed data source (the production adapter) ───────────────────

/**
 * Build the default Supabase-backed data source. Uses the anon client (RLS:
 * published knowledge_entities are publicly readable, same path as
 * code-sources/rag.ts and the /api/v1/search route). DB errors are wrapped in
 * ComplianceDataError so the orchestrator fails closed.
 */
export function createSupabaseDataSource(
  client: SupabaseClient = supabase
): ComplianceDataSource {
  return {
    async listJurisdictions() {
      const { data, error } = await client
        .from("jurisdictions")
        .select(
          "id, slug, name, code_system, code_year, country, state_province, city, level, parent_id"
        );
      if (error) throw new ComplianceDataError(`Failed to load jurisdictions: ${error.message}`, error);
      return (data ?? []) as JurisdictionRow[];
    },

    async countScopedCodeEntities(jurisdictionIds) {
      if (jurisdictionIds.length === 0) return 0;
      const { count, error } = await client
        .from("knowledge_entities")
        .select("id", { count: "exact", head: true })
        .in("entity_type", COMPLIANCE_CODE_ENTITY_TYPES as unknown as string[])
        .eq("status", "published")
        .overlaps("jurisdiction_ids", jurisdictionIds);
      if (error) throw new ComplianceDataError(`Failed to count scoped codes: ${error.message}`, error);
      return count ?? 0;
    },

    async searchCodeEntities({ jurisdictionIds, includeGlobal, queryText, limit }) {
      const fetchWith = async (
        applyScope: (q: ReturnType<typeof baseQuery>) => ReturnType<typeof baseQuery>
      ): Promise<CodeEntityRow[]> => {
        // Primary: PostgreSQL full-text search on the generated search_text column.
        let q = applyScope(baseQuery());
        if (queryText) {
          q = q.textSearch("search_text", queryText, { type: "plain", config: "english" });
        }
        const { data, error } = await q.limit(limit);
        if (error) throw new ComplianceDataError(`Code search failed: ${error.message}`, error);

        if ((!data || data.length === 0) && queryText) {
          // Fallback: OR-of-ilike on search_text (mirrors /api/v1/search).
          const words = queryText.split(/\s+/).filter((w) => w.length > 2).slice(0, 5);
          if (words.length > 0) {
            const orFilter = words.map((w) => `search_text.ilike.%${w}%`).join(",");
            const fb = await applyScope(baseQuery()).or(orFilter).limit(limit);
            if (fb.error) throw new ComplianceDataError(`Code search fallback failed: ${fb.error.message}`, fb.error);
            return (fb.data ?? []) as unknown as CodeEntityRow[];
          }
        }
        return (data ?? []) as unknown as CodeEntityRow[];
      };

      function baseQuery() {
        return client
          .from("knowledge_entities")
          .select(SELECT_COLUMNS)
          .in("entity_type", COMPLIANCE_CODE_ENTITY_TYPES as unknown as string[])
          .eq("status", "published");
      }

      const scoped = await fetchWith((q) => q.overlaps("jurisdiction_ids", jurisdictionIds));
      const global = includeGlobal
        ? await fetchWith((q) => q.eq("applies_globally", true))
        : [];

      // Merge, dedupe by id (orchestrator also dedupes defensively).
      const byId = new Map<string, CodeEntityRow>();
      for (const r of [...scoped, ...global]) {
        if (r && !byId.has(r.id)) byId.set(r.id, r);
      }
      return Array.from(byId.values());
    },
  };
}
