'use client';

import { useState, useCallback } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { recordPermitCost } from '@/lib/budget-spine';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';
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
  const [permitFees, setPermitFees] = useState<Record<string, number | null>>(PERMIT_FEES);
  const projectId = resolveProjectId();

  const handleStepComplete = useCallback(
    async (stepResult: StepResult & { workflowId: string }) => {
      if (stepResult.type !== 'step_completed') return;

      const stepId = stepResult.stepId;
      const permitNames: Record<string, string> = {
        's8-1': 'Building permit',
        's8-2': 'Electrical permit',
        's8-3': 'Plumbing permit',
        's8-4': 'Mechanical permit',
        's8-5': 'All approved',
      };

      const jurisdiction = localStorage?.getItem('bkg-jurisdiction') || 'Local AHJ';
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
          projectId,
        });
      }

      if (stepId === 's8-5') {
        emitJourneyEvent({
          type: 'completed',
          workflowId: workflow.id,
          projectId,
        });
      }
    },
    [permitFees, workflow.id, projectId]
  );

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
      }}
    >
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
                backgroundColor: '#FFFFFF',
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="Permit Applications"
      topPanel={topPanel}
      contextFields={['trade', 'lane']}
      onStepComplete={handleStepComplete}
      projectId={projectId}
    />
  );
}
