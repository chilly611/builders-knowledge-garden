// Builder's Knowledge Garden — CRM Outbound Flush Cron (Brief 2, v1.1)
// GET /api/v1/cron/crm-send-flush — runs every minute via Vercel cron.
//
// Flow:
//   1. SELECT crm_messages WHERE direction='outbound' AND status='queued' AND queued_until <= now()
//   2. For each: POST to Twilio Messages API with basic auth
//   3. On 2xx → UPDATE status='sent', sent_at=now(), external_message_id=<MessageSid>
//   4. On 4xx/5xx → UPDATE status='failed', failed_reason=<error_body>
//
// Auth: requires `Authorization: Bearer <CRON_SECRET>` header OR `x-vercel-cron: 1`.
// Vercel automatically attaches the latter for crons defined in vercel.json.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';
const MAX_BATCH = 50; // per cron tick — keeps cold-start budget reasonable

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

interface QueuedMessageRow {
  id: string;
  contact_id: string | null;
  body: string;
  external_to: string | null;
  time_machine_handle: string;
}

interface TwilioSendResponse {
  sid?: string;
  status?: string;
  error_code?: number | null;
  error_message?: string | null;
  to?: string;
  from?: string;
}

async function sendOneViaTwilio(
  body: string,
  to: string,
  from: string,
  sid: string,
  authToken: string,
): Promise<{ ok: boolean; messageSid?: string; error?: string }> {
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const auth = Buffer.from(`${sid}:${authToken}`).toString('base64');

  try {
    const res = await fetch(`${TWILIO_API_BASE}/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const data = (await res.json()) as TwilioSendResponse;
    if (!res.ok) {
      return {
        ok: false,
        error: `Twilio ${res.status}: ${data.error_message ?? 'unknown'}`,
      };
    }
    return { ok: true, messageSid: data.sid };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'network',
    };
  }
}

function isAuthorized(request: NextRequest): boolean {
  // Vercel attaches this header for cron invocations.
  if (request.headers.get('x-vercel-cron') === '1') return true;
  // Manual / external trigger requires CRON_SECRET match.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // dev mode — allow anything when no secret configured
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !authToken || !fromNumber) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: 'twilio_env_missing', processed: 0 },
      { status: 200 },
    );
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: 'supabase_env_missing', processed: 0 },
      { status: 200 },
    );
  }

  const nowIso = new Date().toISOString();

  // 1. Pick up queued messages whose 90s undo window has expired.
  const { data: queuedRows, error: selErr } = await admin
    .from('crm_messages')
    .select('id, contact_id, body, external_to, time_machine_handle')
    .eq('direction', 'outbound')
    .eq('status', 'queued')
    .lte('queued_until', nowIso)
    .order('queued_until', { ascending: true })
    .limit(MAX_BATCH);

  if (selErr) {
    return NextResponse.json(
      { ok: false, error: 'select_failed', detail: selErr.message },
      { status: 500 },
    );
  }
  const queued = (queuedRows ?? []) as QueuedMessageRow[];

  const results: Array<{ id: string; ok: boolean; sid?: string; error?: string }> = [];

  for (const msg of queued) {
    // Resolve the destination phone. Either external_to is set OR fetch the contact's phone.
    let to = msg.external_to;
    if (!to && msg.contact_id) {
      const { data } = await admin
        .from('crm_contacts')
        .select('phone')
        .eq('id', msg.contact_id)
        .limit(1)
        .maybeSingle();
      const phone = (data as { phone: string | null } | null)?.phone ?? null;
      to = phone;
    }
    if (!to) {
      await admin
        .from('crm_messages')
        .update({
          status: 'failed',
          failed_reason: 'no destination phone on contact',
          updated_at: new Date().toISOString(),
        })
        .eq('id', msg.id);
      results.push({ id: msg.id, ok: false, error: 'no destination phone' });
      continue;
    }

    const send = await sendOneViaTwilio(msg.body, to, fromNumber, sid, authToken);
    if (send.ok) {
      await admin
        .from('crm_messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          external_to: to,
          external_message_id: send.messageSid ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', msg.id);
      results.push({ id: msg.id, ok: true, sid: send.messageSid });
    } else {
      await admin
        .from('crm_messages')
        .update({
          status: 'failed',
          failed_reason: send.error ?? 'unknown',
          updated_at: new Date().toISOString(),
        })
        .eq('id', msg.id);
      results.push({ id: msg.id, ok: false, error: send.error });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
    cycledAt: nowIso,
  });
}

// 405 for everything else
export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
export async function PUT(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
