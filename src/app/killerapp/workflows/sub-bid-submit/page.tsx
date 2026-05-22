/**
 * /killerapp/workflows/sub-bid-submit (SUBBID-FLOW, 2026-05-22)
 * ==============================================================
 * Server Component shell — hands off to the client form. Specialty subs
 * land here to push a bid back to the GC. Gated by <LaneGate> on the
 * client side because effectiveLane is per-project.
 */

import { Suspense } from 'react';
import SubBidSubmitClient from './SubBidSubmitClient';

export const metadata = {
  title: 'Submit a bid',
  description:
    'Push a bid back to the general contractor — scope, line items, CSLB number, insurance. They review and respond in their inbox.',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SubBidSubmitClient />
    </Suspense>
  );
}
