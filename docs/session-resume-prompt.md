# Session Resume Prompt — Week 1 Ship

Versioned copy of the resume prompt for future sessions. If you're picking up after a gap, read `tasks.todo.md` first (the handoff note at the top), then this file if you need the full re-entry prompt.

---

## Prompt to paste into a fresh Claude session

====

I'm Chilly, founder of Builder's Knowledge Garden. Resuming a session that ended 2026-04-17 evening after a big ship day + a brief production outage.

**Current state:**
- Site at `https://builders.theknowledgegardens.com` is LIVE and stable (rolled back to a known-good deployment). `/manifesto` serves to John the contractor.
- `main` branch is at commit `25fd861` and contains ~1,500 lines of new Week 1 work (workflow renderer, specialist runner, live route, 15 real code entities seeded).
- Vercel build is FAILING on the latest commits with `Command "npm run build" exited with 1` — almost certainly a small TypeScript error I couldn't catch locally because `tsc` was timing out in sandbox.
- Vercel auto-promote is disabled (safety feature after manual rollback). New builds build but don't go live until I click "Promote to Production" on a green deploy.

**Your job: get the Code Compliance Lookup route live.**

**Do this exactly:**

1. Read `tasks.todo.md` — the first section at the top is my handoff note with the 4-step playbook.
2. Read `tasks.lessons.md` — the last 7 lessons (dated 2026-04-17) are the most relevant. Especially the Next.js root-`app/` folder hijack lesson and the Vercel post-rollback auto-promote lesson.
3. Ask me to paste the Vercel build log for the failed deployment of commit `abb7600` (or whatever the latest failed deploy is). Tell me exactly where to find it: Vercel dashboard → Deployments → click the failed one → Logs tab → last ~40 lines, especially anything red in the "Running TypeScript" block.
4. Pinpoint the TypeScript error from the log. Fix it in one commit. Push with the PAT below.
5. Tell me the commit hash of the fix and which deployment in the Vercel list to promote (the newest green one).
6. After I promote, smoke test `/killerapp/workflows/code-compliance`. If AI narrative comes back real with citations, Week 1 is shipped. If "mock response" appears, `ANTHROPIC_API_KEY` isn't reaching the new build — a second redeploy fixes that.

**Paths and keys you'll need:**
- Repo: `/sessions/serene-wonderful-feynman/bkg-repo`
- Working dir for temp work: `/sessions/serene-wonderful-feynman`
- Production domain: `https://builders.theknowledgegardens.com`
- GitHub PAT for push: ask me to paste it when you need to push (it's in the workspace file `/mnt/Builder's Knowledge Garden/SESSION-RESUME-PROMPT.md` on my Mac, kept out of this repo because GitHub secret scanning blocks committed tokens).
- Git push pattern once you have the PAT: `git push "https://chilly611:$PAT@github.com/chilly611/builders-knowledge-garden.git" main`
- Supabase URL: `https://vlezoyalutexenbnzzui.supabase.co` (service key is in `batch-entities.mjs:5` at repo root — flagged for rotation)

**Principles (distilled from my user_preferences):**
- Plan before building anything non-trivial. If something goes sideways, STOP and re-plan.
- Verify before marking done. Never say "shipped" without proof it works in prod.
- Simplicity first. Minimal impact. Senior-dev standards — no lazy patches, no "temporary fixes."
- After any correction I give you, append the pattern + rule to `tasks.lessons.md`.
- Use subagents (Task tool) liberally for parallel research and verification.
- When there's a bug report, just fix it — point at the log, find the root cause, resolve it.

**After Week 1 ships:**
Priorities in order — (a) Clerk basic auth on `/killerapp/*`, (b) Week 2 Contract Templates workflow + Stripe, (c) rotate the Supabase service-role key (background, non-blocking).

Don't touch Payroll Classification (q23) — deferred pending legal review.

Start by reading `tasks.todo.md`. Go.

====

---

## Where the un-versioned copy lives

Also at `/mnt/Builder's Knowledge Garden/SESSION-RESUME-PROMPT.md` on Chilly's Mac for easy copy-paste from the Cowork workspace.
