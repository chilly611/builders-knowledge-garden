#!/usr/bin/env node
/**
 * stage-fidelity-assets.mjs — Killer App fidelity pass image staging (DRAFT-ONLY)
 * ----------------------------------------------------------------------------
 * Generates the fidelity-pass assets on Replicate FLUX and stages them
 * draft-only into the brand-assets bucket. Engine-agnostic-friendly.
 *
 * SAFETY / LANE RULES (enforced in code):
 *   • Never promotes. Catalog rows are written with status='draft' only; this
 *     script contains NO code path that sets approved/promoted/production.
 *   • No spend without --go. Default is --dry-run (prints the plan, calls nothing).
 *   • Refuses to run generation without REPLICATE_API_TOKEN.
 *   • Refuses bucket upload without SUPABASE url + a key.
 *   • Catalog insert is OFF unless --catalog AND --schema-confirmed are passed,
 *     because the exact public.brand_assets column set must be confirmed first.
 *
 * Zero npm deps — Node 18+ (global fetch). Run where your real creds live:
 *   node stage-fidelity-assets.mjs --dry-run
 *   node --env-file=.env stage-fidelity-assets.mjs --go
 *   ... --go --only=hero-marin-farmhouse-golden-a,study-daylight
 *   ... --go --catalog --schema-confirmed     (only after confirming columns)
 *
 * SUPABASE_CREATOR_KEY should be a CREATOR-scoped key/JWT (draft-only RLS).
 * If you pass a service-role key, the script STILL only writes draft — but
 * service-role bypasses RLS, so prefer a creator credential.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// ----------------------------- asset table ---------------------------------
// Keep in sync with fidelity-flux-prompts.md. Prompts trimmed for the array;
// edit here if you tweak the spec.
const REG = "Architect's hand-drawn study on aged cream paper, fine ink-graphite linework with light specimen-teal wash and brass accents, faint herbarium-plate grid and dimension annotations, restrained and elegant, no color beyond cream/teal/brass/graphite, no pure white, no red, no photographic rendering — a working drawing, not a render. ";

const ASSETS = [
  { slug:'hero-marin-farmhouse-golden-a', kind:'hero', model:'black-forest-labs/flux-1.1-pro',
    intended_use:['hero','where-the-build-stands'], params:{ aspect_ratio:'16:9', seed:420017, output_format:'png', prompt_upsampling:true, safety_tolerance:2 },
    prompt:"Cinematic architectural photograph of a modern farmhouse under construction on an oak-studded golden hillside in Marin County, California, at golden hour. Wide establishing shot, low warm sun raking from the left casting long soft shadows. Board-and-batten cladding in warm cream and aged vellum tones, standing-seam metal roof in soft brass, large black-framed windows, a generous covered porch; framing and scaffolding still visible on one wing to read as 42% built. Dry golden grass, coastal live oaks, distant blue-green ridgeline. Palette strictly warm cream, vellum, brass, amber, with cool teal shadows; muted and filmic, no oversaturation. Shot on medium-format, 35mm-equivalent, deep depth of field, fine natural grain, calm and aspirational. No people, no signage, no text, no pure white, no bright red." },

  { slug:'hero-marin-farmhouse-golden-b', kind:'hero', model:'black-forest-labs/flux-1.1-pro',
    intended_use:['hero','where-the-build-stands'], params:{ aspect_ratio:'16:9', seed:420042, output_format:'png', prompt_upsampling:true, safety_tolerance:2 },
    prompt:"Cinematic architectural photograph of a modern Marin County farmhouse at the golden-to-blue dusk transition, three-quarter front angle. Warm interior light glowing amber through large windows against a cooling teal sky; gabled board-and-batten volumes in cream and vellum, soft-brass metal roof, deep porch shadows. A partially framed addition with exposed timber on the right edge reads the build as mid-progress. Foreground of golden grass and a live oak silhouette, hillside falling away to a hazy ridge. Strictly herbarium palette — cream, vellum, brass, amber warmth, teal-deep shadow; filmic, restrained, slight haze. Medium-format look, shallow-to-deep focus, fine grain. No people, no text, no signage, no pure white, no fire-engine red." },

  { slug:'study-massing-options', kind:'study', model:'black-forest-labs/flux-dev',
    intended_use:['dream-machine','in-motion-card'], params:{ aspect_ratio:'4:5', seed:770301, guidance:3, num_inference_steps:34, output_format:'png',
      negative_prompt:'photographic, 3d render, color photo, pure white background, red, neon, watermark, paragraphs of text, perspective photo' },
    prompt:REG+"Three small axonometric massing studies of a 4,000 sqft modern farmhouse side by side — a long single bar, an L-wing around a courtyard, and a split gable-plus-shed pairing — each a clean block diagram with roof-pitch lines and a tiny north arrow, sitting on a Marin hillside contour." },

  { slug:'study-clearance', kind:'study', model:'black-forest-labs/flux-dev',
    intended_use:['dream-machine','in-motion-card'], params:{ aspect_ratio:'4:5', seed:770302, guidance:3, num_inference_steps:34, output_format:'png',
      negative_prompt:'photographic, 3d render, color photo, pure white background, red, neon, watermark, paragraphs of text, perspective photo' },
    prompt:REG+"A site-plan clearance study of the farmhouse footprint with property-line setbacks dimensioned, driveway turning radius, defensible-space vegetation offset, and eave-overhang clearances called out with thin leader lines and figures; calm technical drawing." },

  { slug:'study-daylight', kind:'study', model:'black-forest-labs/flux-dev',
    intended_use:['dream-machine','in-motion-card'], params:{ aspect_ratio:'4:5', seed:770303, guidance:3, num_inference_steps:34, output_format:'png',
      negative_prompt:'photographic, 3d render, color photo, pure white background, red, neon, watermark, paragraphs of text, perspective photo' },
    prompt:REG+"A building-section daylight study through the great room and loft, warm amber sun-path arcs at morning/noon/evening, dashed daylight-penetration rays reaching the floor plan, glazing and overhang depths annotated; teal-shaded interior volume." },

  { slug:'thumb-site-framing', kind:'thumb', model:'black-forest-labs/flux-1.1-pro',
    intended_use:['field-log','plate-thumb'], params:{ aspect_ratio:'1:1', seed:651101, output_format:'png', prompt_upsampling:true, safety_tolerance:2 },
    prompt:"Documentary site photograph, square crop: timber wall framing and floor joists of a house under construction on a golden Marin hillside, late-afternoon warm light, sawdust and lumber stacks, a wheelbarrow; honest jobsite feel. Warm cream/amber tones with cool teal shadow, muted and filmic. No people, no text, no pure white, no bright red." },

  { slug:'thumb-material-detail', kind:'thumb', model:'black-forest-labs/flux-1.1-pro',
    intended_use:['field-log','plate-thumb'], params:{ aspect_ratio:'1:1', seed:651102, output_format:'png', prompt_upsampling:true, safety_tolerance:2 },
    prompt:"Close-up square photograph of a neat stack of board-and-batten cladding and a coil of soft-brass standing-seam roofing on aged kraft paper, raking golden-hour light, shallow depth of field, fine grain. Herbarium-warm palette — cream, vellum, brass, amber, teal shadow. No text, no pure white, no fire-engine red." },

  { slug:'thumb-detail-sketch', kind:'thumb', model:'black-forest-labs/flux-dev',
    intended_use:['field-log','plate-thumb'], params:{ aspect_ratio:'1:1', seed:651103, guidance:3, num_inference_steps:30, output_format:'png',
      negative_prompt:'photo, color, pure white, red, watermark, paragraph text' },
    prompt:REG+"A small square detail sketch of a roof eave and rafter-to-wall connection, a few dimension figures and a material note, drawn by an architect's hand." },
];

// ----------------------------- args / env ----------------------------------
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const GO = has('--go');
const DRY = !GO || has('--dry-run');
const DO_CATALOG = has('--catalog') && has('--schema-confirmed');
const onlyArg = (argv.find(a => a.startsWith('--only=')) || '').split('=')[1];
const ONLY = onlyArg ? new Set(onlyArg.split(',').map(s => s.trim())) : null;

const REPLICATE = process.env.REPLICATE_API_TOKEN;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_CREATOR_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SB_KEY_IS_SERVICE = !!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_CREATOR_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const BUCKET = 'brand-assets';
const PREFIX = 'assets/bkg/fidelity';          // public object path
const CATALOG_PREFIX = 'bkg/fidelity';         // storage_path in the row (assets/ stripped)
const OUT_DIR = path.resolve('fidelity-out');  // local copies + manifest

const log  = (...a) => console.log(...a);
const warn = (...a) => console.warn('⚠ ', ...a);
const die  = (m) => { console.error('✖ ' + m); process.exit(1); };

// ----------------------------- helpers --------------------------------------
async function replicateRun(asset) {
  // model-scoped endpoint + Prefer: wait (blocks up to ~60s); fallback to poll.
  const url = `https://api.replicate.com/v1/models/${asset.model}/predictions`;
  const body = { input: { prompt: asset.prompt, ...asset.params } };
  let res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REPLICATE}`, 'Content-Type': 'application/json', Prefer: 'wait' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Replicate ${res.status}: ${await res.text()}`);
  let pred = await res.json();
  // poll if not finished
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

// Draft-only catalog insert. Column set is the KNOWN-from-session-log shape;
// confirm against the live public.brand_assets before using --catalog.
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
    provenance: { source: 'cowork-fidelity-pass', prediction_id: predictionId, public_url: publicUrl },
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

log('\n=== fidelity-pass staging — DRAFT ONLY (never promotes) ===');
log(`mode: ${DRY ? 'DRY-RUN (no API calls, no spend)' : 'GO (will generate + upload)'}`);
log(`assets: ${queue.map(a => a.slug).join(', ')}`);
log(`target: ${SB_URL ? SB_URL : '(no SUPABASE url)'} bucket=${BUCKET} path=${PREFIX}/<slug>.png`);
log(`catalog insert: ${DO_CATALOG ? 'ON (draft rows)' : 'OFF (pass --catalog --schema-confirmed to enable)'}\n`);

if (DRY) {
  for (const a of queue) log(`• ${a.slug}  [${a.model}]  ${JSON.stringify(a.params)}`);
  log('\nDry run only. Re-run with --go (and creds) to generate + stage.');
  process.exit(0);
}

if (!REPLICATE) die('REPLICATE_API_TOKEN not set — refusing to generate.');
if (!SB_URL || !SB_KEY) die('Supabase URL/key not set — refusing to upload. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_CREATOR_KEY.');
if (SB_KEY_IS_SERVICE) warn('Using SERVICE_ROLE key — it bypasses RLS. Script still writes draft only, but a CREATOR key is preferred.');
if (has('--catalog') && !has('--schema-confirmed')) warn('--catalog ignored: pass --schema-confirmed after verifying public.brand_assets columns.');

await mkdir(OUT_DIR, { recursive: true });
const manifest = [];
for (const a of queue) {
  try {
    log(`→ generating ${a.slug} …`);
    const { url, predictionId } = await replicateRun(a);
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    await writeFile(path.join(OUT_DIR, `${a.slug}.png`), bytes);
    log(`  ↳ uploading draft → ${PREFIX}/${a.slug}.png`);
    const publicUrl = await uploadDraft(a.slug, bytes);
    let rowId = null;
    if (DO_CATALOG) { const row = await insertDraftRow(a, `${CATALOG_PREFIX}/${a.slug}`, publicUrl, predictionId); rowId = row?.id ?? null; log(`  ↳ catalog draft row ${rowId}`); }
    manifest.push({ slug:a.slug, model:a.model, params:a.params, prediction_id:predictionId, public_url:publicUrl, storage_path:`${CATALOG_PREFIX}/${a.slug}`, status:'draft', catalog_row_id:rowId });
    log(`  ✓ ${a.slug}`);
  } catch (e) {
    warn(`${a.slug} FAILED: ${e.message}`);
    manifest.push({ slug:a.slug, error:String(e.message), status:'error' });
  }
}
await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify({ generated_at:new Date().toISOString(), draft_only:true, promoted:false, assets:manifest }, null, 2));
log(`\nDone. Local copies + manifest in ${OUT_DIR}/. All staged as DRAFT. Promotion is founder/service-role — not done here.`);
