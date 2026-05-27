# Palette Tokens & CSS Custom Properties

## Token Set

Use these CSS custom property names everywhere. Never hardcode hex values into components.

### Everyday Six (Workflow Chrome)

```css
:root {
  --navy: #1B3B5E;           /* Blueprint navy — dominant dark, heritage fields */
  --paper: #F4F0E6;          /* Trace paper — light ground, sheet background */
  --graphite: #2E2E30;       /* Graphite — type, primary ink, all linework */
  --rule: #C9C3B3;           /* Faded rule — heritage grids, hairlines */
  --brass: #B6873A;          /* Drafting brass — CTAs, focus, everyday warm */
  --redline: #A1473A;        /* Redline — errors, edits, revision callouts */
}
```

### Peak Pair (Reserved for Moment Punctuation)

```css
:root {
  --robin: #7FCFCB;          /* Robin's egg — verify, affirm, navigable, "you are here" */
  --orange: #D9642E;         /* Deep orange — celebration, ritual, close-out crown */
}
```

### Archive Deep (Splash / Wordmark Moments)

```css
:root {
  --navy-deep: #0E2A47;      /* Navy deep — splash backgrounds, wordmark heritage */
}
```

## Usage by Role

### Background & Ground
- Light mode: `background: var(--paper)`
- Dark mode: `background: var(--navy)` (or `--navy-deep` for splash/hero)
- Heritage grid: apply as radial-gradient or pattern, opacity ~0.08–0.15
- Sheet tone: `background: var(--paper)`

### Typography
- Default body text: `color: var(--graphite)`
- Navy headings: `color: var(--navy)`
- Faded/secondary text: `color: var(--rule)` or `var(--rule-dark)` if darker needed
- Heritage annotation: `color: var(--rule)`

### Linework & Borders
- Structural UI lines (1px): `border: 1px solid var(--rule)`
- Hairlines (0.5px), background grids: `stroke: var(--rule)` at opacity 0.08–0.15
- Primary foreground lines: `stroke: var(--graphite)`
- Heritage/faded strokes: `stroke: var(--graphite)` at opacity 0.4–0.55

### Interactive States & CTAs
- Primary button: `background: var(--brass); color: var(--paper)`
- Button border: `border: 1px solid var(--graphite)` (light mode) or `border: 1px solid var(--brass)` (active)
- Focus ring: `outline: 2px solid var(--brass); outline-offset: 2px`
- Hover background lift: `background: linear-gradient(180deg, rgba(182,135,58,.08), transparent)`

### Verification & Navigation
- Verified/affirmed state: `color: var(--robin)` or `border-color: var(--robin)`
- Navigable-state indicator: `fill: var(--robin)` or glow/halo
- Compass path pulses: `stroke: var(--robin)` with animation

### Peak Moments & Ritual
- Project close-out crown: `color: var(--orange)` or `fill: var(--orange)`
- Ritual animation ink: `stroke: var(--orange)`
- Before/after reveal highlight: `color: var(--orange)` or `border: 2px solid var(--orange)`

### Errors & Revision
- Error text: `color: var(--redline)`
- Revision cloud: `fill: var(--redline)` at opacity 0.15
- Error input border: `border: 2px solid var(--redline)`

## Do NOT Mix in the Same Component

**Peak pair rule:** Robin's egg and deep orange are reserved. They never sit next to brass in the same UI component.

❌ Bad:
```css
/* In the same card or button group */
.verify-btn { background: var(--robin); }
.celebrate-btn { background: var(--orange); }
.cta-btn { background: var(--brass); }  /* All three together = gradient scrapbook */
```

✅ Good:
```css
/* Brass carries everyday affordances */
.primary-action { background: var(--brass); }
.secondary-action { background: var(--paper); border: 1px solid var(--graphite); }

/* Robin's egg appears only in verification/navigable states */
.verified-state { border-color: var(--robin); }

/* Orange appears only in close-out ritual or peak moments */
.close-out-crown { fill: var(--orange); }
```

## Opacity Adjustments

For subtle heritage textures and faded linework:

```css
/* Faded heritage grid background */
background: radial-gradient(circle at 1px 1px, rgba(46, 46, 48, 0.08) 1px, transparent 1.5px);

/* Hairline rule */
border-top: 0.5px solid var(--rule);

/* Faded linework in heritage layer */
stroke: var(--graphite);
opacity: 0.4;  /* or 0.55 for slightly bolder heritage lines */
```

## Typography + Palette

When pairing type with color:

- Navy headings (h3, h4) on trace paper: high contrast, readable
- Brass accent in serif display type: `color: var(--brass)` sparingly (pull focus)
- Mono technical data: `color: var(--graphite)` on `var(--paper)` for contrast
- Faded captions and kickers: `color: var(--rule)` at small sizes

## Testing Contrast

Always verify at smallest intended size (typically 11px mono labels, 14px body). Test against both light (`--paper`) and dark (`--navy`/`--navy-deep`) backgrounds.

- Navy on paper: ✅ WCAG AA
- Graphite on paper: ✅ WCAG AAA
- Brass on paper: ✅ WCAG AA
- Rule on paper: ⚠️ WCAG A only — use for secondary, non-critical text
- Robin's egg on navy: ⚠️ Low contrast — use for decorative/icon-only states, pair with text in graphite
- Orange on paper: ✅ WCAG AA
- Redline on paper: ✅ WCAG AA

## CSS Variable Declaration (Copy-Paste)

```css
:root {
  --navy: #1B3B5E;
  --navy-deep: #0E2A47;
  --paper: #F4F0E6;
  --graphite: #2E2E30;
  --rule: #C9C3B3;
  --rule-dark: #A69E8A;
  --brass: #B6873A;
  --redline: #A1473A;
  --robin: #7FCFCB;
  --orange: #D9642E;
}
```
