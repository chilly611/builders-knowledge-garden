/**
 * /killerapp/workflows/punch-list — running punch list (q-punch)
 *
 * Field-grade surface used DURING construction, distinct from
 * /killerapp/workflows/final-walk-through (q24, the substantial-
 * completion gate). Foreman opens this on the ladder, snaps a photo,
 * voices a one-liner, taps submit. Swipe right to resolve, left to
 * reassign trade, long-press to delete.
 *
 * Server component: just loads the workflow record from workflows.json
 * and hands off to the client. All UI / API calls happen client-side.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Suspense } from 'react';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import PunchListClient from './PunchListClient';

const WORKFLOW_ID = 'q-punch';

interface WorkflowsJson {
  lifecycleStages: LifecycleStage[];
  workflows: Workflow[];
}

function loadWorkflow() {
  const raw = readFileSync(resolve(process.cwd(), 'docs/workflows.json'), 'utf-8');
  const parsed = JSON.parse(raw) as WorkflowsJson;
  const wf = parsed.workflows.find((w) => w.id === WORKFLOW_ID);
  if (!wf) throw new Error(`Workflow ${WORKFLOW_ID} missing from workflows.json`);
  return { workflow: wf, stages: parsed.lifecycleStages };
}

export const metadata = {
  title: 'Running Punch List',
  description:
    'Field-grade running punch list. Snap a photo, add a one-liner, swipe to resolve.',
};

export default function Page() {
  const { workflow, stages } = loadWorkflow();
  return (
    <Suspense fallback={null}>
      <PunchListClient workflow={workflow} stages={stages} />
    </Suspense>
  );
}
