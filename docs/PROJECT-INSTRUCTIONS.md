# Builder's Knowledge Garden — Project Instructions

*Version 2.0 · 2026-06-10 · Tier 2 document · Companion to PLATFORM-CONSTITUTION.md*
*Supersedes v1.0 (2026-05-28). This document is also the TEMPLATE for every other garden's PROJECT-INSTRUCTIONS.md. Copy the structure, swap the content.*

---

## What BKG is

The Builder's Knowledge Garden is the operating system for the $17 trillion global construction economy — the flagship revenue-generating garden of The Knowledge Gardens platform. It covers the full journey from imagination to handover: **Dream and Design are freely navigable; the seven-stage Killer App lifecycle is the paid working core.**

BKG is not a code lookup tool. It is not a project management app. It is the everything platform — the connective tissue of global construction — across **nine user lanes** (founder-ruled 2026-06-10, Tier 0 wins): **Owner, General Contractor, Specialty Contractor, Architect, Lender, Supplier, Equipment, Worker, Robots/AI Agents.** No user is a second-class citizen; machines are first-class users (Design Constitution Goal 8).

BKG is **the cash engine that funds every other garden**. Money gardens fund meaning gardens — and the machinery transfers too: the catalog, QA gate, prompt library, taste loop, and portal mechanic are garden-agnostic.

---

## Current state (2026-06-10)

**Live at:** https://builders.theknowledgegardens.com

**Repo:** github.com/chilly611/builders-knowledge-garden (PUBLIC), branch `main`, Vercel auto-deploy. Confidential docs live in the PRIVATE repo `knowledge-gardens-docs` — private-by-default for anything internal.

**Phase 1 status:** The engine works — auth holds cross-machine (Safari OAuth resolved via full `@supabase/ssr` migration), context-routing generalizes (correct SF-specific grounding on a second project), voice→pipeline persists. The founder dogfood pass (John + Mike, 2026-06) proved the first five minutes fail, so **Phase 1's shipping gate expanded to include the first-run experience.** Re-house the engine behind a simpler front; do not rebuild it.

**Known P0:** prod links resolving to localhost (ERR_CONNECTION_REFUSED via back/continue). Fix is the open write-lane.

**Design lane shipped (2026-06):** two handoff-grade interactive specs in Claude Design — *First Run — The First Five Minutes* (five screens, acceptance criteria, motion specs) and *The Seed Bank & The Portals* (the team doctrine brief, seven fillable asset slots).

**Knowledge base:** ~40k entities across 8 domains and 140+ jurisdictions (verify live counts against the DB, not docs — synthesized status docs use "shipped voice"). CA is the beachhead; **Virginia (Virginia Beach + Richmond) is researched to developer grade and banked** — one statewide USBC model + two thin city overlays, sequenced after the CA honesty pass.

**Revenue state:** Pre-revenue. First paying customer target = Code Compliance Lookup + Contract Templates at **$99/mo** (brand-ambassador terms established). Building Intelligence API to follow (~$500/mo enterprise). 50 paying subscribers before any investor meeting.

---

## The seven-stage Killer App lifecycle (locked)

1. **Size Up** — scope, parameters, ballpark
2. **Lock** — scope signed, budget baseline
3. **Plan** — phases, codes, timeline, insight
4. **Build** — execution, where the work happens
5. **Adapt** — change orders, pay apps
6. **Collect** — draws, lien releases, closeout
7. **Reflect** — lessons captured, fed back into the knowledge garden

Stage names are **founder-locked**. Dream and Design are not lifecycle-gated.

---

## The doctrine (2026-06 additions — refer to decisions by NAME until the canon PR verifies numbers)

- **Visual-First (within the brand lock).** Every surface earns its keep visually. Money/scope options render as distinct AI-generated architectural imagery seeded from user context. Generation contract: generate once, persist, manual regenerate only, stream in behind a branded placeholder, branded static fallback — never ship an ugly render, never block the screen.
- **Two visual systems, one frame.** Platform chrome is herbarium-locked. The user's project imagery is aesthetically free — style, era, color, composition, light, motion, perspective follow the user's vision — inside brand-locked frames. *The frame is ours. The dream is theirs.*
- **Legible Judgment (the flags).** Green flags (ease, upside, location-inherent advantage) and watch/risk flags (schedule, cost, code/permit, difficulty) surface everywhere: color-first (sage/amber/rust — never #E8443A), plain headline, one-line why, "go deeper" for more. Per-fact contract `{value, source_url, source_type, confidence, tier, as_of}` with a three-tier serving gate (A auto / B disclaimer / C human-in-the-loop). Code/permit/cost claims carry a citation or "verify with your AHJ."
- **The Generation Flywheel.** Generation is a learning system. The platform proposes sensibilities; the user directs through choice, regeneration, nudging, uploads — every act of agency is a taste signal. Personalization is legible, never covert profiling. The moat is the context and event history in our catalog, not the generator.
- **The Seed Bank & Portals.** Three data layers: the **Vision** (theirs — private, never reused identifiably without an explicit share), the **Craft** (ours — de-identified process intelligence, always learning), the **Commons** (shared by choice — credited, browsable, remixable). Promotion is the consent moment. Origination is expensive, derivation is cheap: kept designs propagate across tiers, regions, and projects through lineage. Every rendered image is a portal — to its project, and when shared, to the platform.
- **First-run principles.** One door + example chips; plain words; money/time up front via tiers; infer-then-one-tap-confirm role read; progressive reveal (the dense cockpit is the expert view, reached via "go deeper" only); one thing brightest per screen; re-house the engine, don't rebuild it.

Full text: `docs/visual-first-and-flags.md` and `docs/first-run-and-onboarding.md`.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Database | Supabase (`knowledge-gardens-prod`, project ID `vlezoyalutexenbnzzui`) — **shared multi-tenant** across gardens |
| Auth | **Supabase Auth (PKCE + `@supabase/ssr`)** — any "Clerk" reference in older docs is STALE |
| Payments | Stripe (+ Stripe Connect planned for marketplace) |
| AI | Anthropic Claude API (primary; enable prompt/context caching on large specialist prompts) + Replicate FLUX (in-app images); Midjourney for the brand-asset pipeline (locked `--sref`) |
| Asset catalog | `public.brand_assets` + `brand_asset_events` (provenance, lineage, QA workflow, RSI feed) |
| Hosting | Vercel — auto-deploy from `main`; manual: `npx vercel --prod` with `$VERCEL_TOKEN` (never bare `vercel`; dashboard locked pending support) |
| Infra posture | Stay on Vercel + Supabase. GCP is **Later** with named triggers (~10k+ MAU, multi-TB egress, vector/analytics wall); AlloyDB is a future RAG/analytics capability lever, not a cost play |
| Monitoring | not yet wired — TODO |

---

## Brand — the herbarium lock (supersedes v1 palette entirely)

**Grounds:** cream/parchment `#F2E9D2` / `#FAF3DE`, vellum `#E8DDB8`. **Light backgrounds globally — and never pure white grounds.**
**Accents (one per piece):** teal `#3C7A8A` (primary), rust `#A53A2D` (alert), sage `#5E7A56` (success), brass `#B08D5C`, amber `#C68A3D`, gold `#7C6235`.
**Forbidden:** red `#E8443A`, pure white `#FFFFFF` grounds, pure black, dark mode, emoji in chrome, drop-shadow gloss, photoreal SaaS clichés.
**Typography:** Archivo (body) + Archivo Black (display) globally; Cormorant Garamond for botanical display accents; Space Mono for mono labels/captions.
**Prohibited copy:** "CRM" (use Pipeline / Command Center), "MVP" (use MLP), "AI COO", jargon without a plain-language landing.
**The one mark:** the Viver hammer-roots seal, rendered only via the shared `Seal` component — poster PNG + CSS breathe in headers (≤40px), lazy video with poster + reduced-motion fallback in heroes. One component, one asset.

---

## Founder-locked decisions

The numbered canon lives in `PLATFORM-CONSTITUTION.md` (Tier 0) — **numbering is verified there, not here; refer to decisions by name.** The standing locks, by name: MLP not MVP · the seven-stage lifecycle · domain-agnostic engine · light backgrounds (herbarium) · no "CRM" in copy · Archivo family · real end-to-end user loop is the shipping gate · 50 subscribers before investors · numbered decisions don't reopen · don't chicken out on principles · contract templates require legal review before first paid sale (non-negotiable) · plain language everywhere · database as the strategic moat · the structured knowledge base IS the product · AI-native not AI-bolted · voice is a universal layer · pros can see and control everything · the full lifecycle not a feature · productized Intelligence API · **Visual-First** + amendments (Generation Flywheel; Seed Bank & Portals) · **Legible Judgment**.

The last two land via the canon-reconciliation PR with verified numbers (a prior "Decision 18" collision exists — never overwrite, take the next free numbers).

---

## Operating discipline (load-bearing — violations have burned us)

1. **One repo-write lane at a time, per repo.** Worktrees off `origin/main` only. PR-only; founder merges. Claim the lane in `docs/session-log.md` before writing.
2. **Real-browser verification is the only verification.** Smoke-test green ≠ product works. Chrome AND Safari.
3. **Founder dogfood pass is the sprint gate:** real sign-in → project → workflow → save → leave → return → resume.
4. **Merge → deploy → dogfood before spinning up parallel work.** Integration debt accumulates faster than it merges.
5. **Shared Supabase prod is multi-tenant** (BKG, Orchid, Toxicology, EWG). Table names don't indicate ownership. No bulk deletes; no unsupervised mutation; backup + git-tag before risky changes. Founder applies migrations, supervised.
6. **Routing:** strategy/digestion/prompt-generation → the CTO Chat thread. Repo-writes/deploys/private-repo ops → Claude Code or Cowork **on the Mac**. Sandboxed Cowork = read-only/research/staging ONLY (no token, no private repo, possibly stale clone).
7. **Docs are private-by-default.** Public repo gets code + explicitly cleared principle docs only. Confidential → `knowledge-gardens-docs`.
8. **Sessions don't persist.** Repo files (`docs/session-log.md`, `tasks.todo.md`, `tasks.lessons.md`) are the source of truth; every session appends and pushes.
9. **Treat AI-synthesized status docs as aspirational** ("shipped voice") — cross-check against repo and DB state.
10. **New tables ship with RLS reviewed for privilege escalation** (e.g., creators must not be able to self-publish past a QA gate).

---

## File locations

**Canonical clone:** `~/Developer/bkg` (MacBook). **`~/Developer/bkg-main` is STALE** — retired 2026-06-10 after two independent sessions confirmed `bkg` as the only clone. Fix any doc or prompt that says otherwise.

**Canonical tracking files (public repo):** `CLAUDE.md` · `docs/session-log.md` · `tasks.todo.md` · `tasks.lessons.md` · `docs/design-constitution.md` · `docs/visual-first-and-flags.md` · `docs/first-run-and-onboarding.md` · `docs/first-run spec` (Claude Design: *First Run — The First Five Minutes*).

**Private repo (`knowledge-gardens-docs`):** SCHEMA.md, code-ingestion-hitl.md, STRATEGY-bulletproof-and-scale.md, REPO-AND-WORKTREE-MAP.md, MANIFEST.md, meeting transcripts, jurisdiction dossiers (VA Beach, Richmond, HITL readiness note), design-system-and-asset-inventory.md, architecture docs pending canonical-version ruling. Three docs already pushed public (SCHEMA + two transcripts) are queued for `git rm` on a dedicated branch after private copies are secured; history rewrite deferred to a quiet window.

---

## The canonical demo project

- **Project:** Modern Farmhouse Marin · UUID `55730cd3-5225-493d-8b5c-49086d942565`
- 4BR/3BA custom modern farmhouse · 4,000 sqft · Marin County, CA · the Harwell family
- **Budget:** $1.65M total — $312K spent, $186K committed, $1.15M remaining, $347K headroom
- **Timeline:** 37 weeks · **Stage:** Build at 42% (framing inspection passed); Size Up 100%, Lock 100%, Plan 85%
- Secondary demo (context-routing proof): "4-unit condo SF."

Demo data must reconcile to these numbers everywhere. Mismatches are bugs.

---

## What is hard and important right now (2026-06-10 — refresh from `tasks.todo.md` NOW at session start)

1. **P0 — prod localhost-link crash fix** (the open write-lane) → merge → real-browser verify.
2. **Canon reconciliation PR** — decision numbering, doctrine docs, path canon, nine-lane reconcile.
3. **Logo unification ticket** (kill the Owner-lane twin; variant-aware Seal).
4. **`brand_assets` migration** — apply WITH the patched creator/event RLS, founder-supervised.
5. **Item C — flags/code-serving backend:** per-fact schema + three-tier gate; CA honesty first (incl. AB 2622 $500→$1,000 check); image caching into `brand_assets`; Claude prompt caching.
6. **Item E — first-run rebuild** per the First Run spec (chips get one dreamer swap; machine-twin section required).
7. **Item F — Seed Bank engine:** taste profiles, sensibility packs, derivation-by-default, Browse port, portals.
8. **Fill the Seed Bank brief's 7 slots** (Midjourney, locked sref) — present to team; leave one slot for the live fill.
9. **Private-docs consolidation finish** + `git rm` branch.
10. **Contract template legal review** before first paid sale · **first paying contractor** at $99/mo.

---

## Cross-references

Platform values → `PLATFORM-CONSTITUTION.md` (Tier 0) · design law → `docs/design-constitution.md` (ten goals, seven primitives) · doctrine → `docs/visual-first-and-flags.md`, `docs/first-run-and-onboarding.md` · session ritual → `MANUAL-RSI-PROTOCOL.md` · prompts → `KICKOFF-PROMPTS.md`, `SESSION-PROMPTS.md` · asset system → brand-asset catalog migration + *Compounding Brand-Asset System* + *Viver Prompt Library* · lessons → `tasks.lessons.md`.

---

## Template usage (for other gardens)

When creating PROJECT-INSTRUCTIONS for another garden (MKG, TKG, OKG, HKG, KG-OS, Legal…), copy this file's structure and replace the garden-specific content: what it is, current state, primary lifecycle, stack deltas, chrome accents, garden-specific locked decisions, file locations, canonical demo, and the NOW list. Keep platform-level locks (herbarium light grounds, MLP, plain language, one-write-lane discipline, private-by-default docs, the Seed Bank engine). The shape stays the same; the consistency is what makes the platform navigable.
