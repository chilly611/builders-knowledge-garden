# Animation Register

Stillness is the default. Motion is expensive and earns its cost at exactly four moments. No other animations.

## Core Principle

**Never auto-loop in production.** Professionals using this tool stare at it for 10+ hours a day. Decorative motion burns them out. Motion must mean something.

**Motion style:** Stroke-draw and graphite-dust dissolve. No bouncy easing. Prefer `cubic-bezier` curves that feel hand-drawn — slight overshoot on the settle, never spring-back.

---

## Moment 1: Compass First Load

**What happens:** Stage arcs and the river visualization draw themselves onto the canvas. The Compass workspace appears for the first time.

### Visual Language
- **Stroke-draw animation:** Blueprint linework curves drawing in, point-by-point
- **River visualization:** Budget/schedule/next-workflow connections flowing in, following a path
- Reveals the spatial structure of the project without a jarring "pop-in"

### Timing & Easing
- **Duration:** 3.0–3.5 seconds
- **Easing:** `cubic-bezier(0.4, 0.02, 0.2, 1)`  (hand-drawn, slight overshoot, settles smooth)
- **Single play:** Never loops

### CSS / SVG Implementation
```css
@keyframes draw {
  from { stroke-dashoffset: 160; }
  to { stroke-dashoffset: 0; }
}

.compass-arc {
  stroke-dasharray: 160;
  animation: draw 3.2s cubic-bezier(0.4, 0.02, 0.2, 1) forwards;
}
```

### Color
- Linework: `stroke: var(--graphite)` or `var(--navy)` (primary foreground color)
- River/flow: `stroke: var(--brass)` or `var(--robin)` depending on context (warm for regular, cool for affirmed)
- Optional glow/accent: `var(--brass)` at low opacity as a shimmer

### When It's Right
- User has just opened Compass, and the stage structure appears gracefully
- No flashing, no pop-in, just *appears* as if it was always there but hidden

---

## Moment 2: Workflow Completion

**What happens:** A workflow step or stage completes. Ripple effect flows downstream into the budget, schedule, and next-workflow visualization. Budget numbers update.

### Visual Language
- **Graphite-dust dissolve:** Small particles burst from the completion point, dissolving upward and outward
- **Ripple/wave propagation:** Subtle wave distortion through connected elements (budget pane, next-workflow card)
- **Optional text fade-in:** New numbers appear or values update in real-time

### Timing & Easing
- **Duration:** 2.6–2.8 seconds
- **Easing:** `ease-out` (particles slow as they rise and disappear)
- **Stagger:** If multiple particles, offset each by 0.3–0.4 seconds for a natural cascade

### CSS / SVG Implementation
```css
@keyframes dust {
  0% { opacity: 0; transform: translateY(4px); }
  30% { opacity: 0.9; }
  100% { opacity: 0; transform: translateY(-20px); }
}

.dust-particle {
  animation: dust 2.8s ease-out forwards;
}

.dust-particle:nth-child(2) { animation-delay: 0.3s; }
.dust-particle:nth-child(3) { animation-delay: 0.7s; }
.dust-particle:nth-child(4) { animation-delay: 1.1s; }
```

### Color
- Particles: `fill: var(--brass)` or `var(--graphite)` (warm for everyday completion, graphite for heritage feel)
- Optional accent particles: mix in `var(--robin)` or `var(--orange)` at low opacity for affirmation or celebration

### When It's Right
- User feels forward momentum without distraction
- Completion is *felt* more than watched
- Downstream effects (budget ripple) update as particles settle

---

## Moment 3: Project Close-Out Ritual

**What happens:** The project moves to complete/archived status. The tool-tree branch grows, the orrery halo unfurls, and a before/after image reveal shows the finished project.

### Visual Language
- **Tool-tree branch growth:** The logomark unfurls — canopy fills in, new branches appear, tape-measure wraps tighten
- **Orrery halo unfurl:** Concentric circles draw in around the tree; cardinal markers appear; guidelines radiate
- **Before/after image reveal:** Slide/dissolve transition showing project as planned vs. as-built
- **Crown accent:** Brief flash or glow in `var(--orange)` at the peak of the unfurl

### Timing & Easing (Sequence of Sub-Motions)

**Sub-motion 1: Tree branch growth**
- Duration: 1.2–1.5 seconds
- Easing: `cubic-bezier(0.4, 0.02, 0.2, 1)` (hand-drawn)
- Effect: Stroke-draw or opacity fade-in of new branches, slight wobble in line rendering

**Sub-motion 2: Orrery halo unfurl**
- Duration: 1.0–1.2 seconds (starts ~0.3–0.4s after tree begins)
- Easing: `cubic-bezier(0.4, 0.02, 0.2, 1)`
- Effect: Concentric circles appear one at a time (innermost first), cardinal text fades in, guidelines radiate outward

**Sub-motion 3: Before/after reveal**
- Duration: 0.8–1.2 seconds (overlaps with halo unfurl, or starts after)
- Easing: Smooth cubic, possibly linear for cross-fade
- Effect: Previous image slides/dissolves out; new image slides/dissolves in

**Total sequence:** 2.5–3.0 seconds end-to-end

### CSS / SVG Implementation

**Tree branch growth (stroke-draw):**
```css
@keyframes draw-tree {
  from { stroke-dashoffset: 200; }
  to { stroke-dashoffset: 0; }
}

.tree-branch {
  stroke-dasharray: 200;
  animation: draw-tree 1.4s cubic-bezier(0.4, 0.02, 0.2, 1) 0s forwards;
}
```

**Orrery unfurl (sequential circles):**
```css
@keyframes unfurl-circle {
  from { stroke-dashoffset: 100; opacity: 0; }
  to { stroke-dashoffset: 0; opacity: 1; }
}

.orrery-circle-1 { animation: unfurl-circle 1s cubic-bezier(0.4, 0.02, 0.2, 1) 0.3s forwards; }
.orrery-circle-2 { animation: unfurl-circle 1s cubic-bezier(0.4, 0.02, 0.2, 1) 0.5s forwards; }
.orrery-circle-3 { animation: unfurl-circle 1s cubic-bezier(0.4, 0.02, 0.2, 1) 0.7s forwards; }
```

**Before/after image cross-fade:**
```css
@keyframes cross-fade {
  0% { opacity: 0; }
  50% { opacity: 1; }
  100% { opacity: 1; }
}

.before-image { animation: fade-out 0.8s ease-out 1s forwards; }
.after-image { animation: fade-in 0.8s ease-out 1s forwards; }
```

### Color
- Tree branches: `stroke: var(--graphite)` or `var(--navy)` (primary draw color)
- Tape-measure wrap: `fill: var(--brass)` (stay bright)
- Orrery halo: `stroke: var(--graphite)` at high opacity (0.8–1.0)
- Orrery center point: `fill: var(--orange)` (celebration accent)
- Cardinal text: `fill: var(--graphite)` or faded
- Crown/celebration flash: brief `fill: var(--orange)` glow or accent stroke

### When It's Right
- The ritual feels *significant* — you're witnessing a project completion, not just closing a dialog
- Tree unfurl and halo appearance pair into a visual confirmation: "this is done"
- Before/after reveal lets the user see the arc of the work
- User feels closure and momentum forward

---

## Moment 4: Stage Transitions

**What happens:** User moves between workflow stages. Blueprint hairlines resolve (draw in) before new content arrives.

### Visual Language
- **Hairline resolve:** Blueprint grid or measurement lines draw in, creating a subtle transition
- **Foreground content fade:** Old content fades out as lines appear; new content fades in after lines settle
- Reads as a "page turn" in a blueprint or blueprint-rendered document

### Timing & Easing
- **Duration:** 0.6–1.0 seconds
- **Easing:** `cubic-bezier(0.4, 0.02, 0.2, 1)` or linear for hairline stroke
- **Single play:** Never loops

### CSS / SVG Implementation
```css
@keyframes resolve-line {
  from { stroke-dashoffset: 100; }
  to { stroke-dashoffset: 0; }
}

.blueprint-rule {
  stroke-dasharray: 100;
  stroke: var(--rule);
  stroke-width: 0.5;
  animation: resolve-line 0.8s cubic-bezier(0.4, 0.02, 0.2, 1) forwards;
}

@keyframes fade-content {
  0%, 20% { opacity: 0; }
  40%, 100% { opacity: 1; }
}

.stage-content {
  animation: fade-content 0.8s ease-out forwards;
  animation-delay: 0.2s;
}
```

### Color
- Hairlines: `stroke: var(--rule)` or `var(--graphite)` at 0.5px weight
- Content fade: standard text and element opacity (no special color)

### When It's Right
- User doesn't feel a jarring "page reload"; instead they see a smooth blueprint transition
- New stage content arrives *after* the visual frame has resolved
- Feels like turning a page in a drawn document

---

## What NOT to Animate

✅ **DO animate:**
- Compass first load (arc and river draw-in)
- Workflow completion (dust ripple downstream)
- Project close-out ritual (tree unfurl + orrery halo)
- Stage transitions (hairline resolve before content)

❌ **DON'T animate:**
- Hover states on buttons (instant, no motion)
- Focus rings (instant appearance)
- Form input focus (instant)
- Accordion open/close (instant toggle, or very short fade)
- Tooltip appearance (instant or fade, no bounce)
- Loading spinners (use a static icon or very subtle fade; no spinning)
- Background textures or grids (static only)
- Constant parallax or scroll-triggered motion (distracting for long sessions)

**Exception:** If you have a strong reason to animate something not in the four moments, check with design before shipping.

---

## Easing Curve Reference

**Hand-drawn, no bounce:**
```
cubic-bezier(0.4, 0.02, 0.2, 1)
```

This curve has:
- Fast start (0.4)
- Slight overshoot in the middle (0.02 control point)
- Smooth settle without spring-back (0.2 and final 1.0)
- Reads as "hand-drawn and intentional" rather than mechanical

**Alternative for very short animations (<0.5s):**
```
cubic-bezier(0.2, 0.02, 0.2, 1)
```

Flatter start, faster settle.

**For graphite-dust dissolve:**
```
ease-out
```

Particles naturally slow as they rise.

---

## Testing Motion

Before shipping:
1. **Play it 5 times in a row.** Does it feel tiring or celebratory?
2. **Disable motion (prefers-reduced-motion).** Does the UI still work and feel complete?
3. **Watch it at 2x speed.** Is it still readable, or does it feel rushed?
4. **Close your eyes, listen to any sound design.** Does the motion pair well with audio cues, if any?

If motion feels decorative or gets old after the second viewing, revisit the design.
