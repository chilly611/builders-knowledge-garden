'use client';

/**
 * useTimeMachine — unified hook for the Time Machine primitive.
 *
 * The constitution (docs/design-constitution.md, Goal 5) declares the
 * Time Machine as platform infrastructure: undo stack, drafts tray,
 * skip-and-return, and stateful breadcrumbs. The pieces already live
 * in the repo:
 *
 *   - src/lib/time-machine.ts ............ snapshot CRUD + subscribe
 *   - src/lib/use-time-machine-rewind.ts . rewind-to-snapshot hook
 *
 * This hook wraps both and adds:
 *   - A simple undo / redo API derived from the snapshot stack
 *   - A drafts tray persisted in localStorage (state only — no UI yet)
 *   - A stateful breadcrumb stack: push(crumb), pop(), peek()
 *
 * The drafts and breadcrumbs are intentionally NOT surfaced in the UI
 * tonight (per the 2026-05-27 chrome build spec). The hook is the data
 * layer so future surfaces inherit fearless navigation for free.
 *
 * Storage keys (one per project):
 *   bkg:time-machine:<projectId>          — snapshots (already in use)
 *   bkg:time-machine:drafts:<projectId>   — drafts tray
 *   bkg:time-machine:crumbs:<projectId>   — breadcrumb stack
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createSnapshot,
  getSnapshots,
  subscribeSnapshots,
} from '@/lib/time-machine';
import { useTimeMachineRewind } from '@/lib/use-time-machine-rewind';
import type { Snapshot, StageId } from '@/components/navigator/types';

// ─── Drafts ────────────────────────────────────────────────────────────

export interface Draft {
  id: string;
  label: string;
  /** Whatever shape the consumer wants to save — kept opaque. */
  payload: unknown;
  /** Where the draft was created (route + optional anchor). */
  origin?: { route: string; anchor?: string };
  createdAt: string; // ISO
}

const DRAFTS_KEY_PREFIX = 'bkg:time-machine:drafts:';

function readDrafts(projectId: string): Draft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${DRAFTS_KEY_PREFIX}${projectId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Draft[]) : [];
  } catch {
    return [];
  }
}

function writeDrafts(projectId: string, drafts: Draft[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${DRAFTS_KEY_PREFIX}${projectId}`,
      JSON.stringify(drafts.slice(0, 50)) // cap to 50 drafts
    );
  } catch {
    // quota or disabled — silent fail, drafts won't persist
  }
}

// ─── Breadcrumbs ───────────────────────────────────────────────────────

export interface Breadcrumb {
  label: string;
  route: string;
  /** Optional snapshot id — clicking restores both route AND project state. */
  snapshotId?: string;
  pushedAt: string; // ISO
}

const CRUMBS_KEY_PREFIX = 'bkg:time-machine:crumbs:';

function readCrumbs(projectId: string): Breadcrumb[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${CRUMBS_KEY_PREFIX}${projectId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Breadcrumb[]) : [];
  } catch {
    return [];
  }
}

function writeCrumbs(projectId: string, crumbs: Breadcrumb[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${CRUMBS_KEY_PREFIX}${projectId}`,
      JSON.stringify(crumbs.slice(-20)) // keep the most recent 20
    );
  } catch {
    // quota or disabled — silent fail
  }
}

// ─── The hook ──────────────────────────────────────────────────────────

export interface UseTimeMachineResult {
  // Snapshot stack
  snapshots: Snapshot[];
  currentSnapshotId: string | null;
  isHistorical: boolean;

  // Undo / redo API
  /** Step one snapshot back in time. Returns the snapshot we landed on, or null. */
  undo: () => Snapshot | null;
  /** Step forward toward "live". Returns the snapshot we landed on, or null = live. */
  redo: () => Snapshot | null;
  /** Jump to a specific snapshot. Pass null to return to live. */
  rewindTo: (snapshotId: string | null) => void;
  /** Manually capture a snapshot. */
  snapshot: (stageId: StageId, label?: string) => Snapshot | null;

  // Drafts tray
  drafts: Draft[];
  saveDraft: (input: Omit<Draft, 'id' | 'createdAt'>) => Draft | null;
  removeDraft: (id: string) => void;
  clearDrafts: () => void;

  // Breadcrumb stack
  breadcrumbs: Breadcrumb[];
  pushBreadcrumb: (input: Omit<Breadcrumb, 'pushedAt'>) => void;
  popBreadcrumb: () => Breadcrumb | null;
  peekBreadcrumb: () => Breadcrumb | null;
  clearBreadcrumbs: () => void;
}

export function useTimeMachine(projectId: string | null): UseTimeMachineResult {
  // Snapshots — subscribe so the hook re-renders when createSnapshot fires.
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  useEffect(() => {
    if (!projectId) {
      setSnapshots([]);
      return;
    }
    const unsub = subscribeSnapshots(projectId, setSnapshots);
    return unsub;
  }, [projectId]);

  const { currentSnapshotId, isHistorical, rewindTo } = useTimeMachineRewind(projectId);

  // Undo / redo derived from the snapshot stack.
  // Snapshots are stored newest-first. "currentSnapshotId === null" means
  // we're live (the head). undo() → move to snapshots[0], or one older if
  // we're already historical. redo() → move toward live.
  const undo = useCallback((): Snapshot | null => {
    if (!projectId || snapshots.length === 0) return null;
    if (currentSnapshotId === null) {
      // Live → move to most recent snapshot
      const target = snapshots[0];
      rewindTo(target.snapshotId);
      return target;
    }
    const idx = snapshots.findIndex((s) => s.snapshotId === currentSnapshotId);
    if (idx === -1 || idx >= snapshots.length - 1) return null;
    const target = snapshots[idx + 1];
    rewindTo(target.snapshotId);
    return target;
  }, [projectId, snapshots, currentSnapshotId, rewindTo]);

  const redo = useCallback((): Snapshot | null => {
    if (!projectId) return null;
    if (currentSnapshotId === null) return null; // already live
    const idx = snapshots.findIndex((s) => s.snapshotId === currentSnapshotId);
    if (idx <= 0) {
      // At the newest snapshot → step back to live
      rewindTo(null);
      return null;
    }
    const target = snapshots[idx - 1];
    rewindTo(target.snapshotId);
    return target;
  }, [projectId, snapshots, currentSnapshotId, rewindTo]);

  const snapshot = useCallback(
    (stageId: StageId, label?: string): Snapshot | null => {
      if (!projectId) return null;
      return createSnapshot(projectId, 'manual_save', stageId, label);
    },
    [projectId]
  );

  // Drafts — load once per project, write through on each mutation.
  const [drafts, setDrafts] = useState<Draft[]>([]);
  useEffect(() => {
    if (!projectId) {
      setDrafts([]);
      return;
    }
    setDrafts(readDrafts(projectId));
  }, [projectId]);

  const saveDraft = useCallback(
    (input: Omit<Draft, 'id' | 'createdAt'>): Draft | null => {
      if (!projectId) return null;
      const draft: Draft = {
        id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        ...input,
      };
      setDrafts((current) => {
        const next = [draft, ...current];
        writeDrafts(projectId, next);
        return next;
      });
      return draft;
    },
    [projectId]
  );

  const removeDraft = useCallback(
    (id: string) => {
      if (!projectId) return;
      setDrafts((current) => {
        const next = current.filter((d) => d.id !== id);
        writeDrafts(projectId, next);
        return next;
      });
    },
    [projectId]
  );

  const clearDrafts = useCallback(() => {
    if (!projectId) return;
    setDrafts([]);
    writeDrafts(projectId, []);
  }, [projectId]);

  // Breadcrumbs — same pattern as drafts.
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  useEffect(() => {
    if (!projectId) {
      setBreadcrumbs([]);
      return;
    }
    setBreadcrumbs(readCrumbs(projectId));
  }, [projectId]);

  const pushBreadcrumb = useCallback(
    (input: Omit<Breadcrumb, 'pushedAt'>) => {
      if (!projectId) return;
      const crumb: Breadcrumb = { ...input, pushedAt: new Date().toISOString() };
      setBreadcrumbs((current) => {
        const next = [...current, crumb];
        writeCrumbs(projectId, next);
        return next;
      });
    },
    [projectId]
  );

  const popBreadcrumb = useCallback((): Breadcrumb | null => {
    if (!projectId) return null;
    // Use a ref so we can return the popped value synchronously.
    const popped: { value: Breadcrumb | null } = { value: null };
    setBreadcrumbs((current) => {
      if (current.length === 0) return current;
      const next = current.slice(0, -1);
      popped.value = current[current.length - 1] ?? null;
      writeCrumbs(projectId, next);
      return next;
    });
    return popped.value;
  }, [projectId]);

  const peekBreadcrumb = useCallback((): Breadcrumb | null => {
    if (breadcrumbs.length === 0) return null;
    return breadcrumbs[breadcrumbs.length - 1];
  }, [breadcrumbs]);

  const clearBreadcrumbs = useCallback(() => {
    if (!projectId) return;
    setBreadcrumbs([]);
    writeCrumbs(projectId, []);
  }, [projectId]);

  return useMemo(
    () => ({
      snapshots,
      currentSnapshotId,
      isHistorical,
      undo,
      redo,
      rewindTo,
      snapshot,
      drafts,
      saveDraft,
      removeDraft,
      clearDrafts,
      breadcrumbs,
      pushBreadcrumb,
      popBreadcrumb,
      peekBreadcrumb,
      clearBreadcrumbs,
    }),
    [
      snapshots,
      currentSnapshotId,
      isHistorical,
      undo,
      redo,
      rewindTo,
      snapshot,
      drafts,
      saveDraft,
      removeDraft,
      clearDrafts,
      breadcrumbs,
      pushBreadcrumb,
      popBreadcrumb,
      peekBreadcrumb,
      clearBreadcrumbs,
    ]
  );
}

// Re-export the underlying primitives for consumers that need them
// without re-importing from two places.
export { createSnapshot, getSnapshots } from '@/lib/time-machine';
export type { Snapshot } from '@/components/navigator/types';
