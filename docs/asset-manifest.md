# BKG Asset Manifest

*The single audit-and-action document for every image, logo, animation, and illustration in the Builder's Knowledge Garden codebase. Rebuilt 2026-05-28 (~02:00 PT) as a comprehensive inventory + gap analysis, replacing the earlier design-system-sync template (which served its purpose and shipped 28 assets earlier tonight — see commit `953ae44`).*

*Read-only audit pass. No code changes were made producing this doc. The next agent to touch assets uses this as the source of truth.*

---

## Concrete Next Actions

### Tonight's must-do (P0 — blocks Thursday demo)

- **None blocking.** The demo flow works on every surface tested. `Logomark` is wired to the new `/icon.png` (live), `KillerAppNav` brand mark renders, `/intro` cinematic uses `/logos/gardens/builders-hammer.png` (live), all 7 stage routes render with emoji glyphs, OG card + favicon both resolve. Asset gaps that exist are cosmetic, not functional.

### This week (P1 — before alpha cohort Friday)

- **Adopt `<Logo>` everywhere** — 8 places in `src/` directly reference `/logo/b_transparent_512.png` as `<Image>`. Swap each to `<Logo variant="default" />` (component already in `src/components/brand/`). Visual identical; future-proofs the swap.
- **Adopt `<HeroPlate>` in `/intro`** — Act 1 hammer + Act 5 hammer-reprise + 3 chrome orbits + tree drawing all use raw `<img>` to `/logos/gardens/*`. Swap each to `<HeroPlate name="…">`.
- **Replace 7 emoji journey glyphs.** `JourneyRow` renders 🧭🔒📐🔨🔄💰📖. The design constitution forbids emoji in chrome ("No emoji in UI chrome, marketing, or product copy"). These need brand-aligned hand-drawn line SVGs (brass/sepia, stroke 1.25–1.5px, currentColor — see design system §7). FLUX prompts below.
- **Wire `/og/og-dark.png`** for any dark-theme surface (currently only `og-light.png` is referenced).

### Later (P2 — post-demo polish)

- Delete or repurpose 11+ orphan logos in `public/logos/gardens/` (biomarker, channel-type, distribute, garden-legal, optimize, orchid-garden, strategy, toxicology-caduceus, ui-pro-toggle-and-search, vertical-mobile-ad, legal, builder-lockin, builder-sizeup) — shipped 2026-05-20, never wired.
- Delete or repurpose 15 orphan webp files in `public/logos/dream/` — Dream Machine surface concept assets, never adopted.
- Delete 2 orphan files in `public/design-refs/` (journey-map-sketch.png, tiffany-blue-key.jpeg) — no src/ references.
- Consolidate `public/journey/` and `public/stage-backdrops/` — duplicate file sets, neither currently referenced.
- Delete orphan `public/logo/og_image_{dark,light}.png` after confirming `/og/og-light.png` is the only OG ref.
- Delete `public/cinematic.html`, `public/killer-app.html`, `public/investor-brief.html` if they're stale prototypes (verify first).
- Build per-stage hero illustrations to replace generic gradient stage backdrops (defer pending design direction).
- Empty-state illustrations across `BuilderDashboard`, `NotificationOrchestra`, `JurisdictionPicker`, project list "no projects yet" — currently text-only.

---

## 1. Current Inventory

Every renderable image asset in `public/` and `src/app/icon.png` as of commit `953ae44`. Path · type · where referenced · state · notes.

### Hero plates (canonical — synced from design system 2026-05-28)

| Path | Type | Referenced by | State | Notes |
|---|---|---|---|---|
| `public/plates/builders-hammer.png` | Hero illustration | `<HeroPlate name="builders-hammer">` (component built, NOT yet adopted) | good | 900 KB · design system master mark. Duplicate of `public/logos/gardens/builders-hammer.png`. |
| `public/plates/chrome-killer-app.png` | Hero illustration | `<HeroPlate name="chrome-killer-app">` (NOT adopted) | good | 2.4 MB · Killer App surface accent. Duplicate of `public/logos/gardens/chrome-killer-app.png`. |
| `public/plates/chrome-dream-machine.png` | Hero illustration | `<HeroPlate name="chrome-dream-machine">` (NOT adopted) | good | 2.4 MB · Dream Machine surface accent. Duplicate of `public/logos/gardens/chrome-dream-machine.png`. |
| `public/plates/chrome-knowledge-garden.png` | Hero illustration | `<HeroPlate name="chrome-knowledge-garden">` (NOT adopted) | good | 2.3 MB · Knowledge Garden surface accent. Duplicate of `public/logos/gardens/chrome-knowledge-garden.png`. |

### BKG brand marks (canonical — synced 2026-05-28)

| Path | Type | Referenced by | State | Notes |
|---|---|---|---|---|
| `public/brand/bkg-mark.png` | Logo | `<Logo variant="default">` (NOT adopted) | good | 240 KB · Master B-mark, transparent. Duplicate of `public/logo/b_transparent_512.png`. |
| `public/brand/bkg-mark-light.png` | Logo | `<Logo variant="light">` (NOT adopted) | good | 268 KB · White outline for dark/photo BGs. Duplicate of `b_white_outline_512.png`. |
| `public/brand/bkg-mark-dark.png` | Logo | `<Logo variant="dark">` (NOT adopted) | good | 256 KB · Dark outline. Duplicate of `b_dark_outline_512.png`. |
| `public/brand/bkg-mark-wood.png` | Logo | `<Logo variant="wood">` (NOT adopted) | good | 269 KB · Wood outline for cream BGs. Duplicate of `b_wood_outline_512.png`. |

### BKG brand marks (legacy paths — currently in use)

| Path | Type | Referenced by | State | Notes |
|---|---|---|---|---|
| `public/logo/b_transparent_512.png` | Logo | `SplashIntro.tsx`, `app/page.tsx`×2, `launch/page.tsx`, `profile/page.tsx`, `knowledge/page.tsx`, `presentation/page.tsx`×2 (8 places) | good (in use) | 512px · the production logo today. Will retire once `<Logo>` is adopted. |
| `public/logo/b_dark_outline_512.png` | Logo | `app/dashboard/page.tsx` | good (in use) | 512px dark outline · single consumer. |
| `public/logo/b_white_outline_512.png` | Logo | — | orphan | Not referenced in src/. |
| `public/logo/b_wood_outline_512.png` | Logo | — | orphan | Not referenced in src/. |
| `public/logo/b_icon_192x192.png` | Icon | `layout.tsx` `metadata.icons.icon` | good (in use) | PWA + favicon set. |
| `public/logo/b_icon_512x512.png` | Icon | `layout.tsx` `metadata.icons.icon` | good (in use) | PWA + favicon set. |
| `public/logo/favicon.ico` | Icon | `layout.tsx` `metadata.icons.icon` (as `/favicon.ico`) | good (in use) | Note: file lives at `/logo/favicon.ico` but metadata references `/favicon.ico` — likely served via root rewrite. |
| `public/logo/og_image_light.png` | OG card | — | orphan | Superseded by `/og/og-light.png`. |
| `public/logo/og_image_dark.png` | OG card | — | orphan | Superseded by `/og/og-dark.png`. |

### Favicon / app icon (post-2026-05-28 sync)

| Path | Type | Referenced by | State | Notes |
|---|---|---|---|---|
| `public/icon-192.png` | Icon | not yet in `layout.tsx` metadata (file present, ref pending) | placed, not wired | 30 KB · canonical 192px icon. |
| `public/apple-touch-icon.png` | Icon | `layout.tsx` `metadata.icons.apple` | good (in use) | 30 KB · ref now resolves (pre-sync it was 404). |
| `src/app/icon.png` | Icon | Next.js auto-pickup + `Logomark.tsx` (`src="/icon.png"`) | good (in use) | 30 KB · canonical app icon. |

### Open Graph cards

| Path | Type | Referenced by | State | Notes |
|---|---|---|---|---|
| `public/og/og-light.png` | OG card | `layout.tsx` `metadata.openGraph.images[0]` + `metadata.twitter.images[0]` | good (in use) | 195 KB · primary OG. Synced 2026-05-28; patches a `/og/og-root.png` 404. |
| `public/og/og-dark.png` | OG card | — | placed, not wired | 183 KB · dark variant. Available when a dark-theme surface needs it. |

### Garden logos (V3 rehaul set)

| Path | Type | Referenced by | State | Notes |
|---|---|---|---|---|
| `public/logos/gardens/builders-hammer.png` | Hero illustration | `intro/page.tsx`×2 (Act 1 hero, Act 5 reprise) | good (in use) | THE master mark in the cinematic. Will swap to `<HeroPlate name="builders-hammer">`. |
| `public/logos/gardens/chrome-killer-app.png` | Hero illustration | `intro/page.tsx` (Act 1 ChromeOrbit) | good (in use) | Will swap to `<HeroPlate name="chrome-killer-app">`. |
| `public/logos/gardens/chrome-dream-machine.png` | Hero illustration | `intro/page.tsx` (Act 1 ChromeOrbit) | good (in use) | Will swap to `<HeroPlate name="chrome-dream-machine">`. |
| `public/logos/gardens/chrome-knowledge-garden.png` | Hero illustration | `intro/page.tsx` (Act 1 ChromeOrbit) | good (in use) | Will swap to `<HeroPlate name="chrome-knowledge-garden">`. |
| `public/logos/gardens/knowledge-gardens-tree.png` | Hero illustration | `killerapp/page.tsx`, `intro/page.tsx` (Act 5 tree) | good (in use) | The tree drawing on the Killer App landing. No `<HeroPlate>` variant yet — would need `name="knowledge-gardens-tree"` added to the component's `PLATE_NAMES` const. |
| `public/logos/gardens/biomarker.png` | Logo | — | orphan | Shipped 2026-05-20; never wired. |
| `public/logos/gardens/builder-lockin.png` | Logo | — | orphan | Shipped 2026-05-20; never wired. |
| `public/logos/gardens/builder-sizeup.png` | Logo | — | orphan | Shipped 2026-05-20; never wired. |
| `public/logos/gardens/channel-type.png` | Logo | — | orphan | |
| `public/logos/gardens/distribute.png` | Logo | — | orphan | |
| `public/logos/gardens/garden-legal.png` | Logo | — | orphan | |
| `public/logos/gardens/health-garden-caduceus.png` | Logo | — | orphan | |
| `public/logos/gardens/legal.png` | Logo | — | orphan | |
| `public/logos/gardens/optimize.png` | Logo | — | orphan | |
| `public/logos/gardens/orchid-garden.png` | Logo | — | orphan | Future Orchids surface. |
| `public/logos/gardens/strategy.png` | Logo | — | orphan | |
| `public/logos/gardens/toxicology-caduceus.png` | Logo | — | orphan | Future Toxicology surface. |
| `public/logos/gardens/ui-pro-toggle-and-search.png` | Logo | — | orphan | |
| `public/logos/gardens/vertical-mobile-ad.png` | Logo | — | orphan | |
| `public/logos/gardens/_originals/*.png` | Logo (backup) | — | orphan | 9 backup originals. Keep for reference. |

### Dream Machine logos

| Path | Type | Referenced by | State | Notes |
|---|---|---|---|---|
| `public/logos/dream/{alchemist,browse,collider,cosmos,describe,explore,genome,inspire,narrator,oracle,plans,quest,sandbox,sketch,voice}.webp` (15 files) | Logo / glyph | — | orphan | None referenced in src/. Dream Machine surface concept assets; never adopted. |

### Stage / journey imagery

| Path | Type | Referenced by | State | Notes |
|---|---|---|---|---|
| `public/journey/sizeup-journey.png` | Stage backdrop | — | orphan | Not referenced. |
| `public/journey/lock-journey.png` | Stage backdrop | — | orphan | |
| `public/journey/plan-journey.png` | Stage backdrop | — | orphan | |
| `public/journey/build-journey.png` | Stage backdrop | — | orphan | |
| `public/journey/beginning-journey.jpg` | Stage backdrop | — | orphan | |
| `public/journey/Structural-journey.jpeg` | Stage backdrop | — | orphan | |
| `public/journey/equipment-journey.PNG` | Stage backdrop | — | orphan | |
| `public/journey/sequencing-journey.JPG` | Stage backdrop | — | orphan | |
| `public/journey/sketch-journey.JPG` | Stage backdrop | — | orphan | |
| `public/journey/tool-journey.PNG` | Stage backdrop | — | orphan | |
| `public/journey/tree-portal-journey.PNG` | Stage backdrop | — | orphan | |
| `public/journey/Journey-map-sketch.png` | Reference | — | orphan | Likely an annotation sketch; not a runtime asset. |
| `public/stage-backdrops/sizeup-journey.png` | Stage backdrop | — | orphan | Same file as `public/journey/sizeup-journey.png`. Two paths to same image. |
| `public/stage-backdrops/lock-journey.png` | Stage backdrop | — | orphan | Same as `public/journey/`. |
| `public/stage-backdrops/plan-journey.png` | Stage backdrop | — | orphan | Same as `public/journey/`. |
| `public/stage-backdrops/build-journey.png` | Stage backdrop | — | orphan | Same as `public/journey/`. |
| `public/stage-backdrops/beginning-journey.jpg` | Stage backdrop | — | orphan | Same as `public/journey/`. |

### Project / cinematic / close-out

| Path | Type | Referenced by | State | Notes |
|---|---|---|---|---|
| `public/intro-assets/tool-tree.mp4` | Hero animation | `intro/page.tsx` (referenced in comments at lines 1971, 2052) | possibly orphan | Comments indicate it WAS to be the Act-5 looping centerpiece. Need to verify if currently wired in the live cinematic. |
| `public/design-assets/close-out-frames/frame-{001,002,003,004}.jpg` | Close-out animation frames | `killerapp/projects/[id]/close-out/CloseOutClient.tsx` line 42-45 | good (in use) | The Build/Reflect close-out ritual frames. Real production usage. |
| `public/cinematic.html` | Static HTML prototype | — | orphan | Standalone prototype; not iframe'd by any src/ route. Likely safe to delete. |
| `public/killer-app.html` | Static HTML prototype | — | orphan | Same — standalone prototype. |
| `public/investor-brief.html` | Static HTML | — | orphan | Standalone. |
| `public/bkg/anim.html` | Cinematic | `app/cinematic/page.tsx` (iframe src) | good (in use) | The `/cinematic` route's iframe target. Standalone HTML cinematic. |
| `public/bkg/{n6k,p6k}.txt` | Data file | unknown | likely orphan | Plain-text data, possibly old. |
| `public/llms.txt` | Bot directive | bot crawlers | good | Standard llms.txt. |
| `public/robots.txt` | Bot directive | bot crawlers | good | Standard robots.txt. |
| `public/bkg-mcp.mcpb` | MCP bundle | external | good | The MCP server bundle. |

### Reference / design assets

| Path | Type | Referenced by | State | Notes |
|---|---|---|---|---|
| `public/design-refs/journey-map-sketch.png` | Reference | — | orphan | |
| `public/design-refs/tiffany-blue-key.jpeg` | Reference | — | orphan | |

### Imagery (synced 2026-05-28)

| Path | Type | Referenced by | State | Notes |
|---|---|---|---|---|
| `public/imagery/_.jpeg` | Brand photo | — | orphan (just placed) | 167 KB. Filename is `_` — possibly a Mac thumbnail or accidental copy. |
| `public/imagery/img_2006.webp` | Brand photo | — | orphan (just placed) | 765 KB. |
| `public/imagery/img_2008.jpg` | Brand photo | — | orphan (just placed) | 66 KB. |
| `public/imagery/img_2014.jpg` | Brand photo | — | orphan (just placed) | 104 KB. |
| `public/imagery/img_2082.png` | Brand photo | — | orphan (just placed) | 1.9 MB. |
| `public/imagery/img_2094.jpg` | Brand photo | — | orphan (just placed) | 11 KB. |

### Misc

| Path | Type | Referenced by | State | Notes |
|---|---|---|---|---|
| `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg` | Misc SVG | — | orphan | Default Next.js scaffolding SVGs. Safe to delete (or leave). |
| `public/logos/gardens/.gitkeep` | Marker | — | n/a | Empty file, keeps git directory. |

---

## 2. Key Visual Surfaces

Each surface in the rendered UI graded by current state + recommendation.

### Global header logo (B mark)

- **Current:** `<Logomark>` component reads `/icon.png` (live, just rewired). Plus 8 places in `src/` directly use `<Image src="/logo/b_transparent_512.png">`.
- **Recommendation (P1):** Migrate the 8 direct usages to `<Logo variant="default" width={N} height={N} />` from `src/components/brand/Logo.tsx`. Visually identical, single canonical source.

### Killer App landing hero (the tree drawing)

- **Current:** `<img src="/logos/gardens/knowledge-gardens-tree.png">` in `app/killerapp/page.tsx:302`.
- **Recommendation (P1):** Add `knowledge-gardens-tree` to `PLATE_NAMES` in `src/components/brand/HeroPlate.tsx`, copy the file to `public/plates/knowledge-gardens-tree.png`, swap to `<HeroPlate name="knowledge-gardens-tree">`. Or accept that this isn't a "specimen plate" and leave the raw `<img>` — the tree drawing has its own visual treatment.

### Cinematic first-visit intro (`/intro`)

- **Current:** Act 1 hero + Act 5 reprise use `/logos/gardens/builders-hammer.png`. Three ChromeOrbits use the three chrome plates. Act 5 tree uses `knowledge-gardens-tree.png`. Centerpiece animation `tool-tree.mp4` MAY be wired (referenced only in comments — verify).
- **Recommendation (P1):** Swap raw `<img>` to `<HeroPlate>` (5 swaps total). Confirm `tool-tree.mp4` wiring status.

### Cinematic iframe target (`/cinematic`)

- **Current:** `app/cinematic/page.tsx` iframes `/bkg/anim.html`.
- **Recommendation:** Working — leave alone unless the cinematic redesign supersedes `anim.html`.

### Killer App project dashboard (`/killerapp/projects/[id]`)

- **Current:** No project thumbnail. `KillerAppChrome` (BudgetRibbon + JourneyTimeRow) above the data. Close-out ritual uses `/design-assets/close-out-frames/frame-00{1-4}.jpg`.
- **Recommendation (P2):** Add a project hero thumbnail slot when project records carry a primary image. Today nothing's broken because nothing's shown.

### Project header thumbnail (per project view)

- **Current:** None. Project name + meta in the chrome header, no image.
- **Recommendation (P2):** Add a small `<HeroPlate>` accent (per-surface plate, e.g. `chrome-killer-app` when on Killer App). Subtle, not centerpiece.

### Stage headers (Size Up / Lock / Plan / Build / Adapt / Collect / Reflect)

- **Current:** Each stage page renders `<StageShell>` which has a small colored accent bar (stage-accent token) + title. NO per-stage hero illustration.
- **Recommendation (P2):** Per-stage hero illustrations exist as concept in `public/journey/sizeup-journey.png`, `lock-journey.png`, etc., but are NOT wired. Either delete the orphan files or build a `<StageBackground stage="…">` component that consumes them. Defer pending design direction — current accent-bar treatment is clean and uncluttered for the demo.

### Stage glyphs in the journey row

- **Current:** Emoji glyphs — 🧭 (Size up) · 🔒 (Lock) · 📐 (Plan) · 🔨 (Build) · 🔄 (Adapt) · 💰 (Collect) · 📖 (Reflect). Defined in `src/lib/lifecycle-stages.ts`. Rendered by `JourneyRow.tsx` and `JourneyTimeRow.tsx`.
- **Recommendation (P1):** **Replace.** Design constitution §antipatterns: "No emoji in UI chrome, marketing, or product copy." Emoji glyphs in the journey row are a documented antipattern. Need brand-aligned hand-drawn line SVGs — see Sourcing §5.

### Knowledge garden category illustrations

- **Current:** None — `app/knowledge/page.tsx` is text-only with a top-left `<Logomark>` (using `/logo/b_transparent_512.png`).
- **Recommendation (P2):** Add per-category specimen plate when categories are formalized.

### Empty state illustrations

- **Current:** None. Components like `BuilderDashboard`, `NotificationOrchestra`, `JurisdictionPicker`, the project-list "no projects yet" all use text/icons only.
- **Recommendation (P2):** Add 3–4 brand-aligned empty-state plates. Out of scope tonight.

### Background patterns / textures

- **Current:** `tokens.css` defines `--paper-noise` (SVG fractal noise) and `--grid-line` (24px engineering grid). Used inline as needed. No external image textures wired.
- **Recommendation:** Working — leave alone.

### Favicon and app icon

- **Current (post-sync):** `src/app/icon.png` (30 KB, canonical) · `public/icon-192.png` (30 KB) · `public/apple-touch-icon.png` (30 KB) · `public/logo/b_icon_{192x192,512x512}.png` (legacy, referenced in `layout.tsx`) · `public/logo/favicon.ico`.
- **Recommendation:** Working. Consider de-duplicating to a single canonical icon set (`/icon-192.png`, `/icon-512.png`, `/apple-touch-icon.png`, `/favicon.ico`) in a follow-up.

### Open Graph / Twitter card image

- **Current:** `/og/og-light.png` (live, in `layout.tsx` metadata). `/og/og-dark.png` available, not wired.
- **Recommendation:** Working. Wire dark variant if/when a dark theme exists.

### Brand mark in auth/signup flow

- **Current:** No `<Logomark>` or `<Logo>` in `app/auth/` or `app/accept-invite/` — need to verify those pages have any branding at all. (Quick `grep` returned nothing.)
- **Recommendation (P1):** Add `<Logo variant="default" width={48} />` to the auth header. Without a brand mark on sign-in, the platform looks anonymous.

### `/intro` chrome orbits (Act 1 satellites)

- **Current:** Three `<ChromeOrbit>` instances using `/logos/gardens/chrome-{killer-app,dream-machine,knowledge-garden}.png`.
- **Recommendation (P1):** Same swap to `<HeroPlate>` as the rest of the cinematic.

### `/dashboard` page header logo

- **Current:** `<img src="/logo/b_dark_outline_512.png">` (the only place this variant is used).
- **Recommendation (P1):** Swap to `<Logo variant="dark" />`.

---

## 3. Gaps

### P0 — blocks Thursday demo

**None.** Every functional surface has a working asset.

### P1 — blocks alpha cohort Friday

| Surface | Current placeholder | Should be | Why now |
|---|---|---|---|
| Journey row stage glyphs | Emoji 🧭🔒📐🔨🔄💰📖 | 7 hand-drawn line SVGs (brass/sepia stroke) | Violates design constitution §antipatterns. First thing alpha builders will notice as "off-brand." |
| `/intro` 5 hero refs | Raw `<img src="/logos/gardens/…">` | `<HeroPlate name="…">` (component already exists) | Single source of truth for plates; mid-flight palette/format changes propagate. |
| 8 places using `b_transparent_512.png` | Raw `<Image>` | `<Logo variant="default">` | Same reason — single source of truth. |
| Auth / sign-up page | No brand mark visible | `<Logo variant="default" width={48} />` in header | First impression for cohort signups; anonymous-looking today. |
| `/dashboard` header | `<img src="/logo/b_dark_outline_512.png">` | `<Logo variant="dark">` | Same single-source rationale. |
| `/og/og-dark.png` unused | n/a | Wire as the dark-theme OG fallback | When social shares are made from dark-theme surfaces. |

### P2 — post-launch polish

| Surface | Current | Should be |
|---|---|---|
| Per-stage hero illustration | `<StageShell>` accent bar only | Custom plate per stage (Size Up = scales, Lock = padlock-as-seed, Plan = blueprint sketch, Build = framing diagram, Adapt = course-correction compass, Collect = ledger, Reflect = annotated portfolio) |
| Empty states (4+ surfaces) | Text only | Specimen-card style empty illustration |
| Project thumbnail | None | Per-project hero image (uploadable, plate fallback) |
| Knowledge garden categories | Text only | Per-category specimen plate |
| Cinematic redesign | `/bkg/anim.html` iframe + `/intro` | Modernize once content is locked |

---

## 4. Duplicate / Conflicting Assets

The same brand visual exists at 2+ paths in the repo. Each row recommends ONE canonical path; the other paths get deleted post-demo.

| Asset | Canonical | Duplicate(s) | Recommendation |
|---|---|---|---|
| B-mark (default) | `public/brand/bkg-mark.png` (240 KB) | `public/logo/b_transparent_512.png` (legacy 512px) | Keep both during P1 migration. After all 8 references swap to `<Logo>`, delete the legacy file. |
| B-mark (white outline) | `public/brand/bkg-mark-light.png` | `public/logo/b_white_outline_512.png` | Legacy file is already orphan — delete now. |
| B-mark (dark outline) | `public/brand/bkg-mark-dark.png` | `public/logo/b_dark_outline_512.png` | After `/dashboard` swap, delete legacy. |
| B-mark (wood outline) | `public/brand/bkg-mark-wood.png` | `public/logo/b_wood_outline_512.png` | Legacy orphan — delete now. |
| Hammer plate | `public/plates/builders-hammer.png` | `public/logos/gardens/builders-hammer.png` + `public/logos/gardens/_originals/builders-hammer.png` | After `/intro` swap, delete duplicates. Keep `_originals/` as historical reference. |
| Chrome plates (3 surfaces) | `public/plates/chrome-{killer-app,dream-machine,knowledge-garden}.png` | `public/logos/gardens/chrome-*.png` + `_originals/` | Same — delete duplicates after `/intro` swap. |
| OG card (light) | `public/og/og-light.png` (in use) | `public/logo/og_image_light.png` (orphan) | Delete orphan now. |
| OG card (dark) | `public/og/og-dark.png` | `public/logo/og_image_dark.png` (orphan) | Delete orphan now. |
| App icon (192px) | `src/app/icon.png` (Next convention) + `public/icon-192.png` (explicit) | `public/logo/b_icon_192x192.png` (legacy, in metadata) | Migrate `metadata.icons` to reference `/icon-192.png` instead of `/logo/b_icon_192x192.png`, then delete legacy. |
| App icon (512px) | (no `/icon-512.png` yet) | `public/logo/b_icon_512x512.png` (in metadata) | Either copy a 512px variant to `/icon-512.png` and update metadata, or just leave the legacy reference. |
| Favicon | `public/logo/favicon.ico` (referenced as `/favicon.ico` via what's probably a root-rewrite) | n/a | Verify rewrite works; if not, copy to `public/favicon.ico`. |
| Stage backdrops | (pick one path) | `public/journey/*-journey.{png,jpg}` AND `public/stage-backdrops/*-journey.{png,jpg}` | Both sets are orphan today. Pick one path when the `<StageBackground>` component lands; delete the other. |

---

## 5. Sourcing Recommendation

For each P1 gap, the concrete path to a brand-aligned asset.

### Journey row stage glyphs (7 SVGs)

**Approach:** Replicate FLUX 1.1 Pro for raster references → trace to SVG in Affinity / Figma.

**Draft FLUX prompt (singular — repeat 7×, swapping `[STAGE]` and the metaphor):**

```
A single isolated hand-drawn line illustration of [STAGE METAPHOR],
ink on aged cream paper, 1.25 px brass-sepia stroke, no fill, no
shading, no color. Victorian botanical herbarium meets engineering
schematic. Centered, generous margin. Style references: 1880s plant
plate, Leonardo da Vinci codex page, Rapidograph technical drawing.
Square frame. No text, no labels, no signatures. Background is solid
cream paper #F2E9D2.
```

Per-stage metaphors (use these as `[STAGE METAPHOR]`):

| Stage | Metaphor |
|---|---|
| Size up | A vintage brass compass and a folded survey map, opened mid-fold |
| Lock | A small antique padlock with a key hanging from its hasp, threaded through a seed |
| Plan | A blueprint scroll partially unrolled, with a draftsman's triangle resting on it |
| Build | A framing square crossed over a hammer, with a single wood peg between them |
| Adapt | A small ship's wheel mid-turn, with a compass needle deflecting |
| Collect | A leather-bound ledger book half-open, with a quill resting on the page |
| Reflect | A portfolio folder tied with twine, holding two leaves emerging from the spine |

After raster generation, trace into vector (Adobe Illustrator's Image Trace or Affinity Designer's Auto Trace, "Sketch" or "Detailed Line" preset), simplify to ≤200 anchor points each, export as 32×32 viewBox SVG with `stroke="currentColor"`, `fill="none"`, `stroke-width="1.25"`, `stroke-linecap="round"`.

Drop to `public/icons/stages/{size-up,lock,plan,build,adapt,collect,reflect}.svg` and reference from `JourneyRow.tsx` + `JourneyTimeRow.tsx` instead of `LIFECYCLE_STAGES[i].emoji`.

### `<HeroPlate>` and `<Logo>` adoption (no new assets needed)

Already in repo. Just edit consumers:

- `src/app/intro/page.tsx` — 5 swaps (Act 1 hammer, 3 chrome orbits, Act 5 hammer reprise)
- `src/app/page.tsx` — 2 swaps
- `src/app/launch/page.tsx`, `src/app/profile/page.tsx`, `src/app/knowledge/page.tsx`, `src/app/presentation/page.tsx` (×2), `src/app/dashboard/page.tsx`, `src/components/SplashIntro.tsx` — 1 swap each

### Auth / sign-up brand mark

In repo. Add `<Logo variant="default" width={48} />` to the auth page header. No asset sourcing needed.

### `/og/og-dark.png` wiring

In repo at `public/og/og-dark.png`. When a dark-theme surface needs it:

```tsx
// in layout.tsx
openGraph: {
  ...,
  images: [
    { url: "/og/og-light.png", width: 1200, height: 630, alt: "..." },
    { url: "/og/og-dark.png",  width: 1200, height: 630, alt: "...", type: "image/png" },
  ],
},
```

---

## Appendix — Source-of-truth references

- **Design system:** `/Users/chilly/Developer/Knowledge Gardens Design System/` (read-only from BKG repo's perspective). README §§ 2 (brands), 6 (visual foundations), 7 (iconography), 9 (antipatterns) are the spec for any new asset.
- **Tokens:** `src/styles/tokens.css` (synced from design system 2026-05-27). Use `var(--token)` references, not raw hex.
- **Components ready for adoption:** `src/components/brand/Logo.tsx`, `src/components/brand/HeroPlate.tsx` (`import { Logo, HeroPlate } from '@/components/brand'`).
- **Asset sync history:** commit `953ae44` (2026-05-28 Mac 1 Cowork — synced 28 design-system assets to `public/` + built `<Logo>` + `<HeroPlate>`).
- **Previous version of this doc** (sync-spec form) is preserved in git history at commits before `953ae44`.
