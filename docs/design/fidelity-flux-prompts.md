# Killer App fidelity pass — Replicate FLUX prompt spec
*Staging/research lane · canonical project = Modern Farmhouse Marin · herbarium register*

> **Status:** locked prompts, ready to run. Generation/staging is performed by
> `stage-fidelity-assets.mjs` (repo root) — **draft-only**, never promotes.
> Requires `REPLICATE_API_TOKEN` + Supabase creator creds in the run environment.
> The sandbox/worktree has none, so the `--go` run is the founder's to execute
> where the real creds live. `--dry-run` previews the 8-asset plan with zero spend.

---

## Locks (apply to every prompt)

**Canonical project (do NOT drift to Twin Peaks):** Modern farmhouse, **4,000 sqft, Marin County, California**, oak-studded golden hillside, coastal-influenced light. Owner: the Harwell family. Build 42% complete ($312K of $1.65M). Golden-hour, architectural, warm, calm.

**Herbarium palette (the only colors that may appear):**
| token | hex | role |
|---|---|---|
| paper-cream | `#F2E9D2` | base / "white" stand-in (never pure white) |
| paper-vellum | `#E8DDB8` | warm mid paper |
| paper-fold | `#D8C9A0` | aged edge |
| specimen-brass | `#B08D5C` | metal / warm line |
| specimen-amber | `#C68A3D` | golden-hour warmth |
| specimen-teal | `#3C7A8A` | wash / shadow-cool |
| specimen-teal-deep | `#234C5A` | ink-cool / depth |
| specimen-sage | `#5E7A56` | foliage |
| ink-graphite | `#2A2620` | line / type |
| specimen-rust | `#A53A2D` | *sparing* accent only |

**Hard exclusions (bake into every prompt):** no `#E8443A` fire-engine red, no pure white `#FFFFFF`, no neon, no oversaturation, no signage/text/watermarks/logos, no lens flare gimmicks, no people's faces in hero shots, no fisheye distortion.

> **FLUX negative-prompt note (accuracy):** `flux-1.1-pro` / `-ultra` expose **no negative-prompt field** — exclusions must be phrased *positively inside the prompt* (e.g. "warm cream-and-teal palette only, no red"). `flux-dev` (and SDXL-style models) **do** take a `negative_prompt`; a ready-made one is given per asset below under **avoid:** for those engines.

**Engine defaults:** `output_format: "png"`, `prompt_upsampling: true`, `safety_tolerance: 2`, deterministic `seed` per asset (listed) so a re-run reproduces the chosen option.

**Staging convention (draft-only):** bucket `brand-assets`, path `assets/bkg/fidelity/<slug>.png` → catalog `storage_path = bkg/fidelity/<slug>` (the `assets/` prefix is stripped in the row, matching existing rows). `garden_scope='bkg'`, `generator='replicate'`, `status='draft'`. **Never** set approved/promoted — that's service-role/founder.

---

## B — Hero photo · "Where the build stands"  (pick 1 of 2)

Photoreal cinematic hero. Model: **`black-forest-labs/flux-1.1-pro`** · `aspect_ratio: "21:9"` (wide hero; use `"16:9"` if the slot is shallower). Slot: `CockpitHero` (currently a branded gradient fallback awaiting this asset).

### B-asset-1 · Option A — wide establishing, low golden sun
- **slug:** `hero-marin-farmhouse-golden-a` · **seed:** `420017`
- **prompt:**
> Cinematic architectural photograph of a modern farmhouse under construction on an oak-studded golden hillside in Marin County, California, at golden hour. Wide establishing shot, low warm sun raking from the left casting long soft shadows. Board-and-batten cladding in warm cream and aged vellum tones, standing-seam metal roof in soft brass, large black-framed windows, a generous covered porch; framing and scaffolding still visible on one wing to read as 42% built. Dry golden grass, coastal live oaks, distant blue-green ridgeline. Palette strictly warm cream, vellum, brass, amber, with cool teal shadows; muted and filmic, no oversaturation. Shot on medium-format, 35mm-equivalent, deep depth of field, fine natural grain, calm and aspirational. No people, no signage, no text, no pure white, no bright red.

### B-asset-1 · Option B — three-quarter dusk, warm interior glow
- **slug:** `hero-marin-farmhouse-golden-b` · **seed:** `420042`
- **prompt:**
> Cinematic architectural photograph of a modern Marin County farmhouse at the golden-to-blue dusk transition, three-quarter front angle. Warm interior light glowing amber through large windows against a cooling teal sky; gabled board-and-batten volumes in cream and vellum, soft-brass metal roof, deep porch shadows. A partially framed addition with exposed timber on the right edge reads the build as mid-progress. Foreground of golden grass and a live oak silhouette, hillside falling away to a hazy ridge. Strictly herbarium palette — cream, vellum, brass, amber warmth, teal-deep shadow; filmic, restrained, slight haze. Medium-format look, shallow-to-deep focus, fine grain. No people, no text, no signage, no pure white, no fire-engine red.
- **avoid (flux-dev only):** `pure white, neon, fire-engine red, oversaturated, HDR, text, watermark, logo, signage, people faces, fisheye, tilt-shift toy effect`

---

## C — Dream Machine "In motion" cards · 3 studies, ONE register

Architectural **line / sketch-render** studies that must read as a matched set. Model: **`black-forest-labs/flux-dev`** (handles line/ink register well) · `aspect_ratio: "4:5"` · `guidance: 3`, `num_inference_steps: 34` · seeds in one family (`770301/02/03`) for visual coherence.

**Shared register clause (paste verbatim into all three):**
> *Architect's hand-drawn study on aged cream paper, fine ink-graphite linework with light specimen-teal wash and brass accents, faint herbarium-plate grid and dimension annotations, restrained and elegant, no color beyond cream/teal/brass/graphite, no pure white, no red, no photographic rendering — a working drawing, not a render.*

### C-1 · Massing options
- **slug:** `study-massing-options` · **seed:** `770301`
- **prompt:** *(register clause)* + "Three small axonometric massing studies of a 4,000 sqft modern farmhouse side by side — a long single bar, an L-wing around a courtyard, and a split gable-plus-shed pairing — each a clean block diagram with roof-pitch lines and a tiny north arrow, sitting on a Marin hillside contour."

### C-2 · Clearance study
- **slug:** `study-clearance` · **seed:** `770302`
- **prompt:** *(register clause)* + "A site-plan clearance study of the farmhouse footprint with property-line setbacks dimensioned, driveway turning radius, defensible-space vegetation offset, and eave-overhang clearances called out with thin leader lines and figures; calm technical drawing."

### C-3 · Daylight study
- **slug:** `study-daylight` · **seed:** `770303`
- **prompt:** *(register clause)* + "A building-section daylight study through the great room and loft, warm amber sun-path arcs at morning/noon/evening, dashed daylight-penetration rays reaching the floor plan, glazing and overhang depths annotated; teal-shaded interior volume."
- **avoid (flux-dev):** `photographic, 3d render, color photo, pure white background, red, neon, watermark, text blocks of paragraphs, perspective photo`

---

## Field-log / plate thumbnails  (small · a few)

Small assets for the field-log / plate strip (B4). Square-ish. Photos: **`flux-1.1-pro`**, `aspect_ratio: "1:1"`. Sketch thumb: **`flux-dev`**, `1:1`.

### T-1 · Site photo — framing on the hillside
- **slug:** `thumb-site-framing` · **seed:** `651101` · **prompt:**
> Documentary site photograph, square crop: timber wall framing and floor joists of a house under construction on a golden Marin hillside, late-afternoon warm light, sawdust and lumber stacks, a wheelbarrow; honest jobsite feel. Warm cream/amber tones with cool teal shadow, muted and filmic. No people, no text, no pure white, no bright red.

### T-2 · Site photo — material detail
- **slug:** `thumb-material-detail` · **seed:** `651102` · **prompt:**
> Close-up square photograph of a neat stack of board-and-batten cladding and a coil of soft-brass standing-seam roofing on aged kraft paper, raking golden-hour light, shallow depth of field, fine grain. Herbarium-warm palette — cream, vellum, brass, amber, teal shadow. No text, no pure white, no fire-engine red.

### T-3 · Sketch thumb — eave/connection detail
- **slug:** `thumb-detail-sketch` · **seed:** `651103` · **prompt:** *(C register clause)* + "A small square detail sketch of a roof eave and rafter-to-wall connection, a few dimension figures and a material note, drawn by an architect's hand."
- **avoid (flux-dev):** `photo, color, pure white, red, watermark, paragraph text`

---

## Run order & selection
1. Generate **both** B options (1 image each, fixed seeds) → present for **founder** pick.
2. Generate C-1/2/3 as a set; if register drifts between them, re-run the odd one with the same seed family.
3. Generate T-1/2/3.
4. All land in `brand-assets` at `assets/bkg/fidelity/…` as **draft** rows. Founder promotes later.

*Seeds are fixed so the chosen option can be regenerated byte-for-similar at higher resolution for production.*

---

## How to run

```bash
# preview the 8 assets, zero spend, no creds needed:
node stage-fidelity-assets.mjs --dry-run

# real run (Node 20.6+, where REPLICATE_API_TOKEN + Supabase creds live):
REPLICATE_API_TOKEN=… NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_CREATOR_KEY=… \
  node stage-fidelity-assets.mjs --go

# or with an env file:
node --env-file=.env stage-fidelity-assets.mjs --go

# a subset:
node --env-file=.env stage-fidelity-assets.mjs --go --only=hero-marin-farmhouse-golden-a,study-daylight
```

The script refuses to spend without `REPLICATE_API_TOKEN` and refuses to upload
without Supabase creds. It writes `status='draft'` rows only (and only when
`--catalog --schema-confirmed` is passed — otherwise it just stages the PNGs).
Local copies + a `manifest.json` land in `fidelity-out/`.
