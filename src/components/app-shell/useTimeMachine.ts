'use client';

/**
 * useTimeMachine — URL-backed scrub state for the Budget-DNA ribbon + the
 * journey playhead, shared by every surface that mounts the chrome (ShellStrips
 * on /killerapp/*, StageShell on /killerapp/stages/*).
 *
 * A committed time-travel lives in `?week=N`, so:
 *   • the browser Back / Forward buttons rewind & replay the playhead — each
 *     deliberate scrub is its own undo/redo step (multi-level);
 *   • a deep-link or refresh restores the scrubbed week;
 *   • a same-page time-travel never triggers a server round-trip — we commit via
 *     `window.history.pushState`, which Next.js syncs with `useSearchParams` and
 *     handles on `popstate`.
 *
 * `dragWeek` is the transient value during an active drag (smooth, not yet in
 * history): call `setDragWeek` on pointer-move and `commitWeek` on release.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { UseBudgetDnaResult } from '@/lib/budget-dna';

export interface TimeMachine {
  hasTime: boolean;
  /** Display override: the drag value, else the committed URL week, else null = live. */
  scrubWeek: number | null;
  /** Week the playhead sits on (scrubWeek ?? the live cumulative-spend week). */
  playWeek: number;
  dragWeek: number | null;
  setDragWeek: (week: number | null) => void;
  /** Commit a time-travel to the URL (Back-undoable). null / the live week → return to live. */
  commitWeek: (week: number | null) => void;
  /** Map a pointer x within a track rect to a schedule week (null = the live week). */
  weekFromClientX: (clientX: number, rect: DOMRect, inset?: number) => number | null;
}

export function useTimeMachine(dna: UseBudgetDnaResult): TimeMachine {
  const searchParams = useSearchParams();
  const hasTime = dna.ready && !dna.empty && dna.totalWeeks > 0;

  // The committed time-travel week, read from the URL (Next keeps this in sync
  // across pushState + Back/Forward). Validated against the live schedule so a
  // stale / out-of-range `?week` from another project degrades to "live".
  const raw = searchParams?.get('week') ?? null;
  let weekParam: number | null = null;
  if (raw != null && /^\d+$/.test(raw)) {
    const n = parseInt(raw, 10);
    if (hasTime && n >= 0 && n <= dna.totalWeeks && n !== dna.currentWeek) weekParam = n;
  }

  const [dragWeek, setDragWeek] = useState<number | null>(null);
  // Drop the transient drag value once the committed URL week catches up (via
  // pushState or Back/Forward) or when the schedule / project changes.
  useEffect(() => { setDragWeek(null); }, [weekParam, dna.totalWeeks, dna.currentWeek]);

  const scrubWeek = dragWeek ?? weekParam;
  const playWeek = scrubWeek ?? dna.currentWeek;

  const weekFromClientX = useCallback(
    (clientX: number, rect: DOMRect, inset = 0.03): number | null => {
      if (!hasTime) return null;
      const insetPx = rect.width * inset;
      const plotW = rect.width - insetPx * 2;
      const rel = (clientX - rect.left - insetPx) / Math.max(1, plotW);
      const week = Math.round(Math.max(0, Math.min(1, rel)) * dna.totalWeeks);
      return week === dna.currentWeek ? null : week;
    },
    [hasTime, dna.totalWeeks, dna.currentWeek],
  );

  const commitWeek = useCallback(
    (week: number | null) => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const prev = params.get('week');
      const next = week == null || week === dna.currentWeek ? null : String(week);
      if ((prev ?? null) === next) { setDragWeek(null); return; } // no change → no history spam
      if (next == null) params.delete('week');
      else params.set('week', next);
      const qs = params.toString();
      window.history.pushState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
      setDragWeek(next == null ? null : Number(next)); // hold until useSearchParams syncs
    },
    [dna.currentWeek],
  );

  return { hasTime, scrubWeek, playWeek, dragWeek, setDragWeek, commitWeek, weekFromClientX };
}

export default useTimeMachine;
