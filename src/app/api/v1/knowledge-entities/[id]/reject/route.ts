/**
 * POST /api/v1/knowledge-entities/[id]/reject   (LOOP 2 / Slice B, §7)
 * ===================================================================
 * review → rejected. Requires a plain-language reason (the helper 400s
 * without one) so the §3 event log records WHY, not just that it happened.
 * Reviewer-only (owner/admin).
 *
 * Body: { reason: string }  (alias: note)
 */
import { NextRequest, NextResponse } from "next/server";
import { applyTransition } from "@/lib/honesty/review-transition";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Entity id required" }, { status: 400 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const raw = typeof body?.reason === "string" ? body.reason : typeof body?.note === "string" ? body.note : "";
  const note = raw.trim() ? raw.trim().slice(0, 2000) : undefined;

  const r = await applyTransition({ request, entityId: id, action: "reject", note });
  return NextResponse.json(r.body, { status: r.status });
}
