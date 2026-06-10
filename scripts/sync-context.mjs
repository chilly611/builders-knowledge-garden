#!/usr/bin/env node
/**
 * sync-context.mjs — push the SSOT context set to its mirrors.
 *
 * Canonical home: this repo (GitHub). Mirrors: Supabase Storage bucket
 * `platform-context`, Google Drive folder "BKG Context".
 * See docs/CONTEXT-MANIFEST.md for the contract.
 *
 * Usage:   node scripts/sync-context.mjs [--check]
 * Env:     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (Mac only — never sandbox)
 * --check: list files + local hashes, no uploads.
 *
 * Drive is synced separately (Cowork session or manual drop) — this script
 * prints the file list so the Drive refresh is copy-paste.
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "platform-context";

export const CONTEXT_SET = [
  "docs/PLATFORM-CONSTITUTION.md",
  "docs/PROJECT-INSTRUCTIONS.md",
  "docs/design-constitution.md",
  "docs/visual-first-and-flags.md",
  "docs/first-run-and-onboarding.md",
  "docs/session-log.md",
  "tasks.todo.md",
  "tasks.lessons.md",
  "docs/CONTEXT-MANIFEST.md",
];

const check = process.argv.includes("--check");
const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const files = [];
for (const rel of CONTEXT_SET) {
  const body = await readFile(resolve(ROOT, rel));
  files.push({
    rel,
    name: basename(rel),
    body,
    sha256: createHash("sha256").update(body).digest("hex").slice(0, 12),
    bytes: body.length,
  });
}

console.log("Context set (canonical = git HEAD of this repo):");
for (const f of files) console.log(`  ${f.sha256}  ${String(f.bytes).padStart(7)}  ${f.rel}`);

if (check) process.exit(0);

if (!url || !key) {
  console.error("\nMissing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — aborting (no uploads).");
  process.exit(1);
}

async function put(path, body, contentType) {
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body,
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
}

let failed = 0;
for (const f of files) {
  try {
    await put(f.name, f.body, "text/markdown; charset=utf-8");
    console.log(`  ✓ ${BUCKET}/${f.name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${e.message}`);
  }
}

// last-synced stamp — a mirror older than the repo's latest context commit is stale.
const manifest = {
  synced_at: new Date().toISOString(),
  canonical: "github.com/chilly611/builders-knowledge-garden @ main",
  files: files.map(({ rel, name, sha256, bytes }) => ({ rel, name, sha256, bytes })),
};
await put("context-sync-manifest.json", JSON.stringify(manifest, null, 2), "application/json");
console.log(`  ✓ ${BUCKET}/context-sync-manifest.json`);

console.log(
  failed
    ? `\n${failed} upload(s) FAILED — mirror is partial, re-run before trusting it.`
    : "\nSupabase mirror is current. Drive: refresh the 'BKG Context' folder with the files above."
);
process.exit(failed ? 1 : 0);
