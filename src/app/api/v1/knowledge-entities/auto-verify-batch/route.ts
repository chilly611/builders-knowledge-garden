/**
 * POST /api/v1/knowledge-entities/auto-verify-batch  (Option C, 2026-05-25)
 * =========================================================================
 *
 * Server-side batch worker: process up to N rows that still need an AI
 * cross-check, return a continuation cursor. The caller (a local driver
 * script, or eventually a Vercel cron) keeps calling until done=true.
 *
 * Why a chunked endpoint rather than a single long-running job:
 *   - Vercel function deadline (60s hobby / 300s pro). Even at 300s,
 *     2,256 rows × ~1.5s/row = ~56min — way over. Must paginate.
 *   - Resumability — if a chunk fails mid-way, the next call picks up
 *     from the recorded cursor without re-charging the model for rows
 *     we already stamped.
 *   - Observability — each chunk's result fits in one JSON response we
 *     can log.
 *
 * Auth: owner allowlist (same as /attest). The batch endpoint is owner-
 * gated because (a) it costs API tokens and (b) it writes to a column
 * users can read. Service-role writes mean we don't need RLS to permit
 * the UPDATE, but we DO want auth on the entry point.
 *
 * Body (optional):
 *   {
 *     cursor?: string,   // last id processed; default = start at min
 *     limit?: number,    // default 25, max 50 (keeps us comfortably
 *                        // under the Vercel deadline)
 *     dry_run?: boolean  // if true, run the model but DON'T persist;
 *                        // useful for sanity-checking the prompt + cost
 *                        // before the real batch
 *   }
 *
 * Response:
 *   {
 *     processed:        number,            // rows actually stamped or skipped
 *     stamped_clean:    number,            // yellow-tick count
 *     stamped_flagged:  number,            // needs-human count
 *     skipped:          number,            // confidence below threshold
 *     errors:           Array<{ id, error }>,
 *     last_id:          string | null,     // pass back as `cursor`
 *     done:             boolean,           // true when no more rows
 *     dry_run:          boolean,
 *     remaining_estimate: number           // rough count of rows still to do
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { crossCheckRow } from "@/lib/auto-verify/cross-check";
import {
  fetchChunk,
  persistVerdict,
  type PersistResult,
} from "@/lib/auto-verify/persist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Vercel Pro can go up to 300s. We won't actually run that long, but
// raising the limit keeps the deadline > our worst-case chunk time.
export const maxDuration = 300;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role";

const OWNER_EMAILS = new Set<string>([
  "chillyd@gmail.com",
  "charlie@theknowledgegardens.com",
  "bou@theknowledgegardens.com",
]);

// Cap the per-call work. Even on Pro we want fast feedback per chunk so
// the driver script can log progress and we can ctrl-C cleanly.
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 25;

async function resolveOwner(request: NextRequest): Promise<{ id: string; email: string } | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  // Allow service-role token to call this — useful for cron + local driver.
  if (token === serviceRoleKey) {
    return { id: "service-role", email: "service-role" };
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  const email = (data.user.email || "").toLowerCase();
  const role =
    typeof data.user.app_metadata?.role === "string"
      ? data.user.app_metadata.role
      : null;
  if (!OWNER_EMAILS.has(email) && role !== "admin") return null;
  return { id: data.user.id, email };
}

async function countRemaining(): Promise<number> {
  const svc = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { count, error } = await svc
    .from("knowledge_entities")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .is("auto_verified_at", null);
  if (error) return -1;
  return count ?? 0;
}

export async function POST(request: NextRequest) {
  const owner = await resolveOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "anthropic_api_key_missing" },
      { status: 503 }
    );
  }

  let body: { cursor?: string; limit?: number; dry_run?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // empty body is fine
  }

  const limit = Math.max(
    1,
    Math.min(MAX_LIMIT, Math.floor(body.limit ?? DEFAULT_LIMIT))
  );
  const cursor = body.cursor?.trim() || null;
  const dry_run = !!body.dry_run;

  const rows = await fetchChunk(cursor, limit);

  let stamped_clean = 0;
  let stamped_flagged = 0;
  let skipped = 0;
  const errors: Array<{ id: string; error: string }> = [];
  let last_id: string | null = cursor;

  // Sequential to keep API pressure bounded — concurrency 1 is fine for
  // Haiku (fast). If we need throughput later, bump to 3-4 with a small
  // semaphore but watch for rate-limit 429s.
  for (const row of rows) {
    last_id = row.id;
    try {
      const verdict = await crossCheckRow(row);
      if (dry_run) {
        if (verdict.clean) stamped_clean++;
        else if (verdict.flagged) stamped_flagged++;
        else skipped++;
        continue;
      }
      const result: PersistResult = await persistVerdict(row.id, verdict);
      if (result.error) {
        errors.push({ id: row.id, error: result.error });
        continue;
      }
      if (result.decision === "stamped_clean") stamped_clean++;
      else if (result.decision === "stamped_flagged") stamped_flagged++;
      else skipped++;
    } catch (e) {
      errors.push({
        id: row.id,
        error: (e as Error)?.message ?? "unknown_error",
      });
    }
  }

  const remaining = await countRemaining();

  return NextResponse.json({
    processed: rows.length,
    stamped_clean,
    stamped_flagged,
    skipped,
    errors,
    last_id,
    done: rows.length < limit,
    dry_run,
    remaining_estimate: remaining,
  });
}
