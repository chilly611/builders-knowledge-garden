/**
 * Dream Machine — staged exploration renders + style-picker options.
 * =========================================================================
 *
 * DATA, not chrome. Two staged, brand-locked asset sets Cowork rendered into
 * the PUBLIC `brand-assets` bucket, surfaced by the Dream Machine surface
 * (component-fidelity spec §C):
 *
 *   1. EXPLORATION STUDIES (§C2 "In motion") — per-project line-and-wash
 *      studies: massing options / clearance check / daylight. Keyed by the
 *      canonical project id (imported constants — NOT name strings), so
 *      switching `?project=` flips the set with zero hardcoding and no bleed.
 *      A project with no staged set falls back to the guaranteed concept
 *      sketch (never an empty card, never a 404).
 *
 *   2. STYLE OPTIONS ("Choose your direction") — the three architectural
 *      directions a style-less project can pick from.
 *
 * The bucket is PUBLIC, so these are plain object URLs — no catalog read, no
 * promote, no asset-DB write. Pure + SSR-safe (no React, no `window`).
 */

import { MARIN_PROJECT_ID } from '@/lib/seed-data/marin-farmhouse';
import { FOLSOM_PROJECT_ID } from '@/lib/seed-data/sf-fourplex';
import { conceptFallbackFor } from '@/app/dream/design/shared';

/** Public brand-assets bucket (same host the shell seal + portal imagery use). */
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vlezoyalutexenbnzzui.supabase.co';
const BRAND_ASSETS = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/brand-assets`;

/** Cowork-staged batches (founder-pointed). */
const EXPLORATION_BATCH = 'assets/bkg/fidelity/batch-2026-06-15';
const STYLES_BATCH = 'assets/bkg/styles/batch-2026-06-16';

/**
 * Canonical project id → staged asset prefix. Keyed by id (the imported
 * fixture constants), never by display name — this is the data registry the
 * "no hardcoded project names" rule asks for, the same way getCanonicalProject
 * keys its fixtures. A project absent here has no staged study set.
 */
const STUDY_PREFIX_BY_PROJECT: Record<string, 'marin' | 'sf'> = {
  [MARIN_PROJECT_ID]: 'marin',
  [FOLSOM_PROJECT_ID]: 'sf',
};

export interface ExplorationStudy {
  key: 'massing' | 'clearance' | 'daylight';
  /** Space Mono chip (spec §C2 wording). */
  tag: string;
  /** Archivo Black card title. */
  title: string;
  /** Cormorant body line. */
  body: string;
  /** Affordance label (the arrow is added by the view). */
  action: string;
  /** Image URL — the staged render, or a guaranteed concept-sketch data URI. */
  src: string;
  /** True = a real staged render for this project; false = honest fallback. */
  staged: boolean;
}

const STUDY_DEFS: Array<{
  key: ExplorationStudy['key'];
  tag: string;
  title: string;
  body: string;
  action: string;
  file: string;
}> = [
  {
    key: 'massing',
    tag: '3 MASSING OPTIONS',
    title: 'Massing options',
    body: 'Three ways the volume could sit on the lot — footprint, height, and step-backs, drawn side by side.',
    action: 'View options',
    file: 'study-massing-options',
  },
  {
    key: 'clearance',
    tag: 'CLEARANCE CHECK',
    title: 'Clearance check',
    body: 'Setbacks, easements, and the room left to build against the line — a working check, not a render.',
    action: 'Open study',
    file: 'study-clearance-check',
  },
  {
    key: 'daylight',
    tag: 'DAYLIGHT STUDY',
    title: 'Daylight study',
    body: 'How light reaches the interior rooms through the day — the section that protects the daylight you want.',
    action: 'Simulate',
    file: 'study-daylight',
  },
];

/** Guaranteed-visual fallback for a study card (stable data URI, never 404s). */
export function studyFallbackSrc(projectId: string | null | undefined, key: string, label: string): string {
  return conceptFallbackFor(`study:${projectId ?? 'none'}:${key}`, label);
}

/**
 * The three "In motion" studies for the active project. Always returns three
 * (the founder asked for all 3); `staged` flags whether each is a real render
 * or the honest concept fallback for a project with no staged set.
 */
export function explorationStudiesFor(projectId: string | null | undefined): ExplorationStudy[] {
  const prefix = projectId ? STUDY_PREFIX_BY_PROJECT[projectId] : undefined;
  return STUDY_DEFS.map((d) => ({
    key: d.key,
    tag: d.tag,
    title: d.title,
    body: d.body,
    action: d.action,
    staged: !!prefix,
    src: prefix
      ? `${BRAND_ASSETS}/${EXPLORATION_BATCH}/${prefix}-${d.file}.png`
      : studyFallbackSrc(projectId, d.key, d.title),
  }));
}

export interface StyleOption {
  slug: 'midcentury-modern' | 'mediterranean' | 'asian-fusion';
  label: string;
  tagline: string;
  src: string;
}

/** The three pickable directions — exact founder-specified public images. */
export const STYLE_OPTIONS: StyleOption[] = [
  {
    slug: 'midcentury-modern',
    label: 'Mid-century modern',
    tagline: 'Clean lines, warm wood, glass that opens to the garden.',
    src: `${BRAND_ASSETS}/${STYLES_BATCH}/style-midcentury-modern-a.png`,
  },
  {
    slug: 'mediterranean',
    label: 'Mediterranean',
    tagline: 'Stucco and clay tile, shaded arcades, a quiet courtyard.',
    src: `${BRAND_ASSETS}/${STYLES_BATCH}/style-mediterranean-a.png`,
  },
  {
    slug: 'asian-fusion',
    label: 'Asian-fusion',
    tagline: 'Calm timber, deep eaves, an easy indoor–outdoor flow.',
    src: `${BRAND_ASSETS}/${STYLES_BATCH}/style-asian-fusion-a.png`,
  },
];

/** Resolve a stored style slug to its option (for the "chosen direction" view). */
export function styleOptionBySlug(slug: string | null | undefined): StyleOption | null {
  if (!slug) return null;
  return STYLE_OPTIONS.find((s) => s.slug === slug) ?? null;
}
