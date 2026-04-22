// RSI Feedback Module
// Records user signals (thumbs_up, correction, etc.) on specialist runs
// Silent on failure to prevent impacting user workflow

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function getRSIClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  try {
    return createClient<Database>(url, serviceKey, {
      auth: { persistSession: false },
    });
  } catch {
    return null;
  }
}

export interface FeedbackRow {
  id: string;
  specialist_run_id: string;
  user_id?: string | null;
  signal: 'thumbs_up' | 'thumbs_down' | 'correction' | 'outcome_success' | 'outcome_failure' | 'ahj_contradiction';
  note?: string | null;
  context?: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Record user feedback on a specialist run outcome.
 * Failures are logged but swallowed to prevent workflow disruption.
 */
export async function recordFeedback(input: {
  specialistRunId: string;
  userId?: string;
  signal: 'thumbs_up' | 'thumbs_down' | 'correction' | 'outcome_success' | 'outcome_failure' | 'ahj_contradiction';
  note?: string;
  context?: Record<string, unknown>;
}): Promise<{ id: string }> {
  const client = getRSIClient();
  if (!client) {
    return { id: '' };
  }

  try {
    const { data, error } = await client
      .from('rsi_feedback')
      .insert({
        specialist_run_id: input.specialistRunId,
        user_id: input.userId || null,
        signal: input.signal,
        note: input.note || null,
        context: (input.context || null) as any,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.debug('[RSI Feedback] Insert error:', error);
      return { id: '' };
    }

    return { id: (data as { id: string }).id };
  } catch (err) {
    console.debug('[RSI Feedback] Exception:', err);
    return { id: '' };
  }
}

/**
 * Retrieve recent feedback entries for synthesis.
 * Returns all feedback in reverse chronological order.
 */
export async function recentFeedback(limit: number = 100): Promise<FeedbackRow[]> {
  const client = getRSIClient();
  if (!client) {
    return [];
  }

  try {
    const { data, error } = await client
      .from('rsi_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.debug('[RSI Feedback] Query error:', error);
      return [];
    }

    return (data || []) as FeedbackRow[];
  } catch (err) {
    console.debug('[RSI Feedback] Exception:', err);
    return [];
  }
}
