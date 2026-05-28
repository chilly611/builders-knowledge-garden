/**
 * Marin Farmhouse — Canonical Demo Seed
 * =====================================
 *
 * The SINGLE source of truth for the Marin Farmhouse demo project. Every
 * page in the app reads these values (directly or via the
 * `getCanonicalProject()` helper at `@/lib/projects/getCanonicalProject`).
 * If a number on screen mentions this project, it MUST come from here.
 *
 * History — 2026-05-28: this file was reinstated as canonical after a
 * brief stint where `src/lib/demo/marin-4000.ts` held the source of
 * truth. Today `marin-4000.ts` is a thin re-export shim that points at
 * this module; older imports continue to work. Pages that need the
 * structured `KacProject` shape used by the chrome should call
 * `getCanonicalProject()` rather than reach in here directly.
 *
 * Editing rules:
 *   - Treat values below as the contract. Do not introduce mirror
 *     constants in other files.
 *   - If a page needs a derived shape, build it from these primitives
 *     (see `getCanonicalProject`).
 *   - Keep the DB row at `command_center_projects[55730cd3-…]` aligned
 *     when these numbers change (migration:
 *     `supabase/migrations/20260528_marin_demo_canonical.sql`).
 */

import type { BudgetLine } from '@/app/killerapp/budget/budget-storage';

// ─── Identity ───────────────────────────────────────────────────────────────

/** Allowlisted demo project UUID. Mirrors DEMO_PROJECT_IDS in the projects route. */
export const MARIN_PROJECT_ID = '55730cd3-5225-493d-8b5c-49086d942565';

/** Display name — every page MUST use this exact string. */
export const MARIN_PROJECT_NAME = 'Modern Farmhouse in Marin';

/** Client family. */
export const MARIN_CLIENT_NAME = 'The Harwell Family';

/** Marketing-jurisdiction string (what the chrome shows). */
export const MARIN_LOCATION = 'Marin County, CA';

/** Live code-lookup jurisdiction wired into the demo. */
export const MARIN_CODE_JURISDICTION = 'San Francisco, CA';

/** Architectural style description used on cards and headers. */
export const MARIN_STYLE = 'Custom farmhouse, 2 story';

// ─── Geometry ───────────────────────────────────────────────────────────────

/** Square footage — the number every page must display. */
export const MARIN_SQFT = 4_000;
export const MARIN_SQFT_DISPLAY = '4,000';

export const MARIN_BEDROOMS = 4;
export const MARIN_BATHROOMS = 3;

// ─── Budget ─────────────────────────────────────────────────────────────────

/** Contract total. */
export const MARIN_BUDGET_TOTAL = 1_650_000;

/** Spent to date — cash already out the door. */
export const MARIN_BUDGET_SPENT = 312_400;

/** Committed — locked-in subs and POs, not yet billed. */
export const MARIN_BUDGET_COMMITTED = 186_200;

/** Remaining — pending lines that are still floating. */
export const MARIN_BUDGET_REMAINING = MARIN_BUDGET_TOTAL - MARIN_BUDGET_SPENT - MARIN_BUDGET_COMMITTED;

// ─── Income (draws) ─────────────────────────────────────────────────────────

/** Projected total over 16 scheduled draws. */
export const MARIN_INCOME_PROJECTED = 1_485_000;

/** Actual income received across the 5 closed draws. */
export const MARIN_INCOME_RECEIVED = 495_000;

/** Total scheduled draws across the build. */
export const MARIN_DRAWS_TOTAL = 16;

/** Draws closed (paid) to date. */
export const MARIN_DRAWS_CLOSED = 5;

// ─── Schedule ───────────────────────────────────────────────────────────────

/** Build start. */
export const MARIN_START_DATE = '2026-03-18';

/** Substantial completion target. */
export const MARIN_SUBSTANTIAL_COMPLETION = '2026-12-04';

/** Per-stage completion percentage (Size Up → Reflect). */
export const MARIN_STAGE_COMPLETION: Record<number, number> = {
  1: 100, // Size Up
  2: 100, // Lock
  3: 85,  // Plan
  4: 42,  // Build
  5: 0,   // Adapt
  6: 0,   // Collect
  7: 0,   // Reflect
};

// ─── Materials lockset ──────────────────────────────────────────────────────

export const MARIN_MATERIALS: ReadonlyArray<string> = [
  'Standing seam metal roof',
  'Engineered hardwood',
  'Engineered quartz counters',
  'Spray foam insulation',
  'Black-frame windows',
  'Fiber cement siding',
  'Shiplap interior',
  'Slab-on-grade foundation',
  'Heat pump HVAC',
  'Tankless water heater',
];

// ─── Project record (matches the legacy MarinProjectRecord shape) ───────────

export interface MarinProjectRecord {
  id: string;
  name: string;
  client_name: string;
  jurisdiction: string;
  code_jurisdiction: string;
  sqft: string;
  project_type: string;
  estimated_cost_low: number;
  estimated_cost_high: number;
}

export const MARIN_PROJECT: MarinProjectRecord = {
  id: MARIN_PROJECT_ID,
  name: MARIN_PROJECT_NAME,
  client_name: MARIN_CLIENT_NAME,
  jurisdiction: MARIN_LOCATION,
  code_jurisdiction: MARIN_CODE_JURISDICTION,
  sqft: MARIN_SQFT_DISPLAY,
  project_type: `Custom farmhouse — 2 story, ${MARIN_SQFT_DISPLAY} sqft`,
  estimated_cost_low: 1_550_000,
  estimated_cost_high: 1_780_000,
};

// ─── Team (replaces the John Doe / Jane Smith mocks elsewhere) ──────────────

export interface MarinTeamMember {
  id: string;
  name: string;
  trade: string;
  status: 'active' | 'inactive';
  contact: string;
  company?: string;
}

export const MARIN_TEAM: MarinTeamMember[] = [
  { id: 't-builder', name: 'Marcus Rivera', trade: 'General Contractor', status: 'active', contact: 'marcus@riveraconstruction.com', company: 'Rivera Construction LLC' },
  { id: 't-framing', name: 'Ridgeline Framing', trade: 'Framing', status: 'active', contact: 'ops@ridgelineframing.com' },
  { id: 't-concrete', name: 'Tamalpais Concrete', trade: 'Foundation & Concrete', status: 'active', contact: 'estimates@tamalpaisconcrete.com' },
  { id: 't-roofing', name: 'Bay Roofing Co.', trade: 'Roofing', status: 'active', contact: 'jobs@bayroofing.com' },
  { id: 't-architect', name: 'Field Studio Architects', trade: 'Architecture & Structural', status: 'active', contact: 'studio@fieldstudio.co' },
  { id: 't-client', name: 'The Harwell Family', trade: 'Client', status: 'active', contact: 'harwell.family@example.com' },
];

// ─── AI Attention Items (curated AI COO surface) ────────────────────────────

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
    body: 'Interior finishes ($268K) are pending and unselected — the single largest line and the usual source of overruns. With $1.15M of headroom on the $1.65M budget, confirm flooring/cabinet/counter allowances with the Harwell family before selections drift and eat the contingency.',
  },
  {
    id: 'marin-att-draw-foundation',
    title: 'Prep the Foundation-Milestone Draw',
    urgency: 'yellow',
    body: 'Foundation is complete and ~$312K is billed against the $1.65M contract. Assemble the foundation-milestone draw package now so it is ready the day the inspection passes — lenders typically need 5-7 business days plus a site inspection, and a lag stalls framing cash flow.',
  },
  {
    id: 'marin-att-on-budget',
    title: 'On Budget Through Foundation — $1.65M Holding',
    urgency: 'green',
    body: 'The Modern Farmhouse in Marin is tracking on budget at 19% spent, inside the $1.55M-$1.78M estimate, with foundation landing at the locked-in $165K. A clean signal entering the framing phase — hold the line on change orders to protect the $1.15M remaining.',
  },
];

// ─── Budget lines (BudgetClient spine shape) ────────────────────────────────

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

/** Sum of all budget lines — invariant must equal MARIN_BUDGET_TOTAL. */
export const MARIN_BUDGET_BASE_TOTAL = MARIN_BUDGET_LINES.reduce((s, l) => s + l.amount, 0);

// ─── Sequencing (Plan stage drag-drop) ──────────────────────────────────────

export interface PlanPhase {
  id: string;
  name: string;
  trade: string;
  /** Sequential duration in weeks if run on its own. */
  weeks: number;
  /**
   * Phases sharing a non-null parallelGroup AND ending up adjacent in the
   * order run concurrently — the run counts as max(weeks) once instead of
   * the sum. This is what makes reordering change the timeline (and budget).
   */
  parallelGroup: string | null;
  icon: string;
}

export const MARIN_PLAN_PHASES: PlanPhase[] = [
  { id: 'site-prep', name: 'Site prep & excavation', trade: 'Sitework', weeks: 3, parallelGroup: null, icon: '🚜' },
  { id: 'foundation', name: 'Foundation & concrete', trade: 'Concrete', weeks: 4, parallelGroup: null, icon: '🧱' },
  { id: 'framing', name: 'Framing', trade: 'Carpentry', weeks: 10, parallelGroup: null, icon: '🪚' },
  { id: 'dry-in', name: 'Roofing & dry-in', trade: 'Roofing', weeks: 3, parallelGroup: null, icon: '🏠' },
  { id: 'rough-elec', name: 'Rough electrical', trade: 'Electrical', weeks: 3, parallelGroup: 'mep', icon: '⚡' },
  { id: 'rough-plumb', name: 'Rough plumbing', trade: 'Plumbing', weeks: 3, parallelGroup: 'mep', icon: '🚿' },
  { id: 'rough-hvac', name: 'Rough HVAC', trade: 'Mechanical', weeks: 2, parallelGroup: 'mep', icon: '🌡️' },
  { id: 'insul-drywall', name: 'Insulation & drywall', trade: 'Drywall', weeks: 4, parallelGroup: null, icon: '🧰' },
  { id: 'finishes', name: 'Interior finishes', trade: 'Finish carpentry', weeks: 6, parallelGroup: null, icon: '🪟' },
  { id: 'exterior', name: 'Exterior siding & landscape', trade: 'Exterior', weeks: 4, parallelGroup: 'exterior', icon: '🌿' },
];

/** General-conditions burn per calendar week of schedule. */
export const WEEKLY_OVERHEAD = 9_500;

export interface ScheduleResult {
  totalWeeks: number;
  overheadCost: number;
  weeksSavedByParallel: number;
}

export function computeSchedule(phases: PlanPhase[]): ScheduleResult {
  let totalWeeks = 0;
  let i = 0;
  while (i < phases.length) {
    const group = phases[i].parallelGroup;
    if (group) {
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
 * Idempotent: only writes if the key is absent.
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
    /* ignore */
  }
  return MARIN_BUDGET_LINES;
}

/** Point the active-project pointer at the Marin demo. */
export function ensureMarinActive(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, MARIN_PROJECT_ID);
  } catch {
    /* ignore */
  }
}
