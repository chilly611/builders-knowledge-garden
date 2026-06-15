# BKG — Component Fidelity Spec (Killer App + Dream Machine on the shared shell)

*Acceptance spec for the visual re-housing — the "keep the engine, re-house the surface" pivot (2026-06-08 dogfood). Derived from the two Claude Design mockups (Killer App — Builder lane; Dream Machine — what-if). This is NOT a rebuild brief: the shared App Shell (`src/components/app-shell/`, merged 2026-05-31) and the engine stay; we raise the fidelity of the components that mount on them.*

**Read order:** Shared Shell first (build once, both surfaces inherit) → Killer App Builder lane (build to 100% first) → Dream Machine (inherits ~70%) → Asset manifest (Cowork) → Acceptance gate.

---

## ✅ Decisions resolved (2026-06-14, founder)

These were the two open flags. They are now answered so Code never guesses:

### 1. Demo canon — NEW: "SF Fourplex" (4-unit San Francisco residential)
- The reference project for THESE mockups is a **new 4-unit residential building in San Francisco** ("SF Fourplex"), added as a **second canonical demo alongside Marin** — Marin (Modern Farmhouse, $1.65M, 4,000 sqft) stays the founder-locked canon per `CLAUDE.md`; it is **not** retired.
- Twin Peaks (from the mockups) is **layout reference only** — its numbers are not canon.
- Components remain **data-driven via `useStageProject()`** — ZERO hardcoding of either project. Switching `?project=` must flip every dimension with no bleed between SF Fourplex and Marin. (Having two real projects is also how we *prove* that acceptance criterion.)
- **⚠️ The SF Fourplex numbers below are PROPOSED — founder to LOCK before any seed-data is written.** Do not bake these figures into a seed module until confirmed. This is a separate seed-data work item; it is NOT part of the component lane and NOT part of the docs commit.

**PROPOSED SF Fourplex canon (founder to confirm/adjust):**

| Field | Proposed value |
|---|---|
| Name | SF Fourplex (working name — confirm) |
| Type | Ground-up multifamily infill, 4 units |
| Location | San Francisco, CA |
| Unit mix | 2× 2BR/2BA + 2× 1BR/1BA |
| Gross area | ~5,200 sqft |
| Stories | 4 (3 over garage) |
| Total project cost | $3,200,000 |
| Spent | $1,340,000 |
| Committed | $410,000 |
| Remaining | $1,450,000 |
| Build progress | 42% · Week 6 of 14 · active stage **Build** |

Invariant (must hold like Marin): `spent + committed + remaining = total` → 1,340,000 + 410,000 + 1,450,000 = **3,200,000 ✓**. Project-level spend = 1.34M / 3.2M ≈ **42%**.

### 2. Stage-chip semantics
- **Chip state = access/billing**: `paid` (completed/unlocked, calm) · `current` (rust fill + status dot + progress number) · `soon` (locked, faded).
- **The chip's active-stage number = spend-%** (ledger-derived; this is the figure that pairs with the budget readout's "NN% SPENT"). It is NOT stage-completion.
- **Journey node = schedule progress** (e.g. `42% · WK 06 / 14`).
- So the chip "spend-%" and the journey "schedule-%" are intentionally different numbers from different sources — both data-driven, neither hardcoded.

---

## Doctrine this satisfies
- **Decision 18 — Visual-First:** every surface earns its keep visually inside herbarium-locked chrome.
- **Decision 19 — Legible Judgment:** the instrument gauges are the green/amber/rust flag surface, made physical.
- **MLP not MVP:** the bar is "lovable," and the founder dogfood pass on the live domain is the gate — smoke-green doesn't count.

## Token + type contract (applies to every component below)
- **Display headline:** Archivo Black (e.g. "Where the build stands", "Imagine the next move.")
- **Eyebrow / meta / labels / plate numbers:** Space Mono, uppercase, wide tracking (e.g. `YOUR WEEK · BY THE INSTRUMENTS`, `PLATE NO. 0014 · BUILD · 2026-05-27`)
- **Italic captions / subtitles:** Cormorant Garamond italic (e.g. *SF Fourplex — the dream view*)
- **Body:** Archivo
- **Palette (tokens only, no raw hex):** `--paper-cream` `--paper-vellum` grounds; `--specimen-rust` / `--specimen-rust-deep` (Killer App active + budget-hot); `--specimen-sage` / `--specimen-sage-pale` (quality / go); `--ink-graphite` / `--ink-faded` (text); teal `#3C7A8A` for Killer App action buttons — confirm/add `--specimen-teal`; brass/amber for Dream Machine accent — confirm/add `--specimen-brass` (`#B08D5C`).
- **Prohibited:** red `#E8443A`, pure white, pure-dark grounds, "CRM"/"AI COO" copy, emoji in chrome.
- **Motion:** entrances + needle sweeps allowed; honor `prefers-reduced-motion` (static end-state). No constant scroll-triggered motion.

---

## A. Shared Shell — build once, both surfaces inherit

Multiple chrome systems currently coexist (`app-shell/` + `stage-shell/` + legacy `killerapp-chrome/` + `CompassWorkflowNav` + `KillerAppNav`). **`killerapp/layout.tsx` still mounts the OLD chrome alongside the new `ShellNav`/`ShellStrips` — that unfinished cutover is why the live nav still looks legacy.** Reconcile to ONE: `app-shell/` is canonical (it's the merged shared shell). Bring the pieces below to mockup fidelity there; **redirect/retire the duplicates and remove the legacy mounts from `layout.tsx`.** Do not fork the 7-stage source of truth (`KAC_STAGES` / lifecycle-stages).

### A1 — Surface-switcher nav bar
- [ ] Brown/ink ground bar spanning full width above the project strip
- [ ] Left: "Builder's Knowledge Garden" + active project name (Cormorant italic subtitle)
- [ ] Center: 3 surface tabs each with a Space Mono undercaption — **Killer App / WHAT GETS DONE**, **Dream Machine / WHAT GETS IMAGINED**, **Knowledge Garden / WHAT GETS REMEMBERED**; active tab boxed/inset
- [ ] Right: role + yard + avatar (`BUILDER · YARD 03 · [RG]`), role from `useStageProject().lane`
- [ ] Tabs route between surfaces preserving `?project=`
- Data: surfaces static; identity + role from session + `useStageProject()`

### A2 — Project header strip
- [ ] Herbarium plate thumbnail (bordered frame, aged-cream mat) — the `Seal` for the demo plate; project image when present
- [ ] Title + Cormorant italic subtitle (`Builder's Knowledge Garden · Builder` / `· Dream Machine`)
- [ ] Top-right budget readout: big figure + Space Mono `COMMITTED · NN% SPENT`
- [ ] StageChip ×7 (see A4) inline
- Data: all from `useStageProject()`

### A3 — Journey · Time Machine row
- [ ] Label `JOURNEY · TIME MACHINE` (Space Mono)
- [ ] 7 JourneyNodes on a connector line, each: stage icon + name + Cormorant sub-label (`Scoping`, `Scope & budget set`, `Planning`, `Building`, `Changes`, `Payments & closeout`, `Wrap-up`)
- [ ] Current stage in rust; completed nodes filled; future nodes faded
- [ ] WK marker pill positioned on the line at current week (`WK 06`)
- [ ] Right cap: `NN% · WK 06 / 14 · +4D`
- [ ] **Clickable** — each node routes to its stage page (closes the "chrome is display-only" regression)
- Data: stage progress + week from `useStageProject()`

### A4 — StageChip (×7)
- [ ] Three states: `paid` (completed/unlocked, calm), `current` (rust fill + status dot + **spend-% number**), `soon` (locked, faded, "Soon")
- [ ] Icon per stage; matches journey node iconography
- States + the active number resolve per the chip-semantics decision above (chip = billing/access; active number = spend-%).

### A5 — Budget readout / ribbon
- [ ] Big committed figure + `COMMITTED · NN% SPENT`; pulses on change (existing behavior)
- [ ] **Clickable** → budget view (closes display-only regression)
- Data: `useStageProject()` budget

### A6 — Seal (animated)
- [ ] BKG hammer-roots Viver mark via existing `Seal` (`BKG_SEAL_SRC` motion + `BKG_SEAL_POSTER`); reduced-motion → static emblem
- Already merged; verify it renders in the strip + plate at fidelity

### A7 — Ask-the-garden fab
- [ ] Single pill "Ask the garden" + compass affordance, bottom-right, on every surface (`GlobalAiFab`)
- [ ] One door (Ask/Tell merged per the nav-fix work, #27); persists Q&A to project (already wired, #21)

---

## B. Killer App — Builder lane (build to 100% FIRST)

### B1 — Crew greeting line
- [ ] "Good morning, crew — {project}, week {n} of {total}." + Space Mono meta row (`{city} · {beds} · {sqft} · {structural type} · YARD 03 · CREW 04`)
- Data: `useStageProject()`; crew/yard from project members where present, else hidden (no fabrication)

### B2 — Cinematic hero band
- [ ] Eyebrow `YOUR WEEK · BY THE INSTRUMENTS` (Space Mono)
- [ ] Archivo Black headline "Where the build stands" over a full-bleed cinematic photo (Cowork asset **B-asset-1**)
- [ ] Body line + Cormorant italic caption bottom-right (*{project} — the dream view*)
- [ ] Warm overlay so headline stays legible; rounded plate frame
- Data: headline static; photo per project (canonical demo asset from Cowork)

### B3 — Instrument gauges ×3 (the signature "wow"; Decision 19 made physical)
- [ ] Section label "This week's instruments" + right cap `YARD 03 · CREW 04 · WK 06 OF 14`
- [ ] Three analog dials with brass herbarium bezels, tick marks, needle:
  - **On schedule?** — teal face; needle = schedule health
  - **Budget burn?** — rust face when hot; needle = burn vs plan
  - **Quality?** — sage face; needle = quality/flag rollup
- [ ] Space Mono question label above each (Cormorant for any sub-caption)
- [ ] Needle sweeps to value on entrance; reduced-motion → static at value
- [ ] Value + color tier are green/amber/rust legible flags (Decision 19), data-driven
- Data: schedule/budget/quality rollups from `useStageProject()` + ledger; if a metric is unavailable, the dial shows an honest "no data" face — **never a fake reading**

### B4 — Field-log plate rows (mobile + desktop)
- [ ] Section "Field log — today" + `N ENTRIES`
- [ ] Each entry = a plate row: `PLATE NO. {id} · {STAGE} · {date}` (Space Mono), optional `FLAGGED` tag (rust), thumbnail, note
- Data: persisted field log (#21 `daily_log_state`); reads per project

### B5 — Reflect recall card (mobile shown; desktop variant)
- [ ] `WF · 04 / REFLECT` tag, Archivo Black title (e.g. "Remember — Cedar Ridge flashing"), Cormorant body, teal `Recall →` button
- Data: lessons/Reflect entries per project; honest empty-state when none

### B6 — Action buttons
- [ ] Teal filled "Sketch →" / "Recall →" treatment; consistent affordance across mobile + desktop

---

## C. Dream Machine — what-if (build SECOND; inherits A + the plate/button primitives from B)

> **Engine note (2026-06-14):** the Dream Machine generation engine was repaired on `feat/dream-machine-visuals` — `/dream/design` now calls the real render API (`/api/v1/render` → Replicate FLUX) with an instant concept-sketch that upgrades to photoreal, a guaranteed-visual fallback on any failure, pre-sign-in rate-limited renders, and durable saved-image healing. **Section C re-houses that engine in the shared shell — it does NOT re-roll the generation logic.** Reuse `/api/v1/render` + the `buildStudioPrompt`/`conceptFallbackFor` primitives.

### C1 — Orrery prompt hero
- [ ] Eyebrow `DREAM MACHINE · WHAT-IF`; Archivo Black "Imagine the next move."; body line
- [ ] Faint orrery motif (concentric rings + traveling dot) on the right of the hero — calm ambient motion, reduced-motion static
- [ ] Input "Describe a change — a balcony, a wider window, a new layout…" + brass-filled "Sketch it →"
- [ ] Suggestion chips: `SECOND-STOREY BALCONY` · `WIDER KITCHEN WINDOW` · `SKYLIGHT OVER THE STAIR` · `RECLAIM THE SIDE YARD`
- Data: prompt → existing generation path; chips can be project-derived later

### C2 — "In motion" exploration cards
- [ ] Section "In motion" + right cap `N EXPLORATIONS · THIS WEEK`
- [ ] Each card: Space Mono tag (`3 MASSING OPTIONS` / `CLEARANCE CHECK` / `DAYLIGHT STUDY`), architectural line-render image (Cowork asset **C-batch**), Archivo Black title, Cormorant body, action (`View options →` / `Open study →` / `Simulate →`)
- [ ] Mobile variant: "option chosen" + "parked" plate cards with quotes + `PARKED` tag
- Data: explorations per project (generation system); cards reuse B4 plate treatment

---

## D. Asset manifest (Cowork produces; staged, founder selects)

All generated per the canonical reference project (**SF Fourplex** for these mockups), herbarium-consistent, draft-only into `brand-assets` (creator draft-only; promotion is service-role/founder).

- [ ] **B-asset-1** — cinematic hero photo: a modern 4-unit San Francisco residential building, golden hour, architectural, warm. 1–2 options.
- [ ] **C-batch** — exploration renders: 3–4 architectural line/sketch-render studies (massing, clearance, daylight) in a consistent register.
- [ ] **B4/C2** field-log + plate thumbnails: small site photos / sketch thumbs.
- [ ] (Optional) **B3 gauge-face art:** brass bezel + tick SVG the Code lane can drop into the gauge component (Code owns the needle + data).

---

## E. Acceptance / dogfood gate (the real shipping gate)
- [ ] One reconciled chrome system (`app-shell` canonical); duplicates retired/redirected; **legacy mounts removed from `killerapp/layout.tsx`**
- [ ] Killer App Builder lane matches the mockup at 1280 and 390 — chrome, gauges, hero, field log, recall card
- [ ] Every component reads `useStageProject()`; zero hardcoded Twin Peaks / SF Fourplex / Marin; switching `?project=` flips all dimensions with no bleed
- [ ] Tokens only, no forbidden hex; reduced-motion honored
- [ ] Journey nodes + budget ribbon are clickable navigation (regression closed)
- [ ] `next build` green; `tsc`/eslint clean on changed files
- [ ] Founder dogfood pass on builders.theknowledgegardens.com — sign in → open project → walk the surface → it feels like the mockup. Smoke-green does not count.
- [ ] Dream Machine reuses the shared shell + plate/button primitives with no re-roll, and calls the existing `/api/v1/render` engine

---

## Sequencing (gated, one write-lane at a time)
1. **Nav-fix is already merged (#27) and on `main`** — the gate in the Code prompt is satisfied. The real remaining nav work is the **chrome cutover (Section A)**: remove the legacy mounts from `killerapp/layout.tsx` so the new shell is the only chrome.
2. **This spec must be on `main` before the Code lane branches** its fresh worktree, or the lane has nothing to read.
3. **Code lane** (`feat/killer-app-fidelity`): Section A + B to 100%. Serial, worktree off `origin/main`, PR-only, founder merges.
4. **Cowork asset lane** runs in parallel (staging only — no repo writes).
5. **`feat/dream-machine-visuals`** (the engine fix) merges as its own small PR; Section C re-houses that engine later.
6. **Founder dogfood** on the live domain is the gate.
