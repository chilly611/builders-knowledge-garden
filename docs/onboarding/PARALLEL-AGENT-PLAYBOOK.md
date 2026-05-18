# Parallel-agent playbook

How to use Cowork, Claude Code, Claude.ai chat, and a human teammate (Michael) at the same time without stepping on each other.

---

## The four surfaces

| Surface | Strength | Weakness | Use for |
|---|---|---|---|
| **Cowork** (this desktop app) | File ops, Bash, Trees-API pushes, Supabase MCP, Vercel status checks, persistent context across long tasks | Sandbox can't run `next build` (OOM); `tsc` times out; no Vercel logs | Atomic multi-file commits, SQL changes, demo seeding, end-of-session bookkeeping |
| **Claude Code** (terminal CLI) | Can actually run `pnpm dev`, `pnpm build`, `pnpm test` locally; gets real build/test feedback; integrates with the editor's working tree | Limited multi-tool orchestration in a single shot | Verifying a change builds; running tests; iterating on a complex refactor; anything that needs `next build` errors |
| **Claude.ai chat** (browser) | Fastest for research, planning, prose, "what does X mean?" | No file access, no tools | Spec writing, brainstorming, copy review, debugging by talking through |
| **Michael** (human) | Real-world judgment, can see the prod UI in a real browser, can plug in the demo laptop | Slower than the agents | Prod cold-start testing, demo-laptop setup, anything that needs a real human watching |

---

## Coordination rules

### 1. One source of truth: `tasks.todo.md`
Every open work item lives there. Before starting work, **check it**. After finishing, **update it**. Don't keep open items in chat-only.

### 2. Branch convention
- `main` is auto-deployed. **Only push to main** if you've already verified the change builds (Claude Code, or a small enough change you're confident).
- For anything risky: `git checkout -b feat/<short-name>` → push the branch → open a PR → merge after CI/Vercel preview goes green.

### 3. Trees-API vs. local-git pushes
- **Cowork sandbox**: use Trees API (atomic multi-file commits). See `app/.git/config` for the PAT pattern.
- **Claude Code / Michael's terminal**: use `git push` normally.
- Either is fine; the artifact in GitHub is identical.

### 4. The "two agents touching the same file" problem
- Before opening a file for edit, `git pull origin main` first.
- If two agents edited the same file in parallel and the second commit fails: `git pull --rebase`, resolve, re-push.
- For demo week: prefer **serializing** work on the same file. Use chat to declare "I'm taking ContractTemplatesClient for the next 20 min."

### 5. Verification gate before pushing to main
**The Cowork sandbox can't run `next build`** — proven 2026-05-18 (bus error / OOM). So you cannot fully verify a change there.

Options, in order of preference:
1. **Have Michael run `pnpm build` on his laptop before merging.**
2. **Open a PR; let Vercel run a preview build.** Vercel comments the preview URL on the PR within ~90s.
3. **Push to main and watch the Vercel commit status** — fast feedback (~25s for early-stage failures, ~90s for full build success). Be ready to hot-fix-revert if it fails.

The last option is the one we used through Sunday. It works but it puts prod at risk for ~2 minutes per push.

### 6. End-of-session protocol (MANDATORY)
Every session, every agent, before signing off:
1. Append a session entry to `docs/session-log.md`.
2. Update `tasks.todo.md` (check off completed items, add new ones).
3. If you learned a pattern or made a mistake worth remembering, append to `tasks.lessons.md`.

See the `CLAUDE.md` at repo root for the GitHub Contents API pattern.

---

## Parallel patterns that work

### Pattern A — "Cowork ships, Claude Code verifies"
Cowork pushes a change via Trees API. Claude Code runs `pnpm build` locally to confirm types check. If it fails, Cowork pushes a hot-fix.

**When to use:** any change that touches >3 files or has tricky TS.

### Pattern B — "Cowork plans, Michael executes"
Cowork drafts a spec + step-by-step. Michael runs the change locally, opens a PR. Cowork reviews via diff.

**When to use:** environment-touching work (Vercel env vars, Clerk settings, Supabase auth).

### Pattern C — "Bisect by re-layering"
When a multi-file commit breaks the build and Vercel logs aren't accessible:
1. Revert all the consumer-of-new-types files (the ones that import the new module).
2. Confirm green.
3. Re-layer them one at a time. Each re-layer is one Trees-API commit.
4. The one that turns red is the culprit. Surgically fix or simplify.

This is how we found the contracts-autofill bug on 2026-05-18. Cost ~6 minutes for 4 deploys vs. hours guessing.

### Pattern D — "Parallel subagents in Cowork"
For research-heavy work (10 audits, 8 spec writes), Cowork spawns parallel agents — up to 36 at once — each with one focused task. Returns a synthesis.

**When to use:** audits, reviews, "look at X across the whole codebase," generating N variations of the same artifact.

### Pattern E — "Cowork as MCP-Supabase shell"
When you need to run SQL but don't want to leave the chat: use the Supabase MCP `execute_sql` tool. Returns within seconds.

**When to use:** seeding demo data, fixing a row, tagging entities (e.g. the Marin codes tagging on 2026-05-18).

---

## Anti-patterns (don't do these)

| Don't | Because | Do instead |
|---|---|---|
| Push a >5-file commit to main from Cowork without verification | Cowork can't run `next build`; if it fails, prod is broken until you push a hot-fix. | Open a PR, get a Vercel preview build, then merge. |
| Edit a file an agent is currently editing | Race condition → second push will fail with rebase conflict. | Declare in chat "taking X for 20 min" before starting. |
| Run a "fix everything" megaprompt | The agent will go in circles. Better: 10 focused tasks. | One task per agent invocation. |
| Skip the session-log entry | The next agent (or human) loses context. | Append the 6-line entry at end of every session — takes 90 seconds. |
| Trust the local working tree without pulling first | The "Builder's Knowledge Garden" folder confusion on Chilly's machine means stale files are easy to grab. | `git pull origin main` before every edit. |
| Push secrets or `.env.local` | Git history is forever. | `.env.local` is in `.gitignore`; if you accidentally stage it, `git restore --staged .env.local` immediately. |

---

## "What surface should I use right now?"

| Situation | Use |
|---|---|
| "I need to write a 600-line refactor across 4 files and make sure it builds" | Claude Code |
| "I need to ship a 1-file Trees-API commit and check Vercel status" | Cowork |
| "I need to brainstorm an interface concept" | Claude.ai chat |
| "I need to test the demo path on the demo laptop with a fresh browser session" | Michael (human) |
| "I need to seed Supabase data for the demo" | Cowork (Supabase MCP) |
| "I need to figure out why Vercel build failed and there's no log access" | Cowork — bisect by re-layering (Pattern C) |
| "I need to verify a CSS / Tailwind change looks right" | Michael — load it on real Safari + Chrome |
| "I need to update the session log + tasks at end of session" | Whichever surface is currently open. **Just do it.** |

---

## Communication

- **Chilly's chat** — main coordination channel. Daily check-ins.
- **GitHub commit messages** — read them; they carry context.
- **`docs/session-log.md`** — async handoff between sessions.
- **For urgent demo-week stuff:** SMS or call Chilly directly.

---

## When something goes wrong on prod

1. **Don't panic.** The previous green commit is one click away on Vercel.
2. **Roll back via Vercel** (dashboard → Deployments → previous green → "Promote to production").
3. **Then** investigate the root cause in a feature branch.
4. **Update `tasks.lessons.md`** with what bit you.

The Vercel rollback takes ~10 seconds. The full re-build of a hot-fix takes 90+ seconds. If you're inside the demo, **roll back first, debug after.**
