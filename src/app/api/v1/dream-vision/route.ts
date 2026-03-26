// Builder's Knowledge Garden — Dream Vision API
// POST /api/v1/dream-vision
// Accepts image (base64 or URL) or text reference → structured style analysis
// Powered by Claude Sonnet with vision

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export interface VisionAnalysis {
  style: string;
  era: string;
  region: string;
  materials: string[];
  features: string[];
  vibe: string;
  buildingType: string;
  confidence: "high" | "medium" | "low";
  dreamText: string;
  source: "base64" | "url" | "text";
}

const SYSTEM_PROMPT = `You are an expert architectural analyst for the Builder's Knowledge Garden.
Analyze buildings and extract structured data that helps someone build something inspired by what they see.
Focus on: specific architectural style, dominant materials, key spatial features, emotional vibe, building type.
Always respond with ONLY valid JSON. No markdown fences, no explanation outside the JSON.`;

const ANALYSIS_PROMPT = `Analyze this building reference and return ONLY a JSON object with these exact fields:
{
  "style": "specific architectural style (e.g. Japandi minimalist, Desert modernist, Brooklyn industrial)",
  "era": "time period or movement (e.g. Contemporary, Mid-century modern, Victorian)",
  "region": "geographic or climate region this evokes (e.g. Pacific Northwest, Mediterranean coast)",
  "materials": ["list", "of", "3-5", "key materials visible or implied"],
  "features": ["list", "of", "4-6", "defining spatial or design features"],
  "vibe": "2-3 sentence impressionistic description of the experience of being there",
  "buildingType": "one of: residential / commercial / industrial / mixed-use / hospitality",
  "confidence": "high if image is clear / medium if partial / low if text-only",
  "dreamText": "A natural language description (2-3 sentences) of what someone would build inspired by this. Include style, key features, materials. Written as a dream brief for an AI construction planner."
}`;

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body = await req.json();
    const { type, data, modifier } = body as {
      type: "base64" | "url" | "text";
      data: string;
      modifier?: string;
    };

    if (!type || !data) {
      return NextResponse.json({ error: "type and data are required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    // Build the message content based on input type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userContent: any[] = [];

    if (type === "base64") {
      // Extract media type from data URL if present
      let mediaType = "image/jpeg";
      let imageData = data;
      if (data.startsWith("data:")) {
        const match = data.match(/^data:([^;]+);base64,(.+)$/);
        if (match) { mediaType = match[1]; imageData = match[2]; }
      }
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: imageData },
      });
      userContent.push({ type: "text", text: ANALYSIS_PROMPT + (modifier ? `\n\nUser modifier: "${modifier}"` : "") });

    } else if (type === "url") {
      userContent.push({
        type: "image",
        source: { type: "url", url: data },
      });
      userContent.push({ type: "text", text: ANALYSIS_PROMPT + (modifier ? `\n\nUser modifier: "${modifier}"` : "") });

    } else {
      // Text reference — no image, just description
      userContent.push({
        type: "text",
        text: `Reference description: "${data}"\n\n${ANALYSIS_PROMPT}${modifier ? `\n\nUser modifier: "${modifier}"` : ""}`,
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic vision error:", err);
      return NextResponse.json({ error: "Vision API error", detail: err }, { status: 502 });
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    // Parse the JSON response — strip any accidental markdown fences
    const clean = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    let analysis: VisionAnalysis;
    try {
      analysis = JSON.parse(clean);
    } catch {
      // If JSON parse fails, return a graceful fallback
      analysis = {
        style: "Contemporary",
        era: "Modern",
        region: "Not specified",
        materials: ["glass", "concrete", "steel"],
        features: ["open plan", "natural light", "clean lines"],
        vibe: "A clean, modern space with emphasis on light and simplicity.",
        buildingType: "residential",
        confidence: "low",
        dreamText: data.length < 200 ? data : data.substring(0, 200),
        source: type,
      };
    }

    analysis.source = type;

    return NextResponse.json({
      analysis,
      latency_ms: Date.now() - start,
    });

  } catch (err) {
    console.error("dream-vision error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
