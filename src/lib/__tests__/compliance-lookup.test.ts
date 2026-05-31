/**
 * Code Compliance Lookup — unit tests.
 *
 * These pin the LIABILITY CONTRACT (see compliance-lookup.ts):
 *   - every returned citation is a real fixture row carrying its provenance
 *   - unknown / uncovered jurisdictions yield "not yet covered for …", never a guess
 *   - a covered jurisdiction with no query match yields no_results (still no guess)
 *   - non-scoped "real" model-code rows are NEVER pulled in by inference
 *   - the data source failing makes the lookup FAIL CLOSED (throws), never fabricates
 *
 * Hermetic: a fake ComplianceDataSource stands in for Supabase, so there's no
 * network, RLS, or flakiness — the orchestration + mapping logic is exercised
 * against fixtures that mirror the real knowledge-gardens-prod rows.
 */

import { describe, it, expect } from "vitest";
import {
  lookupCodeCitations,
  matchJurisdictions,
  collectWithAncestors,
  unwrapJsonbText,
  deriveSection,
  deriveCodeSystem,
  deriveCodeYear,
  buildCitationLabel,
  toVerification,
  tokenize,
  extractSections,
  scoreRelevance,
  rowToCitation,
  ComplianceDataError,
  type JurisdictionRow,
  type CodeEntityRow,
  type ComplianceDataSource,
} from "../compliance-lookup";

// ─── Fixtures (mirror real rows) ────────────────────────────────────────────

const J = {
  caSf: { id: "j-ca-sf", slug: "ca-sf", name: "San Francisco Building Code", code_system: "SFBC + CBC", code_year: 2022, country: "US", state_province: "CA", city: "San Francisco", level: "city", parent_id: null },
  caMarin: { id: "j-ca-marin", slug: "ca-marin", name: "Marin County Building Code", code_system: "CBC", code_year: 2022, country: "USA", state_province: "CA", city: null, level: "county", parent_id: "j-ca-state" },
  caState: { id: "j-ca-state", slug: "ca-state", name: "California Building Code", code_system: "CBC", code_year: 2022, country: "US", state_province: "California", city: null, level: "state", parent_id: null },
  caStatewide: { id: "j-ca-statewide", slug: "ca-statewide", name: "California Statewide Code", code_system: "CBC / CRC / CalGreen", code_year: 2022, country: "US", state_province: "CA", city: null, level: "state", parent_id: null },
  txState: { id: "j-tx", slug: "tx-state", name: "Texas Building Code", code_system: "TBC", code_year: 2021, country: "US", state_province: "Texas", city: null, level: "state", parent_id: null },
  flState: { id: "j-fl", slug: "fl-state", name: "Florida Building Code", code_system: "FBC", code_year: 2023, country: "US", state_province: "Florida", city: null, level: "state", parent_id: null },
  ibc2024: { id: "j-ibc", slug: "ibc-2024", name: "International Building Code 2024", code_system: "IBC", code_year: 2024, country: "US", state_province: null, city: null, level: "national", parent_id: null },
} satisfies Record<string, JurisdictionRow>;

const ALL_J: JurisdictionRow[] = Object.values(J);

const E = {
  // scoped to ca-marin; metadata uses {section, code_body, code_year}; auto-verified
  ibc1027: {
    id: "e-1027", slug: "ibc-1027-emergency-escape-windows", entity_type: "building_code",
    title: { en: "IBC Section 1027 — Emergency Escape Windows in Residential Buildings" },
    summary: { en: "Requires emergency escape windows in bedrooms and basements for occupant rescue." },
    tags: ["ibc", "emergency-escape", "windows"], category: null,
    jurisdiction_ids: ["j-ca-marin"], applies_globally: false,
    source_urls: ["https://codes.iccsafe.org/content/IBC2021P2"], source_docs: [],
    metadata: { section: "1027", category: "Means of Egress", code_body: "IBC", code_year: 2021 },
    manually_verified_at: null, auto_verified_at: "2026-05-24T21:39:05Z", auto_verification_flagged: false,
  },
  // scoped to ca-statewide (+az/nv ids that aren't in ALL_J); metadata {edition, code_system}; unverified
  nfpa75: {
    id: "e-nfpa75", slug: "nfpa-75-data-center-fire", entity_type: "building_code",
    title: { en: "NFPA 75 — Fire Protection of Information Technology Equipment" },
    summary: { en: "Clean-agent suppression, EPO, VESDA detection for data center white-space." },
    tags: ["nfpa", "fire", "data-center"], category: null,
    jurisdiction_ids: ["j-ca-statewide", "j-az", "j-nv"], applies_globally: false,
    source_urls: ["https://www.nfpa.org/codes/75"], source_docs: [],
    metadata: { edition: "2024", code_system: "NFPA" },
    manually_verified_at: null, auto_verified_at: null, auto_verification_flagged: null,
  },
  // scoped to ca-state (the ANCESTOR of ca-marin); manually verified; has source_docs
  cbcR313: {
    id: "e-cbc-r313", slug: "cbc-r313-sprinklers", entity_type: "building_code",
    title: { en: "CBC Section R313 — Automatic Fire Sprinkler Systems" },
    summary: { en: "Dwelling automatic fire sprinkler requirements, statewide." },
    tags: ["cbc", "sprinkler", "fire"], category: null,
    jurisdiction_ids: ["j-ca-state"], applies_globally: false,
    source_urls: ["https://example.test/cbc-r313"], source_docs: ["CBC-2022.pdf"],
    metadata: { code_system: "CBC", section: "R313", code_year: 2022 },
    manually_verified_at: "2026-05-20T00:00:00Z", auto_verified_at: null, auto_verification_flagged: null,
  },
  // applies_globally; NO useful metadata → exercises null section/system + title fallback
  globalOsha: {
    id: "e-osha", slug: "osha-general-duty", entity_type: "safety_regulation",
    title: { en: "General Duty Clause" },
    summary: { en: "Employer must provide a workplace free of recognized safety hazards." },
    tags: ["osha", "safety"], category: null,
    jurisdiction_ids: [], applies_globally: true,
    source_urls: ["https://osha.gov/general-duty"], source_docs: [],
    metadata: {},
    manually_verified_at: null, auto_verified_at: null, auto_verification_flagged: null,
  },
  // scoped ONLY to the national ibc-2024 jurisdiction — a real IBC row that must
  // NOT surface for a CA query (no parent link → including it would be inference).
  ibcNational: {
    id: "e-ibc-nat", slug: "ibc-ch11-accessibility", entity_type: "building_code",
    title: { en: "IBC Chapter 11 — Accessibility" },
    summary: { en: "Accessible routes, doors, stairs, and facilities." },
    tags: ["ibc", "accessibility", "egress"], category: null,
    jurisdiction_ids: ["j-ibc"], applies_globally: false,
    source_urls: ["https://codes.iccsafe.org/content/IBC2021P2"], source_docs: [],
    metadata: { section: "Chapter 11", code_body: "IBC", code_year: 2021 },
    manually_verified_at: null, auto_verified_at: "2026-05-24T21:39:05Z", auto_verification_flagged: false,
  },
} satisfies Record<string, CodeEntityRow>;

const ALL_E: CodeEntityRow[] = Object.values(E);

// A fake data source that filters fixtures the way the real adapter would.
function makeSource(
  jurisdictions: JurisdictionRow[],
  entities: CodeEntityRow[],
  overrides: Partial<ComplianceDataSource> = {}
): ComplianceDataSource {
  const textMatch = (e: CodeEntityRow, queryText: string): boolean => {
    if (!queryText) return true;
    const hay = `${unwrapJsonbText(e.title)} ${unwrapJsonbText(e.summary)} ${(e.tags ?? []).join(" ")} ${e.slug}`.toLowerCase();
    const toks = queryText.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    return toks.some((t) => hay.includes(t));
  };
  return {
    listJurisdictions: overrides.listJurisdictions ?? (async () => jurisdictions),
    countScopedCodeEntities:
      overrides.countScopedCodeEntities ??
      (async (ids) => {
        const set = new Set(ids);
        return entities.filter((e) => (e.jurisdiction_ids ?? []).some((id) => set.has(id))).length;
      }),
    searchCodeEntities:
      overrides.searchCodeEntities ??
      (async ({ jurisdictionIds, includeGlobal, queryText }) => {
        const set = new Set(jurisdictionIds);
        return entities.filter((e) => {
          const scoped = (e.jurisdiction_ids ?? []).some((id) => set.has(id));
          const global = includeGlobal && e.applies_globally === true;
          return (scoped || global) && textMatch(e, queryText);
        });
      }),
  };
}

const NOW = () => "2026-05-31T00:00:00.000Z";

// ─── Pure helpers ────────────────────────────────────────────────────────--

describe("unwrapJsonbText", () => {
  it("unwraps { en } objects", () => expect(unwrapJsonbText({ en: "Hello" })).toBe("Hello"));
  it("passes through plain strings", () => expect(unwrapJsonbText("Hi")).toBe("Hi"));
  it("falls back to first string value", () => expect(unwrapJsonbText({ fr: "Bonjour" })).toBe("Bonjour"));
  it("returns '' for null/undefined", () => {
    expect(unwrapJsonbText(null)).toBe("");
    expect(unwrapJsonbText(undefined)).toBe("");
  });
});

describe("deriveSection / deriveCodeSystem / deriveCodeYear", () => {
  it("reads the `section` + `code_body` metadata convention", () => {
    expect(deriveSection(E.ibc1027)).toBe("1027");
    expect(deriveCodeSystem(E.ibc1027)).toBe("IBC");
    expect(deriveCodeYear(E.ibc1027)).toBe(2021);
  });
  it("reads the `code_section` convention", () => {
    expect(deriveSection({ metadata: { code_section: "Chapter 6" }, title: {} })).toBe("Chapter 6");
  });
  it("reads `code_system` + numeric-from-`edition` year", () => {
    expect(deriveCodeSystem(E.nfpa75)).toBe("NFPA");
    expect(deriveCodeYear(E.nfpa75)).toBe(2024);
  });
  it("falls back to extracting a section from the stored title", () => {
    expect(deriveSection({ metadata: {}, title: { en: "IBC Section 903.2 — Sprinklers" } })).toBe("903.2");
  });
  it("returns null (never a guess) when nothing is present", () => {
    expect(deriveSection(E.globalOsha)).toBeNull();
    expect(deriveCodeSystem(E.globalOsha)).toBeNull();
    expect(deriveCodeYear(E.globalOsha)).toBeNull();
  });
});

describe("buildCitationLabel", () => {
  it("formats system + numeric section + year", () => {
    expect(buildCitationLabel({ codeSystem: "IBC", section: "1027", codeYear: 2021, title: "t", slug: "s" }))
      .toBe("IBC Section 1027 (2021)");
  });
  it("keeps a non-numeric section verbatim", () => {
    expect(buildCitationLabel({ codeSystem: "IBC", section: "Chapter 11", codeYear: 2021, title: "t", slug: "s" }))
      .toBe("IBC Chapter 11 (2021)");
  });
  it("falls back to the stored title, then the slug", () => {
    expect(buildCitationLabel({ codeSystem: null, section: null, codeYear: null, title: "General Duty Clause", slug: "s" }))
      .toBe("General Duty Clause");
    expect(buildCitationLabel({ codeSystem: null, section: null, codeYear: null, title: "", slug: "osha-gd" }))
      .toBe("osha-gd");
  });
});

describe("toVerification", () => {
  it("manual wins", () => expect(toVerification(E.cbcR313)).toBe("manually_verified"));
  it("auto when present and not flagged", () => expect(toVerification(E.ibc1027)).toBe("auto_verified"));
  it("flagged auto is NOT verified", () =>
    expect(toVerification({ manually_verified_at: null, auto_verified_at: "2026-01-01", auto_verification_flagged: true })).toBe("unverified"));
  it("none → unverified", () => expect(toVerification(E.nfpa75)).toBe("unverified"));
});

describe("matchJurisdictions", () => {
  it("resolves an exact slug", () => {
    expect(matchJurisdictions(ALL_J, "ca-sf").map((j) => j.id)).toEqual(["j-ca-sf"]);
  });
  it("resolves a state CODE across inconsistent state_province values (CA + California)", () => {
    const ids = matchJurisdictions(ALL_J, "CA").map((j) => j.id).sort();
    expect(ids).toEqual(["j-ca-marin", "j-ca-sf", "j-ca-state", "j-ca-statewide"].sort());
  });
  it("resolves a state NAME the same way", () => {
    expect(matchJurisdictions(ALL_J, "California").map((j) => j.id).sort())
      .toEqual(["j-ca-marin", "j-ca-sf", "j-ca-state", "j-ca-statewide"].sort());
  });
  it("resolves Texas via the alias map", () => {
    expect(matchJurisdictions(ALL_J, "Texas").map((j) => j.id)).toEqual(["j-tx"]);
  });
  it("resolves by city/name substring", () => {
    expect(matchJurisdictions(ALL_J, "San Francisco").map((j) => j.id)).toEqual(["j-ca-sf"]);
  });
  it("is case-insensitive", () => {
    expect(matchJurisdictions(ALL_J, "CA-SF").map((j) => j.id)).toEqual(["j-ca-sf"]);
  });
  it("returns [] for an unknown jurisdiction and for empty input", () => {
    expect(matchJurisdictions(ALL_J, "Oregon")).toEqual([]);
    expect(matchJurisdictions(ALL_J, "")).toEqual([]);
  });
});

describe("collectWithAncestors", () => {
  it("adds the parent_id chain (ca-marin → ca-state)", () => {
    const ids = collectWithAncestors(ALL_J, [J.caMarin]).map((j) => j.id).sort();
    expect(ids).toEqual(["j-ca-marin", "j-ca-state"].sort());
  });
  it("is a no-op when there is no parent", () => {
    expect(collectWithAncestors(ALL_J, [J.caSf]).map((j) => j.id)).toEqual(["j-ca-sf"]);
  });
});

describe("tokenize / extractSections", () => {
  it("drops stopwords and short tokens, keeps section numbers", () => {
    expect(tokenize("What are the egress requirements for 1027").sort())
      .toEqual(["1027", "egress"].sort());
  });
  it("extracts section-like tokens", () => {
    expect(extractSections("NEC 210.52(C)(5) receptacle")).toContain("210.52(c)(5)");
    expect(extractSections("no sections here")).toEqual([]);
  });
});

describe("scoreRelevance", () => {
  it("rewards a section match most strongly", () => {
    const { score, matchedOn } = scoreRelevance(E.ibc1027, ["1027"], ["1027"]);
    expect(score).toBeGreaterThanOrEqual(5);
    expect(matchedOn.some((m) => m.startsWith("section:"))).toBe(true);
  });
  it("rewards tag and term matches and records why", () => {
    const { score, matchedOn } = scoreRelevance(E.cbcR313, ["sprinkler"], []);
    expect(score).toBeGreaterThan(0);
    expect(matchedOn).toContain("tag:sprinkler");
  });
  it("keeps DB hits that matched only outside title/summary/tags (floor 0.1)", () => {
    const { score, matchedOn } = scoreRelevance(E.cbcR313, ["nonexistentterm"], []);
    expect(score).toBe(0.1);
    expect(matchedOn).toEqual(["full-text"]);
  });
});

describe("rowToCitation", () => {
  const byId = new Map(ALL_J.map((j) => [j.id, j]));

  it("maps a directly-scoped row with full provenance", () => {
    const c = rowToCitation(E.ibc1027, byId, new Set(["j-ca-marin"]), new Set(["j-ca-marin"]), ["windows"], []);
    expect(c.entityId).toBe("e-1027");
    expect(c.citation).toBe("IBC Section 1027 (2021)");
    expect(c.section).toBe("1027");
    expect(c.codeSystem).toBe("IBC");
    expect(c.jurisdiction).toMatchObject({ slug: "ca-marin", scope: "jurisdiction" });
    expect(c.sourceUrls).toEqual(["https://codes.iccsafe.org/content/IBC2021P2"]);
    expect(c.verification).toBe("auto_verified");
  });

  it("labels an ancestor-reached row as scope:ancestor", () => {
    // ca-state reached as the ancestor of the matched ca-marin.
    const c = rowToCitation(E.cbcR313, byId, new Set(["j-ca-marin"]), new Set(["j-ca-marin", "j-ca-state"]), ["sprinkler"], []);
    expect(c.jurisdiction).toMatchObject({ slug: "ca-state", scope: "ancestor" });
  });

  it("labels an applies_globally row as scope:global with null section/system", () => {
    const c = rowToCitation(E.globalOsha, byId, new Set(["j-ca-sf"]), new Set(["j-ca-sf"]), ["safety"], []);
    expect(c.jurisdiction.scope).toBe("global");
    expect(c.jurisdiction.id).toBeNull();
    expect(c.section).toBeNull();
    expect(c.codeSystem).toBeNull();
    expect(c.citation).toBe("General Duty Clause"); // title fallback — never invented
    expect(c.appliesGlobally).toBe(true);
  });
});

// ─── Orchestrator: the coverage contract ────────────────────────────────────

describe("lookupCodeCitations — covered jurisdiction (CA)", () => {
  it("returns real, sourced citations for a covered jurisdiction", async () => {
    const src = makeSource(ALL_J, ALL_E);
    const res = await lookupCodeCitations(
      { query: "emergency escape windows", jurisdiction: "CA" },
      { dataSource: src, now: NOW }
    );

    expect(res.status).toBe("covered");
    expect(res.citations.length).toBe(1);
    const c = res.citations[0];
    expect(c.entityId).toBe("e-1027");
    expect(c.citation).toBe("IBC Section 1027 (2021)");
    expect(c.jurisdiction.slug).toBe("ca-marin");
    expect(c.sourceUrls.length).toBeGreaterThan(0); // every answer carries its source
    expect(res.coverage).toMatchObject({
      jurisdictionKnown: true,
      jurisdictionHasCodeData: true,
      scopedCitationCount: 1,
      globalCitationCount: 0,
    });
    expect(res.provenance.source).toBe("structured-data");
    expect(res.provenance.tables).toEqual(expect.arrayContaining(["jurisdictions", "knowledge_entities"]));
    expect(res.provenance.generatedAt).toBe("2026-05-31T00:00:00.000Z");
  });

  it("includes ancestor + global matches, each labelled, and ranks scoped over global", async () => {
    const src = makeSource(ALL_J, ALL_E);
    const res = await lookupCodeCitations(
      { query: "fire sprinkler safety", jurisdiction: "CA", discipline: "fire" },
      { dataSource: src, now: NOW }
    );

    expect(res.status).toBe("covered");
    const ids = res.citations.map((c) => c.entityId);
    expect(ids).toEqual(expect.arrayContaining(["e-cbc-r313", "e-nfpa75", "e-osha"]));
    expect(res.coverage.scopedCitationCount).toBe(2); // cbcR313 (ancestor) + nfpa75 (jurisdiction)
    expect(res.coverage.globalCitationCount).toBe(1); // osha
    // global model code must rank last (lowest relevance among matches)
    expect(res.citations[res.citations.length - 1].jurisdiction.scope).toBe("global");
  });

  it("LIABILITY: never surfaces a non-scoped national model-code row by inference", async () => {
    const src = makeSource(ALL_J, ALL_E);
    // 'egress' appears in ibcNational's tags, but it is scoped only to the
    // national ibc-2024 jurisdiction (no link to CA) → must NOT appear.
    const res = await lookupCodeCitations(
      { query: "egress accessibility", jurisdiction: "CA" },
      { dataSource: src, now: NOW }
    );
    expect(res.citations.map((c) => c.entityId)).not.toContain("e-ibc-nat");
    // and everything returned is a real fixture row (nothing invented)
    const fixtureIds = new Set(ALL_E.map((e) => e.id));
    for (const c of res.citations) expect(fixtureIds.has(c.entityId)).toBe(true);
  });

  it("respects the limit", async () => {
    const src = makeSource(ALL_J, ALL_E);
    const res = await lookupCodeCitations(
      { query: "fire sprinkler safety", jurisdiction: "CA", limit: 1 },
      { dataSource: src, now: NOW }
    );
    expect(res.citations.length).toBe(1);
  });
});

describe("lookupCodeCitations — the honest 'not covered' paths", () => {
  it("unknown jurisdiction → not_covered with the exact phrase", async () => {
    const src = makeSource(ALL_J, ALL_E);
    const res = await lookupCodeCitations(
      { query: "egress windows", jurisdiction: "Oregon" },
      { dataSource: src, now: NOW }
    );
    expect(res.status).toBe("not_covered");
    expect(res.message).toBe("not yet covered for Oregon");
    expect(res.coverage.reason).toBe("unknown_jurisdiction");
    expect(res.coverage.jurisdictionKnown).toBe(false);
    expect(res.citations).toEqual([]);
  });

  it("known jurisdiction but zero scoped code data → not_covered", async () => {
    const src = makeSource(ALL_J, ALL_E);
    const res = await lookupCodeCitations(
      { query: "egress windows", jurisdiction: "Texas" },
      { dataSource: src, now: NOW }
    );
    expect(res.status).toBe("not_covered");
    expect(res.message).toBe("not yet covered for Texas");
    expect(res.coverage.reason).toBe("no_code_data_for_jurisdiction");
    expect(res.coverage.jurisdictionKnown).toBe(true); // we know the place…
    expect(res.resolvedJurisdictions.map((j) => j.slug)).toEqual(["tx-state"]); // …it just has no codes
    expect(res.citations).toEqual([]);
  });

  it("covered jurisdiction but no query match → no_results (still no guess)", async () => {
    const src = makeSource(ALL_J, ALL_E);
    const res = await lookupCodeCitations(
      { query: "underwater basket weaving permit", jurisdiction: "CA" },
      { dataSource: src, now: NOW }
    );
    expect(res.status).toBe("no_results");
    expect(res.coverage.reason).toBe("no_match_for_query");
    expect(res.coverage.jurisdictionHasCodeData).toBe(true);
    expect(res.citations).toEqual([]);
    expect(res.message).toContain("no guess is offered");
  });
});

describe("lookupCodeCitations — fail closed (never fabricate on infra failure)", () => {
  it("throws ComplianceDataError when jurisdictions can't be loaded", async () => {
    const src = makeSource(ALL_J, ALL_E, {
      listJurisdictions: async () => {
        throw new ComplianceDataError("db down");
      },
    });
    await expect(
      lookupCodeCitations({ query: "egress", jurisdiction: "CA" }, { dataSource: src, now: NOW })
    ).rejects.toBeInstanceOf(ComplianceDataError);
  });

  it("throws (does not return a partial answer) when the code search fails", async () => {
    const src = makeSource(ALL_J, ALL_E, {
      searchCodeEntities: async () => {
        throw new ComplianceDataError("search exploded");
      },
    });
    await expect(
      lookupCodeCitations({ query: "egress", jurisdiction: "CA" }, { dataSource: src, now: NOW })
    ).rejects.toBeInstanceOf(ComplianceDataError);
  });
});
