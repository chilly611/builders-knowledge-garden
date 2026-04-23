'use client';

/**
 * IntegratedNavigator (W9)
 * ========================
 * Top-level orchestrator that composes three sub-components into one stacked,
 * collapsible chrome. Ever-present on every `/killerapp/*` route.
 *
 * Replaces the previous `GlobalJourneyMapHeader` + `GlobalBudgetWidget` duo.
 *
 * Responsibilities:
 *   1. Fetch StageProgress[] for all 7 stages (from journey-progress.ts)
 *   2. Fetch BudgetTimelineData (from budget-spine.ts + stage→phase mapping)
 *   3. Render TimeMachineData (empty for MVP)
 *   4. Call useNavigator() for collapse state + cycling
 *   5. Handle stage click → router.push() navigation
 *   6. Compose JourneyStrip + TimeMachineLever + BudgetTimeline in a sticky header
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useNavigator } from './navigator/NavigatorContext';
import JourneyStrip from './navigator/JourneyStrip';
import BudgetTimeline from './navigator/BudgetTimeline';
import TimeMachineLever from './navigator/TimeMachineLever';

import type {
  StageId,
  StageProgress,
  BudgetTimelineData,
  TimeMachineData,
  StageBudget,
} from './navigator/types';
import { STAGE_REGISTRY } from './navigator/types';
import { getProjectBudget, getActiveProjectId } from '@/lib/budget-spine';
import { subscribeJourney } from '@/lib/journey-progress';
import { STAGE_WORKFLOWS } from '@/lib/lifecycle-stages';

export interface IntegratedNavigatorProps {
  /** The project id whose data this Navigator shows. Null = picker route (no project context). */
  projectId?: string | null;
  /** Stage the user is currently viewing (derived from URL). */
  activeStageId?: StageId | null;
}

// ─── Stage → Budget phase mapping ────────────────────────────────────────
// Maps lifecycle stages (1-7) to budget phases for BudgetTimeline
const STAGE_TO_PHASE: Record<StageId, string> = {
  1: 'DREAM',    // Size Up
  2: 'DESIGN',   // Lock it in
  3: 'PLAN',     // Plan it out
  4: 'BUILD',    // Build
  5: 'BUILD',    // Adapt (kept in BUILD for cost-of-goods unification)
  6: 'DELIVER',  // Collect
  7: 'GROW',     // Reflect
};

/**
 * Derive per-stage progress from journey state.
 * Returns an array of 7 StageProgress objects, one per stage (id 1-7).
 */
function deriveStageProgress(journeyState: Record<string, any>): StageProgress[] {
  const progress: StageProgress[] = [];

  for (const stageMeta of STAGE_REGISTRY) {
    const stageId = stageMeta.id;
    const workflowIds = STAGE_WORKFLOWS[stageId] || [];

    let doneCount = 0;
    let hasInProgress = false;
    let hasNeedsAttention = false;

    for (const wid of workflowIds) {
      const wf = journeyState[wid];
      if (!wf) continue;

      if (wf.status === 'done') doneCount += 1;
      if (wf.status === 'in_progress') hasInProgress = true;
      if (wf.status === 'needs_attention') hasNeedsAttention = true;
    }

    let status: 'not_started' | 'in_progress' | 'complete' | 'needs_attention' | 'skipped' =
      'not_started';

    if (hasNeedsAttention) {
      status = 'needs_attention';
    } else if (doneCount === workflowIds.length && workflowIds.length > 0) {
      status = 'complete';
    } else if (hasInProgress || doneCount > 0) {
      status = 'in_progress';
    }

    progress.push({
      stageId,
      status,
      doneCount,
      totalCount: workflowIds.length,
      lastActivityAt: null, // TODO: derive from journey workflow lastEventAt
    });
  }

  return progress;
}

/**
 * Derive BudgetTimelineData from raw budget summary.
 * The summary shape comes from /api/v1/budget?project_id=X → .summary
 */
function deriveBudgetTimeline(summary: any): BudgetTimelineData {
  const byStage: Record<StageId, StageBudget> = {} as any;
  let totalCommittedCents = 0;
  let totalSpentCents = 0;

  // MVP: For each stage, query the summary by phase and allocate committed/spent
  for (const stageMeta of STAGE_REGISTRY) {
    const stageId = stageMeta.id;
    const phase = STAGE_TO_PHASE[stageId];

    const phaseData = (summary?.byPhase?.[phase] as any) ?? {
      spent: 0,
      estimated: 0,
    };

    // Convert dollars to cents; budget-spine uses cents throughout
    const committedCents = Math.round((phaseData.estimated || 0) * 100);
    const spentCents = Math.round((phaseData.spent || 0) * 100);
    const remainingCents = committedCents - spentCents;

    const status =
      committedCents === 0
        ? ('not-started' as const)
        : spentCents > committedCents
          ? ('overbudget' as const)
          : ('on-track' as const);

    byStage[stageId] = {
      stageId,
      committedCents,
      spentCents,
      remainingCents,
      status,
    };

    totalCommittedCents += committedCents;
    totalSpentCents += spentCents;
  }

  const isOverbudget = totalSpentCents > totalCommittedCents;
  const overAmountCents = isOverbudget ? totalSpentCents - totalCommittedCents : 0;

  return {
    byStage,
    totalCommittedCents,
    totalSpentCents,
    isOverbudget,
    overAmountCents,
  };
}

export default function IntegratedNavigator(
  props: IntegratedNavigatorProps
) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const { state: navState, cycleCollapseState } = useNavigator();

  // Resolve project ID from props or active project
  const effectiveProjectId = props.projectId ?? getActiveProjectId() ?? null;

  // ─── Journey progress state ──────────────────────────────────────────────
  const [journeyState, setJourneyState] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!effectiveProjectId) {
      setJourneyState({});
      return;
    }

    const unsubscribe = subscribeJourney(effectiveProjectId, (state) => {
      setJourneyState(state);
    });

    return unsubscribe;
  }, [effectiveProjectId]);

  // ─── Budget data state ───────────────────────────────────────────────────
  const [budgetData, setBudgetData] = useState<BudgetTimelineData>({
    byStage: {} as any,
    totalCommittedCents: 0,
    totalSpentCents: 0,
    isOverbudget: false,
    overAmountCents: 0,
  });

  const [budgetLoading, setBudgetLoading] = useState(false);

  const fetchBudget = useCallback(async () => {
    if (!effectiveProjectId) {
      setBudgetData({
        byStage: {} as any,
        totalCommittedCents: 0,
        totalSpentCents: 0,
        isOverbudget: false,
        overAmountCents: 0,
      });
      return;
    }

    setBudgetLoading(true);
    try {
      const result = await getProjectBudget(effectiveProjectId);
      if (result.ok && result.summary) {
        const derived = deriveBudgetTimeline(result.summary);
        setBudgetData(derived);
      } else {
        // Fallback to zeros (safe for MVP)
        setBudgetData({
          byStage: {} as any,
          totalCommittedCents: 0,
          totalSpentCents: 0,
          isOverbudget: false,
          overAmountCents: 0,
        });
      }
    } catch (err) {
      // Silently log and continue
      console.error('[IntegratedNavigator] Budget fetch error:', err);
      setBudgetData({
        byStage: {} as any,
        totalCommittedCents: 0,
        totalSpentCents: 0,
        isOverbudget: false,
        overAmountCents: 0,
      });
    } finally {
      setBudgetLoading(false);
    }
  }, [effectiveProjectId]);

  // Fetch budget on mount + projectId change
  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  // Refresh budget on spine event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onBudgetChange = () => {
      fetchBudget();
    };

    window.addEventListener('bkg:budget:changed', onBudgetChange);
    return () =>
      window.removeEventListener('bkg:budget:changed', onBudgetChange);
  }, [fetchBudget]);

  // ─── Derived data ───────────────────────────────────────────────────────
  const stageProgress = useMemo(
    () => deriveStageProgress(journeyState),
    [journeyState]
  );

  // MVP: time machine is empty (no API yet)
  const timeMachineData: TimeMachineData = useMemo(
    () => ({
      snapshots: [],
      currentSnapshotId: null,
    }),
    []
  );

  // ─── Event handlers ──────────────────────────────────────────────────────

  const handleStageClick = useCallback(
    (stageId: StageId) => {
      const stageMeta = STAGE_REGISTRY.find((s) => s.id === stageId);
      if (!stageMeta) return;

      // Push to workflows route with stage query param
      router.push(`/killerapp/workflows?stage=${stageMeta.slug}`);

      // Dispatch navigator event for other subscribers
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('bkg:navigator:stage-clicked', {
            detail: {
              stageId,
              projectId: effectiveProjectId,
            },
          })
        );
      }
    },
    [router, effectiveProjectId]
  );

  const handleTimeScrub = useCallback((snapshotId: string | null) => {
    // MVP: no-op, snapshots array is empty
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('bkg:navigator:time-scrubbed', {
          detail: {
            snapshotId,
            projectId: effectiveProjectId,
          },
        })
      );
    }
  }, [effectiveProjectId]);

  // ─── Render ─────────────────────────────────────────────────────────────

  // Don't render if not on a /killerapp route
  if (!pathname.startsWith('/killerapp')) {
    return <></>;
  }

  const isDisabled = effectiveProjectId === null;
  const collapseState = navState.collapseState;

  // Stub out stage progress if no project
  const stageProgressToRender = isDisabled
    ? STAGE_REGISTRY.map((s) => ({
        stageId: s.id,
        status: 'not_started' as const,
        doneCount: 0,
        totalCount: 0,
        lastActivityAt: null,
      }))
    : stageProgress;

  return (
    <header
      role="banner"
      style={{
        background: 'var(--paper, var(--paper-white, #fefefe))',
        borderBottom: '1px solid var(--faded-rule, var(--ink))',
        padding: '12px 24px',
        position: 'sticky',
        top: 48,
        zIndex: 10,
      }}
    >
      {collapseState === 'hidden' ? (
        // ─── Hidden state: tiny pill with expand button ───────────────────
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            height: 32,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--ink-lighter)' }}>
            {stageProgressToRender.filter((s) => s.status !== 'not_started').length}/
            {STAGE_REGISTRY.length} stages done
          </span>
          <button
            type="button"
            onClick={() => cycleCollapseState()}
            aria-label="Expand Navigator"
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--ink-lighter)',
              padding: 0,
            }}
          >
            Expand ▾
          </button>
        </div>
      ) : collapseState === 'compact' ? (
        // ─── Compact state: JourneyStrip only + collapse button ───────────
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: 1 }}>
            <JourneyStrip
              stages={stageProgressToRender}
              activeStageId={props.activeStageId ?? null}
              onStageClick={handleStageClick}
              compact={true}
            />
          </div>
          <button
            type="button"
            onClick={() => cycleCollapseState()}
            aria-label="Expand Navigator"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--ink-lighter)',
              padding: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Expand ▾
          </button>
        </div>
      ) : (
        // ─── Expanded state: full stack ──────────────────────────────────
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Top row: JourneyStrip + collapse button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              justifyContent: 'space-between',
            }}
          >
            <div style={{ flex: 1 }}>
              <JourneyStrip
                stages={stageProgressToRender}
                activeStageId={props.activeStageId ?? null}
                onStageClick={handleStageClick}
                compact={false}
              />
            </div>
            <button
              type="button"
              onClick={() => cycleCollapseState()}
              aria-label="Collapse Navigator"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--ink-lighter)',
                padding: 0,
                whiteSpace: 'nowrap',
              }}
            >
              Collapse ▴
            </button>
          </div>

          {/* TimeMachineLever */}
          <TimeMachineLever
            data={timeMachineData}
            onScrub={handleTimeScrub}
            compact={false}
            disabled={timeMachineData.snapshots.length === 0}
          />

          {/* BudgetTimeline */}
          <BudgetTimeline
            data={budgetData}
            activeStageId={props.activeStageId ?? null}
            compact={false}
          />
        </div>
      )}
    </header>
  );
}
