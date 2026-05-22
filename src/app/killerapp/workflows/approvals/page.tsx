/**
 * /killerapp/workflows/approvals — Owner-lane approvals inbox.
 * ============================================================
 *
 * Replaces the "email-attachment + DocuSign-after-the-fact" sprawl Rachel
 * (commercial owner) called out. Every pending signed_documents row the
 * caller is listed on shows up here with Approve / Reject buttons.
 *
 * Server-component shell renders the client list (which needs auth for
 * the bearer token).
 */

import { Suspense } from 'react';
import ApprovalsClient from './ApprovalsClient';

export const metadata = {
  title: 'Approvals — Builder\'s Knowledge Garden',
  description: 'Pending change orders, draws, and lien waivers awaiting your sign-off.',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ApprovalsClient />
    </Suspense>
  );
}
