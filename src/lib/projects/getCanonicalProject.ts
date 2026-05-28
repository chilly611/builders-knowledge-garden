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
} from '@/lib/seed-data/marin-farmhouse';
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

export { MARIN_PROJECT_ID } from '@/lib/seed-data/marin-farmhouse';
