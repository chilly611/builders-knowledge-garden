// Backfill text-embedding-3-small (1536d) into knowledge_entities.embedding
// for rows where embedding IS NULL AND status = 'published'.
//
// AUTH: OPENAI key passed as `x-openai-api-key` header on every call.
// The function never reads OPENAI_API_KEY from env, so the key isn't
// stored in Supabase Edge Function Secrets or anywhere persistent.
// DB access: auto via SUPABASE_SERVICE_ROLE_KEY env var that Supabase provides
// to every Edge Function automatically.
//
// Idempotent: re-runs only touch unembedded rows.
// Batched: 100 rows per OpenAI call (well under the 2048 input cap).
// Cost: ~$0.02 total for 2256 rows at $0.020/1M tokens.
// Edge Function timeout: 150s. Function self-bounds at max_seconds (default
// 120, capped 140). For large corpora, caller invokes repeatedly until
// `remaining: 0`.
//
// Trigger from anywhere:
//   curl -X POST https://vlezoyalutexenbnzzui.supabase.co/functions/v1/backfill-embeddings \
//     -H "x-openai-api-key: sk-..." \
//     -H "Content-Type: application/json" \
//     -d '{"max_seconds": 30}'
//
// Response: {ok, batches, processed, failed, remaining, next_cursor, duration_ms, errors}
//
// Deployed: 2026-05-24 via Cowork. Use the supabase MCP deploy_edge_function tool
// or `supabase functions deploy backfill-embeddings` from the CLI to redeploy.
// verify_jwt: false  (function does its own auth via x-openai-api-key header).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BATCH_SIZE = 100;
const MODEL = "text-embedding-3-small";
const DEFAULT_MAX_SECONDS = 120;

interface KnowledgeRow {
  id: string;
  slug: string;
  title: unknown;
  summary: unknown;
  body: unknown;
  search_text: string | null;
}

function extractEnglish(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (typeof obj.en === "string") return obj.en;
    for (const k of Object.keys(obj)) {
      if (typeof obj[k] === "string") return obj[k] as string;
    }
  }
  return "";
}

function composeInput(row: KnowledgeRow): string {
  const title = extractEnglish(row.title) || row.slug;
  const summary = extractEnglish(row.summary);
  const body = extractEnglish(row.body) || row.search_text || "";
  return `${title}\n\n${summary}\n\n${body}`.slice(0, 8000);
}

async function embedBatch(inputs: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, input: inputs }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errBody.slice(0, 500)}`);
  }
  const data = await res.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "x-openai-api-key, content-type",
  };
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const apiKey = req.headers.get("x-openai-api-key");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "x-openai-api-key header required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const maxSeconds = Math.min(Number(body.max_seconds) || DEFAULT_MAX_SECONDS, 140);
  const deadline = Date.now() + maxSeconds * 1000;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const startedAt = Date.now();
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];
  let lastCursor: string | null = body.cursor ?? null;
  let batches = 0;

  while (Date.now() < deadline) {
    let query = supabase
      .from("knowledge_entities")
      .select("id, slug, title, summary, body, search_text")
      .is("embedding", null)
      .eq("status", "published")
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);
    if (lastCursor) query = query.gt("id", lastCursor);

    const { data: rows, error } = await query;
    if (error) {
      errors.push(`select: ${error.message}`);
      break;
    }
    if (!rows || rows.length === 0) break;

    try {
      const inputs = rows.map(composeInput);
      const embeddings = await embedBatch(inputs, apiKey);
      // .update() per row in parallel — Supabase HTTP handles the burst.
      // NOTE: .upsert() with onConflict:'id' fails on NOT NULL columns (slug, etc)
      // because PostgREST validates insert-side constraints first.
      const updateResults = await Promise.all(
        rows.map((row, i) =>
          supabase
            .from("knowledge_entities")
            .update({ embedding: embeddings[i] })
            .eq("id", row.id)
        )
      );
      for (let i = 0; i < updateResults.length; i++) {
        if (updateResults[i].error) {
          failed++;
          errors.push(`update ${rows[i].id}: ${updateResults[i].error!.message}`);
        } else {
          processed++;
        }
      }
      batches++;
    } catch (err) {
      failed += rows.length;
      errors.push(`batch ${batches}: ${err instanceof Error ? err.message : String(err)}`);
    }

    lastCursor = rows[rows.length - 1].id;
  }

  const { count: remaining } = await supabase
    .from("knowledge_entities")
    .select("*", { count: "exact", head: true })
    .is("embedding", null)
    .eq("status", "published");

  return new Response(
    JSON.stringify({
      ok: failed === 0,
      batches,
      processed,
      failed,
      remaining: remaining ?? -1,
      next_cursor: lastCursor,
      duration_ms: Date.now() - startedAt,
      errors: errors.slice(0, 10),
    }, null, 2),
    {
      status: failed === 0 ? 200 : 207,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
