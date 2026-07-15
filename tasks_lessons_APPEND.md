## Lessons — 2026-06-02

- **Verify by looking, not by greps (again).** The anonymous-browser prod pass caught what no marker-grep would: `/john` is a 404 that "exists in no worktree and no doc," the killerapp header still shows the "B" not the seal, a React #418 hydration error, and an anon AI-take that hangs forever. Smoke-green ≠ product works — drive the live surface in a real browser and judge from pixels.

- **Never let an autonomous/parallel agent mutate SHARED PROD STATE unsupervised** — domain, env vars, `brand_assets`, demo DB rows. Tonight that produced a domain outage, an env wipe, and racing worktrees. Rule for parallel runs: exactly **one repo-WRITE lane** at a time (one worktree off *current* main, PR-only); every other agent stays read-only / plan-only. Especially while the founder is asleep.

- **Vercel domain must point at the GIT-WIRED team project**, not a hand-deployed personal project (the personal `app` copy drifts stale on every merge). The permanent fix is **one DNS TXT record** — and because `theknowledgegardens.com` DNS is hosted off-Vercel, the API can't add it; a human must, where the DNS lives.

- **Token-cascade footgun.** `globals.css` is imported *after* `tokens.css` and its `:root` overrides the herbarium tokens back to the old palette (`--bg`→#fff, `--accent`→#1D9E75). That's why surfaces render white/green despite herbarium tokens existing. Workaround: build against the herbarium tokens **directly** (`--paper-cream`, `--specimen-*`, `--ink-*`); do **not** globally flip `--bg` (restyles every surface). Resolving the cascade order is a flagged decision, not a drive-by edit.

- **"$0 counter" pattern.** Hardcoded stat constants gated behind an IntersectionObserver whose SSR fallback is literally `0` → renders 0 until the observer fires (often never, on initial HTML). Fix at the root: server-render the real value; treat the count-up as pure enhancement.

- **Worktree dev servers + symlinked `node_modules` panics Turbopack** (Next 16 default): "points out of the filesystem root." Use `--webpack` for worktree dev servers, or `cp -Rc node_modules` instead of a symlink.

- **Re-verify time-sensitive shared state LIVE before trusting memory.** A stream's memory said "no BKG seal in brand_assets" while a parallel stream had already inserted it mid-session. Under multiple streams, query `brand_assets`/DB/git live rather than relying on a recalled fact.

- **Demo data lives in many fields read by different surfaces.** The Marin row's `raw_input` (1,800 sf), `budget_amount` ($2.32M), and derived chips (4,950 sf / $914K) all disagreed with seed canon (4,000 sf / $1.65M), and two dup rows existed. Reconcile **every** field of the canonical row to the seed, never let intake `raw_input` render as the project's identity, and archive duplicate rows.

- **Secrets pasted into chat are burned.** A `VERCEL_TOKEN` and a GitHub PAT (and a wrong marketing-project Supabase URL) were pasted in-session and now live in plaintext transcripts — rotate them. PR-only tasks never need the Vercel token; ignore a pasted env value that points at the wrong project.

## 2026-06-12 — Approved assets are the spec (emblem program v1→v2→v3 whiplash)
When the founder asks to restyle an established, founder-approved visual DNA ("simpler, white backgrounds"), don't rewrite the whole 54-prompt program in one shot — generate a 2–3 prompt probe batch first and let real Midjourney output decide. v2 (white-bg "iconic") was fully built and retired the same day: the outputs read off-brand, and the v1 plate furniture (parchment, annotations, ticks) turned out to be load-bearing brand, not decoration. The approved plate (automaton bust, `social_chillyd_...b2a7be40...mp4`) is the reference now; anchor families with `--sref` to an approved asset instead of re-describing the style from scratch.

## 2026-06-12 — Taste questions get probe batches, not prose (founder asked for exactly this)
Third swing on emblem aesthetics in one day ended with the founder naming the real problem: "I am not sure how to direct this aesthetic taste question properly." The fix he chose is the right default for ALL KG aesthetic calls: a dozen deliberately divergent takes on ONE subject, react to real images, converge from the picks. Never re-cut a 55-prompt program on a one-sentence taste note. Also: two liked outputs ≠ locked direction — soften "approved" language until convergence is explicit.
