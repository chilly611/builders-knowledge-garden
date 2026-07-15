<!-- Replace the STATE OF PLAY block at the TOP of tasks.todo.md with this. NOW = the dogfood gate. -->

# STATE OF PLAY — 2026-06-08 (post-orchestration thread)

## DONE (merged + deployed)
- #21 onboard-500 (`c70c48e`), demo-polish cockpit fixture (`d5faffe`), #22 PKCE (`5a62915`).
- **Chrome** Google sign-in works (PKCE fixed `missing_code`).
- Canonical demo row `55730cd3…` reconciled to seed — phase-1 (8 cols) live + verified; phase-2 (estimated_cost, next_milestone, the `*_state` blobs) approved, capture PR → main pending.
- Context-routing (#18), system-of-record persistence (#19), killerapp quartet (#17) — prior sessions.
- Frontiermap question RESOLVED: no repo (CLI-deployed static, Vercel project `frontiermap`).

## IN-FLIGHT (pending founder merge/action)
- **`fix/oauth-pkce-cookie-storage`** — Safari OAuth fix (hybrid cookie storage for the PKCE verifier). Review → merge → deploy → **Safari-confirm**. THE last gate-blocker. Escalation if Safari still fails: `@supabase/ssr`.
- **Canonical phase-2 capture PR** → main (backups + session-log + extended rollback).
- **Phase-kickoff drafts** — local branch `preservation/phase-kickoff-2026-06-08`; preserve to a PRIVATE backup (NOT public origin — RLS disclosure); review post-Phase-1.

## NEXT GATE — Phase 1 close: THE FOUNDER DOGFOOD PASS
**Run only after Safari auth is confirmed on prod.** Use the product as a contractor would on a real-feeling job (the canonical Marin project), in a **real browser — BOTH Chrome and Safari**, from a **genuinely clean state**. Log every break; breaks become the next NOW block.

The loop + what to check (the dogfood menu):
1. **Sign in** (Google) → lands in the app. Both Chrome AND Safari, clean/private window. No `missing_code`, no "verifier not found", no bounce to /login.
2. **Open the Marin project** → loads with correct context: "Modern Farmhouse in Marin", $1.65M / Build 42% / Marin County CA / the Harwell family. No demo-data drift, no React #418 hydration error, no AI-take 401 hang.
3. **Walk the stages** (Size Up → Lock → Plan → Build → Adapt → Collect → Reflect) → each reflects the *correct project's* context (building-type × jurisdiction × lane × project) — nothing hardcoded/Marin-bound-but-wrong, no "1,800 sf"/lowercase leftovers, no wrong-jurisdiction labels; the cost badge reads the seed estimate range (consistent with $1.65M).
4. **Code Compliance Lookup** → run a real lookup → returns a **grounded, cited** answer (jurisdiction / section / code version / verified-date), honest about coverage ("verify with your AHJ"). Never a mock or hallucinated answer. No-match → it says so and offers to flag. (This is D1, the revenue trigger.)
5. **Field report** → enter a field note + upload a photo → saves to the project.
6. **Magic button / copilot** → ask it → returns a real grounded answer (not mock; ANTHROPIC_API_KEY set on prod).
7. **Voice field report** → record/enter → saves.
8. **Persistence (system-of-record gate)** → **reload** → all of the above still there. Then **leave** (navigate away/close) → **return** → **resume** → still all there, attached to the project.
9. **Zero breaks** in BOTH browsers: no hydration errors, no 401 hangs, no wrong-jurisdiction labels, no data drift, no console errors.

**Gate cleared = Phase 1 done.** The break log = the Phase-1 punch list (fix, re-dogfood). Then Phase 2.

## WATCH / queued (NOT blocking the gate)
- **Bug:** `src/app/globals.css --bg:#ffffff` overrides tokens → prohibited pure white at `<body>`. One-line fix; queue immediately after auth. (Locked-brand violation.)
- **P0 security:** 21 open-RLS tables on shared prod (`20260531_rls_group_a_lockdown.sql` closes only 7; + a foreign `knex` co-tenant). Dedicated, careful pass — policy-per-table, branch-tested, backup first, co-tenant coordination. NOT a blind-enable. NOT on the public repo.
- **Rotate** the Vercel token (pasted in chat).
- **Phase-kickoff decisions (5):** HITL row treatment (rec: Option B — keep published, gate trust badge on `manually_verified_at`); per-product `docs/project-instructions/` location + dream→project handoff (Size Up vs pre-populated Plan); enterprise (separate Supabase vs hardened shared-RLS; SSO phase 2/3; SOC2 vs ISO); Viver seal canonical source. Decide at draft review (post-Phase-1).
- Emoji stage glyphs / asset orphans (design-system cleanup); route-casing typo (`/theKnowledgeGardensOS` lowercase).
- **Back up + version frontiermap** before further investor demos — it has no repo (CLI-deployed static), and the apex Frontier-59 page, `/john`, and `/john/descent` exist only as deployed files on the Mac (only the OS page + `/walkthrough` are recoverable from the builders repo). Fundraise-load-bearing **and** the least-protected asset — give it a repo + commit the bundle.
- **HITL build** (Phase 2, before broad compliance selling): land ingests `status='review'` → approval queue → promote to `published` with audit trail. Machinery already exists in code (`manually_verified_*`, `audit_log`, `/admin/verify`) — the gap is the status gate + a backfill triage of the 2,256 published/0-verified rows (Wave 1 = the 1,998 auto-flagged). Plus the re-bucketing cleanup (474 mis-domained rows).

## STRATEGY DELTAS — from the 6/7 "Demo & Readiness" meeting (fold into STRATEGY-bulletproof-and-scale.md)
- **Scope clarity:** near-term deliverable is a scalable, shippable **system-of-record + contractor handoff**, NOT a field-ready on-job tool yet.
- **Legal THIS WEEK (#11):** Chilly engages a lawyer this week for contract templates + liability language. Templates stay flagged OFF until cleared; the e-sign *mechanism* (GC signs their own docs) can ship.
- **Jurisdictions:** CA stays the beachhead; **add Virginia Beach + Richmond** as Mike's research targets (UpCodes access from Chilly). Compliance contract holds (cite official gov sources, user double-check, HITL gate).
- **Infra:** evaluate **Google Cloud** components for cost (currently Vercel + Supabase).
- **Pricing:** $99/mo + special brand-ambassador terms.
- **GTM:** intro video sped up + voiceover + music (Chilly produces → John distributes); John's lower-stakes 1-hr developer session; Kirk to introduce devs/builders when ready.
- **AI:** "Hive Mind" horizon (Anthropic primary + ChatGPT + optional Gemini) — forward note, not Phase 1.
- **Synthetic dogfood** (synthetic contractor scenarios) complements the founder dogfood for edge cases.

## MIKE'S LANES (SF front — see MIKE-ONBOARDING.md)
- **Read-only/plan-only first (parallel-safe with the auth/dogfood write-lane):** VA jurisdiction research (Virginia Beach + Richmond) via UpCodes; GCP cost evaluation.
- **Build lane (claim the write-lane in session-log first; take only when the BKG write-lane is free):** daily brief / daily log lane.
- Coordinate write-lane ownership with Chilly in `docs/session-log.md` — SD and SF must never both hold the BKG write-lane at once.
