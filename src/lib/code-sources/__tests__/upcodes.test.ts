/**
 * UpCodes Adapter Tests
 *
 * Covers schema validation, preview-mode (no key) behavior, and live-mode
 * (mocked fetch) behavior matching icc-schema / nfpa-schema patterns.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { UpCodesSectionResponseSchema, queryUpCodes } from "../upcodes";
import type { CodeQuery } from "../types";

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_KEY = process.env.UPCODES_API_KEY;

function withKey(key: string) {
  process.env.UPCODES_API_KEY = key;
}

function clearKey() {
  delete process.env.UPCODES_API_KEY;
}

function mockFetchJson(payload: unknown, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  }) as unknown as typeof fetch;
}

describe("UpCodesSectionResponseSchema", () => {
  it("parses an IBC chapter response from UpCodes", () => {
    const raw = {
      title: "IBC 1607.1 Live Loads",
      body: "Live loads used in the design of buildings shall be the maximum loads expected by the intended use or occupancy.",
      body_truncated: false,
      url: "https://up.codes/viewer/icc/ibc/chapter/16",
      edition: "2021",
      code: "IBC",
      section: "1607.1",
      chapter: "16",
      jurisdiction: "icc",
    };

    const parsed = UpCodesSectionResponseSchema.parse(raw);
    expect(parsed.body).toContain("Live loads");
    expect(parsed.body_truncated).toBe(false);
  });

  it("parses a free-tier truncated response", () => {
    const raw = {
      title: "NEC 210.52",
      body: "Receptacle outlets shall be installed in... [preview truncated]",
      body_truncated: true,
      code: "NEC",
      section: "210.52",
    };

    const parsed = UpCodesSectionResponseSchema.parse(raw);
    expect(parsed.body_truncated).toBe(true);
  });

  it("safeParse fails on wrong types", () => {
    const raw = { body_truncated: "yes" };
    const result = UpCodesSectionResponseSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });
});

describe("queryUpCodes", () => {
  beforeEach(() => {
    clearKey();
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    if (ORIGINAL_KEY === undefined) clearKey();
    else process.env.UPCODES_API_KEY = ORIGINAL_KEY;
    vi.restoreAllMocks();
  });

  it("returns empty array when no section and no keywords", async () => {
    const result = await queryUpCodes({
      discipline: "electrical",
      keywords: [],
    });
    expect(result).toEqual([]);
  });

  it("returns citation-only result in preview mode (no API key)", async () => {
    const result = await queryUpCodes({
      discipline: "structural",
      section: "1607.1",
      keywords: ["live", "load"],
      edition: "2021",
    });

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("upcodes");
    expect(result[0].verified).toBe(false);
    expect(result[0].url).toContain("up.codes");
    expect(result[0].text.toLowerCase()).toContain("citation only");
    expect(result[0].citation).toContain("[via UpCodes]");
  });

  it("returns verified result in live mode with valid response", async () => {
    withKey("real-upcodes-key-not-placeholder-1234");
    mockFetchJson({
      title: "IBC 1607.1 Live Loads",
      body: "Live loads used in design...",
      body_truncated: false,
      edition: "2021",
      code: "IBC",
      section: "1607.1",
      jurisdiction: "icc",
    });

    const result = await queryUpCodes({
      discipline: "structural",
      section: "1607.1",
      keywords: ["live"],
      edition: "2021",
    });

    expect(result).toHaveLength(1);
    expect(result[0].verified).toBe(true);
    expect(result[0].text).toContain("Live loads");
    expect(result[0].confidenceTier).toBe("primary");
  });

  it("falls back to citation-only when response fails schema validation", async () => {
    withKey("real-upcodes-key-not-placeholder-1234");
    mockFetchJson({ url: "not-a-url", body: "x" });

    const result = await queryUpCodes({
      discipline: "structural",
      section: "1607.1",
      keywords: ["x"],
    });

    expect(result[0].verified).toBe(false);
    expect(result[0].text.toLowerCase()).toContain("citation only");
  });

  it("falls back to citation-only when API returns empty body/text/content", async () => {
    withKey("real-upcodes-key-not-placeholder-1234");
    mockFetchJson({
      title: "metadata only",
      edition: "2021",
      code: "IBC",
      section: "1607",
    });

    const result = await queryUpCodes({
      discipline: "structural",
      section: "1607",
      keywords: ["x"],
    });

    expect(result[0].verified).toBe(false);
  });

  it("respects placeholder API keys (preview mode)", async () => {
    withKey("your-key-here");
    const result = await queryUpCodes({
      discipline: "structural",
      section: "1607.1",
      keywords: ["x"],
    });
    expect(result[0].verified).toBe(false);
    expect(result[0].text.toLowerCase()).toContain("citation only");
  });
});
