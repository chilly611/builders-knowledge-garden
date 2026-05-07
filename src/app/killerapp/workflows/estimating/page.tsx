import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Suspense } from 'react';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import EstimatingClient from './EstimatingClient';

const WORKFLOW_ID = 'q2';

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
  title: 'AI Estimating Gate',
  description: 'Fast AI estimate from plans, specs, or a photo. Sanity-check before quoting.',
};

export default function Page() {
  const { workflow, stages } = loadWorkflow();
  // Project Spine v1: client uses useSearchParams via the workflow hook
  // — must be inside a Suspense boundary (Next.js 16 prerender requirement).
  return (
    <Suspense fallback={null}>
      <EstimatingClient workflow={workflow} stages={stages} />
    </Suspense>
  );
}
