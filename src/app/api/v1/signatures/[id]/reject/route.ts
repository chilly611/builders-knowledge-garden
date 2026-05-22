/**
 * PATCH /api/v1/signatures/:id/reject — mark a pending signature rejected.
 * ========================================================================
 *
 * Body: { reason?: string }
 *
 * Only required signers can reject. Sets status='rejected' and records a
 * signature_events row with method='typed', signature_data='REJECTED: <reason>'
 * so the audit chain captures who rejected and why.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';

interface RequiredSigner {
  role: string;
  email?: string;
  user_id?: string;
}

function getClientIp(request: NextRequest): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' ? body.reason : '';

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
        { error: `Cannot reject: status is ${doc.status}` },
        { status: 409 }
      );
    }

    const required = (doc.required_signers ?? []) as RequiredSigner[];
    const callerEmail = user.email?.toLowerCase() ?? '';
    const match = required.find((s) => {
      if (s.user_id && s.user_id === user.id) return true;
      if (s.email && s.email.toLowerCase() === callerEmail) return true;
      return false;
    });
    if (!match) {
      return NextResponse.json(
        { error: 'You are not a required signer on this document' },
        { status: 403 }
      );
    }

    await sb.from('signature_events').insert({
      signed_document_id: id,
      signer_user_id: user.id,
      signer_role: match.role,
      signer_name: user.email || 'Unknown',
      signer_email: user.email ?? null,
      signature_method: 'typed',
      signature_data: `REJECTED: ${reason || '(no reason given)'}`,
      ip_address: getClientIp(request),
      user_agent: request.headers.get('user-agent'),
    });

    await sb
      .from('signed_documents')
      .update({ status: 'rejected', finalized_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending');

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
