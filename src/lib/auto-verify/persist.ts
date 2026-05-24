/**
 * AUTO-VERIFY persistence (2026-05-25)
 * ====================================
 *
 * Stamps one row's auto_verified_* trio + notes JSONB. Uses the
 * service-role client because the batch worker runs unattended (no user
 * JWT). The audit trigger still fires (it's AFTER UPDATE row-level) but
 * audit_log.changed_by will be NULL for these rows — that's OK and
 * deliberately distinct from manual attestations where changed_by is the
 * reviewer's auth.uid().
 *
 * Decision matrix from CrossCheckVerdict:
 *
 *   verdict.confidence < STAMP_THRESHOLD  -> SKIP — don't stamp; leave for human
 *   verdict.clean                          -> stamp + flagged=false (yellow tick)
 *   else                                   -> stamp + flagged=true (needs human)
 */

import { createClient } from "@supabase/supabase-js";
import {
  CROSS_CHECK_MODEL,
  PROMPT_VERSION,
  STAMP_THRESHOLD,
  type CrossCheckVerdict,
} from "./cross-check";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role";

export type PersistDecision = "stamped_clean" | "stamped_flagged" | "skipped";

export interface PersistResult {
  id: string;
  decision: PersistDecision;
  confidence: number;
  discrepancies: string[];
  error?: string;
}

function service() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Stamp the trio on one row. If the verdict is below STAMP_THRESHOLD
 * we return "skipped" without writing — the row stays untouched.
 */
export async function persistVerdict(
  id: string,
  verdict: CrossCheckVerdict
): Promise<PersistResult> {
  if (verdict.confidence < STAMP_THRESHOLD && !verdict.flagged) {
    return {
      id,
      decision: "skipped",
      confidence: verdict.confidence,
      discrepancies: verdict.discrepancies,
    };
  }

  const notes = {
    discrepancies: verdict.discrepancies,
    rationale: verdict.rationale,
    model_response: verdict.model_response.slice(0, 4000),
    prompt_hash: verdict.prompt_hash,
    prompt_version: PROMPT_VERSION,
    ran_at: verdict.ran_at,
    checkable: verdict.checkable,
  };

  const decision: PersistDecision = verdict.clean
    ? "stamped_clean"
    : "stamped_flagged";

  const { error } = await service()
    .from("knowledge_entities")
    .update({
      auto_verified_at: verdict.ran_at,
      auto_verified_by: verdict.model || CROSS_CHECK_MODEL,
      auto_verified_source: "claude-cross-check",
      auto_verification_confidence: Number(verdict.confidence.toFixed(2)),
      auto_verification_notes: notes,
      auto_verification_flagged: !verdict.clean,
    })
    .eq("id", id);

  if (error) {
    return {
      id,
      decision: "skipped",
      confidence: verdict.confidence,
      discrepancies: verdict.discrepancies,
      error: error.message,
    };
  }

  return {
    id,
    decision,
    confidence: verdict.confidence,
    discrepancies: verdict.discrepancies,
  };
}

/**
 * Fetch a chunk of rows that still need auto-verification.
 * Order: deterministic (by id ASC) so a re-runnable cursor is just the
 * last id we processed.
 */
export async function fetchChunk(
  cursorId: string | null,
  limit: number
): Promise<
  Array<{
    id: string;
    slug: string;
    entity_type: string;
    title: { en?: string } | string | null;
    summary: { en?: string } | string | null;
    jurisdiction_ids: string[] | null;
    source_urls: string[] | null;
    metadata: Record<string, unknown> | null;
  }>
> {
  let query = service()
    .from("knowledge_entities")
    .select(
      "id, slug, entity_type, title, summary, jurisdiction_ids, source_urls, metadata"
    )
    .eq("status", "published")
    .is("auto_verified_at", null)
    .order("id", { ascending: true })
    .limit(limit);

  if (cursorId) {
    query = query.gt("id", cursorId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`fetchChunk_failed: ${error.message}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any;
}
