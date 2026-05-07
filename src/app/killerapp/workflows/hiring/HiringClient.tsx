'use client';

import { useEffect, useMemo, useState } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { recordLaborCost } from '@/lib/budget-spine';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';
import { useProjectWorkflowState, seedPayloadsFromRaw, statusFromSeeded } from '@/lib/hooks/useProjectWorkflowState';
import ProjectContextBanner from '../ProjectContextBanner';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function HiringClient({ workflow, stages }: Props) {
  // Project Spine v1 (Wave 3, 2026-05-06): hydrate + autosave hiring_state.
  const {
    projectId: spineProjectId,
    hydratedPayloads,
    recordStepEvent,
    project,
  } = useProjectWorkflowState({
    column: 'hiring_state',
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

  // Local state for labor cost tracking
  const [workerName, setWorkerName] = useState('');
  const [role, setRole] = useState('');
  const [weeklyCost, setWeeklyCost] = useState(0);

  // Pre-fill text/voice/analysis + location + sqft from raw_input.
  const seededPayloads = useMemo(
    () => seedPayloadsFromRaw(workflow.steps, project?.raw_input, hydratedPayloads),
    [hydratedPayloads, project, workflow.steps]
  );
  const mergedStatusMap = useMemo(
    () => statusFromSeeded(seededPayloads, stepStatusMap),
    [seededPayloads, stepStatusMap]
  );

  const handleStepComplete = async (stepResult: StepResult & { workflowId: string }) => {
    // Project Spine v1: persist this step's payload into hiring_state.
    recordStepEvent(stepResult);

    // Bump local statusMap so counter updates in-session.
    if (stepResult.type === 'step_completed') {
      setStepStatusMap((prev) => ({ ...prev, [stepResult.stepId]: 'complete' }));
    } else if (stepResult.type === 'step_saved') {
      setStepStatusMap((prev) => ({
        ...prev,
        [stepResult.stepId]: prev[stepResult.stepId] ?? 'in_progress',
      }));
    }

    // s13-1 is "Define role" (text_input) — capture role
    if (stepResult.stepId === 's13-1' && stepResult.type === 'step_completed') {
      setRole(((stepResult.payload as { value?: string } | undefined)?.value ?? ''));
    }

    // s13-3 is "Review candidates" (text_input) — capture worker name
    if (stepResult.stepId === 's13-3' && stepResult.type === 'step_completed') {
      const text = ((stepResult.payload as { value?: string } | undefined)?.value ?? '');
      const nameMatch = text.match(/^([^\n,]+)/);
      if (nameMatch) setWorkerName(nameMatch[1].trim());
    }

    // s13-4 is "Send outreach" (text_input) — could extract cost info
    if (stepResult.stepId === 's13-4' && stepResult.type === 'step_completed') {
      const text = ((stepResult.payload as { value?: string } | undefined)?.value ?? '');
      const costMatch = text.match(/\$?\d+(?:k|K)?/);
      if (costMatch) {
        const costStr = costMatch[0].replace(/[$k]/gi, '');
        const cost = parseFloat(costStr) * (costMatch[0].includes('k') || costMatch[0].includes('K') ? 1000 : 1);
        if (!isNaN(cost)) setWeeklyCost(cost);
      }
    }

    // s13-5 is final "Confirm hire" (checklist) — record labor cost if available
    if (stepResult.stepId === 's13-5' && stepResult.type === 'step_completed') {
      if (weeklyCost > 0 && (workerName || role)) {
        const description = `New hire — ${workerName || 'Worker'} — ${role || 'Role TBD'}`;
        await recordLaborCost({
          description,
          amount: weeklyCost * 4,
          lifecycleStageId: 3,
          isEstimate: true,
          vendor: workerName || undefined,
          projectId: spineProjectId ?? resolveProjectId(),
        });
      }
    }

    // Check if workflow complete
    if (stepResult.type === 'step_completed') {
      const stepIndex = workflow.steps.findIndex((s) => s.id === stepResult.stepId);
      const allComplete = stepIndex >= 0 && workflow.steps.length <= stepIndex + 1;
      if (allComplete) {
        emitJourneyEvent({
          type: 'completed',
          workflowId: 'q13',
          projectId: spineProjectId ?? resolveProjectId(),
        });
      }
    }
  };

  return (
    <>
      <ProjectContextBanner project={project} selfWorkflow="hiring" />
      <WorkflowShell
        workflow={workflow}
        stages={stages}
        breadcrumbLabel="Hiring Lane"
        onStepComplete={handleStepComplete}
        projectId={spineProjectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={mergedStatusMap}
      />
    </>
  );
}
