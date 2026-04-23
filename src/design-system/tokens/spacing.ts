/**
 * Spacing Scale — 4/8px base grid
 * Used for padding, margin, gaps throughout the system.
 * All values in pixels.
 */

export const spacing = {
  xs:   4,      // 0.25rem
  sm:   8,      // 0.5rem
  md:   12,     // 0.75rem
  lg:   16,     // 1rem
  xl:   24,     // 1.5rem
  '2xl': 32,    // 2rem
  '3xl': 48,    // 3rem
  '4xl': 64,    // 4rem
  '5xl': 80,    // 5rem
  '6xl': 96,    // 6rem
} as const;

export const gaps = {
  xs:   4,      // Tight component spacing
  sm:   8,      // Normal component spacing
  md:   12,     // Breathing room
  lg:   16,     // Generous spacing
  xl:   24,     // Large sections
  '2xl': 32,    // Major sections
} as const;

export const padding = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const margin = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  '2xl': 32,
  '3xl': 48,
} as const;
