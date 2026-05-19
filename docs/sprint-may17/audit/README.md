# Sprint May 17 — Lane A audit reports

The Sun May 17 sprint prompt called for 10 parallel audit agents to run BEFORE any Lane B specs were authored. The audits never fired on Sunday. They ran retroactively the morning of 2026-05-19, two days before the investor demo.

This directory is the canonical landing for those 10 reports.

## Reports

| # | Report | Topic | Demo-day verdict |
|---|---|---|---|
| A1 | `A1-crm-research.md` | CRM research outputs (Stream A-E, 5 proposed surfaces) | All 5 CRM surfaces UNSHIPPED — `/killerapp/who-is-asking` referenced in DEMO-MAY20-PLAN is a stub. Repoint demo at `/workflows/client-lookup` (q3) or ship Brief 1 Tuesday. |
| A2 | `A2-project-state.md` | Project state persistence — the spine | Spine WORKS for `/killerapp` → workflow → workflow. AVOID `/dashboard`, `/launch`, and `/dream` in the demo flow (separate context trees + no persistence). |
| A3 | `A3-codes.md` | Code Compliance workflow | Production-ready. queryAllSources end-to-end. SourceCountBadge live. Marin auto-default works. |
| A4 | `A4-contracts.md` | Contract Templates | 6 templates + bodies present. PDF generation complete. Autofill targets correct registry keys. Legal review blocked but DRAFT-only ships intentionally. |
| A5 | `A5-estimating.md` | Estimating workflow | Defensible for a 30-second demo with clear scope. Breaks on vague input. Dual-path (v2 JSON vs production text) is technical debt, not a blocker. |
| A6 | `A6-timemachine-journey.md` | Time Machine + Journey Map | Foundation solid. `use-time-machine-rewind.ts` needs Tuesday verification. Chilly's 2 uncommitted local diffs (96 lines total) need audit. A11y fixes for JourneyArc + TimeMachineDial are ~15 min. |
| A7 | `A7-onboarding.md` | Onboarding methods | 3 flows found. **Recommendation: use `/onboard` (ProgressiveProfiler) as demo opener** — 45 seconds, hits all 8 lanes, routes to lane-specific surface. |
| A8 | `A8-landing.md` | Landing experiences | `/cinematic` and `/manifesto` return 200 (per A10); visual audit at 375px still pending. Demo-path landings (`/`, `/dream/oracle`, `/killerapp`) ship-ready. |
| A9 | `A9-mcp.md` | MCP server | 12 tools live. HTTP-only — Claude Desktop needs a ~30-LOC stdio bridge. **Highest-leverage Tuesday-morning task for Michael.** |
| A10 | `A10-build-health.md` | Build health | All 14 production URLs 200 OK. Codebase clean of all three known TS anti-patterns. Latest 6 commits all built successfully. CLEAR TO DEMO. |

## Top P0/P1 items the audits surfaced (newly visible)

1. **(A1)** Demo plan references `/killerapp/who-is-asking` but the route is a stub. Either repoint to `/workflows/client-lookup` (works today, q3 alias) or ship the voice-extract surface Tuesday (Agent E's plan from 2026-05-18 burn — ~500 LOC, 5 steps).
2. **(A6)** Chilly's two uncommitted local diffs (`KillerappProjectShell.tsx` 76 lines, `layout.tsx` 20 lines) are unaccounted for. Audit, commit or revert before Tuesday dress rehearsal.
3. **(A9)** Claude Desktop Act 4 requires a stdio bridge — HTTP-only MCP server today. ~30-LOC Node script + config registration on Chilly's demo MacBook. **Best first ship for Michael.**
4. **(A6 / Agent G)** TimeMachineDial keyboard focus + 9px JourneyArc labels — 15-min a11y fixes that an investor would notice in a Tab-through.
5. **(A5)** Estimating regional multiplier ignored. SF / coastal premium not in the prompt context. Robust if scope is clear; brittle if vague.
6. **(A2)** `/launch` wizard is a UI prototype that does not persist. Keep OUT of demo path.

## Three pre-seeded demo projects (per Sun17 sprint definition of done)

| Project | UUID | Jurisdiction | Estimate | Status |
|---|---|---|---|---|
| Modern farmhouse in Marin | `55730cd3-5225-493d-8b5c-49086d942565` | Marin County, CA | $750k–$1.06M | Seeded 2026-05-12 (prior session) |
| ADU in Sausalito | `aa11b22c-1111-4d78-aaaa-bbccdd112233` | Marin County, CA | $180k–$320k | Seeded 2026-05-19 |
| Commercial TI in SoMa | `bb22c33d-2222-4d78-bbbb-ccddee223344` | San Francisco, CA | $850k–$1.4M | Seeded 2026-05-19 |

All three include `raw_input` (spoken pitch), `ai_summary` (AI-parsed read), pre-populated `estimating_state` and `code_compliance_state` JSONB blobs so they feel "lived-in" the moment Chilly opens them in the demo.

## Recommendation to the orchestrator

The platform is **CLEAR TO DEMO** on the core narrative. Tuesday's session priorities, in order:

1. (Michael, 30-45 min) Build the MCP stdio bridge + register in Claude Desktop config; cold-start test Marin code query.
2. (Chilly, 10 min) Audit + commit/revert the two uncommitted local diffs.
3. (Either, 15 min) A11y quick wins on TimeMachineDial + JourneyArc.
4. (Either, 5 min) 30-second contracts-autofill smoke test on each of the three demo projects.
5. (Optional, 2-3 hours) Ship `/killerapp/who-is-asking` voice extract per Agent E's plan if the team has spare cycles after items 1-4.
