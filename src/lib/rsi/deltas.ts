// RSI Deltas Module
// Proposes, approves, and applies improvements to prompts, entities, and amendments

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

export interface DeltaRow {
  id: string;
  status: 'proposed' | 'approved' | 'rejected' | 'applied';
  kind: 'prompt_patch' | 'entity_add' | 'entity_update' | 'amendment_add' | 'specialist_tool_tweak';
  target: string;
  rationale: string;
  diff_preview?: string | null;
  patch?: Record<string, unknown> | null;
  source_feedback_ids?: string[] | null;
  created_at: string;
  applied_at?: string | null;
  reviewer?: string | null;
  review_notes?: string | null;
}

/**
 * Propose a new delta based on feedback clusters.
 * Returns the delta ID for tracking.
 */
export async function proposeDelta(input: {
  kind: 'prompt_patch' | 'entity_add' | 'entity_update' | 'amendment_add' | 'specialist_tool_tweak';
  target: string;
  rationale: string;
  diffPreview: string;
  patch: Record<string, unknown>;
  sourceFeedbackIds: string[];
}): Promise<{ id: string }> {
  const client = getRSIClient();
  if (!client) {
    return { id: '' };
  }

  try {
    const { data, error } = await client
      .from('rsi_deltas')
      .insert({
        kind: input.kind,
        target: input.target,
        rationale: input.rationale,
        diff_preview: input.diffPreview,
        patch: input.patch as any,
        source_feedback_ids: input.sourceFeedbackIds,
        status: 'proposed',
      })
      .select('id')
      .single();

    if (error || !data) {
      console.debug('[RSI Deltas] proposeDelta error:', error);
      return { id: '' };
    }

    return { id: (data as { id: string }).id };
  } catch (err) {
    console.debug('[RSI Deltas] proposeDelta exception:', err);
    return { id: '' };
  }
}

/**
 * List deltas by status (or all if status undefined).
 */
export async function listDeltas(status?: 'proposed' | 'approved' | 'rejected' | 'applied'): Promise<DeltaRow[]> {
  const client = getRSIClient();
  if (!client) {
    return [];
  }

  try {
    let query = client
      .from('rsi_deltas')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.debug('[RSI Deltas] listDeltas error:', error);
      return [];
    }

    return (data || []) as DeltaRow[];
  } catch (err) {
    console.debug('[RSI Deltas] listDeltas exception:', err);
    return [];
  }
}

/**
 * Approve a delta for application. Updates status to 'approved'.
 */
export async function approveDelta(id: string, reviewer: string): Promise<void> {
  const client = getRSIClient();
  if (!client) return;

  try {
    const { error } = await client
      .from('rsi_deltas')
      .update({
        status: 'approved',
        reviewer,
      })
      .eq('id', id);

    if (error) {
      console.debug('[RSI Deltas] approveDelta error:', error);
    }
  } catch (err) {
    console.debug('[RSI Deltas] approveDelta exception:', err);
  }
}

/**
 * Apply a delta to the codebase.
 * Dispatches to kind-specific applier and marks as 'applied'.
 */
export async function applyDelta(id: string): Promise<void> {
  const client = getRSIClient();
  if (!client) return;

  try {
    // Fetch the delta
    const { data, error: fetchError } = await client
      .from('rsi_deltas')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !data) {
      console.debug('[RSI Deltas] applyDelta fetch error:', fetchError);
      return;
    }

    const delta = data as DeltaRow;

    // Dispatch based on kind
    switch (delta.kind) {
      case 'prompt_patch':
        await applyPromptPatch(delta);
        break;
      case 'entity_add':
        await applyEntityAdd(delta);
        break;
      case 'entity_update':
        await applyEntityUpdate(delta);
        break;
      case 'amendment_add':
        await applyAmendmentAdd(delta);
        break;
      case 'specialist_tool_tweak':
        await applySpecialistToolTweak(delta);
        break;
    }

    // Mark delta as applied
    const { error: updateError } = await client
      .from('rsi_deltas')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.debug('[RSI Deltas] applyDelta update error:', updateError);
    }
  } catch (err) {
    console.debug('[RSI Deltas] applyDelta exception:', err);
  }
}

/**
 * Apply a prompt patch delta.
 * Updates the prompt file at delta.target with delta.patch content.
 */
async function applyPromptPatch(delta: DeltaRow): Promise<void> {
  // Implementation stub: would write to docs/ai-prompts/{target}
  // For now, log the intent
  console.debug('[RSI] Applying prompt patch to', delta.target, 'patch:', delta.patch);
}

/**
 * Apply an entity add delta.
 * Inserts new entity into BKG database.
 */
async function applyEntityAdd(delta: DeltaRow): Promise<void> {
  // Implementation stub: would insert into code_entities table
  console.debug('[RSI] Applying entity add:', delta.target, 'patch:', delta.patch);
}

/**
 * Apply an entity update delta.
 * Updates existing entity in BKG database.
 */
async function applyEntityUpdate(delta: DeltaRow): Promise<void> {
  // Implementation stub: would update code_entities table
  console.debug('[RSI] Applying entity update:', delta.target, 'patch:', delta.patch);
}

/**
 * Apply an amendment add delta.
 * Writes to data/amendments/{jurisdiction}.json.
 */
async function applyAmendmentAdd(delta: DeltaRow): Promise<void> {
  // Implementation stub: would write to data/amendments/
  // This is the cross-domain write that's gated behind human approval
  console.debug('[RSI] Applying amendment add:', delta.target, 'patch:', delta.patch);
}

/**
 * Apply a specialist tool tweak delta.
 * Modifies resource broker or specialist configuration.
 */
async function applySpecialistToolTweak(delta: DeltaRow): Promise<void> {
  // Implementation stub: would modify specialist config or resource broker
  console.debug('[RSI] Applying specialist tool tweak:', delta.target, 'patch:', delta.patch);
}
