#!/usr/bin/env node
/**
 * catalog-marin-assets.mjs — backfill catalog rows for the Marin fidelity set
 * ----------------------------------------------------------------------------
 * Marin's 8 portal images are already in the bucket (assets/bkg/fidelity/*.png)
 * but were never cataloged — the original stage-fidelity-assets.mjs insert was
 * broken against the live public.brand_assets schema. This script does NOT
 * re-render or re-upload; it only upserts the 8 catalog rows for the EXISTING
 * objects, using the same schema-verified shape as stage-sf-fourplex-assets.mjs.
 *
 * FOUNDER-RUN (constitution: founder/service-role promotes; Code never promotes
 * unsupervised). Run where the real creds live:
 *   node --env-file=.env catalog-marin-assets.mjs --dry-run     # plan only
 *   node --env-file=.env catalog-marin-assets.mjs --go          # upsert as DRAFT
 *   node --env-file=.env catalog-marin-assets.mjs --go --publish # + status=published, approved
 *
 * Idempotent (upsert on slug). Refuses to write without Supabase url + key.
 */

const REG = "Architect's hand-drawn study on aged cream paper, fine ink-graphite linework with light specimen-teal wash and brass accents, faint herbarium-plate grid and dimension annotations, restrained and elegant, no color beyond cream/teal/brass/graphite, no pure white, no red, no photographic rendering — a working drawing, not a render. ";

const ASSETS = [
  { slug:'hero-marin-farmhouse-golden-a', kind:'hero', model:'black-forest-labs/flux-1.1-pro',
    intended_use:['hero','where-the-build-stands'], params:{ aspect_ratio:'16:9', seed:420017, output_format:'png', prompt_upsampling:true, safety_tolerance:2 },
    prompt:"Cinematic architectural photograph of a modern farmhouse under construction on an oak-studded golden hillside in Marin County, California, at golden hour. Wide establishing shot, low warm sun raking from the left casting long soft shadows. Board-and-batten cladding in warm cream and aged vellum tones, standing-seam metal roof in soft brass, large black-framed windows, a generous covered porch; framing and scaffolding still visible on one wing to read as 42% built. Dry golden grass, coastal live oaks, distant blue-green ridgeline. Palette strictly warm cream, vellum, brass, amber, with cool teal shadows; muted and filmic, no oversaturation. Shot on medium-format, 35mm-equivalent, deep depth of field, fine natural grain, calm and aspirational. No people, no signage, no text, no pure white, no bright red." },
  { slug:'hero-marin-farmhouse-golden-b', kind:'hero', model:'black-forest-labs/flux-1.1-pro',
    intended_use:['hero','where-the-build-stands'], params:{ aspect_ratio:'16:9', seed:420042, output_format:'png', prompt_upsampling:true, safety_tolerance:2 },
    prompt:"Cinematic architectural photograph of a modern Marin County farmhouse at the golden-to-blue dusk transition, three-quarter front angle. Warm interior light glowing amber through large windows against a cooling teal sky; gabled board-and-batten volumes in cream and vellum, soft-brass metal roof, deep porch shadows. A partially framed addition with exposed timber on the right edge reads the build as mid-progress. Foreground of golden grass and a live oak silhouette, hillside falling away to a hazy ridge. Strictly herbarium palette — cream, vellum, brass, amber warmth, teal-deep shadow; filmic, restrained, slight haze. Medium-format look, shallow-to-deep focus, fine grain. No people, no text, no signage, no pure white, no fire-engine red." },
  { slug:'study-massing-options', kind:'study', model:'black-forest-labs/flux-dev',
    intended_use:['dream-machine','in-motion-card'], params:{ aspect_ratio:'4:5', seed:770301, guidance:3, num_inference_steps:34, output_format:'png', negative_prompt:'photographic, 3d render, color photo, pure white background, red, neon, watermark, paragraphs of text, perspective photo' },
    prompt:REG+"Three small axonometric massing studies of a 4,000 sqft modern farmhouse side by side — a long single bar, an L-wing around a courtyard, and a split gable-plus-shed pairing — each a clean block diagram with roof-pitch lines and a tiny north arrow, sitting on a Marin hillside contour." },
  { slug:'study-clearance', kind:'study', model:'black-forest-labs/flux-dev',
    intended_use:['dream-machine','in-motion-card'], params:{ aspect_ratio:'4:5', seed:770302, guidance:3, num_inference_steps:34, output_format:'png', negative_prompt:'photographic, 3d render, color photo, pure white background, red, neon, watermark, paragraphs of text, perspective photo' },
    prompt:REG+"A site-plan clearance study of the farmhouse footprint with property-line setbacks dimensioned, driveway turning radius, defensible-space vegetation offset, and eave-overhang clearances called out with thin leader lines and figures; calm technical drawing." },
  { slug:'study-daylight', kind:'study', model:'black-forest-labs/flux-dev',
    intended_use:['dream-machine','in-motion-card'], params:{ aspect_ratio:'4:5', seed:770303, guidance:3, num_inference_steps:34, output_format:'png', negative_prompt:'photographic, 3d render, color photo, pure white background, red, neon, watermark, paragraphs of text, perspective photo' },
    prompt:REG+"A building-section daylight study through the great room and loft, warm amber sun-path arcs at morning/noon/evening, dashed daylight-penetration rays reaching the floor plan, glazing and overhang depths annotated; teal-shaded interior volume." },
  { slug:'thumb-site-framing', kind:'thumb', model:'black-forest-labs/flux-1.1-pro',
    intended_use:['field-log','plate-thumb'], params:{ aspect_ratio:'1:1', seed:651101, output_format:'png', prompt_upsampling:true, safety_tolerance:2 },
    prompt:"Documentary site photograph, square crop: timber wall framing and floor joists of a house under construction on a golden Marin hillside, late-afternoon warm light, sawdust and lumber stacks, a wheelbarrow; honest jobsite feel. Warm cream/amber tones with cool teal shadow, muted and filmic. No people, no text, no pure white, no bright red." },
  { slug:'thumb-material-detail', kind:'thumb', model:'black-forest-labs/flux-1.1-pro',
    intended_use:['field-log','plate-thumb'], params:{ aspect_ratio:'1:1', seed:651102, output_format:'png', prompt_upsampling:true, safety_tolerance:2 },
    prompt:"Close-up square photograph of a neat stack of board-and-batten cladding and a coil of soft-brass standing-seam roofing on aged kraft paper, raking golden-hour light, shallow depth of field, fine grain. Herbarium-warm palette — cream, vellum, brass, amber, teal shadow. No text, no pure white, no fire-engine red." },
  { slug:'thumb-detail-sketch', kind:'thumb', model:'black-forest-labs/flux-dev',
    intended_use:['field-log','plate-thumb'], params:{ aspect_ratio:'1:1', seed:651103, guidance:3, num_inference_steps:30, output_format:'png', negative_prompt:'photo, color, pure white, red, watermark, paragraph text' },
    prompt:REG+"A small square detail sketch of a roof eave and rafter-to-wall connection, a few dimension figures and a material note, drawn by an architect's hand." },
];

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const GO = has('--go');
const DRY = !GO || has('--dry-run');
const PUBLISH = has('--publish');

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_CREATOR_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CATALOG_PREFIX = 'bkg/fidelity';

const log  = (...a) => console.log(...a);
const die  = (m) => { console.error('✖ ' + m); process.exit(1); };

// schema-verified mappings (live public.brand_assets CHECK constraints)
const ASSET_TYPE = { hero: 'illustration', study: 'plate', thumb: 'illustration' };
const RENDITION  = { hero: 'hero',         study: 'original', thumb: 'thumb' };
const prettyName = (slug) => slug.replace(/^(hero|study|thumb)-(marin-farmhouse-)?/, '').replace(/-/g, ' ');
const titleFor = (a) => `Marin Farmhouse · ${a.kind === 'study' ? 'Study' : a.kind === 'hero' ? 'Hero' : 'Plate'} · ${prettyName(a.slug)}`;

function rowFor(a) {
  return {
    bucket: 'brand-assets',
    storage_path: `${CATALOG_PREFIX}/${a.slug}.png`,
    filename: `${a.slug}.png`,
    mime_type: 'image/png',
    slug: `bkg-${a.slug}`,
    key: `fidelity.${a.slug}`,
    title: titleFor(a),
    asset_type: ASSET_TYPE[a.kind] || 'illustration',
    garden_scope: 'bkg',
    status: PUBLISH ? 'published' : 'draft',
    approved_for_production: PUBLISH,
    visibility: 'system',
    rendition_role: RENDITION[a.kind] || 'original',
    generator: 'flux',
    model: a.model,
    prompt: a.prompt,
    params: a.params,
    intended_use: a.intended_use,
    metadata: { source: 'marin-portal-seed', backfill: true },
  };
}

log('\n=== Marin fidelity catalog backfill (no re-render) ===');
log(`mode: ${DRY ? 'DRY-RUN (no writes)' : 'GO'} · ${PUBLISH ? 'status=PUBLISHED + approved' : 'status=draft'}`);
log(`assets: ${ASSETS.map(a => a.slug).join(', ')}\n`);

if (DRY) {
  for (const a of ASSETS) { const r = rowFor(a); log(`• ${r.slug}  [${r.asset_type}/${r.rendition_role}]  storage_path=${r.storage_path}`); }
  log('\nDry run only. Re-run with --go (and creds) to upsert. Add --publish to take live.');
  process.exit(0);
}
if (!SB_URL || !SB_KEY) die('Supabase URL/key not set. Run from where creds live: node --env-file=.env catalog-marin-assets.mjs --go');

let ok = 0;
for (const a of ASSETS) {
  const row = rowFor(a);
  const res = await fetch(`${SB_URL}/rest/v1/brand_assets?on_conflict=slug`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SB_KEY}`, apikey: SB_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(row),
  });
  if (!res.ok) { console.error(`✖ ${row.slug}: ${res.status} ${await res.text()}`); continue; }
  const out = (await res.json())[0];
  log(`✓ ${row.slug} → ${out?.status} (approved=${out?.approved_for_production})`);
  ok++;
}
log(`\nDone. ${ok}/${ASSETS.length} cataloged.${PUBLISH ? ' Live (published + approved).' : ' Draft — add --publish to take live.'}`);
