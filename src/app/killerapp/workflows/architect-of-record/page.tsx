/**
 * /killerapp/workflows/architect-of-record
 * =========================================
 * "Need an architect of record? Email us." flow (q-aor, stage 2 — Lock).
 *
 * Server Component shell that hands off to the client form. Kept thin
 * because the form has no Project-Spine state to hydrate — every
 * submission stands alone in `architect_requests`.
 */

import { Suspense } from 'react';
import ArchitectOfRecordClient from './ArchitectOfRecordClient';

export const metadata = {
  title: 'Find an architect of record',
  description:
    'Tell us about your project. Our Knowledge Gardens team will personally connect you with a CA-licensed architect of record.',
};

export default function ArchitectOfRecordPage() {
  return (
    <Suspense fallback={null}>
      <ArchitectOfRecordClient />
    </Suspense>
  );
}
