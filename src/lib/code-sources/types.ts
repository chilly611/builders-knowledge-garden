/**
 * BKG 3-Source Code Verification Types
 * Secondary source adapter layer for cross-checking code queries
 * against ≥2 sources before returning confidence: high
 */

export type CodeSourceName =
  | "bkg-seed"
  | "icc-digital-codes"
  | "nfpa"
  | "local-amendment"
  /**
   * UpCodes — third-party publisher with a public API and jurisdiction
   * overlays for ICC content. Cheapest paid option with real API docs
   * (https://up.codes/about/api). Acts as a substitute / supplement for the
   * `icc-digital-codes` adapter when an ICC enterprise contract isn't yet
   * in place. Same citation-only fallback semantics — no key → not verified.
   */
  | "upcodes"
  /**
   * RAG over the local code corpus (knowledge_entities filtered to
   * entity_type IN ('building_code','code_section','safety_regulation',
   * 'standard'), or the dedicated building_codes table when present).
   * Distinct from "bkg-seed" because bkg-seed pulls from the curated
   * knowledge layer via retrieveEntities(); "rag" pulls broader code
   * corpus rows scored by FTS / vector similarity.
   */
  | "rag";
export type ConfidenceTier = "primary" | "summary" | "historical";

/**
 * Normalized query contract for all code sources
 */
export interface CodeQuery {
  discipline: "electrical" | "structural" | "plumbing" | "mechanical" | "fire";
  edition?: string; // e.g. "NEC 2023" — optional; if missing, try current + one historical
  section?: string; // e.g. "210.52(C)(5)" — optional
  keywords: string[]; // free-text terms; always populated
  jurisdiction?: string; // e.g. "ca-sf" — drives amendment lookup in Agent 4's layer
}

/**
 * Standardized result from any code source
 * Enables orchestrator to merge results from ICC, NFPA, and BKG seed
 */
export interface CodeSourceResult {
  source: CodeSourceName;
  edition: string;
  section: string;
  jurisdiction?: string;
  title: string;
  text: string; // applicable code text or summary
  citation: string; // canonical citation for display
  confidenceTier: ConfidenceTier;
  retrievedAt: string; // ISO timestamp
  url?: string;
  historical?: boolean; // true if superseded
  supersededBy?: string; // id / section of current rule if historical
  /**
   * True only when the adapter actually retrieved the cited text from the
   * source (or pulled it from a vetted local seed file). False when the
   * adapter only constructed a deep-link to the publisher without fetching
   * the rule — i.e. "citation-only". The SourceCountBadge counts ONLY
   * `verified === true` results toward the badge.
   */
  verified?: boolean;
  /**
   * ATTEST-WIRE (2026-05-24): set on RAG (and any other) results whose
   * underlying knowledge_entities row has a non-NULL `manually_verified_at`.
   * Drives the `manual-attestation` pseudo-source in countVerifiedSources()
   * — so a row that already counts as bkg-seed (1 verified source) bumps
   * to 2 sources verified once Chilly has reviewed it against UpCodes.
   * Distinct from `verified` (which only proves the adapter fetched
   * something); `manually_verified` is the human attestation overlay.
   */
  manually_verified?: boolean;
  /**
   * AUTO-VERIFY (2026-05-25): set on RAG results whose underlying
   * knowledge_entities row was cleared by the Claude cross-check pre-pass
   * (`auto_verified_at IS NOT NULL AND auto_verification_flagged = false`).
   * Drives the `claude-cross-check` pseudo-source in countVerifiedSources().
   *
   * Rules for the badge:
   *   - manual attestation always supersedes auto (green tick wins over yellow)
   *   - auto_verified counts as +1 verified source ONLY when manual_verified
   *     is NOT also set on the SAME row (otherwise we'd double-count)
   *   - rows where the AI flagged a discrepancy MUST NOT have this true —
   *     those carry auto_verification_flagged=true and are still in the
   *     human queue
   */
  auto_verified?: boolean;
}
