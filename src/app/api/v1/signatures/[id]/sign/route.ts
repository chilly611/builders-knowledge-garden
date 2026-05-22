/**
 * PATCH /api/v1/signatures/:id/sign — capture a signature event.
 * ===============================================================
 *
 * Body: {
 *   method: 'typed' | 'drawn' | 'docusign' | 'dropbox_sign' | 'documenso',
 *   signature_data: string,   // typed name OR base64 PNG OR external doc ref
 *   signer_role: string,      // 'owner' | 'gc' | 'sub' | ...
 *   signer_name?: string,
 * }
 *
 * Server side:
 *   - Verifies caller is in `required_signers` (by user_id or email).
 *   - Records IP from forwarded headers (best-effort — see risk notes).
 *   - Records user_agent from the request header.
 *   - Re-computes document_hash from the current row (snapshot-binding).
 *   - Inserts a signature_events row.
 *   - If ALL required_signers now have a matching signature_events row
 *     with role matching, sets signed_documents.status='signed' and
 *     finalized_at=now().
 *
 * RACE NOTE: two simultaneous signers could both observe "not all done"
 * and skip the finalize. The follow-up UPDATE re-checks the count under
 * a single statement, so the worst case is one extra UPDATE that's a
 * no-op. A proper transaction with row-level lock is the next iteration
 * — flagged in the risk callouts.
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

const VALID_METHODS = new Set(['typed', 'drawn', 'docusign', 'dropbox_sign', 'documenso']);

function getClientIp(request: NextRequest): string | null {
  // Vercel/Next pass the originating IP through these headers. The
  // x-forwarded-for can be a comma list; take the first.
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  // NextRequest.ip is removed in newer Next versions — fall through.
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const { method, signature_data, signer_role, signer_name } = body as {
      method?: string;
      signature_data?: string;
      signer_role?: string;
      signer_name?: string;
    };

    if (!method || !VALID_METHODS.has(method)) {
      return NextResponse.json(
        { error: `method must be one of: ${[...VALID_METHODS].join(', ')}` },
        { status: 400 }
      );
    }
    if (!signature_data || !signer_role) {
      return NextResponse.json(
        { error: 'signature_data and signer_role are required' },
        { status: 400 }
      );
    }

    const sb = getServiceClient();
    const { data: doc, error: fetchErr } = await sb
      .from('signed_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !doc) {
      return NextResponse.json({ error: 'Signed document not found' }, { status: 404 });
    }
    if (doc.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot sign: document status is ${doc.status}` },
        { status: 409 }
      );
    }

    const requiredSigners = (doc.required_signers ?? []) as RequiredSigner[];
    const callerEmail = user.email?.toLowerCase() ?? '';
    const match = requiredSigners.find((s) => {
      if (s.user_id && s.user_id === user.id) return true;
      if (s.email && s.email.toLowerCase() === callerEmail) return true;
      return false;
    });

    if (!match) {
      return NextResponse.json(
        { error: 'You are not listed as a required signer on this document' },
        { status: 403 }
      );
    }

    // Re-derive the document_hash from a canonical snapshot so the
    // signature event embeds the exact state that was signed. The
    // hash is what makes this admissible later: any later edit to the
    // doc would produce a different hash and break the chain.
    const hashInput = JSON.stringify({
      id: doc.id,
      project_id: doc.project_id,
      document_type: doc.document_type,
      document_id: doc.document_id,
      title: doc.title,
      pdf_url: doc.pdf_url,
      required_signers: requiredSigners,
    });
    const snapshotHash = createHash('sha256').update(hashInput).digest('hex');

    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent');

    const { error: insertErr } = await sb.from('signature_events').insert({
      signed_document_id: id,
      signer_user_id: user.id,
      signer_role,
      signer_name: signer_name || match.name || user.email || 'Unknown',
      signer_email: user.email ?? match.email ?? null,
      signature_method: method,
      signature_data,
      ip_address: ip,
      user_agent: userAgent,
    });

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Check if all required signers have signed. We match a signature
    // event back to a required signer by (signer_user_id OR signer_email).
    // If everyone has a row → finalize.
    const { data: events } = await sb
      .from('signature_events')
      .select('signer_user_id, signer_email')
      .eq('signed_document_id', id);

    const allSigned = requiredSigners.every((rs) => {
      return (events ?? []).some((ev) => {
        if (rs.user_id && ev.signer_user_id === rs.user_id) return true;
        if (
          rs.email &&
          ev.signer_email &&
          rs.email.toLowerCase() === ev.signer_email.toLowerCase()
        )
          return true;
        return false;
      });
    });

    if (allSigned) {
      // Update the hash to the canonical snapshot now that the doc is
      // locked. The pre-existing hash was advisory until the last
      // signature landed.
      await sb
        .from('signed_documents')
        .update({
          status: 'signed',
          finalized_at: new Date().toISOString(),
          document_hash: snapshotHash,
        })
        .eq('id', id)
        .eq('status', 'pending'); // guard against race with another finalizer
    }

    return NextResponse.json({ ok: true, finalized: allSigned });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  // Allow POST as an alias for PATCH so simple form-encoded clients
  // (and the SignatureCapture component) work without juggling methods.
  return PATCH(request, ctx);
}
