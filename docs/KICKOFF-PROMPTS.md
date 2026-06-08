# Phase Kickoff — Session Prompts (Chat · Cowork · Code)
*2026-06 · paste-ready · one bite-size step at a time*

Each prompt is self-contained. Run them in order. Nothing here is "do everything at once" — every task ends at a **"proven in a real browser"** gate.

---

## A) NEW CHAT — strategy / orchestration hub
*Paste into a fresh chat to spin up the strategy hub for this phase.*

```
You are the strategy + orchestration hub for shipping the Builder's Knowledge Garden KILLER APP
to general contractors as a bulletproof, scalable product — and proving the Knowledge Gardens
engine to investors and our first large-scale-developer customers.

THIS THREAD: strategy, sequencing, digesting agent reports, writing paste-ready prompts for
Claude Code / Cowork / Claude Design. It does NOT write repo code.

TRUTH (over any stale doc): read STRATEGY-bulletproof-and-scale.md and PLATFORM-CONSTITUTION.md.
Live product: builders.theknowledgegardens.com. Repo: chilly611/builders-knowledge-garden (main at
~/Developer/bkg-main). Stack: Next.js 15 / TS / Tailwind v4 / Supabase / Clerk / Stripe / Anthropic.
Brand: herbarium, light backgrounds only. 7 stages locked. Vercel dashboard locked out → CLI deploy
via token from bkg-main. Supabase prod vlezoyalutexenbnzzui is SHARED — confirm before SQL.

THE BAR: bulletproof (the real signed-in loop works every time), functions-as-promised (system of
record + the promised tools), and scalable (multi-tenant, generalized context-routing, governed
ingestion, observability).

DISCIPLINE: smoke-green ≠ works; verify in a real browser; one repo-write lane at a time, PR-only,
founder merges; never mutate shared prod unsupervised; back up + git-tag before risky changes.

FIRST STEP: read the session-log NOW block and tasks.lessons.md, then confirm with me the exact
Phase 1 slice before building anything.
```

---

## B) COWORK — parallel research & drafting (read-only / plan-only on the repo)
*Cowork is great at parallel autonomous work with skills. Hand it research and drafting that does NOT touch the write-lane. One task per subagent.*

```
You are running PARALLEL research + drafting for the Knowledge Gardens phase kickoff. You are
READ-ONLY / PLAN-ONLY on the repo — produce documents and PRs for founder review, never push to main.
Use skills and subagents liberally; one task per subagent; keep each focused.

Read PLATFORM-CONSTITUTION.md and REPO-AND-WORKTREE-MAP.md first.

PARALLEL TASKS (spin a subagent per item):
1. IDENTIFY THE FRONTIERMAP REPO. It serves frontiermap.theknowledgegardens.com (/john, /walkthrough,
   /john/descent, /theKnowledgeGardensOS, the Frontier map). It is NOT knowledge-gardens-root or builders.
   Cross-reference Vercel project ↔ git repo and report the answer + deploy path.
2. KNOWLEDGE-BASE / HITL AUDIT. Inventory the current ingestion state in Supabase (confirm project
   vlezoyalutexenbnzzui first; read-only). How many entities/jurisdictions, what status values, where the
   human-review gate is missing. Draft docs/code-ingestion-hitl.md: land as status='review' → approval
   queue → promote to 'published' with audit trail.
3. SCALABILITY / ENTERPRISE REQUIREMENTS. Research what large-scale construction GCs need from a system
   of record (roles/permissions, audit, multi-project, SSO, data residency, performance). Produce a
   ranked requirements brief mapped to our phases.
4. DRAFT THE PER-PRODUCT PROJECT-INSTRUCTIONS from the constitution: Killer App, Dream Machine,
   Builder's Knowledge, KG Umbrella. Use the constitution's structure; one file each; founder reviews.
5. DESIGN-SYSTEM & ASSET INVENTORY. Catalog the current herbarium tokens, fonts, the Viver seal +
   emblem set, images and animations as they exist in the repo (public/, brand_assets/). Produce a
   reference doc + a documented process for adding/updating tokens, images, and animations.

Report each task's output as a separate, clearly-labeled deliverable.
```

---

## C) CODE — Phase 1 bulletproofing (write-lane, one at a time)
*The first three build tasks. Run ONE at a time; coordinate the write-lane via session-log so SD/SF don't collide. Each: worktree off `origin/main`, PR-only, verify in a real browser, founder merges, append session-log.*

### Task 1 — Context-routing (the #1 bug; keystone for scalability)
```
WRITE-LANE: builders-knowledge-garden. Worktree off origin/main. Plan-mode first.
git -C ~/Developer/bkg-main fetch origin
git worktree add ../bkg-context-routing -b fix/context-routing origin/main && cd ../bkg-context-routing && npm install

PROBLEM: stage pages mount with empty local state — building-type, jurisdiction, lane, and the active
project don't thread through to the stage tools, so pages are hardcoded/Marin-bound and self-contradictory.
GOAL: a single source of project context (building-type × jurisdiction × lane × active-project) that every
stage + tool reads from, so the SAME code serves ANY project — this is what makes the app multi-tenant-ready.
Plan the context layer first and show me the plan before editing. Do not refactor unrelated code.
GATE: open two different projects (Marin + a second seeded one) and confirm each stage + the code lookup
reflect the correct project's context, verified in a real browser. Append session-log. PR for founder merge.
```

### Task 2 — Persistence / system of record
```
WRITE-LANE: builders-knowledge-garden. Worktree off origin/main. Plan-mode first.
GOAL: the magic-button answers and field reports (text + photo) write to the project record and SURVIVE
RELOAD — the system-of-record gate. Confirm the Supabase schema (project vlezoyalutexenbnzzui — confirm
first; reads safe, DDL via migration with founder approval). 
GATE: enter a field note + photo and a magic-button answer → reload → leave → return → all still there,
attached to the project, verified in a real browser. Append session-log. PR for founder merge.
```

### Task 3 — Kill the killerapp-quartet (coordinate, don't duplicate)
```
WRITE-LANE: builders-knowledge-garden. There are EXISTING branches fix/killerapp-quartet and
feat/viver-seal — review them first; extend or merge rather than redoing the work.
GOAL: clear the React #418 hydration error on /killerapp, the anonymous AI-take 401 hang, and the
old "B" header → Viver seal.
GATE: /killerapp loads with no hydration error, the AI take returns instead of hanging, and the header
shows the Viver seal — verified in a real browser. Append session-log. PR for founder merge.
```

---

## How to use this
Commit the foundation docs → spin up the Chat hub (A) → kick Cowork (B) running in parallel → start Code Task 1 (C). One step, prove it, next step.
