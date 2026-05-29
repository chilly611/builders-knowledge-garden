/**
 * Hand-drawn line icons for the Owner Lane — brass/sepia, stroke 1.5, no fill.
 * Ported verbatim from the design export (owner-lane/components.jsx `Ico`).
 */
import type { SVGProps } from 'react';

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
