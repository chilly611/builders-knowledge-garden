/**
 * /killerapp/sign/[id] — Owner/GC signature page.
 * ===============================================
 *
 * Deep-link target emailed to a signer after a `signed_documents` row is
 * created. Renders the PDF (or a stub preview) plus the SignatureCapture
 * component for whichever role the caller fits.
 *
 * Client-side gating: we check that the logged-in user is in
 * `required_signers` (by user_id or email). The /api/v1/signatures/:id/sign
 * endpoint re-checks server-side — this is a UX preview, not a security
 * boundary.
 */

import { Suspense } from 'react';
import SignPageClient from './SignPageClient';

export const metadata = {
  title: 'Sign document — Builder\'s Knowledge Garden',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <SignPageClient id={id} />
    </Suspense>
  );
}
