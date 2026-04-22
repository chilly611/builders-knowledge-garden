// POST /api/v1/rsi/feedback
// Record user feedback on a specialist run outcome
// Auth: app auth (extracts userId from request context)

import { NextRequest, NextResponse } from "next/server";
import { recordFeedback } from "@/lib/rsi/feedback";

interface FeedbackBody {
  specialistRunId: string;
  signal: 'thumbs_up' | 'thumbs_down' | 'correction' | 'outcome_success' | 'outcome_failure' | 'ahj_contradiction';
  note?: string;
  context?: Record<string, unknown>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as FeedbackBody;

    // Validate required fields
    if (!body.specialistRunId || !body.signal) {
      return NextResponse.json(
        { error: "Missing required fields: specialistRunId, signal" },
        { status: 400 }
      );
    }

    // Validate signal enum
    const validSignals = ['thumbs_up', 'thumbs_down', 'correction', 'outcome_success', 'outcome_failure', 'ahj_contradiction'];
    if (!validSignals.includes(body.signal)) {
      return NextResponse.json(
        { error: `Invalid signal: ${body.signal}` },
        { status: 400 }
      );
    }

    // TODO: Extract userId from request context (Clerk, Supabase Auth, etc.)
    // For now, extract from custom header or leave empty for anonymous feedback
    const userId = request.headers.get("x-user-id") || undefined;

    // Record feedback
    const result = await recordFeedback({
      specialistRunId: body.specialistRunId,
      userId,
      signal: body.signal,
      note: body.note,
      context: body.context,
    });

    if (!result.id) {
      // Feedback recording failed silently (to prevent workflow disruption)
      // Return 202 Accepted anyway to keep UX smooth
      return NextResponse.json(
        {
          ok: false,
          message: "Feedback recorded (background logging may have failed)",
        },
        { status: 202 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        id: result.id,
      },
      { status: 201 }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[RSI Feedback API] Error:", errMsg);

    return NextResponse.json(
      {
        ok: false,
        error: errMsg,
      },
      { status: 500 }
    );
  }
}
