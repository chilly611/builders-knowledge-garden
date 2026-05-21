# Garden logos to upload — `/intro` cinematic

The cinematic at `/intro` is wired to load 5 brand logos. Until the files are uploaded, each logo gracefully falls back to either the K logomark SVG (umbrella tree) or a labeled colored dot (verticals). **The demo doesn't break either way** — but it'll look way stronger with the actual logos in place.

## Drop these 5 files into `app/public/logos/gardens/`

| Filename | What it is | Where it shows on `/intro` |
|---|---|---|
| `knowledge-gardens-tree.png` | The umbrella mark — tree with technical-blueprint circle | Act 1 (big, center, 260px) AND Act 5 (center, 180px) |
| `builders-hammer.png` | Hammer with rooting handle — Builder's Garden / Killer App | TopBar (small 28px, throughout) AND Act 5 vertical (56px) |
| `health-garden-caduceus.png` | Complex caduceus with foliage/wings | Act 5 vertical (56px) |
| `toxicology-caduceus.png` | Simpler blue caduceus (two snakes, plain staff) | Act 5 vertical (56px) |
| `orchid-garden.png` | Orchid in blueprint register | Act 5 vertical (56px) |

## Quick upload via terminal

```bash
cd "/Users/chillydahlgren/Desktop/The Builder Garden/app/public/logos/gardens"
# move/copy each file you saved off the chat thread into this folder, named per the table above
```

## Verify after upload

```bash
ls public/logos/gardens/
# you should see all 5 .png files
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/logos/gardens/builders-hammer.png
# expect 200 (404 means fallback will still kick in but the real logo won't show)
```

Then refresh `localhost:3000/intro` (or wait for Vercel rebuild on production) and the logos appear in place of the SVG/dot fallbacks.

## Notes on sizing

Each `<img>` is rendered with `objectFit: 'contain'` so any aspect ratio works. Source images can be square, portrait, or landscape. For best fidelity:
- Tree: square or close-to-square (1:1 to 5:6)
- Hammer: portrait (the rooting handle should breathe vertically)
- Caduceus / orchid: portrait or square, centered subject

PNG with transparent background is ideal but not required — the cinematic backdrop is a soft paper tone (`#FAF6EB`), so a cream-paper background in the asset itself blends in.
