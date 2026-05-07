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

interface CrewAnalysisData {
  crewSize?: number;
  estimatedLaborCost?: number;
}

export default function WorkerCountClient({ workflow, stages }: Props) {
  // Project Spine v1 (Wave 3, 2026-05-06): hydrate + autosave worker_count_state.
  const {
    projectId: spineProjectId,
    hydratedPayloads,
    recordStepEvent,
    project,
  } = useProjectWorkflowState({
    column: 'worker_count_state',
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

  // Pre-existing pattern: resolve projectId for budget writes.
  // ESLint set-state-in-effect warning is expected per lessons file.
  const [projectIdLocal, setProjectIdLocal] = useState<string>('default');
  useEffect(() => {
    setProjectIdLocal(resolveProjectId());
  }, []);

  const [crewAnalysisData, setCrewAnalysisData] = useState<CrewAnalysisData>({});

  // Pre-fill payloads from raw_input (location, sqft, analysis context)
  const seededPayloads = useMemo(
    () => seedPayloadsFromRaw(workflow.steps, project?.raw_input, hydratedPayloads),
    [hydratedPayloads, project, workflow.steps]
  );
  const mergedStatusMap = useMemo(
    () => statusFromSeeded(seededPayloads, stepStatusMap),
    [seededPayloads, stepStatusMap]
  );

  /**
   * Parse labor cost from analysis text using detect-and-multiply for k-suffix.
   * Matches the pattern in EstimatingClient.parseRoughTotal but scoped to q7.
   * W4.1f follow-up: thread `date` arg when the step UX asks for scheduled start.
   */
  function parseLaborCost(text: string): number | null {
    const costMatch = text.match(/\$[\d,]+\.?\d*k?/);
    if (!costMatch) return null;
    const raw = costMatch[0];
    // $48.2k means 48,200 — not 48.2 with trailing zeros. Handle k suffix
    // by detect-and-multiply, not blind string replace.
    const hasK = /k$/i.test(raw);
    const numeric = parseFloat(raw.replace(/k$/i, '').replace(/[$,]/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return hasK ? numeric * 1000 : numeric;
  }

  async function handleStepComplete(stepResult: StepResult & { workflowId: string }) {
    // Project Spine v1: persist this step's payload into worker_count_state.
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

    const valuePayload = stepResult.payload as { value?: string } | undefined;
    const analysisPayload = stepResult.payload as { input?: string } | undefined;

    // Capture crew size from s7-1 (number_input)
    if (stepResult.stepId === 's7-1' && valuePayload?.value) {
      setCrewAnalysisData((prev) => ({
        ...prev,
        crewSize: Number(valuePayload.value),
      }));
    }

    // After s7-2 (analysis_result) completes, extract cost from user's input text.
    // Note: AI analysis output is not piped through the event bus — only payload.input is.
    if (stepResult.stepId === 's7-2' && analysisPayload?.input) {
      const analysisText = String(analysisPayload.input);
      // Parse estimated labor cost from analysis output if available
      const cost = parseLaborCost(analysisText);
      if (cost !== null) {
        setCrewAnalysisData((prev) => ({
          ...prev,
          estimatedLaborCost: cost,
        }));

        // Record the labor cost estimate (guarded on crewSize only;
        // no duration is captured in q7 workflow steps).
        if (crewAnalysisData.crewSize) {
          const result = await recordLaborCost({
            description: `Estimated labor — ${crewAnalysisData.crewSize} workers`,
            amount: cost,
            lifecycleStageId: 3,
            isEstimate: true,
          });

          if (!result.ok && result.reason !== 'no-active-project') {
            console.error('Labor cost recording failed:', result);
          }
        }
      }
    }

    // Emit 'completed' event on last step (s7-5)
    if (stepResult.type === 'step_completed') {
      const lastStepIndex = workflow.steps.length - 1;
      if (stepResult.stepId === workflow.steps[lastStepIndex]?.id) {
        emitJourneyEvent({
          type: 'completed',
          workflowId: 'q7',
          projectId: spineProjectId ?? projectIdLocal,
        });
      }
    }
  }

  return (
    <>
      <ProjectContextBanner project={project} selfWorkflow="worker-count" />
      <WorkflowShell
        workflow={workflow}
        stages={stages}
        breadcrumbLabel="Worker Count"
        onStepComplete={handleStepComplete}
        projectId={spineProjectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={mergedStatusMap}
      />
    </>
  );
}
