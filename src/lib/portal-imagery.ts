/**
 * portal-imagery — universal, brand-locked "work-in-progress" portal visuals.
 * =========================================================================
 *
 * Spec: docs/design/seed-and-portals.md ("Seed & Portals", 2026-06-15).
 *
 * Every project view should feel alive BEFORE the user's real dream is rendered.
 * We fill that "work in progress" window with brand-locked, generated imagery of
 * what THEY are building, in THEIR style — calm herbarium-register visuals that
 * read as a designer's plate, never an empty placeholder. The herbarium register
 * IS the loading state (Decision 18, visual-first).
 *
 * This module is DATA-DRIVEN and UNIVERSAL: it produces a prompt for ANY user,
 * ANY building type, ANY style — Marin is just the first seed set. Every input
 * flows from useStageProject(); nothing here hardcodes a project.
 *
 * It REUSES the live engine, it does not duplicate it:
 *   - buildStudioPrompt() carries the style tail (the five-slider language).
 *   - conceptFallbackFor() is the guaranteed, never-404 data-URI fallback.
 * Both come from the Dream Studio's shared module — the same engine the Studio
 * already drives through POST /api/v1/render (→ Replicate FLUX).
 *
 * Pure + SSR-safe (no React, no `window` at module scope). The client-side
 * seed → render → swap → fallback flow lives in `@/lib/hooks/usePortalImage`.
 */

import {
  buildStudioPrompt,
  conceptFallbackFor,
  seedFromString,
  type StyleControlValues,
} from '@/app/dream/design/shared';

export type PortalKind = 'hero' | 'study' | 'thumb';

/** Per-project substitutions — every field sourced from useStageProject(). */
export interface PortalInputs {
  /** project_type, e.g. "modern farmhouse", "4-unit infill multifamily", "ADU". */
  buildingType?: string | null;
  /** jurisdiction, e.g. "Marin County, CA", "San Francisco infill lot". */
  location?: string | null;
  /** style descriptor, e.g. "board-and-batten", "midcentury" (optional). */
  style?: string | null;
  /** active stage short label, e.g. "Build" — drives the construction cue. */
  stage?: string | null;
  /** 0–100 build progress — drives the construction cue. */
  progress?: number | null;
  kind: PortalKind;
}

export type Archetype = 'residential' | 'commercial' | 'mixed' | 'generic';

/* ─────────────────── §2 · The render register (the brand lock) ───────────────────
 * CONSTANT across all users. Whatever the subject, the *look* is fixed. Kept in
 * sync with the spec §2 and stage-fidelity-assets.mjs prompt wording. */

const REGISTER: Record<PortalKind, string> = {
  hero:
    'Cinematic architectural photograph, golden hour, warm and filmic, ' +
    'medium-format, 35mm-equivalent, deep depth of field, fine natural grain, ' +
    'calm and aspirational.',
  study:
    "Architect's hand-drawn study on aged cream paper, fine ink-graphite " +
    'linework with light specimen-teal wash and brass accents, faint ' +
    'herbarium-plate grid and dimension annotations — a working drawing, not a render.',
  thumb:
    'Documentary site photograph, square crop, warm late-afternoon light, ' +
    'honest jobsite feel, shallow depth of field, fine natural grain.',
};

/** Palette lock — only the herbarium tokens. No #E8443A, no pure white, no neon. */
const PALETTE =
  'Strictly the herbarium palette — warm cream, vellum, brass, amber, with cool ' +
  'teal shadows; muted and filmic, no oversaturation.';

/** Negative direction per kind (the brand "do-not" enforced in the prompt itself). */
const NEGATIVE: Record<PortalKind, string> = {
  hero: 'No people, no signage, no text, no pure white, no bright red, no neon, no fisheye.',
  study:
    'No photographic rendering, no color beyond cream, teal, brass and graphite, ' +
    'no pure white, no red, no neon.',
  thumb: 'No people, no text, no pure white, no bright red, no neon.',
};

/* ─────────────────── §3 · The variable layer (per project) ─────────────────── */

/** Map stage + progress into a construction cue so the image reads as mid-build. */
function constructionCue(stage?: string | null, progress?: number | null): string {
  const p =
    typeof progress === 'number' && Number.isFinite(progress)
      ? Math.max(0, Math.min(100, Math.round(progress)))
      : null;

  let phase = '';
  if (p != null) {
    if (p < 12) phase = 'site cleared, foundation work beginning';
    else if (p < 45) phase = 'framing and scaffolding visible';
    else if (p < 72) phase = 'cladding and roofing going on, some scaffolding remaining';
    else if (p < 100) phase = 'near complete, final finishes underway';
    else phase = 'newly completed';
  } else {
    // No percent — fall back to the locked stage name (Size Up → … → Reflect).
    const s = (stage || '').toLowerCase();
    if (/size up|lock|plan/.test(s)) phase = 'site cleared, foundation work beginning';
    else if (/build|adapt/.test(s)) phase = 'framing and scaffolding visible';
    else if (/collect|reflect/.test(s)) phase = 'near complete, final finishes underway';
  }
  if (!phase) return '';
  const tail = p != null ? ` to read as ${p}% built` : '';
  return `under construction, ${phase}${tail}`;
}

/** Compose the per-project subject line from the substitutions. */
function subjectLine(i: PortalInputs): string {
  const subject =
    [i.style, i.buildingType].map((s) => (s || '').trim()).filter(Boolean).join(' ') ||
    'a building';
  const bits = [subject];
  const loc = (i.location || '').trim();
  if (loc) bits.push(`in ${loc}`);
  // The construction cue is meaningful for the photographic kinds; for a study
  // (a line drawing of options) it stays implicit, so we only add it to photos.
  if (i.kind !== 'study') {
    const cue = constructionCue(i.stage, i.progress);
    if (cue) bits.push(cue);
  }
  return bits.join(' ');
}

/** Bias the five Studio sliders to the herbarium register (deterministic). */
function controlsFor(kind: PortalKind): StyleControlValues {
  return {
    architecturalStyle: 50, // neutral — the project's own type carries the form
    colorWarmth: kind === 'study' ? 50 : 72, // photos lean to warm golden-hour
    materialPreference: 38, // lean natural materials (wood, stone) over synthetic
    budgetLevel: 50,
    eraInfluence: 50,
  };
}

/**
 * RENDER-REGISTER (constant) + per-project substitutions → one prompt string.
 * buildStudioPrompt() supplies the style tail, so the slider language is reused,
 * not re-implemented here.
 */
export function buildPortalPrompt(i: PortalInputs): string {
  const styled = buildStudioPrompt(subjectLine(i), controlsFor(i.kind));
  return `${REGISTER[i.kind]} ${styled}. ${PALETTE} ${NEGATIVE[i.kind]}`;
}

/** Body for POST /api/v1/render (single render), mapped from the portal kind. */
export function portalRenderBody(i: PortalInputs): {
  prompt: string;
  style: string;
  aspect: string;
  quality: string;
} {
  return {
    prompt: buildPortalPrompt(i),
    style: i.kind === 'study' ? 'sketch' : i.kind === 'thumb' ? 'material' : 'exterior',
    aspect: i.kind === 'hero' ? 'landscape' : i.kind === 'study' ? 'portrait' : 'square',
    quality: i.kind === 'hero' ? 'high' : 'standard',
  };
}

/* ─────────────────── §5 · The seed set (archetype-matched WIP placeholder) ───────────────────
 * The instant placeholder shown DURING generation. Slugs mirror the staged seed
 * set in docs/design/seed-and-portals.md §5 and the staging tool portal-imagery.mjs. */

export const FIDELITY_BUCKET = 'brand-assets';
/** Public object path; the catalog row's storage_path strips the leading "assets/". */
export const FIDELITY_PUBLIC_PREFIX = 'assets/bkg/fidelity';

const SEED_SETS: Record<PortalKind, readonly string[]> = {
  hero: ['hero-marin-farmhouse-golden-a', 'hero-marin-farmhouse-golden-b'],
  study: ['study-massing-options', 'study-clearance', 'study-daylight'],
  thumb: ['thumb-site-framing', 'thumb-material-detail', 'thumb-detail-sketch'],
};

/** Coarse archetype from the building kind (with a free-text fallback). */
export function archetypeFor(
  buildingKind?: string | null,
  buildingType?: string | null,
): Archetype {
  if (buildingKind === 'residential' || buildingKind === 'commercial' || buildingKind === 'mixed') {
    return buildingKind;
  }
  const t = (buildingType || '').toLowerCase();
  if (/(office|retail|warehouse|commercial|tenant|restaurant|shop)/.test(t)) return 'commercial';
  if (/(mixed[- ]?use|live[- ]?work)/.test(t)) return 'mixed';
  if (/(home|house|farmhouse|adu|residence|residential|dwelling|cabin)/.test(t)) return 'residential';
  return 'generic';
}

/**
 * Pick the archetype-matched seed slug for a kind, or null when no seed fits
 * (the consumer then falls straight to the guaranteed concept fallback).
 *
 * NOTE: only the residential (Marin farmhouse) HERO set is staged today, so it
 * is the universal residential placeholder until more archetype heroes exist.
 * Studies and thumbs are generic enough to use for any project. The slug names
 * are asset identifiers, not project data — the per-project render is what
 * carries the user's actual building type/location/style.
 */
export function seedSlugFor(
  i: PortalInputs,
  opts?: { archetype?: Archetype; variantKey?: string },
): string | null {
  const set = SEED_SETS[i.kind];
  if (!set.length) return null;
  if (i.kind === 'hero' && (opts?.archetype ?? 'generic') !== 'residential') {
    // No photoreal hero seed for non-residential archetypes yet.
    return null;
  }
  const key = opts?.variantKey || `${i.kind}:${i.buildingType ?? ''}:${i.location ?? ''}`;
  return set[seedFromString(key) % set.length];
}

/** Public URL of a staged seed asset, or null when Supabase is unconfigured. */
export function seedAssetUrl(slug: string | null): string | null {
  if (!slug) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || base.includes('placeholder')) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${FIDELITY_BUCKET}/${FIDELITY_PUBLIC_PREFIX}/${slug}.png`;
}

/**
 * The guaranteed-visual fallback (a stable data-URI sketch that never 404s).
 * Used when the seed asset is missing AND the live render is unavailable.
 */
export function portalFallbackSrc(i: PortalInputs, key?: string): string {
  const label = String(i.buildingType || i.style || i.kind || 'concept').slice(0, 22);
  const k = key || `${i.kind}:${i.buildingType ?? ''}:${i.location ?? ''}:${i.style ?? ''}`;
  return conceptFallbackFor(k, label);
}
