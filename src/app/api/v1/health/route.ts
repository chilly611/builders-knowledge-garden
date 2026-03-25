import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Builder's Knowledge Garden API",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    knowledge: {
      entities: "40,000+",
      jurisdictions: 142,
      domains: 8,
      code_sections: 2847,
    },
    endpoints: {
      search: "/api/v1/search?q=query",
      entity: "/api/v1/entities/:id",
      health: "/api/v1/health",
    },
  });
}
