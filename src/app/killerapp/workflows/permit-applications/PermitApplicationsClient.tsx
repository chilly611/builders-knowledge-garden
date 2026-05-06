'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { recordPermitCost } from '@/lib/budget-spine';
import { emitJourneyEvent, resolveProjectId, resolveJurisdiction } from '@/lib/journey-progress';
import { useProjectWorkflowState } from '@/lib/hooks/useProjectWorkflowState';
import ProjectContextBanner from '../ProjectContextBanner';
import { spacing, colors, fonts, fontSizes, fontWeights, radii } from '@/design-system/tokens';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

const PERMIT_FEES: Record<string, number | null> = {
  's8-1': null,
  's8-2': null,
  's8-3': null,
  's8-4': null,
  's8-5': null,
};

export default function PermitApplicationsClient({ workflow, stages }: Props) {
  // Project Spine v1 (Wave 2, 2026-05-06): hydrate + autosave permits_state.
  const {
    projectId: spineProjectId,
    hydratedPayloads,
    recordStepEvent,
    lastSavedAt,
    saving,
    project,
  } = useProjectWorkflowState({
    column: 'permits_state',
    workflowId: workflow.id,
  });

  const [permitFees, setPermitFees] = useState<Record<string, number | null>>(PERMIT_FEES);

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

  const handleStepComplete = useCallback(
    async (stepResult: StepResult & { workflowId: string }) => {
      // Project Spine v1: persist this step's payload into permits_state.
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

      if (stepResult.type !== 'step_completed') return;

      const stepId = stepResult.stepId;
      const permitNames: Record<string, string> = {
        's8-1': 'Building permit',
        's8-2': 'Electrical permit',
        's8-3': 'Plumbing permit',
        's8-4': 'Mechanical permit',
        's8-5': 'All approved',
      };

      // Prefer URL-bound project id over localStorage for budget writes.
      const budgetProjectId = spineProjectId ?? resolveProjectId();
      const jurisdiction =
        project?.jurisdiction?.trim() ||
        resolveJurisdiction();
      const permitName = permitNames[stepId] || 'Permit';

      if (
        (stepId === 's8-1' || stepId === 's8-2' || stepId === 's8-3' || stepId === 's8-4') &&
        permitFees[stepId] !== null
      ) {
        await recordPermitCost({
          description: `Permit fee — ${permitName}`,
          amount: permitFees[stepId]!,
          lifecycleStageId: 3,
          isEstimate: false,
          vendor: jurisdiction,
          projectId: budgetProjectId,
        });
      }

      if (stepId === 's8-5') {
        emitJourneyEvent({
          type: 'completed',
          workflowId: workflow.id,
          projectId: budgetProjectId,
        });
      }
    },
    [permitFees, workflow.id, spineProjectId, project, recordStepEvent]
  );

  // Saved indicator string.
  const savedLabel = saving
    ? 'Saving…'
    : lastSavedAt
      ? `Saved · ${new Date(lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : null;

  // Pre-fill unsaved text/voice/analysis steps with raw_input so the
  // user doesn't retype the project description across every step.
  const seededPayloads = useMemo(() => {
    const out = { ...hydratedPayloads };
    const raw = project?.raw_input?.trim();
    if (!raw) return out;
    for (const step of workflow.steps) {
      if (out[step.id]) continue;
      if (step.type === 'text_input' || step.type === 'voice_input') {
        out[step.id] = { value: raw };
      } else if (step.type === 'analysis_result') {
        out[step.id] = { input: raw };
      }
    }
    return out;
  }, [hydratedPayloads, project, workflow.steps]);

  const handleFeeChange = (stepId: string, fee: number | null) => {
    setPermitFees((prev) => ({ ...prev, [stepId]: fee }));
  };

  const topPanel = (
    <div
      style={{
        padding: spacing[4],
        marginBottom: spacing[6],
        backgroundColor: colors.ink[50],
        borderRadius: radii.md,
        border: `1px solid ${colors.ink[100]}`,
        position: 'relative',
      }}
    >
      {savedLabel && (
        <span
          aria-live="polite"
          style={{
            position: 'absolute',
            top: spacing[2],
            right: spacing[3],
            fontSize: fontSizes.xs,
            color: colors.ink[500],
            fontFamily: fonts.body,
          }}
          data-testid="permits-saved-indicator"
        >
          {savedLabel}
        </span>
      )}
      <h3
        style={{
          margin: `0 0 ${spacing[3]} 0`,
          fontSize: fontSizes.sm,
          fontWeight: fontWeights.semibold,
          color: colors.ink[900],
        }}
      >
        Permit Fee Estimates
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        {['s8-1', 's8-2', 's8-3', 's8-4'].map((stepId) => (
          <label key={stepId} style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <input
              type="number"
              placeholder="Fee amount ($)"
              value={permitFees[stepId] ?? ''}
              onChange={(e) =>
                handleFeeChange(stepId, e.target.value ? Number(e.target.value) : null)
              }
              style={{
                flex: 1,
                padding: spacing[2],
                fontSize: fontSizes.sm,
                fontFamily: fonts.body,
                border: `1px solid ${colors.ink[200]}`,
                borderRadius: radii.sm,
                backgroundColor: 'var(--trace)',
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <ProjectContextBanner project={project} selfWorkflow="permit-applications" />
      <WorkflowShell
        workflow={workflow}
        stages={stages}
        breadcrumbLabel="Permit Applications"
        topPanel={topPanel}
        contextFields={['trade', 'lane']}
        onStepComplete={handleStepComplete}
        projectId={spineProjectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={stepStatusMap}
      />
    </>
  );
}
