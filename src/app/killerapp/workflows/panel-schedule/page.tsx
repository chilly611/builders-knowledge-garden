/**
 * /killerapp/workflows/panel-schedule
 * ====================================
 * MEP service-load calc + 40-circuit panel-directory generator.
 *
 * Workflow id: q-panel-schedule (stage 3 — Plan).
 *
 * Server Component: thin shell, hands off to the client which owns
 * the form + fetch to /api/v1/load-calc + PDF export.
 */

import { Suspense } from 'react';
import PanelScheduleClient from './PanelScheduleClient';

export const metadata = {
  title: 'Panel schedule generator',
  description:
    'NEC Article 220 service-load calc with auto-balanced 40-circuit panel directory. Citations included.',
};

export default function PanelSchedulePage() {
  return (
    <Suspense fallback={null}>
      <PanelScheduleClient />
    </Suspense>
  );
}
