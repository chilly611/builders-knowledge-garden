# Knowledge Gardens — Design System

> **Victorian botanical herbarium × Renaissance engineering schematic × modern operating system.**
>
> If a design choice would look at home in an 1880s botanical plate, a Leonardo codex page, **and** a 2026 production SaaS dashboard, it is on‑brand. If it could only live in one of those three, it is off‑brand.

This folder is the canonical design system for **Knowledge Gardens**, the two‑brand house behind the **Builder's Knowledge Garden** (BKG) construction OS and the **Orchids** botanical intelligence platform. Use it whenever you need to ship a screen, slide, mock, or asset that belongs to this product family.

---

## 1 · What's in here

```
.
├── README.md                ← you are here
├── SKILL.md                 ← compatible with Agent Skills / Claude Code
├── colors_and_type.css      ← drop-in CSS tokens + semantic tag styles
├── assets/
│   ├── plates/              ← the four canonical hero plates (DNA)
│   ├── logo/                ← BKG "B" marks + favicons + OG cards
│   ├── journey/             ← scene/journey-stage photography
│   └── imagery/             ← supporting brand photography
├── fonts/                   ← (loaded from Google Fonts — see notes)
├── preview/                 ← cards rendered in the Design System tab
├── ui_kits/
│   ├── builders-knowledge-garden/   ← BKG (construction OS) UI kit
│   └── orchids/                     ← Orchids (botanical) UI kit
└── slides/                  ← (none — no slide template provided)
```

---

## 2 · The brands & products

**Knowledge Gardens** is the umbrella. It owns two public brands and several internal surfaces.

| Surface | What it is | Visual anchor |
|---|---|---|
| **Builder's Knowledge Garden** (BKG) | *"The AI COO for construction. The operating system for construction, every phase from dream to delivery."* Live at `builders.theknowledgegardens.com`. | `assets/plates/builders-hammer.png` — a hammer rendered as a herbarium specimen with tree‑like roots. **The single most important plate.** |
| **Knowledge Gardens — Orchids** | *"A living library of orchid intelligence. 400 species, 69 genera."* Live at `orchids.theknowledgegardens.com`. | Cormorant Garamond + copper + deep teal; specimen photography on cream. |
| **XRWorkers** | The technology operator behind Knowledge Gardens. | Composite — uses the umbrella palette. |

BKG is itself structured as **four named surfaces** under one umbrella:

| Surface | What it does | Plate (`assets/plates/`) | Signature accent |
|---|---|---|---|
| **Killer App** | What gets done today — instrumentation, dashboards, measurement | `chrome-killer-app.png` (teal + rust gauges, brass) | `--specimen-teal` + `--specimen-rust` |
| **Dream Machine** | What gets imagined — generative, exploratory, what‑if | `chrome-dream-machine.png` (orrery, brass armatures, amber) | `--specimen-brass` + `--specimen-amber` |
| **Knowledge Garden** | What gets remembered — knowledge base, lineage, lessons | `chrome-knowledge-garden.png` (blueprint‑tree, sage foliage) | `--specimen-sage` |
| **Umbrella** | Cross‑surface navigation, account, settings | Composite of all three | `--ink-sepia` on `--paper-cream` |

### Vocabulary lock
- Use **MLP** (Minimal Lovable Product) — *never* "MVP."
- Use **MTP** (Massively Transformational Purpose) in investor/vision copy.
- BKG sits inside the **Knowledge Gardens** umbrella, beside **Orchids**, both operated by **XRWorkers**.

---

## 3 · Source materials used to build this system

| Source | URL / Path | Notes |
|---|---|---|
| **Hero plates (brand DNA)** | `assets/plates/*` | Treat as ground truth for color, texture, line, and feel. |
| **Builder's Knowledge Garden** repo | https://github.com/chilly611/builders-knowledge-garden | Next.js 15 / TypeScript / Supabase. `src/app/globals.css` has the in‑production token set (legacy `--bp-*` and canonical `--navy / --brass / --robin / --orange / --redline / --trace / --graphite`). Token mapping into the herbarium palette below. |
| **Orchids** repo | https://github.com/chilly611/knowledge-gardens-orchids *(private)* | Cormorant Garamond + Space Mono; deep teal `#1A5C5C` + copper `#B87333` on cream `#F5F0E8`. Lighter, more "field‑guide" treatment than BKG. |
| **Live surfaces** | `builders.theknowledgegardens.com`, `orchids.theknowledgegardens.com` | |
| **Journey & motif imagery** | `assets/journey/*`, `assets/imagery/*` | Real construction photography, floor plans, sketches — useful as full‑bleed scene backgrounds. |

> If you have access to the GitHub repos above, **read them first**. Token names in this system map to the codebase's existing CSS variables (see "Codebase token mapping" inside `colors_and_type.css`) so production code can adopt the herbarium palette by aliasing a single block of vars.

---

## 4 · Index of files

| File | What it gives you |
|---|---|
| [`colors_and_type.css`](./colors_and_type.css) | All color + spacing + radii + shadow + type tokens, plus semantic tag styles. Import this once at the top of any page. |
| [`SKILL.md`](./SKILL.md) | Skill entrypoint for Claude Code / Agent Skills usage. |
| [`assets/plates/`](./assets/plates/) | The four canonical hero plates. Reuse and remix — do not invent new illustration styles. |
| [`assets/logo/`](./assets/logo/) | BKG "B" marks (transparent, white outline, dark outline, wood outline, icon, OG cards). |
| [`assets/journey/`](./assets/journey/) | Stage / scene photography for full‑bleed backgrounds. |
| [`assets/imagery/`](./assets/imagery/) | Supplementary brand photography. |
| [`ui_kits/builders-knowledge-garden/index.html`](./ui_kits/builders-knowledge-garden/index.html) | Click‑through BKG product mock with reusable JSX components. |
| [`ui_kits/orchids/index.html`](./ui_kits/orchids/index.html) | Click‑through Orchids product mock with reusable JSX components. |
| [`preview/*.html`](./preview/) | Atomic design‑system cards rendered in the Design System tab. |

---

## 5 · Content fundamentals (voice, tone, copywriting)

Read the product like **a field naturalist's notebook annotated by a structural engineer.** Editorial, never corporate.

### Voice rules

- **Specific, never generic.** "Hairline crack at joint 4B, flagged 09:14" beats "Issue detected." Use the trade language correctly. Builders are the audience; they are respected, never dumbed down.
- **Quiet authority.** No exclamation points anywhere in UI. No emoji in chrome. Em‑dashes are welcomed and frequent.
- **Second person, plain.** "You" addressed to the builder; the platform is "we" only when explaining itself, otherwise it's just *the product doing things*. Avoid "let's."
- **Editorial scale.** Headlines are sentence case. Big ones use a period — "The operating system for your build." — like a plate caption, not a slogan.
- **Mix registers.** Display copy is bold and grand (Archivo Black). Captions and intros are slightly italic and editorial (EB Garamond). Engineering labels are MONO and UPPERCASE with loose tracking. Decorative captions on hero plates use a script (`.plate-caption`), sparingly.

### Casing

| Context | Casing | Example |
|---|---|---|
| Display headlines | Sentence case, ends with `.` if it's a statement | "The AI COO for construction." |
| Section titles | Sentence case | "Recent specimens" |
| Buttons | Sentence case, action‑first verbs | "Add observation", "Open log" |
| Engineering labels | UPPERCASE, loose tracking, mono | `PHASE 03 · BUILD` |
| Stat numbers | Tabular nums, generous size, sentence label below | `400` / `species` |
| Empty states | Sentence case, single line of editorial italic | *"No checkpoints flagged today."* |

### Examples (lifted from the brand)

- **Tagline (BKG):** "The AI COO for construction." / "The operating system for construction, every phase from dream to delivery."
- **Phase verbs:** Dream → Design → Plan → Build → Deliver → Grow.
- **Status copy:** "Schedule variance: +4 days", "Hairline crack at joint 4B, flagged 09:14".
- **Plate caption (decorative):** "*Viver*" (handwritten under a hammer with roots).
- **Orchids hero:** "The Orchid Intelligence Garden — where botanical science meets engineering precision."
- **Antipattern:** ❌ "Get started!", ❌ "We've got you covered ✨", ❌ "Issue detected ⚠️", ❌ "Welcome back, $name 👋".

### Emoji

**Almost never.** No emoji in UI chrome, never in marketing, never in product copy. The single exception: the Orchids site uses one or two icon‑role unicode glyphs in its hover compass (🌿 ⚙️ 🔬 📊) and even those are de‑emphasised. New work should not introduce more. When you need an icon, use an SVG line illustration in the brass/sepia line‑drawing style, **not** an emoji.

---

## 6 · Visual foundations

### Color

The entire system descends from **cream paper + sepia ink** with five accents drawn directly from the four hero plates. See `colors_and_type.css` for the full token list. The principles:

- **No pure white.** All "white" surfaces are `--paper-cream` (`#F2E9D2`). Pure `#FFFFFF` is banned.
- **No pure black.** Use `--ink-graphite` (`#2A2620`). `--obsidian` is reserved for dark‑mode only.
- **No neon.** No gradients-as-decoration. No flat saturated primaries.
- **Surface accents** are signature, not decorative. Killer App leans **teal + rust**, Dream Machine **brass + amber**, Knowledge Garden **sage**. The umbrella stays sepia‑on‑cream.

### Typography

Loaded from Google Fonts (no local TTFs — see `fonts/README.md`). Five families form a complete editorial system:

| Token | Family | Use |
|---|---|---|
| `--font-display` | **Archivo Black** | Hero headlines, surface titles, big numbers |
| `--font-ui` | **Archivo** (400/500/600/700) | Body, labels, buttons, the entire UI |
| `--font-editorial` | **EB Garamond** | Long‑form, brief intros, italic captions — the "specimen plate" voice |
| `--font-script` | **Italianno** (fallback: Pinyon Script) | Decorative plate captions only — never in functional UI |
| `--font-mono` | **JetBrains Mono** | Engineering labels, dimensional callouts, code, tabular data |

Scale is **modular, ratio 1.25**: `12 / 14 / 16 / 20 / 25 / 31 / 39 / 49 / 61 px`. Display headlines run at `--text-3xl` and up, set in Archivo Black with `letter-spacing: -0.02em`, sentence case. Body runs at `16px` with `1.6` line‑height on cream — the warm background reduces contrast, so we lean generous on leading.

### Spacing, radii, layout

- **4px base unit.** Token names go `--space-1` (4px) through `--space-24` (96px).
- **Tight radii.** Paper isn't round. `--radius-xs` (2px) is the default for buttons, panels, cards. `--radius-pill` for chips. `--radius-disk` only for instrument gauges and wax seals.
- **Grid underlay** lives behind hero compositions only — a 24px engineering grid in `--grid-line` (brass‑aged at 10% opacity). **Never** behind dense data UI; it competes with rows and gauges.
- **Layout density** is generous in marketing, tighter in product. Killer App dashboards are dense, gauge‑first. Knowledge Garden indexes are airy, herbarium‑plate style.
- **No fixed bottom bars** with floating chrome on top of content. The intro/Compass nav is the one exception — a single bottom‑right compass dial.

### Borders & elevation

- **1px sepia hairlines everywhere.** `border: 1px solid var(--paper-edge)` is the default. Strong borders use `--specimen-brass-aged`.
- **Short, warm shadows.** Pages sit *on a wall*, not in glass. Use `--shadow-page-1/2/3/--shadow-plate`. **No** wide soft blurs (`0 30px 60px`). No glassmorphism, ever.
- **Inset shadow** for recessed inputs uses `--shadow-inset` — a top white wash + bottom sepia hint.
- **Focus** is a 3px teal halo (`--shadow-focus`), never a default blue outline.

### Backgrounds

- **Cream paper** is the default. Apply `--paper-noise` (SVG fractal noise turned warm) at 10–25% opacity on full‑bleed marketing surfaces for a subtle aged texture.
- **Full‑bleed scene photography** (see `assets/journey/*`) is used as section backgrounds with a sepia tint overlay (`background-color: var(--ink-sepia); background-blend-mode: multiply; opacity: 0.85`).
- **Hand‑rendered illustrations** — reuse and remix elements from the four hero plates. Never introduce a new illustration style. Never use 3D Spline/Notion‑style illustrations.

### Hover & press

- **Hover (links, buttons, cards):** color shift toward `--specimen-teal-deep` or `--specimen-rust` (depending on accent context) + 1.5px sepia inner border appears. Cards also lift `−2px` with `--shadow-page-2`. Duration **180ms**, `--ease-out-paper`.
- **Press / active:** the element nudges **+1px** down (not bouncy — a press into paper) and the bg darkens to `--specimen-teal-deep` (or the accent‑deep equivalent). Duration **80ms**.
- **Disabled:** opacity `0.45`, no other visual change.

### Animation

- Default easing is **`cubic-bezier(0.2, 0.8, 0.2, 1)`** (`--ease-out-paper`) — a confident landing, not a spring.
- Three durations: **quick (140ms)** for tooltips/chips, **base (220ms)** for cards and panels, **slow (360ms)** for page chrome.
- **`bkgHeroMark`** (900ms) is reserved for grand reveals — a logo lock‑up, a plate entrance.
- **Botanical/mechanical motion** — branches drawing on (`bp-scan`), gauge needles sweeping in, compass roses rotating. Lean on stroke‑dashoffset animations on SVG paths to mimic ink drying.
- **Reduced motion**: all animations off; reduce to `opacity` transitions only.

### Transparency & blur

- **Almost never.** No frosted glass. No backdrop‑filter blurs.
- A single allowed pattern: a **protection scrim** at the bottom of full‑bleed hero imagery — a linear gradient `from transparent to var(--paper-cream) 90%` so text remains legible.
- Modals do **not** use a blurred backdrop. Use a sepia‑tinted overlay (`background: rgba(42,38,32,0.55)`) instead — like ink wash on the page.

### Corner radii summary

| Element | Radius |
|---|---|
| Buttons, inputs, panels, cards (default) | `--radius-xs` (2px) |
| Cards in editorial/marketing | `--radius-md` (4px) |
| Pills, chips, badges | `--radius-pill` |
| Instrument gauges | `--radius-disk` (50%) — a circle |
| Tooltips | `--radius-md` (4px) |

### Cards — the "specimen card"

A specimen card is the workhorse container.

```
+--------------------------------------+   ← 1px solid var(--paper-edge)
|  PLATE NO. 04 · BUILD       [tag]   |   ← mono uppercase eng-label, top-right tag
|                                      |
|   Hairline crack at joint 4B         |   ← Archivo Black, 25px
|   Flagged 09:14 by field             |   ← Archivo 14px, ink-faded
|                                      |
|   "Returned within tolerance at      |   ← EB Garamond italic (optional)
|    14:02 after re-tension."          |
|                                      |
|   ── (faint dashed leader) ──● 14B  |   ← engineering callout
+--------------------------------------+
                shadow-page-2 + cream background
```

Implementation: `background: var(--bg-raised); border: 1px solid var(--paper-edge); border-radius: var(--radius-xs); box-shadow: var(--shadow-page-2); padding: var(--space-6);`.

---

## 7 · Iconography

The dominant visual language is **herbarium‑schematic illustration**, not iconography. When you do need a tiny glyph:

### Approach (in priority order)

1. **Reuse elements from the four hero plates.** Crop a branch, a callout circle, an instrument bezel — it's already on‑brand.
2. **Hand‑drawn line SVG** in the brass / sepia line‑drawing style. Stroke `1.25–1.5px`, color `--ink-faded` or `--specimen-brass-aged`, never filled. Round line‑caps. Match the line quality of the orrery/blueprint plates.
3. **Lucide** (CDN) as the **utility fallback** — file/folder/search/x/chevron/etc. Override stroke to `1.5` and color to `currentColor` so the icon inherits the surrounding ink color. Treat lucide as low‑emphasis: never make a lucide icon larger than `18px` in the same surface as a hand‑drawn one. **This is a documented substitution** — the production codebase does not yet ship a custom icon font, so lucide bridges the gap until one exists.
4. **Custom dingbats** — the orchids site uses a small set of unicode glyphs in its compass (🌿 ⚙️ 🔬 📊). These are *legacy*; new work should replace them with hand‑drawn SVGs or a lucide stand‑in.

### Banned

- **Heroicons / shadcn‑default chrome.** Reads "generic SaaS."
- **Material Symbols / Carbon icons.** Same problem.
- **3D illustration sets** (Notion, Spline, generic Figma packs).
- **Emoji as icons.** See "Voice & tone" above — the brand's quiet authority breaks the second an emoji appears in chrome.

### Logos

`assets/logo/bkg-transparent.png` is the master BKG mark: a literal "B" made out of construction tools (chain, hammer, wrenches, screwdrivers). It works on light backgrounds; use `bkg-white-outline.png` on dark, `bkg-wood-outline.png` on mid‑tones, and `bkg-dark-outline.png` on light when a stronger silhouette is needed. The icon variant is `bkg-icon-192.png` (PWA / favicon).

The umbrella **Knowledge Gardens** wordmark and the **Orchids** sub‑brand do not have a separate logo file in this kit — they appear as wordmarks set in Archivo Black with the kebab `·` separator, e.g. `Knowledge Gardens · Orchids`.

---

## 8 · Font files — substitution flag ⚠

This kit loads its fonts from **Google Fonts** rather than shipping local `.ttf`/`.woff2` files. All five families are available there:

- Archivo · Archivo Black · EB Garamond · Pinyon Script · JetBrains Mono

The original brief allowed either **EB Garamond *or* Cormorant Garamond** for editorial; this system picks **EB Garamond** (the Orchids site uses Cormorant — that's fine, they coexist). The brief also allowed **Pinyon Script *or* Italianno**; this system picks **Pinyon Script** with Italianno as the fallback in the CSS stack.

**Ask the user:** if there is a licensed local copy of any of these fonts (especially for offline / PDF / PPTX export), please drop the files into `fonts/` and we'll wire them in via `@font-face`.

---

## 9 · Antipatterns — explicitly do not generate

- Bento grids of glowing rounded squares
- Glassmorphism, frosted blurs, neon accents
- Generic gradient‑mesh backgrounds (purple→pink, teal→indigo)
- Pure white `#FFFFFF`
- Sans‑serif‑only typography stacks
- Material / Carbon / shadcn‑default chrome with no customization
- 3D illustration sets (Notion‑style, Spline‑style)
- Heroicons / Lucide as the *primary* iconography (fine as utility — see §7)
- Cards with a colored left‑border accent and rounded corners ("AI tropes")
- Emoji decoration anywhere in UI chrome

---

## 10 · Validation prompts

After ingestion, validate the system by generating each of these and comparing to the hero plates. If any looks like generic Tailwind UI with a cream tint, the DNA has not been absorbed — re‑upload `/assets/plates/` and weight them higher.

1. A landing page hero for Builder's Knowledge Garden, headline *"The AI COO for construction."*, with a specimen‑plate illustration of a hard hat with roots.
2. A Killer App dashboard tile showing *"Schedule variance: +4 days"* as a brass instrument gauge.
3. A Knowledge Garden index page listing 12 past project lessons, each as a herbarium specimen card.
4. A Dream Machine prompt‑input screen where the user describes a building concept and the field is framed like an orrery callout.

---

## 11 · A clear ask

This is **v0.1** of the system. The biggest open question is whether to keep the brief's herbarium palette (`--specimen-*`) as canonical or to migrate the codebase's existing canonical palette (`--navy / --brass / --robin / --orange`) into it.  Right now both are documented; the herbarium palette is the public token surface and the codebase tokens are noted as legacy aliases. **Confirm which way you want it to go**, and I'll collapse the duplication.
