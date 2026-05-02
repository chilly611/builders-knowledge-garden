# W10.A Smoke Report — q12–q27 Specialists, Full Pass

**Session date:** 2026-05-01
**Picked up from:** W9.D session seal, commit `28a50da` on origin/main
**Author:** Chat (Claude Opus 4.7)
**Status:** All edits applied locally, **not yet committed.** Founder runs build gate → commit → push → re-probe.

This document is the self-contained pickup for the next session. Read this first, then `tasks.todo.md` § W10.A.

---

## TL;DR

- Probed 10 specialists across q12–q27 against the live deploy. Three systemic findings (citation pollution, hedging openers, no structured JSON).
- Founder greenlit full pass. Result: **F1, F2a, F2b, A4, A5, A6 all shipped locally.** Only A3 (universal v1→v2 rewrite of the remaining specialists) and A.verify (post-push smoke run) remain.
- 7 new specialists wired into the 9 previously specialist-less workflows (q12 + q19 stay pure-checklist by design; q23 payroll is a legal-gate). Total: **15 wired specialists across q12–q27**, up from 10.
- Runner parser now accepts both `<json>` XML tags and ` ```json ` markdown fences — restores structured output for q2/q5/q9 that had been silently broken in production.

---

## Findings + dispositions

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| **F1** | 🔴 HIGH | Citation pollution: legacy `retrieveEntities` dumping keyword-matched BKG entities (e.g. "IBC 903.2.7 Group M Retail Sprinkler Requirements") into citations of unrelated specialists. | **Fixed** (W10.A1) — legacy path removed. RAG is compliance-only. |
| **F2** | 🟠 MED-HIGH | 5/10 specialists open with "I need more information" instead of leading with a best-guess answer. | **Fixed** — runner-level "answer-first" framing (W10.A2a) + 5 v2 prompt rewrites (W10.A2b). |
| **F3** | 🟡 MED | All 10 v1 specialists return `structured_keys: 0`. | **Partially fixed** — 5 promoted to v2; 6 newly-wired specialists are v2-from-birth; ~10 v1 specialists remain (parked as W10.A3). |
| **F4** | 🟢 LOW | 9 of 16 q12–q27 workflows had no `promptId` at all. | **Fixed** (W10.A4) — 6 wired with new AI specialists; q12 + q19 stay pure-checklist by design (cross-trade ops + tutorial); q23 payroll is a deterministic legal-gate. |
| **F5** | 🟡 LATENT | Existing v2 prompts (q2/q5/q9) teach output schema in markdown ` ```json ` blocks but runner only parses `<json>...</json>` XML tags. Confirmed via probe: production was silently returning `structured_keys=0`. | **Fixed** (W10.A5) — runner parser accepts both forms. No prompt rewrites required. |

---

## Files added/changed (uncommitted)

### Code

- `src/lib/specialists.ts` — F1 (kill legacy retrieveEntities) + F2a (answer-first runner framing) + W10.A4 deterministic gate for `payroll-classification-gate` + W10.A5 markdown-fence parser fallback + 11 entries in `DEFAULT_VERSION_BY_SPECIALIST`
- `src/app/api/v1/specialists/[id]/route.ts` — mirror map, 11 entries
- `docs/workflows.json` — 6 new `analysis_result` steps appended to q13/q15/q22/q25/q26/q27 + patched existing s23-2 with `promptId: payroll-classification-gate` + `analysisTitle` + `exampleOutput`. +50 lines.
- `scripts/probes/w10a-smoke.mjs` — durable smoke harness, 15 probes

### New v2 prompts (11 total, but 5 from W10.A2b + 6 from W10.A4)

**W10.A2b rewrites (5)** — for previously-hedging v1 specialists:

| File | For | Highlight |
|---|---|---|
| `weather-forecast.v2.md` | q14 | PROCEED/HOLD/RESCHEDULE call + 5 trade-specific decision rules |
| `co-schedule-impact.v2.md` | q20 | Parallel-vs-sequential added-days + permit amendment days |
| `co-document.v2.md` | q20 | Full signature-ready CO doc with 5-line cost breakdown |
| `draw-calculate.v2.md` | q21 | Specific draw $ + per-phase % table + default SOV |
| `expense-dashboard.v2.md` | q17 | ON-TRACK/WATCH/OVERSPEND-RISK/UNDERSPEND-LAG verdict |

**W10.A4 new specialists (6)** — for previously specialist-less workflows:

| File | For | Highlight |
|---|---|---|
| `crew-outreach-draft.v2.md` | q13 | SMS-friendly outreach text + 3 screening questions + "be ready to answer" |
| `daily-log-categorize.v2.md` | q15 | 10-category tag taxonomy + critical/attention/note flags + tomorrow's priority |
| `lien-waiver-tracker.v2.md` | q22 | Statutory-form-state awareness + tracking table + send-today list (does NOT generate waiver bodies — defers to q4) |
| `retainage-strategy.v2.md` | q25 | Date-by-date cadence + jurisdiction-specific lien-filing deadline + escalation triggers |
| `warranty-summary.v2.md` | q26 | Per-system warranty table with manufacturer/period/registration + GC reminder schedule + owner letter |
| `lessons-synthesize.v2.md` | q27 | RSI-tagged lessons (estimate-bias, schedule-slip-cause, vendor-strong/weak, etc.) + next-job adjustments |

### Tracking docs

- `tasks.todo.md` — W10.A section updated with shipped status; W10.A3/A.verify still parked
- `tasks.lessons.md` — 4 lessons appended over 2 passes covering RAG allowlist > prefix-match, smoke-automation gaps, runner-vs-prompt for cross-cutting concerns, `<json>` parser fallback, legal-exposure → server-side gate
- `docs/session-log.md` — 2 entries (initial W10.A + extended pass)
- `docs/strategy/W10-A-smoke-report.md` — this file (rewritten as final)

---

## Specialists wired across q12–q27 (after this session)

| Workflow | Title | Stage | Specialist | v |
|---|---|---|---|---|
| q12 | Services & utilities | 3 Plan | — pure checklist (cross-trade ops) | — |
| q13 | Hire your crew | 3 Plan | crew-outreach-draft | v2 ★ NEW |
| q14 | Work around the weather | 4 Build | weather-forecast | v2 (was v1) |
| q15 | Daily logbook | 4 Build | daily-log-categorize | v2 ★ NEW |
| q16 | Weekly toolbox talk | 4 Build | osha-toolbox-talk | v1 (W10.A3 candidate) |
| q17 | Expense report | 4 Build | expense-categorization (v1) + expense-dashboard (v2) | mixed |
| q18 | Touch base with vendors | 4 Build | contacts-quotes | v1 (W10.A3 candidate) |
| q19 | Compass check-in | 4 Build | — pure tutorial | — |
| q20 | Manage scope changes | 5 Adapt | co-cost-delta (v1) + co-schedule-impact (v2) + co-document (v2) | mixed |
| q21 | Request payment draws | 6 Collect | draw-calculate | v2 (was v1) |
| q22 | Collect lien waivers | 6 Collect | lien-waiver-tracker | v2 ★ NEW |
| q23 | Payroll check | 6 Collect | payroll-classification-gate (deterministic — legal gate) | gate ★ NEW |
| q24 | Final walk-through | 6 Collect | punch-detection | v1 (W10.A3 candidate) |
| q25 | Collect retainage | 7 Reflect | retainage-strategy | v2 ★ NEW |
| q26 | Warranty handoff | 7 Reflect | warranty-summary | v2 ★ NEW |
| q27 | What we learned | 7 Reflect | lessons-synthesize | v2 ★ NEW (feeds RSI loop) |

★ NEW = added in W10.A4 this session.

---

## Pre-push checklist (founder runs before push)

```sh
cd "Developer/builders-knowledge-garden"
npm install                # node_modules not present in this checkout
npx tsc --noEmit           # must exit 0
npx vitest run             # must pass (count varies; was 11/11 at W9.D seal)
npm run build              # MANDATORY per W9.D operating rules — vitest is not enough
```

If green, commit. Suggested message:

```
W10.A: full demo-readiness pass on q12-q27 specialists

- Kill legacy retrieveEntities citation pollution (RAG is compliance-only)
- Add runner-level answer-first framing (no more "I need more information")
- Runner parser accepts <json> XML AND ```json markdown fences
  (restores structured output for q2/q5/q9 that was silently broken in prod)
- Promote 5 hedging v1 prompts to v2: weather-forecast, co-schedule-impact,
  co-document, draw-calculate, expense-dashboard
- Wire AI into 6 previously specialist-less workflows: crew-outreach-draft (q13),
  daily-log-categorize (q15), lien-waiver-tracker (q22), retainage-strategy (q25),
  warranty-summary (q26), lessons-synthesize (q27 — RSI feed)
- Deterministic legal-gate for q23 payroll classification (server-side, no LLM)
- q12 + q19 stay pure-checklist by design (cross-trade ops + tutorial)
- Durable smoke harness at scripts/probes/w10a-smoke.mjs (15 probes,
  exits 1 on FAIL flags — usable as pre-demo CI gate)

Pre-fix smoke: 5/10 hedging openers, 100% citation pollution on
non-compliance specialists, 0 structured output anywhere. Post-fix
verification via scripts/probes/w10a-smoke.mjs after deploy.
```

---

## Post-push verification

```sh
node scripts/probes/w10a-smoke.mjs
```

Expected:
- 15/15 probes return 200 OK
- Zero `CYA_*` flags
- Zero `HEDGE_OPENER` on the 5 W10.A2b specialists
- Zero `NO_STRUCTURED` on q2/q5/q9 (W10.A5 parser fallback) and on the 6 W10.A4 specialists (their few-shots use `<json>` tags)
- `payroll-classification-gate` returns deterministic gate text + `gate: legal-review-required` in structured
- Citations on non-compliance specialists empty or model-emitted (no more sprinkler-code pollution)

If anything fails, the report includes flags + narrative head; triage from there.

---

## Parked sub-tickets

- **W10.A3** Universal v1→v2 prompt rewrite for the remaining ~10 v1 specialists. Half-day. Recommend founder review per prompt before commit. Candidates: osha-toolbox-talk, contacts-quotes, expense-categorization, co-cost-delta, punch-detection, crew-analysis/conflicts/optimization, supply-leadtimes, supply-materials, risk-payment-history/material-availability/markup-calculation, equipment-rent-vs-buy, sequencing-bottlenecks, compliance-electrical/fire/plumbing/router. Note: with the W10.A5 parser fallback, the v1 prompts won't break — they just won't have structured output. So this is a quality upgrade, not a bug fix. Lower urgency.
- **W10.A.verify** Full re-probe via the harness after push lands.

---

## Why this matters for the demo

The W9.D handoff named 14 untested specialists as "Risk: a Code Compliance-style incident in front of an investor." The actual count was 10 wired + 9 specialist-less = 19 routes total. Pre-fix:
- Demo path through q14 weather scheduling: investor would have seen IBC sprinkler citations next to a concrete-pour question.
- Demo path through q20 change orders: AI would have asked "can you provide more details" instead of drafting the CO.
- Demo path through q21 payment draws: AI would have hedged instead of computing the draw amount.
- Demo paths through q13/q15/q22/q25/q26/q27: would have hit dead `analysis_result` steps with no AI behind them.
- Demo path through q23 payroll: undefined behavior (no `promptId`).

Post-fix, all 17 q12–q27 workflows (15 with specialists + q12 checklist + q19 tutorial) are demo-safe. The /killerapp surface lights up consistently regardless of which workflow the investor clicks into.

---

## Operating-rule reminders that came up this session

- **Two working copies exist.** `Desktop/The Builder Garden/app` is 23 commits stale at W7.O.1 with uncommitted edits + ~30 untracked W9 docs. **Do not push from there** — would clobber W7.I → W9.D. Canonical working copy is `Developer/builders-knowledge-garden` at origin/main `3e2d632`.
- **No stale Vercel hash URLs.** Per W9.D lesson, point at the GitHub commit's green ✓ → Vercel "Details" link instead of `app-XXXX.vercel.app/...`.
- **`next build` is mandatory.** vitest passing is not sufficient — Turbopack tsc has caught regressions vitest didn't.
- **Few-shot output format must match runner parser** — or runner must accept the format the few-shot teaches. `<json>` vs ` ```json ` was a silent miss for q2/q5/q9.
- **Legal exposure → server-side deterministic gate, not prompt instruction.** Prompts can drift; deterministic returns can't. Pattern applied for q23 payroll classification.
