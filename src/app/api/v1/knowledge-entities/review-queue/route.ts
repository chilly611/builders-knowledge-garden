/**
 * GET /api/v1/knowledge-entities/review-queue   (LOOP 2 / Slice B, §6/§7)
 * =======================================================================
 * The approval inbox: rows awaiting a human decision (status review or
 * needs_changes). Reviewer-only (owner/admin). Reads via the service client
 * so the queue sees non-served rows regardless of RLS.
 *
 * Query params (all optional): status, domain, entity_type, jurisdiction
 * (a jurisdiction id matched against jurisdiction_ids[]), flagged (true|false),
 * limit (default 25, max 100). Default sort matches Wave 1 (§5): AI-flagged
 * first, then lowest auto-confidence first.
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveReviewer } from "@/lib/honesty/review-transition";
import { getServiceClient } from "@/lib/auth-server";

const QUEUE_STATUSES = ["review", "needs_changes"] as const;

export async function GET(request: NextRequest) {
  const reviewer = await resolveReviewer(request);
  if (!reviewer) {
    return NextResponse.json({ error: "Reviewer-only." }, { status: 403 });
  }

  const sp = new URL(request.url).searchParams;
  const status = sp.get("status");
  const domain = sp.get("domain");
  const entityType = sp.get("entity_type");
  const jurisdiction = sp.get("jurisdiction");
  const flagged = sp.get("flagged");
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 25, 1), 100);

  let q = getServiceClient()
    .from("knowledge_entities")
    .select(
      "id, slug, title, entity_type, domain, status, jurisdiction_ids, auto_verification_flagged, auto_verification_confidence, source_urls, updated_at",
      { count: "exact" }
    );

  // status: a specific queue status, or both review + needs_changes.
  if (status && (QUEUE_STATUSES as readonly string[]).includes(status)) {
    q = q.eq("status", status);
  } else {
    q = q.in("status", QUEUE_STATUSES as unknown as string[]);
  }
  if (domain) q = q.eq("domain", domain);
  if (entityType) q = q.eq("entity_type", entityType);
  if (jurisdiction) q = q.contains("jurisdiction_ids", [jurisdiction]);
  if (flagged === "true" || flagged === "false") {
    q = q.eq("auto_verification_flagged", flagged === "true");
  }

  // Wave 1 order (§5): flagged first, then lowest confidence first.
  q = q
    .order("auto_verification_flagged", { ascending: false })
    .order("auto_verification_confidence", { ascending: true, nullsFirst: false })
    .limit(limit);

  const { data, error, count } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [], count: count ?? (data?.length ?? 0), limit });
}
