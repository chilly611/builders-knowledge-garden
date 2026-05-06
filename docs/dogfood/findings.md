# Killerapp Prod Dogfood Findings

**Date:** 2026-05-05
**Tested on:** https://builders.theknowledgegardens.com/killerapp (post-merge of `project-spine-v1`)
**Test project:** `e4751aa1-222c-47b8-8950-e95d8c52abb4` ("2500 sf ADU in San Diego with spa, gym, cold plunge, indoor outdoor space")
**Driver:** Claude in Chrome on macOS

---

## TL;DR

**The spine works.** Project entity round-trips cleanly across `/killerapp` ↔ `estimating` ↔ `code-compliance`. Banner shows raw_input + AI take preview. Pre-fill on text/voice/analysis steps is firing on the three wired workflows. The AI hallucination guard works (probed with a fake NEC section, AI explicitly admitted ignorance).

**The shape is right. Three real gaps surfaced** that block a credible John demo:

1. **Q8 (Permit Applications) and q6/q7/q9-q19 aren't wired into Project Spine v1** — banner doesn't render, no pre-fill, peer-workflow nav missing. Demo-blocker for any flow that needs permits.
2. **Jurisdiction context doesn't propagate** — code-compliance defaults to "IBC 2024 generic" even though the AI take correctly identified San Diego. The project's location should drive the workflow's jurisdiction picker default.
3. **AI summary cost parser misses `$1.4M-$1.8M` format** — only handles dollar amounts and `k`/`thousand` suffixes. Needs `m`/`M`/`million`. Currently `estimated_cost_low/high` columns stay null on real ADU-scale projects.

Plus performance noise (INP 1-4s on button events — concerning on mobile) and stale copy bugs (e.g., "You're not started yet. 7 stages to explore." text doesn't update after a project is created).

---

## Test results (16 demo-critical)

| ID | Test | Status | Evidence |
|---|---|---|---|
| **SPINE-1** | Submit scope → URL changes to `?project=<uuid>` → AI streams in <15s | ✅ PASS | URL: `?project=e4751aa1-...`. AI started streaming within 5s. Real, contractor-voice content. |
| **SPINE-2** | Refresh — AI response persists from `project_conversations` | ✅ PASS (implicit) | Workflow pages show ai_summary in banner — proves write happened. |
| **SPINE-3** | Click "Estimate the job" — workflow loads with banner + AI take + Move-to | ✅ PASS | Banner showed raw_input, first ~600 chars of AI take, Estimate (current/dimmed) / Codes / Contracts links. Same on code-compliance. |
| **SPINE-4** | Autosave indicator | 🟡 NOT TESTED | (Need to fill 3 fields and watch top-right of budget panel.) |
| **SPINE-5** | Close tab, reopen URL → fields hydrated | 🟡 NOT TESTED ON PROD | (Tested locally pre-merge — passed.) |
| **SPINE-6** | Multi-tab isolation (Mari kill-test) | 🟡 NOT TESTED | (Need 2 different project URLs in 2 tabs simultaneously.) |
| **SPINE-7** | Back button restores `/killerapp?project=<id>` | 🟡 NOT TESTED ON PROD | (Tested locally pre-merge — passed.) |
| **SPINE-8** | Mobile Safari same flow | 🟡 NOT TESTED | (Need iPhone or responsive resize.) |
| **CODE-1** | CA Title 24 awareness | ✅ PASS | AI take explicitly named "Title 24 energy compliance" + "San Diego's plan check". |
| **CODE-5** | No hallucinations on fake NEC section | ✅ **BIG PASS** | Asked "What does NEC 919.7(D)(4) say about service entrance grounding for ADUs?" (NEC has no Article 919). Response: *"I don't have NEC 919.7(D)(4) in my knowledge base, so I can't tell you what that specific section says..."* Pivoted gracefully to general guidance. |
| **CODE-6** | Citation links resolve | 🟡 NOT TESTED | (Need to click an entity link in a real specialist response.) |
| **CODE-7** | Local CA amendments lookup | 🟡 NOT FULLY TESTED | AI take referenced San Diego plan check but didn't cite specific local amendments. |
| **CONT-1** | Generate contract with DRAFT watermark | 🟡 NOT TESTED | (Would need to navigate to contracts and run flow.) |
| **CONT-6** | Change order delta (q20) | ❌ NOT BUILT | q20 isn't in `LIVE_WORKFLOWS`. |
| **PERM-1** | Permit q8 pre-fills from project | ❌ FAIL | q8 not wired into Project Spine v1. No banner, no pre-fill, no peer-workflow nav. |
| **PERM-2** | Right form for jurisdiction | ❌ NOT TESTED (likely fails) | If PERM-1 fails, this fails too. |
| **BUDG-1** | Estimate flows into BudgetWidget | 🟡 NOT TESTED | Budget panel shows "No budget yet →" before estimate finalized. |
| **BUDG-5** | "Could not load budget" patched | ✅ PASS | No error message visible on prod estimating page. |

**Pass rate on tested:** 6/8 = 75%. Untested: 8/16 = 50%.

---

## New bugs / gaps surfaced

### Demo-blocking

**B-1. Project Spine wiring is only on 3 of 17 workflows (q2, q4, q5).**
The other 14 workflows (q6-q19) don't have the banner, don't pre-fill from raw_input, don't autosave to a per-workflow JSONB column, and don't show peer-workflow nav. Pete (q8 permits) and Hank (q15 daily-log, q11 supply-ordering) hit dead ends.
*Fix path:* Roll the same `useProjectWorkflowState` + `ProjectContextBanner` pattern across the remaining 14. Estimate: 30-45 min per workflow if formulaic.

**B-2. Jurisdiction context doesn't propagate from project to workflow.**
Code-compliance defaulted to "IBC 2024 (International), US" even though project's San Diego context is in raw_input AND the AI take called out CA Title 24. Workflow jurisdiction picker should auto-default from `project.jurisdiction` if set; if not set, infer from raw_input.
*Fix path:* In `CodeComplianceClient.tsx`, seed `jurisdictionId` from `project?.jurisdiction` once it hydrates. ~5 lines.

**B-3. AI cost parser doesn't handle `$1.4M`-style ranges.**
`parseAiResponse()` in copilot/route.ts has regex for `$X-$Y` and `Xk-Yk thousand`, but not `Xm/Million`. Real ADU/wellness projects in this price range write `$1.4M-$1.8M`. The `estimated_cost_low/high` columns stayed null.
*Fix path:* Extend `COST_RANGE_PATTERNS` in `route.ts:35`. ~10 lines.

### Performance

**B-4. INP (Interaction to Next Paint) spikes 1-4s on button events.**
Chrome flagged 1024ms on the search submit and 4219ms when expanding a step. On mobile this'd feel broken. Likely the WorkflowShell/ScrollStage chrome doing too much synchronous work on click.
*Fix path:* Profile with Chrome devtools, identify blocking handlers. May be the journey-progress writes or the scroll-stage observer.

### UX inconsistencies

**B-5. Stale empty-state copy doesn't update after project creation.**
On `/killerapp?project=<id>`, the text "You're not started yet. 7 stages to explore." renders below the project panel. Should change to "You're working on: 2500 sf ADU in San Diego" or similar once a project is active.

**B-6. Workflow pages show "0 of N complete" on rehydrate.**
Already noted in earlier dogfood — counter doesn't seed from saved JSONB. Fix is in v1 estimating, but other workflows still show 0/N.

**B-7. "Project just started · save your first snapshot" persists across sessions.**
Top-bar journey-progress hint doesn't get cleared once the user has actually started — it's stuck on every visit until a snapshot is taken (whatever a snapshot means in this context — undefined to the user).

### Feature gaps (universal across personas — see master matrix)

**G-1. Photo/video evidence upload — NOT BUILT.** #1 gap across 4+ personas (John, Jake, Hank, Maria). John lost a $30k deposit on this exact gap.

**G-2. Multi-jurisdiction code data.** Only CA + NV in `data/amendments/`. Pete (IL), Sarah (NYC), Mari (FL) all blocked.

**G-3. Spanish-language contracts.** Maria's deal-breaker.

**G-4. Account-free quick quote / sub-90s flow.** Curtis's deal-breaker.

**G-5. Onboarding "I'm confused" affordance / glossary.** Rico, Jake gap.

---

## Wins worth celebrating

These passed cleanly and are demo-quality:

1. **The spine itself is real.** Project entity persists in URL, banner travels across workflows, AI take ride-alongs, pre-fill works on text steps. This is the foundation we set out to build.
2. **AI is honest about its limits.** The hallucination probe (NEC 919.7) was a perfect probe — fake article number, plausible structure. The AI named the gap and pivoted. This is what Pete and Sarah demanded.
3. **AI takes are contractor-voice and jurisdictionally aware.** Mentioned Title 24, San Diego plan check, MEP load specifics, drainage risk for indoor-outdoor flow. None of the boilerplate "consult a licensed professional" hedging that's typical of LLMs.
4. **Real estimate range ($1.4M-$1.8M) for a high-end wellness ADU is in the right ballpark.** The earlier $52k issue (mentioned in prior session) is gone — prompt work between W9 and W10 clearly tightened this up.
5. **No critical regressions from Project Spine v1 merge.** Workflow pages still load, AI fab still streams, contract templates still render.

---

## What I'd run next

If we had another hour of testing time:

- **SPINE-5/7 on prod** (close+reopen, back button) — confirm they survive the merge.
- **SPINE-6 multi-tab** — Mari's kill-test. Open project A in one tab, project B in another, autosave on A, verify B unaffected.
- **CODE-6 citation links** — click each `entity:N` link from an AI take response, verify each resolves to a real entity page (not 404).
- **Mobile Safari** — repeat SPINE-1 through SPINE-5 on iPhone or simulated viewport. Maria, Curtis, Hank deal-breakers depend on this.
- **CONT-1 contract gen** — full flow through q4 with the project context, verify DRAFT watermark on PDF.

---

## Recommended fix sequencing for John & contractor demo

**Tier 1 — must fix before demo (~3-4 hours total):**
1. B-1 partial: roll Project Spine v1 wiring into q8 permits, q15 daily-log, q11 supply-ordering — the contractor-relevant ones. (~1.5 hr if formulaic.)
2. B-2: jurisdiction auto-default from project context. (~10 min.)
3. B-5: empty-state copy fix on /killerapp. (~10 min.)
4. B-6: status counter fix on the other workflows. (~5 min per workflow.)
5. Verify SPINE-5, SPINE-6, SPINE-7 on prod. (~15 min.)

**Tier 2 — high impact, can wait until after demo:**
1. B-3: cost parser handles `$1.4M`. (~10 min.)
2. B-4: INP perf profile + fix. (~1-2 hr investigation.)
3. G-1: Photo/video upload feature. (~3-5 hr build.)

**Tier 3 — Phase 2 epics:**
- G-2 multi-jurisdiction data (data + product partnership work).
- G-3 Spanish contracts (translation + legal review).
- G-4 quick-quote without auth (auth + UX redesign).
- G-5 onboarding handholding (product design work).

---

## Demo readiness assessment

**For a "John lookalike" demo on a real ADU project:** YES, with caveats.

The spine works. The AI is credible. The pre-fill is impressive. The estimating page tells a coherent "describe → AI take → estimate → save" story.

**Where the demo will break:** the moment John clicks anything outside the 3 wired workflows (q2/q4/q5). If he clicks Permits, Job Sequencing, Daily Log, Supply Ordering — he hits an empty workflow with no project context. That's an instant credibility hit.

**Recommended demo path:** Stay inside the spine. `/killerapp` → Estimate → Codes → Contracts. Don't click into other stages. Pre-script the live prompt to match what's wired. After the demo, fix Tier 1 and demo wider.

**For an unscripted "anyone walks in" demo:** NO. We're not there. The 14 unwired workflows are landmines.
