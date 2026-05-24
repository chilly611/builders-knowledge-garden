/**
 * POST   /api/v1/knowledge-entities/[id]/auto-verify  (re-run one row)
 * DELETE /api/v1/knowledge-entities/[id]/auto-verify  (clear auto stamp)
 * ====================================================================
 *
 * Companion to the batch endpoint. POST re-runs the AI cross-check on a
 * SINGLE row and stamps it — useful when:
 *   - A reviewer fixed a row's content and wants the AI to re-evaluate
 *   - The prompt template was updated and we want to re-score one row
 *     to compare against the old verdict
 *   - Debugging: see exactly what the model said for a specific row
 *
 * DELETE clears the auto_verified_* trio + flag (does NOT touch
 * manually_verified_*). Useful when we want a row to flow through the
 * next batch cycle from scratch.
 *
 * Auth: owner allowlist, same as the batch endpoint and /attest.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { crossCheckRow } from "@/lib/auto-verify/cross-check";
import { persistVerdict } from "@/lib/auto-verify/persist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

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

interface OwnerInfo {
  id: string;
  email: string;
}

async function resolveOwner(request: NextRequest): Promise<OwnerInfo | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const owner = await resolveOwner(request);
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "anthropic_api_key_missing" },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const svc = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error: fetchErr } = await svc
    .from("knowledge_entities")
    .select(
      "id, slug, entity_type, title, summary, jurisdiction_ids, source_urls, metadata, status"
    )
    .eq("id", id)
    .single();
  if (fetchErr || !row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const verdict = await crossCheckRow(row);
  const persisted = await persistVerdict(id, verdict);

  return NextResponse.json({
    id,
    decision: persisted.decision,
    confidence: persisted.confidence,
    discrepancies: persisted.discrepancies,
    flagged: !verdict.clean,
    rationale: verdict.rationale,
    model: verdict.model,
    error: persisted.error,
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const owner = await resolveOwner(request);
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const svc = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await svc
    .from("knowledge_entities")
    .update({
      auto_verified_at: null,
      auto_verified_by: null,
      auto_verified_source: null,
      auto_verification_confidence: null,
      auto_verification_notes: null,
      auto_verification_flagged: false,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id, cleared: true });
}
