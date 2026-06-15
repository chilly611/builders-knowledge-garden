# Seed & Portals — Work-in-Progress Portal Imagery
*Knowledge Gardens design-system pattern · canonical reference for BKG + the umbrella · 2026-06-15*

> **The idea:** every project view should feel alive before the user's real dream is rendered. We fill that "work in progress" window with **brand-locked, generated imagery of what they're building, in their style** — calm herbarium-register visuals that read as *intentional* (a designer's plate), never as an empty placeholder. The herbarium register IS the loading state. This satisfies Decision 18 (visual-first) and is the "portal" into the user's project that the seed grows into.

This pattern is **data-driven and universal**: it produces imagery for *any* user, *any* building type, *any* style — not the Marin demo only. Marin is just the first seed set.

---

## 1. Where it's used (portals)
| Surface | Slot | Asset kind |
|---|---|---|
| BKG Builder lane | B2 cinematic hero ("Where the build stands") | **hero** (16:9, photoreal golden-hour) |
| BKG Dream Machine | "In motion" exploration cards | **study** (4:5, ink line-render) |
| BKG field log / plates | plate thumbnails | **thumb** (1:1, photo or sketch) |
| BKG instrument gauges | static dial face | **gauge-face** (SVG, hand-authored — Code owns the needle) |
| Umbrella (theknowledgegardens.com) | surface/section heroes | **hero** per garden |

## 2. The render register (the brand lock — CONSTANT across all users)
Whatever the subject, the *look* is fixed:
- **Heroes** — cinematic architectural photograph, golden hour, warm + filmic, medium-format, fine grain, deep DoF. No people, no signage/text, no pure white, no `#E8443A`, no neon, no fisheye.
- **Studies** — architect's hand-drawn study on aged cream paper: ink-graphite linework, light teal wash, brass accents, faint herbarium-plate grid + dimension annotations. A working drawing, not a render.
- **Palette (only):** `--paper-cream/-vellum/-fold`, `--specimen-brass/-amber/-teal/-teal-deep/-sage`, `--ink-graphite/-faded`, `--specimen-rust` *sparing*. (The single `#00FFE0` "live" flash pip on a gauge is the one deliberate accent.)

## 3. The variable layer (per user — this is the generalization)
The prompt is `RENDER-REGISTER` (constant) + substitutions from the active project:
- `{buildingType}` — e.g. "modern farmhouse", "4-unit infill multifamily", "ADU", "kitchen remodel"
- `{location}` — e.g. "oak-studded golden hillside in Marin County", "San Francisco infill lot"
- `{style}` — e.g. "board-and-batten", "midcentury", "Victorian restoration", "contemporary glass"
- `{stage}` + `{progress}` — drives the construction cues ("framing + scaffolding visible to read as 42% built")

All four come from `useStageProject()` — never hardcoded. Switching `?project=` produces a different portal with no bleed.

## 4. How it's generated
- **Runtime (per user, on demand):** reuse the live engine — `POST /api/v1/render` (→ Replicate FLUX) with `buildStudioPrompt()` + `conceptFallbackFor()` from `src/app/dream/design/shared.ts`. Instant concept-sketch upgrades to photoreal; guaranteed-visual fallback on failure. The **WIP placeholder** shown *during* generation is a seed asset (§5) chosen by archetype.
- **Staging (curated, founder-run):** `stage-fidelity-assets.mjs` (this repo) → generalize to `portal-imagery.mjs` taking a project profile, to pre-generate per-archetype seed sets at scale. Engine: `flux-1.1-pro` for photos (`aspect_ratio` must be one of `1:1/16:9/3:2/2:3/4:5/5:4/9:16/3:4/4:3` — **not** `21:9`), `flux-dev` for line studies (supports `negative_prompt`).
- **Flow:** generate → upload `brand-assets/assets/bkg/fidelity/<slug>.png` **`status='draft'`** → founder/service-role **promotes**. Code never promotes.

## 5. Seed set (the first portals — Marin demo + universal fallbacks)
Staged 2026-06-15, draft, at `…/storage/v1/object/public/brand-assets/assets/bkg/fidelity/<slug>.png`:

| slug | kind | seed | use |
|---|---|---|---|
| `hero-marin-farmhouse-golden-a` | hero | 420017 | Builder hero (wide golden-hour establishing) |
| `hero-marin-farmhouse-golden-b` | hero | 420042 | Builder hero (dusk, warm interior glow) |
| `study-massing-options` | study | 770301 | Dream "In motion" — massing |
| `study-clearance` | study | 770302 | Dream "In motion" — clearance |
| `study-daylight` | study | 770303 | Dream "In motion" — daylight |
| `thumb-site-framing` | thumb | 651101 | field-log / plate |
| `thumb-material-detail` | thumb | 651102 | field-log / plate |
| `thumb-detail-sketch` | thumb | 651103 | field-log / plate |
| `gauge-face-primary` | gauge-face | — | `public/_design-preview/gauge-face-primary.svg` |

Seeds are fixed so a chosen option regenerates byte-similar at production resolution.

## 6. To make them usable (catalog)
Bucket files alone are orphans. Each needs a `brand_assets` row (`garden_scope='bkg'`, `status='draft'`, `storage_path='bkg/fidelity/<slug>'`, `intended_use`, prompt/params/provenance) — **confirm `public.brand_assets` columns first**, then `node --env-file=.env stage-fidelity-assets.mjs --go --catalog --schema-confirmed`. Promotion to `approved` is founder/service-role.

## 7. Propagation
- **BKG:** Builder hero (B2) + Dream cards + field log + gauge consume seed/fallback by archetype, generate live per project.
- **Umbrella (`knowledge-gardens-root`):** same register for surface heroes; seed imagery lives in the umbrella's asset path; this doc is the shared spec.
- **Design-system repo:** this pattern is the **"Seed & Portals"** section — keep it in sync with the canonical DS so every garden inherits the same register.
