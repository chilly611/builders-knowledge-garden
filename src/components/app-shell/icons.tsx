/**
 * Hand-drawn line icons for the shared App Shell — brass/sepia, stroke 1.5,
 * no fill. Moved here (2026-05-31) from the Owner Lane so the chrome and the
 * Owner content can share one icon set. `owner/icons.tsx` now re-exports this
 * module, so existing Owner imports keep working unchanged.
 */
import type { ReactElement, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export const Ico = {
  check: (p: IconProps) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 6 L9 17 l-5 -5" />
    </svg>
  ),
  camera: (p: IconProps) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 8 h3.5 l1.5 -2.2 h8 l1.5 2.2 H21 v11 H3 z" />
      <circle cx="12" cy="13" r="3.6" />
    </svg>
  ),
  ruler: (p: IconProps) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 14.5 L14.5 4 l5.5 5.5 L9.5 20 z" />
      <path d="M8 8.5 l1.6 1.6 M11 5.5 l1.6 1.6 M5 11.5 l1.6 1.6" />
    </svg>
  ),
  receipt: (p: IconProps) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 3 h12 v18 l-2 -1.4 l-2 1.4 l-2 -1.4 l-2 1.4 l-2 -1.4 L6 21 z" />
      <path d="M9 8 h6 M9 12 h6" />
    </svg>
  ),
  video: (p: IconProps) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="6" width="13" height="12" rx="1.5" />
      <path d="M16 10 l5 -3 v10 l-5 -3 z" />
    </svg>
  ),
  clip: (p: IconProps) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 11.5 l-9 9 a5 5 0 0 1 -7 -7 l9 -9 a3.2 3.2 0 0 1 4.6 4.6 l-9 9 a1.4 1.4 0 0 1 -2 -2 l8.2 -8.2" />
    </svg>
  ),
  arrow: (p: IconProps) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 12 h13 M13 6 l6 6 -6 6" />
    </svg>
  ),
  pause: (p: IconProps) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}>
      <path d="M9 5 v14 M15 5 v14" />
    </svg>
  ),
  search: (p: IconProps) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  ),
};

/**
 * Per-stage glyphs for the 7 locked lifecycle stages, keyed by KAC_STAGES slug.
 * Same brass/sepia line style as `Ico`; the build reads as a sequence of drawn
 * marks, not text labels. 16px so they sit cleanly in a strip cell.
 */
export const StageIco: Record<string, (p: IconProps) => ReactElement> = {
  'size-up': (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 3v15M16 3v18" />
      <path d="M8 6h4M8 10h4M16 12h-4" />
      <path d="M8 18h8" />
    </svg>
  ),
  lock: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="9.5" r="5.5" />
      <circle cx="12" cy="9.5" r="2.2" />
      <path d="M9 14l-1.3 7 4.3-2.2 4.3 2.2L15 14" />
    </svg>
  ),
  plan: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 5h11l3 3v11H5z" />
      <path d="M16 5v3h3" />
      <path d="M8 12h7M8 15h7M8 9h3" />
    </svg>
  ),
  build: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 4v14h14" />
      <path d="M9.5 18v-2.5M13 18v-2.5M16.5 18v-2.5M6 7.5h2.5M6 11h2.5M6 14.5h2.5" />
    </svg>
  ),
  adapt: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M16 3.5a4 4 0 00-3.2 6.4L5 18l1.6 1.6 7.9-7.8A4 4 0 1016 3.5z" />
      <path d="M14.2 4.4l-1.7 2 1 2.6 2.6.6 1.7-2" />
    </svg>
  ),
  collect: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 7.5v9M14 9.6h-3a1.6 1.6 0 000 3.2h2a1.6 1.6 0 010 3.2H9.8" />
    </svg>
  ),
  reflect: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14z" />
      <path d="M5 19C9 15 12.5 11.5 16 8" />
    </svg>
  ),
};
