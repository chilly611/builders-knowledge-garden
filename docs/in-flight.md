# In-Flight Coordination — Claude Code ↔ Cowork

**Purpose:** prevent edit collisions between Claude Code (this terminal session) and Cowork (separate desktop window). If you are about to edit a file, append a row. When done, mark it released.

Each agent: keep the list short — only files actively being edited *right now* in the next ~15 min.

## Active locks

| Agent | File | Started (PT) | Status | Notes |
|---|---|---|---|---|
| _none_ | _none_ | _—_ | _—_ | _Tuesday May 19, 2026 — session start_ |
| _none_ | _none_ | _—_ | _—_ | _Claude Code released layout.tsx lock (2026-05-19 ~15:30 PT) — user reverted refactor; not pushing perf changes._ |
| Claude Code | `src/app/layout.tsx` + new `src/components/GlobalChromeGate.tsx` | 2026-05-20 ~16:05 PT | LOCKED | Demo-breaker fix: CompassBloom + GlobalAiFab in root layout render on every page including /intro and inside the hideShell iframe. Adding a tiny client wrapper that bails on /intro and `?hideShell=1`. |
| _none_ | _none_ | _—_ | RELEASED | Claude Code shipped V2 items 1-5 to /intro (see Recently released). |
| _none_ | _none_ | _—_ | RELEASED | Claude Code shipped 5 garden logos to /intro (see Recently released). |

## Recently released (last 1 hour)

| Agent | File | Released (PT) | Status | What changed |
|---|---|---|---|---|
| Claude Code | `src/app/killerapp/layout.tsx` | 2026-05-19 ~15:50 | RELEASED | Added `hideShell=1` branch back (user-approved). Did **not** restore Ship 36d's dynamic imports. Local-only, not yet pushed. |
| Claude Code | `src/app/intro/page.tsx` | 2026-05-19 ~15:50 | RELEASED | Trimmed Act 1 duration 8s → 6s (`ACT_DURATIONS_MS[0]`). Both typewriters finish ~4s; old 4s of dead air now ~1.5s. **`intro/` is still untracked locally — not on origin/main yet.** |
| Claude Code | `src/app/intro/page.tsx` | 2026-05-20 ~16:45 PT | RELEASED | V2 items 1-5 (structural, no copy): Act 4 mobile CTA (stack vertical + 88px paddingBottom to clear ActIndicator + trimmed header padding), Act 3 timing 30s→22s with re-timed cards (2/5/9/14/18s), Act 3 mobile grid stacks below 768px, CardJourney converted to light register matching other cards, Act 5 dot delay 1.6+i*0.12 → 0.8+i*0.10. |
| Claude Code | `src/app/intro/page.tsx` + new `public/logos/gardens/.gitkeep` + new `docs/logos-to-upload.md` | 2026-05-20 ~17:20 PT | RELEASED | Wired 5 garden logos with safe fallbacks. Tree on Act 1 (260px) + Act 5 center (180px). Hammer in TopBar (28px throughout) + Act 5 vertical (56px). Health/Toxicology/Orchid caducei + dot at Act 5. Each `<img>` has `onError` fallback to KLogomark SVG (tree slot) or labeled colored dot (vertical slots) — demo doesn't break if files aren't uploaded. Files to drop in `public/logos/gardens/` listed in `docs/logos-to-upload.md`. |

## Recently released (last 1 hour)

_None yet._

## How to use

1. Before opening a file for edit: append a row with your agent name + filepath + timestamp + `LOCKED`.
2. When done editing: move the row to "Recently released" with `RELEASED` and a one-line "what changed".
3. If you see another agent has a file LOCKED, pick a different file or message via session-log.md.
4. Stale locks (> 30 min, no release): the other agent assumes the lock-holder is idle and may take over.

## Today's expected hotspots (by spec)

- `src/app/intro/page.tsx` — **Cowork building.** Claude Code will git-pull and iterate timing only after Cowork's first push.
- `src/app/feedback/page.tsx` — Cowork.
- `src/components/cockpit/*` — primarily Cowork.
- `src/app/killerapp/budget/BudgetClient.tsx` — primarily Cowork.
- Lighthouse / perf follow-ups for `/killerapp` initial bundle — Claude Code (TBD, would discuss before touching).
