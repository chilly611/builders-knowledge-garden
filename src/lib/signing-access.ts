/**
 * Access control for signing packets (STAGE 5).
 * ==============================================
 *
 * The packet/verify endpoints use the service-role client, which bypasses RLS,
 * so access must be enforced in app code. A caller may read a document's
 * signing packet if they are:
 *   - the document creator (created_by), OR
 *   - a listed required signer (matched by user_id or email), OR
 *   - someone with a recorded signature_event on the document.
 *
 * Kept separate from signing-chain.ts so the chain engine stays free of HTTP /
 * auth concerns and remains trivially unit-testable.
 */

import type { SignedDocumentRow, SignatureEventRow, SupabaseLike } from '@/lib/signing-chain';

export interface AuthUserLike {
  id: string;
  email?: string;
}

interface RequiredSigner {
  role?: string;
  email?: string;
  user_id?: string;
  name?: string;
}

/**
 * Returns true if `user` may access the signing packet for `document`.
 * `events` may be passed when already loaded (e.g. from buildSigningPacket) to
 * avoid a second query; otherwise it is fetched.
 */
export async function callerCanAccessDocument(
  client: SupabaseLike,
  user: AuthUserLike,
  document: SignedDocumentRow,
  events?: SignatureEventRow[],
): Promise<boolean> {
  const callerId = user.id;
  const callerEmail = (user.email ?? '').toLowerCase();

  if (document.created_by && document.created_by === callerId) return true;

  const signers = (document.required_signers ?? []) as RequiredSigner[];
  if (
    Array.isArray(signers) &&
    signers.some((sgr) => {
      if (sgr.user_id && sgr.user_id === callerId) return true;
      if (sgr.email && callerEmail && sgr.email.toLowerCase() === callerEmail) return true;
      return false;
    })
  ) {
    return true;
  }

  // Fall back to recorded events (already-loaded or fetched).
  let evs = events;
  if (!evs) {
    const { data } = await client
      .from('signature_events')
      .select('signer_user_id, signer_email')
      .eq('signed_document_id', document.id);
    evs = (data ?? []) as SignatureEventRow[];
  }
  return (evs ?? []).some((ev) => {
    if (ev.signer_user_id && ev.signer_user_id === callerId) return true;
    if (ev.signer_email && callerEmail && ev.signer_email.toLowerCase() === callerEmail) return true;
    return false;
  });
}
