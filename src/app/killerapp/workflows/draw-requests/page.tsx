import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Suspense } from 'react';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import DrawRequestsClient from './DrawRequestsClient';

const WORKFLOW_ID = 'q21';

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
  title: 'Draw Requests',
  description: 'Calculate % complete, auto-fill the draw form, set holdback, send to the lender, follow up.',
};

export default function Page() {
  const { workflow, stages } = loadWorkflow();
  return (
    <Suspense fallback={null}>
      <DrawRequestsClient workflow={workflow} stages={stages} />
    </Suspense>
  );
}
