# Budget-DNA & Color System

*Spec + as-built · `feat/budget-dna-ribbon` · 2026-06-15*

**Status:** drafted **and implemented in the same PR** (founder ruling, 2026-06-15:
"draft + build in one PR"). This document is the canon for the budget-category
color system and the Budget-DNA ribbon; the code under `src/lib/budget-dna/`,
`src/components/app-shell/BudgetDnaRibbon.tsx`, and the `--cat-*` / `--pay-*`
tokens in `src/styles/tokens.css` implement exactly what's described here.
Numbers reconcile to the canonical Marin seed ($1.65M total / $312.4K spent /
Build 42%). **Founder to ratify the open decisions in §6.**

---

## §1 — The color system

### The eight cost categories

The ribbon streamgraph, the budget line-item table, and the burn gauge all speak
ONE category vocabulary: eight buckets, ordered by where the money lands across a
build (early → late). This order is also the canonical streamgraph stacking order
(index 0 = bottom band) and the legend order.

Source of truth: `--cat-*` in `src/styles/tokens.css`; mirrored (with the resolved
hex, for SVG pattern stops) in `src/lib/budget-dna/categories.ts` and asserted in
sync by `budget-dna.test.ts`.

| # | Category | Token | Hex | Texture | CSI divisions | Contrast on cream |
|---|----------|-------|-----|---------|---------------|-------------------|
| 0 | Soft costs & GC | `--cat-softcosts` | `#5A3B1F` (ink-sepia) | stipple | 00, 01 | ~7:1 |
| 1 | Foundation & concrete | `--cat-foundation` | `#5C6660` (stone, new) | crosshatch | 03 | 4.95:1 |
| 2 | Site & earthwork | `--cat-site` | `#7C6235` (brass-aged) | diagonal | 02, 31 | 4.8:1 |
| 3 | Framing & structure | `--cat-framing` | `#A9743C` (timber, new) | vertical | 05, 06 | 3.32:1 |
| 4 | Envelope | `--cat-envelope` | `#3C7A8A` (specimen-teal) | brick | 07, 08 | 4.03:1 |
| 5 | Systems (MEP) | `--cat-systems` | `#8C5E22` (amber-deep) | dashes | 21–23, 26–28 | 4.68:1 |
| 6 | Interior finishes | `--cat-finishes` | `#8A5670` (plum, new) | chevron | 09–12 | 4.8:1 |
| 7 | Site improvements | `--cat-site-improv` | `#5E7A56` (specimen-sage) | leaf | 32, 33 | 3.99:1 |

**Rules (all enforced):**
- **≥3:1 on `--paper-cream`** for every fill (verified above; the test guards the
  hexes). Labels render in `--ink-graphite` on cream (AA easily).
- **Distinct from every stage-accent hex** (`#B6873A #C9913F #3E3A6E #2E9E9A
  #E05E4B #B23A7F #5E4B7C`). Stage accents stay stage-based; categories NEVER
  recolor them (the `WorkflowEntryCard` tone stays `phase`-driven — untouched).
- **Never hue-alone.** Every category pairs its fill with a **texture** (the
  `pattern` column → SVG `<pattern>` in the ribbon + the legend swatch) AND a
  **text label**. Colorblind-safe and rule-compliant.
- Four categories reuse brand tokens (soft costs = ink-sepia, site = brass-aged,
  envelope = teal, systems = amber-deep, site-improv = sage); three are new
  herbarium-consistent extensions (foundation stone, framing timber, finishes
  plum) tuned for contrast + mutual distinctness.

### Payment-state treatments

Two payment axes, one coherent palette (`--pay-*` in tokens.css; mirrored in
`BudgetClient` `STATE_META`). `paid = sage` everywhere. Always color + glyph + label.

| State | Token | Hex | Glyph | Used by |
|-------|-------|-----|-------|---------|
| paid | `--pay-paid` | sage `#5E7A56` | ● ✓ | line chips + ribbon baseline ticks |
| committed / locked-in | `--pay-committed` | teal `#3C7A8A` | ● | line chips |
| estimated | `--pay-estimated` | amber `#C68A3D` | ◓ | line chips |
| pending | `--pay-pending` | faded `#8C6A45` | ◌ | line chips |
| due | `--pay-due` | amber `#C68A3D` | ◌ (hollow ring) | ribbon baseline ticks |
| overdue | `--pay-overdue` | rust `#A53A2D` | ▲ (filled) | ribbon baseline ticks |

### `--cat-profit` flag

`--cat-profit: #2E5E3C` (+ `--cat-profit-pale`). A "kept money" green, deliberately
distinct from the sage site-improvements band. **Lens-gated** — it only ever colors
the ribbon's right-cap gross-profit readout for builder lanes (see §2, §6). Never a
stacked band; the Owner lane never sees it.

---

## §2 — The Budget-DNA ribbon

`src/components/app-shell/BudgetDnaRibbon.tsx`, mounted in `ShellStrips` as the
top strip **directly above the journey row**, sharing its x-axis.

- **X-axis = project timeline**, weeks 0 → substantial completion (Marin = 37 wk).
  The ribbon track and the journey track use the same horizontal extent and the
  same 3% inset (`.jline`), so a week maps to the same x in both rows.
- **Stacked-category streamgraph** — hand-coded SVG: cumulative per-week areas,
  Catmull-Rom smoothed, one band per category in canonical order, each filled with
  its `<pattern>` (color + texture). Band thickness at week *w* = that category's
  dollars in week *w*, so the silhouette reads the build: **materials/framing
  early-left, interior finishes late-right.** *(Chose hand-coded SVG over d3 — no
  dependency, brand-controlled, matches the `InstrumentGauge` precedent; the spec's
  "or equivalent" allowance.)*
- **Past solid / future veiled** — everything right of the playhead is overlaid
  with a cream + hatch "projected" veil. Past-of-playhead is the money already out.
- **Shared WK playhead (time-sync)** — a single vertical playhead at the
  **cumulative-spend front**: the week at which cumulative planned cost first
  reaches `spent`. For Marin ($312.4K) that lands at **week 7** (end of
  foundation) — self-reconciling with the canonical spent. The journey row's
  `jscrub` flag renders at the same week, so the playhead spans both strips.
  **Scrubbing** (drag the streamgraph, or drag the journey flag) moves the shared
  playhead; the past/future split follows; click the flag to return to live.
- **Baseline ticks** — paid (sage ●) / due (amber ◌) / overdue (rust ▲) marks at
  each line's wrap week. Marin shows mostly paid-early + due-ahead (no overdue —
  matches the "on budget, holding" narrative).
- **Lens-aware right cap:**
  - **Owner lane** (and any non-builder / unresolved lane): `total cost · paid ·
    unpaid` — **no margin, ever.**
  - **Builder lane** (`gc` / `contractor` / `diy`): projected **gross profit** +
    `incl. sub-markup` (see §6 for the assumption).
- **Collapsible specimen-key legend** — 8 category swatches (color + texture +
  label) + paid/due/overdue. Collapsed by default.
- **`prefers-reduced-motion`** — no band draw-in, no fill animation.

Honest empty/loading: no budget lines → a slim "Add budget lines to grow the DNA"
strip, never a fabricated curve.

---

## §3 — Data model: project_budget_lines × CSI→category map × schedule phases

All pure + unit-tested (`src/lib/budget-dna/`), bound to the live project by
`useBudgetDna()` (reads `useStageProject` + `useProjectLedger` — **zero hardcoded
project names**; Marin uses `MARIN_BUDGET_LINES` + `MARIN_PLAN_PHASES`, any other
project uses its localStorage lines + the generic `DEFAULT_BUILD_PHASES`).

1. **`lineToCategory(line)`** (`categories.ts`) — resolves a budget line to one of
   the eight: explicit CSI code → description/category keyword rules → accounting
   fallback → soft-costs. Trade keywords beat generic ones (e.g. "electrical —
   rough + finish" → systems, not finishes).
2. **`schedulePhases(phases)`** (`schedule.ts`) — assigns each phase an absolute
   `[startWeek, endWeek)`, honoring `parallelGroup` (MEP runs concurrent) exactly
   like the Plan-stage `computeSchedule`. Marin = 37 weeks.
3. **`lineToTimeWindow(line, scheduled)`** — maps a line onto the week range where
   its spend lands (permits/design → weeks 0–2 pre-roll; GC → continuous; framing
   lumber → framing weeks; finishes → finishes weeks; …).
4. **`deriveBudgetDna({lines, phases, totals, lane})`** (`derive.ts`) — distributes
   each line's dollars uniformly across its window into per-week-per-category
   series (bottom→top), computes the cumulative-spend playhead, the payment ticks,
   and the lens-gated profit. Returns `{ totalWeeks, series, totals, currentWeek,
   ticks, profit, empty }`.

**Marin worked example** (the eight buckets sum to exactly the $1.65M contract):

| Category | $K | where it lands |
|----------|----|----|
| Soft costs & GC | 256 | permits + architecture (front) + GC continuous |
| Site & earthwork | 28 | crane/equipment, site weeks |
| Foundation | 165 | foundation phase (wk 3–7) |
| Framing | 303 | framing labor + lumber (wk 7–17) |
| Envelope | 247 | roofing + windows + siding (dry-in / exterior) |
| Systems (MEP) | 268 | electrical + plumbing + HVAC (wk 20–23) |
| Interior finishes | 334 | drywall + flooring/cabinets/counters (wk 23–33) |
| Site improvements | 49 | landscape + hardscape (wk 33–37) |

Silhouette: site/foundation early → framing hump → envelope/MEP mid → finishes
late → landscape tail. Playhead at wk 7 ($312K spent). ✓

---

## §4 — Reflections (one color language)

- **Line-item table** (`BudgetClient` `LineRow`) — each line's left border + a
  per-line chip now use its **canonical trade-category** color (via
  `lineToCategory`), so a line reads the SAME color + texture in the table as in
  the ribbon band. The 10 accounting-category card headers were rebranded to
  herbarium tones (deduped from stage accents; off-brand `#1D9E75`/`#1565C0`/etc.
  removed); the four state chips now use the `--pay-*` treatments.
- **"Budget burn?" gauge** (`InstrumentGauge`) — gains an additive, optional
  `segments` prop that draws a thin **category-composition ring** along the arc;
  the dashboard Budget gauge passes the Budget-DNA category breakdown, so the burn
  gauge reflects the same palette. Backward-compatible (omit it → unchanged).
- **Workflow-card stage accents stay stage-based** — `WorkflowEntryCard` `tone`
  is still `phase`-driven; categories never recolor it. (Untouched.)

---

## §5 — Chrome consolidation

app-shell (`ShellStrips` + `BudgetDnaRibbon`) is the ONE canonical chrome.

- **killerapp-chrome chrome — deleted** (KillerAppChrome + its BudgetRibbon,
  JourneyTimeRow, StageNode, TimelineMarkers, CompletionRing, SpendBlock,
  IncomeStackedTracks, HeadroomGauge, marin-adapter). They had no mounts and no
  external importers; the barrel keeps only the still-used `KAC_STAGES` / `Kac*`
  types.
- **stage-shell — consumes the canonical ribbon.** `StageShell` now renders
  `BudgetDnaRibbon` (its own compact BudgetRibbon duplicate is deleted), so every
  stage route shows the one ribbon + shared playhead.
- **Flagged / deferred:** the literal "ShellStrips on all 7 stage routes" was NOT
  done — stage bodies depend on `StageShell`'s bounded `100dvh-48` height
  (`size-up:386` uses `height:100%`/`flex:1`), so hosting the full global strips
  needs per-stage layout rework that risks the shipping-gate stage flow. The
  remaining journey-row unification (app-shell inline JSX vs the standalone
  `stage-shell/JourneyRow`) is the next reconciliation step.

---

## §6 — Open decisions (founder to ratify)

1. **Projected gross-profit assumption.** Marin's lines sum to exactly the $1.65M
   contract (cost == contract), so no margin is separable from the seed. The
   builder-lane cap shows a clearly-labeled **projected** figure using documented
   constants in `categories.ts`: `GROSS_MARGIN_PCT = 0.15`, `SUB_MARKUP_PCT = 0.10`.
   Ratify the percentages (or wire a real contract-vs-cost source).
2. **Lenses that see profit.** Currently `gc` / `contractor` / `diy`. Owner +
   sub / specialist / worker / unresolved → no margin. Confirm.
3. **Playhead = cumulative-spend front** (wk 7 for Marin), distinct from the
   journey *fill* which stays **stage progress** (42%, matching the hero). They
   differ for Marin (early-dollar, mid-stage) — intentional. Confirm this reads
   right, or unify on one metric.
4. **Rebranded accounting-category header hexes** (the 10 budget-page buckets).
   Confirm the herbarium assignments in `BudgetClient` `CATEGORIES`.
