/**
 * Blueprint Design System — Typography
 * Google Fonts: IBM Plex Mono, Inter, Playfair Display
 */

export const fontImportUrl =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap';

export const fonts = {
  heading: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
  display: "'Playfair Display', 'Georgia', serif",
} as const;

export const fontSizes = {
  xs:   '0.75rem',
  sm:   '0.8125rem',
  base: '0.9375rem',
  md:   '1rem',
  lg:   '1.125rem',
  xl:   '1.25rem',
  '2xl':'1.5rem',
  '3xl':'1.875rem',
  '4xl':'2.25rem',
  '5xl':'3rem',
} as const;

export const fontWeights = {
  light:    300,
  regular:  400,
  medium:   500,
  semibold: 600,
  bold:     700,
  black:    900,
} as const;

export const lineHeights = {
  tight:  1.2,
  snug:   1.35,
  normal: 1.5,
  relaxed:1.625,
  loose:  1.8,
} as const;

export const letterSpacing = {
  tighter: '-0.03em',
  tight:   '-0.015em',
  normal:  '0',
  wide:    '0.025em',
  wider:   '0.05em',
  widest:  '0.1em',
  technical: '0.15em',
} as const;

