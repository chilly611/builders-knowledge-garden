# Builder's Knowledge Garden — Design Moodboard v1

*Working document. Every section is a commitment you can push back on.*

## The brief

**Mysterious, eccentric deep cuts, combined with palatable for anyone — stacked in layers, never averaged.** A dreamer scrolling past sees clean and composed. A pro who lingers discovers the heritage beneath. At peak moments every user gets full revelation.

## The three-layer framework

**Heritage ground.** Always there, slightly faded, underneath everything. Engraved instruments, blueprint grids, catalog typography, graphite-on-trace diagrams. The app feels like it arrived on top of something drawn by hand for a hundred years. This is where the deep cuts live.

**Functional foreground.** What the user actually touches. Restrained, modern, high-legibility. Clean type, generous whitespace, simplified emblems at silhouette fidelity. Never gatekeeps the dreamer; never condescends to the pro.

**Moment punctuation.** Where the weird earns its keep. Compass first load, project close-out, a workflow completing. Blueprint lines draw themselves. The tool-tree grows a branch. Orrery halos unfurl. Revelation, not decoration.

## Palette

**Everyday six** (carry all workflow chrome):

| Role | Name | Hex | Use |
| --- | --- | --- | --- |
| Dominant dark | Blueprint navy | `#1B3B5E` | Heritage fields, dark-mode ground, primary ink (lightened from `#0E2A47` — reads as slightly faded blueprint scan, less aggressive) |
| Paper ground | Trace paper | `#F4F0E6` | Light-mode background, sheet color |
| Structural line | Graphite | `#2E2E30` | Type, UI linework, foreground ink |
| Fade line | Faded rule | `#C9C3B3` | Heritage grids, hairlines under foreground |
| Everyday warm | Drafting brass | `#B6873A` | CTAs, emblem highlights, focus rings, hover states |
| Markup alert | Redline | `#A1473A` | Error, edit, revision-cloud callouts — sparingly |

**Peak pair** (earn their appearance — never everyday chrome):

| Role | Name | Hex | Use |
| --- | --- | --- | --- |
| Verification cool | Robin's egg | `#7FCFCB` | Affirm, verify, "you are here," navigable-state indicator, compass-path pulses, quiet confirmation moments |
| Celebration warm | Deep orange | `#D9642E` | Project close-out, ritual crown, peak-moment ink on the tree animation, "something meaningful just happened" signal |

Rule: robin's egg and deep orange are a **pair**, reserved for moment punctuation and verification states. They never sit next to brass in the same component (that averages them into a gradient scrapbook). Brass does everyday warm; orange does ceremonial warm. Robin's egg is the only cool color in the system — so when it appears, it means something.

`#0E2A47` remains in the token set as `--navy-deep` for splash/wordmark-against-navy heritage moments. Dark-mode ground uses the lightened `#1B3B5E`.

No cyberpunk chrome, no corporate teal, no SaaS purple. Robin's egg reads as drafting-eraser chalk or architect's colored-pencil — not tech-brand teal.

## Linework

Clear hierarchy of weight:

- Hairline `0.5px` — background grid, engravings, faded heritage
- Light `1px` — structural chrome, UI borders
- Medium `1.5–2px` — interactive affordances
- Bold `3px` — emblem outlines at small scale

Geometrically perfect lines in the foreground. Subtle hand-wobble in the heritage layer — true-geometry linework dies on arrival in this context; it signals CAD, not craft.

## Typography

Three voices, no more. These are auditions to commit in v2.

**Display / UI sans:** Söhne (primary audition), fallback Untitled Sans. Functional modernist grotesque — has presence without corporate cleanliness.

**Mono for technical data:** Berkeley Mono (primary), fallback JetBrains Mono. Drafting-desk register — reads as instrument output, not code editor.

**Optional archival display:** ABC Diatype at display sizes, or (cautious pick) Canela Deck for hero moments only. Use sparingly; this is the voice of close-out rituals, not workflow chrome.

Hand-lettered all-caps (Leroy/Ames architect's-hand flavor) is a **heritage motif**, not a font — render as SVG callout or stamped element, not as live UI type.

## Core motifs (closed set — add only by replacement)

1. **Tool-tree** — the logomark. Heritage-meets-emblem.
2. **Engraved drafting instruments** (dividers, protractors, curves) — heritage texture, deep cuts.
3. **Blueprint elevation linework** — structural ambience, transitions.
4. **Graph-paper grid, slightly imperfect** — primary background texture.
5. **Orrery / annotated halo** — punctuation template for peak moments.
6. **Tower crane silhouette** — recurring structural metaphor for active projects.

Anything not on this list requires a conscious trade-in. Resist drift.

## Texture rules

Backgrounds must carry **cultural memory**. Pure geometric texture (dense lattice, tiled polygons, mesh gradients) is out — it codes sci-fi/NFT, not blueprint-warm.

Acceptable texture moves:

- Paper tooth, fiber, faint warp
- Coffee ring, pencil smudge, eraser shadow
- Registration cross-marks, trim marks, plan-stamp halos
- Graphite dust dispersion at edges

Digital noise allowed only if it reads as paper-grain noise, never as TV/scanline.

## Animation register

Stillness is the default. Motion is expensive.

Motion earns its cost only at four moments:

- **Compass first load** — stroke-draw of stage arcs and the $ river
- **Workflow completion** — downstream ripple into budget/schedule/next workflow
- **Project close-out** — the ritual: tool-tree branch grows, orrery unfurl, before/after reveal
- **Stage transitions** — blueprint hairlines resolve before content arrives

Motion style: stroke-draw and graphite-dust dissolve. No bouncy easing. Prefer `cubic-bezier` curves that feel hand-drawn — slight over-run on the settle, never spring-back. Never auto-loop. Pros hate decorative motion in tools they stare at for ten hours a day.

## Image triage — where each of your uploads goes

**Heritage ground (keep, recur often):**

- Vintage engraved divider (19th-century line engraving) — gold standard
- Brass protractor-ruler on gray
- Wooden vintage saw-plane hybrid (aged craft object)
- Thomas Mfg multi-tool — eccentric deep cut; strongest as occasional Easter egg
- Mid-century blueprint elevations — palette source
- Jobborn hammer catalog page — **reference only** (informs type and layout rhythm; doesn't appear as asset)

**Functional foreground (the quiet hero material):**

- Tower crane as clean vector silhouette — favicon / nav-glyph material
- Tower crane in fog photograph — hero image for "Active Projects" empty states
- Basswood architectural model with bare trees — one of the gentlest "palatable" images in the set; candidate hero for the landing surface

**Moment punctuation (special-use, earned):**

- Mandala / orrery — the visual grammar for close-out and Compass first-load
- AI pencil-sketched compass with annotation halo — loading state and workflow-transition template

**Logomark direction:**

- Tool-tree, but refactored: simple silhouette-first mark that *unfurls* into intricacy at hero scale. Current renders are too busy / too rusty. Target: leaves at the top fade into blueprint linework; roots dissolve into graph paper. Must read at 16px favicon and 2000px wall-print with the same identity.

**Out / replace:**

- Bright Genie boom lift — too catalog. Replace with hand-drawn equivalent or the dustier vintage orange-and-white lift.
- Bocat skid-steer — branding joke reads as parody. Cut.
- Hyper-dense isometric lattice — sci-fi-coded; no cultural memory. Replace with graph-paper-with-crumbs approach.
- Tool-cloud collage — reference value only; not a composition we use.
- "B" letterform from tools — strong as a concept but competes with the tool-tree as the mark. Reserve as a possible secondary wordmark element or dark-mode variant, not primary.

## The logomark, committed direction

A tool-tree that reads as a simple silhouette at favicon scale and *unfurls into an engraved botanical plate* at hero scale. Two modes of one mark.

- **Leaves:** wrenches, pliers, dividers, calipers fading into blueprint linework at the canopy edges
- **Trunk:** braided or chained, wrapped once by a tape measure at the base
- **Roots:** dissolve into graph-paper grid, faded to ground
- **Color:** monochrome primary; drafting-brass only on interactive or celebratory states

## Animation assets (uploaded MP4s)

Two tree-of-tools animations are in the uploads folder (`chillyprojects_A_tree_made_entirely_from_construction_tools_*.mp4`). Not yet reviewed. Next session: view them, triage against the animation register above, and commit to a specific close-out ritual sequence built from the motion that works.

## What this moodboard commits to (push back on any line)

1. Three layers (heritage / foreground / punctuation), not one flat aesthetic.
2. Blueprint navy + trace paper + graphite + one brass accent — no other colors without a fight.
3. Tool-tree as the logomark, refactored to silhouette-first with dissolve-to-blueprint unfurl.
4. Closed motif set of six. Additions by trade-in only.
5. Cultural-memory texture rule — no pure geometric backgrounds.
6. Stillness as default; motion at four specific moments only.

## What this moodboard isn't yet

- No audition of actual type specimens (next pass: live samples side by side).
- No concrete spec for the Compass close-out ritual — needs the MP4s reviewed.
- No component-level tokens yet — the `design-principles.md` skill doc is the next artifact after you sign off on this one.
- No vision-anchor treatment yet (the personalized end-of-journey image). Parked for its own pass.

## Next three moves, in order

1. **Sign off or push back** on the six commitments above. Red-pencil any you disagree with.
2. **Review the two tree-of-tools MP4s together** — commit to one as the close-out ritual template (or reject both and regenerate).
3. **Promote this doc into a `bkg-design` skill** so every future agent (Cowork, Claude Code, any worktree) auto-loads it before touching UI. That closes Thread 3 from our session plan.
