'use client';

/**
 * LienWaiversClient (q22, 2026-05-08 Wave 4)
 * ====================================
 *
 * The Lien Waiver Tracker workflow. State persists in
 * command_center_projects.lien_waivers_state JSONB (added in
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

export default function LienWaiversClient({ workflow, stages }: Props) {
  const {
    projectId: spineProjectId,
    hydratedPayloads,
    recordStepEvent,
    project,
  } = useProjectWorkflowState({
    column: 'lien_waivers_state',
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
      <ProjectContextBanner project={project} selfWorkflow="lien-waivers" />
      {/* Preview banner — workflow audit (Maya construction-lender, 2026-05) flagged
          this as too thin for production use. CA requires four distinct statutory
          waiver forms (Civ Code §§ 8132 / 8134 / 8136 / 8138 — conditional vs.
          unconditional × progress vs. final), not the 2 generic checklist items
          here. Keeping the surface deep-linkable but visibly under-construction. */}
      <div
        role="note"
        style={{
          margin: '12px 16px 0',
          padding: '12px 16px',
          backgroundColor: '#FFF6E5',
          border: '1px solid #B6873A',
          borderRadius: 4,
          color: '#0E2A47',
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        <strong>Preview — content under construction.</strong>{' '}
        California requires statutory waiver forms (Civ Code §§ 8132, 8134, 8136, 8138).{' '}
        <a
          href="https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CIV&division=4.&title=&part=6.&chapter=4.&article=2."
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#9E6F2F', textDecoration: 'underline' }}
        >
          CA Civil Code statutory templates
        </a>
        .
      </div>
      <AttachmentSection
        projectId={spineProjectId}
        workflowId="q22"
        stepId="s22-3"
        title="Load the signed copies"
        subtitle="Drop the signed conditional or final waivers as they come back from subs and suppliers. We tag each to this project."
        onUploaded={(uploaded) => {
          recordStepEvent({
            type: 'step_completed',
            workflowId: 'q22',
            stepId: 's22-3',
            payload: { value: `${uploaded.length} ${uploaded.length === 1 ? 'file' : 'files'} uploaded` },
            timestamp: Date.now(),
          });
        }}
      />
      <WorkflowShell
        workflow={workflow}
        stages={stages}
        breadcrumbLabel="Lien Waiver Tracker"
        contextFields={['lane']}
        onStepComplete={handleStepComplete}
        projectId={spineProjectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={mergedStatusMap}
      />
    </>
  );
}
