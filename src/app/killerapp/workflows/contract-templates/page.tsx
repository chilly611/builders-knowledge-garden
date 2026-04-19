/**
 * /killerapp/workflows/contract-templates
 * =======================================
 * Second live wired workflow (Week 2B).
 *
 * Server Component:
 *   - Loads workflow q4 ("Contract Templates") from docs/workflows.json
 *   - Reads all 6 contract markdown bodies via getTemplateBodies()
 *   - Hands off to the Client Component which owns interactive state
 *
 * Why server-side load:
 *   - Keeps workflows.json out of the client bundle.
 *   - Reads the .md files on the server so the client doesn't need a
 *     markdown fetch step before PDF generation.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import { TEMPLATE_META } from '@/lib/contract-templates';
import { getTemplateBodies } from '@/lib/contract-templates.server';
import ContractTemplatesClient from './ContractTemplatesClient';

const WORKFLOW_ID = 'q4';

interface WorkflowsJson {
  lifecycleStages: LifecycleStage[];
  workflows: Workflow[];
}

function loadWorkflow(): { workflow: Workflow; stages: LifecycleStage[] } {
  const path = resolve(process.cwd(), 'docs/workflows.json');
  const raw = readFileSync(path, 'utf-8');
  const parsed = JSON.parse(raw) as WorkflowsJson;
  const wf = parsed.workflows.find((w) => w.id === WORKFLOW_ID);
  if (!wf) {
    throw new Error(
      `Contract Templates workflow (${WORKFLOW_ID}) not found in workflows.json.`
    );
  }
  return { workflow: wf, stages: parsed.lifecycleStages };
}

export const metadata = {
  title: "Contract Templates — Builder's Knowledge Garden",
  description:
    'Fill, generate, and download attorney-review-ready contract drafts: client agreements, subcontractor agreements, lien waivers, NDAs, and change orders.',
};

export default async function ContractTemplatesPage() {
  const { workflow, stages } = loadWorkflow();
  const bodies = await getTemplateBodies();

  return (
    <ContractTemplatesClient
      workflow={workflow}
      stages={stages}
      templates={TEMPLATE_META}
      bodies={bodies}
    />
  );
}
