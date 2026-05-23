---
meeting_id: 2026-05-22-platform-review-john-mike
date: 2026-05-22
attendees: [Chilly (Charlie Dahlgren), John Bou, Michael Bou]
type: walkthrough  # source is a synthesized doc, NOT a verbatim transcript
duration_min: unknown
status: digested
touches:
  - production readiness positioning
  - CA HIC §7159 compliance
  - MEP deterministic calculation
  - PLG self-serve signup
  - audit logging retention
  - hybrid RAG
  - native signature engine
  - internal diligence-style validation (NOT external VC)
related_locks: []
calibration_partner: true  # Michael Bou first appearance — John's brother, joined the team
new_stakeholder: "Michael Bou (John Bou's brother, joined the team; doing diligence-style validation as part of onboarding to the project)"
source_warning: "Synthesized AI doc, not verbatim transcript. Aspirational language likely. The synthesis labeled Michael as 'Venture Diligence & Validation' which mis-frames his role — he's an internal teammate, not an external VC. Cross-checked below."
---

# Platform Review — John Bou & Mike B

## TL;DR

- **The source is a synthesis, not a transcript.** The document itself states word-for-word audio extraction wasn't available; what was uploaded is an AI-synthesized "technical product notes" rendering of the meeting. Treat all "deployed/implemented/integrated" language as aspirational positioning unless cross-checked. The Reality Cross-Check section below catches five direct discrepancies.
- **New team member: Michael Bou — John Bou's brother — has joined the project.** The AI synthesis mis-framed him as "Venture Diligence & Validation" (suggesting external VC). He's actually an internal teammate, with the diligence-style framing reflecting how he engaged with the product in the meeting, not an external role. This significantly changes the urgency around "clean up the language before he sees more" — he already heard it, alongside John.
- **The strategic intent is real and valid; the readiness claims overshoot.** Production-shift framing, CA HIC alignment, MEP determinism, PLG self-serve, 7-year audit retention, native signature engine, hybrid RAG — these are the right targets. Several are queued in `tasks.todo.md` as in-flight or deferred. None are honestly "deployed and ready for diligence" as written.

---

## ⚠️ Reality Cross-Check (this is the critical section)

The synthesis describes capabilities in past tense and shipped voice. The repo says otherwise. Five direct discrepancies:

### 1. Native Signature Engine — claimed "deployed," repo says deferred

- **Synthesis:** "Deployment of a native, secure digital signature infrastructure directly within the enterprise app cockpit. This tool bridges the gap between AI-generated material estimates and legally binding construction contracts, allowing immediate project authorization."
- **Repo (tasks.todo.md, open):** *"Wire actual signature service (Documenso self-host or Dropbox Sign API). Contract-send flow currently emails §7159-compliant PDF; recipient signs externally and uploads back."*
- **Reality:** Contracts generate as §7159-compliant PDF; recipient signs externally. No native in-app signature capture is live. This is a deferred item.

### 2. PLG Self-Serve Signup — claimed "implemented," Clerk still on mock

- **Synthesis:** "Implementation of a frictionless, product-led growth signup flow. This infrastructure removes manual sales gating, allowing scaling field operators to initialize multi-tenant workspaces instantly."
- **Repo (tasks.todo.md NOW, May 1 section):** *"Real Clerk auth (off mock)"* — still an open NOW item. Multiple entries: *"Clerk auth on `/killerapp/*` — still bundled with Stripe push,"* *"Saving filled contracts to the user's account — waits for Clerk auth,"* *"Full Supabase persistence of journey-progress events — MVP uses localStorage; server sync waits for Clerk."*
- **Reality:** Self-serve signup is not live. Auth is mocked. Multi-tenant workspace init is gated on Clerk going off mock, which is bundled with the Stripe push.

### 3. Audit Retention — claimed 7 years, repo says ~18 months

- **Synthesis:** "Deployment of an enterprise audit-log system featuring an immutable architecture with a **mandatory seven-year data retention rule**."
- **Repo (tasks.todo.md):** *"Verify round-4 `drop_old_audit_log_partitions` pg_cron job runs correctly on 2027-05-01 (first retention-drop fire)."* Schema sets monthly partitions with pg_cron retention; first drop fires roughly 12–18 months from setup.
- **Reality:** Retention is currently on the order of 18 months, not 7 years. Either the retention policy needs to change to match the diligence claim (and that's a Supabase migration), or the diligence claim needs to change to match policy. **Decision required before this language goes to Mike B in writing.**

### 4. Deterministic MEP Engine — "completely eliminates hallucinations" overstates current state

- **Synthesis:** "Hardening the mechanical, electrical, and plumbing (MEP) calculation engine. By shifting these core structural estimations from stochastic LLM behavior to deterministic data models, the platform **completely eliminates mathematical hallucinations** in cost estimation worksheets."
- **Repo (round-3 in-flight wishlist):** *"MEP panel + equipment schedules + load calc API"* — listed among 14 P1 wishlist items after the second dogfood verdict. Schema and API surface are in flight; "completely eliminates" is aspirational language.
- **Reality:** The architectural intent is correct — deterministic models for MEP math are the right move. The claim that hallucinations are *completely eliminated* is not currently verifiable and is the kind of absolute statement that breaks under diligence inspection.

### 5. "Transition complete / ready for VC diligence" — directly contradicts May 1 dogfood

- **Synthesis:** *"The transition from experimental code to an orchestrated operating system is complete. The application architecture, code boundaries, and compliance mechanisms are fully prepared for immediate venture capital due diligence and mass onboarding of paying general and specialty contractors."*
- **Repo (tasks.lessons.md, locked 2026-05-01):** *"'Smoke-test green' is not 'product works.'" On 2026-05-01 the 15/15 specialist smoke probe passed in production. The same evening, the founder attempted to create an estimate for a real ADU job in their own jurisdiction and the product loop broke — saves failed, bugs surfaced, the flow couldn't be completed.*
- **Repo (tasks.todo.md NOW):** Real-user bug bash, real Clerk auth, real Stripe at $99/mo, design partner outreach (10 targets, first 5 emails sent), construction attorney engagement — all still open.
- **Reality:** Three weeks ago the founder couldn't complete a real ADU estimate end-to-end. NOW items are still open. The "transition complete / ready for diligence" framing is the kind of pitch language that wins a first meeting but loses the second if Mike B (or any operator on his team) actually clicks around the product.

**The pattern:** AI-synthesized meeting docs use shipped voice for in-progress work. Every time. Strip that voice before it lands in any external doc.

---

## New framings / articulations worth keeping

- **"30-Second Hooks"** — naming convention for the platform's opening moments where automated municipal code analysis and contract capability surface before any onboarding friction. Crisp, contractor-resonant. **Decision call: ADOPT** as the onboarding UX term — already aligned with the existing "first 30 seconds is the wedge" thinking around Code Compliance Lookup as the May paywall trigger.
- **"System of record"** vs. "demo sandbox" — useful binary framing for diligence positioning, but only valid once the May 1 dogfood loop actually works end-to-end. Currently aspirational.
- **"Deterministic Telemetry Mapping"** — pretentious for what it describes (deterministic math models for MEP estimating). The underlying architectural choice is right; the label sounds like AI-generated marketing prose. **Decision call: REJECT the label, keep the architecture.**
- **"Hardened audit logging"** — fine as a description, but the 7-year retention claim must reconcile with actual retention before this language goes anywhere external.

---

## Decisions (made or proposed)

- **PROPOSED:** Reconcile audit retention — either change the pg_cron retention window to 7 years (Supabase migration + cost impact on long-tail data) or change the diligence language to match the current ~18-month window. Cannot leave both versions floating.
- **PROPOSED:** Treat the May 22 synthesis as forward-looking positioning, NOT as a state snapshot. Do not paste any of this language into investor materials without each claim cross-checked against the repo.
- **PROPOSED:** Mike B's "Venture Diligence & Validation" role implies he sees the real product, not the synthesis. Schedule a real product walkthrough where he creates a project on a real-feeling job and the loop holds end-to-end. If it doesn't hold, fix the loop before showing more.
- **REINFORCED:** "Smoke-test green is not product works" lesson (May 1). Applies in spades to AI-synthesized meeting docs — the synthesis is a smoke-test pass for the pitch language, not a verification of product reality.

---

## Open questions

- Is Mike B someone Chilly is courting for a specific check, or part of a broader diligence circle? (Affects how aggressively the language gets cleaned up.)
- Did the actual May 22 meeting commit to a 7-year audit retention rule, or did the AI synthesis hallucinate that number? (If real, schema migration is required.)
- Are the "deterministic MEP" claims a directional commitment the team is now executing against, or a description of what already shipped? (Per the round-3 wishlist, it's in flight.)
- The full name "Charlie Dahlgren" appears in the synthesis — is that Chilly's legal name, or did the AI hallucinate it from the file metadata? (Minor, but worth confirming for accuracy in any external materials.)

---

## Action items

- [ ] **Decide audit retention:** 7 years (requires migration) or 18 months (requires updating diligence language). Cannot remain ambiguous.
- [ ] **Strip shipped-voice language from any VC-facing material** that derives from this synthesis. Each claim must be either true today or rewritten as roadmap. Specifically: signature engine, PLG self-serve, deterministic MEP, "transition complete."
- [ ] **Schedule Mike B for a real product walkthrough** — founder dogfood loop on a real-feeling ADU job, observed in real time. Do not show him slides until the loop holds.
- [ ] **Record Mike B's role and questions** as a new calibration partner thread. Future meetings with Mike get their own digest entries.
- [ ] **Confirm "Charlie Dahlgren"** is the correct legal name or note the AI synthesis introduced an error.
- [ ] **Add a lesson to `tasks.lessons.md`:** "Synthesized meeting docs use shipped voice for in-progress work — cross-check before any external use."

---

## Notable quotes

These are direct phrasings from the synthesis. The first three are pitch-ready (with the readiness caveat). The fourth is the one to be careful with.

> "The Production Shift: Transitioning the codebase to act as a definitive system of record capable of handling real-world liability, financial data, and field scheduling logs for active commercial and residential contractors."

> "The 30-Second Hooks: Refining the platform's introduction sequence to immediately present automated municipal code analysis and active contract capabilities, addressing typical contractor pain points within the first moments of onboarding."

> "Hybrid Retrieval-Augmented Generation (RAG): This architecture dynamically pulls localized municipal zoning, setbacks, and building codes, indexing them against active builder blueprints inside the public Knowledge Garden layer."

> "The transition from experimental code to an orchestrated operating system is complete. The application architecture, code boundaries, and compliance mechanisms are fully prepared for immediate venture capital due diligence and mass onboarding of paying general and specialty contractors." — **This is the one to delete or rewrite. As written, it doesn't survive a real product walk.**

---

## Connections to existing canon

**Reinforces:**
- CA HIC §7159 compliance (existing `docs/CA-HIC-COMPLIANCE.md`, 250 lines)
- Production-shift trajectory (existing repo direction since round 4)
- Hybrid RAG architecture (`feat(rag)` shipped round 4: HNSW + vector-first `rag.ts` with FTS fallback)
- Audit log immutability and partitioning (round-4 schema shipped)
- "Smoke-test green is not product works" lesson (locked 2026-05-01)

**Renames / adopts new vocabulary:**
- "30-Second Hooks" — useful new term for the opening moments UX
- "System of record" — useful binary contrast with "demo sandbox"

**Conflicts with (must resolve):**
- 7-year audit retention vs. ~18-month pg_cron retention currently shipped
- "Native signature engine deployed" vs. "signature service deferred, PDFs emailed externally"
- "PLG self-serve signup implemented" vs. "Clerk auth still on mock, bundled with Stripe push"
- "Hallucinations completely eliminated" vs. MEP work in the round-3 in-flight wishlist
- "Transition complete / ready for diligence" vs. May 1 dogfood broke on real ADU estimate

**New territory:**
- Mike B as a stakeholder. First time on the record.
- VC-diligence-rehearsal as a meeting type (vs. internal alignment or product calibration).

---

## Calibration partner reactions

The synthesis does not capture John's or Michael's actual reactions or pushback. The document reads as a one-voice narration of the platform. Whatever Michael actually questioned (or didn't) during the validation conversation is lost in this format. With Michael now on the team, his first-impression validation signal is gone — irretrievably from this meeting.

Recommendation for future meetings with Michael as he gets up to speed: capture his specific questions and what struck him as inflated or unclear. He's the closest thing the team has to a fresh-eyed reviewer right now, and that fresh-eye window closes fast as he absorbs the founder narrative.

---

## Corrections (added 2026-05-23, after digest published)

After the initial digest was committed, Chilly clarified two facts that the digest got wrong:

1. **"Mike B" is Michael Bou — John Bou's brother — and is now working with the team.** The AI synthesis labeled him "Venture Diligence & Validation," which mis-framed him as an external VC diligence party. He's actually an internal teammate who happened to be engaging with the product in a diligence-style validation mode during the May 22 walkthrough.

   **Implications:**
   - The "schedule Michael for a real product walkthrough before more synthesis-language reaches him" urgency drops sharply. He was already in the May 22 meeting and heard the same synthesized language alongside John.
   - However, the action item still has merit as onboarding: he should see the product hold end-to-end on a real-feeling job as part of joining the team's reality.
   - "Mike B" mentions throughout this digest should be read as "Michael Bou."
   - The synthesis's "Venture Diligence & Validation" label is a hallucinated framing of his actual role.

2. **"Charlie Dahlgren" is Chilly's correct legal name.** Confirmed by the founder. The synthesis got this right. "Chilly" is the working nickname used across the project canon.

These corrections do not change the five Reality Cross-Check discrepancies or the new lesson filed about synthesized meeting docs. The overclaims about deployed capabilities are independent of who was in the room.

---

## Stats snapshot (as of 2026-05-22 — inferred from synthesis + repo state)

The synthesis itself doesn't cite specific numbers. From repo state as of this digest:

| Metric | Value | Source |
|---|---|---|
| Knowledge entities | ~2,256 with 100% `source_urls` coverage | round-6 work, `tasks.todo.md` |
| Audit partitions | 19 leaf partitions, all RLS-locked | round-6 RLS audit |
| Production commits | active through `8492130` (round 3) and beyond | `tasks.todo.md` |
| Smoke probes | 15/15 specialist green (2026-05-01) — but real-user loop broke | `tasks.lessons.md` |
| NOW items | 9 (May Path to First Dollar) | `tasks.todo.md` |
| Open framing decisions queued for founder | "Four Core Pillars," "Three-Zone Information Architecture," "30-Second Hooks," "System of record" |
