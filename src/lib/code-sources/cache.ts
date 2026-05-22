/**
 * Code-Source Pluggable Cache
 *
 * Once any of the paywalled publishers (UpCodes / ICC DigitalCodes / NFPA
 * Link) hold real API keys, every `aggregateSources` / `queryAllSources`
 * invocation will hit all of them in parallel. Without a cache, repeat
 * queries against the same section blow per-call costs to (#publishers ×
 * per-call price) for traffic that has identical inputs and identical
 * outputs.
 *
 * Backends:
 *   - InMemoryBackend (default): Map-based LRU+TTL per source bucket.
 *     Module-scoped → per-Vercel-instance cache. Fine for single-region
 *     / single-instance deploys but diverges across regions.
 *   - KvBackend: Upstash Redis (works with Vercel KV which is a thin
 *     Upstash wrapper). Selected when KV_REST_API_URL + KV_REST_API_TOKEN
 *     or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are both set.
 *     Multi-region safe — every Vercel instance sees the same cache.
 *
 * Public surface (now async — KV is fetch-based):
 *   - `withCache(source, query, fetcher)` — drop-in wrapper used inside
 *     each adapter to memoize the result of a fetcher under a key derived
 *     deterministically from the CodeQuery.
 *   - `getCacheStats()` — hits/misses/hit_ratio/bypasses + which backend
 *     is active + per-source sizes for the healthcheck endpoint.
 *   - `invalidateCache(source?)` — flush one source's bucket or all of
 *     them.
 *
 * Design notes:
 *   - Same Backend interface for both implementations → swapping is a
 *     one-line decision at module load. Tests force the in-memory path
 *     by leaving the KV env vars unset (default in test).
 *   - Citation-only results are NOT cached in live mode. They indicate a
 *     paywall transient (timeout / parse failure / empty body); caching
 *     would pin the bad answer for an hour. See `withCache` below.
 *   - Stats (hits/misses/bypasses) are still per-instance — telemetry is
 *     local even when the cache itself is shared. Centralizing those is
 *     a future round and not load-bearing for the cost-control goal.
 *   - KV `keys()` is O(N) and blocks Redis. We use it only for size
 *     reporting and invalidation — both rare paths. If buckets ever grow
 *     past ~10k keys we should switch to SCAN; today they're capped by
 *     CodeQuery cardinality (small).
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

export const CACHEABLE_SOURCES: CacheableSource[] = [
  "icc-digital-codes",
  "nfpa",
  "upcodes",
  "rag",
];

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

/**
 * Backend contract. Both in-memory and KV implementations must honor
 * this. Source argument is included so backends can bucket per source
 * (in-memory keeps separate LRUs; KV uses key prefixes).
 */
interface CacheBackend {
  readonly kind: "in-memory" | "kv";
  get(
    source: CacheableSource,
    key: string
  ): Promise<CodeSourceResult[] | null>;
  set(
    source: CacheableSource,
    key: string,
    value: CodeSourceResult[],
    ttlMs: number
  ): Promise<void>;
  clear(source?: CacheableSource): Promise<void>;
  size(source: CacheableSource): Promise<number>;
}

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

  set(key: K, value: V, ttlMsOverride?: number): void {
    if (this.map.has(key)) this.map.delete(key);
    const ttl = ttlMsOverride ?? this.ttlMs;
    this.map.set(key, { value, expiresAt: Date.now() + ttl });
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

/**
 * In-memory backend. Same Map-LRU+TTL behavior as the round-5 cache —
 * kept verbatim so the no-KV-env-vars path is bit-identical to the prior
 * production shape (12 existing tests rely on this).
 */
class InMemoryBackend implements CacheBackend {
  readonly kind = "in-memory" as const;
  private caches: Record<CacheableSource, TtlLru<string, CodeSourceResult[]>>;

  constructor() {
    this.caches = {
      "icc-digital-codes": new TtlLru(
        CONFIGS["icc-digital-codes"].max,
        CONFIGS["icc-digital-codes"].ttlMs
      ),
      "nfpa": new TtlLru(CONFIGS.nfpa.max, CONFIGS.nfpa.ttlMs),
      "upcodes": new TtlLru(CONFIGS.upcodes.max, CONFIGS.upcodes.ttlMs),
      "rag": new TtlLru(CONFIGS.rag.max, CONFIGS.rag.ttlMs),
    };
  }

  async get(
    source: CacheableSource,
    key: string
  ): Promise<CodeSourceResult[] | null> {
    return this.caches[source].get(key) ?? null;
  }

  async set(
    source: CacheableSource,
    key: string,
    value: CodeSourceResult[],
    ttlMs: number
  ): Promise<void> {
    this.caches[source].set(key, value, ttlMs);
  }

  async clear(source?: CacheableSource): Promise<void> {
    if (source) {
      this.caches[source].clear();
    } else {
      CACHEABLE_SOURCES.forEach((k) => this.caches[k].clear());
    }
  }

  async size(source: CacheableSource): Promise<number> {
    return this.caches[source].size;
  }
}

/**
 * KV / Upstash Redis backend. Uses the @upstash/redis fetch-based SDK
 * (no native bindings, edge-runtime safe). Vercel KV is a thin wrapper
 * around the same Upstash REST endpoint — KV_REST_API_URL +
 * KV_REST_API_TOKEN env vars are what `@vercel/kv` reads under the hood,
 * so installing them with either provider's variable names works.
 *
 * Keys: `${source}:${cacheKey}`. We keep buckets prefix-isolated so
 * `invalidateCache('icc-digital-codes')` can scan + delete just that
 * publisher.
 *
 * TTL: passed per-set via `{ px: ttlMs }` (Redis SET ... PX option).
 * Eviction is delegated to Redis; the `max` in CONFIGS is ignored for
 * KV (Upstash bills by command, not by row count, so capping is moot
 * for our query cardinality).
 *
 * Failure mode: if Redis is unreachable, get() resolves to null
 * (treated as a miss → re-fetch from publisher) and set()/clear()
 * resolve silently. We never let a cache failure break the orchestrator.
 */
// Test hook: lets the test suite inject a fake Redis class without needing
// @upstash/redis installed in node_modules. Real deploys leave this null
// and pickBackend() loads the real module via require().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let __injectedRedisClass: any = null;

class KvBackend implements CacheBackend {
  readonly kind = "kv" as const;
  // Loosely typed because @upstash/redis is loaded lazily — typing it
  // any keeps the module compilable in environments where the dep isn't
  // installed (in-memory path still works).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private redis: any = null;

  constructor(url: string, token: string) {
    // Test hook takes precedence so unit tests can exercise the KV
    // codepath without pulling in the real dep.
    if (__injectedRedisClass) {
      this.redis = new __injectedRedisClass({ url, token });
      return;
    }
    // Lazy require so workspaces that skip the Upstash dep (tests, local
    // dev without KV) don't crash at module load.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@upstash/redis");
    const Redis = mod.Redis;
    this.redis = new Redis({ url, token });
  }

  async get(
    source: CacheableSource,
    key: string
  ): Promise<CodeSourceResult[] | null> {
    try {
      const raw = await this.redis.get(this.k(source, key));
      if (!raw) return null;
      // Upstash auto-deserializes JSON when the value was stored as an
      // object via the SDK. If a different client wrote it as a string,
      // raw will be a string — handle both.
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw) as CodeSourceResult[];
        } catch {
          return null;
        }
      }
      return raw as CodeSourceResult[];
    } catch (e) {
      if (process.env.NODE_ENV !== "test") {
        console.warn("[cache] KV get failed:", e);
      }
      return null;
    }
  }

  async set(
    source: CacheableSource,
    key: string,
    value: CodeSourceResult[],
    ttlMs: number
  ): Promise<void> {
    try {
      // Upstash accepts `{ px: ms }` for millisecond TTL — keeps parity
      // with the in-memory TTL exactly. SET overwrites any prior entry.
      await this.redis.set(this.k(source, key), value, { px: ttlMs });
    } catch (e) {
      if (process.env.NODE_ENV !== "test") {
        console.warn("[cache] KV set failed:", e);
      }
    }
  }

  async clear(source?: CacheableSource): Promise<void> {
    try {
      const pattern = source ? `${source}:*` : `*`;
      const keys: string[] = (await this.redis.keys(pattern)) ?? [];
      if (keys.length > 0) {
        // Upstash `del` accepts varargs; spread the array.
        await this.redis.del(...keys);
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "test") {
        console.warn("[cache] KV clear failed:", e);
      }
    }
  }

  async size(source: CacheableSource): Promise<number> {
    try {
      const keys: string[] = (await this.redis.keys(`${source}:*`)) ?? [];
      return keys.length;
    } catch {
      return 0;
    }
  }

  private k(source: CacheableSource, key: string): string {
    return `${source}:${key}`;
  }
}

/**
 * Pick a backend at module-load time based on env vars. Either Vercel
 * KV's variable names OR Upstash's native names work — both point at the
 * same Upstash REST endpoint.
 *
 * If KV vars are set but the @upstash/redis dep is missing or KvBackend
 * construction throws, fall back to in-memory + log a warning. This
 * keeps the deploy alive when Redis credentials are misconfigured.
 */
function pickBackend(): CacheBackend {
  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      return new KvBackend(url, token);
    } catch (e) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(
          "[cache] KV backend init failed, falling back to in-memory:",
          e
        );
      }
    }
  }
  return new InMemoryBackend();
}

let backend: CacheBackend = pickBackend();

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
 * Wrap an adapter fetcher with backend-agnostic caching.
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

  const hit = await backend.get(source, key);
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

  await backend.set(source, key, result, CONFIGS[source].ttlMs);
  return result;
}

/**
 * Snapshot for healthcheck. `hit_ratio` is undefined-safe: zero before any
 * traffic. `backend` field lets the dashboard tell at a glance whether
 * the multi-region cache is actually wired up vs. quietly serving from
 * the per-instance fallback.
 */
export async function getCacheStats() {
  const total = stats.hits + stats.misses;
  const [iccSize, nfpaSize, upcodesSize, ragSize] = await Promise.all([
    backend.size("icc-digital-codes"),
    backend.size("nfpa"),
    backend.size("upcodes"),
    backend.size("rag"),
  ]);
  return {
    backend: backend.kind,
    hits: stats.hits,
    misses: stats.misses,
    hit_ratio: total > 0 ? stats.hits / total : 0,
    bypasses: stats.bypasses,
    sizes: {
      "icc-digital-codes": iccSize,
      "nfpa": nfpaSize,
      "upcodes": upcodesSize,
      "rag": ragSize,
    },
  };
}

/**
 * Clear one bucket (e.g. after a publisher pushes an edition update) or
 * everything (test teardown, manual ops command).
 */
export async function invalidateCache(
  source?: CacheableSource
): Promise<void> {
  await backend.clear(source);
}

/**
 * Reset stat counters. Test-only — not exported via index.ts.
 */
export function __resetCacheStatsForTests(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.bypasses = 0;
}

/**
 * Test-only hook to swap the backend at runtime (e.g. install a mocked
 * KV implementation without rebuilding the module). Not exported via
 * index.ts.
 */
export function __setCacheBackendForTests(b: CacheBackend): void {
  backend = b;
}

/**
 * Test-only hook to re-run backend selection from current env. Lets a
 * test set/unset KV_REST_API_URL and verify the picker chooses the right
 * backend.
 */
export function __reinitCacheBackendForTests(): void {
  backend = pickBackend();
}

/**
 * Test-only: expose the backend kind without going through getCacheStats
 * (which does I/O against `size`).
 */
export function __getBackendKindForTests(): "in-memory" | "kv" {
  return backend.kind;
}

/**
 * Test-only hook for injecting a fake Redis class so we can exercise
 * the KV codepath without installing @upstash/redis. Pass null to clear.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function __injectRedisClassForTests(cls: any): void {
  __injectedRedisClass = cls;
}
