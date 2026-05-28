/**
 * HeroPlate — render a Knowledge Gardens specimen plate as a hero image.
 * =====================================================================
 *
 * The four hero plates are the brand DNA (per the design system README):
 *   builders-hammer            — Master mark (Builder's Knowledge Garden)
 *   chrome-killer-app          — Killer App surface accent
 *   chrome-dream-machine       — Dream Machine surface accent
 *   chrome-knowledge-garden    — Knowledge Garden surface accent
 *
 * Plates live at public/plates/<name>.png. Copied 2026-05-28 from the
 * Knowledge Gardens Design System (assets/plates/*.png). See
 * docs/asset-manifest.md.
 *
 * Defaults to the master `builders-hammer` plate at 800×800 — wrap in a
 * sized container if you want a different rendered footprint; next/image
 * will downscale and serve modern formats.
 *
 * `priority` is on by default because plates are typically above the
 * fold (hero, surface header). Pass `priority={false}` for plates that
 * appear in scrolled regions or empty states.
 */

import Image from 'next/image';

export const PLATE_NAMES = [
  'builders-hammer',
  'chrome-killer-app',
  'chrome-dream-machine',
  'chrome-knowledge-garden',
] as const;

export type PlateName = (typeof PLATE_NAMES)[number];

export interface HeroPlateProps {
  /** Which plate to render. Default `builders-hammer`. */
  name?: PlateName;
  width?: number;
  height?: number;
  className?: string;
  /** Default true — flip to false when the plate is below the fold. */
  priority?: boolean;
  /** Override the alt text. Default reads "<name> specimen plate". */
  alt?: string;
}

export function HeroPlate({
  name = 'builders-hammer',
  width = 800,
  height = 800,
  className,
  priority = true,
  alt,
}: HeroPlateProps) {
  return (
    <Image
      src={`/plates/${name}.png`}
      alt={alt ?? `${name.replace(/-/g, ' ')} specimen plate`}
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}

export default HeroPlate;
