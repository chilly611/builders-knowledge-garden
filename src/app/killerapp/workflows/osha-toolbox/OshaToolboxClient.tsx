'use client';

import { useEffect, useMemo, useState } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { StepResult } from '@/design-system/components/StepCard.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';
import { useProjectWorkflowState, seedPayloadsFromRaw, statusFromSeeded } from '@/lib/hooks/useProjectWorkflowState';
import ProjectContextBanner from '../ProjectContextBanner';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function OshaToolboxClient({ workflow, stages }: Props) {
  // Project Spine v1 (Wave 3, 2026-05-06): hydrate + autosave osha_toolbox_state.
  const {
    projectId: spineProjectId,
    hydratedPayloads,
    recordStepEvent,
    project,
  } = useProjectWorkflowState({
    column: 'osha_toolbox_state',
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
          workflowId: 'q16',
          projectId: spineProjectId ?? resolveProjectId(),
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spineProjectId]);

  const [stepResults, setStepResults] = useState<Record<string, StepResult>>({});

  // Pre-fill payloads from raw_input
  const seededPayloads = useMemo(
    () => seedPayloadsFromRaw(workflow.steps, project?.raw_input, hydratedPayloads),
    [hydratedPayloads, project, workflow.steps]
  );
  const mergedStatusMap = useMemo(
    () => statusFromSeeded(seededPayloads, stepStatusMap),
    [seededPayloads, stepStatusMap]
  );

  const handleStepComplete = (result: StepResult & { workflowId: string }) => {
    // Project Spine v1: persist this step's payload into osha_toolbox_state.
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

    setStepResults((prev) => ({
      ...prev,
      [result.stepId]: result,
    }));

    // Check if all steps are completed
    if (result.type === 'step_completed') {
      const completedCount = Object.keys(stepResults).length + 1;
      if (completedCount >= workflow.steps.length) {
        emitJourneyEvent({
          type: 'completed',
          workflowId: 'q16',
          projectId: spineProjectId ?? resolveProjectId(),
        });
      }
    }
  };

  return (
    <>
      <ProjectContextBanner project={project} selfWorkflow="osha-toolbox" />
      <WorkflowShell
        workflow={workflow}
        stages={stages}
        breadcrumbLabel="OSHA Toolbox Talks"
        contextFields={['trade', 'lane']}
        onStepComplete={handleStepComplete}
        projectId={spineProjectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={mergedStatusMap}
      />
    </>
  );
}
