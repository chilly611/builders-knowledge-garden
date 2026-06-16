/**
 * Killer App Chrome — barrel export (types only).
 *
 * The chrome COMPONENTS (KillerAppChrome + its BudgetRibbon / JourneyTimeRow /
 * StageNode / … and the marin-adapter) were retired 2026-06-15 with the
 * budget-DNA chrome consolidation — the app-shell (ShellStrips + BudgetDnaRibbon)
 * is the one canonical chrome, and the stage shell consumes it. Those files were
 * dead (no mounts, no external importers) and are deleted.
 *
 * What remains is the LOCKED data vocabulary in `./types` — KAC_STAGES (the
 * 7-stage canon) + the Kac* shapes — still consumed by app-shell, the project
 * dashboard, the owner lane, and getCanonicalProject. Import those from here
 * or directly from '@/components/killerapp-chrome/types'.
 */

export { KAC_COLORS, KAC_FONTS, KAC_STAGES } from './types';
export type {
  KacProject,
  KacBudget,
  KacSchedule,
  KacTimelineMarker,
  KacStageState,
  KacStageSlug,
  KacStageId,
} from './types';
