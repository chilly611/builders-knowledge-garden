'use client';

/**
 * ProjectCockpit (W9.D.9)
 * ========================
 * Unified horizontal band — brass tick marks, navy ink, Trace cream paper.
 * Replaces IntegratedNavigator + NavigatorMiniStrip.
 * Single sticky band (96px desktop, 180px mobile).
 * Three zones: Journey (40%) | TimeMachine (25%) | Budget (35%)
 * Separated by brass hinge dividers (#B6873A).
 * Hidden on `/killerapp` exact landing route.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import JourneyTimeline from './JourneyTimeline';
import BudgetSnapshot from './BudgetSnapshot';
import MobileCockpitDrawer from './MobileCockpitDrawer';
import MepCalcsCard from './MepCalcsCard';
import { shouldSurfaceMepCalcs } from '@/lib/mep-calc-router';

import {
  STAGE_REGISTRY,
  type StageId,
  type StageProgress,
  type BudgetTimelineData,
} from '@/components/navigator/types';
import { STAGE_WORKFLOWS } from '@/lib/lifecycle-stages';
import { stageFromPathname } from '@/lib/stage-from-pathname';
import { getActiveProjectId, getProjectBudget } from '@/lib/budget-spine';
import { useActiveProject } from '@/lib/hooks/use-active-project';
import { useProjectContext } from '@/contexts/ProjectContext';
import { subscribeJourney } from '@/lib/journey-progress';
import { subscribeSnapshots } from '@/lib/time-machine';
import { useTimeMachineRewind, REWIND_EVENT, type RewindEventDetail } from '@/lib/use-time-machine-rewind';
import RewindToast from './RewindToast';

// COCKPIT-FIXES Pain 3 (2026-05-22): the previous map collapsed stages
// 4 (BUILD) and 5 (ADAPT) into the same "BUILD" bucket AND used legacy
// stage names (DREAM/DESIGN/DELIVER/GROW) that no longer match the
// 7-stage canon. Aligned with /api/v1/budget/route.ts phase labels so
// every stage gets its own sparkline column.
const STAGE_TO_PHASE: Record<StageId, string> = {
  1: 'SIZE_UP', 2: 'LOCK', 3: 'PLAN', 4: 'BUILD', 5: 'ADAPT', 6: 'COLLECT', 7: 'REFLECT',
};

function deriveStageProgress(journeyState: Record<string, any>): StageProgress[] {
  return STAGE_REGISTRY.map((stage) => {
    const workflowIds = STAGE_WORKFLOWS[stage.id] || [];
    let doneCount = 0, hasInProgress = false, hasNeedsAttention = false;

    workflowIds.forEach((wid) => {
      const wf = journeyState[wid];
      if (!wf) return;
      if (wf.status === 'done') doneCount++;
      if (wf.status === 'in_progress') hasInProgress = true;
      if (wf.status === 'needs_attention') hasNeedsAttention = true;
    });

    const status =
      hasNeedsAttention ? 'needs_attention'
      : doneCount === workflowIds.length && workflowIds.length > 0 ? 'complete'
      : hasInProgress || doneCount > 0 ? 'in_progress'
      : 'not_started';

    return {
      stageId: stage.id,
      status,
      doneCount,
      totalCount: workflowIds.length,
      lastActivityAt: null,
    };
  });
}

function deriveBudgetTimeline(summary: any): BudgetTimelineData {
  const byStage: any = {};
  let totalCommittedCents = 0, totalSpentCents = 0;

  STAGE_REGISTRY.forEach((stage) => {
    const phase = STAGE_TO_PHASE[stage.id];
    const phaseData = summary?.byPhase?.[phase] ?? { spent: 0, estimated: 0 };
    const committedCents = Math.round((phaseData.estimated || 0) * 100);
    const spentCents = Math.round((phaseData.spent || 0) * 100);

    byStage[stage.id] = {
      stageId: stage.id,
      committedCents,
      spentCents,
      remainingCents: committedCents - spentCents,
      status: committedCents === 0 ? 'not-started' : spentCents > committedCents ? 'overbudget' : 'on-track',
    };

    totalCommittedCents += committedCents;
    totalSpentCents += spentCents;
  });

  return {
    byStage,
    totalCommittedCents,
    totalSpentCents,
    isOverbudget: totalSpentCents > totalCommittedCents,
    overAmountCents: totalSpentCents > totalCommittedCents ? totalSpentCents - totalCommittedCents : 0,
  };
}

export default function ProjectCockpit({ projectId: propProjectId }: { projectId?: string | null }) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const stageId = stageFromPathname(pathname);

  // Hooks must run on every render — keep above any early returns.
  // 2026-05-18 (Wave 2): subscribe to useActiveProject so a project switch
  // propagates reactively rather than only on next render. Fall back to the
  // legacy getActiveProjectId() snapshot when the hook returns null on
  // first paint.
  const [activeProjectFromHook] = useActiveProject();
  // COCKPIT-FIXES Pain 2 (2026-05-22): read the live project record so
  // MobileCockpitDrawer can show the name in its collapsed bar. The
  // ProjectCockpit is always mounted inside <ProjectProvider> (killerapp
  // layout), so this hook is safe; project may still be null while
  // hydrating.
  const projectCtx = useProjectContext();
  const mobileProjectName = projectCtx.project?.name ?? null;
  const effectiveProjectId =
    propProjectId ?? activeProjectFromHook ?? getActiveProjectId() ?? null;

  // COCKPIT-PERSONALIZATION (2026-05-22): surface the MEP calc generators
  // on commercial / TI / etc. projects. Pure-keyword router — see
  // src/lib/mep-calc-router.ts. Scope description isn't on ProjectRecord
  // today; we feed ai_summary as a coarse proxy (it usually summarises
  // the scope text the user typed in). Safe to pass undefined for fields
  // we don't have — the helper handles nulls.
  const showMepCalcs = shouldSurfaceMepCalcs({
    projectType: projectCtx.project?.project_type ?? null,
    jurisdiction: projectCtx.project?.jurisdiction ?? null,
    scope: projectCtx.project?.ai_summary ?? projectCtx.project?.raw_input ?? null,
  });
  const [journeyState, setJourneyState] = useState<Record<string, any>>({});
  const [budgetData, setBudgetData] = useState<BudgetTimelineData>({
    byStage: {} as any, totalCommittedCents: 0, totalSpentCents: 0, isOverbudget: false, overAmountCents: 0,
  });
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Journey subscription
  useEffect(() => {
    if (!effectiveProjectId) { setJourneyState({}); return; }
    return subscribeJourney(effectiveProjectId, setJourneyState);
  }, [effectiveProjectId]);

  // Budget fetch
  const fetchBudget = useCallback(async () => {
    if (!effectiveProjectId) {
      setBudgetData({ byStage: {} as any, totalCommittedCents: 0, totalSpentCents: 0, isOverbudget: false, overAmountCents: 0 });
      return;
    }
    try {
      const result = await getProjectBudget(effectiveProjectId);
      if (result.ok && result.summary) setBudgetData(deriveBudgetTimeline(result.summary));
    } catch (err) {
      console.error('[ProjectCockpit] Budget error:', err);
    }
  }, [effectiveProjectId]);

  useEffect(() => { fetchBudget(); }, [fetchBudget]);
  useEffect(() => {
    const onBudgetChange = () => fetchBudget();
    // 2026-05-18 (Wave 2): refetch budget when ANY workflow autosaves on the
    // active project — workflow state often feeds budget derivations (line
    // items, headcount, etc.) so the cockpit stays in sync without the
    // user having to navigate away and back.
    const onAutosave = (e: Event) => {
      const ce = e as CustomEvent<{ projectId?: string; column?: string }>;
      if (!effectiveProjectId) return;
      if (ce.detail?.projectId === effectiveProjectId) fetchBudget();
    };
    window.addEventListener('bkg:budget:changed', onBudgetChange);
    window.addEventListener('bkg:workflow:autosaved', onAutosave as EventListener);
    return () => {
      window.removeEventListener('bkg:budget:changed', onBudgetChange);
      window.removeEventListener('bkg:workflow:autosaved', onAutosave as EventListener);
    };
  }, [fetchBudget, effectiveProjectId]);

  // Snapshots subscription
  useEffect(() => {
    if (!effectiveProjectId) { setSnapshots([]); return; }
    return subscribeSnapshots(effectiveProjectId, setSnapshots);
  }, [effectiveProjectId]);

  // C5: rewind support — when the dial scrubs, override journey +
  // budget state from the snapshot blobs. Returning to live restores
  // the live subscriptions automatically (they overwrite below).
  const { currentSnapshotId, rewindTo } = useTimeMachineRewind(effectiveProjectId);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onRewind = (e: Event) => {
      const detail = (e as CustomEvent<RewindEventDetail>).detail;
      if (!detail || detail.projectId !== effectiveProjectId) return;
      if (detail.snapshotId === null) return;
      if (detail.journey && typeof detail.journey === 'object') {
        setJourneyState(detail.journey as Record<string, unknown>);
      }
      if (detail.budget) {
        const tEst = Math.round((detail.budget.totalEstimated || 0) * 100);
        const tSpent = Math.round((detail.budget.totalSpent || 0) * 100);
        // 2026-05-20: preserve live byStage during rewind so the sparkline
        // doesn't collapse to a flat strip when scrubbing back. Snapshot
        // totals override the totals, but the per-stage SHAPE is the live
        // shape — better optics than a blank chart, and the sparkline is
        // a relative-magnitude visual anyway. (If we later persist byStage
        // on snapshots themselves we can swap to detail.budget.byStage.)
        setBudgetData((prev) => ({
          byStage: prev.byStage,
          totalCommittedCents: tEst,
          totalSpentCents: tSpent,
          isOverbudget: tSpent > tEst,
          overAmountCents: tSpent > tEst ? tSpent - tEst : 0,
        }));
      }
    };
    window.addEventListener(REWIND_EVENT, onRewind);
    return () => window.removeEventListener(REWIND_EVENT, onRewind);
  }, [effectiveProjectId]);

  // Responsive
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const stageProgress = useMemo(() => deriveStageProgress(journeyState), [journeyState]);
  const activeStageId = stageId > 0 ? (stageId as StageId) : null;

  const handleStageClick = useCallback((stageIdArg: StageId) => {
    const stageMeta = STAGE_REGISTRY.find((s) => s.id === stageIdArg);
    if (!stageMeta) return;
    // 2026-05-18 (Wave 2): kick off a budget refetch BEFORE we navigate so
    // the destination workflow page mounts with fresh totals. Fire-and-
    // forget — the promise resolves into state; the navigation isn't
    // blocked.
    void fetchBudget();
    router.push(`/killerapp/workflows?stage=${stageMeta.slug}`);
    window.dispatchEvent(new CustomEvent('bkg:navigator:stage-clicked', {
      detail: { stageId: stageIdArg, projectId: effectiveProjectId },
    }));
  }, [router, effectiveProjectId, fetchBudget]);

  const handleTimeScrub = useCallback((snapshotId: string | null) => {
    rewindTo(snapshotId);
    window.dispatchEvent(new CustomEvent('bkg:navigator:time-scrubbed', {
      detail: { snapshotId, projectId: effectiveProjectId },
    }));
  }, [effectiveProjectId, rewindTo]);

  // W11 emergency-batch 2026-05-11: previously hidden on the picker route.
  // Founder feedback: that was the very page where you most needed the
  // journey context, budget, and time-machine surface — picker felt
  // disconnected. Render everywhere; the cockpit handles the no-project
  // case via effectiveProjectId fallback + 'not_started' state.

  const brass = '#B6873A';
  const trace = '#F4F0E6';

  // Brass hinge component
  const BrassHinge = () => (
    <div style={{
      position: 'absolute', right: -0.5, top: '50%', transform: 'translateY(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{ width: 1, height: 72, backgroundColor: brass }} />
      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: brass, margin: '-3.5px 0' }} />
    </div>
  );

  // COCKPIT-FIXES Pain 2 (2026-05-22): on mobile, surface a collapsible
  // drawer (56px collapsed, 280px expanded) instead of the 180px always-on
  // band. Tony's feedback ("I want to see the task, not the dashboard")
  // drove this. Desktop unchanged.
  if (isMobile) {
    return (
      <>
        <RewindToast onReturnToLive={() => rewindTo(null)} />
        <MobileCockpitDrawer
          projectId={effectiveProjectId}
          projectName={mobileProjectName}
          stageProgress={stageProgress}
          activeStageId={activeStageId}
          snapshots={snapshots}
          currentSnapshotId={currentSnapshotId ?? null}
          budgetData={budgetData}
          onStageClick={handleStageClick}
          onScrub={handleTimeScrub}
          onPreviewFuture={(sid) => {
            window.dispatchEvent(new CustomEvent('bkg:navigator:future-previewed', {
              detail: { stageId: sid, projectId: effectiveProjectId },
            }));
          }}
          onReturnToLive={() => rewindTo(null)}
        />
        {showMepCalcs && (
          <div style={{ padding: '0 12px' }}>
            <MepCalcsCard projectId={effectiveProjectId} variant="compact" />
          </div>
        )}
      </>
    );
  }

  return (
    <>
    <RewindToast onReturnToLive={() => rewindTo(null)} />
    <header style={{
      position: 'sticky', top: 48, zIndex: 10,
      backgroundColor: trace,
      backgroundImage: `linear-gradient(0deg, rgba(27,58,92,0.08) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(27,58,92,0.08) 1px, transparent 1px)`,
      backgroundSize: '4px 4px',
      borderTop: `1px solid ${brass}`,
      borderBottom: `1px solid ${brass}`,
      height: 96,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'stretch',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Journey + Time (merged, 65%) — Ship 24: single time-aware surface.
          Per Chilly's directive (2026-05-19), the journey map and time
          machine are one band: present-tense stage states (visited/
          completed/unvisited/active) with scrub-back-and-forward in time. */}
      <div style={{
        flex: '0 0 65%',
        display: 'flex', alignItems: 'center', padding: '12px 12px',
        borderRight: `1px solid ${brass}`,
        position: 'relative',
      }}>
        <BrassHinge />
        <JourneyTimeline
          stages={stageProgress}
          activeStageId={activeStageId}
          snapshots={snapshots}
          currentSnapshotId={currentSnapshotId ?? null}
          onStageClick={handleStageClick}
          onScrub={handleTimeScrub}
          onPreviewFuture={(sid) => {
            window.dispatchEvent(new CustomEvent('bkg:navigator:future-previewed', {
              detail: { stageId: sid, projectId: effectiveProjectId },
            }));
          }}
          onReturnToLive={() => rewindTo(null)}
        />
      </div>

      {/* Budget (35%) */}
      <div style={{
        flex: '0 0 35%',
        display: 'flex', alignItems: 'center', padding: '12px 12px',
      }}>
        <BudgetSnapshot data={budgetData} activeStageId={activeStageId} />
      </div>
    </header>
    {/* COCKPIT-PERSONALIZATION (2026-05-22): MEP-calcs card mounts UNDER
        the cockpit band on desktop when the project shape suggests
        commercial / TI / office / etc. See shouldSurfaceMepCalcs. */}
    {showMepCalcs && (
      <div style={{ padding: '0 24px' }}>
        <MepCalcsCard projectId={effectiveProjectId} variant="desktop" />
      </div>
    )}
    </>
  );
}
