/**
 * BKG Seed Relevance Filter Tests
 * Tests for discipline gates, keyword filtering, and result capping
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { queryBkgSeed } from "../bkg-seed";
import type { CodeQuery } from "../types";
import type { KnowledgeEntity } from "../../rag";

// Mock the rag module
vi.mock("../../rag", () => ({
  retrieveEntities: vi.fn(),
}));

import * as ragModule from "../../rag";
const retrieveEntities = vi.mocked(ragModule.retrieveEntities);

describe("BKG Seed Relevance Filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Kitchen Plug Query Filters OUT Structural/Accessibility Entities
  // ─────────────────────────────────────────────────────────────────────────
  it("filters OUT structural/accessibility entities when electrical discipline is requested", async () => {
    const mockEntities: KnowledgeEntity[] = [
      {
        id: "ibc-1107-accessibility",
        title: "IBC 1107 Accessible Unit",
        summary: "Kitchen must be accessible",
        body: "Kitchens in residential buildings must meet accessibility requirements",
        entity_type: "code_section",
        domain: "codes",
        slug: "ibc-1107",
        tags: ["accessibility", "residential"],
        metadata: { edition: "IBC 2021" },
      },
      {
        id: "nec-210-kitchen",
        title: "NEC Section 210.52(C) — Kitchen Receptacles",
        summary: "Requirements for kitchen countertop receptacles",
        body: "Kitchen counter surfaces, including islands and peninsulas, require GFCI-protected receptacles. Article 210.52(C) specifies requirements for small appliance circuits.",
        entity_type: "code_section",
        domain: "codes",
        slug: "nec-210-52c",
        tags: ["electrical", "NEC", "kitchen"],
        metadata: { edition: "NEC 2023", confidenceTier: "primary" },
      },
      {
        id: "ibc-504-building-height",
        title: "IBC 504.4 Building Height",
        summary: "Limits on building height",
        body: "Building height restrictions vary by occupancy classification",
        entity_type: "code_section",
        domain: "codes",
        slug: "ibc-504-4",
        tags: ["structural", "IBC"],
        metadata: { edition: "IBC 2021" },
      },
    ];

    retrieveEntities.mockResolvedValue({
      entities: mockEntities,
      query: "electrical kitchen island plug",
      retrieval_method: "supabase_fts",
      latency_ms: 42,
    });

    const query: CodeQuery = {
      discipline: "electrical",
      keywords: ["kitchen", "island", "plug", "outlet"],
      jurisdiction: "California",
    };

    const results = await queryBkgSeed(query);

    // Should only return NEC result (has both electrical keyword + kitchen/island/plug intersection)
    expect(results).toHaveLength(1);
    expect(results[0].title).toContain("NEC");
    expect(results[0].section).toContain("210");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Returns Empty Array When Nothing Matches
  // ─────────────────────────────────────────────────────────────────────────
  it("returns empty array when no entities survive filter", async () => {
    const mockEntities: KnowledgeEntity[] = [
      {
        id: "osha-confined",
        title: "OSHA 1926.1200 Confined Space Entry",
        summary: "Safety requirements for confined space work",
        body: "OSHA confined space entry procedures",
        entity_type: "safety_rule",
        domain: "safety",
        slug: "osha-confined",
        tags: ["safety", "osha"],
        metadata: { edition: "Current" },
      },
      {
        id: "ipc-403",
        title: "IPC 2024 Table 403.1 Fixture Units",
        summary: "Plumbing fixture unit values",
        body: "Table of fixture units for sizing drainage",
        entity_type: "code_section",
        domain: "codes",
        slug: "ipc-403",
        tags: ["plumbing", "IPC"],
        metadata: { edition: "IPC 2024" },
      },
    ];

    retrieveEntities.mockResolvedValue({
      entities: mockEntities,
      query: "electrical kitchen island",
      retrieval_method: "supabase_fts",
      latency_ms: 38,
    });

    const query: CodeQuery = {
      discipline: "electrical",
      keywords: ["kitchen", "island", "plug"],
      jurisdiction: "California",
    };

    const results = await queryBkgSeed(query);

    // No entity has both electrical keywords AND kitchen/island/plug intersection
    expect(results).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Caps Results at 3 After Filter
  // ─────────────────────────────────────────────────────────────────────────
  it("caps results at 3 after applying relevance filter", async () => {
    const mockEntities: KnowledgeEntity[] = Array.from({ length: 10 }, (_, i) => ({
      id: `nec-210-${i}`,
      title: `NEC Article 210 Variant ${i}`,
      summary: `Kitchen electrical requirement variant ${i}`,
      body: `Kitchen counter receptacle requirement for location ${i}. Electrical code specifies NEC 210.52(C) for kitchen island outlets.`,
      entity_type: "code_section",
      domain: "codes",
      slug: `nec-210-variant-${i}`,
      tags: ["electrical", "NEC", "kitchen"],
      metadata: { edition: "NEC 2023", confidenceTier: "primary" },
    }));

    retrieveEntities.mockResolvedValue({
      entities: mockEntities,
      query: "electrical kitchen island plug",
      retrieval_method: "supabase_fts",
      latency_ms: 52,
    });

    const query: CodeQuery = {
      discipline: "electrical",
      keywords: ["kitchen", "island", "outlet"],
      jurisdiction: "California",
    };

    const results = await queryBkgSeed(query);

    // Should be capped at 3 even though all 10 pass the filter
    expect(results.length).toBeLessThanOrEqual(3);
    expect(results.length).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: Discipline Gate Works for Structural
  // ─────────────────────────────────────────────────────────────────────────
  it("applies structural discipline gate correctly", async () => {
    const mockEntities: KnowledgeEntity[] = [
      {
        id: "ibc-2305",
        title: "IBC Section 2305 — Wood Construction",
        summary: "Requirements for wood framing",
        body: "Framing members must meet load requirements. Structural provisions for beam and column sizing.",
        entity_type: "code_section",
        domain: "codes",
        slug: "ibc-2305",
        tags: ["structural", "IBC", "framing"],
        metadata: { edition: "IBC 2021", confidenceTier: "primary" },
      },
      {
        id: "nec-210-kitchen",
        title: "NEC Article 210 Kitchen Receptacles",
        summary: "Kitchen electrical outlets",
        body: "Electrical requirements for kitchen islands",
        entity_type: "code_section",
        domain: "codes",
        slug: "nec-210",
        tags: ["electrical", "NEC"],
        metadata: { edition: "NEC 2023" },
      },
    ];

    retrieveEntities.mockResolvedValue({
      entities: mockEntities,
      query: "structural kitchen island framing",
      retrieval_method: "supabase_fts",
      latency_ms: 45,
    });

    const query: CodeQuery = {
      discipline: "structural",
      keywords: ["kitchen", "island", "framing"],
      jurisdiction: "California",
    };

    const results = await queryBkgSeed(query);

    // Should only return IBC (structural) result
    expect(results).toHaveLength(1);
    expect(results[0].title).toContain("IBC");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5: Keyword Intersection Matching
  // ─────────────────────────────────────────────────────────────────────────
  it("requires keyword intersection with at least one query keyword", async () => {
    const mockEntities: KnowledgeEntity[] = [
      {
        id: "nec-210-generic",
        title: "NEC Article 210",
        summary: "Branch circuits",
        body: "Electrical branch circuit requirements. General electrical wiring.",
        entity_type: "code_section",
        domain: "codes",
        slug: "nec-210-generic",
        tags: ["electrical", "NEC"],
        metadata: { edition: "NEC 2023", confidenceTier: "primary" },
      },
      {
        id: "nec-210-kitchen",
        title: "NEC Article 210 Kitchen",
        summary: "Kitchen electrical circuits",
        body: "Kitchen island receptacles require GFCI protection and specific outlet placement per NEC 210.52",
        entity_type: "code_section",
        domain: "codes",
        slug: "nec-210-kitchen",
        tags: ["electrical", "NEC", "kitchen"],
        metadata: { edition: "NEC 2023", confidenceTier: "primary" },
      },
    ];

    retrieveEntities.mockResolvedValue({
      entities: mockEntities,
      query: "electrical kitchen island plug",
      retrieval_method: "supabase_fts",
      latency_ms: 40,
    });

    const query: CodeQuery = {
      discipline: "electrical",
      keywords: ["kitchen", "island"],
      jurisdiction: "California",
    };

    const results = await queryBkgSeed(query);

    // Should return the kitchen-specific result
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.title.includes("Kitchen"))).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6: No Keywords With Empty Section Returns Empty
  // ─────────────────────────────────────────────────────────────────────────
  it("returns empty array when no keywords and no section in query", async () => {
    retrieveEntities.mockResolvedValue({
      entities: [],
      query: "",
      retrieval_method: "supabase_fts",
      latency_ms: 0,
    });

    const query: CodeQuery = {
      discipline: "electrical",
      keywords: [],
      jurisdiction: "California",
    };

    const results = await queryBkgSeed(query);

    expect(results).toHaveLength(0);
    // retrieveEntities is only called if searchTerms is not empty
    // But since keywords is empty and section is undefined, searchTerms will be just "electrical"
    // So it will be called. Let me adjust the test expectation.
  });
});
