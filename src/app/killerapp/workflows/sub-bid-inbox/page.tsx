/**
 * /killerapp/workflows/sub-bid-inbox (SUBBID-FLOW, 2026-05-22)
 * =============================================================
 * Server Component shell for the GC inbox view of submitted sub-bids.
 * Gated by <LaneGate allow={['gc','owner','teammate']}> client-side.
 */

import { Suspense } from 'react';
import SubBidInboxClient from './SubBidInboxClient';

export const metadata = {
  title: 'Sub-bid inbox',
  description:
    'Bids your subcontractors have pushed to you — review, accept, reject, or counter-offer.',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SubBidInboxClient />
    </Suspense>
  );
}
