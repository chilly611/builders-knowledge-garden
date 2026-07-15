# CLAUDE.md — Builder's Knowledge Garden
*Repo governance for Claude Code / Cowork sessions · 2026-06*

## Mission
Ship a **bulletproof, scalable Killer App for general contractors.** California-first. This is the product, not an everything-platform. The umbrella thesis is real for investors, but the spearhead is the GC Killer App.

## Read first, every session
1. `docs/session-log.md` — the NOW block at the top (canonical timeline).
2. `tasks.todo.md` — the NOW section.
3. `tasks.lessons.md` — patterns/mistakes to not repeat.
Then **confirm the shippable slice before building anything.**

## The shipping gate (the only truth)
The real signed-in loop: **sign in → open a project → run a workflow → save → leave → return → resume.** Entries persist and survive reload. **Smoke-test green ≠ product works. Verify in a real browser.**

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase (`knowledge-gardens-prod`, `vlezoyalutexenbnzzui`, shared — confirm before SQL) · Clerk · Stripe · Anthropic API · Vercel.

## Locked rules (full set: `PLATFORM-CONSTITUTION.md`)
Herbarium brand, **light backgrounds only** (no dark, no red `#E8443A`, no pure white) · Archivo + Archivo Black · 7-stage names locked (Size Up → Lock → Plan → Build → Adapt → Collect → Reflect) · **no "CRM"** in user-facing copy (it's "Pipeline") · **no "AI COO"** anywhere · MLP not MVP · compliance answers only from cited authoritative data · **Rule #11:** no platform-authored contract templates before legal review (e-sign mechanism only) · scalability is first-class.

## Workflow discipline
- One repo-WRITE lane at a time; **worktree off `origin/main`** (NEVER `git checkout main` — main lives at `~/Developer/bkg-main`); PR-only; founder merges.
- **Never mutate shared production** (domain, env vars, brand assets, demo DB) unsupervised.
- Append `docs/session-log.md` every session; keep a NOW block in `tasks.todo.md`; update `tasks.lessons.md` after any correction.
- **Tight scope.** Make exactly the changes specified. Flag (don't silently do) any out-of-scope file change.

## Canonical demo project
Modern Farmhouse Marin — `55730cd3-5225-493d-8b5c-49086d942565` · 4,000 sqft · Marin County, CA · $1.65M total / $312K spent · Build 42% · the Harwell family. **Demo data must reconcile to these numbers everywhere.**

## Deploy
CLI via `$VERCEL_TOKEN` from `~/Developer/bkg-main` (dashboard locked out). Confirm `.vercel/project.json` = team project `the-knowledge-gardens`. See `REPO-AND-WORKTREE-MAP.md`.

## Do-not list
No dark themes · no red `#E8443A` · no pure white · no "CRM" in copy · no "AI COO" · no platform-authored contracts before legal · no shared-prod mutations unsupervised · no `git checkout main` in a worktree · no marking a task done without proving it in a real browser.

## File map
`docs/session-log.md` · `tasks.todo.md` · `tasks.lessons.md` · `docs/architecture.md` · `docs/code-ingestion-hitl.md` (HITL gate spec) · design-system & asset reference · platform docs (Tier 0–1).
