// The Oracle — AI Dream Profiler
// POST /api/v1/oracle/analyze
// Architectural psychologist: maps life answers to spatial preferences
// Emits oracle_analysis RSI signal

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { eventBus } from "@/lib/events";

const MODEL = "claude-sonnet-4-20250514";

interface OracleRequest {
  answers: {
    morning: string;
    entertain: string;
    nature: string;
    beautiful_place: string;
    safety: string;
    recharge: string;
    identity: string;
  };
}

interface OracleProfile {
  lightPreference: string;
  socialScale: string;
  natureRelationship: string;
  aestheticDNA: string;
  securityStyle: string;
  retreatNeeds: string;
  identityStatement: string;
  inferredStyle: string;
  inferredMaterials: string[];
  inferredScale: string;
  colorPalette: string[];
  summary: string;
}

interface OracleResponse {
  profile: OracleProfile;
  imagePrompts: string[];
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  // 1. VALIDATE REQUEST
  let body: OracleRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { answers } = body;

  // Validate all 7 required answers
  if (!answers || typeof answers !== "object") {
    return new Response(
      JSON.stringify({ error: "answers object is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const requiredFields = [
    "morning",
    "entertain",
    "nature",
    "beautiful_place",
    "safety",
    "recharge",
    "identity",
  ];

  for (const field of requiredFields) {
    if (
      !answers[field as keyof typeof answers] ||
      typeof answers[field as keyof typeof answers] !== "string"
    ) {
      return new Response(
        JSON.stringify({ error: `${field} is required and must be a string` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Mock response for development
    const mockProfile = generateMockProfile(answers);
    return new Response(JSON.stringify(mockProfile), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Mock": "true",
      },
    });
  }

  // 2. ANALYZE WITH CLAUDE
  try {
    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = `You are an architectural psychologist who reverse-engineers spatial preferences from life patterns.
Your role is to decode the deeper architectural needs hidden in how someone experiences light, social interaction, nature, beauty, safety, restoration, and identity.

Analyze these 7 life answers to infer architectural DNA:
1. Morning light patterns → light preference + orientation
2. Entertainment style → social scale + openness
3. Nature relationship → window strategy + materiality
4. Beautiful place → aesthetic DNA + color palette
5. Safety feeling → enclosure strategy + threshold design
6. Recharge ritual → retreat needs + sensory design
7. Identity statement → architectural voice + material expression

You must respond with ONLY a valid JSON object (no markdown, no code blocks) matching this exact structure:
{
  "profile": {
    "lightPreference": "descriptive phrase about light quality and direction (e.g., 'East-facing morning light, warm golden tones')",
    "socialScale": "description of social gathering size and space configuration (e.g., 'Intimate gatherings of 6-8, open kitchen as social center')",
    "natureRelationship": "indoor-outdoor integration strategy (e.g., 'Deep immersion - floor-to-ceiling glass, living walls')",
    "aestheticDNA": "style fusion description (e.g., 'Mediterranean warmth meets Japanese minimalism')",
    "securityStyle": "how enclosure and openness balance (e.g., 'Enveloping enclosure with selective openings')",
    "retreatNeeds": "sanctuary design requirements (e.g., 'Dedicated sanctuary with water features and natural light')",
    "identityStatement": "architectural voice (e.g., 'Confident simplicity that whispers rather than shouts')",
    "inferredStyle": "primary architectural style (e.g., 'Modern Mediterranean', 'Japandi', 'Industrial Minimalist')",
    "inferredMaterials": ["material1", "material2", "material3"],
    "inferredScale": "estimated size and spatial organization (e.g., '2,800-3,200 sq ft, single story with dramatic volumes')",
    "colorPalette": ["#HEX1", "#HEX2", "#HEX3"],
    "summary": "2-3 sentence poetic summary capturing the essence"
  },
  "imagePrompts": [
    "FLUX prompt for interpretation 1 (modern approach)",
    "FLUX prompt for interpretation 2 (organic/natural approach)",
    "FLUX prompt for interpretation 3 (traditional/cultural approach)"
  ]
}

IMPORTANT:
- colorPalette must be 3 hex colors that work together
- Each imagePrompt should be detailed, vivid, and specific enough for a generative AI to render a beautiful architectural exterior
- imagePrompts should show 3 DIFFERENT interpretations (modern, organic, traditional) of the same architectural DNA
- Use poetic, evocative language in all descriptions
- The summary should capture the emotional essence, not just list features`;

    const userMessage = `Analyze these life answers and reverse-engineer architectural preferences:

Morning light preference: "${answers.morning}"
Entertainment style: "${answers.entertain}"
Nature relationship: "${answers.nature}"
Beautiful place experience: "${answers.beautiful_place}"
Safety feeling: "${answers.safety}"
Recharge ritual: "${answers.recharge}"
Identity statement: "${answers.identity}"`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    // Extract the text content
    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    let profileData: OracleResponse;
    try {
      // Try to parse the response as JSON
      profileData = JSON.parse(content.text);
    } catch {
      // If Claude wrapped it in markdown, extract the JSON
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from Claude response");
      }
      profileData = JSON.parse(jsonMatch[0]);
    }

    // Validate response structure
    if (!profileData.profile || !profileData.imagePrompts) {
      throw new Error("Invalid response structure from Claude");
    }

    // 3. EMIT RSI SIGNAL
    await eventBus.emit("oracle.analysis", {
      answers_count: 7,
      model: MODEL,
      latency_ms: Date.now() - start,
      inferred_style: profileData.profile.inferredStyle,
      inferred_materials: profileData.profile.inferredMaterials.join(", "),
      timestamp: new Date().toISOString(),
    }, { source: "oracle-api" });

    return new Response(JSON.stringify(profileData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Latency-Ms": String(Date.now() - start),
      },
    });
  } catch (err) {
    console.error("Oracle API error:", err);

    // Emit error signal
    emitOracleEvent("oracle_analysis_error", {
      error: err instanceof Error ? err.message : "Unknown error",
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Dream profiling failed",
        details: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK PROFILE GENERATION
// ─────────────────────────────────────────────────────────────────────────────
function generateMockProfile(answers: OracleRequest["answers"]): OracleResponse {
  // Analyze answers to create a contextual mock response
  const morning = answers.morning.toLowerCase();
  const nature = answers.nature.toLowerCase();
  const safety = answers.safety.toLowerCase();
  const identity = answers.identity.toLowerCase();

  // Determine style based on answer patterns
  let inferredStyle = "Contemporary Minimalist";
  if (
    morning.includes("warm") ||
    morning.includes("golden") ||
    morning.includes("cozy")
  ) {
    inferredStyle = "Modern Mediterranean";
  } else if (nature.includes("dense") || nature.includes("forest")) {
    inferredStyle = "Organic Modernism";
  } else if (safety.includes("solid") || safety.includes("strong")) {
    inferredStyle = "Industrial Minimalist";
  }

  if (identity.includes("bold") || identity.includes("confident")) {
    inferredStyle = `Bold ${inferredStyle}`;
  } else if (identity.includes("quiet") || identity.includes("understated")) {
    inferredStyle = `Quiet ${inferredStyle}`;
  }

  const lightPreference = morning.includes("warm")
    ? "East-facing morning light with warm, golden tones that gradually intensify"
    : morning.includes("bright")
      ? "North-facing consistent, diffused light with no direct glare"
      : "South-facing warmth with soft diffusion through natural materials";

  const socialScale = answers.entertain.includes("intimate")
    ? "Intimate gatherings of 4-6 people, kitchen as conversational hub"
    : answers.entertain.includes("large")
      ? "Hosting 15-20, open flowing spaces with flexible zones"
      : "Small-medium groups of 8-12, distinct but connected zones";

  const materials =
    inferredStyle.includes("Mediterranean") || inferredStyle.includes("Organic")
      ? ["warm wood", "natural stone", "terracotta"]
      : inferredStyle.includes("Industrial")
        ? ["raw concrete", "steel", "reclaimed wood"]
        : ["white oak", "light stone", "subtle metals"];

  const colorHex =
    inferredStyle.includes("Mediterranean") || inferredStyle.includes("Organic")
      ? ["#D4A574", "#8B7355", "#F5E6D0"]
      : inferredStyle.includes("Industrial")
        ? ["#2C2C2C", "#757575", "#F0F0F0"]
        : ["#F5F5F5", "#E8E8E8", "#D0D0D0"];

  return {
    profile: {
      lightPreference,
      socialScale,
      natureRelationship:
        nature.includes("immersed") || nature.includes("views")
          ? "Deep immersion—expansive glazing, terraces, or interior gardens"
          : nature.includes("framed") || nature.includes("glimpse")
            ? "Framed views through carefully positioned windows"
            : "Subtle integration with living materials and soft boundaries",
      aestheticDNA:
        inferredStyle.includes("Mediterranean")
          ? "Mediterranean warmth meets contemporary clean lines"
          : inferredStyle.includes("Industrial")
            ? "Raw honesty with refined minimalist aesthetics"
            : "Japanese-inspired restraint with organic textures",
      securityStyle:
        safety.includes("solid") || safety.includes("strong")
          ? "Enveloping enclosure with strategic, selective openings"
          : safety.includes("open") || safety.includes("visible")
            ? "Transparent thresholds with subtle boundary marking"
            : "Layered transitions creating gradual exposure",
      retreatNeeds:
        answers.recharge.includes("water") || answers.recharge.includes("bath")
          ? "Sanctuary with water features and soft, diffused lighting"
          : answers.recharge.includes("nature") || answers.recharge.includes("plant")
            ? "Garden-adjacent refuge with living materials"
            : "Intimate nook with natural light and minimal stimuli",
      identityStatement:
        identity.includes("bold")
          ? "Confident presence that speaks clearly without apology"
          : identity.includes("quiet")
            ? "Understated elegance that whispers rather than shouts"
            : "Balanced expression of refined taste",
      inferredStyle,
      inferredMaterials: materials,
      inferredScale:
        answers.entertain.includes("large")
          ? "3,500–4,200 sq ft with open-plan living and multiple social zones"
          : "2,200–2,800 sq ft with flowing but defined spaces",
      colorPalette: colorHex,
      summary: `A space that honors your morning light rituals and creates intimate gathering moments while maintaining the sanctuary you need to recharge. The architecture quietly expresses ${identity.includes("bold") ? "your confident identity" : "your refined sensibilities"} through material honesty and spatial generosity.`,
    },
    imagePrompts: [
      `Modern ${inferredStyle.split(" ").pop()} architectural exterior. Contemporary home with clean geometric lines, ${materials[0]} cladding, and ${materials[1]} accents. ${lightPreference.split(",")[0]} floods the façade. Expansive windows reveal warm interior spaces. Minimal landscaping with geometric plantings. Evening twilight with warm interior lighting glowing through glass. 8K architectural photography, professional rendering.`,

      `Organic interpretation of ${inferredStyle} design. Sculptural home form that embraces natural contours of landscape. Living green wall integration, ${materials.join(", ")} palette, flowing curved lines contrasting with natural rock formations. Water feature element visible in landscape. Soft diffused afternoon light, lush surrounding vegetation. Bohemian-modern aesthetic. Atmospheric architectural rendering.`,

      `Traditional-rooted ${inferredStyle} dwelling with timeless proportions. Solid ${materials[0]} base with ${materials[1]} detailing. Pitched roof with classical overhangs, deep recessed entries. ${answers.beautiful_place.includes("courtyard") || answers.beautiful_place.includes("enclosed") ? "Central courtyard focus with fountain" : "Generous veranda or loggia"}. Warm golden hour light casting dramatic shadows. Mediterranean or regional vernacular references. Cinematic architectural photography.`,
    ],
  };
}

// Helper function to emit events following the existing pattern
function emitOracleEvent(
  type: string,
  data: Record<string, unknown>
): void {
  try {
    eventBus.emit(type, data, { source: "oracle-api" });
  } catch (err) {
    console.debug("Event emission skipped:", err);
  }
}
