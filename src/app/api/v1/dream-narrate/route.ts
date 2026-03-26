// Builder's Knowledge Garden — Dream Narrate API
// POST /api/v1/dream-narrate
// Takes a dreamText + DreamPlan summary → returns a vivid 2-paragraph scene narration
// This is the "wow moment" at the top of the result page

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export interface NarrateRequest {
  dreamText: string;
  style?: string;
  location?: string;
  sqft?: number;
  totalCost?: number;
}

export interface NarrateResponse {
  arrival: string;    // paragraph 1: arriving at / approaching the home
  living: string;     // paragraph 2: a day in the life / how it feels to live there
  tagline: string;    // one punchy sentence — the essence of the dream
  latency_ms: number;
}

const SYSTEM = `You are the world's most evocative architectural storyteller. 
You write short, visceral descriptions that make people feel a dream home in their bones.
Never use clichés. Never say "stunning" or "gorgeous" or "beautiful."
Instead: be specific, sensory, and surprising.
Always write in second person ("You"). 
Respond ONLY with valid JSON. No markdown, no extra text.`;

const buildPrompt = (req: NarrateRequest) => `
Write a vivid, sensory description of this dream home:

Dream: "${req.dreamText}"
${req.style ? `Style: ${req.style}` : ""}
${req.location ? `Location: ${req.location}` : ""}
${req.sqft ? `Size: ~${req.sqft.toLocaleString()} sq ft` : ""}
${req.totalCost ? `Est. cost: $${Math.round(req.totalCost / 1000)}K` : ""}

Return a JSON object with exactly these fields:
{
  "arrival": "2–3 sentences describing the experience of arriving at and first entering this home. Start with 'You'. Be specific and sensory — materials, light, sound, smell. Make it cinematic.",
  "living": "2–3 sentences about a specific moment of daily life in this home — morning light, a dinner party, a rainy afternoon. Concrete and unexpected detail. Start with 'You'.",
  "tagline": "One sentence — the single most important truth about this home. What makes it irreplaceable."
}`;

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const body = await req.json() as NarrateRequest;
    if (!body.dreamText) {
      return NextResponse.json({ error: "dreamText required" }, { status: 400 });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system: SYSTEM,
        messages: [{ role: "user", content: buildPrompt(body) }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: "Claude API error", detail: err }, { status: 502 });
    }

    const result = await response.json();
    const text = (result.content?.[0]?.text || "").replace(/```json\s*/gi, "").replace(/```/g, "").trim();

    let narration: Omit<NarrateResponse, "latency_ms">;
    try {
      narration = JSON.parse(text);
    } catch {
      // graceful fallback
      narration = {
        arrival: `You arrive to find exactly what you imagined. ${body.dreamText.substring(0, 120)}.`,
        living: "Every morning the light finds the exact angle you hoped for. This is where you become who you wanted to be.",
        tagline: "The home that exists at the intersection of who you are and who you're becoming.",
      };
    }

    return NextResponse.json({ ...narration, latency_ms: Date.now() - start });
  } catch (err) {
    console.error("dream-narrate error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
