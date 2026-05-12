# Stream D — UX Patterns to Steal or Reject

> Sprint stream cataloguing specific UX moves from best-in-class apps (CRM and adjacent) that compose into BKG's seven primitives — and naming names on the patterns we must explicitly reject.
> Audience: a contractor on a roof with one greasy thumb, and a Claude MCP agent reading the same JSON. Both must succeed on every screen.

---

## Executive summary

The CRM market has bifurcated. **Attio, Linear, Folk, and Day.ai** all assume a knowledge worker with two screens and clean hands; they have nothing to teach us about thumb-on-roof UX but everything to teach us about minimal-touch ambient capture. **CompanyCam, JobNimbus, and Roofr** know the field but smother it with tabs and forms borrowed from desktop SaaS. **Granola, Superhuman, and Otter** have solved "data structured without data entry" for meetings — the contractor equivalent is voice memo + SMS + photo-roll, not Zoom transcripts.

### 3 must-steal patterns (the headline)
1. **Day.ai's "zero-entry first run"** — read inbox/SMS/call log on connect, surface 20 candidate contacts, ask "is this your customer?" (one tap yes/no). Maps to **Invitation Card + Ambient Onboarding**. If we don't ship this, every contractor who downloads BKG bounces in the empty state.
2. **CompanyCam's "tap camera, photo becomes the record"** — GPS auto-creates project, photo IS the lead, name comes later. Maps to **Invitation Card + Progressive Reveal**. Reverses the order: the artifact creates the record, not the record receiving the artifact.
3. **Linear / Attio's Cmd-K palette with inferred record creation** — single keystroke, type a verb, fuzzy-match an entity, done. Maps to **Ask Anything + Pro Toggle**. This is also the MCP agent's primary surface (same palette, same actions, same JSON).

### 3 must-reject patterns
1. **Salesforce Lightning contact page** (6+ tabs, 30+ fields above the fold) — violates **Plain Language First** and **Most-Constrained User First**.
2. **HubSpot/Salesforce required-field gates** ("\* Required" red asterisks blocking save) — violates **Invitation Not Instruction** and **Time Machine** (cannot skip-and-return).
3. **Modal welcome tour** ("Step 1 of 7: Click here to continue") — used by Pipedrive, Salesforce, HubSpot, Folk, and every B2B SaaS launched after 2015. Violates **Ambient Onboarding**, **Emotional Sequencing Default**, and the contractor's actual cognitive budget.

### The one pattern Chilly should ship in Brief 1
The **Cmd-K / Hold-to-Talk single primary action**. One affordance, two modalities (keyboard for desk + agent, voice for field). It's the spine of every other primitive. Everything else can be progressively revealed underneath it.

---

## D1. Relational / flexible records — adding fields without becoming a DBA

The question for every flow below: **could a roofer add a "shingle color" custom field on his phone, in a truck, with the sun behind him, in under 30 seconds?** Spoiler: no, today, anywhere.

### Attio — "Create attribute" inside a list or object

**Screen-by-screen narrative.** From a list view, the user clicks the `+` at the right edge of the column header, then "Create new attribute." A right-side drawer slides in with three fields: name, type (text/number/select/relationship/date/AI), and description. The type picker is a vertical list with icons; "AI attribute" is conspicuous near the top — that's the bet. Once created, the column appears immediately and is editable in the row.

**Cognitive cost.** Attio is the cleanest desktop pattern in the category. The decision between "object attribute" (applies to all records) and "list attribute" (scoped to one pipeline) is non-obvious and will trip every non-engineer — Attio glosses it with a single helper sentence in the drawer. The flow is keyboard-first: Cmd-K → "new attribute" works from anywhere.

**Phone reality.** Attio's mobile is read-mostly; the attribute creation drawer doesn't fit a 380px viewport cleanly. A contractor in the field cannot meaningfully add a custom field on a phone. ([Attio attributes docs](https://attio.com/help/reference/managing-your-data/attributes))

### Notion — "Add property" on a database

**Screen-by-screen.** Click `+` on the rightmost column or `+ Add a property` in a row's side panel. A popup appears: name field at top, then a vertical scrolling list of ~20 property types grouped into "Basic" (text, number, select, date, person, files, checkbox, URL, email, phone) and "Advanced" (formula, relation, rollup, created/last edited by/time, ID, button, status). Each has an icon and one-line description.

**Cognitive cost.** Notion deserves credit for the inline helper text on each property type. Where it fails: "relation," "rollup," and "formula" are gates a non-technical user crashes into the first time they need to express "this contact belongs to this company." The cliff from "select" to "relation" is the largest concept cliff in productivity software. Most small-business Notion users never cross it.

**Phone reality.** Notion's mobile actually allows property creation but the type picker is a full-screen modal — usable but slow. ([Notion add property guide](https://www.notion.com/help/database-properties))

### Airtable — "+ Add a field" + the type picker

**Screen-by-screen.** Click `+` at the end of the column row. A modal expands inline: name field, type dropdown (~20 types including Attachment, Single line text, Long text, Single select, Multiple select, Date, Phone, Email, URL, Number, Currency, Percent, Duration, Rating, Checkbox, User, Link to another record, Lookup, Rollup, Count, Formula, Created/Last modified by/time, Auto number, Barcode, Button). Each type opens a configuration panel below.

**Cognitive cost.** Airtable's picker is **the most overwhelming** of the four, and it has the most types. The "Link to another record" → "Lookup" → "Rollup" cascade is functionally identical to a relational SQL JOIN — Airtable doesn't pretend it's not.

**Phone reality.** Airtable on phone is mostly read-only for field schema changes. ([Airtable field types](https://support.airtable.com/docs/supported-field-types-in-airtable-overview))

### Folk — fields and "Magic Fields"

**Screen-by-screen.** Folk allows custom fields per "group" (Folk's equivalent of a pipeline). The standout is **Magic Fields** — an AI-powered field type where you write a natural-language prompt ("generate company description," "infer industry from website") and Folk runs it on each row.

**Cognitive cost.** Magic Fields is the only pattern in this set that a non-technical contractor could plausibly use. Type a sentence in the language they speak ("how many stories is their house"), get a value back, never define a schema. ([Folk CRM review — Hackceleration](https://hackceleration.com/folk-crm-review/))

**What we steal for BKG.** Folk's Magic Field model + Notion's icon-led type picker + Attio's keyboard entry point. The contractor never sees "schema"; they say "I want to track shingle color across all my customers," and the system creates the attribute, defaults it to "AI-inferred from any photo I attach," and lets them override per record.

**Primitives this maps to.** Invitation Card (the one question is "what do you want to track?"), Pro Toggle (advanced types hidden until pro mode), Progressive Reveal (relation/rollup never visible to basic mode).

---

## D2. Linear-style minimalism applied to sales

### Linear itself

**The pattern of inspiration.** Cmd-K opens a command palette anchored top-center. Type any verb (create, change status, assign, label, navigate) and a fuzzy-matched list of issues + actions appears. Press Enter; done. Single-letter shortcuts work outside the palette (C = create, S = status, P = priority, L = label, A = assign).

**Why it works.** One primary affordance, infinite secondary actions. The mouse is optional. The mental model is a verb-object grammar: `verb` → `pick noun`. ([Linear shortcuts](https://keycombiner.com/collections/linear/))

### Attio — Linear-minimalism applied to CRM

**Screen detail.** Cmd-K everywhere. From any list, `Cmd+K → "add company" → type name → Enter` creates a record and opens it. Records have a hero (name, primary attribute) and an inline editor below; no tabs. The "Activity" feed (calls, emails, meetings) lives on the right; everything is one keystroke from anywhere.

**Phone reality.** Attio's mobile preserves the palette intent with a single floating `+` button that opens a verb sheet. It's the closest a desktop-first CRM gets to thumb-survivable. ([Attio quick actions](https://attio.com/help/reference/productivity-collaborating/navigating-your-workspace))

### Folk — minimalism applied to relationships

**Screen detail.** Folk's contact view is a single column: avatar, name, one row of pills (group, status), then a vertical timeline of every interaction (email, meeting, note). Custom fields live in a collapsible "Details" section below the timeline — not above it. This is the right inversion: **artifacts above attributes**.

### Day.ai — minimal-touch onboarding

**Screen detail.** Sign in with Google or Microsoft → grant inbox/calendar scopes → Day.ai reads the last 90 days and pre-populates People, Companies, and Deals before you see the home screen. The first screen you see is a populated CRM, not an empty state. Per Sequoia podcast with Christopher O'Donnell: one user was "off to the races after one 15-minute call." ([Day.ai setup guide](https://www.day.ai/resources/day-ai-setup-guide))

**Phone survival.** Day.ai is mostly desktop today but the onboarding model translates: connect → wait → see populated state.

**What we steal for BKG.** Day.ai's "populated-not-empty first run" + Attio's command palette + Folk's artifacts-above-attributes record layout. The contractor's first screen is **already populated** from their call log, photo roll EXIF/GPS, and recent SMS contacts — they don't add a lead, they confirm one.

**Primitives this maps to.** Invitation Card (single primary action visible), Ask Anything (Cmd-K = "what do you want to do?"), Ambient Onboarding (no welcome modal — the populated state IS the onboarding), Time Machine (palette includes "undo" as a verb).

---

## D3. Mobile-first field UX — the contractor's reality

This is where most CRMs fail and where BKG must win. The phone is the contractor's only computer.

### CompanyCam — photo IS the record

**Screen-by-screen.** Open app → home screen is a map of jobs (Mapbox), the camera button is a giant red FAB at thumb-bottom-center. Tap → camera opens immediately (no project picker). Take photo → CompanyCam **uses GPS to suggest the nearest existing project**. If none nearby, "Create Project" appears as the primary action; the address auto-fills from reverse-geocoded GPS. Confirm. Photo saves with timestamp, GPS, and taker. **Three taps from holster to saved photo on the correct project.** ([CompanyCam take-photo flow](https://help.companycam.com/en/articles/12383831-take-photos-in-the-mobile-app))

**Why it works.** The system makes the decision the user would have to make. The photo is the leading artifact; metadata (project, customer) is inferred from where you stand, not asked.

**What we steal.** Inversion of order. In legacy CRM: create lead → fill 12 fields → attach photo. In BKG: take photo → BKG infers location, customer (from address book + GPS), stage (from existing pipeline) → contractor confirms or overrides.

### JobNimbus mobile — adding a lead

**Screen-by-screen.** Hamburger → "Contacts" → `+` → form: First name (required), Last name, phone, email, address, type (Lead/Customer/Subcontractor dropdown), status (~10 options dropdown), source (~15 options dropdown), assigned to (user picker). Save. **Best case: 7–9 taps + form fields.** ([JobNimbus app overview](https://www.jobnimbus.com/blog/jobnimbus-app-for-iphone-and-android/))

**Survives a roof?** Marginally. The form is portrait-only, the dropdowns are full-screen modals, and "status" requires a decision the contractor hasn't made yet. This is desktop CRM ported to mobile, not designed for it.

**Reject from BKG.** Mandatory status/type on first capture. Pick-twos that gate the save button.

### Roofr — first screen, mobile

**Screen-by-screen.** Login → home is a Kanban-by-default of "Jobs," columns = stages (Lead, Estimate, Sold, In Production, etc.). Each card shows price, address, last-action timestamp. Tap card → details. **Roofr ships a default pipeline** instead of asking the user to design one. ([Roofr CRM](https://roofr.com/crm))

**What we steal.** Default-pipeline-shipped principle. BKG's seven-stage Killer App lifecycle (Lead → Size Up → Lock → Plan → Build → Adapt → Collect → Reflect) IS the default. Users don't design it; they live in it; they can edit later.

### Procore — mobile RFI submit

**Screen-by-screen.** From a project, tap "RFIs" → `+` → subject (text), description (text), assignee (people picker), distribution list (multi-select), drawing reference (picker), photo (camera). Procore mobile gives contractors a streamlined view that hides admin fields. ([Procore mobile RFI](https://www.procore.com/project-management/rfis))

**What we steal.** Role-aware field hiding. The contractor in the field never sees fields the office user must fill. This is **Pro Toggle** applied not by user choice but by inferred role.

### STACK / PlanGrid (adjacent)

Both apps optimize plan markup over data entry. The lesson: **the artifact is the action.** Marking up a plan IS logging activity. Translating to BKG: a marked-up photo of damage IS a Lead's "Size Up" artifact. No separate "Size Up form."

**Phone reality summary — what works vs. what still requires a desk.**

| Pattern | Works on roof | Still requires desk |
|---|---|---|
| CompanyCam tap-camera | Yes | — |
| JobNimbus lead form | No (7 taps + decisions) | Yes |
| Roofr kanban view | Yes (read), maybe (drag) | Stage editing |
| Procore RFI submit | Yes for subs | Yes for admins |
| Attio Cmd-K | Maybe on phablet | Yes for power users |

---

## D4. The "everywhere" CRM pattern

The CRM lives inside the tools the user already uses. For contractors, "the tool you already use" is **the phone's native call log, SMS app, photo roll, and WhatsApp / Messenger** — not Gmail and Chrome.

### Folk Chrome extension (folkX)

**Screen detail.** Open a LinkedIn profile → folkX side-rail shows "Add to folk" if not in CRM; if already in CRM, it shows the existing record inline with last interaction. From LinkedIn Search or Sales Navigator, a "Add N people to folk" button appears at the top of result lists for bulk capture. ([folkX extension](https://chromewebstore.google.com/detail/folkx-%E2%80%93-lead-capture-find/akeepikolhaikilagiekmegfhefcbohd))

**Why it works.** CRM exists at the moment of context, not as a separate destination.

### Attio — email + calendar integration

Attio reads Gmail/Outlook on connect, auto-creates People records from senders, threads conversations under records. Calendar meeting attendees become contacts.

### Streak — Gmail-as-CRM

**Screen detail.** Streak injects pipeline columns into the Gmail inbox itself; conversations are deals. There's no separate app. ([Streak features](https://www.streak.com/features))

**Why it works for sales.** Salespeople live in inbox. Streak bet on this in 2011 and the bet has held for 14 years.

### Superhuman / Shortwave — CRM features inside the inbox

Superhuman shows three precomputed draft replies under each thread; Salesforce/HubSpot sidebar surfaces deal context. Shortwave is comparable on AI but lacks CRM integration today. ([Shortwave vs Superhuman](https://zapier.com/blog/shortwave-vs-superhuman/))

### Granola — meeting notes that auto-flow to CRM

**Screen detail.** Granola records meetings, generates enhanced notes, then offers a "Share to Attio/HubSpot" action that **proposes the matching record** based on attendees and asks the user to confirm. Folder-level rules can auto-sync without confirmation. ([Granola + Attio](https://www.granola.ai/blog/connect-granola-attio-complete-integration-guide))

**The proposal-confirm pattern is the headline.** AI suggests; human confirms. The threshold is set per folder/workflow.

### The contractor equivalent — what BKG's "everywhere" looks like

| Knowledge-worker surface | Contractor surface | BKG pattern |
|---|---|---|
| Gmail / Chrome | Native SMS + WhatsApp + iMessage | Share-sheet handler ("Send to BKG") |
| LinkedIn | Phone Contacts app | Address-book sync on permission |
| Calendar | Voice memos + Photos | EXIF + GPS → Lead inference |
| Zoom / Meet | Phone call log | Twilio-style call summaries |
| Slack | Group chat (Messenger / WhatsApp / SMS) | Forwarded photo → BKG record |

**What we steal.** A BKG iOS/Android share extension. From any photo, voice memo, SMS thread, or call log entry, "Send to BKG" creates or updates a record. The contractor never opens the BKG app to capture.

**Primitives.** Invitation Card (the share sheet IS the invitation), Whisper (one-time intro: "anything you share lands here"), Ambient Onboarding.

---

## D5. AI assist patterns — inline, summary, scoring with visible reasoning

### Superhuman AI — inline drafts

**Screen detail.** At the bottom of an open thread, three precomputed draft replies appear as horizontal cards. Tab cycles through them; Enter inserts the selected one as a Reply. R for Reply, F for Forward. The draft inserts into the compose surface and the user edits before sending. **Accepting the draft does not send it.** ([Superhuman Write with AI](https://help.superhuman.com/hc/en-us/articles/38456855116307-Write-with-AI))

**Why "accept ≠ send" matters.** The AI's confidence is allowed to be high; the user's veto is still cheap.

### Pipedrive AI Sales Assistant + Pulse

**Screen detail.** Pulse (beta) ranks leads in a leaderboard view; each lead has a score badge (0-100) and a "why" tooltip listing contributing signals (website visit, email open, deal size, last-activity recency). The Sales Assistant sidebar surfaces deal-by-deal tips ("This deal has been stalled 12 days; last touch was an outgoing email"). ([Pipedrive Sales AI](https://www.pipedrive.com/en/features/ai-sales-assistant))

**Believable vs. marketing copy.** Pipedrive's reasoning is believable when it cites specific events from the activity timeline (date + action + outcome). It becomes marketing when it says "AI predicts 73% win probability" with no traceable signals.

### HubSpot Breeze

**Screen detail.** Breeze Copilot is a chat sidebar; you can ask "summarize this contact" and it returns a paragraph with citation chips linking to source emails/notes. Lead scoring uses fit + behavior signals; the score is shown but the **per-signal contribution is partially exposed** (top 3 signals shown, rest hidden). ([HubSpot Breeze](https://www.hubspot.com/products/artificial-intelligence))

### Day.ai — auto-summarization

**Screen detail.** Each contact has an AI-generated paragraph summary at the top of the record, rebuilt after every new interaction. Day.ai's bet: the summary IS the record's first impression, not the field grid.

**What makes "visible reasoning" believable.**
- **Cited events with timestamps.** "Score went up 20 points: customer opened pricing page on May 3 at 2:14pm."
- **Negative signals shown alongside positive.** "Down 5 points: no response to last 2 follow-ups."
- **A "challenge this score" affordance.** User can mark a signal as wrong and the model learns.
- **Plain-language thresholds.** Not "73% confidence" — "ready to call now," "let it cool a week," "send a fresh message."

**Primitives this maps to.** Whisper (the AI introduces its reasoning the first time it scores), Ask Anything ("why is this score 73?"), Pro Toggle (raw score for pro, plain-language verdict for human), Emotional Sequencing Default (a hot lead screen feels different from a cold-lead screen — color, motion, copy).

---

## D6. Voice-CRM patterns — data structured without data entry

### Granola

**Screen detail.** During a meeting, Granola records the call and the user takes sparse manual notes. Post-meeting, it produces "enhanced notes" — the user's notes restructured against the transcript, with action items extracted. Sharing to Attio shows a proposed match (the record the AI thinks this meeting belongs to); the user clicks "Share" to confirm or picks a different record. **Confirmation, not assumption, at the CRM boundary.** ([Granola + HubSpot](https://www.granola.ai/blog/granola-hubspot-integration-crm-updates))

### Otter.ai

**Screen detail.** Otter offers Automated Summary, Action Items (auto-assigned to participants), and CRM logging to Salesforce/HubSpot/Microsoft Dynamics. Sales Agent automatically pushes call notes; Action Items has a dedicated "My Action Items" view. ([Otter Action Items](https://help.otter.ai/hc/en-us/articles/25983095114519-Action-Items-Overview))

**Threshold question.** Otter pushes by default; Granola confirms by default. Otter is closer to "no confirmation"; Granola is closer to "always confirm." Both work in their respective contexts.

### Truely.io, Krisp Notetaker, Read.ai

Read.ai joins Zoom/Teams/Meet/in-person, delivers a recap, syncs to Salesforce/HubSpot with action items pushed to Asana including assignee and due date. ([Read.ai integrations](https://www.read.ai/integrations))

Krisp Notetaker focuses on transcription + summary without CRM-native push.

### Whisper-powered apps for trade contractors

Contractor+ Voice provides transcription, summaries, call logging, and searchable transcripts linked to jobs and contacts. Allô auto-records calls, generates summaries, updates CRM, sends SMS. ([Contractor+ field communication](https://contractorplus.app/field-communication-software))

These exist but are early; most contractors still don't use them.

### The threshold question — confirm or just infer?

**Inferred without confirmation works when:**
- The cost of being wrong is low (a tag, a note, a stage hint)
- The user can edit easily after the fact (Time Machine)
- The inference is shown ambient (a chip, not a modal)

**Confirmation required when:**
- The action commits money (creating an invoice)
- The action sends communication (auto-sending a customer SMS)
- The inference creates an irreversible record (merging two contacts)

**BKG rule.** Default to inferred + ambient + reversible. Require confirmation only for money and outbound communication. This IS the Time Machine primitive made operational.

**Primitives.** Time Machine (always reversible), Whisper (AI's first inference is introduced once), Voice Is Equal (every voice memo is a first-class capture path).

---

## D7. Plain-language label patterns

### Glide — teaching "table" to a small-business user

Glide calls the data source "your sheet" — never "table" or "database." A column is a "field" but always shown with an example value. The data editor mirrors a spreadsheet because that's the mental model the user arrived with. ([Glide overview](https://www.glideapps.com/))

### Softr

Similar to Glide: "your data" + "columns" with example values. Templates ship with realistic data so the user sees what the app does before configuring anything.

### Cash App

Cash App's investing flow uses words like "buying," "selling," "your money" — not "execute order," "settlement," "buying power." It avoids tax-advantaged accounts entirely because they introduce concept debt the target user doesn't have. ([Cash App Investing review](https://www.nerdwallet.com/investing/reviews/cash-app-investing))

### Public.com — investing for first-time investors

Public's "Stock Slices" framing — "a stock slice is a piece of a share, so you can buy in with as little as $1" — is the gold standard of consumer-finance plain-language. Concept introduced inline at point of need, with a concrete dollar example. ([Public.com fractional shares](https://public.com/learn/fractional-investing))

### Square for small business

Square's vocabulary: "Item" (not SKU), "Customer" (not contact record), "Sale" (not transaction), "Today's takings" (not revenue). The Items list is the first surface; configuration is later. ([Square POS](https://squareup.com/us/en/point-of-sale))

### Patterns that translate to BKG

| Expert word | BKG word |
|---|---|
| Contact, Lead, Opportunity, Account | "Who's asking" / "Customer" / "Job" |
| Pipeline stage | "Where we are with this one" / stage name in plain English |
| Activity log | "What's happened" |
| Custom field | "Something to track" |
| Required field | (no such thing — only "ask later if helpful") |
| Score / Probability | "Ready now" / "Cool off" / "Lost touch" |
| Workflow / Automation | "If this, then that" with a concrete example |
| Integration | "Hooked up to" |
| Object / Entity | (never shown) |

**Primitives.** Plain Language First, Pro Toggle (pro mode reveals industry terms for power users), Whisper (each plain term has a one-time micro-intro explaining what it does).

---

## D8. The reject list (NAME NAMES)

| # | Hostile pattern | Product that exemplifies it | BKG goal violated | BKG-compliant alternative |
|---|---|---|---|---|
| 1 | Industry picklist with 200+ options | Salesforce standard Account.Industry field | Plain Language First, Most-Constrained User First | AI-inferred industry from website + free-text override |
| 2 | Six-tab contact record with 30+ fields above the fold | Salesforce Lightning Contact page | Reusable Primitives (no primitive should require tabs) | Single-column artifact-led record; details collapsed below activity |
| 3 | Mandatory required fields blocking save (red asterisks) | Salesforce, HubSpot Contact create form | Invitation Not Instruction, Time Machine | All fields skippable; draft state is the default save |
| 4 | Modal welcome tour with "Step 1 of 7: Click here to continue" | Pipedrive onboarding, HubSpot, classic Salesforce | Ambient Onboarding, Emotional Sequencing Default | Populated-not-empty first run + ambient Whispers on first contact |
| 5 | "Did you know?" badge that pulses until clicked | HubSpot product education badges, Notion's in-app tips | Invitation Not Instruction | Whisper appears once, dismisses silently, never returns |
| 6 | Empty state with no demonstration ("No contacts yet. Add one!") | Pipedrive empty pipeline, Folk on first login (pre-folkX) | Ambient Onboarding | Pre-populated demo data labeled "this is a sample; tap to replace" |
| 7 | Pricing hidden behind "Contact sales" | Salesforce Enterprise, most upmarket CRMs | Plain Language First, Invitation Not Instruction | Public pricing, contractor-clear tiers, no email-gate |
| 8 | Onboarding wizard with 7+ steps | HubSpot first-run, Microsoft Dynamics setup | Ambient Onboarding | Single Invitation Card with one question; everything else inferred |
| 9 | Settings buried 3+ levels deep | Salesforce Object Manager → Page Layouts → Field-level security | Reusable Primitives, Machine-Legible Everything | All settings reachable from Cmd-K palette + flat URL routes |
| 10 | "Click here to continue" / "Required fields marked with *" copy | Most enterprise SaaS, Salesforce Classic | Plain Language First | "Tap when ready" / no asterisks because no required fields |
| 11 | Modal that takes over the screen for a non-blocking notification | Salesforce trust banner, HubSpot trial-status modal | Invitation Not Instruction | Inline ambient banner, dismissible, never modal |
| 12 | Form field with 12+ visible labels and no example values | Salesforce contact create, JobNimbus add-lead | Plain Language First, Most-Constrained User First | Each field has a placeholder example; one field visible at a time on mobile |
| 13 | "Stage" or "Status" dropdown gated on first capture | JobNimbus lead form (status required), Salesforce Opportunity | Invitation Not Instruction | Stage defaults to first stage; editable later from Time Machine |
| 14 | "Owner" / "Assigned to" required on create | Salesforce, HubSpot, Pipedrive | Most-Constrained User First | Owner inferred from creator; reassign later |
| 15 | Tooltip-as-only-help (hover to learn, no permanent hint) | Most enterprise CRMs | Voice Is Equal (no hover on touch), Ask Anything | Tap to expand inline explanation, persistent until dismissed |
| 16 | Required form to start a free trial (company size, role, phone) | Salesforce, HubSpot trial flows | Invitation Not Instruction | Email + first action; everything else inferred |
| 17 | "Custom Object" / "Custom Field" naming | Salesforce, Airtable, Notion | Plain Language First | "Something to track" / "Add a thing about this customer" |
| 18 | Bulk-import CSV as the only way to load data | Salesforce Data Loader, Pipedrive import | Most-Constrained User First (contractors don't have CSVs) | Connect phone contacts + photo roll + call log = data |
| 19 | Tabbed sub-navigation inside a tab (nested tabs) | Salesforce Lightning record pages with nested tabs | Reusable Primitives (zero tabs in BKG) | Single column with collapsible sections, scrollable |
| 20 | Hard-coded process gates ("Cannot move to Won until X required") | Salesforce validation rules, Microsoft Dynamics workflows | Time Machine, Invitation Not Instruction | Soft warnings as ambient banners; never block |
| 21 | "Help" as a link to a knowledge base that opens in a new tab | Most B2B SaaS | Ask Anything | Cmd-K + plain-language inline help on the screen you're on |
| 22 | Two-factor reauth every session for non-sensitive views | Salesforce session timeouts (default 2h) | Most-Constrained User First (contractor on roof with bad cell) | Long-lived sessions for read; reauth only for money/communication |
| 23 | Skeuomorphic "Save" floppy-disk icon | Older Salesforce, some HubSpot views | Plain Language First | Autosave; "Saved" status text |
| 24 | Drag-to-resize columns that reset on refresh | Airtable, Notion table views | Reusable Primitives | Persistent layout per user, machine-legible |
| 25 | "Are you sure?" confirmation modal for reversible actions | Most CRMs, classic Salesforce | Time Machine | Toast with "Undo" instead of modal blocking |

(25 entries; goal was 15–25.)

---

## D9. Pattern → primitive mapping table (the headline deliverable)

| # | Pattern (specific) | Source product | BKG primitive | How we'd implement it in BKG | Constitution extension needed? |
|---|---|---|---|---|---|
| 1 | Cmd-K command palette with verb-first grammar | Linear, Attio | Ask Anything | Single keystroke (desktop) + hold-to-talk (mobile) opens palette; first prompt: "What do you want to do?" | No |
| 2 | Three precomputed draft replies under each thread | Superhuman | Invitation Card | For each customer message: BKG shows 3 voice/text reply options, contractor picks one or speaks own | No |
| 3 | Accept ≠ Send (draft inserts into compose, not outbox) | Superhuman | Time Machine | Every AI-generated outgoing communication has a 30s undo before send | No |
| 4 | Zero-entry first run (ingest inbox/SMS/calls on connect) | Day.ai | Ambient Onboarding | On install: read phone contacts, call log, photo roll EXIF; surface 20 candidate customers | No |
| 5 | "Magic Field" — natural-language AI-populated attribute | Folk | Pro Toggle | Add field = type a sentence; system creates AI-inferred attribute; user can hard-set per row | No |
| 6 | GPS-suggested project on photo capture | CompanyCam | Invitation Card | Tap camera → photo taken → BKG suggests nearest job; confirm or "new job here" | No |
| 7 | Photo IS the lead (artifact-led record creation) | CompanyCam | Progressive Reveal | Record starts with the photo; fields appear only as needed | No |
| 8 | Kanban-by-default with shipped pipeline | Roofr | Reusable Primitives | BKG ships the seven-stage Killer App pipeline; customizable later | No |
| 9 | Role-aware field hiding (sub vs. admin) | Procore mobile RFI | Pro Toggle | Field user sees 3 fields; office user sees full grid; same backing record | No |
| 10 | Single-column record (artifacts above attributes) | Folk contact view | Reusable Primitives | Record = timeline of artifacts top, collapsible details bottom; no tabs ever | No |
| 11 | "+" inline column creation with icon-led type picker | Notion, Airtable | Pro Toggle | Add field hidden behind Pro mode; basic users only get "track something new" plain-language flow | No |
| 12 | Object vs. List attribute distinction | Attio | Pro Toggle | Hidden by default; in Pro mode, "applies to all" vs. "applies to this pipeline" toggle | No |
| 13 | Pre-populated demo data labeled "this is a sample" | (gap — no product does this well) | Ambient Onboarding | First run includes 2 sample customers from "Mike's Roofing"; tap to replace with your own | No |
| 14 | Visible reasoning with cited events ("opened pricing page May 3") | Pipedrive Pulse | Whisper + Ask Anything | Every score has expandable "why" listing events with dates and actions | No |
| 15 | "Challenge this score" affordance (mark signal wrong) | (gap — no product) | Time Machine | Long-press on any AI inference → "Not right" → record correction; model learns | Possibly — a new primitive **"Correction Loop"** for AI-human disagreement |
| 16 | Plain-language score labels ("call now," "let it cool") | (gap — most use percentages) | Plain Language First | All scores render in plain language by default; Pro mode shows numeric | No |
| 17 | Proposal-confirm at CRM boundary (Granola → Attio) | Granola | Time Machine + Invitation Card | Voice memo / SMS / photo proposes a target record; user confirms or redirects | No |
| 18 | Folder-level auto-sync rules (no per-item confirm) | Granola | Pro Toggle | Pro mode: set "any photo at this address auto-attaches to this job" | No |
| 19 | Share-sheet handler ("Send to BKG" from any app) | (gap — no CRM does this well for contractors) | Invitation Card | iOS/Android share extension accepts photo, voice memo, SMS thread | No |
| 20 | LinkedIn-side-rail "Add to CRM" | folkX | Invitation Card | Phone contact long-press → "Add to BKG"; visible if already in BKG | No |
| 21 | Auto-thread sender into a contact | Attio, Streak | Ambient Onboarding | Email/SMS from unknown number proposes "Add as customer?" inline | No |
| 22 | AI-generated paragraph summary at top of record | Day.ai | Whisper | Each customer record opens with a regenerated plain-English summary | No |
| 23 | Auto-extracted action items assigned to participants | Otter, Read.ai | Time Machine | After every voice memo: BKG proposes 0-3 tasks with owners; all skippable | No |
| 24 | "Stage" inferred from artifact type (estimate sent = Lock stage) | (gap — most CRMs ask) | Progressive Reveal | Sending an estimate moves stage automatically; visible ambient | No |
| 25 | Default pipeline shipped, modifiable later | Roofr | Reusable Primitives | Seven-stage pipeline is the constitution; settings let pros rename stages | No |
| 26 | Items / Customer / Sale vocabulary (no SKU/contact/transaction) | Square | Plain Language First | BKG vocab table enforced across UI; agents translate to plain language in MCP output | No |
| 27 | "Stock Slice" / "Buying Power" plain-language inline explanations | Public.com | Whisper | Each unfamiliar concept has a one-time inline mini-intro at point of need | No |
| 28 | "Your sheet" / "your data" framing (not "table") | Glide | Plain Language First | "Your customers" / "your jobs" — never "records" / "objects" | No |
| 29 | Drag-to-resize Kanban columns as primary nav | Roofr, Pipedrive | Reusable Primitives | Kanban is one of three default views; agents read the same data via API | No |
| 30 | Activity timeline as record's first surface | Folk, Attio | Reusable Primitives | Records open to timeline; fields are below | No |
| 31 | Email auto-logging to contact record | Streak, Attio | Ambient Onboarding | Phone call log auto-logs to customer record | No |
| 32 | Bulk add from search results ("Add 10 people") | folkX | Pro Toggle | Long-press multi-select on phone contacts → bulk import | No |
| 33 | "AI attribute" as a first-class type in the field picker | Attio | Pro Toggle | Magic Field is the default when adding a new thing to track | No |
| 34 | Inline editable record with no "edit" mode | Notion, Attio | Time Machine | Every field is editable in place; no edit/save toggle; autosave + undo | No |
| 35 | Single-letter shortcuts for common actions (C = create) | Linear | Pro Toggle | Pro mode unlocks single-key shortcuts; basic mode uses palette only | No |
| 36 | Fuzzy match in palette (type partial, get candidates) | Linear, Attio | Ask Anything | Palette accepts typos, voice, plain language equally | No |
| 37 | Ambient banner instead of modal for non-blocking info | Linear toast pattern | Invitation Not Instruction | Toasts at bottom, dismissible, never modal | No |
| 38 | Undo toast with action button | Gmail, Linear | Time Machine | Every destructive action followed by a 10s "Undo" toast | No |
| 39 | "Send to BKG" via WhatsApp number (forward photo to a bot) | (gap — Twilio-class feature) | Invitation Card | WhatsApp/SMS bot accepts forwarded media; replies with "saved to [customer name]" | Possibly — a new primitive **"Phone-Number-as-Inbox"** for non-app capture |
| 40 | Call-log scraping (with permission) for customer detection | (gap — no CRM does this cleanly on phone) | Ambient Onboarding | iOS CallKit / Android CallScreening API auto-proposes unknown callers as new customers | No |
| 41 | EXIF + GPS-based auto-tagging of photos to customers | CompanyCam | Ambient Onboarding | Photo roll watched (with permission); GPS-matched to customer addresses | No |
| 42 | Voice memo → structured note → record update | Granola for meetings; contractor equivalent for memos | Voice Is Equal | Voice memo dropped into share sheet → transcript → proposed record update | No |
| 43 | "What would happen if..." sandbox before commit | (gap — most CRMs commit immediately) | Time Machine | Drafts tray: every change has a "preview" state before applying | Possibly — extends Time Machine into a richer **"Draft Mode"** primitive |
| 44 | One-tap "I'm at the job site" check-in | CompanyCam, JobNimbus | Invitation Card | Single button on home; uses GPS to mark "on site at [customer]"; logs timestamp | No |
| 45 | Sidebar deal context in inbox | Superhuman + Salesforce | Pro Toggle | Pro mode: SMS thread shows BKG customer context as side panel | No |

(45 rows; goal was 40+.)

---

## D10. The 3 must-steal moves and the 3 must-reject moves

### Must steal (if we don't ship these, BKG feels dated)

1. **Day.ai's zero-entry first run** — on install/connect, BKG reads phone contacts, call log, photo-roll EXIF/GPS, and surfaces 20 candidate customers ranked by recency × frequency. First screen is populated, not empty. **Source:** Day.ai. **Primitive:** Invitation Card + Ambient Onboarding. ([Day.ai setup](https://www.day.ai/resources/day-ai-setup-guide))

2. **CompanyCam's tap-camera-photo-IS-the-lead inversion** — primary FAB is the camera; GPS suggests project; photo creates or attaches to the record; name and stage come later, optionally, voice-spoken. **Source:** CompanyCam. **Primitive:** Invitation Card + Progressive Reveal. ([CompanyCam mobile flow](https://help.companycam.com/en/articles/12383831-take-photos-in-the-mobile-app))

3. **Linear/Attio's Cmd-K verb-first palette with voice equivalence** — one affordance (Cmd-K on desktop, hold-to-talk on mobile), same verb grammar, same JSON exposed to MCP agents. The palette is the spine of every primitive: every Invitation Card, every Time Machine action, every Ask Anything query lives here. **Source:** Linear + Attio. **Primitive:** Ask Anything. ([Linear shortcuts](https://keycombiner.com/collections/linear/) · [Attio quick actions](https://attio.com/help/reference/productivity-collaborating/navigating-your-workspace))

### Must reject (if we ship these, BKG feels like Salesforce-with-paint)

1. **Salesforce Lightning's tabbed, 30+-field record page** — six tabs (Details, Related, News, Files, Activity, Chatter), all loaded above the fold, with mandatory red-asterisk fields gating save. **Product:** Salesforce. **Goal violated:** Plain Language First, Most-Constrained User First, Reusable Primitives (tabs are not a BKG primitive).

2. **Modal welcome tour with "Step 1 of 7: Click here to continue"** — every B2B SaaS post-2015. **Product:** Pipedrive, HubSpot, Salesforce, Folk. **Goal violated:** Ambient Onboarding, Emotional Sequencing Default (a contractor's emotional state on first run is "show me this is worth my time, not lecture me"), Invitation Not Instruction.

3. **Mandatory "Stage" and "Owner" dropdowns on first capture** — JobNimbus add-lead form requires status, type, source, and assignee before save. **Product:** JobNimbus mobile, Salesforce, Pipedrive. **Goal violated:** Invitation Not Instruction, Time Machine (cannot skip-and-return), Most-Constrained User First (contractor doesn't know stage at moment of capture; that's the AI's job to infer or defer).

---

## "No primitive fit" gaps — proposed constitution extensions

While building D9, three patterns emerged that don't map cleanly to the seven primitives. Each is a candidate for a new primitive or an extension:

### Proposed 8th primitive: **Correction Loop**
**What it would do.** Every AI inference (a score, a stage change, a customer match, a tag) has a long-press gesture (or voice command "wrong") that records the correction and feeds it back to the model. The user never sees a "training" interface — they just say "no, that's not Mike Smith, that's Mike Jones" and the model learns. This is structurally different from Time Machine (undo) because the user isn't reverting a state — they're teaching the system. ([Inspired by Pipedrive's missing "challenge this score" affordance.])

### Proposed 9th primitive: **Phone-Number-as-Inbox**
**What it would do.** BKG has a dedicated phone number (Twilio-class) that accepts forwarded SMS, MMS photos, voice memos, and WhatsApp media. Anything sent there is routed to a customer record using AI inference + GPS + sender ID. The user never opens the BKG app — they forward from native messaging. This is "everywhere" CRM for contractors, parallel to Streak's "Gmail-as-CRM" for knowledge workers. ([Inspired by the absence of this pattern in any current CRM.])

### Proposed extension to Time Machine: **Draft Mode / Sandbox**
**What it would do.** Time Machine today is undo + stateful breadcrumbs + drafts tray + skip-and-return. Extension: every action has a "preview" state — "if I move this customer to Lock stage, what happens?" — visible before commit. This is the sandbox no CRM ships and the one a contractor most needs when learning. ([Inspired by enterprise software's complete absence of this pattern.])

---

## Sources

- [Attio — Create and manage attributes](https://attio.com/help/reference/managing-your-data/attributes/create-manage-attributes)
- [Attio — Navigating your workspace (Cmd-K)](https://attio.com/help/reference/productivity-collaborating/navigating-your-workspace)
- [Attio — Custom objects guide](https://attio.com/help/reference/managing-your-data/objects/create-and-manage-custom-objects)
- [Notion — Database properties](https://www.notion.com/help/database-properties)
- [Notion — Intro to databases](https://www.notion.com/help/intro-to-databases)
- [Airtable — Supported field types overview](https://support.airtable.com/docs/supported-field-types-in-airtable-overview)
- [Folk CRM — review and Magic Fields](https://hackceleration.com/folk-crm-review/)
- [folkX — Chrome extension](https://chromewebstore.google.com/detail/folkx-%E2%80%93-lead-capture-find/akeepikolhaikilagiekmegfhefcbohd)
- [Folk — capture contacts from socials](https://help.folk.app/en/articles/5587856-capture-contacts-from-socials-with-folkx)
- [Linear — keyboard shortcuts](https://keycombiner.com/collections/linear/)
- [Maggie Appleton — Command Bars](https://maggieappleton.com/command-bar)
- [Superhuman — How to build a remarkable command palette](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- [Day.ai — setup guide](https://www.day.ai/resources/day-ai-setup-guide)
- [Day.ai / Sequoia — Christopher O'Donnell interview](https://sequoiacap.com/podcast/training-data-christopher-odonnell/)
- [CompanyCam — Take photos in the mobile app](https://help.companycam.com/en/articles/12383831-take-photos-in-the-mobile-app)
- [CompanyCam — Job site photo app](https://companycam.com/job-site-photo-app)
- [JobNimbus — Mobile app overview](https://www.jobnimbus.com/blog/jobnimbus-app-for-iphone-and-android/)
- [JobNimbus — Lead tracking app](https://www.jobnimbus.com/blog/lead-tracking-jobnimbus-app)
- [Roofr — CRM](https://roofr.com/crm)
- [Procore — RFI construction management](https://www.procore.com/project-management/rfis)
- [Procore — Create an RFI tutorial](https://en-ca.support.procore.com/products/online/user-guide/project-level/rfi/tutorials/create-an-rfi)
- [Streak — Gmail CRM features](https://www.streak.com/features)
- [Superhuman — Write with AI](https://help.superhuman.com/hc/en-us/articles/38456855116307-Write-with-AI)
- [Superhuman — Instant Reply](https://help.superhuman.com/hc/en-us/articles/38458397554963-Instant-Reply)
- [Shortwave vs Superhuman — Zapier](https://zapier.com/blog/shortwave-vs-superhuman/)
- [Pipedrive — Sales AI Assistant](https://www.pipedrive.com/en/features/ai-sales-assistant)
- [Pipedrive — Pulse beta](https://metawork.studio/post/pipedrive-pulse-a-real-time-window-into-sales/)
- [HubSpot — Breeze AI tools](https://www.hubspot.com/products/artificial-intelligence)
- [HubSpot Breeze guide — Hublead](https://www.hublead.io/blog/hubspot-breeze-ai)
- [Granola — HubSpot integration](https://www.granola.ai/blog/granola-hubspot-integration-crm-updates)
- [Granola — Attio integration](https://www.granola.ai/blog/connect-granola-attio-complete-integration-guide)
- [Otter.ai — Action Items overview](https://help.otter.ai/hc/en-us/articles/25983095114519-Action-Items-Overview)
- [Otter.ai — Meeting Summary overview](https://help.otter.ai/hc/en-us/articles/9156381229079-Meeting-Summary-Overview)
- [Read.ai — Integrations](https://www.read.ai/integrations)
- [Contractor+ — Field communication](https://contractorplus.app/field-communication-software)
- [Glide — No-code app builder](https://www.glideapps.com/)
- [Cash App Investing review — NerdWallet](https://www.nerdwallet.com/investing/reviews/cash-app-investing)
- [Public.com — Fractional shares explanation](https://public.com/learn/fractional-investing)
- [Square — POS systems](https://squareup.com/us/en/point-of-sale)
- [Salesforce — Picklist values guide](https://help.salesforce.com/s/articleView?id=000392241&language=en_US&type=1)
- [Salesforce Ben — Page Layouts guide](https://www.salesforceben.com/salesforce-page-layouts/)
