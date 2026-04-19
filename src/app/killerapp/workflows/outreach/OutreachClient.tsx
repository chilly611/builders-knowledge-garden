'use client';

import { useCallback, useEffect, useState } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { resolveProjectId, emitJourneyEvent } from '@/lib/journey-progress';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function OutreachClient({ workflow, stages }: Props) {
  const [projectId, setProjectId] = useState<string>('default');

  useEffect(() => {
    setProjectId(resolveProjectId());
  }, []);

  const handleStepComplete = useCallback(
    async (result: StepResult & { workflowId: string }) => {
      if (result.stepId === 's18-5' && result.type === 'step_completed') {
        emitJourneyEvent({
          type: 'completed',
          workflowId: 'q18',
          projectId,
        });
      }
    },
    [projectId]
  );

  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="Contacts + Outreach"
      onStepComplete={handleStepComplete}
      projectId={projectId}
    />
  );
}
