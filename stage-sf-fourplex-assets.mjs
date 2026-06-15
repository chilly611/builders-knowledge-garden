#!/usr/bin/env node
/**
 * stage-sf-fourplex-assets.mjs — SF Fourplex portal-imagery staging
 * ----------------------------------------------------------------------------
 * The SF Fourplex parallel to stage-fidelity-assets.mjs (the Marin seed set).
 * Same brand render-register, same asset taxonomy (hero / study / thumb), new
 * subject from the SF Fourplex seed spec, distinct seeds, namespaced slugs so
 * the two seed sets coexist in brand-assets/assets/bkg/fidelity/ without
 * collision. See docs/design/seed-and-portals.md (§ Seed set) and
 * docs/design/sf-fourplex-seed-spec.md (§ Visual seed set).
 *
 * SAFETY / LANE RULES (enforced in code):
 *   • LOCAL-ONLY by default. Generates to ./fidelity-out-sf/ and stops. The
 *     shared brand-assets bucket is PRODUCTION — uploading there is a supervised,
 *     founder-run step, so it is OFF unless you pass --upload explicitly.
 *   • Never promotes. Any catalog row is status='draft' only; there is NO code
 *     path that sets approved / promoted / production.
 *   • No spend without --go. Default is --dry-run (prints the plan, calls nothing).
 *   • Refuses to generate without REPLICATE_API_TOKEN.
 *   • Refuses to upload without --upload AND Supabase url + a key.
 *   • Catalog insert is OFF unless --upload AND --catalog AND --schema-confirmed,
 *     because the exact public.brand_assets column set must be confirmed first.
 *
 * Zero npm deps — Node 18+ (global fetch). Run where your real creds live:
 *   node stage-sf-fourplex-assets.mjs --dry-run                 # plan only
 *   node --env-file=.env stage-sf-fourplex-assets.mjs --go      # generate LOCAL only
 *   ... --go --only=hero-sf-fourplex-golden-a,study-sf-light-well
 *   ... --go --upload                                           # also stage drafts to bucket (supervised)
 *   ... --go --upload --catalog --schema-confirmed             # + draft catalog rows (after confirming columns)
 *
 * SUPABASE_CREATOR_KEY should be a CREATOR-scoped key/JWT (draft-only RLS).
 * If you pass a service-role key, the script STILL only writes draft — but
 * service-role bypasses RLS, so prefer a creator credential.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// --------------------------- project profile -------------------------------
// Variable layer (per seed-and-portals.md §3) — pulled from the SF Fourplex
// seed spec. The render-register below is the brand CONSTANT; only these
// substitutions change between projects.
const PROFILE = {
  buildingType: 'four-unit ground-up infill multifamily building',
  grossSqft: 5200,
  unitMix: 'two 2-bed/2-bath units over two 1-bed/1-bath units',
  stories: '4 stories (3 residential over a ground-floor garage)',
  location: 'a narrow San Francisco infill lot',
  vernacular: 'contemporary San Francisco vernacular — stacked square bay windows, mixed warm cream fiber-cement and vellum-toned smooth stucco cladding, large black-framed windows, soft-brass metal trim',
  stage: 'Build',
  progress: 42, // % — drives the construction cues (scaffolding / exposed framing)
};

// --------------------------- render register -------------------------------
// CONSTANT across every project & user (the brand lock). Identical to the
// Marin staging script so both seed sets share one look.
const REG = "Architect's hand-drawn study on aged cream paper, fine ink-graphite linework with light specimen-teal wash and brass accents, faint herbarium-plate grid and dimension annotations, restrained and elegant, no color beyond cream/teal/brass/graphite, no pure white, no red, no photographic rendering — a working drawing, not a render. ";

const ASSETS = [
  { slug:'hero-sf-fourplex-golden-a', kind:'hero', model:'black-forest-labs/flux-1.1-pro',
    intended_use:['hero','where-the-build-stands'], params:{ aspect_ratio:'16:9', seed:430017, output_format:'png', prompt_upsampling:true, safety_tolerance:2 },
    prompt:"Cinematic architectural photograph of a four-unit infill multifamily building under construction on a San Francisco street, golden hour. Wide establishing three-quarter shot, low warm sun raking from the left casting long soft shadows. Contemporary San Francisco vernacular — stacked square bay windows, a vertical four-story massing set over a ground-floor garage, mixed cladding of warm cream fiber-cement and vellum-toned smooth stucco, large black-framed windows, soft-brass metal trim. Scaffolding and exposed stud framing on the upper two floors read the build as 42% complete. Neighboring Edwardian facades softly out of focus, a street tree, power lines. Palette strictly warm cream, vellum, brass, amber, with cool teal shadows; muted and filmic, no oversaturation. Shot on medium-format, 35mm-equivalent, deep depth of field, fine natural grain, calm and aspirational. No people, no signage, no text, no pure white, no bright red." },

  { slug:'hero-sf-fourplex-golden-b', kind:'hero', model:'black-forest-labs/flux-1.1-pro',
    intended_use:['hero','where-the-build-stands'], params:{ aspect_ratio:'16:9', seed:430042, output_format:'png', prompt_upsampling:true, safety_tolerance:2 },
    prompt:"Cinematic architectural photograph of a San Francisco four-unit infill building at the golden-to-blue dusk transition, tight three-quarter street angle looking up the vertical massing. Warm interior light glowing amber through stacked bay windows against a cooling teal sky; cream fiber-cement and vellum stucco volumes, soft-brass window trim, the open ground-floor garage dark and deep. The top floor still in exposed framing with house-wrap on one bay reads the build as mid-progress. Foreground sidewalk, a parked-car silhouette and a street tree; the row of neighboring rooflines falling away. Strictly herbarium palette — cream, vellum, brass, amber warmth, teal-deep shadow; filmic, restrained, slight evening haze. Medium-format look, shallow-to-deep focus, fine grain. No people, no text, no signage, no pure white, no fire-engine red." },

  { slug:'study-sf-massing-options', kind:'study', model:'black-forest-labs/flux-dev',
    intended_use:['dream-machine','in-motion-card'], params:{ aspect_ratio:'4:5', seed:780304, guidance:3, num_inference_steps:34, output_format:'png',
      negative_prompt:'photographic, 3d render, color photo, pure white background, red, red marker, red ink, colored accent, neon, watermark, paragraphs of text, perspective photo' },
    prompt:REG+"Three small axonometric massing studies of a 5,200 sqft four-unit infill building side by side — a single stacked bar, a U-plan wrapping a central light well, and a front-and-rear pairing over a shared garage — each a clean block diagram with floor-line ticks, unit-stacking labels (two 2-bed over two 1-bed), and a tiny north arrow, sitting on a narrow San Francisco lot with dashed setback lines." },

  { slug:'study-sf-stacking-clearance', kind:'study', model:'black-forest-labs/flux-dev',
    intended_use:['dream-machine','in-motion-card'], params:{ aspect_ratio:'4:5', seed:780302, guidance:3, num_inference_steps:34, output_format:'png',
      negative_prompt:'photographic, 3d render, color photo, pure white background, red, neon, watermark, paragraphs of text, perspective photo' },
    prompt:REG+"A site-plan and stacking clearance study of the four-unit footprint on a narrow San Francisco infill lot — front and rear setbacks dimensioned, required rear-yard open space, garage curb-cut and driveway width, unit-separation and exit-stair egress paths called out with thin leader lines and figures; calm technical drawing." },

  { slug:'study-sf-light-well', kind:'study', model:'black-forest-labs/flux-dev',
    intended_use:['dream-machine','in-motion-card'], params:{ aspect_ratio:'4:5', seed:780303, guidance:3, num_inference_steps:34, output_format:'png',
      negative_prompt:'photographic, 3d render, color photo, pure white background, red, neon, watermark, paragraphs of text, perspective photo' },
    prompt:REG+"A building-section daylight study through the central light well and exit stair of the four-story stack, warm amber sun-path arcs at morning/noon/evening, dashed daylight-penetration rays reaching the lower units, window-head heights and overhang depths annotated; teal-shaded interior volumes, one per floor." },

  { slug:'thumb-sf-site-framing', kind:'thumb', model:'black-forest-labs/flux-1.1-pro',
    intended_use:['field-log','plate-thumb'], params:{ aspect_ratio:'1:1', seed:661101, output_format:'png', prompt_upsampling:true, safety_tolerance:2 },
    prompt:"Documentary site photograph, square crop: stacked timber and light-steel floor framing and a concrete stair-and-elevator shaft of a multi-unit building under construction on a San Francisco lot, late-afternoon warm light, lumber stacks and a poured garage slab, an honest urban jobsite feel. Warm cream and amber tones with cool teal shadow, muted and filmic. No people, no text, no pure white, no bright red." },

  { slug:'thumb-sf-material-detail', kind:'thumb', model:'black-forest-labs/flux-1.1-pro',
    intended_use:['field-log','plate-thumb'], params:{ aspect_ratio:'1:1', seed:661102, output_format:'png', prompt_upsampling:true, safety_tolerance:2 },
    prompt:"Close-up square photograph of neatly arranged fiber-cement cladding samples, a smooth-stucco corner mock-up, and a coil of soft-brass window flashing on aged kraft paper, raking golden-hour light, shallow depth of field, fine grain. Herbarium-warm palette — cream, vellum, brass, amber, teal shadow. No text, no pure white, no fire-engine red." },

  { slug:'thumb-sf-detail-sketch', kind:'thumb', model:'black-forest-labs/flux-dev',
    intended_use:['field-log','plate-thumb'], params:{ aspect_ratio:'1:1', seed:661103, guidance:3, num_inference_steps:30, output_format:'png',
      negative_prompt:'photo, color, pure white, red, watermark, paragraph text' },
    prompt:REG+"A small square detail sketch of a projecting bay-window-to-wall waterproofing and head-flashing detail, a few dimension figures and a material note, drawn by an architect's hand." },
];

// ----------------------------- args / env ----------------------------------
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const GO = has('--go');
const DRY = !GO || has('--dry-run');
const UPLOAD = has('--upload');                         // shared-bucket write is opt-in
const DO_CATALOG = UPLOAD && has('--catalog') && has('--schema-confirmed');
const onlyArg = (argv.find(a => a.startsWith('--only=')) || '').split('=')[1];
const ONLY = onlyArg ? new Set(onlyArg.split(',').map(s => s.trim())) : null;

const REPLICATE = process.env.REPLICATE_API_TOKEN;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_CREATOR_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SB_KEY_IS_SERVICE = !!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_CREATOR_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const BUCKET = 'brand-assets';
const PREFIX = 'assets/bkg/fidelity';          // public object path
const CATALOG_PREFIX = 'bkg/fidelity';         // storage_path in the row (assets/ stripped)
const OUT_DIR = path.resolve('fidelity-out-sf');  // local copies + manifest

const log  = (...a) => console.log(...a);
const warn = (...a) => console.warn('⚠ ', ...a);
const die  = (m) => { console.error('✖ ' + m); process.exit(1); };

// ----------------------------- helpers --------------------------------------
async function replicateRun(asset) {
  const url = `https://api.replicate.com/v1/models/${asset.model}/predictions`;
  const body = { input: { prompt: asset.prompt, ...asset.params } };
  let res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REPLICATE}`, 'Content-Type': 'application/json', Prefer: 'wait' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Replicate ${res.status}: ${await res.text()}`);
  let pred = await res.json();
  const t0 = Date.now();
  while (pred.status && !['succeeded','failed','canceled'].includes(pred.status)) {
    if (Date.now() - t0 > 180000) throw new Error('timeout polling prediction');
    await new Promise(r => setTimeout(r, 2500));
    const p = await fetch(pred.urls.get, { headers: { Authorization: `Bearer ${REPLICATE}` } });
    pred = await p.json();
  }
  if (pred.status === 'failed') throw new Error('prediction failed: ' + JSON.stringify(pred.error));
  const out = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  if (!out) throw new Error('no output url');
  return { url: out, predictionId: pred.id };
}

async function uploadDraft(slug, bytes) {
  const objectPath = `${PREFIX}/${slug}.png`;
  const res = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SB_KEY}`, apikey: SB_KEY, 'Content-Type': 'image/png', 'x-upsert': 'true' },
    body: bytes,
  });
  if (!res.ok) throw new Error(`storage upload ${res.status}: ${await res.text()}`);
  return `${SB_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

async function insertDraftRow(asset, storagePath, publicUrl, predictionId) {
  const row = {
    garden_scope: 'bkg',
    asset_type: asset.kind === 'study' ? 'diagram' : 'image',
    slug: `bkg-${asset.slug}`,
    storage_path: `${CATALOG_PREFIX}/${asset.slug}`,
    status: 'draft',                      // <<< the only status this script ever writes
    generator: 'replicate',
    model: asset.model,
    prompt: asset.prompt,
    params: asset.params,
    provenance: { source: 'sf-fourplex-portal-seed', prediction_id: predictionId, public_url: publicUrl },
    intended_use: asset.intended_use,
  };
  const res = await fetch(`${SB_URL}/rest/v1/brand_assets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SB_KEY}`, apikey: SB_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`catalog insert ${res.status}: ${await res.text()}`);
  return (await res.json())[0];
}

// ----------------------------- main -----------------------------------------
const queue = ASSETS.filter(a => !ONLY || ONLY.has(a.slug));

log('\n=== SF Fourplex portal-imagery staging ===');
log(`project: ${PROFILE.buildingType}, ${PROFILE.location} · ${PROFILE.stage} ${PROFILE.progress}%`);
log(`mode: ${DRY ? 'DRY-RUN (no API calls, no spend)' : 'GO (will generate)'}`);
log(`destination: ${UPLOAD ? 'LOCAL + bucket draft upload' : 'LOCAL ONLY (./fidelity-out-sf/) — pass --upload to also stage drafts'}`);
log(`assets: ${queue.map(a => a.slug).join(', ')}`);
log(`catalog insert: ${DO_CATALOG ? 'ON (draft rows)' : 'OFF'}\n`);

if (DRY) {
  for (const a of queue) log(`• ${a.slug}  [${a.model}]  ${JSON.stringify(a.params)}`);
  log('\nDry run only. Re-run with --go (and creds) to generate.');
  process.exit(0);
}

if (!REPLICATE) die('REPLICATE_API_TOKEN not set — refusing to generate. Run with: node --env-file=.env stage-sf-fourplex-assets.mjs --go');
if (UPLOAD) {
  if (!SB_URL || !SB_KEY) die('--upload set but Supabase URL/key missing. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_CREATOR_KEY, or drop --upload to stay local.');
  if (SB_KEY_IS_SERVICE) warn('Using SERVICE_ROLE key — it bypasses RLS. Script still writes draft only, but a CREATOR key is preferred.');
}
if (has('--catalog') && !UPLOAD) warn('--catalog ignored: it requires --upload.');
if (UPLOAD && has('--catalog') && !has('--schema-confirmed')) warn('--catalog ignored: pass --schema-confirmed after verifying public.brand_assets columns.');

await mkdir(OUT_DIR, { recursive: true });
const manifest = [];
for (const a of queue) {
  try {
    log(`→ generating ${a.slug} …`);
    const { url, predictionId } = await replicateRun(a);
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    await writeFile(path.join(OUT_DIR, `${a.slug}.png`), bytes);
    let publicUrl = null, rowId = null;
    if (UPLOAD) {
      log(`  ↳ uploading draft → ${PREFIX}/${a.slug}.png`);
      publicUrl = await uploadDraft(a.slug, bytes);
      if (DO_CATALOG) { const row = await insertDraftRow(a, `${CATALOG_PREFIX}/${a.slug}`, publicUrl, predictionId); rowId = row?.id ?? null; log(`  ↳ catalog draft row ${rowId}`); }
    }
    manifest.push({ slug:a.slug, model:a.model, params:a.params, prediction_id:predictionId, public_url:publicUrl, storage_path:`${CATALOG_PREFIX}/${a.slug}`, status:'draft', catalog_row_id:rowId });
    log(`  ✓ ${a.slug}`);
  } catch (e) {
    warn(`${a.slug} FAILED: ${e.message}`);
    manifest.push({ slug:a.slug, error:String(e.message), status:'error' });
  }
}
await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify({ generated_at:new Date().toISOString(), project:'sf-fourplex', local_only:!UPLOAD, draft_only:true, promoted:false, assets:manifest }, null, 2));
log(`\nDone. Local copies + manifest in ${OUT_DIR}/.${UPLOAD ? ' Bucket copies staged as DRAFT.' : ' Nothing uploaded (local only).'} Promotion is founder/service-role — not done here.`);
