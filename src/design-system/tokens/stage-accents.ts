/**
 * Stage Accent System — Layer on canonical palette
 * ==================================================
 *
 * Additive per-stage color system for stage identity chips, stage-backdrop overlays,
 * and active-stage indicators. Does not modify the canonical W8 palette (Navy / Trace /
 * Brass / Redline / Robin's Egg / Deep Orange / Graphite / Faded Rule).
 *
 * Stage 0 (Money) and Stage 6 (Collect) both reuse canonical Brass (#B6873A) to
 * avoid palette drift and maintain the financial/cost semantic alignment — Money
 * is the always-on top-of-panel group introduced in Ship 22, Collect is the
 * lifecycle close-out stage.
 */

export const STAGE_ACCENTS = {
  0: { name: 'brass', hex: '#B6873A', cssVar: '--stage-accent-0' },
  1: { name: 'ochre', hex: '#C9913F', cssVar: '--stage-accent-1' },
  2: { name: 'indigo', hex: '#3E3A6E', cssVar: '--stage-accent-2' },
  3: { name: 'teal', hex: '#2E9E9A', cssVar: '--stage-accent-3' },
  4: { name: 'coral', hex: '#E05E4B', cssVar: '--stage-accent-4' },
  5: { name: 'magenta', hex: '#B23A7F', cssVar: '--stage-accent-5' },
  6: { name: 'brass', hex: '#B6873A', cssVar: '--stage-accent-6' },
  7: { name: 'duskPurple', hex: '#5E4B7C', cssVar: '--stage-accent-7' },
} as const;

/**
 * StageId is the canonical LIFECYCLE stage type (1..7), used by every
 * consumer that iterates over lifecycle stages or builds a
 * `Record<StageId, T>`. Stage 0 (Money) is INTENTIONALLY NOT included
 * here — it's a cross-cutting "always on" group (per Ship 22 brief)
 * that sits next to the lifecycle, not within it. Widening this type
 * to include 0 broke StageContextPill, StageBreadcrumb, and KillerAppNav
 * during the first Ship 29 attempt because their lifecycle-only Records
 * suddenly required a key=0 entry. Caught by Vercel; rolled back.
 *
 * If you need to index STAGE_ACCENTS (which DOES have all 8 keys 0..7),
 * use StageAccentKey below. If you're typing a lifecycle-only data
 * structure, use StageId.
 */
export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Keys of STAGE_ACCENTS. Includes 0 (Money) plus the lifecycle 1..7. */
export type StageAccentKey = keyof typeof STAGE_ACCENTS;

/**
 * Get stage accent by stage ID.
 * @param id - Stage ID (0–7); 0 is the Money group, 1..7 are lifecycle.
 * @returns Stage accent object with name, hex, and CSS variable
 * @throws Error if stage ID is not 0–7
 */
export function stageAccent(id: StageAccentKey) {
  if (!(id in STAGE_ACCENTS)) {
    throw new Error(`Invalid stage ID: ${id}. Expected 0–7.`);
  }
  return STAGE_ACCENTS[id];
}

/**
 * Array of all stage accents for iteration.
 * Useful for rendering stage selector chips, backdrop overlays, or indicator sets.
 */
export const STAGE_ACCENT_LIST = Object.entries(STAGE_ACCENTS).map(([key, value]) => ({
  id: parseInt(key) as StageAccentKey,
  ...value,
}));
