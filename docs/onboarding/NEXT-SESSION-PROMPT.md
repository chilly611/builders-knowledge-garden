# Next-session prompt

Paste this verbatim into Cowork (or Claude Code, or Claude.ai chat) at the start of the next session, after the computer restart.

---

## The prompt to paste

```
We're in the BKG demo sprint. SF investor meeting is Wednesday May 20 at
9am SF time. Today is [INSERT TODAY'S DATE]. Repo: chilly611/builders-knowledge-garden,
branch main, auto-deploys to https://builders.theknowledgegardens.com via
Vercel. Supabase project vlezoyalutexenbnzzui.

Before you do anything else:

1. Read these three files in order, top to bottom:
   - Builder's Knowledge Garden/CLAUDE.md
   - Builder's Knowledge Garden/onboarding/MICHAEL-START-HERE.md
   - Builder's Knowledge Garden/onboarding/DEMO-MAY20-PLAN.md

2. Read the most recent 20 entries (top, since newest is appended at bottom)
   of Builder's Knowledge Garden/tasks.lessons.md.

3. Read the bottom 100 lines of Builder's Knowledge Garden/tasks.todo.md
   to get current state-of-play and the "2026-05-18 follow-ups" section.

4. Then ask me which of these you should take next:
   (a) C3 contracts autofill effect re-attempt (P1) — see lessons 2026-05-18
       for the Record<string, unknown> trap. Add explicit
       Record<string, string> annotation to the local f variable.
   (b) C6 MCP closer wiring (P0) — Claude Desktop needs to fetch BKG
       knowledge live during the demo Act 4.
   (c) C7 Who's asking? voice extract (P1) — spec at
       docs/sprint-may17/specs/B7-who-is-asking.md.
   (d) Cold-start dress rehearsal on the demo laptop — incognito browser,
       end-to-end script. Identify what stumbles, then fix only those.
   (e) Surface a different priority I'm missing.

Once I pick (or you propose a better one), enter plan mode and write a
short spec. Then execute via parallel agents where it helps. Push via
Trees API for any atomic multi-file commit; PR + Vercel preview for
anything >5 files or with tricky TS.

End-of-session protocol still applies: append session-log, update
tasks.todo, append tasks.lessons if you learned something. Per CLAUDE.md.

Michael Bou is now on the team. He has full access (my GitHub, Supabase,
Vercel). Coordinate with him via tasks.todo.md and chat. See
onboarding/PARALLEL-AGENT-PLAYBOOK.md for how we work in parallel.

Go.
```

---

## Why this prompt is shaped this way

- **Date insertion** — Cowork sometimes drifts on "today's date" between sessions. Paste it explicitly.
- **Three reads before any work** — protects against the "agent skips orientation, makes a mistake, costs an hour" failure mode.
- **Explicit menu of next actions** — avoids the agent inventing its own priorities.
- **"Then ask me"** — forces a checkpoint before work, not after.
- **Plan mode** — Chilly's preference (see user prefs); avoids 3-step tasks running without a spec.
- **End-of-session reminder** — the lesson "always update the log" came up enough times that it earned a callout in every prompt.

---

## Variations

### If you want to go straight into one task without picking
Replace step 4 with: "Then start on [task]. Plan mode. Then execute."

### If you want a quick research-only pass
Replace step 4 with: "Then audit the demo path on prod (https://builders.theknowledgegardens.com) — start at /, walk through the full demo script, list every stumble or rough edge. Under 400 words. No code changes."

### If something is on fire
"BKG demo prod is broken. Last good commit on Vercel is [SHA]. Most recent commit on main is [SHA]. Pull the build logs, roll back via Vercel dashboard, then diagnose. Communicate progress in chat every 90 seconds."

---

## Things to remember across sessions

- The **single source of truth is GitHub**. Always pull before edit.
- The **Cowork sandbox can't run `next build`** (bus error / OOM). Don't waste time trying. Use Claude Code on Michael's or your own laptop instead.
- **Vercel logs aren't accessible** from inside Cowork. To debug a build failure: bisect by re-layering (see playbook Pattern C).
- The **demo project UUIDs** are documented in `REPO-AND-FOLDER-MAP.md`. Use them for testing, don't create new ones for testing — too many demo-named projects in Supabase already.
- **Michael has full access.** Treat him as a peer, not a junior. He can ship to main directly.
