/**
 * Brand component barrel — consume from '@/components/brand'.
 *
 * Production code:
 *   import { Logo, HeroPlate } from '@/components/brand';
 *
 * See docs/asset-manifest.md for asset paths and the design system
 * source-of-truth.
 */

export { Logo, type LogoProps, type LogoVariant } from './Logo';
export {
  HeroPlate,
  PLATE_NAMES,
  type HeroPlateProps,
  type PlateName,
} from './HeroPlate';
