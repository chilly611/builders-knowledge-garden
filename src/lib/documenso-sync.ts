/**
 * Documenso ↔ signed_documents lazy sync (2026-05-24).
 * ====================================================
 *
 * Until the Documenso webhook is wired in their UI, we keep the local
 * `signed_documents.status` honest by polling. This helper is fire-and-
 * forget from the /api/v1/signatures GET handler: any row whose
 * `documenso_last_synced_at` is null or > 5 minutes ago gets a status
 * refresh in the background. No blocking, no awaiting from the request
 * path.
 *
 * Mapping (Documenso → local):
 *   PENDING                  → 'pending'  (no change; signers still working)
 *   COMPLETED                → 'signed'   (also writes signature_events
 *                                          rows for any newly-signed
 *                                          recipients we don't already
 *                                          have an event for)
 *   REJECTED                 → 'rejected'
 *   CANCELLED                → 'void'
 *   DRAFT                    → 'pending'  (envelope still being built)
 *
 * SAFETY: only updates rows whose local status is one of
 * ('pending') so a manually-finalized in-app signature isn't clobbered
 * by a delayed Documenso response.
 */

import { createClient } from '@supabase/supabase-js';
import { getDocumensoStatus, type DocumensoStatus } from './documenso';

const STALE_MS = 5 * 60 * 1000; // 5 minutes

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
  return createClient(url, key, { auth: { persistSession: false } });
}

export function isStale(lastSyncedAt: string | null | undefined): boolean {
  if (!lastSyncedAt) return true;
  const ts = Date.parse(lastSyncedAt);
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > STALE_MS;
}

function mapStatus(remote: DocumensoStatus['status']): {
  local: 'pending' | 'signed' | 'rejected' | 'void';
  finalized: boolean;
} {
  switch (remote) {
    case 'COMPLETED':
      return { local: 'signed', finalized: true };
    case 'REJECTED':
      return { local: 'rejected', finalized: true };
    case 'CANCELLED':
      return { local: 'void', finalized: true };
    case 'DRAFT':
    case 'PENDING':
    default:
      return { local: 'pending', finalized: false };
  }
}

/**
 * Refresh one row from Documenso and persist the result. Inserts
 * signature_events rows for newly-signed recipients so the audit log
 * stays complete even when the webhook isn't wired yet.
 */
export async function syncDocumensoStatus(rowId: string): Promise<void> {
  const sb = getServiceClient();
  const { data: row, error: fetchErr } = await sb
    .from('signed_documents')
    .select('*')
    .eq('id', rowId)
    .single();

  if (fetchErr || !row || !row.documenso_document_id) return;
  // Don't re-sync rows that have already terminated locally.
  if (row.status !== 'pending') return;

  let remote: DocumensoStatus;
  try {
    remote = await getDocumensoStatus(row.documenso_document_id);
  } catch {
    // Best-effort. Network blip → leave the row alone; next request
    // will retry.
    return;
  }

  const { local, finalized } = mapStatus(remote.status);

  const update: Record<string, unknown> = {
    documenso_last_status: remote.status,
    documenso_last_synced_at: new Date().toISOString(),
  };
  if (finalized && local !== row.status) {
    update.status = local;
    if (local === 'signed') {
      update.finalized_at = new Date().toISOString();
    }
  }

  await sb
    .from('signed_documents')
    .update(update)
    .eq('id', row.id)
    .eq('status', 'pending'); // race guard

  // For any recipient that signed remotely but we don't have a local
  // signature_events row for, insert one. This keeps the audit log
  // intact when the webhook isn't wired.
  const { data: events } = await sb
    .from('signature_events')
    .select('signer_email')
    .eq('signed_document_id', row.id);
  const haveEmails = new Set(
    (events ?? [])
      .map((e: { signer_email: string | null }) => (e.signer_email || '').toLowerCase())
      .filter((s: string) => s.length > 0)
  );

  for (const r of remote.recipients) {
    if (r.signingStatus !== 'SIGNED') continue;
    if (haveEmails.has(r.email.toLowerCase())) continue;
    await sb.from('signature_events').insert({
      signed_document_id: row.id,
      signer_user_id: null,
      signer_role: 'signer',
      signer_name: r.name,
      signer_email: r.email,
      signature_method: 'documenso',
      signature_data: String(row.documenso_document_id),
      ip_address: null,
      user_agent: null,
    });
  }
}
