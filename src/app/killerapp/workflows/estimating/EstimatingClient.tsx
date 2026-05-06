'use client';
import { useState, useEffect, useMemo } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { getProjectBudget, recordMaterialCost } from '@/lib/budget-spine';
import { resolveProjectId } from '@/lib/journey-progress';
import { useProjectWorkflowState, seedPayloadsFromRaw, statusFromSeeded } from '@/lib/hooks/useProjectWorkflowState';
import ProjectContextBanner from '../ProjectContextBanner';
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
  isEmptyState?: boolean;
}

/**
 * Try to load demo budget data from localStorage.
 * Falls back to demo data when API fetch fails (graceful degradation for demo).
 * Returns null if no demo data is available.
 */
function tryLoadDemoBudgetData(): BudgetSnapshot | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    // Try to load demo budget data from localStorage
    const demoBudgetJson = window.localStorage.getItem('bkg:budget:demo-san-diego-adu');
    if (!demoBudgetJson) {
      return null;
    }

    const items = JSON.parse(demoBudgetJson) as Array<{ amount: number; isEstimate: boolean }>;
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }

    // Calculate totals from demo data
    const totalEstimated = items.reduce((sum, item) => {
      return item.isEstimate ? sum + item.amount : sum;
    }, 0);

    // For demo data, we'll report a reasonable category count
    // (the demo has 7 budget items across multiple categories)
    const uniqueCategories = new Set(items.map((_, idx) => Math.floor(idx / 2))); // rough estimate
    const categoryCount = Math.max(1, uniqueCategories.size);

    return { totalEstimated, categoryCount };
  } catch (e) {
    // Silently fail — if localStorage is corrupted, just show empty state
    return null;
  }
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
  // Project Spine v1: hydrate + autosave the per-workflow JSONB state.
  // Hook redirects to /killerapp if no ?project=<id>.
  const {
    projectId,
    hydratedPayloads,
    recordStepEvent,
    lastSavedAt,
    saving,
    project,
  } = useProjectWorkflowState({
    column: 'estimating_state',
    workflowId: workflow.id,
  });

  const [budgetSnapshot, setBudgetSnapshot] = useState<BudgetSnapshot | null>(null);
  const [budgetError, setBudgetError] = useState<'no-active-project' | null>(null);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [lastRecordedAmount, setLastRecordedAmount] = useState<number | null>(null);

  // Project Spine v1: track step status locally; seed from hydrated.
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

  async function refreshBudget() {
    // Pass URL-bound project id so we don't race localStorage timing.
    const result = await getProjectBudget(projectId ?? undefined);
    if (!result.ok) {
      // API fetch failed — attempt graceful fallback to demo data
      if (result.reason === 'no-active-project') {
        setBudgetError('no-active-project');
        setBudgetSnapshot(null);
        return;
      }

      // Try to load demo data from localStorage as fallback
      const demoBudgetData = tryLoadDemoBudgetData();
      if (demoBudgetData) {
        setBudgetError(null);
        setBudgetSnapshot(demoBudgetData);
        return;
      }

      // No demo data available — show empty state instead of error
      setBudgetError(null);
      setBudgetSnapshot({ totalEstimated: 0, categoryCount: 0, isEmptyState: true });
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
    if (!projectId) return; // wait for hook to resolve
    setLoadingBudget(true);
    refreshBudget().finally(() => setLoadingBudget(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleStepComplete(stepResult: StepResult & { workflowId: string }) {
    // Project Spine v1: persist this step's payload into estimating_state.
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

    // Only the final step (s2-6 AI estimate) drives a budget write.
    if (stepResult.stepId !== 's2-6' || stepResult.type !== 'step_completed') return;

    const payload = stepResult.payload as { input?: string } | undefined;
    const finalText = payload?.input ?? '';
    const amount = parseRoughTotal(finalText);
    if (amount === null) return;

    const budgetProjectId = projectId ?? resolveProjectId();
    const result = await recordMaterialCost({
      description: 'AI estimate — Size Up',
      amount,
      lifecycleStageId: 1,
      isEstimate: true,
      projectId: budgetProjectId,
    });

    if (result.ok) {
      setLastRecordedAmount(amount);
      await refreshBudget();
    }
  }

  // ─── "Saved" indicator string ────────────────────────────────────────
  const savedLabel = saving
    ? 'Saving…'
    : lastSavedAt
      ? `Saved · ${new Date(lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : null;

  // Pre-fill text/voice/analysis steps with raw_input AND parse out
  // location + sqft for location_input/number_input steps. User
  // feedback 2026-05-06: "I shouldn't have to answer the questions of
  // where is the location or square footage if I already put those in."
  const seededPayloads = useMemo(
    () => seedPayloadsFromRaw(workflow.steps, project?.raw_input, hydratedPayloads),
    [hydratedPayloads, project, workflow.steps]
  );

  // Mark seeded steps as 'complete' so the XP counter credits the user
  // for project context they already provided. Active completions
  // during the session still update via setStepStatusMap below.
  const mergedStatusMap = useMemo(
    () => statusFromSeeded(seededPayloads, stepStatusMap),
    [seededPayloads, stepStatusMap]
  );

  const topPanel = (
    <section
      style={{
        padding: spacing[4],
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
          data-testid="estimating-saved-indicator"
        >
          {savedLabel}
        </span>
      )}
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
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
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
            {budgetSnapshot?.isEmptyState && (
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: fontSizes.xs,
                  color: colors.ink[400],
                  fontStyle: 'italic',
                }}
              >
                demo mode
              </span>
            )}
          </div>
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
              : 'Total committed: $0 · Spent: $0'}
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
    <>
      <ProjectContextBanner project={project} selfWorkflow="estimating" />
      <WorkflowShell
        workflow={workflow}
        stages={stages}
        breadcrumbLabel="AI Estimating Gate"
        topPanel={topPanel}
        onStepComplete={handleStepComplete}
        projectId={projectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={mergedStatusMap}
      />
    </>
  );
}
