/**
 * ai-backfill-kb-urls.ts
 * ---------------------------------------------------------------------------
 * Optional residue backfill — fills `knowledge_entities.source_urls` for any
 * row still missing a URL, using Claude Haiku to suggest 1-3 canonical
 * publisher URLs per row. Each suggestion is HEAD-validated before storing.
 *
 * Why it exists:
 *   The pattern-based SQL backfill (KB-BACKFILL + KB-BACKFILL-V2) reached
 *   100% URL coverage as of 2026-05-22 by using slug-pattern → publisher
 *   landing maps. That covered all 2,256 published rows. This script is the
 *   *third-line* tool for any future drift: when new entities are added with
 *   slugs that don't match the existing patterns, run this to fill them in
 *   without writing another round of SQL UPDATEs.
 *
 * Provider:
 *   Anthropic API → claude-haiku-* (configurable via ANTHROPIC_MODEL).
 *   Haiku because cost is ~$0.25 / 1M input tokens; an average row is
 *   ~200 input tokens + ~80 output tokens, so the all-in cost for the full
 *   2,256-row corpus would be ≈ $0.13. For incremental drift (10-50 rows
 *   at a time) the cost is fractions of a cent per run.
 *
 * Cost estimate (claude-haiku-4-5, 2026 pricing):
 *   - input:  ~$0.25 / 1M tokens
 *   - output: ~$1.25 / 1M tokens
 *   - per row: ~$0.0001
 *   - 1318 rows (the original V2 gap): ~$0.13
 *
 * Run:
 *   npm run kb:ai-backfill
 *   # or with overrides:
 *   AI_BACKFILL_LIMIT=50 AI_BACKFILL_DRY_RUN=1 npm run kb:ai-backfill
 *
 * Required env (script exits 0 with a log if missing — never breaks builds):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY    (server-only — bypasses RLS to update rows)
 *   - ANTHROPIC_API_KEY            (the Haiku call)
 *
 * Optional env:
 *   - ANTHROPIC_MODEL              (default claude-haiku-4-5)
 *   - AI_BACKFILL_LIMIT            (default 200 rows per run; safety cap)
 *   - AI_BACKFILL_BATCH_SIZE       (default 5; rows per parallel Claude call)
 *   - AI_BACKFILL_DRY_RUN          ("1" to log-only, no DB writes)
 *   - AI_BACKFILL_VALIDATE_URLS    ("0" to skip HEAD validation; default 1)
 *
 * Notes:
 *   - Server-only. Never imported by app code.
 *   - HEAD requests use a 5s timeout and a Mozilla UA so publisher sites
 *     that bot-block respond reasonably; on 4xx/5xx we discard that URL but
 *     keep any siblings the model suggested.
 *   - Uses the @anthropic-ai/sdk that's already a project dep.
 *   - Only writes rows where `source_urls` is empty AND at least one
 *     suggested URL HEAD-validates. Never overwrites curated URLs.
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

type Row = {
  id: string;
  slug: string;
  entity_type: string;
  title: unknown;
};

const DEFAULT_MODEL = "claude-haiku-4-5";
const DEFAULT_LIMIT = 200;
const DEFAULT_BATCH_SIZE = 5;
const HEAD_TIMEOUT_MS = 5000;

// Trusted publishers — passed to the model in the system prompt as the
// preferred URL universe. Keep in sync with EXTERNAL-CODE-SOURCES.md.
const TRUSTED_PUBLISHERS = [
  // Codes & standards
  "iccsafe.org",
  "codes.iccsafe.org",
  "nfpa.org",
  "ashrae.org",
  "asce.org",
  "aisc.org",
  "concrete.org", // ACI
  "cement.org", // Portland Cement Association
  "awc.org", // American Wood Council
  "masonrystandards.org", // TMS
  "astm.org",
  "aamanet.org", // glazing
  "iapmo.org", // UPC plumbing
  "tcnatile.com", // tile
  "gypsum.org",
  "nrca.net", // roofing
  "insulationinstitute.org",
  "naima.org",
  "paint.org",
  "nema.org", // electrical
  "pci.org", // precast concrete
  "aluminum.org",
  "buildingenclosureonline.com",
  "buildingsmart.org", // BIM
  // Sustainability
  "usgbc.org",
  "wellcertified.com",
  "living-future.org",
  "energystar.gov",
  "phius.org", // passive house
  "carbonleadershipforum.org",
  "energy.ca.gov",
  "bsc.ca.gov",
  // Government / regulatory
  "osha.gov",
  "epa.gov",
  "dot.gov",
  "msha.gov",
  "law.cornell.edu",
  "dol.gov",
  "ada.gov",
  "bls.gov",
  "hcd.ca.gov",
  "cslb.ca.gov",
  "tdlr.texas.gov",
  "myfloridalicense.com",
  // Industry / professional
  "aia.org",
  "aiacontracts.org",
  "consensusdocs.org",
  "ejcdc.org",
  "dbia.org",
  "cmaanet.org",
  "pmi.org",
  "ncees.org",
  "nicet.org",
  "sfpe.org",
  "aws.org",
  "ashe.org",
  "iii.org", // insurance
  // International
  "gov.uk",
  "ncc.abcb.gov.au",
  "eurocodes.jrc.ec.europa.eu",
  "mlit.go.jp",
  "mohurd.gov.cn",
  "bis.gov.in",
  "bca.gov.sg",
];

function unwrapTitle(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.en === "string") return obj.en;
    return JSON.stringify(obj);
  }
  return String(value);
}

async function headCheck(url: string): Promise<boolean> {
  if (process.env.AI_BACKFILL_VALIDATE_URLS === "0") return true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // Some publishers (concrete.org, fmcsa.dot.gov) bot-block default UAs.
        // Using a real-browser UA gets a clean 200/30x most of the time.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,*/*;q=0.8",
      },
    });
    return res.status < 400;
  } catch {
    // Network error or timeout — treat as unreachable, skip this URL.
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function extractJsonArray(text: string): string[] {
  // Try strict JSON parse first; fall back to bracket extraction.
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
  } catch {
    // continue
  }
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
  } catch {
    // give up
  }
  return [];
}

async function suggestUrls(
  client: Anthropic,
  model: string,
  row: Row
): Promise<string[]> {
  const title = unwrapTitle(row.title);
  const prompt = `Entity type: ${row.entity_type}
Slug: ${row.slug}
Title: ${title}

Suggest 1-3 canonical URLs from these trusted publishers (or their direct subdomains):
${TRUSTED_PUBLISHERS.join(", ")}

Pick the publisher whose canonical landing page best documents this entity.
Reply with ONLY a JSON array of URL strings, e.g. ["https://example.org/path"].
No prose, no markdown, no explanations.`;

  const resp = await client.messages.create({
    model,
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = resp.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];
  return extractJsonArray(textBlock.text);
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.log(
      "[ai-backfill] Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / " +
        "SUPABASE_SERVICE_ROLE_KEY). Skipping."
    );
    process.exit(0);
  }
  if (!anthropicKey) {
    console.log(
      "[ai-backfill] ANTHROPIC_API_KEY not set — skipping. " +
        "Set the key and re-run to fill any residual rows."
    );
    process.exit(0);
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const limit = Number(process.env.AI_BACKFILL_LIMIT) || DEFAULT_LIMIT;
  const batchSize = Number(process.env.AI_BACKFILL_BATCH_SIZE) || DEFAULT_BATCH_SIZE;
  const dryRun = process.env.AI_BACKFILL_DRY_RUN === "1";

  const supabase = createClient(supabaseUrl, serviceKey);
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  // Fetch rows still missing URLs. PostgREST cannot represent
  // `array_length(...) IS NULL OR = 0` cleanly, so we filter
  // server-side for `eq('source_urls', '{}')` plus `is null`.
  const { data: emptyRows, error: e1 } = await supabase
    .from("knowledge_entities")
    .select("id,slug,entity_type,title,source_urls")
    .eq("status", "published")
    .eq("source_urls", "{}")
    .limit(limit);
  if (e1) throw e1;

  const { data: nullRows, error: e2 } = await supabase
    .from("knowledge_entities")
    .select("id,slug,entity_type,title,source_urls")
    .eq("status", "published")
    .is("source_urls", null)
    .limit(limit);
  if (e2) throw e2;

  const rows = [...(emptyRows || []), ...(nullRows || [])].slice(0, limit) as Row[];
  if (rows.length === 0) {
    console.log("[ai-backfill] No rows missing source_urls. Nothing to do.");
    return;
  }

  console.log(
    `[ai-backfill] Processing ${rows.length} row(s) ` +
      `(model=${model}, batch=${batchSize}, dryRun=${dryRun})`
  );

  let filled = 0;
  let skipped = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (row) => {
        try {
          const suggestions = await suggestUrls(anthropic, model, row);
          const validated: string[] = [];
          for (const url of suggestions) {
            if (typeof url !== "string") continue;
            if (!/^https?:\/\//.test(url)) continue;
            // eslint-disable-next-line no-await-in-loop
            const ok = await headCheck(url);
            if (ok) validated.push(url);
          }
          return { row, validated };
        } catch (err) {
          console.warn(
            `[ai-backfill] suggest failed for ${row.slug}:`,
            (err as Error).message
          );
          return { row, validated: [] };
        }
      })
    );

    for (const { row, validated } of results) {
      if (validated.length === 0) {
        skipped += 1;
        console.log(`  - [skip] ${row.entity_type}/${row.slug} — no valid URL`);
        continue;
      }
      console.log(
        `  - [fill] ${row.entity_type}/${row.slug} → ${validated.join(", ")}`
      );
      if (dryRun) continue;
      const { error: upErr } = await supabase
        .from("knowledge_entities")
        .update({
          source_urls: validated,
          last_verified: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (upErr) {
        console.warn(
          `[ai-backfill] update failed for ${row.slug}:`,
          upErr.message
        );
        skipped += 1;
        continue;
      }
      filled += 1;
    }
  }

  console.log(
    `[ai-backfill] Done. filled=${filled}, skipped=${skipped}, ` +
      `total=${rows.length}${dryRun ? " (dry-run)" : ""}`
  );
}

main().catch((err) => {
  console.error("[ai-backfill] fatal:", err);
  process.exit(1);
});
