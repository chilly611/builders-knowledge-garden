'use client';

import { useCallback, useEffect, useState } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { resolveProjectId, emitJourneyEvent, getJourneyState } from '@/lib/journey-progress';
import { colors, fonts, fontSizes, spacing, radii } from '@/design-system/tokens';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function CompassNavClient({ workflow, stages }: Props) {
  const [projectId, setProjectId] = useState<string>('default');
  const [journeyState, setJourneyState] = useState<any>(null);

  useEffect(() => {
    const id = resolveProjectId();
    setProjectId(id);
    const state = getJourneyState(id);
    setJourneyState(state);
  }, []);

  const handleStepComplete = useCallback(
    async (result: StepResult & { workflowId: string }) => {
      if (result.stepId === 's19-5' && result.type === 'step_completed') {
        emitJourneyEvent({
          type: 'completed',
          workflowId: 'q19',
          projectId,
        });
      }
    },
    [projectId]
  );

  const SidePanel = () => {
    if (!journeyState) return null;
    const workflowIds = Object.keys(journeyState);
    const stageStatuses = stages.map((stage) => {
      const stageWorkflows = workflowIds.filter((wId) => {
        const wf = workflow.id === wId ? workflow : null;
        return wf?.stageId === stage.id;
      });
      const done = stageWorkflows.filter(
        (wId) => journeyState[wId]?.status === 'done'
      ).length;
      return {
        stageName: stage.name,
        done,
        total: stageWorkflows.length || 1,
      };
    });

    return (
      <div
        style={{
          padding: spacing[4],
          backgroundColor: colors.ink[50],
          borderRadius: radii.md,
          border: `1px solid ${colors.ink[100]}`,
          fontSize: fontSizes.sm,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: spacing[3], color: colors.ink[900] }}>
          Journey Progress
        </div>
        {stageStatuses.map((s) => (
          <div key={s.stageName} style={{ marginBottom: spacing[2], color: colors.ink[700] }}>
            <span>{s.stageName}</span>
            <span style={{ marginLeft: spacing[2], color: colors.ink[500] }}>
              {s.done}/{s.total}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="Compass Navigation"
      contextFields={['trade', 'lane']}
      sidePanel={<SidePanel />}
      onStepComplete={handleStepComplete}
      projectId={projectId}
    />
  );
}
