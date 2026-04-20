/**
 * Visited stages tracker
 * ======================
 *
 * Per-project, per-user set of lifecycle stage ids the user has actually
 * walked into. Lets ProjectCompass distinguish "gray, seen but untouched"
 * (visited but no work yet) from "gray, never seen" (future stage they
 * haven't explored).
 *
 * Storage: localStorage key `bkg:visited-stages:<user>:<project>` → JSON
 * array of numbers. Keeps the schema identical to `journey-progress.ts`
 * so anonymous / no-project sessions still get a coherent trail under the
 * "default" bucket.
 *
 * Event: `bkg:visited-stages:changed` CustomEvent with `{projectId}` in
 * detail. Subscribers (ProjectCompass) refresh on change.
 */

// ─── Keys ────────────────────────────────────────────────────────────────

const USER_KEY = 'bkg-user-id';
const STORAGE_PREFIX = 'bkg:visited-stages:';
const CHANGE_EVENT = 'bkg:visited-stages:changed';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function userKey(): string {
  if (!isBrowser()) return 'anon';
  try {
    return window.localStorage.getItem(USER_KEY) ?? 'anon';
  } catch {
    return 'anon';
  }
}

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${userKey()}:${projectId}`;
}

// ─── Read / write ────────────────────────────────────────────────────────

function read(projectId: string): Set<number> {
  if (!isBrowser()) return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    const nums = parsed.filter((n): n is number => typeof n === 'number');
    return new Set(nums);
  } catch {
    return new Set();
  }
}

function write(projectId: string, set: Set<number>): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      storageKey(projectId),
      JSON.stringify([...set].sort((a, b) => a - b))
    );
    window.dispatchEvent(
      new CustomEvent(CHANGE_EVENT, { detail: { projectId } })
    );
  } catch {
    // Quota or storage-disabled: silent fail; we'll rebuild from future visits.
  }
}

// ─── Public API ──────────────────────────────────────────────────────────

export function markStageVisited(projectId: string, stageId: number): void {
  if (!Number.isFinite(stageId)) return;
  const current = read(projectId);
  if (current.has(stageId)) return;
  current.add(stageId);
  write(projectId, current);
}

export function getVisitedStages(projectId: string): number[] {
  return [...read(projectId)].sort((a, b) => a - b);
}

export function subscribeVisitedStages(
  projectId: string,
  callback: (visited: number[]) => void
): () => void {
  if (!isBrowser()) return () => {};

  callback(getVisitedStages(projectId));

  const handler = (evt: Event) => {
    const detail = (evt as CustomEvent<{ projectId: string }>).detail;
    if (!detail || detail.projectId === projectId) {
      callback(getVisitedStages(projectId));
    }
  };
  window.addEventListener(CHANGE_EVENT, handler as EventListener);
  return () =>
    window.removeEventListener(CHANGE_EVENT, handler as EventListener);
}
