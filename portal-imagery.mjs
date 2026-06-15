#!/usr/bin/env node
/**
 * portal-imagery.mjs — Work-in-Progress Portal Imagery staging (DRAFT-ONLY)
 * ----------------------------------------------------------------------------
 * Generalizes stage-fidelity-assets.mjs. Instead of a hardcoded Marin table it
 * is PROFILE-DRIVEN: a project profile {buildingType, location, style, stage,
 * progress} is poured into the CONSTANT herbarium render register (the brand
 * lock) to emit hero / study / thumb assets for ANY user, ANY building, ANY
 * style. Spec: docs/design/seed-and-portals.md (in bkg-killer-app-fidelity).
 *
 *   register (CONSTANT, §2)  +  substitutions (per-profile, §3)  =  the prompt
 *
 * Engines (§4): hero  → flux-1.1-pro, aspect_ratio "16:9"   (NEVER "21:9")
 *               study → flux-dev,     aspect_ratio "4:5"     (+ negative_prompt)
 *               thumb → 1:1           (photo = flux-1.1-pro, sketch = flux-dev)
 *
 * SAFETY / LANE RULES (enforced in code — same rails as the original):
 *   • Never promotes. Catalog/manifest rows are status='draft' only; there is
 *     NO code path that sets approved/promoted/production. Founder promotes.
 *   • No spend without --go. Default is --dry-run (prints the plan, calls nothing).
 *   • --emit-manifest writes the seed-set/plan JSON with NO API calls, NO creds
 *     (this is how you "stage" definitions safely).
 *   • Refuses to generate without REPLICATE_API_TOKEN.
 *   • bkg target refuses bucket upload without SUPABASE url + a key.
 *   • Catalog insert (bkg) is OFF unless --catalog AND --schema-confirmed.
 *   • PREFLIGHT GUARDS abort the run (dry OR go) if any asset violates the
 *     register: bad aspect ratio, 21:9, wrong model per kind, missing
 *     negative_prompt, or a banned color leaking into a positive prompt.
 *
 * Targets:
 *   --target=bkg       (default) → Supabase brand-assets bucket, draft rows.
 *                                   Archetypes: modern-farmhouse-marin (canonical
 *                                   demo, verbatim seeds), sf-infill-fourplex,
 *                                   adu, kitchen-remodel.
 *   --target=umbrella  → knowledge-gardens-root static asset path (file-drop
 *                                   contract). Umbrella surface heroes, same
 *                                   register. Writes seed-set.json; on --go
 *                                   writes <slug>.png into --umbrella-dir.
 *
 * Zero npm deps — Node 18+ (global fetch). Run where your real creds live:
 *   node portal-imagery.mjs --dry-run
 *   node portal-imagery.mjs --target=umbrella --emit-manifest      # creds-free
 *   node --env-file=.env portal-imagery.mjs --go --profile=adu
 *   node --env-file=.env portal-imagery.mjs --go --catalog --schema-confirmed
 *   node --env-file=.env portal-imagery.mjs --target=umbrella --go
 *
 * SUPABASE_CREATOR_KEY should be a CREATOR-scoped key/JWT (draft-only RLS).
 * If you pass a service-role key the script STILL only writes draft — but
 * service-role bypasses RLS, so prefer a creator credential.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// ============================================================================
//  THE RENDER REGISTER — CONSTANT across every user (the brand lock, spec §2)
// ============================================================================
// Studies: architect's hand-drawn working drawing (NOT a render).
const STUDY_REG = "Architect's hand-drawn study on aged cream paper, fine ink-graphite linework with light specimen-teal wash and brass accents, faint herbarium-plate grid and dimension annotations, restrained and elegant, no color beyond cream/teal/brass/graphite, no pure white, no red, no photographic rendering — a working drawing, not a render. ";
const REG = STUDY_REG; // alias so the Marin table reads verbatim from the original
const STUDY_NEG = 'photographic, 3d render, color photo, pure white background, red, neon, watermark, paragraphs of text, perspective photo';
const SKETCH_NEG = 'photo, color, pure white, red, watermark, paragraph text';

// Heroes / photo thumbs: cinematic herbarium photograph. The guard tail and the
// palette line are CONSTANT; only the subject changes per profile.
const HERO_GUARDS = 'No people, no signage, no text, no pure white, no fire-engine red, no neon, no fisheye.';
const THUMB_GUARDS = 'No text, no pure white, no fire-engine red.';
const PHOTO_PALETTE = 'warm cream, vellum, brass, amber, with cool teal shadows';

const HERO_MODEL  = 'black-forest-labs/flux-1.1-pro';
const STUDY_MODEL = 'black-forest-labs/flux-dev';

// Allowed FLUX aspect ratios (spec §4) — 21:9 is explicitly NOT here.
const ALLOWED_AR = new Set(['1:1','16:9','3:2','2:3','4:5','5:4','9:16','3:4','4:3']);

// Per-kind param factories.
const heroParams      = (seed) => ({ aspect_ratio:'16:9', seed, output_format:'png', prompt_upsampling:true, safety_tolerance:2 });
const photoThumbParams= (seed) => ({ aspect_ratio:'1:1',  seed, output_format:'png', prompt_upsampling:true, safety_tolerance:2 });
const studyParams     = (seed, steps=34) => ({ aspect_ratio:'4:5', seed, guidance:3, num_inference_steps:steps, output_format:'png', negative_prompt:STUDY_NEG });
const sketchThumbParams=(seed) => ({ aspect_ratio:'1:1',  seed, guidance:3, num_inference_steps:30, output_format:'png', negative_prompt:SKETCH_NEG });

const INTENDED = {
  hero:           ['hero','where-the-build-stands'],
  heroUmbrella:   ['hero','umbrella-surface'],
  study:          ['dream-machine','in-motion-card'],
  thumb:          ['field-log','plate-thumb'],
};

// ---- prompt builders (register + substitutions) ----------------------------
function heroA(p) {
  const open = p.interior ? 'Cinematic interior architectural photograph' : 'Cinematic architectural photograph';
  const light = p.interior
    ? 'soft warm daylight pouring through large windows, long gentle shadows'
    : 'at golden hour. Wide establishing shot, low warm sun raking from the left casting long soft shadows';
  return `${open} of a ${p.style} ${p.buildingType} ${p.underPhrase||'under construction'} ${p.locPrep||'on'} ${p.location}, ${light}. ${p.materials}. ${p.constructionCue}. ${p.scene}. Palette strictly ${PHOTO_PALETTE}; muted and filmic, no oversaturation. Shot on medium-format, 35mm-equivalent, deep depth of field, fine natural grain, calm and aspirational. ${HERO_GUARDS}${p.emphasisA ? ' ' + p.emphasisA : ''}`;
}
function heroB(p) {
  if (p.interior) {
    return `Cinematic interior architectural photograph of a ${p.style} ${p.buildingType} ${p.underPhrase||'mid-remodel'}, evening — warm lamplight and the last of the daylight; ${p.materials}. ${p.constructionCue}. Strictly herbarium palette — cream, vellum, brass, amber warmth, teal-deep shadow; filmic, restrained. Medium-format look, fine grain. ${HERO_GUARDS}${p.emphasisB ? ' ' + p.emphasisB : ''}`;
  }
  return `Cinematic architectural photograph of a ${p.style} ${p.buildingType} at the golden-to-blue dusk transition, three-quarter front angle. Warm interior light glowing amber through the windows against a cooling teal sky; ${p.materials}. ${p.constructionCue}. ${p.scene}. Strictly herbarium palette — cream, vellum, brass, amber warmth, teal-deep shadow; filmic, restrained, slight haze. Medium-format look, shallow-to-deep focus, fine grain. ${HERO_GUARDS}${p.emphasisB ? ' ' + p.emphasisB : ''}`;
}
const studyPrompt = (subject) => REG + subject;
const photoThumb  = (subject) => `${subject} ${THUMB_GUARDS}`;
const sketchThumb = (subject) => REG + subject;

// Expand a profile into its asset table. Profiles may instead carry an explicit
// `assets` array (used by the Marin canonical demo to keep prompts/seeds byte-
// identical to the original stage-fidelity-assets.mjs).
function buildAssets(p) {
  if (p.assets) return p.assets;
  const s = p.seeds, sub = p.subjects || {};
  const heroes = [
    { slug:`hero-${p.key}-a`, kind:'hero', model:HERO_MODEL, intended_use:p.target==='umbrella'?INTENDED.heroUmbrella:INTENDED.hero, params:heroParams(s.heroA), prompt:heroA(p) },
    { slug:`hero-${p.key}-b`, kind:'hero', model:HERO_MODEL, intended_use:p.target==='umbrella'?INTENDED.heroUmbrella:INTENDED.hero, params:heroParams(s.heroB), prompt:heroB(p) },
  ];
  if (p.heroesOnly) return heroes;
  return [
    ...heroes,
    { slug:`study-${p.key}-massing`,   kind:'study', model:STUDY_MODEL, intended_use:INTENDED.study, params:studyParams(s.studyMassing),   prompt:studyPrompt(sub.massing) },
    { slug:`study-${p.key}-clearance`, kind:'study', model:STUDY_MODEL, intended_use:INTENDED.study, params:studyParams(s.studyClearance), prompt:studyPrompt(sub.clearance) },
    { slug:`study-${p.key}-daylight`,  kind:'study', model:STUDY_MODEL, intended_use:INTENDED.study, params:studyParams(s.studyDaylight),  prompt:studyPrompt(sub.daylight) },
    { slug:`thumb-${p.key}-site`,     kind:'thumb', model:HERO_MODEL,  intended_use:INTENDED.thumb, params:photoThumbParams(s.thumbSite),     prompt:photoThumb(sub.site) },
    { slug:`thumb-${p.key}-material`, kind:'thumb', model:HERO_MODEL,  intended_use:INTENDED.thumb, params:photoThumbParams(s.thumbMaterial), prompt:photoThumb(sub.material) },
    { slug:`thumb-${p.key}-detail`,   kind:'thumb', model:STUDY_MODEL, intended_use:INTENDED.thumb, params:sketchThumbParams(s.thumbDetail),  prompt:sketchThumb(sub.detail) },
  ];
}

// ============================================================================
//  PROFILES
// ============================================================================

// --- Canonical demo: Modern Farmhouse, Marin. VERBATIM from the original
//     stage-fidelity-assets.mjs so seeds regenerate byte-similar (spec §5).
//     Reconciles to the demo numbers: 4,000 sqft, Marin County, 42% built.
const MARIN = { key:'modern-farmhouse-marin', target:'bkg',
  label:'Modern farmhouse — Marin (canonical demo · 4,000 sqft · 42%)',
  assets:[
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
]};

// --- Generalization archetypes (built from profile + the register) ----------
const SF4 = { key:'sf-infill-fourplex', target:'bkg',
  label:'SF infill fourplex — 4-unit multifamily',
  buildingType:'four-unit infill multifamily building', location:'a narrow San Francisco infill lot',
  style:'contemporary', stage:'Build', progress:35, locPrep:'on',
  materials:'board-formed concrete base, warm cedar rainscreen, large black-framed windows, soft-brass metal accents',
  constructionCue:'framing and scaffolding across the street-facing facade to read as 35% built',
  scene:'dense city block, neighboring Victorians, coastal fog softening the distance',
  seeds:{ heroA:430017, heroB:430042, studyMassing:780301, studyClearance:780302, studyDaylight:780303, thumbSite:661101, thumbMaterial:661102, thumbDetail:661103 },
  subjects:{
    massing:"Three small axonometric massing studies of a four-unit infill building side by side — a stacked flat-over-flat bar, a two-over-two with a central light well, and a townhouse-style party-wall pair — each a clean block diagram with roof-pitch lines, unit-stacking notes, and a tiny north arrow, set on a narrow city lot.",
    clearance:"A site-plan study of a San Francisco infill lot with zero-lot-line party-wall conditions, required fire-separation and rear-yard setback dimensioned, curb cut and trash-enclosure clearances called out with thin leader lines and figures; calm technical drawing.",
    daylight:"A building-section daylight study through the central light well of a four-unit stack, warm sun-path arcs at morning/noon/evening, dashed daylight rays reaching each unit, glazing and shaft dimensions annotated; teal-shaded volumes.",
    site:"Documentary site photograph, square crop: timber and steel framing of an infill multifamily building rising between two older houses, late-afternoon warm light, scaffolding and a material hoist; honest jobsite feel. Warm cream/amber tones with cool teal shadow, muted and filmic. No people, no pure white, no bright red.",
    material:"Close-up square photograph of board-formed concrete, warm cedar rainscreen battens, and a coil of soft-brass flashing on aged kraft paper, raking golden-hour light, shallow depth of field, fine grain. Herbarium-warm palette — cream, vellum, brass, amber, teal shadow. No pure white, no fire-engine red.",
    detail:"A small square detail sketch of a party-wall fire-separation and floor-band assembly, a few dimension figures and a material note, drawn by an architect's hand.",
  } };

const ADU = { key:'adu', target:'bkg',
  label:'ADU — backyard accessory dwelling',
  buildingType:'backyard accessory dwelling unit', location:'a back garden behind a main house',
  style:'modern', stage:'Build', progress:25, locPrep:'in',
  materials:'board-and-batten cladding in warm cream, standing-seam soft-brass roof, black-framed windows, a small covered entry',
  constructionCue:'a poured slab and timber framing going up to read as 25% built',
  scene:'mature garden, fence line, the main house softly out of focus behind',
  seeds:{ heroA:440017, heroB:440042, studyMassing:790301, studyClearance:790302, studyDaylight:790303, thumbSite:671101, thumbMaterial:671102, thumbDetail:671103 },
  subjects:{
    massing:"Three small axonometric massing studies of a backyard ADU side by side — a gable cottage, a shed-roof studio, and an L-plan one-bedroom — each a clean block diagram with roof-pitch lines and a tiny north arrow, sited beside a main-house footprint.",
    clearance:"A site-plan clearance study of an ADU in a back garden with rear and side-yard setbacks dimensioned, separation from the main house, path of travel and utility runs called out with thin leader lines and figures; calm technical drawing.",
    daylight:"A building-section daylight study through an ADU great-room and sleeping loft, warm sun-path arcs at morning/noon/evening, dashed daylight rays, clerestory and overhang depths annotated; teal-shaded interior volume.",
    site:"Documentary site photograph, square crop: the slab and timber framing of a small backyard ADU, late-afternoon warm light, lumber stacks and a wheelbarrow beside the main house; honest jobsite feel. Warm cream/amber tones with cool teal shadow, muted and filmic. No people, no pure white, no bright red.",
    material:"Close-up square photograph of board-and-batten cladding and a soft-brass standing-seam roof sample on aged kraft paper, raking golden-hour light, shallow depth of field, fine grain. Herbarium-warm palette — cream, vellum, brass, amber, teal shadow. No pure white, no fire-engine red.",
    detail:"A small square detail sketch of an ADU eave and clerestory head, a few dimension figures and a material note, drawn by an architect's hand.",
  } };

const KITCHEN = { key:'kitchen-remodel', target:'bkg', interior:true,
  label:'Kitchen remodel — interior',
  buildingType:'kitchen', location:'a 1920s home in the Berkeley hills',
  style:'warm modern', stage:'Build', progress:60, locPrep:'in', underPhrase:'mid-remodel',
  materials:'white-oak cabinetry partly installed, honed stone counters, unlacquered brass fixtures, plaster walls in warm cream',
  constructionCue:'protective paper on the floor and a level and a few tools on the counter to read as 60% complete',
  scene:'soft daylight from a side window, calm and ordered',
  seeds:{ heroA:450017, heroB:450042, studyMassing:800301, studyClearance:800302, studyDaylight:800303, thumbSite:681101, thumbMaterial:681102, thumbDetail:681103 },
  subjects:{
    massing:"Three small plan-layout studies of a remodeled kitchen side by side — a single-wall-plus-island, a galley, and an L-plan with peninsula — each a clean dimensioned diagram with the work-triangle drawn and a tiny north arrow.",
    clearance:"A dimensioned plan study of a kitchen with code aisle widths at the island, appliance work-triangle distances, and door and drawer swing clearances called out with thin leader lines and figures; calm technical drawing.",
    daylight:"A millwork elevation study of the main kitchen run — base and wall cabinets, counter and backsplash heights, range-hood and fixture placements annotated; warm daylight from a window, teal-shaded casework.",
    site:"Documentary interior photograph, square crop: a kitchen mid-remodel with cabinets partly installed, protective paper on the floor, a level and tools on the counter, warm daylight; honest jobsite feel. Warm cream/amber tones with cool teal shadow, muted and filmic. No people, no pure white, no bright red.",
    material:"Close-up square photograph of a white-oak cabinet door, a honed stone counter sample, and an unlacquered brass pull on aged kraft paper, warm window light, shallow depth of field, fine grain. Herbarium-warm palette — cream, vellum, brass, amber, teal shadow. No pure white, no fire-engine red.",
    detail:"A small square detail sketch of a counter-to-cabinet and undermount-sink junction, a few dimension figures and a material note, drawn by an architect's hand.",
  } };

// --- Umbrella surface heroes (knowledge-gardens-root) — SAME register --------
//     These are photoreal section heroes for the umbrella; distinct from the
//     engraved garden emblems (see GARDEN-EMBLEM-PROMPTS.md), which keep their
//     own herbarium-plate register.
const UMB_CATHEDRAL = { key:'umbrella-cathedral', target:'umbrella', heroesOnly:true,
  label:'Umbrella — "Construction funds the cathedral" hero',
  buildingType:'community cathedral-hall', location:'a golden California hillside',
  style:'timber-and-stone', stage:'Build', progress:45, locPrep:'on',
  materials:'soaring exposed glue-laminated timber arches, a warm stone base, tall black-framed glazing, soft-brass roof flashing',
  constructionCue:'scaffolding along the nave and a tower crane to read the great room as mid-build',
  scene:'oak-studded ridgeline, dry golden grass, distant blue-green hills',
  emphasisA:'The hillside site is completely deserted — no people, no workers, no figures anywhere on the grounds or the plaza; vacant and pre-occupancy.',
  seeds:{ heroA:460071, heroB:460042 } };

const UMB_BUILDERS = { key:'umbrella-builders-surface', target:'umbrella', heroesOnly:true,
  label:'Umbrella — Builder\'s surface hero',
  buildingType:'mixed-use building', location:'a California town main street',
  style:'modern', stage:'Build', progress:40, locPrep:'on',
  materials:'warm cream stucco and cedar, large black-framed windows, a soft-brass canopy',
  constructionCue:'framing and scaffolding on the upper floor to read as mid-build',
  scene:'low golden sun, a calm street, live oaks',
  emphasisA:'The street and storefronts are completely empty and deserted — no people, no parked cars, and absolutely no signage, lettering, logos, or shop names; blank unbranded glass on a quiet pre-opening street.',
  emphasisB:'Interiors glow warm but are completely empty and unfurnished — no people, no silhouettes, no figures at the windows; vacant pre-occupancy rooms, and no signage or lettering anywhere.',
  seeds:{ heroA:461071, heroB:461073 } };

const PROFILES = [ MARIN, SF4, ADU, KITCHEN, UMB_CATHEDRAL, UMB_BUILDERS ];

// ============================================================================
//  ARGS / ENV
// ============================================================================
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valOf = (k, d) => { const a = argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : d; };

if (has('--help') || has('-h')) { printHelp(); process.exit(0); }

const TARGET = valOf('target', 'bkg');
if (!['bkg','umbrella'].includes(TARGET)) die(`unknown --target=${TARGET} (use bkg|umbrella)`);
const GO = has('--go');
const EMIT = has('--emit-manifest');
const DRY = !GO && !EMIT ? true : (has('--dry-run') ? true : !GO);
const DO_CATALOG = has('--catalog') && has('--schema-confirmed');
const PROFILE = valOf('profile', null);
const onlyArg = valOf('only', null);
const ONLY = onlyArg ? new Set(onlyArg.split(',').map(s => s.trim())) : null;

const REPLICATE = process.env.REPLICATE_API_TOKEN;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_CREATOR_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SB_KEY_IS_SERVICE = !!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_CREATOR_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// bkg target → Supabase brand-assets bucket.
const BUCKET = 'brand-assets';
const PREFIX = 'assets/bkg/fidelity';   // public object path
const CATALOG_PREFIX = 'bkg/fidelity';  // storage_path in the row (assets/ stripped)
const OUT_DIR = path.resolve(valOf('out', 'portal-imagery-out'));
// umbrella target → static file-drop into knowledge-gardens-root.
const UMBRELLA_DIR = path.resolve(valOf('umbrella-dir', '../knowledge-gardens-root/assets/fidelity'));
const UMBRELLA_SITE_PATH = 'assets/fidelity'; // public path on theknowledgegardens.com

const log  = (...a) => console.log(...a);
const warn = (...a) => console.warn('⚠ ', ...a);
function die(m) { console.error('✖ ' + m); process.exit(1); }

// ============================================================================
//  PREFLIGHT GUARDS — abort (dry OR go) on any register violation
// ============================================================================
function validateAsset(a) {
  const errs = [];
  const ar = a.params?.aspect_ratio;
  if (!ALLOWED_AR.has(ar)) errs.push(`aspect_ratio "${ar}" not allowed (21:9 is banned; use ${[...ALLOWED_AR].join('/')})`);
  if (ar === '21:9') errs.push('aspect_ratio 21:9 is explicitly forbidden by the spec');
  if (a.kind === 'hero'  && ar !== '16:9') errs.push(`hero must be 16:9 (got ${ar})`);
  if (a.kind === 'study' && ar !== '4:5')  errs.push(`study must be 4:5 (got ${ar})`);
  if (a.kind === 'thumb' && ar !== '1:1')  errs.push(`thumb must be 1:1 (got ${ar})`);
  if (a.kind === 'hero'  && a.model !== HERO_MODEL)  errs.push(`hero must use ${HERO_MODEL}`);
  if (a.kind === 'study' && a.model !== STUDY_MODEL) errs.push(`study must use ${STUDY_MODEL}`);
  if (a.model === STUDY_MODEL && !a.params?.negative_prompt) errs.push('flux-dev asset missing negative_prompt');
  if (!Number.isInteger(a.params?.seed)) errs.push('seed must be a fixed integer (for byte-similar regen)');

  const pos = (a.prompt || '').toLowerCase();
  for (const banned of ['#e8443a', '#ffffff', '21:9']) if (pos.includes(banned)) errs.push(`banned token "${banned}" in positive prompt`);
  const isPhoto = a.model === HERO_MODEL;
  if (isPhoto) { // heroes + photo thumbs must carry the no-white / no-red guards
    if (!pos.includes('pure white')) errs.push('photo prompt missing "no pure white" guard');
    if (!pos.includes('red'))        errs.push('photo prompt missing "no ... red" guard');
  }
  return errs;
}
function preflight(queue) {
  let bad = 0;
  for (const a of queue) {
    const errs = validateAsset(a);
    if (errs.length) { bad++; warn(`GUARD FAIL ${a.slug}:`); errs.forEach(e => console.warn(`     - ${e}`)); }
  }
  if (bad) die(`${bad} asset(s) failed the register guards — refusing to run.`);
  log(`guards: PASS — ${queue.length} asset(s) conform to the herbarium register (no 21:9, models/ratios locked).`);
}

// ============================================================================
//  REMOTE HELPERS (only called on --go)
// ============================================================================
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

// Catalog mapping helpers — values constrained by the live brand_assets CHECKs.
const ASSET_TYPE = { hero: 'poster', study: 'illustration', thumb: 'plate' }; // brand_assets_asset_type_check
const RENDITION  = { hero: 'hero', study: null, thumb: 'thumb' };             // brand_assets_rendition_role_check
const titleFor = (a) => `Portal seed — ${a.slug.replace(/-/g, ' ')}`;

// Draft-only catalog upsert (bkg).
//
// SCHEMA NOTE (reconciled 2026-06-15 against LIVE public.brand_assets, project
// vlezoyalutexenbnzzui — the original row shape would have 400'd on four counts):
//   • There is NO `provenance` column — provenance moved into `metadata` (jsonb).
//   • asset_type is CHECK-constrained → hero=poster, study=illustration, thumb=plate
//     ('diagram'/'image' are NOT valid values).
//   • generator is CHECK-constrained → 'flux' (NOT 'replicate'; Replicate is the host).
//   • filename, mime_type, title, key are NOT NULL with no default → all set here.
//   • key/slug/storage_path are UNIQUE → upsert on `key` so re-runs are idempotent.
//   FLAG: the object is uploaded to `${PREFIX}/<slug>.png` and the running app
//   (src/lib/portal-imagery.ts) builds the seed URL from that public path. This
//   row's storage_path is `${CATALOG_PREFIX}/<slug>` per spec §6 (no `assets/`,
//   no `.png`). The live UI does NOT resolve via storage_path, so it is harmless
//   to the app — but reconcile the convention before any storage_path-based
//   consumer ships. status='draft' is the ONLY status this script ever writes.
async function insertDraftRow(asset, predictionId, publicUrl) {
  const row = {
    key: `bkg-fidelity-${asset.slug}`,   // UNIQUE — upsert target
    slug: `bkg-${asset.slug}`,           // UNIQUE
    title: titleFor(asset),
    filename: `${asset.slug}.png`,
    mime_type: 'image/png',
    asset_type: ASSET_TYPE[asset.kind],
    garden_scope: 'bkg',
    storage_path: `${CATALOG_PREFIX}/${asset.slug}`, // UNIQUE
    status: 'draft',
    rendition_role: RENDITION[asset.kind] || undefined,
    generator: 'flux',
    model: asset.model,
    prompt: asset.prompt,
    params: asset.params,
    intended_use: asset.intended_use,
    metadata: { source: 'cowork-portal-imagery', engine: 'replicate', prediction_id: predictionId, public_url: publicUrl },
  };
  const res = await fetch(`${SB_URL}/rest/v1/brand_assets?on_conflict=key`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SB_KEY}`, apikey: SB_KEY, 'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`catalog upsert ${res.status}: ${await res.text()}`);
  return (await res.json())[0];
}

// ============================================================================
//  BUILD QUEUE
// ============================================================================
const selectedProfiles = PROFILES.filter(p => p.target === TARGET && (!PROFILE || p.key === PROFILE));
if (!selectedProfiles.length) die(`no profiles match target=${TARGET}${PROFILE ? ` profile=${PROFILE}` : ''}.`);
let queue = selectedProfiles.flatMap(buildAssets).filter(a => !ONLY || ONLY.has(a.slug));
if (!queue.length) die('nothing in the queue after filtering.');

log('\n=== portal-imagery — WIP portal staging · DRAFT ONLY (never promotes) ===');
log(`target: ${TARGET}`);
log(`mode:   ${EMIT ? 'EMIT-MANIFEST (definitions only, no API, no creds)' : DRY ? 'DRY-RUN (no API calls, no spend)' : 'GO (will generate + stage)'}`);
log(`profiles: ${selectedProfiles.map(p => p.key).join(', ')}`);
log(`assets: ${queue.length}`);
if (TARGET === 'bkg')      log(`bkg target: ${SB_URL || '(no SUPABASE url)'} bucket=${BUCKET} path=${PREFIX}/<slug>.png · catalog ${DO_CATALOG ? 'ON (draft)' : 'OFF'}`);
if (TARGET === 'umbrella') log(`umbrella target: ${UMBRELLA_DIR}/<slug>.png · site path ${UMBRELLA_SITE_PATH}/<slug>.png`);
log('');

// Guards run no matter what.
preflight(queue);

// ---- manifest shape (shared) ----
const planEntry = (a) => ({
  slug:a.slug, kind:a.kind, model:a.model, params:a.params, prompt:a.prompt,
  intended_use:a.intended_use, seed:a.params.seed, status:'draft',
  ...(TARGET === 'umbrella'
      ? { file:`${UMBRELLA_SITE_PATH}/${a.slug}.png` }
      : { storage_path:`${CATALOG_PREFIX}/${a.slug}` }),
});
const manifestDoc = (assets) => ({
  generated_at: new Date().toISOString(),
  spec: 'docs/design/seed-and-portals.md',
  register: 'herbarium · §2 (constant) + per-profile substitutions (§3)',
  target: TARGET,
  draft_only: true, promoted: false,
  ...(TARGET === 'umbrella' ? { site_asset_path: UMBRELLA_SITE_PATH } : { bucket: BUCKET, public_prefix: PREFIX }),
  assets,
});

// ============================================================================
//  EMIT-MANIFEST — write definitions only, NO API, NO creds (safe "staging")
// ============================================================================
if (EMIT) {
  const assets = queue.map(planEntry);
  const doc = manifestDoc(assets);
  const dir = TARGET === 'umbrella' ? UMBRELLA_DIR : OUT_DIR;
  const file = path.join(dir, TARGET === 'umbrella' ? 'seed-set.json' : 'plan.json');
  await mkdir(dir, { recursive: true });
  await writeFile(file, JSON.stringify(doc, null, 2));
  log(`Wrote ${queue.length} draft definition(s) → ${file}`);
  log('No images generated, nothing uploaded. Founder runs --go (where creds live) to render, then promotes.');
  process.exit(0);
}

// ============================================================================
//  DRY-RUN
// ============================================================================
if (DRY) {
  for (const a of queue) log(`• ${a.slug}  [${a.kind} · ${a.model.split('/').pop()}]  ${JSON.stringify(a.params)}`);
  log('\nDry run only. Re-run with --emit-manifest to write definitions, or --go (+ creds) to generate + stage.');
  process.exit(0);
}

// ============================================================================
//  GO — generate + stage (draft only)
// ============================================================================
if (!REPLICATE) die('REPLICATE_API_TOKEN not set — refusing to generate.');
if (TARGET === 'bkg') {
  if (!SB_URL || !SB_KEY) die('Supabase URL/key not set — refusing to upload. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_CREATOR_KEY.');
  if (SB_KEY_IS_SERVICE) warn('Using SERVICE_ROLE key — it bypasses RLS. Script still writes draft only, but a CREATOR key is preferred.');
}
if (has('--catalog') && !has('--schema-confirmed')) warn('--catalog ignored: pass --schema-confirmed after verifying public.brand_assets columns.');

const outDir = TARGET === 'umbrella' ? UMBRELLA_DIR : OUT_DIR;
await mkdir(outDir, { recursive: true });
const manifest = [];
for (const a of queue) {
  try {
    log(`→ generating ${a.slug} …`);
    const { url, predictionId } = await replicateRun(a);
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    await writeFile(path.join(outDir, `${a.slug}.png`), bytes);
    let entry = { ...planEntry(a), prediction_id: predictionId };
    if (TARGET === 'bkg') {
      log(`  ↳ uploading draft → ${PREFIX}/${a.slug}.png`);
      const publicUrl = await uploadDraft(a.slug, bytes);
      entry.public_url = publicUrl;
      if (DO_CATALOG) { const row = await insertDraftRow(a, predictionId, publicUrl); entry.catalog_row_id = row?.id ?? null; log(`  ↳ catalog draft row ${entry.catalog_row_id}`); }
    } else {
      log(`  ↳ wrote umbrella file → ${UMBRELLA_SITE_PATH}/${a.slug}.png (review + commit to promote)`);
    }
    manifest.push(entry);
    log(`  ✓ ${a.slug}`);
  } catch (e) {
    warn(`${a.slug} FAILED: ${e.message}`);
    manifest.push({ slug:a.slug, error:String(e.message), status:'error' });
  }
}
const manifestPath = path.join(outDir, TARGET === 'umbrella' ? 'seed-set.json' : 'manifest.json');
await writeFile(manifestPath, JSON.stringify(manifestDoc(manifest), null, 2));
log(`\nDone. Local copies + manifest in ${outDir}/. All staged as DRAFT. Promotion is founder/service-role — not done here.`);

// ============================================================================
function printHelp() {
  log(`portal-imagery.mjs — draft-only WIP portal imagery staging (herbarium-locked)

USAGE
  node portal-imagery.mjs [--target=bkg|umbrella] [--profile=KEY] [--only=slug,slug]
                          [--dry-run | --emit-manifest | --go]
                          [--catalog --schema-confirmed]   (bkg only)
                          [--out=DIR] [--umbrella-dir=DIR]

MODES
  --dry-run        (default) print the plan + run guards. No API, no spend.
  --emit-manifest  write the seed-set/plan JSON (definitions). No API, no creds.
  --go             generate on Replicate FLUX + stage DRAFT. Needs creds.

TARGETS
  bkg        Supabase brand-assets bucket (draft rows). Archetypes:
             ${PROFILES.filter(p=>p.target==='bkg').map(p=>p.key).join(', ')}
  umbrella   knowledge-gardens-root static asset path. Surface heroes:
             ${PROFILES.filter(p=>p.target==='umbrella').map(p=>p.key).join(', ')}

SAFETY
  Never promotes (draft only). Guards reject 21:9 / wrong model / banned color.
  Founder promotes (bkg: status→approved; umbrella: review + commit).`);
}
