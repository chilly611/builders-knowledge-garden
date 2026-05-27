/**
 * Design System — Color Palette (HERBARIUM ALIASES, 2026-05-27)
 * ==============================================================
 *
 * Knowledge Gardens herbarium palette. Top-level keys preserve the shape
 * of the pre-herbarium colors object (so every existing consumer — most
 * notably src/components/stage-shell/* — keeps working without import
 * changes), but the VALUES now point at herbarium hex.
 *
 * Source of truth: src/styles/tokens.css.
 * Pre-herbarium snapshot: src/components/_archive/2026-05-28-design-system/colors-pre-herbarium.ts.
 *
 * Mapping table (per docs/design-decisions-2026-05-27-LOCKED.md):
 *   navy        → specimen-teal-deep   #234C5A
 *   robin       → specimen-teal        #3C7A8A
 *   brass       → specimen-brass       #B08D5C
 *   orange      → specimen-amber       #C68A3D
 *   trace       → paper-edge           #C9B98A
 *   graphite    → ink-graphite         #2A2620
 *   fadedRule   → paper-edge           #C9B98A
 *   redline     → specimen-rust        #A53A2D
 *   paper.cream → paper-cream          #F2E9D2  (per Killer App merge table)
 *   paper.warm  → paper-vellum         #E8DDB8
 *   paper.aged  → paper-fold           #D8C9A0
 *
 * The `ink` / `cyan` / `amber` step scales are kept as numeric ramps
 * because some legacy components index into them. They've been gently
 * shifted toward the herbarium hues but the structure is preserved.
 */

export const colors = {
  // Canonical moodboard palette → herbarium
  navy: '#234C5A',         // → --specimen-teal-deep
  navyDeep: '#234C5A',     // → --specimen-teal-deep (no separate "deeper" in herbarium)
  robin: '#3C7A8A',        // → --specimen-teal
  brass: '#B08D5C',        // → --specimen-brass
  orange: '#C68A3D',       // → --specimen-amber
  trace: '#C9B98A',        // → --paper-edge
  graphite: '#2A2620',     // → --ink-graphite
  fadedRule: '#C9B98A',    // → --paper-edge
  redline: '#A53A2D',      // → --specimen-rust

  // Step scale — gently shifted to herbarium teal. Kept for legacy
  // components that index by 900/800/.../50 numerically.
  ink: {
    900: '#0F2419',         // → --forest-deep ish
    800: '#1A3A2E',
    700: '#234C5A',         // → --specimen-teal-deep
    600: '#2A5A6A',
    500: '#3C7A8A',         // → --specimen-teal
    400: '#5E96A4',
    300: '#84B0BC',
    200: '#A6C4CC',         // → --specimen-teal-pale
    100: '#C8DDE2',
    50:  '#E4EEF1',
  },
  paper: {
    white:   '#F2E9D2',     // No pure white — use cream per design rules
    cream:   '#F2E9D2',     // → --paper-cream
    warm:    '#E8DDB8',     // → --paper-vellum
    aged:    '#D8C9A0',     // → --paper-fold
    antique: '#D8C9A0',
    fold:    '#D8C9A0',     // → --paper-fold
    shadow:  '#B5A270',     // → --paper-shadow
    border:  '#C9B98A',     // → --paper-edge
  },
  cyan: {
    glow:   '#00FFE0',      // → --flash-teal (single deliberate flash)
    bright: '#00C9B0',      // → --flash-teal-deep
    main:   '#3C7A8A',      // → --specimen-teal
    mid:    '#234C5A',      // → --specimen-teal-deep
    deep:   '#234C5A',
  },
  amber: {
    glow:   '#C68A3D',      // → --specimen-amber
    bright: '#C68A3D',
    main:   '#C68A3D',
    mid:    '#8C5E22',      // → --specimen-amber-deep
    deep:   '#8C5E22',
  },
  status: {
    success:     '#5E7A56', // → --specimen-sage
    successLight:'#B5C4A8', // → --specimen-sage-pale
    warning:     '#C68A3D', // → --specimen-amber
    warningLight:'#E2CFA6', // → --specimen-brass-pale
    error:       '#A53A2D', // → --specimen-rust
    errorLight:  '#E6B7AE', // → --specimen-rust-pale
    info:        '#3C7A8A', // → --specimen-teal
    infoLight:   '#A6C4CC', // → --specimen-teal-pale
  },
  phase: {
    dream:   '#A53A2D',     // → --specimen-rust
    design:  '#B08D5C',     // → --specimen-brass
    plan:    '#5E7A56',     // → --specimen-sage
    build:   '#3C7A8A',     // → --specimen-teal
    deliver: '#C68A3D',     // → --specimen-amber
    grow:    '#5E7A56',     // → --specimen-sage
  },
  transparent: 'transparent',
  overlay: 'rgba(35, 76, 90, 0.6)',         // teal-deep @ 60%
  gridLine: 'rgba(35, 76, 90, 0.08)',       // teal-deep @ 8%
  gridLineMajor: 'rgba(35, 76, 90, 0.15)',
} as const;
