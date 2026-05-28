# BKG Asset Placement Manifest

*The single source of truth for where every asset in `/Users/chilly/Developer/Knowledge Gardens Design System/assets/` lives in the BKG codebase and which components reference it.*

*Drop this at `/Users/chilly/Developer/bkg/docs/asset-manifest.md`. The Cowork sync prompt executes against it. To add a new asset: append one row.*

---

## How this works

1. **Source** = path in the design system folder
2. **Target** = where Cowork copies it inside `bkg/public/`
3. **Used by** = which component(s) reference it (existing or to-create)
4. **Notes** = sizing, role, anything quirky

Cowork's sync job walks every row, copies source → target, and verifies the component reference exists. Anything in the design system folder NOT in this manifest gets reported back so we decide where it goes.

## Hero plates — the brand DNA

| Source | Target | Used by | Notes |
|---|---|---|---|
| `assets/plates/builders-hammer.png` | `public/plates/builders-hammer.png` | `<HeroPlate name="builders-hammer">` — `/intro` hero, `/about`, OG card default, sign-in page background | Master mark; weight highest in any image-pick logic |
| `assets/plates/chrome-killer-app.png` | `public/plates/chrome-killer-app.png` | `<SurfacePlate surface="killer">` — `/killerapp` index, empty states inside Killer App | Don't use as decorative background on a data-dense screen; competes with gauges |
| `assets/plates/chrome-dream-machine.png` | `public/plates/chrome-dream-machine.png` | `<SurfacePlate surface="dream">` — future Dream Machine surfaces, "what if" prompts | Surface not yet built; asset stages for when it is |
| `assets/plates/chrome-knowledge-garden.png` | `public/plates/chrome-knowledge-garden.png` | `<SurfacePlate surface="garden">` — `/lessons` index, `/projects` overview empty states | Use as the empty state when a builder has no lessons yet |

## Brand marks — logos and OG

| Source | Target | Used by | Notes |
|---|---|---|---|
| `assets/logo/bkg-transparent.png` | `public/brand/bkg-mark.png` | `<Logo variant="default">` — top nav, footer, default placement | 2x export, transparent bg |
| `assets/logo/bkg-white-outline.png` | `public/brand/bkg-mark-light.png` | `<Logo variant="light">` — used on dark or photo backgrounds | |
| `assets/logo/bkg-dark-outline.png` | `public/brand/bkg-mark-dark.png` | `<Logo variant="dark">` — strong silhouette over mid-tone | |
| `assets/logo/bkg-wood-outline.png` | `public/brand/bkg-mark-wood.png` | `<Logo variant="wood">` — on cream / vellum backgrounds when default doesn't pop | |
| `assets/logo/bkg-icon-192.png` | `public/icon-192.png` + `public/apple-touch-icon.png` | PWA manifest, browser favicon set | Also write to `app/icon.png` for Next.js metadata |
| `assets/logo/og-card-bkg.png` | `public/og/bkg-default.png` | `app/layout.tsx` → `metadata.openGraph.images` default | If multiple OG variants exist in the folder, ALL get copied to `public/og/` keyed by filename |

## Journey & stage photography

The design system README §1 mentions `assets/journey/` for "scene/journey-stage photography." Map by filename naming convention if present:

| Source pattern | Target | Used by |
|---|---|---|
| `assets/journey/size-up-*.{png,jpg,webp}` | `public/journey/size-up/` | `<StageBackground stage="size-up">` on `/killerapp/size-up` and stage chrome empty state |
| `assets/journey/lock-*.{png,jpg,webp}` | `public/journey/lock/` | `<StageBackground stage="lock">` on `/killerapp/lock` |
| `assets/journey/plan-*.{png,jpg,webp}` | `public/journey/plan/` | `<StageBackground stage="plan">` |
| `assets/journey/build-*.{png,jpg,webp}` | `public/journey/build/` | `<StageBackground stage="build">` |
| `assets/journey/adapt-*.{png,jpg,webp}` | `public/journey/adapt/` | `<StageBackground stage="adapt">` |
| `assets/journey/collect-*.{png,jpg,webp}` | `public/journey/collect/` | `<StageBackground stage="collect">` |
| `assets/journey/reflect-*.{png,jpg,webp}` | `public/journey/reflect/` | `<StageBackground stage="reflect">` |

**Treatment** per design system §6 "Backgrounds": sepia tint overlay, `background-color: var(--ink-sepia); background-blend-mode: multiply; opacity: 0.85`. The `<StageBackground>` component applies this automatically — don't render journey photos raw.

## Supporting imagery

| Source pattern | Target | Used by |
|---|---|---|
| `assets/imagery/*.{png,jpg,webp}` | `public/imagery/` | Available via `<BrandImage src="<filename>">` — explicit placement only, no auto-binding |

For supporting brand photography Cowork should not guess placement. Each file lands in `public/imagery/` and the manifest gets a follow-up row when a specific use is decided.

## Icons — Midjourney-generated custom set

If `assets/icons/` exists in the design system folder:

| Source pattern | Target | Used by |
|---|---|---|
| `assets/icons/*.svg` | `public/icons/` | `<KGIcon name="<filename>">` component reads from `public/icons/<name>.svg` |
| `assets/icons/*.png` | `public/icons/` | Same, but SVG preferred. Mark PNG-only icons for conversion in a follow-up. |

**Note for Cowork:** read README §7 "Iconography" — the design system specifies hand-drawn line SVG, brass/sepia, `stroke: 1.25–1.5px`, `currentColor` fill. If any Midjourney-generated icons don't match this style (e.g., full-color, raster), copy them but flag in the session log for review.

## Animations — Toxicology Garden lineage

Per Chilly: animations from the Toxicology Garden project should be available for reuse here. They're not currently in the design system folder.

**Action for Cowork:** if `assets/animations/` exists, copy contents to `public/animations/` and report what's there. If not, leave a placeholder section in `docs/asset-manifest.md` for animations to land later. Do not pull from the Toxicology Garden repo directly in this session; that's a separate cross-repo sync.

## UI Kit reference HTML

| Source | Target | Used by |
|---|---|---|
| `ui_kits/builders-knowledge-garden/index.html` | `public/internal/ui-kit-bkg.html` | Accessible at `/internal/ui-kit-bkg.html` for design reference only. Not linked from production nav. |
| `ui_kits/orchids/index.html` | NOT copied to BKG repo | Belongs in the Orchids repo sync, not here |

## Preview HTML (Design System tab)

| Source | Target | Used by |
|---|---|---|
| `preview/*.html` | NOT copied | Lives in the design system folder only; not consumed by the BKG runtime |

## Manifest discovery rules

When Cowork syncs:

1. List every file under `/Users/chilly/Developer/Knowledge Gardens Design System/assets/`
2. For each, find the matching manifest row (specific path > glob pattern)
3. Anything matched → copy to target, verify component reference exists
4. Anything unmatched → list in session log under "Unplaced assets" with the file's full path
5. Anything in the manifest with no matching source file → list under "Missing expected assets"
6. After Cowork reports unplaced/missing, Chilly decides placement for each (1-line manifest update per asset), and runs the sync again

## What NOT to auto-place

- Anything in `/Users/chilly/Developer/Knowledge Gardens Design System/fonts/` — fonts wire through `next/font/google` per yesterday's Cowork session, not via `public/`
- `colors_and_type.css` — already copied as `src/styles/tokens.css`
- `SKILL.md` — already installed at both Skill paths
- `README.md` — design system documentation, not runtime

---

## 2026-05-28 sync session — discovery results

**Session:** Cowork asset-sync, Mac 1 (~01:33 PT, demo morning). Lock claimed/released in `docs/in-flight.md`.

### Inventory

28 files in the design system `assets/` tree:
- 4 plates · 5 logos · 2 OG cards · 11 journey images · 6 imagery files · 0 icons · 0 animations

### Placed (28 of 28)

All four hero plates → `public/plates/`.
All four BKG marks → `public/brand/bkg-mark{,-light,-dark,-wood}.png`.
Icon `bkg-icon-192.png` → `public/icon-192.png` + `public/apple-touch-icon.png` + `src/app/icon.png` (three destinations per manifest spec; the latter two also FIX broken metadata refs — see "Fixed broken refs" below).
Both OG cards → `public/og/og-light.png` + `public/og/og-dark.png`.
All 11 journey images → `public/journey/` (flat — manifest's per-stage subdirectory layout deferred to a follow-up sub-categorization pass).
All 6 supporting imagery files → `public/imagery/` (flat — explicit-placement-only per manifest).

### Renames vs. manifest

| Manifest expected | Source had | Action |
|---|---|---|
| `og-card-bkg.png` | `og-light.png` + `og-dark.png` | Copied both. `og-light.png` is the primary (light theme; matches herbarium cream backgrounds). `og-dark.png` available for dark surfaces. Manifest row should be updated to reference the actual filenames. |

### Missing expected assets

| Path | What was expected |
|---|---|
| `assets/icons/*.svg` | The custom Midjourney icon set; manifest section "Icons" present but `assets/icons/` doesn't exist yet in the design system folder. Skipped per manifest discovery rule 5. |
| `assets/animations/` | Toxicology Garden lineage animations; manifest notes this is a future cross-repo sync. Skipped. |

### Unplaced assets (none)

All 28 files matched a manifest row.

### Pre-existing duplicates flagged for cleanup

The new manifest paths now exist **alongside** the pre-existing paths the running code was already using. Don't delete the pre-existing files — they're wired into the production `/intro` cinematic and the existing `<Logomark>` component. Cleanup is a follow-up:

| Pre-existing path (still used) | New canonical path | Used by |
|---|---|---|
| `public/logos/gardens/builders-hammer.png` | `public/plates/builders-hammer.png` | `/intro` Act 1 + Act 5 hammer-hero (raw `<img src>`). New path used by `<HeroPlate name="builders-hammer">` going forward. |
| `public/logos/gardens/chrome-killer-app.png` | `public/plates/chrome-killer-app.png` | `/intro` chrome orbit-out animations. New path used by `<HeroPlate name="chrome-killer-app">`. |
| `public/logos/gardens/chrome-dream-machine.png` | `public/plates/chrome-dream-machine.png` | `/intro` Dream Machine orbit. New: `<HeroPlate name="chrome-dream-machine">`. |
| `public/logos/gardens/chrome-knowledge-garden.png` | `public/plates/chrome-knowledge-garden.png` | `/intro` Knowledge Garden orbit. New: `<HeroPlate name="chrome-knowledge-garden">`. |
| `public/logo/b_transparent_512.png` | `public/brand/bkg-mark.png` | Existing `<Logomark>` component (top nav, footer). New: `<Logo variant="default">`. |
| `public/logo/b_white_outline_512.png` | `public/brand/bkg-mark-light.png` | — / `<Logo variant="light">`. |
| `public/logo/b_dark_outline_512.png` | `public/brand/bkg-mark-dark.png` | — / `<Logo variant="dark">`. |
| `public/logo/b_wood_outline_512.png` | `public/brand/bkg-mark-wood.png` | — / `<Logo variant="wood">`. |
| `public/logo/og_image_light.png` | `public/og/og-light.png` | OG metadata (was pointing at `/og/og-root.png` which didn't exist; now patched to `/og/og-light.png`). |
| `public/logo/og_image_dark.png` | `public/og/og-dark.png` | — |

### Fixed broken refs (collateral wins)

Two `metadata` references in `src/app/layout.tsx` were pointing at files that didn't exist on disk — both now have valid targets:

| Ref | Was | Now |
|---|---|---|
| `metadata.openGraph.images[0].url` | `/og/og-root.png` (404) | `/og/og-light.png` (live) |
| `metadata.twitter.images[0]` | `/og/og-root.png` (404) | `/og/og-light.png` (live) |
| `metadata.icons.apple` | `/apple-touch-icon.png` (file missing) | `/apple-touch-icon.png` (file now copied — 30,569 bytes) |

### Components created

| File | Purpose |
|---|---|
| `src/components/brand/Logo.tsx` | `<Logo variant="default|light|dark|wood" width={32} height={32} />` — wraps next/image, default `priority`, herbarium-friendly variants. |
| `src/components/brand/HeroPlate.tsx` | `<HeroPlate name="builders-hammer|chrome-killer-app|chrome-dream-machine|chrome-knowledge-garden" width={800} height={800} />` — same pattern. |
| `src/components/brand/index.ts` | Barrel — `import { Logo, HeroPlate } from '@/components/brand'`. |

### Wiring NOT done this session — flagged as follow-ups

The Cowork prompt's Step 4 listed four placements; two were inside this session's OWNS scope and were completed (OG metadata + favicon refs both patched in `layout.tsx`). The other two are OUTSIDE the asset-sync OWNS scope and were intentionally skipped on demo eve to avoid colliding with the active stage-chrome work:

- **Top-nav `<Logo>` adoption.** The existing `<Logomark>` in `src/components/KillerAppNav.tsx:155` works; swap it to `<Logo variant="default" />` after the demo. File is not in this session's OWNS.
- **`/intro` `<HeroPlate>` adoption.** `src/app/intro/page.tsx` currently uses raw `<img src="/logos/gardens/builders-hammer.png">` in Act 1 + Act 5 — it works (live on prod, hammer-hero shipped 2026-05-20). Swap to `<HeroPlate name="builders-hammer">` after the demo. File is not in this session's OWNS.

### Next-time-someone-syncs notes

- The pre-existing `public/logos/gardens/` set contains 11 extra logos beyond the four hero plates (biomarker, channel-type, distribute, garden-legal, health-garden-caduceus, knowledge-gardens-tree, optimize, orchid-garden, strategy, toxicology-caduceus, ui-pro-toggle-and-search, vertical-mobile-ad, legal, builder-lockin, builder-sizeup). These weren't in this session's design-system inventory; they're project-specific assets that should likely get their own manifest section if they're meant to be canonical.
- `public/journey/` also has a pre-existing `Journey-map-sketch.png` not in the design system. Same treatment recommended.
