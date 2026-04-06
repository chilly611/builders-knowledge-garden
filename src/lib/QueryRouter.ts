/**
 * QueryRouter.ts
 *
 * Server-side LLM query router with permission checking, rate limiting, and caching.
 * Routes queries through authorized pathways with semantic caching for performance.
 *
 * Usage:
 *   const result = await routeQuery("show me building codes", "user_123");
 *   const classification = classifyQuery("what's the best material?");
 *   const canAccess = checkPermissions("user_456", classification);
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { semanticCache, CachedResponse, SimilarityMatch } from './SemanticCache';

/**
 * Query classification categories
 */
export type QueryClassification =
  | 'knowledge_lookup'      // General knowledge searches
  | 'project_action'        // Create/update/delete projects
  | 'copilot_chat'          // Conversational assistance
  | 'dream_generation'      // Dream interface operations
  | 'agent_command';        // Agent-specific operations

/**
 * User tier for permission checking
 */
export type UserTier = 'free' | 'explorer' | 'pro' | 'admin';

/**
 * Agent configuration from database
 */
export interface Agent {
  id: string;
  owner_user_id: string;
  name: string;
  autonomy_mode: 'watch' | 'assist' | 'autonomous';
  permissions: string[];
  rate_limit_per_minute: number;
  active: boolean;
  created_at: string;
}

/**
 * Router result with metadata
 */
export interface RouterResult {
  success: boolean;
  classification: QueryClassification;
  cacheHit: boolean;
  data?: any;
  error?: string;
  metadata: {
    executionTime: number;
    cached: boolean;
    similarity?: number;
    rateLimited?: boolean;
    permissionDenied?: boolean;
  };
}

/**
 * Rate limit bucket for sliding window counter
 */
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

/**
 * Classification keywords and patterns
 */
const CLASSIFICATION_PATTERNS = {
  knowledge_lookup: {
    keywords: ['materials', 'building', 'codes', 'regulations', 'roof', 'foundation', 'structure',
               'standards', 'requirements', 'look up', 'find', 'search', 'what', 'how', 'explain'],
    minKeywordMatch: 1,
  },
  project_action: {
    keywords: ['create', 'new', 'save', 'update', 'modify', 'delete', 'remove', 'edit', 'project',
               'design', 'build', 'generate'],
    minKeywordMatch: 1,
  },
  copilot_chat: {
    keywords: ['help', 'assist', 'suggest', 'recommend', 'advise', 'feedback', 'opinion', 'think',
               'tell', 'explain', 'describe', 'chat'],
    minKeywordMatch: 1,
  },
  dream_generation: {
    keywords: ['dream', 'oracle', 'alchemist', 'cosmos', 'sim', 'generate', 'vision', 'imagine',
               'create dream', 'interface'],
    minKeywordMatch: 1,
  },
  agent_command: {
    keywords: ['agent', 'autonomous', 'execute', 'run', 'task', 'command', 'schedule'],
    minKeywordMatch: 1,
  },
};

/**
 * Permission matrix: which tiers can access which routes
 */
const PERMISSION_MATRIX: Record<UserTier, Set<QueryClassification>> = {
  free: new Set(['knowledge_lookup', 'copilot_chat']),
  explorer: new Set(['knowledge_lookup', 'copilot_chat']),
  pro: new Set(['knowledge_lookup', 'copilot_chat', 'project_action', 'dream_generation']),
  admin: new Set(['knowledge_lookup', 'copilot_chat', 'project_action', 'dream_generation', 'agent_command']),
};

/**
 * Rate limits by user tier (queries per day)
 */
const RATE_LIMITS: Record<UserTier, number> = {
  free: 5,
  explorer: 10,
  pro: 100,
  admin: Infinity,
};

/**
 * QueryRouter: Main router class
 *
 * Manages:
 * - Query classification
 * - Permission checking
 * - Rate limiting (per-user and per-agent)
 * - Cache integration
 * - Audit trail logging
 */
export class QueryRouter {
  private static instance: QueryRouter;

  // Rate limiting: per-user and per-agent sliding window counters
  private readonly userRateLimits = new Map<string, RateLimitBucket>();
  private readonly agentRateLimits = new Map<string, RateLimitBucket[]>();

  // Time window: 24 hours for user limits, 1 minute for agent limits
  private readonly USER_WINDOW_MS = 24 * 60 * 60 * 1000;
  private readonly AGENT_WINDOW_MS = 60 * 1000;

  /**
   * Get singleton instance
   */
  public static getInstance(): QueryRouter {
    if (!QueryRouter.instance) {
      QueryRouter.instance = new QueryRouter();
    }
    return QueryRouter.instance;
  }

  /**
   * Classify a query into a route category
   *
   * Uses keyword matching and pattern detection (not LLM-based, for speed)
   *
   * @param query - The user query
   * @returns Classification category
   */
  public classifyQuery(query: string): QueryClassification {
    const lowerQuery = query.toLowerCase();
    const scores: Record<QueryClassification, number> = {
      knowledge_lookup: 0,
      project_action: 0,
      copilot_chat: 0,
      dream_generation: 0,
      agent_command: 0,
    };

    // Score each category based on keyword matches
    for (const [category, pattern] of Object.entries(CLASSIFICATION_PATTERNS)) {
      const cat = category as QueryClassification;
      for (const keyword of pattern.keywords) {
        if (lowerQuery.includes(keyword)) {
          scores[cat]++;
        }
      }
    }

    // Find category with highest score
    let maxScore = 0;
    let bestCategory: QueryClassification = 'copilot_chat'; // default fallback

    for (const [category, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category as QueryClassification;
      }
    }

    // If no matches found, default to copilot_chat
    if (maxScore === 0) {
      return 'copilot_chat';
    }

    return bestCategory;
  }

  /**
   * Check if user has permission for a route
   *
   * @param userId - User ID
   * @param classification - Query classification
   * @param supabase - Supabase client for database lookup
   * @returns true if user has permission
   */
  public async checkPermissions(
    userId: string,
    classification: QueryClassification,
    supabase: SupabaseClient
  ): Promise<boolean> {
    // Fetch user tier from database
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('tier')
      .eq('user_id', userId)
      .single();

    if (error || !userProfile) {
      // Default to explorer tier if not found
      const tier: UserTier = 'explorer';
      const allowedRoutes = PERMISSION_MATRIX[tier];
      return allowedRoutes.has(classification);
    }

    const tier = (userProfile.tier || 'explorer') as UserTier;
    const allowedRoutes = PERMISSION_MATRIX[tier];

    return allowedRoutes.has(classification);
  }

  /**
   * Check if agent has permission for a route
   *
   * @param agentId - Agent ID
   * @param classification - Query classification
   * @param agent - Agent configuration
   * @returns true if agent has permission
   */
  public checkAgentPermissions(
    agentId: string,
    classification: QueryClassification,
    agent: Agent
  ): boolean {
    if (!agent.active) {
      return false;
    }

    // Map classification to permission strings
    const permissionMap: Record<QueryClassification, string> = {
      knowledge_lookup: 'search_knowledge',
      project_action: 'create_project',
      copilot_chat: 'copilot_chat',
      dream_generation: 'dream_generation',
      agent_command: 'execute_command',
    };

    const requiredPermission = permissionMap[classification];
    return agent.permissions.includes(requiredPermission);
  }

  /**
   * Check user rate limit
   *
   * @param userId - User ID
   * @param tier - User tier
   * @returns true if under limit
   */
  private checkUserRateLimit(userId: string, tier: UserTier): boolean {
    const limit = RATE_LIMITS[tier];

    // Unlimited tier
    if (limit === Infinity) {
      return true;
    }

    const now = Date.now();
    let bucket = this.userRateLimits.get(userId);

    // Create or reset bucket if expired
    if (!bucket || now > bucket.resetAt) {
      bucket = {
        count: 0,
        resetAt: now + this.USER_WINDOW_MS,
      };
      this.userRateLimits.set(userId, bucket);
    }

    if (bucket.count >= limit) {
      return false;
    }

    bucket.count++;
    return true;
  }

  /**
   * Check agent rate limit (per-minute)
   *
   * @param agentId - Agent ID
   * @param agent - Agent configuration
   * @returns true if under limit
   */
  private checkAgentRateLimit(agentId: string, agent: Agent): boolean {
    const limit = agent.rate_limit_per_minute || 60; // default 60/min
    const now = Date.now();

    let buckets = this.agentRateLimits.get(agentId);
    if (!buckets) {
      buckets = [];
      this.agentRateLimits.set(agentId, buckets);
    }

    // Remove expired buckets
    buckets = buckets.filter(b => now < b.resetAt);
    this.agentRateLimits.set(agentId, buckets);

    // Count current window
    const currentCount = buckets.reduce((sum, b) => sum + b.count, 0);

    if (currentCount >= limit) {
      return false;
    }

    // Add to current bucket or create new one
    if (buckets.length === 0 || buckets[buckets.length - 1].resetAt < now) {
      buckets.push({
        count: 1,
        resetAt: now + this.AGENT_WINDOW_MS,
      });
    } else {
      buckets[buckets.length - 1].count++;
    }

    return true;
  }

  /**
   * Main router function: Process a query through the complete pipeline
   *
   * Pipeline:
   * 1. Check cache
   * 2. Classify query
   * 3. Check permissions
   * 4. Check rate limits
   * 5. Route to handler
   * 6. Cache result
   * 7. Log to audit trail
   *
   * @param query - User query
   * @param userId - User ID
   * @param supabase - Supabase client
   * @param agentId - Optional agent ID
   * @returns RouterResult with execution metadata
   */
  public async routeQuery(
    query: string,
    userId: string,
    supabase: SupabaseClient,
    agentId?: string
  ): Promise<RouterResult> {
    const startTime = Date.now();
    const result: RouterResult = {
      success: false,
      classification: 'copilot_chat',
      cacheHit: false,
      metadata: {
        executionTime: 0,
        cached: false,
      },
    };

    try {
      // Step 1: Check cache
      const cached = semanticCache.get(query);
      if (cached) {
        result.success = true;
        result.cacheHit = true;
        result.data = cached.value;
        result.metadata.cached = true;
        result.metadata.executionTime = Date.now() - startTime;

        // Log cache hit
        await this.logQuery(userId, query, 'cache_hit', supabase);

        return result;
      }

      // Try similarity matching as fallback
      const similar = semanticCache.findSimilar(query, 0.85);
      if (similar) {
        result.success = true;
        result.cacheHit = true;
        result.data = similar.response.value;
        result.metadata.cached = true;
        result.metadata.similarity = similar.similarity;
        result.metadata.executionTime = Date.now() - startTime;

        await this.logQuery(userId, query, 'similarity_hit', supabase);

        return result;
      }

      // Step 2: Classify query
      const classification = this.classifyQuery(query);
      result.classification = classification;

      // Step 3: Check user permissions
      const hasUserPermission = await this.checkPermissions(userId, classification, supabase);
      if (!hasUserPermission) {
        result.error = 'Permission denied for this query type';
        result.metadata.permissionDenied = true;
        result.metadata.executionTime = Date.now() - startTime;

        await this.logQuery(userId, query, 'permission_denied', supabase);

        return result;
      }

      // Step 4a: Check user rate limit
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tier')
        .eq('user_id', userId)
        .single();

      const tier = (userProfile?.tier || 'explorer') as UserTier;
      const userRateLimitOk = this.checkUserRateLimit(userId, tier);

      if (!userRateLimitOk) {
        result.error = 'Rate limit exceeded';
        result.metadata.rateLimited = true;
        result.metadata.executionTime = Date.now() - startTime;

        await this.logQuery(userId, query, 'rate_limited', supabase);

        return result;
      }

      // Step 4b: Check agent rate limit (if agent-issued)
      if (agentId) {
        const { data: agent } = await supabase
          .from('agent_identities')
          .select('*')
          .eq('id', agentId)
          .single();

        if (agent) {
          const agentRateLimitOk = this.checkAgentRateLimit(agentId, agent);
          if (!agentRateLimitOk) {
            result.error = 'Agent rate limit exceeded';
            result.metadata.rateLimited = true;
            result.metadata.executionTime = Date.now() - startTime;

            await this.logQuery(userId, query, 'agent_rate_limited', supabase, agentId);

            return result;
          }

          // Check agent permissions
          const hasAgentPermission = this.checkAgentPermissions(agentId, classification, agent);
          if (!hasAgentPermission) {
            result.error = 'Agent does not have permission for this operation';
            result.metadata.permissionDenied = true;
            result.metadata.executionTime = Date.now() - startTime;

            await this.logQuery(userId, query, 'agent_permission_denied', supabase, agentId);

            return result;
          }
        }
      }

      // Step 5: Route to handler (stub - real implementation would call handlers)
      // For now, just return success
      result.success = true;
      result.data = {
        classification,
        message: `Query routed to ${classification} handler`,
      };

      // Step 6: Cache the response
      semanticCache.set(query, result.data, {
        userId,
        agentId,
        classification,
      });

      // Step 7: Log to audit trail
      await this.logQuery(userId, query, 'success', supabase, agentId);

      result.metadata.executionTime = Date.now() - startTime;

      return result;
    } catch (error) {
      console.error('Router error:', error);
      result.success = false;
      result.error = 'Internal router error';
      result.metadata.executionTime = Date.now() - startTime;

      await this.logQuery(userId, query, 'error', supabase, agentId);

      return result;
    }
  }

  /**
   * Log query to audit trail
   */
  private async logQuery(
    userId: string,
    query: string,
    status: string,
    supabase: SupabaseClient,
    agentId?: string
  ): Promise<void> {
    try {
      await supabase.from('query_audit_log').insert({
        user_id: userId,
        agent_id: agentId || null,
        query_text: query,
        status,
        classification: this.classifyQuery(query),
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      // Log errors are non-fatal
      console.error('Audit log error:', error);
    }
  }

  /**
   * Reset all rate limits (for testing/admin)
   */
  public resetRateLimits(): void {
    this.userRateLimits.clear();
    this.agentRateLimits.clear();
  }
}

/**
 * Convenience singleton getter
 */
export const queryRouter = QueryRouter.getInstance();

/**
 * Exported factory functions for easy use in route handlers
 */
export async function classifyQuery(query: string): Promise<QueryClassification> {
  return queryRouter.classifyQuery(query);
}

export async function checkPermissions(
  userId: string,
  classification: QueryClassification,
  supabase: SupabaseClient
): Promise<boolean> {
  return queryRouter.checkPermissions(userId, classification, supabase);
}

export async function routeQuery(
  query: string,
  userId: string,
  supabase: SupabaseClient,
  agentId?: string
): Promise<RouterResult> {
  return queryRouter.routeQuery(query, userId, supabase, agentId);
}
