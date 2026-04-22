/**
 * Code Sources Orchestrator
 * Coordinates queries across all 4 sources (BKG seed, ICC, NFPA, local amendments)
 * Aggregates results and provides multi-source confidence gating
 */

export type { CodeQuery, CodeSourceResult, CodeSourceName, ConfidenceTier } from "./types";

import { queryBkgSeed } from "./bkg-seed";
import { queryIcc } from "./icc";
import { queryNfpa } from "./nfpa";
import { queryLocalAmendments } from "./local-amendments";
import type { CodeQuery, CodeSourceResult } from "./types";

/**
 * Query all 4 code sources in parallel
 * Returns merged results from any source that succeeds
 * Graceful failure: if a source times out or errors, continue with others
 */
export async function queryAllSources(query: CodeQuery): Promise<CodeSourceResult[]> {
  const [seed, icc, nfpa, amendments] = await Promise.allSettled([
    queryBkgSeed(query),
    queryIcc(query),
    queryNfpa(query),
    queryLocalAmendments(query),
  ]);

  return [seed, icc, nfpa, amendments]
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<CodeSourceResult[]>).value);
}

/**
 * Check if results span ≥2 distinct code sources
 * Used for confidence gating: only return confidence: high if multiple sources present
 *
 * @param results Array of CodeSourceResult from queryAllSources
 * @returns true if ≥2 distinct source values are present
 */
export function hasMultipleSources(results: CodeSourceResult[]): boolean {
  const sources = new Set(results.map((r) => r.source));
  return sources.size >= 2;
}
