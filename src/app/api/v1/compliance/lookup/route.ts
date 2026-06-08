/**
 * Code Compliance Lookup API — Stage 1 (service layer; UI behind Stage 2).
 *
 * GET  /api/v1/compliance/lookup?q=egress+windows&jurisdiction=CA&discipline=fire&limit=10
 * POST /api/v1/compliance/lookup   { "query": "...", "jurisdiction": "...", "discipline": "...", "limit": 10 }
 *
 * Returns code citations drawn ONLY from structured data (jurisdictions +
 * knowledge_entities). Never fabricates a code. When a jurisdiction has no
 * structured coverage, returns an honest "not yet covered for {jurisdiction}"
 * (HTTP 200, body.status === "not_covered") rather than a guess.
 *
 * HTTP status policy:
 *   200 — a real, data-backed answer (status: covered | no_results | not_covered)
 *   400 — missing query or jurisdiction
 *   503 — data source not configured, or temporarily unavailable (fail closed)
 *   500 — unexpected error
 */

import { NextRequest, NextResponse } from "next/server";
import {
  lookupCodeCitations,
  ComplianceDataError,
  type Discipline,
} from "@/lib/compliance-lookup";
import { isSupabaseConfigured } from "@/lib/supabase";
import { eventBus, EVENT_TYPES } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // results depend on live data + params

const VALID_DISCIPLINES: ReadonlySet<string> = new Set([
  "electrical",
  "structural",
  "plumbing",
  "mechanical",
  "fire",
  "general",
]);

function normalizeDiscipline(value: unknown): Discipline | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase();
  return VALID_DISCIPLINES.has(v) ? (v as Discipline) : undefined;
}

async function handle(params: {
  query: string;
  jurisdiction: string;
  discipline?: Discipline;
  limit?: number;
}): Promise<NextResponse> {
  const { query, jurisdiction, discipline, limit } = params;

  if (!query) {
    return NextResponse.json(
      { error: "A query is required. Pass ?q= (GET) or { query } (POST)." },
      { status: 400 }
    );
  }
  if (!jurisdiction) {
    return NextResponse.json(
      { error: "A jurisdiction is required. Pass ?jurisdiction= (GET) or { jurisdiction } (POST)." },
      { status: 400 }
    );
  }
  if (!isSupabaseConfigured()) {
    // No placeholder/mock answers here: a compliance answer with no real data
    // source behind it would be exactly the kind of fabrication we forbid.
    return NextResponse.json(
      { error: "Compliance data source is not configured.", status: "unavailable" },
      { status: 503 }
    );
  }

  try {
    const result = await lookupCodeCitations({ query, jurisdiction, discipline, limit });

    // Best-effort RSI Loop 4 signal — never blocks or alters the response.
    void eventBus
      .emit(
        EVENT_TYPES.COMPLIANCE_CHECK,
        {
          query,
          jurisdiction,
          status: result.status,
          coverage_reason: result.coverage.reason ?? null,
          citation_count: result.citations.length,
          citation_entity_ids: result.citations.map((c) => c.entityId),
        },
        { source: "compliance-lookup-api" }
      )
      .catch(() => {});

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof ComplianceDataError) {
      // Fail closed — surface unavailability, never a fabricated answer.
      return NextResponse.json(
        { error: "Compliance data temporarily unavailable.", status: "unavailable" },
        { status: 503 }
      );
    }
    console.error("compliance lookup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? searchParams.get("query") ?? "").trim();
  const jurisdiction = (searchParams.get("jurisdiction") ?? searchParams.get("j") ?? "").trim();
  const discipline = normalizeDiscipline(searchParams.get("discipline"));
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw != null && limitRaw !== "" ? Number(limitRaw) : undefined;
  return handle({ query, jurisdiction, discipline, limit });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // Tolerate an empty/invalid body — handled as a missing-field 400 below.
  }
  const query = String(body.query ?? body.q ?? "").trim();
  const jurisdiction = String(body.jurisdiction ?? body.j ?? "").trim();
  const discipline = normalizeDiscipline(body.discipline);
  const limit = typeof body.limit === "number" ? body.limit : undefined;
  return handle({ query, jurisdiction, discipline, limit });
}
