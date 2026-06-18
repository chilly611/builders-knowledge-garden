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

// ── Layer 2: brand style reference (the Midjourney --sref analog) ────────────
// When DREAM_STYLE_REF is enabled, PHOTO renders are conditioned on a canonical
// brand image via flux-1.1-pro-ultra's image_prompt, so the palette/mood lock to
// our look regardless of how the user phrases the prompt. Tunable + reversible:
//   DREAM_STYLE_REF=1                  enable (default OFF — merging changes nothing)
//   DREAM_STYLE_REF_PHOTO=<image url>  the style anchor (default: staged Marin hero;
//                                      point this at an uploaded Midjourney --sref frame)
//   DREAM_STYLE_REF_STRENGTH=0.12      image_prompt_strength, 0..1 (subtle by default)
// Any failure (bad key, anchor 404, model down) falls back to the Layer-1 text
// path — never worse than text-only. Studies stay on the text register: a Redux
// reference over-constrains drawings; a study LoRA is the Layer-3 lock.
const ULTRA_MODEL = "black-forest-labs/flux-1.1-pro-ultra";
const DEFAULT_PHOTO_ANCHOR =
  "https://vlezoyalutexenbnzzui.supabase.co/storage/v1/object/public/brand-assets/assets/bkg/fidelity/hero-marin-farmhouse-golden-a.png";

function photoStyleRef(): string | null {
  const flag = process.env.DREAM_STYLE_REF;
  if (!flag || flag === "0" || flag === "false") return null;
  return process.env.DREAM_STYLE_REF_PHOTO || DEFAULT_PHOTO_ANCHOR;
}

function styleStrength(): number {
  const n = parseFloat(process.env.DREAM_STYLE_REF_STRENGTH || "");
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.12;
}

/** POST a Replicate model and wait/poll for the hosted image URL. */
async function callReplicate(token: string, model: string, input: Record<string, unknown>): Promise<string> {
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
    throw new Error(`Replicate ${model} ${createRes.status}: ${err.slice(0, 200)}`);
  }
  let p = await createRes.json();
  for (let i = 0; i < 30 && p.status !== "succeeded"; i++) {
    if (p.status === "failed" || p.status === "canceled") {
      throw new Error(`Render ${p.status}: ${p.error || "unknown error"}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
    const getUrl = p.urls?.get || `https://api.replicate.com/v1/predictions/${p.id}`;
    p = await (await fetch(getUrl, { headers: { "Authorization": `Bearer ${token}` } })).json();
  }
  if (p.status !== "succeeded" || !p.output) throw new Error("Render timed out after 60 seconds");
  return Array.isArray(p.output) ? p.output[0] : p.output;
}

/**
 * Generate one render. Routes by style: flux-dev (line-and-wash studies, with a
 * negative prompt) or flux-1.1-pro (filmic photos). When a brand style anchor is
 * configured (Layer 2), photos are conditioned on it via flux-1.1-pro-ultra,
 * falling back to text-only flux-1.1-pro on any error.
 */
export async function generateRender(req: RenderRequest): Promise<RenderResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN not configured");
  }

  const fullPrompt = buildPrompt(req);
  const aspect = ASPECT_RATIOS[req.aspect || "landscape"];
  const start = Date.now();

  // STUDY — line-and-wash working drawing (flux-dev + negative prompt).
  if (isStudy(req.style)) {
    const imageUrl = await callReplicate(token, STUDY_MODEL, {
      prompt: fullPrompt,
      aspect_ratio: aspect,
      output_format: "webp",
      output_quality: 82,
      guidance: 3,
      num_inference_steps: 34,
      negative_prompt: STUDY_NEGATIVE,
    });
    return { imageUrl, renderTime: Date.now() - start, model: STUDY_MODEL, prompt: fullPrompt };
  }

  // PHOTO — Layer 2 brand-anchor path first (if enabled), else text-only flux-1.1-pro.
  const styleRef = photoStyleRef();
  if (styleRef) {
    try {
      const imageUrl = await callReplicate(token, ULTRA_MODEL, {
        prompt: fullPrompt,
        aspect_ratio: aspect,
        image_prompt: styleRef,
        image_prompt_strength: styleStrength(),
        output_format: "webp",
        safety_tolerance: 2,
      });
      return { imageUrl, renderTime: Date.now() - start, model: ULTRA_MODEL, prompt: fullPrompt };
    } catch (e) {
      console.warn("[ai-render] style-ref render failed; using text-only:", e instanceof Error ? e.message : e);
    }
  }

  const imageUrl = await callReplicate(token, HERO_MODEL, {
    prompt: fullPrompt,
    aspect_ratio: aspect,
    output_format: "webp",
    output_quality: req.quality === "high" ? 95 : 82,
    prompt_upsampling: true,
    safety_tolerance: 2,
  });
  return { imageUrl, renderTime: Date.now() - start, model: HERO_MODEL, prompt: fullPrompt };
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
