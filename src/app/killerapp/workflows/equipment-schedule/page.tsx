/**
 * /killerapp/workflows/equipment-schedule
 * ========================================
 * MEP equipment schedule — HVAC tonnage + plumbing fixture count.
 *
 * Workflow id: q-equipment-schedule (stage 3 — Plan).
 *
 * Server Component: thin shell, defers to client.
 */

import { Suspense } from 'react';
import EquipmentScheduleClient from './EquipmentScheduleClient';

export const metadata = {
  title: 'Equipment schedule',
  description:
    'HVAC tonnage sizing (rule-of-thumb) + UPC plumbing fixture count for commercial TI / new build.',
};

export default function EquipmentSchedulePage() {
  return (
    <Suspense fallback={null}>
      <EquipmentScheduleClient />
    </Suspense>
  );
}
