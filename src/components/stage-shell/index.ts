/**
 * stage-shell — the persistent stage chrome for the Plan + Build stages.
 *
 * Distinct from Agent A's `@/components/killerapp-chrome` (the V3 layout-level
 * chrome). These are the stage-level components the Plan + Build stages
 * compose: StageShell wraps a stage body with the JourneyRow, BudgetRibbon,
 * and ProToggle. The two chrome systems coexist pending reconciliation.
 */

export { default as StageShell } from './StageShell';
export type { StageShellProps } from './StageShell';
export { default as JourneyRow } from './JourneyRow';
export { default as BudgetRibbon } from './BudgetRibbon';
export { default as ProToggle } from './ProToggle';
export {
  StageChromeProvider,
  useStageChrome,
  type StageBudgetInfo,
} from './stage-chrome-context';
