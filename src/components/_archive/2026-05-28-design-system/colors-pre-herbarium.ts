/**
 * Blueprint Design System — Color Palette (PRE-HERBARIUM SNAPSHOT)
 * =================================================================
 *
 * Source: src/design-system/tokens/colors.ts, captured 2026-05-27 before
 * the Knowledge Gardens design system rollout shifted these TS constants
 * to herbarium values.
 *
 * Reason archived: Code session shipped StageShell (src/components/stage-shell/)
 * which imports `colors` from this file. CSS variable aliases in
 * globals.css can't theme a TS constant, so this file was rewritten to
 * point at herbarium hex values directly. Consumers don't change; the
 * values do.
 *
 * DO NOT IMPORT THIS FILE. Historical reference only.
 *
 * Blue ink on cream paper, sci-fi accents
 *
 * Canonical moodboard colors (W8 lock):
 * - navy: #1B3B5E (blueprint blue, hero/ink)
 * - robin: #7FCFCB (Robin's Egg, verification/confirmation peak moments ONLY)
 * - brass: #B6873A (trust/cost/money accents)
 * - orange: #D9642E (peak moment CTAs, heat/action)
 * - trace/paper/graphite/faded-rule: neutrals
 */

export const colors = {
  // Canonical moodboard palette — W8 locked
  navy: '#1B3B5E',
  navyDeep: '#0E2A47',
  robin: '#7FCFCB',
  brass: '#B6873A',
  orange: '#D9642E',
  trace: '#F4F0E6',
  graphite: '#2E2E30',
  fadedRule: '#C9C3B3',
  redline: '#A1473A',

  // Legacy names — re-export canonical values for backwards compatibility
  ink: {
    900: '#0B1D33',
    800: '#122B4A',
    700: '#1B3A5C',
    600: '#24507A',
    500: '#2E6699',
    400: '#4A89BE',
    300: '#7BAAD4',
    200: '#A8CAE8',
    100: '#D4E5F4',
    50:  '#EBF2FA',
  },
  paper: {
    white:   '#FEFEFE',
    cream:   '#FDF8F0',
    warm:    '#FAF3E8',
    aged:    '#F5EDDF',
    antique: '#EDE4D3',
    fold:    '#E5DCC9',
    shadow:  '#D9CFB8',
    border:  '#C9BFAA',
  },
  // (rest of palette continues unchanged — see post-rollout colors.ts
  // for the herbarium values that replaced these)
} as const;
