'use client';

/**
 * WarrantyHandoffClient (q26, 2026-05-08 Wave 4)
 * ====================================
 *
 * The Warranty Handoff workflow. State persists in
 * command_center_projects.warranty_state JSONB (added in
 * 20260508_soon_workflow_state_columns.sql migration).
 *
 * Pattern parity with q3: form-driven steps flow through WorkflowShell;
 * file_upload steps render through AttachmentSection (Phase 2). Any
 * analysis_result step uses its docs/workflows.json promptId — if the
 * specialist isn't authored yet, the step renders the default fallback
 * (analysisTitle + placeholder), still useful as a UI surface.
 */

import { useEffect, useMemo, useState } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { useProjectWorkflowState, seedPayloadsFromRaw, statusFromSeeded } from '@/lib/hooks/useProjectWorkflowState';
import ProjectContextBanner from '../ProjectContextBanner';
import AttachmentSection from '@/components/AttachmentSection';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function WarrantyHandoffClient({ workflow, stages }: Props) {
  const {
    projectId: spineProjectId,
    hydratedPayloads,
    recordStepEvent,
    project,
  } = useProjectWorkflowState({
    column: 'warranty_state',
    workflowId: workflow.id,
  });

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

  const seededPayloads = useMemo(
    () => seedPayloadsFromRaw(workflow.steps, project?.raw_input, hydratedPayloads),
    [hydratedPayloads, project, workflow.steps]
  );
  const mergedStatusMap = useMemo(
    () => statusFromSeeded(seededPayloads, stepStatusMap),
    [seededPayloads, stepStatusMap]
  );

  const handleStepComplete = (result: StepResult & { workflowId: string }) => {
    recordStepEvent(result);
    if (result.type === 'step_completed') {
      setStepStatusMap((prev) => ({ ...prev, [result.stepId]: 'complete' }));
    } else if (result.type === 'step_saved') {
      setStepStatusMap((prev) => ({
        ...prev,
        [result.stepId]: prev[result.stepId] ?? 'in_progress',
      }));
    }
  };

  return (
    <>
      <ProjectContextBanner project={project} selfWorkflow="warranty-handoff" />
      <AttachmentSection
        projectId={spineProjectId}
        workflowId="q26"
        stepId="s26-4"
        title="File the paperwork"
        subtitle="Drop the manufacturer warranty docs, certificates, and any signed handoff acknowledgements. They stick to the project for the warranty window."
        onUploaded={(uploaded) => {
          recordStepEvent({
            type: 'step_completed',
            workflowId: 'q26',
            stepId: 's26-4',
            payload: { value: `${uploaded.length} ${uploaded.length === 1 ? 'file' : 'files'} uploaded` },
            timestamp: Date.now(),
          });
        }}
      />
      <WorkflowShell
        workflow={workflow}
        stages={stages}
        breadcrumbLabel="Warranty Handoff"
        contextFields={['lane']}
        onStepComplete={handleStepComplete}
        projectId={spineProjectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={mergedStatusMap}
      />
    </>
  );
}
