import { NextRequest, NextResponse } from "next/server";
import { generateRender, generateDreamConcepts, RenderRequest } from "@/lib/ai-render";

/**
 * POST /api/v1/render
 * 
 * Generate AI architecture renders via Replicate FLUX.
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
export async function POST(req: NextRequest) {
  try {
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
