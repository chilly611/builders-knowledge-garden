'use client';
import { useState, useEffect } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { getProjectBudget, recordMaterialCost } from '@/lib/budget-spine';
import { resolveProjectId } from '@/lib/journey-progress';
import { colors, spacing, fonts, fontSizes, fontWeights, radii } from '@/design-system/tokens';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

// Shape of GET /api/v1/budget#summary (narrow — only the fields q2 reads).
// Source of truth: src/app/api/v1/budget/route.ts#BudgetSummary
interface BudgetSummaryShape {
  totalEstimated?: number;
  byCategory?: Record<string, { spent: number; estimated: number; count: number }>;
}

interface BudgetSnapshot {
  totalEstimated: number;
  categoryCount: number;
}

/**
 * Parse a rough-total dollar figure out of the contractor's final edit of
 * the AI takeoff. Matches the prompt contract (see
 * docs/ai-prompts/estimating-takeoff.md): the specialist is instructed to
 * emit a `Rough total: $XX,XXX` line that survives downstream parsing.
 *
 * We scan the text top-to-bottom and prefer the value after "Rough total:"
 * if present; otherwise fall back to the LAST `$XX,XXX` in the text so
 * itemized-line dollar amounts don't capture the handler. Same cross-cutting
 * caveat as q7/q11/q13/q17: until the prompt returns structured JSON, this
 * regex is load-bearing. Flipping all five handlers to structured output is
 * parked (see docs/ai-prompts/estimating-takeoff.md#production-rewrite).
 */
function parseRoughTotal(text: string): number | null {
  // Prefer explicit "Rough total:" anchor if the specialist kept format.
  const anchored = text.match(/Rough total:\s*(\$[\d,]+\.?\d*k?)/i);
  // Fall back to the LAST dollar figure in the text so itemized-line values
  // don't capture the handler if the anchor is missing.
  const candidate = anchored?.[1] ?? text.match(/\$[\d,]+\.?\d*k?[^$]*$/)?.[0];
  if (!candidate) return null;
  const raw = candidate.match(/\$[\d,]+\.?\d*k?/i)?.[0];
  if (!raw) return null;
  // $48.2k means 48,200 — not 48.2 with trailing zeros. Handle k suffix
  // by detect-and-multiply, not blind string replace (the naive
  // `.replace('k','000')` pattern used elsewhere in the codebase breaks on
  // decimal-k values; flagged as cross-cutting cleanup for W4.3b-polish).
  const hasK = /k$/i.test(raw);
  const numeric = parseFloat(raw.replace(/k$/i, '').replace(/[$,]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return hasK ? numeric * 1000 : numeric;
}

export default function EstimatingClient({ workflow, stages }: Props) {
  const [budgetSnapshot, setBudgetSnapshot] = useState<BudgetSnapshot | null>(null);
  const [budgetError, setBudgetError] = useState<'no-active-project' | 'error' | null>(null);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [lastRecordedAmount, setLastRecordedAmount] = useState<number | null>(null);

  async function refreshBudget() {
    const result = await getProjectBudget();
    if (!result.ok) {
      setBudgetError(result.reason === 'no-active-project' ? 'no-active-project' : 'error');
      setBudgetSnapshot(null);
      return;
    }
    const summary = result.summary as BudgetSummaryShape;
    const totalEstimated = summary.totalEstimated ?? 0;
    // Real category count = categories with at least one estimated-line > 0.
    // (The old code counted Object.keys(summary).length - 1, which reflected
    // API field count, not budget categories — classic bug.)
    const categoryCount = summary.byCategory
      ? Object.values(summary.byCategory).filter((c) => c.estimated > 0).length
      : 0;
    setBudgetError(null);
    setBudgetSnapshot({ totalEstimated, categoryCount });
  }

  useEffect(() => {
    setLoadingBudget(true);
    refreshBudget().finally(() => setLoadingBudget(false));
  }, []);

  async function handleStepComplete(stepResult: StepResult & { workflowId: string }) {
    // Only the final step (s2-6 AI estimate) drives a budget write. Earlier
    // steps are input capture; the specialist reads them all at once.
    if (stepResult.stepId !== 's2-6' || stepResult.type !== 'step_completed') return;

    const payload = stepResult.payload as { input?: string } | undefined;
    const finalText = payload?.input ?? '';
    const amount = parseRoughTotal(finalText);
    if (amount === null) return; // Silent skip — contractor may have cleared the figure on purpose.

    const projectId = resolveProjectId();
    const result = await recordMaterialCost({
      description: 'AI estimate — Size Up',
      amount,
      lifecycleStageId: 1,
      isEstimate: true,
      projectId,
    });

    if (result.ok) {
      setLastRecordedAmount(amount);
      // Re-fetch so the top panel reflects the new line item immediately.
      await refreshBudget();
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
        <p style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.ink[400] }}>
          Loading budget…
        </p>
      ) : budgetError === 'no-active-project' ? (
        <div>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: fontSizes.sm,
              color: colors.ink[600],
              marginBottom: spacing[2],
            }}
          >
            No active project yet.
          </p>
          <a
            href="/killerapp"
            style={{
              display: 'inline-block',
              padding: `${spacing[2]} ${spacing[3]}`,
              fontFamily: fonts.body,
              fontSize: fontSizes.sm,
              color: 'var(--trace)',
              backgroundColor: colors.ink[900],
              textDecoration: 'none',
              borderRadius: radii.sm,
            }}
          >
            Create a project
          </a>
        </div>
      ) : budgetError === 'error' ? (
        <p style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.ink[600] }}>
          Could not load budget. Please refresh.
        </p>
      ) : (
        <div>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: fontSizes.sm,
              fontWeight: fontWeights.medium,
              color: colors.ink[900],
            }}
          >
            Budget snapshot
          </p>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: fontSizes.xs,
              color: colors.ink[400],
              marginTop: spacing[1],
            }}
          >
            {budgetSnapshot && budgetSnapshot.totalEstimated > 0
              ? `$${budgetSnapshot.totalEstimated.toLocaleString()} in estimates across ${budgetSnapshot.categoryCount || 1} ${
                  budgetSnapshot.categoryCount === 1 ? 'category' : 'categories'
                } so far.`
              : 'No estimates recorded yet. Run the AI takeoff below to add one.'}
          </p>
          {lastRecordedAmount !== null && (
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: fontSizes.xs,
                color: colors.ink[600],
                marginTop: spacing[1],
              }}
            >
              Just recorded ${lastRecordedAmount.toLocaleString()} from the AI takeoff.
            </p>
          )}
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
