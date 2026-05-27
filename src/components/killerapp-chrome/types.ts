/**
 * Killer App Chrome — shared types and constants.
 *
 * The chrome is a persistent two-row top-of-page UI:
 *   Row 1 — BudgetRibbon (SpendBlock | IncomeStackedTracks | HeadroomGauge)
 *   Row 2 — JourneyTimeRow (TimelineMarkers above 7 StageNodes)
 *
 * Visual language — 2026-05-28 HERBARIUM MERGE.
 * The bright "instrument" palette retired entirely; values point at the
 * herbarium tokens defined in src/styles/tokens.css. Per the design system
 * merge table in docs/design-decisions-2026-05-27-LOCKED.md:
 *
 *   bgCream        →  --paper-cream         #F2E9D2  (was #FDF8F0)
 *   card           →  --paper-vellum        #E8DDB8  (was #FAFAF8)
 *   redChrome      →  --specimen-rust       #A53A2D  (was #E8443A)
 *   spendRed       →  --specimen-rust-deep  #6E2419  (was #B83A30)
 *   incomeGreen    →  --specimen-sage       #5E7A56  (was #1D9E75)
 *   incomeGreenProj→  --specimen-sage-pale  #B5C4A8  (was #5BAE7F)
 *   textInk        →  --ink-graphite        #2A2620  (was #1A1A1A)
 *   textWarmGray   →  --ink-faded           #8C6A45  (was #6B6358)
 *
 * No scrolling on the chrome itself. Light backgrounds only.
 *
 * Using `var(--token-name)` references keeps the chrome a thin client of
 * the design system — future palette shifts only need a tokens.css edit.
 */

export const KAC_COLORS = {
  bgCream: 'var(--paper-cream)',
  card: 'var(--paper-vellum)',
  redChrome: 'var(--specimen-rust)',
  spendRed: 'var(--specimen-rust-deep)',
  incomeGreen: 'var(--specimen-sage)',
  incomeGreenProjected: 'var(--specimen-sage-pale)',
  textInk: 'var(--ink-graphite)',
  textWarmGray: 'var(--ink-faded)',
  // Derived utility tones — sepia ink at low opacity for hairlines + shadows.
  // Matches the design system's --border-hairline / paper-edge shadow recipe.
  divider: 'rgba(90, 59, 31, 0.18)',
  cardBorder: 'rgba(90, 59, 31, 0.10)',
  shadow: 'rgba(90, 59, 31, 0.08)',
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
