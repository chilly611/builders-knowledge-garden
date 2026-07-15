/**
 * Tests for the interpreted+cited answer envelope — the "never raw dumps" guarantee.
 */
import { describe, it, expect } from "vitest";
import {
  verdictFromSources,
  countIndependentSources,
  interpret,
  notCovered,
  toToolResult,
  type Citation,
} from "../citations";

const cite = (over: Partial<Citation>): Citation => ({ label: "x", source: "knowledge_entities", ...over });

describe("verdictFromSources", () => {
  it("maps source counts to tiers (Three-Source Rule)", () => {
    expect(verdictFromSources(3)).toBe("authoritative");
    expect(verdictFromSources(5)).toBe("authoritative");
    expect(verdictFromSources(2)).toBe("corroborated");
    expect(verdictFromSources(1)).toBe("single");
    expect(verdictFromSources(0)).toBe("uncovered");
  });
});

describe("countIndependentSources", () => {
  it("dedupes citations that share a source/url so one doc isn't 3 'sources'", () => {
    const same = [
      cite({ url: "https://a", jurisdiction: "CA" }),
      cite({ url: "https://a", jurisdiction: "CA" }),
      cite({ url: "https://a", jurisdiction: "CA" }),
    ];
    expect(countIndependentSources(same)).toBe(1);
  });
  it("counts distinct agencies/urls as independent", () => {
    const distinct = [
      cite({ url: "https://epa", agency: "EPA" }),
      cite({ url: "https://ewg", agency: "EWG" }),
      cite({ source: "classifications", detail: "carcinogen" }),
    ];
    expect(countIndependentSources(distinct)).toBe(3);
  });
});

describe("interpret", () => {
  it("derives verdict from independent sources and always carries a disclaimer", () => {
    const a = interpret({
      garden: "tkg",
      tool: "is_substance_restricted",
      answer: "Arsenic is regulated.",
      citations: [cite({ agency: "EPA", url: "https://epa" }), cite({ agency: "EWG", url: "https://ewg" })],
      now: () => "2026-06-11T00:00:00Z",
    });
    expect(a.verdict).toBe("corroborated");
    expect(a.coverage.covered).toBe(true);
    expect(a.disclaimer).toMatch(/verify against/i);
    expect(a.meta.citationCount).toBe(2);
    expect(a.meta.generatedAt).toBe("2026-06-11T00:00:00Z");
  });

  it("honors an explicit verdict override", () => {
    const a = interpret({
      garden: "tkg",
      tool: "non_toxic_alternatives_for",
      answer: "comparison",
      citations: [cite({}), cite({}), cite({})],
      verdict: "single",
    });
    expect(a.verdict).toBe("single"); // not auto-upgraded to authoritative
  });
});

describe("notCovered", () => {
  it("never asserts coverage and carries no citations", () => {
    const a = notCovered({ garden: "bkg", tool: "lookup_jurisdiction_requirements", answer: "not yet covered for Mars", reason: "unknown_jurisdiction" });
    expect(a.verdict).toBe("uncovered");
    expect(a.coverage.covered).toBe(false);
    expect(a.coverage.reason).toBe("unknown_jurisdiction");
    expect(a.citations).toHaveLength(0);
  });
});

describe("toToolResult", () => {
  it("returns both a text block and structuredContent (cited shape preserved)", () => {
    const a = interpret({
      garden: "bkg",
      tool: "citation_for_claim",
      answer: "Backed by 2 sections.",
      citations: [cite({ label: "IBC 2024 §903.2.1", url: "https://x", jurisdiction: "CA", verification: "manually_verified", detail: "sprinklers" })],
    });
    const r = toToolResult(a);
    expect(r.content[0].type).toBe("text");
    expect(r.content[0].text).toMatch(/Citations:/);
    expect(r.content[0].text).toMatch(/IBC 2024 §903.2.1/);
    expect(r.structuredContent).toBeTruthy();
    expect((r.structuredContent as { verdict: string }).verdict).toBe("single");
  });

  it("surfaces 'not covered' explicitly in the text", () => {
    const r = toToolResult(notCovered({ garden: "tkg", tool: "citation_for_claim", answer: "no evidence", reason: "no_evidence" }));
    expect(r.content[0].text).toMatch(/not covered/i);
  });
});
