'use client';

import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { StepResult } from '@/design-system/components/StepCard.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';
import { useEffect, useState } from 'react';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function OshaToolboxClient({ workflow, stages }: Props) {
  const projectId = resolveProjectId();
  const [stepResults, setStepResults] = useState<Record<string, StepResult>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        emitJourneyEvent({ type: 'completed', workflowId: 'q16', projectId });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectId]);

  const handleStepComplete = (result: StepResult & { workflowId: string }) => {
    setStepResults((prev) => ({
      ...prev,
      [result.stepId]: result,
    }));

    // Check if all steps are completed
    if (result.type === 'step_completed') {
      const completedCount = Object.keys(stepResults).length + 1;
      if (completedCount >= workflow.steps.length) {
        emitJourneyEvent({ type: 'completed', workflowId: 'q16', projectId });
      }
    }
  };

  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="OSHA Toolbox Talks"
      contextFields={['trade', 'lane']}
      onStepComplete={handleStepComplete}
    />
  );
}
