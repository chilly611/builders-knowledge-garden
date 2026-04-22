// POST /api/v1/rsi/heartbeat
// Cron-triggered RSI synthesis: cluster feedback, propose deltas
// Auth: x-cron-secret header against CRON_SECRET env var

import { NextRequest, NextResponse } from "next/server";
import { synthesizeDeltas } from "@/lib/rsi/synth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  // Verify cron secret
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("[RSI Heartbeat] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Service misconfigured: CRON_SECRET not set" },
      { status: 500 }
    );
  }

  if (cronSecret !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized: invalid or missing x-cron-secret" },
      { status: 401 }
    );
  }

  try {
    // Determine time window (default: last 24 hours)
    const since24hAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Run synthesis
    const result = await synthesizeDeltas(since24hAgo);

    const duration = Date.now() - startTime;
    console.log(`[RSI Heartbeat] Proposed ${result.proposed} deltas in ${duration}ms`);

    return NextResponse.json({
      ok: true,
      proposed: result.proposed,
      durationMs: duration,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    const errMsg = err instanceof Error ? err.message : String(err);

    console.error(`[RSI Heartbeat] Failed after ${duration}ms:`, errMsg);

    return NextResponse.json(
      {
        ok: false,
        error: errMsg,
        durationMs: duration,
      },
      { status: 500 }
    );
  }
}
