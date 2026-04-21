import { supabase, isSupabaseConfigured } from '../supabase';
import type { ResourceQuery, ResourceResponse } from './types';

/**
 * Log a broker query to Supabase for RSI event tracking.
 * Wraps in try-catch to ensure failures do not bubble up.
 * This is instrumentation only; broker search must never fail due to logging.
 */
export async function logBrokerQuery(
  runId: string,
  q: ResourceQuery,
  response: ResourceResponse
): Promise<void> {
  if (!isSupabaseConfigured()) {
    // Supabase not configured; silently skip logging
    return;
  }

  try {
    await supabase.from('broker_queries').insert({
      run_id: runId,
      query_text: q.query,
      query_kinds: q.kinds,
      query_where: q.where || null,
      query_context: q.context || null,
      query_limit: q.limit || 12,
      response_total_found: response.totalFound,
      response_results_count: response.results.length,
      response_sources: response.sources,
      response_warnings: response.warnings,
      latency_ms: response.latencyMs,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Silently swallow logging errors; this is instrumentation,
    // not part of the contract. Log to console for debugging only.
    console.error('[resource-broker] Failed to log query:', err);
  }
}
