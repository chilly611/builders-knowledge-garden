#!/usr/bin/env node
// Pack mcp-bridge/ into public/bkg-mcp.mcpb so Vercel serves it at
// https://builders.theknowledgegardens.com/bkg-mcp.mcpb
//
// Uses the official Anthropic mcpb CLI via npx (zero install). Falls back
// to a plain zip if the CLI is unavailable — Claude Desktop accepts any
// zip with manifest.json at root.
//
// USAGE:  node scripts/build-mcpb.mjs

import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MANIFEST = join(ROOT, "mcp-bridge", "manifest.json");
const BRIDGE = join(ROOT, "scripts", "mcp-bridge.js");
const OUT_DIR = join(ROOT, "public");
const OUT = join(OUT_DIR, "bkg-mcp.mcpb");
const STAGE = join(ROOT, ".mcpb-stage");

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: "inherit", ...opts });
}

for (const p of [MANIFEST, BRIDGE]) {
  if (!existsSync(p)) {
    console.error(`missing required file: ${p}`);
    process.exit(1);
  }
}

mkdirSync(OUT_DIR, { recursive: true });
rmSync(STAGE, { recursive: true, force: true });
rmSync(OUT, { force: true });
mkdirSync(STAGE, { recursive: true });
copyFileSync(MANIFEST, join(STAGE, "manifest.json"));
copyFileSync(BRIDGE, join(STAGE, "mcp-bridge.js"));

let packed = false;
try {
  sh(`npx -y -p @anthropic-ai/mcpb mcpb pack "${STAGE}" "${OUT}"`);
  packed = true;
} catch (e) {
  console.error("mcpb CLI failed, falling back to plain zip:", e.message);
}

if (!packed) {
  // fallback: cd into the stage dir and zip everything at root level
  sh(`cd "${STAGE}" && zip -r "${OUT}" . -x ".*"`);
}

rmSync(STAGE, { recursive: true, force: true });

if (!existsSync(OUT)) {
  console.error("build failed: no output file");
  process.exit(1);
}

const size = statSync(OUT).size;
console.log(`built ${OUT} (${size} bytes)`);
