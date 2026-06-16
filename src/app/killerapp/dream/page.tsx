/**
 * Dream Machine surface — Route Handler
 * =====================================
 *
 * /killerapp/dream — the "what-if" surface (component-fidelity spec §C),
 * mounted on the shared App Shell so it inherits the project header, journey
 * row, budget readout, and Ask-the-garden FAB (ProjectProvider + ShellStrips +
 * ShellNav from killerapp/layout.tsx). Everything project-scoped reads
 * `useStageProject()`, so `?project=` flips the whole surface with no bleed.
 *
 * Two project-scoped pieces live here: the "In motion" exploration cards (C2)
 * and the "Choose your direction" style picker.
 */

import { Suspense } from 'react';
import DreamMachineClient from './DreamMachineClient';

export const metadata = {
  title: 'Dream Machine',
  description: 'Imagine the next move — explorations and the architectural direction for your build.',
};

export default function DreamMachinePage() {
  return (
    <Suspense fallback={null}>
      <DreamMachineClient />
    </Suspense>
  );
}
