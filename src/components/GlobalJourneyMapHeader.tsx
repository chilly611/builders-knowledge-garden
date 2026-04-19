'use client';

/**
 * GlobalJourneyMapHeader
 * ======================
 * Journey Map chip strip mounted ONCE at `/killerapp/layout.tsx` so it
 * renders across the picker AND every workflow child route. Replaces the
 * per-workflow mount that used to live inside `WorkflowShell`.
 *
 * Responsibilities:
 *   1. Resolve the active project id (from localStorage `bkg-active-project`).
 *   2. Subscribe to journey-state changes for that project.
 *   3. Roll per-workflow state up to per-stage counters via `rollupByStage`.
 *   4. Detect the current route and highlight the matching stage.
 *   5. Render the pure `JourneyMapHeader` component.
 *
 * Per the W4 lesson ("Global chrome vs per-workflow chrome — be explicit"),
 * this is now the ONE place where the journey map gets rendered inside
 * /killerapp/*. Anything inside a workflow page that previously rendered
 * its own header must rely on this one instead.
 */

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

import JourneyMapHeader from '@/components/JourneyMapHeader';
import {
  LIFECYCLE_STAGES,
  STAGE_WORKFLOWS,
  stageIdForPath,
} from '@/lib/lifecycle-stages';
import {
  resolveProjectId,
  subscribeJourney,
  rollupByStage,
  type JourneyState,
} from '@/lib/journey-progress';

export default function GlobalJourneyMapHeader() {
  const pathname = usePathname() ?? '';
  const [projectId, setProjectId] = useState<string>('default');
  const [state, setState] = useState<JourneyState>({});

  // Resolve active project once on mount + subscribe to its journey state.
  useEffect(() => {
    const pid = resolveProjectId();
    setProjectId(pid);
    const unsubscribe = subscribeJourney(pid, (s) => setState(s));
    return unsubscribe;
  }, []);

  // Listen for active-project changes (future CompassBloom project switcher).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bkg-active-project') {
        setProjectId(resolveProjectId());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const currentStageId = useMemo(() => stageIdForPath(pathname), [pathname]);

  const progressByStage = useMemo(
    () => rollupByStage(state, STAGE_WORKFLOWS),
    [state]
  );

  // Don't render on non-killerapp routes (defensive — we're already mounted
  // inside /killerapp/layout.tsx, but this keeps the component safe to reuse).
  if (!pathname.startsWith('/killerapp')) return null;

  return (
    <JourneyMapHeader
      stages={LIFECYCLE_STAGES}
      currentStageId={currentStageId}
      progressByStage={progressByStage}
      linkStages={false}
      // ensure projectId changes re-trigger rerender (state is already tied to pid)
      key={projectId}
    />
  );
}
