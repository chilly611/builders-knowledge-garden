/**
 * POST /api/v1/knowledge-entities/[id]/approve   (LOOP 2 / Slice B, §7)
 * ====================================================================
 * The load-bearing transition: review → published, which IS a human
 * attestation. Folds in /attest — sets manually_verified_{at,by,source} +
 * published_at + last_verified — and records the §3 review event. A row
 * cannot reach `published` any other way.
 *
 * Body (optional): { source?: string, evidence_url?: string }
 *   source defaults to 'upcodes-essentials' (matches the attest route).
 * Reviewer-only (owner/admin). See applyTransition for the auth + client model.
 */
import { NextRequest, NextResponse } from "next/server";
import { applyTransition } from "@/lib/honesty/review-transition";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Entity id required" }, { status: 400 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const source =
    typeof body?.source === "string" && body.source.trim()
      ? body.source.trim().slice(0, 64)
      : "upcodes-essentials";
  const evidenceUrl = typeof body?.evidence_url === "string" ? body.evidence_url.slice(0, 500) : undefined;

  const r = await applyTransition({ request, entityId: id, action: "approve", source, evidenceUrl });
  return NextResponse.json(r.body, { status: r.status });
}
