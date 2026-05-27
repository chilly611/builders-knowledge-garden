'use client';

/**
 * KillerAppChrome — persistent two-row chrome at the top of every
 * Killer App page.
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ BudgetRibbon                                                │   Row 1
 *   ├─────────────────────────────────────────────────────────────┤
 *   │ JourneyTimeRow (TimelineMarkers + 7 StageNodes)             │   Row 2
 *   └─────────────────────────────────────────────────────────────┘
 *
 * The chrome takes a `project` prop and renders. If no project is
 * supplied it falls back to the Marin Farmhouse seed so demo routes
 * (and screenshot-driven QA) always have something photogenic to show.
 *
 * The chrome itself is non-scrolling. The parent route is responsible
 * for any vertical layout (sticky positioning, padding-top below the
 * existing KillerAppNav, etc.) — chrome stays composable.
 */

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { KAC_COLORS } from './types';
import type { KacProject } from './types';
import { marinKacProject } from './marin-adapter';
import BudgetRibbon, { type BudgetRibbonBlock } from './BudgetRibbon';
import JourneyTimeRow from './JourneyTimeRow';

export interface KillerAppChromeProps {
  /** When omitted, falls back to MARIN_FARMHOUSE so demo routes work. */
  project?: KacProject | null;
  /**
   * If true, hide the chrome entirely (e.g. when ?hideShell=1 is set
   * by the /intro iframe). Renders null.
   */
  hidden?: boolean;
  /** Optional: route to push when a budget block is tapped. */
  budgetDrilldownRoute?: string;
}

export default function KillerAppChrome({
  project,
  hidden,
  budgetDrilldownRoute = '/killerapp/budget',
}: KillerAppChromeProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';

  // Two-chrome-coexistence rule (2026-05-27): the four lifecycle stage
  // pages at /killerapp/stages/{size-up,lock,plan,build} render their
  // own self-contained chrome (StageShell at src/components/stage-shell/)
  // which owns the full viewport below the global KillerAppNav. If we
  // also render here, the page stacks two chromes. So skip on those
  // routes. KillerAppChrome still renders on /killerapp landing, every
  // workflow route, and /projects/[id].
  const onStageRoute = useMemo(
    () => /^\/killerapp\/stages(\/|$)/.test(pathname),
    [pathname]
  );

  // Marin fixture comes from Code's canonical src/lib/demo/marin-4000.ts
  // via marin-adapter. Re-derived per render, but cheap (16 lines + 10
  // phases). Memoize so referential equality holds for downstream memos.
  const fallback = useMemo(() => marinKacProject(), []);
  const data: KacProject = project ?? fallback;

  const handleDrilldown = useCallback(
    (block: BudgetRibbonBlock) => {
      // Route to the existing budget module with a hint of which block was tapped.
      const target = `${budgetDrilldownRoute}?focus=${block}`;
      router.push(target);
    },
    [router, budgetDrilldownRoute]
  );

  const handleMarkersReorder = useCallback(
    (orderedIds: string[]) => {
      // Persistence path: no PATCH endpoint exists for individual schedule
      // marker reorders (only /api/v1/projects/schedule POST regenerates
      // the whole thing). For tonight: log + dispatch a window event so a
      // future listener can pick this up and persist. The drag is otherwise
      // optimistic in the marker component's local sort.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('bkg:chrome:markers-reordered', {
            detail: { projectId: data.id, orderedIds },
          })
        );
        // eslint-disable-next-line no-console
        console.info('[KillerAppChrome] markers reordered', orderedIds);
      }
    },
    [data.id]
  );

  if (hidden) return null;
  if (onStageRoute) return null;

  return (
    <div
      role="banner"
      aria-label="Project chrome"
      style={{
        // Non-scrolling, cream surface. Sits flush against whatever
        // sits above it (KillerAppNav at 48px in the killerapp layout,
        // or page content on /projects/[id]).
        background: KAC_COLORS.bgCream,
        color: KAC_COLORS.textInk,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        // Don't let chrome scroll vertically; let the page below scroll instead.
        overflow: 'hidden',
        // Light borders only — no dark theme.
        borderBottom: `1px solid ${KAC_COLORS.divider}`,
      }}
    >
      <BudgetRibbon budget={data.budget} onDrilldown={handleDrilldown} />
      <JourneyTimeRow project={data} onMarkersReorder={handleMarkersReorder} />
    </div>
  );
}
