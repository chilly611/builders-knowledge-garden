// Builder's Knowledge Garden — CRM Messages Draft Route (Brief 2)
//
// POST /api/v1/crm/messages/draft
// Body: { contactId, inboundMessageId, tone? }
//
// Loads the contact + last 10 messages + the contractor's voice
// fingerprint, runs the `draft-reply` specialist, inserts a new
// outbound message row with status='drafted', ai_drafted=true, and
// the reasoning trace stored on `ai_reasoning_trace`.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  logSpecialistRunStart,
  logSpecialistRunComplete,
  logSpecialistRunError,
} from '@/lib/rsi-instrumentation';
import { generateDraftReply, type DraftReplyContext } from '@/lib/crm/draft-reply';
import {
  getOrBuildVoiceFingerprint,
  defaultFingerprint,
} from '@/lib/crm/voice-fingerprint';

interface PostBody {
  contactId?: string;
  inboundMessageId?: string;
  tone?: 'warm' | 'professional' | 'brief' | 'custom';
  projectId?: string;
  // For demo/testing only — caller may pass userId; in prod this would
  // come from the session.
  userId?: string;
}

interface MessageHistoryRow {
  direction: 'inbound' | 'outbound';
  body: string;
  created_at: string;
}

interface ContactRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  lifecycle_stage: string | null;
}

interface InboundRow {
  id: string;
  body: string;
  contact_id: string | null;
}

// ─── Supabase admin client ────────────────────────────────────────────────

let adminClient: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (adminClient) return adminClient;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || url.includes('placeholder')) return null;
  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

// ─── POST ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.contactId || !body.inboundMessageId) {
    return NextResponse.json(
      {
        error: 'validation_failed',
        message: 'contactId and inboundMessageId are required',
      },
      { status: 400 }
    );
  }

  const userId = body.userId ?? 'default-user';
  const workflowId = 'quick-reply';
  const stepId = 'draft';

  const runId = await logSpecialistRunStart({
    workflow_id: workflowId,
    step_id: stepId,
    specialist_id: 'draft-reply',
    prompt_version: 'v1',
    input_json: {
      contactId: body.contactId,
      inboundMessageId: body.inboundMessageId,
      tone: body.tone,
    } as unknown,
  });
  const startedAt = Date.now();

  try {
    const admin = getAdminClient();
    const timeMachineHandle = crypto.randomUUID();

    // 1. Load inbound, contact, history, voice fingerprint.
    let inbound: InboundRow | null = null;
    let contact: ContactRow | null = null;
    let history: MessageHistoryRow[] = [];

    if (admin) {
      const { data: inboundData } = await admin
        .from('crm_messages')
        .select('id, body, contact_id')
        .eq('id', body.inboundMessageId)
        .single();
      inbound = (inboundData as InboundRow) ?? null;

      const { data: contactData } = await admin
        .from('crm_contacts')
        .select('id, first_name, last_name, lifecycle_stage')
        .eq('id', body.contactId)
        .single();
      contact = (contactData as ContactRow) ?? null;

      const { data: historyData } = await admin
        .from('crm_messages')
        .select('direction, body, created_at')
        .eq('contact_id', body.contactId)
        .order('created_at', { ascending: false })
        .limit(10);
      history = (historyData as MessageHistoryRow[] | null) ?? [];
    }

    if (!inbound) {
      // Allow demo mode: use the inboundMessageId as a synthetic body so the
      // route still works against an empty DB.
      inbound = {
        id: body.inboundMessageId,
        body: 'Hey, are you available this week?',
        contact_id: body.contactId,
      };
    }
    if (!contact) {
      contact = {
        id: body.contactId,
        first_name: 'Unknown',
        last_name: null,
        lifecycle_stage: 'lead',
      };
    }

    const fingerprint = admin
      ? await getOrBuildVoiceFingerprint(userId)
      : defaultFingerprint(userId);

    // 2. Run the specialist.
    const ctx: DraftReplyContext = {
      contactId: body.contactId,
      inboundMessageId: body.inboundMessageId,
      inboundBody: inbound.body,
      contactName:
        [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim() ||
        undefined,
      contactLifecycleStage: contact.lifecycle_stage ?? undefined,
      contactHistory: history
        .slice()
        .reverse()
        .map((h) => ({
          direction: h.direction,
          body: h.body,
          createdAt: h.created_at,
        })),
      voiceFingerprint: fingerprint,
      tone: body.tone,
      projectId: body.projectId,
    };

    const draft = await generateDraftReply(ctx);

    // 3. Insert the drafted message row.
    let draftMessageId: string;

    if (admin) {
      const insertRow = {
        contact_id: body.contactId,
        direction: 'outbound' as const,
        channel: 'sms' as const,
        body: draft.body,
        ai_drafted: true,
        ai_tone: draft.toneUsed,
        status: 'drafted' as const,
        time_machine_handle: timeMachineHandle,
        ai_reasoning_trace: {
          reasoning: draft.reasoning,
          tone_used: draft.toneUsed,
          voice_match_score: draft.voiceMatchScore,
          contains_commitment: draft.containsCommitment,
          contains_price: draft.containsPrice,
          suggested_send_delay_ms: draft.suggestedSendDelayMs,
          intent_tags: draft.intentTags,
          inbound_message_id: body.inboundMessageId,
        },
      };
      const { data: inserted, error: insertErr } = await admin
        .from('crm_messages')
        .insert(insertRow)
        .select('id')
        .single();
      if (insertErr || !inserted) {
        throw new Error(
          `crm_messages insert failed: ${insertErr?.message ?? 'unknown'}`
        );
      }
      draftMessageId = inserted.id as string;
    } else {
      // Ephemeral
      draftMessageId = crypto.randomUUID();
    }

    const latency = Date.now() - startedAt;
    if (runId) {
      await logSpecialistRunComplete(
        runId,
        {
          narrative: draft.body,
          structured: {
            reasoning: draft.reasoning,
            tone_used: draft.toneUsed,
            voice_match_score: draft.voiceMatchScore,
            contains_commitment: draft.containsCommitment,
            contains_price: draft.containsPrice,
            suggested_send_delay_ms: draft.suggestedSendDelayMs,
            intent_tags: draft.intentTags,
          },
          citations: [],
          confidence:
            draft.voiceMatchScore > 0.7
              ? 'high'
              : draft.voiceMatchScore > 0.4
                ? 'medium'
                : 'low',
          raw_response: draft.rawResponse,
          model: process.env.ANTHROPIC_API_KEY
            ? 'claude-sonnet-4-20250514'
            : 'mock',
          latency_ms: latency,
          promptVersion: 'v1',
        },
        latency
      );
    }

    return NextResponse.json(
      {
        ok: true,
        draftMessageId,
        body: draft.body,
        reasoning: draft.reasoning,
        toneUsed: draft.toneUsed,
        voiceMatchScore: draft.voiceMatchScore,
        containsCommitment: draft.containsCommitment,
        containsPrice: draft.containsPrice,
        suggestedSendDelayMs: draft.suggestedSendDelayMs,
        intentTags: draft.intentTags,
        timeMachineHandle,
        _run_id: runId,
      },
      { status: 200 }
    );
  } catch (err) {
    const latency = Date.now() - startedAt;
    const msg = err instanceof Error ? err.message : String(err);
    if (runId) {
      await logSpecialistRunError(runId, msg, latency);
    }
    console.error('[crm/messages/draft] error:', err);
    return NextResponse.json(
      {
        error: 'draft_failed',
        message: 'The reply could not be drafted',
        _run_id: runId,
      },
      { status: 500 }
    );
  }
}

// ─── 405s ─────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
export async function PUT(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
