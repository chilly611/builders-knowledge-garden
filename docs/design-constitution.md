# The Knowledge Gardens Design Constitution

**Version:** 1.1
**Locked:** April 16, 2026 — amended 2026-05-28 (design system rollout)
**Status:** Inviolable — every surface, primitive, and future Knowledge Gardens domain must pass all ten goals.

---

## Implementation Source of Truth

**Tokens live in `src/styles/tokens.css`.** That file is the canonical source — colors, type stack, spacing, radii, shadows, motion. It is generated from the Knowledge Gardens Design System v0.1 export at `/Users/chilly/Developer/Knowledge Gardens Design System/`. When the design system author re-exports, this repo's `tokens.css` updates from that source.

`src/app/globals.css` no longer holds raw palette hex — the seven legacy BKG canonical tokens (`--navy / --brass / --robin / --orange / --redline / --trace / --graphite`) now alias to the herbarium tokens (`--specimen-teal-deep / --specimen-brass / --specimen-teal / --specimen-amber / --specimen-rust / --paper-edge / --ink-graphite`). Components that read `var(--navy)` etc. pick up the herbarium shift with zero code changes. Pre-rollout palette preserved at `src/components/_archive/2026-05-28-design-system/`.

The TypeScript constant `colors` exported from `src/design-system/tokens/colors.ts` is also herbarium — its values were hand-mapped to the hex equivalents so consumers (notably `src/components/stage-shell/*`) get the same palette without code changes.

The legacy `src/lib/brand-tokens.ts` (parchment/copper Federation Contract) remains in place for backwards compatibility with the ~15 surfaces that import it. Next-sprint follow-up: migrate those surfaces, then archive.

---

## Purpose

This document is the design constitution for every product built on the Knowledge Gardens engine — Builder's Knowledge Garden, orchids.theknowledgegardens.com, toxicology.theknowledgegardens.com, and every future domain.

It exists because traditional construction (and professional) software assumes the user is already trained. Knowledge Gardens does not. Our platform serves a 9-year-old dreaming of a treehouse, a first-day laborer, a veteran GC who has used Procore for 15 years, a design-savvy creative, a supplier, an equipment operator, a robot, and an AI agent — simultaneously. No user is a second-class citizen.

The constitution is ten goals. Every goal is phrased as a constraint, not an aspiration, so any design can be tested against it. If a design fails any one goal, the design is wrong, not the goal.

---

## The Ten Goals

### Goal 1 — Plain Language First, Pro Language Available

Every label, button, gate, and heading on every surface leads with a plain-English question or invitation that a 10-year-old, a first-day laborer, or a non-English-native professional can understand without prior knowledge. Technical and professional terminology is available as a secondary, quieter label for users who prefer it.

**Test:** If someone with no construction background read this screen cold, would they know what each thing does?

**Examples:**
- "Pre-Bid Risk Score" → **"Is this job worth bidding on?"** *(Pre-Bid Risk Score)*
- "AI Estimating Gate" → **"What might this cost to build?"** *(AI Estimating)*
- "CRM Client Lookup" → **"Who's asking, and what do I know about them?"** *(Client Lookup)*

The dual-label is not optional. It is the pattern. Pro users keep their vocabulary. Newcomers get invited in.

---

### Goal 2 — Emotional Sequencing Is the Default

Every multi-step flow is ordered to match the human emotional arc of that activity, not the operational workflow of a project manager. Professional users can toggle "pro order" to see the operational sequence, but the default — including what a first-time user sees — follows human emotion.

**Binding decision:** The Pro Toggle is visible on every screen. Not in settings. Not buried. Visible. We pay the real-estate cost because the visibility is itself a signal that the platform respects both audiences.

**Human arcs for the major flows:**

| Flow | Human Arc (default) | Pro / Ops Arc (toggled) |
|---|---|---|
| New Lead (SCOUT) | Curiosity → Possibility → Judgment | Risk → Estimate → Client |
| New Project (Dream → Build) | Inspiration → Clarity → Feasibility → Commitment | Scope → Budget → Schedule → Contract |
| Daily Field | What's the vibe today? → What matters most? → Who needs me? → What did we get done? | Safety brief → Schedule → Crew → Logs |
| Delivery | Show what we made → Walk the details → Hand over the keys → Stay connected | Punch list → Commissioning → As-builts → Warranty |

**This is a radical design choice.** Most construction software defaults to the ops arc because pros built it for pros. We explicitly say the human arc wins by default because we serve everyone. If we flinch on this later, the whole philosophy comes apart.

---

### Goal 3 — Invitation, Not Instruction

Every interactive element on every surface is phrased as an invitation to try something, not a directive to complete something. No "Required fields," no "Click here to continue," no "You must…" Every empty state is itself an active, friendly prompt that demonstrates the tool's use.

**Test:** Does this screen make the user feel invited, or does it make them feel tested?

**Corollary:** One primary action per view. Richness unfolds after the first tap. Game design 101 — you start with one button, you earn more.

---

### Goal 4 — Ambient Onboarding (Not Zero Onboarding)

There are no tutorials. No modal tours. No "welcome wizards." Onboarding is woven into the UI as ambient, just-in-time coaching:

- **First-use whisper** — one sentence near the element, dismissed with a tap, never shown again
- **Progressive disclosure** — advanced controls literally don't render until basics are done
- **Ask Anything** — always-available plain-language help, contextual to the current screen

The tool teaches itself through use. It never interrupts to teach.

---

### Goal 5 — Fearless Navigation (Time Machine)

Nothing is ever lost. Every action across every surface is undoable, with multi-step history that users can scrub backward through. Every started flow auto-saves as a draft. Every required field can be skipped and deferred. Breadcrumbs are not just navigation links — they are time-travel to exact previous states.

**Binding decision:** The Time Machine is platform infrastructure, not a feature. It lives underneath every surface. If built right once, every new surface inherits fearless navigation for free.

**Components:**
- **Universal undo stack** — platform-level, persisted, visible, scrub-able
- **Drafts Tray** — a persistent tray of unfinished work, one tap away
- **Skip-and-return** — any required field has "not now"; the tool reminds later
- **Stateful breadcrumbs** — breadcrumbs restore exact state, not just route

Fear of losing work is why people don't explore software. Kill the fear, unlock the exploration.

---

### Goal 6 — Designed for the Most Constrained User First

Every primary flow must work end-to-end with **voice only**, **single-tap only**, and **plain language only**. Keyboard shortcuts, dense data views, pro terminology, and batch operations are layered on top — never required. If a 9-year-old can't use it, it's not ready for the contractor either.

**Test:** Can a user who cannot read English finish this flow using only voice in their native language? If no, we haven't hit the bar.

---

### Goal 7 — Reusable Primitives, Platform-Wide

The design system consists of named, reusable primitives. Every Knowledge Gardens surface — every domain, every future product — composes itself from these primitives. We do not redesign surfaces. We design primitives, and surfaces are assemblies.

The seven primitives are listed in the **Primitives Manifest** below.

---

### Goal 8 — Machine-Legible Everything

AI agents are first-class users. Every primitive — every Invitation Card, every Emotional Arc step, every Whisper, every Time Machine action — exposes structured data that an agent can query, reason over, and act on via the MCP server and `llms.txt`.

A human sees an Invitation Card titled "Is this job worth bidding on?" An agent sees the same card as `{ type: "invitation_card", human_label: "Is this job worth bidding on?", pro_label: "Pre-Bid Risk Score", action: "score_bid_risk", lane_relevance: ["general_contractor", "specialty_contractor"] }`. Both are first-class renderings of the same primitive.

---

### Goal 9 — Voice Is Equal

Every primitive has a voice-first expression, not an afterthought. Voice input and voice output work across every product and every phase in 30+ languages. Voice is not a feature — it is how the platform breathes.

The voice expression of an Invitation Card is: the card's human label is speakable and the action is triggerable by voice. The voice expression of the Time Machine is: "undo that" and "take me back to when I picked the farmhouse" both work. The voice expression of Ask Anything is: speak the question, hear the answer.

---

### Goal 10 — All Eight Lanes, Always

Every surface welcomes every user type simultaneously:

- General Contractors
- DIY Builders
- Specialty Contractors
- Suppliers
- Equipment
- Service Providers
- Workers
- Robots / AI Agents

A GC and a worker looking at the same surface should both feel welcomed, even if the details each sees differ. Lane-specific information is surfaced through progressive reveal — not through locked-out sections.

---

## The Three Binding Decisions

These are the decisions we explicitly made during the session that locked the constitution. They are load-bearing and cannot be softened without reopening the constitution.

1. **The Pro Toggle is visible on every screen.** Not in settings. Not buried. Visible.
2. **The Time Machine is platform infrastructure.** Built once at the foundation; every surface inherits it for free. No surface may ship that violates it.
3. **The human arc is the default.** A first-time visitor sees the human sequence. Pros opt in, every time they want it, on whatever screen they're on.

---

## The Primitives Manifest

The design system consists of exactly seven primitives. Every Knowledge Gardens surface is assembled from these and only these. Adding a new primitive requires reopening the constitution.

| Primitive | What It Does |
|---|---|
| **Invitation Card** | One plain question, one primary action, optional pro subtitle, optional whisper |
| **Emotional Arc** | A sequenced flow with color, motion, and pacing matched to the user's emotional state |
| **Whisper** | A one-time, one-sentence self-introduction near an element on first encounter |
| **Time Machine** | Platform undo + stateful breadcrumbs + drafts tray + skip-and-return |
| **Ask Anything** | Always-available plain-language help, contextual to the current screen |
| **Pro Toggle** | A single visible switch that flips labels and order from human mode to pro mode |
| **Progressive Reveal** | Advanced controls materialize only after basic use is demonstrated |

Each primitive must be specified across six dimensions:

1. **Visual** — what it looks like
2. **Interaction** — how it behaves on tap, hover, long-press, keyboard
3. **Voice** — how it speaks and listens
4. **Machine-legible** — the structured data it exposes
5. **Pro Toggle behavior** — what changes when the toggle flips
6. **Time Machine behavior** — how it participates in undo, drafts, skip-and-return

Full primitive specs live in `docs/design-primitives.md` (to be written in the next working session).

---

## The Build Plan

### Phase A — Design the Seven Primitives

All seven primitives specified in one session. Output lives at `docs/design-primitives.md`. This is the reference every future session reads alongside the architecture doc.

### Phase B — Pilot in Three Places Simultaneously

Three pilots ship in parallel to stress-test whether the primitives really scale.

- **Pilot 1 — SCOUT (Killer App, red chrome).** The three gates become Invitation Cards in a curiosity → possibility → judgment arc. Pro Toggle top-right. Whispers on first use. Time Machine on every action.
- **Pilot 2 — Dream Machine Landing (warm/gold chrome).** The three-intent entry (Discover / Express / Upload) rebuilt as Invitation Cards, wired into the Time Machine.
- **Pilot 3 — A new clean surface built from zero.** Candidate: "First Lead" or "Morning Briefing." Built from primitives only, no legacy. The true test of whether primitives can birth a clean surface.

### Phase C — Extract and Codify

Components extracted into the shared UI library at `src/components/primitives/`. Structured-data exposure for Goal 8 wired in. Docs written to teach the pattern.

### Phase D — Instrument, Watch, Iterate

New telemetry specifically for constitution fitness:

- **Confusion signals** — rage clicks, rapid backtracks, abandoned flows, hover-without-click
- **Invitation acceptance rate** — did the user tap the primary action?
- **Pro Toggle usage** — who flips, where, how often?
- **Whisper dismissal pattern** — are whispers hitting at the right moment?
- **Time Machine usage** — are people actually undoing and exploring?

These feed a new RSI loop — **Loop #8, Design Constitution Fitness** — that surfaces which surfaces are failing which goals so we can fix them.

---

## How to Use This Document

1. At the start of every session, read this doc alongside `docs/architecture.md` and `tasks.todo.md`.
2. Before designing any new surface, state which primitives it composes from.
3. Before shipping any surface, walk the ten goals in order and confirm each is satisfied. If any fails, the surface is not ready.
4. When a design choice is ambiguous, the constitution breaks ties.
5. To change this document, a session must explicitly be scoped as a constitutional revision. Do not amend in passing.

---

## Canonical Palette (W8 lock — 2026-05-28 herbarium amendment)

The W8-locked names (Navy / Brass / Robin / Orange / Trace / Graphite / Faded Rule / Redline) are **preserved as semantic anchors**, but each now resolves to a herbarium-palette value drawn from the design system's hero plates. Use the W8 names in code — `var(--navy)`, `colors.brass` — and the herbarium shift propagates automatically.

**Heritage ground (always there, structural):**
- **Navy** `var(--navy)` → `var(--specimen-teal-deep)` (`#234C5A`) — Hero/ink, primary dark color for type and UI linework
- **Navy Deep** `var(--navy-deep)` → `var(--specimen-teal-deep)` (`#234C5A`) — Same target; no separate "deeper" in herbarium
- **Trace (paper)** `var(--trace)` → `var(--paper-edge)` (`#C9B98A`) — Hairlines, structural scaffolding
- **Graphite** `var(--graphite)` → `var(--ink-graphite)` (`#2A2620`) — Foreground ink, type, UI linework
- **Faded Rule** `var(--faded-rule)` → `var(--paper-edge)` (`#C9B98A`) — Heritage grids, hairlines

**Everyday warm accent:**
- **Brass** `var(--brass)` → `var(--specimen-brass)` (`#B08D5C`) — CTAs, emblem highlights, focus rings, cost/money metaphor

**Markup / alert:**
- **Redline** `var(--redline)` → `var(--specimen-rust)` (`#A53A2D`) — Error, edit, revision-cloud callouts. Now matches the canonical "danger" semantic in the design system.

**Peak pair (earned appearances only — never everyday chrome):**
- **Robin's Egg** `var(--robin)` → `var(--specimen-teal)` (`#3C7A8A`) — Verification, confirmation, "you are here," compass-path pulses. **Reserved for moment punctuation and verification states only.**
- **Deep Orange** `var(--orange)` → `var(--specimen-amber)` (`#C68A3D`) — Project close-out, ritual crown, peak-moment CTAs. The orange→amber shift was accepted in the 2026-05-27 lock; the warmth stays, the saturation softens to herbarium-appropriate gold.

**Binding rule:** Robin's Egg and Deep Orange are a **pair**, and they never sit next to brass in the same component. Brass does everyday warm; amber/orange does ceremonial warm. Robin's Egg is the only cool peak color — so when it appears, it means something.

**Implementation:** Tokens defined in `src/styles/tokens.css`. Aliases in `src/app/globals.css`. TypeScript constants in `src/design-system/tokens/colors.ts` mirror the same values for consumers that need JS access (e.g. `src/components/stage-shell/*`).

---

## Surfaces

BKG ships as four named surfaces under one umbrella, each with a signature accent pair so a builder can tell at a glance which surface they're in:

| Surface | What it does | Plate (in design system) | Signature accent |
|---|---|---|---|
| **Killer App** | What gets done today — instrumentation, dashboards, measurement | `assets/plates/chrome-killer-app.png` | `var(--specimen-teal)` + `var(--specimen-rust)` |
| **Dream Machine** | What gets imagined — generative, exploratory, what-if | `assets/plates/chrome-dream-machine.png` | `var(--specimen-brass)` + `var(--specimen-amber)` |
| **Knowledge Garden** | What gets remembered — knowledge base, lineage, lessons | `assets/plates/chrome-knowledge-garden.png` | `var(--specimen-sage)` |
| **Umbrella** | Cross-surface nav, account, settings | Composite of the three | `var(--ink-sepia)` on `var(--paper-cream)` |

A surface's chrome (header, accents, gauges) must lean on its signature accent pair. Body type and structural ink remain `--ink-graphite` / `--ink-sepia` across every surface.

---

## Brands

**Knowledge Gardens** is the umbrella. It owns two public brands and one operator entity:

- **Builder's Knowledge Garden (BKG)** — "The AI COO for construction." Live at `builders.theknowledgegardens.com`.
- **Knowledge Gardens — Orchids** — "A living library of orchid intelligence. 400 species, 69 genera." Live at `orchids.theknowledgegardens.com`. Uses a lighter "field-guide" treatment: Cormorant Garamond serif + Space Mono + deep teal `#1A5C5C` + copper `#B87333` on cream `#F5F0E8`.
- **XRWorkers** — the technology operator behind Knowledge Gardens.

Wordmark casing: dot-separated for sub-brands — `Builder's Knowledge Garden · Killer App`. Set in Archivo Black, sentence case.

---

## Vocabulary lock

- Use **MLP** (Minimal Lovable Product). **Never** "MVP." If anyone writes MVP in a doc, deck, or PR, fix it.
- Use **MTP** (Massively Transformational Purpose) in investor / vision copy.
- Em-dashes are welcomed and frequent. Exclamation points are banned from UI.
- Sentence case for every headline and button. Engineering labels are UPPERCASE with loose mono tracking.

---

## Antipatterns — explicitly do not generate

Mirrored from the design system README §9:

- Bento grids of glowing rounded squares
- Glassmorphism, frosted blurs, neon accents
- Generic gradient-mesh backgrounds (purple→pink, teal→indigo)
- Pure white `#FFFFFF` anywhere. Cream `#F2E9D2` is the default.
- Pure black `#000000`. Use `#2A2620` (`--ink-graphite`).
- Sans-serif-only typography stacks
- Material / Carbon / shadcn-default chrome with no customization
- 3D illustration sets (Notion-style, Spline-style)
- Heroicons / Lucide as the *primary* iconography (utility fallback only)
- Cards with a colored left-border accent and rounded corners ("AI tropes")
- Emoji decoration anywhere in UI chrome

If any output looks like generic Tailwind UI with a cream tint, the DNA has not been absorbed. Start over with `assets/plates/builders-hammer.png` pinned to the screen.

---

## Session of Record

This constitution was designed in the Chat session on April 16, 2026. The decisions recorded here — especially the three binding decisions and the W8 canonical palette lock — were made by the founder in that session. The constitution cannot be weakened without an explicit reopening by the founder.
