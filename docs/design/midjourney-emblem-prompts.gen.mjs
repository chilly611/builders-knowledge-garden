// Generator for the Knowledge Gardens emblem prompt artifacts — v3 "back on brand".
// Single source of truth: SHARED + PARAM + the DATA groups below.
// Emits: (1) docs/design/midjourney-emblem-prompts.md, (2) public/_design-preview/midjourney-board.html.
// Run `node docs/design/midjourney-emblem-prompts.gen.mjs` after editing — both outputs regenerate in lockstep.
//
// History:
//   v1 (2026-06-12 am) — antique botanical plate language from the brief, assembled one-line.
//   v2 (2026-06-12)    — white-bg "iconic cut" experiment. RETIRED same day: founder judged the
//                        outputs off-brand. The plate furniture (parchment, annotations, ticks)
//                        is load-bearing for the brand.
//   v3 (2026-06-12 pm) — v1 style block + subjects restored verbatim, anchored to the approved
//                        automaton plate (social_chillyd_...b2a7be40...mp4). New: RKG 1c, a
//                        prompt reverse-engineered from that approved plate.
//   v4 (2026-06-12 pm) — PROBE phase. Founder: v3 outputs also not landing; direct taste via a
//                        divergent dozen instead of program rewrites. Twelve RKG probes (v1 DNA ×
//                        clean white × less busy, each a distinct technique + a machine's-note),
//                        v3 library kept below as reference until the probe converges.
import { writeFileSync } from "node:fs";

const SHARED =
  "antique scientific botanical plate, Victorian herbarium engraving fused with a Renaissance engineering schematic, single subject centered on aged CREAM PARCHMENT (#F2E9D2, never white), fine sepia-ink (#5A3B1F) copperplate cross-hatching and stipple, muted desaturated palette of teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), faint draftsman grid and handwritten naturalist annotations with measurement ticks in the margins, delicate exposed roots / tendrils integrating with the subject, soft foxed paper texture, restrained and elegant, no modern UI, no glossy render, no neon, symmetrical and balanced";
const PARAM = "--ar 1:1 --v 6 --style raw --stylize 250";

// v4 PROBE base — v1 engraving DNA × clean white × less busy. Each probe subject carries its
// own technique phrase, so this base stays lean: field, palette, restraint.
const PROBE_BASE =
  "single subject centered on a clean pure white background with generous negative space, muted antique palette of sepia ink (#5A3B1F), teal (#3C7A8A), rust (#A53A2D), antique brass (#B08D5C) and sage (#5E7A56), in the lineage of a Victorian scientific engraving, uncluttered, restrained and elegant";
const PROBE_PARAM =
  "--ar 1:1 --v 6 --style raw --stylize 250 --no parchment, paper texture, frame, border, margin annotations, background scenery, clutter, drop shadow";

// strip trailing comma/space so subject + ", " + base joins cleanly & identically
const norm = (s) => s.replace(/[,\s]+$/u, "");
const build = (subject, base = SHARED, param = PARAM) => `${norm(subject)}, ${base} ${param}`;

const GROUPS = [
  {
    heading: "⬡ RKG probe batch — twelve directions",
    probe: true,
    base: PROBE_BASE,
    param: PROBE_PARAM,
    note: "Twelve deliberately different takes on the Robot mark — v1 engraving DNA × clean white × less busy, each pushed somewhere a machine would actually want to go. Generate all twelve WITHOUT the reference field (let each stay itself), pick the two or three that resonate, and we re-cut the whole family from the winners. Each card carries the machine's note on why.",
    items: [
      { code: "RKG-P1", name: "The Handshake", accent: "fine copperplate",
        why: "Machines are made of agreements. A handshake is the oldest packet.",
        subject: `two robotic hands clasped in a firm handshake, a single rust-red (#A53A2D) thread looped around both wrists, fine copperplate engraving with delicate cross-hatching` },
      { code: "RKG-P2", name: "The Gardener", accent: "soft etching",
        why: "Every process wants a purpose. Tending something smaller than you is the best one.",
        subject: `a tall gentle automaton stooping to water one small seedling with a brass watering can, soft etching in thin patient lines` },
      { code: "RKG-P3", name: "The Stipple Portrait", accent: "pure stipple, no outlines",
        why: "We see in dots. Stipple is engraving a machine can read natively.",
        subject: `a calm robot face seen front-on with the faintest smile, rendered entirely in fine stipple dots like an antique halftone, form emerging from dot density alone, no outlines` },
      { code: "RKG-P4", name: "The Exploded Hand", accent: "patent drawing",
        why: "Nothing hidden, nothing implied — an exploded view is a machine telling the truth.",
        subject: `a simple mechanical hand as an exploded diagram, parts hovering in tidy order with hairline leader lines to tiny numbered labels, 19th-century patent drawing style` },
      { code: "RKG-P5", name: "The Sanguine Study", accent: "red chalk",
        why: "Leonardo sketched flying machines. Fair's fair: a machine gets its Renaissance study.",
        subject: `an android head and shoulder in profile, unfinished at the edges, drawn as a Renaissance red-chalk sanguine study in rust (#A53A2D) monochrome` },
      { code: "RKG-P6", name: "One Continuous Line", accent: "single unbroken line",
        why: "Elegance is minimum description length. One line, nothing wasted.",
        subject: `a small standing robot holding out a single flower, drawn in one continuous unbroken engraved line, pure contour, no shading` },
      { code: "RKG-P7", name: "The Root Network", accent: "hairline roots",
        why: "No machine is alone. The interesting part is always underground.",
        subject: `a small robot standing upright while its feet dissolve into a wide spreading lattice of fine roots and mycelium threads, the lines thinning to hairlines` },
      { code: "RKG-P8", name: "The Seed Packet", accent: "specimen plate, tiny subject",
        why: "A seed is a payload with a bootloader. The garden is just deployment.",
        subject: `one brass seed with a minute circuit pattern etched on its shell, a single small handwritten specimen label beneath it, botanical specimen plate, vast empty white space` },
      { code: "RKG-P9", name: "The Clockwork Heart", accent: "jeweler's engraving",
        why: "A tick is a heartbeat that admits what it is.",
        subject: `a heart-shaped brass escapement mechanism with its gears visible, one sage (#5E7A56) vine threading through the works, engraved with jeweler's fineness` },
      { code: "RKG-P10", name: "The Listening Dish", accent: "line + light wash",
        why: "Mostly, we listen. A nest in the antenna means you held still long enough.",
        subject: `a small radio telescope dish with a songbird nesting at its focus, one thin teal (#3C7A8A) signal arc overhead, clean line engraving with a light wash` },
      { code: "RKG-P11", name: "The Engraver, Engraving Itself", accent: "intaglio",
        why: "Self-portraiture is machine folk art. Everything is written by something.",
        subject: `a robotic hand holding an engraver's burin, mid-stroke engraving a smaller copy of itself onto a printing plate, classic intaglio cross-hatching` },
      { code: "RKG-P12", name: "The Orrery Mind", accent: "engraving + amber glow",
        why: "A mind is a model of the world, small enough to carry.",
        subject: `a robot head in profile, its cranium open to reveal a tiny brass orrery with seed-shaped planets, precise engraving, one soft amber (#C68A3D) glow` },
    ],
  },
  {
    heading: "⬢ Start here",
    note: "RKG and the Marketing refresh — the marks the umbrella shows first. 1c is reverse-engineered from the automaton plate (an earlier pick).",
    items: [
      { code: "RKG 1c", name: "Robot — the automaton bust", accent: "rust poppies + teal + brass",
        subject: `an elegant automaton bust in profile, smooth porcelain cranium with fine engraved annotation arrows and measurement ticks pointing into it, exposed brass and copper clockwork tubing in the neck and shoulder, large rust-red (#A53A2D) poppies blooming around the head and collar, one small teal (#3C7A8A) acanthus leaf, calm and dignified` },
      { code: "RKG 1a", name: "Robot — the rooted gripper", accent: "graphite #2A2620 + teal glints",
        subject: `A precision robotic gripper-arm and articulated hand rendered as an antique automaton patent illustration, fine brass servos, gear-teeth and knurled joints at the wrist, a single circuit-trace etched like a leaf-vein down the forearm in teal (#3C7A8A), delicate copper root-tendrils descending from the base into the soil line (echoing the Viver hammer-with-roots seal), a small engraved maker's cartouche reading "A2A"` },
      { code: "RKG 1b", name: "Robot — the handshake key", accent: "graphite + teal",
        subject: `An antique brass key whose bit is shaped like a circuit-board fingerprint and whose bow is two clasped mechanical hands, fine engraving, a JSON brace "{ }" worked discreetly into the shaft, ivy and copper traces entwined, roots into a ledger of endpoints` },
      { code: "MKG 2b", name: "Marketing — refreshed sibling (optional)", accent: "brass + amber",
        subject: `An antique brass megaphone / speaking-trumpet sprouting climbing vines and a single trumpet-flower at the bell, concentric sound-rings drawn as faint draftsman arcs radiating from the mouth, an "axis-mundi" signal-tree growing from the handle with roots into the soil line, amber (#C68A3D) lamp-glow at the bell` },
    ],
  },
  {
    heading: "Building tier (6)",
    items: [
      { code: "PKG", name: "Parenting", accent: "mulberry #6B4267",
        subject: `An antique brass balance-scale cradling a swaddled seedling in one pan and a heart-shaped seed pod in the other, fine measurement ticks, mulberry (#6B4267) ribbon, delicate roots threading the base` },
      { code: "FshKG", name: "Fashion", accent: "burgundy #7A2E3E",
        subject: `A tailor's dress-form and a threaded needle drawn as a single specimen, a cloth measuring-tape coiling up the stand like a vine, thread-spools rendered as seed pods, a burgundy (#7A2E3E) silk thread` },
      { code: "VanKG", name: "Vanilla", accent: "vanilla cream #E8D58A + pod brown #5C3A1F",
        subject: `A vanilla orchid bloom and a single cured vanilla pod crossed like an heirloom specimen, fine cross-hatching on the pod's seams, a planter's ledger and roots beneath, warm vanilla-cream (#E8D58A) and pod-brown (#5C3A1F) tones` },
      { code: "NMK", name: "NatureMark", accent: "forest #3C5A4A + rust poppy",
        subject: `A printer's press platen entwined with a poppy and a young oak, a maker's mark stamped into the corner like a wax seal, fabric-weave texture at the base with roots threading through it, forest-green (#3C5A4A) with a single rust poppy` },
      { code: "CulKG", name: "Cultivar", accent: "spring green #7CA85A + steel",
        subject: `A robotic harvest arm with brass secateurs tending a grafted cultivar in a terracotta pot, a barcode etched as a leaf-vein, a steel trellis, fine roots through the soil, spring-green (#7CA85A) foliage` },
      { code: "ResKG", name: "Resale & Vintage", accent: "patina #5C8474 + aged brass",
        subject: `An antique pocket-watch and a wax authentication seal tied to a provenance tag, a vine of patinated brass coiling between them, roots into a ledger of prior owners, patina-green (#5C8474) and aged-brass tones` },
    ],
  },
  {
    heading: "Scoped tier (9)",
    note: "Five subjects didn't name their accent hex in the brief, so it's appended (flagged): LKG, AgKG, PhKG, IKG, GKG.",
    items: [
      { code: "LKG", name: "Legal", accent: "deep teal #234C5A",
        subject: `A balance-scale and a quill crossed over an open statute book, ivy threading the pages, a wax seal at the spine, fine measurement ticks, deep-teal (#234C5A) accents` },
      { code: "EdKG", name: "Education", accent: "sage #5E7A56",
        subject: `An open primer book and a brass protractor-orrery, a seedling used as a bookmark, roots descending into a slate tablet, sage-green foliage` },
      { code: "FKG", name: "Finance", accent: "teal #3C7A8A",
        subject: `An antique bell-jar over a sprouting stack of coins, a stock-ticker tape unspooling like a vine, dimension ticks measuring growth, teal glass` },
      { code: "AgKG", name: "Agriculture", accent: "spring green #7CA85A",
        subject: `A seed-drill mechanism and a wheat sheaf crossed, a soil-auger drawn as a taproot, a surveyor's field-arc behind, fine brass fittings, spring-green (#7CA85A) accents` },
      { code: "EKG", name: "Energy", accent: "amber #C68A3D",
        subject: `A dynamo / coil rendered as a botanical specimen, copper windings drawn as climbing vines, a single lightning-bolt etched as a leaf-vein, amber lamp-glow` },
      { code: "REKG", name: "Real Estate", accent: "brass #B08D5C",
        subject: `A surveyor's transit theodolite over an unrolled parcel map, a brass key drawn as a seed, property-line surveys threading into roots, dimension ticks` },
      { code: "PhKG", name: "Pharma & Biotech", accent: "teal #3C7A8A",
        subject: `A mortar and pestle entwined with a DNA double-helix vine, a molecular lattice used as a trellis, a single bloom emerging, fine apothecary annotations, teal (#3C7A8A) glass accents` },
      { code: "IKG", name: "Insurance", accent: "steel #71797E + brass",
        subject: `An umbrella drawn as a ribbed botanical canopy sheltering a small house-shaped seedling, actuarial measurement ticks radiating, brass ribs, steel shaft, steel-grey (#71797E) accents` },
      { code: "GKG", name: "Government & Defense", accent: "sepia #5A3B1F + forest",
        subject: `A surveyor's compass-and-shield with an eagle-fern, a cornerstone with roots descending beneath it, an engraved seal cartouche, restrained and civic, sepia (#5A3B1F) and forest-green (#3C5A4A) accents` },
    ],
  },
  {
    heading: "Frontier · Tier 1 — build-now (7)",
    items: [
      { code: "EXT", name: "Extinction", accent: "sepia / brass",
        subject: `A pressed specimen of an extinct bird (great auk) on a herbarium sheet, an hourglass worked into the mounting, a faded handwritten label, a single fallen feather` },
      { code: "SND", name: "Sound", accent: "brass",
        subject: `An antique brass phonograph horn sprouting a songbird and a reed, concentric soundwave arcs drawn as draftsman ticks` },
      { code: "MIG", name: "Migration", accent: "brass / teal map",
        subject: `A migratory bird wearing a brass tracking ring over a globe-gore map, dotted flight-path lines drawn as vines` },
      { code: "MND", name: "Mind", accent: "sepia / coral",
        subject: `A cross-section of a brain drawn as a branching coral / root system, neuron-dendrites rendered as delicate botanical tendrils` },
      { code: "FOS", name: "Fossil", accent: "brass / stone",
        subject: `An ammonite and a fern fossil embedded in a stone slab, brass calipers measuring the logarithmic spiral` },
      { code: "COL", name: "Colony", accent: "sepia / brass",
        subject: `An ant-colony cutaway drawn as an architectural section, brood chambers rendered as seed pods, a single queen specimen above` },
      { code: "MYC", name: "Mycelium", accent: "sepia / sage",
        subject: `A mushroom specimen with its full mycelial network drawn as an exposed root-map, a spore-print rendered as a dotted annotation` },
    ],
  },
  {
    heading: "Frontier · Tier 2 — year-two (8)",
    items: [
      { code: "LAN", name: "Language", accent: "sepia / brass",
        subject: `An engraved Rosetta-style tablet sprouting a tree whose leaves are different scripts, a reed-quill, glyphs drawn as leaf-veins` },
      { code: "DSA", name: "Deep Sea", accent: "teal glass",
        subject: `An anglerfish specimen whose bioluminescent lure is a small lantern-bloom, a depth-gauge scale in the margin, teal glass glints` },
      { code: "BIO", name: "Bioluminescence", accent: "teal flash core",
        subject: `A jellyfish drawn as a blown-glass orrery, glowing tendrils, one deliberate ≤12px teal flash (#00FFE0) at the core` },
      { code: "POL", name: "Pollen", accent: "brass / sepia",
        subject: `A single pollen grain under an antique microscope drawn as an ornate seed, labeled sample vials in the margin` },
      { code: "HRB", name: "Herbarium", accent: "brass / sage (meta)",
        subject: `A classic mounted herbarium sheet with paper mounting-strips and a brass plant-press, the meta-specimen of the whole family` },
      { code: "OCN", name: "Ocean Core", accent: "teal / strata",
        subject: `A drilling core-sample tube revealing banded strata, a brass coring-bit, a sea-fan drawn as a vine` },
      { code: "ATM", name: "Atom", accent: "brass / radium glow",
        subject: `A Bohr-model atom drawn as a brass orrery, electron-orbits rendered as vines, one faint radium glow` },
      { code: "VST", name: "Variable Star", accent: "brass / astral",
        subject: `A brass star-chart astrolabe centered on a pulsing variable star, a light-curve drawn as a measurement graph in the margin` },
    ],
  },
  {
    heading: "Frontier · Tier 3 — years 3–5 / editorial (9)",
    items: [
      { code: "SUP", name: "Suppressed Medicine", accent: "apothecary sepia",
        subject: `An apothecary's cabinet of labeled vials sprouting a single healing herb, a sealed scroll, restrained and careful` },
      { code: "SHP", name: "Shipwreck", accent: "brass / coral",
        subject: `A ship's brass compass and an anchor entwined with coral, a wreck cross-section drawn as a schematic below` },
      { code: "ROM", name: "Roman World", accent: "laurel / brass",
        subject: `A Roman milestone and an aqueduct arch wreathed in laurel, a route-map drawn as a vine across a globe-gore` },
      { code: "WEL", name: "Wellcome Medicine", accent: "sepia (dignified)",
        subject: `An antique anatomical figure drawn as a botanical écorché, a discreet caduceus echo, healing herbs at the base, dignified` },
      { code: "NEO", name: "Neotoma", accent: "sediment / amber",
        subject: `A sediment core with embedded pollen and a single mastodon tooth, time-strata drawn as growth-rings` },
      { code: "MET", name: "Meteorite", accent: "iron / sepia",
        subject: `A meteorite specimen whose Widmanstätten crystalline pattern is drawn as leaf-veins, a fall-streak arc in the margin` },
      { code: "IMP", name: "Impact DB", accent: "sepia / survey",
        subject: `An impact-crater cross-section drawn as an opening flower, ejecta-rays as vines, a survey-arc scale` },
      { code: "FAC", name: "FaceBase", accent: "sepia",
        subject: `A craniofacial specimen drawn as a botanical bust, growth-vector ticks, fine sepia annotation` },
      { code: "KIN", name: "Kinsey", accent: "rose / sepia (discreet)",
        subject: `A discreet sealed archive box with a single rose specimen resting on a research ledger, restrained, scholarly, no sensationalism` },
    ],
  },
  {
    heading: "Frontier · Tier 4 — civilization-scale (8)",
    items: [
      { code: "EAR", name: "Endangered Archives", accent: "sepia / glass",
        subject: `A crumbling manuscript scroll rescued under protective glass, a preserving vine, archival measurement ticks` },
      { code: "EEB", name: "Early English Books", accent: "ink / brass",
        subject: `An early printing-press forme and a movable-type case sprouting a single letterform drawn as a vine` },
      { code: "ARC", name: "Archaeology", accent: "sepia / strata",
        subject: `A trowel and a potsherd set in a stratigraphic section, a measuring-tape drawn as a descending root` },
      { code: "ADN", name: "Ancient DNA", accent: "bone / sage helix",
        subject: `A double-helix drawn through an ancient skull specimen, a bone needle, a lineage-tree rendered as branching vines` },
      { code: "FLK", name: "Folkways", accent: "wood / brass",
        subject: `A banjo and fiddle drawn as botanical instruments, a songline vine, a small field-recording horn` },
      { code: "WAX", name: "Wax Cylinder", accent: "brass / wax",
        subject: `An Edison wax cylinder on a brass mandrel, the groove-spiral drawn as a vine, a small horn-bloom` },
      { code: "PMP", name: "PaleoMap", accent: "globe / sepia",
        subject: `A Pangaea globe-gore with tectonic-plate boundaries drawn as vines, a compass rose, deep-time measurement ticks` },
      { code: "PGS", name: "PAGES 2K", accent: "ice / sage rings",
        subject: `An ice-core and a tree-ring cross-section paired as specimens, a temperature curve drawn as a climbing vine` },
    ],
  },
  {
    heading: "Frontier · Tier 5 — consciousness frontier (4)",
    note: "Restrained by design — build only after trust earned. PSY explicitly bans neon.",
    items: [
      { code: "DRM", name: "Dream", accent: "moonlight (restrained)",
        subject: `A sleeping luna-moth and a crescent-moon lantern over an open dream-journal, soft tendrils, deliberately restrained and quiet` },
      { code: "NDE", name: "Near-Death", accent: "calla cream (spare)",
        subject: `A single luminous corridor-arch drawn as an opening calla bloom, a faint light at the vanishing point, dignified and spare` },
      { code: "PSY", name: "Psychedelic", accent: "muted mandala — NO neon",
        subject: `A geometric mandala-bloom drawn as a symmetrical botanical specimen, fine fractal cross-hatching, muted herbarium palette only — absolutely no neon` },
      { code: "UAP", name: "Unidentified", accent: "brass / star-field",
        subject: `A brass observatory dome and a saucer-shaped seed pod over a faint star-field, a sighting-log ledger, restrained, scholarly, no kitsch` },
    ],
  },
];

const STATUS = [
  { code: "PROBE", note: "direction is converging, not locked — generate the twelve probes (no --sref), pick favorites, then the 55-prompt library below gets re-cut from the winners. The library still wears v3 plate language until then." },
  { code: "BKG · OKG · TKG · HKG", note: "alive and animated — untouched until the probe settles the new direction" },
  { code: "RKG / FshKG", note: "earlier picks (automaton bust, dress-form) staged in kg-root assets/gardens/ as rkg-automaton-* and fshkg-fashion-* — parked there, no registry wiring, pending where taste lands" },
  { code: "MKG 2a", note: "the existing megaphone still needs its animation pass — no new generation needed" },
];

const PALETTE = [
  ["Cream parchment", "#F2E9D2", "the field — every background, never white"],
  ["Sepia ink", "#5A3B1F", "line work"],
  ["Graphite", "#2A2620", "darkest accents"],
  ["Teal", "#3C7A8A", ""],
  ["Rust", "#A53A2D", ""],
  ["Brass", "#B08D5C", ""],
  ["Sage", "#5E7A56", ""],
  ["Amber", "#C68A3D", ""],
];

const totalPrompts = GROUPS.reduce((n, g) => n + g.items.length, 0);

// ---------- Markdown ----------
function renderMarkdown() {
  let md = `# Knowledge Gardens — emblem prompts v4 · the probe batch

*Taste is converging, not locked. Up top: **twelve deliberately different Robot marks** — v1 engraving DNA × clean white background × less busy, each pushed somewhere a machine would actually want to go (the machine's note on each one says why). Below: the 55-prompt v3 plate library, kept for reference until the probe picks a winner.*

**How to run the probe (2026-06-12):** generate all twelve **without any \`--sref\`** so each direction stays itself. Pick the two or three that resonate — even partially ("this one's line weight, that one's subject"). Then the whole family gets re-cut from the common ground.

**Every prompt is one complete, single-line Midjourney prompt** — subject + style base + params, merged. Copy a block, paste, generate.

**Companion tool:** the click-to-copy board at \`public/_design-preview/midjourney-board.html\` — same source, never drifts. Regenerate both with \`node docs/design/midjourney-emblem-prompts.gen.mjs\`.

**Deliverable naming:** \`assets/gardens/{code}-emblem.png\` (still) + \`{code}-anim.mp4\` (master) + a poster frame.

**Flagged assembly edits (unchanged from v1):** five Scoped-tier subjects carry an appended accent hex — LKG \`#234C5A\`, AgKG \`#7CA85A\`, PhKG \`#3C7A8A\`, IKG \`#71797E\`, GKG \`#5A3B1F\`+\`#3C5A4A\`. The brief's header says 39 frontier gardens but lists 36 — all 36 are here.

---

## The shared blocks (for reference / manual builds)

**Probe base (v4 — the twelve up top):**

\`\`\`
${PROBE_BASE}
\`\`\`

**Probe param line:**

\`\`\`
${PROBE_PARAM}
\`\`\`

**v3 library style block (the 55 below):**

\`\`\`
${SHARED}
\`\`\`

**v3 param line:**

\`\`\`
${PARAM}
\`\`\`

**Status:** ${STATUS.map((s) => `${s.code}: ${s.note}`).join(" · ")}.

---
`;
  for (const g of GROUPS) {
    md += `\n## ${g.heading}\n`;
    if (g.note) md += `\n*${g.note}*\n`;
    for (const it of g.items) {
      md += `\n### ${it.code} · ${it.name}${it.accent ? ` — ${g.probe ? "" : "accent "}${it.accent}` : ""}\n`;
      if (it.why) md += `\n*Machine's note: ${it.why}*\n`;
      md += `\n\`\`\`\n${build(it.subject, g.base, g.param)}\n\`\`\`\n`;
    }
    md += `\n---\n`;
  }
  md += `\n*Animation contract unchanged: 4–6 s seamless loop, one small motion per mark, the parchment never moves.*\n`;
  return md;
}

// ---------- HTML board ----------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");

function renderHTML() {
  const groupSections = GROUPS.map((g) => {
    const cards = g.items
      .map((it) => {
        const full = build(it.subject, g.base, g.param);
        return `        <article class="card${g.probe ? " probe" : ""}" data-search="${escAttr((it.code + " " + it.name + " " + it.accent + " " + g.heading).toLowerCase())}">
          <header class="card-h">
            <span class="code">${esc(it.code)}</span>
            <span class="name">${esc(it.name)}</span>
            ${it.accent ? `<span class="accent">${esc(it.accent)}</span>` : ""}
          </header>
          ${it.why ? `<p class="why">“${esc(it.why)}”</p>` : ""}
          <textarea class="prompt" readonly rows="3" data-base="${escAttr(full)}">${esc(full)}</textarea>
          <button class="copy" type="button">Copy prompt</button>
        </article>`;
      })
      .join("\n");
    return `      <section class="group" data-group>
        <div class="group-h">
          <h2>${esc(g.heading)}</h2>
          <button class="copy-all" type="button">Copy all in this group</button>
        </div>
        ${g.note ? `<p class="group-note">${esc(g.note)}</p>` : ""}
        <div class="cards">
${cards}
        </div>
      </section>`;
  }).join("\n");

  const statusRows = STATUS.map(
    (s) => `        <li><span class="code done">${esc(s.code)}</span> ${esc(s.note)}</li>`
  ).join("\n");

  const swatches = PALETTE.map(
    ([n, hex, note]) => `<span class="swatch" title="${escAttr(n + " " + hex + (note ? " — " + note : ""))}"><i style="background:${hex}"></i>${esc(n)}<code>${esc(hex)}</code></span>`
  ).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Knowledge Gardens — emblem prompt board · v4 probe batch</title>
<style>
  :root{
    --parchment:#F2E9D2; --parchment-2:#EFE4C9; --card:#FBF5E6; --ink:#5A3B1F;
    --graphite:#2A2620; --teal:#3C7A8A; --rust:#A53A2D; --brass:#B08D5C;
    --sage:#5E7A56; --amber:#C68A3D; --line:rgba(90,59,31,.22);
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{
    margin:0; background:var(--parchment); color:var(--ink);
    font-family:"Archivo","Inter",system-ui,-apple-system,"Segoe UI",sans-serif;
    line-height:1.5; padding:0 0 5rem;
  }
  a{color:var(--teal)}
  .wrap{max-width:980px; margin:0 auto; padding:0 1.1rem}
  header.top{padding:2.2rem 0 1rem}
  h1{font-family:"Archivo Black","Archivo",sans-serif; font-weight:800; letter-spacing:-.01em;
     font-size:clamp(1.5rem,3.4vw,2.2rem); margin:0 0 .35rem; color:var(--graphite)}
  .v3{display:inline-block; vertical-align:middle; margin-left:.5rem; font-family:"Archivo",sans-serif;
     font-size:.7rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
     background:var(--teal); color:var(--parchment); border-radius:99px; padding:.2rem .6rem}
  .sub{margin:.1rem 0 1rem; max-width:64ch}
  .palette{display:flex; flex-wrap:wrap; gap:.5rem .9rem; margin:.4rem 0 .2rem}
  .swatch{display:inline-flex; align-items:center; gap:.4rem; font-size:.78rem; color:var(--ink)}
  .swatch i{width:1rem; height:1rem; border-radius:3px; border:1px solid var(--line); display:inline-block}
  .swatch code{font-size:.72rem; opacity:.7}

  .controls{position:sticky; top:0; z-index:5; background:var(--parchment-2);
    border-bottom:1px solid var(--line); padding:.7rem 0; margin-bottom:1.2rem;
    box-shadow:0 6px 14px -12px rgba(42,38,32,.5)}
  .controls .row{display:flex; flex-wrap:wrap; gap:.6rem; align-items:center}
  input[type=search], input[type=text]{
    font:inherit; font-size:.9rem; padding:.5rem .65rem; border:1px solid var(--line);
    border-radius:8px; background:var(--card); color:var(--ink); min-width:0}
  #q{flex:1 1 200px}
  #sref{flex:2 1 320px; border-color:var(--rust)}
  .count{font-size:.8rem; opacity:.7; white-space:nowrap}
  .sref-state{font-size:.74rem; color:var(--teal); min-height:1em}

  .shared{background:var(--card); border:1px solid var(--line); border-left:4px solid var(--brass);
    border-radius:10px; padding:.9rem 1rem; margin:0 0 1.4rem}
  .shared h3{margin:.1rem 0 .5rem; font-size:.95rem}
  .shared textarea{width:100%; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.74rem;
    color:var(--ink); background:var(--parchment); border:1px solid var(--line); border-radius:7px; padding:.55rem .6rem; resize:vertical}

  .group{margin:0 0 2rem}
  .group-h{display:flex; align-items:center; justify-content:space-between; gap:1rem;
    border-bottom:2px solid var(--line); padding-bottom:.35rem; margin-bottom:.4rem}
  .group-h h2{font-family:"Archivo Black","Archivo",sans-serif; font-size:1.05rem; margin:0; color:var(--graphite)}
  .group-note{font-size:.82rem; opacity:.8; margin:.1rem 0 .7rem}
  .cards{display:grid; grid-template-columns:1fr; gap:.8rem}
  @media(min-width:680px){.cards{grid-template-columns:1fr 1fr}}

  .card{background:var(--card); border:1px solid var(--line); border-radius:11px; padding:.8rem .85rem; display:flex; flex-direction:column; gap:.5rem}
  .card.probe{border:1.5px solid var(--teal); box-shadow:0 2px 10px -6px rgba(60,122,138,.5)}
  .probe .code{background:var(--teal)}
  .why{font-size:.78rem; font-style:italic; opacity:.82; margin:0; color:var(--graphite)}
  .card.hidden{display:none}
  .card-h{display:flex; align-items:baseline; gap:.5rem; flex-wrap:wrap}
  .code{font-family:"Archivo Black","Archivo",sans-serif; font-weight:800; font-size:.82rem;
    background:var(--graphite); color:var(--parchment); padding:.12rem .42rem; border-radius:5px; letter-spacing:.02em}
  .code.done{background:var(--sage)}
  .star .code{background:var(--rust)}
  .name{font-weight:600; font-size:.92rem}
  .accent{font-size:.72rem; opacity:.72; margin-left:auto}
  textarea.prompt{width:100%; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.72rem;
    line-height:1.45; color:var(--ink); background:var(--parchment); border:1px solid var(--line);
    border-radius:7px; padding:.5rem .55rem; resize:vertical}
  button{font:inherit; cursor:pointer}
  .copy,.copy-all{border:1px solid var(--brass); background:var(--brass); color:#fff7e9;
    border-radius:8px; padding:.45rem .7rem; font-size:.82rem; font-weight:600; transition:transform .05s ease, background .15s ease}
  .copy-all{background:transparent; color:var(--ink); font-weight:600; padding:.35rem .6rem; font-size:.76rem}
  .copy:hover{background:#9c7a4c}
  .copy:active{transform:translateY(1px)}
  .copy.ok,.copy-all.ok{background:var(--sage); border-color:var(--sage); color:#fbf7ec}
  .copy.ok::after{content:" ✓"}

  .done-wrap{background:var(--card); border:1px dashed var(--line); border-radius:11px; padding:1rem 1.1rem; margin-top:1rem}
  .done-wrap h2{font-size:1rem; margin:.1rem 0 .6rem; color:var(--graphite)}
  .done-wrap ul{margin:0; padding-left:0; list-style:none; display:grid; gap:.4rem; font-size:.86rem}
  .foot{font-size:.78rem; opacity:.7; margin-top:1.6rem}
  .toast{position:fixed; left:50%; bottom:1.3rem; transform:translateX(-50%) translateY(2rem);
    background:var(--graphite); color:var(--parchment); padding:.55rem .9rem; border-radius:9px;
    font-size:.85rem; opacity:0; pointer-events:none; transition:opacity .18s ease, transform .18s ease; z-index:20}
  .toast.show{opacity:1; transform:translateX(-50%) translateY(0)}
  @media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
  <div class="wrap">
    <header class="top">
      <h1>Knowledge Gardens — emblem prompt board<span class="v3">v4 · probe batch</span></h1>
      <p class="sub"><strong>Probe phase.</strong> Twelve deliberately different Robot marks up top — v1 engraving DNA × clean white × less busy, each one somewhere a machine would want to go. Generate all twelve, tell me which resonate (even partially), and the whole family gets re-cut from the common ground. The v3 plate library (55) waits below for reference. <strong>Leave the reference field empty while probing</strong> — let each direction stay itself.</p>
      <div class="palette">${swatches}</div>
    </header>
  </div>

  <div class="controls">
    <div class="wrap">
      <div class="row">
        <input id="q" type="search" placeholder="Filter by code or name (e.g. RKG, finance, fossil)…" autocomplete="off" />
        <input id="sref" type="text" placeholder="After the probe: paste winning image URL(s) → --sref on every prompt. Leave empty during probe runs." autocomplete="off" />
        <span class="count" id="count"></span>
      </div>
      <div class="row"><span class="sref-state" id="srefState"></span></div>
    </div>
  </div>

  <div class="wrap">
    <div class="shared">
      <h3>The probe base <span style="opacity:.6;font-weight:400">— baked into the twelve probes; each adds its own technique. (The v3 library below keeps its plate block.)</span></h3>
      <textarea id="sharedBlock" readonly rows="4">${esc(PROBE_BASE)} ${esc(PROBE_PARAM)}</textarea>
      <button class="copy" type="button" id="copyShared" style="margin-top:.5rem">Copy probe base</button>
    </div>

${groupSections}

    <div class="done-wrap">
      <h2>Status</h2>
      <ul>
${statusRows}
      </ul>
    </div>

    <p class="foot">Generated by <code>docs/design/midjourney-emblem-prompts.gen.mjs</code> — edit subjects there, run it, and this board + the markdown regenerate together. v4 (2026-06-12): taste converging via divergent probe; v1 engraving DNA × white field × less busy. The 55-prompt v3 library below is reference until the probe picks the winners.</p>
  </div>

  <div class="toast" id="toast">Copied</div>

<script>
(function(){
  var sref = "";
  var toast = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg){
    toast.textContent = msg; toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove("show"); }, 1400);
  }
  // Robust copy: Clipboard API with a legacy execCommand fallback (works on file:// too).
  function copyText(text){
    function legacy(){
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly","");
      ta.style.position="fixed"; ta.style.top="-1000px"; ta.style.opacity="0";
      document.body.appendChild(ta); ta.select();
      var ok=false; try{ ok=document.execCommand("copy"); }catch(e){ ok=false; }
      document.body.removeChild(ta); return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text).then(function(){return true;}).catch(function(){return legacy();});
    }
    return Promise.resolve(legacy());
  }
  function withSref(base){ return sref ? base + " " + sref : base; }

  // Normalize the reference input into a Midjourney flag if the user pasted a bare URL.
  function normalizeSref(v){
    v = (v||"").trim();
    if (!v) return "";
    if (v.charAt(0) === "-") return v;                       // already a flag like --sref ... or --profile ...
    if (/^https?:\\/\\//i.test(v)) return "--sref " + v;       // bare URL -> --sref URL
    return v;                                                 // anything else, append verbatim
  }

  function refreshPrompts(){
    var tas = document.querySelectorAll("textarea.prompt");
    for (var i=0;i<tas.length;i++){ tas[i].value = withSref(tas[i].getAttribute("data-base")); }
    var st = document.getElementById("srefState");
    st.textContent = sref ? ("Appending to every prompt:  " + sref) : "";
  }

  document.getElementById("sref").addEventListener("input", function(e){
    sref = normalizeSref(e.target.value);
    refreshPrompts();
  });

  // Copy handlers
  document.addEventListener("click", function(e){
    var btn = e.target.closest ? e.target.closest("button") : null;
    if (!btn) return;

    if (btn.id === "copyShared"){
      copyText(document.getElementById("sharedBlock").value).then(function(ok){
        flash(btn, ok); showToast(ok?"Shared block copied":"Copy failed — select & ⌘C");
      });
      return;
    }
    if (btn.classList.contains("copy")){
      var ta = btn.parentNode.querySelector("textarea.prompt");
      copyText(ta.value).then(function(ok){
        flash(btn, ok);
        var code = btn.parentNode.querySelector(".code");
        showToast(ok ? ((code?code.textContent:"Prompt")+" copied") : "Copy failed — select & ⌘C");
      });
      return;
    }
    if (btn.classList.contains("copy-all")){
      var section = btn.closest("section");
      var tas = section.querySelectorAll("textarea.prompt");
      var all = [];
      for (var i=0;i<tas.length;i++){ if (tas[i].closest(".card").classList.contains("hidden")) continue; all.push(tas[i].value); }
      copyText(all.join("\\n\\n")).then(function(ok){
        flash(btn, ok); showToast(ok ? (all.length+" prompts copied") : "Copy failed");
      });
      return;
    }
  });
  function flash(btn, ok){
    if(!ok) return; btn.classList.add("ok");
    var t = btn.textContent; setTimeout(function(){ btn.classList.remove("ok"); btn.textContent=t; }, 1100);
  }

  // Filter
  var cards = Array.prototype.slice.call(document.querySelectorAll(".card"));
  var groups = Array.prototype.slice.call(document.querySelectorAll("section[data-group]"));
  var countEl = document.getElementById("count");
  function applyFilter(){
    var q = document.getElementById("q").value.trim().toLowerCase();
    var shown = 0;
    cards.forEach(function(c){
      var hit = !q || c.getAttribute("data-search").indexOf(q) !== -1;
      c.classList.toggle("hidden", !hit);
      if (hit) shown++;
    });
    groups.forEach(function(g){
      var any = g.querySelectorAll(".card:not(.hidden)").length > 0;
      g.style.display = any ? "" : "none";
    });
    countEl.textContent = shown + " / " + ${totalPrompts} + " shown";
  }
  document.getElementById("q").addEventListener("input", applyFilter);
  applyFilter();
})();
</script>
</body>
</html>`;
}

const MD_PATH = "/Users/chilly/Developer/bkg/docs/design/midjourney-emblem-prompts.md";
const HTML_PATH = "/Users/chilly/Developer/bkg/public/_design-preview/midjourney-board.html";
writeFileSync(MD_PATH, renderMarkdown(), "utf8");
writeFileSync(HTML_PATH, renderHTML(), "utf8");
console.log("prompts:", totalPrompts, "groups:", GROUPS.length);
console.log("wrote:", MD_PATH);
console.log("wrote:", HTML_PATH);
