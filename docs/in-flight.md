# In-Flight Coordination — Claude Code ↔ Cowork ↔ Chat

**Purpose:** prevent edit collisions between agents working on the same repo. Before opening a file for edit, append a row to **Active locks**. When done, move the row to **Recently released** with a one-line "what changed".

Each agent: keep the active-locks list short — only files actively being edited *right now* in the next ~15 min. Stale locks (> 30 min, no release) are assumed abandoned; the other agent may take over.

## Active locks

| Agent | File | Started (PT) | Status | Notes |
|---|---|---|---|---|
| _none_ | _none_ | _—_ | _—_ | _2026-05-20 evening — clean state after Wednesday's 13-commit ship. HEAD `f22f6e1` GREEN on Vercel. Pre-Thursday-demo._ |
| _none_ | _none_ | _—_ | _—_ | _Agent B released its stage-chrome lock 2026-05-27 (see below)._ |

## Recently released (last 24h)

| Claude Code | `src/app/projects/[id]/page.tsx`, `src/lib/demo/marin-4000.ts` | 2026-05-27 (demo eve) | RELEASED | Fixed AI-Attention-Items data mismatch: added `MARIN_ATTENTION_ITEMS` to the Marin fixture and seeded the page's `aiItems` from it, dropping the `GET /api/v1/projects/analyze` call that returned the GLOBAL (unscoped) `command_center_attention` rows leaking another project (Oceanview/Malibu/$1.2M). Now consistent with the chrome's $1.99M Marin numbers. **Could NOT build locally** — this checkout's `node_modules` is wedged (framer-motion unresolvable after a churned `npm install`; lock out of sync so `npm ci` refuses). Verified via Vercel + live render instead. Needs `rm -rf node_modules && npm install` to build locally again. |

| Agent B (Claude Code) | `src/components/stage-shell/*`, `src/app/killerapp/stages/{plan,build}/*`, `src/lib/specialists/{plan,build}.ts`, `src/lib/demo/marin-4000.ts`, `src/components/stage-kit/*` (ALL NEW) | 2026-05-27 | RELEASED | Plan + Build stages refit into the persistent StageShell chrome (JourneyRow + BudgetRibbon + ProToggle). Marin 4,000 sqft demo data. `npm run build` clean. Additive only — no edits to `layout.tsx`. **NOTE: chrome relocated from `killerapp-chrome/` → `stage-shell/` after rebasing onto the V3 rehaul (Agent A's `killerapp-chrome/` now owns that path). Two stage-chrome systems coexist — needs reconciliation.** Also: please gate the OLD global chrome off `/killerapp/stages/*`. |

| Agent | File | Released (PT) | Commit | What changed |
|---|---|---|---|---|
| Claude Code | `src/app/intro/page.tsx` | 2026-05-20 evening | `f22f6e1` | Fixed text obscured by images in Acts 1, 4, 5. Hammer bounded 800px→420px (was rendering at natural size due to `width:auto` override). Act 4 CTA paddingBottom 28px→80px to clear ActIndicator. Act 5 typewriter + CTA row get explicit z-index:5. |
| Claude Code | `src/app/intro/page.tsx`, `public/logos/gardens/*` (11 new) | 2026-05-20 PM | `8a526ca` | Act 5 redesign (6 verticals in top arc, no bottom collision with typewriter; tree 180→280px; verticals 56→96px). CardJourney with stage images. 11 new logos renamed + sips-resized. |
| Claude Code | `src/app/intro/page.tsx`, `public/logos/gardens/*.png` (5) | 2026-05-20 PM | `9f9b8dd` + `19b237c` | Wired + shipped 5 garden logos (hammer/tree/health-caduceus/toxicology/orchid). Act 1 leads with hammer-hero (520px) + chromes layered on top. |
| Claude Code | `src/components/GlobalChromeGate.tsx` (new), `src/app/layout.tsx` | 2026-05-20 PM | `d5d6dbc` | Hide CompassBloom + GlobalAiFab on /intro and inside `?hideShell=1` iframe. Demo-breaker — those FABs were leaking into Act 4. |
| Claude Code | `src/app/intro/page.tsx` | 2026-05-20 PM | `d53b7d8` | V2 spec items 1-5 (structural, no copy). Act 4 mobile CTA stack, Act 3 30s→22s, Act 3 mobile grid, light CardJourney, Act 5 dot quickening. |
| Claude Code | `src/app/killerapp/layout.tsx` | 2026-05-20 PM | `53f2421` | hideShell + outer Suspense wrap fix (Ship 36d build break root cause). Also Act 1 8s→6s + COLORS.red→CHROME.red typo. |
| Cowork | `scripts/seed-trial-accounts.mjs`, `src/app/{welcome,feedback,api/v1/feedback}/page.tsx`, `supabase/migrations/20260520_contractor_feedback.sql` | 2026-05-20 PM | `6552dc9` (Ship 36c) | Phase 5 contractor handover: 5 trial accounts seeded, /welcome + /feedback + RLS table live. |
| Cowork | `src/app/api/v1/projects/route.ts`, `src/components/cockpit/{BudgetSnapshot,ProjectCockpit}.tsx` | 2026-05-20 AM | `4f417f7` (Ship 35) | P0 demo fixes: Sparkline tooltip currency math, rewind preserves byStage, demo project allowlist for trial users. |

## How to use

1. **Before edit:** append a row to **Active locks** with your agent name + filepath + timestamp + `LOCKED`.
2. **After edit + commit:** move the row to **Recently released** with `RELEASED` + commit SHA + one-line "what changed".
3. **If you see another agent has a file LOCKED:** pick a different file, or send them a heads-up via `tasks.todo.md` if it's urgent.
4. **Stale locks (> 30 min, no release):** the other agent may take over.

## Hotspots (post-demo)

These files have multiple agents likely to touch them post-demo. Coordinate via this file.

- `src/app/intro/page.tsx` — V2 copy rewrite pending; `docs/onboarding/INTRO-V1-COPY.md` is the V1 reference, `docs/onboarding/DEMO-CINEMATIC-SPEC-V2.md` has proposed reframings.
- `src/app/killerapp/layout.tsx` — Lighthouse perf refactor (server-component shell split) is the post-demo move; TBT currently 2,250ms.
- `src/app/killerapp/workflows/estimating/__tests__/happy-path.test.tsx` — 9 stale tests expecting removed `s2-1` step (~15 min sweep).
- `public/logos/gardens/` — 11 new logos shipped; 8 not yet wired into /intro (biomarker, channel-type, distribute, optimize, strategy, vertical-mobile-ad, garden-legal, ui-pro-toggle-and-search). Available for other surfaces.
