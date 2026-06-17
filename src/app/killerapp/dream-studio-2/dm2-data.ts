/**
 * Dream Machine v2 — demo data (ported verbatim from the Claude Design mock's
 * window.DM2 "Twin Peaks Residence"). Shaped like a useStageProject() payload
 * so a hook can replace the literal later with zero re-layout; for this
 * high-fidelity prototype it IS the literal (no live generation/persistence).
 *
 * The mock referenced `assets/journey/*` (not in our repo); those are remapped
 * to the staged, public brand-assets batches (fidelity/batch-2026-06-15 +
 * styles/batch-2026-06-16) so every image is real, never broken.
 */

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vlezoyalutexenbnzzui.supabase.co';
const A = `${SUPA}/storage/v1/object/public/brand-assets/assets/bkg/fidelity/batch-2026-06-15/`;
const S = `${SUPA}/storage/v1/object/public/brand-assets/assets/bkg/styles/batch-2026-06-16/`;

// Stable remap of the mock's six journey images → our staged set (kept
// consistent so a concept, its style, and its table thumb share one image).
const IMGS = {
  structural: `${A}marin-hero-golden-a.png`,
  build: `${S}style-midcentury-modern-a.png`,
  sketch: `${A}marin-study-massing-options.png`,
  sizeup: `${S}style-asian-fusion-a.png`,
  sequencing: `${A}sf-hero-golden-a.png`,
  tree: `${S}style-mediterranean-a.png`,
} as const;

export interface GenomeParam {
  id: string; nm: string; min: number; max: number; step: number; val: number; unit: string;
  fmt: (v: number) => string;
}

export const DM2 = {
  project: {
    id: 'twin-peaks',
    name: 'Twin Peaks Residence',
    kicker: "Builder's Knowledge Garden · Dream Machine",
    detail: '5 BR remodel · 3,200 sqft · hillside structural',
    lot: '0.34 ac · hillside · SF · R-1',
    jurisdiction: 'San Francisco · R-1 · coastal hillside',
    budgetTo: 1650000,
    budgetSub: 'target build budget',
  },

  stages: [
    { id: 'imagine', n: '01', label: 'Imagine', sub: 'Get a seed', eyebrow: 'Dream Machine · Stage 01 · Imagine',
      h: 'How do you want to start?', s: 'Three doors, one seed of intent. Talk it out, describe it, or show what you love — or take the fast on-ramp and pick a direction.',
      nextLabel: 'Once you have a seed', nextTo: 'explore', nextVerb: 'Explore concepts' },
    { id: 'explore', n: '02', label: 'Explore', sub: 'Iterate concepts', eyebrow: 'Dream Machine · Stage 02 · Explore',
      h: "Push it until it's yours.", s: "Iterate the way you'd expect — more like this, variations, upscale. Blend styles, remix in the Alchemist, and tap any element to see what it's made of.",
      nextLabel: 'When a concept feels right', nextTo: 'shape', nextVerb: 'Shape it' },
    { id: 'shape', n: '03', label: 'Shape', sub: 'Dimension & site', eyebrow: 'Dream Machine · Stage 03 · Shape',
      h: 'Give it dimension and a site.', s: "Pull the concept onto the Architect's Table, tune the genome, and drop it on your real lot — sun, shadow, and the view from your kitchen window.",
      nextLabel: 'When the form is set', nextTo: 'realize', nextVerb: 'Realize the plans' },
    { id: 'realize', n: '04', label: 'Realize', sub: 'Plans & cost', eyebrow: 'Dream Machine · Stage 04 · Realize',
      h: "Here's what you'd build.", s: 'Floor plan, elevations, and site plan as a clean schematic — with the material schedule, cost breakdown, and code-compliance overlay from the Knowledge Garden.',
      nextLabel: 'When the sheet checks out', nextTo: 'build', nextVerb: 'Make it real' },
    { id: 'build', n: '05', label: 'Build', sub: 'Port to Killer App', eyebrow: 'Dream Machine · Stage 05 · Build',
      h: 'Make this real.', s: 'One action ports the whole dream into a Killer App project — scope, budget, codes, materials, and style, pre-seeded into Size Up, Lock, and Plan.',
      nextLabel: null as string | null, nextTo: null as string | null, nextVerb: null as string | null },
  ],

  doors: [
    { id: 'talk', n: 'Door 01', t: 'Talk it out', d: 'Speak the dream in plain words. A live transcript runs as the first concept renders in.', foot: 'Voice · live render', icon: 'mic' },
    { id: 'describe', n: 'Door 02', t: 'Describe it', d: 'Type it, or start from what you already know — budget, lot, beds and baths, jurisdiction.', foot: 'Constraint-first', icon: 'type' },
    { id: 'show', n: 'Door 03', t: 'Show me', d: 'Drop 1–20 images you love. The garden reads the style DNA out of what you saved.', foot: 'Vision · style DNA', icon: 'image' },
  ],
  transcript: [
    { who: 'You', t: 'A hillside place, lots of glass facing the valley, warm wood inside…' },
    { who: 'Garden', t: 'Two stories on the downslope, cantilevered living room — checking the lateral system.' },
  ],
  constraints: [
    { k: 'Budget', v: '$1.65M' }, { k: 'Lot', v: '0.34 ac · hillside' },
    { k: 'Beds / baths', v: '5 / 4' }, { k: 'Jurisdiction', v: 'SF · R-1' },
  ],
  styles: [
    { id: 'warm-mod', nm: 'Warm modernist', dd: 'wood, glass, low roof', img: IMGS.structural },
    { id: 'hillside', nm: 'Hillside contemporary', dd: 'stacked, cantilever', img: IMGS.build },
    { id: 'craft', nm: 'New craftsman', dd: 'gable, deep eaves', img: IMGS.sketch },
    { id: 'quiet', nm: 'Quiet brutalist', dd: 'board-form, mass', img: IMGS.sizeup },
  ],

  concepts: [
    { id: 'c1', nm: 'Valley-glass massing', mt: 'Seed · warm modernist', tag: 'Seed', img: IMGS.structural },
    { id: 'c2', nm: 'Cantilever, option B', mt: 'Variation · +38 sqft', tag: 'Var · B', img: IMGS.build },
    { id: 'c3', nm: 'Stacked downslope', mt: 'More like this', tag: 'Iterate', img: IMGS.sequencing },
    { id: 'c4', nm: 'Deep-eave craft hybrid', mt: 'Blend · 60 / 40', tag: 'Blend', img: IMGS.sketch },
    { id: 'c5', nm: 'Board-form mass', mt: 'Alchemist remix', tag: 'Remix', img: IMGS.sizeup },
    { id: 'c6', nm: 'Garden-court scheme', mt: 'Upscaled · 4K', tag: 'Upscale', img: IMGS.tree },
  ],
  conceptActs: ['More like this', 'Variations', 'Upscale'],
  blend: [
    { id: 'warm-mod', nm: 'Warm mod.', pc: 60 },
    { id: 'hillside', nm: 'Hillside', pc: 40 },
    { id: 'craft', nm: 'Craft', pc: 0 },
  ],
  ingredients: ['Warm modernist', 'Board-form concrete', 'Your valley view', 'Deep eaves'],
  recipe: 'Reads as: a board-formed base anchoring a warm-wood upper that opens to the valley — eaves deep enough for the west sun.',
  hotspots: [
    { id: 'h1', x: 26, y: 40, nm: 'Floor-to-ceiling glazing', dd: 'Triple-glazed, west wall', price: '$48 / sqft', code: 'Title 24 · solar gain ok', supplier: 'Western Window Sys.', mat: 'Aluminium-clad, low-E' },
    { id: 'h2', x: 58, y: 62, nm: 'Board-form concrete base', dd: 'Retaining + plinth', price: '$310 / cy', code: 'Hillside · geotech req.', supplier: 'Bay Aggregate', mat: 'Board-formed, sealed' },
    { id: 'h3', x: 72, y: 30, nm: 'Standing-seam roof', dd: 'Low-slope, 2:12', price: '$14 / sqft', code: 'Class A fire ok', supplier: 'Tahoe Metals', mat: 'Zinc-grey steel' },
  ],

  genome: [
    { id: 'stories', nm: 'Stories', min: 1, max: 3, step: 1, val: 2, unit: '', fmt: (v: number) => v + (v === 1 ? ' storey' : ' stories') },
    { id: 'footprint', nm: 'Footprint', min: 1400, max: 2600, step: 50, val: 1850, unit: 'sqft', fmt: (v: number) => v.toLocaleString() + ' sqft' },
    { id: 'roof', nm: 'Roof pitch', min: 0, max: 12, step: 1, val: 2, unit: ':12', fmt: (v: number) => v + ':12' },
    { id: 'window', nm: 'Window ratio', min: 20, max: 80, step: 5, val: 55, unit: '%', fmt: (v: number) => v + '% glazed' },
    { id: 'ceiling', nm: 'Ceiling height', min: 8, max: 14, step: 0.5, val: 10, unit: 'ft', fmt: (v: number) => v + ' ft' },
  ] as GenomeParam[],
  tableThumbs: [IMGS.structural, IMGS.build, IMGS.sketch, IMGS.sizeup],

  schedule: [
    { it: 'Board-form concrete', sp: 'Foundation · retaining', qty: '212 cy', cost: '$65,720' },
    { it: 'Glulam frame', sp: 'Cantilever + roof', qty: '18,400 bf', cost: '$92,400' },
    { it: 'Aluminium-clad glazing', sp: 'West + valley walls', qty: '1,240 sqft', cost: '$59,520' },
    { it: 'Standing-seam roof', sp: 'Low-slope 2:12', qty: '3,200 sqft', cost: '$44,800' },
    { it: 'Wood cladding + interior', sp: 'Cedar rainscreen', qty: '2,950 sqft', cost: '$38,350' },
  ],
  scheduleTotal: '$300,790',
  codes: [
    { nm: 'Hillside setback', sp: 'SF Planning · §242', state: 'ok' },
    { nm: 'Lateral / seismic', sp: 'CBC · Ch. 16', state: 'ok' },
    { nm: 'Egress + stair', sp: 'CBC · §1011', state: 'ok' },
    { nm: 'Lot coverage', sp: 'R-1 · 45% max', state: 'watch', note: 'at 44% — near limit' },
    { nm: 'Energy · Title 24', sp: 'Solar / glazing', state: 'watch', note: 'west glazing — add shade' },
  ] as { nm: string; sp: string; state: 'ok' | 'watch'; note?: string }[],
  sheetTabs: [
    { id: 'plan', label: 'Floor plan' },
    { id: 'elev', label: 'Elevations' },
    { id: 'site', label: 'Site plan' },
  ],

  carry: [
    { k: 'Scope & design', v: 'Valley-glass scheme, 2 stories, 1,850 sqft', dest: '→ Size Up' },
    { k: 'The lot', v: '0.34 ac hillside, placed + oriented', dest: '→ Size Up' },
    { k: 'Budget baseline', v: '$300,790 materials · $1.65M target', dest: '→ Lock' },
    { k: 'Codes & compliance', v: '5 checks · 2 to watch', dest: '→ Plan' },
    { k: 'Material schedule', v: '5 line items, supplier-matched', dest: '→ Plan' },
    { k: 'Architectural style', v: 'Warm modernist · 60 / 40 blend', dest: '→ Plan' },
  ],
};

export type DM2Data = typeof DM2;
