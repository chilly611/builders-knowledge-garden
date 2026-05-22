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
 *   1. If pgvector is enabled, OPENAI_API_KEY is set, AND any rows in the
 *      corpus have a non-NULL `embedding`, compute a query embedding and
 *      run cosine similarity (`embedding <=> $1`). Backfill script:
 *      `npm run embeddings`.
 *   2. Otherwise (no key, no embeddings yet, or vector call fails), fall
 *      back to Postgres full-text search via `search_text`.
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

const CODE_ENTITY_TYPES = [
  "building_code",
  "code_section",
  "safety_regulation",
  "standard",
];

const VERIFIED_MIN_CONTENT_LEN = 100;
const RAG_LIMIT = 5;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

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
  let qb = supabase
    .from("knowledge_entities")
    .select("id, slug, title, summary, body, search_text, entity_type, source_urls, jurisdiction_ids, metadata")
    .in("entity_type", CODE_ENTITY_TYPES)
    .eq("status", "published")
    .limit(RAG_LIMIT);

  if (q) {
    qb = qb.textSearch("search_text", q, { type: "plain", config: "english" });
  }

  const { data, error } = await qb;
  if (error || !data) {
    // FTS may return nothing; fall back to ilike OR on the same column
    const words = q.split(/\s+/).filter((w) => w.length > 2).slice(0, 4);
    if (words.length === 0) return [];
    const orFilter = words.map((w) => `search_text.ilike.%${w}%`).join(",");
    const fb = await supabase
      .from("knowledge_entities")
      .select("id, slug, title, summary, body, search_text, entity_type, source_urls, jurisdiction_ids, metadata")
      .in("entity_type", CODE_ENTITY_TYPES)
      .eq("status", "published")
      .or(orFilter)
      .limit(RAG_LIMIT);
    return (fb.data as RawRow[] | null) ?? [];
  }
  return data as RawRow[];
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
 * Main entry point. Returns up to RAG_LIMIT CodeSourceResults.
 * - Empty array when Supabase isn't configured or no terms to search on.
 * - Vector-first when (OPENAI_API_KEY is set) AND (corpus has embeddings).
 * - Falls back to FTS for cold-start (pre-backfill), missing API key, or
 *   any error along the vector path. Verification gate applied per row.
 */
export async function queryRag(query: CodeQuery): Promise<CodeSourceResult[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const q = buildQueryString(query);
  if (!q) return [];

  try {
    // 1. Vector path (only when both key AND populated corpus are present).
    if (process.env.OPENAI_API_KEY && (await corpusHasAnyVectors())) {
      const vector = await embedQuery(q);
      if (vector) {
        const vrows = await queryByVector(vector);
        if (vrows && vrows.length > 0) {
          return vrows.map((row) => rowToResult(row, query));
        }
        // Empty vector result is suspicious; fall through to FTS.
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
}
