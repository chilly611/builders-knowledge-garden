/**
 * GET /api/v1/signatures/:id/packet — export the signing packet (STAGE 5).
 * =========================================================================
 *
 * Returns the signed document + the full verifiable signature/audit chain as
 * one self-contained, downloadable record:
 *
 *   {
 *     packet: {
 *       packet_version, generated_at, signed_document_id,
 *       document,                 // stored signed_documents row, verbatim
 *       document_bytes_base64,    // exact bytes whose SHA-256 is document_hash
 *       document_bytes_source,    // 'pdf' | 'canonical'
 *       events: [...],            // stored signature_events, ordered, verbatim
 *       chain_anchor,             // genesis prev (== document_hash)
 *       packet_hash               // integrity of the packet file itself
 *     }
 *   }
 *
 * Everything is built from STORED data only — nothing is fabricated. Pass
 * `?download=1` to receive it as a file attachment. The packet can be verified
 * offline with verifySigningPacket() or by POSTing it to .../verify.
 *
 * AUTH: caller must be the document creator, a listed required signer, or have
 * a recorded signature event on it. We use the service client (RLS-bypassing),
 * so this app-level check is the access gate.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';
import { buildSigningPacket, SigningChainError } from '@/lib/signing-chain';
import { callerCanAccessDocument } from '@/lib/signing-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const sb = getServiceClient();

    let packet;
    try {
      packet = await buildSigningPacket(id, { client: sb });
    } catch (e) {
      if (e instanceof SigningChainError && e.code === 'signed_document_not_found') {
        return NextResponse.json({ error: 'Signed document not found' }, { status: 404 });
      }
      throw e;
    }

    const allowed = await callerCanAccessDocument(sb, user, packet.document, packet.events);
    if (!allowed) {
      return NextResponse.json(
        { error: 'You do not have access to this signing packet' },
        { status: 403 },
      );
    }

    const download = new URL(request.url).searchParams.get('download');
    const res = NextResponse.json({ packet });
    if (download) {
      res.headers.set(
        'Content-Disposition',
        `attachment; filename="signing-packet-${id}.json"`,
      );
    }
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
