#!/usr/bin/env node
/**
 * AUTO-VERIFY driver (2026-05-25)
 * ===============================
 *
 * Loops the POST /api/v1/knowledge-entities/auto-verify-batch endpoint
 * until done=true, prints progress, totals at the end.
 *
 * Usage:
 *   BKG_TOKEN=<owner-jwt-or-service-role> \
 *   node scripts/auto-verify-driver.mjs \
 *     --base https://builders.theknowledgegardens.com \
 *     [--limit 25] \
 *     [--dry-run] \
 *     [--max-chunks 999]
 *
 * Environment:
 *   BKG_TOKEN   required — owner JWT or SUPABASE_SERVICE_ROLE_KEY
 *   BKG_BASE    optional — overrides --base
 *
 * Resumable: the endpoint uses (auto_verified_at IS NULL) as the queue
 * filter, so re-running picks up where we left off automatically. The
 * `cursor` here is just a within-call optimization to skip already-
 * processed rows in the SAME chunk window.
 */

const args = parseArgs(process.argv.slice(2));
const base = (args.base || process.env.BKG_BASE || "https://builders.theknowledgegardens.com").replace(/\/+$/, "");
const limit = clampInt(args.limit, 1, 50, 25);
const dryRun = args["dry-run"] === true;
const maxChunks = clampInt(args["max-chunks"], 1, 1_000_000, 999);
const token = process.env.BKG_TOKEN;

if (!token) {
  console.error("BKG_TOKEN env var required (owner JWT or service-role key)");
  process.exit(2);
}

const url = `${base}/api/v1/knowledge-entities/auto-verify-batch`;
console.log(`[auto-verify] target=${url}`);
console.log(`[auto-verify] limit=${limit} dry_run=${dryRun} max_chunks=${maxChunks}`);

let cursor = null;
let totals = { processed: 0, stamped_clean: 0, stamped_flagged: 0, skipped: 0, errors: 0 };
const startedAt = Date.now();
let chunkN = 0;

while (chunkN < maxChunks) {
  chunkN += 1;
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ cursor, limit, dry_run: dryRun }),
    });
  } catch (e) {
    console.error(`[chunk ${chunkN}] network error: ${e.message}`);
    await sleep(2000);
    continue;
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error(`[chunk ${chunkN}] HTTP ${res.status}: ${txt.slice(0, 300)}`);
    if (res.status === 401 || res.status === 403) process.exit(3);
    await sleep(2000);
    continue;
  }
  let json;
  try {
    json = await res.json();
  } catch (e) {
    console.error(`[chunk ${chunkN}] non-JSON response: ${e.message}`);
    await sleep(1000);
    continue;
  }
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  totals.processed += json.processed || 0;
  totals.stamped_clean += json.stamped_clean || 0;
  totals.stamped_flagged += json.stamped_flagged || 0;
  totals.skipped += json.skipped || 0;
  totals.errors += (json.errors || []).length;
  cursor = json.last_id;

  const remaining = json.remaining_estimate ?? "?";
  console.log(
    `[chunk ${chunkN}] ${dt}s — processed=${json.processed} clean=${json.stamped_clean} flagged=${json.stamped_flagged} skipped=${json.skipped} errors=${(json.errors || []).length} | remaining≈${remaining} | last_id=${cursor ?? "(none)"}`
  );
  if (json.errors && json.errors.length > 0) {
    for (const e of json.errors.slice(0, 3)) {
      console.log(`    err ${e.id}: ${String(e.error).slice(0, 200)}`);
    }
  }
  if (json.done) break;
}

const dt = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log("---");
console.log(`[auto-verify] done in ${dt}s across ${chunkN} chunks`);
console.log(`  processed:        ${totals.processed}`);
console.log(`  stamped_clean:    ${totals.stamped_clean}    (yellow tick)`);
console.log(`  stamped_flagged:  ${totals.stamped_flagged}    (needs human review)`);
console.log(`  skipped:          ${totals.skipped}    (low confidence, not stamped)`);
console.log(`  errors:           ${totals.errors}`);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next == null || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

function clampInt(v, lo, hi, dflt) {
  const n = parseInt(v ?? "", 10);
  if (Number.isNaN(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
