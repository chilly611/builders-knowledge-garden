/**
 * Code-Source LRU Cache
 *
 * Once any of the paywalled publishers (UpCodes / ICC DigitalCodes / NFPA
 * Link) hold real API keys, every `aggregateSources` / `queryAllSources`
 * invocation will hit all of them in parallel. Without a cache, repeat
 * queries against the same section blow per-call costs to (#publishers ×
 * per-call price) for traffic that has identical inputs and identical
 * outputs.
 *
 * This module exposes:
 *   - `withCache(source, query, fetcher)` — drop-in wrapper used inside
 *     each adapter to memoize the result of a fetcher under a key derived
 *     deterministically from the CodeQuery.
 *   - `getCacheStats()` — hits / misses / hit_ratio + per-source sizes for
 *     the healthcheck endpoint.
 *   - `invalidateCache(source?)` — flush one source's bucket or all of them.
 *
 * Design notes:
 *   - Zero deps. Hand-rolled Map-based LRU keeps the dependency surface
 *     small (every paywall adapter is already chunky with Zod schemas).
 *     If we ever need per-key cost weighting or eviction telemetry, swap
 *     for `lru-cache@^10` — interface stays identical.
 *   - Per-publisher buckets. Different sources have different cost profiles
 *     and different update cadences; isolating buckets lets us tune `max`
 *     and `ttl` independently. RAG (local corpus, cheap) gets a larger,
 *     shorter-TTL bucket than ICC/NFPA/UpCodes.
 *   - Citation-only results are NOT cached in live mode. They indicate a
 *     paywall transient (timeout / parse failure / empty body); caching
 *     would pin the bad answer for an hour. See `withCache` below.
 *   - Module-scoped state → per-Vercel-instance cache. Multi-region rollout
 *     will get divergent caches and should be migrated to Redis / Upstash
 *     KV. Flagged in the parent task report.
 */

import type { CodeQuery, CodeSourceResult } from "./types";

/**
 * Sources eligible for caching. `bkg-seed` and `local-amendment` are
 * intentionally excluded — they're in-memory + cheap, and adding a layer
 * just spends RAM with no win.
 */
export type CacheableSource =
  | "icc-digital-codes"
  | "nfpa"
  | "upcodes"
  | "rag";

const HOUR_MS = 60 * 60 * 1000;

interface CacheConfig {
  max: number;
  ttlMs: number;
}

const CONFIGS: Record<CacheableSource, CacheConfig> = {
  "icc-digital-codes": { max: 500, ttlMs: HOUR_MS },
  "nfpa": { max: 500, ttlMs: HOUR_MS },
  "upcodes": { max: 500, ttlMs: HOUR_MS },
  // RAG queries cluster heavily on a small section vocabulary AND are
  // cheap to recompute — bigger bucket, shorter TTL.
  "rag": { max: 2000, ttlMs: HOUR_MS / 2 },
};

interface Entry<V> {
  value: V;
  expiresAt: number;
}

/**
 * Minimal Map-based LRU with TTL. `Map` preserves insertion order, so we
 * use `delete + set` to mark a key as most-recently-used on each `get`.
 * Eviction removes the oldest (first) key when size exceeds `max`.
 */
class TtlLru<K, V> {
  private map = new Map<K, Entry<V>>();
  constructor(private readonly max: number, private readonly ttlMs: number) {}

  get(key: K): V | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    // Re-insert to bump LRU position.
    this.map.delete(key);
    this.map.set(key, e);
    return e.value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    if (this.map.size > this.max) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) this.map.delete(oldestKey);
    }
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

const caches: Record<CacheableSource, TtlLru<string, CodeSourceResult[]>> = {
  "icc-digital-codes": new TtlLru(
    CONFIGS["icc-digital-codes"].max,
    CONFIGS["icc-digital-codes"].ttlMs
  ),
  "nfpa": new TtlLru(CONFIGS.nfpa.max, CONFIGS.nfpa.ttlMs),
  "upcodes": new TtlLru(CONFIGS.upcodes.max, CONFIGS.upcodes.ttlMs),
  "rag": new TtlLru(CONFIGS.rag.max, CONFIGS.rag.ttlMs),
};

const stats = {
  hits: 0,
  misses: 0,
  // Incremented when caching is intentionally skipped (e.g. citation-only
  // fallback in live mode — we want the next call to retry the paywall).
  bypasses: 0,
};

/**
 * Build a stable cache key from a CodeQuery. Keywords are sorted so that
 * ["outlet", "kitchen"] and ["kitchen", "outlet"] hit the same entry.
 */
function cacheKey(source: CacheableSource, query: CodeQuery): string {
  return [
    source,
    query.discipline,
    query.section ?? "",
    query.edition ?? "",
    query.jurisdiction ?? "",
    (query.keywords ?? []).slice().sort().join(","),
  ].join("|");
}

/**
 * Wrap an adapter fetcher with LRU+TTL caching.
 *
 * Skip-cache rule: if EVERY returned result has `confidenceTier: 'summary'`,
 * we treat that as a paywall miss / transient fallback and refuse to cache.
 * This matches the citation-only payload shape ICC/NFPA/UpCodes emit on
 * timeout-or-empty in live mode. Caching it would pin the failure for an
 * hour; bypassing it costs us at most one extra paywall round-trip on the
 * next call.
 *
 * Note: in PREVIEW mode (no API key set) adapters ALSO return summary-tier
 * citation-only payloads — and those will be bypassed too. That's fine:
 * preview mode is cheap, and once a key lands the bypass naturally fades
 * as real `primary`-tier responses start populating the bucket.
 */
export async function withCache(
  source: CacheableSource,
  query: CodeQuery,
  fetcher: () => Promise<CodeSourceResult[]>
): Promise<CodeSourceResult[]> {
  const key = cacheKey(source, query);
  const cache = caches[source];

  const hit = cache.get(key);
  if (hit) {
    stats.hits++;
    return hit;
  }
  stats.misses++;

  const result = await fetcher();

  const allCitationOnly =
    result.length > 0 && result.every((r) => r.confidenceTier === "summary");
  if (allCitationOnly) {
    stats.bypasses++;
    return result;
  }

  cache.set(key, result);
  return result;
}

/**
 * Snapshot for healthcheck. `hit_ratio` is undefined-safe: zero before any
 * traffic.
 */
export function getCacheStats() {
  const total = stats.hits + stats.misses;
  return {
    hits: stats.hits,
    misses: stats.misses,
    hit_ratio: total > 0 ? stats.hits / total : 0,
    bypasses: stats.bypasses,
    sizes: {
      "icc-digital-codes": caches["icc-digital-codes"].size,
      "nfpa": caches.nfpa.size,
      "upcodes": caches.upcodes.size,
      "rag": caches.rag.size,
    },
  };
}

/**
 * Clear one bucket (e.g. after a publisher pushes an edition update) or
 * everything (test teardown, manual ops command).
 */
export function invalidateCache(source?: CacheableSource): void {
  if (source) {
    caches[source].clear();
  } else {
    (Object.keys(caches) as CacheableSource[]).forEach((k) => caches[k].clear());
  }
}

/**
 * Reset stat counters. Test-only — not exported via index.ts.
 */
export function __resetCacheStatsForTests(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.bypasses = 0;
}
