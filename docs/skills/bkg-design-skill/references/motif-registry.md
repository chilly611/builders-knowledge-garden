# Closed Motif Set Registry

Six motifs. No additions without trade-in.

## Motif 1: Tool-Tree

**The logomark.** Heritage-meets-emblem. Reads as a simple silhouette at favicon scale; unfurls into an engraved botanical at hero scale.

### Visual Language
- **Silhouette form:** Wrenches, pliers, dividers, calipers woven into a canopy at the top
- **Trunk:** Braided or chained, wrapped by a tape measure at the base
- **Roots:** Dissolve into graph-paper grid at the ground, fading to muted
- **Canopy edge:** Fades into blueprint linework at hero scale (16px favicon vs. 2000px wall-print should read as the same mark)

### When to Use
- Primary mark / wordmark / favicon
- Hero moments (splash page, close-out ritual reveal)
- Favicon, tab mark, app shell branding
- Never as a background texture or repeated pattern

### Color
- Monochrome primary: `var(--graphite)` or `var(--navy)`
- Interactive or celebratory states: add `var(--brass)` or `var(--orange)` as accent
- Never rendered in full color sprawl — keep it restrained

### Sizing
- Favicon: 16–32px (silhouette only, no detail required)
- Nav icon: 24px (silhouette, clear)
- Component accent: 40–80px (unfurl begins to show branches)
- Hero / splash: 240px+ (full botanical engraving detail visible)

---

## Motif 2: Engraved Drafting Instruments

**Dividers, protractors, curves, rulers — vintage line-engraving style.**

### Visual Language
- Thin, perfect linework (hairline to light weight)
- Compass/dividers: center point, two legs spreading
- Protractor: arc with degree marks, base line
- Curve/ruler: organic flowing edge
- All rendered in silhouette with fine detail

### When to Use
- Heritage layer background elements
- Divider lines between sections (decorative sub-rules)
- Margin annotations, measurement callouts
- Visual anchors in process diagrams
- Never as primary interactive elements

### Color & Opacity
- `stroke: var(--graphite)` at 0.3–0.5 opacity (faded, heritage feel)
- Or `stroke: var(--rule)` at 0.4–0.6 opacity (even lighter)
- Can be rendered as single-color fill for small emblems

### Sizing
- Small accent: 20–40px
- Divider element: 60–120px width × 1–2px height
- Background pattern: tiled at 15–20% opacity

---

## Motif 3: Blueprint Elevation Linework

**Structural ambience, transitions. The vocabulary of architectural blueprints rendered as wireframe elevations.**

### Visual Language
- Clean, geometric linework: rectangles (windows), horizontal/vertical rules (structure)
- Typically an elevation view of a building or structure
- Foundation baseline, upper sections, roof line
- Blueprint-style weight and opacity (hairline to light)

### When to Use
- Stage transition visual (blueprint lines resolve before content arrives)
- Section dividers between workflow stages
- Loading state animation (lines appear/resolve)
- Background texture / pattern in heritage layer
- Workflow diagram connectors

### Color & Opacity
- `stroke: var(--graphite)` or `var(--rule)` at 0.3–0.6 opacity
- Animated version: stroke-dash animation to "draw" the lines
- Faded background version: very light opacity (0.08–0.12)

### Sizing
- Divider strip: full width × 40–80px height
- Animated transition: 0.6–1s duration (see Animation Register)
- Pattern tile: repeating

---

## Motif 4: Graph-Paper Grid, Slightly Imperfect

**Primary background texture. Carries cultural memory.**

### Visual Language
- Regular grid of small dots (1–2px circles) with slight randomization
- Dual-layer approach: large grid (24px) + fine grid (6–8px) for depth
- Slight wobble or imperfection in placement (not mathematical precision)
- Reads as hand-drawn tracing paper, not algorithmic

### When to Use
- Primary background texture throughout the app
- Body background on light mode
- Default fill for cards, panes, containers
- Never use a pure geometric lattice (that codes sci-fi)

### Color & Opacity
- Foreground grid dots: `rgba(46, 46, 48, 0.08)` to `rgba(46, 46, 48, 0.12)` (graphite at low opacity)
- Can layer two grids at different scales and opacities for subtle depth

### Implementation
```css
background-image:
  radial-gradient(circle at 1px 1px, rgba(46, 46, 48, 0.09) 1px, transparent 1.5px),
  radial-gradient(circle at 1px 1px, rgba(46, 46, 48, 0.05) 1px, transparent 1.2px);
background-size: 24px 24px, 6px 6px;
background-position: 0 0, 0 0;
```

---

## Motif 5: Orrery / Annotated Halo

**Punctuation template for peak moments.** Concentric circles with cardinal markers (N/E/S/W), radiating guidelines, and a central point.

### Visual Language
- 3–4 concentric circles around a center point
- Cardinal directions marked (N at top, E/W at sides, etc.)
- Diagonal guidelines radiating outward
- Optional cross-hairs and annotation lines
- Reads as an astronomical instrument or compass rose

### When to Use
- Compass first-load animation (grows/draws in as stage arcs appear)
- Project close-out ritual reveal (unfurls around the tool-tree)
- Peak-moment punctuation (celebration, verification complete)
- Before/after image frame in close-out ritual
- Workflow completion halo

### Color & Opacity
- Foreground halo: `stroke: var(--graphite)` at 0.6–0.9 opacity
- Dark-mode halo: `stroke: var(--paper)` on `var(--navy)` background
- Center point: `fill: var(--brass)` or `var(--orange)` (accent highlight)
- Animation: stroke-draw with smooth easing, no loop

### Sizing
- Small accent: 60–80px diameter
- Feature halo: 120–200px diameter
- Hero reveal: 300px+ diameter

---

## Motif 6: Tower Crane Silhouette

**Recurring structural metaphor for active projects.** Clean vector silhouette of a tower crane (jib arm, mast, counterweight).

### Visual Language
- Simplified silhouette: vertical mast, horizontal jib, angled counterweight
- Reads clearly at 24–40px (favicon scale)
- Can be rendered with or without cabin detail
- No shading or gradient — solid fill or clean outline

### When to Use
- Active project indicators / badges
- Project status icon (active, in-progress, on-site)
- Recurring visual metaphor for "under construction" or "live work"
- Navigation icon for projects view
- Emphasis mark in process diagrams

### Color & Opacity
- Primary silhouette: `fill: var(--graphite)` or `fill: var(--navy)`
- Active/highlighted state: `fill: var(--brass)` or `fill: var(--orange)`
- Monochrome only — no color variation in the icon itself

### Sizing
- Icon size: 24–40px (standard nav/badge)
- Emphasis mark: 60–100px in diagrams
- Can be tiled / repeated as a pattern at low opacity for texture

---

## Trade-In Process

To add a seventh motif:

1. Identify which of the six above is least serving the system
2. Document the case for removal (e.g., "Tool-tree and tower crane now overlap; recommend retiring crane for new scaffolding-detail motif")
3. Commit both the removal and the addition in a single design move
4. Update this registry with the new motif and its removal date

**Do not accumulate unused motifs.** A closed set resists drift and keeps the aesthetic coherent across sessions and teams.

---

## Motif Usage Rules

### No Averaging
Don't mix all six in a single component. Pick the motif(s) that serve the moment:
- **Heritage backgrounds** → Engraved instruments + graph-paper grid
- **Transitions** → Blueprint elevation linework
- **Peak moments** → Orrery halo
- **Branding** → Tool-tree
- **Active/status indicators** → Tower crane

### No Algorithmic Noise
Heritage and engraved motifs must carry hand-drawn or craft-made feeling. Replace any pure geometric lattice with the slightly-imperfect graph-paper grid. No meshes, fractals, or Voronoi.

### Consistency Across Scales
Each motif should remain recognizable from favicon size to full-width hero. Simplify detail at small scales; add detail at large scales.

### Opacity & Layering
Heritage motifs often sit at 0.3–0.5 opacity underneath the foreground. Foreground motifs (tower crane as icon, tool-tree as mark) are full opacity. Peak-moment motifs (orrery halo) layer between heritage and foreground with medium opacity (0.6–0.8).
