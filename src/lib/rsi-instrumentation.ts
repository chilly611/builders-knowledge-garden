// Recursive Self-Improvement (RSI) Instrumentation
// Silent logging to specialist_runs and broker_queries tables
// Failures swallowed to prevent impact on user workflow

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { SpecialistContext, SpecialistResult } from "./specialists";

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

function getRSIClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    // RSI instrumentation is optional — no key = silent no-op
    return null;
  }

  try {
    return createClient<Database>(url, serviceKey, {
      auth: { persistSession: false },
    });
  } catch {
    // Initialization failure is silent
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIALIST RUN LOGGING
// ─────────────────────────────────────────────────────────────────────────────

export interface SpecialistRunLog {
  workflow_id: string;
  step_id?: string;
  specialist_id: string;
  prompt_version: string;
  input_json: unknown; // Will be cast to Json
}

export async function logSpecialistRunStart(
  log: SpecialistRunLog
): Promise<string | null> {
  const client = getRSIClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("specialist_runs")
      .insert({
        workflow_id: log.workflow_id,
        step_id: log.step_id || null,
        specialist_id: log.specialist_id,
        prompt_version: log.prompt_version,
        input_json: log.input_json as any,
        output_json: null,
        user_edits_json: null,
        final_state_json: null,
        latency_ms: null,
        error_text: null,
      })
      .select("run_id")
      .single();

    if (error) {
      console.debug("[RSI] logSpecialistRunStart error:", error);
      return null;
    }

    return data?.run_id || null;
  } catch (err) {
    // Silent — instrumentation failure must never break the user's workflow
    console.debug("[RSI] logSpecialistRunStart exception:", err);
    return null;
  }
}

export async function logSpecialistRunComplete(
  runId: string,
  result: SpecialistResult,
  latencyMs: number,
  errorText?: string
): Promise<void> {
  const client = getRSIClient();
  if (!client || !runId) return;

  try {
    const { error } = await client
      .from("specialist_runs")
      .update({
        output_json: {
          narrative: result.narrative,
          structured: result.structured,
          citations: result.citations,
          confidence: result.confidence,
          deferred_to_human: result.deferred_to_human,
          model: result.model,
        } as any,
        final_state_json: {
          confidence: result.confidence,
          model: result.model,
        } as any,
        latency_ms: latencyMs,
        error_text: errorText || null,
        updated_at: new Date().toISOString(),
      })
      .eq("run_id", runId);

    if (error) {
      console.debug("[RSI] logSpecialistRunComplete error:", error);
    }
  } catch (err) {
    // Silent failure
    console.debug("[RSI] logSpecialistRunComplete exception:", err);
  }
}

export async function logSpecialistRunError(
  runId: string,
  errorText: string,
  latencyMs: number
): Promise<void> {
  const client = getRSIClient();
  if (!client || !runId) return;

  try {
    const { error } = await client
      .from("specialist_runs")
      .update({
        error_text: errorText,
        latency_ms: latencyMs,
        updated_at: new Date().toISOString(),
      })
      .eq("run_id", runId);

    if (error) {
      console.debug("[RSI] logSpecialistRunError error:", error);
    }
  } catch (err) {
    // Silent failure
    console.debug("[RSI] logSpecialistRunError exception:", err);
  }
}

export async function logUserEditOnRun(
  runId: string,
  editJson: Record<string, unknown>
): Promise<void> {
  const client = getRSIClient();
  if (!client || !runId) return;

  try {
    const { error } = await client
      .from("specialist_runs")
      .update({
        user_edits_json: editJson as any,
        updated_at: new Date().toISOString(),
      })
      .eq("run_id", runId);

    if (error) {
      console.debug("[RSI] logUserEditOnRun error:", error);
    }
  } catch (err) {
    console.debug("[RSI] logUserEditOnRun exception:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BROKER QUERY LOGGING
// ─────────────────────────────────────────────────────────────────────────────

export interface BrokerQueryLog {
  query_text: string;
  kinds: string[];
  context_json?: unknown;
  response_json?: unknown;
  total_found?: number;
  latency_ms?: number;
  sources?: string[];
  warnings?: string[];
}

export async function logBrokerQuery(log: BrokerQueryLog): Promise<void> {
  const client = getRSIClient();
  if (!client) return;

  try {
    const { error } = await client.from("broker_queries").insert({
      query_text: log.query_text,
      kinds: log.kinds,
      context_json: (log.context_json || null) as any,
      response_json: (log.response_json || null) as any,
      total_found: log.total_found || null,
      latency_ms: log.latency_ms || null,
      sources: log.sources || null,
      warnings: log.warnings || null,
    });

    if (error) {
      console.debug("[RSI] logBrokerQuery error:", error);
    }
  } catch (err) {
    // Silent failure
    console.debug("[RSI] logBrokerQuery exception:", err);
  }
}
