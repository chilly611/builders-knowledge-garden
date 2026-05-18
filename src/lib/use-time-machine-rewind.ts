'use client';

/**
 * useTimeMachineRewind — C5, Lane B spec.
 *
 * Owns the "we are currently viewing snapshot X" state. When a consumer
 * calls rewindTo(id), this hook:
 *   1. Looks up the snapshot by id in localStorage (via getSnapshots)
 *   2. Dispatches `bkg:project:state-rewound` with the embedded journey +
 *      budget blobs as detail
 *   3. Updates its own `currentSnapshotId` so the dial draws the needle
 *      at the right tick
 *
 * Calling rewindTo(null) returns to "live" — re-broadcasts with detail
 * `{ projectId, snapshotId: null, journey: null, budget: null }` and
 * consumers know to hydrate from their real state sources again.
 *
 * Coexists with createSnapshot (`@/lib/time-machine`) — snapshots are
 * written there, navigated here.
 */

import { useCallback, useEffect, useState } from 'react';
import { getSnapshots } from '@/lib/time-machine';
import type { Snapshot } from '@/components/navigator/types';

export const REWIND_EVENT = 'bkg:project:state-rewound';

export interface RewindEventDetail {
  projectId: string | null;
  snapshotId: string | null;
  journey: Record<string, unknown> | null;
  budget: Snapshot['budget'] | null;
  timestamp: string | null;
}

export interface UseTimeMachineRewindResult {
  /** Snapshot id currently being viewed; null = live. */
  currentSnapshotId: string | null;
  /** True if user is viewing a historical snapshot (not live). */
  isHistorical: boolean;
  /** Rewind to a snapshot (or `null` to return to live). */
  rewindTo: (snapshotId: string | null) => void;
}

export function useTimeMachineRewind(
  projectId: string | null
): UseTimeMachineRewindResult {
  const [currentSnapshotId, setCurrentSnapshotId] = useState<string | null>(null);

  // Reset rewind state when project changes.
  useEffect(() => {
    setCurrentSnapshotId(null);
  }, [projectId]);

  const rewindTo = useCallback(
    (snapshotId: string | null) => {
      if (typeof window === 'undefined') return;
      if (!projectId) {
        console.warn('[useTimeMachineRewind] no projectId — cannot rewind');
        return;
      }

      if (snapshotId === null) {
        setCurrentSnapshotId(null);
        const detail: RewindEventDetail = {
          projectId,
          snapshotId: null,
          journey: null,
          budget: null,
          timestamp: null,
        };
        window.dispatchEvent(new CustomEvent(REWIND_EVENT, { detail }));
        return;
      }

      const snapshots = getSnapshots(projectId);
      const snap = snapshots.find((s) => s.snapshotId === snapshotId);
      if (!snap) {
        console.warn('[useTimeMachineRewind] snapshot not found:', snapshotId);
        return;
      }

      setCurrentSnapshotId(snapshotId);
      const detail: RewindEventDetail = {
        projectId,
        snapshotId,
        journey: (snap.journey ?? null) as Record<string, unknown> | null,
        budget: snap.budget ?? null,
        timestamp: snap.timestamp,
      };
      window.dispatchEvent(new CustomEvent(REWIND_EVENT, { detail }));
    },
    [projectId]
  );

  return {
    currentSnapshotId,
    isHistorical: currentSnapshotId !== null,
    rewindTo,
  };
}
