# BKG UI Kit — Component Index

*Built 2026-05-28 as part of the design system rollout. Maps every component shipped in the Knowledge Gardens Design System BKG UI kit to its in-repo implementation (or marks it as not-yet-built).*

## Source

The canonical kit lives in the Knowledge Gardens Design System repository at:

```
/Users/chilly/Developer/Knowledge Gardens Design System/ui_kits/builders-knowledge-garden/
├── README.md          ← what the kit ships
├── index.html         ← click-through product mock (open in a browser)
├── components.jsx     ← reusable React component definitions
├── app.jsx            ← demo composition wiring the components together
└── styles.css         ← BKG-specific CSS (consumed alongside colors_and_type.css)
```

The kit is JSX-only (no TypeScript), uses unpkg CDN React + Babel-standalone, and is meant to be browsed as a static HTML demo. The same components are also installed for skill access at `bkg/.claude/skills/knowledge-gardens-design/ui_kits/builders-knowledge-garden/`.

## Component status

Status legend:
- **✓ in-repo** — already implemented in BKG with herbarium-compatible API
- **△ partial** — concept exists but kit's version is more refined; migration warranted
- **✗ not-yet-built** — kit has it, BKG doesn't

| Kit component | Purpose | BKG implementation | Status |
|---|---|---|---|
| `BkgMark` | Compact logo mark (the B-from-construction-tools) | `src/components/Logomark.tsx` | ✓ in-repo (different illustration; align after Mike approves) |
| `Sidebar` | Surface-switching left nav (Killer App / Dream / Garden / Umbrella) | `src/components/CompassNav.tsx` | △ partial — CompassNav covers cross-surface nav but uses a different metaphor (compass dial). Reconcile next sprint. |
| `JourneyStrip` | Horizontal 7-stage lifecycle strip with numbered markers + active accent | `src/components/killerapp-chrome/JourneyTimeRow.tsx` (mine, layout-level), `src/components/stage-shell/JourneyRow.tsx` (Code's, page-level) | △ partial — two implementations exist; pick a survivor in the next sprint |
| `Gauge` | Brass instrument gauge — value, label, accent, optional display string | none (`src/components/killerapp-chrome/CompletionRing.tsx` covers the percent-ring case, but not the instrument-gauge aesthetic with brass bezel + needle) | ✗ not-yet-built |
| `SpecimenCard` | Workhorse content card with PLATE NO. eng-label, Archivo Black title, EB Garamond italic quote, optional script caption | none — closest analog is the `BudgetModule` line-item card, but it doesn't carry the specimen-card visual language | ✗ not-yet-built |
| `WorkflowCard` | Verb-leading entry to a workflow (e.g. "Open · Daily log") with phase accent | various inline cards in `src/app/killerapp/page.tsx`; none extracted as a primitive | ✗ not-yet-built (high-priority — every workflow link on the killerapp landing should use this) |
| `Composer` | Plain-speak text field with engraved-paper styling, used for natural-language entry | `src/app/killerapp/WorkflowPickerSearchBox.tsx` — close, but visually generic | △ partial |
| `CompassFab` | Bottom-right floating compass-dial nav | `src/components/CompassBloom.tsx` | △ partial — same role, different visual treatment. Reconcile with the design system's `chrome-killer-app.png` plate next sprint. |
| `BudgetLattice` | Multi-week budget bar lattice showing planned vs. actual over time | `src/components/killerapp-chrome/BudgetRibbon.tsx` (mine — three blocks), `src/components/stage-shell/BudgetRibbon.tsx` (Code's — compact pill) | △ partial — two implementations, neither is the "lattice" form from the kit. The lattice is a separate visualization (weeks × spend bars). Build as a new primitive next sprint. |
| `SurfaceHeader` | Top strip identifying the current surface (Killer / Dream / Garden) with title + subtitle | none — the killerapp layout uses `KillerAppNav` (mine) and stage pages use `StageShell` header (Code's) | △ partial |

## Next-sprint migration order

1. **`WorkflowCard`** — every entry in the workflow picker on `/killerapp` should use this. Highest visual yield per LOC.
2. **`SpecimenCard`** — the workhorse container; once built, retrofit `BudgetModule` line items, `CompletionRing` callouts, and `JourneyTimeRow` event cards.
3. **`Gauge`** — instrument gauges read as "this is BKG" instantly. Build a single `<Gauge value={0..1} accent="teal"/>` primitive and retire the inline ring/progress-bar variants.
4. **`SurfaceHeader`** — once the kit's signature accent system is wired, the surface boundary becomes obvious from the top strip alone. Decommissions a lot of inline header code.
5. **`BudgetLattice`** — separate from the two existing BudgetRibbons; it's a weeks × spend visualization, not a glance-strip. Build alongside the stage-shell consolidation work.
6. Then reconcile the two existing chromes (mine vs Code's StageShell) into a single surface header + JourneyStrip pair powered by the kit primitives.

## How to use the kit during development

For a one-off mock or throwaway prototype:

```html
<link rel="stylesheet" href="/Users/chilly/Developer/Knowledge Gardens Design System/colors_and_type.css">
<link rel="stylesheet" href="/Users/chilly/Developer/Knowledge Gardens Design System/ui_kits/builders-knowledge-garden/styles.css">
<!-- ...then drop the component HTML directly from the rendered kit -->
```

For production code, copy the JSX into TypeScript (apply types as you go), convert the class names to either CSS modules or styled-jsx, and import the tokens via `src/styles/tokens.css` (already wired in `src/app/layout.tsx`).
