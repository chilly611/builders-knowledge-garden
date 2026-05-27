/**
 * Killer App Chrome — barrel export.
 *
 * Consumers should import from '@/components/killerapp-chrome' and get
 * the top-level KillerAppChrome plus any primitives they want to
 * compose directly.
 */

export { default as KillerAppChrome } from './KillerAppChrome';
export { default as BudgetRibbon } from './BudgetRibbon';
export { default as JourneyTimeRow } from './JourneyTimeRow';
export { default as StageNode } from './StageNode';
export { default as TimelineMarkers } from './TimelineMarkers';
export { default as CompletionRing } from './CompletionRing';
export { default as SpendBlock } from './SpendBlock';
export { default as IncomeStackedTracks } from './IncomeStackedTracks';
export { default as HeadroomGauge } from './HeadroomGauge';

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
