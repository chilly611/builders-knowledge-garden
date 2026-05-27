/**
 * Killer App Chrome — shared types and constants.
 *
 * The chrome is a persistent two-row top-of-page UI:
 *   Row 1 — BudgetRibbon (SpendBlock | IncomeStackedTracks | HeadroomGauge)
 *   Row 2 — JourneyTimeRow (TimelineMarkers above 7 StageNodes)
 *
 * Visual language locked 2026-05-27:
 *   Background cream     #FDF8F0
 *   Cards warm-white     #FAFAF8
 *   Red chrome           #E8443A
 *   Spend red            #B83A30
 *   Income green actual  #1D9E75
 *   Income green proj.   #5BAE7F
 *   Text ink             #1A1A1A
 *   Text warm gray       #6B6358
 *
 * No scrolling on the chrome itself. Light backgrounds only.
 */

export const KAC_COLORS = {
  bgCream: '#FDF8F0',
  card: '#FAFAF8',
  redChrome: '#E8443A',
  spendRed: '#B83A30',
  incomeGreen: '#1D9E75',
  incomeGreenProjected: '#5BAE7F',
  textInk: '#1A1A1A',
  textWarmGray: '#6B6358',
  // Derived utility tones
  divider: 'rgba(26, 26, 26, 0.08)',
  cardBorder: 'rgba(26, 26, 26, 0.06)',
  shadow: 'rgba(26, 26, 26, 0.04)',
} as const;

export const KAC_FONTS = {
  // Project already loads Archivo + Archivo Black via next/font/google.
  body: 'Archivo, system-ui, -apple-system, "Segoe UI", sans-serif',
  display: '"Archivo Black", Archivo, system-ui, -apple-system, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, monospace',
} as const;

/**
 * The 7 canonical lifecycle stages, exposed as slugs that match the
 * ?stage=<slug> query param used for routing into stage content.
 *
 * Mirrors src/lib/lifecycle-stages.ts (id+name) and adds slug + short label.
 */
export const KAC_STAGES = [
  { id: 1, slug: 'size-up', name: 'Size up', short: 'Size Up' },
  { id: 2, slug: 'lock', name: 'Lock it in', short: 'Lock' },
  { id: 3, slug: 'plan', name: 'Plan it out', short: 'Plan' },
  { id: 4, slug: 'build', name: 'Build', short: 'Build' },
  { id: 5, slug: 'adapt', name: 'Adapt', short: 'Adapt' },
  { id: 6, slug: 'collect', name: 'Collect', short: 'Collect' },
  { id: 7, slug: 'reflect', name: 'Reflect', short: 'Reflect' },
] as const;

export type KacStageSlug = (typeof KAC_STAGES)[number]['slug'];
export type KacStageId = (typeof KAC_STAGES)[number]['id'];

/**
 * Killer App project — the structured shape the chrome consumes. This is
 * intentionally decoupled from the database ProjectRecord type so the
 * chrome can render from seed data (no DB) on demo routes AND from real
 * project data when wired through ProjectContext later.
 */
export interface KacProject {
  id: string;
  name: string;
  location: string;
  sqft: number;
  bedrooms?: number;
  bathrooms?: number;
  budget: KacBudget;
  schedule: KacSchedule;
  stages: KacStageState[];
}

export interface KacBudget {
  total: number;
  spent: number;
  committed: number;
  remaining: number;
  draws: {
    closed: number; // dollars already drawn
    projected: number; // dollars in projected upcoming draws
    closedCount: number;
    projectedCount: number;
  };
}

export interface KacSchedule {
  startDate: string; // ISO date
  substantialCompletionDate: string; // ISO date
  markers: KacTimelineMarker[];
}

export interface KacTimelineMarker {
  id: string;
  label: string;
  date: string; // ISO date
  stageId?: KacStageId;
}

export interface KacStageState {
  id: KacStageId;
  slug: KacStageSlug;
  completion: number; // 0..100
  startDate?: string;
  dueDate?: string;
}
