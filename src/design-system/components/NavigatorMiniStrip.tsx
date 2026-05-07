'use client';

/**
 * NavigatorMiniStrip (W9.D.8)
 * ===========================
 * Persistent bottom-of-page sticky mini-strip showing:
 *   - Left: 7 mini stage dots + current stage label
 *   - Center: Time Machine snapshot count (hidden on mobile)
 *   - Right: Budget total (committed · spent)
 *
 * Position: sticky; bottom: 0; z-index: 50
 * Height: 36px
 * Background: #F4F0E6 (Trace) with backdrop-filter blur
 * Border-top: 1px Faded Rule
 *
 * Click handlers dispatch events:
 *   - Left → bkg:navigator:expand
 *   - Center → bkg:time-machine:open
 *   - Right → bkg:budget:detail
 *
 * Hides on stage 0 (landing) and mobile <640px (center only).
 */

import { useEffect, useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { stageFromPathname } from '@/lib/stage-from-pathname';
import { STAGE_REGISTRY, type StageId } from '@/components/navigator/types';
import { STAGE_ACCENTS } from '@/design-system/tokens/stage-accents';
import type { StageProgress, BudgetTimelineData } from '@/components/navigator/types';
import { STAGE_WORKFLOWS } from '@/lib/lifecycle-stages';

interface MiniStripData {
  stages: StageProgress[];
  budget: BudgetTimelineData | null;
  snapshotCount: number;
  currentStageId: StageId | null;
}

function getMiniStripData(): MiniStripData {
  if (typeof window === 'undefined') {
    return {
      stages: [],
      budget: null,
      snapshotCount: 0,
      currentStageId: null,
    };
  }

  // Fetch stage progress from localStorage
  let stages: StageProgress[] = [];
  try {
    const journey = window.localStorage.getItem('bkg:journey:default');
    if (journey) {
      const journeyState = JSON.parse(journey);
      stages = deriveStageProgress(journeyState);
    }
  } catch {
    // Silently fail; stages remains empty
  }

  // Fetch budget data from localStorage
  let budget: BudgetTimelineData | null = null;
  try {
    const budgetKey = 'bkg:budget:default';
    const budgetRaw = window.localStorage.getItem(budgetKey);
    if (budgetRaw) {
      const budgetData = JSON.parse(budgetRaw);
      budget = budgetData as BudgetTimelineData;
    }
  } catch {
    // Silently fail; budget remains null
  }

  // Fetch snapshot count from time machine
  let snapshotCount = 0;
  try {
    const tmKey = 'bkg:time-machine:default';
    const tmRaw = window.localStorage.getItem(tmKey);
    if (tmRaw) {
      const tmData = JSON.parse(tmRaw);
      snapshotCount = Array.isArray(tmData.snapshots) ? tmData.snapshots.length : 0;
    }
  } catch {
    // Silently fail; snapshotCount remains 0
  }

  return {
    stages,
    budget,
    snapshotCount,
    currentStageId: null, // Will be set by usePathname hook
  };
}

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
      lastActivityAt: null,
    });
  }

  return progress;
}

function formatCents(cents: number): string {
  const dollars = Math.round(cents / 100);
  if (Math.abs(dollars) >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return `$${dollars}`;
}

interface NavBarMiniStripProps {
  // May be used for future projection id override
}

export default function NavigatorMiniStrip({}: NavBarMiniStripProps = {}) {
  const pathname = usePathname() ?? '';
  const stageId = stageFromPathname(pathname);

  // Hooks must run on every render — keep above any early returns.
  const [data, setData] = useState<MiniStripData>(getMiniStripData);
  const [isMobile, setIsMobile] = useState(false);

  // Derive current stage ID from pathname
  const currentStageId = useMemo(() => {
    const id = stageFromPathname(pathname);
    return id > 0 ? (id as StageId) : null;
  }, [pathname]);

  // Hydrate on mount and subscribe to events
  useEffect(() => {
    // Initial fetch
    const freshData = getMiniStripData();
    setData({ ...freshData, currentStageId });

    // Check window size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();

    window.addEventListener('resize', checkMobile);

    // Subscribe to budget changes
    const handleBudgetChanged = () => {
      const freshData = getMiniStripData();
      setData({ ...freshData, currentStageId });
    };

    // Subscribe to time machine changes
    const handleTimeMachineChanged = () => {
      const freshData = getMiniStripData();
      setData({ ...freshData, currentStageId });
    };

    // Subscribe to journey changes
    const handleJourneyChanged = () => {
      const freshData = getMiniStripData();
      setData({ ...freshData, currentStageId });
    };

    window.addEventListener('bkg:budget:changed', handleBudgetChanged);
    window.addEventListener('bkg:time-machine:changed', handleTimeMachineChanged);
    window.addEventListener('bkg:journey:changed', handleJourneyChanged);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('bkg:budget:changed', handleBudgetChanged);
      window.removeEventListener('bkg:time-machine:changed', handleTimeMachineChanged);
      window.removeEventListener('bkg:journey:changed', handleJourneyChanged);
    };
  }, [currentStageId]);

  // Get current stage label
  const currentStageMeta = useMemo(() => {
    if (!currentStageId) return null;
    return STAGE_REGISTRY.find((s) => s.id === currentStageId);
  }, [currentStageId]);

  // Early return if on landing (stage 0)
  if (stageId === 0) {
    return null;
  }

  const handleLeftClick = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bkg:navigator:expand'));
    }
  };

  const handleCenterClick = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bkg:time-machine:open'));
    }
  };

  const handleRightClick = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bkg:budget:detail'));
    }
  };

  // Render 7 mini stage dots
  const stageDots = STAGE_REGISTRY.map((stage) => {
    const progress = data.stages.find((p) => p.stageId === stage.id);
    const isCompleted = progress?.status === 'complete';
    const stageAccentObj = STAGE_ACCENTS[stage.id];
    const accentColor = stageAccentObj ? stageAccentObj.hex : '#999';
    const dotColor = isCompleted ? accentColor : '#D9D5CB'; // Faded when not completed

    return (
      <div
        key={`dot-${stage.id}`}
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          transition: 'background-color 200ms ease-out',
        }}
        title={stage.label}
      />
    );
  });

  // Format budget display
  const budgetDisplay = data.budget
    ? `$${formatCents(data.budget.totalCommittedCents)} · $${formatCents(data.budget.totalSpentCents)}`
    : '$0 · $0';

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 50,
        height: '36px',
        backgroundColor: '#F4F0E6',
        borderTop: '1px solid #E8E3D3',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '12px',
        paddingRight: '12px',
        fontSize: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#333',
        gap: '16px',
      }}
    >
      {/* Left: Stage dots + label */}
      <button
        onClick={handleLeftClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: '0',
          fontSize: '12px',
          color: '#333',
          minWidth: 0,
          flex: isMobile ? 1 : 'none',
        }}
        title="Open journey navigator"
      >
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {stageDots}
        </div>
        {!isMobile && currentStageMeta && (
          <span style={{ whiteSpace: 'nowrap', fontSize: '11px', color: '#666' }}>
            {currentStageMeta.label}
          </span>
        )}
      </button>

      {/* Center: Time Machine (hidden on mobile) */}
      {!isMobile && (
        <button
          onClick={handleCenterClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '0',
            fontSize: '11px',
            color: '#999',
            whiteSpace: 'nowrap',
          }}
          title="Open Time Machine"
        >
          Time Machine: {data.snapshotCount}
          <span style={{ fontSize: '8px', marginLeft: '2px' }}>▾</span>
        </button>
      )}

      {/* Right: Budget total */}
      <button
        onClick={handleRightClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: '0',
          fontSize: '11px',
          color: '#666',
          whiteSpace: 'nowrap',
          flex: isMobile ? 1 : 'none',
        }}
        title="View budget details"
      >
        Budget: {budgetDisplay}
      </button>
    </div>
  );
}
