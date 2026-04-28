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
import JourneyArc from './JourneyArc';
import TimeMachineDial from './TimeMachineDial';
import BudgetSnapshot from './BudgetSnapshot';

import {
  STAGE_REGISTRY,
  type StageId,
  type StageProgress,
  type BudgetTimelineData,
} from '@/components/navigator/types';
import { STAGE_WORKFLOWS } from '@/lib/lifecycle-stages';
import { stageFromPathname } from '@/lib/stage-from-pathname';
import { getActiveProjectId, getProjectBudget } from '@/lib/budget-spine';
import { subscribeJourney } from '@/lib/journey-progress';
import { subscribeSnapshots } from '@/lib/time-machine';

const STAGE_TO_PHASE: Record<StageId, string> = {
  1: 'DREAM', 2: 'DESIGN', 3: 'PLAN', 4: 'BUILD', 5: 'BUILD', 6: 'DELIVER', 7: 'GROW',
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

  // Hidden on landing route
  if (pathname === '/killerapp') return null;

  const effectiveProjectId = propProjectId ?? getActiveProjectId() ?? null;
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
    window.addEventListener('bkg:budget:changed', onBudgetChange);
    return () => window.removeEventListener('bkg:budget:changed', onBudgetChange);
  }, [fetchBudget]);

  // Snapshots subscription
  useEffect(() => {
    if (!effectiveProjectId) { setSnapshots([]); return; }
    return subscribeSnapshots(effectiveProjectId, setSnapshots);
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
    router.push(`/killerapp/workflows?stage=${stageMeta.slug}`);
    window.dispatchEvent(new CustomEvent('bkg:navigator:stage-clicked', {
      detail: { stageId: stageIdArg, projectId: effectiveProjectId },
    }));
  }, [router, effectiveProjectId]);

  const handleTimeScrub = useCallback((snapshotId: string | null) => {
    window.dispatchEvent(new CustomEvent('bkg:navigator:time-scrubbed', {
      detail: { snapshotId, projectId: effectiveProjectId },
    }));
  }, [effectiveProjectId]);

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

  return (
    <header style={{
      position: 'sticky', top: 48, zIndex: 10,
      backgroundColor: trace,
      backgroundImage: `linear-gradient(0deg, rgba(27,58,92,0.08) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(27,58,92,0.08) 1px, transparent 1px)`,
      backgroundSize: '4px 4px',
      borderTop: `1px solid ${brass}`,
      borderBottom: `1px solid ${brass}`,
      height: isMobile ? 180 : 96,
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'stretch',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Journey (40%) */}
      <div style={{
        flex: isMobile ? '0 0 auto' : '0 0 40%',
        display: 'flex', alignItems: 'center', padding: '12px 12px',
        borderRight: isMobile ? 'none' : `1px solid ${brass}`,
        borderBottom: isMobile ? `1px solid ${brass}` : 'none',
        position: 'relative',
      }}>
        {!isMobile && <BrassHinge />}
        <JourneyArc stages={stageProgress} activeStageId={activeStageId} onStageClick={handleStageClick} />
      </div>

      {/* Time Machine (25%) */}
      <div style={{
        flex: isMobile ? '0 0 auto' : '0 0 25%',
        display: 'flex', alignItems: 'center', padding: '12px 12px',
        borderRight: isMobile ? 'none' : `1px solid ${brass}`,
        borderBottom: isMobile ? `1px solid ${brass}` : 'none',
        position: 'relative',
      }}>
        {!isMobile && <BrassHinge />}
        <TimeMachineDial snapshots={snapshots} onScrub={handleTimeScrub} />
      </div>

      {/* Budget (35%) */}
      <div style={{
        flex: isMobile ? '0 0 auto' : '0 0 35%',
        display: 'flex', alignItems: 'center', padding: '12px 12px',
      }}>
        <BudgetSnapshot data={budgetData} activeStageId={activeStageId} />
      </div>
    </header>
  );
}
