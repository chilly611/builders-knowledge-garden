/**
 * Cache layer tests
 *
 * Covers:
 *   - first call invokes fetcher, second hit returns cached value
 *   - different keys are isolated
 *   - TTL expiry forces a re-fetch
 *   - citation-only results bypass the cache (bypass counter, no caching)
 *   - invalidateCache clears one bucket and/or all buckets
 *   - getCacheStats reports hits/misses/hit_ratio/bypasses
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  withCache,
  getCacheStats,
  invalidateCache,
  __resetCacheStatsForTests,
} from "../cache";
import type { CodeQuery, CodeSourceResult } from "../types";

function primaryResult(over: Partial<CodeSourceResult> = {}): CodeSourceResult {
  return {
    source: "icc-digital-codes",
    edition: "2021",
    section: "210.52",
    title: "NEC 210.52",
    text: "Real rule text retrieved.",
    citation: "NEC 210.52 (2021)",
    confidenceTier: "primary",
    retrievedAt: new Date().toISOString(),
    verified: true,
    historical: false,
    ...over,
  };
}

function summaryResult(over: Partial<CodeSourceResult> = {}): CodeSourceResult {
  return {
    ...primaryResult(over),
    confidenceTier: "summary",
    verified: false,
    text: "Citation only — not yet verified.",
    ...over,
  };
}

const QUERY_A: CodeQuery = {
  discipline: "electrical",
  section: "210.52",
  keywords: ["outlet", "kitchen"],
  edition: "2021",
};

const QUERY_B: CodeQuery = {
  discipline: "structural",
  section: "2305",
  keywords: ["concrete"],
  edition: "2021",
};

beforeEach(() => {
  invalidateCache();
  __resetCacheStatsForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("withCache", () => {
  it("invokes fetcher on first call and caches the result", async () => {
    const fetcher = vi.fn(async () => [primaryResult()]);

    const r1 = await withCache("icc-digital-codes", QUERY_A, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(r1).toHaveLength(1);
    expect(r1[0].verified).toBe(true);

    const stats = getCacheStats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(0);
  });

  it("returns cached value on second call with same key (no fetcher invocation)", async () => {
    const fetcher = vi.fn(async () => [primaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, fetcher);
    const r2 = await withCache("icc-digital-codes", QUERY_A, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(r2[0].section).toBe("210.52");

    const stats = getCacheStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hit_ratio).toBeCloseTo(0.5, 5);
  });

  it("treats different queries as distinct keys", async () => {
    const fetcher = vi.fn(async (): Promise<CodeSourceResult[]> => [primaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, fetcher);
    await withCache("icc-digital-codes", QUERY_B, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(getCacheStats().misses).toBe(2);
  });

  it("orders keywords stably so [outlet,kitchen] and [kitchen,outlet] share a cache entry", async () => {
    const fetcher = vi.fn(async () => [primaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, fetcher);
    await withCache(
      "icc-digital-codes",
      { ...QUERY_A, keywords: ["kitchen", "outlet"] },
      fetcher
    );

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getCacheStats().hits).toBe(1);
  });

  it("isolates buckets per source", async () => {
    const fetcher = vi.fn(async () => [primaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, fetcher);
    await withCache("nfpa", QUERY_A, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
    const sizes = getCacheStats().sizes;
    expect(sizes["icc-digital-codes"]).toBe(1);
    expect(sizes["nfpa"]).toBe(1);
  });

  it("re-fetches after TTL expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-22T00:00:00Z"));

    const fetcher = vi.fn(async () => [primaryResult()]);
    await withCache("icc-digital-codes", QUERY_A, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Advance just under the 1h TTL → still cached.
    vi.setSystemTime(new Date("2026-05-22T00:59:00Z"));
    await withCache("icc-digital-codes", QUERY_A, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Step past the TTL boundary → fetcher fires again.
    vi.setSystemTime(new Date("2026-05-22T01:01:00Z"));
    await withCache("icc-digital-codes", QUERY_A, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does NOT cache when every result is citation-only (summary tier)", async () => {
    const fetcher = vi.fn(async () => [summaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, fetcher);
    await withCache("icc-digital-codes", QUERY_A, fetcher);

    // Each call should hit the fetcher because the result isn't cacheable.
    expect(fetcher).toHaveBeenCalledTimes(2);

    const stats = getCacheStats();
    expect(stats.bypasses).toBe(2);
    expect(stats.sizes["icc-digital-codes"]).toBe(0);
  });

  it("DOES cache when at least one result is primary (mixed verified/unverified)", async () => {
    const fetcher = vi.fn(async () => [primaryResult(), summaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, fetcher);
    await withCache("icc-digital-codes", QUERY_A, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getCacheStats().sizes["icc-digital-codes"]).toBe(1);
  });

  it("counts bypasses separately from hits and misses", async () => {
    const summaryFetcher = vi.fn(async () => [summaryResult()]);
    const primaryFetcher = vi.fn(async () => [primaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, summaryFetcher); // miss + bypass
    await withCache("icc-digital-codes", QUERY_B, primaryFetcher); // miss + cache
    await withCache("icc-digital-codes", QUERY_B, primaryFetcher); // hit

    const stats = getCacheStats();
    expect(stats.misses).toBe(2);
    expect(stats.hits).toBe(1);
    expect(stats.bypasses).toBe(1);
  });
});

describe("invalidateCache", () => {
  it("clears a single bucket without touching others", async () => {
    const fetcher = vi.fn(async () => [primaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, fetcher);
    await withCache("nfpa", QUERY_A, fetcher);
    expect(getCacheStats().sizes["icc-digital-codes"]).toBe(1);
    expect(getCacheStats().sizes["nfpa"]).toBe(1);

    invalidateCache("icc-digital-codes");
    expect(getCacheStats().sizes["icc-digital-codes"]).toBe(0);
    expect(getCacheStats().sizes["nfpa"]).toBe(1);
  });

  it("clears every bucket when called with no argument", async () => {
    const fetcher = vi.fn(async () => [primaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, fetcher);
    await withCache("nfpa", QUERY_A, fetcher);
    await withCache("upcodes", QUERY_A, fetcher);
    await withCache("rag", QUERY_A, fetcher);

    invalidateCache();

    const sizes = getCacheStats().sizes;
    expect(sizes["icc-digital-codes"]).toBe(0);
    expect(sizes["nfpa"]).toBe(0);
    expect(sizes["upcodes"]).toBe(0);
    expect(sizes["rag"]).toBe(0);
  });
});

describe("getCacheStats", () => {
  it("reports a 0 hit_ratio with zero traffic", () => {
    const stats = getCacheStats();
    expect(stats.hit_ratio).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });
});
