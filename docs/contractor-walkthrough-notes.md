# Contractor Walkthrough Notes — 5 Demo Accounts

**Owner:** Claude Code · **Last updated:** 2026-05-19 PT

## Account status — seeded + auth-verified

Ran `node scripts/seed-trial-accounts.mjs` Tuesday afternoon. All 5 accounts created on first run. Each was then verified via direct Supabase `/auth/v1/token` POST — sign-in returns 200 with the expected `user_metadata.demo_project_id` and `user_metadata.lane`.

| # | Email | Password | Lane | demo_project_id (verified) | Project label |
|---|---|---|---|---|---|
| 1 | `gc-trial-01@theknowledgegardens.com` | `BuildersGarden!01` | builder | `55730cd3-5225-493d-8b5c-49086d942565` ✅ | Marin farmhouse |
| 2 | `gc-trial-02@theknowledgegardens.com` | `BuildersGarden!02` | builder | `aa11b22c-1111-4d78-aaaa-bbccdd112233` ✅ | ADU in Sausalito |
| 3 | `gc-trial-03@theknowledgegardens.com` | `BuildersGarden!03` | builder | `bb22c33d-2222-4d78-bbbb-ccddee223344` ✅ | Commercial TI in SoMa |
| 4 | `specialty-trial-01@theknowledgegardens.com` | `BuildersGarden!04` | specialist | `55730cd3-5225-493d-8b5c-49086d942565` ✅ | Marin farmhouse |
| 5 | `diy-trial-01@theknowledgegardens.com` | `BuildersGarden!05` | dreamer | `aa11b22c-1111-4d78-aaaa-bbccdd112233` ✅ | ADU in Sausalito |

`/welcome/page.tsx:73-80` confirms the page reads `user_metadata.demo_project_id` and `router.replace(/killerapp?project=...)`. Plus a `FALLBACK_PROJECT_ID` if metadata is missing. The redirect target is correct for all 5 accounts.

## What's NOT yet verified — needs your eyes on a real browser

I couldn't run a browser session in this terminal (preview MCP server kept dying post-spawn). The following demo-path checks each account needs before the demo:

- [ ] **Account 1 (gc-trial-01)** — sign in → land on `/killerapp?project=55730cd3-…` → JourneyTimeline cockpit reads → BudgetSnapshot pulses → CompassFAB opens with 18 workflows + Money group.
- [ ] **Account 2 (gc-trial-02)** — same flow, ADU Sausalito project.
- [ ] **Account 3 (gc-trial-03)** — same flow, Commercial TI SoMa.
- [ ] **Account 4 (specialty-trial-01)** — `lane: specialist` may surface different chrome. Confirm no "feature-not-available" errors. Lands on Marin farmhouse.
- [ ] **Account 5 (diy-trial-01)** — `lane: dreamer` is the most divergent lane. Confirm the cockpit doesn't crash on a non-builder lane.

## "Would confuse a non-tech-savvy GC" log

_(none captured — visual walkthroughs not yet performed in a real browser)_

## Demo path being tested

1. Sign in via `/login` (or direct from Supabase Auth) → `/welcome`
2. `/welcome` reads `user_metadata.demo_project_id` → `router.replace('/killerapp?project=…')`
3. JourneyTimeline cockpit reads, current stage highlighted
4. Open BudgetSnapshot → `/killerapp/budget?project=…` → 10-category grid renders
5. Open Compass FAB (bottom-right) → 18 workflows + Money group visible
6. Pick one workflow → flush-and-go transition (no flash)
7. Return to cockpit → JourneyTimeline updated, BudgetSnapshot pulses
8. AuthAndProjectIndicator pill shows project name + signed-in identity
