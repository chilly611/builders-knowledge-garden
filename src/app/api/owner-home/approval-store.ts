/**
 * Owner-approval persistence — the durable half of the Owner Lane core loop.
 *
 * NO SCHEMA CHANGE: this reuses the existing `project_change_orders` table.
 * The framing pay-app the Owner sees in "Needs you" is gated under the
 * `change_orders` Lens category (see /api/owner-home), so modeling its approval
 * as a change-order row whose `status` tracks the lifecycle is consistent with
 * how the read path already treats it. A stable `description` marker identifies
 * THE framing-approval row per project so the read path and the write path
 * always agree on the same row.
 *
 * Lifecycle values come from the table's CHECK constraint
 * (pm_modules.sql): status ∈ proposed|under_review|approved|executed|rejected,
 * reason ∈ owner_request|field_condition|code_requirement|design_error.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Stable marker stored in project_change_orders.description for THE framing pay-app.
 * Intentionally carries NO sub name: a DB sentinel must stay stable across seed
 * edits, so it mirrors the seed's pending-approval *title* (which is name-free),
 * not the framing sub. The sub name shown to the owner is sourced separately
 * from the seed (MARIN_FRAMING_SUB).
 */
export const FRAMING_APPROVAL_MARKER =
  'OWNER-APPROVAL · Pay Application #4 — Framing milestone';

/** Dollar amount in scope for the framing pay-app (mirrors the Marin seed). */
export const FRAMING_APPROVAL_AMOUNT = 48_200;

export type ApprovalState = 'pending' | 'approved';

/**
 * Read whether the framing pay-app has been approved for this project.
 * Fail-closed: any error or missing row → 'pending' (not yet approved).
 */
export async function readFramingApprovalStatus(
  db: SupabaseClient,
  projectId: string,
): Promise<ApprovalState> {
  const { data, error } = await db
    .from('project_change_orders')
    .select('status')
    .eq('project_id', projectId)
    .eq('description', FRAMING_APPROVAL_MARKER)
    .maybeSingle();

  if (error || !data) return 'pending';
  return data.status === 'approved' ? 'approved' : 'pending';
}

export type SetApprovalResult =
  | { ok: true; status: ApprovalState }
  | { ok: false; error: string };

/**
 * Persist the owner's decision on the framing pay-app. Idempotent: upserts the
 * single marker row for this project (UPDATE if present, INSERT otherwise) so
 * repeated approve clicks never create duplicate rows.
 *
 * `approve=false` reverts the row to 'proposed' (the table's pre-approval
 * status) so an Undo round-trips cleanly without deleting rows.
 */
export async function setFramingApprovalStatus(
  db: SupabaseClient,
  projectId: string,
  approve: boolean,
): Promise<SetApprovalResult> {
  const status = approve ? 'approved' : 'proposed';

  const { data: existing, error: selErr } = await db
    .from('project_change_orders')
    .select('id')
    .eq('project_id', projectId)
    .eq('description', FRAMING_APPROVAL_MARKER)
    .maybeSingle();

  if (selErr) return { ok: false, error: selErr.message };

  if (existing?.id) {
    const { error } = await db
      .from('project_change_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await db.from('project_change_orders').insert([
      {
        project_id: projectId,
        description: FRAMING_APPROVAL_MARKER,
        reason: 'owner_request',
        cost_impact: FRAMING_APPROVAL_AMOUNT,
        schedule_impact_days: 0,
        status,
      },
    ]);
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true, status: approve ? 'approved' : 'pending' };
}
