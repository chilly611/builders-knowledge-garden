'use client';

import { useState, useCallback } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { recordEquipmentCost } from '@/lib/budget-spine';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function EquipmentClient({ workflow, stages }: Props) {
  const projectId = resolveProjectId();

  const handleStepComplete = useCallback(
    async (stepResult: StepResult & { workflowId: string }) => {
      if (stepResult.type !== 'step_completed') return;

      // When analysis in s10-3 completes, record the equipment cost
      if (stepResult.stepId === 's10-3') {
        // In a full implementation, the analysis result would contain cost details
        // For now, we'll record a placeholder when the analysis is generated
        await recordEquipmentCost({
          description: 'Equipment — rent/buy decision',
          amount: 0, // This would be populated from the analysis result in production
          lifecycleStageId: 3,
          isEstimate: true,
          projectId,
        });
      }

      // When all equipment steps are complete
      if (stepResult.stepId === 's10-5') {
        emitJourneyEvent({
          type: 'completed',
          workflowId: workflow.id,
          projectId,
        });
      }
    },
    [workflow.id, projectId]
  );

  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="Equipment Management"
      contextFields={['trade', 'lane']}
      onStepComplete={handleStepComplete}
      projectId={projectId}
    />
  );
}
