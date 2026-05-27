---
name: bkg-design
description: "Use this skill WHENEVER the user asks to build, modify, style, or review ANY user-facing component, page, or visual element of the Builder's Knowledge Garden / killer app / bkg-repo project. This is the design system reference for every UI layer of the product. MANDATORY TRIGGERS: palette, color, logo, logomark, tool-tree, icon, motif, workflow UI, component, page, close-out, ritual, blueprint, heritage, moodboard, design system, typography, font, animation, motion, FAB, Compass, workflow-shell, StepCard, journey map, budget widget, polish, visual, aesthetic, brand. If you see ANY of these words in a user request about the app, or if you're about to touch any UI element, load this skill first."
---

# Builder's Knowledge Garden Design System

A three-layer aesthetic framework: heritage ground (engraved, timeless), functional foreground (clean, modern, legible), and moment punctuation (revelation at peak times). Palatable for anyone; mysterious for those who linger.

## Quick Reference: Color Tokens

| Token | Hex | Role | CSS Custom Property |
|-------|-----|------|---------------------|
| Blueprint Navy | `#1B3B5E` | Dark dominant, heritage fields | `--navy` |
| Trace Paper | `#F4F0E6` | Light ground, sheet color | `--paper` |
| Graphite | `#2E2E30` | Type, primary ink, linework | `--graphite` |
| Faded Rule | `#C9C3B3` | Heritage grid, hairlines, fades | `--rule` |
| Drafting Brass | `#B6873A` | Everyday warm, CTAs, focus | `--brass` |
| Redline | `#A1473A` | Error, edit, revision callouts | `--redline` |
| Robin's Egg | `#7FCFCB` | Peak pair: verify, affirm, navigable | `--robin` |
| Deep Orange | `#D9642E` | Peak pair: celebration, ritual | `--orange` |
| Navy Deep | `#0E2A47` | Splash, wordmark heritage moments | `--navy-deep` |

**Peak pair rule:** Robin's egg and deep orange are reserved for moment punctuation only. They never sit next to brass in the same component. Brass carries everyday warmth; orange carries ceremonial warmth.

## The Three Layers

### Layer 1: Heritage Ground
Always underneath. Engraved instruments, blueprint grids, catalog typography, graphite-on-trace diagrams. Slightly faded. The app feels like it arrived on top of something drawn by hand for a hundred years.

**Where it lives:** Background textures, subtle linework, architectural grids, typography references (Ames lettering as motif, not font).

### Layer 2: Functional Foreground
What the user actually touches. Restrained, modern, high-legibility. Clean type, generous whitespace, simplified emblems at silhouette fidelity. Never gatekeeps the dreamer; never condescends to the pro.

**Where it lives:** UI chrome, buttons, input fields, navigation, workflow scaffolding.

### Layer 3: Moment Punctuation
Where the weird earns its keep. Compass first load. Project close-out ritual. A workflow completing. Blueprint lines draw themselves. The tool-tree grows a branch. Orrery halos unfurl. Revelation, not decoration.

**When it appears:** Exactly four moments — see Animation Register below.

## Palette

**Everyday six** (carry all workflow chrome):
- Blueprint Navy `#1B3B5E`
- Trace Paper `#F4F0E6`
- Graphite `#2E2E30`
- Faded Rule `#C9C3B3`
- Drafting Brass `#B6873A`
- Redline `#A1473A`

**Peak pair** (earn their appearance — never in everyday chrome):
- Robin's Egg `#7FCFCB` — affirmation, verification, "you are here" states
- Deep Orange `#D9642E` — project close-out, ritual moments, celebration

**No cyberpunk chrome, no corporate teal, no SaaS purple.** Robin's egg reads as drafting-eraser chalk or architect's colored pencil — not tech-brand teal.

## Typography

Three voices, locked in:

- **Display / UI Sans:** Söhne (primary), fallback Untitled Sans. Functional modernist grotesque — presence without corporate cleanliness.
- **Mono for technical data:** Berkeley Mono (primary), fallback JetBrains Mono. Reads as instrument output, not code editor.
- **Archival display:** ABC Diatype or Canela Deck at hero moments only. Voice of close-out rituals, used sparingly.

Hand-lettered all-caps (Leroy/Ames architect's hand) is a **heritage motif**, not a font. Render as SVG callout or stamped element, never as live UI type.

## Linework Hierarchy

Clear weight progression:

- **Hairline (0.5px):** background grids, engravings, faded heritage
- **Light (1px):** structural chrome, UI borders
- **Medium (1.5–2px):** interactive affordances, interactive states
- **Bold (3px):** emblem outlines at small scale

Geometrically perfect lines in the foreground. Subtle hand-wobble in the heritage layer — true-geometry linework signals CAD, not craft.

## Closed Motif Set (Six Only — Add by Trade-In)

1. **Tool-tree** — the logomark. Heritage-meets-emblem. Silhouette-first at small scale, unfurls into engraved botanical at hero scale.
2. **Engraved drafting instruments** — dividers, protractors, curves, vintage-feeling line engraving style.
3. **Blueprint elevation linework** — structural ambience, transitions between workflow stages.
4. **Graph-paper grid, slightly imperfect** — primary background texture, carries cultural memory.
5. **Orrery / annotated halo** — punctuation template for peak moments (close-out, compass load, completion).
6. **Tower crane silhouette** — recurring structural metaphor for active projects.

**Anything not on this list requires a conscious trade-in.** When you want to add a new visual element, remove one from the set first.

## Texture Rules

Backgrounds must carry **cultural memory**. Pure geometric texture (dense lattice, tiled polygons, mesh gradients) codes sci-fi/NFT, not blueprint-warm. Avoid it.

Acceptable texture moves:
- Paper tooth, fiber, faint warp
- Coffee ring, pencil smudge, eraser shadow
- Registration cross-marks, trim marks, plan-stamp halos
- Graphite dust dispersion at edges

Digital noise allowed only if it reads as paper-grain noise, never as TV scanline artifact.

## Animation Register

Stillness is the default. Motion is expensive and earns its cost only at four moments:

### Moment 1: Compass First Load
**Effect:** Stroke-draw of stage arcs and the river visualization.
**Timing:** Smooth, hand-drawn `cubic-bezier(.4,.02,.2,1)`.
**Duration:** ~3–3.5 seconds. Never loop.

### Moment 2: Workflow Completion
**Effect:** Downstream ripple into budget/schedule/next-workflow visualization.
**Timing:** Graphite-dust dissolve, staggered particle burst.
**Duration:** ~2.8 seconds. Single play.

### Moment 3: Project Close-Out Ritual
**Effect:** Tool-tree branch grows. Orrery unfurls. Before/after image reveal.
**Timing:** Hand-drawn easing. Slight overshoot on settle, never spring-back.
**Duration:** Sequence of 1–2 seconds per sub-motion.

### Moment 4: Stage Transitions
**Effect:** Blueprint hairlines resolve before content arrives.
**Timing:** Light, quick stroke-draw.
**Duration:** ~0.6–1 second.

**Style rule:** No bouncy easing. Prefer `cubic-bezier` curves that feel hand-drawn. Never auto-loop in production. Pros hate decorative motion in tools they stare at for ten hours a day.

## Component Patterns

See `assets/preview.html` for live, component-level examples applying the system to itself. Every element in that preview demonstrates palette + linework + typography + motif + texture working together.

Key pattern: the workflow step card (StepCard) shows how to layer the heritage grid, foreground text, brass focus states, and optional budget ripple pane.

## Before You Code: Essential Checklist

- [ ] Read `references/moodboard.md` (full design commitment document)
- [ ] Use palette tokens **by name**, not by hex. `--navy`, `--brass`, `--robin` in CSS.
- [ ] Pick a **motif from the closed set of six**. Add only by trade-in.
- [ ] Pick an **animation from the four moments** if motion is needed. No others.
- [ ] Check **linework weight:** is this foreground (geometric, perfect) or heritage (subtle wobble)?
- [ ] Apply **texture rule:** does the background carry cultural memory, or is it sci-fi-coded?
- [ ] Test **contrast:** does type read at 14px? Does the layout respect generous whitespace?

## What to Resist

- Bright gradient scrapbooks (averages the peak pair with brass into a meaningless spectrum)
- Cyberpunk chrome, neon, or oversaturated colors
- Pure geometric or algorithmic textures (lattice, mesh, fractals, Voronoi)
- Typefaces that don't exist in the three-voice palette (no random Google Fonts)
- Animation on every interaction (stillness earns motion's power)
- Using robin's egg for everyday affordances (it means "something verified happened")
- Hand-lettered type as live DOM text (render as SVG stamped element only)
- Multiple logomarks or competing visual systems (tool-tree is the committed mark)

## References & Assets

- **`references/moodboard.md`** — Full design-moodboard-v1.md, the authoritative document. Read before pushing back on any commitment.
- **`references/palette-tokens.md`** — CSS custom property names, hex values, role map, and usage guidelines.
- **`references/motif-registry.md`** — The six motifs with usage rules and when to trade in.
- **`references/animation-register.md`** — Detailed specs for the four moments (timing curves, durations, motion style).
- **`references/close-out-ritual-spec.md`** — Placeholder: will be populated once the W5.E session produces the final close-out sequence spec.
- **`assets/preview.html`** — Living preview. Open in browser to see the system applied to itself. Component-level examples throughout.

## Why This Structure

This skill lives in the user's Claude config so every future agent (Cowork, Claude Code, any worktree) auto-loads it before touching UI. The three layers prevent averaging "mysterious" and "palatable" — they stack instead. The closed motif set resists visual drift. The peak pair (robin's egg + deep orange) earns revelation by being reserved. Motion appears only when it means something.
