'use client';
import { useState, useEffect } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { getProjectBudget, recordMaterialCost } from '@/lib/budget-spine';
import { colors, spacing, fonts, fontSizes, fontWeights, radii } from '@/design-system/tokens';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

interface BudgetSummary {
  totalEstimated?: number;
  categoryCount?: number;
}

export default function EstimatingClient({ workflow, stages }: Props) {
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [projectScope, setProjectScope] = useState<string>('');
  const [estimatedTotal, setEstimatedTotal] = useState<number>(0);

  useEffect(() => {
    async function loadBudget() {
      setLoadingBudget(true);
      const result = await getProjectBudget();
      if (!result.ok) {
        if (result.reason === 'no-active-project') {
          setBudgetError('no-active-project');
        } else {
          setBudgetError('error');
        }
      } else {
        const summary = result.summary as Record<string, unknown>;
        setBudgetSummary({
          totalEstimated: (summary.totalEstimated as number) || 0,
          categoryCount: Object.keys(summary).length - 1,
        });
      }
      setLoadingBudget(false);
    }
    loadBudget();
  }, []);

  async function handleStepComplete(stepResult: StepResult & { workflowId: string }) {
    // StepCard emits payload = { value } for text/voice/number_input steps.
    const textPayload = stepResult.payload as { value?: string } | undefined;

    // Capture project scope from the voice input step (s2-1)
    if (stepResult.stepId === 's2-1' && textPayload?.value) {
      setProjectScope(String(textPayload.value));
    }

    // After file upload (s2-5), if we have a project scope, record the estimate
    if (stepResult.stepId === 's2-5' && projectScope && estimatedTotal > 0) {
      const result = await recordMaterialCost({
        description: `AI estimate — ${projectScope}`,
        amount: estimatedTotal,
        lifecycleStageId: 1,
        isEstimate: true,
      });

      if (result.ok) {
        setBudgetSummary((prev) => ({
          ...prev,
          totalEstimated: (prev?.totalEstimated ?? 0) + estimatedTotal,
          categoryCount: (prev?.categoryCount ?? 0) + 1,
        }));
        setEstimatedTotal(0);
      }
    }
  }

  const topPanel = (
    <section
      style={{
        padding: spacing[4],
        backgroundColor: colors.ink[50],
        borderRadius: radii.md,
        border: `1px solid ${colors.ink[100]}`,
      }}
    >
      {loadingBudget ? (
        <p style={{ fontSize: fontSizes.sm, color: colors.ink[400] }}>Loading budget...</p>
      ) : budgetError === 'no-active-project' ? (
        <div>
          <p style={{ fontSize: fontSizes.sm, color: colors.ink[600], marginBottom: spacing[2] }}>
            No active project yet.
          </p>
          <a
            href="/killerapp"
            style={{
              display: 'inline-block',
              padding: `${spacing[2]} ${spacing[3]}`,
              fontSize: fontSizes.sm,
              color: '#FFFFFF',
              backgroundColor: colors.ink[900],
              textDecoration: 'none',
              borderRadius: radii.sm,
            }}
          >
            Create a project
          </a>
        </div>
      ) : budgetError === 'error' ? (
        <p style={{ fontSize: fontSizes.sm, color: colors.ink[600] }}>
          Could not load budget. Please refresh.
        </p>
      ) : (
        <div>
          <p style={{ fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.ink[900] }}>
            Budget snapshot
          </p>
          <p style={{ fontSize: fontSizes.xs, color: colors.ink[400], marginTop: spacing[1] }}>
            {budgetSummary?.totalEstimated && budgetSummary.totalEstimated > 0
              ? `You've recorded $${budgetSummary.totalEstimated.toLocaleString()} of estimates across ${budgetSummary.categoryCount || 1} categories so far.`
              : 'No estimates recorded yet. Add one to see it here.'}
          </p>
        </div>
      )}
    </section>
  );

  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="AI Estimating Gate"
      topPanel={topPanel}
      onStepComplete={handleStepComplete}
    />
  );
}
