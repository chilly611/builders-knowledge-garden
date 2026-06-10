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

# NOW — 2026-06-08 (post-dogfood pivot)
Phase 1 gate now includes the first-run experience (MLP = lovable). Two tracks, non-colliding:
TRACK A — plumbing (one write-lane at a time):
- [ ] P0: localhost crash — prod links to localhost (ERR_CONNECTION_REFUSED) via back/continue. Find +
  kill the hardcoded localhost; verify on prod, real browser.
- [ ] Persistence gap — some flows drop state ("Who's asking") though pipeline-add persists. Route to the
  working Supabase write path.
- [ ] LLM determinism — cache the first good AI take (+ generated images); stop recomputing on render/
  re-run; pin the prompt; gate "Run it again."
TRACK B — first-run rebuild (design-led, parallel; non-write until Code picks it up):
- [ ] Design: first-run spec — one door (one high-contrast field + example chips), plain words, money-
  forward Budget/Business/First-Class visual tiers, green/red flags surfaced visually, "go deeper" box
  next to upload/browse/generate-image, role read (infer→one-tap-confirm). Per docs/first-run-and-
  onboarding.md + docs/visual-first-and-flags.md + the brand lock.
- [ ] Code: build the first-run as the next write-lane after the crash fix merges.
Queued (not the gate): globals.css pure-white one-liner · 21-RLS careful pass (P0 security, branch-tested,
NOT public repo) · Vercel token rotation · image-gen subsystem scoping (parallel) · per-product
instructions landing.

DOCS — canon reconciliation (2026-06-10, branch docs/canon-reconciliation, PR pending founder merge):
- [x] Constitution decisions **20** (visual-first canonical + Amendments A flywheel / B Seed Bank & portals)
  + **21** (legible judgment — flags, per-fact contract, three-tier gate) appended verbatim; 18/19 kept
  unrenumbered, reconciliation note says 20/21 govern where wording differs.
- [x] visual-first-and-flags.md addendum (flag taxonomy, rights layers, sensibility packs, portals,
  Dream Machine ports) · first-run doc references the Claude Design spec "First Run — The First Five Minutes".
- [x] Path canon: ~/Developer/bkg canonical, bkg-main STALE/RETIRED (REPO-AND-WORKTREE-MAP.md) — move
  .vercel out of bkg-main before pruning it.
- [x] design-constitution Goal 10: eight → NINE lanes (decision 16 list, Tier 0 wins), dated note.
