# Killerapp Master Fix List

**Date:** 2026-05-05
**Synthesized from:** 4 specialist strategies (UX, data, AI behavior, infra) + prod findings + 10 persona test plans
**Source files:**
- `docs/dogfood/master-test-matrix.md` (16 demo-critical tests)
- `docs/dogfood/findings.md` (prod test results)
- `docs/dogfood/fix-strategies/01-ux.md`
- `docs/dogfood/fix-strategies/02-data-jurisdiction.md`
- `docs/dogfood/fix-strategies/03-ai-behavior.md`
- `docs/dogfood/fix-strategies/04-infra-features.md`

---

## The One Big Bet (all 4 specialists converged here)

**Project Spine visibility = trust signal.** The context banner — scope + AI summary + jurisdiction + budget snapshot — must travel with the user across every workflow without exception. Right now it travels across 3 of 17 (q2/q4/q5). That gap is the root cause of "feels nowhere." The infra fix (wire 14 more workflows) is mechanical; the design fix (make the banner the spine of every page) is strategic.

If you do nothing else this week: **wire the spine into q8 (permits), q15 (daily log), q11 (supply ordering)** so the John demo path doesn't hit landmines.

---

## Tier 1 — Demo-Blocking (do before John demo, ~3-4 hours total)

| # | Fix | Effort | Lens | File touched |
|---|---|---|---|---|
| 1 | **Wire Project Spine v1 into q8 permits, q15 daily-log, q11 supply-ordering** (the contractor-relevant ones the demo will hit) | ~1.5 hr (40-50 min × 3, formulaic copy of q5 pattern) | UX + Infra | `src/app/killerapp/workflows/{permit-applications,daily-log,supply-ordering}/*Client.tsx` + their `page.tsx` for Suspense |
| 2 | **Auto-default jurisdiction from project context** — when a project has `jurisdiction` set (or the AI take parsed CA), the workflow's jurisdiction picker should default to that, not "IBC 2024 generic" | ~10 min | UX + Data | `src/app/killerapp/workflows/code-compliance/CodeComplianceClient.tsx:49` — seed `jurisdictionId` from `project?.jurisdiction` once it hydrates |
| 3 | **Cost parser handles `$1.4M`/`$Xm`/million format** — currently `estimated_cost_low/high` stay null on real ADU projects | ~10 min | Data + AI | `src/app/api/v1/copilot/route.ts` — extend `COST_RANGE_PATTERNS` array to capture `m`/`M`/`million` suffix |
| 4 | **Fix stale "You're not started yet. 7 stages to explore." copy** — should change to "Working on: <raw_input>" when project is active | ~10 min | UX | `src/app/killerapp/page.tsx` — branch on `?project=<id>` presence |
| 5 | **Re-verify SPINE-5/6/7 on prod** — close+reopen, multi-tab isolation, back button | ~15 min | UX + Infra | Just testing, no code change |

**Total Tier 1:** ~3-4 hours of focused work to make the unscripted "click anywhere in the demo path" experience credible.

---

## Tier 2 — High Impact, Post-Demo (this week, ~1-2 days)

| # | Fix | Effort | Lens |
|---|---|---|---|
| 6 | **Wire Project Spine into the remaining 11 workflows** (q6, q7, q9, q10, q12, q13, q14, q16, q17, q18, q19) | ~7-9 hr (40-50 min each, formulaic — can be parallel-agent-farmed if seeded with the q5 source as a template) | Infra |
| 7 | **Proactive AI assist** — 5s idle-detection on empty workflow steps → gentle nudge bubble ("Here's what we typically see…") | ~3-5 hr | AI |
| 8 | **INP performance investigation** — 1-4s spikes on click events. Likely culprit: journey-progress unthrottled PATCHes or ScrollStage observer thrashing. Profile + fix | ~4-6 hr | Infra |
| 9 | **Adversarial AI test harness in CI** — 10 fake code probes (e.g., "NEC 919.7(D)(4)", "NYC § 4299") that must trigger "I don't have that in my knowledge base" — prevents regression on the hallucination guard that just passed | ~3-4 hr | AI + Data |
| 10 | **Status counter rehydration on the other workflows** (currently only q2 derives status from saved JSONB) | ~5 min × N workflows | UX |
| 11 | **Glossary tooltips on jargon terms** — "Pre-Bid Risk Score", "Compass", "Time Machine", "lifecycle stage". Add `<TermTooltip>` component + `glossary.json` | ~2-3 hr | UX |

---

## Tier 3 — Phase 2 Epics (Photos, Multi-Jurisdiction, Voice 1.5)

### Epic A: Project Attachments (the #1 universal persona gap)

**Time-to-ship:** 5-7 days (per infra agent).
**Why:** John lost a $30k deposit on this exact gap. Maria, Jake, Hank all flagged as #1. It's the single most-requested feature across all 10 personas.

**Spec (drafted, ready to hand to an engineer):**
- New table `project_attachments(id, project_id FK ON DELETE CASCADE, type ENUM('photo','video','document'), file_url, file_size, gps jsonb, taken_at timestamptz, metadata jsonb, uploaded_by, created_at)`
- Supabase Storage bucket `project-evidence` with RLS scoped to project ownership
- Upload component: drag-drop on desktop + `<input type="file" accept="image/*,video/*" capture="environment">` for mobile camera
- Gallery view in `KillerappProjectShell` + per-step in workflows
- Metadata stamp: GPS, timestamp, EXIF preserved for legal evidence
- Optional: AI-generated caption / classification ("This appears to be framing inspection at 3rd floor")

**Demo line:** "Snap a photo of the framing inspection. It rides with your project forever, time-stamped and geotagged. If a dispute happens, this is your audit trail."

### Epic B: Multi-Jurisdiction Data

**Time-to-ship:** ~5 weeks (210 hours per data agent) for **IL + NYC + FL** (the three personas who walk without coverage).
**Phasing:** IL week 1 (Pete), NYC week 2 (Sarah), FL week 3 (Mari). CA already has the deepest coverage in the repo.

**Citation moat play:** Publish 50 URL-stable entity pages at `/entities/{jurisdiction}/{code}/{section}` with plain-English summaries, examples, official links. Backlink from ICC, CEC, trade associations. Goal: top-10 Google ranks on "California Title 24 Section 130.7" within 30 days. Mirrors the HKG llms.txt strategy.

### Epic C: Voice 1.5

**Time-to-ship:** ~2-3 weeks total.
**Phasing:**
- v1.5-A (1 week): TTS on AI responses — Hank, Maria, Curtis hear answers without reading.
- v1.5-B (1 week): Persistent listening toggle on /killerapp + workflow pages.
- v1.5-C (3-4 days): Voice button per step (currently only on the search box).
- v1.5-D (1 week): Command vocabulary routing — "go to permits" navigates without UI clicks.

---

## Top 3 Bugs From Each Specialist

### UX (specialist 1):
1. Project Spine wiring incomplete (14/17 workflows) — Impact 5, Effort L
2. Jurisdiction defaults to IBC generic — Impact 4, Effort S
3. Stale "You're not started yet" copy after project creation — Impact 3, Effort S

### Data/Jurisdiction (specialist 2):
1. Coverage gap: IL, NYC, FL all unservable today (3 personas blocked)
2. Cost parser misses `$1.4M` format → DB columns stay null
3. Jurisdiction context doesn't propagate to workflows (silent fallback to generic IBC)

### AI Behavior (specialist 3):
1. Proactive assist missing — AI never volunteers help when user is stuck
2. Cost parser format limitation (same as data agent, different lens)
3. Reactive-only — AI responds but never suggests next step on its own

### Infra/Features (specialist 4):
1. 14 workflows lack the spine wiring (q6-q19) — formulaic to fix
2. Photo/video upload not built — universal persona gap
3. INP perf spikes 1-4s on prod — likely journey-progress writes or scroll observer

**Pattern:** All 4 specialists named the wiring gap as #1. All 4 named jurisdiction context propagation. 3 of 4 named the cost parser. The convergence tells us where to focus.

---

## Demo Readiness Calls

### For "John lookalike" demo on real ADU project (this week)

**Recommendation:** Do Tier 1 (3-4 hours), then demo. Stay on the script: `/killerapp` → Estimate → Codes → Contracts. Don't click into other stages. Pre-script the prompt to match the wired path. After demo, tackle Tier 2.

**Demo storyline:** "Your project travels with you. Type your scope once. Every workflow remembers your location, costs, and constraints. The AI is honest about what it doesn't know — no fabricated code citations. Photo evidence and field operations are coming next."

### For "anyone walks in" public demo

**Recommendation:** NOT YET. Tier 1 + Tier 2 + Epic A photo upload at minimum. ~2 weeks of focused work.

### For Sarah/Pete/Diana caliber technical demo

**Recommendation:** Tier 1 + Tier 2 + Epic B (their state/county code coverage) at minimum. ~6-7 weeks.

### For RSI ("recursive self-improvement" — let the platform improve itself)

**Recommendation:** Tier 1, Tier 2, Tier 3 epics, and a real signal-collection flywheel (per the W9.D rsi/ docs that are already in the repo). The infra is partly there; activation requires the photo+jurisdiction features so users have something worth refining.

---

## What This Fix List is NOT

- Not a roadmap — that's a founder call.
- Not a complete bug list — only the demo-blocking and high-impact ones.
- Not a substitute for actual user testing — John, Maria, Pete, Sarah are the real critics.

---

## Recommended next concrete action

If you want to make the demo 10x stronger in 30 minutes of code:
1. **Auto-default jurisdiction** (10 min, fix #2) — fixes Pete, Diana, Sarah's #1 trust complaint.
2. **Fix `$1.4M` cost parser** (10 min, fix #3) — populates `estimated_cost_low/high` so the banner shows "$1.4M–$1.8M" instead of being silent.
3. **Stale empty-state copy** (10 min, fix #4) — kills "feels nowhere" the moment a project exists.

Three changes, one PR, ~30 minutes. They cover three different specialists' concerns and unblock three of the ten personas. After that: spine wiring is the bigger move.
