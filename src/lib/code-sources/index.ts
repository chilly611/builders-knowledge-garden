/**
 * Code Sources Orchestrator
 * Coordinates queries across all 6 sources:
 *   1. BKG seed (curated knowledge entities, verified)
 *   2. Local amendments (hand-vetted JSON in repo, verified)
 *   3. RAG over local code corpus (FTS / vector, verified when row has URL + content)
 *   4. ICC DigitalCodes (citation-only until contract; live-mode wired)
 *   5. NFPA Link (citation-only until contract; live-mode wired)
 *   6. UpCodes (public API; citation-only without key, verified with key)
 *
 * Aggregates results and provides multi-source confidence gating.
 */

export type { CodeQuery, CodeSourceResult, CodeSourceName, ConfidenceTier } from "./types";

import { queryBkgSeed } from "./bkg-seed";
import { queryIcc } from "./icc";
import { queryNfpa } from "./nfpa";
import { queryUpCodes } from "./upcodes";
import { queryLocalAmendments } from "./local-amendments";
import { queryRag } from "./rag";
import type { CodeQuery, CodeSourceResult } from "./types";

export { queryRag } from "./rag";
export { queryBkgSeed } from "./bkg-seed";
export { queryIcc } from "./icc";
export { queryNfpa } from "./nfpa";
export { queryUpCodes } from "./upcodes";
export { queryLocalAmendments } from "./local-amendments";
export { getCacheStats, invalidateCache } from "./cache";
export type { CacheableSource } from "./cache";

/**
 * Query all 6 code sources in parallel.
 * Graceful failure: if a source times out or errors, continue with others.
 */
export async function queryAllSources(query: CodeQuery): Promise<CodeSourceResult[]> {
  const [seed, icc, nfpa, upcodes, amendments, rag] = await Promise.allSettled([
    queryBkgSeed(query),
    queryIcc(query),
    queryNfpa(query),
    queryUpCodes(query),
    queryLocalAmendments(query),
    queryRag(query),
  ]);

  return [seed, icc, nfpa, upcodes, amendments, rag]
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<CodeSourceResult[]>).value);
}

/**
 * Back-compat alias. `aggregateSources` is the name some callers were
 * expected to use; map it to queryAllSources.
 */
export const aggregateSources = queryAllSources;

/**
 * Check if results span ≥2 distinct code sources.
 * Used for confidence gating: only return confidence: high if multiple
 * sources are present.
 */
export function hasMultipleSources(results: CodeSourceResult[]): boolean {
  const sources = new Set(results.map((r) => r.source));
  return sources.size >= 2;
}

/**
 * Count distinct VERIFIED code sources in a result set.
 *
 * A source is verified iff the adapter actually retrieved the cited text
 * (currently: BKG seed entities, local amendments, and RAG hits that
 * have a source URL + non-trivial content). Citation-only adapters
 * (ICC DigitalCodes, NFPA Link — paywalled, no live contract yet)
 * return `verified: false` and are NOT counted.
 *
 * ATTEST-WIRE (2026-05-24): a `manual-attestation` pseudo-source is added
 * to the verified set whenever ANY result in the bag carries
 * `manually_verified: true` (set by rag.ts when the underlying
 * knowledge_entities row has `manually_verified_at IS NOT NULL`). This is
 * how a row goes from "1 source verified" (bkg-seed only) to "2 sources
 * verified" once a reviewer has cross-checked it against UpCodes.
 *
 * The attestation is NOT a fake adapter result — it's a legitimate signal
 * that a human with a licensed-publisher seat has confirmed the stored
 * text matches the source of truth.
 *
 * This is the input the SourceCountBadge uses. Treat it as the structural
 * truth backing the "N sources verified" trust signal.
 */
export function countVerifiedSources(results: CodeSourceResult[]): number {
  const verifiedSources = new Set<string>(
    results.filter((r) => r.verified === true).map((r) => r.source)
  );
  if (results.some((r) => r.manually_verified === true)) {
    verifiedSources.add("manual-attestation");
  }
  return verifiedSources.size;
}

/**
 * True iff any result in the bag is backed by a manual attestation.
 * Used by SourceCountBadge to show "manually reviewed" hint text.
 */
export function isManuallyAttested(results: CodeSourceResult[]): boolean {
  return results.some((r) => r.manually_verified === true);
}
