// Builder's Knowledge Garden — CRM Messages Undo Route (Brief 2)
//
// POST /api/v1/crm/messages/undo
// Body: { messageId }
//
// If the row is `queued` AND queued_until > now, flip to `undone`.
// Otherwise, return ok:false + reason='undo-window-expired'.
//
// The Time Machine primitive made visible: the 90s window is the only
// trust contract between Send and Sent.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface PostBody {
  messageId?: string;
}

interface MessageRow {
  id: string;
  status: string;
  queued_until: string | null;
  time_machine_handle: string | null;
}

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

  if (!body.messageId) {
    return NextResponse.json(
      { error: 'validation_failed', message: 'messageId is required' },
      { status: 400 }
    );
  }

  const admin = getAdminClient();

  // No DB: optimistically accept (demo / preview).
  if (!admin) {
    return NextResponse.json(
      {
        ok: true,
        messageId: body.messageId,
        timeMachineHandle: crypto.randomUUID(),
        ephemeral: true,
      },
      { status: 200 }
    );
  }

  try {
    const { data, error } = await admin
      .from('crm_messages')
      .select('id, status, queued_until, time_machine_handle')
      .eq('id', body.messageId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'not_found', message: 'message not found' },
        { status: 404 }
      );
    }

    const row = data as MessageRow;
    if (row.status !== 'queued') {
      return NextResponse.json(
        {
          ok: false,
          reason: 'undo-window-expired',
          detail: `message status is ${row.status}, not queued`,
        },
        { status: 409 }
      );
    }
    const queuedUntilMs = row.queued_until ? Date.parse(row.queued_until) : 0;
    if (!queuedUntilMs || queuedUntilMs <= Date.now()) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'undo-window-expired',
          detail: 'past the queued_until timestamp',
        },
        { status: 409 }
      );
    }

    const { data: updated, error: updErr } = await admin
      .from('crm_messages')
      .update({ status: 'undone' })
      .eq('id', body.messageId)
      .eq('status', 'queued') // optimistic guard
      .select('id')
      .single();
    if (updErr || !updated) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'undo-window-expired',
          detail: updErr?.message ?? 'race lost',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        messageId: updated.id as string,
        timeMachineHandle: row.time_machine_handle ?? crypto.randomUUID(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[crm/messages/undo] error:', err);
    return NextResponse.json(
      {
        ok: false,
        reason: 'send-failed',
        detail: err instanceof Error ? err.message : 'unknown',
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
