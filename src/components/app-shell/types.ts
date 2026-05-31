/**
 * Shared App Shell — config contract.
 *
 * Every Killer App surface mounts ONE shell (seal · compass nav · identity ·
 * project · budget strip · journey strip · magic button). What differs per
 * surface is this CONFIG. Defaults reproduce the Owner Lane; each lane is a
 * config of the same shell rather than a bespoke copy.
 */

export type MoneyState = 'paid' | 'now' | 'soon';

export interface ShellBudgetCell {
  /** KAC stage slug (size-up … reflect). */
  stage: string;
  state: MoneyState;
  /** Short label shown in the cell ("Paid" / a $ figure / "Soon"). */
  amountLabel: string;
  /** Render the small "needs you" dot on this cell. */
  tick?: boolean;
}

export interface ShellBudget {
  show: boolean;
  cells: ShellBudgetCell[];
  activeStage: string;
  /** Big end figure, e.g. "$1.15M". */
  endBig: string;
  /** Sub line under the end figure, e.g. "left of $1.65M". */
  endSub: string;
}

export interface ShellJourney {
  show: boolean;
  activeStage: string;
  /** 0..100 completion WITHIN the active stage (drives the scrubber + fill). */
  pct: number;
  weekOf: number;
  weeksTotal: number;
}

export interface ShellNavItem {
  id: string;
  label: string;
  sub?: string;
  /** When present the item navigates there; otherwise it's an inert label. */
  href?: string;
  /** Render the rust "needs you" marker. */
  flag?: boolean;
  /** Optional group heading this item sits under. */
  group?: string;
}

export interface ShellConfig {
  /** Lane slug — used to tag captures (copilot_interactions / project_attachments). */
  laneSlug: string;
  /** Human lane label — element 3 "who you are / active lane" ("Owner" / "Builder"). */
  laneLabel: string;
  /** Italic kicker under the project name, e.g. "Builder's Knowledge Garden · Owner". */
  kicker: string;
  /** Element 4 — what project you're on. */
  projectId: string | null;
  projectName: string;
  /** Animated seal source (umbrella mark from brand-assets by default). */
  sealSrc: string;
  budget: ShellBudget;
  journey: ShellJourney;
  /** Compass-bloom navigation items. */
  nav: ShellNavItem[];
  /** False while the owning surface is still resolving its data. */
  ready: boolean;
}
