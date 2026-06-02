import { NextResponse } from "next/server";
import { getCapabilityStats } from "@/lib/capability-stats";

export async function GET() {
  // Live counts (verified fallback, never invented) — same source as the
  // homepage counters. Replaces the hardcoded "40,000+ / 142" marketing
  // numbers this endpoint used to assert. (2026-06-02)
  const stats = await getCapabilityStats();
  return NextResponse.json({
    status: "ok",
    service: "Builder's Knowledge Garden API",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    knowledge: {
      entities: stats.entities,
      jurisdictions: stats.jurisdictions,
    },
    endpoints: {
      search: "/api/v1/search?q=query",
      entity: "/api/v1/entities/:id",
      health: "/api/v1/health",
    },
  });
}
