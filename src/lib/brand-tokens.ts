/**
 * Brand tokens — Knowledge Gardens OS Federation Contract.
 *
 * Every garden, every surface, every primitive ships against these tokens.
 * Parchment background. Cormorant Garamond for display. Space Mono for
 * technical labels. Copper for warm accents. Forest ink for body type.
 *
 * Source of truth: docs/strategy/the-knowledge-gardens-os.html (locked v3,
 * 2026-05-25). Mirrored as CSS variables in src/app/globals.css so non-React
 * surfaces (the presentation HTML, future static landing pages) can consume
 * the same tokens.
 *
 * Killer App federation moves AWAY from the legacy navy/trace palette into
 * parchment/copper/steel/forest-ink. The legacy --navy/--brass/--robin tokens
 * remain in globals.css for backwards compatibility with surfaces not yet
 * rehauled.
 */

export const BRAND_COLORS = {
  parchment: '#F5F0E8',
  parchmentDeep: '#EFE8DC',
  parchmentWarm: '#F8F3EB',
  copper: '#B87333',
  copperSoft: 'rgba(184, 115, 51, 0.18)',
  copperLine: 'rgba(184, 115, 51, 0.35)',
  steel: '#71797E',
  steelSoft: 'rgba(113, 121, 126, 0.40)',
  forestInk: '#0F2419',
  forestDeep: '#1A3A2E',

  // Surface accents — used sparingly, only at moment-punctuation scale.
  goldPrimary: '#C9A84C',
  goldWarm: '#D8A858',
  goldTint: 'rgba(216, 168, 88, 0.10)',

  greenPrimary: '#1A5C5C',
  greenDeep: '#1A3A2E',
  greenTint: 'rgba(26, 92, 92, 0.08)',

  redPrimary: '#8B2A1F',
  redDeep: '#A03A4C',
  redTint: 'rgba(139, 42, 31, 0.08)',
} as const;

export const BRAND_FONTS = {
  display: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  mono: "'Space Mono', 'Courier New', monospace",
} as const;

/**
 * Inline-style helper for primitives that want to opt INTO the federation
 * contract without depending on globals.css being present. Used by primitives
 * that may render before the page stylesheet is loaded (e.g. SSR-first cards).
 */
export const brandStyle = {
  surface: {
    background: BRAND_COLORS.parchment,
    color: BRAND_COLORS.forestInk,
    fontFamily: BRAND_FONTS.display,
  },
  display: {
    fontFamily: BRAND_FONTS.display,
    color: BRAND_COLORS.forestInk,
  },
  mono: {
    fontFamily: BRAND_FONTS.mono,
    color: BRAND_COLORS.steel,
    fontSize: '0.78rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
  copperLine: {
    borderColor: BRAND_COLORS.copperLine,
  },
} as const;

export type BrandColor = keyof typeof BRAND_COLORS;
export type BrandFont = keyof typeof BRAND_FONTS;
