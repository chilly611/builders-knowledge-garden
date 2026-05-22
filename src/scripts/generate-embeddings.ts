/**
 * generate-embeddings.ts
 * ---------------------------------------------------------------------------
 * Backfills `knowledge_entities.embedding` (1536-dim pgvector) for any row
 * where it is still NULL. Idempotent — re-running only touches rows missing
 * an embedding.
 *
 * Why it exists:
 *   `rag.ts` is the third "verified" leg of the SourceCountBadge. The
 *   column was provisioned (pgvector 0.8.0, vector(1536)) but 0/2256
 *   published rows had embeddings, so the cosine-similarity path could
 *   never engage and we were limited to FTS. This script generates the
 *   embeddings so the vector path lights up.
 *
 * Provider selection (first match wins):
 *   1. OPENAI_API_KEY        → text-embedding-3-small (1536 dim, default)
 *   2. VOYAGE_API_KEY        → voyage-3-lite          (1024 dim — re-emit
 *                              required if you want to fill the 1536 column;
 *                              we error out unless EMBEDDING_DIM=1024 and
 *                              you've migrated the column).
 *   3. (none)                → exit 0 with a helpful log so the build /
 *                              Vercel deploy never fails just because the
 *                              key isn't wired up yet.
 *
 * Cost (OpenAI, 2026):
 *   ~$0.02 per 1M tokens. 2,256 entries × ~500 tokens avg = ~$0.02 total
 *   for the full backfill. Negligible.
 *
 * Run:
 *   npm run embeddings
 *   # or with overrides:
 *   EMBEDDING_BATCH_SIZE=50 EMBEDDING_MODEL=text-embedding-3-large \
 *     npm run embeddings
 *
 * Required env (any one of the API keys):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY   (server-only — bypasses RLS to update rows)
 *   - OPENAI_API_KEY              (preferred path) OR VOYAGE_API_KEY
 *
 * Optional env:
 *   - EMBEDDING_BATCH_SIZE  (default 100; OpenAI accepts up to 2048 inputs/req
 *                            but 100 keeps individual requests under a few MB)
 *   - EMBEDDING_MODEL       (default text-embedding-3-small)
 *
 * Notes:
 *   - Never imported by app code. Server-only.
 *   - Uses raw `fetch` against the OpenAI/Voyage REST endpoints so we don't
 *     ship the 5MB openai SDK — keeps the dep surface tight.
 */

import { createClient } from "@supabase/supabase-js";

type EmbeddingRow = {
  id: string;
  slug: string | null;
  title: unknown;
  summary: unknown;
  body: unknown;
  search_text: string | null;
};

const DEFAULT_OPENAI_MODEL = "text-embedding-3-small";
const DEFAULT_VOYAGE_MODEL = "voyage-3-lite";
const DEFAULT_BATCH_SIZE = 100;
const MAX_INPUT_CHARS = 8000; // ~2000 tokens; well under the 8192 model limit

function unwrapJsonbText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.en === "string") return obj.en;
    return JSON.stringify(obj);
  }
  return String(value);
}

function composeInput(row: EmbeddingRow): string {
  const title = unwrapJsonbText(row.title);
  const summary = unwrapJsonbText(row.summary);
  const body = unwrapJsonbText(row.body);
  const text = [title, summary, body || row.search_text || ""]
    .filter(Boolean)
    .join("\n\n");
  return text.slice(0, MAX_INPUT_CHARS);
}

interface Provider {
  name: string;
  model: string;
  embed(inputs: string[]): Promise<number[][]>;
}

async function makeOpenAIProvider(apiKey: string): Promise<Provider> {
  // Dynamic import keeps the dep optional at install time; if a user only
  // has VOYAGE_API_KEY, they don't have to install openai. We don't use
  // the official SDK to keep this script dep-free — the REST shape of
  // /v1/embeddings is stable enough that the SDK isn't worth a 5MB add.
  const model = process.env.EMBEDDING_MODEL || DEFAULT_OPENAI_MODEL;
  return {
    name: "openai",
    model,
    async embed(inputs: string[]) {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, input: inputs }),
      });
      if (!res.ok) {
        throw new Error(`OpenAI embed failed: ${res.status} ${await res.text()}`);
      }
      const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
      return json.data.map((d) => d.embedding);
    },
  };
}

async function makeVoyageProvider(apiKey: string): Promise<Provider> {
  const model = process.env.EMBEDDING_MODEL || DEFAULT_VOYAGE_MODEL;
  // voyage-3-lite is 1024-dim — does NOT fit our vector(1536) column out of
  // the box. We hard-stop unless the caller has explicitly migrated the
  // column to 1024 dimensions.
  const expectedDim = Number(process.env.EMBEDDING_DIM) || 1536;
  if (expectedDim !== 1024) {
    throw new Error(
      `[embeddings] Voyage path selected but column is vector(${expectedDim}). ` +
        `voyage-3-lite outputs 1024-dim vectors. Either set OPENAI_API_KEY ` +
        `(1536-dim, matches the column) or migrate the column to vector(1024) ` +
        `and re-run with EMBEDDING_DIM=1024.`
    );
  }
  return {
    name: "voyage",
    model,
    async embed(inputs: string[]) {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, input: inputs }),
      });
      if (!res.ok) {
        throw new Error(`Voyage embed failed: ${res.status} ${await res.text()}`);
      }
      const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
      return json.data.map((d) => d.embedding);
    },
  };
}

async function pickProvider(): Promise<Provider | null> {
  if (process.env.OPENAI_API_KEY) {
    return makeOpenAIProvider(process.env.OPENAI_API_KEY);
  }
  if (process.env.VOYAGE_API_KEY) {
    return makeVoyageProvider(process.env.VOYAGE_API_KEY);
  }
  return null;
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error(
      "[embeddings] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — cannot proceed."
    );
    process.exit(0); // graceful exit so CI doesn't fail
  }

  const provider = await pickProvider();
  if (!provider) {
    console.warn(
      "[embeddings] No OPENAI_API_KEY or VOYAGE_API_KEY found. " +
        "Skipping (graceful exit). Add the key to Vercel env to run this."
    );
    process.exit(0);
  }
  console.log(`[embeddings] Using provider=${provider.name} model=${provider.model}`);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Fetch in pages — Supabase caps single-select at ~1000 rows by default.
  // We page until we've collected every NULL-embedding published row.
  const PAGE = 1000;
  const rows: EmbeddingRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("knowledge_entities")
      .select("id, slug, title, summary, body, search_text")
      .is("embedding", null)
      .eq("status", "published")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("[embeddings] select failed:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    rows.push(...(data as EmbeddingRow[]));
    if (data.length < PAGE) break;
  }
  console.log(`[embeddings] ${rows.length} rows need embeddings`);
  if (rows.length === 0) {
    console.log("[embeddings] Nothing to do. Done.");
    return;
  }

  const batchSize = Number(process.env.EMBEDDING_BATCH_SIZE) || DEFAULT_BATCH_SIZE;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const inputs = batch.map(composeInput);

    let vectors: number[][];
    try {
      vectors = await provider.embed(inputs);
    } catch (err) {
      console.error(
        `[embeddings] batch ${i}-${i + batch.length} failed:`,
        err instanceof Error ? err.message : err
      );
      failed += batch.length;
      continue;
    }

    // Update rows one by one. Supabase doesn't support bulk-update with
    // per-row values via the REST client; this stays simple and correct.
    for (let j = 0; j < batch.length; j++) {
      const { error: updateErr } = await supabase
        .from("knowledge_entities")
        // pgvector accepts JSON arrays; supabase-js serializes correctly.
        .update({ embedding: vectors[j] as unknown as string })
        .eq("id", batch[j].id);
      if (updateErr) {
        console.error(`[embeddings] update failed for ${batch[j].id}: ${updateErr.message}`);
        failed += 1;
      } else {
        succeeded += 1;
      }
    }
    console.log(
      `[embeddings] processed ${Math.min(i + batchSize, rows.length)}/${rows.length} ` +
        `(ok=${succeeded} fail=${failed})`
    );
  }

  console.log(`[embeddings] DONE — succeeded=${succeeded} failed=${failed}`);
  if (failed > 0) process.exit(2);
}

main().catch((e) => {
  console.error("[embeddings] fatal:", e);
  process.exit(1);
});
