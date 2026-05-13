// Builder's Knowledge Garden — Twilio Inbound Webhook (Brief 2)
//
// POST /api/v1/twilio/inbound
//
// Twilio posts `application/x-www-form-urlencoded` here when an SMS arrives.
// We:
//   1. Verify the X-Twilio-Signature header (when TWILIO_AUTH_TOKEN is set).
//      In dev mode (no token), we accept everything and log a warning.
//   2. Match the `From` phone number to an existing crm_contact. If no
//      match, create a new contact with source='sms' + name='Unknown from
//      <phone>'.
//   3. Insert a row into crm_messages with direction='inbound',
//      channel='sms', status='received'.
//   4. Return an empty TwiML response (no auto-reply — the contractor
//      drafts via UI).
//
// We deliberately do NOT call the draft-reply specialist from this
// webhook. The contractor's tap is the authority. Twilio replays the
// webhook on failure, so doing LLM work here would risk runaway costs.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function twimlResponse(status = 200): NextResponse {
  return new NextResponse(EMPTY_TWIML, {
    status,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
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

/**
 * Verify the X-Twilio-Signature header per
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * Returns true if either:
 *   - signature is valid for the given URL + params, OR
 *   - TWILIO_AUTH_TOKEN is missing (dev mode — caller logs a warning)
 */
function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return true; // dev mode
  }
  if (!signature) return false;

  // Algorithm: concatenate URL + sorted params (key+value, no separator),
  // then HMAC-SHA1 with the auth token as key, then base64-encode.
  const sortedKeys = Object.keys(params).sort();
  const data =
    url +
    sortedKeys.reduce((acc, k) => acc + k + params[k], '');
  const expected = createHmac('sha1', authToken).update(data).digest('base64');
  // Constant-time compare not strictly necessary here since this is a
  // signature check on an HMAC, but use a length check at minimum.
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

interface FormParams {
  [key: string]: string;
}

async function parseTwilioForm(request: NextRequest): Promise<FormParams> {
  const params: FormParams = {};
  try {
    const form = await request.formData();
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') params[key] = value;
    }
  } catch (err) {
    console.warn('[twilio/inbound] form parse failed:', err);
  }
  return params;
}

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, '');
}

// ─── POST ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const params = await parseTwilioForm(request);
  const signature = request.headers.get('x-twilio-signature');

  // Build the URL Twilio would have signed: scheme + host + path. Vercel
  // sometimes places the public host in forwarded headers.
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const url = `${proto}://${host}${request.nextUrl.pathname}`;

  if (!verifyTwilioSignature(url, params, signature)) {
    console.warn('[twilio/inbound] signature mismatch — rejecting');
    return twimlResponse(403);
  }
  if (!process.env.TWILIO_AUTH_TOKEN) {
    console.warn('[twilio/inbound] TWILIO_AUTH_TOKEN missing — accepting in dev mode.');
  }

  const from = params['From'] ?? '';
  const to = params['To'] ?? '';
  const messageBody = params['Body'] ?? '';
  const messageSid = params['MessageSid'] ?? params['SmsMessageSid'] ?? '';

  if (!from || !messageSid) {
    console.warn('[twilio/inbound] missing From / MessageSid', params);
    return twimlResponse(200); // ack so Twilio doesn't retry forever
  }

  const admin = getAdminClient();
  if (!admin) {
    console.warn('[twilio/inbound] Supabase not configured — dropping inbound');
    return twimlResponse(200);
  }

  try {
    const normFrom = normalizePhone(from);

    // 1. Match an existing contact by phone.
    let contactId: string | null = null;
    {
      const { data } = await admin
        .from('crm_contacts')
        .select('id')
        .or(`phone.eq.${normFrom},phone.eq.${from}`)
        .limit(1);
      if (Array.isArray(data) && data.length > 0) {
        contactId = (data[0] as { id: string }).id;
      }
    }

    // 2. Create a new contact if no match.
    if (!contactId) {
      const insertRow = {
        org_id: null,
        project_id: null,
        first_name: 'Unknown',
        last_name: null,
        company: null,
        email: null,
        phone: from,
        contact_type: 'lead',
        stage: 'new',
        temperature: 'warm',
        lane: 'homeowner',
        lifecycle_stage: 'lead',
        project_type: null,
        project_location: null,
        estimated_value: null,
        lead_score: 25,
        notes: `First contact via SMS: ${messageBody.slice(0, 200)}`,
        tags: ['sms-inbound'],
        jsonld: null as unknown,
        source: 'sms',
        confidence: 0,
        time_machine_handle: crypto.randomUUID(),
        last_contact_at: new Date().toISOString(),
      };
      const insertWithName = {
        ...insertRow,
        first_name: 'Unknown',
        notes: `Unknown from ${from} — first SMS: ${messageBody.slice(0, 200)}`,
      };
      // Note: the column is `first_name`, so the human-readable label
      // "Unknown from <phone>" is encoded by setting last_name to the
      // bracketed phone — keeps the existing contact-card render readable.
      const { data, error } = await admin
        .from('crm_contacts')
        .insert({ ...insertWithName, last_name: `from ${from}` })
        .select('id')
        .single();
      if (error || !data) {
        console.error('[twilio/inbound] contact create failed:', error?.message);
        // Still ack the webhook so Twilio doesn't replay endlessly.
        return twimlResponse(200);
      }
      contactId = (data as { id: string }).id;
    } else {
      // Touch the contact so it sorts to top of inbox.
      await admin
        .from('crm_contacts')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('id', contactId);
    }

    // 3. Insert the inbound message.
    const timeMachineHandle = crypto.randomUUID();
    await admin.from('crm_messages').insert({
      contact_id: contactId,
      direction: 'inbound',
      channel: 'sms',
      body: messageBody,
      ai_drafted: false,
      status: 'received',
      time_machine_handle: timeMachineHandle,
      external_from: from,
      external_to: to,
      external_message_id: messageSid,
    });

    return twimlResponse(200);
  } catch (err) {
    console.error('[twilio/inbound] error:', err);
    // Still 200 — Twilio replays 5xx aggressively.
    return twimlResponse(200);
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
