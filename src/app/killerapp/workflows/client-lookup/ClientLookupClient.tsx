'use client';

/**
 * ClientLookupClient (q3, 2026-05-08)
 * ====================================
 * The 18th LIVE workflow. Form-driven: no AI specialist calls.
 *
 * Steps (from workflows.json):
 *   s3-1: file_upload    — Load your client file
 *   s3-2: multi_select   — Sort by project type (Residential / Commercial / etc)
 *   s3-3: text_input     — Flag payment behavior
 *   s3-4: file_upload    — Attach job photos
 *   s3-5: select         — When should we check back? (Weekly / Bi-weekly / etc)
 *
 * The two file_upload steps render through AttachmentSection (Phase 2
 * pattern). The other three are plain StepCard inputs — WorkflowShell
 * handles them the same way it does for q15/q5/q11.
 *
 * State persists in command_center_projects.client_lookup_state JSONB
 * (added in 2026-05-08 migration). Same hydrate-on-mount + autosave
 * pattern as the other 17 LIVE workflows.
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

export default function ClientLookupClient({ workflow, stages }: Props) {
  const {
    projectId: spineProjectId,
    hydratedPayloads,
    recordStepEvent,
    project,
  } = useProjectWorkflowState({
    column: 'client_lookup_state',
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
      <ProjectContextBanner project={project} selfWorkflow="client-lookup" />
      {/* s3-1: Client file. */}
      <AttachmentSection
        projectId={spineProjectId}
        workflowId="q3"
        stepId="s3-1"
        title="Load your client file"
        subtitle="Drop the prior contract, change-order history, payment record, or any reference doc you have on this client. Builds a profile for repeat work."
        onUploaded={(uploaded) => {
          recordStepEvent({
            type: 'step_completed',
            workflowId: 'q3',
            stepId: 's3-1',
            payload: { value: `${uploaded.length} ${uploaded.length === 1 ? 'file' : 'files'} uploaded` },
            timestamp: Date.now(),
          });
        }}
      />
      {/* s3-4: Job photos. */}
      <AttachmentSection
        projectId={spineProjectId}
        workflowId="q3"
        stepId="s3-4"
        title="Attach job photos"
        subtitle="Photos from past jobs with this client — quality of finishes, scope creep, anything that signals what this relationship looks like in practice."
        onUploaded={(uploaded) => {
          recordStepEvent({
            type: 'step_completed',
            workflowId: 'q3',
            stepId: 's3-4',
            payload: { value: `${uploaded.length} ${uploaded.length === 1 ? 'photo' : 'photos'} uploaded` },
            timestamp: Date.now(),
          });
        }}
      />
      <WorkflowShell
        workflow={workflow}
        stages={stages}
        breadcrumbLabel="Client Lookup"
        contextFields={['lane']}
        onStepComplete={handleStepComplete}
        projectId={spineProjectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={mergedStatusMap}
      />
    </>
  );
}
