'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { resolveProjectId, emitJourneyEvent, getJourneyState } from '@/lib/journey-progress';
import { useProjectWorkflowState, seedPayloadsFromRaw, statusFromSeeded } from '@/lib/hooks/useProjectWorkflowState';
import ProjectContextBanner from '../ProjectContextBanner';
import { colors, fonts, fontSizes, spacing, radii } from '@/design-system/tokens';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function CompassNavClient({ workflow, stages }: Props) {
  // Project Spine v1 (Wave 3, 2026-05-06): hydrate + autosave compass_nav_state.
  const {
    projectId: spineProjectId,
    hydratedPayloads,
    recordStepEvent,
    project,
  } = useProjectWorkflowState({
    column: 'compass_nav_state',
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

  // Pre-fill text/voice/analysis + location + sqft from raw_input.
  const seededPayloads = useMemo(
    () => seedPayloadsFromRaw(workflow.steps, project?.raw_input, hydratedPayloads),
    [hydratedPayloads, project, workflow.steps]
  );
  const mergedStatusMap = useMemo(
    () => statusFromSeeded(seededPayloads, stepStatusMap),
    [seededPayloads, stepStatusMap]
  );

  // Journey state for breadcrumb display
  const [journeyState, setJourneyState] = useState<any>(null);

  useEffect(() => {
    const id = spineProjectId ?? resolveProjectId();
    const state = getJourneyState(id);
    setJourneyState(state);
  }, [spineProjectId]);

  const handleStepComplete = useCallback(
    async (result: StepResult & { workflowId: string }) => {
      // Project Spine v1: persist this step's payload into compass_nav_state.
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

      if (result.stepId === 's19-5' && result.type === 'step_completed') {
        emitJourneyEvent({
          type: 'completed',
          workflowId: 'q19',
          projectId: spineProjectId ?? resolveProjectId(),
        });
      }
    },
    [spineProjectId, recordStepEvent]
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
    <>
      <ProjectContextBanner project={project} selfWorkflow="compass-nav" />
      <WorkflowShell
        workflow={workflow}
        stages={stages}
        breadcrumbLabel="Compass Navigation"
        contextFields={['trade', 'lane']}
        sidePanel={<SidePanel />}
        onStepComplete={handleStepComplete}
        projectId={spineProjectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={mergedStatusMap}
      />
    </>
  );
}
