/**
 * W9 IntegratedNavigator — shared type contracts
 *
 * The Navigator unifies three previously-separate chrome surfaces into one
 * stacked, collapsible, ever-present strip on every `/killerapp/*` route:
 *
 *   ┌────────────────────────────────────────────────────────────┐
 *   │  <JourneyStrip>      — 7 stages, color-coded progress       │
 *   │  <TimeMachineLever>  — horizontal scrub to prior snapshots  │
 *   │  <BudgetTimeline>    — per-stage committed/spent/remaining  │
 *   └────────────────────────────────────────────────────────────┘
 *
 * Sub-components import from this file so every piece of the Navigator
 * speaks the same shape. Change a contract here — propagate by tsc.
 *
 * See: docs/design/W9-integrated-surface-spec.md
 */

// ─── Stage identity ──────────────────────────────────────────────────────
// Canonical 7 stages of the Killer App lifecycle. Ordering is narrative —
// do not reorder. stageId 1 = Size Up, 7 = Reflect.
export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface StageMeta {
  id: StageId;
  /** URL-safe slug, e.g. "size-up". Used in workflows.json. */
  slug: string;
  /** Display label in foreman-voice. e.g. "Size up", "Lock it in". */
  label: string;
  /** 1-line description for tooltip / accessibility. */
  description: string;
}

// ─── Collapse state ──────────────────────────────────────────────────────
/**
 * hidden  — zero-height pill; only "N/7 stages done" whisper.
 * compact — single strip: current stage + current-stage $. ~60px tall.
 * expanded — full stack: Journey + TimeMachine + Budget. ~240px tall.
 *
 * Cycle: hidden → compact → expanded → hidden.
 */
export type NavigatorCollapseState = 'hidden' | 'compact' | 'expanded';

// ─── Per-stage journey progress ──────────────────────────────────────────
/**
 * Derived from journey-progress.ts rollup.
 *
 * - not_started: no workflows in this stage have been opened.
 * - in_progress: at least one workflow opened but not all done.
 * - complete:    every workflow in the stage is `done`.
 * - needs_attention: one or more workflows flagged (flag bit on analysis).
 * - skipped:     user explicitly marked the stage skipped (future).
 */
export type StageProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'needs_attention'
  | 'skipped';

export interface StageProgress {
  stageId: StageId;
  status: StageProgressStatus;
  /** Number of workflows in this stage that are done. */
  doneCount: number;
  /** Total workflows in this stage (derived from workflows.json). */
  totalCount: number;
  /** ISO timestamp of last activity in this stage; null if untouched. */
  lastActivityAt: string | null;
}

// ─── Per-stage budget snapshot ───────────────────────────────────────────
/**
 * Derived from budget-spine.ts `getProjectBudget()` + a stage→phase mapping
 * that lives in the BudgetTimeline component. All dollar amounts are in
 * cents (integer) to avoid FP drift; format at render time.
 */
export interface StageBudget {
  stageId: StageId;
  /** Cents committed (estimates + locked line items). */
  committedCents: number;
  /** Cents spent (actuals). */
  spentCents: number;
  /** Cents remaining = committed - spent. May be negative if overbudget. */
  remainingCents: number;
  /** 'not-started' | 'on-track' | 'overbudget'. */
  status: 'not-started' | 'on-track' | 'overbudget';
}

export interface BudgetTimelineData {
  byStage: Record<StageId, StageBudget>;
  /** Grand total committed across all stages (cents). */
  totalCommittedCents: number;
  /** Grand total spent across all stages (cents). */
  totalSpentCents: number;
  /** True if any stage is overbudget OR totalSpent > totalCommitted. */
  isOverbudget: boolean;
  /** Cents over = totalSpent - totalCommitted, or 0 if under. */
  overAmountCents: number;
}

// ─── Time Machine ────────────────────────────────────────────────────────
/**
 * A snapshot is a point-in-time capture of project state the user can
 * "travel back" to. Phase 3 work — the API (`/api/v1/projects/:id/snapshots`)
 * does NOT yet exist. Until it does, `snapshots: []` is a valid state and
 * the lever renders disabled with a "nothing to rewind to yet" affordance.
 */
export interface Snapshot {
  snapshotId: string;
  /** Human label: "Apr 20, 10:30am" or "Before v2 estimates". */
  label: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Which stage was active when snapped. */
  stageId: StageId;
  /** What this snapshot captures. */
  kind: 'estimates' | 'actuals' | 'both';
}

export interface TimeMachineData {
  snapshots: Snapshot[];
  /** Currently-viewed snapshot id; null = "now" (live data). */
  currentSnapshotId: string | null;
}

// ─── Navigator root state ────────────────────────────────────────────────
export interface NavigatorState {
  collapseState: NavigatorCollapseState;
  /** The project whose data the Navigator is showing. */
  projectId: string | null;
  /** User prefers reduced motion (from matchMedia). */
  prefersReducedMotion: boolean;
  /** Hover state for tooltip behavior. */
  hoveredStageId: StageId | null;
  /** Keyboard focus for a11y. */
  focusedStageId: StageId | null;
}

// ─── Event contract ──────────────────────────────────────────────────────
/**
 * Custom events dispatched by the Navigator so other parts of the app
 * can react (e.g. the BudgetWidget could reflect historical data when
 * the user scrubs the Time Machine).
 */
export const NAVIGATOR_EVENTS = {
  STAGE_CLICKED: 'bkg:navigator:stage-clicked',
  TIME_SCRUBBED: 'bkg:navigator:time-scrubbed',
  COLLAPSE_CHANGED: 'bkg:navigator:collapse-changed',
} as const;

export interface StageClickedDetail {
  stageId: StageId;
  projectId: string | null;
}

export interface TimeScrubbedDetail {
  snapshotId: string | null; // null = returned to "now"
  projectId: string | null;
}

export interface CollapseChangedDetail {
  from: NavigatorCollapseState;
  to: NavigatorCollapseState;
}

// ─── Canonical stage registry ────────────────────────────────────────────
/**
 * Source of truth for stage labels used anywhere in the Navigator.
 * Mirror of docs/workflows.json `lifecycleStages`; duplicated here so the
 * Navigator never crashes on a workflows.json fetch miss.
 *
 * If you rename a label here, also update workflows.json and the
 * JourneyMapHeader fallback list. brand-voice rule: short, crew-voice,
 * action verbs.
 */
export const STAGE_REGISTRY: readonly StageMeta[] = [
  { id: 1, slug: 'size-up', label: 'Size up',     description: 'Assess the opportunity and plan the work.' },
  { id: 2, slug: 'lock',    label: 'Lock it in',  description: 'Contracts signed, scope fixed, permits pulled.' },
  { id: 3, slug: 'plan',    label: 'Plan it out', description: 'Sequence the job, size the crew, line up supplies.' },
  { id: 4, slug: 'build',   label: 'Build',       description: 'Run the job on the ground.' },
  { id: 5, slug: 'adapt',   label: 'Adapt',       description: 'Handle change orders, RFIs, field conditions.' },
  { id: 6, slug: 'collect', label: 'Collect',     description: 'Invoices, draws, lien waivers, payment.' },
  { id: 7, slug: 'reflect', label: 'Reflect',     description: 'Warranty, lessons, portfolio, referrals.' },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────
export function stageBySlug(slug: string): StageMeta | undefined {
  return STAGE_REGISTRY.find((s) => s.slug === slug);
}

export function stageById(id: StageId): StageMeta | undefined {
  return STAGE_REGISTRY.find((s) => s.id === id);
}

export function formatCents(cents: number): string {
  const dollars = Math.round(cents / 100);
  if (Math.abs(dollars) >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return `$${dollars}`;
}
