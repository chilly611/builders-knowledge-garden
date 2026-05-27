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
  estimated_cost_low: 1_550_000,
  estimated_cost_high: 1_780_000,
};

// ─── AI Attention Items (AI COO surface on /projects/[id]) ──────────────────
// Curated, deterministic items for the Marin demo. The /projects/[id] page's
// "AI Attention Items" otherwise reads the GLOBAL command_center_attention
// table (GET /api/v1/projects/analyze ignores the project id), which leaks a
// different project's stale rows onto the page. Until per-project hydration
// exists (the useKacProject(id) hook noted in page.tsx), the page falls back
// to these — matching the KillerAppChrome's own Marin fixture fallback so the
// chrome's numbers and the attention items describe the SAME project.
// Numbers track the chrome: $1.65M total, $347K headroom, foundation just
// wrapped (May 14), framing milestone Jul 7. Client: The Harwell Family.

export interface MarinAttentionItem {
  id: string;
  title: string;
  body: string;
  urgency: 'red' | 'yellow' | 'green';
}

export const MARIN_ATTENTION_ITEMS: MarinAttentionItem[] = [
  {
    id: 'marin-att-framing-lumber',
    title: 'Order Framing Lumber Now — Jul 7 Framing Milestone at Risk',
    urgency: 'red',
    body: "The $128K framing lumber & sheathing package is still only estimated, not ordered. North Bay yards are quoting 4-6 week lead times on the engineered members for a 2-story span — order this week or the Jul 7 framing start (and Ridgeline's crew slot) slips, burning ~$9.5K/week in general conditions.",
  },
  {
    id: 'marin-att-foundation-inspection',
    title: 'Schedule Marin County Foundation Inspection Before Framing',
    urgency: 'red',
    body: 'Foundation & concrete wrapped on the May 14 milestone, but framing cannot legally start until Marin County DPW signs off the foundation/setback inspection. Book it now — county inspection backlogs run 5-8 business days and a miss stalls Ridgeline Framing at the gate.',
  },
  {
    id: 'marin-att-windows-leadtime',
    title: 'Release the Marvin Window Order — 8-12 Week Lead',
    urgency: 'yellow',
    body: 'The $115K Marvin window & exterior-door package is still estimated. Coastal-spec units for a custom farmhouse run 8-12 weeks; if not released now they become the bottleneck at dry-in and push the weather-tight date into the fall rains.',
  },
  {
    id: 'marin-att-finishes-allowances',
    title: 'Lock Finish Allowances With the Harwells',
    urgency: 'yellow',
    body: 'Interior finishes ($268K) are pending and unselected — the single largest line and the usual source of overruns. With $347K of headroom (21% of the $1.65M budget), confirm flooring/cabinet/counter allowances with the Harwell family before selections drift and eat the contingency.',
  },
  {
    id: 'marin-att-draw-foundation',
    title: 'Prep the Foundation-Milestone Draw',
    urgency: 'yellow',
    body: 'Foundation is complete and ~$138K is billed against the $1.65M contract. Assemble the foundation-milestone draw package now so it is ready the day the inspection passes — lenders typically need 5-7 business days plus a site inspection, and a lag stalls framing cash flow.',
  },
  {
    id: 'marin-att-on-budget',
    title: 'On Budget Through Foundation — $1.65M Holding',
    urgency: 'green',
    body: 'The Marin Farmhouse is tracking on budget at 19% spent, inside the $1.55M-$1.78M estimate, with foundation landing at the locked-in $165K. A clean signal entering the framing phase — hold the line on change orders to protect the $347K headroom.',
  },
];

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
  line('marin-permits', 'permits', 'Marin County building permits + school fees', 38_000, 'paid', 'Marin County DPW'),
  line('marin-arch', 'admin', 'Architecture & structural engineering', 78_000, 'paid', 'Field Studio Architects'),
  line('marin-gc', 'labor', 'GC general conditions & supervision', 140_000, 'locked-in'),
  line('marin-foundation', 'subcontractors', 'Foundation & concrete', 165_000, 'locked-in', 'Tamalpais Concrete'),
  line('marin-framing-labor', 'subcontractors', 'Framing — rough carpentry', 175_000, 'locked-in', 'Ridgeline Framing'),
  line('marin-framing-mat', 'materials', 'Framing lumber & sheathing', 128_000, 'estimated'),
  line('marin-roofing', 'subcontractors', 'Roofing & weatherproofing', 72_000, 'estimated', 'Bay Roofing Co.'),
  line('marin-electrical', 'subcontractors', 'Electrical — rough + finish', 104_000, 'estimated'),
  line('marin-plumbing', 'subcontractors', 'Plumbing — rough + finish', 100_000, 'estimated'),
  line('marin-hvac', 'subcontractors', 'HVAC & ductwork', 64_000, 'estimated'),
  line('marin-windows', 'materials', 'Windows & exterior doors', 115_000, 'estimated', 'Marvin'),
  line('marin-drywall', 'subcontractors', 'Insulation & drywall', 66_000, 'estimated'),
  line('marin-finishes', 'materials', 'Interior finishes — flooring, cabinets, counters', 268_000, 'pending'),
  line('marin-siding', 'subcontractors', 'Exterior siding & stucco', 60_000, 'pending'),
  line('marin-equipment', 'equipment', 'Crane & equipment rental', 28_000, 'estimated'),
  line('marin-landscape', 'subcontractors', 'Landscape & hardscape', 49_000, 'pending'),
];

/** Canonical Marin project-record budget — matches the DB row the demo runs on. */
export const MARIN_BUDGET_TOTAL = 1_650_000;
export const MARIN_BUDGET_SPENT = 312_000;

/** Base hard-cost total (sum of all budget lines). Tracks MARIN_BUDGET_TOTAL. */
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
