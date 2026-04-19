'use client';

import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';
import { useEffect } from 'react';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function DailyLogClient({ workflow, stages }: Props) {
  const projectId = resolveProjectId();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        emitJourneyEvent({ type: 'completed', workflowId: 'q15', projectId });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectId]);

  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="Voice-to-Daily-Log"
      contextFields={['lane']}
      onStepComplete={(result) => {
        if (result.type === 'step_completed') {
          const stepIndex = workflow.steps.findIndex((s) => s.id === result.stepId);
          const allComplete = stepIndex >= 0 && workflow.steps.length <= stepIndex + 1;
          if (allComplete) {
            emitJourneyEvent({ type: 'completed', workflowId: 'q15', projectId });
          }
        }
      }}
    />
  );
}
