# Repos, Worktrees, Deploy & Access — The Operational Map
*2026-06 · Tier 3 · keep current whenever a worktree or repo role changes*

## Repos (GitHub: `chilly611` / `XRWorkers`)
| Repo | Role | Live at | Status |
|---|---|---|---|
| `chilly611/builders-knowledge-garden` | **The Killer App + Builder's Knowledge — the product** | builders.theknowledgegardens.com | **PRIMARY** |
| `chilly611/knowledge-gardens-root` | Umbrella marketing site ("Where Science Meets Wonder") | knowledge-gardens-root.vercel.app | Active |
| **frontiermap repo — UNIDENTIFIED** | Investor narrative: `/john`, `/walkthrough`, `/john/descent`, `/theKnowledgeGardensOS`, the Frontier map | frontiermap.theknowledgegardens.com | **ACTION: identify via Vercel when dashboard access returns.** Confirmed it is *not* `knowledge-gardens-root` (404s on those routes) and *not* `builders`. |
| `chilly611/knowledge-gardens-orchids` | Orchid garden | (live) | Deployed |
| `chilly611/knowledge-gardens-toxicology`, `hkg`, `mkg` | Toxicology, Health, Marketing gardens | — | In progress |
| `chilly611/bkg-killer-app` | Older killer-app prototype | — | **Likely deprecated — confirm, then archive** |
| `chilly611/succulens-app`, `knowledge-orchid-1.1`, `XRWorkers/TheBloom`, `XRWorkers/the-bloom-ledger` | Misc / Bloom documentary | — | Low priority |

## Worktree layout (MacBook Air, `~/Developer/`)
**`main` is checked out at `~/Developer/bkg-main` — never at the bare `~/Developer/bkg`.** All main operations use `git -C ~/Developer/bkg-main …` or `origin/main` refs.

Current worktrees (live as of this map):
- `bkg` → `feat/shared-app-shell`
- `bkg-bugfixes` → `fix/killerapp-quartet`
- `bkg-compliance` → `feat/compliance-service`
- `bkg-contracts-signing` → `feat/contracts-signing`
- `bkg-heartbeat` → `feat/rsi-heartbeat`
- `bkg-homepage` → `feat/homepage-rebuild` *(merged — prune)*
- `bkg-jurisdictions` → `docs/jurisdiction-dossiers` *(locked)*
- `bkg-main` → `main`
- `bkg-rollout` → `feat/seal-rollout`
- `bkg-social` → `fix/social-card-seal` *(merged — prune)*
- `bkg-tests` → `test/e2e-consistency`
- `bkg-viver-seal` → `feat/viver-seal`

### Create a new worktree off latest main (worktree-safe)
```
git -C ~/Developer/bkg-main fetch origin
git worktree add ../bkg-<name> -b <branch> origin/main
cd ~/Developer/bkg-<name>
npm install
```
**Never run `git checkout main` in a non-main worktree — it errors** (`'main' is already used by worktree at bkg-main`). If Turbopack throws symlink errors in a fresh worktree, reinstall there.

## Write-lane discipline
Exactly **one repo-WRITE lane per repo at a time.** Own worktree off current `main`, PR-only, founder merges. Every other agent is read-only / plan-only. Who holds the write-lane is recorded in `docs/session-log.md` so San Diego and San Francisco never collide.

## Deploy mechanics (Vercel dashboard is currently LOCKED OUT — support pending)
Deploy via CLI from the correctly-linked main worktree:
```
cd ~/Developer/bkg-main
npx vercel --token=$VERCEL_TOKEN            # preview URL — verify before promoting
npx vercel --prod --token=$VERCEL_TOKEN --yes
```
- **Confirm `.vercel/project.json` points at the TEAM project** (`the-knowledge-gardens`), not a personal one — this is the **domain-drift footgun.** Copy `.vercel` from `bkg-main` into any new worktree before deploying.
- Fresh worktrees don't inherit `.vercel` (it's gitignored) — copy it or `vercel link` to the team project first.

## Backups & rollback (no dashboard = git + CLI)
```
git -C ~/Developer/bkg-main fetch origin
git tag -f demo-good-<date> origin/main
git push -f origin demo-good-<date>
```
Rollback = reset to the tag + CLI redeploy. Keep independent live-page HTML snapshots as a diff baseline before any risky change.

## Supabase
Prod = **`knowledge-gardens-prod` (ID `vlezoyalutexenbnzzui`)** — **SHARED across gardens; always confirm the project before any SQL.** Reads via `execute_sql`, DDL via `apply_migration`. The Marin canonical project row (`55730cd3-5225-493d-8b5c-49086d942565`) is the demo's source of truth — back it up before touching it.

## Known artifact
`refs/heads/__locktest.lock.stale.*` on the remote causes a benign fetch warning — prune when convenient.

## Keeping this current
Update this map whenever a worktree is added/removed, a repo's role changes, or the frontiermap repo is identified. The `session-log` records who holds the write-lane each session.
