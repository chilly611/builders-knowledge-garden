/**
 * Journey progress event store
 * ============================
 *
 * Single source of truth for "what's the user done across workflows?"
 *
 * Per `docs/week3-spine-spec.md` §3 this module:
 *   - Accepts four event types from workflow components.
 *   - Persists per-(user, project) state to localStorage for MVP.
 *   - Dispatches a `bkg:journey:changed` CustomEvent so subscribers refresh.
 *   - Rolls state up from per-workflow to per-stage for JourneyMapHeader.
 *
 * Clerk / Supabase sync deferred to the auth push. Anonymous / no-project
 * users still leave a lightweight local trail keyed by "default".
 */

// ─── Event types ──────────────────────────────────────────────────────────

export type JourneyEventType =
  | 'started'
  | 'step_completed'
  | 'completed'
  | 'needs_attention';

export interface JourneyEventBase {
  workflowId: string;
  projectId: string;
}

export type JourneyEvent =
  | ({ type: 'started' } & JourneyEventBase)
  | ({ type: 'completed' } & JourneyEventBase)
  | ({
      type: 'step_completed';
      stepId: string;
      stepIndex: number;
      totalSteps: number;
    } & JourneyEventBase)
  | ({ type: 'needs_attention'; reason?: string } & JourneyEventBase);

// ─── Rolled-up state ──────────────────────────────────────────────────────

export type JourneyWorkflowStatus =
  | 'untouched'
  | 'in_progress'
  | 'needs_attention'
  | 'done';

export interface JourneyWorkflowState {
  workflowId: string;
  status: JourneyWorkflowStatus;
  stepsCompleted: number;
  totalSteps: number;
  lastEventAt: number;
  lastReason?: string;
}

export type JourneyState = Record<string, JourneyWorkflowState>;

export interface StageProgress {
  worked: number; // workflows with at least one event
  done: number; // workflows fully completed
  needsAttention: number; // workflows flagged needs_attention
  total: number; // workflows in that stage (passed in)
}

// ─── Persistence (localStorage) ───────────────────────────────────────────

const USER_KEY = 'bkg-user-id';
const ACTIVE_PROJECT_KEY = 'bkg-active-project';
const STORAGE_PREFIX = 'bkg:journey:';
const CHANGE_EVENT = 'bkg:journey:changed';

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

export function resolveProjectId(): string {
  if (!isBrowser()) return 'default';
  try {
    return window.localStorage.getItem(ACTIVE_PROJECT_KEY) ?? 'default';
  } catch {
    return 'default';
  }
}

/**
 * Resolve the current jurisdiction from localStorage, or fall back to 'Local AHJ'.
 * Safe for SSR and protected storage access. Always returns a usable value.
 */
export function resolveJurisdiction(): string {
  if (!isBrowser()) return 'Local AHJ';
  try {
    return window.localStorage.getItem('bkg-jurisdiction') ?? 'Local AHJ';
  } catch {
    return 'Local AHJ';
  }
}

function readState(projectId: string): JourneyState {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as JourneyState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeState(projectId: string, state: JourneyState): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(state));
    window.dispatchEvent(
      new CustomEvent(CHANGE_EVENT, { detail: { projectId } })
    );
  } catch {
    // Quota exceeded or storage disabled — silently fail, the next session
    // will rebuild from future events.
  }
}

// ─── Event reducer ────────────────────────────────────────────────────────

function reduce(state: JourneyState, event: JourneyEvent): JourneyState {
  const prev: JourneyWorkflowState = state[event.workflowId] ?? {
    workflowId: event.workflowId,
    status: 'untouched',
    stepsCompleted: 0,
    totalSteps: 0,
    lastEventAt: 0,
  };
  const now = Date.now();

  switch (event.type) {
    case 'started': {
      return {
        ...state,
        [event.workflowId]: {
          ...prev,
          status: prev.status === 'done' ? 'done' : 'in_progress',
          lastEventAt: now,
        },
      };
    }
    case 'step_completed': {
      const nextSteps = Math.max(prev.stepsCompleted, event.stepIndex + 1);
      const allDone = nextSteps >= event.totalSteps;
      return {
        ...state,
        [event.workflowId]: {
          ...prev,
          status: allDone ? 'done' : 'in_progress',
          stepsCompleted: nextSteps,
          totalSteps: event.totalSteps,
          lastEventAt: now,
        },
      };
    }
    case 'completed': {
      return {
        ...state,
        [event.workflowId]: {
          ...prev,
          status: 'done',
          stepsCompleted: prev.totalSteps || prev.stepsCompleted,
          lastEventAt: now,
        },
      };
    }
    case 'needs_attention': {
      return {
        ...state,
        [event.workflowId]: {
          ...prev,
          status: 'needs_attention',
          lastEventAt: now,
          lastReason: event.reason,
        },
      };
    }
    default:
      return state;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

export function emitJourneyEvent(event: JourneyEvent): void {
  if (!isBrowser()) return;
  const state = readState(event.projectId);
  const next = reduce(state, event);
  writeState(event.projectId, next);
}

export function getJourneyState(projectId: string): JourneyState {
  return readState(projectId);
}

/**
 * Subscribe to journey-state changes for a specific project. Callback runs
 * once immediately with the current state, then again on every change.
 * Returns an unsubscribe function.
 */
export function subscribeJourney(
  projectId: string,
  callback: (state: JourneyState) => void
): () => void {
  if (!isBrowser()) return () => {};

  callback(readState(projectId));

  const handler = (evt: Event) => {
    const detail = (evt as CustomEvent<{ projectId: string }>).detail;
    if (!detail || detail.projectId === projectId) {
      callback(readState(projectId));
    }
  };
  window.addEventListener(CHANGE_EVENT, handler as EventListener);
  return () =>
    window.removeEventListener(CHANGE_EVENT, handler as EventListener);
}

/**
 * Roll per-workflow state up to per-stage counters that a chip strip can
 * render. Caller supplies the stage → workflowIds map; the rollup only
 * counts workflows declared in that map (so newly-added workflows don't
 * accidentally pollute an older landing page render).
 */
export function rollupByStage(
  state: JourneyState,
  stageWorkflows: Record<number, string[]>
): Record<number, StageProgress> {
  const rollup: Record<number, StageProgress> = {};
  for (const [stageIdStr, workflowIds] of Object.entries(stageWorkflows)) {
    const stageId = Number(stageIdStr);
    let worked = 0;
    let done = 0;
    let needsAttention = 0;
    for (const wid of workflowIds) {
      const w = state[wid];
      if (!w || w.status === 'untouched') continue;
      worked += 1;
      if (w.status === 'done') done += 1;
      if (w.status === 'needs_attention') needsAttention += 1;
    }
    rollup[stageId] = {
      worked,
      done,
      needsAttention,
      total: workflowIds.length,
    };
  }
  return rollup;
}
