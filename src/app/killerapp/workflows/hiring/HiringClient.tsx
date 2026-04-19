'use client';

import { useState } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { recordLaborCost } from '@/lib/budget-spine';
import { resolveProjectId } from '@/lib/journey-progress';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function HiringClient({ workflow, stages }: Props) {
  const [workerName, setWorkerName] = useState('');
  const [role, setRole] = useState('');
  const [weeklyCost, setWeeklyCost] = useState(0);

  const handleStepComplete = async (stepResult: StepResult & { workflowId: string }) => {
    // s13-1 is "Define role" (text_input) — capture role
    if (stepResult.stepId === 's13-1' && stepResult.type === 'step_completed') {
      setRole(((stepResult.payload as { value?: string } | undefined)?.value ?? ''));
    }

    // s13-3 is "Review candidates" (text_input) — capture worker name
    if (stepResult.stepId === 's13-3' && stepResult.type === 'step_completed') {
      const text = ((stepResult.payload as { value?: string } | undefined)?.value ?? '');
      const nameMatch = text.match(/^([^\n,]+)/);
      if (nameMatch) setWorkerName(nameMatch[1].trim());
    }

    // s13-4 is "Send outreach" (text_input) — could extract cost info
    if (stepResult.stepId === 's13-4' && stepResult.type === 'step_completed') {
      const text = ((stepResult.payload as { value?: string } | undefined)?.value ?? '');
      const costMatch = text.match(/\$?\d+(?:k|K)?/);
      if (costMatch) {
        const costStr = costMatch[0].replace(/[$k]/gi, '');
        const cost = parseFloat(costStr) * (costMatch[0].includes('k') || costMatch[0].includes('K') ? 1000 : 1);
        if (!isNaN(cost)) setWeeklyCost(cost);
      }
    }

    // s13-5 is final "Confirm hire" (checklist) — record labor cost if available
    if (stepResult.stepId === 's13-5' && stepResult.type === 'step_completed') {
      if (weeklyCost > 0 && (workerName || role)) {
        const projectId = resolveProjectId();
        const description = `New hire — ${workerName || 'Worker'} — ${role || 'Role TBD'}`;
        await recordLaborCost({
          description,
          amount: weeklyCost * 4,
          lifecycleStageId: 3,
          isEstimate: true,
          vendor: workerName || undefined,
          projectId,
        });
      }
    }
  };

  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="Hiring Lane"
      onStepComplete={handleStepComplete}
    />
  );
}
