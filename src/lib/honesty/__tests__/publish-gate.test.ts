/**
 * Honesty publish gate — tier decision tests (LOOP 2 / Slice A).
 *
 * The gate is pure and total, so these assert the full truth table: every
 * (verification × provenance × superseded) combination maps to exactly one
 * tier, and only "verified" may assert as authoritative.
 */

import { describe, it, expect } from "vitest";
import { gateFact, gateCitation } from "../publish-gate";

describe("gateFact — three-tier publish gate", () => {
  it("manually_verified + current → verified, may assert", () => {
    const v = gateFact({ verification: "manually_verified", hasCitation: true, hasProvenance: true });
    expect(v.tier).toBe("verified");
    expect(v.mayAssertVerified).toBe(true);
    expect(v.label).toBeNull();
    expect(v.reason).toBe("manually_attested");
  });

  it("auto_verified → labeled with the AI-cross-check caveat, must NOT assert", () => {
    const v = gateFact({ verification: "auto_verified", hasCitation: true, hasProvenance: true });
    expect(v.tier).toBe("labeled");
    expect(v.mayAssertVerified).toBe(false);
    expect(v.label).toMatch(/AI-cross-checked/i);
    expect(v.reason).toBe("auto_cross_checked");
  });

  it("unverified WITH citation + provenance → labeled (citation-only)", () => {
    const v = gateFact({ verification: "unverified", hasCitation: true, hasProvenance: true });
    expect(v.tier).toBe("labeled");
    expect(v.mayAssertVerified).toBe(false);
    expect(v.label).toMatch(/citation only/i);
    expect(v.reason).toBe("citation_only");
  });

  it("unverified with a citation but NO provenance → withheld", () => {
    const v = gateFact({ verification: "unverified", hasCitation: true, hasProvenance: false });
    expect(v.tier).toBe("withheld");
    expect(v.mayAssertVerified).toBe(false);
    expect(v.label).toBeNull();
    expect(v.reason).toBe("insufficient_provenance");
  });

  it("unverified with nothing to stand on → withheld", () => {
    const v = gateFact({ verification: "unverified", hasCitation: false, hasProvenance: false });
    expect(v.tier).toBe("withheld");
    expect(v.reason).toBe("insufficient_provenance");
  });

  it("superseded demotes even a human-attested fact to labeled — never asserts as current code", () => {
    const v = gateFact({
      verification: "manually_verified",
      hasCitation: true,
      hasProvenance: true,
      superseded: true,
    });
    expect(v.tier).toBe("labeled");
    expect(v.mayAssertVerified).toBe(false);
    expect(v.label).toMatch(/superseded/i);
    expect(v.reason).toBe("superseded");
  });
});

describe("gateCitation — CodeCitation adapter", () => {
  const base = {
    verification: "unverified" as const,
    citation: "CRC R321 (2025)",
    sourceUrls: [] as string[],
    sourceDocs: [] as string[],
  };

  it("treats a source URL as provenance → labeled citation-only", () => {
    const v = gateCitation({ ...base, sourceUrls: ["https://up.codes/s/..."] });
    expect(v.tier).toBe("labeled");
    expect(v.reason).toBe("citation_only");
  });

  it("treats a source doc as provenance too", () => {
    const v = gateCitation({ ...base, sourceDocs: ["CRC-2025.pdf"] });
    expect(v.tier).toBe("labeled");
  });

  it("no citation + no provenance → withheld", () => {
    const v = gateCitation({ ...base, citation: "   " });
    expect(v.tier).toBe("withheld");
  });

  it("manually_verified citation → verified", () => {
    const v = gateCitation({ ...base, verification: "manually_verified", sourceUrls: ["https://x"] });
    expect(v.tier).toBe("verified");
    expect(v.mayAssertVerified).toBe(true);
  });

  it("honors an explicit superseded flag", () => {
    const v = gateCitation({ ...base, verification: "manually_verified", sourceUrls: ["https://x"], superseded: true });
    expect(v.tier).toBe("labeled");
    expect(v.reason).toBe("superseded");
  });
});
