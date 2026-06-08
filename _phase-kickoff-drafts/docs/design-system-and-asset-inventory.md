> **DRAFT — phase-kickoff. Not yet adopted. Read-only/plan-only pass; no code or assets were changed producing this. For founder review.**

# Design system and asset inventory
*phase-kickoff draft · Tier 3 reference · for founder review*

This catalogs what **exists in the repo today** — tokens, fonts, the seal/emblem set, images, and animations — so the next person adding or changing an asset has one place to look. It is an inventory, not a redesign. It was produced against the `feat/shared-app-shell` worktree, with the seal/emblem code read from `origin/main` (where it has already merged) since that worktree does not carry those files.

Where this disagrees with `docs/asset-manifest.md` (the 2026-05-28 audit) or `docs/ui-kit.md`, the disagreement is called out — the repo moved on after both were written, most notably the **seal rollout (2026-06-07)** and the brand-mark rewiring.

Cross-references: `docs/design-constitution.md` (Tier 1, the ten goals + canonical palette + antipatterns), `docs/PLATFORM-CONSTITUTION.md` (Tier 0, on `origin/main` — palette and typography locks), `docs/asset-manifest.md` (prior image audit), `docs/ui-kit.md` (component-to-kit map).

---

## Part A — Inventory

### A note on what governs

Two constitutions sit above this inventory and must both be honored:

- **Platform Constitution (Tier 0, `docs/PLATFORM-CONSTITUTION.md`, on `origin/main`)** — locked decision #4: *"Herbarium brand. Light backgrounds always — never dark. Cream/parchment, teal `#3C7A8A`, rust `#A53A2D`, sage, gold. Prohibited: red `#E8443A`, pure white."* Locked decision #5: *"Typography: Archivo (body/UI), Archivo Black (display). Global, no exceptions."*
- **Design Constitution (Tier 1, `docs/design-constitution.md`)** — the W8→herbarium aliasing, the four surface chromes, the antipattern list, and the implementation source-of-truth chain.

Everything below is measured against those two.

---

### A1 — Tokens

**Canonical source: `src/styles/tokens.css`** (~9 KB on disk; the "~13 KB" figure in the brief is close — it is the largest single token file). It is loaded **first** in `src/app/layout.tsx`, before `globals.css`. It declares the full herbarium system: paper/ink, the specimen palette, semantics, surface accents, elevation, radii, spacing, fonts, type scale, texture, and timing.

| Token group | Representative tokens (value) | Where defined | Notes |
|---|---|---|---|
| Paper & ink | `--paper-cream` `#F2E9D2` · `--paper-vellum` `#E8DDB8` · `--paper-edge` `#C9B98A` · `--paper-fold` `#D8C9A0` · `--paper-shadow` `#B5A270` · `--ink-sepia` `#5A3B1F` · `--ink-graphite` `#2A2620` · `--ink-script` `#6B4A2A` · `--ink-faded` `#8C6A45` · `--obsidian` `#0A0A0A` | `tokens.css` | Cream is the default surface. `--obsidian` is documented "dark-mode base only" — but dark mode is **disabled** (see A1 drift). Matches the constitution palette exactly. |
| Specimen palette | `--specimen-teal` `#3C7A8A` (PRIMARY) · `--specimen-teal-deep` `#234C5A` · `--specimen-teal-pale` `#A6C4CC` · `--specimen-rust` `#A53A2D` (DANGER) · `--specimen-rust-deep` `#6E2419` · `--specimen-rust-pale` `#E6B7AE` · `--specimen-brass` `#B08D5C` (SECONDARY) · `--specimen-brass-aged` `#7C6235` · `--specimen-brass-pale` `#E2CFA6` · `--specimen-sage` `#5E7A56` (SUCCESS) · `--specimen-sage-deep` `#3E5638` · `--specimen-sage-pale` `#B5C4A8` · `--specimen-amber` `#C68A3D` (WARNING) · `--specimen-amber-deep` `#8C5E22` | `tokens.css` | The teal `#3C7A8A` + rust `#A53A2D` exactly match the Platform Constitution lock. Brass/amber are the Dream-Machine pair; sage is Knowledge Garden. |
| Flash teal | `--flash-teal` `#00FFE0` · `--flash-teal-deep` `#00C9B0` | `tokens.css` | A single deliberate neon flash — "never as a fill, never larger than ~12px." Lives apart from the specimen palette. |
| Semantic | `--bg` → `--paper-cream` · `--bg-raised` `#FAF3DE` · `--fg` → `--ink-sepia` · `--fg-strong` → `--ink-graphite` · `--accent` → `--specimen-teal` · `--success/--warning/--danger/--info` · `--border` → `--paper-edge` · `--border-hairline` `rgba(90,59,31,0.18)` | `tokens.css` | Clean semantic layer pointing at the raw palette. Note: this `--bg` (cream) is **shadowed** by `globals.css` `--bg: #ffffff` (see drift). |
| Surface accents | `--surface-killer` → teal · `--surface-killer-2` → rust · `--surface-dream` → brass · `--surface-dream-2` → amber · `--surface-garden` → sage · `--surface-umbrella` → ink-sepia | `tokens.css` | One pair per surface chrome — matches the constitution's "Surfaces" table. |
| Elevation | `--shadow-page-1/2/3` · `--shadow-plate` · `--shadow-inset` · `--shadow-focus` (`0 0 0 3px color-mix(... teal 35%)`) | `tokens.css` | "Short and warm, never a wide soft blur," always paired with a 1px sepia hairline. |
| Radii | `--radius-hairline` 1px → `--radius-xl` 10px · `--radius-pill` 999px · `--radius-disk` 50% | `tokens.css` | Tight by design — "paper isn't very round." Disk is for gauges/wax seals. |
| Spacing | `--space-0` 0 → `--space-24` 96px (4px base) | `tokens.css` | Hand-counted 4px scale. |
| Font families | `--font-display` (Archivo Black) · `--font-ui` (Archivo) · `--font-editorial` (EB Garamond) · `--font-script` (Italianno/Pinyon Script) · `--font-mono` (JetBrains Mono) | `tokens.css` | See A2 — the Next-optimized layout overrides these. |
| Type scale | `--text-xs` 12px → `--text-5xl` 61px (1.25 modular) · leading + tracking sets | `tokens.css` | `--tracking-loose` 0.18em is the engineering-label tracking. |
| Texture | `--paper-noise` (inline SVG fractal noise) · `--grid-line` / `--grid-line-strong` (brass-aged @ 10/22%) | `tokens.css` | The faint engineering grid + paper grain. No external texture images. |
| Timing | `--ease-out-paper` `cubic-bezier(0.2,0.8,0.2,1)` · `--ease-in-out-paper` · `--dur-quick` 140ms · `--dur-base` 220ms · `--dur-slow` 360ms · `--dur-hero` 900ms | `tokens.css` | Mirrored (in ms) by the JS motion tokens — see A5. |

**Aliases — `src/app/globals.css`.** The seven W8-locked names alias to herbarium tokens, so any component reading `var(--navy)` etc. picks up the shift with no code change:

| Alias | Resolves to | Hex |
|---|---|---|
| `--navy` / `--navy-deep` | `--specimen-teal-deep` | `#234C5A` |
| `--trace` / `--faded-rule` | `--paper-edge` | `#C9B98A` |
| `--graphite` | `--ink-graphite` | `#2A2620` |
| `--brass` | `--specimen-brass` | `#B08D5C` |
| `--redline` | `--specimen-rust` | `#A53A2D` |
| `--robin` | `--specimen-teal` | `#3C7A8A` |
| `--orange` | `--specimen-amber` | `#C68A3D` |

These match the Design Constitution's "Canonical Palette (W8 lock — herbarium amendment)" table exactly.

**TypeScript mirror — `src/design-system/tokens/colors.ts`.** The exported `colors` object preserves the pre-herbarium *shape* (so `src/components/stage-shell/*` and other consumers that index by key keep working) but its *values* are herbarium hex. `colors.robin = '#3C7A8A'`, `colors.brass = '#B08D5C'`, `colors.redline = '#A53A2D'`, the `phase.*` map, the `ink`/`cyan`/`amber` numeric ramps, and `paper.white = '#F2E9D2'` (the file itself notes "No pure white — use cream"). This is the canonical JS access path.

**Other token files in `src/design-system/tokens/`:**

| File | Holds | Status / notes |
|---|---|---|
| `spacing.ts` | `spacing` / `gaps` / `padding` / `margin` (4–96px) as **numbers** | In use by JS consumers. Parallel to the CSS `--space-*` scale; values agree on the 4/8px base. |
| `stage-accents.ts` | `STAGE_ACCENTS` 0–7 — per-stage chips/backdrops (`brass #B6873A`, `ochre #C9913F`, `indigo #3E3A6E`, `teal #2E9E9A`, `coral #E05E4B`, `magenta #B23A7F`, `duskPurple #5E4B7C`) + `StageId`/`StageAccentKey` types + `stageAccent()` | **Additive, separate palette.** Its hexes are NOT herbarium (e.g. `#B6873A` brass vs `--specimen-brass #B08D5C`; `#E05E4B` coral vs `--specimen-rust #A53A2D`). Self-documented as "does not modify the canonical W8 palette." Used by `StageContextPill`, `StageBreadcrumb`, `StageBackdrop`. **Flag:** a candidate to reconcile with herbarium. |
| `typography.ts` | `fonts` (Inter / Playfair Display / IBM Plex Mono), `fontImportUrl`, sizes/weights/leading/tracking | **STALE / off-brand.** Header literally says "Blueprint Design System." Inter + Playfair contradict the Archivo lock. **High-priority drift** — see A1 drift. Indexed only by older blueprint-era code, if at all. |
| `index.ts` | Re-exports the above | — |

**Legacy parchment/copper set — `src/lib/brand-tokens.ts`** (~2 KB; the "~15 KB" figure in the brief refers to the ~15 *surfaces* that consume it, not the file size). The "Knowledge Gardens OS Federation Contract": `BRAND_COLORS` (parchment `#F5F0E8`, copper `#B87333`, steel `#71797E`, forestInk `#0F2419`, gold `#C9A84C`, plus green/red accent families) and `BRAND_FONTS` (Cormorant Garamond display, Space Mono labels), with a `brandStyle` inline-style helper. The Design Constitution (§Implementation Source of Truth) states this "remains in place for backwards compatibility with the ~15 surfaces that import it. Next-sprint follow-up: migrate those surfaces, then archive." **Slated to migrate.**

---

#### Source-of-truth chain (tokens)

```
Knowledge Gardens Design System v0.1 export
  (/Users/chilly/Developer/Knowledge Gardens Design System/, external, read-only)
        │  re-export drops new hex/scale into the repo
        ▼
src/styles/tokens.css            ← CANONICAL. Loaded first in layout.tsx.
        │  W8 names alias to herbarium tokens
        ▼
src/app/globals.css :root        ← --navy/--brass/--robin/... = var(--specimen-*)
        │  hand-mapped to identical hex for JS consumers
        ▼
src/design-system/tokens/colors.ts   ← MIRROR (TS). Same values, legacy shape.

  (parallel, NOT in the chain — flagged for migration/reconciliation)
  • src/lib/brand-tokens.ts            parchment/copper Federation Contract — migrate the ~15 consumers, then archive
  • src/design-system/tokens/typography.ts   stale Inter/Playfair "Blueprint" set — supersede with Archivo
  • src/design-system/tokens/stage-accents.ts  additive non-herbarium stage chip palette — reconcile
```

Pre-herbarium snapshots are preserved at `src/components/_archive/2026-05-28-design-system/` (`colors-pre-herbarium.ts`, `globals-pre-herbarium.css`) for the historical record.

---

#### A1 drift (tokens)

- **`globals.css` still ships a pure-white, generic-green base layer that shadows the herbarium semantics.** Lines 3–24 set `--bg: #ffffff`, `--bg-secondary: #f8f9fa`, `--fg: #111111`, `--accent: #1D9E75`, `--danger: #dc3545`, plus `--radius-*`/`--shadow-*` with cool `rgba(0,0,0,…)` blurs. Because `globals.css` loads *after* `tokens.css`, **this `--bg: #ffffff` wins** wherever a surface reads `var(--bg)` without a more specific override — and `<body>` in `layout.tsx` sets `background: var(--bg)`. The Platform Constitution and the Design Constitution both **prohibit pure white**. This is the single most important token drift to resolve.
- **`globals.css` also carries a full deprecated `--bp-*` "Blueprint Design System" palette** (lines 27–61: `--bp-ink-*`, `--bp-paper-white #FFFFFF`, `--bp-phase-*`, plus `--bp-font-mono: 'Courier Prime'` and `--bp-font-sans: 'Space Grotesk'`). Marked "DEPRECATED … will be removed." Two non-Archivo font stacks live here.
- **`viewport.themeColor` in `layout.tsx` is `#ffffff` (light) / `#0a0a0a` (dark).** The light theme-color is pure white and there is a dark entry, even though dark mode is disabled and white is prohibited. Cosmetic but off-lock.
- **`typography.ts` (Inter/Playfair/IBM Plex Mono) directly contradicts the Archivo lock.** It is the clearest "do not use this" file in the token tree.
- **`tokens.css` imports more script/serif faces than the brand uses** — its `@import` pulls EB Garamond, **Italianno, Pinyon Script**, and JetBrains Mono from Google Fonts. The brief's expectation of "Cormorant / Space Mono only in specific presentations" holds: the canonical app stack is Archivo + Archivo Black + EB Garamond + Pinyon Script + JetBrains Mono. Cormorant/Space Mono appear only in `brand-tokens.ts` and the standalone presentation HTML, not in the canonical token stack.

---

### A2 — Fonts

Confirmed loading path: **`src/app/layout.tsx` uses `next/font/google`** and applies the variables on `<html>`.

| Role | Family | Loaded via | CSS variable | Where used |
|---|---|---|---|---|
| Body / UI | **Archivo** (300–900) | `next/font/google` in `layout.tsx` | `--font-archivo` (and `--font-ui` in tokens) | Global `<body>` font; `globals.css` `@theme inline --font-sans`; the constitution's body/UI lock |
| Display | **Archivo Black** (400) | `next/font/google` in `layout.tsx` | `--font-archivo-black` (and `--font-display` in tokens) | `h1–h4`, wordmarks, hero titles |
| Editorial | **EB Garamond** (ital + roman) | `next/font/google` in `layout.tsx` | `--font-editorial` | Specimen-plate captions, `.editorial` / `blockquote`. (tokens.css names "Cormorant Garamond" only as a *fallback* in the stack) |
| Script | **Pinyon Script** (400) | `next/font/google` in `layout.tsx` | `--font-script` | `.plate-caption` script voice. (tokens.css names Italianno first as a fallback; the Next-optimized face is Pinyon) |
| Mono | **JetBrains Mono** | `next/font/google` in `layout.tsx` | `--font-mono` | `.eng-label`, `.eng-data`, `code/kbd/samp`, engineering labels |

How the two declarations coexist: `tokens.css` declares the `--font-*` variables (with Google Fonts `@import` for non-React/SSR-first surfaces and as fallbacks), and `next/font/google` in `layout.tsx` **overrides them on the `<html>` element** with preload/FOUT-managed assets. Comment in `layout.tsx` documents this on purpose.

**Off-canonical font stacks present but not canonical** (do not use for BKG surfaces): Inter/Playfair/IBM Plex Mono (`typography.ts`), Space Grotesk/Courier Prime (`globals.css --bp-*`), Cormorant Garamond/Space Mono (`brand-tokens.ts`). The brief's note holds — Cormorant/Space Mono belong to the Orchids field-guide treatment and the `the-knowledge-gardens-os.html` / orchid presentations, not BKG canonical.

---

### A3 — The Viver seal + emblem set

**This is the highest-uncertainty item, so to be precise about provenance:** the seal is implemented **in code**, not as a `public/` image file. The animating asset itself is a **video + poster pulled from a Supabase storage bucket**, not from `public/`. The seal code does **not** live on the `feat/shared-app-shell` worktree this inventory was written against — it lives on `origin/main` (already merged), and identically on the `feat/seal-rollout` and `feat/viver-seal` refs (the `Seal.tsx` file is byte-for-byte the same 88 lines on all three). The tables below are read from `origin/main` via `git show`.

The git history behind it: `feat/viver-seal` + `feat/seal-rollout` ("repoint Logo.tsx variants + sweep direct refs"), with the Framer Motion "seal spring/breathe" entrance.

There are **two parallel seal implementations** plus the static brand marks.

#### A3a — Canonical animated seal (shared app shell)

| Name | File (on `origin/main`) | Variants / props | Where used | Notes |
|---|---|---|---|---|
| `Seal` | `src/components/app-shell/Seal.tsx` | `size` (def 52), `radius`, `src`, `poster`, `className`, `delay` (def 0.1s) | `ShellStrips.tsx` (`<Seal size={52}>`, the budget strip lead); `OwnerHomeClient.tsx` (`<Seal size={76}>`, `.ov-hero-seal`); exported from `app-shell/index.ts` | The "Viver" hammer-roots herbarium plate. Framer Motion **spring entrance** (`scale 0.55→1, opacity 0→1, rotate -12→0`, `stiffness 150 / damping 15`) **+ a 6.5s breathing scale loop** (`[1, 1.035, 1]`), over an autoplaying looped `<video>`. **`prefers-reduced-motion`: renders the static poster only** — no entrance, no breathe, `preload="none"` so the video bytes are never fetched. |
| `BKG_SEAL_SRC` | `src/components/app-shell/config.ts` | constant | consumed by `Seal` default | `…/storage/v1/object/public/brand-assets/assets/bkg/hammer-roots-mark-motion.mp4` (Supabase bucket; the `assets/` prefix is a deliberate `storage_path` quirk documented in the file). `brand_assets` row: `garden_scope='bkg'`, `asset_type='motion'`. |
| `BKG_SEAL_POSTER` | `src/components/app-shell/config.ts` | constant | `Seal` poster + reduced-motion still | `…/brand-assets/assets/bkg/hammer-roots-emblem.png` — the static herbarium emblem. |
| `UMBRELLA_SEAL_SRC` | `src/components/app-shell/config.ts` | constant | cross-garden switcher (the level above BKG) | `…/brand-assets/assets/umbrella/tree-umbrella-mark-motion-a.mp4`. Retained but "no longer the BKG shell seal." |
| `SEAL_SRC` | `src/components/app-shell/config.ts` | `@deprecated` alias → `BKG_SEAL_SRC` | back-compat | Still re-exported from `index.ts`. |

CSS framing for the seal video: `src/components/app-shell/app-shell.css` `.bkg-shell .bkg-mark` — `1px solid var(--paper-edge)` border, `var(--paper-cream)` background, `var(--shadow-page-1)`, `overflow:hidden`, with `.bkg-mark video { object-fit: cover }`. A `@media (prefers-reduced-motion: reduce)` block is present.

#### A3b — Owner-Lane seal (parallel pre-shell implementation)

| Name | File (on `origin/main`) | Variants / props | Where used | Notes |
|---|---|---|---|---|
| `BkgMark` | `src/app/killerapp/projects/[id]/owner/parts.tsx` | `size` (def 28), `radius` (def 4) | inside `SealMark`; Owner Lane chrome | Raw looping `<video src="/owner-lane/bkg-logo.mp4">` — the **local** public mp4 (4.7 MB), distinct from the Supabase mark the shell `Seal` uses. |
| `SealMark` | `src/app/killerapp/projects/[id]/owner/parts.tsx` | `size` (def 72), `radius`, `delay` (def 0.1s) | `GlobalStrips` (`<SealMark size={40}>`) and the Owner hero | The Owner-Lane twin of `Seal`: same spring entrance + 6.5s breathe loop, `useReducedMotion()`-guarded (at-rest when reduced). Wraps `BkgMark`. |

This is a near-duplicate of `Seal` that predates the shared shell. The shell's `index.ts` header notes "Owner Lane is now a CONFIG of this shell, not a bespoke copy" — but `parts.tsx` still carries its own `BkgMark`/`SealMark` against the local mp4. **Flag:** reconcile onto the shared `Seal` + Supabase asset.

#### A3c — Static brand marks (B-mark, plates)

| Name | File | Variants / props | Resolves to | Where used |
|---|---|---|---|---|
| `Logo` | `src/components/brand/Logo.tsx` | `variant` ∈ {`default`, `light`, `dark`, `wood`}, `width`/`height` (def 32), `priority` (def true), `alt`, `className` | `/brand/bkg-mark{,-light,-dark,-wood}.png` | The intended single source for the B-mark. Adoption still in progress per asset-manifest. |
| `Logomark` | `src/components/Logomark.tsx` | `size` (def 32), `alt` | **`/brand/bkg-mark.png`** | The shared mark in `KillerAppNav`, the error page, `CompassNav`. **Rewired 2026-06-07** from `/icon.png` to the canonical Viver mark (the in-file comment documents this). |
| `HeroPlate` | `src/components/brand/HeroPlate.tsx` | `name` ∈ {`builders-hammer`, `chrome-killer-app`, `chrome-dream-machine`, `chrome-knowledge-garden`}, `width`/`height` (def 800), `priority`, `alt` | `/plates/<name>.png` | The four hero specimen plates (brand DNA). Built, adoption pending. |
| `BkgMark` (kit) | n/a (kit concept) | — | maps to `Logomark.tsx` per `ui-kit.md` | Design-system kit primitive; the in-repo realization is `Logomark`. |

**Drift vs. `docs/asset-manifest.md`:** the manifest (2026-05-28) says `Logomark` reads `/icon.png`. That is now **stale** — `Logomark` reads `/brand/bkg-mark.png` after the seal rollout. The manifest also predates the `Seal` component and the Supabase `brand-assets` bucket entirely; **this inventory supersedes the manifest on the seal/emblem set.**

---

### A4 — Images

Full walk of `public/` (119 MB total). Path · type · size · dimensions (where cheap) · intended use. Sizes are bytes-on-disk rounded; dimensions via `file`.

#### Brand marks — `public/brand/` (canonical, synced 2026-05-28)

| Path | Type | Size | Dim | Use |
|---|---|---|---|---|
| `brand/bkg-mark.png` | PNG RGBA | 240 KB | 327×512 | `Logo variant="default"` + `Logomark` master mark |
| `brand/bkg-mark-light.png` | PNG RGBA | 268 KB | 327×512 | `Logo variant="light"` — white outline for dark/photo BGs |
| `brand/bkg-mark-dark.png` | PNG RGBA | 256 KB | 327×512 | `Logo variant="dark"` — dark outline |
| `brand/bkg-mark-wood.png` | PNG RGBA | 269 KB | 327×512 | `Logo variant="wood"` — wood outline for cream BGs |

#### Logo / icon / OG — `public/logo/`, `public/og/`, root icons

| Path | Type | Size | Dim | Use |
|---|---|---|---|---|
| `logo/b_transparent_512.png` | PNG RGBA | 240 KB | 327×512 | Legacy default mark — still referenced in ~8 places; duplicate of `brand/bkg-mark.png` |
| `logo/b_dark_outline_512.png` | PNG RGBA | 256 KB | — | Legacy dark outline; used by `/dashboard`; dup of `brand/bkg-mark-dark.png` |
| `logo/b_white_outline_512.png` | PNG RGBA | 268 KB | — | Legacy white outline; orphan; dup of `brand/bkg-mark-light.png` |
| `logo/b_wood_outline_512.png` | PNG RGBA | 269 KB | — | Legacy wood outline; orphan; dup of `brand/bkg-mark-wood.png` |
| `logo/b_icon_192x192.png` | PNG icon | 30 KB | — | Referenced in `layout.tsx metadata.icons` |
| `logo/b_icon_512x512.png` | PNG icon | 172 KB | 512×512 | Referenced in `layout.tsx metadata.icons` |
| `logo/favicon.ico` | ICO | 578 B | — | Referenced as `/favicon.ico` (served via root rewrite) |
| `logo/og_image_light.png` | OG card | 195 KB | — | Orphan — superseded by `/og/og-light.png` |
| `logo/og_image_dark.png` | OG card | 183 KB | — | Orphan — superseded by `/og/og-dark.png` |
| `og/og-light.png` | OG card | 195 KB | 1200×630 | **Live** — `layout.tsx` openGraph + twitter images |
| `og/og-dark.png` | OG card | 183 KB | 1200×630 | Placed, not wired — dark-theme OG fallback |
| `apple-touch-icon.png` | PNG icon | 30 KB | 192×192 | `layout.tsx metadata.icons.apple` |
| `icon-192.png` | PNG icon | 30 KB | — | Placed; not yet referenced in metadata |
| `src/app/icon.png` | PNG icon | 30 KB | — | Next.js auto-pickup app icon (in `src/`, not `public/`) |

#### Plates (surface chrome — brand DNA) — `public/plates/`

| Path | Type | Size | Dim | Use |
|---|---|---|---|---|
| `plates/builders-hammer.png` | PNG RGBA | 897 KB | 800×800 | `HeroPlate name="builders-hammer"` — the master mark referenced by the constitution as `assets/plates/builders-hammer.png` |
| `plates/chrome-killer-app.png` | PNG RGBA | 2.4 MB | 1456×816 | Killer App surface chrome plate (teal + rust) |
| `plates/chrome-dream-machine.png` | PNG RGBA | 2.4 MB | — | Dream Machine surface chrome plate (brass + amber) |
| `plates/chrome-knowledge-garden.png` | PNG RGBA | 2.3 MB | — | Knowledge Garden surface chrome plate (sage) |

These four are exactly the "Plate (in design system)" column of the Design Constitution's Surfaces table. **Note:** the constitution writes the path as `assets/plates/…`; the live repo path is `public/plates/…`. There is **no top-level `brand_assets/` directory** — confirmed.

#### Garden / Dream Machine logos — `public/logos/`

| Path | Type | Size | Use / state |
|---|---|---|---|
| `logos/gardens/builders-hammer.png` | 898 KB | **Duplicate** of `plates/builders-hammer.png`; used by `/intro` Act 1 + Act 5 |
| `logos/gardens/chrome-{killer-app,dream-machine,knowledge-garden}.png` | 2.4 / 2.4 / 2.3 MB | **Duplicates** of `plates/chrome-*.png`; used by `/intro` ChromeOrbits |
| `logos/gardens/knowledge-gardens-tree.png` | 1.5 MB | The tree drawing on the Killer App landing + `/intro` Act 5; no `HeroPlate` variant yet |
| `logos/gardens/{biomarker,builder-lockin,builder-sizeup,channel-type,distribute,garden-legal,health-garden-caduceus,legal,optimize,orchid-garden,strategy,toxicology-caduceus,ui-pro-toggle-and-search,vertical-mobile-ad}.png` | ~1–1.5 MB each | **Orphans** — shipped 2026-05-20, never wired (14 files) |
| `logos/gardens/_originals/*.png` | 9 files, ~0.8–2.1 MB | Backup originals (pre-resize) of the plates + garden marks; keep as reference |
| `logos/dream/*.webp` | 15 files, 28–145 KB | **Orphans** — Dream Machine surface concept glyphs (alchemist, browse, collider, cosmos, describe, explore, genome, inspire, narrator, oracle, plans, quest, sandbox, sketch, voice); none referenced |
| `logos/gardens/.gitkeep` | 90 B | Directory marker |

#### Stage / journey imagery — `public/journey/`, `public/stage-backdrops/`, `public/owner-lane/`

| Path | Type | Size | Dim | Use / state |
|---|---|---|---|---|
| `journey/sizeup-journey.png` | PNG | 1.3 MB | — | Per-stage backdrop concept — orphan |
| `journey/lock-journey.png` | PNG | 1.4 MB | — | orphan |
| `journey/plan-journey.png` | PNG | 1.1 MB | — | orphan |
| `journey/build-journey.png` | PNG RGB | 943 KB | 1024×1024 | orphan |
| `journey/beginning-journey.jpg` | JPG | 39 KB | — | orphan |
| `journey/Structural-journey.jpeg` | JPEG | 74 KB | — | orphan |
| `journey/sketch-journey.JPG` | JPEG | 108 KB | — | orphan |
| `journey/equipment-journey.PNG` | PNG | 2.2 MB | — | orphan |
| `journey/sequencing-journey.JPG` | JPEG | 84 KB | — | orphan |
| `journey/tool-journey.PNG` | PNG | 1.8 MB | — | orphan |
| `journey/tree-portal-journey.PNG` | PNG | 1.8 MB | — | orphan |
| `journey/Journey-map-sketch.png` | PNG | 326 KB | — | Annotation sketch — orphan; **duplicate** of `design-refs/journey-map-sketch.png` |
| `stage-backdrops/{sizeup,lock,plan,build}-journey.png` | PNG | matches `journey/` | 1024×1024 (build) | **Duplicate set** of `public/journey/`; orphan |
| `stage-backdrops/beginning-journey.jpg` | JPG | 39 KB | — | **Duplicate** of `journey/beginning-journey.jpg`; orphan |
| `owner-lane/structural-journey.jpeg` | JPEG | 74 KB | — | **Duplicate** of `journey/Structural-journey.jpeg` |
| `owner-lane/sketch-journey.jpg` | JPG | 108 KB | — | **Duplicate** of `journey/sketch-journey.JPG` |
| `owner-lane/bkg-logo.mp4` | MP4 | 4.7 MB | — | The Owner-Lane `BkgMark` video (see A3b) |

#### Cinematic / close-out / reference / imagery / misc

| Path | Type | Size | Use / state |
|---|---|---|---|
| `design-assets/close-out-frames/frame-{001..004}.jpg` | JPG | 72–81 KB ea. | **In use** — the close-out ritual frames (`close-out/CloseOutClient.tsx`) |
| `intro-assets/tool-tree.mp4` | MP4 | 9.6 MB | Referenced **only in comments** in `intro/page.tsx` — **not wired** (orphan) |
| `bkg/anim.html` | HTML | 10 KB | **In use** — the `/cinematic` route iframes this |
| `bkg/b_logo_3D.glb` | GLB 3D model | 29 MB | The 3D B-logo model (largest single asset); see A5 |
| `bkg/{n6k,p6k}.txt` | Text | 48 KB ea. | Likely orphan data files |
| `cinematic.html` · `killer-app.html` · `investor-brief.html` | HTML | 70 KB / 50 KB / 1.8 MB | Standalone prototypes — orphans (verify before deleting) |
| `_design-preview/owner-v3.html` | HTML | 3.6 MB | Owner-Lane v3 preview artifact — orphan/untracked |
| `design-refs/journey-map-sketch.png` | PNG | 326 KB | Reference — orphan; dup of `journey/Journey-map-sketch.png` |
| `design-refs/tiffany-blue-key.jpeg` | JPEG | 167 KB | Reference — orphan; **duplicate** of `imagery/_.jpeg` |
| `imagery/_.jpeg` | JPEG | 167 KB | Orphan; dup of `design-refs/tiffany-blue-key.jpeg`; filename `_` suggests an accidental copy |
| `imagery/img_2006.webp` | WebP | 765 KB | Brand photo — orphan |
| `imagery/img_2082.png` | PNG | 1.9 MB | Brand photo — orphan |
| `imagery/img_{2008,2014,2094}.{jpg}` | JPG | 11–104 KB | Brand photos — orphan |
| `icons/` , `walkthrough/` | dirs | empty | **Empty directories.** `icons/` was the planned home for the 7 hand-drawn stage SVGs (asset-manifest §5) |
| `llms.txt` · `robots.txt` | text | 10 KB / 3 KB | Bot directives — live |
| `bkg-mcp.mcpb` | MCP bundle | 2.7 KB | The MCP server bundle |
| `file.svg` · `globe.svg` · `next.svg` · `vercel.svg` · `window.svg` | SVG | <1.4 KB | Default Next.js scaffolding — orphan |

---

### A5 — Animations

Three layers exist, and they do not share one philosophy — that is itself the headline finding.

| Name | File | Type / props | Reduced motion | Notes |
|---|---|---|---|---|
| `Seal` spring + breathe | `src/components/app-shell/Seal.tsx` | Framer Motion: spring entrance (`scale/opacity/rotate`) + 6.5s breathe loop over `<video>` | **Yes** — static poster, no entrance/loop, video `preload="none"` | The "seal spring/breathe" from the git log. Canonical. |
| `SealMark` / `BkgMark` | `owner/parts.tsx` | Framer Motion: same spring + breathe over local mp4 | **Yes** — `useReducedMotion()` at rest | Owner-Lane twin (see A3b). |
| Owner-Lane motion set | `owner/parts.tsx` | `Reveal` (fade/translate), `Gauge`/`OwnerGauge` (count-up + needle), `GlobalStrips` `jline-fill` (journey fill `width 0→%`) | **Yes** — all `useReducedMotion()`-guarded | The "strip stagger, journey fill, count-up" from the git log. Uses hardcoded `accent="#3C7A8A"` rather than the teal token. |
| `BlueprintDraw` | `src/design-system/animations/blueprint-draw.tsx` | Framer Motion `motion.path` stroke-draw; `width/height/duration/loop/color` (def color `#1B3B5E`) | Via `blueprint-keyframes.css` `@media reduce` | **Hardcoded legacy hex** (`#1B3B5E`), not herbarium. |
| `CompassTrace` | `src/design-system/animations/compass-trace.tsx` | Framer Motion rotating needle on a compass rose; `size/duration/color` (def `#B6873A`) | Via keyframes CSS | Hardcoded `#B6873A`, `#C9C3B3`, `#F4F0E6`, `#1B3B5E`. |
| `HammerTap` | `src/design-system/animations/hammer-tap.tsx` | Framer Motion tap (rotate/translate); `size/taps/onComplete` | Via keyframes CSS | Hardcoded `#2E2E30`, `#B6873A`, `#C9C3B3`, `#1B3B5E`. |
| CSS motion utilities | `src/design-system/motion/` (`README.md`) + `globals`/keyframes | **Pure CSS, no JS**: `.bkg-fade-up` (280ms), `.bkg-fade-in`, `.bkg-scale-in`, `.bkg-hover-lift`, `.bkg-hero-mark` (900ms), `.bkg-stagger-1..6` (40–240ms) | "Built into the CSS" — every class guarded by `@media (prefers-reduced-motion: reduce)` | Explicitly states **"No framer-motion or react-spring"** and "no layout shift — transform/opacity only." |
| Motion tokens (JS) | `src/design-system/motion/tokens.ts` | `MOTION` (entrance 280 / hover 180 / hero 900 ms; springy + ease-out curves), `STAGGER_DELAYS [40..240]` | n/a (values only) | The JS-side mirror of the CSS timing + `tokens.css` `--dur-*`. |
| Scroll/blueprint keyframes | `animations/blueprint-keyframes.css`, `animations/scroll-timeline.css` | CSS keyframes + scroll-timeline | Reduced-motion guards present | Backing CSS for the blueprint set and scroll stages. |

**Video / 3D assets used by animations:**

| Asset | Path / source | Size | Wired? |
|---|---|---|---|
| Hammer-roots motion mark | Supabase `brand-assets/assets/bkg/hammer-roots-mark-motion.mp4` | (bucket) | Yes — `Seal` |
| Owner-Lane logo mp4 | `public/owner-lane/bkg-logo.mp4` | 4.7 MB | Yes — `BkgMark` |
| Tree umbrella motion | Supabase `brand-assets/assets/umbrella/tree-umbrella-mark-motion-a.mp4` | (bucket) | Retained for cross-garden switcher |
| Intro tool-tree | `public/intro-assets/tool-tree.mp4` | 9.6 MB | **No** — comments only |
| Cinematic HTML | `public/bkg/anim.html` | 10 KB | Yes — `/cinematic` iframe |
| 3D B-logo | `public/bkg/b_logo_3D.glb` | 29 MB | GLB model — no `src/` reference found; appears unwired (likely fed by `anim.html` or a future 3D scene) |

**Reduced-motion handling — good overall.** Every animation surface that matters guards motion: `Seal.tsx`, `owner/parts.tsx` (via `useReducedMotion`), the CSS motion utilities, and the blueprint/scroll keyframes (via `@media (prefers-reduced-motion: reduce)`). The `Seal` even avoids fetching the video bytes when motion is reduced.

#### A5 drift (animations)

- **Two competing motion doctrines.** `src/design-system/motion/README.md` declares the system is **CSS-only and explicitly forbids framer-motion**, yet `src/design-system/animations/*`, `Seal.tsx`, and `owner/parts.tsx` all depend on framer-motion. Both ship. The doc and the code disagree about whether framer-motion is allowed.
- **The blueprint animation set uses hardcoded legacy hexes** (`#1B3B5E`, `#B6873A`, `#C9C3B3`, `#F4F0E6`, `#2E2E30`) instead of herbarium tokens — so a palette change in `tokens.css` will not reach them.
- **Owner-Lane gauges default `accent="#3C7A8A"`** as a literal rather than `var(--specimen-teal)`; correct color, wrong source.

---

### Source-of-truth chain (whole system, one view)

```
Knowledge Gardens Design System v0.1 export (external repo)
        │
        ├── tokens  → src/styles/tokens.css → globals.css aliases → colors.ts (TS mirror)
        ├── ui kit  → ui_kits/builders-knowledge-garden/ → mapped in docs/ui-kit.md
        │             (BkgMark→Logomark, Logo/HeroPlate, JourneyStrip, Gauge, SpecimenCard…)
        ├── plates  → public/plates/*.png (HeroPlate) ; brand marks → public/brand/*.png (Logo)
        └── seal    → Supabase brand-assets bucket (hammer-roots-*) → app-shell/Seal.tsx

Governs everything: docs/PLATFORM-CONSTITUTION.md (Tier 0) + docs/design-constitution.md (Tier 1)
Prior audits this supersedes/updates: docs/asset-manifest.md, docs/ui-kit.md
```

---

### Gaps, duplicates & orphans

**Duplicates (same visual, multiple paths):**

- **Plates ↔ garden logos** — `plates/builders-hammer.png` == `logos/gardens/builders-hammer.png` (898 KB); `plates/chrome-{killer-app,dream-machine,knowledge-garden}.png` == `logos/gardens/chrome-*.png` (identical byte sizes). Plus `_originals/` copies. Canonical = `plates/`.
- **Brand marks ↔ legacy `logo/b_*`** — `brand/bkg-mark.png` == `logo/b_transparent_512.png`; `-light` == `b_white_outline_512.png`; `-dark` == `b_dark_outline_512.png`; `-wood` == `b_wood_outline_512.png`. Canonical = `brand/`.
- **Journey ↔ stage-backdrops ↔ owner-lane** — `{sizeup,lock,plan,build}-journey.png`, `beginning-journey.jpg`, `Structural-journey.jpeg`, `sketch-journey` all exist in two-or-three of `journey/`, `stage-backdrops/`, `owner-lane/`. Pick one path when a `<StageBackground>` lands.
- **OG cards** — `og/og-light.png` (live) vs `logo/og_image_light.png` (orphan); same for dark.
- **Reference image** — `design-refs/tiffany-blue-key.jpeg` == `imagery/_.jpeg`; `design-refs/journey-map-sketch.png` == `journey/Journey-map-sketch.png`.

**Orphans (no `src/` reference):**

- 14 garden logos in `logos/gardens/` (biomarker, builder-lockin, builder-sizeup, channel-type, distribute, garden-legal, health-garden-caduceus, legal, optimize, orchid-garden, strategy, toxicology-caduceus, ui-pro-toggle-and-search, vertical-mobile-ad).
- 15 Dream Machine `.webp` glyphs in `logos/dream/`.
- The full `journey/` + `stage-backdrops/` per-stage backdrop sets (neither wired).
- `intro-assets/tool-tree.mp4` (comments only), `bkg/b_logo_3D.glb` (no `src/` ref), `bkg/{n6k,p6k}.txt`.
- `cinematic.html`, `killer-app.html`, `investor-brief.html`, `_design-preview/owner-v3.html` (standalone prototypes/previews).
- `logo/{og_image_light,og_image_dark,b_white_outline_512,b_wood_outline_512}.png`.
- All five default Next.js scaffolding SVGs.
- Empty dirs `public/icons/` and `public/walkthrough/`.

**Gaps (missing assets / unbuilt):**

- The **7 hand-drawn stage glyphs** (to replace the emoji 🧭🔒📐🔨🔄💰📖 in `JourneyRow`) — still not built; `public/icons/stages/` is empty. This is a documented antipattern violation (emoji in chrome).
- **`HeroPlate` has no `knowledge-gardens-tree` variant**, so the Killer App landing tree stays a raw `<img>`.
- **Per-stage hero illustrations, empty-state illustrations, per-category specimen plates, auth-page brand mark** — all noted in `asset-manifest.md` §3 P2, still open.
- **No `/icon-512.png`** despite the icon-de-dup plan; metadata still points at the legacy `logo/b_icon_*`.

**Token/animation drift (repeated here as gaps to close):** `globals.css --bg: #ffffff` (prohibited white winning at `<body>`); the `--bp-*` deprecated palette; `typography.ts` Inter/Playfair; `stage-accents.ts` non-herbarium hexes; `brand-tokens.ts` parchment/copper (migrate the ~15 consumers); blueprint animations' hardcoded hexes; the CSS-only-vs-framer-motion contradiction.

**Where this inventory sits relative to the prior docs:**

- **Agrees with `asset-manifest.md`** on the image duplicate/orphan map and the `<Logo>`/`<HeroPlate>` adoption story.
- **Supersedes `asset-manifest.md`** on (a) `Logomark` now reading `/brand/bkg-mark.png` not `/icon.png`, and (b) the entire `Seal`/Supabase-bucket emblem set, which the manifest predates.
- **Extends `ui-kit.md`** by adding the seal/emblem set and the token/animation drift it does not cover; agrees with it that the canonical kit is the external Design System repo and that `BkgMark`→`Logomark`.

---

## Part B — Process

A repeatable way to add or change each kind of asset, with the constitution's gates baked in.

### Acceptance gates (apply to every change in Part B)

1. **The brand test.** *"Would a curator at the Royal Botanic Gardens AND a staff engineer at Stripe both respect this?"* If either would wince, it is not ready.
2. **Antipatterns — do not generate** (Design Constitution §Antipatterns, mirrored from the design system README §9):
   - Bento grids of glowing rounded squares
   - Glassmorphism, frosted blurs, neon accents
   - Generic gradient-mesh backgrounds (purple→pink, teal→indigo)
   - **Pure white `#FFFFFF` anywhere.** Cream `#F2E9D2` is the default.
   - **Pure black `#000000`.** Use `#2A2620` (`--ink-graphite`).
   - Sans-serif-only typography stacks
   - Material / Carbon / shadcn-default chrome with no customization
   - 3D illustration sets (Notion-style, Spline-style)
   - Heroicons / Lucide as the *primary* iconography (utility fallback only)
   - Cards with a colored left-border accent and rounded corners ("AI tropes")
   - Emoji decoration anywhere in UI chrome
3. **The two constitutions.** Light backgrounds always; teal `#3C7A8A` + rust `#A53A2D`; prohibited red `#E8443A` and pure white; Archivo / Archivo Black, no exceptions. Sentence case; em-dashes welcome; no exclamation points in UI; **MLP, never MVP.**

---

### B1 — Adding or updating tokens

1. **Edit the canonical source.** Change `src/styles/tokens.css`. If the change originates from the design-system author, it comes via a re-export of `/Users/chilly/Developer/Knowledge Gardens Design System/` — pull that export into `tokens.css` rather than hand-editing divergent values. Keep the herbarium hex; do not introduce pure white or pure black.
2. **Propagate aliases.** If a W8 name (`--navy`, `--brass`, `--robin`, `--orange`, `--trace`, `--graphite`, `--faded-rule`, `--redline`) should point somewhere new, update its alias in `src/app/globals.css`. **Prefer adding a new alias here over editing `tokens.css`** for a one-off surface shift (the file says so explicitly).
3. **Update the TS mirror.** Mirror the same hex into `src/design-system/tokens/colors.ts` so JS consumers (`src/components/stage-shell/*`, owner-lane gauges, etc.) stay in lockstep. The mirror must equal the CSS values — that is the contract.
4. **Verify surfaces.** Check the four surface chromes (Killer App, Dream Machine, Knowledge Garden, Umbrella) still read correctly next to `public/plates/*.png` — the plates are the color reference. Verify in a real browser, not by grep (a hard-won value in the Platform Constitution).
5. **Legacy consumers.** For surfaces still on `src/lib/brand-tokens.ts` (parchment/copper, ~15 surfaces): migrate them to the herbarium tokens (`var(--specimen-*)` / `colors.*`), then archive `brand-tokens.ts`. Do not add new consumers of it. Likewise treat `src/design-system/tokens/typography.ts` (Inter/Playfair) as do-not-use — new type work goes through the Archivo stack.
6. **Snapshot before risky edits.** Pre-change palette snapshots live at `src/components/_archive/2026-05-28-design-system/`; add one if you make a sweeping change.

*Gate check:* run the brand test and scan the antipattern list (especially: no pure white, no pure black, no neon-as-fill).

---

### B2 — Adding or updating images

1. **Put it where its type lives:**
   - **Brand B-mark** → `public/brand/bkg-mark{,-light,-dark,-wood}.png`, consumed via `<Logo variant=…>`. Do not add new raw `<Image src="/logo/b_*">` usages — those are the legacy paths being retired.
   - **Hero / surface plate** → `public/plates/<name>.png`, consumed via `<HeroPlate name=…>`. To add a plate, add the name to `PLATE_NAMES` in `src/components/brand/HeroPlate.tsx` and drop the file in `public/plates/`.
   - **OG / social card** → `public/og/og-{light,dark}.png` (1200×630), wired in `layout.tsx` metadata.
   - **Icons / favicons** → `public/` root (`apple-touch-icon.png`, `icon-192.png`) and `src/app/icon.png` (Next convention). Consolidate toward one canonical set.
   - **Stage glyphs** → `public/icons/stages/<stage>.svg` (the dir exists, empty), consumed by `JourneyRow`/`JourneyTimeRow` instead of emoji.
   - **Stage backdrops / journey imagery** → settle on ONE of `public/journey/` or `public/stage-backdrops/` when a `<StageBackground>` component lands; do not keep adding to both.
   - **Animated brand marks** → the Supabase `brand-assets` bucket (`assets/<garden_scope>/…`), referenced through `src/components/app-shell/config.ts`. Local video (e.g. `owner-lane/bkg-logo.mp4`) is the legacy path; prefer the bucket.
2. **Naming conventions.** Lowercase, hyphenated, descriptive (`chrome-killer-app.png`, `hammer-roots-emblem.png`). Avoid `_`-only or `IMG_####` names (the repo has accidental copies like `imagery/_.jpeg`). Match the existing pattern in the target folder.
3. **Formats & optimization.** PNG with alpha for marks/plates; WebP for photographic concept art; MP4 (H.264, muted, looping) for motion marks; SVG (`stroke="currentColor"`, `fill="none"`, ~1.25–1.5px stroke, 32×32 viewBox) for line glyphs. Let `next/image` (`<Logo>`/`<HeroPlate>` already wrap it) do AVIF/WebP conversion and responsive `srcset` — so source files can be high-resolution masters. Keep an eye on weight: several plates are 2.4 MB and the GLB is 29 MB; downscale masters where the rendered footprint is small.
4. **OG / plate / chrome conventions.** OG cards are 1200×630. Each surface leans on its signature accent pair (Killer App: teal+rust · Dream Machine: brass+amber · Knowledge Garden: sage · Umbrella: ink-sepia on cream). A plate must look correct beside the other three plates — that is the visual contract in `tokens.css`.
5. **The cream-not-white rule.** No asset (and no surface behind an asset) may sit on pure `#FFFFFF`. Cream `#F2E9D2` is the default ground; the FLUX prompt in `asset-manifest.md` §5 bakes this in ("Background is solid cream paper #F2E9D2").
6. **Register & de-dup.** Before adding, check whether the visual already exists at another path (this inventory's duplicate list). After adding, note the file's purpose; do not leave it orphaned. Adopt the component (`<Logo>`/`<HeroPlate>`) rather than a raw tag so future swaps are one-line.

*Gate check:* brand test + antipattern scan (no glassmorphism, no gradient-mesh, no 3D-illustration-set look, no emoji-as-glyph, no pure white/black). Verify the asset renders on a live URL.

---

### B3 — Adding or updating animations

1. **Pick the right layer.**
   - **Entrance / hover / stagger on ordinary UI** → use the **CSS utility classes** (`.bkg-fade-up`, `.bkg-scale-in`, `.bkg-hover-lift`, `.bkg-stagger-1..6`, `.bkg-hero-mark`) from `src/design-system/motion/`. These are the default and carry the reduced-motion guard for free.
   - **Bespoke, physics-y, or SVG-path motion** (seal spring/breathe, blueprint draw, compass trace, gauges) → Framer Motion components. *Note the open contradiction:* the motion README says "no framer-motion," but the seal and the blueprint set use it. Until the founder reconciles this, follow precedent — framer-motion for the seal/gauge/blueprint family, CSS utilities for everything else — and flag the doc/code mismatch rather than picking a side silently.
2. **Use motion tokens, not magic numbers.** Durations/eases come from `src/design-system/motion/tokens.ts` (`MOTION.entranceDuration` 280, `hoverDuration` 180, `heroDuration` 900; `entranceEase` the springy curve) and/or the `tokens.css` `--dur-*` / `--ease-*-paper` values. The seal's spring (`stiffness 150 / damping 15`) and 6.5s breathe loop are the reference for "alive" brand marks.
3. **Honor reduced motion — always.** New Framer Motion components must call `useReducedMotion()` and render at rest (and, for video, avoid fetching bytes via `preload="none"`, as `Seal.tsx` does). New CSS keyframes must sit under `@media (prefers-reduced-motion: reduce)`. No exceptions — it is a constitution-adjacent accessibility bar (Goal 6, most-constrained user first).
4. **No layout shift.** Animate `transform` and `opacity` only — never width/height/margin/padding (the motion README's first rule). One entrance animation per element; don't stack.
5. **Color from tokens.** New motion must read herbarium tokens (`var(--specimen-teal)`, `colors.robin`), not hardcoded hex. Do not copy the blueprint set's `#1B3B5E`/`#B6873A` literals or the owner-lane `accent="#3C7A8A"` literal — those are drift to fix, not patterns to follow.
6. **Video vs. motion-component decision.** Use a **video asset** (Supabase bucket, muted/looped MP4 + a still poster) when the motion is illustrative and pre-rendered (the seal). Use a **motion component** when the animation responds to state, data, or interaction (gauges filling, journey progress, hover). Always ship a poster/at-rest state for the reduced-motion and slow-network cases.

*Gate check:* brand test + antipattern scan (no neon flashes beyond the deliberate `--flash-teal` ≤12px rule; no gratuitous motion). Confirm the reduced-motion path renders something calm and correct.

---

## Open questions for the founder

1. **The pure-white base in `globals.css`.** `--bg: #ffffff` (plus `--fg: #111111`, `--accent: #1D9E75`, and `viewport.themeColor #ffffff`) currently win at `<body>` over the cream herbarium semantics, violating both constitutions' "no pure white" lock. Should this top block be deleted/repointed to `--paper-cream` now, or is it intentionally held for a non-herbarium surface? This feels like the highest-priority correction.
2. **The `--bp-*` "Blueprint" palette and `typography.ts` (Inter/Playfair).** Both are marked deprecated/stale and contradict the Archivo + herbarium locks. Safe to delete this phase, or are there hidden consumers to migrate first?
3. **`brand-tokens.ts` migration timing.** The Design Constitution says "migrate the ~15 surfaces, then archive." Is that in scope for this phase, or still next-sprint?
4. **Two seal implementations.** The shared-shell `Seal` (Supabase `hammer-roots-*`) and the Owner-Lane `SealMark`/`BkgMark` (local `/owner-lane/bkg-logo.mp4`) are near-duplicate motion marks against *different* source files. Collapse Owner Lane onto the shared `Seal` + bucket asset? And is `hammer-roots-mark-motion.mp4` (bucket) or `owner-lane/bkg-logo.mp4` (local) the one true Viver motion mark?
5. **The motion doctrine contradiction.** Is framer-motion allowed (the seal/blueprint code) or forbidden (the motion README)? A one-line ruling in the README would end the ambiguity.
6. **`stage-accents.ts` palette.** Its eight stage hexes are not herbarium (coral `#E05E4B`, indigo `#3E3A6E`, magenta `#B23A7F`, etc.). Reconcile to herbarium, or are these an intentional, separate "stage identity" spectrum?
7. **Orphan cleanup scope.** 14 garden logos, 15 Dream `.webp`s, the duplicate journey/stage-backdrop sets, the 29 MB unreferenced GLB, the standalone HTML prototypes — delete this phase, or keep as reference? (The GLB alone is a quarter of `public/`'s 119 MB.)
8. **Stage glyphs.** The 7 hand-drawn SVGs to replace the emoji journey row are still unbuilt (`public/icons/stages/` is empty) and the emoji are a documented antipattern. Is sourcing them in scope here?
9. **`docs/PLATFORM-CONSTITUTION.md` lives on `origin/main` but not on this worktree.** Should it be merged into `feat/shared-app-shell` so the worktree carries the Tier 0 doc, or is that expected?
