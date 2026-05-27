/**
 * Marin 4000 sqft — demo fixture for the Plan + Build stages.
 * =========================================================
 *
 * Self-contained sample project so the new stage chrome renders with real
 * numbers in the demo even when Supabase isn't seeded or the user isn't the
 * project owner. Keyed to the allowlisted demo project UUID in
 * `src/app/api/v1/projects/route.ts` (DEMO_PROJECT_IDS — "Marin farmhouse")
 * so that, when the DB row IS present, identity lines up. When it isn't,
 * the stage pages fall back to this fixture.
 *
 * Two things the chrome reads live:
 *   1. Budget total — written into the BudgetClient localStorage spine
 *      (`bkg-budget-{projectId}`, BudgetLine[] shape) by `seedMarinBudget()`
 *      so the BudgetRibbon can read + recompute it.
 *   2. Schedule — `computeSchedule()` turns the current Plan sequencing
 *      order into a timeline (weeks) + general-conditions overhead ($).
 *      Reordering phases changes how much work runs concurrently, which
 *      changes the timeline, which changes the overhead — the live budget
 *      impact the Plan stage demonstrates on every drag.
 */

import type { BudgetLine } from '@/app/killerapp/budget/budget-storage';

/** Allowlisted demo project id (see DEMO_PROJECT_IDS in projects route). */
export const MARIN_PROJECT_ID = '55730cd3-5225-493d-8b5c-49086d942565';

export interface MarinProjectRecord {
  id: string;
  name: string;
  client_name: string;
  jurisdiction: string;
  /** Jurisdiction the live code-lookup is wired to for the demo. */
  code_jurisdiction: string;
  sqft: string;
  project_type: string;
  estimated_cost_low: number;
  estimated_cost_high: number;
}

export const MARIN_PROJECT: MarinProjectRecord = {
  id: MARIN_PROJECT_ID,
  name: 'Marin Farmhouse',
  client_name: 'The Harwell Family',
  jurisdiction: 'Marin County, CA',
  code_jurisdiction: 'San Francisco, CA',
  sqft: '4,000',
  project_type: 'Custom farmhouse — 2 story, 4,000 sqft',
  estimated_cost_low: 1_850_000,
  estimated_cost_high: 2_150_000,
};

// ─── Budget (BudgetClient spine shape) ──────────────────────────────────────

const NOW = '2026-05-20T17:00:00.000Z';

function line(
  id: string,
  category: BudgetLine['category'],
  description: string,
  amount: number,
  state: BudgetLine['state'],
  vendor?: string,
): BudgetLine {
  return { id, category, description, amount, state, vendor, createdAt: NOW, updatedAt: NOW };
}

export const MARIN_BUDGET_LINES: BudgetLine[] = [
  line('marin-permits', 'permits', 'Marin County building permits + school fees', 42_000, 'paid', 'Marin County DPW'),
  line('marin-arch', 'admin', 'Architecture & structural engineering', 96_000, 'paid', 'Field Studio Architects'),
  line('marin-gc', 'labor', 'GC general conditions & supervision', 185_000, 'locked-in'),
  line('marin-foundation', 'subcontractors', 'Foundation & concrete', 165_000, 'locked-in', 'Tamalpais Concrete'),
  line('marin-framing-labor', 'subcontractors', 'Framing — rough carpentry', 240_000, 'locked-in', 'Ridgeline Framing'),
  line('marin-framing-mat', 'materials', 'Framing lumber & sheathing', 128_000, 'estimated'),
  line('marin-roofing', 'subcontractors', 'Roofing & weatherproofing', 96_000, 'estimated', 'Bay Roofing Co.'),
  line('marin-electrical', 'subcontractors', 'Electrical — rough + finish', 142_000, 'estimated'),
  line('marin-plumbing', 'subcontractors', 'Plumbing — rough + finish', 138_000, 'estimated'),
  line('marin-hvac', 'subcontractors', 'HVAC & ductwork', 88_000, 'estimated'),
  line('marin-windows', 'materials', 'Windows & exterior doors', 115_000, 'estimated', 'Marvin'),
  line('marin-drywall', 'subcontractors', 'Insulation & drywall', 92_000, 'estimated'),
  line('marin-finishes', 'materials', 'Interior finishes — flooring, cabinets, counters', 268_000, 'pending'),
  line('marin-siding', 'subcontractors', 'Exterior siding & stucco', 84_000, 'pending'),
  line('marin-equipment', 'equipment', 'Crane & equipment rental', 36_000, 'estimated'),
  line('marin-landscape', 'subcontractors', 'Landscape & hardscape', 74_000, 'pending'),
];

/** Base hard-cost total (sum of all budget lines), excluding schedule overhead. */
export const MARIN_BUDGET_BASE_TOTAL = MARIN_BUDGET_LINES.reduce((s, l) => s + l.amount, 0);

// ─── Sequencing (Plan stage drag-drop) ──────────────────────────────────────

export interface PlanPhase {
  id: string;
  name: string;
  trade: string;
  /** Sequential duration in weeks if run on its own. */
  weeks: number;
  /**
   * Phases that share a non-null parallelGroup AND end up ADJACENT in the
   * order run concurrently — the run counts as max(weeks) once instead of
   * the sum. This is what makes reordering change the timeline (and budget).
   */
  parallelGroup: string | null;
  icon: string;
}

/**
 * Default order. The three MEP rough-ins (electrical/plumbing/HVAC) start
 * adjacent so they run concurrently — a competent baseline. Dragging one out
 * of the cluster forces it sequential, which lengthens the schedule and
 * raises general-conditions overhead live in the BudgetRibbon.
 */
export const MARIN_PLAN_PHASES: PlanPhase[] = [
  { id: 'site-prep', name: 'Site prep & excavation', trade: 'Sitework', weeks: 3, parallelGroup: null, icon: '🚜' },
  { id: 'foundation', name: 'Foundation & concrete', trade: 'Concrete', weeks: 4, parallelGroup: null, icon: '🧱' },
  { id: 'framing', name: 'Framing', trade: 'Carpentry', weeks: 8, parallelGroup: null, icon: '🪚' },
  { id: 'dry-in', name: 'Roofing & dry-in', trade: 'Roofing', weeks: 3, parallelGroup: null, icon: '🏠' },
  { id: 'rough-elec', name: 'Rough electrical', trade: 'Electrical', weeks: 3, parallelGroup: 'mep', icon: '⚡' },
  { id: 'rough-plumb', name: 'Rough plumbing', trade: 'Plumbing', weeks: 3, parallelGroup: 'mep', icon: '🚿' },
  { id: 'rough-hvac', name: 'Rough HVAC', trade: 'Mechanical', weeks: 2, parallelGroup: 'mep', icon: '🌡️' },
  { id: 'insul-drywall', name: 'Insulation & drywall', trade: 'Drywall', weeks: 4, parallelGroup: null, icon: '🧰' },
  { id: 'finishes', name: 'Interior finishes', trade: 'Finish carpentry', weeks: 6, parallelGroup: null, icon: '🪟' },
  { id: 'exterior', name: 'Exterior siding & landscape', trade: 'Exterior', weeks: 4, parallelGroup: 'exterior', icon: '🌿' },
];

/** General-conditions burn per calendar week of schedule (supervision, site
 *  facilities, equipment standby, financing carry). Drives the live impact. */
export const WEEKLY_OVERHEAD = 9_500;

export interface ScheduleResult {
  totalWeeks: number;
  overheadCost: number;
  /** Weeks saved by concurrency vs. running every phase sequentially. */
  weeksSavedByParallel: number;
}

/**
 * Collapse adjacent same-group phases into concurrent runs and sum the
 * resulting durations. Pure — safe to call on every drag.
 */
export function computeSchedule(phases: PlanPhase[]): ScheduleResult {
  let totalWeeks = 0;
  let i = 0;
  while (i < phases.length) {
    const group = phases[i].parallelGroup;
    if (group) {
      // Gather the adjacent run that shares this group.
      let runMax = phases[i].weeks;
      let j = i + 1;
      while (j < phases.length && phases[j].parallelGroup === group) {
        runMax = Math.max(runMax, phases[j].weeks);
        j++;
      }
      totalWeeks += runMax;
      i = j;
    } else {
      totalWeeks += phases[i].weeks;
      i++;
    }
  }
  const sequentialWeeks = phases.reduce((s, p) => s + p.weeks, 0);
  return {
    totalWeeks,
    overheadCost: totalWeeks * WEEKLY_OVERHEAD,
    weeksSavedByParallel: sequentialWeeks - totalWeeks,
  };
}

// ─── localStorage seeding ────────────────────────────────────────────────────

function storageKeyFor(projectId: string): string {
  return `bkg-budget-${projectId}`;
}

const ACTIVE_PROJECT_KEY = 'bkg-active-project';

/**
 * Write the Marin budget lines into the BudgetClient localStorage spine so
 * the BudgetRibbon (and the /killerapp/budget page) read the same numbers.
 * Idempotent: only writes if the key is absent, so a user's edits survive.
 * Returns the lines that are now in the store.
 */
export function seedMarinBudget(): BudgetLine[] {
  if (typeof window === 'undefined') return MARIN_BUDGET_LINES;
  try {
    const key = storageKeyFor(MARIN_PROJECT_ID);
    const existing = window.localStorage.getItem(key);
    if (!existing) {
      window.localStorage.setItem(key, JSON.stringify(MARIN_BUDGET_LINES));
    }
  } catch {
    /* ignore storage failures — fixture still serves the UI */
  }
  return MARIN_BUDGET_LINES;
}

/** Point the active-project pointer at the Marin demo (so budget + identity align). */
export function ensureMarinActive(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, MARIN_PROJECT_ID);
  } catch {
    /* ignore */
  }
}
