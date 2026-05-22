/**
 * Cache layer tests
 *
 * Covers (in-memory backend, default when KV env vars are absent):
 *   - first call invokes fetcher, second hit returns cached value
 *   - different keys are isolated
 *   - TTL expiry forces a re-fetch
 *   - citation-only results bypass the cache (bypass counter, no caching)
 *   - invalidateCache clears one bucket and/or all buckets
 *   - getCacheStats reports hits/misses/hit_ratio/bypasses/backend
 *
 * Plus pluggable-backend tests:
 *   - Backend selection: KV vars present → KvBackend, absent → InMemoryBackend
 *   - getCacheStats().backend reports the active kind
 *   - get/set roundtrip against a mocked KV backend
 *   - KV backend invalidate path works through the same public surface
 *   - KV backend size reflects mocked store
 *
 * The public API is now async (KV is fetch-based). Every withCache /
 * getCacheStats / invalidateCache call is awaited.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  withCache,
  getCacheStats,
  invalidateCache,
  __resetCacheStatsForTests,
  __setCacheBackendForTests,
  __reinitCacheBackendForTests,
  __getBackendKindForTests,
  __injectRedisClassForTests,
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

beforeEach(async () => {
  // Guarantee in-memory backend for the default-path tests. The
  // pluggable-backend describe block overrides this where needed.
  __reinitCacheBackendForTests();
  await invalidateCache();
  __resetCacheStatsForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("withCache (in-memory backend)", () => {
  it("invokes fetcher on first call and caches the result", async () => {
    const fetcher = vi.fn(async () => [primaryResult()]);

    const r1 = await withCache("icc-digital-codes", QUERY_A, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(r1).toHaveLength(1);
    expect(r1[0].verified).toBe(true);

    const stats = await getCacheStats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(0);
  });

  it("returns cached value on second call with same key (no fetcher invocation)", async () => {
    const fetcher = vi.fn(async () => [primaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, fetcher);
    const r2 = await withCache("icc-digital-codes", QUERY_A, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(r2[0].section).toBe("210.52");

    const stats = await getCacheStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hit_ratio).toBeCloseTo(0.5, 5);
  });

  it("treats different queries as distinct keys", async () => {
    const fetcher = vi.fn(async (): Promise<CodeSourceResult[]> => [primaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, fetcher);
    await withCache("icc-digital-codes", QUERY_B, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect((await getCacheStats()).misses).toBe(2);
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
    expect((await getCacheStats()).hits).toBe(1);
  });

  it("isolates buckets per source", async () => {
    const fetcher = vi.fn(async () => [primaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, fetcher);
    await withCache("nfpa", QUERY_A, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
    const sizes = (await getCacheStats()).sizes;
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

    const stats = await getCacheStats();
    expect(stats.bypasses).toBe(2);
    expect(stats.sizes["icc-digital-codes"]).toBe(0);
  });

  it("DOES cache when at least one result is primary (mixed verified/unverified)", async () => {
    const fetcher = vi.fn(async () => [primaryResult(), summaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, fetcher);
    await withCache("icc-digital-codes", QUERY_A, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect((await getCacheStats()).sizes["icc-digital-codes"]).toBe(1);
  });

  it("counts bypasses separately from hits and misses", async () => {
    const summaryFetcher = vi.fn(async () => [summaryResult()]);
    const primaryFetcher = vi.fn(async () => [primaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, summaryFetcher); // miss + bypass
    await withCache("icc-digital-codes", QUERY_B, primaryFetcher); // miss + cache
    await withCache("icc-digital-codes", QUERY_B, primaryFetcher); // hit

    const stats = await getCacheStats();
    expect(stats.misses).toBe(2);
    expect(stats.hits).toBe(1);
    expect(stats.bypasses).toBe(1);
  });
});

describe("invalidateCache (in-memory backend)", () => {
  it("clears a single bucket without touching others", async () => {
    const fetcher = vi.fn(async () => [primaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, fetcher);
    await withCache("nfpa", QUERY_A, fetcher);
    expect((await getCacheStats()).sizes["icc-digital-codes"]).toBe(1);
    expect((await getCacheStats()).sizes["nfpa"]).toBe(1);

    await invalidateCache("icc-digital-codes");
    expect((await getCacheStats()).sizes["icc-digital-codes"]).toBe(0);
    expect((await getCacheStats()).sizes["nfpa"]).toBe(1);
  });

  it("clears every bucket when called with no argument", async () => {
    const fetcher = vi.fn(async () => [primaryResult()]);

    await withCache("icc-digital-codes", QUERY_A, fetcher);
    await withCache("nfpa", QUERY_A, fetcher);
    await withCache("upcodes", QUERY_A, fetcher);
    await withCache("rag", QUERY_A, fetcher);

    await invalidateCache();

    const sizes = (await getCacheStats()).sizes;
    expect(sizes["icc-digital-codes"]).toBe(0);
    expect(sizes["nfpa"]).toBe(0);
    expect(sizes["upcodes"]).toBe(0);
    expect(sizes["rag"]).toBe(0);
  });
});

describe("getCacheStats", () => {
  it("reports a 0 hit_ratio with zero traffic", async () => {
    const stats = await getCacheStats();
    expect(stats.hit_ratio).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });

  it("reports backend: 'in-memory' when KV env vars are absent", async () => {
    // Belt-and-suspenders — beforeEach already reinits, but we assert
    // the *reported* kind matches the *selected* backend.
    const stats = await getCacheStats();
    expect(stats.backend).toBe("in-memory");
  });
});

// ---------------------------------------------------------------------------
// Pluggable backend tests
// ---------------------------------------------------------------------------

describe("backend selection", () => {
  // Snapshot env so the tests can flip vars in/out without leaking into
  // sibling suites.
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Clear injection + restore env exactly. Re-init so the next test
    // starts from the default in-memory backend.
    __injectRedisClassForTests(null);
    for (const k of Object.keys(process.env)) {
      if (!(k in originalEnv)) delete process.env[k];
    }
    Object.assign(process.env, originalEnv);
    __reinitCacheBackendForTests();
  });

  it("picks InMemoryBackend when KV env vars are absent", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    __reinitCacheBackendForTests();
    expect(__getBackendKindForTests()).toBe("in-memory");
    expect((await getCacheStats()).backend).toBe("in-memory");
  });

  it("picks KvBackend when KV_REST_API_URL + KV_REST_API_TOKEN are set", async () => {
    // Inject a fake Redis class so we don't need @upstash/redis
    // installed and don't open a network connection. The constructor
    // just needs to not throw.
    class FakeRedis {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      constructor(_opts: any) {}
      async get() {
        return null;
      }
      async set() {}
      async del() {}
      async keys() {
        return [];
      }
    }
    __injectRedisClassForTests(FakeRedis);
    process.env.KV_REST_API_URL = "https://example-kv.upstash.io";
    process.env.KV_REST_API_TOKEN = "test-token";
    __reinitCacheBackendForTests();
    expect(__getBackendKindForTests()).toBe("kv");
    expect((await getCacheStats()).backend).toBe("kv");
  });

  it("also picks KvBackend with Upstash-native env var names", async () => {
    class FakeRedis {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      constructor(_opts: any) {}
    }
    __injectRedisClassForTests(FakeRedis);
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    process.env.UPSTASH_REDIS_REST_URL = "https://example-kv.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    __reinitCacheBackendForTests();
    expect(__getBackendKindForTests()).toBe("kv");
  });

  it("falls back to in-memory when KvBackend construction throws", async () => {
    // Simulates a misconfigured deploy where env vars are set but the
    // dep is broken / missing / the constructor rejects. We must NOT
    // crash the module — the orchestrator stays up on the in-memory
    // fallback.
    class BrokenRedis {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      constructor(_opts: any) {
        throw new Error("simulated upstash init failure");
      }
    }
    __injectRedisClassForTests(BrokenRedis);
    process.env.KV_REST_API_URL = "https://example-kv.upstash.io";
    process.env.KV_REST_API_TOKEN = "test-token";
    __reinitCacheBackendForTests();
    expect(__getBackendKindForTests()).toBe("in-memory");
  });
});

describe("mocked KV backend roundtrip", () => {
  // A hand-rolled in-memory shim that satisfies the CacheBackend
  // contract but reports kind='kv'. Lets us exercise the public
  // withCache / invalidateCache / getCacheStats paths through the KV
  // codepath without needing Upstash or even @upstash/redis.
  function makeMockKvBackend() {
    const store = new Map<string, CodeSourceResult[]>();
    return {
      kind: "kv" as const,
      store,
      async get(source: string, key: string) {
        return store.get(`${source}:${key}`) ?? null;
      },
      async set(
        source: string,
        key: string,
        value: CodeSourceResult[],
        _ttlMs: number
      ) {
        store.set(`${source}:${key}`, value);
      },
      async clear(source?: string) {
        if (!source) {
          store.clear();
          return;
        }
        for (const k of Array.from(store.keys())) {
          if (k.startsWith(`${source}:`)) store.delete(k);
        }
      },
      async size(source: string) {
        let n = 0;
        for (const k of store.keys()) if (k.startsWith(`${source}:`)) n++;
        return n;
      },
    };
  }

  it("performs get/set roundtrip through the public withCache API", async () => {
    const mock = makeMockKvBackend();
    __setCacheBackendForTests(mock as never);
    __resetCacheStatsForTests();

    const fetcher = vi.fn(async () => [primaryResult()]);

    // First call: miss → fetch → set
    const r1 = await withCache("icc-digital-codes", QUERY_A, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(r1).toHaveLength(1);
    expect(mock.store.size).toBe(1);

    // Second call: hit → no fetch
    const r2 = await withCache("icc-digital-codes", QUERY_A, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(r2[0].verified).toBe(true);

    const stats = await getCacheStats();
    expect(stats.backend).toBe("kv");
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.sizes["icc-digital-codes"]).toBe(1);
  });

  it("invalidateCache(source) clears only the matching prefix on KV", async () => {
    const mock = makeMockKvBackend();
    __setCacheBackendForTests(mock as never);
    __resetCacheStatsForTests();

    const fetcher = vi.fn(async () => [primaryResult()]);
    await withCache("icc-digital-codes", QUERY_A, fetcher);
    await withCache("nfpa", QUERY_A, fetcher);
    expect(mock.store.size).toBe(2);

    await invalidateCache("icc-digital-codes");
    expect(mock.store.size).toBe(1);
    const stats = await getCacheStats();
    expect(stats.sizes["icc-digital-codes"]).toBe(0);
    expect(stats.sizes["nfpa"]).toBe(1);
  });
});
