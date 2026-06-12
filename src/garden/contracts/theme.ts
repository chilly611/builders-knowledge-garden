/**
 * L2 contract — Theme tokens & brand assets
 * ==========================================
 *
 * Re-theming a garden = supplying this object, never editing engine CSS.
 * The engine renders these to CSS custom properties at the document root;
 * components read `var(--…)`. See `docs/garden-engine/02-REPO-LAYOUT.md §2`.
 *
 * NOTE (token cascade bug, plan Phase 2): today `src/app/globals.css`
 * re-declares `--bg`/`--fg`/`--accent` as raw hex AFTER `src/styles/tokens.css`,
 * clobbering it. Until that's fixed, swapping ThemeTokens won't fully re-theme.
 * This contract defines the target; the cascade fix makes it real.
 */

export interface ThemeColorTokens {
  surface: string;
  surfaceAlt: string;
  border: string;
  shadow: string;
  text: string;
  textStrong: string;
  textMuted: string;
  accent: string;
  accentDeep: string;
  accentPale: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface ThemeFontTokens {
  display: string;
  body: string;
  mono: string;
  /** Optional decorative/script face (BKG uses Italianno/Pinyon). */
  script?: string;
}

export type TypeScaleKey =
  | 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';

export interface ThemeMotionTokens {
  durQuick: string;
  durBase: string;
  durSlow: string;
  easeOut: string;
  easeSpring: string;
}

export interface ThemeTokens {
  colors: ThemeColorTokens;
  fonts: ThemeFontTokens;
  typeScale: Record<TypeScaleKey, string>;
  radii: Record<'sm' | 'md' | 'lg' | 'pill', string>;
  shadows: Record<'sm' | 'md' | 'lg', string>;
  motion: ThemeMotionTokens;
  /**
   * One colour per lifecycle stage, indexed by `LifecycleStageDef.accentIndex`.
   * Length should cover the garden's lifecycle.
   */
  stageAccents: string[];
}

/**
 * Brand assets are file paths / URLs, NOT CSS variables — a new garden swaps
 * these (today BKG hardcodes `/brand/bkg-mark*.png`, favicon, og in layout.tsx
 * and components/brand/*).
 */
export interface BrandAssets {
  /** App/site wordmark or seal. */
  logoSrc: string;
  /** Optional logo variants for different backgrounds. */
  logoVariants?: Partial<Record<'light' | 'dark' | 'wood', string>>;
  faviconSrc: string;
  ogImageSrc: string;
  /** Document/title brand name (e.g. "Builder's Knowledge Garden"). */
  siteName: string;
}
