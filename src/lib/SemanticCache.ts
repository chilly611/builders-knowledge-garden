/**
 * SemanticCache.ts
 *
 * Server-side LRU cache with semantic similarity matching for BKG queries.
 * Features: TTL expiration, cosine similarity, smart key normalization.
 *
 * Usage:
 *   const cache = SemanticCache.getInstance();
 *   const result = cache.get("what materials for a roof?");
 *   cache.set(query, response, { userId: "123" });
 *   const similar = cache.findSimilar(newQuery, 0.85);
 *   cache.stats();
 */

/**
 * Represents a cached response with metadata
 */
export interface CachedResponse {
  value: any;
  timestamp: number;
  ttl: number;
  expiresAt: number;
  metadata?: Record<string, any>;
  hitCount: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  evicted: number;
}

/**
 * Similarity match result
 */
export interface SimilarityMatch {
  query: string;
  response: CachedResponse;
  similarity: number;
}

/**
 * SemanticCache: LRU cache with TTL and semantic similarity matching
 *
 * - In-memory LRU cache (Map-based, max 1000 entries)
 * - 5-minute TTL per entry
 * - Cache key normalization (lowercase, sorted words, stop word removal)
 * - Cosine similarity matching for fuzzy lookups
 * - Thread-safe singleton pattern for server-side use
 */
export class SemanticCache {
  private static instance: SemanticCache;

  private cache: Map<string, CachedResponse> = new Map();
  private accessOrder: string[] = []; // LRU tracking
  private readonly maxEntries = 1000;
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Statistics
  private stats_hits = 0;
  private stats_misses = 0;
  private stats_evicted = 0;

  // Stop words to exclude from similarity matching
  private readonly STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that',
    'the', 'to', 'was', 'will', 'with', 'would', 'what', 'where',
    'when', 'which', 'who', 'why', 'how', 'about', 'if', 'just',
    'should', 'can', 'could', 'have', 'having', 'been', 'being'
  ]);

  /**
   * Get singleton instance
   */
  public static getInstance(): SemanticCache {
    if (!SemanticCache.instance) {
      SemanticCache.instance = new SemanticCache();
    }
    return SemanticCache.instance;
  }

  /**
   * Normalize query for cache key
   * - Lowercase
   * - Remove punctuation
   * - Sort words alphabetically
   * - Remove stop words
   * - Trim whitespace
   */
  private normalizeKey(query: string): string {
    // Lowercase and remove punctuation
    let normalized = query.toLowerCase().replace(/[^\w\s]/g, ' ');

    // Split into words and filter stop words
    const words = normalized
      .split(/\s+/)
      .filter(w => w.length > 0 && !this.STOP_WORDS.has(w));

    // Sort alphabetically and join
    return words.sort().join(' ').trim();
  }

  /**
   * Extract word frequency vector for similarity matching
   */
  private getWordVector(query: string): Map<string, number> {
    const normalized = query.toLowerCase().replace(/[^\w\s]/g, ' ');
    const words = normalized
      .split(/\s+/)
      .filter(w => w.length > 0 && !this.STOP_WORDS.has(w));

    const vector = new Map<string, number>();
    for (const word of words) {
      vector.set(word, (vector.get(word) || 0) + 1);
    }
    return vector;
  }

  /**
   * Calculate cosine similarity between two word vectors
   */
  private cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
    if (vec1.size === 0 || vec2.size === 0) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    // Calculate dot product and norm1
    for (const [word, count1] of vec1) {
      const count2 = vec2.get(word) || 0;
      dotProduct += count1 * count2;
      norm1 += count1 * count1;
    }

    // Calculate norm2
    for (const count of vec2.values()) {
      norm2 += count * count;
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Mark entry as accessed (LRU update)
   */
  private markAccessed(key: string): void {
    // Remove from current position
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }
    // Add to end (most recent)
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats_evicted++;
    }
  }

  /**
   * Get cached response by key
   */
  public get(query: string): CachedResponse | null {
    const key = this.normalizeKey(query);
    const cached = this.cache.get(key);

    if (!cached) {
      this.stats_misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.stats_misses++;
      return null;
    }

    // Update LRU and increment hit counter
    this.markAccessed(key);
    cached.hitCount++;
    this.stats_hits++;

    return cached;
  }

  /**
   * Set cache entry
   */
  public set(query: string, response: any, metadata?: Record<string, any>): void {
    const key = this.normalizeKey(query);
    const now = Date.now();

    const cached: CachedResponse = {
      value: response,
      timestamp: now,
      ttl: this.defaultTTL,
      expiresAt: now + this.defaultTTL,
      metadata,
      hitCount: 0,
    };

    // Check if we need to evict
    if (!this.cache.has(key) && this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }

    this.cache.set(key, cached);
    this.markAccessed(key);
  }

  /**
   * Find similar cached query using cosine similarity
   *
   * @param query - The query to match
   * @param threshold - Similarity threshold (0-1), default 0.85
   * @returns First matching cached response, or null
   */
  public findSimilar(query: string, threshold = 0.85): SimilarityMatch | null {
    if (this.cache.size === 0) {
      this.stats_misses++;
      return null;
    }

    const queryVector = this.getWordVector(query);
    let bestMatch: SimilarityMatch | null = null;
    let bestSimilarity = threshold;

    for (const [cachedKey, cached] of this.cache) {
      // Skip expired entries
      if (Date.now() > cached.expiresAt) {
        continue;
      }

      // Reconstruct query from cache key (approximate)
      const cachedVector = this.getWordVector(cachedKey);
      const similarity = this.cosineSimilarity(queryVector, cachedVector);

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = {
          query: cachedKey,
          response: cached,
          similarity,
        };
      }
    }

    if (bestMatch) {
      this.stats_hits++;
      // Update LRU
      this.markAccessed(this.normalizeKey(bestMatch.query));
      bestMatch.response.hitCount++;
      return bestMatch;
    }

    this.stats_misses++;
    return null;
  }

  /**
   * Invalidate cache entries matching a pattern
   *
   * @param pattern - Optional regex pattern to match cache keys
   * @returns Number of invalidated entries
   */
  public invalidate(pattern?: string): number {
    let count = 0;

    if (!pattern) {
      // Clear all
      count = this.cache.size;
      this.cache.clear();
      this.accessOrder = [];
      return count;
    }

    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      const idx = this.accessOrder.indexOf(key);
      if (idx !== -1) {
        this.accessOrder.splice(idx, 1);
      }
      count++;
    }

    return count;
  }

  /**
   * Get cache statistics
   */
  public stats(): CacheStats {
    const total = this.stats_hits + this.stats_misses;
    const hitRate = total === 0 ? 0 : this.stats_hits / total;

    return {
      hits: this.stats_hits,
      misses: this.stats_misses,
      hitRate,
      size: this.cache.size,
      evicted: this.stats_evicted,
    };
  }

  /**
   * Get all cache keys (for debugging)
   */
  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Reset cache and statistics
   */
  public reset(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats_hits = 0;
    this.stats_misses = 0;
    this.stats_evicted = 0;
  }
}

/**
 * Convenience singleton getter
 */
export const semanticCache = SemanticCache.getInstance();
