/**
 * Blueprint Design System — Token Barrel Export
 */
export { colors } from './colors';
export { fonts, fontSizes, fontWeights, lineHeights, letterSpacing, fontImportUrl } from './typography';

// Spacing tokens
export const spacing: Record<number, string> = {
  1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px',
  8: '32px', 10: '40px', 12: '48px', 16: '64px', 20: '80px', 24: '96px',
};

export const borders = {
  hairline: '0.5px solid',
  thin: '1px solid',
  base: '1.5px solid',
  thick: '2px solid',
  heavy: '3px solid',
};

export const radii = {
  none: '0',
  sm: '2px',
  md: '4px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
};

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(27,58,92,0.06)',
  md: '0 2px 8px rgba(27,58,92,0.10)',
  lg: '0 8px 24px rgba(27,58,92,0.14)',
  xl: '0 16px 48px rgba(27,58,92,0.18)',
  glow: '0 0 12px rgba(0,184,212,0.35)',
};

export const transitions = {
  fast: '100ms ease',
  base: '200ms ease',
  slow: '300ms ease',
  spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
};

export const zIndex = {
  behind: -1, base: 0, raised: 10, dropdown: 100,
  sticky: 200, overlay: 300, modal: 400, toast: 500,
};

export const breakpoints = {
  sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
};
