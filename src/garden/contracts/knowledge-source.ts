/**
 * L2 contract — Knowledge sources
 * ==============================
 *
 * The knowledge-node schema (kg_entities/kg_assertions/jurisdictions), the
 * citation + last-verified verification pipeline, and RAG retrieval are all
 * GARDEN-GENERIC (they live in the engine). What's garden-specific is the set
 * of authoritative SOURCES consulted: BKG supplies ICC / NFPA / UpCodes / a
 * CSLB scraper + a RAG-over-kg_entities source (`src/lib/code-sources/*`). A
 * new garden supplies its own source adapters behind this interface; the engine
 * RAG source is one built-in implementation.
 *
 * See `docs/garden-engine/01-DEPENDENCY-GRAPH.md` (code-sources classification).
 */

export interface KnowledgeQuery {
  /** Free-text query. */
  text: string;
  /** Optional jurisdiction slug/name scope. */
  jurisdiction?: string;
  /** Optional domain/discipline hint. */
  domain?: string;
  /** Max results to return. */
  limit?: number;
}

export type AuthorityLevel =
  | 'regulatory'
  | 'manufacturer'
  | 'professional'
  | 'experiential'
  | 'derived'
  | 'sensor'
  | 'unverified';

export interface KnowledgeResult {
  id: string;
  title: string;
  summary?: string;
  /** Citation provenance. */
  sourceUrl?: string;
  sourceRef?: string;
  authorityLevel?: AuthorityLevel;
  /** Verification signals surfaced by the engine pipeline. */
  manuallyVerifiedAt?: string | null;
  autoVerifiedAt?: string | null;
  /** Relevance score (source-defined). */
  score?: number;
}

export interface KnowledgeSource {
  /** Stable adapter name (e.g. 'icc-digital-codes', 'rag'). */
  name: string;
  query(q: KnowledgeQuery): Promise<KnowledgeResult[]>;
}
