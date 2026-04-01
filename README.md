# Builder's Knowledge Garden

![Builder's Knowledge Garden](public/logo/b_transparent_512.png)

**The operating system for the $17 trillion global construction economy.**

DREAM → DESIGN → PLAN → BUILD → DELIVER → GROW

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Required in Vercel (and `.env.local` for local dev):

| Variable | Service | Used By |
|----------|---------|---------|
| `REPLICATE_API_TOKEN` | Replicate (account: xrworkers) | `/api/v1/render` — FLUX image generation for Oracle, Alchemist |
| `ANTHROPIC_API_KEY` | Anthropic Claude | `/api/v1/oracle/analyze` — dream profiling, AI copilot |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Knowledge entities, gamification, auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Server-side data access |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | Authentication |
| `CLERK_SECRET_KEY` | Clerk | Auth server-side |

## Logo Assets

All logo variants live in `public/logo/`:

| File | Usage |
|------|-------|
| `b_transparent_512.png` | Primary logo — transparent, works on most backgrounds |
| `b_white_outline_512.png` | For dark backgrounds — white glow outline |
| `b_dark_outline_512.png` | For light backgrounds — dark outline |
| `b_wood_outline_512.png` | Warm organic outline — use on mid-tone backgrounds |
| `b_icon_192x192.png` | PWA / Android icon (square, centered) |
| `b_icon_512x512.png` | Large app icon (square, centered) |
| `favicon.ico` | Browser tab icon (multi-size) |
| `og_image_dark.png` | Social sharing card (1200×630, dark) |
| `og_image_light.png` | Social sharing card (1200×630, light) |
