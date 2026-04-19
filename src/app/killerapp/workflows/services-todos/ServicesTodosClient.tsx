'use client';

import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function ServicesTodosClient({ workflow, stages }: Props) {
  const handleStepComplete = (stepResult: StepResult & { workflowId: string }) => {
    // On completion of final checklist (s12-5), emit completed event
    if (stepResult.stepId === 's12-5' && stepResult.type === 'step_completed') {
      const projectId = resolveProjectId();
      emitJourneyEvent({
        type: 'completed',
        workflowId: 'q12',
        projectId,
      });
    }
  };

  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="Services Todos"
      onStepComplete={handleStepComplete}
    />
  );
}
