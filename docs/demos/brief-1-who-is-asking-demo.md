# Brief 1 Demo Script — "Who's Asking?" for John Bou + the Contractor Partner

> Created 2026-05-12 after Brief 1 went live.
> Live URL: https://builders.theknowledgegardens.com/killerapp/who-is-asking
> 5-minute walkthrough. Don't say "CRM."

---

## The hook (~30 seconds)

> "I want to show you something we just shipped. It's not a CRM — contractors hate that word. The whole point is that the contractor never has to type anything. Watch."

Open the URL on your phone. Show the empty state with two huge thumb-buttons (mic, camera) and the question at the top: **"Who's asking, and what do I know about them?"**

---

## Beat 1 — Voice capture (~60 seconds)

1. Hold the mic button.
2. Say: *"New lead Bob Henderson, three two four two Highland Ave Chula Vista, ridge cap blew off after the storm, budget around eight hundred."*
3. Release.
4. Show the card that appears: Bob Henderson, address parsed, lane inferred to "homeowner," lifecycle stage = "Lead."

**What to point out:**
- Zero typing.
- Address geocoded from speech.
- Lane inferred from intent ("ridge cap blew off" → homeowner roof repair).
- AI extracted the budget hint into the description.

If the partner says *"that's not a CRM"* — that's the win.

---

## Beat 2 — Manual capture (~30 seconds)

Show the same form with manual fields (Pro Toggle ON). Type a name + phone. Show that the same JSON-LD record gets created.

**What to point out:**
- The contractor's wife/office manager has the same Pro view she's used to.
- Same row in the same database. No "Pro mode" vs "regular mode" data silo.

---

## Beat 3 — Pro Toggle (~30 seconds)

Flip Pro Toggle ON. Show that the card now reveals:
- Source ("voice")
- Confidence (today: 0 — known issue, prompt-tuning in 1.1)
- Lane explicitly named
- Time machine handle visible

Flip Pro Toggle OFF. The card collapses back to the friendly question.

**What to point out:**
- One screen, two audiences. The contractor sees a friend. The office sees the data.

---

## Beat 4 — MCP / agent visibility (~60 seconds)

Open Claude Desktop. Show that the same contact record returned through `crm_list_contacts` MCP tool.

```bash
curl -s https://builders.theknowledgegardens.com/api/v1/crm | head -c 400
```

**What to point out:**
- The MCP tool returns the same `bkg_contact` JSON-LD that the human sees on screen.
- An AI agent could draft a follow-up text right now without a UI.
- This is Goal 8 of the constitution made literal: machine-legible everything.

---

## Beat 5 — Time Machine (~30 seconds)

Capture a third lead. Then dismiss the undo bar within 30 seconds. Show that the contact is still there, but if you'd tapped undo, the row would have been archived.

**What to point out:**
- Nothing is permanent. The contractor can experiment.
- Every write returns a `time_machine_handle`. Future workflows reverse by id.

---

## The close (~30 seconds)

> "This is just the door. The next 4 surfaces are: morning brief, the journey strip, AI-drafted quick replies, and repeat-client radar. The whole CRM is the connective tissue across the 7-stage Killer App lifecycle. Brief 2 lands next."

Open the Stream E synthesis doc on screen. Show the 5-surface roadmap.

---

## What to listen for

- Does the contractor say "I'd use this"?
- Does the contractor ask about offline mode? (Yes — the answer is voice capture queues transcripts and syncs on reconnect; not yet shipped but designed for.)
- Does the contractor ask for SMS integration? (That's Brief 2 — Quick Reply with a Twilio number.)
- Does the contractor type "this is a CRM"? — That's the loss condition.

## Known issues to acknowledge if asked

- **Confidence: 0** — the prompt currently emits confidence inside the JSON-LD instead of at top level. v1.1 fix queued.
- **Photo capture not yet exercised on a real device** — the FAB exists but I haven't smoke-tested it end-to-end with an actual photo upload + EXIF GPS extraction. Risk: EXIF parser bug or storage upload misconfigured.
- **No auth yet** — `/api/v1/crm` is anonymous. Anyone with the URL can write to your DB. Clerk wiring is post-MVP.

## Pre-demo checklist (5 min before the meeting)

- [ ] Phone has the URL bookmarked
- [ ] Phone is connected to wifi (voice capture needs network)
- [ ] Anthropic API key is funded (`vercel env ls | grep ANTHROPIC` should show it set)
- [ ] Supabase project `knowledge-gardens-prod` is in healthy state
- [ ] Demo-contact rows from this session are deleted (or kept as evidence — your call)
- [ ] You've test-captured one lead in the 10 minutes before the meeting to warm the cache

---

*The 5-minute demo is the entire promise of Brief 1. If both John and the contractor partner leave saying "when can I use this in the field," we have product-market fit for the wedge. If they leave confused, we re-design before Brief 2.*
