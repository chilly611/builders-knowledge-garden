/**
 * countVerifiedSources tests (ATTEST-WIRE, 2026-05-24)
 * ====================================================
 * Covers the structural rule backing SourceCountBadge:
 *
 *   - distinct `verified === true` adapter results count by source name
 *   - citation-only (`verified: false`) results do NOT count
 *   - any result with `manually_verified === true` adds the
 *     `manual-attestation` pseudo-source — but only ONCE no matter how
 *     many results carry the flag
 *   - manual attestation lifts a 1-source row to 2 sources verified
 *   - badge math otherwise unchanged: rows without manual attestation
 *     behave exactly as before this change shipped
 */

import { describe, it, expect } from "vitest";
import {
  countVerifiedSources,
  isManuallyAttested,
} from "../index";
import type { CodeSourceResult } from "../types";

const baseResult = (
  source: CodeSourceResult["source"],
  overrides: Partial<CodeSourceResult> = {}
): CodeSourceResult => ({
  source,
  edition: "Current",
  section: "210.52",
  title: "Test",
  text: "Some non-trivial text content here over the verified threshold.",
  citation: `${source}-test`,
  confidenceTier: "primary",
  retrievedAt: "2026-05-24T00:00:00.000Z",
  verified: true,
  ...overrides,
});

describe("countVerifiedSources", () => {
  it("returns 0 for an empty result set", () => {
    expect(countVerifiedSources([])).toBe(0);
  });

  it("counts each distinct verified source once", () => {
    const results: CodeSourceResult[] = [
      baseResult("bkg-seed"),
      baseResult("local-amendment"),
      baseResult("rag"),
    ];
    expect(countVerifiedSources(results)).toBe(3);
  });

  it("collapses duplicate source names to a single count", () => {
    const results: CodeSourceResult[] = [
      baseResult("bkg-seed"),
      baseResult("bkg-seed"),
      baseResult("bkg-seed"),
    ];
    expect(countVerifiedSources(results)).toBe(1);
  });

  it("excludes citation-only results (verified=false)", () => {
    const results: CodeSourceResult[] = [
      baseResult("bkg-seed"),
      baseResult("icc-digital-codes", { verified: false }),
      baseResult("nfpa", { verified: false }),
    ];
    expect(countVerifiedSources(results)).toBe(1);
  });

  it("does NOT change count without manual attestation (pre-change baseline)", () => {
    const results: CodeSourceResult[] = [
      baseResult("bkg-seed"),
      baseResult("local-amendment"),
    ];
    // No manually_verified flag → exactly the legacy count.
    expect(countVerifiedSources(results)).toBe(2);
    expect(isManuallyAttested(results)).toBe(false);
  });

  it("adds manual-attestation pseudo-source when any result carries the flag", () => {
    // Single bkg-seed hit that was manually attested → 1 + manual = 2.
    const results: CodeSourceResult[] = [
      baseResult("bkg-seed", { manually_verified: true }),
    ];
    expect(countVerifiedSources(results)).toBe(2);
    expect(isManuallyAttested(results)).toBe(true);
  });

  it("adds manual-attestation pseudo-source only ONCE across multiple attested rows", () => {
    const results: CodeSourceResult[] = [
      baseResult("bkg-seed", { manually_verified: true }),
      baseResult("rag", { manually_verified: true }),
      baseResult("rag", { manually_verified: true }),
    ];
    // {bkg-seed, rag, manual-attestation} = 3
    expect(countVerifiedSources(results)).toBe(3);
  });

  it("treats manually_verified on a citation-only result as still a +1 (review > fetch)", () => {
    // The fetch failed (verified=false) but a human attested anyway —
    // that's still a legitimate +1 source via the human-in-loop path.
    const results: CodeSourceResult[] = [
      baseResult("bkg-seed"),
      baseResult("upcodes", { verified: false, manually_verified: true }),
    ];
    expect(countVerifiedSources(results)).toBe(2); // bkg-seed + manual-attestation
  });

  it("preserves the 1→2 jump described in the spec (BKG seed + UpCodes-via-Chilly)", () => {
    // Before attestation: 1 source (bkg-seed)
    const before: CodeSourceResult[] = [baseResult("bkg-seed")];
    expect(countVerifiedSources(before)).toBe(1);
    // After attestation: 2 sources (bkg-seed + manual-attestation)
    const after: CodeSourceResult[] = [
      baseResult("bkg-seed", { manually_verified: true }),
    ];
    expect(countVerifiedSources(after)).toBe(2);
  });
});
