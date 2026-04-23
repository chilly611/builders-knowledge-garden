/**
 * Time Machine — Snapshot management
 * ==================================
 *
 * Captures point-in-time snapshots of project state that users can "rewind" to.
 * Integrates with:
 *   1. journey-progress.ts (step completion events)
 *   2. budget-spine.ts (budget change events)
 *   3. Manual save triggers via explicit calls
 *
 * Persists to localStorage under `bkg:time-machine:{projectId}` as:
 *   { snapshots: Snapshot[], version: 1 }
 *
 * Dispatches 'bkg:time-machine:changed' custom event on updates so the
 * navigator/UI re-renders with new snapshots available.
 */

import type { Snapshot, StageId } from '@/components/navigator/types';

// ─── Constants ───────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'bkg:time-machine:';
const CHANGE_EVENT = 'bkg:time-machine:changed';
const AUTO_LABEL_MAX_LENGTH = 40;

// ─── Internal state ──────────────────────────────────────────────────────

interface TimeMachineState {
  snapshots: Snapshot[];
  version: 1;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

function readState(projectId: string): TimeMachineState {
  if (!isBrowser()) return { snapshots: [], version: 1 };
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return { snapshots: [], version: 1 };
    const parsed = JSON.parse(raw) as TimeMachineState;
    return parsed && typeof parsed === 'object' && Array.isArray(parsed.snapshots)
      ? parsed
      : { snapshots: [], version: 1 };
  } catch {
    return { snapshots: [], version: 1 };
  }
}

function writeState(projectId: string, state: TimeMachineState): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(state));
    // Dispatch change event so subscribers (navigator, etc.) refresh
    window.dispatchEvent(
      new CustomEvent(CHANGE_EVENT, {
        detail: { projectId, snapshotCount: state.snapshots.length },
      })
    );
  } catch {
    // Quota exceeded or storage disabled — silently fail
  }
}

/**
 * Auto-generate a label from an event type and optional hint.
 * E.g., "Step completed: Size estimates", "Budget updated", "Saved"
 */
function generateLabel(eventType: string, hint?: string): string {
  let label = '';

  if (eventType === 'step_completed') {
    label = hint ? `Step: ${hint}` : 'Step completed';
  } else if (eventType === 'budget_changed') {
    label = 'Budget updated';
  } else if (eventType === 'manual_save') {
    label = 'Saved';
  } else {
    label = 'Snapshot';
  }

  // Truncate if needed
  if (label.length > AUTO_LABEL_MAX_LENGTH) {
    return label.substring(0, AUTO_LABEL_MAX_LENGTH - 1) + '…';
  }

  return label;
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Create a new snapshot and persist it.
 *
 * @param projectId The project whose state to snapshot
 * @param eventType The triggering event type ('step_completed', 'budget_changed', 'manual_save')
 * @param stageId The active stage at snapshot time
 * @param label Optional human-readable label; auto-generated if not provided
 * @param hint Optional hint for auto-label generation (e.g., step name)
 * @returns The newly created snapshot
 */
export function createSnapshot(
  projectId: string,
  eventType: 'step_completed' | 'budget_changed' | 'manual_save',
  stageId: StageId,
  label?: string,
  hint?: string
): Snapshot {
  if (!isBrowser()) {
    // SSR-safe fallback; snapshots won't persist
    return {
      snapshotId: `snap-${Date.now()}`,
      label: label || generateLabel(eventType, hint),
      timestamp: new Date().toISOString(),
      stageId,
      kind: 'both',
    };
  }

  const state = readState(projectId);

  // Generate snapshot ID (unique per project)
  const snapshotId = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const snapshot: Snapshot = {
    snapshotId,
    label: label || generateLabel(eventType, hint),
    timestamp: new Date().toISOString(),
    stageId,
    kind: 'both', // For MVP, always capture both estimates and actuals
  };

  // Prepend new snapshot to array (most recent first)
  state.snapshots.unshift(snapshot);

  // Keep only the 50 most recent snapshots to avoid bloat
  if (state.snapshots.length > 50) {
    state.snapshots = state.snapshots.slice(0, 50);
  }

  writeState(projectId, state);
  return snapshot;
}

/**
 * Get all snapshots for a project.
 */
export function getSnapshots(projectId: string): Snapshot[] {
  const state = readState(projectId);
  return state.snapshots;
}

/**
 * Subscribe to snapshot changes for a project.
 * Callback runs immediately with current snapshots, then again on every change.
 * Returns an unsubscribe function.
 */
export function subscribeSnapshots(
  projectId: string,
  callback: (snapshots: Snapshot[]) => void
): () => void {
  if (!isBrowser()) return () => {};

  // Immediate callback with current state
  callback(readState(projectId).snapshots);

  // Listen for change events
  const handler = (evt: Event) => {
    const detail = (evt as CustomEvent<{ projectId: string }>).detail;
    if (!detail || detail.projectId === projectId) {
      callback(readState(projectId).snapshots);
    }
  };

  window.addEventListener(CHANGE_EVENT, handler as EventListener);
  return () => window.removeEventListener(CHANGE_EVENT, handler as EventListener);
}

/**
 * Clear all snapshots for a project (e.g., on project reset/delete).
 */
export function clearSnapshots(projectId: string): void {
  if (!isBrowser()) return;
  writeState(projectId, { snapshots: [], version: 1 });
}

/**
 * Create a "welcome" snapshot for a new project session.
 * Fires when a project is first created or a fresh session begins.
 */
export function createWelcomeSnapshot(projectId: string): Snapshot {
  return createSnapshot(
    projectId,
    'manual_save',
    1, // Start at stage 1 (Size Up)
    'Project started'
  );
}
