'use client';

import { useState, useCallback } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { recordSubcontractorCost } from '@/lib/budget-spine';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

interface SelectedBid {
  trade: string;
  subName: string;
  amount: number;
}

export default function SubManagementClient({ workflow, stages }: Props) {
  const [selectedBids, setSelectedBids] = useState<SelectedBid[]>([]);
  const projectId = resolveProjectId();

  const handleStepComplete = useCallback(
    async (stepResult: StepResult & { workflowId: string }) => {
      if (stepResult.type !== 'step_completed' || stepResult.stepId !== 's9-4') {
        return;
      }

      // s9-4 is multi_select where user picks winning bids
      // In a full implementation, the payload would contain the selected option values
      // For now, we emit the completed event
      if (stepResult.stepId === 's9-4') {
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
      breadcrumbLabel="Sub Management"
      contextFields={['trade', 'lane']}
      onStepComplete={handleStepComplete}
      projectId={projectId}
    />
  );
}
