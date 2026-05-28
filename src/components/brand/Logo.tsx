/**
 * Logo — BKG brand mark in four background-appropriate variants.
 * =============================================================
 *
 * Wraps next/image so the brand mark gets the same automatic format
 * conversion (AVIF/WebP), lazy-loading rules, and responsive `srcset`
 * handling as the rest of the app's media.
 *
 * Variants map to the herbarium-palette backgrounds they sit on:
 *   default — transparent BG, default placement (top nav, footer, headers)
 *   light   — white-outlined; for dark or photo backgrounds
 *   dark    — dark-outlined; for mid-tone backgrounds where extra contrast helps
 *   wood    — wood-outlined; for cream / paper-vellum backgrounds where the
 *             default doesn't pop
 *
 * Assets live at public/brand/bkg-mark{,-light,-dark,-wood}.png and were
 * copied 2026-05-28 from the Knowledge Gardens Design System
 * (assets/logo/bkg-*.png). See docs/asset-manifest.md.
 *
 * `priority` is on by default because the logo lands above the fold on
 * every surface that mounts it (nav, footer, hero). Override with
 * `priority={false}` for marketing surfaces where the logo appears
 * below scroll.
 */

import Image from 'next/image';

const SRC = {
  default: '/brand/bkg-mark.png',
  light: '/brand/bkg-mark-light.png',
  dark: '/brand/bkg-mark-dark.png',
  wood: '/brand/bkg-mark-wood.png',
} as const;

export type LogoVariant = keyof typeof SRC;

export interface LogoProps {
  variant?: LogoVariant;
  width?: number;
  height?: number;
  className?: string;
  /** Default true — flip to false when the logo is below the fold. */
  priority?: boolean;
  /** Override the alt text. Default is the BKG full name. */
  alt?: string;
}

export function Logo({
  variant = 'default',
  width = 32,
  height = 32,
  className,
  priority = true,
  alt = "Builder's Knowledge Garden",
}: LogoProps) {
  return (
    <Image
      src={SRC[variant]}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}

export default Logo;
