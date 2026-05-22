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

interface RequiredSigner {
  role: string;
  email?: string;
  user_id?: string;
  name?: string;
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
      requiredSigners,
    } = body as {
      projectId?: string;
      documentType?: string;
      documentId?: string;
      title?: string;
      pdfUrl?: string;
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
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ signature: data }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
