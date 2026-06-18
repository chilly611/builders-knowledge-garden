/**
 * AI Render Service — generate on-brand architecture imagery via Replicate FLUX.
 *
 * The look is the brand lock. Two registers, ported verbatim in spirit from the
 * brand-asset staging pipeline (portal-imagery.mjs) so LIVE, in-platform
 * generation matches our staged herbarium assets instead of stock-photo renders:
 *
 *   • PHOTO  (exterior/interior/aerial/material) → flux-1.1-pro, the cinematic
 *     herbarium-palette register (cream/vellum/brass/amber/teal-deep, filmic,
 *     medium-format). No pure white, no red.
 *   • STUDY  (study/sketch)                      → flux-dev + negative_prompt,
 *     the line-and-wash "architect's working drawing" register (ink-graphite
 *     linework, specimen-teal wash, brass, cream paper, herbarium grid +
 *     dimension annotations). A working drawing, NOT a photo.
 *
 * Every prompt carries the palette + guard so a user's words can't drift it
 * off-brand. Seeds are left unset on purpose — live generation varies per call;
 * the staging pipeline fixes seeds only for reproducible brand assets.
 *
 * Usage:
 *   await generateRender({ prompt: "modern farmhouse in Marin", style: "exterior" });
 *   await generateRender({ prompt: "great-room section", style: "study" });
 */

export interface RenderRequest {
  prompt: string;
  /** PHOTO styles render filmic; STUDY styles render line-and-wash drawings. */
  style?: "exterior" | "interior" | "aerial" | "material" | "study" | "sketch";
  aspect?: "landscape" | "portrait" | "square";
  quality?: "draft" | "standard" | "high";
}

export interface RenderResult {
  imageUrl: string;
  renderTime: number;
  model: string;
  prompt: string;
}

// ── THE RENDER REGISTER — the brand lock (mirrors portal-imagery.mjs §2) ──────

/** Line-and-wash working-drawing register — the line that makes the studies. */
const STUDY_REGISTER =
  "Architect's hand-drawn working study on aged cream paper: fine ink-graphite " +
  "linework with a light specimen-teal wash and soft-brass accents, a faint " +
  "herbarium-plate grid and dimension annotations, restrained and elegant. No " +
  "color beyond cream, teal, brass and graphite. No pure white, no red. A working " +
  "drawing, not a photograph — no photographic rendering, no 3D render.";

/** Negative prompt for the study model (flux-dev supports it; 1.1-pro does not). */
const STUDY_NEGATIVE =
  "photographic, 3d render, color photo, pure white background, red, neon, " +
  "watermark, paragraphs of text, perspective photo";

/** Cinematic herbarium-palette register for photoreal styles. */
const PHOTO_REGISTER =
  "Strictly the herbarium palette — warm cream, vellum, soft brass, amber warmth, " +
  "with cool teal-deep shadows; muted and filmic, never oversaturated. " +
  "Medium-format look, deep depth of field, fine natural grain, calm and " +
  "aspirational. No people, no text, no signage, no pure white, no bright red.";

const PHOTO_PREFIX: Record<string, string> = {
  exterior: "Cinematic architectural photograph, three-quarter exterior view of",
  interior: "Cinematic interior architectural photograph, warm natural light, of",
  aerial: "Cinematic aerial architectural photograph looking down at",
  material: "Close-up medium-format photograph of the materials and construction of",
};

const ASPECT_RATIOS: Record<string, string> = {
  landscape: "16:9",
  portrait: "4:5",
  square: "1:1",
};

const HERO_MODEL = "black-forest-labs/flux-1.1-pro";
const STUDY_MODEL = "black-forest-labs/flux-dev";

function isStudy(style?: string): boolean {
  return style === "study" || style === "sketch";
}

function buildPrompt(req: RenderRequest): string {
  if (isStudy(req.style)) {
    return `${STUDY_REGISTER} Subject: ${req.prompt}.`;
  }
  const prefix = PHOTO_PREFIX[req.style || "exterior"] || PHOTO_PREFIX.exterior;
  return `${prefix} ${req.prompt}. ${PHOTO_REGISTER}`;
}

/**
 * Generate one render. Routes to flux-dev (line-and-wash studies, with a
 * negative prompt) or flux-1.1-pro (filmic photos) by style. Replicate hosts
 * the returned image.
 */
export async function generateRender(req: RenderRequest): Promise<RenderResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN not configured");
  }

  const fullPrompt = buildPrompt(req);
  const aspect = ASPECT_RATIOS[req.aspect || "landscape"];
  const study = isStudy(req.style);
  const model = study ? STUDY_MODEL : HERO_MODEL;
  const startTime = Date.now();

  // flux-dev takes a negative_prompt + guidance/steps; flux-1.1-pro does not
  // (it has no negative_prompt — the palette is forced positively in the prompt).
  const input: Record<string, unknown> = study
    ? {
        prompt: fullPrompt,
        aspect_ratio: aspect,
        output_format: "webp",
        output_quality: 82,
        guidance: 3,
        num_inference_steps: 34,
        negative_prompt: STUDY_NEGATIVE,
      }
    : {
        prompt: fullPrompt,
        aspect_ratio: aspect,
        output_format: "webp",
        output_quality: req.quality === "high" ? 95 : 82,
        prompt_upsampling: true,
        safety_tolerance: 2,
      };

  const createRes = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "wait", // synchronous — waits up to 60s
    },
    body: JSON.stringify({ input }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error("Replicate API error:", err);
    throw new Error(`Replicate API error: ${createRes.status}`);
  }

  const prediction = await createRes.json();

  if (prediction.status === "succeeded" && prediction.output) {
    const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    return { imageUrl, renderTime: Date.now() - startTime, model, prompt: fullPrompt };
  }

  // Poll for completion (max 60 seconds)
  const pollUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(pollUrl, { headers: { "Authorization": `Bearer ${token}` } });
    const pollData = await pollRes.json();
    if (pollData.status === "succeeded") {
      const imageUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
      return { imageUrl, renderTime: Date.now() - startTime, model, prompt: fullPrompt };
    }
    if (pollData.status === "failed" || pollData.status === "canceled") {
      throw new Error(`Render ${pollData.status}: ${pollData.error || "unknown error"}`);
    }
  }

  throw new Error("Render timed out after 60 seconds");
}

/**
 * Generate a concept set from a dream brief: three filmic herbarium photos
 * (street / garden / aerial) + one line-and-wash study — the same mix our
 * staged brand assets use, so the grid reads as ours.
 */
export async function generateDreamConcepts(
  dreamText: string,
  count: number = 4
): Promise<RenderResult[]> {
  const all: RenderRequest[] = [
    { prompt: dreamText, style: "exterior", quality: "standard", aspect: "landscape" },
    { prompt: `${dreamText}, the garden side with outdoor living`, style: "exterior", quality: "standard", aspect: "landscape" },
    { prompt: `${dreamText}, showing the full site and roof`, style: "aerial", quality: "standard", aspect: "landscape" },
    { prompt: `${dreamText}, massing and section study`, style: "study", quality: "draft", aspect: "landscape" },
  ];
  const variations = all.slice(0, count);

  const results = await Promise.allSettled(variations.map((v) => generateRender(v)));
  return results
    .filter((r): r is PromiseFulfilledResult<RenderResult> => r.status === "fulfilled")
    .map((r) => r.value);
}

/**
 * Generate a style comparison — the same building in several architectural
 * styles, all in the filmic herbarium register.
 */
export async function generateStyleComparison(
  baseDescription: string,
  styles: string[]
): Promise<RenderResult[]> {
  const requests: RenderRequest[] = styles.map((style): RenderRequest => ({
    prompt: `${baseDescription} in ${style} architectural style`,
    style: "exterior",
    quality: "standard",
    aspect: "landscape",
  }));

  const results = await Promise.allSettled(requests.map((r) => generateRender(r)));
  return results
    .filter((r): r is PromiseFulfilledResult<RenderResult> => r.status === "fulfilled")
    .map((r) => r.value);
}
