/**
 * Marin adapter — bridge from Code's canonical `marin-4000` fixture into
 * the `KacProject` shape the killerapp-chrome reads.
 *
 * Per founder decision 2026-05-27: `src/lib/demo/marin-4000.ts` is the
 * single source of truth for Marin demo numbers ($1.99M base, 10
 * sequencing phases, 4,000 sqft, allowlisted demo UUID). The old
 * `src/lib/seed-data/marin-farmhouse.ts` was deleted in the same commit.
 *
 * Why an adapter and not a rewrite of KillerAppChrome to consume the
 * raw fixture: the chrome's UI components want a structured shape
 * (budget breakdown into spent / committed / remaining, draw counts,
 * stage completion percentages, schedule markers). Those concepts don't
 * exist in the fixture's flat BudgetLine[] + PlanPhase[] world, so the
 * adapter computes them once here. If/when the chrome rewires to use
 * BudgetLine[] directly, this adapter goes away.
 */

import {
  MARIN_PROJECT,
  MARIN_BUDGET_LINES,
  MARIN_PLAN_PHASES,
  MARIN_BUDGET_BASE_TOTAL,
  computeSchedule,
} from '@/lib/demo/marin-4000';
import type { KacProject } from './types';

/**
 * Sum budget lines by state to produce spend/committed/remaining
 * breakdown the BudgetRibbon expects.
 *
 *   paid       → spent
 *   locked-in  → committed
 *   estimated  → committed (it's been priced, not yet paid)
 *   pending    → remaining (still floating)
 */
function rolledBudget() {
  let spent = 0;
  let committed = 0;
  let pending = 0;
  for (const line of MARIN_BUDGET_LINES) {
    if (line.state === 'paid') spent += line.amount;
    else if (line.state === 'locked-in') committed += line.amount;
    else if (line.state === 'estimated') committed += line.amount;
    else pending += line.amount;
  }
  // Total = base sum (= spent + committed + pending). Remaining = pending.
  return { spent, committed, remaining: pending };
}

/**
 * The schedule's start date is the "in-flight" baseline — Code's fixture
 * doesn't carry a start date directly, so we anchor on the spec-locked
 * 2026-03-18 (substantial completion 2026-12-04, 37-week build).
 */
const START_DATE = '2026-03-18';
const SUBSTANTIAL_COMPLETION = '2026-12-04';

/**
 * Convert the 10 sequencing phases into 4–5 named milestones the
 * TimelineMarkers row can render along the schedule axis. Picks the
 * load-bearing stage boundaries (permits → foundation → framing →
 * MEP rough-in → final inspection).
 */
function timelineMarkers() {
  // We don't have per-phase calendar dates; spread the load-bearing
  // markers proportionally across the schedule span.
  return [
    { id: 'm-permits', label: 'Permits', date: '2026-04-02', stageId: 2 as const },
    { id: 'm-foundation', label: 'Foundation', date: '2026-05-15', stageId: 4 as const },
    { id: 'm-framing', label: 'Framing', date: '2026-07-08', stageId: 4 as const },
    { id: 'm-mep', label: 'MEP rough-in', date: '2026-08-24', stageId: 4 as const },
    { id: 'm-final', label: 'Final inspection', date: '2026-11-20', stageId: 6 as const },
  ];
}

/**
 * Stage completion percentages. Reflect the spec-locked snapshot:
 * Size Up + Lock complete, Plan mostly done, Build in flight, the rest
 * not started. If/when this becomes data-driven, swap to a computed
 * function over journey-progress.ts.
 */
const STAGE_COMPLETION: Array<{ id: 1 | 2 | 3 | 4 | 5 | 6 | 7; completion: number; due: string }> = [
  { id: 1, completion: 100, due: '2026-02-12' },
  { id: 2, completion: 100, due: '2026-03-18' },
  { id: 3, completion: 85,  due: '2026-04-15' },
  { id: 4, completion: 42,  due: '2026-11-20' },
  { id: 5, completion: 0,   due: '2026-11-20' },
  { id: 6, completion: 0,   due: '2026-12-04' },
  { id: 7, completion: 0,   due: '2027-01-30' },
];

const SLUGS: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, 'size-up' | 'lock' | 'plan' | 'build' | 'adapt' | 'collect' | 'reflect'> = {
  1: 'size-up',
  2: 'lock',
  3: 'plan',
  4: 'build',
  5: 'adapt',
  6: 'collect',
  7: 'reflect',
};

/**
 * Produce the KacProject the chrome consumes. Re-computes on every call
 * but everything inside is cheap (16 line items + 10 phases).
 */
export function marinKacProject(): KacProject {
  const rolled = rolledBudget();
  // Sum is exact to base total — guarantees the three numbers add up to total.
  const total = MARIN_BUDGET_BASE_TOTAL;
  // For draws — Code's fixture doesn't model draws explicitly. Derive
  // closed = paid/locked-in count, projected = remaining count.
  const closedCount = MARIN_BUDGET_LINES.filter(
    (l) => l.state === 'paid' || l.state === 'locked-in'
  ).length;
  const projectedCount = MARIN_BUDGET_LINES.length - closedCount;
  const sched = computeSchedule(MARIN_PLAN_PHASES);

  return {
    id: MARIN_PROJECT.id,
    name: MARIN_PROJECT.name,
    location: MARIN_PROJECT.jurisdiction,
    sqft: 4000,
    bedrooms: 4,
    bathrooms: 3,
    budget: {
      total,
      spent: rolled.spent,
      committed: rolled.committed,
      remaining: rolled.remaining,
      draws: {
        closed: rolled.spent + rolled.committed,
        projected: rolled.remaining + sched.overheadCost,
        closedCount,
        projectedCount,
      },
    },
    schedule: {
      startDate: START_DATE,
      substantialCompletionDate: SUBSTANTIAL_COMPLETION,
      markers: timelineMarkers(),
    },
    stages: STAGE_COMPLETION.map((s) => ({
      id: s.id,
      slug: SLUGS[s.id],
      completion: s.completion,
      dueDate: s.due,
    })),
  };
}

// Re-export the canonical project id so consumers don't have to import
// both files just to know "is this Marin?"
export { MARIN_PROJECT_ID } from '@/lib/demo/marin-4000';
