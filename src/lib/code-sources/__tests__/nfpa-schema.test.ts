/**
 * NFPA Schema + Live-Mode Tests
 *
 * Parallel to icc-schema.test.ts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NfpaSectionResponseSchema, queryNfpa } from "../nfpa";
import type { CodeQuery } from "../types";

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_KEY = process.env.NFPA_API_KEY;

function withKey(key: string) {
  process.env.NFPA_API_KEY = key;
}

function clearKey() {
  delete process.env.NFPA_API_KEY;
}

function mockFetchJson(payload: unknown, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  }) as unknown as typeof fetch;
}

describe("NfpaSectionResponseSchema", () => {
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    if (ORIGINAL_KEY === undefined) clearKey();
    else process.env.NFPA_API_KEY = ORIGINAL_KEY;
    vi.restoreAllMocks();
  });

  it("parses a realistic NFPA 70 (NEC) response", () => {
    const raw = {
      title: "NFPA 70 210.52 Dwelling Unit Receptacle Outlets",
      text:
        "In every kitchen, family room, dining room, living room, parlor, library, den, sunroom, bedroom, recreation room, or similar room of a dwelling unit, receptacle outlets shall be installed in accordance with...",
      url: "https://link.nfpa.org/free-access/publications/70/2023",
      standard: "NFPA 70",
      edition: "2023",
      section: "210.52",
    };

    const parsed = NfpaSectionResponseSchema.parse(raw);
    expect(parsed.standard).toBe("NFPA 70");
    expect(parsed.section).toBe("210.52");
    expect(parsed.text).toContain("kitchen");
  });

  it("parses a response where the body is under 'body'", () => {
    const raw = {
      title: "NFPA 13 Sprinklers",
      body: "Sprinklers shall be installed throughout the premises...",
      standard: "NFPA 13",
      edition: "2022",
      section: "8.1",
    };

    const parsed = NfpaSectionResponseSchema.parse(raw);
    expect(parsed.body).toContain("Sprinklers");
    expect(parsed.text).toBeUndefined();
  });

  it("safeParse succeeds on a thin metadata-only response", () => {
    const raw = { standard: "NFPA 70", section: "210" };
    const result = NfpaSectionResponseSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it("safeParse fails when url is malformed", () => {
    const raw = { url: "not-a-url", text: "x" };
    const result = NfpaSectionResponseSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it("safeParse fails on wrong types", () => {
    const raw = { text: { nested: "object" }, section: 220 };
    const result = NfpaSectionResponseSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });
});

describe("queryNfpa live mode (mocked fetch)", () => {
  beforeEach(() => {
    clearKey();
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    if (ORIGINAL_KEY === undefined) clearKey();
    else process.env.NFPA_API_KEY = ORIGINAL_KEY;
    vi.restoreAllMocks();
  });

  it("returns verified result from a typical NEC 210.52 response", async () => {
    withKey("real-nfpa-key-not-placeholder-1234");
    mockFetchJson({
      title: "NFPA 70 210.52",
      text: "In every kitchen, family room, dining room... receptacle outlets shall be installed.",
      url: "https://link.nfpa.org/free-access/publications/70/2023",
      standard: "NFPA 70",
      edition: "2023",
      section: "210.52",
    });

    const query: CodeQuery = {
      discipline: "electrical",
      section: "210.52",
      keywords: ["outlet"],
      edition: "2023",
    };

    const result = await queryNfpa(query);
    expect(result).toHaveLength(1);
    expect(result[0].verified).toBe(true);
    expect(result[0].text).toContain("kitchen");
    expect(result[0].source).toBe("nfpa");
    expect(result[0].citation).toContain("NFPA 70");
    expect(result[0].confidenceTier).toBe("primary");
  });

  it("derives text from 'body' when 'text' is absent", async () => {
    withKey("real-nfpa-key-not-placeholder-1234");
    mockFetchJson({
      title: "NFPA 13",
      body: "Sprinklers shall be installed throughout the premises.",
      standard: "NFPA 13",
      edition: "2022",
      section: "8.1",
    });

    const query: CodeQuery = {
      discipline: "fire",
      section: "8.1",
      keywords: ["sprinkler"],
    };

    const result = await queryNfpa(query);
    expect(result[0].verified).toBe(true);
    expect(result[0].text).toContain("Sprinklers");
  });

  it("falls back to citation-only on schema-invalid response", async () => {
    withKey("real-nfpa-key-not-placeholder-1234");
    mockFetchJson({ url: "broken url", text: "ok" });

    const query: CodeQuery = {
      discipline: "fire",
      section: "8.1",
      keywords: ["x"],
    };

    const result = await queryNfpa(query);
    expect(result[0].verified).toBe(false);
    expect(result[0].text.toLowerCase()).toContain("citation only");
  });

  it("falls back to citation-only when parsed response has no text/body", async () => {
    withKey("real-nfpa-key-not-placeholder-1234");
    mockFetchJson({
      title: "Outline only",
      standard: "NFPA 70",
      edition: "2023",
      section: "220",
    });

    const query: CodeQuery = {
      discipline: "electrical",
      section: "220",
      keywords: ["x"],
    };

    const result = await queryNfpa(query);
    expect(result[0].verified).toBe(false);
    expect(result[0].text.toLowerCase()).toContain("citation only");
  });

  it("does not crash on a malformed (non-object) response", async () => {
    withKey("real-nfpa-key-not-placeholder-1234");
    mockFetchJson(null);

    const query: CodeQuery = {
      discipline: "fire",
      section: "8.1",
      keywords: ["x"],
    };

    const result = await queryNfpa(query);
    expect(result).toHaveLength(1);
    expect(result[0].verified).toBe(false);
  });
});
