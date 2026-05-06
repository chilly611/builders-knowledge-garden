/**
 * /killerapp/workflows/code-compliance
 * =====================================
 * The first live wired workflow in the Killer App.
 *
 * Server Component:
 * - Loads workflow q5 ("Code Compliance Lookup") from docs/workflows.json
 * - Loads available jurisdictions from knowledge-data.ts
 * - Hands off to the Client Component which owns interactive state
 *
 * Why server-side load: keeps workflows.json out of the client bundle,
 * enforces camelCase contract at the boundary, and shields the route
 * from malformed JSON (throws at build if q5 goes missing).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Suspense } from 'react';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import { JURISDICTIONS } from '@/lib/knowledge-data';
import CodeComplianceClient from './CodeComplianceClient';

const WORKFLOW_ID = 'q5';

interface WorkflowsJson {
  lifecycleStages: LifecycleStage[];
  workflows: Workflow[];
}

function loadCodeComplianceData(): {
  workflow: Workflow;
  stages: LifecycleStage[];
} {
  const path = resolve(process.cwd(), 'docs/workflows.json');
  const raw = readFileSync(path, 'utf-8');
  const parsed = JSON.parse(raw) as WorkflowsJson;
  const wf = parsed.workflows.find((w) => w.id === WORKFLOW_ID);
  if (!wf) {
    throw new Error(
      `Code Compliance workflow (${WORKFLOW_ID}) not found in workflows.json. ` +
        `If the extraction ID changed, update src/app/killerapp/workflows/code-compliance/page.tsx.`
    );
  }
  return { workflow: wf, stages: parsed.lifecycleStages };
}

export const metadata = {
  title: 'Code Compliance Lookup — Builder\'s Knowledge Garden',
  description:
    'AI-assisted structural, electrical, plumbing, and fire-code review with citations you can verify against your AHJ.',
};

export default function CodeCompliancePage() {
  const { workflow, stages } = loadCodeComplianceData();

  // Scope: CA/AZ/NV + IBC fallback. CA now includes ~30 county + city
  // entries (see knowledge-data.ts). Real local-amendment data arrives
  // in Week 3; this pass is UI-first so the names show up correctly.
  const week1Jurisdictions = JURISDICTIONS.filter((j) =>
    ['California', 'Arizona', 'Nevada'].includes(j.state ?? '')
  );
  const fallback = JURISDICTIONS.find((j) => j.id === 'ibc-2024');
  const jurisdictions = fallback ? [fallback, ...week1Jurisdictions] : week1Jurisdictions;

  // Project Spine v1: client uses useSearchParams via the workflow hook
  // — must be inside a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <CodeComplianceClient
        workflow={workflow}
        jurisdictions={jurisdictions}
        stages={stages}
      />
    </Suspense>
  );
}
