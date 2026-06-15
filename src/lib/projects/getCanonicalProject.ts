/**
 * getCanonicalProject — the single function every page calls to read the
 * canonical Modern Farmhouse in Marin project.
 *
 * Wraps the primitives in `@/lib/seed-data/marin-farmhouse` and returns
 * the `KacProject` shape consumed by the killer-app chrome and the stage
 * shell. The budget breakdown (spent / committed / remaining / draws)
 * comes from the canonical constants — NOT from summing budget-line
 * states — so the BudgetRibbon never disagrees with the rest of the app.
 *
 * If you find yourself reaching for `MARIN_BUDGET_LINES.reduce(...)` to
 * compute a roll-up, prefer this helper instead. Roll-ups computed
 * elsewhere have a tendency to drift (we shipped a $116K vs $312K
 * mismatch by doing exactly that).
 */

import {
  MARIN_PROJECT_ID,
  MARIN_PROJECT_NAME,
  MARIN_CLIENT_NAME,
  MARIN_LOCATION,
  MARIN_SQFT,
  MARIN_BEDROOMS,
  MARIN_BATHROOMS,
  MARIN_BUDGET_TOTAL,
  MARIN_BUDGET_SPENT,
  MARIN_BUDGET_COMMITTED,
  MARIN_BUDGET_REMAINING,
  MARIN_INCOME_PROJECTED,
  MARIN_INCOME_RECEIVED,
  MARIN_DRAWS_TOTAL,
  MARIN_DRAWS_CLOSED,
  MARIN_START_DATE,
  MARIN_SUBSTANTIAL_COMPLETION,
  MARIN_STAGE_COMPLETION,
  MARIN_RAW_INPUT,
  MARIN_AI_SUMMARY,
  MARIN_AI_TAKE,
  MARIN_PROJECT,
} from '@/lib/seed-data/marin-farmhouse';
import {
  FOLSOM_PROJECT_ID,
  FOLSOM_PROJECT_NAME,
  FOLSOM_CLIENT_NAME,
  FOLSOM_LOCATION,
  FOLSOM_SQFT_DISPLAY,
  FOLSOM_BUDGET_TOTAL,
  FOLSOM_BUDGET_SPENT,
  FOLSOM_BUDGET_COMMITTED,
  FOLSOM_BUDGET_REMAINING,
  FOLSOM_STAGE_COMPLETION,
  FOLSOM_RAW_INPUT,
  FOLSOM_AI_SUMMARY,
  FOLSOM_AI_TAKE,
  FOLSOM_PROJECT,
} from '@/lib/seed-data/sf-fourplex';
import type {
  KacProject,
  KacStageId,
  KacStageSlug,
  KacTimelineMarker,
} from '@/components/killerapp-chrome/types';

const STAGE_SLUGS: Record<KacStageId, KacStageSlug> = {
  1: 'size-up',
  2: 'lock',
  3: 'plan',
  4: 'build',
  5: 'adapt',
  6: 'collect',
  7: 'reflect',
};

const STAGE_DUES: Record<KacStageId, string> = {
  1: '2026-02-12',
  2: '2026-03-18',
  3: '2026-04-15',
  4: '2026-11-20',
  5: '2026-11-20',
  6: '2026-12-04',
  7: '2027-01-30',
};

const TIMELINE_MARKERS: KacTimelineMarker[] = [
  { id: 'm-permits', label: 'Permits', date: '2026-04-02', stageId: 2 },
  { id: 'm-foundation', label: 'Foundation', date: '2026-05-15', stageId: 4 },
  { id: 'm-framing', label: 'Framing', date: '2026-07-08', stageId: 4 },
  { id: 'm-mep', label: 'MEP rough-in', date: '2026-08-24', stageId: 4 },
  { id: 'm-final', label: 'Final inspection', date: '2026-11-20', stageId: 6 },
];

/**
 * Returns the canonical KacProject for the Modern Farmhouse in Marin demo.
 * Pure — safe to call on every render; cheap (object construction only).
 */
export function getCanonicalProject(): KacProject {
  return {
    id: MARIN_PROJECT_ID,
    name: MARIN_PROJECT_NAME,
    location: MARIN_LOCATION,
    sqft: MARIN_SQFT,
    bedrooms: MARIN_BEDROOMS,
    bathrooms: MARIN_BATHROOMS,
    budget: {
      total: MARIN_BUDGET_TOTAL,
      spent: MARIN_BUDGET_SPENT,
      committed: MARIN_BUDGET_COMMITTED,
      remaining: MARIN_BUDGET_REMAINING,
      draws: {
        closed: MARIN_INCOME_RECEIVED,
        projected: MARIN_INCOME_PROJECTED,
        closedCount: MARIN_DRAWS_CLOSED,
        projectedCount: MARIN_DRAWS_TOTAL,
      },
    },
    schedule: {
      startDate: MARIN_START_DATE,
      substantialCompletionDate: MARIN_SUBSTANTIAL_COMPLETION,
      markers: TIMELINE_MARKERS,
    },
    stages: ([1, 2, 3, 4, 5, 6, 7] as const).map((id) => ({
      id,
      slug: STAGE_SLUGS[id],
      completion: MARIN_STAGE_COMPLETION[id] ?? 0,
      dueDate: STAGE_DUES[id],
    })),
  };
}

/** Whether the given id refers to the canonical Marin project. */
export function isCanonicalProjectId(id: string | undefined | null): boolean {
  return id === MARIN_PROJECT_ID;
}

// ─── Demo-fixture registry (Marin + Folsom Street Fourplex) ──────────────────
//
// Both demo projects are served CLIENT-SIDE from their seed modules — no
// `command_center_projects` row, no shared-prod mutation. This registry is the
// ONE place the four project hooks consult to flip identity + budget + journey
// + AI take when `?project=<id>` changes:
//
//   - ProjectContext      → fixture ProjectRecord (identity, type, budget)
//   - useStageProject     → identity + budgetTotal/budgetSpent
//   - useProjectLedger    → budget split + journey (stage/progress)
//   - KillerappProjectShell → investor-clean AI take
//
// Marin keeps `isCanonicalProjectId` for its Marin-specific behaviors; this
// registry is the generic, multi-project path. Adding a third demo = one entry
// here + a seed module, with zero per-project branching in the consumers.

/** Budget split a demo fixture exposes (cash already canonical — never summed). */
export interface DemoFixtureBudget {
  total: number;
  spent: number;
  committed: number;
  remaining: number;
}

/** The normalized view every project hook needs for a code-fixture demo. */
export interface DemoFixture {
  id: string;
  name: string;
  clientName: string;
  /** Marketing jurisdiction shown by the chrome. */
  location: string;
  /** "4,000" — display string the shell formats via Number(). */
  sqftDisplay: string;
  /** Free-text project_type → CodeLookup + portal archetype. */
  projectType: string;
  rawInput: string;
  aiSummary: string;
  /** Stable, investor-clean copilot take for the deep-link. */
  aiTake: string;
  estimatedCostLow: number;
  estimatedCostHigh: number;
  budget: DemoFixtureBudget;
  /** Per-stage completion (1..7) — drives the journey row + active stage. */
  stageCompletion: Record<number, number>;
}

const DEMO_FIXTURES: Record<string, DemoFixture> = {
  [MARIN_PROJECT_ID]: {
    id: MARIN_PROJECT_ID,
    name: MARIN_PROJECT_NAME,
    clientName: MARIN_CLIENT_NAME,
    location: MARIN_LOCATION,
    sqftDisplay: String(MARIN_SQFT),
    projectType: MARIN_PROJECT.project_type,
    rawInput: MARIN_RAW_INPUT,
    aiSummary: MARIN_AI_SUMMARY,
    aiTake: MARIN_AI_TAKE,
    estimatedCostLow: MARIN_PROJECT.estimated_cost_low,
    estimatedCostHigh: MARIN_PROJECT.estimated_cost_high,
    budget: {
      total: MARIN_BUDGET_TOTAL,
      spent: MARIN_BUDGET_SPENT,
      committed: MARIN_BUDGET_COMMITTED,
      remaining: MARIN_BUDGET_REMAINING,
    },
    stageCompletion: MARIN_STAGE_COMPLETION,
  },
  [FOLSOM_PROJECT_ID]: {
    id: FOLSOM_PROJECT_ID,
    name: FOLSOM_PROJECT_NAME,
    clientName: FOLSOM_CLIENT_NAME,
    location: FOLSOM_LOCATION,
    sqftDisplay: FOLSOM_SQFT_DISPLAY,
    projectType: FOLSOM_PROJECT.project_type,
    rawInput: FOLSOM_RAW_INPUT,
    aiSummary: FOLSOM_AI_SUMMARY,
    aiTake: FOLSOM_AI_TAKE,
    estimatedCostLow: FOLSOM_PROJECT.estimated_cost_low,
    estimatedCostHigh: FOLSOM_PROJECT.estimated_cost_high,
    budget: {
      total: FOLSOM_BUDGET_TOTAL,
      spent: FOLSOM_BUDGET_SPENT,
      committed: FOLSOM_BUDGET_COMMITTED,
      remaining: FOLSOM_BUDGET_REMAINING,
    },
    stageCompletion: FOLSOM_STAGE_COMPLETION,
  },
};

/** Look up a demo fixture by id, or null when the id isn't a seeded demo. */
export function getDemoFixture(id: string | undefined | null): DemoFixture | null {
  if (!id) return null;
  return DEMO_FIXTURES[id] ?? null;
}

/** Whether the given id is a code-served demo fixture (Marin OR Folsom). */
export function isDemoFixtureId(id: string | undefined | null): boolean {
  return !!id && id in DEMO_FIXTURES;
}

export { MARIN_PROJECT_ID } from '@/lib/seed-data/marin-farmhouse';
export { FOLSOM_PROJECT_ID } from '@/lib/seed-data/sf-fourplex';
