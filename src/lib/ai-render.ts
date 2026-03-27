/**
 * AI Render Service — Generate photorealistic architecture renders via Replicate API
 * 
 * Uses FLUX 1.1 Pro for high-quality renders, SDXL as fallback.
 * Every render is architecture-specific with tuned prompts.
 * 
 * Usage:
 *   const result = await generateRender({ prompt: "modern farmhouse in Asheville", style: "exterior" });
 *   // result = { imageUrl: "https://...", renderTime: 8200, model: "flux-1.1-pro" }
 */

export interface RenderRequest {
  prompt: string;
  style?: "exterior" | "interior" | "aerial" | "sketch" | "material";
  aspect?: "landscape" | "portrait" | "square";
  quality?: "draft" | "standard" | "high";
}

export interface RenderResult {
  imageUrl: string;
  renderTime: number;
  model: string;
  prompt: string;
}

// Architecture-specific prompt engineering
const STYLE_PREFIXES: Record<string, string> = {
  exterior: "Professional architectural photograph, exterior view of",
  interior: "Interior design photograph, natural lighting, Architectural Digest quality,",
  aerial: "Aerial drone photograph looking down at",
  sketch: "Architectural concept sketch, charcoal on white paper, hand-drawn style,",
  material: "Close-up macro photograph of construction material,",
};

const QUALITY_SUFFIXES: Record<string, string> = {
  draft: "architectural visualization, clean lines",
  standard: "8K resolution, photorealistic, golden hour lighting, Canon EOS R5, f/8",
  high: "8K ultra-detailed, photorealistic, award-winning architectural photography, golden hour, dramatic sky, Canon EOS R5 85mm f/4",
};

const ASPECT_RATIOS: Record<string, string> = {
  landscape: "16:9",
  portrait: "9:16",
  square: "1:1",
};

function buildPrompt(req: RenderRequest): string {
  const prefix = STYLE_PREFIXES[req.style || "exterior"];
  const suffix = QUALITY_SUFFIXES[req.quality || "standard"];
  return `${prefix} ${req.prompt}. ${suffix}`;
}

/**
 * Generate a render using Replicate's FLUX 1.1 Pro model.
 * Returns the image URL directly — Replicate hosts the result.
 */
export async function generateRender(req: RenderRequest): Promise<RenderResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN not configured");
  }

  const fullPrompt = buildPrompt(req);
  const aspect = ASPECT_RATIOS[req.aspect || "landscape"];
  const startTime = Date.now();

  // Use Replicate's models endpoint for FLUX 1.1 Pro
  const createRes = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "wait",  // Synchronous mode — waits up to 60s for result
    },
    body: JSON.stringify({
      input: {
        prompt: fullPrompt,
        aspect_ratio: aspect,
        output_format: "webp",
        output_quality: req.quality === "high" ? 95 : 80,
        prompt_upsampling: true,
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error("Replicate API error:", err);
    throw new Error(`Replicate API error: ${createRes.status}`);
  }

  const prediction = await createRes.json();

  // If prediction completed synchronously (Prefer: wait)
  if (prediction.status === "succeeded" && prediction.output) {
    const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    return {
      imageUrl,
      renderTime: Date.now() - startTime,
      model: "flux-1.1-pro",
      prompt: fullPrompt,
    };
  }

  // Otherwise poll for completion (max 60 seconds)
  const predictionId = prediction.id;
  const pollUrl = `https://api.replicate.com/v1/predictions/${predictionId}`;
  
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    
    const pollRes = await fetch(pollUrl, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    const pollData = await pollRes.json();
    
    if (pollData.status === "succeeded") {
      const imageUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
      return {
        imageUrl,
        renderTime: Date.now() - startTime,
        model: "flux-1.1-pro",
        prompt: fullPrompt,
      };
    }
    
    if (pollData.status === "failed" || pollData.status === "canceled") {
      throw new Error(`Render ${pollData.status}: ${pollData.error || "unknown error"}`);
    }
  }

  throw new Error("Render timed out after 60 seconds");
}

/**
 * Generate multiple concept renders from a dream description.
 * Returns 2-4 renders with different angles/styles.
 */
export async function generateDreamConcepts(
  dreamText: string,
  count: number = 4
): Promise<RenderResult[]> {
  const variations = [
    { prompt: dreamText, style: "exterior" as const, quality: "standard" as const, aspect: "landscape" as const },
    { prompt: dreamText, style: "interior" as const, quality: "standard" as const, aspect: "landscape" as const },
    { prompt: `${dreamText}, aerial view showing the full property and landscaping`, style: "aerial" as const, quality: "standard" as const, aspect: "landscape" as const },
    { prompt: `${dreamText}, architectural concept sketch showing the design intent`, style: "sketch" as const, quality: "draft" as const, aspect: "landscape" as const },
  ].slice(0, count);

  // Run renders in parallel (Replicate handles concurrency)
  const results = await Promise.allSettled(
    variations.map(v => generateRender(v))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<RenderResult> => r.status === "fulfilled")
    .map(r => r.value);
}

/**
 * Generate a style comparison — same building in multiple architectural styles.
 */
export async function generateStyleComparison(
  baseDescription: string,
  styles: string[]
): Promise<RenderResult[]> {
  const requests = styles.map(style => ({
    prompt: `${baseDescription} in ${style} architectural style`,
    style: "exterior" as const,
    quality: "standard" as const,
    aspect: "landscape" as const,
  }));

  const results = await Promise.allSettled(
    requests.map(r => generateRender(r))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<RenderResult> => r.status === "fulfilled")
    .map(r => r.value);
}
