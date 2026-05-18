# Michael — start here

Welcome to **Builder's Knowledge Garden (BKG)**. You are joining a 72-hour sprint to make a software demo land for an SF investor meeting **Wednesday May 20, 9:00am SF time**.

This document is your single entry point. Read it once, top to bottom. Everything else in this `onboarding/` folder is referenced from here.

---

## 1. What BKG is

> **An AI operating system for general contractors.** Spoken intent → project record → every screen reads the same project context, no re-entry. Builders never re-explain their job.

- **Live URL:** https://builders.theknowledgegardens.com
- **GitHub:** https://github.com/chilly611/builders-knowledge-garden (branch: `main`)
- **Hosting:** Vercel (auto-deploys from `main`)
- **Database:** Supabase (project id `vlezoyalutexenbnzzui`)
- **Stack:** Next.js 15 App Router · TypeScript · Clerk auth · Stripe · Tailwind via tokens

There are **three chromes** in the product:
1. **Green** `#1D9E75` — Knowledge Garden (public site, content)
2. **Warm** `#D85A30` / `#C4A44A` — Dream Machine (`/dream/*` — spoken project intake)
3. **Red** `#E8443A` — Killer App (`/killerapp/*` — 27 workflows GCs run their business on)

---

## 2. The demo we are shipping by Wednesday

The demo is a **single seamless story** told in ~5 minutes. See `DEMO-MAY20-PLAN.md` for the full script. Short version:

1. GC speaks "I want to build a custom modern farmhouse in Marin" into the Dream Builder
2. 60s later: concept render, code callouts, materials, budget range
3. They tap **Make This Real** → a project record is created
4. They jump between workflows — **Who's asking?** (CRM), **What does the code say?** (Codes), **What might this cost?** (Estimating), **Here's the agreement** (Contracts) — every screen reads the same project context, **no re-entry**
5. **Time Machine** lets them rewind any decision
6. **Journey Map** shows where they are in the lifecycle
7. Closer: Claude Desktop fetches BKG knowledge live via MCP

If anything in that story doesn't work end-to-end Wednesday morning, **we have not shipped**. That is the bar.

---

## 3. Your access (already set up)

- **GitHub:** you have Chilly's full account access. Clone, push, merge to main freely. Be mindful — every push to `main` auto-deploys to prod via Vercel.
- **Supabase:** full access via Chilly's session. Project id `vlezoyalutexenbnzzui`. You can run SQL, deploy edge functions, apply migrations.
- **Vercel:** full access; you can deploy + roll back from the dashboard if needed.
- **Anthropic Console + Claude Desktop:** Chilly will share login if you need to test the MCP demo path.

**Treat these like you own them.** No "ask first" friction for routine work. **Do** post in chat before:
- Deleting anything in prod Supabase (tables, rows, RLS policies)
- Force-pushing or rewriting `main` history
- Rotating any API key
- Anything that would burn the prod data or break the live demo URL

---

## 4. Your MacBook setup (≈30 minutes)

Get to "running and pushing" as fast as possible. Skip anything that isn't on this list — we can layer it in later.

### One-time
```bash
# 1. Xcode CLI tools (~5 min)
xcode-select --install

# 2. Homebrew → Node 22 + pnpm + git
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node@22 pnpm git gh

# 3. Sign GitHub CLI into Chilly's account (paste the PAT he gives you on the thumbdrive)
gh auth login --with-token < /path/to/github-pat.txt

# 4. Clone the repo
cd ~/Desktop
gh repo clone chilly611/builders-knowledge-garden
cd builders-knowledge-garden
```

### Per-app
The repo is **flat** on GitHub — `package.json`, `src/`, `next.config.ts` etc. all live at the repo root. (Chilly's local machine has these under `~/Desktop/The Builder Garden/app/` for historical reasons. On a fresh clone you don't need that wrapper.)

```bash
# From inside the cloned repo (you're already cd'd in from step 4)
pnpm install        # or `npm install` if pnpm trips you up

# Get the .env.local from Chilly (will be on the thumbdrive as `.env.local`)
# Drop it at the repo root as .env.local — DO NOT commit it (it's in .gitignore).

pnpm dev            # runs the app at http://localhost:3000
```

### Editor
- **VS Code or Cursor** are both fine. Cowork (this desktop app) works on top of either.
- Install: ESLint, Prettier, "Tailwind CSS IntelliSense" extensions.

### Sanity check
1. `pnpm dev` → open http://localhost:3000 → home loads
2. Visit `/killerapp` → workflows render
3. Visit `/dream/oracle` → Dream Builder loads
4. Try **Make This Real** → should redirect to `/killerapp?project=<uuid>`

If step 4 works, you are fully set up.

---

## 5. The folder confusion — read this carefully

On Chilly's machine there are **multiple folders** with similar names. **They are all stale.** The **only source of truth is GitHub.**

| Where you might see | What it actually is | Trust? |
|---|---|---|
| `~/Desktop/The Builder Garden/app/` | Current working copy of the Next.js app (Chilly's desktop) | YES — but pull before every session |
| `~/Desktop/The Builder Garden/Builder's Knowledge Garden/` | Docs + tasks + session log (this folder) | YES — pull before every session |
| Anything else with "Builder" in the name on Chilly's PC laptop or desktop | **Stale.** Pre-GitHub working copies. | NO — ignore. |
| Anything under `~/Library/Application Support/Claude/local-agent-mode-sessions/.../outputs/` | Temporary Cowork scratchpad, vanishes between sessions | NO — temp only. |

**Rule:** when in doubt, `git pull origin main` in the *repo folder you cloned*. That is canonical. Disregard anything you find by Finder-searching for "Builder."

See `REPO-AND-FOLDER-MAP.md` for the full layout.

---

## 6. How we work together (chat, Claude Code, Cowork, you)

Chilly is running multiple Claude surfaces in parallel:
- **Cowork** (the desktop app) — file ops, scripted pushes to GitHub via Trees API, Supabase SQL
- **Claude Code** (terminal CLI) — heavy refactors, multi-file edits, test runs
- **Claude.ai chat** (browser) — quick research, planning, ad-hoc questions
- **You + your terminal + Cursor/VS Code** — the human force-multiplier

We coordinate via:
1. **`tasks.todo.md`** — single source of truth for what's open / in-flight / done. Check it before starting work. Update it when you finish.
2. **`tasks.lessons.md`** — patterns learned the hard way. Read the most recent 10 lessons at session start; add to it whenever you correct a mistake.
3. **`docs/session-log.md`** — append a 6-line entry every session.
4. **Branch hygiene** — for anything risky, push to a feature branch and open a PR. For demo-critical fixes Tuesday/Wednesday, push to `main` directly (Vercel will catch type errors). Note in chat what you pushed.

`PARALLEL-AGENT-PLAYBOOK.md` has the patterns we've found that work.

---

## 7. Where things are in the codebase

| You want to find... | Look here |
|---|---|
| Workflow client components (the 27 GC workflows) | `src/app/killerapp/workflows/<slug>/` |
| Dream Builder oracle | `src/app/dream/oracle/page.tsx` |
| Project state context (the "spine") | `src/contexts/ProjectContext.tsx` |
| Time Machine | `src/lib/time-machine.ts` + `src/lib/use-time-machine-rewind.ts` |
| Cockpit (journey arc + dial + budget) | `src/components/cockpit/` |
| Supabase types + RLS | `supabase/migrations/` |
| API routes | `src/app/api/v1/` |
| Tokens (colors, type, spacing) | `src/design-system/tokens/` |
| Contract templates (the .md bodies) | `src/lib/contract-templates/templates/` |

See `REPO-AND-FOLDER-MAP.md` for the full deep-link list.

---

## 8. What's on fire right now

Read `DEMO-MAY20-PLAN.md` for the full state-of-play. Top three demo-blockers:

1. **C3 contracts spine autofill** — deferred (broke the build twice). Chips ship; autofill effect is the open task. See `tasks.lessons.md` 2026-05-18 for the trap.
2. **C7 Who's asking? voice input** — stub route exists; spec is at `docs/sprint-may17/specs/B7-who-is-asking.md`.
3. **C6 MCP closer (Claude Desktop fetches BKG knowledge live)** — needs final wiring + Chilly's demo laptop tested.

---

## 9. House rules

- **No emojis in code or docs** unless Chilly explicitly asks.
- **Simplicity first.** Make every change as small as possible.
- **Always update `tasks.todo.md`** when you finish work.
- **Always append to `docs/session-log.md`** at end of session (format in `CLAUDE.md`).
- **When in doubt, fix the root cause.** No temp workarounds — they pile up and bite us mid-demo.
- **Ship the elegant version.** "If it feels hacky, do the elegant fix" is in Chilly's prefs.

---

## 10. First three things to do today

1. Finish setup (Section 4). Confirm `pnpm dev` runs and home/killerapp/dream all load locally.
2. Read `DEMO-MAY20-PLAN.md` end-to-end. Walk through the demo on prod (https://builders.theknowledgegardens.com) so you've literally seen the script work.
3. Pick **one open item** from `tasks.todo.md` (look under the "2026-05-18 follow-ups" section). Ping Chilly which one you're taking. Then ship it.

Welcome to the team. The next 72 hours are everything.
