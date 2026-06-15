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

## NOW (2026-06-12 — serial write lane; one BKG lane at a time)
- [x] P0 crash path — cured by #24 ssr migration, founder-verified on prod
- [x] Canon reconciliation (#26) — Visual-First = D20, Legible Judgment = D21
- [x] Nav-chrome demo blockers (#27) — bloom, one pill, strips navigate
- [x] Collaborator-save P0 (#29) — member grants + visible failure
- [ ] Founder gate on #29: real-browser prod verify (fresh acct + collaborator), Chrome+Safari
- [ ] LOOP 1 — onboarding trust: wire onboard-new-user into live signup; consent-screen
      branding; one $99 Stripe checkout E2E
      └ $99 Stripe checkout: code + schema HARDENED (PR `feat/stripe-checkout-harden`,
        2026-06-14). FOUNDER GATE to close: apply `20260614_stripe_wire_reconcile.sql`
        to prod (supervised) → set `STRIPE_PRICE_PRO`=$99 + `STRIPE_WEBHOOK_SECRET` →
        TEST-mode 4242 E2E → live-mode `STRIPE_LIVE_MODE=true` re-test.
- [ ] LOOP 2 — honesty backend (Item C): per-fact contract + 3-tier gate + HITL queue;
      CA honesty pass (AB 2622, 2025-edition currency); UPCODES_API_KEY flip;
      image + prompt caching
- [ ] LOOP 3 — first-run rebuild (Item E, needs demo feedback) · LOOP 4 — Seed Bank (Item F)
- [ ] Garden-engine extraction: PAUSED behind Loops 1–2 (founder ruling 2026-06-12)
- [ ] Parallel founder: attorney engagement letter · brand_assets migration window ·
      private-docs git rm · Seed Bank slots · local clone: checkout main + pull
- [x] Session-log catch-up entries for #28/#29/#30 — appended this lane (2026-06-12, `chore/authed-fetch-leftovers`)

## NOW (2026-06-10 — superseded by 2026-06-12 block above)

- [x] **Nav-chrome demo blockers (2026-06-10, PR pending founder merge):** compass bloom restored (legacy FABs suppressed on /killerapp + full workflow catalog back in the shell panel) · Ask/Tell merged into the one pill (Ask|Tell tabs, real copilot) · strips navigate (budget cells→budget, journey nodes→stage pages). Branch fix/nav-chrome-demo-blockers.

- [ ] **P0 — prod localhost-link crash fix** (open write-lane) → merge → real-browser verify Chrome+Safari on prod
- [ ] **Canon reconciliation PR** (docs-only, behind P0): verify decision numbering (existing "Decision 18" collision — take next free numbers), append Visual-First + Legible-Judgment from `PLATFORM-CONSTITUTION-APPEND.md`, commit `docs/visual-first-and-flags.md` + `docs/first-run-and-onboarding.md`, retire `bkg-main` path, nine-lane reconcile note in design-constitution
- [ ] **Logo unification ticket** (behind canon PR): kill Owner-lane twin, 4 surfaces → `<Seal>`, variant-aware header poster + breathe; do NOT touch /intro
- [ ] **Apply `20260609_brand_assets.sql` WITH the patched RLS** (creators draft-only; promotion service-role-only) — founder-supervised on shared prod
- [ ] *(parallel, founder)* **Fill the Seed Bank brief's 7 slots** in Midjourney (per-slot prompts in the doc's registry; herbarium slots use the locked sref) — fill 6, present, fill the 7th live
- [ ] *(parallel, founder)* **Private repo populate** (`knowledge-gardens-docs`) from the Mac, then the `chore/remove-confidential-docs` git-rm branch + PR
- [ ] **Item C — flags/code-serving backend:** per-fact schema + three-tier gate; CA honesty pass first (verify AB 2622 $1,000 floor in live data); image caching into `brand_assets` + CDN; enable Claude prompt caching on specialist prompts
- [ ] **Item E — first-run rebuild** per the First Run spec (pre-req: one dreamer chip swap + machine-twin section appended to the spec)
- [ ] **Item F — Seed Bank engine:** taste_profiles, sensibility packs, derivation-by-default, Browse port, portal deep-links
- [ ] **Design spec follow-ups:** dreamer chip; machine-twin sections (First Run + Seed Bank brief)
- [ ] **Contract template legal review** before first paid sale (non-negotiable) · **first paying contractor** at $99/mo

### Banked (do not open early)
- Virginia wiring (VB + Richmond dossiers, HITL readiness note) — after CA honesty pass; same per-fact schema
- RLS remediation apply (21 open-RLS tables) — plan exists; quiet supervised window only
- GCP — Later, with triggers (~10k+ MAU / multi-TB egress / vector-analytics wall); AlloyDB = capability lever
- History rewrite for removed public docs — quiet window, no in-flight branches

---

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
