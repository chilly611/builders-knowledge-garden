/**
 * Stage Accent System — Layer on canonical palette
 * ==================================================
 *
 * Additive per-stage color system for stage identity chips, stage-backdrop overlays,
 * and active-stage indicators. Does not modify the canonical W8 palette (Navy / Trace /
 * Brass / Redline / Robin's Egg / Deep Orange / Graphite / Faded Rule).
 *
 * Stage 6 (Collect) accent reuses canonical Brass (#B6873A) to avoid palette drift
 * and maintain financial/cost semantic alignment.
 */

export const STAGE_ACCENTS = {
  1: { name: 'ochre', hex: '#C9913F', cssVar: '--stage-accent-1' },
  2: { name: 'indigo', hex: '#3E3A6E', cssVar: '--stage-accent-2' },
  3: { name: 'teal', hex: '#2E9E9A', cssVar: '--stage-accent-3' },
  4: { name: 'coral', hex: '#E05E4B', cssVar: '--stage-accent-4' },
  5: { name: 'magenta', hex: '#B23A7F', cssVar: '--stage-accent-5' },
  6: { name: 'brass', hex: '#B6873A', cssVar: '--stage-accent-6' },
  7: { name: 'duskPurple', hex: '#5E4B7C', cssVar: '--stage-accent-7' },
} as const;

export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Get stage accent by stage ID.
 * @param id - Stage ID (1–7)
 * @returns Stage accent object with name, hex, and CSS variable
 * @throws Error if stage ID is not 1–7
 */
export function stageAccent(id: StageId) {
  if (!(id in STAGE_ACCENTS)) {
    throw new Error(`Invalid stage ID: ${id}. Expected 1–7.`);
  }
  return STAGE_ACCENTS[id];
}

/**
 * Array of all stage accents for iteration.
 * Useful for rendering stage selector chips, backdrop overlays, or indicator sets.
 */
export const STAGE_ACCENT_LIST = Object.entries(STAGE_ACCENTS).map(([key, value]) => ({
  id: parseInt(key) as StageId,
  ...value,
}));
