# Dogfood Test Plan: Two-Tool Maria Vasquez

## Persona Snapshot

Maria Vasquez, 38, Phoenix — 14 years solo kitchen and bath remodeler. Cash deals with her three regular subs. Notebook + texts + iPhone 12 (2021 model, Safari). *"I don't have a desktop. If it doesn't work on my phone in one hand while I'm standing on site, it doesn't work for me."* She measures success by photos of finished work her clients say yes to and contracts her subs' lawyers will sign in text form. Spanish/English bilingual; prefers Spanish-language contracts when available.

---

## What Maria Cares About

1. **Speed on iPhone Safari** — three-year-old hardware, 5G spotty on job sites. Sub-2s page loads, no multi-step modals.
2. **Voice-first, not typing** — she'll dictate scope into a phone while standing in a bathroom; she won't sit down to write an estimate on a desktop.
3. **Photo proof** — one-tap upload of finished bathroom photos directly from Camera Roll into a client gallery or contract attachment. Auto-date, auto-tag by room.
4. **Contracts in Spanish** — if she's sending a contract to a sub's lawyer, it must be in Spanish, with legal boilerplate she can text as a PDF link.
5. **Billing summaries as SMS** — she wants to text a sub a summary of what they owe, or send a client a "here's what we've done so far" cost snapshot, as a link they can tap.
6. **Autosave without asking** — no "save" button. Every photo, every voice note, every scope change saves the instant she's done inputting.
7. **Back button always works** — if she goes deep into a workflow and changes her mind, the browser back button returns her to where she was without losing work.
8. **Zero desktop pretense** — no "desktop version" links, no "optimize for desktop" CTAs. She is the mobile user. Full stop.

---

## Test Cases

### CRITICAL Priority (If these break, Maria stops using BKG)

#### **MARIA-TC-01 | iPhone Safari Landing & Workflow Picker Load**
- **Platform:** iPhone 12 Safari, 5G/LTE, portrait
- **Steps:**
  1. Navigate to https://builders.theknowledgegardens.com/killerapp
  2. Verify page loads in <2s (hero visible, Logomark renders)
  3. Tap "Ask anything — type or talk" search box
  4. Verify search affordance is touch-friendly (min 44px tap target)
  5. Scroll down to "Plan" section, verify no horizontal overflow
  6. Tap one "LIVE" workflow link (e.g., q11 Supply Ordering)
- **Expected:** Page renders full-width, text readable at 12px+ font, no layout jank
- **Critical reason:** If the entry point is slow or jumbled, Maria won't trust it for fieldwork

#### **MARIA-TC-02 | Voice Input on Textarea (q2 Job Description, iPhone)**
- **Platform:** iPhone 12 Safari, portrait
- **Steps:**
  1. Open q2 Estimating workflow
  2. Locate step s2-1 "Describe the job" (voice_input type)
  3. Tap voice button (if present) or text area
  4. Dictate: *"Kitchen remodel, 280 square feet. Remove peninsula, add island with gas cooktop, new tile backsplash, granite counters. Paint cabinets. Customer wants modern brushed nickel hardware."*
  5. Verify text appears in textarea, no manual corrections needed
  6. Tap next step without explicitly saving
- **Expected:** Voice input captures full dictation cleanly; no "save" prompt appears; work persists
- **Critical reason:** Maria refuses to type on mobile. If voice doesn't work flawlessly, the app is dead to her

#### **MARIA-TC-03 | Photo Upload & Autosave (q24 Final Walk-Through, iPhone)**
- **Platform:** iPhone 12 Safari, Camera Roll has 5+ bathroom photos
- **Steps:**
  1. Open q24 Final Walk-Through workflow
  2. Reach step s24-1 "Take photos" (file_upload, JPG/PNG/HEIC)
  3. Tap file input, grant Camera permission
  4. Select 3 HEIC bathroom photos from Camera Roll
  5. Wait 2s, scroll down
  6. Refresh page (pull-to-refresh or cmd-R)
  7. Navigate back to q24, verify photos still attached
- **Expected:** Photos upload without modal confirmation; page shows upload progress; photos persist after refresh
- **Critical reason:** Photo evidence is her primary deliverable to clients. Loss = lost deal

#### **MARIA-TC-04 | Project Spine Autosave (project_id in URL, Compose & Persist)**
- **Platform:** iPhone 12 Safari, URL contains ?project=<uuid>
- **Steps:**
  1. Navigate to https://builders.theknowledgegardens.com/killerapp?project=test-abc-123
  2. Verify project name appears in KillerappProjectShell banner (above workflow picker)
  3. Enter a step (e.g., s2-1 voice input from TC-02)
  4. Dictate job description, let autosave fire (no manual save)
  5. Close Safari, kill app entirely, reopen URL
  6. Verify job description still present in s2-1 textarea
- **Expected:** Autosave happens without user action; data persists across app kill/relaunch; no "unsaved changes" warning
- **Critical reason:** Maria loses her phone, reboots mid-job, closes tabs by accident. Autosave is non-negotiable

#### **MARIA-TC-05 | Back Button (Nested Navigation Survive, No Data Loss)**
- **Platform:** iPhone 12 Safari
- **Steps:**
  1. Start at /killerapp landing
  2. Tap q6 Job Sequencing workflow link
  3. Scroll to s6-1 "What are the phases?" and type: *"Demo, Framing, MEP rough, Drywall, Paint, Finish."*
  4. Tap back button (iOS Safari back arrow, top-left)
  5. Verify returned to /killerapp landing
  6. Tap q6 again
  7. Verify s6-1 textarea still contains *"Demo, Framing, MEP rough..."*
- **Expected:** Back button returns to landing; workflow state preserved; no data loss
- **Critical reason:** If back button breaks, Maria has no escape hatch. She'll leave the app

#### **MARIA-TC-06 | Contracts in Spanish (q4 Contract Templates, Spanish Locale Toggle)**
- **Platform:** iPhone 12 Safari, Spanish OS language setting (or explicit locale param)
- **Steps:**
  1. Open q4 Lock Down Paperwork workflow
  2. Reach s4-1 "Pick the forms you need" (template_chooser)
  3. Verify template cards appear (Client Agreement, Sub Agreement, Lien Waiver, etc.)
  4. If Spanish toggle present, select Spanish
  5. Tap "Sub Agreement" template
  6. Verify template boilerplate text is in Spanish (headers, terms, legalese)
  7. Fill in placeholder blanks (sub name, price, payment terms)
  8. Export/download PDF
  9. Verify PDF filename and content are Spanish-language
- **Expected:** Template cards, labels, and exported PDF all in Spanish; legal terms recognizable to a lawyer
- **Critical reason:** Sub's lawyer reads Spanish; contract must be native Spanish or Maria loses credibility

#### **MARIA-TC-07 | "What Next?" CTA Visibility (AI Banner Below Hero, Contextual Action)**
- **Platform:** iPhone 12 Safari, /killerapp landing page
- **Steps:**
  1. Load /killerapp (no project_id yet)
  2. Scroll past hero section, verify "What next?" or AI-guidance banner visible
  3. Verify banner is not intrusive (not full-screen modal, not blocking the workflow picker)
  4. Tap banner or CTA (e.g., "Start with an estimate?")
  5. Verify it routes to relevant workflow or shows contextual help
  6. Verify back button returns to landing
- **Expected:** Banner appears non-intrusively; CTA is helpful and not pushy; navigation is fluid
- **Critical reason:** If BKG nags with modals or interrupts workflow picker, Maria closes tab

---

### IMPORTANT Priority (Nice to have but matters)

#### **MARIA-TC-08 | Mobile Responsiveness (Android Chrome, Landscape Mode)**
- **Platform:** Android phone (Pixel 6 or newer), Chrome, portrait → rotate to landscape
- **Steps:**
  1. Load /killerapp landing in portrait
  2. Rotate to landscape
  3. Verify layout reflows; no content hidden or overlapped
  4. Verify "Ask anything" search box remains accessible
  5. Scroll through Plan section workflows; verify no horizontal overflow
- **Expected:** Layout remains readable in landscape; text sizing adjusts; no jank on orientation change
- **Reason:** Maria might hand her phone to a sub; must work both ways

#### **MARIA-TC-09 | File Upload Performance (q3 Client Lookup, Batch Upload)**
- **Platform:** iPhone 12 Safari
- **Steps:**
  1. Open q3 Who Are You Working For workflow
  2. Reach s3-4 "Attach job photos" (file_upload, JPG/PNG/HEIC)
  3. Select 5 photos from Camera Roll (total ~15 MB)
  4. Verify upload progress indicator appears
  5. Wait for completion, verify no timeout or lost uploads
- **Expected:** All 5 photos upload successfully; progress feedback provided; no silent failures
- **Reason:** Maria shoots a lot of photos; batch upload must work reliably

#### **MARIA-TC-10 | Search/Filter Workflows by Trade (SearchBox q2 Input)**
- **Platform:** iPhone 12 Safari
- **Steps:**
  1. Load /killerapp landing
  2. Tap "Ask anything — type or talk"
  3. Type or dictate: *"I need to order materials for plumbing"*
  4. Verify search results surface q11 Supply Ordering and related workflows
  5. Tap one result; verify it opens the matching workflow
- **Expected:** Search is fast (<500ms), results are relevant, no false positives
- **Reason:** Maria has 27 workflows on the picker; she needs to find the right one fast

#### **MARIA-TC-11 | XP Tally Visibility (Always-On, Non-Intrusive)**
- **Platform:** iPhone 12 Safari, after completing 2-3 workflows
- **Steps:**
  1. Complete at least 2 steps across different workflows
  2. Verify XP counter or badge appears somewhere non-intrusive (footer, top-right corner, or in a profile menu — not a modal)
  3. Verify XP tally increments after each step completion
  4. Verify XP tally is visible without breaking focus from the current task
- **Expected:** XP visible but not distracting; no modal pop-ups on completion
- **Reason:** Maria wants credit for her work, but won't tolerate pop-up congratulations

#### **MARIA-TC-12 | AI Analysis Result Inline (q2 Estimating, Markup Calculation)**
- **Platform:** iPhone 12 Safari
- **Steps:**
  1. Open q2 Estimating workflow
  2. Fill steps s2-1 through s2-5 (job description, location, sq ft, trades, photos)
  3. Scroll to s2-6 "Specialist pulls the estimate" (analysis_result)
  4. Verify AI response renders inline in the step card (not modal, not separate panel)
  5. Verify response is readable at 12px+ on iPhone; no horizontal scroll needed for the analysis text
- **Expected:** AI analysis appears within the step card; full response fits iPhone width; no modal
- **Reason:** Maria needs quick answers without disruption; modals break her flow

---

### NICE Priority (Polish + Delight)

#### **MARIA-TC-13 | Offline Fallback (Graceful Degradation, No Network)**
- **Platform:** iPhone 12 Safari, use DevTools to simulate offline (or airplane mode)
- **Steps:**
  1. Load a workflow (e.g., q6)
  2. Fill in a step (e.g., s6-1 "phases")
  3. Simulate network loss (airplane mode or DevTools offline)
  4. Attempt to tap next step or submit
  5. Verify graceful error message (not a crash)
  6. Restore network, verify no data loss
- **Expected:** App degrades gracefully; error message is simple; no silent data loss
- **Reason:** Job sites have dead zones; Maria needs to know what happened

---

## Gaps (What's Missing for Maria)

1. **Contracts in Spanish (Critical)**
   - No Spanish templates visible in q4 Contract Templates
   - Gap: Maria's subs' lawyers expect Spanish contracts
   - Fix: Translate all contract templates to Spanish; add locale toggle to /killerapp

2. **One-Tap Billing Summary as SMS Link (Important)**
   - Current: No workflow for generating "here's what you've done, here's what you owe" snapshots
   - Gap: Maria texts billing summaries to clients and subs (not email)
   - Fix: Add q21 "Request payment draws" variant that generates a text-shareable link (bit.ly, QR code) with a cost summary

3. **Daily Log as Voice Notes → Auto-Transcript (Important)**
   - Current: q15 "Daily logbook" accepts voice_input, but no indication of auto-transcription
   - Gap: Maria dictates site notes; wants a readable transcript she can forward to the crew or email to the client
   - Fix: Display auto-transcribed text below voice_input; allow one-tap correction and lock-in

4. **Client Gallery with Auto-Date/Room Tags (Nice)**
   - Current: q24 Final Walk-Through accepts photo upload, but no gallery view
   - Gap: Maria wants a portfolio gallery of finished bathrooms organized by client or job
   - Fix: Post-workflow, offer a gallery preview with auto-extracted metadata (EXIF date, room name from filename)

5. **Retainage Reminder Cadence (Nice)**
   - Current: q25 "Collect retainage" has reminder select (1/2 weeks, 30/60 days) but no SMS option
   - Gap: Maria prefers text reminders over email
   - Fix: Offer SMS/push notification option for retainage follow-ups

---

## Demo-Critical Test Cases (Must Pass)

1. **MARIA-TC-01** — Landing & workflow picker load in <2s on iPhone
2. **MARIA-TC-02** — Voice input on q2 job description
3. **MARIA-TC-03** — Photo upload, autosave, and persistence
4. **MARIA-TC-04** — Project autosave across app kill/relaunch
5. **MARIA-TC-05** — Back button preserves workflow state
6. **MARIA-TC-06** — Contract templates in Spanish (or locale toggle present)

If all six pass on iPhone Safari, Maria will dogfood the live app and trust it for a real kitchen project. If any fail, she walks away.

---

## Summary

**Test count:** 13 (8 critical + 4 important + 1 nice)  
**Top 3 critical gaps:** (1) Contracts in Spanish, (2) Autosave across kill/relaunch, (3) Voice input flawless on iPhone  
**#1 gap:** Spanish-language contracts. Maria's subs' lawyers read Spanish; without them, she can't close deals using BKG.
