/**
 * POST /api/v1/signatures/documenso-webhook
 * =========================================
 *
 * Documenso webhook receiver. NOT YET CONNECTED FROM DOCUMENSO'S SIDE
 * (the UI was finicky on 2026-05-24 night — connecting it via API is a
 * follow-up). The route exists so that the moment the webhook is wired
 * in app.documenso.com, the contract just works.
 *
 * Auth: Documenso sends a static secret in the Authorization header.
 *   Authorization: Bearer <DOCUMENSO_WEBHOOK_SECRET>
 * Some Documenso releases also send `X-Documenso-Signature` (HMAC of
 * the body using the same secret). We accept either format — see the
 * verifyWebhookAuth() helper below.
 *
 * Event payload (verified shape from documenso.com docs):
 *   {
 *     "event": "document.signed" | "document.completed" |
 *              "document.rejected" | "document.opened" | ...,
 *     "createdAt": "2026-05-24T...",
 *     "payload": {
 *       "id": 1349683,
 *       "status": "PENDING" | "COMPLETED" | "REJECTED" | ...,
 *       "recipients": [{ id, email, name, signingStatus, signedAt }]
 *     }
 *   }
 *
 * Actions:
 *   document.signed     → record a signature_events row for the
 *                         specific recipient that signed (if we don't
 *                         already have one).
 *   document.completed  → mark signed_documents.status='signed',
 *                         finalized_at=now().
 *   document.rejected   → mark signed_documents.status='rejected'.
 *
 * AUDIT: both signed_documents and signature_events have audit_log
 * triggers, so we don't log anything explicitly here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';

interface DocumensoWebhookRecipient {
  id?: number;
  recipientId?: number;
  email: string;
  name: string;
  signingStatus?: string;
  signedAt?: string;
}

interface DocumensoWebhookPayload {
  event: string;
  createdAt?: string;
  payload?: {
    id?: number;
    documentId?: number;
    status?: string;
    recipients?: DocumensoWebhookRecipient[];
  };
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Documenso supports two auth formats depending on version. Accept
 * either; reject anything else with a 401.
 *
 *   1. Bearer-token style (cloud, default):
 *        Authorization: Bearer <DOCUMENSO_WEBHOOK_SECRET>
 *
 *   2. HMAC-SHA256 of the raw body, hex-encoded:
 *        X-Documenso-Signature: <hex>
 */
function verifyWebhookAuth(request: NextRequest, rawBody: string): boolean {
  const secret = process.env.DOCUMENSO_WEBHOOK_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const expected = `Bearer ${secret}`;
    // timing-safe compare guards against substring-length leaks.
    try {
      const a = Buffer.from(authHeader);
      const b = Buffer.from(expected);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      // fall through
    }
    // Some installs send the raw secret without Bearer prefix.
    if (authHeader === secret) return true;
  }

  const sigHeader =
    request.headers.get('x-documenso-signature') ||
    request.headers.get('x-documenso-webhook-signature');
  if (sigHeader) {
    const computed = createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      const a = Buffer.from(sigHeader);
      const b = Buffer.from(computed);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      // fall through
    }
  }

  return false;
}

export async function POST(request: NextRequest) {
  // Read raw body once so we can both verify HMAC and parse JSON.
  const rawBody = await request.text();

  if (!verifyWebhookAuth(request, rawBody)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let event: DocumensoWebhookPayload;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const payload = event.payload || {};
  const documensoId = payload.id || payload.documentId;
  if (!documensoId) {
    return NextResponse.json({ error: 'missing document id' }, { status: 400 });
  }

  const sb = getServiceClient();
  const { data: row } = await sb
    .from('signed_documents')
    .select('*')
    .eq('documenso_document_id', documensoId)
    .single();

  if (!row) {
    // We don't recognise this envelope — ack anyway so Documenso
    // doesn't retry forever. Could be a test event or a row created
    // outside our system.
    return NextResponse.json({ ok: true, recognized: false });
  }

  const eventName = (event.event || '').toLowerCase();
  const update: Record<string, unknown> = {
    documenso_last_status: payload.status || row.documenso_last_status,
    documenso_last_synced_at: new Date().toISOString(),
  };

  // document.signed → per-recipient event. We record a signature_events
  // row for the signer that just signed (Documenso usually fires this
  // before document.completed, so the per-signer audit lands first).
  if (eventName === 'document.signed' && Array.isArray(payload.recipients)) {
    const { data: existing } = await sb
      .from('signature_events')
      .select('signer_email')
      .eq('signed_document_id', row.id);
    const haveEmails = new Set(
      (existing ?? [])
        .map((e: { signer_email: string | null }) => (e.signer_email || '').toLowerCase())
        .filter((s: string) => s.length > 0)
    );
    for (const r of payload.recipients) {
      if ((r.signingStatus || '').toUpperCase() !== 'SIGNED') continue;
      if (!r.email || haveEmails.has(r.email.toLowerCase())) continue;
      await sb.from('signature_events').insert({
        signed_document_id: row.id,
        signer_user_id: null,
        signer_role: 'signer',
        signer_name: r.name || r.email,
        signer_email: r.email,
        signature_method: 'documenso',
        signature_data: String(documensoId),
        ip_address: null,
        user_agent: null,
      });
    }
  }

  if (eventName === 'document.completed' && row.status === 'pending') {
    update.status = 'signed';
    update.finalized_at = new Date().toISOString();
  } else if (eventName === 'document.rejected' && row.status === 'pending') {
    update.status = 'rejected';
  }

  await sb.from('signed_documents').update(update).eq('id', row.id);

  return NextResponse.json({ ok: true });
}
