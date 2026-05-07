import { Suspense } from 'react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import JobSequencingClient from './JobSequencingClient';

const WORKFLOW_ID = 'q6';

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
  title: 'Job Sequencing — Builder\'s Knowledge Garden',
  description: 'Sequence the job so trades don\'t trip over each other.',
};

export default function Page() {
  const { workflow, stages } = loadWorkflow();
  return (
    <Suspense fallback={null}>
      <JobSequencingClient workflow={workflow} stages={stages} />
    </Suspense>
  );
}
