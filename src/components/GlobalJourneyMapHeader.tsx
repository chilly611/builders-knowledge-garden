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
  subscribeJourney,
  rollupByStage,
  type JourneyState,
} from '@/lib/journey-progress';
import { useActiveProject } from '@/lib/hooks/use-active-project';

export default function GlobalJourneyMapHeader() {
  const pathname = usePathname() ?? '';
  const [activeId] = useActiveProject();
  // Fall back to 'default' so anonymous users still see an empty strip
  // (matches the journey-progress store's anonymous bucket key).
  const projectId = activeId ?? 'default';
  const [state, setState] = useState<JourneyState>({});

  // Subscribe to journey state for whichever project is currently active.
  // Resubscribe when the active project changes.
  useEffect(() => {
    const unsubscribe = subscribeJourney(projectId, (s) => setState(s));
    return unsubscribe;
  }, [projectId]);

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
    />
  );
}
