import { NextRequest, NextResponse } from "next/server";
import { generateRender, generateDreamConcepts, RenderRequest } from "@/lib/ai-render";
import { getAuthUser } from "@/lib/auth-server";

/**
 * POST /api/v1/render
 *
 * Generate AI architecture renders via Replicate FLUX.
 *
 * 2026-06-14 (Dream Machine fix): the top-of-funnel Dream Machine must let people
 * go from idea → images BEFORE they sign in (founder decision). So this route now
 * allows ANONYMOUS renders under a tighter IP-based rate limit, while signed-in
 * users keep the higher per-user limit + accounting. Both ceilings are the brakes
 * on Replicate spend until a proper queued/credit-accounted pipeline lands.
 *
 * 2026-05-22 (Sec+Auth Burn 6): previously fully unauthenticated → then auth-gated.
 * The gate is relaxed (not removed): anonymous is capped hard per IP.
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
 * Returns: { success: true, renders: [{ imageUrl, renderTime, model, prompt }] }
 *
 * NOTE: in "concepts" mode each call fans out to `count` Replicate predictions.
 * The rate limits below count POSTs, so anonymous IP cost ≈ ANON_MAX × count images.
 */

// Vercel: allow up to 60s so 4 parallel FLUX predictions (Prefer: wait) can finish
// instead of the function being killed mid-flight (which surfaced to users as
// "no images, no error"). runtime=nodejs because the Replicate fetch + polling
// needs the Node runtime, not edge.
export const runtime = "nodejs";
export const maxDuration = 60;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const USER_MAX = 20;          // signed-in: covers "Push to Render" + "Generate concepts (4)" comfortably

const ANON_WINDOW_MS = 15 * 60 * 1000;
const ANON_MAX = 6;           // anonymous per-IP ceiling (tunable). ~ANON_MAX×count images / 15 min / IP.

const userBuckets: Map<string, number[]> = new Map();
const anonBuckets: Map<string, number[]> = new Map();

function rateLimited(buckets: Map<string, number[]>, key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return true;
  }
  arr.push(now);
  buckets.set(key, arr);
  return false;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);

    if (user) {
      if (rateLimited(userBuckets, user.id, RATE_LIMIT_WINDOW_MS, USER_MAX)) {
        return NextResponse.json(
          { error: "Too many renders — try again in a few minutes." },
          { status: 429 }
        );
      }
    } else {
      const ip = clientIp(req);
      if (rateLimited(anonBuckets, ip, ANON_WINDOW_MS, ANON_MAX)) {
        return NextResponse.json(
          { error: "You've hit the free preview limit. Sign in to keep generating.", code: "anon_limit" },
          { status: 429 }
        );
      }
    }

    const body = await req.json();
    const { prompt, style, aspect, quality, mode, count } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      // 503 here is fine: the client guarantees a visual by falling back to a
      // local concept sketch when renders are unavailable.
      return NextResponse.json({ error: "Render service not configured", code: "not_configured" }, { status: 503 });
    }

    if (mode === "concepts") {
      const renders = await generateDreamConcepts(prompt, Math.min(count || 4, 4));
      return NextResponse.json({ success: true, renders, count: renders.length });
    }

    const renderReq: RenderRequest = {
      prompt,
      style: style || "exterior",
      aspect: aspect || "landscape",
      quality: quality || "standard",
    };

    const result = await generateRender(renderReq);
    return NextResponse.json({ success: true, renders: [result] });
  } catch (error) {
    console.error("Render error:", error);
    const message = error instanceof Error ? error.message : "Render failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
