/**
 * marin-4000 — legacy re-export shim.
 *
 * Source of truth moved to `src/lib/seed-data/marin-farmhouse.ts` on
 * 2026-05-28 to give us a single canonical file every page reads from
 * (the previous arrangement let consumers reach for either this file
 * OR a seed-data/marin-farmhouse.ts that had been temporarily deleted —
 * which is how we shipped a $116K / $312K / $914K budget mismatch and a
 * 1,800 / 2,800 / 4,000 sqft mismatch across pages).
 *
 * Keep this shim. Existing imports from `@/lib/demo/marin-4000` keep
 * working. New code should import from `@/lib/seed-data/marin-farmhouse`
 * directly, or call `getCanonicalProject()` from `@/lib/projects/getCanonicalProject`
 * for the structured KacProject shape.
 */

export {
  MARIN_PROJECT_ID,
  MARIN_PROJECT_NAME,
  MARIN_CLIENT_NAME,
  MARIN_LOCATION,
  MARIN_CODE_JURISDICTION,
  MARIN_STYLE,
  MARIN_SQFT,
  MARIN_SQFT_DISPLAY,
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
  MARIN_MATERIALS,
  MARIN_PROJECT,
  MARIN_TEAM,
  MARIN_ATTENTION_ITEMS,
  MARIN_BUDGET_LINES,
  MARIN_BUDGET_BASE_TOTAL,
  MARIN_PLAN_PHASES,
  WEEKLY_OVERHEAD,
  computeSchedule,
  seedMarinBudget,
  ensureMarinActive,
} from '@/lib/seed-data/marin-farmhouse';

export type {
  MarinProjectRecord,
  MarinTeamMember,
  MarinAttentionItem,
  PlanPhase,
  ScheduleResult,
} from '@/lib/seed-data/marin-farmhouse';
