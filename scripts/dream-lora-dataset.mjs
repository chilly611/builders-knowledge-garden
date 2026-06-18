#!/usr/bin/env node
/**
 * dream-lora-dataset.mjs — build a captioned FLUX-LoRA training set from our
 * PUBLIC brand assets (Layer 3, the ownable house style). Token-free: it only
 * fetches the public brand-assets bucket and writes a local folder + zip.
 *
 * Pairs each image with a `.txt` caption that opens with the trigger word, so
 * `ostris/flux-dev-lora-trainer` learns the herbarium look under that token.
 *
 *   node scripts/dream-lora-dataset.mjs                      # dry run — list the set
 *   node scripts/dream-lora-dataset.mjs --go                 # download + caption + zip (study)
 *   node scripts/dream-lora-dataset.mjs --go --style=all     # study + photo
 *   node scripts/dream-lora-dataset.mjs --go --extra ./mj    # also fold in your own frames
 *                                                            #   (e.g. Midjourney --sref exports)
 * Trigger word: env DREAM_LORA_TRIGGER (default "BKGHERB"). Output is gitignored.
 * Next: feed the zip to scripts/dream-lora-train.mjs (see docs/dream-machine-lora.md).
 */
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, basename, extname } from 'node:path';
import { Buffer } from 'node:buffer';

const HOST = 'https://vlezoyalutexenbnzzui.supabase.co/storage/v1/object/public/brand-assets/';
const TRIGGER = (process.env.DREAM_LORA_TRIGGER || 'BKGHERB').trim();
const OUT = 'dream-lora-dataset';

const args = process.argv.slice(2);
const GO = args.includes('--go');
const style = (args.find((a) => a.startsWith('--style=')) || '--style=study').split('=')[1];
const ei = args.indexOf('--extra');
const extraDir = ei >= 0 ? args[ei + 1] : null;

const STUDY = "an architect's hand-drawn working study on aged cream paper, fine ink-graphite linework with a light teal wash and soft-brass accents, a faint herbarium grid and dimension annotations, restrained and elegant — a working drawing, not a photograph";
const PHOTO = "a cinematic architectural photograph in the herbarium palette — warm cream, vellum, soft brass, amber, with cool teal-deep shadows; filmic, muted, medium-format, fine grain";

// [path-within-bucket, caption]. 404s are skipped (not every slug is staged).
const SETS = {
  study: [
    ['assets/bkg/fidelity/study-massing-options.png', `${TRIGGER}, ${STUDY}. A massing-options study.`],
    ['assets/bkg/fidelity/study-clearance.png', `${TRIGGER}, ${STUDY}. A clearance and setback study.`],
    ['assets/bkg/fidelity/study-daylight.png', `${TRIGGER}, ${STUDY}. A building-section daylight study with sun-path arcs.`],
    ['assets/bkg/fidelity/thumb-detail-sketch.png', `${TRIGGER}, ${STUDY}. A close detail study of a construction junction.`],
    ['assets/bkg/fidelity/batch-2026-06-15/marin-study-massing-options.png', `${TRIGGER}, ${STUDY}. A massing-options study of a farmhouse.`],
    ['assets/bkg/fidelity/batch-2026-06-15/marin-study-clearance-check.png', `${TRIGGER}, ${STUDY}. A clearance-check study.`],
    ['assets/bkg/fidelity/batch-2026-06-15/marin-study-daylight.png', `${TRIGGER}, ${STUDY}. A daylight section study.`],
    ['assets/bkg/fidelity/batch-2026-06-15/sf-study-massing-options.png', `${TRIGGER}, ${STUDY}. A massing study of an infill fourplex.`],
    ['assets/bkg/fidelity/batch-2026-06-15/sf-study-stacking-clearance.png', `${TRIGGER}, ${STUDY}. A stacking and clearance study.`],
    ['assets/bkg/fidelity/batch-2026-06-15/sf-study-light-well.png', `${TRIGGER}, ${STUDY}. A light-well section study.`],
  ],
  photo: [
    ['assets/bkg/fidelity/hero-marin-farmhouse-golden-a.png', `${TRIGGER}, ${PHOTO}. A modern farmhouse at golden hour, mid-construction.`],
    ['assets/bkg/fidelity/hero-marin-farmhouse-golden-b.png', `${TRIGGER}, ${PHOTO}. A modern farmhouse at dusk with warm windows.`],
    ['assets/bkg/fidelity/thumb-site-framing.png', `${TRIGGER}, ${PHOTO}. A jobsite timber-framing photograph.`],
    ['assets/bkg/fidelity/thumb-material-detail.png', `${TRIGGER}, ${PHOTO}. A close material detail — cladding and brass roofing.`],
    ['assets/bkg/styles/batch-2026-06-16/style-midcentury-modern-a.png', `${TRIGGER}, ${PHOTO}. A midcentury-modern house.`],
    ['assets/bkg/styles/batch-2026-06-16/style-mediterranean-a.png', `${TRIGGER}, ${PHOTO}. A Mediterranean-style house.`],
    ['assets/bkg/styles/batch-2026-06-16/style-asian-fusion-a.png', `${TRIGGER}, ${PHOTO}. An Asian-fusion-style house.`],
  ],
};

const chosen = style === 'all' ? [...SETS.study, ...SETS.photo] : (SETS[style] || SETS.study);
const register = style === 'photo' ? PHOTO : STUDY;

console.log(`Dream Machine LoRA dataset · style=${style} · trigger="${TRIGGER}" · ${GO ? 'BUILD' : 'DRY RUN'}`);
console.log(`Candidates: ${chosen.length}${extraDir ? ` + extras from ${extraDir}` : ''}\n`);

if (!GO) {
  for (const [p, cap] of chosen) console.log(`  • ${p}\n      "${cap}"`);
  console.log(`\nDry run. Re-run with --go to download, caption, and zip into ${OUT}.zip`);
  process.exit(0);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let n = 0;
for (const [p, cap] of chosen) {
  try {
    const res = await fetch(HOST + p);
    if (!res.ok) { console.log(`  skip ${res.status}  ${p}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    const name = basename(p);
    const stem = name.replace(/\.[^.]+$/, '');
    writeFileSync(join(OUT, name), buf);
    writeFileSync(join(OUT, `${stem}.txt`), cap);
    n++;
    console.log(`  ok   ${(buf.length / 1024).toFixed(0).padStart(5)}kb  ${name}`);
  } catch (e) {
    console.log(`  err  ${p} — ${e.message}`);
  }
}

if (extraDir && existsSync(extraDir)) {
  for (const f of readdirSync(extraDir)) {
    if (!/\.(png|jpe?g|webp)$/i.test(f)) continue;
    const stem = basename(f, extname(f));
    copyFileSync(join(extraDir, f), join(OUT, f));
    writeFileSync(join(OUT, `${stem}.txt`), `${TRIGGER}, ${register}.`);
    n++;
    console.log(`  add  ${f} (extra)`);
  }
}

if (n === 0) { console.error('No images fetched — nothing to zip.'); process.exit(1); }

execFileSync('zip', ['-r', '-q', `${OUT}.zip`, OUT]);
console.log(`\n✓ ${n} image+caption pairs → ${OUT}.zip`);
console.log(`Next: node scripts/dream-lora-train.mjs --input ${OUT}.zip --destination <owner>/bkg-herbarium-studies --go`);
if (n < 12) console.log(`Note: only ${n} images — a LoRA likes 12–20+. Add more via --extra <dir> (e.g. Midjourney --sref frames).`);
