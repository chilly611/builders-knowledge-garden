import { Suspense } from 'react';
import RfisClient from './RfisClient';

/**
 * /killerapp/workflows/rfis — Submit RFIs (Request For Information).
 *
 * RFI-UI session (2026-05-22). The route and table (`project_rfis`) already
 * exist; this page is the foreman-friendly UI on top of them. Consumes
 * /api/v1/rfis (GET list + POST create), which is auth-gated and honors
 * demo_project_id for trial accounts.
 *
 * Server component is intentionally minimal — Suspense-wraps the client
 * because `useSearchParams` (for ?project=<id>) is used inside.
 */

export const metadata = {
  title: 'Submit RFIs',
  description:
    "Ask the design team a clarification question — with photos, voice, and a response timer.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RfisClient />
    </Suspense>
  );
}
