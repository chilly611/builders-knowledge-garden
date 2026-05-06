# Resumption Prompt — Cowork Session After Restart

**Paste this entire prompt into a fresh Cowork session to pick up where 2026-05-05 left off.**

---

## Context (read before doing anything)

I'm Chilly, founder of Builder's Knowledge Garden (BKG). We just shipped **Project Spine v1** and ran a comprehensive dogfood-test pass. Now I want to do the **Tier 1 work** to make the killerapp demo-ready for John (a real GC) and a contractor friend.

Before you do anything else, **read these files in this order** to load full context (~10 min):

1. `/Users/chillydahlgren/Desktop/The Builder Garden/app/tasks.todo.md` — scroll to the bottom to find the `## ⏵ State of play — 2026-05-05` section. That's where we are.
2. `/Users/chillydahlgren/Desktop/The Builder Garden/app/docs/dogfood/findings.md` — what passed/failed on prod.
3. `/Users/chillydahlgren/Desktop/The Builder Garden/app/docs/dogfood/fix-list.md` — the prioritized fix list synthesized from 4 specialist agents.
4. `/Users/chillydahlgren/Desktop/The Builder Garden/app/tasks.lessons.md` — particularly the recent entries from 2026-05-03 to 2026-05-05. Lots of bookmarks for what NOT to repeat.
5. (Optional, for full persona depth) `/Users/chillydahlgren/Desktop/The Builder Garden/app/docs/dogfood/master-test-matrix.md` and one or two persona files in `docs/dogfood/personas/`.

## Where things stand technically

- **Branch state:** Local `main` has Project Spine v1 (commit `e63458d`, merged earlier). Branch `project-spine-v1` is two commits ahead of main with the NextWorkflowCard fix (`2d99f8b`) + three quick wins (`e2ea63b`).
- **Step zero before any new work:** sync local main to origin/main, then merge the branch. From the project root:
  ```bash
  cd "/Users/chillydahlgren/Desktop/The Builder Garden/app"
  git fetch origin
  git status -sb       # confirm clean working tree
  git checkout main
  git pull origin main
  git merge project-spine-v1
  git push
  ```
  If a parallel Dispatch / Claude session pushed work to main while I was resting, the pull will surface it. If there are conflicts on merge, **stop and read what the parallel session committed before resolving** — it was working on "W6 animation layer" (W6.E/H/I) and may overlap with the `src/design-system/animations/` work already on prod.

## What I want from this session

**Goal: Tier 1 from `docs/dogfood/fix-list.md`** — make the unscripted demo path credible by wiring Project Spine v1 into the contractor-relevant workflows.

Specifically, in this order:

### Task 1 — Wire Project Spine v1 into q8 permit-applications (~45 min)

Pattern to follow (literally copy q5 code-compliance):

1. Open `/Users/chillydahlgren/Desktop/The Builder Garden/app/src/app/killerapp/workflows/code-compliance/CodeComplianceClient.tsx` and study how it uses `useProjectWorkflowState`, renders `ProjectContextBanner`, derives `seededPayloads` from raw_input, manages `stepStatusMap`, passes `hydratedPayloads`/`statusMap` to the renderer/shell.
2. Open `/Users/chillydahlgren/Desktop/The Builder Garden/app/src/app/killerapp/workflows/permit-applications/` and identify the client component (likely `PermitApplicationsClient.tsx` or similar — read its current shape first).
3. Apply the same pattern with `column: 'permits_state'`. **You'll need a schema migration** to add the `permits_state jsonb DEFAULT '{}'` column to `command_center_projects` — or pick one of the existing JSONB columns (`estimating_state`, `code_compliance_state`, `contracts_state`) doesn't fit; better to add a new one and update `useProjectWorkflowState` to accept it as a valid `StateColumn`.
4. Wrap `page.tsx` in `<Suspense fallback={null}>` (the workflow hook calls `useSearchParams`).
5. Run `tsc --noEmit` then `npm run build`. Both must pass before you stop.

### Task 2 — Wire Project Spine v1 into q15 daily-log (~45 min)

Same pattern. Daily-log is voice-heavy (Hank's #1 workflow per `personas/10-foreman-hank.md`), so make sure the `voice_input` step type pre-fills cleanly from raw_input. Add `daily_log_state jsonb` column to the migration. Schema migration name: `20260506_more_workflow_states.sql` or similar.

### Task 3 — Wire Project Spine v1 into q11 supply-ordering (~45 min)

Same pattern. Supply ordering is Maria's + Curtis's + Hank's deal. Add `supply_ordering_state jsonb` column.

### Task 4 — Apply the schema migration via Supabase MCP (~10 min)

Use the `mcp__50b75a3e-67e5-4298-bb3a-fc856452ddcc__apply_migration` tool against project `vlezoyalutexenbnzzui` (knowledge-gardens-prod). Lesson app/tasks.lessons.md:197 — DO NOT paste into the SQL editor (Monaco bracket-completion bug breaks queries).

### Task 5 — Verify SPINE-5/6/7 on prod (~15 min)

Drive Claude in Chrome through:
- **SPINE-5**: close tab, reopen URL with `?project=<id>`, verify fields hydrated.
- **SPINE-6 (Mari kill-test)**: open project A in tab 1, project B in tab 2, autosave on A, verify B unaffected.
- **SPINE-7**: hit back from a workflow → killerapp restored with AI response visible.

Document results in a new `docs/dogfood/findings-2026-05-06.md`.

### Task 6 — Commit + push + merge to main + verify on prod

After all 3 wirings + migration applied + tsc/build pass:
```bash
git add -A
git commit -m "Tier 1: wire Project Spine v1 into q8 permits, q15 daily-log, q11 supply-ordering"
git push
git checkout main && git merge project-spine-v1 && git push
```

Wait ~3 min for Vercel deploy, then run smoke test (visit each newly-wired workflow with `?project=<id>`, verify banner shows + steps pre-fill).

## Critical rules / lessons that apply to this work

From `tasks.lessons.md` — DO NOT skip these:

- **Suspense boundary required** for any client component using `useSearchParams` (Next.js 16) — `app/tasks.lessons.md:339`.
- **Next.js 15+ params is `Promise<...>`** in dynamic routes — `app/tasks.lessons.md:906`.
- **Never use `git stash`** without first checking for stale `.git/index.lock` (we hit this earlier).
- **`isProjectId(s)` UUID check** before persisting — only persist when projectId is a real UUID, not 'default'.
- **Read `StepCard.types.ts` before writing onAction handlers** — payload shape varies by step type, don't invent properties — `app/tasks.lessons.md:928`.
- **Run `next build`, not just `tsc --noEmit`** — Next's route validator catches things stock tsc misses.
- **The Vercel auto-deploy gets paused after a manual rollback.** If you do a manual deploy promote, the next push won't auto-promote. Have to manually promote the new build.
- **The schema migration applies to `vlezoyalutexenbnzzui`** (knowledge-gardens-prod) — there are two Supabase projects in the org and the OTHER one (`gtmjcslcerakkgftozfy`) is dev/abandoned. Verify `.env.local` matches.

## What NOT to touch

- `/dream`, `/cinematic`, `/crm`, `/umbrella`, `/rsi` — out of scope.
- Workflows q1, q3, q20-q27 — out of scope for Tier 1 (they're not on the demo path).
- The Project Spine v1 hook itself (`src/lib/hooks/useProjectWorkflowState.ts`) — additive only; don't refactor.
- W6 animation work (Dispatch / parallel session) — let it complete or fail on its own; reconcile separately.

## Working style I expect (per my preferences)

- Plan mode for any non-trivial decision — write the spec to `tasks.todo.md` before coding.
- Verify before done — run `tsc`, `npm run build`, and a manual smoke before claiming task complete.
- Update `tasks.lessons.md` if I correct you or you find a non-obvious gotcha.
- Use TaskWrite to track progress through the 6 tasks above.
- Subagents liberally — Task 4 (migration) and Task 5 (verification) are good agent candidates if main context gets crowded.
- Don't ask hand-holding questions on bugs — diagnose and fix.
- Keep tone direct. No CYA, no over-formatting. Prose over bullets when explaining decisions.

## Stretch goal if Tier 1 wraps fast

If you finish all 6 tasks above with time to spare, start on **Tier 2 — Proactive AI assist** from `fix-list.md` (5s idle detection → nudge bubble on empty workflow steps). Spec it, don't ship it; that's a real product design call I want to make myself.

## Definition of done for this session

- [ ] q8, q15, q11 wired to Project Spine v1 (banner, pre-fill, autosave, status counter).
- [ ] Schema migration applied to prod Supabase.
- [ ] `npm run build` green locally.
- [ ] Commits on main, pushed, Vercel deploy verified live.
- [ ] Smoke test of each new wiring on prod URL passes.
- [ ] `findings-2026-05-06.md` documents SPINE-5/6/7 results.
- [ ] `tasks.lessons.md` updated with any new gotchas.

Go.
