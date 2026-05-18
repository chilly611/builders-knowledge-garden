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
| 1 | `https://builders.theknowledgegardens.com/` returns 200 | YES (re-verified 2026-05-18 PM) | — |
| 2 | `/dream/oracle` loads, mic permission works on Chilly's laptop | needs Tuesday re-test | Chilly |
| 3 | Speak → AI streams in <30s | needs Tuesday re-test | Chilly |
| 4 | **Make This Real** button creates a project + redirects with `?project=<uuid>` | YES (verified 2026-05-18 via prod test) | — |
| 5 | Cockpit appears on `/killerapp/*` routes | YES | — |
| 6 | Marin codes appear in code-compliance for the demo project | **YES (re-shipped 2026-05-18 PM, commit 3e9393e)** — 4 Marin entries in JURISDICTIONS (county + San Rafael / Novato / Mill Valley) + **11 ca-marin-tagged building_code rows seeded to Supabase knowledge_entities** (CRC R301 / R403.1 / R327 WUI, CBC 1604 / 1613 / 1809, ASCE 7-16, Title 24 Part 6 + §110.10 solar, CalGreen, Marin grading ordinance). Auto-default match in CodeComplianceClient.tsx:78 now picks Marin from `project.jurisdiction = "Marin County, CA"` instead of falling back to IBC-2024 generic. | — |
| 7 | Estimating renders CSI table when AI emits `<estimate>` block | YES (ship 6237ebaf) | — |
| 8 | Time Machine dial scrubs back to prior snapshot AND state actually rewinds | YES (ship 9f25b240) | — |
| 9 | "Return to live" banner appears + works | YES | — |
| 10 | Contract templates form populated from project (autofill) | **YES (re-shipped 2026-05-18 PM, commit ebdb85b)** — third attempt landed clean via explicit `Record<string, string>` annotation on the local `f` variable in the seed callback. Seeds `projectName`, `contractAmount` (midpoint of estimated_cost_low/high), and `scopeOfWork` (from `project.ai_summary` ?? `project.raw_input`). Guarded by `didAutofill` state so it only fires once per session; never clobbers a field the user already typed. NEEDS A 30-SECOND MANUAL CLICK-THROUGH on prod before Wednesday to verify the autofill actually paints (hydration-time effect not WebFetch-observable). | Chilly/Michael (smoke test) |
| 11 | Contract payment-preset chips work | YES (ship eda151ff) | — |
| 12 | Claude Desktop MCP server returns BKG codes for Marin | unverified — needs setup | Chilly/Michael |
| 13 | Foreman-vernacular copy on `/dream/oracle` (no "profound questions / emotional architecture / aesthetic wavelengths / Begin Your Reading") | YES (ship 3e9393e, verified prod cold-start 2026-05-18 PM) | — |
| 14 | Killer-App landing hero subhead reads "Every tool you need. Wired together. Smarter every job." (not the old "Talking to each other" wording) | YES (same ship) | — |

---

## Demo-blockers ranked

### P0 (must fix before Wednesday morning)
1. **C6 MCP closer wiring** — Claude Desktop must fetch BKG knowledge live for Act 4. **Helpful update:** the BKG MCP server already exists at `/api/v1/mcp` with 12 tools including `search_knowledge`, and the 11 Marin codes are seeded with `jurisdiction_ids` pointing at the `ca-marin` UUID — so the data is ready. Remaining work: register the server in `~/Library/Application Support/Claude/claude_desktop_config.json` on Chilly's demo laptop, then cold-start test the query "What are the Marin County energy code requirements?". Owner: Chilly + Michael.
2. **Demo laptop cold-start test** — open Safari/Chrome incognito on the actual demo MacBook Tuesday 6pm, walk through script start to finish. Owner: Chilly.
3. **`/dream/oracle` voice-input regression check** — speech recognition behavior changed in Safari recently. Owner: open.
4. **30-second contracts-autofill smoke test on prod** — open `/killerapp/workflows/contract-templates?project=55730cd3-5225-493d-8b5c-49086d942565`, pick "Client Agreement", confirm `projectName` populates "Modern farmhouse in Marin" and `contractAmount` populates "$905,000" (midpoint of 750k–1.06M). If it doesn't paint, ship a follow-up before Wednesday. Owner: Chilly or Michael (5 min).

### Prerequisites tested (moved here from prior "Demo-blockers ranked > P1" once shipped 2026-05-18 PM)
- ~~C3 contracts autofill effect~~ → SHIPPED commit ebdb85b. Field-level seeding live. Smoke test still needed (item #4 above).
- ~~Marin code-compliance wiring~~ → SHIPPED commit 3e9393e + 11-row Supabase seed.
- ~~Demo path copy cleanup~~ → SHIPPED commit 3e9393e. Palm-reader register removed from `/dream/oracle` (intro paragraph, 5 processing-step labels, "Begin Your Reading", "Begin Another Reading", "Three visions of your ideal sanctuary", "Aesthetic DNA", "Overall Essence"). Tightened search-helper + empty-state copy across Killer App entry. Dropped "One more thing: … Then you're ready." cheerleader on contracts.

### P1 (would be great)
5. **C7 Who's asking? voice extract** — stub exists; spec at `docs/sprint-may17/specs/B7-who-is-asking.md`. Recon Agent E mapped a 5-step ~500-LOC ship plan: (1) `/api/v1/crm/voice-extract` POST route that calls Claude for `{first_name, company?, estimated_value?, notes}` extraction from transcript, (2) `WhoIsAskingClient.tsx` w/ useSpeechRecognition + photo intake (~280 LOC), (3) `/killerapp/workflows/crm-lead-intake/page.tsx` boilerplate (~60 LOC), (4) register in `workflows.json` + LIVE_WORKFLOWS map, (5) `emitJourneyEvent({type:'step_completed', workflowId:'crm-lead-intake'})` to light the "Lead" dot. Owner: Michael (Tuesday).
6. **A11y CTA contrast on `/dream/oracle` "Start" and "Run it again" buttons** — recon Agent G measured white-on-#D85A30 at 3.51:1 (fails WCAG AA for 16px normal). Quick fix: darken bg to `#B84A24` (4.6:1). Risk: low. Owner: open.

### P2 (drop if needed)
7. EXIF parsing on photo uploads.
8. ESLint backlog burn-down.
9. Receipt-OCR polish.
10. JourneyArc 9px stage labels (Agent G) — bump to 11px + opacity 0.85.
11. Cockpit SVG stations are non-keyboard-focusable (Agent G) — wrap `<g onClick>` in `<button>`.

---

## Tuesday May 19 — dress rehearsal day

Aggressive but realistic agenda (revised after the 2026-05-18 PM ship burn):

- **AM (3h):** P0 #1 MCP closer (register the existing /api/v1/mcp server in Claude Desktop config; cold-start test the Marin codes query) + P0 #2 cold-start test from Chilly's demo MacBook.
- **Mid-day (1h):** P0 #4 contracts-autofill smoke test on prod. If autofill paints, move to P1 #5. If not, hot-fix before lunch.
- **Mid-day → PM (3h):** P1 #5 Who's asking? voice extract. Use Agent E's 5-step ship plan (above). Push to feature branch first per playbook Pattern A.
- **Late PM (1h):** P1 #6 Oracle CTA contrast fix.
- **Evening (1h):** End-to-end script run-through on the demo laptop, with someone else watching. Note every stumble. Wednesday morning is for fixing those, not for new work.

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
