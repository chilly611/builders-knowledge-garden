/**
 * Server-side executor for HITL workflow transitions (LOOP 2 / Slice B PR2),
 * per docs/code-ingestion-hitl.md §2/§3/§7. The approve/reject/request-changes
 * route handlers are thin wrappers over `applyTransition` — the rules live in
 * one place (the `review-workflow` state machine from PR1) and the I/O lives
 * here.
 *
 * Two clients, on purpose (mirrors the attest route's design):
 *   - The `knowledge_entities` UPDATE runs as the USER (their JWT), so
 *     `audit_log.changed_by = auth.uid()` is populated by the audit trigger —
 *     never the service role. RLS therefore also applies to the write.
 *   - The `knowledge_review_events` INSERT runs as the SERVICE client, because
 *     that table's RLS is service-role-only (§3). The resolved actor_id is
 *     passed explicitly so the semantic log still records who decided.
 *
 * Degrade-gracefully: the event-log INSERT is best-effort. If the §3 migration
 * (`20260612_knowledge_review_events.sql`) has not been applied yet, the table
 * is absent and the INSERT errors — we log it, set `event_logged:false`, and
 * still return success, because the status change + attestation already
 * committed and the column-level `audit_log` trigger captured the change. The
 * gate works the day this ships; the semantic log lights up the day the
 * founder applies the migration.
 */

import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/auth-server";
import { emitKnowledgeReviewSignal } from "@/lib/events";
import {
  validateContext,
  columnEffects,
  reviewEvent,
  type ReviewAction,
  type ReviewStatus,
  type TransitionContext,
} from "./review-workflow";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Reviewer authority — for now the owner allowlist + app_metadata.role==='admin',
// identical to /api/v1/knowledge-entities/:id/attest (approve folds that route
// in). Per spec §6 the dedicated `reviewer` RBAC role supersedes both when RBAC
// lands; the allowlist is the bootstrap. Kept in code so losing the DB can't
// widen who may approve. (Deliberately duplicated rather than refactoring the
// attest route — that's a separate, out-of-scope change.)
const OWNER_EMAILS = new Set<string>([
  "chillyd@gmail.com",
  "charlie@theknowledgegardens.com",
  "bou@theknowledgegardens.com",
]);

export interface Reviewer {
  id: string;
  email: string;
  token: string;
}

/** Resolve + authorize the caller as a reviewer (owner/admin). null → 403. */
export async function resolveReviewer(request: NextRequest): Promise<Reviewer | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;

  const email = (data.user.email || "").toLowerCase();
  const role = typeof data.user.app_metadata?.role === "string" ? data.user.app_metadata.role : null;
  if (!OWNER_EMAILS.has(email) && role !== "admin") return null;

  return { id: data.user.id, email, token };
}

function userClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Columns we read off the row before transitioning (status drives the machine;
 *  the rest enrich the RSI signal). */
const READ_COLUMNS = "id, slug, title, status, auto_verification_confidence";

export interface TransitionInput {
  request: NextRequest;
  entityId: string;
  action: ReviewAction;
  note?: string;
  source?: string;
  evidenceUrl?: string;
  successorId?: string;
}

export interface TransitionResult {
  status: number; // HTTP status the route returns
  body: Record<string, unknown>;
}

/**
 * Apply one workflow transition to an existing knowledge_entities row.
 * Returns the HTTP status + JSON body for the route to echo.
 */
export async function applyTransition(input: TransitionInput): Promise<TransitionResult> {
  const { request, entityId, action } = input;

  const reviewer = await resolveReviewer(request);
  if (!reviewer) {
    return {
      status: 403,
      body: { error: "Reviewer-only: approving/rejecting requires an owner or admin seat." },
    };
  }

  const client = userClient(reviewer.token);

  // Load current state.
  const { data: row, error: readErr } = await client
    .from("knowledge_entities")
    .select(READ_COLUMNS)
    .eq("id", entityId)
    .single();
  if (readErr || !row) {
    const status = readErr?.code === "PGRST116" ? 404 : 500;
    return { status, body: { error: readErr?.message || "Entity not found", code: readErr?.code ?? null } };
  }
  const from = row.status as ReviewStatus;

  const ctx: TransitionContext = {
    actorId: reviewer.id,
    actorKind: "human",
    note: input.note,
    source: input.source,
    evidenceUrl: input.evidenceUrl,
    successorId: input.successorId,
    now: new Date().toISOString(),
  };

  // Validate against the state machine (legal transition + required fields).
  const check = validateContext(action, from, ctx);
  if (!check.ok) {
    // missing required field → 400; illegal transition for this status → 409.
    const status = check.missing.length > 0 ? 400 : 409;
    return { status, body: { error: check.error, from_status: from } };
  }

  const effects = columnEffects(action, from, ctx)!; // non-null: validateContext passed

  // Write the entity update AS THE USER (audit_log.changed_by = auth.uid()).
  const { data: updated, error: updErr } = await client
    .from("knowledge_entities")
    .update(effects)
    .eq("id", entityId)
    .select("id, slug, title, status, published_at, manually_verified_at, manually_verified_by, manually_verified_source, superseded_by")
    .single();
  if (updErr || !updated) {
    const status = updErr?.code === "PGRST116" ? 404 : 500;
    return { status, body: { error: updErr?.message || "Update failed", code: updErr?.code ?? null } };
  }

  // Best-effort semantic event (§3) via the service client (RLS service-only).
  // Degrades gracefully if the migration isn't applied yet.
  let eventLogged = false;
  let eventNote: string | undefined;
  try {
    const event = reviewEvent(entityId, action, from, ctx);
    const { error: evErr } = await getServiceClient().from("knowledge_review_events").insert(event);
    if (evErr) {
      eventNote = isMissingTable(evErr)
        ? "knowledge_review_events not yet provisioned — apply 20260612_knowledge_review_events.sql"
        : `event-log write failed: ${evErr.message}`;
      console.warn("[review-transition]", eventNote);
    } else {
      eventLogged = true;
    }
  } catch (e) {
    eventNote = "event-log write threw (non-fatal)";
    console.warn("[review-transition]", eventNote, e);
  }

  // Best-effort RSI emission (§3) — never blocks the transition.
  try {
    emitKnowledgeReviewSignal({
      entity_id: entityId,
      action,
      from_status: from,
      to_status: (updated.status as ReviewStatus) ?? null,
      actor_kind: "human",
      auto_confidence_at_decision:
        typeof row.auto_verification_confidence === "number" ? row.auto_verification_confidence : null,
    });
  } catch {
    /* analytics must never block the gate */
  }

  return {
    status: 200,
    body: {
      ok: true,
      action,
      from_status: from,
      to_status: updated.status,
      entity: updated,
      event_logged: eventLogged,
      ...(eventNote ? { event_note: eventNote } : {}),
    },
  };
}

/** PostgREST/Postgres "relation does not exist" — the table isn't migrated yet. */
export function isMissingTable(err: { code?: string; message?: string }): boolean {
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();
  return (
    code === "42P01" || // postgres undefined_table
    code === "PGRST205" || // postgrest schema-cache miss
    msg.includes("knowledge_review_events") ||
    msg.includes("does not exist")
  );
}
