#!/usr/bin/env node
/**
 * Local AUTO-VERIFY runner (2026-05-25)
 * =====================================
 *
 * Same logic as /api/v1/knowledge-entities/auto-verify-batch but runs
 * locally against the Supabase service-role + Anthropic API. Skips the
 * Vercel function deadline entirely (no 60s/300s ceiling) so we can rip
 * through 2,256 rows in one process.
 *
 * Env (from .env.local — both keys must be present):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY
 *
 * Usage:
 *   node scripts/auto-verify-local.mjs              # full pass
 *   node scripts/auto-verify-local.mjs --limit 5    # first 5 rows only
 *   node scripts/auto-verify-local.mjs --dry-run    # don't persist
 *   node scripts/auto-verify-local.mjs --concurrency 4
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local if env not already present.
function loadDotEnv() {
  const candidates = [
    path.join(__dirname, "..", ".env.local"),
    path.join(__dirname, "..", "..", "the Builder Garden PC 1", "app", ".env.local"),
    path.join(__dirname, "..", "..", "The Builder Garden PC 2", "app", ".env.local"),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
    for (const ln of lines) {
      const m = ln.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const [, k, v] = m;
      if (process.env[k]) continue;
      process.env[k] = v.replace(/^['"]|['"]$/g, "");
    }
    break;
  }
}
loadDotEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE || !ANTHROPIC_API_KEY) {
  console.error("Missing env: need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY");
  process.exit(2);
}

const args = parseArgs(process.argv.slice(2));
const totalLimit = args.limit ? parseInt(args.limit, 10) : Infinity;
const dryRun = args["dry-run"] === true;
const concurrency = args.concurrency ? Math.max(1, Math.min(8, parseInt(args.concurrency, 10))) : 3;
// Sharding for parallel workers (UUID first-char-based, deterministic).
const shardArg = args.shard ? String(args.shard).split("/") : null;
const shardIdx = shardArg ? parseInt(shardArg[0], 10) : 0;
const shardOf = shardArg ? parseInt(shardArg[1], 10) : 1;

const MODEL = "claude-haiku-4-5-20251001";
const PROMPT_VERSION = "auto-verify/v1@2026-05-25";
const CLEAN_THRESHOLD = 0.85;
const STAMP_THRESHOLD = 0.5;
const FETCH_CHUNK = 100;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

console.log(`[auto-verify] model=${MODEL} concurrency=${concurrency} dry_run=${dryRun} limit=${totalLimit === Infinity ? "all" : totalLimit}`);

const stats = { processed: 0, stamped_clean: 0, stamped_flagged: 0, skipped: 0, errors: 0 };
const t0 = Date.now();

let cursorId = null;
let remaining = totalLimit;
while (remaining > 0) {
  const chunkLimit = Math.min(FETCH_CHUNK, remaining);
  const { data: rows, error } = await fetchChunk(cursorId, chunkLimit);
  if (error) {
    console.error("fetchChunk failed:", error.message);
    break;
  }
  if (!rows.length) {
    console.log("[auto-verify] queue empty");
    break;
  }
  await runConcurrent(rows, concurrency, processRow);
  cursorId = rows[rows.length - 1].id;
  remaining -= rows.length;
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[chunk] +${rows.length} | total: ${stats.processed} processed | clean=${stats.stamped_clean} flagged=${stats.stamped_flagged} skipped=${stats.skipped} errors=${stats.errors} | ${dt}s`);
}

const dt = ((Date.now() - t0) / 1000).toFixed(1);
console.log("---");
console.log(`[auto-verify] done in ${dt}s`);
console.log(`  processed:        ${stats.processed}`);
console.log(`  stamped_clean:    ${stats.stamped_clean}    (yellow tick)`);
console.log(`  stamped_flagged:  ${stats.stamped_flagged}    (needs human review)`);
console.log(`  skipped:          ${stats.skipped}    (low confidence, not stamped)`);
console.log(`  errors:           ${stats.errors}`);

// ────────────────────────────────────────────────────────────

async function fetchChunk(after, limit) {
  let qb = supabase
    .from("knowledge_entities")
    .select("id, slug, entity_type, title, summary, jurisdiction_ids, source_urls, metadata")
    .eq("status", "published")
    .is("auto_verified_at", null)
    .order("id", { ascending: true })
    .limit(limit);
  if (after) qb = qb.gt("id", after);
  // Sharding via uuid range comparison (uuid columns sort as strings).
  // Each shard owns [shardIdx/shardOf, (shardIdx+1)/shardOf) of the keyspace.
  if (shardOf > 1) {
    const hex = "0123456789abcdef";
    const slicesPerShard = hex.length / shardOf;
    const lowChar = hex[Math.floor(shardIdx * slicesPerShard)];
    const highChar = shardIdx + 1 < shardOf ? hex[Math.floor((shardIdx + 1) * slicesPerShard)] : null;
    const lo = `${lowChar}0000000-0000-0000-0000-000000000000`;
    qb = qb.gte("id", lo);
    if (highChar) {
      const hi = `${highChar}0000000-0000-0000-0000-000000000000`;
      qb = qb.lt("id", hi);
    }
  }
  const { data, error } = await qb;
  return { data: data ?? [], error };
}

async function processRow(row) {
  try {
    const verdict = await crossCheckRow(row);
    if (dryRun) {
      if (verdict.clean) stats.stamped_clean++;
      else if (verdict.confidence < STAMP_THRESHOLD) stats.skipped++;
      else stats.stamped_flagged++;
      stats.processed++;
      return;
    }
    // ALWAYS stamp — even if confidence is low. Otherwise the row stays
    // auto_verified_at NULL and gets re-checked forever, burning tokens.
    // Low-confidence rows get flagged=true with a 'low_confidence' marker
    // in notes so the human queue treats them as "AI ran but couldn't
    // decide" rather than "AI never ran".
    const lowConfidence = verdict.confidence < STAMP_THRESHOLD;
    const isClean = verdict.clean && !lowConfidence;
    const decision = isClean ? "stamped_clean" : "stamped_flagged";
    const notes = {
      discrepancies: verdict.discrepancies,
      rationale: verdict.rationale,
      model_response: verdict.model_response.slice(0, 4000),
      prompt_hash: verdict.prompt_hash,
      prompt_version: PROMPT_VERSION,
      ran_at: verdict.ran_at,
      checkable: verdict.checkable,
      low_confidence: lowConfidence,
    };
    const { error: upErr } = await supabase
      .from("knowledge_entities")
      .update({
        auto_verified_at: verdict.ran_at,
        auto_verified_by: MODEL,
        auto_verified_source: "claude-cross-check",
        auto_verification_confidence: Number(verdict.confidence.toFixed(2)),
        auto_verification_notes: notes,
        // Anything not 'clean' (including low-confidence) is flagged
        // so it stays in the human queue but is no longer in the
        // un-checked queue.
        auto_verification_flagged: !isClean,
      })
      .eq("id", row.id);
    if (upErr) {
      console.error(`UPDATE ${row.id} failed:`, upErr.message);
      stats.errors++;
    } else {
      if (decision === "stamped_clean") stats.stamped_clean++;
      else stats.stamped_flagged++;
    }
    stats.processed++;
  } catch (e) {
    stats.errors++;
    stats.processed++;
    console.error(`processRow ${row.id} threw:`, e.message);
  }
}

function unwrap(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && typeof v.en === "string") return v.en;
  return JSON.stringify(v).slice(0, 200);
}

function buildPrompt(row) {
  const title = unwrap(row.title);
  const summary = unwrap(row.summary);
  const metaJson = row.metadata ? JSON.stringify(row.metadata).slice(0, 800) : "{}";
  const urls = (row.source_urls ?? []).slice(0, 5).join(", ") || "(none)";
  return [
    `You are auditing one row of a construction-code knowledge base. We will publish this row to California general contractors who rely on it for permit applications, bid pricing, and code compliance. Your job is to flag anything that is factually wrong, misleading, or inconsistent with the canonical code/standard the row claims to describe.`,
    ``,
    `ROW UNDER REVIEW:`,
    `  id: ${row.id}`,
    `  slug: ${row.slug}`,
    `  entity_type: ${row.entity_type}`,
    `  title: ${title || "(empty)"}`,
    `  summary: ${summary || "(empty)"}`,
    `  metadata: ${metaJson}`,
    `  source_urls: ${urls}`,
    ``,
    `RUBRIC:`,
    `  1. Is the title + summary internally consistent? (Does the summary actually describe what the title names?)`,
    `  2. Does the claim match your training knowledge of the cited code/standard? (NEC, IBC, CBC, ASHRAE, OSHA, Title 24, etc.)`,
    `  3. Is the claim concrete enough to be checkable? A summary like "Sustainability practice for X." with no factual assertion is NOT checkable — mark checkable=false.`,
    `  4. If the row cites a specific section/article/chapter, does that citation correspond to the right content?`,
    `  5. If the row gives a numeric threshold (e.g. "20 amps", "R-19", "1/4-inch"), does that number match canon?`,
    ``,
    `OUTPUT — respond with ONLY a JSON object, no prose before or after:`,
    `{`,
    `  "checkable": boolean,`,
    `  "confidence": number,`,
    `  "discrepancies": [string, ...],`,
    `  "rationale": string`,
    `}`,
    ``,
    `Be conservative. If you are not sure about a fact, lower the confidence rather than guess. Empty discrepancies + high confidence is reserved for rows where you are sure the claim is correct.`,
  ].join("\n");
}

function extractJson(text) {
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) { try { return JSON.parse(fence[1]); } catch {} }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) { try { return JSON.parse(text.slice(first, last + 1)); } catch {} }
  return null;
}

function clampConf(v) {
  if (typeof v !== "number" || Number.isNaN(v) || v < 0) return 0;
  if (v > 1) return Math.min(v / 100, 1);
  return v;
}

async function crossCheckRow(row) {
  const prompt = buildPrompt(row);
  const prompt_hash = crypto.createHash("sha256").update(`${PROMPT_VERSION}\n${prompt}`).digest("hex").slice(0, 16);
  const ran_at = new Date().toISOString();
  let model_response = "";
  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      temperature: 0,
      system: "You are a meticulous building-code auditor. Output strictly the requested JSON object. Do not include any prose outside the JSON.",
      messages: [{ role: "user", content: prompt }],
    });
    model_response = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  } catch (e) {
    return {
      confidence: 0, discrepancies: [`api_error: ${e.message}`], checkable: false, clean: false, flagged: true,
      rationale: "API error.", model_response: "", prompt_hash, ran_at,
    };
  }
  const parsed = extractJson(model_response);
  if (!parsed) {
    return {
      confidence: 0, discrepancies: ["parse_error: not JSON"], checkable: false, clean: false, flagged: true,
      rationale: "Model response not JSON.", model_response, prompt_hash, ran_at,
    };
  }
  const confidence = clampConf(parsed.confidence);
  const discrepancies = Array.isArray(parsed.discrepancies) ? parsed.discrepancies.map(String).filter(Boolean).slice(0, 12) : [];
  const checkable = parsed.checkable !== false;
  const rationale = typeof parsed.rationale === "string" ? parsed.rationale.slice(0, 800) : "";
  const clean = checkable && discrepancies.length === 0 && confidence >= CLEAN_THRESHOLD;
  const flagged = !clean && confidence >= STAMP_THRESHOLD;
  return { confidence, discrepancies, checkable, clean, flagged, rationale, model_response, prompt_hash, ran_at };
}

async function runConcurrent(items, n, fn) {
  let i = 0;
  const workers = Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next == null || next.startsWith("--")) out[k] = true;
      else { out[k] = next; i++; }
    }
  }
  return out;
}
