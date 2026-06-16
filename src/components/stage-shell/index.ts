/**
 * stage-shell — the per-stage scaffold every lifecycle stage lives inside.
 *
 * StageShell wraps a stage body with the stage title, the JourneyRow stage
 * nav, the ProToggle, and (optionally) the StageActionBar — and now CONSUMES
 * the one canonical Budget-DNA ribbon from `@/components/app-shell` rather than
 * carrying its own. The old stage-shell BudgetRibbon duplicate was retired
 * 2026-06-15 (budget-DNA chrome consolidation); the dead `killerapp-chrome`
 * chrome was deleted in the same pass. app-shell is the single chrome source.
 */

export { default as StageShell } from './StageShell';
export type { StageShellProps } from './StageShell';
export { default as JourneyRow } from './JourneyRow';
export { default as ProToggle } from './ProToggle';
export {
  StageChromeProvider,
  useStageChrome,
  type StageBudgetInfo,
} from './stage-chrome-context';
