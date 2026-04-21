'use client';

import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';
import { useEffect } from 'react';
import { colors, fonts, fontSizes, fontWeights, spacing, radii } from '@/design-system/tokens';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function WeatherSchedulingClient({ workflow, stages }: Props) {
  const projectId = resolveProjectId();

  useEffect(() => {
    // Emit completion event when all steps are marked complete
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        emitJourneyEvent({ type: 'completed', workflowId: 'q14', projectId });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectId]);

  const topPanel = (
    <div
      style={{
        padding: spacing[4],
        backgroundColor: colors.ink[50],
        borderRadius: radii.md,
        border: `1px solid ${colors.ink[100]}`,
      }}
    >
      <label style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        <span
          style={{
            fontSize: fontSizes.sm,
            fontWeight: fontWeights.semibold,
            color: colors.ink[900],
          }}
        >
          Forecast Location (Zip or Address)
        </span>
        <input
          type="text"
          placeholder="e.g., 94105 or San Francisco, CA"
          style={{
            padding: spacing[2],
            fontSize: fontSizes.sm,
            fontFamily: fonts.body,
            border: `1px solid ${colors.ink[200]}`,
            borderRadius: radii.sm,
            backgroundColor: 'var(--trace)',
            color: colors.ink[900],
          }}
        />
        <span style={{ fontSize: fontSizes.xs, color: colors.ink[500] }}>
          Enter your site location to fetch the 10-day forecast
        </span>
      </label>
    </div>
  );

  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="Weather Scheduling"
      contextFields={['lane']}
      topPanel={topPanel}
      onStepComplete={(result) => {
        if (result.type === 'step_completed') {
          const stepIndex = workflow.steps.findIndex((s) => s.id === result.stepId);
          const allComplete = stepIndex >= 0 && workflow.steps.length <= stepIndex + 1;
          if (allComplete) {
            emitJourneyEvent({ type: 'completed', workflowId: 'q14', projectId });
          }
        }
      }}
    />
  );
}
