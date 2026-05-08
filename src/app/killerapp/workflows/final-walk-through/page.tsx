import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Suspense } from 'react';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import FinalWalkThroughClient from './FinalWalkThroughClient';

const WORKFLOW_ID = 'q24';

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
  title: 'Final Walk-Through',
  description: 'Walk the job, snap punch-list photos, assign to trades, track completion.',
};

export default function Page() {
  const { workflow, stages } = loadWorkflow();
  return (
    <Suspense fallback={null}>
      <FinalWalkThroughClient workflow={workflow} stages={stages} />
    </Suspense>
  );
}
