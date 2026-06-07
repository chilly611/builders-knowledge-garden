# Builder's Knowledge Garden — Tasks

## Vision: The EVERYTHING Platform for the $17T Global Construction Economy
**Full lifecycle: DREAM → DESIGN → PLAN → BUILD → DELIVER → GROW**
**Every phase, every layer, every stakeholder — simultaneously**

---

## Guiding Principles
- **Minimal Lovable Product (MLP)** — "Minimum Viable Product" is not in our vocabulary. We ship things people LOVE, not things that barely work.
- **Knowledge is the foundation** — 40K+ entities are the floor, not the ceiling. Everything we build is smarter because of the knowledge engine underneath.
- **The databases ARE the product** — The 40 structured databases are what make us the most informed AEC destination in the universe. Everything else is UI on top of the data. Every entity gets its own URL. Every relationship is queryable. Every piece of data serves humans, AI agents, robots, and LLM crawlers.
- **Voice-first everywhere** — Voice is a layer across the ENTIRE platform, not a separate product.
- **AI-native from day one** — Every feature has AI woven in. Not bolted on.
- **The full journey** — We don't build tools. We build the operating system for the entire lifecycle of building anything, anywhere.
- **The platform carries the cognitive load** — Humans have limited memory, energy, and attention. The platform tracks ALL variables, surfaces what needs attention NOW, presents clear options with tradeoffs, and the human decides with confidence.

---

> **Live backlog resets here (2026-06-07).** Completed/superseded batches through 2026-05-31 moved to [tasks.todo.archive.md](tasks.todo.archive.md).

## ═══ NOW — Phase 1: First-Paying-Contractor Path ($99/mo) (2026-06-07, Claude Code / Opus) ═══

> Slice: Code Compliance Lookup + Contract Templates, wired to Claude API, behind the paywall.
> THE BAR: bulletproof revenue loop · grounded+cited compliance · #11 legal gate on contracts.
> One UI-editing lane at a time, PR-only, founder merges. Recon + Legal parallelize.
> Shipping gate = real human dogfood of the paid loop (smoke-green ≠ works).

### Lane 0 — Recon (read-only, no writes) [BLOCKS precise scoping of Lanes 1–2]
- [ ] Merge state of feat/shared-app-shell, feat/rsi-heartbeat, feat/compliance-service vs main
- [ ] Stripe routes + mock-vs-real + whether the access gate reads real subscription status
- [ ] Compliance entity schema (source_url, jurisdiction, code_version, verified_date, status) + counts by jurisdiction and by status
- [ ] What feat/compliance-service exposes + whether it cites retrieved entities
- [ ] ANTHROPIC_API_KEY state on preview/prod + copilot mock-vs-live
- [ ] Contract-template + e-sig surface state

### Lane 1 — Billing: real $99/mo revenue loop (Code, PR-only)
- [ ] Stripe checkout creates a real $99/mo session (not stub)
- [ ] Webhook updates subscription status in DB (active / past_due / canceled)
- [ ] Access gate reads REAL subscription status, not a mock boolean
- [ ] Customer portal: manage / cancel works
- [ ] /pricing surface: $99/mo, herbarium + light, no "CRM", correct copy
- [ ] Loop survives leave→return: sign out → sign in → still subscribed, access intact

### Lane 2 — Compliance product: grounded + cited Lookup (Code, PR-only, files disjoint from Lane 1)
- [ ] Query (jurisdiction + project params) → retrieve authoritative entity → AI plain-language applicability
- [ ] EVERY code claim cited to {jurisdiction · section · code_version · verified_date}; verified_date shown explicitly ("not yet verified" when blank)
- [ ] Source attribution + link where available
- [ ] HARD RULE: no matching entity → say so + offer to flag for ingestion; NEVER hallucinate a code answer
- [ ] Standing disclaimer: "AI helps you find/understand the code; you/your AHJ/engineer verify. Not legal or engineering advice."
- [ ] Copilot out of mock mode (real ANTHROPIC_API_KEY on preview/prod)

### Lane 3 — Contract Templates: built, flagged OFF for sale (Code, PR-only, separate surface)
- [ ] Template surface + AI-assisted fill renders
- [ ] Single feature flag gates SALE/availability — OFF until Lane 5 clears
- [ ] Not exposed for purchase; not usable for a real paid contract pre-sign-off

### Lane 4 — Compliance verified-date fast-follow (ops/non-code) [D2(ii)]
- [ ] Human verified-date pass for FIRST-SOLD jurisdictions only (CA + SF)
- [ ] On-ramp to the full governed-ingestion review queue (review → approve → published + audit)

### Lane 5 — Legal gate #11 (Cowork/non-code, parallel) [unblocks selling Lane 3]
- [ ] Deliver the counsel brief (decision: counsel + delivery target — founder)
- [ ] Counsel reviews contract templates + e-sig enforceability (CA first)
- [ ] Sign-off flips the Lane 3 feature flag ON for sale

### Lane 6 — Verification gate: paid-loop dogfood (founder + Chat) [SHIPPING GATE]
- [ ] New account → paywall → subscribe (test → live) → real CA/SF query → cited+versioned+verified-date answer → leave → return → still subscribed, history persists → cancel via portal works
- [ ] Logged to docs/dogfood/<date>-paid-loop.md
