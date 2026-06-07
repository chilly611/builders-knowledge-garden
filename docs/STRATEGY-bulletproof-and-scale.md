# Knowledge Gardens — Phase Strategy: Bulletproof & Scale the Killer App
*Shareable team brief · supersedes the stale strategy docs · 2026-06*

## The moment
The investor demo landed. We now have seriously interested investors and incoming introductions to **large-scale construction developers** who could be our first real customers. The entire Knowledge Gardens umbrella's funding rides on one proof:

> **We can ship the Killer App, it functions exactly as promised — a true system of record plus the promised tools — and it scales.**

## The one thing (north star)
A large general contractor runs a real job in the Killer App, as their system of record, end to end — and it does not break. Every decision this phase serves that one sentence.

## The bar — three words, defined so we can't fool ourselves

**Bulletproof.** The real signed-in loop works for a real GC on a real project, *every single time*: sign in → open their project → context routes correctly → the promised tools work → data persists → leave → return → resume. No demo-data drift, no hydration errors, no auth hangs, no wrong-jurisdiction labels.

**Functions as promised.** The v1 promises actually work, not just in a demo: system of record (everything the GC enters persists, with an audit trail), code/compliance lookup (cited, honest about coverage), budget + schedule + sequencing, field reporting with photos, and the magic button returning real, grounded answers.

**Scalable.** Many GCs, many projects, isolated (multi-tenant, row-level security done right); context-routing generalizes (building-type × jurisdiction × lane × project, never hardcoded to one demo); holds up under concurrency; knowledge ingestion is governed by a human review gate; auth, billing, and onboarding scale; observability is wired; and the engine is demonstrably reusable across gardens.

## The phases — bite-size, each with a gate
We move **one phase at a time**. A phase isn't "done" until its gate is proven in a real browser.

**Phase 0 — Set the field (this kickoff).** Fresh, coherent docs; a clean repo/worktree map; the operating model; one canonical truth.
*Gate: everyone is working from the same constitution and the same map.*

**Phase 1 — Bulletproof the loop (canonical project).** Fix context-routing, lock persistence, kill the known bugs.
*Gate: the founder dogfood pass runs the full loop on Marin — sign in → workflow → save → leave → return → resume — flawless, in a real browser.*

**Phase 2 — Generalize & multi-tenant (any GC project).** Self-serve project creation, multi-jurisdiction, tenant isolation.
*Gate: a brand-new GC creates their own job and the whole loop works; two tenants cannot see each other's data.*

**Phase 3 — Enterprise-ready (first big developers).** Roles/permissions, audit trails, the e-signature mechanism, performance at scale, onboarding + support.
*Gate: a large-scale developer runs a real project; security and reliability hold under their load.*

**Phase 4 — Investment-ready proof.** Adoption, reliability, retention metrics; the scalability and umbrella-engine story, demonstrated.
*Gate: the proof investors asked for is real and on a dashboard.*

**Parallel supporting tracks** (never block the spearhead): Dream Machine as freemium top-of-funnel, and the umbrella site kept coherent. The Killer App is the tip of the spear.

## How we work (operating model)
- **Chat (this hub)** — strategy, sequencing, digesting reports, writing the prompts. Does *not* write repo code.
- **Claude Code** — repo writes. One write-lane per repo, worktree off `origin/main`, PR-only, founder merges.
- **Cowork** — research, parallel autonomous work, skills; read-only / plan-only on the repo.
- **Claude Design** — visual and design-system work.
- **Two fronts** (San Diego / San Francisco) coordinated through `docs/session-log.md` so we never collide on shared production.

**Non-negotiable disciplines (hard-won):** smoke-test green ≠ product works; verify in a real browser, not by grep; a founder dogfood pass every sprint; back up + git-tag before risky changes; never mutate shared production (domains, env, brand assets, demo DB) unsupervised; freeze production during demos.

## The doc system (so it stays navigable)
A single source of truth, tiered:
- **Tier 0** — `PLATFORM-CONSTITUTION.md` (umbrella values + locked decisions; governs every garden).
- **Tier 1** — Protocols: `INTERFACE-PROTOCOLS.md`, `MANUAL-RSI-PROTOCOL.md`, `SESSION-PROMPTS.md`.
- **Tier 2** — Project-Instructions per product: KG Umbrella, Builder's Knowledge, Killer App, Dream Machine.
- **Tier 3** — Repo-level: `CLAUDE.md`, `tasks.todo.md`, `tasks.lessons.md`, `docs/session-log.md`, the Design-System & Asset reference.
- **Plus** — the `REPO-AND-WORKTREE-MAP.md`.

## The vibe
**#aikidotheAI** — we don't fight the AI wave, we redirect its force as a multiplier for builders. We build the highest-quality version that's ever been built, in small, confident, verified steps. We don't stress the whole mountain at once; we take the next clear step, prove it, and move.
