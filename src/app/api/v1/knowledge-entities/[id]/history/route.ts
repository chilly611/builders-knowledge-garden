/**
 * GET /api/v1/knowledge-entities/[id]/history   (LOOP 2 / Slice B, §7)
 * ===================================================================
 * The append-only §3 review-event timeline for one entity — the Time
 * Machine's data source and the auditor's read. Reviewer-only (owner/admin).
 * Reads via the service client because knowledge_review_events RLS is
 * service-role-only. Degrades to an empty timeline + a note if the §3
 * migration hasn't been applied yet.
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveReviewer, isMissingTable } from "@/lib/honesty/review-transition";
import { getServiceClient } from "@/lib/auth-server";

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Entity id required" }, { status: 400 });

  const reviewer = await resolveReviewer(request);
  if (!reviewer) {
    return NextResponse.json({ error: "Reviewer-only." }, { status: 403 });
  }

  const { data, error } = await getServiceClient()
    .from("knowledge_review_events")
    .select("id, action, from_status, to_status, actor_id, actor_kind, note, source, evidence_url, created_at")
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({
        entity_id: id,
        events: [],
        note: "knowledge_review_events not yet provisioned — apply 20260612_knowledge_review_events.sql",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entity_id: id, events: data ?? [] });
}
