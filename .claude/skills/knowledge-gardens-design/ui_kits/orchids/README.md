# Knowledge Gardens — Orchids — UI kit

A click-through visual recreation of the **Orchids** site — the sister brand to Builder's Knowledge Garden. Field-guide treatment: Cormorant Garamond + Space Mono, cream paper, deep-teal headings, copper accents.

Live site: **orchids.theknowledgegardens.com**
Repo (read-only context): **https://github.com/chilly611/knowledge-gardens-orchids** *(private)*

## Run it

Open [`index.html`](./index.html). React + Babel inline; Google Fonts loaded from CDN.

## Files

| File | What it is |
|---|---|
| `index.html` | Demo shell. |
| `styles.css` | All Orchids chrome styles. Self-contained — does **not** import the global `colors_and_type.css`, because Orchids has its own (slightly lighter) palette. |
| `components.jsx` | Reusable components below. |
| `app.jsx` | Homepage: hero + stats + search + featured species + genera grid + signup + compass. |

## Components

| Component | Use |
|---|---|
| `<HeroBanner />` | Sources tagline, headline, subtitle, stats, CTA row. |
| `<Stats />` | Four-number row (Species · Genera · Sources · Pages). |
| `<Search value onChange />` | The big serif italic search bar with ⌘K hint. |
| `<SpeciesCard sci common observations price swatch accent />` | Featured species card — a gradient photo placeholder with an embedded SVG orchid glyph, plus stats and price. |
| `<OrchidGlyph accent />` | The line-illustrated orchid that lives on placeholder photos. |
| `<GenusTile name count />` | Browse-by-genus tile. |
| `<SignupBanner />` | Newsletter capture banner — teal slab with copper button. |
| `<OrchidCompass />` | Floating compass FAB w/ expandable nav panel. |

## Palette (local — not the global system)

| Token | Value | Use |
|---|---|---|
| Body bg | `#F5F0E8` | The page itself |
| Card / panel | `#FBF8F3` | All cards |
| Deep teal | `#1A5C5C` | Headlines, accents, primary CTA |
| Copper | `#B87333` | Labels, accent CTA, glyphs |
| Slate ink | `#2C2C2C` | Body text |
| Muted slate | `#71797E` | Subdued labels |

These are *Orchids-specific*. The umbrella system in `../../colors_and_type.css` uses a slightly warmer cream and sepia ink instead. **Both are correct** — Orchids has been signed off with its current palette.

## Notes / gaps

- Species photos in production come from iNaturalist. This kit substitutes a **gradient + SVG orchid glyph** for the missing photography. Replace the swatch arrays in `app.jsx` with real `<img src>` tags when you have licensed imagery.
- The Orrery (3D genus browser) is not recreated. Production builds it with three.js; out of scope for a visual kit.
- The Compass FAB uses Unicode-free SVG glyphs — production currently uses a few emoji icons (🌿 ⚙️ 🔬 📊). The brand direction is to phase those out, so this kit pre-empts that.
