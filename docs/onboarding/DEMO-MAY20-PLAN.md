# Demo plan — Wednesday May 20, 2026, 9:00am SF time

The demo is the single source of truth for what "ready" means. If the script below runs end-to-end without a stumble, we have shipped. If anything stumbles, we re-prioritize the next session on fixing that stumble first.

---

## The script (≈5 minutes, four acts)

### Act 1 — Speak intent (≈60s)
1. Open https://builders.theknowledgegardens.com/dream/oracle on the demo laptop.
2. Speak: **"I want to build a custom modern farmhouse in Marin."**
3. Dream Builder transcribes → AI starts streaming. Within ~60s the user sees: concept render, code callouts (CRC R301 wind/seismic, Title 24 §110.10 solar), materials shortlist, budget range.
4. Tap **Make This Real**.

**Beat to land:** "Sixty seconds, spoken, and we have a project record."

### Act 2 — One project, every screen (≈90s)
5. Lands in `/killerapp?project=<uuid>`. The Cockpit (Journey arc + Time Machine dial + Budget snapshot) appears at the top.
6. Click into **Who's asking?** — CRM shows the project's lead/client context.
7. Click into **What does the code say?** — Code compliance pulls Marin-tagged CRC/Title 24 entries (this is why we tagged 11 codes with `ca-marin` on 2026-05-18).
8. Click into **What might this cost?** — Estimating shows the CSI division breakdown table.
9. Click into **Here's the agreement** — Contracts shows the same project fields populated in the contract.

**Beat to land:** "Same project context. No re-entry. The spine."

### Act 3 — Rewind a decision (≈45s)
10. Make a small change (add a CSI line, edit a budget item).
11. Tap a tick on the Time Machine dial. The journey + budget snap back to that state.
12. Tap **Return to live**.

**Beat to land:** "Every decision is reversible. Builders are afraid of decisions — we remove that fear."

### Act 4 — Claude Desktop closer (≈45s)
13. Open Claude Desktop on the demo laptop.
14. Ask: "What are the Marin County energy code requirements I need to plan for?"
15. Claude calls the BKG MCP server live → returns the same code entries the Killer App showed in Act 2.

**Beat to land:** "And now Claude itself — wherever you use it — knows your project. BKG is infrastructure for the whole AI ecosystem."

---

## Demo prerequisites (cold-start, must work in this order)

| # | What | Tested? | Owner |
|---|---|---|---|
| 1 | `https://builders.theknowledgegardens.com/` returns 200 | yes (2026-05-18) | — |
| 2 | `/dream/oracle` loads, mic permission works on Chilly's laptop | needs Tuesday re-test | Chilly |
| 3 | Speak → AI streams in <30s | needs Tuesday re-test | Chilly |
| 4 | **Make This Real** button creates a project + redirects with `?project=<uuid>` | YES (verified 2026-05-18 via prod test) | — |
| 5 | Cockpit appears on `/killerapp/*` routes | YES | — |
| 6 | Marin codes appear in code-compliance for the demo project | YES (11 codes tagged 2026-05-18) | — |
| 7 | Estimating renders CSI table when AI emits `<estimate>` block | YES (ship 6237ebaf) | — |
| 8 | Time Machine dial scrubs back to prior snapshot AND state actually rewinds | YES (ship 9f25b240) | — |
| 9 | "Return to live" banner appears + works | YES | — |
| 10 | Contract templates form populated from project (autofill) | **NO — deferred** | open |
| 11 | Contract payment-preset chips work | YES (ship eda151ff) | — |
| 12 | Claude Desktop MCP server returns BKG codes for Marin | unverified — needs setup | Chilly/Michael |

---

## Demo-blockers ranked

### P0 (must fix before Wednesday morning)
1. **C6 MCP closer wiring** — Claude Desktop must fetch BKG knowledge live. Without it, Act 4 doesn't land. Owner: Chilly + Michael.
2. **Demo laptop cold-start test** — open Safari/Chrome incognito on the actual demo MacBook Tuesday 6pm, walk through script start to finish. Owner: Chilly.
3. **`/dream/oracle` voice-input regression check** — speech recognition behavior changed in Safari recently. Owner: open.

### P1 (would be great)
4. **C3 contracts autofill effect** — re-attempt with explicit `Record<string, string>` annotation (see `tasks.lessons.md` 2026-05-18). Currently chips ship; the project-context-into-contract beat is weaker without autofill. Owner: open.
5. **C7 Who's asking? voice extract** — stub exists; spec at `docs/sprint-may17/specs/B7-who-is-asking.md`. Owner: open.

### P2 (drop if needed)
6. EXIF parsing on photo uploads.
7. ESLint backlog burn-down.
8. Receipt-OCR polish.

---

## Tuesday May 19 — dress rehearsal day

Aggressive but realistic agenda:

- **AM (3h):** P0 #1 MCP closer + P0 #2 cold-start test.
- **Mid-day (2h):** P1 #4 contracts autofill (re-attempt).
- **PM (2h):** P1 #5 Who's asking? voice.
- **Evening (1h):** End-to-end script run-through on the demo laptop, with someone else watching. Note every stumble. Tomorrow morning is for fixing those, not for new work.

---

## Wednesday May 20 — demo day

- **5:30am SF:** Wake. `git pull main` on the demo laptop. Run the script once cold from incognito. If any step breaks, deploy a fix (push to main, wait for Vercel, re-test).
- **7:00am SF:** Final cold-start in the demo environment (same physical laptop, same wifi the demo will use).
- **8:30am SF:** Travel to demo location, laptop already pre-loaded with the Dream Builder open and mic permission granted.
- **9:00am SF:** Go time.

**Single rule for demo day:** if something can't be fixed in 15 minutes, narrate around it. Do not push new code to main after 8:00am SF.

---

## What happens if a step breaks during the demo

- **Mic doesn't work** → type the prompt; tell the investor "we'd normally speak this but the wifi here is funny."
- **Make This Real doesn't redirect** → hard-refresh, the project will be in the URL.
- **A workflow 404s** → skip to the next one. We have 27, we need 4 to land the beat.
- **Time Machine doesn't rewind** → narrate it as "ships this week."
- **MCP closer doesn't return** → narrate it as "the integration is rolling out next week; here's what it looks like" (show a screenshot).

Resilience > perfection. The demo story works even if 1 of 12 prerequisites is broken, as long as Chilly knows to step around it.
