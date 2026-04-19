'use client';
import { useEffect, useState } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function JobSequencingClient({ workflow, stages }: Props) {
  const [projectId, setProjectId] = useState<string>('default');

  useEffect(() => {
    setProjectId(resolveProjectId());
  }, []);

  function handleStepComplete(stepResult: StepResult & { workflowId: string }) {
    // Check if all steps are marked complete by counting step completions
    // The WorkflowShell emits step_completed events automatically,
    // so we just need to emit the final 'completed' event when the last step finishes
    const lastStepIndex = workflow.steps.length - 1;

    if (
      stepResult.stepId === workflow.steps[lastStepIndex]?.id
    ) {
      emitJourneyEvent({
        type: 'completed',
        workflowId: 'q6',
        projectId,
      });
    }
  }

  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="Job Sequencing"
      onStepComplete={handleStepComplete}
    />
  );
}
