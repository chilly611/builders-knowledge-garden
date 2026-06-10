# Visual-First & The Flags — Doctrine and Practice

*Tier 1 doctrine · 2026-06-10 · Implements the Visual-First and Legible-Judgment decisions in PLATFORM-CONSTITUTION.md (decisions 20 & 21, canonical 2026-06-10; predecessors 18 & 19 — 20/21 govern) · Public-cleared*

The decisions and amendments are quoted verbatim in `PLATFORM-CONSTITUTION.md`. This document is the practice layer: how they are built.

---

## 1. Two visual systems, one frame

| | Platform chrome | User project imagery |
|---|---|---|
| Examples | Viver seal, stage emblems, plates, crests, flags, placeholders | Tier renders, dream imagery, derivations, portal faces |
| Style | Herbarium-locked (sepia ink, parchment, one accent) | **Free** — any style, era, color, light, motion, perspective |
| Governance | Brand-QA gate, locked `--sref` | The user's taste profile + sensibility packs |
| The constant | The **frame**: parchment plate, brass corner ticks, mono caption, branded placeholder | Same frame around every render |

*The frame is ours. The dream is theirs.* Never render a user's house as a botanical engraving; never let chrome drift off the herbarium.

## 2. The generation contract (binding for every image slot)

1. **Generate once.** First good result is persisted (a `brand_assets` row with provenance: generator, model, prompt, params).
2. **Manual regenerate only.** Re-runs are a user act (and a taste signal), never an automatic side effect of render/reload. "Run it again" is gated.
3. **Placeholder first, always.** Branded placeholder (cream panel, brass ticks, mono caption) renders at 0ms; the render streams in over it; the screen never blocks on an image.
4. **Branded fallback.** Generation failure shows the placeholder/poster, never an error state or an ugly render.
5. **Reduced motion:** static placeholder, then hard swap.
6. **Cache the output** in Supabase Storage behind the CDN — serving a cached image is ~500–1,500× cheaper than regenerating. Enable Claude prompt/context caching on the large specialist system prompts (~90% off cached input).

Cache key: (slot × context-version). A material taste-profile update or explicit user regeneration is a new context version — agency and economy don't fight.

## 3. The flag taxonomy (Legible Judgment in practice)

| Kind | Color | Examples | Grounding requirement |
|---|---|---|---|
| Green | sage `#5E7A56` | ease, upside, location-inherent advantage | labeled as the engine's read |
| Watch | amber `#C68A3D` | schedule pressure, soft costs, published-goal timelines | source or "published goal — verify" |
| Risk | rust `#A53A2D` | cost overrun, code/permit, difficulty | **citation or "verify with your AHJ"** |

Rendering: color bar first, plain-language headline, one-line why — readable at a glance without prose. Flags resolve one at a time (staggered), so the read feels like a person thinking, not a page dump. Honesty rule: where a real trade-off exists, at least one risk flag shows; no option is all-green. "Go deeper" yields more flags on demand and is the only door to the expert cockpit.

## 4. The per-fact contract and the three-tier gate

Every served fact carries `{value, source_url, source_type (official|secondary), confidence, tier, as_of}`.

- **Tier A — auto-servable:** primary-source-verified, stable citation, served with inline citation + as-of date.
- **Tier B — mandatory disclaimer:** official but soft/time-sensitive (review-time goals, fee schedules) — always rendered with "published goal/figure — verify current status with [AHJ link]."
- **Tier C — human-in-the-loop:** parcel-specific determinations (flood, historic), legal/contract language, conflicting figures. Surface the question + the official source link; never auto-assert.

Application order: **CA honesty first** (the 2,256 unverified compliance rows; check AB 2622 — license floor $500→$1,000 eff. 2025-01-01), then Virginia (VB + Richmond) drops into the same schema as the generalization proof. A code-cycle watch re-verifies adopted editions (e.g., the 2024 USBC cycle) before each serving cycle.

## 5. The Seed Bank — three layers, one consent moment

- **The Vision (theirs):** project imagery, uploads, the dream as rendered. Private/project-scoped by default; never reused identifiably without an explicit share.
- **The Craft (ours, always):** de-identified process intelligence — prompts, parameters, style descriptors, keep/regenerate win-rates by region and tier. Feeds the flywheel continuously.
- **The Commons (shared by choice):** published assets — credited, browsable, remixable. **Promotion is the consent moment** (status/visibility change in the catalog, service-role-only past the QA gate; contributor recorded).

Posture: aggressive with the Craft, generous with the Commons, never touch the Vision.

## 6. Sensibility packs and derivation-by-default

- A **sensibility pack** = a curated set of exemplar specimens + a locked style reference + a prompt template (e.g., Modern Farmhouse, Spanish Revival, Japandi, FLW-modernist, Coastal). Packs are catalog rows; they are ranked and rotated by win-rate per region/segment, and exceptional generations are promoted into new style parents.
- **Derivation-by-default:** a kept design auto-spawns its tier siblings — Budget / Business Class / First-Class Luxury renditions of the *same design DNA* (scaled, re-materialized) — before anyone asks. Elements can be lifted (Genome) and grafted across projects. Lineage (`style_ref_id`, `parent_asset_id`) records all of it.
- Taste profiles store **style language** ("warm wood, big glass, low rooflines"), exemplar asset IDs, and region — never demographic boxes. The user can always see why they're being shown what they're shown.

## 7. Portals

No rendered image is a dead pixel — **every image is an entrance.** Every catalog row knows its `project_id`, slot, and context; tapping a render opens its project at the right stage. A **shared portal is the acquisition loop**: better images → more sharing → more users → more taste signal → better images. Every shared render is an ad the user wanted to send, wearing the brand frame.

## 8. Ways to Dream (ports from the Dream Machine)

Available as verbs wherever an image slot exists, in this build order:
1. **Browse** — the Commons front door: filter by sensibility, region, budget tier.
2. **Inspire** — serendipity over the same rows.
3. **Genome** — decompose a loved design into elements (roofline, material, glazing, massing) so any element can carry into a new generation.
4. **Alchemist** — remix: this design × that sensibility (two lineage parents, one generation).

## 9. The road to critical mass

1. **Seed it ourselves (now):** stage emblems, sensibility packs, the ~25-slot asset program — fill the first shelves by hand, to our own lock.
2. **Every generation multiplies (item F):** derivation-by-default.
3. **Open the portals (ships with first-run):** shareable dream views.
4. **Lift the umbrella (eventually):** the engine is garden-agnostic; every Knowledge Garden inherits it.

## 10. Substrate

`public.brand_assets` (catalog: key-resolved, provenance, lineage, renditions, status workflow, visibility) + `public.brand_asset_events` (the RSI/taste feed). RLS posture: creators are draft-only; **promotion past the QA gate is service-role-only** (no self-publish); users may log usage events (`referenced`/`rendered`/`user_created`) only. The `generator` column keeps the system engine-agnostic — engines are swappable, the taste data is not.
