/**
 * RAG Adapter — Vector + Full-Text Retrieval over local code corpus.
 *
 * This is the third "verified" leg of the badge — alongside `bkg-seed`
 * (curated knowledge entities) and `local-amendment` (hand-vetted JSON).
 * Unlike ICC / NFPA which point at paywalled publishers, this leg pulls
 * from the local Postgres corpus (knowledge_entities table, entity_type
 * IN ('building_code','code_section','safety_regulation','standard')).
 *
 * Why this exists:
 *   The orchestrator was getting at most 2 verified sources (bkg-seed +
 *   amendments). ICC + NFPA can't be verified without contracts. RAG over
 *   the local corpus IS verified (we own the text), so it counts toward
 *   the badge and back-fills the trust signal until we license publishers.
 *
 * Retrieval strategy (in priority order):
 *   1. Hybrid (vector + FTS + section bonus). When pgvector is enabled,
 *      OPENAI_API_KEY is set, AND any rows in the corpus have a non-NULL
 *      `embedding`, we call `hybrid_match_knowledge_entities` which
 *      combines server-side cosine similarity with normalized
 *      `ts_rank_cd`. The TS adapter layers a γ · section-bonus on top
 *      (1.0 for exact section match in slug/title, 0.5 for numeric
 *      prefix). See `combineHybridScores`. Backfill script:
 *      `npm run embeddings`. Migration:
 *      `20260523_hybrid_rerank_rpc.sql`.
 *   2. If the hybrid RPC isn't deployed yet, fall back to the pure
 *      vector RPC (`match_knowledge_entities`) so older deploys keep
 *      working through the rollout window.
 *   3. If neither is available (no API key, no embeddings yet, vector
 *      call fails, hybrid returned empty), fall back to Postgres
 *      full-text search via `search_text`.
 *
 * Verification gate:
 *   A returned row is `verified: true` IFF
 *     - the row has a source_urls entry (link to publisher source) AND
 *     - the content (search_text / body) is non-trivial (>= 100 chars)
 *   Otherwise we still return the result but with `verified: false` so it
 *   doesn't inflate the badge.
 *
 * Note on table naming:
 *   The original spec referenced a `building_codes` table; the actual
 *   schema in this repo uses `knowledge_entities` filtered by entity_type.
 *   The adapter probes for `building_codes` first and falls back — so when
 *   SCHEMA-ALPHA lands the dedicated table this code requires no edit.
 */

import { supabase, isSupabaseConfigured } from "../supabase";
import type { CodeQuery, CodeSourceResult } from "./types";
import { withCache } from "./cache";

const CODE_ENTITY_TYPES = [
  "building_code",
  "code_section",
  "safety_regulation",
  "standard",
];

const VERIFIED_MIN_CONTENT_LEN = 100;
const RAG_LIMIT = 5;
const HYBRID_CANDIDATE_LIMIT = 20;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

// Hybrid score weighting. Sum SHOULD be 1.0 but isn't enforced — these
// are linear weights, the rerank only cares about relative ordering.
//   ALPHA → semantic similarity weight (vector cosine)
//   BETA  → token-match weight (FTS ts_rank_cd, normalized per query)
//   GAMMA → section-number bonus weight (exact / prefix slug+title match)
// Tuned for the "NEC 210.52(C)(5)" class of query where section precision
// matters more than fuzzy semantic neighbors. Bump GAMMA if probe runs
// show section misses; bump ALPHA if natural-language queries regress.
const ALPHA_VECTOR = 0.6;
const BETA_FTS = 0.3;
const GAMMA_SECTION = 0.1;

/**
 * Linear combination of the three normalized scores. Kept as a free
 * function so tests can pin behavior without touching the adapter.
 */
export function combineHybridScores(
  vectorScore: number,
  ftsScore: number,
  sectionBonus: number
): number {
  return (
    ALPHA_VECTOR * vectorScore +
    BETA_FTS * ftsScore +
    GAMMA_SECTION * sectionBonus
  );
}

// Regex that catches code-style section numbers across publishers:
//   "210", "210.52", "210.52(C)", "210.52(C)(5)", "1107.6.1", "R602.10.6.2"
// The leading word boundary keeps random short numbers from leaking in.
// Two-digit minimum (\d{2,4}) avoids matching "5" or "1" alone.
// We deliberately omit a trailing \b because `\b` does NOT exist between
// `)` and end-of-string (both are non-word characters), which would
// truncate "210.52(C)(5)" to "210.52". Greedy quantifiers on the
// (\([A-Z]\)) and (\(\d+\)) groups extend the match as far as possible.
const SECTION_NUMBER_RE = /\b[A-Z]?\d{2,4}(?:\.\d+)*(?:\([A-Za-z]\))*(?:\(\d+\))*/g;

/**
 * Pull plausible section numbers out of the query's structured fields.
 * Returns deduped, lowercased tokens. Empty when none found (caller
 * treats that as "no section bonus available", not an error).
 */
export function extractSectionNumbers(query: CodeQuery): string[] {
  const sources: string[] = [];
  if (query.section) sources.push(query.section);
  if (query.keywords) sources.push(...query.keywords);
  if (query.edition) sources.push(query.edition);
  const out: string[] = [];
  for (const s of sources) {
    if (!s) continue;
    const matches = s.match(SECTION_NUMBER_RE);
    if (matches) out.push(...matches);
  }
  return Array.from(new Set(out.map((s) => s.toLowerCase())));
}

// Per-process cache so two specialists in the same request don't re-embed
// the same query string. Keys are model+text. Bounded by code-query
// cardinality which is small in practice.
const queryEmbeddingCache = new Map<string, number[] | null>();

// Memoized check for whether the corpus has ANY embeddings yet. Avoids
// repeatedly probing the DB once we've answered "no embeddings, FTS-only".
// Re-checked every CORPUS_VECTOR_TTL_MS so the live flip-on (after backfill
// finishes) is picked up without a redeploy.
const CORPUS_VECTOR_TTL_MS = 60_000;
let corpusHasVectors: { value: boolean; checkedAt: number } | null = null;

interface RawRow {
  id: string;
  slug?: string | null;
  title?: unknown;
  summary?: unknown;
  body?: unknown;
  search_text?: string | null;
  entity_type?: string | null;
  source_urls?: string[] | null;
  jurisdiction_ids?: string[] | null;
  metadata?: Record<string, unknown> | null;
  /**
   * ATTEST-WIRE: populated from `manually_verified_at IS NOT NULL` in the
   * SELECT. True when a reviewer has cross-checked this row against an
   * external licensed source. Flows through to CodeSourceResult.manually_verified
   * which countVerifiedSources() reads to add the `manual-attestation`
   * pseudo-source.
   */
  manually_verified?: boolean | null;
}

/**
 * JSONB fields in knowledge_entities are stored as { en: "..." } objects.
 * Unwrap to a plain string.
 */
function unwrapJsonbText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.en === "string") return obj.en;
    return JSON.stringify(obj);
  }
  return String(value);
}

/**
 * Score a candidate row's section affinity against the parsed query
 * sections. Returns:
 *   1.0  exact section token appears in slug or title
 *   0.5  the leading numeric prefix (e.g. "210" of "210.52") appears
 *   0    no signal
 * Exported for unit tests.
 */
export function sectionBonusForRow(
  row: { slug?: string | null; title?: unknown },
  sections: string[]
): number {
  if (!sections.length) return 0;
  const titleStr = unwrapJsonbText(row.title).toLowerCase();
  // Slugs use dashes where canonical citations use dots / parens:
  //   "210.52(C)(5)" lives in slug as "nec-210-52-c-5". We normalize
  //   BOTH sides by collapsing every non-alphanumeric run to a single
  //   dash. This lets "210.52" match "210-52" and vice versa without
  //   pulling in false positives like "21052".
  const normalize = (s: string): string =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const hay = `-${normalize(`${row.slug || ""} ${titleStr}`)}-`;

  // Exact match first — that's the precision win we built this for.
  for (const sec of sections) {
    if (!sec) continue;
    const needle = normalize(sec);
    if (needle.length >= 2 && hay.includes(`-${needle}-`)) return 1.0;
    if (needle.length >= 2 && hay.includes(needle)) return 1.0;
  }
  // Prefix fallback (e.g. "210.52" → "210"). Skip prefixes shorter than
  // 2 chars to avoid spurious matches on single-digit tokens.
  for (const sec of sections) {
    const prefix = sec.split(".")[0].replace(/[^a-z0-9]/gi, "");
    if (prefix.length >= 2 && hay.includes(`-${prefix.toLowerCase()}-`)) {
      return 0.5;
    }
  }
  return 0;
}

/**
 * Per-candidate working state during hybrid rerank. Public so tests
 * can assert on individual score components without re-implementing
 * the merge.
 */
export interface HybridCandidate {
  row: RawRow;
  vectorScore: number;
  ftsScore: number;
  sectionBonus: number;
  combinedScore: number;
}

/**
 * Extract a section number from a title like "NEC Article 220 — ...".
 */
function extractSection(title: string): string {
  const articleMatch = title.match(/(?:Article|Section|Sec\.?|§)\s+([\d.()A-Za-z-]+)/i);
  if (articleMatch) return articleMatch[1];
  const numMatch = title.match(/\b([A-Z]+\s*\d+[\d.()A-Za-z-]*)\b/);
  return numMatch ? numMatch[1] : "General";
}

/**
 * Heuristic: pull the model code body ("NEC", "IBC", ...) from a title.
 */
function extractCodeBody(title: string): string {
  const match = title.match(/^([A-Z]{2,6})\b/);
  return match ? match[1] : "Code";
}

/**
 * Build the full-text query string. plainto_tsquery is forgiving — it
 * ANDs terms together and ignores junk — which is the right default for
 * keyword + section + discipline mashups.
 */
function buildQueryString(query: CodeQuery): string {
  const parts = [
    query.discipline,
    query.section,
    ...(query.keywords || []),
  ].filter(Boolean) as string[];
  return parts.join(" ").trim();
}

/**
 * Map a raw row to CodeSourceResult, applying the verification gate.
 */
function rowToResult(
  row: RawRow,
  query: CodeQuery
): CodeSourceResult {
  const title = unwrapJsonbText(row.title);
  const summary = unwrapJsonbText(row.summary);
  const body = unwrapJsonbText(row.body);
  const contentText = [summary, body].filter(Boolean).join("\n\n").trim() ||
    row.search_text ||
    "";
  const url = row.source_urls && row.source_urls.length > 0 ? row.source_urls[0] : undefined;

  const isVerified =
    !!url && contentText.length >= VERIFIED_MIN_CONTENT_LEN;

  const section = extractSection(title);
  const codeBody = extractCodeBody(title);
  const edition =
    (row.metadata?.edition as string | undefined) ||
    (row.metadata?.year as string | undefined) ||
    "Current";

  const citation = row.slug || `${codeBody} ${section} (${edition})`;

  return {
    source: "rag",
    edition,
    section,
    jurisdiction: query.jurisdiction,
    title: title || `${codeBody} ${section}`,
    text: isVerified
      ? contentText
      : `Local corpus match (no canonical URL yet) — ${contentText.slice(0, 280)}${contentText.length > 280 ? "…" : ""}`,
    citation,
    confidenceTier: isVerified ? "primary" : "summary",
    retrievedAt: new Date().toISOString(),
    url,
    historical: !!row.metadata?.historical,
    verified: isVerified,
    // ATTEST-WIRE: the SELECT computes this as `manually_verified_at IS NOT NULL`.
    // RPC paths (hybrid / vector) may not yet project the column → undefined ↦ false.
    manually_verified: row.manually_verified === true,
  };
}

/**
 * RPC-style FTS query against knowledge_entities. We use the supabase-js
 * client's `.textSearch()` which compiles to `to_tsvector ... @@ plainto_tsquery`.
 * Ordering by ts_rank_cd would require an RPC; we approximate by ordering
 * by updated_at desc which surfaces most-recently-touched code first.
 */
async function queryKnowledgeEntities(
  q: string,
  query: CodeQuery
): Promise<RawRow[]> {
  // ATTEST-WIRE: include manually_verified_at so the result mapper can set
  // manually_verified on the CodeSourceResult. PostgREST doesn't support
  // computed `IS NOT NULL` expressions in select, so we pull the timestamp
  // and coerce in TS (rowToResult).
  const RAG_SELECT =
    "id, slug, title, summary, body, search_text, entity_type, source_urls, jurisdiction_ids, metadata, manually_verified_at";

  let qb = supabase
    .from("knowledge_entities")
    .select(RAG_SELECT)
    .in("entity_type", CODE_ENTITY_TYPES)
    .eq("status", "published")
    .limit(RAG_LIMIT);

  if (q) {
    qb = qb.textSearch("search_text", q, { type: "plain", config: "english" });
  }

  const { data, error } = await qb;
  const mapRows = (rows: Array<Record<string, unknown>> | null): RawRow[] =>
    (rows ?? []).map((r) => ({
      ...(r as unknown as RawRow),
      manually_verified: r.manually_verified_at != null,
    }));
  if (error || !data) {
    // FTS may return nothing; fall back to ilike OR on the same column
    const words = q.split(/\s+/).filter((w) => w.length > 2).slice(0, 4);
    if (words.length === 0) return [];
    const orFilter = words.map((w) => `search_text.ilike.%${w}%`).join(",");
    const fb = await supabase
      .from("knowledge_entities")
      .select(RAG_SELECT)
      .in("entity_type", CODE_ENTITY_TYPES)
      .eq("status", "published")
      .or(orFilter)
      .limit(RAG_LIMIT);
    return mapRows(fb.data as Array<Record<string, unknown>> | null);
  }
  return mapRows(data as Array<Record<string, unknown>>);
}

/**
 * Query the dedicated `building_codes` table when it exists (SCHEMA-ALPHA
 * may land this). Returns null if the table is absent — caller falls
 * back to knowledge_entities.
 */
async function queryBuildingCodesTable(
  q: string
): Promise<RawRow[] | null> {
  try {
    const { data, error } = await supabase
      .from("building_codes")
      // We don't know the exact columns yet; select * and remap downstream.
      .select("*")
      .textSearch("search_text", q, { type: "plain", config: "english" })
      .limit(RAG_LIMIT);

    if (error) {
      // 42P01 (undefined_table) → not present yet.
      // Anything else → propagate as "not available", we'll use knowledge_entities.
      return null;
    }
    if (!data) return [];
    return data.map((d: Record<string, unknown>) => ({
      id: String(d.id ?? ""),
      slug: (d.slug as string) ?? (d.section as string) ?? null,
      title: d.title ?? null,
      summary: d.summary ?? null,
      body: d.body ?? d.content ?? null,
      search_text: (d.search_text as string) ?? (d.content as string) ?? null,
      entity_type: (d.entity_type as string) ?? "building_code",
      source_urls: (d.source_urls as string[]) ?? (d.url ? [d.url as string] : null),
      jurisdiction_ids: (d.jurisdiction_ids as string[]) ?? null,
      metadata: (d.metadata as Record<string, unknown>) ?? null,
      // building_codes table may not exist yet; if it does, mirror the
      // knowledge_entities attestation column naming.
      manually_verified: d.manually_verified_at != null,
    }));
  } catch {
    return null;
  }
}

/**
 * Compute an embedding for a free-text query via OpenAI's embeddings API.
 * Returns null when OPENAI_API_KEY isn't set or the call fails — callers
 * MUST treat null as "fall back to FTS" rather than as an error.
 *
 * Cached per-process by `${model}::${text}` so multi-specialist requests
 * that share a query string only pay one round-trip.
 */
export async function embedQuery(text: string): Promise<number[] | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const key = `${EMBEDDING_MODEL}::${trimmed}`;
  if (queryEmbeddingCache.has(key)) return queryEmbeddingCache.get(key) ?? null;

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: trimmed }),
    });
    if (!res.ok) {
      queryEmbeddingCache.set(key, null);
      if (process.env.NODE_ENV !== "test") {
        console.warn(`embedQuery: ${res.status} ${await res.text()}`);
      }
      return null;
    }
    const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
    const vector = json.data[0]?.embedding ?? null;
    queryEmbeddingCache.set(key, vector);
    return vector;
  } catch (err) {
    queryEmbeddingCache.set(key, null);
    if (process.env.NODE_ENV !== "test") {
      console.warn("embedQuery error:", err);
    }
    return null;
  }
}

/**
 * Check (with short cache) whether ANY row in the corpus has an embedding.
 * Cheap: index-only count on `WHERE embedding IS NOT NULL`. Avoids paying
 * for an embedding round-trip when we know the vector path will produce
 * zero candidates.
 */
async function corpusHasAnyVectors(): Promise<boolean> {
  const now = Date.now();
  if (corpusHasVectors && now - corpusHasVectors.checkedAt < CORPUS_VECTOR_TTL_MS) {
    return corpusHasVectors.value;
  }
  try {
    const { count, error } = await supabase
      .from("knowledge_entities")
      .select("id", { count: "exact", head: true })
      .not("embedding", "is", null)
      .eq("status", "published")
      .limit(1);
    const has = !error && (count ?? 0) > 0;
    corpusHasVectors = { value: has, checkedAt: now };
    return has;
  } catch {
    corpusHasVectors = { value: false, checkedAt: now };
    return false;
  }
}

/**
 * pgvector cosine-similarity retrieval. We call an RPC because supabase-js
 * has no ergonomic way to express `ORDER BY embedding <=> $1::vector`. The
 * RPC is defined in the same migration that adds the HNSW index
 * (`20260522c_knowledge_entities_embedding_hnsw.sql`). If the RPC is not
 * yet deployed, we return null and the caller falls back to FTS.
 */
async function queryByVector(vector: number[]): Promise<RawRow[] | null> {
  try {
    const { data, error } = await supabase.rpc("match_knowledge_entities", {
      query_embedding: vector,
      match_limit: RAG_LIMIT,
      entity_types: CODE_ENTITY_TYPES,
    });
    if (error) {
      // 42883 (undefined_function) → RPC not deployed yet. Anything else
      // is a real failure but we still want FTS to take over.
      if (process.env.NODE_ENV !== "test") {
        console.warn("queryByVector RPC error:", error.message);
      }
      return null;
    }
    if (!data) return [];
    return data as RawRow[];
  } catch {
    return null;
  }
}

/**
 * Hybrid retrieval RPC. Calls `hybrid_match_knowledge_entities` which
 * runs both a vector and an FTS search server-side, normalizes both
 * scores to [0,1], and returns a union with α·vector + β·fts pre-applied.
 * The TS adapter then layers the section-number bonus (γ) on top.
 *
 * Returns null when:
 *   - the RPC isn't deployed yet (42883)
 *   - any other DB error happens (caller falls back to FTS path)
 * Returns [] when the RPC ran but found nothing.
 */
async function queryByHybrid(
  vector: number[],
  q: string
): Promise<RawHybridRow[] | null> {
  try {
    const { data, error } = await supabase.rpc(
      "hybrid_match_knowledge_entities",
      {
        query_embedding: vector,
        query_text: q,
        match_limit: HYBRID_CANDIDATE_LIMIT,
        entity_types: CODE_ENTITY_TYPES,
      }
    );
    if (error) {
      if (process.env.NODE_ENV !== "test") {
        console.warn("queryByHybrid RPC error:", error.message);
      }
      return null;
    }
    if (!data) return [];
    return data as RawHybridRow[];
  } catch {
    return null;
  }
}

interface RawHybridRow extends RawRow {
  vector_score?: number | string | null;
  fts_score?: number | string | null;
  combined_score?: number | string | null;
}

/**
 * Coerce a numeric/string score from the RPC into a finite number in
 * [0,1]. Postgres `numeric` arrives as a string in supabase-js; we
 * parseFloat it and clamp. Null / NaN → 0 (treat as "missing signal").
 */
function toScore(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Apply the section-number bonus to RPC output and re-rank.
 *
 * The RPC already gave us `α·vector + β·fts`. We layer `γ·section_bonus`
 * on top in TS so we can tune γ without redeploying SQL — and because
 * section matching is fundamentally a slug/title string test, easier to
 * iterate in TS than in plpgsql.
 *
 * Exported for unit tests; not part of the public adapter surface.
 */
export function hybridRerank(
  rows: RawHybridRow[],
  query: CodeQuery
): HybridCandidate[] {
  const sections = extractSectionNumbers(query);
  const candidates: HybridCandidate[] = rows.map((row) => {
    const vectorScore = toScore(row.vector_score);
    const ftsScore = toScore(row.fts_score);
    const sectionBonus = sectionBonusForRow(row, sections);
    return {
      row,
      vectorScore,
      ftsScore,
      sectionBonus,
      combinedScore: combineHybridScores(vectorScore, ftsScore, sectionBonus),
    };
  });
  candidates.sort((a, b) => b.combinedScore - a.combinedScore);
  return candidates;
}

/**
 * Main entry point. Returns up to RAG_LIMIT CodeSourceResults.
 * - Empty array when Supabase isn't configured or no terms to search on.
 * - Hybrid (vector + FTS + section bonus) when OPENAI_API_KEY is set AND
 *   corpus has embeddings AND the hybrid RPC is deployed.
 * - Falls back to pure vector if hybrid RPC is missing (older deploy).
 * - Falls back to FTS for cold-start (pre-backfill), missing API key, or
 *   any error along the vector path. Verification gate applied per row.
 */
export async function queryRag(query: CodeQuery): Promise<CodeSourceResult[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const q = buildQueryString(query);
  if (!q) return [];

  return withCache("rag", query, async () => {
  try {
    // 1. Hybrid path (vector + FTS + section bonus). Requires both an
    //    embedding API key AND a populated corpus. The hybrid RPC handles
    //    the merge server-side; we re-rank locally with the section bonus.
    if (process.env.OPENAI_API_KEY && (await corpusHasAnyVectors())) {
      const vector = await embedQuery(q);
      if (vector) {
        const hybridRows = await queryByHybrid(vector, q);
        if (hybridRows && hybridRows.length > 0) {
          const ranked = hybridRerank(hybridRows, query).slice(0, RAG_LIMIT);
          return ranked.map((c) => rowToResult(c.row, query));
        }

        // 1b. Hybrid RPC absent or returned nothing? Try the older
        //     pure-vector RPC so we keep working during the rollout
        //     window before the migration is applied.
        if (hybridRows === null) {
          const vrows = await queryByVector(vector);
          if (vrows && vrows.length > 0) {
            return vrows.map((row) => rowToResult(row, query));
          }
        }
        // Empty result on either path → fall through to FTS.
      }
    }

    // 2. Prefer dedicated building_codes table when SCHEMA-ALPHA ships it.
    let rows = await queryBuildingCodesTable(q);
    if (rows === null) {
      // Table absent → use knowledge_entities (current production path).
      rows = await queryKnowledgeEntities(q, query);
    }

    if (!rows || rows.length === 0) return [];

    return rows.map((row) => rowToResult(row, query));
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("RAG query error:", err);
    }
    return [];
  }
  });
}
