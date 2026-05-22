/**
 * Hybrid RAG rerank tests.
 *
 * Pins the score combination and ordering behavior independently of the
 * Supabase / OpenAI integration. The end-to-end queryRag path is
 * exercised in higher-level integration tests; here we focus on:
 *
 *   - section-number extraction from CodeQuery
 *   - per-row section bonus (exact vs prefix vs miss)
 *   - score combination matches the documented weights
 *   - hybridRerank orders rows so an exact-section match beats a
 *     better vector-score row when only the section bonus differs
 */

import { describe, it, expect } from "vitest";
import {
  combineHybridScores,
  extractSectionNumbers,
  sectionBonusForRow,
  hybridRerank,
} from "../rag";
import type { CodeQuery } from "../types";

const ALPHA = 0.6;
const BETA = 0.3;
const GAMMA = 0.1;

describe("extractSectionNumbers", () => {
  it("pulls a section from CodeQuery.section", () => {
    const q: CodeQuery = {
      discipline: "electrical",
      section: "210.52(C)(5)",
      keywords: [],
    };
    const out = extractSectionNumbers(q);
    expect(out).toContain("210.52(c)(5)");
  });

  it("pulls section numbers embedded in keywords", () => {
    const q: CodeQuery = {
      discipline: "electrical",
      keywords: ["NEC 210.52", "receptacle outlet spacing"],
    };
    const out = extractSectionNumbers(q);
    expect(out).toContain("210.52");
  });

  it("returns [] when nothing looks like a section number", () => {
    const q: CodeQuery = {
      discipline: "plumbing",
      keywords: ["leaky pipe", "drain"],
    };
    expect(extractSectionNumbers(q)).toEqual([]);
  });

  it("dedupes overlapping matches between fields", () => {
    const q: CodeQuery = {
      discipline: "electrical",
      section: "210.52",
      keywords: ["210.52 outlet"],
    };
    const out = extractSectionNumbers(q);
    expect(out.filter((s) => s === "210.52")).toHaveLength(1);
  });

  it("does NOT match single-digit numbers", () => {
    const q: CodeQuery = {
      discipline: "electrical",
      keywords: ["1 or 2 receptacles"],
    };
    expect(extractSectionNumbers(q)).toEqual([]);
  });
});

describe("sectionBonusForRow", () => {
  it("returns 1.0 when the slug contains the exact section", () => {
    const row = { slug: "nec-210-52-c-5-kitchen", title: { en: "Kitchen" } };
    expect(sectionBonusForRow(row, ["210.52"])).toBeCloseTo(1.0);
  });

  it("returns 1.0 when the title contains the exact section", () => {
    const row = {
      slug: "kitchen-island-outlets",
      title: { en: "NEC 210.52(C)(5) — Island Countertop Receptacles" },
    };
    expect(sectionBonusForRow(row, ["210.52(c)(5)"])).toBeCloseTo(1.0);
  });

  it("returns 0.5 when only the numeric prefix matches", () => {
    const row = { slug: "nec-article-210-branch-circuits", title: { en: "NEC 210" } };
    expect(sectionBonusForRow(row, ["210.52"])).toBeCloseTo(0.5);
  });

  it("returns 0 when nothing matches", () => {
    const row = { slug: "ibc-504-building-height", title: { en: "Building Height" } };
    expect(sectionBonusForRow(row, ["210.52"])).toBe(0);
  });

  it("returns 0 when sections array is empty", () => {
    const row = { slug: "anything", title: { en: "Anything" } };
    expect(sectionBonusForRow(row, [])).toBe(0);
  });

  it("does not match a single-digit prefix", () => {
    // sec "2" wouldn't be returned by extractSectionNumbers anyway, but
    // belt + braces: prefix length < 2 short-circuits.
    const row = { slug: "anything-2-anything", title: { en: "" } };
    expect(sectionBonusForRow(row, ["2"])).toBe(0);
  });
});

describe("combineHybridScores", () => {
  it("applies the documented α/β/γ weights", () => {
    const v = 0.8;
    const f = 0.5;
    const s = 1.0;
    const expected = ALPHA * v + BETA * f + GAMMA * s;
    expect(combineHybridScores(v, f, s)).toBeCloseTo(expected);
  });

  it("returns 0 for all-zero inputs", () => {
    expect(combineHybridScores(0, 0, 0)).toBe(0);
  });

  it("is monotonic in each component", () => {
    const base = combineHybridScores(0.5, 0.5, 0);
    expect(combineHybridScores(0.6, 0.5, 0)).toBeGreaterThan(base);
    expect(combineHybridScores(0.5, 0.6, 0)).toBeGreaterThan(base);
    expect(combineHybridScores(0.5, 0.5, 0.5)).toBeGreaterThan(base);
  });
});

describe("hybridRerank", () => {
  const query: CodeQuery = {
    discipline: "electrical",
    section: "210.52(C)(5)",
    keywords: ["NEC", "210.52", "receptacle", "outlet"],
  };

  it("re-ranks an exact section match above a higher-vector-score neighbor", () => {
    // Row A: high vector score, no section match (the semantic neighbor
    // that vector retrieval would put first).
    const rowA = {
      id: "a",
      slug: "nec-article-210-branch-circuits-overview",
      title: { en: "NEC Article 210 — Branch Circuits" },
      vector_score: 0.92,
      fts_score: 0.10,
    };
    // Row B: mid vector score, but slug carries the exact section.
    const rowB = {
      id: "b",
      slug: "nec-210-52-c-5-island-countertop",
      title: { en: "NEC 210.52(C)(5) — Island Countertop Receptacles" },
      vector_score: 0.70,
      fts_score: 0.95,
    };

    const ranked = hybridRerank([rowA, rowB], query);
    expect(ranked[0].row.id).toBe("b");
    expect(ranked[1].row.id).toBe("a");
    expect(ranked[0].sectionBonus).toBe(1.0);
    expect(ranked[1].sectionBonus).toBe(0.5); // prefix "210" hit
  });

  it("preserves order when section bonus is tied (vector wins)", () => {
    const rowA = {
      id: "a",
      slug: "nec-other",
      title: { en: "NEC Other Topic" },
      vector_score: 0.90,
      fts_score: 0.10,
    };
    const rowB = {
      id: "b",
      slug: "nec-yet-another",
      title: { en: "NEC Yet Another" },
      vector_score: 0.50,
      fts_score: 0.10,
    };

    const queryNoSection: CodeQuery = {
      discipline: "electrical",
      keywords: ["receptacle"],
    };
    const ranked = hybridRerank([rowB, rowA], queryNoSection);
    expect(ranked[0].row.id).toBe("a");
    expect(ranked[0].sectionBonus).toBe(0);
    expect(ranked[1].sectionBonus).toBe(0);
  });

  it("coerces string-typed numeric scores from supabase-js", () => {
    // Postgres `numeric` arrives as a string over PostgREST — toScore
    // should parseFloat without losing precision.
    const row = {
      id: "a",
      slug: "nec-210-52",
      title: { en: "NEC 210.52" },
      vector_score: "0.75",
      fts_score: "0.5",
    };
    const ranked = hybridRerank([row], query);
    expect(ranked[0].vectorScore).toBeCloseTo(0.75);
    expect(ranked[0].ftsScore).toBeCloseTo(0.5);
    expect(ranked[0].sectionBonus).toBe(1.0);
    expect(ranked[0].combinedScore).toBeCloseTo(
      ALPHA * 0.75 + BETA * 0.5 + GAMMA * 1.0
    );
  });

  it("treats null/undefined scores as zero", () => {
    const row = {
      id: "a",
      slug: "nec-210-52",
      title: { en: "NEC 210.52" },
      vector_score: null,
      fts_score: undefined,
    };
    const ranked = hybridRerank([row], query);
    expect(ranked[0].vectorScore).toBe(0);
    expect(ranked[0].ftsScore).toBe(0);
    expect(ranked[0].combinedScore).toBeCloseTo(GAMMA * 1.0);
  });

  it("clamps out-of-range numeric scores to [0,1]", () => {
    const row = {
      id: "a",
      slug: "nec-210-52",
      title: { en: "NEC 210.52" },
      // ts_rank_cd can sometimes exceed 1 on dense matches before our
      // normalization; defensive clamp keeps the linear combo bounded.
      vector_score: 1.4,
      fts_score: -0.2,
    };
    const ranked = hybridRerank([row], query);
    expect(ranked[0].vectorScore).toBe(1);
    expect(ranked[0].ftsScore).toBe(0);
  });
});
