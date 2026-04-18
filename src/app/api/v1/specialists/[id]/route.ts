// Builder's Knowledge Garden — Specialist API Route
// POST /api/v1/specialists/[id]
// Rate-limited specialist endpoint for StepCard integration

import { NextRequest, NextResponse } from "next/server";
import { callSpecialist, type SpecialistContext, type SpecialistResult } from "@/lib/specialists";

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITING STUB
// ─────────────────────────────────────────────────────────────────────────────
// TODO: Real implementation will:
// - Extract user ID from session/headers
// - Query rate limit table in Supabase
// - Apply tier-based caps (free: 50/month, 10/day; pro: unlimited)
// - Return { allowed: boolean, remaining: number, resetAt: Date }
interface RateLimitResult {
  allowed: boolean;
  remaining?: number;
  resetAt?: string;
}

async function checkRateLimit(userId: string, specialistId: string): Promise<RateLimitResult> {
  // Stub for now; all requests allowed
  // Real implementation will check Supabase rate_limits table
  return { allowed: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: specialistId } = await params;

  // Only POST
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  // Parse request body
  let body: SpecialistContext;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate required fields
  if (
    !body.scope_description ||
    typeof body.scope_description !== "string" ||
    body.scope_description.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "scope_description is required and must be non-empty" },
      { status: 400 }
    );
  }

  if (body.scope_description.length > 10_000) {
    return NextResponse.json(
      { error: "scope_description exceeds maximum length (10,000 characters)" },
      { status: 400 }
    );
  }

  // TODO: Rate limit check (stub for now)
  // const userId = request.headers.get("X-User-Id") || "anonymous";
  // const rateLimitResult = await checkRateLimit(userId, specialistId);
  // if (!rateLimitResult.allowed) {
  //   return NextResponse.json(
  //     { error: "rate_limit_exceeded", remaining: rateLimitResult.remaining, resetAt: rateLimitResult.resetAt },
  //     { status: 429 }
  //   );
  // }

  try {
    // Call the specialist
    const result = await callSpecialist(specialistId, body);

    return NextResponse.json(result as SpecialistResult, { status: 200 });
  } catch (err) {
    console.error(`Specialist API error [${specialistId}]:`, err);

    // Never leak internal error details to client
    return NextResponse.json(
      {
        error: "specialist_failed",
        message: "The specialist could not complete this request",
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OTHER METHODS
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
