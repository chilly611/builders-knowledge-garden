# GC John's Dogfood Test Plan — Project Spine v1

**Persona Snapshot**

I'm John Mendoza, 52, San Diego GC. Running 8 crew on ADUs and kitchen remodels, $2M annual. I live in email and Excel — not fancy, but it works. A year ago I lost a 30k deposit to a bogus dispute because I didn't have the paperwork to back me up. I'm not anti-tech, but I don't have time for apps that slow me down. If BKG saves me from losing another deposit and makes my crew's life simpler, I'm in.

---

## What John Cares About (Priority Order)

1. **Getting paid on time** — Draws, final, retainage. Money in, money out. No surprises.
2. **Not losing deposits to disputes** — Photos, daily logs, signed contracts that hold up in court. Paper trail that backs me up.
3. **Staying out of court** — Clear scope, change orders that are signed, subs with insurance docs on file.
4. **Fast estimates that don't bite me** — Ballpark a job in 15 minutes, lock in a number that doesn't tank the margin.
5. **Crew stays happy and safe** — Schedules that work, safety talks logged, tools available day one.
6. **Materials and subs show up** — Lead times, availability, not scrambling on day three.

---

## Test Cases

### JOHN-TC-1: Load a project and see it stick across navigation
**Priority:** CRITICAL  
**Category:** spine  
**What it tests:** Project UUID persists in URL (?project=...) and autosave works so I don't lose work.

**Steps:**
1. Land on /killerapp landing page.
2. Start "Quick Estimate" (q2) workflow.
3. Enter job description: "Kitchen remodel, 320 sqft, removing wall between kitchen and dining, granite island, new appliances."
4. Save (or let autosave fire).
5. Navigate away — click on another workflow (e.g., "Contract Templates" q4).
6. Return to "Quick Estimate" via browser back button or by clicking q2 again.

**Expected Outcome:**  
- Project UUID visible in URL when I'm working.
- All my kitchen remodel data still there — description, location, trade selections.
- No "unsaved changes" warning. Autosave happens silently in the background.
- I can jump between workflows on the same project without losing context.

**Failure Modes John Would Notice:**
- Data wipes when I navigate away.
- URL doesn't have a project ID — feels flaky, like the app might forget me.
- "Save" button required before I leave — slows me down.
- Autosave indicator confusing or hard to see.

---

### JOHN-TC-2: AI estimate pulls a realistic cost number
**Priority:** CRITICAL  
**Category:** budgeting  
**What it tests:** AI estimating gate works; output is believable for a kitchen remodel.

**Steps:**
1. Start "Quick Estimate" (q2).
2. Describe: "Kitchen remodel, 320 sqft, San Diego, CA. Removing wall, adding granite island, new appliances, flooring."
3. Select location (San Diego).
4. Enter 320 sqft.
5. Pick trades: Framing, Electrical, Plumbing, Painting, Flooring.
6. (Optional) Upload a floor plan PDF or photos.
7. Tap "Specialist pulls the estimate."

**Expected Outcome:**
- AI generates an itemized takeoff in under 5 seconds.
- Itemization shows: demo, framing tweaks, electrical, plumbing rough, cabinetry, flooring, paint, GC overhead.
- Total estimate is in the ballpark — e.g., $45k–$55k for this scope (John knows his markets).
- Breakdown shows assumptions: "Existing HVAC stays, no PE needed, owner-grade appliances."
- Confidence flag visible: "medium" for quick estimates is fine; "low" would make John skeptical.

**Failure Modes John Would Notice:**
- Estimate way off (e.g., $120k for a kitchen — red flag, AI is hallucinating).
- No itemization — just a lump sum; John can't pressure-test it or mark it up correctly.
- Missing key categories (e.g., no line for permits, no contingency).
- No assumptions shown — John won't trust a number he can't understand.
- Takes >10 seconds to generate; feels slow.

---

### JOHN-TC-3: Contract Templates load and fill-in works smoothly
**Priority:** CRITICAL  
**Category:** contracts  
**What it tests:** Template picker finds all 6 templates; blanks fill correctly with project context.

**Steps:**
1. Enter "Lock down the paperwork" (q4) workflow.
2. Tap "Pick the forms you need" step.
3. See 6 template cards: Client Agreement, Sub Agreement, Lien Waiver (Conditional), Lien Waiver (Unconditional), NDA, Change Order.
4. Pick "Client Agreement."
5. Next step shows text fields: Owner name, address, start date, payment terms.
6. Fill in: "Dave Samson, 123 Main St, Boulder CO, Start May 15, Net 30."
7. Continue to "Payment terms" — select "Net 30."
8. Reach "Check the whole thing" — see full contract preview.

**Expected Outcome:**
- All 6 templates appear and are clickable.
- Form fields are pre-labeled clearly (not confusing).
- My inputs flow into the template body — "Owner: Dave Samson" appears where it should.
- Full contract preview is readable and looks professional (not raw HTML).
- Can export or email the contract from here.

**Failure Modes John Would Notice:**
- Template chooser missing forms (John expects all 6; missing even one = incomplete).
- Fields are vague ("Enter details") — John gets confused about what to put where.
- Contract preview is garbled or has typos.
- Can't export the filled contract (emails it to myself? downloads it? unclear).
- Template language is too fancy or includes California-specific clauses when I need Arizona.

---

### JOHN-TC-4: Code Compliance lookup for ADU with local AHJ amendments
**Priority:** CRITICAL  
**Category:** codes  
**What it tests:** AI compliance specialist references San Diego code + local tweaks; inspection sequence is correct.

**Steps:**
1. Enter "Check the codes" (q5) workflow.
2. Enter location: "San Diego, CA" + "ADU, new construction, attached."
3. Tap "Routed Code Check" analysis.
4. See cascade: Structural (IBC/IRC) → Electrical (NEC) → Plumbing (IPC) → Fire (IFC/NFPA).
5. Tap each and read the analysis.
6. Note local tweaks section ("San Diego requires X, city adds Y to timeline").
7. See inspection sequence: Foundation → Framing → MEP rough → MEP trim → Drywall → Final.

**Expected Outcome:**
- Structural analysis mentions IRC 2022 (or current adoption) + San Diego amendments (e.g., higher wind load).
- Electrical analysis cites NEC + any SDG&E-specific requirements.
- Plumbing cites IPC + City of San Diego amendments.
- Fire/egress is correct for an ADU (not missing 2-hour separation if attached).
- Local tweaks are real (e.g., "San Diego requires HVAC on separate panel").
- Inspection sequence is logical: foundation before framing, MEP rough before drywall.

**Failure Modes John Would Notice:**
- Codes are generic (no San Diego amendments) — red flag, John would consult his attorney to be sure.
- Wrong code edition (e.g., cites 2015 IRC when San Diego adopted 2022).
- Inspection sequence is illogical or skips a required inspection.
- Missing fire/egress rules for attached ADU — John would get dinged at permit review.
- Analysis is vague ("See your local AHJ") — doesn't help; John wanted answers.

---

### JOHN-TC-5: Photo-backed daily log with AI tagging
**Priority:** IMPORTANT  
**Category:** photo-evidence  
**What it tests:** Daily log captures voice or text + photos; AI categorizes; builds evidence trail for disputes.

**Steps:**
1. Enter "Daily logbook" (q15) workflow.
2. Tap "What happened today?" voice input.
3. Record (or type): "Framing on west wall done. Electrical rough-in starting tomorrow. Found water stain in south corner — needs investigation."
4. Tap "What categories apply?" — select Progress, Issues.
5. Upload 3 job-site photos (framing stage, water stain closeup).
6. Let AI categorize the log entry.

**Expected Outcome:**
- Voice input works (transcribes to text).
- Photo attachments are linked to the day's log entry.
- AI tags the entry: "progress: framing complete," "issue: water stain flagged for follow-up."
- Log entry is searchable and exportable (John might need to show it in court).
- Photos are dated and timestamped.
- AI suggests follow-up: "Water stain needs investigation before electrical covers it."

**Failure Modes John Would Notice:**
- Voice doesn't transcribe correctly (garbage input).
- Photos upload but aren't linked to the day — they're floating; John can't prove when they were taken.
- AI tagging is wrong or missing (John gets tagged manually, defeats the purpose).
- Can't export the log as a PDF with photos — defeats the dispute-prevention purpose.
- Photos are compressed or low-quality (not useful as evidence).

---

### JOHN-TC-6: Change order flow — cost + schedule impact, then sign-off
**Priority:** CRITICAL  
**Category:** contracts  
**What it tests:** CO generation is fast and shows cost/schedule delta before client signs.

**Steps:**
1. Mid-project: Enter "Manage scope changes" (q20) workflow.
2. Tap "What's the change?" — voice or text: "Client wants to add third bathroom and upgrade flooring to 4×4 tile."
3. Let AI calculate cost impact: "Materials $5,200, Labor $2,100, Contingency 10%, Total CO: $8,030."
4. AI checks schedule impact: "Additional 4 days during MEP phase, but still finishes on time."
5. Tap "Specialist drafts the CO" — see formal CO#001.
6. CO shows: Original contract $52k, this CO +$8,030, new total $60,030.
7. Export/email CO to client for signature.

**Expected Outcome:**
- CO is generated in <2 minutes (John's impatient).
- Cost breakdown is itemized and believable (not just a lump sum).
- Schedule impact is clear: "No delay to completion" or "Adds 3 days, moves finish from June 15 to June 18."
- CO looks professional and has all required fields: Project info, change description, cost, schedule, approval lines.
- Can email CO to client or print + sign.

**Failure Modes John Would Notice:**
- AI cost estimate is off by 20%+ (John doesn't trust it; doesn't sign).
- Schedule impact is missing or vague ("will delay project" — by how much?).
- CO document is ugly or hard to read (unprofessional, client gets nervous).
- Can't email CO — John has to print and hand-deliver or copy-paste into email.
- CO doesn't carry forward to final invoice (John's stuck reconciling manually later).

---

### JOHN-TC-7: Payment draw request — auto-fills, sends to lender, tracks status
**Priority:** CRITICAL  
**Category:** budgeting  
**What it tests:** Draw logic calculates % complete correctly; lender gets the form; John tracks approval.

**Steps:**
1. Enter "Request payment draws" (q21) workflow.
2. Project is 62% complete (Demo 100%, Framing 100%, MEP rough 85%).
3. Tap "Figure out % complete" — AI analysis shows: "Eligible for Draw #3: $18,900."
4. Tap "Auto-fill the draw form" — G702-style form is pre-populated.
5. Set holdback to 10%.
6. Tap "Send to the lender" — form goes to lender email.
7. Check "Follow up" — app reminds John in 5 days if no response.

**Expected Outcome:**
- % complete calculation is accurate (John knows the job; if AI says 62%, it's believable).
- Draw amount is correct: (total contract × % complete) - holdback.
- Form is G702 or equivalent (lender recognizes it, doesn't bounce back asking for re-submit).
- Email to lender has a tracking link so John can see status.
- Reminder goes off on day 5 if draw isn't approved.

**Failure Modes John Would Notice:**
- % complete is way off (says 50% when it's clearly 65% — John has to override and retype).
- Draw amount is wrong or doesn't subtract holdback correctly.
- Form is non-standard (lender rejects it, John has to re-do in their system anyway).
- No way to track status — John follows up manually via phone every day (defeats the point).
- Reminder never comes (John forgets to follow up, gets paid 2 weeks late).

---

### JOHN-TC-8: Lien waiver collector — tracks conditional + final, flags missing
**Priority:** IMPORTANT  
**Category:** contracts  
**What it tests:** App tracks who needs to waive, sends forms, collects signed copies, flags missing ones before closeout.

**Steps:**
1. Enter "Collect lien waivers" (q22) workflow.
2. List subs: "Main Electric, Premier Plumbing, Anderson Lumber, Concrete Pros."
3. App auto-generates: 4 parties × ~3 waivers each = 12 expected waivers.
4. App generates & emails conditional waivers to each sub with draw #3.
5. John uploads signed conditional waivers as they come back.
6. Before final payment, app sends final unconditional waivers to all parties.
7. App shows checklist: "3 of 4 final waivers received — waiting on Premier Plumbing."

**Expected Outcome:**
- All subs are listed and tracked individually.
- Conditional waivers are sent automatically with each draw.
- John receives email when a sub returns a signed waiver.
- App flags missing waivers before closeout: "Can't mark job closed — 1 waiver missing."
- Final waivers are sent automatically.

**Failure Modes John Would Notice:**
- Manual list entry required for each sub (John has to type in all 4).
- Waivers aren't sent automatically; John has to hunt down email addresses and send them himself.
- No tracking of received waivers — John has to check email and mark them done manually.
- App doesn't prevent closure if waivers are missing (John closes and forgets, gets sued later).
- Waivers are generic California forms (not California statutory forms, lawyer says they're weak).

---

### JOHN-TC-9: Mobile crew access — view schedule, log daily progress, see safety talk
**Priority:** IMPORTANT  
**Category:** mobile  
**What it tests:** Crew can view their schedule on phone, submit daily progress, see safety reminders.

**Steps:**
1. John adds two crew members: Mike (lead framing) and Sarah (apprentice).
2. Crew gets an invite link to the job.
3. Mike opens link on his phone.
4. Sees: Job timeline, his phase (framing week 3–5), crew assignments, upcoming safety talk.
5. Taps "What happened today?" — voice log: "Framing on west wall, interior walls started tomorrow."
6. Mike uploads 2 site photos and submits.
7. John reviews the entry and approves (or it auto-posts).

**Expected Outcome:**
- Crew link works without full login (uses project UUID or one-time code).
- Mobile view is readable on a phone (not desktop-only).
- Voice input works on phone (no need to type on a construction site).
- Photos are easy to snap and attach (one tap).
- John gets notified when Mike submits a log.

**Failure Modes John Would Notice:**
- Mobile view is responsive but too small/cramped.
- Crew can't access without creating an account (friction; crew won't use it).
- Voice input doesn't work on phone or fails transcription.
- Photo uploads are slow or hang.
- John doesn't know if Mike submitted a log — has to check the app manually.

---

### JOHN-TC-10: Back-button navigation doesn't lose form data
**Priority:** IMPORTANT  
**Category:** back-button  
**What it tests:** John starts filling a workflow, hits back, re-enters workflow — data is still there.

**Steps:**
1. Enter "Quick Estimate" (q2) workflow.
2. Fill in: Job description, location, sqft, trades.
3. Hit browser back button.
4. Click into "Quick Estimate" again.
5. Data should still be there.

**Expected Outcome:**
- All form fields retain their values.
- No "unsaved changes" warning.
- Feels like the same session, not a reload.

**Failure Modes John Would Notice:**
- Form is empty (John has to re-type everything).
- "Are you sure?" prompt asks him to confirm losing data.
- Page reloads slowly.

---

### JOHN-TC-11: AI banner shows the right "What next?" CTA for the job phase
**Priority:** NICE  
**Category:** spine  
**What it tests:** When John lands on /killerapp with a project UUID, the AI banner suggests the next logical workflow.

**Steps:**
1. John has a mid-project job (framing done, MEP rough in progress).
2. He opens /killerapp?project=uuid.
3. AI banner appears above the workflow picker with a "What next?" prompt.
4. Banner suggests: "Framing is done. Drywall should start after MEP. Ready to schedule drywall?"
5. CTA button: "Plan drywall phase."

**Expected Outcome:**
- Banner is context-aware (knows project state, not generic).
- CTA is actionable (points to a specific workflow or step).
- Banner doesn't nag (appears once, dismissible).

**Failure Modes John Would Notice:**
- Banner is a generic "Get started" message (not helpful).
- CTA is vague or points to a workflow John doesn't need right now.
- Banner is intrusive or won't go away.

---

### JOHN-TC-12: Autosave captures voice input and attachments without a Save button
**Priority:** IMPORTANT  
**Category:** autosave  
**What it tests:** John records a voice log or uploads a photo; it saves automatically within 2 seconds; no "Save" click required.

**Steps:**
1. In "Daily logbook" (q15), tap voice input.
2. Record: "Framing done, electrical starting tomorrow."
3. Release the recording (stops auto-recording after silence).
4. Watch for an autosave indicator (e.g., checkmark or "Saving..." message).
5. Navigate to another step or workflow.
6. Return to daily log — voice entry is still there.

**Expected Outcome:**
- Autosave indicator appears for 1–2 seconds after input.
- No "Save" button visible.
- If John closes the tab, the entry is still there (not lost).

**Failure Modes John Would Notice:**
- No autosave feedback (John doesn't know if it saved).
- Manual "Save" button required (friction).
- Voice entry disappears after 30 minutes.
- Autosave fails silently; John doesn't know until he returns and finds data gone.

---

## Gaps — What John Expects But Isn't Shipped Yet

1. **Photo/Video upload with dispute evidence stamping** — John wants to back up his photos with GPS + timestamp + metadata. If he gets sued, the photos prove timeline and conditions. (Currently uploaded but no metadata strip or verification.)

2. **Integrated budget dashboard** — Estimate → Actuals comparison, by trade. As scope changes, the budget updates automatically. Right now John has to track this in Excel.

3. **Simple legal share with his attorney** — John wants to email a contractor-readable summary to his lawyer ("Here's the contract, COs, waivers, daily logs, photos") without manually assembling 50 PDFs. One button: "Export for legal review."

4. **Subcontractor RFQ distribution & bid comparison** — John wants to write a scope, email it to 5 subs, and see their quotes side-by-side in the app. (App has the analysis template but not the auto-distribution or formatting for subcontractor responses.)

5. **Automated reminder cadence for follow-ups** — John wants the app to remind him: "5 days until permit review, 3 days until inspection, 1 day before drywall crew start." Instead of him setting a calendar event, the app should know the job timeline and remind him automatically.

---

## Demo-Critical Subset

These test cases MUST all pass for John to commit to using BKG on his next ADU.

- **JOHN-TC-1** (Project spine + autosave)
- **JOHN-TC-2** (AI estimate realistic)
- **JOHN-TC-3** (Contracts load and fill)
- **JOHN-TC-4** (Code compliance for ADU + local rules)
- **JOHN-TC-6** (Change order with cost + schedule delta)
- **JOHN-TC-7** (Draw request auto-fills, lender gets it, tracked)

If all 6 pass, John believes the app solves his core problems: **estimates, contracts, codes, scope management, and payment tracking**. Without these, he's not convinced it's worth switching from email + Excel.
