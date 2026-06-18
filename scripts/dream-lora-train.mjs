#!/usr/bin/env node
/**
 * dream-lora-train.mjs — train the Dream Machine house-style FLUX LoRA on
 * Replicate (Layer 3). FOUNDER-RUN: needs REPLICATE_API_TOKEN in the env and
 * spends a small amount on Replicate (~$2, ~2 min per the trainer's docs), so
 * it is DRY-RUN by default and only fires with --go.
 *
 *   export REPLICATE_API_TOKEN=...    # your token (not read from .env by this script)
 *   node scripts/dream-lora-dataset.mjs --go --style=study      # build the zip first
 *   node scripts/dream-lora-train.mjs --input dream-lora-dataset.zip \
 *        --destination <owner>/bkg-herbarium-studies            # DRY RUN — prints the request
 *   node scripts/dream-lora-train.mjs --input dream-lora-dataset.zip \
 *        --destination <owner>/bkg-herbarium-studies --go       # actually train
 *
 * On success it prints the destination model + version. Wire it into the app by
 * setting DREAM_LORA_STUDY=<owner>/bkg-herbarium-studies:<version> (+ DREAM_LORA_TRIGGER).
 * See docs/dream-machine-lora.md.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { basename } from 'node:path';

const TRAINER = 'ostris/flux-dev-lora-trainer';
const args = process.argv.slice(2);
const GO = args.includes('--go');
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };

const input = opt('--input', 'dream-lora-dataset.zip');     // local zip…
const inputUrl = opt('--input-url', null);                  // …or an already-public zip URL
const destination = opt('--destination', null);             // owner/model-name (required for --go)
const trigger = (opt('--trigger', process.env.DREAM_LORA_TRIGGER) || 'BKGHERB').trim();
const steps = parseInt(opt('--steps', '1000'), 10);
const token = process.env.REPLICATE_API_TOKEN;

const api = async (url, init = {}) => {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${url} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
};

console.log(`Dream Machine LoRA training · trainer=${TRAINER} · trigger="${trigger}" · steps=${steps} · ${GO ? 'GO' : 'DRY RUN'}`);
console.log(`destination: ${destination || '(none — required for --go)'}`);
console.log(`input: ${inputUrl || input}\n`);

if (!GO) {
  console.log('DRY RUN — would:');
  console.log(`  1. ${inputUrl ? 'use the given --input-url' : `upload ${input} to Replicate /v1/files`}`);
  console.log(`  2. GET the latest ${TRAINER} version`);
  console.log(`  3. POST a training: { destination: "${destination || '<owner>/<name>'}",`);
  console.log(`        input: { input_images: <url>, trigger_word: "${trigger}", steps: ${steps} } }`);
  console.log(`\nRe-run with --go (and REPLICATE_API_TOKEN set + a --destination) to train for real.`);
  process.exit(0);
}

if (!token) { console.error('REPLICATE_API_TOKEN is not set in the environment.'); process.exit(1); }
if (!destination || !/^[^/]+\/[^/]+$/.test(destination)) { console.error('--destination <owner>/<model-name> is required.'); process.exit(1); }

// 1. resolve the dataset URL (upload the local zip if no --input-url)
let imagesUrl = inputUrl;
if (!imagesUrl) {
  if (!existsSync(input)) { console.error(`Input zip not found: ${input} (run dream-lora-dataset.mjs --go first).`); process.exit(1); }
  console.log(`Uploading ${input} (${(statSync(input).size / 1e6).toFixed(1)} MB) to Replicate…`);
  const fd = new FormData();
  fd.append('content', new Blob([readFileSync(input)], { type: 'application/zip' }), basename(input));
  const up = await fetch('https://api.replicate.com/v1/files', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  if (!up.ok) { console.error(`File upload failed: ${up.status} ${(await up.text()).slice(0, 300)}`); process.exit(1); }
  imagesUrl = (await up.json()).urls.get;
  console.log(`  → ${imagesUrl}`);
}

// 2. latest trainer version
const version = (await api(`https://api.replicate.com/v1/models/${TRAINER}`)).latest_version.id;
console.log(`trainer version: ${version}`);

// 3. kick the training
let t = await api(`https://api.replicate.com/v1/models/${TRAINER}/versions/${version}/trainings`, {
  method: 'POST',
  body: JSON.stringify({ destination, input: { input_images: imagesUrl, trigger_word: trigger, steps } }),
});
console.log(`training ${t.id} — ${t.status}. Polling…`);
const getUrl = t.urls?.get || `https://api.replicate.com/v1/trainings/${t.id}`;
while (t.status === 'starting' || t.status === 'processing') {
  await new Promise((r) => setTimeout(r, 5000));
  t = await api(getUrl);
  process.stdout.write(`  ${t.status}\r`);
}
console.log(`\ntraining ${t.status}`);
if (t.status !== 'succeeded') { console.error(t.error || 'training did not succeed'); process.exit(1); }

const ver = t.output?.version || `${destination}:<version>`;
console.log(`\n✓ trained → ${ver}`);
console.log(`weights: ${t.output?.weights || '(see the model page on Replicate)'}`);
console.log(`\nWire it up — set these in Vercel and redeploy:`);
console.log(`  DREAM_LORA_STUDY=${ver}`);
console.log(`  DREAM_LORA_TRIGGER=${trigger}`);
