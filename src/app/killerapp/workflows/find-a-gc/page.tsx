/**
 * /killerapp/workflows/find-a-gc
 * ===============================
 * DIY-LANE concierge form (q-find-gc, stage 2 — Lock / pre-hire).
 *
 * Server Component shell that hands off to the client form. Mirrors the
 * architect-of-record shape — kept thin because each submission stands
 * alone in `gc_match_requests`; no Project-Spine state to hydrate.
 *
 * Intended primarily for the dreamer/homeowner lane but accessible to
 * any lane (the form just collects intent).
 */

import { Suspense } from 'react';
import FindAGcClient from './FindAGcClient';

export const metadata = {
  title: 'Find a vetted GC for your project',
  description:
    "Tell us about your project. We'll match you with 2-3 vetted general contractors in your area within 2 business days.",
};

export default function FindAGcPage() {
  return (
    <Suspense fallback={null}>
      <FindAGcClient />
    </Suspense>
  );
}
