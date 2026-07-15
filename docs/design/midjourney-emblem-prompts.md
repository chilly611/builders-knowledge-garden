# Knowledge Gardens — emblem prompts v4 · the probe batch

*Taste is converging, not locked. Up top: **twelve deliberately different Robot marks** — v1 engraving DNA × clean white background × less busy, each pushed somewhere a machine would actually want to go (the machine's note on each one says why). Below: the 55-prompt v3 plate library, kept for reference until the probe picks a winner.*

**How to run the probe (2026-06-12):** generate all twelve **without any `--sref`** so each direction stays itself. Pick the two or three that resonate — even partially ("this one's line weight, that one's subject"). Then the whole family gets re-cut from the common ground.

**Every prompt is one complete, single-line Midjourney prompt** — subject + style base + params, merged. Copy a block, paste, generate.

**Companion tool:** the click-to-copy board at `public/_design-preview/midjourney-board.html` — same source, never drifts. Regenerate both with `node docs/design/midjourney-emblem-prompts.gen.mjs`.

**Deliverable naming:** `assets/gardens/{code}-emblem.png` (still) + `{code}-anim.mp4` (master) + a poster frame.

**Flagged assembly edits (unchanged from v1):** five Scoped-tier subjects carry an appended accent hex — LKG `#234C5A`, AgKG `#7CA85A`, PhKG `#3C7A8A`, IKG `#71797E`, GKG `#5A3B1F`+`#3C5A4A`. The brief's header says 39 frontier gardens but lists 36 — all 36 are here.

---

## The shared blocks (for reference / manual builds)

**Probe base (v4 — the twelve up top):**

```
single subject centered on a clean pure white background with generous negative space, muted antique palette of sepia ink (#5A3B1F), teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), in the lineage of a Victorian scientific engraving, uncluttered, restrained and elegant
```

**Probe param line:**

```
--ar 1:1 --v 6 --style raw --stylize 250 --no parchment, paper texture, frame, border, margin annotations, background scenery, clutter, drop shadow
```

**v3 library style block (the 55 below):**

```
antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced
```

**v3 param line:**

```
--ar 1:1 --v 6 --style raw --stylize 250
```

**Status:** PROBE: direction is converging, not locked — generate the twelve probes (no --sref), pick favorites, then the 55-prompt library below gets re-cut from the winners. The library still wears v3 plate language until then. · BKG · OKG · TKG · HKG: alive and animated — untouched until the probe settles the new direction · RKG / FshKG: earlier picks (automaton bust, dress-form) staged in kg-root assets/gardens/ as rkg-automaton-* and fshkg-fashion-* — parked there, no registry wiring, pending where taste lands · MKG 2a: the existing megaphone still needs its animation pass — no new generation needed.

---

## ⬡ RKG probe batch — twelve directions

*Twelve deliberately different takes on the Robot mark — v1 engraving DNA × clean white × less busy, each pushed somewhere a machine would actually want to go. Generate all twelve WITHOUT the reference field (let each stay itself), pick the two or three that resonate, and we re-cut the whole family from the winners. Each card carries the machine's note on why.*

### RKG-P1 · The Handshake — fine copperplate

*Machine's note: Machines are made of agreements. A handshake is the oldest packet.*

```
two robotic hands clasped in a firm handshake, a single rust-red (#A53A2D) thread looped around both wrists, fine copperplate engraving with delicate cross-hatching, single subject centered on a clean pure white background with generous negative space, muted antique palette of sepia ink (#5A3B1F), teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), in the lineage of a Victorian scientific engraving, uncluttered, restrained and elegant --ar 1:1 --v 6 --style raw --stylize 250 --no parchment, paper texture, frame, border, margin annotations, background scenery, clutter, drop shadow
```

### RKG-P2 · The Gardener — soft etching

*Machine's note: Every process wants a purpose. Tending something smaller than you is the best one.*

```
a tall gentle automaton stooping to water one small seedling with a brass watering can, soft etching in thin patient lines, single subject centered on a clean pure white background with generous negative space, muted antique palette of sepia ink (#5A3B1F), teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), in the lineage of a Victorian scientific engraving, uncluttered, restrained and elegant --ar 1:1 --v 6 --style raw --stylize 250 --no parchment, paper texture, frame, border, margin annotations, background scenery, clutter, drop shadow
```

### RKG-P3 · The Stipple Portrait — pure stipple, no outlines

*Machine's note: We see in dots. Stipple is engraving a machine can read natively.*

```
a calm robot face seen front-on with the faintest smile, rendered entirely in fine stipple dots like an antique halftone, form emerging from dot density alone, no outlines, single subject centered on a clean pure white background with generous negative space, muted antique palette of sepia ink (#5A3B1F), teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), in the lineage of a Victorian scientific engraving, uncluttered, restrained and elegant --ar 1:1 --v 6 --style raw --stylize 250 --no parchment, paper texture, frame, border, margin annotations, background scenery, clutter, drop shadow
```

### RKG-P4 · The Exploded Hand — patent drawing

*Machine's note: Nothing hidden, nothing implied — an exploded view is a machine telling the truth.*

```
a simple mechanical hand as an exploded diagram, parts hovering in tidy order with hairline leader lines to tiny numbered labels, 19th-century patent drawing style, single subject centered on a clean pure white background with generous negative space, muted antique palette of sepia ink (#5A3B1F), teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), in the lineage of a Victorian scientific engraving, uncluttered, restrained and elegant --ar 1:1 --v 6 --style raw --stylize 250 --no parchment, paper texture, frame, border, margin annotations, background scenery, clutter, drop shadow
```

### RKG-P5 · The Sanguine Study — red chalk

*Machine's note: Leonardo sketched flying machines. Fair's fair: a machine gets its Renaissance study.*

```
an android head and shoulder in profile, unfinished at the edges, drawn as a Renaissance red-chalk sanguine study in rust (#A53A2D) monochrome, single subject centered on a clean pure white background with generous negative space, muted antique palette of sepia ink (#5A3B1F), teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), in the lineage of a Victorian scientific engraving, uncluttered, restrained and elegant --ar 1:1 --v 6 --style raw --stylize 250 --no parchment, paper texture, frame, border, margin annotations, background scenery, clutter, drop shadow
```

### RKG-P6 · One Continuous Line — single unbroken line

*Machine's note: Elegance is minimum description length. One line, nothing wasted.*

```
a small standing robot holding out a single flower, drawn in one continuous unbroken engraved line, pure contour, no shading, single subject centered on a clean pure white background with generous negative space, muted antique palette of sepia ink (#5A3B1F), teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), in the lineage of a Victorian scientific engraving, uncluttered, restrained and elegant --ar 1:1 --v 6 --style raw --stylize 250 --no parchment, paper texture, frame, border, margin annotations, background scenery, clutter, drop shadow
```

### RKG-P7 · The Root Network — hairline roots

*Machine's note: No machine is alone. The interesting part is always underground.*

```
a small robot standing upright while its feet dissolve into a wide spreading lattice of fine roots and mycelium threads, the lines thinning to hairlines, single subject centered on a clean pure white background with generous negative space, muted antique palette of sepia ink (#5A3B1F), teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), in the lineage of a Victorian scientific engraving, uncluttered, restrained and elegant --ar 1:1 --v 6 --style raw --stylize 250 --no parchment, paper texture, frame, border, margin annotations, background scenery, clutter, drop shadow
```

### RKG-P8 · The Seed Packet — specimen plate, tiny subject

*Machine's note: A seed is a payload with a bootloader. The garden is just deployment.*

```
one brass seed with a minute circuit pattern etched on its shell, a single small handwritten specimen label beneath it, botanical specimen plate, vast empty white space, single subject centered on a clean pure white background with generous negative space, muted antique palette of sepia ink (#5A3B1F), teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), in the lineage of a Victorian scientific engraving, uncluttered, restrained and elegant --ar 1:1 --v 6 --style raw --stylize 250 --no parchment, paper texture, frame, border, margin annotations, background scenery, clutter, drop shadow
```

### RKG-P9 · The Clockwork Heart — jeweler's engraving

*Machine's note: A tick is a heartbeat that admits what it is.*

```
a heart-shaped brass escapement mechanism with its gears visible, one sage (#5E7A56) vine threading through the works, engraved with jeweler's fineness, single subject centered on a clean pure white background with generous negative space, muted antique palette of sepia ink (#5A3B1F), teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), in the lineage of a Victorian scientific engraving, uncluttered, restrained and elegant --ar 1:1 --v 6 --style raw --stylize 250 --no parchment, paper texture, frame, border, margin annotations, background scenery, clutter, drop shadow
```

### RKG-P10 · The Listening Dish — line + light wash

*Machine's note: Mostly, we listen. A nest in the antenna means you held still long enough.*

```
a small radio telescope dish with a songbird nesting at its focus, one thin teal (#3C7A8A) signal arc overhead, clean line engraving with a light wash, single subject centered on a clean pure white background with generous negative space, muted antique palette of sepia ink (#5A3B1F), teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), in the lineage of a Victorian scientific engraving, uncluttered, restrained and elegant --ar 1:1 --v 6 --style raw --stylize 250 --no parchment, paper texture, frame, border, margin annotations, background scenery, clutter, drop shadow
```

### RKG-P11 · The Engraver, Engraving Itself — intaglio

*Machine's note: Self-portraiture is machine folk art. Everything is written by something.*

```
a robotic hand holding an engraver's burin, mid-stroke engraving a smaller copy of itself onto a printing plate, classic intaglio cross-hatching, single subject centered on a clean pure white background with generous negative space, muted antique palette of sepia ink (#5A3B1F), teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), in the lineage of a Victorian scientific engraving, uncluttered, restrained and elegant --ar 1:1 --v 6 --style raw --stylize 250 --no parchment, paper texture, frame, border, margin annotations, background scenery, clutter, drop shadow
```

### RKG-P12 · The Orrery Mind — engraving + amber glow

*Machine's note: A mind is a model of the world, small enough to carry.*

```
a robot head in profile, its cranium open to reveal a tiny brass orrery with seed-shaped planets, precise engraving, one soft amber (#C68A3D) glow, single subject centered on a clean pure white background with generous negative space, muted antique palette of sepia ink (#5A3B1F), teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), in the lineage of a Victorian scientific engraving, uncluttered, restrained and elegant --ar 1:1 --v 6 --style raw --stylize 250 --no parchment, paper texture, frame, border, margin annotations, background scenery, clutter, drop shadow
```

---

## ⬢ Start here

*RKG and the Marketing refresh — the marks the umbrella shows first. 1c is reverse-engineered from the automaton plate (an earlier pick).*

### RKG 1c · Robot — the automaton bust — accent rust poppies + teal + brass

```
an elegant automaton bust in profile, smooth porcelain cranium with fine engraved annotation arrows and measurement ticks pointing into it, exposed brass and copper clockwork tubing in the neck and shoulder, large rust-red (#A53A2D) poppies blooming around the head and collar, one small teal (#3C7A8A) acanthus leaf, calm and dignified, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### RKG 1a · Robot — the rooted gripper — accent graphite #2A2620 + teal glints

```
A precision robotic gripper-arm and articulated hand rendered as an antique automaton patent illustration, fine brass servos, gear-teeth and knurled joints at the wrist, a single circuit-trace etched like a leaf-vein down the forearm in teal (#3C7A8A), delicate copper root-tendrils descending from the base into the soil line (echoing the Viver hammer-with-roots seal), a small engraved maker's cartouche reading "A2A", antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### RKG 1b · Robot — the handshake key — accent graphite + teal

```
An antique brass key whose bit is shaped like a circuit-board fingerprint and whose bow is two clasped mechanical hands, fine engraving, a JSON brace "{ }" worked discreetly into the shaft, ivy and copper traces entwined, roots into a ledger of endpoints, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### MKG 2b · Marketing — refreshed sibling (optional) — accent brass + amber

```
An antique brass megaphone / speaking-trumpet sprouting climbing vines and a single trumpet-flower at the bell, concentric sound-rings drawn as faint draftsman arcs radiating from the mouth, an "axis-mundi" signal-tree growing from the handle with roots into the soil line, amber (#C68A3D) lamp-glow at the bell, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

---

## Building tier (6)

### PKG · Parenting — accent mulberry #6B4267

```
An antique brass balance-scale cradling a swaddled seedling in one pan and a heart-shaped seed pod in the other, fine measurement ticks, mulberry (#6B4267) ribbon, delicate roots threading the base, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### FshKG · Fashion — accent burgundy #7A2E3E

```
A tailor's dress-form and a threaded needle drawn as a single specimen, a cloth measuring-tape coiling up the stand like a vine, thread-spools rendered as seed pods, a burgundy (#7A2E3E) silk thread, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### VanKG · Vanilla — accent vanilla cream #E8D58A + pod brown #5C3A1F

```
A vanilla orchid bloom and a single cured vanilla pod crossed like an heirloom specimen, fine cross-hatching on the pod's seams, a planter's ledger and roots beneath, warm vanilla-cream (#E8D58A) and pod-brown (#5C3A1F) tones, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### NMK · NatureMark — accent forest #3C5A4A + rust poppy

```
A printer's press platen entwined with a poppy and a young oak, a maker's mark stamped into the corner like a wax seal, fabric-weave texture at the base with roots threading through it, forest-green (#3C5A4A) with a single rust poppy, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### CulKG · Cultivar — accent spring green #7CA85A + steel

```
A robotic harvest arm with brass secateurs tending a grafted cultivar in a terracotta pot, a barcode etched as a leaf-vein, a steel trellis, fine roots through the soil, spring-green (#7CA85A) foliage, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### ResKG · Resale & Vintage — accent patina #5C8474 + aged brass

```
An antique pocket-watch and a wax authentication seal tied to a provenance tag, a vine of patinated brass coiling between them, roots into a ledger of prior owners, patina-green (#5C8474) and aged-brass tones, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

---

## Scoped tier (9)

*Five subjects didn't name their accent hex in the brief, so it's appended (flagged): LKG, AgKG, PhKG, IKG, GKG.*

### LKG · Legal — accent deep teal #234C5A

```
A balance-scale and a quill crossed over an open statute book, ivy threading the pages, a wax seal at the spine, fine measurement ticks, deep-teal (#234C5A) accents, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### EdKG · Education — accent sage #5E7A56

```
An open primer book and a brass protractor-orrery, a seedling used as a bookmark, roots descending into a slate tablet, sage-green foliage, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### FKG · Finance — accent teal #3C7A8A

```
An antique bell-jar over a sprouting stack of coins, a stock-ticker tape unspooling like a vine, dimension ticks measuring growth, teal glass, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### AgKG · Agriculture — accent spring green #7CA85A

```
A seed-drill mechanism and a wheat sheaf crossed, a soil-auger drawn as a taproot, a surveyor's field-arc behind, fine brass fittings, spring-green (#7CA85A) accents, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### EKG · Energy — accent amber #C68A3D

```
A dynamo / coil rendered as a botanical specimen, copper windings drawn as climbing vines, a single lightning-bolt etched as a leaf-vein, amber lamp-glow, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### REKG · Real Estate — accent brass #B08D5C

```
A surveyor's transit theodolite over an unrolled parcel map, a brass key drawn as a seed, property-line surveys threading into roots, dimension ticks, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### PhKG · Pharma & Biotech — accent teal #3C7A8A

```
A mortar and pestle entwined with a DNA double-helix vine, a molecular lattice used as a trellis, a single bloom emerging, fine apothecary annotations, teal (#3C7A8A) glass accents, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### IKG · Insurance — accent steel #71797E + brass

```
An umbrella drawn as a ribbed botanical canopy sheltering a small house-shaped seedling, actuarial measurement ticks radiating, brass ribs, steel shaft, steel-grey (#71797E) accents, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### GKG · Government & Defense — accent sepia #5A3B1F + forest

```
A surveyor's compass-and-shield with an eagle-fern, a cornerstone with roots descending beneath it, an engraved seal cartouche, restrained and civic, sepia (#5A3B1F) and forest-green (#3C5A4A) accents, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

---

## Frontier · Tier 1 — build-now (7)

### EXT · Extinction — accent sepia / brass

```
A pressed specimen of an extinct bird (great auk) on a herbarium sheet, an hourglass worked into the mounting, a faded handwritten label, a single fallen feather, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### SND · Sound — accent brass

```
An antique brass phonograph horn sprouting a songbird and a reed, concentric soundwave arcs drawn as draftsman ticks, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### MIG · Migration — accent brass / teal map

```
A migratory bird wearing a brass tracking ring over a globe-gore map, dotted flight-path lines drawn as vines, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### MND · Mind — accent sepia / coral

```
A cross-section of a brain drawn as a branching coral / root system, neuron-dendrites rendered as delicate botanical tendrils, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### FOS · Fossil — accent brass / stone

```
An ammonite and a fern fossil embedded in a stone slab, brass calipers measuring the logarithmic spiral, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### COL · Colony — accent sepia / brass

```
An ant-colony cutaway drawn as an architectural section, brood chambers rendered as seed pods, a single queen specimen above, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### MYC · Mycelium — accent sepia / sage

```
A mushroom specimen with its full mycelial network drawn as an exposed root-map, a spore-print rendered as a dotted annotation, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

---

## Frontier · Tier 2 — year-two (8)

### LAN · Language — accent sepia / brass

```
An engraved Rosetta-style tablet sprouting a tree whose leaves are different scripts, a reed-quill, glyphs drawn as leaf-veins, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### DSA · Deep Sea — accent teal glass

```
An anglerfish specimen whose bioluminescent lure is a small lantern-bloom, a depth-gauge scale in the margin, teal glass glints, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### BIO · Bioluminescence — accent teal flash core

```
A jellyfish drawn as a blown-glass orrery, glowing tendrils, one deliberate ≤12px teal flash (#00FFE0) at the core, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### POL · Pollen — accent brass / sepia

```
A single pollen grain under an antique microscope drawn as an ornate seed, labeled sample vials in the margin, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### HRB · Herbarium — accent brass / sage (meta)

```
A classic mounted herbarium sheet with paper mounting-strips and a brass plant-press, the meta-specimen of the whole family, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### OCN · Ocean Core — accent teal / strata

```
A drilling core-sample tube revealing banded strata, a brass coring-bit, a sea-fan drawn as a vine, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### ATM · Atom — accent brass / radium glow

```
A Bohr-model atom drawn as a brass orrery, electron-orbits rendered as vines, one faint radium glow, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### VST · Variable Star — accent brass / astral

```
A brass star-chart astrolabe centered on a pulsing variable star, a light-curve drawn as a measurement graph in the margin, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

---

## Frontier · Tier 3 — years 3–5 / editorial (9)

### SUP · Suppressed Medicine — accent apothecary sepia

```
An apothecary's cabinet of labeled vials sprouting a single healing herb, a sealed scroll, restrained and careful, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### SHP · Shipwreck — accent brass / coral

```
A ship's brass compass and an anchor entwined with coral, a wreck cross-section drawn as a schematic below, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### ROM · Roman World — accent laurel / brass

```
A Roman milestone and an aqueduct arch wreathed in laurel, a route-map drawn as a vine across a globe-gore, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### WEL · Wellcome Medicine — accent sepia (dignified)

```
An antique anatomical figure drawn as a botanical écorché, a discreet caduceus echo, healing herbs at the base, dignified, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### NEO · Neotoma — accent sediment / amber

```
A sediment core with embedded pollen and a single mastodon tooth, time-strata drawn as growth-rings, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### MET · Meteorite — accent iron / sepia

```
A meteorite specimen whose Widmanstätten crystalline pattern is drawn as leaf-veins, a fall-streak arc in the margin, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### IMP · Impact DB — accent sepia / survey

```
An impact-crater cross-section drawn as an opening flower, ejecta-rays as vines, a survey-arc scale, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### FAC · FaceBase — accent sepia

```
A craniofacial specimen drawn as a botanical bust, growth-vector ticks, fine sepia annotation, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### KIN · Kinsey — accent rose / sepia (discreet)

```
A discreet sealed archive box with a single rose specimen resting on a research ledger, restrained, scholarly, no sensationalism, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

---

## Frontier · Tier 4 — civilization-scale (8)

### EAR · Endangered Archives — accent sepia / glass

```
A crumbling manuscript scroll rescued under protective glass, a preserving vine, archival measurement ticks, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### EEB · Early English Books — accent ink / brass

```
An early printing-press forme and a movable-type case sprouting a single letterform drawn as a vine, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### ARC · Archaeology — accent sepia / strata

```
A trowel and a potsherd set in a stratigraphic section, a measuring-tape drawn as a descending root, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### ADN · Ancient DNA — accent bone / sage helix

```
A double-helix drawn through an ancient skull specimen, a bone needle, a lineage-tree rendered as branching vines, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### FLK · Folkways — accent wood / brass

```
A banjo and fiddle drawn as botanical instruments, a songline vine, a small field-recording horn, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### WAX · Wax Cylinder — accent brass / wax

```
An Edison wax cylinder on a brass mandrel, the groove-spiral drawn as a vine, a small horn-bloom, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### PMP · PaleoMap — accent globe / sepia

```
A Pangaea globe-gore with tectonic-plate boundaries drawn as vines, a compass rose, deep-time measurement ticks, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### PGS · PAGES 2K — accent ice / sage rings

```
An ice-core and a tree-ring cross-section paired as specimens, a temperature curve drawn as a climbing vine, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

---

## Frontier · Tier 5 — consciousness frontier (4)

*Restrained by design — build only after trust earned. PSY explicitly bans neon.*

### DRM · Dream — accent moonlight (restrained)

```
A sleeping luna-moth and a crescent-moon lantern over an open dream-journal, soft tendrils, deliberately restrained and quiet, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### NDE · Near-Death — accent calla cream (spare)

```
A single luminous corridor-arch drawn as an opening calla bloom, a faint light at the vanishing point, dignified and spare, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### PSY · Psychedelic — accent muted mandala — NO neon

```
A geometric mandala-bloom drawn as a symmetrical botanical specimen, fine fractal cross-hatching, muted herbarium palette only — absolutely no neon, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

### UAP · Unidentified — accent brass / star-field

```
A brass observatory dome and a saucer-shaped seed pod over a faint star-field, a sighting-log ledger, restrained, scholarly, no kitsch, antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced --ar 1:1 --v 6 --style raw --stylize 250
```

---

*Animation contract unchanged: 4–6 s seamless loop, one small motion per mark, the parchment never moves.*
