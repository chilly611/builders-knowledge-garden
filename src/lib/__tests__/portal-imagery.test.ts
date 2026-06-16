/**
 * portal-imagery unit tests — the brand lock + the universality guarantee.
 * ========================================================================
 *
 * Pins the two things that must never regress:
 *   1. The render register is brand-locked (no #E8443A, no pure white, no neon,
 *      no people in heroes) regardless of the per-project substitutions.
 *   2. The prompt is data-driven and universal — it reflects whatever building
 *      type / location / style is passed, with ZERO hardcoded Marin/SF. A
 *      commercial SF project and a Marin farmhouse produce different prompts and
 *      different seed selections, with no bleed between them.
 *
 * Pure functions only (no React / jsdom).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

// This repo configures no '@/' alias for vitest (tests use relative imports). The
// lib's one aliased dependency — the Dream Studio's shared engine — is itself
// import-free, so shim that specifier to the REAL module via a relative import.
// This exercises the genuine buildStudioPrompt/conceptFallbackFor reuse.
vi.mock('@/app/dream/design/shared', async () => await import('../../app/dream/design/shared'));

import {
  buildPortalPrompt,
  portalRenderBody,
  archetypeFor,
  seedSlugFor,
  seedAssetUrl,
  portalFallbackSrc,
  type PortalInputs,
} from '../portal-imagery';

const marinHero: PortalInputs = {
  kind: 'hero',
  buildingType: 'modern farmhouse',
  location: 'Marin County, CA',
  stage: 'Build',
  progress: 42,
};
const sfOffice: PortalInputs = {
  kind: 'hero',
  buildingType: 'office tenant improvement',
  location: 'San Francisco infill lot',
  stage: 'Build',
  progress: 70,
};

describe('buildPortalPrompt — brand lock (constant across all users)', () => {
  for (const kind of ['hero', 'study', 'thumb'] as const) {
    it(`${kind}: forbids red / pure white / neon in the prompt`, () => {
      const p = buildPortalPrompt({ ...marinHero, kind }).toLowerCase();
      expect(p).not.toContain('#e8443a');
      expect(p).toContain('no pure white');
      expect(p).toContain('no neon');
      // herbarium palette is named
      expect(p).toMatch(/cream|vellum|brass|teal/);
    });
  }

  it('hero forbids people and signage; study reads as a drawing', () => {
    expect(buildPortalPrompt(marinHero).toLowerCase()).toContain('no people');
    const study = buildPortalPrompt({ ...marinHero, kind: 'study' }).toLowerCase();
    expect(study).toContain('working drawing');
    expect(study).toContain('no photographic rendering');
  });
});

describe('buildPortalPrompt — universal substitutions (no hardcoded Marin/SF)', () => {
  it('reflects the project building type + location verbatim', () => {
    expect(buildPortalPrompt(marinHero)).toContain('modern farmhouse');
    expect(buildPortalPrompt(marinHero)).toContain('Marin County, CA');
    expect(buildPortalPrompt(sfOffice)).toContain('office tenant improvement');
    expect(buildPortalPrompt(sfOffice)).toContain('San Francisco infill lot');
  });

  it('a different project yields a different prompt — no bleed', () => {
    expect(buildPortalPrompt(marinHero)).not.toEqual(buildPortalPrompt(sfOffice));
    // the SF office prompt must NOT mention the Marin subject
    expect(buildPortalPrompt(sfOffice)).not.toContain('farmhouse');
    expect(buildPortalPrompt(sfOffice)).not.toContain('Marin');
  });

  it('encodes the build progress as a construction cue', () => {
    expect(buildPortalPrompt(marinHero)).toContain('42% built');
    expect(buildPortalPrompt(sfOffice)).toContain('70% built');
  });
});

describe('portalRenderBody — kind → API params', () => {
  it('maps each kind to the right aspect/style/quality', () => {
    expect(portalRenderBody({ ...marinHero, kind: 'hero' })).toMatchObject({ aspect: 'landscape', style: 'exterior', quality: 'high' });
    expect(portalRenderBody({ ...marinHero, kind: 'study' })).toMatchObject({ aspect: 'portrait', style: 'sketch' });
    expect(portalRenderBody({ ...marinHero, kind: 'thumb' })).toMatchObject({ aspect: 'square', style: 'material' });
  });
});

describe('archetypeFor', () => {
  it('honors the buildingKind when present', () => {
    expect(archetypeFor('residential')).toBe('residential');
    expect(archetypeFor('commercial')).toBe('commercial');
    expect(archetypeFor('mixed')).toBe('mixed');
  });
  it('infers from free text and falls back to generic', () => {
    expect(archetypeFor(null, 'ADU in the backyard')).toBe('residential');
    expect(archetypeFor(null, 'retail shop buildout')).toBe('commercial');
    expect(archetypeFor(null, 'something unclassifiable')).toBe('generic');
  });
});

describe('seedSlugFor — archetype-matched WIP placeholder', () => {
  it('only serves a hero seed for residential (no photoreal hero seed otherwise)', () => {
    expect(seedSlugFor({ ...marinHero, kind: 'hero' }, { archetype: 'residential' })).toMatch(/^hero-/);
    expect(seedSlugFor({ ...sfOffice, kind: 'hero' }, { archetype: 'commercial' })).toBeNull();
  });
  it('always serves a study/thumb seed (generic enough for any project)', () => {
    expect(seedSlugFor({ ...sfOffice, kind: 'study' }, { archetype: 'commercial' })).toMatch(/^study-/);
    expect(seedSlugFor({ ...sfOffice, kind: 'thumb' }, { archetype: 'commercial' })).toMatch(/^thumb-/);
  });
  it('is deterministic for the same variantKey', () => {
    const a = seedSlugFor({ ...marinHero, kind: 'study' }, { variantKey: 'p1:study' });
    const b = seedSlugFor({ ...marinHero, kind: 'study' }, { variantKey: 'p1:study' });
    expect(a).toEqual(b);
  });
});

describe('seedAssetUrl', () => {
  const prev = process.env.NEXT_PUBLIC_SUPABASE_URL;
  afterEach(() => { process.env.NEXT_PUBLIC_SUPABASE_URL = prev; });

  it('returns null without a configured Supabase URL', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(seedAssetUrl('hero-marin-farmhouse-golden-a')).toBeNull();
    expect(seedAssetUrl(null)).toBeNull();
  });
  it('builds the public fidelity object path when configured', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    expect(seedAssetUrl('hero-marin-farmhouse-golden-a')).toBe(
      'https://example.supabase.co/storage/v1/object/public/brand-assets/assets/bkg/fidelity/hero-marin-farmhouse-golden-a.png',
    );
  });
});

describe('portalFallbackSrc — the guaranteed visual', () => {
  it('always returns an inline data-URI (never 404s)', () => {
    expect(portalFallbackSrc(marinHero)).toMatch(/^data:image\/svg\+xml,/);
  });
});
