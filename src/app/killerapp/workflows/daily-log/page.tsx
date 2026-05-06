import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Suspense } from 'react';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import DailyLogClient from './DailyLogClient';

const WORKFLOW_ID = 'q15';

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
  title: 'Voice-to-Daily-Log — Builder\'s Knowledge Garden',
  description: 'Speak your daily log. We\'ll structure it, tag it, and file it.',
};

export default function Page() {
  const { workflow, stages } = loadWorkflow();
  // Project Spine v1 (Wave 2): client uses useSearchParams via the hook.
  return (
    <Suspense fallback={null}>
      <DailyLogClient workflow={workflow} stages={stages} />
    </Suspense>
  );
}
