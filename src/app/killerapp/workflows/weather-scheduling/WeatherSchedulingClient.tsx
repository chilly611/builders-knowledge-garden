'use client';

import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';
import { useEffect, useMemo, useState } from 'react';
import { colors, fonts, fontSizes, fontWeights, spacing, radii } from '@/design-system/tokens';
import { useProjectWorkflowState, seedPayloadsFromRaw, statusFromSeeded } from '@/lib/hooks/useProjectWorkflowState';
import ProjectContextBanner from '../ProjectContextBanner';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function WeatherSchedulingClient({ workflow, stages }: Props) {
  // Project Spine v1 (Wave 3, 2026-05-06): hydrate + autosave weather_scheduling_state.
  const {
    projectId: spineProjectId,
    hydratedPayloads,
    recordStepEvent,
    project,
  } = useProjectWorkflowState({
    column: 'weather_scheduling_state',
    workflowId: workflow.id,
  });

  // Track step status locally; seed from hydrated.
  const [stepStatusMap, setStepStatusMap] = useState<
    Record<string, 'pending' | 'in_progress' | 'complete'>
  >({});

  useEffect(() => {
    if (Object.keys(hydratedPayloads).length === 0) return;
    setStepStatusMap((prev) => {
      const next = { ...prev };
      for (const stepId of Object.keys(hydratedPayloads)) {
        if (!next[stepId]) next[stepId] = 'complete';
      }
      return next;
    });
  }, [hydratedPayloads]);

  // Cmd-Enter "I'm done" shortcut, preserved from previous version.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        emitJourneyEvent({
          type: 'completed',
          workflowId: 'q14',
          projectId: spineProjectId ?? resolveProjectId(),
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spineProjectId]);

  // Pre-fill text/voice/analysis + location + sqft from raw_input.
  const seededPayloads = useMemo(
    () => seedPayloadsFromRaw(workflow.steps, project?.raw_input, hydratedPayloads),
    [hydratedPayloads, project, workflow.steps]
  );
  const mergedStatusMap = useMemo(
    () => statusFromSeeded(seededPayloads, stepStatusMap),
    [seededPayloads, stepStatusMap]
  );

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
          Where's the site? (City or ZIP to pull the 10-day forecast.)
        </span>
      </label>
    </div>
  );

  const handleStepComplete = (result: StepResult & { workflowId: string }) => {
    // Project Spine v1: persist this step's payload into weather_scheduling_state.
    recordStepEvent(result);

    // Bump local statusMap so counter updates in-session.
    if (result.type === 'step_completed') {
      setStepStatusMap((prev) => ({ ...prev, [result.stepId]: 'complete' }));
    } else if (result.type === 'step_saved') {
      setStepStatusMap((prev) => ({
        ...prev,
        [result.stepId]: prev[result.stepId] ?? 'in_progress',
      }));
    }

    if (result.type === 'step_completed') {
      const stepIndex = workflow.steps.findIndex((s) => s.id === result.stepId);
      const allComplete = stepIndex >= 0 && workflow.steps.length <= stepIndex + 1;
      if (allComplete) {
        emitJourneyEvent({
          type: 'completed',
          workflowId: 'q14',
          projectId: spineProjectId ?? resolveProjectId(),
        });
      }
    }
  };

  return (
    <>
      <ProjectContextBanner project={project} selfWorkflow="weather-scheduling" />
      <WorkflowShell
        workflow={workflow}
        stages={stages}
        breadcrumbLabel="Weather Scheduling"
        contextFields={['lane']}
        topPanel={topPanel}
        onStepComplete={handleStepComplete}
        projectId={spineProjectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={mergedStatusMap}
      />
    </>
  );
}
