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
// The Folsom Street Fourplex demo — 4-unit ground-up infill multifamily.
const folsomFourplex: PortalInputs = {
  kind: 'hero',
  buildingType: '4-unit ground-up infill multifamily — 4 stories, 5,200 sqft',
  location: 'San Francisco, CA',
  stage: 'Build',
  progress: 42,
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

  // (c) Brand locks still hold for the multifamily subject — the register is a
  // constant, so a fourplex hero forbids the same things a farmhouse hero does.
  it('the multifamily hero prompt keeps every brand lock', () => {
    const p = buildPortalPrompt(folsomFourplex).toLowerCase();
    expect(p).not.toContain('#e8443a');
    expect(p).toContain('no pure white');
    expect(p).toContain('no neon');
    expect(p).toContain('no bright red');
    expect(p).toContain('no people');
    expect(p).toMatch(/cream|vellum|brass|teal/);
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

  it('the Folsom fourplex prompt reflects its own subject, not Marin', () => {
    const folsom = buildPortalPrompt(folsomFourplex);
    expect(folsom).toContain('multifamily');
    expect(folsom).toContain('San Francisco, CA');
    expect(folsom).not.toContain('farmhouse');
    expect(folsom).not.toContain('Marin');
    expect(folsom).not.toEqual(buildPortalPrompt(marinHero));
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
  it('detects multifamily from the project type (data-driven, any project)', () => {
    expect(archetypeFor(null, '4-unit ground-up infill multifamily')).toBe('multifamily');
    expect(archetypeFor(null, 'fourplex')).toBe('multifamily');
    expect(archetypeFor(null, 'a duplex in Oakland')).toBe('multifamily');
    expect(archetypeFor(null, 'triplex')).toBe('multifamily');
    expect(archetypeFor(null, '12 unit apartment building')).toBe('multifamily');
    expect(archetypeFor(null, 'condo development')).toBe('multifamily');
  });
  it('multifamily wins even when the building kind reads as residential', () => {
    // The Size Up enum classifies a fourplex as residential; the portal layer
    // must still route it to the multifamily seed set via the type text.
    expect(archetypeFor('residential', '4-unit infill multifamily')).toBe('multifamily');
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

describe('seedSlugFor — multifamily routes to the sf-fourplex seed set', () => {
  // (a) A 4-unit multifamily project maps to the sf-fourplex hero/study/thumb.
  it('maps a multifamily project to ITS hero/study/thumb seeds', () => {
    expect(seedSlugFor({ ...folsomFourplex, kind: 'hero' }, { archetype: 'multifamily' }))
      .toMatch(/^hero-sf-fourplex-golden-[ab]$/);
    expect(seedSlugFor({ ...folsomFourplex, kind: 'study' }, { archetype: 'multifamily' }))
      .toMatch(/^study-sf-/);
    expect(seedSlugFor({ ...folsomFourplex, kind: 'thumb' }, { archetype: 'multifamily' }))
      .toMatch(/^thumb-sf-/);
  });

  // (b) Marin still maps to the Marin seeds — not the SF set.
  it('keeps Marin on the Marin (farmhouse) seeds', () => {
    const hero = seedSlugFor({ ...marinHero, kind: 'hero' }, { archetype: 'residential' });
    const study = seedSlugFor({ ...marinHero, kind: 'study' }, { archetype: 'residential' });
    const thumb = seedSlugFor({ ...marinHero, kind: 'thumb' }, { archetype: 'residential' });
    expect(hero).toMatch(/^hero-marin-farmhouse-golden-[ab]$/);
    expect(study).toMatch(/^study-(massing-options|clearance|daylight)$/);
    expect(thumb).toMatch(/^thumb-(site-framing|material-detail|detail-sketch)$/);
    // None of the Marin slugs leak the SF identifier.
    expect(hero).not.toMatch(/sf-fourplex|-sf-/);
    expect(study).not.toMatch(/sf-fourplex|-sf-/);
    expect(thumb).not.toMatch(/sf-fourplex|-sf-/);
  });

  // (d) No bleed across a ?project= switch: each archetype resolves within its
  // own set, so the SF fourplex never serves a Marin hero and vice-versa.
  it('does not bleed seeds across archetypes', () => {
    const mfHero = seedSlugFor({ ...folsomFourplex, kind: 'hero' }, { archetype: 'multifamily' });
    const marinHeroSlug = seedSlugFor({ ...marinHero, kind: 'hero' }, { archetype: 'residential' });
    expect(mfHero).toMatch(/sf-fourplex/);
    expect(mfHero).not.toEqual(marinHeroSlug);
    expect(marinHeroSlug).not.toMatch(/sf-fourplex/);
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
