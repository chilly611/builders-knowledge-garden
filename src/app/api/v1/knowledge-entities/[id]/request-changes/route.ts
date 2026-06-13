/**
 * POST /api/v1/knowledge-entities/[id]/request-changes   (LOOP 2 / Slice B, §7)
 * ============================================================================
 * review → needs_changes. Requires a plain-language note (the helper 400s
 * without one) — the instruction the author/pipeline acts on. The author of
 * the resubmit (pipeline re-run vs human) is open question §6; this endpoint
 * is agnostic to it — it records the request; `resubmit` (needs_changes →
 * review) is already in the state machine for whoever acts.
 * Reviewer-only (owner/admin).
 *
 * Body: { note: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { applyTransition } from "@/lib/honesty/review-transition";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Entity id required" }, { status: 400 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const raw = typeof body?.note === "string" ? body.note : "";
  const note = raw.trim() ? raw.trim().slice(0, 2000) : undefined;

  const r = await applyTransition({ request, entityId: id, action: "request_changes", note });
  return NextResponse.json(r.body, { status: r.status });
}
