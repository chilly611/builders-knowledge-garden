# Fonts

This design system loads all five families from **Google Fonts** rather than shipping local font files. See the `@import` at the top of [`../colors_and_type.css`](../colors_and_type.css).

| Token | Family | Google Fonts URL |
|---|---|---|
| `--font-display` | Archivo Black | https://fonts.google.com/specimen/Archivo+Black |
| `--font-ui` | Archivo | https://fonts.google.com/specimen/Archivo |
| `--font-editorial` | EB Garamond | https://fonts.google.com/specimen/EB+Garamond |
| `--font-script` | Pinyon Script | https://fonts.google.com/specimen/Pinyon+Script |
| `--font-mono` | JetBrains Mono | https://fonts.google.com/specimen/JetBrains+Mono |

## ⚠ Substitutions flagged

- The brief allowed either **EB Garamond** or **Cormorant Garamond** for the editorial role. This system picks **EB Garamond**. The Orchids product currently ships Cormorant Garamond — that is fine; the two coexist.
- The brief allowed either **Pinyon Script** or **Italianno** for the decorative script. This system picks **Pinyon Script** with **Italianno** as the fallback in the CSS stack.

## If you have licensed local copies

Drop `.woff2` / `.ttf` files into this folder and wire them in via `@font-face` at the top of `colors_and_type.css`. The Google‑Fonts `@import` can then be removed for offline / PDF / PPTX export.

Example:

```css
@font-face {
  font-family: 'Archivo Black';
  src: url('./fonts/ArchivoBlack-Regular.woff2') format('woff2');
  font-display: swap;
}
```
