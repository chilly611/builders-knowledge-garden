/**
 * intake — the Dream Machine's guided question flow (pure data + mappers).
 * =======================================================================
 *
 * The "Oracle/Quest" feel the founder picked: a short, warm, low-jargon
 * sequence that anyone can answer, which assembles a `DreamProfile`. Kept pure
 * + separate from the view so the question set and the answers→profile→brief
 * mapping are testable and easy to tune. Feeds BOTH the render prompt and the
 * schematic floor plan (floorplan.ts).
 */

import type { DreamProfile } from './floorplan';

export interface IntakeOption {
  label: string;
  /** Stored answer value. */
  value: string;
  /** Optional one-line helper shown under the option. */
  hint?: string;
}

export interface IntakeQuestion {
  id: 'type' | 'place' | 'scale' | 'vibe' | 'musthaves';
  /** The warm, plain-language prompt. */
  prompt: string;
  /** A reassuring sub-line. */
  helper: string;
  options: IntakeOption[];
  /** Allow a free-text answer in addition to the chips. */
  freeText?: { placeholder: string };
  /** Multi-select (chips) vs single-choice. */
  multi?: boolean;
}

export const INTAKE: IntakeQuestion[] = [
  {
    id: 'type',
    prompt: 'What are you dreaming up?',
    helper: 'No wrong answers — pick the closest, or say it in your own words.',
    options: [
      { label: 'A new home', value: 'new home', hint: 'Ground-up house' },
      { label: 'An ADU / guest house', value: 'ADU', hint: 'Backyard or above-garage' },
      { label: 'An addition', value: 'home addition', hint: 'Add on to what you have' },
      { label: 'A kitchen or bath remodel', value: 'kitchen remodel', hint: 'Refresh a room' },
      { label: 'Something multifamily', value: 'multifamily', hint: 'Units to rent or sell' },
    ],
    freeText: { placeholder: 'Or describe it — “a treehouse studio over the garage…”' },
  },
  {
    id: 'place',
    prompt: 'Where will it live?',
    helper: 'City or county is plenty — it tunes the codes and the light.',
    options: [
      { label: 'Marin County, CA', value: 'Marin County, CA' },
      { label: 'San Francisco, CA', value: 'San Francisco, CA' },
      { label: 'Los Angeles, CA', value: 'Los Angeles, CA' },
      { label: 'Not sure yet', value: '' },
    ],
    freeText: { placeholder: 'Or type a place…' },
  },
  {
    id: 'scale',
    prompt: 'How much room do you need?',
    helper: 'A rough feel is fine — you can change it later.',
    options: [
      { label: 'Cozy', value: '900', hint: '~900 sf · 1–2 beds' },
      { label: 'Comfortable', value: '1800', hint: '~1,800 sf · 3 beds' },
      { label: 'Generous', value: '3000', hint: '~3,000 sf · 4 beds' },
      { label: 'Grand', value: '4500', hint: '~4,500 sf · 4–5 beds' },
    ],
    freeText: { placeholder: 'Or a number, like “2,400 sqft”…' },
  },
  {
    id: 'vibe',
    prompt: 'What should it feel like?',
    helper: 'This sets the direction of the first renders.',
    options: [
      { label: 'Warm & minimal', value: 'midcentury-modern', hint: 'Clean lines, warm wood' },
      { label: 'Light & airy', value: 'midcentury-modern', hint: 'Glass, white oak, garden' },
      { label: 'Rugged & natural', value: 'asian-fusion', hint: 'Timber, stone, deep eaves' },
      { label: 'Classic & timeless', value: 'mediterranean', hint: 'Stucco, tile, courtyards' },
    ],
    freeText: { placeholder: 'Or describe the feeling…' },
  },
  {
    id: 'musthaves',
    prompt: 'Any must-haves?',
    helper: 'Pick a few — these shape the floor plan.',
    multi: true,
    options: [
      { label: 'Open kitchen', value: 'open kitchen' },
      { label: 'Home office', value: 'home office' },
      { label: 'Primary suite', value: 'primary suite' },
      { label: '2-car garage', value: '2-car garage' },
      { label: 'Outdoor living', value: 'outdoor living deck' },
      { label: 'Lots of light', value: 'lots of natural light' },
      { label: 'Flex / studio', value: 'flex studio room' },
    ],
    freeText: { placeholder: 'Anything else you can’t live without…' },
  },
];

/** Raw answers keyed by question id (string for single, string[] for multi). */
export interface IntakeAnswers {
  type?: string;
  place?: string;
  scale?: string;
  vibe?: string;
  musthaves?: string[];
}

const STYLE_SLUGS = new Set(['midcentury-modern', 'mediterranean', 'asian-fusion']);

/** Assemble the structured DreamProfile from raw answers. */
export function buildProfile(a: IntakeAnswers): DreamProfile {
  const buildingType = (a.type || 'new home').trim();
  const scaleSqft = (() => {
    const n = parseInt(String(a.scale ?? '').replace(/[^\d]/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : 1800;
  })();
  // bedroom inference from scale (only used as a floor-plan hint).
  const bedrooms = scaleSqft >= 4000 ? 4 : scaleSqft >= 2600 ? 4 : scaleSqft >= 1500 ? 3 : scaleSqft >= 900 ? 2 : 1;
  const vibe = (a.vibe || '').trim();
  const style = STYLE_SLUGS.has(vibe) ? vibe : null;
  return {
    buildingType,
    location: (a.place || '').trim() || null,
    vibe: style ? null : vibe || null,
    scaleSqft,
    bedrooms,
    bathrooms: null,
    mustHaves: (a.musthaves ?? []).filter(Boolean),
    style,
  };
}

/** A natural-language brief — the render prompt seed AND the project raw_input. */
export function profileToBrief(p: DreamProfile): string {
  const bits: string[] = [];
  bits.push(`A ${p.buildingType}`);
  if (p.location) bits.push(`in ${p.location}`);
  if (p.scaleSqft) bits.push(`around ${p.scaleSqft.toLocaleString('en-US')} sqft`);
  if (p.bedrooms && /home|house|adu|addition|multifamily/i.test(p.buildingType)) bits.push(`about ${p.bedrooms} bedrooms`);
  const styleWords = p.style ? p.style.replace(/-/g, ' ') : p.vibe;
  if (styleWords) bits.push(`in a ${styleWords} style`);
  if (p.mustHaves && p.mustHaves.length) bits.push(`with ${p.mustHaves.join(', ')}`);
  return bits.join(' ') + '.';
}

/** A render-API prompt: the brief + the herbarium architectural register. */
export function profileToRenderPrompt(p: DreamProfile): string {
  return (
    `${profileToBrief(p)} Architectural exterior, golden-hour, warm and filmic, ` +
    `medium-format photography, deep depth of field, calm and aspirational, ` +
    `no people, no text, no signage.`
  );
}
