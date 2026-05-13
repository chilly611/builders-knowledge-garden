// Builder's Knowledge Garden — CRM Messages Send Route (Brief 2)
//
// POST /api/v1/crm/messages/send
// Body: { draftMessageId, body? }
//
// Flips a `drafted` row to `queued` with `queued_until = now + 90s`. The
// row stays `queued` until either:
//   (a) the contractor taps Undo within the window → status='undone'.
//   (b) a future cron / Twilio dispatch job flushes the row → status='sent'.
//
// v1 deliberately does NOT call Twilio here. Real send arrives when the
// dispatcher cron lands; until then, the queued state IS the user-visible
// Time Machine primitive ("Sending in 90s — Undo").

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface PostBody {
  draftMessageId?: string;
  body?: string; // optional override if the contractor edited the draft
}

interface MessageRow {
  id: string;
  contact_id: string | null;
  direction: 'inbound' | 'outbound';
  status:
    | 'received'
    | 'drafted'
    | 'queued'
    | 'sent'
    | 'delivered'
    | 'failed'
    | 'undone'
    | 'read';
  body: string;
  ai_drafted: boolean | null;
  time_machine_handle: string | null;
}

const UNDO_WINDOW_MS = 90 * 1000;

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.draftMessageId) {
    return NextResponse.json(
      { error: 'validation_failed', message: 'draftMessageId is required' },
      { status: 400 }
    );
  }

  const queuedUntil = new Date(Date.now() + UNDO_WINDOW_MS).toISOString();
  const admin = getAdminClient();

  if (!admin) {
    // Ephemeral fallback so the demo flow still works.
    return NextResponse.json(
      {
        ok: true,
        messageId: body.draftMessageId,
        timeMachineHandle: crypto.randomUUID(),
        queuedUntil,
        ephemeral: true,
      },
      { status: 200 }
    );
  }

  try {
    // 1. Load the current row to validate state.
    const { data: existing, error: loadErr } = await admin
      .from('crm_messages')
      .select('id, contact_id, direction, status, body, ai_drafted, time_machine_handle')
      .eq('id', body.draftMessageId)
      .single();

    if (loadErr || !existing) {
      return NextResponse.json(
        { error: 'not_found', message: 'draft message not found' },
        { status: 404 }
      );
    }

    const row = existing as MessageRow;
    if (row.direction !== 'outbound') {
      return NextResponse.json(
        { error: 'validation_failed', message: 'message is not outbound' },
        { status: 400 }
      );
    }
    if (row.status !== 'drafted') {
      return NextResponse.json(
        {
          error: 'invalid_state',
          message: `message is already ${row.status}, cannot send`,
        },
        { status: 409 }
      );
    }

    // 2. Determine body — override wins, else use stored draft.
    const finalBody =
      typeof body.body === 'string' && body.body.trim().length > 0
        ? body.body.trim()
        : row.body;
    // If the contractor edited the body, it's no longer purely AI-drafted.
    const aiDrafted =
      typeof body.body === 'string' && body.body.trim() !== row.body
        ? false
        : (row.ai_drafted ?? true);

    const timeMachineHandle = row.time_machine_handle ?? crypto.randomUUID();

    const { data: updated, error: updErr } = await admin
      .from('crm_messages')
      .update({
        body: finalBody,
        ai_drafted: aiDrafted,
        status: 'queued',
        queued_until: queuedUntil,
        time_machine_handle: timeMachineHandle,
      })
      .eq('id', body.draftMessageId)
      .select('id')
      .single();

    if (updErr || !updated) {
      console.error('[crm/messages/send] update failed:', updErr?.message);
      return NextResponse.json(
        {
          error: 'send_failed',
          message: updErr?.message ?? 'update failed',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        messageId: updated.id as string,
        timeMachineHandle,
        queuedUntil,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[crm/messages/send] error:', err);
    return NextResponse.json(
      {
        error: 'send_failed',
        message: err instanceof Error ? err.message : 'unknown',
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
