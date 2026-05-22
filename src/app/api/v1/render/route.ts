import { NextRequest, NextResponse } from "next/server";
import { generateRender, generateDreamConcepts, RenderRequest } from "@/lib/ai-render";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-server";

/**
 * POST /api/v1/render
 *
 * Generate AI architecture renders via Replicate FLUX.
 *
 * 2026-05-22 (Sec+Auth Burn 6): now requires a signed-in user. Previously
 * this route was unauthenticated, which meant an attacker could rack up
 * arbitrary Replicate spend from the public internet with no rate limit
 * or accounting. Auth gating + per-user rate limit are the minimum viable
 * brakes; a proper queued/credit-accounted render pipeline is the long-
 * term fix.
 *
 * Body: {
 *   prompt: string          — what to render ("modern farmhouse in Asheville")
 *   style?: string          — "exterior" | "interior" | "aerial" | "sketch" | "material"
 *   aspect?: string         — "landscape" | "portrait" | "square"
 *   quality?: string        — "draft" | "standard" | "high"
 *   mode?: string           — "single" | "concepts" (default: "single")
 *   count?: number          — number of concepts (2-4, default: 4, only for mode=concepts)
 * }
 *
 * Returns: {
 *   success: true,
 *   renders: [{ imageUrl, renderTime, model, prompt }]
 * }
 */

// Per-user in-memory rate limit — 20 renders / 10 min. Sized to cover the
// "Push to Render" + "Generate concepts (4)" flows on a normal demo without
// throttling, while still putting a hard ceiling on a compromised session.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const rateLimitBuckets: Map<string, number[]> = new Map();
function rateLimitExceeded(userId: string): boolean {
  const now = Date.now();
  const arr = (rateLimitBuckets.get(userId) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    rateLimitBuckets.set(userId, arr);
    return true;
  }
  arr.push(now);
  rateLimitBuckets.set(userId, arr);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorizedResponse('Sign in to generate renders');
    if (rateLimitExceeded(user.id)) {
      return NextResponse.json(
        { error: 'Too many renders — try again in a few minutes.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { prompt, style, aspect, quality, mode, count } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "Render service not configured" }, { status: 503 });
    }

    if (mode === "concepts") {
      const renders = await generateDreamConcepts(prompt, Math.min(count || 4, 4));
      return NextResponse.json({
        success: true,
        renders,
        count: renders.length,
      });
    }

    // Single render
    const renderReq: RenderRequest = {
      prompt,
      style: style || "exterior",
      aspect: aspect || "landscape",
      quality: quality || "standard",
    };

    const result = await generateRender(renderReq);
    return NextResponse.json({
      success: true,
      renders: [result],
    });

  } catch (error) {
    console.error("Render error:", error);
    const message = error instanceof Error ? error.message : "Render failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
