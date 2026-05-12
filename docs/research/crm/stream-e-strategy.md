# Stream E — BKG CRM Strategy & v1 Build Order

> The synthesis. Streams A–D in one document. The file Chilly reads first.
> Companion files: `stream-a-landscape.md`, `stream-b-contractor-reality.md`, `stream-c-machine-surface.md`, `stream-d-ux-patterns.md`.
> Rubric: every recommendation must pass the [BKG Design Constitution](../../design-constitution.md) — 10 Goals, 7 Primitives, 3 Binding Decisions.

---

## EXECUTIVE SUMMARY (the 2 pages)

### 1. What is the BKG CRM in one constitution-passing sentence?

**It's the connective tissue under "Who's asking, and what do I know about them?" — a single record that follows every job from a stranger's first text through the warranty call six years later, with the human and the AI agent reading and writing the same fields side by side.**

It is not a CRM module. It is the floor under all seven Killer App stages plus the pre-stage (Lead) and post-stage (Repeat / Reputation / Warranty). The contractor never sees the word "CRM." The AI agent never sees a UI. They both see the same JSON-LD record exposed through MCP and rendered as an Invitation Card on screen.

### 2. The five v1 surfaces, and why those five

| # | Surface | Plain-language question | Why this one |
|---|---|---|---|
| 1 | **Today** | "What's on my plate?" | The landing screen. The only screen 30% of contractors will need most days. Solves "by the time I get home I barely remember what I did this morning" ([r/Contractor 1rorqtg](https://reddit.com/r/Contractor/comments/1rorqtg/)). |
| 2 | **Who's asking?** | "Who's curious about my work?" | The door. CompanyCam-style photo-as-record + voice memo + SMS-in. The plain-language label *is* the CRM. Solves "I'm elbow deep in a drain, call goes to voicemail, by the time I call back they already booked someone off Google" ([r/Plumbing 1rqe4dh](https://reddit.com/r/Plumbing/comments/1rqe4dh/)). |
| 3 | **What might happen next?** | "Where is every job today?" | The 7-stage lifecycle journey strip — pipeline reimagined as the Killer App's own stages, not the abstract Kanban. Pro Toggle flips it to kanban. Solves "no CRM speaks my language — I don't have technicians, I have a crew" ([r/Roofing 1n1yvrp](https://reddit.com/r/Roofing/comments/1n1yvrp/) re: ServiceTitan). |
| 4 | **Quick reply** | "What should I say back?" | Every inbound text / voicemail / email gets an AI draft in the contractor's voice. Thumb-approve to send. 90-second undo. Solves the universal #1 ask: "Anyone else lose jobs because they forget to follow up on quotes?" (~80 upvotes on r/Contractor, dozens of "literally me" comments). |
| 5 | **Repeat client radar** | "Who should I check on?" | The post-Reflect surface that closes the loop — warranty windows, storm pings to coastal addresses, anniversary touches, referral-friend mentions. Solves the "find the Smith photo from 2 years ago" magnetic moment ([r/Roofing 1kdk4ac — ACX-CRM Data Hostage](https://reddit.com/r/Roofing/comments/1kdk4ac/)). |

Five, no more, no less. **Today** is the open. **Who's asking?** is the capture. **What might happen next?** is the orientation. **Quick reply** is the daily work. **Repeat client radar** is the compounding moat. Anything else is Pro-Toggle-only or v2.

### 3. What's the moat once it's shipped?

Five things that HubSpot, JobNimbus, Procore, Buildertrend, and ServiceTitan *structurally* cannot copy in one release cycle.

1. **Plain-language URL + Pro Toggle parity.** Every term is dual-labeled — "Who's asking?" / "Pipeline." HubSpot's product, support docs, schema names, and admin UI all hard-code "Lead," "Deal," "Contact." Adding the dual label would require a year of UX retrofit. Pro Toggle on every screen is binding decision #1 of the constitution; nobody else has even attempted it.
2. **Invisible CRM (byproduct-driven capture).** BKG's data spine emits CRM events from every contractor action — photo upload, voice memo, daily log entry, estimate send, sub-invoice received, shared-link view by client. JobNimbus and Procore can copy individual capture points but they treat Project (or Job) as the parent entity; BKG's Person-as-parent inversion is a schema-level structural choice that compounds invisibly over time. Stream B documents **30+ byproduct moments** where the data accrues without the user thinking "I'm doing CRM."
3. **AI-as-equal-user with `time_machine_handle` on every write.** Every agent action is reversible by the human. HubSpot MCP wraps a REST API designed in 2009; they would need to thread idempotency + reversibility through every endpoint and rewrite the audit table. BKG bakes it in from row one. Stream C calls this *the single most important design move* — "without reversibility, humans won't grant write scope to agents."
4. **The 8-lane lens, baked into every record.** BKG knows you're a roofer in FL and surfaces roofer-FL fields. JobNimbus is roofing-only; Houzz Pro is design-build; HubSpot is generic. Lane-aware Invitation Cards are a Goal-10 binding requirement; nobody else even tracks lane.
5. **Voice-first that actually works on a roof.** Local capture with sync-when-connected. The Stream B quotes are unanimous: "[JobNimbus] doesn't work in low reception areas, no offline mode" ([r/Roofing 1n1yvrp](https://reddit.com/r/Roofing/comments/1n1yvrp/)). Web Speech API + offline IndexedDB + background sync is unsexy infrastructure that every desktop-first CRM has skipped.

The combined moat: **a CRM that's not a CRM, where the API is the surface and the UI is one rendering, that already knows the contractor's lane and lifecycle stage before the contractor types a thing.** No competitor has even one of these. BKG ships five.

### 4. What ships first, and what's the demo for John Bou + the contractor partner in 2 weeks?

**Brief 1 (this week) — "Who's asking?" voice/photo capture.** Plain-language label is the route name `/killerapp/who-is-asking`. Pro Toggle flips label to "Contacts." Primary Invitation Card on the screen: "Add someone who's curious about your work." Two primary affordances: 🎤 hold-to-talk and 📸 tap-to-photograph. Voice memo gets transcribed, name + address inferred, geocoded, dropped onto the journey strip at "Lead." Photo uses EXIF/GPS to attach to an existing person within 200m or prompts to create new. Every record emits a JSON-LD `bkg_contact` to the MCP surface immediately.

**Brief 2 (next week) — "Quick reply" inbound conversation queue.** Plain-language label `/killerapp/quick-reply`. Pro Toggle: "Conversations." Pulls inbound SMS (Twilio number per account) and missed-call transcripts. For every unread message: AI drafts a response in the contractor's voice (trained on the last 200 sent SMS). Thumb-approve to send. 90-second undo bar at top. Every send writes to the audit trail with `time_machine_handle` and an `event.proposal_sent` if the message contains a price.

**Brief 3 (third week) — "Repeat client radar" post-job radar.** Plain-language label `/killerapp/repeat-radar`. Pro Toggle: "Renewal & Referrals." For every job in `Reflect` or past `Reflect`, schedule typed events: warranty checkpoint (1mo, 3mo, 1yr, 5yr by trade), anniversary touch, weather-proactive (storm passing within 100mi of coastal address), referral-friend (any new contact within 5 addresses of past customer). Each event surfaces as a Whisper, not a notification.

**The 5-minute demo for John Bou + the contractor partner:**

> **Minute 1.** Contractor opens BKG on his phone. Lands on "Today." Sees three Invitation Cards: "Maria from Tuesday hasn't responded — want me to nudge?" (Whisper, AI-drafted reply already loaded). "James from the Oak job got a hailstorm forecast — check in?" (Whisper). "Two new texts since this morning — see drafts?" (one tap to Quick reply).
>
> **Minute 2.** Contractor taps the camera floating button. Snaps a photo of a damaged ridge. GPS resolves to a past customer's address. A 1-line Whisper appears: "Smith job, 2024. Add to that record?" (Single tap yes.) Photo attached. No fields, no form.
>
> **Minute 3.** Contractor holds the mic button: "New lead, Maria Rodriguez, 4421 Brickell Ave, roof leak after Saturday's storm, budget around five grand." Voice-to-text → entity extraction → record drafted → preview card on screen. Contractor taps "Looks right." Record live. Journey strip shows new dot at "Lead."
>
> **Minute 4.** Contractor swipes to Quick reply. Three drafts waiting. First one: "Thanks for sending the address Maria — I'll swing by Wednesday at 9. Sound good?" Tap-approve. SMS sent. Toast: "Sent. Undo for 90s." Pro Toggle flipped → reveals delivery status, opt-out flag, character count.
>
> **Minute 5.** Show MCP. Claude Desktop. `crm_list_today()` returns the three same Invitation Cards as JSON. `crm_draft_reply(contact_id=...)` returns the same draft text plus reasoning trace. `crm_undo(time_machine_handle=...)` reverses the send. **Same record, two readers, equal class.**

That's the demo. Five minutes. No CRM word spoken. No tour. No form. Voice and photo are first-class inputs. AI agent visible as equal-class user. Time Machine on every action. Pro Toggle revealing depth.

---

## SECTION 1 — THE CRM THROUGH THE LIFECYCLE

The Killer App has seven lifecycle stages: Size Up → Lock → Plan → Build → Adapt → Collect → Reflect. CRM lives in the pre-stage **Lead**, threads through all seven, and continues into the post-stage **Repeat / Reputation / Warranty**. Below: every stage gets a plain-language label, primary CRM action, machine surface, voice expression, Pro Toggle behavior, Time Machine memory.

### Stage 0 — LEAD (pre-Size-Up)
- **Plain-language label:** "Someone's curious about your work."
- **Pro label:** "Lead / Prospect."
- **Primary action:** Capture without typing. Voice memo, inbound SMS, photo, missed-call transcript, share-link tap by a stranger.
- **Machine surface:** `crm_capture_lead(source, raw_input)` → returns `bkg_contact` with confidence-tagged inferred fields.
- **Voice expression:** "New lead, [name], [address], [trade question]" — entity extraction creates the record.
- **Pro Toggle behavior:** Off → "Maria Rodriguez · 4421 Brickell · 'roof leak.'" On → "Lead · M. Rodriguez · 4421 Brickell · Estimated value: $5K · Source: SMS · Confidence: 0.83."
- **Time Machine memory:** Source of truth (verbatim voice memo / SMS / photo). Every inferred field is reversible to "ask me." Whole record deletable for 30 days into Drafts Tray.

### Stage 1 — SIZE UP
- **Plain-language label:** "Is this job worth bidding on?"
- **Pro label:** "Pre-Bid Risk Score."
- **Primary action:** Tag the lead with risk signals — distance, gut, payment-history-of-similar, storm-driven vs. referral. AI surfaces a recommendation; contractor can override.
- **Machine surface:** `crm_score_lead(contact_id)` → returns score + visible reasoning trace + suggested next step.
- **Voice expression:** "Should I bid this one?" → AI summarizes risk in two sentences with citations.
- **Pro Toggle behavior:** Off → Green / Amber / Red dot. On → six-factor breakdown, override controls.
- **Time Machine memory:** Every score is versioned. "Why did this go from green to amber?" answerable via diff.

### Stage 2 — LOCK
- **Plain-language label:** "Did we shake on it?"
- **Pro label:** "Contract Signed / Deal Closed."
- **Primary action:** Send proposal, watch for share-link view, send contract template (q4), capture e-signature.
- **Machine surface:** `crm_send_proposal(contact_id, amount, ...)`, `crm_log_signature(contact_id, attachment)`.
- **Voice expression:** "Send the proposal to Maria for five grand" → drafts proposal from q11/q4 templates, asks one confirmation.
- **Pro Toggle behavior:** Off → "Sent — waiting for yes." On → Stages: Proposal sent · Viewed · Counter / Question · Signed.
- **Time Machine memory:** Every proposal version preserved. Whole timeline of "when did Maria first view the proposal."

### Stage 3 — PLAN
- **Plain-language label:** "What do we need to start?"
- **Pro label:** "Pre-Construction / Job Setup."
- **Primary action:** Wire job into the contractor's plan workflows (q6 sequencing, q7 worker count, q8 permits, q11 supply order). CRM records the link.
- **Machine surface:** `crm_link_workflows(contact_id, workflow_ids[])`, `crm_log_milestone(contact_id, milestone_type)`.
- **Voice expression:** "Plan the Smith job for the 18th, two guys, need permit, need shingles."
- **Pro Toggle behavior:** Off → "Materials, crew, permit." On → Per-workflow status pills.
- **Time Machine memory:** Every plan change tied to the customer record. "Why did the start date slip?" answerable.

### Stage 4 — BUILD
- **Plain-language label:** "What happened on site?"
- **Pro label:** "Daily Logs / Production."
- **Primary action:** Photo uploads, voice memos, daily log entries, sub-invoices — all attached to the customer record without the contractor thinking "CRM."
- **Machine surface:** `crm_attach_photo(contact_id, photo)`, `crm_attach_voice_note(contact_id, audio)`, `crm_log_daily(contact_id, entry)`.
- **Voice expression:** "Voice memo — Smith job day 2, ran into a soft spot on the north side, need to flag the homeowner." Memo transcribed, attached, flagged for follow-up.
- **Pro Toggle behavior:** Off → Photo wall + timeline. On → Tagged trades, hours, cost-to-date, weather, sub-rolls.
- **Time Machine memory:** **This is the warranty pipe.** Every photo, memo, log keeps EXIF + geocode + transcript + author. Six years later, "find the flashing photo from Smith" is one voice query away.

### Stage 5 — ADAPT
- **Plain-language label:** "Something changed — what now?"
- **Pro label:** "Change Orders / Scope Adjustments."
- **Primary action:** Capture the change (voice, photo, text), surface impact (cost, schedule), draft a heads-up to the customer.
- **Machine surface:** `crm_log_change(contact_id, description)`, `crm_draft_customer_heads_up(change_id)`.
- **Voice expression:** "Smith job — the deck framing is rotted, that's another two grand and a day." Draft heads-up appears for thumb-approval.
- **Pro Toggle behavior:** Off → "Change. Will cost a bit more. Approved?" On → CO #003, +$2,100, +1 day, schedule impact +18%.
- **Time Machine memory:** Every change is a delta against the previous version of the project, with the customer's response logged.

### Stage 6 — COLLECT
- **Plain-language label:** "Did we get paid?"
- **Pro label:** "AR / Receivables."
- **Primary action:** Issue invoice, watch for payment, log payment, nudge late ones in the contractor's voice.
- **Machine surface:** `crm_issue_invoice(contact_id, amount, ...)`, `crm_log_payment(contact_id, amount)`, `crm_draft_collection_nudge(contact_id)`.
- **Voice expression:** "Did Smith pay yet?" → "No, 11 days past. Want me to draft a polite reminder?"
- **Pro Toggle behavior:** Off → "Paid · Waiting · Late." On → Aging buckets, partial payments, retainage held.
- **Time Machine memory:** Every payment event, every collection touch, every silence.

### Stage 7 — REFLECT
- **Plain-language label:** "How did it go?"
- **Pro label:** "Project Close-out / Retrospective."
- **Primary action:** Capture customer feedback, photo of completed work, request review, mark project closed. AI surfaces an unprompted summary.
- **Machine surface:** `crm_close_project(contact_id, outcome)`, `crm_request_review(contact_id, channel)`.
- **Voice expression:** "Close out Smith. Customer was happy. Ask them for a review." All three actions in one sentence.
- **Pro Toggle behavior:** Off → "Done. They were happy." On → NPS, photo of completion, review-status pipe, lessons-learned tags.
- **Time Machine memory:** Every project ends with a structured retrospective tied to the customer record, which seeds Repeat radar.

### Stage 8 — REPEAT / REPUTATION / WARRANTY (post-Reflect)
- **Plain-language label:** "Who should I check on?"
- **Pro label:** "Renewal · Warranty · Referrals."
- **Primary action:** AI proactively surfaces re-engagement moments — warranty windows, anniversary touches, weather pings, referral-friend mentions, review-link reminders.
- **Machine surface:** `crm_list_radar()`, `crm_propose_outreach(contact_id, reason)`.
- **Voice expression:** "Who should I check on this week?" → "Three: Smith's 1yr warranty Tuesday, Lopez has a referral thanks-text outstanding, Wong's house is on a storm path."
- **Pro Toggle behavior:** Off → Three Invitation Cards. On → Filterable list with reasons, last-touch, response rate.
- **Time Machine memory:** Years-deep. Every customer interaction since first touch. This is where BKG wins on year-3-plus when JobNimbus customers are still typing "I have JN right now, in the process of switching" ([r/Roofing 1qdamkm](https://reddit.com/r/Roofing/comments/1qdamkm/)).

---

## SECTION 2 — THE PLAIN-LANGUAGE CRM VOCABULARY

Every CRM term replaced with a Goal-1-compliant label. Pro Toggle reveals the jargon. Voice prompts accept both.

| Jargon (Pro mode) | Plain language (default) | When each is shown |
|---|---|---|
| CRM | Who's asking, and what do I know about them? | Default. "CRM" never appears in the product. |
| Lead | Someone's curious about your work | All capture surfaces |
| Prospect | Someone we're talking to | Pre-proposal |
| Contact / Person record | The person and what we know about them | Every record header |
| Account / Company | Their business (if any) | When organization field is non-null |
| Deal / Opportunity | A possible job | Pre-Lock |
| Pipeline | What might happen next | The journey-strip surface |
| Stage | Where we are with them | Every record |
| Won | Yes — we got it | Lock confirmed |
| Lost | They went another way | Optional, soft phrasing |
| In progress | Still talking | Default mid-state |
| Activity | Something we did or they did | Timeline entries |
| Task | Something to do | To-do list |
| Note | A thing I wrote down | Free-text |
| Custom field | A thing you want to track | Field-add flow |
| Workflow / Automation | A thing that runs on its own | Behind Pro Toggle |
| Segment | A group of people who share something | Filter chips |
| Score | How likely they are | One-word: "Hot," "Warm," "Cool" |
| Funnel | How many stick around at each stage | Pro Toggle only |
| Engagement | Did they open / tap / reply? | Whisper-level |
| Touch / Touchpoint | When you reached out | Timeline event |
| Cadence / Sequence | A rhythm of follow-ups | Pro Toggle only |
| Disposition | What happened on the call | "Got a hold of them," "Left a message," "No answer" |
| Lead source | Where they came from | "From a referral," "Saw the truck," "Online" |
| Pipeline value | What it's worth if we win it | "Could be worth ~$5K" |
| Closed-won / Closed-lost | Yes / They went another way | Stage indicator |
| MQL / SQL | (Never shown) | Pro Toggle reveals as "Hot" / "Ready to talk" |
| Demo / Discovery call | Site visit | Trade-appropriate |
| Proposal | What you'd cost | Plain word |
| Won-back / Reactivation | They came back to us | Post-Reflect |
| Renewal | Time for the next one | Year-anniversary trigger |
| Churn | We lost touch | Internal only |
| Customer success | How the job is going | Build stage |
| Account-based | Big jobs we care about | Pro Toggle only |
| Lead routing | Who handles new ones | If multi-user, plain: "Who picks up new ones?" |
| Lifecycle stage | Where we are with them | Stage indicator |
| Source attribution | Where did this come from | "Maria came from Smith's referral" |

**Rule:** if a label requires more than two words of explanation for a 10-year-old or a non-English-native pro, it gets a plain-language replacement. The Pro Toggle re-exposes the term for the office staff who learned the jargon at QuickBooks Online or Salesforce.

---

## SECTION 3 — THE FIVE-SURFACE CRM MLP SPEC

Each of the five surfaces is specified across six dimensions. Build complexity: S (1 week), M (2–3 weeks), L (4+ weeks).

### Surface 1 — TODAY (the landing)
- **Plain-language question:** "What's on my plate?"
- **Pro label:** "Inbox / Dashboard."
- **Primary Invitation Card:** "Three things waiting on you" — single card, three Whispers stacked, each one tap to act.
- **Machine surface:** `crm_list_today(user_id)` → returns array of `{type, contact, reason, suggested_action, time_machine_handle}` — same data structure powers the human screen and the agent response.
- **Voice expression:** "What's on my plate today?" → audio summary with three items, then "want me to tackle the first one?" This is the canonical **Ask Anything** primitive for the CRM surface — same prompt accepts "What did I do yesterday?", "Who owes me money?", "When was the last time I called Smith?"
- **Constitution goals it must pass:** 1 (plain language), 2 (human arc — vibe-first, urgency-second), 3 (invitation), 4 (ambient — replaces empty state), 5 (Time Machine — every action undoable), 6 (single-tap, voice-only works), 8 (machine-legible), 9 (voice equal), 10 (lane-aware ordering).
- **Primitives in play:** Invitation Card (the three stacked cards), Whisper (each card is a Whisper, not a notification), Ask Anything (the voice prompt above), Time Machine, Pro Toggle.
- **Build complexity:** M.

### Surface 2 — WHO'S ASKING? (the capture)
- **Plain-language question:** "Who's curious about my work?"
- **Pro label:** "Contacts / Leads."
- **Primary Invitation Card:** Two huge floating buttons in the bottom action zone: 🎤 hold-to-talk, 📸 tap-to-photo. Below: a list of recent people, freshest at top, each one a card with last-touch + next-suggested-action.
- **Machine surface:** `crm_capture_lead(source, raw_input)` for write; `crm_list_contacts(filter)` for read. JSON-LD `bkg_contact` is the canonical shape.
- **Voice expression:** "New lead, [name], [address], [what they want]." Entity extraction creates the record live; preview card surfaces for thumb-confirm.
- **Constitution goals it must pass:** 1, 3 (invitation, not "+ Add New Contact"), 4 (no setup wizard), 5 (every record skippable / undoable), 6 (voice + single-tap), 7 (Invitation Card primitive), 8 (every record is JSON-LD), 9, 10.
- **Primitives in play:** Invitation Card (the two floating buttons), Whisper (first-time empty state), **Progressive Reveal** (record card starts with just name + last-touch; tap to reveal address, intent, budget; Pro Toggle reveals confidence + source + lane), Time Machine, Pro Toggle.
- **Build complexity:** L.

### Surface 3 — WHAT MIGHT HAPPEN NEXT? (the journey strip)
- **Plain-language question:** "Where is every job today?"
- **Pro label:** "Pipeline."
- **Primary Invitation Card:** The 7-stage journey strip horizontally (Size Up → Lock → Plan → Build → Adapt → Collect → Reflect), with each person's name as a dot at their current stage. Plus a "+Lead" stack on the left. Tap any dot → person record. Drag a dot → advance stage. Pro Toggle flips to vertical Kanban with stage columns.
- **Machine surface:** `crm_list_pipeline(filter)` → array of `{contact_id, current_stage, time_in_stage, last_event, suggested_next_action}`. `crm_advance_stage(contact_id, to_stage, reason)` for write.
- **Voice expression:** "Where are we with Maria?" / "Move Smith to Build." Voice grammar is `{action} {contact} {to_stage}`.
- **Constitution goals it must pass:** 1, 2 (human arc — left-to-right journey, not "funnel"), 5 (every stage change reversible — Time Machine), 6, 7 (Emotional Arc primitive), 8, 9, 10.
- **Build complexity:** M.

### Surface 4 — QUICK REPLY (the conversation queue)
- **Plain-language question:** "What should I say back?"
- **Pro label:** "Inbox / Conversations."
- **Primary Invitation Card:** Stack of inbound messages — newest at top. Each card: customer face/initials, original message, AI draft below in a soft amber chip, two thumb buttons: "Send" (large), "Edit" (smaller). 90-second undo bar persists after send.
- **Machine surface:** `crm_list_inbox(unread=true)`, `crm_draft_reply(contact_id, inbound_message_id, tone?)`, `crm_send_reply(contact_id, message, time_machine_handle)`, `crm_undo(time_machine_handle)`.
- **Voice expression:** "Read me the next message" → audio playback → "want to send the draft?" → "yeah / change it to [X]." Voice send + voice undo.
- **Constitution goals it must pass:** 1, 3, 5 (90-second undo + drafts tray), 6, 7 (Invitation Card + Time Machine primitives), 8 (every draft has reasoning trace), 9, 10.
- **Build complexity:** L.

### Surface 5 — REPEAT CLIENT RADAR (the post-Reflect loop)
- **Plain-language question:** "Who should I check on?"
- **Pro label:** "Renewal · Warranty · Referrals."
- **Primary Invitation Card:** Three Whisper cards by default ("Smith's 1yr warranty Tuesday", "Lopez has a thanks-text outstanding", "Wong is on storm path"). Pro Toggle reveals filterable list.
- **Machine surface:** `crm_list_radar()`, `crm_propose_outreach(contact_id, reason)`, `crm_dismiss_radar_item(item_id, reason)`.
- **Voice expression:** "Who should I check on this week?" / "Remind me about Smith's warranty in a week."
- **Constitution goals it must pass:** 1, 2 (emotional sequencing — friendship-first, sales-second), 3 (Whisper, not pop-up), 4 (proactive but never modal), 5, 6, 7 (Whisper + Invitation Card primitives), 8, 9, 10.
- **Build complexity:** L.

**MLP discipline:** That's all five. Activities, custom-field admin, automations, segmentation, reports — all behind Pro Toggle or in v2. Resist the urge.

### Primitive coverage across the five surfaces
Per the constitution's Goal 7 (Reusable Primitives, Platform-Wide), every BKG surface must compose from the named seven primitives. This is the explicit mapping:

| Primitive | Today | Who's asking? | What might happen next? | Quick reply | Repeat radar |
|---|---|---|---|---|---|
| Invitation Card | ✅ (3 stacked cards) | ✅ (2 floating buttons) | ✅ (each dot is a card) | ✅ (each inbound) | ✅ (each Whisper card) |
| Emotional Arc | ✅ (vibe-first ordering) | ✅ (capture → confirm → place on journey) | ✅ (the 7-stage left-to-right) | ✅ (read → draft → send → undo) | ✅ (friendship-first phrasing) |
| Whisper | ✅ (every card is a Whisper) | ✅ (first-time empty state) | ✅ (stage-rot signals) | ✅ (tone-suggestion chip) | ✅ (the surface IS Whispers) |
| Time Machine | ✅ (undo every action) | ✅ (30-day record undelete) | ✅ (stage moves reversible) | ✅ (90s undo bar — headline) | ✅ (dismiss restorable) |
| Ask Anything | ✅ ("What's on my plate?") | ✅ (voice-as-capture) | ✅ ("Where are we with X?") | ✅ ("Read me the next message") | ✅ ("Who should I check on?") |
| Pro Toggle | ✅ (urgency metrics) | ✅ (Source/Confidence/Lane columns) | ✅ (Kanban view) | ✅ (delivery + opt-out flags) | ✅ (full filterable list) |
| Progressive Reveal | ✅ (tap card → details) | ✅ (record fields reveal on tap) | ✅ (dot → record → workflows) | ✅ (tap for thread history) | ✅ (tap for past-job context) |

**Every cell is non-empty.** Every primitive ships into every surface. This is the binding-decision-#2 (Time Machine as platform infra) and binding-decision-#1 (Pro Toggle visible everywhere) made structural rather than aspirational.

---

## SECTION 4 — THE INVISIBLE CRM ARCHITECTURE

Every byproduct moment in the contractor's day where CRM data gets created **without the user thinking "I'm doing CRM."** Each row: byproduct moment → inferred CRM event → structured fact stored → AI suggestion that might fire. Drawn from Stream B's 30+ byproduct table; trimmed to the highest-leverage 24.

| Byproduct moment | Inferred CRM event | Structured fact stored | AI suggestion |
|---|---|---|---|
| Photo upload on site | `photo.attached` | `project_id`, EXIF GPS, timestamp, transcribed labels | "Smith job? Looks like the ridge from June" |
| Voice memo in the truck | `voice_note.recorded` | Audio file, transcript, sentiment, entity mentions | "Want me to text Smith that you'll be late?" |
| Inbound SMS from unknown number | `message.received` (new contact) | New `bkg_contact` draft, phone, transcript, address mentions geocoded | "This looks like a new lead — confirm or skip?" |
| Inbound SMS from known number | `message.received` | Append to existing record, sentiment, urgency flag | "Maria sounds frustrated — escalate?" |
| Outbound SMS sent (from BKG) | `message.sent` | Audit trail, recipient, content, time_machine_handle | (passive — feeds next-action timing model) |
| Missed call | `call.missed` | Phone, timestamp, voicemail transcript if present | "AI text-back: 'I'm on a roof, will call in 30. — Carlos'" |
| Voicemail transcribed | `voicemail.received` | Transcript, urgency, intent classification | "Want me to draft a reply?" |
| Customer opens shared estimate link | `proposal.viewed` | Contact, timestamp, time-on-page, return-visit count | "Maria came back to the estimate twice — call now?" |
| Customer signs e-contract | `contract.signed` | Document, timestamp, IP, version | (auto-advances stage to Lock) |
| Estimate sent | `proposal.sent` | Amount, document, recipient | (starts 7-day silence timer for nudge) |
| Estimate silence > 7 days | `proposal.cold` | (derived) | "Want me to send a polite follow-up in your voice?" |
| Sub-invoice received (q9) | `cost.recorded` | Vendor, amount, line items, attached to project | (passive — feeds budget spine + AR) |
| Material purchase logged (q11) | `expense.recorded` | Cost, vendor, project | (passive) |
| Daily log entry (q15) | `daily.logged` | Who, what, hours, weather, photos | (feeds Build-stage memory) |
| Weather event near job site | `weather.alerted` | Site_id, event_type, severity | "Want me to text Smith about the rain Friday?" |
| Crew check-in via voice | `crew.checked_in` | User, site, timestamp | (passive) |
| Sub timesheet submitted | `labor.recorded` | Sub, hours, project | (passive) |
| Permit application submitted (q8) | `permit.submitted` | Jurisdiction, type, project | (advances stage; surfaces in Plan) |
| Permit approved | `permit.approved` | Document, jurisdiction, date | "Want me to text Smith we got the permit?" |
| OSHA toolbox talk completed (q16) | `safety.completed` | Topic, attendees, project | (passive — feeds Build-stage compliance) |
| Forecasted schedule change (q14) | `schedule.shifted` | Project, old/new dates, reason | "Want me to draft heads-up to Smith?" |
| Review request sent (Reflect) | `review.requested` | Channel, recipient, project | (starts watch for review-posted event) |
| Review posted publicly | `review.posted` | Stars, text, source | "Great review from Smith — want to thank her?" |
| Referral mentioned in inbound message | `referral.mentioned` | Source contact, referred-by | "Smith referred Maria — want me to text Smith thanks?" |
| Customer pays invoice | `payment.received` | Amount, method, invoice_id | "Lopez paid — want me to send a thank-you?" |
| Customer late on invoice | `payment.overdue` | Days, amount, invoice_id | "Smith is 11 days past — polite nudge draft ready" |
| Anniversary of project close | `anniversary.fired` | Years, project, contact | "Smith's roof turns 1 Tuesday — quick check-in?" |
| Storm forecast near past customer | `storm.proximity` | Distance, severity, past_project_id | "Three past customers on the storm path — proactive ping?" |
| Past customer's address shows in new inbound | `repeat.opportunity_detected` | Old contact, new touchpoint | "Wong called from the same address — what's up at their place?" |
| Share-link viewed by a non-contact | `share.viewed_by_stranger` | Source contact (who shared), referrer | "Someone Smith shared with looked at your work — invite a chat?" |

**The architectural principle:** every entry in the table above is **an event emitted by an existing workflow**, never a new "CRM action." `q15 Daily Log` writes a `daily.logged` event that lands on the Smith customer record without anyone typing "go to CRM." The CRM is downstream of the work; the work is upstream of the CRM.

**The "phone number is the inbox" pattern (Stream D's 9th-primitive proposal):** every BKG account gets a Twilio number. Customers text that number, the SMS lands in `Quick reply` queue, replies go back through the same number, the AI agent has full audit. Photos forwarded by SMS go through Vision and attach to the inferred record. This is the contractor equivalent of Streak's "Gmail-as-CRM" — except in the lane where the contractor actually communicates.

---

## SECTION 5 — THE MCP TOOL SURFACE FOR BKG CRM

The final candidate list. 24 tools, grouped by lifecycle stage, with example I/O. Each tool's response includes `time_machine_handle` for any write. Source: Stream C.

### 5.1 Capture
```
crm_capture_lead(source: "voice"|"photo"|"sms"|"call"|"manual", raw_input: string|blob, context?: {gps, timestamp}) → bkg_contact
crm_attach_photo(contact_id, photo: blob, metadata?: {exif, geo}) → {attached_at, time_machine_handle}
crm_attach_voice_note(contact_id, audio: blob, transcript?: string) → {note_id, time_machine_handle}
```
Example:
```json
// Input
{"source": "voice", "raw_input": "New lead Maria Rodriguez 4421 Brickell Ave roof leak budget 5k", "context": {"gps": [25.7521, -80.2074], "timestamp": "2026-05-12T14:22:00Z"}}
// Output
{
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "bkg:contact:r9X2KqL",
  "name": "Maria Rodriguez",
  "contactPoint": [{"@type": "ContactPoint", "contactType": "mobile", "telephone": null}],
  "address": {"@type": "PostalAddress", "streetAddress": "4421 Brickell Ave", "addressLocality": "Miami", "addressRegion": "FL"},
  "bkg:lane": "homeowner",
  "bkg:lifecycle_stage": "lead",
  "bkg:source": "voice",
  "bkg:confidence": 0.86,
  "bkg:time_machine_handle": "tm_z8K2L",
  "bkg:last_touch": "2026-05-12T14:22:00Z"
}
```

### 5.2 List & read
```
crm_list_contacts(filter?, sort?, limit?) → bkg_contact[]
crm_get_contact(contact_id) → bkg_contact
crm_list_today(user_id) → today_card[]
crm_list_pipeline(filter?) → {contact_id, current_stage, ...}[]
crm_list_inbox(unread?: bool) → inbound_message[]
crm_list_radar() → radar_item[]
```

### 5.3 Lifecycle
```
crm_advance_stage(contact_id, to_stage: "lead"|"size_up"|"lock"|"plan"|"build"|"adapt"|"collect"|"reflect"|"repeat", reason?) → {time_machine_handle}
crm_score_lead(contact_id) → {score: "hot"|"warm"|"cool", reasoning: string[], factors: {...}}
crm_link_workflows(contact_id, workflow_ids: string[]) → {linked, time_machine_handle}
```

### 5.4 Conversation
```
crm_draft_reply(contact_id, inbound_message_id, tone?: "warm"|"professional"|"brief") → {draft: string, reasoning: string[], time_machine_handle}
crm_send_reply(contact_id, message: string) → {sent_at, channel, time_machine_handle}
crm_undo(time_machine_handle) → {undone_at, restored_state}
```

### 5.5 Proposals & payments
```
crm_send_proposal(contact_id, amount, line_items?, template_id?) → {proposal_id, sent_at, time_machine_handle}
crm_issue_invoice(contact_id, amount, line_items?) → {invoice_id, sent_at, time_machine_handle}
crm_log_payment(contact_id, amount, method, invoice_id?) → {payment_id, time_machine_handle}
```

### 5.6 Reflect / Repeat
```
crm_close_project(contact_id, outcome: "satisfied"|"neutral"|"unsatisfied", notes?) → {closed_at, time_machine_handle}
crm_request_review(contact_id, channel: "sms"|"email"|"google_business") → {request_id, time_machine_handle}
crm_propose_outreach(contact_id, reason: "warranty"|"anniversary"|"storm"|"referral"|"reactivation") → {draft: string, suggested_time, reasoning: string[]}
crm_dismiss_radar_item(item_id, reason?) → {dismissed_at, time_machine_handle}
```

### 5.7 Machine-only meta
```
crm_event_stream(filter?, since?) → event[] // SSE/streaming, all lifecycle events
crm_get_audit_trail(contact_id, since?) → audit_entry[]
crm_describe_self() → {tools, schemas, examples} // for agent self-discovery
```

**Cross-cutting requirements** (per Stream C):
- Every write returns `time_machine_handle`.
- Every read includes `confidence` where AI-inferred fields are present.
- Every tool description has a `human_label` and a `pro_label` matching the UI.
- Every tool is lane-tagged with `lane_relevance: string[]`.
- Pagination is cursor-based, not offset (Stream C's findings on Attio/Close vs HubSpot).
- Idempotency keys on every write.

---

## SECTION 6 — ADOPTION STORY: 30-DAY ROOFER, SKEPTIC → DEPENDENT

**Carlos Méndez, 41, owns Méndez Roofing in Tampa, FL.** One truck, his brother part-time, a wife (Lupita) who does QuickBooks invoices on Sundays. He has tried Jobber, JobNimbus, and "some other one I forget the name of." He still uses a spiral notebook on the truck door for active jobs and his phone Contacts app for everyone else. He texts customers from his personal number. He hates the word "CRM."

### Day 0 — Carlos hears about BKG from John Bou at a Tampa Bay Builders happy hour.
John shows him the picker landing on his phone. Carlos says, "I'm not signing up for another CRM." John says, "It's not a CRM. It's a tool that listens for you when you're on a roof." Carlos signs up because the homepage doesn't ask for a credit card and the first screen says **"Who's asking, and what do I know about them?"** — which is exactly what he yells at Lupita on Sundays.

### Day 1 — Empty-state demo.
Carlos opens BKG. The "Today" screen is empty but invites him: "Snap a photo or hold the mic to add your first customer." He holds the mic, says "Bob Henderson, 3242 Bayshore, ridge cap blew off." A card appears: Bob Henderson, 3242 Bayshore Blvd, Tampa, FL. Estimated value $800. Source: voice. *Done in 4 seconds.* Carlos says "huh" out loud and adds the next three customers from memory the same way.

### Day 3 — The missed-call wedge.
Carlos is on a roof. A new number texts: "Hi, my neighbor said you did roof work and my flashing's leaking — 7841 Bayou Dr." BKG creates a new lead card and shows a Whisper on his phone: "New person asking — Lisa from Bayou Dr — want me to draft a reply?" Carlos taps the Whisper. AI draft already shows: "Hi Lisa — thanks for reaching out. I'm on a roof right now, will swing by tomorrow at 10. Sound good? — Carlos." He taps Send. Toast: "Sent. Undo for 90s." He goes back to work. **He just won a job he would have lost.**

### Day 7 — The estimate-engagement Whisper.
Carlos sent Bob Henderson a $9,200 proposal four days ago. No response. BKG fires a Whisper on Today: "Bob viewed your estimate twice yesterday, hasn't replied — want me to nudge?" Carlos taps. Draft: "Hey Bob — wanted to make sure you got the estimate. Happy to walk through it if helpful. — Carlos." Carlos tweaks one word. Sends. Bob replies in 7 minutes: "Yeah let's do it Saturday." **Pipeline view? Carlos never opened it. The pipeline came to him.**

### Day 12 — Lupita's "what is this?"
Lupita opens BKG on the iPad on Sunday for invoicing. She sees a kitchen-sink Pro-Toggle screen. She flips Pro on. Aging buckets, AR balances, payment history per customer, AIA G702 invoice generation, all linked to the same customers Carlos has been creating. She sends 7 invoices in 11 minutes. **The whole spreadsheet she keeps gets retired.**

### Day 18 — First voice-photo combo flow.
Carlos is on a Smith job. Snaps a photo of an exposed nail in the underlayment. BKG attaches the photo to the Smith customer record via GPS match (Smith's address is geocoded). Carlos holds the mic: "Voice memo, found exposed nails on the north side, will need to redo the felt before tomorrow." Memo transcribed. Sentiment: "concerned." A Whisper appears on Lupita's iPad later that night: "Carlos flagged exposed nails at Smith — want to draft a heads-up to the homeowner?" Lupita sends the heads-up. **Build-stage memory, captured zero-effort.**

### Day 25 — Carlos shows BKG to his cousin Rafa who runs an HVAC shop.
Rafa says, "This is a CRM, right?" Carlos says, "No, it's not. Watch." Holds the mic, says "New lead Mark from McDonalds drive-thru AC out budget 800." Card appears. Rafa says, "OK, fine, I'll try it."

### Day 30 — The first repeat-radar fire.
A Whisper appears on Carlos's Today screen: "Diego Romero — you fixed his roof last May — Tampa has heavy storms forecast for Thursday. Want to send a quick 'we got you, call if you see leaks' text?" Carlos taps. Sends. Diego replies: "Wow, thanks man, you're the only contractor that's ever done that." Diego refers two neighbors that week.

### What flipped Carlos
- The product never said the word "CRM."
- He used voice and photo on day 1 and didn't see a form.
- The first day he had three records he didn't type a single character to create.
- The "missed-call wedge" was the conversion moment — week 1.
- The pipeline view he never opened still worked for him via Whispers.
- Lupita got the Pro Toggle in week 2 and the spreadsheet died.
- The repeat-radar in week 4 produced a referral he can attribute to BKG.

**The magnetic moments, in order:** voice capture (day 1) → AI text-back on a missed call (day 3) → estimate-silence nudge (day 7) → Pro Toggle for the office (day 12) → photo-by-GPS (day 18) → repeat radar (day 30).

By day 60, Carlos cancels Jobber.

---

## SECTION 7 — BUILD ORDER (the first 3 Cowork briefs)

These three briefs are paste-ready into `tasks.todo.md` under the reserved slots. Each is self-contained: target files, acceptance criteria, build & verify steps, MCP exposure, constitution goals.

### Brief 1 — "Who's asking?" voice & photo capture (M, 1.5 weeks)

**Plain-language label:** Who's asking?
**Pro label:** Contacts / Leads.
**Route:** `/killerapp/who-is-asking` (default route) — Pro Toggle changes the route label to "Contacts" but URL is permanent at the plain-language slug per Goal 1.

**Files to create:**
- `src/app/killerapp/who-is-asking/page.tsx` — Server Component, lists recent contacts from `bkg_contact` table.
- `src/app/killerapp/who-is-asking/WhoIsAskingClient.tsx` — Client, holds capture state, hosts the two action buttons.
- `src/components/crm/VoiceCaptureFAB.tsx` — Hold-to-talk, uses `useSpeechRecognition` (already exists). Sends transcript to `/api/v1/crm/capture`.
- `src/components/crm/PhotoCaptureFAB.tsx` — `<input type="file" accept="image/*" capture="environment">`, reads EXIF for GPS, posts to `/api/v1/crm/photo`.
- `src/components/crm/ContactCard.tsx` — Invitation Card primitive, shows name, last-touch, current stage, AI-suggested next action.
- `src/lib/crm/extract-entities.ts` — Server-side entity extraction (name + address + intent + budget). Wraps Claude API call with the `extract-entities.production.md` prompt.

**Files to touch:**
- `src/app/api/v1/crm/capture/route.ts` — POST handler. Accepts `{source, raw_input, context}`, returns `bkg_contact` JSON-LD. Writes to `contacts` table.
- `src/app/api/v1/crm/photo/route.ts` — POST handler. Accepts photo + EXIF, runs Vision label, attempts geocode → existing contact match within 200m. Creates new or attaches.
- `docs/schemas/crm-schema.sql` — Add `time_machine_handle` column to `contacts`, `crm_events`. Add `lane`, `lifecycle_stage`, `confidence`, `source` columns.
- `docs/ai-prompts/extract-entities.production.md` — New prompt file: input = transcript, output = structured JSON with `confidence` per field.
- `app/llms.txt` — Add `/killerapp/who-is-asking` entry, document the JSON-LD shape and the MCP `crm_capture_lead` tool.

**Acceptance criteria:**
- [ ] Holding the mic for 5s and saying "New lead, [name], [address], [trade question]" creates a contact in <2 seconds after release with name + address geocoded.
- [ ] Snapping a photo on a phone with location services on auto-attaches to the closest existing contact (within 200m) or creates a new contact via reverse-geocode of the GPS.
- [ ] Every contact record returns valid JSON-LD via `GET /api/v1/crm/contacts/[id].jsonld`.
- [ ] Every write returns a `time_machine_handle`.
- [ ] Pro Toggle flips the page heading from "Who's asking?" to "Contacts" and adds a "Source," "Confidence," "Lane" column.
- [ ] Voice flow works offline (transcript queued, syncs on reconnect — verified via airplane mode).
- [ ] MCP tool `crm_capture_lead` exposed at `/api/v1/mcp` and returns the same shape.

**Build & verify steps:**
1. `cd /Users/chillydahlgren/Desktop/The Builder Garden/Builder's Knowledge Garden/app`
2. Create files per above. Use `useSpeechRecognition` from existing hook.
3. `npx tsc --noEmit` — must EXIT 0.
4. `npx vitest run` — must pass. Add 4 new tests: capture from voice, capture from photo, GPS-attach to existing contact, JSON-LD validity.
5. `npx next build` — must pass.
6. Local smoke: open `localhost:3000/killerapp/who-is-asking` on a phone, hold mic, snap photo, verify journey strip shows new dot at "Lead."
7. Push to main. Vercel auto-deploys.

**MCP surface exposed:** `crm_capture_lead`, `crm_list_contacts`, `crm_get_contact`, `crm_attach_photo`, `crm_attach_voice_note`. Documented in `/api/v1/openapi`.

**Constitution check (all 10 goals):**
1. Plain Language First — route slug is `/who-is-asking`. Header reads "Who's asking, and what do I know about them?" Pro Toggle reveals "Contacts." ✅
2. Emotional Sequencing — human arc is "someone's curious → I add them → they're on my list," not "create record." ✅
3. Invitation, Not Instruction — two huge thumb buttons (🎤, 📸), no required fields, no "+Add Contact." ✅
4. Ambient Onboarding — first-time empty state is a Whisper: "Snap a photo or hold the mic to add your first customer." No modal tour. ✅
5. Time Machine — every record deletable for 30 days, every inferred field overridable, full version history. ✅
6. Most-Constrained User First — voice-only path works end-to-end with no typing. Single-tap to confirm card. Plain-language. ✅
7. Reusable Primitives — uses Invitation Card + Whisper + Pro Toggle + Time Machine. ✅
8. Machine-Legible — JSON-LD on every record, MCP tool exposes same data. ✅
9. Voice Is Equal — voice is the primary capture path, equivalent surface to photo. ✅
10. All Eight Lanes — contact's lane inferred from context; lane field always present, never null. ✅

---

### Brief 2 — "Quick reply" inbound conversation queue (L, 2 weeks)

**Plain-language label:** Quick reply
**Pro label:** Inbox / Conversations.
**Route:** `/killerapp/quick-reply`.

**Files to create:**
- `src/app/killerapp/quick-reply/page.tsx` — Server Component, lists unread inbound messages.
- `src/app/killerapp/quick-reply/QuickReplyClient.tsx` — Client, manages draft state, send state, 90-second undo bar.
- `src/components/crm/InboundMessageCard.tsx` — Invitation Card for each message. Shows: customer (initials/photo), inbound text, AI draft in amber chip, two thumb buttons.
- `src/components/crm/UndoBar.tsx` — Persistent 90s countdown after send. Time Machine primitive.
- `src/components/crm/VoiceTone.tsx` — One-tap chips "warm / professional / brief" to nudge AI tone.
- `src/lib/crm/voice-fingerprint.ts` — Background job that reads last 200 sent SMS and builds a tone vector per user (cosine similarity to draft outputs). Feeds the draft prompt.
- `src/lib/crm/draft-reply.ts` — Wraps Claude call with `draft-reply.production.md` prompt + voice fingerprint + inbound context.
- `src/app/api/v1/twilio/inbound/route.ts` — Twilio webhook for inbound SMS. Creates `bkg_message.received` event. Triggers draft.
- `src/app/api/v1/twilio/send/route.ts` — Outbound SMS send. Logs `time_machine_handle`. Undo within 90s = cancel send if not yet flushed to Twilio.

**Files to touch:**
- `docs/schemas/crm-schema.sql` — Add `messages` table (`id`, `contact_id`, `direction`, `body`, `channel`, `time_machine_handle`, `sent_at`, `delivered_at`, `proposal_amount_inferred`).
- `docs/ai-prompts/draft-reply.production.md` — New prompt: input = inbound + thread history + voice fingerprint + tone, output = draft with reasoning trace.
- `src/app/killerapp/layout.tsx` — Add Quick Reply badge to global chrome (unread count).
- `app/llms.txt` — Add tools.

**Acceptance criteria:**
- [ ] An inbound SMS from a known contact appears in `/quick-reply` within 5 seconds of receipt with an AI draft already loaded.
- [ ] AI draft sounds like the contractor — within 2 weeks of usage, blind A/B against the contractor's own sent SMS scores ≥4/5 on a "this sounds like me" test (manual eval).
- [ ] Pressing Send queues the message; an undo bar persists for 90 seconds during which a tap reverses the send.
- [ ] Tone chips ("warm / professional / brief") regenerate the draft in <2s.
- [ ] Every sent message logs a `time_machine_handle` and creates an `event.message.sent` event.
- [ ] If the inbound message contains a price (e.g., "$5,000"), it tags `event.proposal_sent` and starts the silence timer.
- [ ] MCP tools `crm_draft_reply`, `crm_send_reply`, `crm_undo` work via the same endpoint.

**Build & verify steps:**
1. Provision Twilio account / number per BKG account (manual for v1, automated in v1.1).
2. Build files per above.
3. `tsc --noEmit` EXIT 0; `vitest run` green (add 6 tests: draft generation, voice fingerprint match, undo within 90s, undo expired, tone regeneration, MCP parity).
4. `next build` green.
5. Local smoke: text a real number, verify draft appears, verify thumb-send, verify 90s undo.
6. Verify MCP via Claude Desktop: `crm_list_inbox` returns same data as the screen.
7. Push.

**MCP surface exposed:** `crm_list_inbox`, `crm_draft_reply`, `crm_send_reply`, `crm_undo`. Documented.

**Constitution check:**
1. ✅ Route is plain language; "Inbox" is Pro only.
2. ✅ Emotional Sequencing — newest first, urgency-weighted.
3. ✅ Invitation — "Send" is a big button, "Edit" is small; no required fields.
4. ✅ Ambient Onboarding — first inbound message has a whisper: "I'll draft a reply when one comes in."
5. ✅ Time Machine — 90s undo + drafts tray. Headline primitive in this surface.
6. ✅ Most-Constrained — voice read-and-reply works end-to-end.
7. ✅ Primitives — Invitation Card + Time Machine + Pro Toggle.
8. ✅ Machine-Legible — same MCP shape.
9. ✅ Voice — voice send, voice undo.
10. ✅ All Lanes — works whether the inbound is from a homeowner, sub, supplier, or another GC.

---

### Brief 3 — "Repeat client radar" post-Reflect radar (L, 2.5 weeks)

**Plain-language label:** Who should I check on?
**Pro label:** Renewal · Warranty · Referrals.
**Route:** `/killerapp/repeat-radar`.

**Files to create:**
- `src/app/killerapp/repeat-radar/page.tsx` — Server Component, lists Whisper cards for the week.
- `src/app/killerapp/repeat-radar/RepeatRadarClient.tsx` — Client, handles dismiss + propose-outreach actions.
- `src/components/crm/RadarWhisper.tsx` — Whisper card; one Invitation Card per radar fire.
- `src/lib/crm/radar/warranty.ts` — Computes warranty windows per trade (roofing: 1mo, 3mo, 1yr, 5yr; HVAC: 6mo, 1yr).
- `src/lib/crm/radar/anniversary.ts` — Project-close anniversary detection.
- `src/lib/crm/radar/storm-proximity.ts` — Wraps existing weather API; matches forecast to past-customer addresses within 100mi.
- `src/lib/crm/radar/referral-mention.ts` — Scans inbound messages for referral signals (regex + Claude classification).
- `src/lib/crm/radar/repeat-opportunity.ts` — Detects new inbound from past customer addresses.
- `src/app/api/v1/crm/radar/route.ts` — GET handler returns sorted radar items.
- `src/app/api/v1/crm/radar/dismiss/route.ts` — POST dismisses, records reason for model improvement.
- `src/app/api/v1/cron/radar-heartbeat/route.ts` — Runs hourly. Walks every closed project, fires radar events, generates Whispers.

**Files to touch:**
- `docs/schemas/crm-schema.sql` — Add `radar_items` table (`id`, `contact_id`, `reason`, `severity`, `suggested_text`, `surfaced_at`, `dismissed_at`, `dismissed_reason`).
- `vercel.json` — Add cron: `/api/v1/cron/radar-heartbeat` every hour.
- `docs/ai-prompts/radar-outreach.production.md` — New prompt for `crm_propose_outreach`.
- `app/llms.txt` — Add tools.

**Acceptance criteria:**
- [ ] For every project marked `closed` (Reflect-completed), at least 5 radar fires are scheduled over the next 5 years (warranty windows, anniversary, etc.).
- [ ] A weather event near a past customer's address (within 100mi, severity ≥ "moderate") fires within 1 hour.
- [ ] `/repeat-radar` shows at most 3 Whisper cards on the default view; Pro Toggle reveals full list.
- [ ] Dismissing a radar item records the reason and trains the model to suppress similar items.
- [ ] Each card has a one-tap "Send the draft" with a pre-loaded `crm_propose_outreach` output.
- [ ] MCP tools `crm_list_radar`, `crm_propose_outreach`, `crm_dismiss_radar_item` return the same shape as the UI.

**Build & verify steps:**
1. Build per above. Reuse existing weather API (q14) for storm proximity.
2. Seed 5 fake closed projects with addresses around Tampa to test storm proximity.
3. `tsc --noEmit` + `vitest run` (add 8 tests: warranty calc per trade, anniversary trigger, storm match, referral classifier, dismiss → suppress).
4. `next build` green.
5. Local smoke: manually trigger heartbeat, verify 3 cards on screen, dismiss one, verify it doesn't re-fire.
6. Verify MCP parity.
7. Push.

**MCP surface:** `crm_list_radar`, `crm_propose_outreach`, `crm_dismiss_radar_item`. Documented.

**Constitution check:**
1. ✅ Plain-language route + header; "Renewal · Warranty · Referrals" is Pro.
2. ✅ Emotional Sequencing — friendship-first, sales-second (warranty checkpoint phrased as "I want to make sure your roof's still doing OK," not "1yr renewal opportunity").
3. ✅ Invitation — Whisper, not modal. 3 cards max on default.
4. ✅ Ambient — fires only when something is relevant; silent otherwise.
5. ✅ Time Machine — every dismiss is logged with reason; restorable.
6. ✅ Most-Constrained — voice query "who should I check on?" returns audio summary.
7. ✅ Primitives — Whisper + Invitation Card + Pro Toggle.
8. ✅ Machine-Legible.
9. ✅ Voice Equal.
10. ✅ All Lanes — works for homeowner-roofer, GC-sub relationships, supplier-contractor restocks.

---

## SECTION 8 — WHAT WE'RE EXPLICITLY NOT BUILDING IN V1

Protecting the MLP. Every item below is a real CRM feature that *will not ship* until v2 or later. Each has a one-line reason rooted in the constitution.

1. **Custom field admin UI.** v1 fields are AI-inferred or fixed. Goal 3 (invitation) and Goal 6 (constrained user) say no schema-design as primary surface. Pro Toggle gets a "Magic Field" affordance only.
2. **Automations / workflow builder.** No "if X then Y" UI. v1 has fixed AI-driven automations (silence-nudge, storm-radar, etc.). Goal 3.
3. **Visual pipeline editor.** Kanban-with-drag-drop is Pro-Toggle of "What might happen next?" — but no pipeline-builder. The 7-stage lifecycle is fixed in v1. Goal 7 (reusable primitives — no surface-specific UI).
4. **Email integration.** v1 is SMS + voice + photo. Email comes in v2 once the SMS pattern is proven. Goal 6.
5. **Calendar sync.** v1 references calendar in Brief 2's "I'll swing by Wednesday" but no two-way sync. Calendar arrives with Brief 4 ("Schedule").
6. **Reports / analytics dashboard.** v1 has Today and Radar; no "monthly conversion report." Goal 2 (human arc — vibes, not metrics).
7. **Multi-user roles / permissions.** v1 is single-user + Pro Toggle for Lupita. Multi-user roles arrive in Phase 2F after Clerk is fully wired.
8. **External integrations (Zapier, etc.).** MCP is our integration plane. Zapier is a fall-back, not v1.
9. **Lead distribution / round-robin.** Solo + small-shop contractors are the v1 ICP. Lead distribution is a 5+-user feature.
10. **Drip campaigns / sequences.** Quick reply is the conversation surface. Sequences imply marketing — wrong tone for the ICP.
11. **Marketing email / form builder.** Out of scope — too far from the contractor on a roof.
12. **Predictive deal scoring beyond Hot/Warm/Cool.** Pro Toggle exposes the six factors. No "AI predicts $X.XX probability of close" — feels corporate-sales.
13. **A "Sales" mode.** The word "sales" appears nowhere in v1. We will resist this until ≥10 contractors complain about its absence.
14. **A web extension.** Folk's Chrome extension is great. Not v1. v1 is mobile-first on the phone the contractor already carries.
15. **Contact merge / dedup UI.** AI infers duplicates and surfaces a Whisper; no merge-records modal.
16. **Bulk import.** Phone Contacts and SMS history are sync-in only. CSV import lands in v2 once we know what shape the imports take.
17. **Custom branding.** No logo upload, no email-template branding. v1.5.
18. **API marketplace / partner apps.** MCP is the surface for partners. App marketplace is a Phase 6 concern.

---

## SECTION 9 — RISKS, ASSUMPTIONS, OPEN QUESTIONS

### Risks
- **Twilio cost per account.** ~$1/mo + $0.0075/SMS. At 100 contractors × 200 SMS/mo = ~$150/mo Twilio bill. Survivable; price into Pro tier.
- **Voice transcription accuracy in noisy environments.** Web Speech API + on-device fallback (Whisper via Replicate) for ladder/attic capture. Test in real conditions before Brief 1 GA.
- **The "AI sounds like me" problem.** Voice fingerprinting via last-200-SMS is the bet. Mitigation: tone chips, easy regenerate, and the 90s undo. If voice fingerprint scores < 4/5 in eval, fall back to "AI clearly drafted this" framing — still better than blank box.
- **MCP-write authorization.** Granting Claude/GPT agents write access is a trust leap. Solution: every agent write defaults to "draft only" until the contractor explicitly grants `send_scope = true` per account. Goal 5 (Time Machine) makes write-then-undo the default rather than confirmation prompts.
- **PII / GDPR / CAN-SPAM.** SMS opt-out compliance, consent capture on inbound. Brief 2 ships with `STOP / START` keyword handling and a per-contact `consent_flags` field.

### Assumptions
- The existing Supabase schema can absorb the new `messages`, `radar_items`, `crm_events` tables with a single migration. Verified in Brief 1 dependency check.
- The existing AI specialist runner (`src/lib/specialists.ts`) and the Anthropic API key are already wired (per W7.Q.1 lesson). No new infra.
- `useSpeechRecognition` hook (already shipped per W2.5) can be reused with the per-utterance fix from `tasks.lessons.md` ("Web Speech API: `onresult` replaces, never appends").

### Open questions for Chilly
1. **Twilio per-account vs shared pool.** v1 design assumes one Twilio number per account. Cheaper alternative is a single shared number with smart routing — but it weakens the "the customer texts you, the same number they always texted you" trust signal.
2. **The 8th primitive question.** Stream D proposed a **Correction Loop** primitive — distinct from Time Machine, this is "AI was wrong, here's the right answer, learn." Without it, the AI's inferred fields will keep being wrong and the contractor has nowhere to push back. Time Machine reverses; Correction Loop *teaches.* Open question: do we extend the constitution to 8 primitives, or fold Correction Loop into Whisper + Time Machine? Flagging for explicit decision before Brief 1 ships, since the data plumbing differs. (Captured in `tasks.lessons.md`.)
3. **Pro Toggle in the URL.** Today's plan keeps the URL at the plain-language slug. But should `?pro=1` appear in the URL when toggled, so a Pro user can deep-link to "/who-is-asking?pro=1"? Or is Pro a per-session preference?
4. **Onboarding the existing `/crm` Command Center route.** Should the current `/crm` business-pulse page redirect to `/today`, or stay as a Pro-Toggle-only legacy URL? Either works; the redirect is cleaner.

---

## SECTION 10 — METRICS & RSI HOOKS

Every surface emits events for Loop #8 (Design Constitution Fitness). Recommended instruments per surface:

| Surface | Event | RSI signal |
|---|---|---|
| Today | `today.card_tapped`, `today.card_dismissed` | Invitation acceptance rate |
| Who's asking? | `capture.attempted`, `capture.confirmed`, `capture.abandoned` | Capture success rate by source (voice / photo / SMS / manual) |
| Who's asking? | `confidence_score_at_capture` | Calibration: are we over-inferring? |
| What might happen next? | `stage.advanced_by_user`, `stage.advanced_by_agent` | Human/agent ratio per stage |
| Quick reply | `draft.accepted`, `draft.edited`, `draft.regenerated_with_tone` | Voice-fingerprint quality |
| Quick reply | `send.undone` | Trust signal in the draft |
| Repeat radar | `radar.fired`, `radar.tapped`, `radar.dismissed_reason` | Relevance learning |
| All surfaces | `pro_toggle.flipped` | Pro-mode adoption per surface |
| All surfaces | `whisper.dismissed` | Whisper fatigue tracking |
| All surfaces | `time_machine.undo_invoked` | Time Machine value validation |
| All surfaces | `voice_command.completed_end_to_end` | Goal 9 fitness |
| MCP | `mcp.tool_invoked` | Agent-vs-human ratio per tool |

These feed RSI Loop #8. The Loop's job is to surface: which surfaces are failing which goals, where contractors abandon, where the agent and the human disagree.

---

## SECTION 11 — APPENDIX: CONSTITUTION-EXTENSION PROPOSAL

Per Stream D, two patterns surfaced that don't cleanly map to existing primitives. Flagging for explicit decision rather than quietly extending the constitution.

### Proposal A — "Correction Loop" (proposed 8th primitive)
- **What it does:** Captures user disagreement with an AI inference and teaches the model. Distinct from Time Machine (reversibility): Correction Loop is *teach.*
- **Trigger surfaces:** Inferred field on a contact (wrong address, wrong intent), AI draft reply, AI radar suggestion.
- **Interaction:** Long-press on any AI-inferred element → "this is wrong → [correct value]" → field updated, correction event emitted, fine-tune signal sent.
- **Voice expression:** "That's wrong, her address is [X]."
- **Machine-legible:** `crm_record_correction(field_id, old_value, new_value, reason?)`.
- **Pro Toggle behavior:** Pro reveals the source of the AI inference (which prompt, which signal) so the user can correct upstream.
- **Time Machine behavior:** Corrections are themselves reversible.

**Recommendation:** Extend to 8 primitives. The data plumbing differs from Time Machine and the user-experience moment is distinct. Stream D's argument is strong.

### Proposal B — "Phone-Number-as-Inbox" (architectural pattern, not a primitive)
- **What it does:** Every BKG account gets a dedicated SMS number. Customers can text the number, forward photos, leave voicemails. All inbound becomes structured events.
- **Why not a primitive:** This is an *implementation pattern*, not a UX primitive. Folds into Brief 2's infrastructure.

**Recommendation:** Implement in Brief 2. Don't extend the constitution.

---

## SECTION 12 — APPENDIX: REFERENCES

Sources from Streams A–D (highest-leverage). Full citations live in the individual stream files.

- [Stream A — Mainstream + Vertical CRM Landscape](./stream-a-landscape.md)
- [Stream B — Contractor Reality](./stream-b-contractor-reality.md)
- [Stream C — Machine-Readable CRM Surface](./stream-c-machine-surface.md)
- [Stream D — UX Patterns Worth Stealing or Rejecting](./stream-d-ux-patterns.md)
- [BKG Design Constitution](../../design-constitution.md)

### The three most-cited contractor voices (from Stream B)
- [r/Contractor 1rorqtg — "Anyone else lose jobs because they forget to follow up on quotes?"](https://reddit.com/r/Contractor/comments/1rorqtg/) — the universal pain.
- [r/Plumbing 1rqe4dh — "Plumbers, what app/software do you use?"](https://reddit.com/r/Plumbing/comments/1rqe4dh/) — the missed-call wedge.
- [r/Roofing 1kdk4ac — "ACX-CRM Data Hostage"](https://reddit.com/r/Roofing/comments/1kdk4ac/) — the warranty memory moat.

### The three competitor patterns worth stealing (from Streams A and D)
- **CompanyCam** — photo IS the record (Brief 1).
- **Day.ai** — populated-not-empty first-run (Brief 1 + future onboarding).
- **Attio / Linear** — Cmd-K palette with inferred record creation (Brief 1's voice equivalent + future power-user mode).

### The three competitor patterns worth explicitly rejecting
- **Salesforce Lightning contact page** — 6 tabs, 30+ fields above the fold. Violates Goals 1, 3, 6.
- **HubSpot 2-user free cap** — gates out the 1-person LLC. Violates Goal 6.
- **JobNimbus / Buildertrend / AccuLynx "request a demo" pricing** — violates Goal 3 (invitation).

---

*End of Stream E. Document version 1.0 — 2026-05-12. Ready for Chilly review and approval before any CRM build work begins.*
