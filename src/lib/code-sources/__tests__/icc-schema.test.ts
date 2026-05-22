/**
 * ICC Schema + Live-Mode Tests
 *
 * Validates the Zod schema directly (parse / safeParse behavior) AND the
 * end-to-end live-mode codepath in queryIcc by mocking global fetch.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { IccSectionResponseSchema, queryIcc } from "../icc";
import type { CodeQuery } from "../types";

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_KEY = process.env.ICC_API_KEY;

function withKey(key: string) {
  process.env.ICC_API_KEY = key;
}

function clearKey() {
  delete process.env.ICC_API_KEY;
}

function mockFetchJson(payload: unknown, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  }) as unknown as typeof fetch;
}

describe("IccSectionResponseSchema", () => {
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    if (ORIGINAL_KEY === undefined) clearKey();
    else process.env.ICC_API_KEY = ORIGINAL_KEY;
    vi.restoreAllMocks();
  });

  it("parses a realistic NEC Article 220 response (text field)", () => {
    const raw = {
      title: "220.12 Lighting Load for Specified Occupancies",
      text:
        "A unit load of not less than that specified in Table 220.12 for occupancies specified therein shall constitute the minimum lighting load.",
      url: "https://codes.iccsafe.org/content/NEC2023/article-220",
      edition: "2023",
      code: "NEC",
      code_id: "NEC",
      section: "220.12",
      chapter: "2",
    };

    const parsed = IccSectionResponseSchema.parse(raw);
    expect(parsed.section).toBe("220.12");
    expect(parsed.text).toContain("unit load");
    expect(parsed.edition).toBe("2023");
  });

  it("parses a response where the body lives under 'body' not 'text'", () => {
    const raw = {
      title: "210.52(C)(5) Receptacle Outlet Location",
      body:
        "Receptacle outlets installed to serve countertop and work surfaces shall be located not more than 500 mm above the countertop or work surface.",
      edition: "2023",
      code_id: "NEC",
      section: "210.52(C)(5)",
    };

    const parsed = IccSectionResponseSchema.parse(raw);
    expect(parsed.body).toContain("Receptacle outlets");
    expect(parsed.text).toBeUndefined();
  });

  it("parses a response where the body lives under 'content'", () => {
    const raw = {
      title: "IBC 1607.1 Live Loads",
      content: "Live loads used in the design of buildings shall be the maximum loads...",
      edition: "2021",
      code: "IBC",
      section: "1607.1",
    };

    const parsed = IccSectionResponseSchema.parse(raw);
    expect(parsed.content).toContain("Live loads");
  });

  it("safeParse succeeds on a thin / metadata-only response", () => {
    const raw = { code: "NEC", section: "220" };
    const result = IccSectionResponseSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it("safeParse fails when url is not a valid URL", () => {
    const raw = { url: "not a url", text: "x" };
    const result = IccSectionResponseSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it("safeParse fails when text is the wrong type (number instead of string)", () => {
    const raw = { text: 12345, section: "220" };
    const result = IccSectionResponseSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });
});

describe("queryIcc live mode (mocked fetch)", () => {
  beforeEach(() => {
    clearKey();
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    if (ORIGINAL_KEY === undefined) clearKey();
    else process.env.ICC_API_KEY = ORIGINAL_KEY;
    vi.restoreAllMocks();
  });

  it("returns verified result with derived text from a typical NEC response", async () => {
    withKey("real-icc-key-not-placeholder-1234");
    mockFetchJson({
      title: "220.12 Lighting Load",
      text: "A unit load of not less than that specified in Table 220.12...",
      url: "https://codes.iccsafe.org/content/NEC2023/article-220",
      edition: "2023",
      code: "NEC",
      section: "220.12",
    });

    const query: CodeQuery = {
      discipline: "electrical",
      section: "220.12",
      keywords: ["lighting", "load"],
      edition: "2023",
    };

    const result = await queryIcc(query);
    expect(result).toHaveLength(1);
    expect(result[0].verified).toBe(true);
    expect(result[0].text).toContain("unit load");
    expect(result[0].source).toBe("icc-digital-codes");
    expect(result[0].confidenceTier).toBe("primary");
    expect(result[0].citation).toContain("NEC 220.12");
  });

  it("derives text from 'body' field when 'text' is absent", async () => {
    withKey("real-icc-key-not-placeholder-1234");
    mockFetchJson({
      title: "210.52(C)(5)",
      body: "Receptacle outlets installed to serve countertop surfaces...",
      edition: "2023",
      code_id: "NEC",
      section: "210.52(C)(5)",
    });

    const query: CodeQuery = {
      discipline: "electrical",
      section: "210.52(C)(5)",
      keywords: ["receptacle"],
    };

    const result = await queryIcc(query);
    expect(result[0].verified).toBe(true);
    expect(result[0].text).toContain("Receptacle outlets");
  });

  it("falls back to citation-only when response fails schema validation", async () => {
    withKey("real-icc-key-not-placeholder-1234");
    // url field is invalid → schema rejects.
    mockFetchJson({
      title: "Bad shape",
      text: "Some text",
      url: "this is not a url",
    });

    const query: CodeQuery = {
      discipline: "electrical",
      section: "220.12",
      keywords: ["x"],
    };

    const result = await queryIcc(query);
    expect(result).toHaveLength(1);
    expect(result[0].verified).toBe(false);
    expect(result[0].text.toLowerCase()).toContain("citation only");
  });

  it("falls back to citation-only when response parses but has empty text", async () => {
    withKey("real-icc-key-not-placeholder-1234");
    mockFetchJson({
      title: "Outline-only response",
      edition: "2023",
      code: "NEC",
      section: "220",
    });

    const query: CodeQuery = {
      discipline: "electrical",
      section: "220",
      keywords: ["x"],
    };

    const result = await queryIcc(query);
    expect(result).toHaveLength(1);
    expect(result[0].verified).toBe(false);
    expect(result[0].text.toLowerCase()).toContain("citation only");
  });

  it("does not crash on a malformed (non-object) response", async () => {
    withKey("real-icc-key-not-placeholder-1234");
    mockFetchJson("oops, a string instead of an object");

    const query: CodeQuery = {
      discipline: "electrical",
      section: "220",
      keywords: ["x"],
    };

    const result = await queryIcc(query);
    expect(result).toHaveLength(1);
    expect(result[0].verified).toBe(false);
  });
});
