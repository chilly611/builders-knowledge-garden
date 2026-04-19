'use client';

import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { recordMaterialCost } from '@/lib/budget-spine';
import { resolveProjectId } from '@/lib/journey-progress';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function SupplyOrderingClient({ workflow, stages }: Props) {
  const handleStepComplete = async (stepResult: StepResult & { workflowId: string }) => {
    // After s11-3 (analysis_result) is submitted, best-effort record material cost
    // from whatever dollar amount appears in the user's analysis input text.
    // The AI response itself is not piped through the event bus — only payload.input is.
    if (stepResult.stepId === 's11-3' && stepResult.type === 'step_completed') {
      const inputText = (stepResult.payload as { input?: string } | undefined)?.input ?? '';
      // Extract estimated total from input text (e.g., "Scenario B (mixed): $29.8k")
      const match = inputText.match(/\$[\d,]+\.?\d*k?/);
      if (match) {
        const priceStr = match[0].replace('k', '000').replace(/[$,]/g, '');
        const amount = parseFloat(priceStr);
        if (!isNaN(amount) && amount > 0) {
          const projectId = resolveProjectId();
          await recordMaterialCost({
            description: 'Supply list — Plan',
            amount,
            lifecycleStageId: 3,
            isEstimate: true,
            projectId,
          });
        }
      }
    }
  };

  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="Supply Ordering"
      onStepComplete={handleStepComplete}
    />
  );
}
