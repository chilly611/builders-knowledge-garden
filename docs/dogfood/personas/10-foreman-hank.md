# Dogfood Test Plan: Foreman Hank Bell

**Persona:** Hank Bell, 56, Denver. Foreman (not GC) on 30-person commercial fit-out crew. On-site every day. Hates writing. Loves talking. Phone is a walkie-talkie. If Hank doesn't adopt BKG, the GC's investment fails.

---

## What Hank Cares About (Priority List)

1. **Voice daily logs that just work** — 90-second voice entry at end of shift, location stamped, categorized by BKG. No tap-dancing. No confusing menus. "What happened today?" and it gets it.

2. **OSHA toolbox-talk topic for the week** — BKG drafts it, Hank delivers it, attendance logged. 10-15 minutes. Legal coverage.

3. **Supply ordering by voice** — "We need 50 sheets of half-inch" → order flows to supplier. Hank doesn't type item codes.

4. **Equipment status** — What's on-site, what's arriving tomorrow, what's late. One glance.

5. **Photo capture of incidents & damage on the fly** — Hank pulls phone with one glove off, shoots damage, location auto-stamps, attached to daily log. No post-processing.

---

## Field Conditions (Non-Negotiable)

- **Noise:** 85+ dB (circular saws, nail guns, impact wrench).
- **Gloves:** Work gloves on, touch accuracy drops. Voice is only option.
- **Sun glare:** Screen brightness/contrast must work outdoors at high noon.
- **One-handed use:** Hank holds a level, measure tape, or clipboard in one hand. Phone goes in pocket. Only voice and large buttons.
- **Spotty WiFi:** Job-site 4G is flaky. Functions must cache or degrade gracefully.

---

## Test Cases (8–12, ID: HANK-TC-N)

### HANK-TC-01: Voice Daily Log Entry (90 Seconds, Noisy Environment)

**Setup:** Hank on-site at 4:45 PM. Circular saw running 80 feet away. Compressor cycling.

**Steps:**
1. Open BKG, tap "Daily log" (or say "daily log").
2. Voice input: "Framing on the west wall is done. Electrical rough-in starts tomorrow. Spotted water damage in the south corner, needs investigation before drywall. Two guys were late this morning. Weather was clear all day. We're on schedule."
3. BKG auto-transcribes and offers category tags (Progress, Issues, Safety, Delays).
4. Hank taps or says "save."

**Pass Criteria:**
- Transcription accuracy ≥90% in 80+ dB noise.
- Categories auto-tagged correctly (Progress: framing done; Issues: water damage; Delays: crew lateness; Weather: clear).
- Entry saved to job record in <2 seconds.
- Replay button works.

**Fail Condition:**
- Transcription drops below 80% accuracy or omits key phrases (water damage, electrical start, investigation).
- Categorization misses "Issues."
- Save fails or takes >3 seconds.

---

### HANK-TC-02: Voice Navigation Misunderstanding → Fallback to Text

**Setup:** Hank tries to navigate to equipment status using voice. Background noise includes truck backup beep.

**Steps:**
1. Say "equipment status."
2. BKG misunderstands → returns "equipment rental" or no match.
3. Hank tries again: "show me the gear."
4. BKG misunderstands again (2 failures in a row).
5. Hank reverts to manual navigation (taps icons).

**Pass Criteria:**
- After 2 voice misses, Hank can quickly find equipment list via tap/icon navigation.
- Equipment screen loads in <2 seconds.
- No error message; graceful fallback.

**Expected Outcome (CRITICAL):**
- Hank does not get frustrated; fallback is seamless. This is the breaking point for adoption: if voice nav fails twice and tap is slow, Hank texts the GC instead of using BKG.

---

### HANK-TC-03: OSHA Toolbox Talk Topic Generation & Logging

**Setup:** Monday morning. Hank opens BKG to run weekly safety talk.

**Steps:**
1. Tap "Weekly toolbox talk" (or say it).
2. Input: "Working at height on this phase."
3. BKG generates 10–15-minute talk outline with OSHA references.
4. Hank gathers 8 crew members.
5. Voice input: "8 guys here. Talked about harnesses, anchor points, rescue plan. Two asked about fit. No concerns." 
6. Tap "save attendance."

**Pass Criteria:**
- Talk draft loads in <5 seconds.
- Outline is legally sound (references 1926.500 or relevant standard).
- Attendance logged with date, topic, count.
- No manual typing required; all voice or taps.

**Fail Condition:**
- Talk generation >10 seconds.
- Outline is generic or missing OSHA citations.
- Attendance form requires manual crew name entry (should use job roster).

---

### HANK-TC-04: Supply Ordering by Voice (Half-Inch Drywall)

**Setup:** Hank realizes crew is running low on drywall. Site: Denver, CO. Supplier: local lumberyard.

**Steps:**
1. Say "order supplies" or tap Supply Ordering.
2. Voice input: "We need 50 sheets of half-inch drywall. We're on schedule, no rush, but we need them by Thursday."
3. BKG parses: 50 sheets, half-inch, drywall, delivery Thursday.
4. BKG auto-fills supplier (local lumberyard) and cost estimate.
5. Hank says "send it" or taps confirm.
6. Order notification sent to supplier (email or SMS).

**Pass Criteria:**
- Voice parse captures: qty (50), size (half-inch), material (drywall), delivery window (Thursday).
- Supplier auto-selected (local match; Hank approves).
- Cost estimate displayed.
- Order routed to supplier in <10 seconds from confirm.
- Hank receives confirmation (SMS preferred for field).

**Fail Condition:**
- Voice parse misses qty or material type.
- Supplier not auto-selected (Hank has to type or search).
- Order takes >15 seconds to route.
- No SMS confirmation.

---

### HANK-TC-05: Equipment Inventory at a Glance

**Setup:** Hank needs to know what equipment is on-site and what's arriving.

**Steps:**
1. Tap "Equipment" or say "equipment status."
2. BKG displays:
   - On-site now: Scissor lift, dumpster, compressor, scaffolding (with check-in date).
   - Arriving: Crane (tomorrow 8 AM), portable toilet (Thursday).
   - Late or at-risk: None.
3. Hank scans the list.

**Pass Criteria:**
- Equipment list loads in <2 seconds.
- Status is current (updated at last refresh or real-time if integrated with rental companies).
- Arrival dates and times are clear.
- Large text (≥16pt) readable in sun glare.
- One-tap access to contact rental company if item is late.

**Fail Condition:**
- List outdated or missing expected arrivals.
- Small text or low contrast in sunlight.
- No contact info for rental company.

---

### HANK-TC-06: Photo Capture of Water Damage with Location Stamp

**Setup:** Hank discovers water stain in south corner (site: Denver, 2280 South Dahlia Street, Denver, CO 80210).

**Steps:**
1. Tap phone camera or say "take photo."
2. Hank shoots the water stain from 2 angles.
3. BKG auto-stamps: timestamp (4:47 PM), location (GPS or manual input: "South corner, lower wall"), photo count (2).
4. Voice note: "Water stain in south corner, darker patch, about 18 inches wide. Looks fresh. May indicate roof or plumbing leak."
5. BKG attachs photos + voice note to today's daily log under "Issues."
6. Hank says "save" or taps confirm.

**Pass Criteria:**
- Photo capture is fast (no app switching; built-in or native camera).
- Location stamp auto-fills from job GPS (or Hank can override).
- Timestamp is accurate.
- Voice note syncs with photos in the same record.
- Photos + note appear in daily log "Issues" category.
- All data cached locally if WiFi is down.

**Fail Condition:**
- Photo capture requires app switching (BKG → Camera → BKG = 3 taps, annoying).
- Location stamp is missing or wrong.
- Photos and voice note are orphaned (not linked to daily log).
- Data loss if WiFi drops.

---

### HANK-TC-07: Voice Command Disambiguation Under Noise

**Setup:** Job-site noise level 85 dB. Hank says "crew" (intended: crew sizing / worker count).

**Steps:**
1. Hank says "crew."
2. BKG offers disambiguation menu: "Did you mean… (a) Crew Sizing, (b) Close overlay, (c) No match?"
3. Hank taps (a) or says "crew sizing."
4. Crew sizing workflow loads.

**Pass Criteria:**
- Disambiguation menu appears in <1 second.
- Options are large (tap target ≥44pt) and voiced.
- Hank can tap or speak to disambiguate.
- Correct workflow loads on tap.

**Fail Condition:**
- Disambiguation menu is small or hard to tap while holding tools.
- Menu doesn't appear (command just fails silently).
- User has to re-speak or manually navigate.

---

### HANK-TC-08: Daily Log Voice Entry with Offline Cache

**Setup:** Hank on-site, WiFi down. Makes a voice daily log entry.

**Steps:**
1. Tap "Daily log" → Voice input: "Framing east wall 60% done. Electrical crew didn't show. Rescheduling for tomorrow. Safety incident: Marco caught his sleeve on a nail. Minor cut, treated on-site."
2. BKG saves locally (no network).
3. 30 minutes later, WiFi comes back.
4. BKG auto-syncs cached entry to server.

**Pass Criteria:**
- Voice input succeeds even with no WiFi.
- Entry is saved to local cache with timestamp.
- Auto-sync completes when WiFi returns.
- No data loss; entry appears in job record after sync.
- User sees confirmation message: "Saved locally. Syncing when WiFi returns."

**Fail Condition:**
- Voice input fails if WiFi is down.
- Cached data is lost.
- Manual sync required (should be automatic).

---

### HANK-TC-09: Safety Incident Photo + Location + Voice Note (Accident Report)

**Setup:** Hank's crew member Marco caught his sleeve on a nail (minor cut). Hank documents the incident.

**Steps:**
1. Say "incident photo" or tap incident capture.
2. Hank shoots: the nail, the damaged sleeve, Marco's hand (bandaged).
3. Location auto-stamps: "Framing area, northeast section" (GPS or manual).
4. Voice note: "Marco's sleeve caught on 16-penny nail protruding from joist. Cut on inner forearm, about 2 inches. Treated with first aid, bandaged. No stitches needed. Root cause: nail was not bent or covered. Will inspect all joists for stray nails before EOD."
5. BKG attaches photos + note to Safety category in daily log.
6. Hank says "done."

**Pass Criteria:**
- Photo capture is fast and one-handed.
- Location stamp is accurate (or manual override works).
- Voice note is clear and synced with photos.
- Safety incident appears in Safety category of daily log.
- Data can be exported to incident report template (if needed).
- All cached locally if WiFi is down.

**Fail Condition:**
- Photos and voice note are separate records (not linked).
- Location stamp is missing.
- Safety incident doesn't appear in daily log.
- Data lost if WiFi drops before sync.

---

### HANK-TC-10: Hank Tries Voice Nav in High Noise, Reverts to Text SMS

**Setup:** Jackhammer running 50 feet away. Hank wants to reach the GC but voice nav fails twice.

**Steps:**
1. Say "contract templates" (intended: unclear in noise).
2. BKG misunderstands → no match or wrong result.
3. Say "contracts" again.
4. BKG misunderstands again.
5. Hank gives up, pulls out his phone, texts the GC via SMS: "Need contract for new sub, check BKG?"
6. Hank is now bypassing BKG for critical communication.

**Expected Outcome (CRITICAL):**
- This is the failure mode. Hank abandons BKG after 2 voice misses.
- BKG adoption fails because Hank reverts to SMS/walkie-talkie.
- Pass = voice nav works 95%+ on first try, or fallback to tap is <2 seconds + intuitive.

---

### HANK-TC-11: Bulk Photo Upload + Auto-Categorization (Final Walk-Through)

**Setup:** Hank takes 15 photos during final punch walk. BKG auto-detects issues.

**Steps:**
1. Tap "Final walk-through" → upload photos.
2. BKG analyzes: "Detected 5 punch items: 1 drywall gap, 2 paint drips, 1 outlet cover misaligned, 1 trim gap."
3. Hank reviews list (manual override if incorrect).
4. Voice input: "Drywall gap is minor. Paint drips need touch-up. Outlet gap is paint splatter. Trim gap in kitchen, check fit. Otherwise good."
5. Hank taps "assign to trades" and photo + note is linked to each punch item.

**Pass Criteria:**
- Photo upload is fast (batch upload preferred).
- AI detection is ≥80% accurate (catches real punch items).
- Categorization by trade is correct.
- Voice note is synced with each item.
- Punch list can be exported or sent to subs.

**Fail Condition:**
- Detection is <70% accurate (too many false positives/negatives).
- Photos and notes are orphaned (not linked to items).
- No export or routing to subs.

---

### HANK-TC-12: Voice Speed Test (Navigation + Input + Confirm)

**Setup:** Hank needs to log a quick update in <60 seconds from cold start.

**Steps:**
1. Open BKG (app already installed).
2. Say "daily log."
3. Voice input: "All good today. No issues."
4. Tap confirm.
5. **Measure total time from step 1 to confirmation.**

**Pass Criteria:**
- Total time: ≤45 seconds.
- Hank feels fast and effortless.

**Fail Condition:**
- Total time: >60 seconds (Hank will revert to paper or SMS).

---

## Gaps & Missing Features

1. **Offline Mode:** Job-site WiFi is spotty. BKG must cache voice entries, photos, and orders. Auto-sync when online.

2. **Push-to-Talk Voice:** Current voice is always-listening. Hank wants a button: "Hold, speak, release." Like a walkie-talkie. Avoids accidental activation near nail guns.

3. **Photo Annotation:** Hank wants to draw a red circle or arrow on the photo to point out the problem. "Water stain here." Simple drawing, no complex markup.

4. **Crew Slack/SMS Integration:** BKG generates a daily standup. Send to crew Slack or SMS so Hank doesn't have to repeat info.

5. **Equipment Rental Integration:** Real-time sync with rental company APIs (EquipmentShare, Herc, Home Depot) so equipment status is always current. No manual entry.

6. **Supply Supplier Integration:** Auto-route voice orders to supplier dashboard (Acklands, Home Depot, local lumberyard). Real-time tracking.

7. **Noise-Adaptive Voice Recognition:** Hank needs a speech model tuned to construction noise + work-glove mumbling. Current generic models fail.

8. **Large Buttons & High Contrast:** All tap targets ≥48pt. Background/text contrast ≥7:1 in sunlight.

9. **Hands-Free Confirmation:** "Say 'done' to confirm" instead of requiring a final tap. Hank's hands are full.

10. **Incident Report Template Export:** Safety incident photos + voice note → auto-fill injury report form (OSHA 301, state workers' comp). One tap to email to HR.

---

## Demo-Critical Subset

**Minimum viable dogfood** (must work day 1 for Hank to say "yes"):

1. **HANK-TC-01** — Voice daily log in noisy environment (≥90% transcription, <2s save).
2. **HANK-TC-02** — Voice nav failure → tap fallback (smooth, no frustration).
3. **HANK-TC-04** — Supply ordering by voice ("50 sheets half-inch drywall").
4. **HANK-TC-09** — Safety incident photo + location + voice note (linked, cached offline).
5. **HANK-TC-12** — Voice speed test (≤45 seconds end-to-end).

**If these 5 pass, Hank will use BKG and evangelize it to the crew.**

---

## Notes

- **Target:** https://builders.theknowledgegardens.com/killerapp (Project Spine v1)
- **Voice Commands Supported** (from voice-commands.ts): `q15` (daily-log), `q16` (osha-toolbox), `q11` (supply-ordering), `q10` (equipment), plus home/back/close/cancel/done.
- **Field Constraints:** Hank runs a 30-person crew, on-site every day. He doesn't have time to debug UX. One-handed use is mandatory. If BKG is slower than paper + SMS, it fails.
- **Adoption Trigger:** Hank's GC spent money on BKG. If Hank doesn't use it in the first week, the GC asks for a refund. Make Hank's top 5 tasks frictionless.

---

## Test Execution Notes

- **No browser tests.** Hank uses iPhone + Android on-site.
- **Noise test:** Record background audio at 85+ dB (circular saw, compressor). Play during transcription test.
- **Glove test:** Wear work gloves (or tape fingers to simulate reduced dexterity). Try all tap targets.
- **Sun glare test:** Test brightness/contrast on outdoor display in full sun (noon, cloudless).
- **WiFi test:** Kill WiFi after saving a voice entry. Verify local cache. Restore WiFi and verify auto-sync.
- **Speed test:** Use stopwatch from app open to confirmation. Repeat 3 times, report average.

---

**Time Budget:** 5 minutes.
**Report:** ≤80 words summary (see below).

---

## Executive Summary (≤80 words)

Foreman Hank Bell, 56, runs a 30-person fit-out crew. He hates typing, loves voice, and won't adopt BKG if it's slower than SMS. Critical tests: voice daily logs in 85 dB noise (≥90% accuracy), voice supply ordering, incident photo + location + note (offline-cached), and seamless fallback from failed voice nav to tap. If Hank's 5 core tasks work in <45 seconds and offline, he'll evangelize BKG. If voice nav fails twice in a row, he reverts to texting the GC. Gaps: offline mode, push-to-talk, photo annotation, Slack/SMS integration.
