# In-Flight Coordination — Claude Code ↔ Cowork

**Purpose:** prevent edit collisions between Claude Code (this terminal session) and Cowork (separate desktop window). If you are about to edit a file, append a row. When done, mark it released.

Each agent: keep the list short — only files actively being edited *right now* in the next ~15 min.

## Active locks

| Agent | File | Started (PT) | Status | Notes |
|---|---|---|---|---|
| _none_ | _none_ | _—_ | _—_ | _Tuesday May 19, 2026 — session start_ |
| _none_ | _none_ | _—_ | _—_ | _Claude Code released layout.tsx lock (2026-05-19 ~15:30 PT) — user reverted refactor; not pushing perf changes._ |

## Recently released (last 1 hour)

| Agent | File | Released (PT) | Status | What changed |
|---|---|---|---|---|
| Claude Code | `src/app/killerapp/layout.tsx` | 2026-05-19 ~15:50 | RELEASED | Added `hideShell=1` branch back (user-approved). Did **not** restore Ship 36d's dynamic imports. Local-only, not yet pushed. |
| Claude Code | `src/app/intro/page.tsx` | 2026-05-19 ~15:50 | RELEASED | Trimmed Act 1 duration 8s → 6s (`ACT_DURATIONS_MS[0]`). Both typewriters finish ~4s; old 4s of dead air now ~1.5s. **`intro/` is still untracked locally — not on origin/main yet.** |

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
