/**
 * POST /api/v1/knowledge-entities/[id]/attest    (ATTEST-WIRE, 2026-05-24)
 * DELETE /api/v1/knowledge-entities/[id]/attest  — revoke an attestation
 * =======================================================================
 *
 * Stamps a knowledge_entities row as manually verified by an owner who has
 * a seat at an external licensed source (UpCodes Essentials, ICC Digital
 * Codes Premium, a physical codebook). Counts as +1 in countVerifiedSources
 * via the `manual-attestation` pseudo-source — the legitimate path from
 * "1 source verified" (bkg-seed) to "2 sources verified" (bkg-seed +
 * owner-confirmed-against-UpCodes).
 *
 * Auth model — owner-only allowlist:
 *   - user must be authenticated (Bearer JWT via getAuthUser)
 *   - email must be in OWNER_EMAILS, OR
 *   - app_metadata.role === 'admin' (set out-of-band; safe fallback for
 *     future ops staff without editing this file)
 *
 * Body (POST):
 *   { source?: string, notes?: string }
 *     source — defaults to 'upcodes-essentials'. Free text identifier
 *              of which licensed source the reviewer checked against.
 *     notes  — optional, not persisted (the audit_log trigger writes
 *              before/after JSONB diff, which is the durable record).
 *              Future: append to a notes column if we add one.
 *
 * Side effects:
 *   - UPDATE knowledge_entities SET manually_verified_at = now(),
 *       manually_verified_by = auth.uid(),
 *       manually_verified_source = body.source
 *     WHERE id = :id
 *   - audit_trigger_fn AFTER UPDATE writes audit_log row with full diff
 *     and changed_by = auth.uid() (NOT bypassed — we use the user's JWT,
 *     not service_role).
 *
 * DELETE clears the trio (in case of mistaken attestation). Same auth.
 * The DELETE also fires the audit trigger so revocations are recoverable.
 *
 * Risk callouts (see docs/UPCODES-VERIFICATION.md):
 *   - Double-attestation race: two tabs click Verify at the same time.
 *     Idempotent semantics — the second UPDATE just overwrites
 *     manually_verified_at with a near-identical now() and bumps
 *     manually_verified_by to the same user. No corruption; one extra
 *     audit_log row. Not worth a row-level lock.
 *   - Wrong attestation: revoke via DELETE → audit_log preserves
 *     who-attested-when so we can publish a correction notice.
 *   - Service-role bypass: this route deliberately uses the user's JWT,
 *     NOT the service client, so RLS + audit-trigger semantics apply.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Owner allowlist — kept in code (not the DB) because losing the DB
// shouldn't expand the set of people who can attest. Adding someone
// requires a code change + review. Lowercase comparisons.
const OWNER_EMAILS = new Set<string>([
  "chillyd@gmail.com",
  "charlie@theknowledgegardens.com",
  "bou@theknowledgegardens.com",
]);

const DEFAULT_SOURCE = "upcodes-essentials";

interface AttestUser {
  id: string;
  email: string;
  role: string | null;
}

/**
 * Resolve the caller's identity from the Authorization header AND verify
 * they're on the owner allowlist (or carry app_metadata.role === 'admin').
 * Returns null when the caller can't attest — caller MUST 401/403.
 */
async function resolveOwner(request: NextRequest): Promise<AttestUser | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  // Use the user's token so the UPDATE flows as them, not as service_role.
  // This is intentional: we want auth.uid() to populate audit_log.changed_by
  // and we want RLS to enforce normal row visibility on this UPDATE.
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  const u = data.user;
  const email = (u.email || "").toLowerCase();
  const role =
    typeof u.app_metadata?.role === "string" ? u.app_metadata.role : null;

  const isOwner = OWNER_EMAILS.has(email) || role === "admin";
  if (!isOwner) return null;

  return { id: u.id, email, role };
}

/**
 * Build a Supabase client that performs the UPDATE *as the user* — so
 * auth.uid() is non-null inside the audit trigger.
 */
function userClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function getToken(request: NextRequest): string | null {
  const h = request.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.replace("Bearer ", "").trim() || null;
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json(
      { error: "Entity id required" },
      { status: 400 }
    );
  }

  const owner = await resolveOwner(request);
  if (!owner) {
    return NextResponse.json(
      { error: "Owner-only: attestation requires a seat with a licensed source." },
      { status: 403 }
    );
  }
  const token = getToken(request)!; // resolveOwner already verified

  // Body is optional; default source = 'upcodes-essentials'.
  let source = DEFAULT_SOURCE;
  let notes: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.source === "string" && body.source.trim()) {
      source = body.source.trim().slice(0, 64);
    }
    if (typeof body?.notes === "string") {
      notes = body.notes.slice(0, 1024);
    }
  } catch {
    /* empty body → defaults */
  }

  const client = userClient(token);
  const { data, error } = await client
    .from("knowledge_entities")
    .update({
      manually_verified_at: new Date().toISOString(),
      manually_verified_by: owner.id,
      manually_verified_source: source,
    })
    .eq("id", id)
    .select(
      "id, slug, title, manually_verified_at, manually_verified_by, manually_verified_source"
    )
    .single();

  if (error) {
    // PostgREST error PGRST116 = no rows returned (id not found)
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json(
      { error: error.message, code: error.code ?? null },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    entity: data,
    attested_by: owner.email,
    source,
    notes_received: !!notes,
  });
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json(
      { error: "Entity id required" },
      { status: 400 }
    );
  }
  const owner = await resolveOwner(request);
  if (!owner) {
    return NextResponse.json(
      { error: "Owner-only: only attesters can revoke attestations." },
      { status: 403 }
    );
  }
  const token = getToken(request)!;
  const client = userClient(token);

  const { data, error } = await client
    .from("knowledge_entities")
    .update({
      manually_verified_at: null,
      manually_verified_by: null,
      manually_verified_source: null,
    })
    .eq("id", id)
    .select("id, slug, manually_verified_at")
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json(
      { error: error.message, code: error.code ?? null },
      { status }
    );
  }
  return NextResponse.json({ ok: true, entity: data, revoked_by: owner.email });
}
