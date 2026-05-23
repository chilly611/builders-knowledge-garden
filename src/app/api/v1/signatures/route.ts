/**
 * /api/v1/signatures — OWNER-LANE signature primitive (2026-05-22).
 * ================================================================
 *
 * The "system of record" change-order signature endpoint Rachel
 * (commercial owner) called out as missing: a binding signature event
 * with hash, timestamp, and IP captured server-side.
 *
 * Endpoints:
 *   GET  /api/v1/signatures
 *        → List `signed_documents` rows where the caller is in
 *          `required_signers` (matched by user_id or email) AND the row
 *          isn't yet signed/rejected/void. The owner's "approvals inbox".
 *
 *   POST /api/v1/signatures
 *        Body: {
 *          projectId, documentType, documentId?, title, pdfUrl?,
 *          requiredSigners: [{ role, email, user_id? }]
 *        }
 *        → Creates a `signed_documents` row in status='pending' and
 *          stores the required signer list. Signature events are
 *          inserted later when each signer actually signs (PATCH path).
 *          Returns the new id.
 *
 * The sign-action lives at /api/v1/signatures/[id]/sign/route.ts so
 * Next routes the dynamic segment cleanly.
 *
 * AUDIT: both signed_documents and signature_events have audit triggers
 * (SCHEMA-ALPHA). Every insert/update lands in audit_log automatically;
 * we do not log explicitly from here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';
import {
  createSignatureRequest,
  isDocumensoConfigured,
  DocumensoError,
} from '@/lib/documenso';
import { syncDocumensoStatus, isStale } from '@/lib/documenso-sync';

interface RequiredSigner {
  role: string;
  email?: string;
  user_id?: string;
  name?: string;
}

/**
 * Fetch PDF bytes from either a URL or a base64 string. Returns null
 * if neither input is usable.
 */
async function resolvePdfBytes(opts: {
  pdfUrl?: string;
  pdfBase64?: string;
}): Promise<Buffer | null> {
  if (opts.pdfBase64) {
    try {
      // Tolerate data: URLs as well as raw base64.
      const raw = opts.pdfBase64.includes(',')
        ? opts.pdfBase64.split(',', 2)[1]
        : opts.pdfBase64;
      return Buffer.from(raw, 'base64');
    } catch {
      return null;
    }
  }
  if (opts.pdfUrl) {
    try {
      const res = await fetch(opts.pdfUrl);
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const sb = getServiceClient();
    // Pull all pending signed_documents. We filter in app-code on the
    // jsonb required_signers array because Postgres jsonb containment
    // syntax is fiddly for "any element matches" — and the volume is
    // tiny while we're shipping. Switch to a jsonb_path_exists query
    // if this list ever grows beyond a few thousand rows.
    const { data, error } = await sb
      .from('signed_documents')
      .select('*')
      .in('status', ['pending'])
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const callerEmail = user.email?.toLowerCase() ?? '';
    const callerId = user.id;

    const pending = (data ?? []).filter((row) => {
      const signers = (row.required_signers ?? []) as RequiredSigner[];
      return signers.some((s) => {
        if (s.user_id && s.user_id === callerId) return true;
        if (s.email && s.email.toLowerCase() === callerEmail) return true;
        return false;
      });
    });

    // Fire-and-forget lazy sync for any Documenso-backed row whose
    // status hasn't been refreshed in >5 minutes. This is what keeps
    // the inbox honest until the webhook is wired in Documenso's UI.
    // We deliberately don't await — the response goes out immediately.
    if (isDocumensoConfigured()) {
      for (const row of pending) {
        if (!row.documenso_document_id) continue;
        if (!isStale(row.documenso_last_synced_at)) continue;
        // Intentionally not awaited.
        syncDocumensoStatus(row.id).catch(() => {
          // Swallow — sync is best-effort.
        });
      }
    }

    return NextResponse.json({ signatures: pending });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const {
      projectId,
      documentType,
      documentId,
      title,
      pdfUrl,
      pdfBase64,
      requiredSigners,
    } = body as {
      projectId?: string;
      documentType?: string;
      documentId?: string;
      title?: string;
      pdfUrl?: string;
      pdfBase64?: string;
      requiredSigners?: RequiredSigner[];
    };

    if (!projectId || !documentType || !requiredSigners || requiredSigners.length === 0) {
      return NextResponse.json(
        { error: 'projectId, documentType, and requiredSigners are required' },
        { status: 400 }
      );
    }

    // Compute a document hash up-front. If a real PDF URL is provided
    // we'd ideally fetch and SHA-256 the bytes, but we can't always do
    // that synchronously (the PDF may still be uploading). For now we
    // hash a deterministic snapshot of the binding fields — when the
    // PDF lands we can re-hash and update via PATCH.
    const hashInput = JSON.stringify({
      projectId,
      documentType,
      documentId: documentId ?? null,
      title: title ?? null,
      requiredSigners,
      createdAt: new Date().toISOString(),
    });
    const documentHash = createHash('sha256').update(hashInput).digest('hex');

    const sb = getServiceClient();

    // ----- Documenso provider branch ---------------------------------
    // When SIGNATURE_PROVIDER=documenso is set, the env var is the only
    // switch — the orchestrator already enabled it in prod. We still
    // require an actual PDF source (URL or base64) to delegate. If the
    // caller didn't supply one we fall through to the in-app flow so a
    // bare "create me a placeholder" call still works during the
    // typed/drawn fallback path.
    const provider = (process.env.SIGNATURE_PROVIDER || '').toLowerCase();
    const wantDocumenso = provider === 'documenso' && isDocumensoConfigured();
    const hasPdf = Boolean(pdfUrl || pdfBase64);

    let documensoFields: {
      documenso_document_id?: number;
      documenso_signing_urls?: Record<string, string>;
      documenso_last_status?: string;
      documenso_last_synced_at?: string;
    } = {};
    let signingUrls: Record<string, string> | undefined;

    if (wantDocumenso && hasPdf) {
      // Validate recipients have name + email before paying the
      // Documenso round-trip.
      const badRecipient = requiredSigners.find(
        (s) => !s.email || !/.+@.+\..+/.test(s.email)
      );
      if (badRecipient) {
        return NextResponse.json(
          { error: 'Documenso requires every required signer to have a valid email' },
          { status: 400 }
        );
      }

      const pdfBytes = await resolvePdfBytes({ pdfUrl, pdfBase64 });
      if (!pdfBytes) {
        return NextResponse.json(
          { error: 'Could not load PDF bytes from pdfUrl/pdfBase64' },
          { status: 400 }
        );
      }

      try {
        const created = await createSignatureRequest({
          title: title || `${documentType} signature request`,
          pdfBytes,
          recipients: requiredSigners.map((s) => ({
            name: s.name || s.email || 'Signer',
            email: s.email!,
            role: 'SIGNER',
          })),
        });
        signingUrls = Object.fromEntries(
          created.recipients.map((r) => [r.email.toLowerCase(), r.signingUrl])
        );
        documensoFields = {
          documenso_document_id: created.documentId,
          documenso_signing_urls: signingUrls,
          documenso_last_status: 'PENDING',
          documenso_last_synced_at: new Date().toISOString(),
        };
      } catch (e) {
        const msg =
          e instanceof DocumensoError
            ? `Documenso error (${e.status}): ${e.message}`
            : e instanceof Error
              ? e.message
              : 'Unknown Documenso failure';
        // Documenso down → surface a 502 so the caller can decide whether
        // to retry or fall back. We do NOT silently write an in-app row
        // here because that would mask the provider failure.
        return NextResponse.json({ error: msg }, { status: 502 });
      }
    }
    // -----------------------------------------------------------------

    const { data, error } = await sb
      .from('signed_documents')
      .insert({
        project_id: projectId,
        document_type: documentType,
        document_id: documentId ?? null,
        document_hash: documentHash,
        pdf_url: pdfUrl ?? null,
        title: title ?? null,
        status: 'pending',
        required_signers: requiredSigners,
        created_by: user.id,
        ...documensoFields,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { signature: data, ...(signingUrls ? { signingUrls } : {}) },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
