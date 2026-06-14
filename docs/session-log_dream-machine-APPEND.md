# Session append — Dream Machine: make it lead to visuals, every time
**Date:** 2026-06-14 · **Agent:** Cowork (Opus) · **Branch:** `feat/dream-machine-visuals` (off `feat/seal-everywhere`; PR-only, founder merges)
**Lane note:** committed ONLY the dream/render files below — the in-flight `seal-everywhere` working-tree changes (error.tsx, Seal.tsx, CompassNav.tsx, KillerAppNav.tsx, owner/parts.tsx, etc.) were left untouched/uncommitted on purpose.

## Root cause (why a tester saw NO real visuals)
The canonical flow was wired to a **mock generator**, never to the real image API:
- `/dream` (live entry) sends the express + discover ramps to **`/dream/design`** (AI Design Studio).
- `/dream/design`'s "Generate" ran a 2.5s fake timer and returned 4 `generateBlueprintSVG(seed,label)` — abstract blueprints seeded by a counter, **unrelated to the user's words**. Same output for "modern farmhouse" or "data center".
- The only page that actually called the real render API (`/dream/describe` → `/api/v1/render` → Replicate FLUX) was **orphaned** (nothing routes to it), AND it never sent the Supabase bearer token, so it 401'd even for signed-in users, then swallowed the error (`.catch(()=>{})`) with no fallback.
- The `/dream` → `/dream/design` handoff didn't prefill the brief, so the typed dream was lost on arrival.
- `/dream/design` also used a **dark background** (constitution violation: light-only).

## What changed
1. **`/dream/design` now calls the real render API** with an *instant-then-upgrade* pattern: 4 light concept sketches appear immediately (grid is never empty), then upgrade in place to photoreal renders from `/api/v1/render` (mode=concepts) as they arrive. Generate / Refine / More-Like-This all route through one `callRender` helper that **sends the Supabase bearer token** when signed in.
2. **Guaranteed visual / graceful degrade:** on any failure (unconfigured / rate-limited / timeout / error) the concept sketch stays and a friendly status banner explains why (sign-in prompt, "warming up", etc.). 40s client abort so the UI never hangs.
3. **Pre-sign-in renders** (`/api/v1/render`): anonymous is now allowed under a tighter **per-IP** cap (`ANON_MAX=6 / 15min`); signed-in keeps `USER_MAX=20 / 10min`. Added `runtime='nodejs'` + `maxDuration=60` so 4 parallel FLUX `Prefer: wait` calls don't 504 on Vercel.
4. **Durable saved images:** generations already persist via ProjectContext/SaveLoadPanel; added `<img onError>` → stable `conceptFallbackFor(id)` sketch so an expired Replicate URL (they lapse ~1h) **never** shows a broken tile. On reload, kind is re-derived from the URL (`data:` = concept, else render).
5. **Brief prefill:** `/dream/design` reads the `bkg-dream-express` / `bkg-dream-profile` handoff, prefills the brief, and auto-generates for the express ramp (zero extra clicks). One-shot (key cleared).
6. **Brand:** retheme the studio from cyan-on-dark to the herbarium LIGHT palette (token values in `shared.ts`; swept hardcoded `#000`/cyan/dark literals across page + sub-components). Scrims drawn over photos stay dark for legibility (not page backgrounds).

## Files
`src/app/dream/design/{shared.ts,page.tsx,GenerationGrid.tsx,DesignBoard.tsx,DesignBrief.tsx,StyleControls.tsx,RefinementTools.tsx,SpecSheet.tsx}` · `src/app/api/v1/render/route.ts`

## Verification
- `tsc --noEmit`: **0 errors in changed files** (pre-existing jest-types baseline unchanged).
- Logic harness (compiled `shared.ts`, 8/8): fallback is an inline data URI (no 404s), paints light paper (no `#0A1628`), deterministic-per-key healing, and slider extremes flow opposite words into the prompt.
- NOT run in sandbox (darwin node_modules / 45s cap): `next build`, real-browser dogfood. **Handed to founder** — see checklist below.

## Founder action required
- **Set `REPLICATE_API_TOKEN` in Vercel** — without it the studio still works but only shows concept sketches + a "warming up" banner (never photoreal). With it → photoreal.
- Tune `ANON_MAX` if Replicate spend from anonymous traffic is a concern (each anon POST = up to `count` images).

## Real-browser dogfood checklist (the shipping gate)
1. Signed OUT, `/dream` → type "modern farmhouse in Asheville" → arrow. Land on `/dream/design` with the brief prefilled and 4 tiles appearing **immediately**; they upgrade to photoreal within ~30s (token set) or stay as sketches with a clear banner (token unset). **Never an empty grid.**
2. Refine a tile and "More like this" → new tiles appear instantly, upgrade in place.
3. Save a couple to the board (room picker), open Save/Load → save the project.
4. Reload the page / reopen the project → saved tiles still render (or heal to a concept sketch if the Replicate URL expired) — no broken images.
5. Signed IN: confirm photoreal renders and the higher rate limit; confirm the page is LIGHT (no dark background) on every tab (Generated / Board / Specs).

## Follow-ups (not in this slice)
- Consolidate the ~20 `/dream/*` experiments (retire/redirect orphans: alchemist, cosmos, timemachine, worldwalker, _page_v3, the orphaned `describe`).
- For true cross-device durability, persist renders to Supabase storage instead of relying on the onError concept-sketch heal.
