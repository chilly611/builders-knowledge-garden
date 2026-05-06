'use client';

import { useEffect, useMemo, useState } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';
import { useProjectWorkflowState, seedPayloadsFromRaw, statusFromSeeded } from '@/lib/hooks/useProjectWorkflowState';
import ProjectContextBanner from '../ProjectContextBanner';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function DailyLogClient({ workflow, stages }: Props) {
  // Project Spine v1 (Wave 2, 2026-05-06): hydrate + autosave daily_log_state.
  // Daily-log is voice-heavy (Hank's #1 workflow) — voice_input pre-fill
  // matters here so a foreman doesn't repeat the project description.
  const {
    projectId: spineProjectId,
    hydratedPayloads,
    recordStepEvent,
    project,
  } = useProjectWorkflowState({
    column: 'daily_log_state',
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
          workflowId: 'q15',
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

  const handleStepComplete = (result: StepResult & { workflowId: string }) => {
    // Project Spine v1: persist this step's payload into daily_log_state.
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
          workflowId: 'q15',
          projectId: spineProjectId ?? resolveProjectId(),
        });
      }
    }
  };

  return (
    <>
      <ProjectContextBanner project={project} selfWorkflow="daily-log" />
      <WorkflowShell
        workflow={workflow}
        stages={stages}
        breadcrumbLabel="Voice-to-Daily-Log"
        contextFields={['lane']}
        onStepComplete={handleStepComplete}
        projectId={spineProjectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={mergedStatusMap}
      />
    </>
  );
}
