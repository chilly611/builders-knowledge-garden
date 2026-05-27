'use client';

/**
 * GlobalJourneyMapHeader (W4.4)
 * =============================
 * Hosts the ProjectCompass — the combined journey-map + budget-river
 * surface — on every `/killerapp/*` route. Replaces what used to mount
 * the thin chip-strip JourneyMapHeader.
 *
 * Responsibilities:
 *   1. Resolve the active project id (fall back to demo bucket).
 *   2. Subscribe to journey-state for the project (drives stage colors).
 *   3. Subscribe to visited-stages for the project (distinguishes
 *      "gray-seen" from "gray-unseen").
 *   4. Mark the current stage as visited whenever the user walks in.
 *   5. Fetch budget summary from `/api/v1/budget` (when authenticated +
 *      real project) and derive per-stage payment pools + profit signal.
 *      When that round-trip fails or returns nothing, fall through to
 *      the DEMO compass payload so the surface always has life.
 *   6. Render <ProjectCompass/>.
 *
 * Per the W4 lesson ("Global chrome vs per-workflow chrome — be explicit"),
 * this is still the ONE mount point for journey chrome inside /killerapp/*.
 */

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import ProjectCompass from '@/components/ProjectCompass';
import {
  LIFECYCLE_STAGES,
  STAGE_WORKFLOWS,
  stageIdForPath,
} from '@/lib/lifecycle-stages';
import {
  subscribeJourney,
  rollupByStage,
  type JourneyState,
} from '@/lib/journey-progress';
import {
  markStageVisited,
  subscribeVisitedStages,
} from '@/lib/visited-stages';
import { useActiveProject } from '@/lib/hooks/use-active-project';
import {
  DEMO_COMPASS_DATA,
  deriveCompassData,
  type ProjectCompassData,
  type BudgetApiSummary,
} from '@/lib/project-compass-data';
import { getProjectBudget } from '@/lib/budget-spine';

export default function GlobalJourneyMapHeader() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [activeId] = useActiveProject();
  // Fall back to 'default' so anonymous users still see a coherent
  // compass (keyed to the journey-progress anonymous bucket).
  const projectId = activeId ?? 'default';
  const hasRealProject = Boolean(activeId);

  const [state, setState] = useState<JourneyState>({});
  const [visited, setVisited] = useState<number[]>([]);
  const [compassData, setCompassData] = useState<ProjectCompassData>(DEMO_COMPASS_DATA);

  // Subscribe to journey state for the active project.
  useEffect(() => {
    const unsubscribe = subscribeJourney(projectId, (s) => setState(s));
    return unsubscribe;
  }, [projectId]);

  // Subscribe to visited stages for the active project.
  useEffect(() => {
    const unsubscribe = subscribeVisitedStages(projectId, (v) => setVisited(v));
    return unsubscribe;
  }, [projectId]);

  const currentStageId = useMemo(() => stageIdForPath(pathname), [pathname]);

  // Mark the current stage as visited on every route change.
  useEffect(() => {
    if (currentStageId != null) {
      markStageVisited(projectId, currentStageId);
    }
  }, [currentStageId, projectId]);

  // Fetch budget summary → derive compass data. Fall through to demo on
  // any miss. Re-fetch when the active project changes OR when a budget
  // write event fires.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!hasRealProject) {
        if (!cancelled) setCompassData(DEMO_COMPASS_DATA);
        return;
      }
      try {
        const result = await getProjectBudget(projectId);
        if (cancelled) return;
        if (!result.ok) {
          setCompassData(DEMO_COMPASS_DATA);
          return;
        }
        const derived = deriveCompassData(result.summary as BudgetApiSummary);
        setCompassData(derived);
      } catch {
        if (!cancelled) setCompassData(DEMO_COMPASS_DATA);
      }
    }

    load();

    const onBudgetChange = () => {
      load();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('bkg:budget:changed', onBudgetChange);
    }

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('bkg:budget:changed', onBudgetChange);
      }
    };
  }, [projectId, hasRealProject]);

  const progressByStage = useMemo(
    () => rollupByStage(state, STAGE_WORKFLOWS),
    [state]
  );

  // Don't render on non-killerapp routes (defensive — the mount point is
  // /killerapp/layout.tsx, but this keeps the component safe to reuse).
  if (!pathname.startsWith('/killerapp')) return null;

  return (
    <ProjectCompass
      stages={LIFECYCLE_STAGES}
      currentStageId={currentStageId}
      progressByStage={progressByStage}
      visitedStageIds={visited}
      stagePayments={compassData.stagePayments}
      profitSignal={compassData.profitSignal}
      isDemo={compassData.isDemo}
      onDemoCtaClick={() => router.push('/killerapp/workflows/compass-nav')}
    />
  );
}
