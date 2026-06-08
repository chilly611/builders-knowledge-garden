> **DRAFT — for founder review. Not yet canonical.** Proposed final location: `docs/project-instructions/dream-machine.md` (pending founder confirmation). Drafted 2026-06 alongside the umbrella and the other two surface files. Nothing here overrides the Platform Constitution; where this draft and the constitution disagree, the constitution and the live code win.

# Dream Machine — Project Instructions
*v1 · 2026-06 · Tier 2 · governs the generative surface of Builder's Knowledge Garden · governed by the Platform Constitution*

> What gets imagined. The Dream Machine is the generative, exploratory, what-if surface — where a vision becomes a thing you can see, and a dream becomes a project the Killer App can run.

## What this product is
The Dream Machine is the **generative surface** of Builder's Knowledge Garden: the place a person discovers possibilities, expresses an idea, or uploads something to riff on — and turns that into something concrete. Where the Killer App asks "what do I do today" and the Knowledge Garden answers "what do we know," the Dream Machine asks **"what could this be."**

It is built around **three intents** at the front door — **Discover, Express, Upload** — each presented as an Invitation Card and wired into the Time Machine so every dream has a lineage. The output of the Dream Machine is not just imagery or ideas; it is a **project that can enter the Killer App lifecycle**.

## Thesis / role in the umbrella
Builder's Knowledge Garden is the flagship revenue garden, and the Dream Machine is its **on-ramp**: it is where a job is conceived before it is run. By turning open-ended vision into a structured project, the Dream Machine feeds the Killer App — the surface the platform is judged on — and so feeds the umbrella thesis that proving the engine in construction unlocks every other garden (constitution, umbrella thesis). One's agency brings joy: the Dream Machine amplifies the person's vision, it does not replace it.

## Locked decisions (numbered — do not re-litigate unless reopened)
Each is consistent with, and downstream of, the Platform Constitution's numbered decisions; where a constitution decision is cited, it governs.

1. **Three intents at the front door: Discover, Express, Upload.** Each is an Invitation Card; together they are the whole entry to the surface.
2. **Dream and Design are freely navigable, not lifecycle-gated.** The Dream Machine is *not* a stage of the seven-stage lifecycle; a person can dream at any time without the lifecycle blocking them. (Constitution decision 3.)
3. **Dreams become projects through the Time Machine.** Every dream is a point on a timeline with lineage, and a dream that matures hands off into the Killer App lifecycle as a project. (Time Machine is platform infrastructure; constitution decision 14 — we own the whole journey, including its beginning.)
4. **Generative output stays grounded where it touches compliance.** The Dream Machine may explore freely, but the moment a what-if implies a code or safety claim, that claim is sourced from the Knowledge Garden's cited entities, honest about coverage. Dreaming is free; lying about code is not. (Constitution decision 10.)
5. **AI amplifies, never replaces, the person's vision.** The human's agency is the point; the generative engine is a multiplier for it. (Constitution decision 17; the "agency brings joy" principle.)
6. **Professionals get one-click convenience AND full manual control,** here too. The Pro Toggle is visible on every screen — a one-click generation and a fully steerable one. (Constitution decision 13.)
7. **Every generation emits events.** Exploration is instrumented so the RSI loop learns what people dream and which dreams become jobs. (Constitution decisions 9, 15.)

## How we work
- **Verify in a real browser.** A dream is "working" only if, on the live URL, you can enter through an intent, generate something, and — where applicable — carry it forward toward a project that persists (constitution decision 2).
- **Founder dogfood pass every sprint.** Dream a real job the way a GC or owner would; log every dead-end, every generation that goes nowhere, every handoff that loses the thread.
- **One repo-WRITE lane at a time, PR-only, founder-merged.** Coordinate via `docs/session-log.md`.
- **Never mutate production unsupervised; freeze during demos.** Generative surfaces are demo-heavy; protect the demo state.
- **Delight is the bar, not novelty.** MLP, never MVP (constitution decision 1): a generation that wows once but leads nowhere is not shippable. The dream has to be *lovable* and it has to *go somewhere*.

## Surfaces, chrome & accents
The Dream Machine is one of the four named surfaces under the umbrella. Its chrome is **specimen-brass `#B08D5C`** with **specimen-amber `#C68A3D`** as the warm generative accent — the warmest of the four palettes, fitting a surface about imagination. Light backgrounds always; Archivo for UI, Archivo Black for display; sentence case; no prohibited red `#E8443A`, no pure white (constitution decisions 4, 5).

The three intents are the surface's primary structure: Discover, Express, and Upload present as Invitation Cards on entry, and the Time Machine is visible as the spine that gives every dream a place and a history.

## Lanes served
Primary: the **Owner** imagining what they want, and the **General Contractor** (beachhead) exploring approaches and what-ifs before committing a job. The **Architect/Designer** lane is a natural fit for the generative and design exploration. Other lanes — Specialty Contractor, Lender, Supplier, Equipment/Service Provider, Worker — participate as a dream matures into a project and they are invited in (via the Killer App's Invitation Cards). The **Robots/AI Agents** lane can drive generation via API/MCP (constitution decision 16).

## Primitives it composes from
The Dream Machine is the surface where two primitives do their defining work, with the others in support:

- **Invitation Card** — the three intents (Discover, Express, Upload) *are* Invitation Cards; this is the primitive's home surface.
- **Time Machine** — platform infrastructure, and the spine of the Dream Machine: every dream is a timeline point with lineage, and the path from dream to project runs along it.
- **Ask Anything** — ask the surface to imagine, refine, or explore a direction.
- **Whisper** — quiet nudges and suggestions during exploration, never a wall of options.
- **Pro Toggle** — one-click generate, or full manual steering of the generation (constitution decision 13).
- **Progressive Reveal** — a new user sees the three intents, not the full depth of generative controls at once.
- **Emotional Arc** — the human emotional arc shapes the surface; imagining is hopeful, and the surface honors that without overselling.

## Data it reads / writes
- **Writes:** dreams/explorations and their lineage (each dream as a Time Machine point with provenance and the intent it came from), and — at handoff — a project record that enters the Killer App's lifecycle (a `command_center_projects` row), pre-populated from the dream.
- **Reads (grounding):** the Knowledge Garden's published, cited `knowledge_entities` whenever a generation touches a compliance, code, or material claim — so exploration that implies a code answer stays honest (constitution decision 10).
- **Uploads:** for the Upload intent, the source material a person brings in to riff on, stored with the dream's lineage.
- **Events:** every generation and handoff emits to the platform event/RSI stream (`rsi`, plus surface-specific event tables), so the loop learns which dreams become jobs (constitution decisions 9, 15).
- **Audit:** the handoff that turns a dream into a project is auditable on the shared pattern (`audit_log` via the shared audit trigger), so a project's origin dream is traceable.

(Canonical table details live in `docs/SCHEMA.md`; this section names what the surface touches.)

## The three intents (the front door)
The whole entry to the Dream Machine is three Invitation Cards. Each is a different starting posture, and all three converge on the Time Machine so the dream has lineage:

1. **Discover** — "show me what's possible." The person browses or asks open-ended; the surface generates and reveals directions they hadn't named yet. For the owner who knows they want *something* but not what.
2. **Express** — "here's what I'm picturing." The person describes a vision; the surface makes it visible and refinable. For the owner or GC who has the idea and wants to see it.
3. **Upload** — "start from this." The person brings a photo, a plan, a reference; the surface riffs on it. For the GC who has a starting artifact and wants to explore variations.

Each intent is an Invitation Card (constitution's primitive set), and each writes its dream into the Time Machine so "how did we get here" is always answerable.

## How a dream becomes a project
This is the Dream Machine's signature handoff and the reason it is more than a toy:

1. A person enters through an intent and generates/refines a dream along the Time Machine.
2. When the dream is one they want to *build*, the surface offers to carry it forward.
3. The dream hands off into the **Killer App lifecycle** as a project — typically arriving with context already filled in, so the GC isn't starting from a blank Size Up.
4. The project's lineage points back to its origin dream (the handoff is audited), so "this job started as this dream" is reconstructable.

Because Dream is freely navigable (constitution decision 3), this handoff is an *offer*, never a forced funnel — a person can keep dreaming without ever committing to a project.

## AI-native behaviors & voice
- **AI-native, not AI-bolted** (constitution decision 9): generation is the surface's core, present from the first screen, not a feature added later.
- **Amplify, don't replace** (constitution decision 17, "agency brings joy"): the generative engine extends the person's vision and keeps them in control via the Pro Toggle; it never quietly takes the wheel.
- **Grounded where it counts.** Free exploration is welcome, but any compliance/code/material claim a generation makes is sourced from the Knowledge Garden's cited entities, honest about coverage (constitution decision 10). Dreaming about a layout is free; asserting it meets code requires a citation.
- **Voice layer** — the 30+ language voice layer applies, so a person can dream out loud (constitution decision 12).
- **Robots/AI Agents lane** — machine callers can drive generation and handoff via API/MCP, scoped at the umbrella (constitution decision 16).
- **#aikidotheAI** — the Dream Machine redirects generative AI toward the person's goal, turning the wave into a multiplier for their vision (constitution decision 17).
- Voice and tone: plain language (constitution decision 7); warm but not breathless; no exclamation points in UI copy, no emoji, no buzzwords. Brand test: a curator at the Royal Botanic Gardens and a staff engineer at Stripe both find it tasteful, not gimmicky.

## Machine-legible exposure (Goal 8)
- **API-first**: the three intents and the dream-to-project handoff are endpoints before they are UI, so generation and handoff are reachable headlessly and by the Robots/AI Agents lane.
- **Lineage is machine-legible**: a dream's Time Machine lineage and its handoff to a project are exposed in a structured way, so an agent can trace origin-to-project.
- **Grounding is declared**: where a generation cites Knowledge Garden entities, the citations travel with the output, so machine consumers inherit the same honesty (constitution decision 10).

## Shipping gate / definition of done
A Dream Machine change is done when:

- On the **live URL**, a person can enter through an intent, generate something, and — where the flow includes handoff — carry it forward to a project that **persists** in the Killer App, verified in a real browser (constitution decision 2).
- The **dream's lineage is preserved** on the Time Machine, and a handed-off project traces back to its origin dream.
- Any **compliance claim** a generation makes is **grounded in cited `knowledge_entities`**, honest about coverage (constitution decision 10).
- The **Pro Toggle** works: one-click generation and full manual steering both available (constitution decision 13).
- The generation **emitted its events** to the RSI stream.
- The brand lock holds (specimen-brass/amber on light backgrounds, Archivo, sentence case, no prohibited red or pure white).
- A founder dogfood pass dreamed a real job and logged any dead-end or lost-thread handoff.

## Cross-references
- Governing document → `docs/PLATFORM-CONSTITUTION.md`
- Umbrella shell / account / cross-surface nav → `docs/project-instructions/kg-umbrella.md`
- Do-the-work surface (where dreams become running projects) → `docs/project-instructions/killer-app.md`
- Knowledge surface (the cited data that grounds generation) → `docs/project-instructions/builders-knowledge.md`
- Schema (project + dream lineage tables) → `docs/SCHEMA.md`
- Interface behavior → `docs/INTERFACE-PROTOCOLS.md` *(planned; referenced by the constitution)*
- Interface concepts (background) → `docs/dream-builder-interface-brainstorm.md`

## Open questions for the founder
1. **Handoff entry point.** When a dream becomes a project, does it land at Size Up (start of the lifecycle) or arrive pre-populated further in (e.g., Plan)? This is the mirror of the Killer App's "where does a project enter" question and the two answers must agree.
2. **Persistence of un-built dreams.** Do dreams persist indefinitely as first-class objects a person can return to, or are they ephemeral until promoted to a project? Affects storage and the leave-and-return story for this surface.
3. **Generation provider and cost posture.** Which generative engine(s) back Discover/Express/Upload, and what is the cost/rate stance — does the Pro Toggle's "full manual control" include controlling generation cost?
4. **Upload handling.** What source types does Upload accept (photos, plans, PDFs, models), and where is the line between "riff on this" and "extract structured data from this" (which would touch the Knowledge Garden gate)?
5. **Design vs. Dream.** The constitution names "Dream *and* Design" as freely navigable. Is Design a distinct mode within the Dream Machine, a separate surface later, or a facet of the three intents? This draft treats it as within the surface; confirm.
