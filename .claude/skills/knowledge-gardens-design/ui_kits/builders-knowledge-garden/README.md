# Builder's Knowledge Garden — UI kit

A click-through, visual recreation of the BKG product chrome. It is **not** production code — it is a high-fidelity reference for designers, agents, and prototypers who need to drop BKG components into a mock.

Live product surface: **builders.theknowledgegardens.com**
Repo (read-only context): **https://github.com/chilly611/builders-knowledge-garden**

## Run it

Open [`index.html`](./index.html) in a browser. Everything is React + Babel inline; no build step.

## Files

| File | What it is |
|---|---|
| `index.html` | Demo shell. Loads React, Babel, and the two JSX bundles. |
| `styles.css` | All BKG chrome styles. Reads tokens from `../../colors_and_type.css`. |
| `components.jsx` | Reusable components (see below). Exports each to `window`. |
| `app.jsx` | A full Killer App view assembled from the components. |

## Components in `components.jsx`

| Component | Use |
|---|---|
| `<BkgMark size={28} />` | The "B" logo built from hand tools (PNG). |
| `<Sidebar active onSelect />` | 5-item product nav with project pill in the footer. |
| `<JourneyStrip active onChange />` | `Dream → Design → Plan → Build → Deliver → Grow` phase pills. |
| `<SurfaceHeader surface={"killer" \| "dream" \| "garden"} title subtitle />` | Wide hero card that swaps the underlying plate. |
| `<Gauge value label accent display />` | Brass-bezel SVG instrument gauge for KPI tiles. Pass `value` 0…1. |
| `<SpecimenCard plate phase date title meta quote caption tag tagTone />` | The herbarium-style content card. |
| `<WorkflowCard title blurb verb phase accent />` | The recommended-next-action card. |
| `<Composer placeholder value onChange onSubmit />` | The "ask" input bar. |
| `<BudgetLattice weeks={[{committed, spent, flag}]} />` | Weekly $ committed / spent grid. |
| `<CompassFab onClick />` | Floating compass dial, bottom-right. |

## Why these and not others

The production codebase has ~90 React components across `src/components/` and `src/design-system/components/`. This kit picks the **ten that carry the visual identity** — anything else is a composition of these.

If you need something not in the kit (Gantt timeline, voice-command nav, etc.), read the production source and bring it over in this same style: cream paper, sepia ink, 1px hairlines, no glassmorphism, no gradients-as-decoration.

## Known gaps / next steps

- No mobile layout work yet — the kit hides the sidebar under `1000px`. Production has a richer mobile nav (see `src/components/IntegratedNavigator.tsx`).
- Workflow cards are static; production renders them from `src/design-system/components/WorkflowRenderer.tsx`.
- The Dream Machine and Knowledge Garden surfaces are stubbed via the `SurfaceHeader` only — bring in their full chrome from `src/app/dream/` and `src/app/knowledge/` if you need to mock either.
