# Foreman Hank Bell v2.0: Post-Fix Gripes (Wave 3 Predictions)

**Persona:** Hank Bell, 56, Denver foreman. 30-person fit-out crew. Voice-first user. If Hank doesn't adopt, the GC's BKG investment fails.

**Date:** 2026-05-06 (post Wave 2: q8, q15, q11 spine-wired; voice nav feature-flagged but always-listening)

**Scope:** Hank's predicted next 5-7 pain points AFTER the current fixes ship. These aren't design flaws — they're field-reality collisions the lab tests didn't catch.

---

## GRIPE-1: Always-Listening Mic Triggers False Positives in 95dB Noise

**Priority:** P1 (adoption-blocker)  
**Trigger:** Hank opens daily-log on a jobsite with circular saws (95+ dB). The mic button is visible. He doesn't tap it, but it activates anyway when a colleague says "log," a nail gun fires nearby, or a compressor cycles. The system starts recording, eats 30 seconds of garbage audio, then the background noise defeats the speech recognizer. Or worse: it catches the tail end of crew conversation and logs: "Grab the drywall" as a work incident.

**Why it kills adoption:**  
- Hank distrusts a tool that records without consent. OSHA and crew privacy are concerns.
- The feature flag `NEXT_PUBLIC_VOICE_NAV=enabled` is on in prod. VoiceCommandNav renders a floating mic FAB. The hook (`useSpeechRecognition`) is set to `continuous: false`, but the component auto-starts on tap.
- Real-world field noise (95 dB) and accidental tap = garbage data polluting his project log.
- Hank will disable the feature or stop using daily-log altogether.

**What's actually in the code:**  
Line 147-148 (VoiceCommandNav.tsx): `handleMicTap` requires explicit button press. But on a noisy jobsite with gloved hands, accident taps are inevitable. The 8-second silence timeout (useSpeechRecognition.ts:81) doesn't help if a nail gun fires mid-sentence.

**Suggested fix:**  
1. **Push-to-talk only:** Change `recognition.continuous = false` (already set) + disable auto-start. Require hold-and-speak (e.g., iOS Voice Memos style). Release to send.  
2. **Noise gate:** Filter audio with amplitude threshold before transcription. Suppress <60 dB background.  
3. **Manual confirm step:** Before saving, show Hank what was recorded. "I heard: 'Framing west wall done.' — Save / Rerecord?"  
4. **Jobsite-tuned model:** The generic en-US model fails on construction terms ("MEP," "R-value," "soffit"). Retrain on a 300-hour construction corpus.

---

## GRIPE-2: No Photo Evidence Capture on Daily-Log Step

**Priority:** P1 (gap from persona test q6, #1 blocker across all personas)  
**Trigger:** Hank spots water intrusion in the south corner (just like HANK-TC-06 test case). He wants to voice-log it: "Water stain, south corner, needs investigation." He speaks it into daily-log. The system records it. But there's no way to attach photos — no camera button, no photo picker, no upload field in the daily-log workflow steps.  
Hank has to:
1. Exit daily-log.
2. Open camera app (or Photos).
3. Shoot the water stain.
4. Return to daily-log.
5. Manually write or re-voice a new entry linking the photo.

That's 3-4 extra taps + context switching. On a 95 dB jobsite with gloves, he gives up and SMS-texts the GC instead: "Check column 4D water damage, I'll send pics."

**Why it kills adoption:**  
- This is THE #1 gap across all 10 personas. John lost $30k on this exact gap. It's flagged as G-1 in fix-list.md.  
- DailyLogClient.tsx has no photo upload component. WorkflowShell supports steps, but no built-in media input.  
- Without photos, Hank's incident reports are text-only. If a dispute arises, he has no time-stamped, geotagged evidence. GC can't prove he flagged the problem.

**What's actually in the code:**  
DailyLogClient.tsx (line 99-113) renders ProjectContextBanner + WorkflowShell. No `<input type="file">` or camera integration. The persona test (HANK-TC-06, HANK-TC-09) explicitly requires "photo + location + voice note," but it's unbuilt.

**Suggested fix:**  
1. **In-workflow photo step:** Add a new step type to the daily-log workflow: "Evidence Photo" with mobile camera (`capture="environment"`), drag-drop desktop, and batch upload.  
2. **Metadata stamp:** Preserve EXIF (timestamp, GPS) or use Web Geolocation API + add job location as fallback. Users trust GPS timestamps for disputes.  
3. **Inline link:** Show photo thumbnails inline with voice transcript in the daily-log record. Tap to expand.  
4. **Offline cache:** Save photos locally (IndexedDB or Service Worker) and sync when WiFi returns. Essential for spotty job-site connectivity.  
5. **Spec ready (Epic A from fix-list.md):** Use the `project_attachments` table design already drafted. This is a 5-7 day build.

---

## GRIPE-3: Cmd-Enter "I'm Done" Shortcut — Hank Doesn't Know It Exists

**Priority:** P2 (friction, not a blocker)  
**Trigger:** Hank finishes his daily-log voice entry at 4:45 PM. On-site noise is still 85+ dB. He wants to close the form fast and move on to the next task. He looks for a "Save" or "Done" button. He sees the workflow steps laid out. He doesn't see a big obvious button. He taps around, looking for a submit button. He finds a small "Confirm" or unclear CTA. Or he gives up and scrolls up/down to find the right place to finish.

Meanwhile, the code (DailyLogClient.tsx:47-60) has a Cmd-Enter listener that emits a "completed" event. But Hank is using an iPhone or Android in work gloves. He will never know this shortcut exists, and even if he did, it's a Mac-only pattern. On a phone, there's no Cmd key.

**Why it kills adoption:**  
- The shortcut is a power-user Easter egg, not a discoverable affordance.  
- On mobile (where Hank works), there's no equivalent. He's left hunting for a button.  
- The WorkflowShell likely has a form, but the final "submit" CTA is ambiguous or buried.  
- Hank ends up spending 20+ seconds per daily-log just looking for the finish button, when he expected <45 seconds end-to-end (HANK-TC-12 speed test).

**What's actually in the code:**  
DailyLogClient.tsx emits `emitJourneyEvent({ type: 'completed', … })` on Cmd-Enter. But WorkflowShell's submit button may not be obvious. The persona explicitly calls out "Hands-Free Confirmation: Say 'done' to confirm" as a gap (gap #9).

**Suggested fix:**  
1. **Discoverable "I'm done" button:** Large, high-contrast, sticky footer. ≥48pt tap target. "I'm done" text (not "Submit").  
2. **Voice alternative:** When on daily-log step, enable voice command "say 'done'" to close. Wire into voice nav dispatcher.  
3. **Speed feedback:** Show "Saved!" confirmation + count (e.g., "3 of 3 entries saved") so Hank knows completion.  
4. **Remove Cmd-Enter:** It's a Mac dev pattern, not a field pattern. Delete the code that does nothing for the actual user.

---

## GRIPE-4: Offline Mode Doesn't Cache Voice + Timestamps for Async Transcription

**Priority:** P1 (jobsite reality, flagged in persona gaps #1)  
**Trigger:** It's 3 PM on the job site. WiFi is working. Hank starts a daily-log voice entry: "Framing west wall 60% done. No issues today." The speech recognizer runs locally (Web Speech API), but the transcription and metadata write still need the network. Suddenly, WiFi drops (happens every 2-3 hours on typical job sites). The local cache writes the raw audio + timestamp locally. But `useSpeechRecognition` doesn't have IndexedDB fallback. The entry is lost. Or it's partially saved but not synced.

30 minutes later, WiFi returns. Hank doesn't realize his entry was lost. He moves on. At 5 PM, the GC asks, "Did you log anything about framing progress?" Hank says, "Yes, at 3 PM." But the log is empty.

**Why it kills adoption:**  
- Offline mode is a hard requirement (flagged in persona gaps #1, test case HANK-TC-08).  
- `useSpeechRecognition.ts` doesn't have offline logic. It relies on Web Speech API, which needs an active network for transcription on most browsers.  
- If transcription fails or the write fails, there's no fallback to cache it locally.  
- GC loses job-site history. Hank looks unreliable.

**What's actually in the code:**  
`useSpeechRecognition.ts` uses the Web Speech API (lines 55-68). This API is free and works offline on some browsers (Chrome Android), but on Safari/iOS, it requires a network connection. There's no mechanism to:
1. Record audio blob locally if the network fails.  
2. Re-attempt transcription once WiFi returns.  
3. Persist the entry in IndexedDB with an "offline" flag.  
4. Sync it when online.

DailyLogClient.tsx calls `useProjectWorkflowState()` with `recordStepEvent()`, which likely hits the API immediately (line 74). No offline retry.

**Suggested fix:**  
1. **Web Worker + IndexedDB:** Capture raw audio as blob, write to IndexedDB with `{ pending: true, createdAt, step, transcript: null }`.  
2. **Service Worker sync:** On WiFi restore, attempt transcription + API write. Mark `pending: false` once synced.  
3. **Offline indicator:** Show "Saved offline — syncing" banner. Gives Hank confidence his data isn't lost.  
4. **Transparent to user:** Hank shouldn't have to think about this. Record, speak, save — BKG handles the rest.

---

## GRIPE-5: Q16 (OSHA Toolbox-Talk) Not Wired to Project Spine; Hank Can't Pre-Fill Audience/Context

**Priority:** P2 (important workflow, currently broken)  
**Trigger:** Monday morning. Hank wants to run the weekly OSHA toolbox talk. He opens BKG, taps "OSHA Toolbox Talk" (or says "toolbox talk"). The page loads. But there's no banner showing the project scope, no AI-drafted talk outline tied to his actual job (the San Diego ADU), no roster pre-loaded from the project team.

Instead, Hank sees a generic form: "Topic: ___. Attendees: ___." He has to type in the topic ("Working at height on MEP phase"), manually add 8 crew member names, and hit go. By the time the AI generates a talk, it's a generic "safety at heights" talk that doesn't mention the San Diego plan check, the roof access constraints on his ADU, or the specific hazards of his crew's phase.

Hank reads a boilerplate OSHA snippet and records attendance, but it feels like busy-work. He questions if BKG actually understands his job.

**Why it kills adoption:**  
- Per findings-2026-05-06.md, q16 (and 10 other workflows) aren't wired to the Project Spine yet.  
- The ProjectContextBanner doesn't render on q16. No project-aware pre-fill.  
- Hank expects BKG to use the scope he gave on `/killerapp` (the ADU description) to draft a contextual talk.  
- Instead, it's a blank form. Hank manually types, defeating the voice-first promise.  
- OSHA toolbox talks are legal requirements, not optional. If BKG doesn't make them easy + contextual, Hank will use a paper template instead.

**What's actually in the code:**  
findings-2026-05-06.md confirms: only 6 of 17 workflows are wired (q2, q4, q5, q8, q15, q11). q16 (OSHA toolbox) is not wired. The fix list (fix-list.md, line 42) explicitly names this as a ~7-9 hour task to wire the remaining 11. q16 is formulaic but unbuilt.

**Suggested fix:**  
1. **Wire q16 to Project Spine:** Copy the pattern from q5 (DailyLogClient.tsx). Add `useProjectWorkflowState()` to OshaToolboxClient.tsx. Render ProjectContextBanner.  
2. **Pre-fill talk topic from project phase:** If the project is in the framing phase, suggest a talk on "Proper use of fall protection on multi-story projects." Auto-generate from `raw_input` + project lifecycle stage.  
3. **Roster pre-load:** Query the job's crew roster (if integrated) and show "Attendees: Marco, Carlos, Tim, …" with checkboxes. Hank checks off who was present, not type from scratch.  
4. **Offline OSHA data:** Cache OSHA standard refs (1926.500 for fall protection, etc.) locally so Hank can view/print talks offline.  
5. **Spec ready:** Same formulaic pattern as q8/q15/q11. Estimate: 40-50 min.

---

## GRIPE-6: Photo Location Stamp Defaults to Job Address, Not "Water Damage at Column 4D"

**Priority:** P1 (if photo upload ships; currently N/A since photos aren't built)  
**Trigger:** [Future trigger, post photo-upload build.] Hank snaps a photo of water damage in the south corner. The system auto-stamps GPS location + timestamp. But GPS reads: "2280 South Dahlia Street, Denver, CO 80210" (the job address). Hank needs the location to be "South corner, lower wall, column 4D, 12 feet above grade." The generic address-level stamp is useless if a dispute arises later. He needs a photo annotation or manual location picker so he can mark *exactly* where the damage is on the building.

**Why it kills adoption:**  
- Legal evidence requires specificity. "Water damage at the site" is vague. "Water damage at column 4D, south wall, 12 feet above grade" is defensible.  
- Without the ability to annotate ("draw a circle here"), Hank has to rely on a voice note to explain the location. But if the photo is later separated from the note (e.g., sent to a sub), the location context is lost.  
- Hank won't trust BKG for incident documentation if it doesn't capture location precision.

**What's actually in the code:**  
Not yet built. But the persona test (HANK-TC-06) explicitly calls for "location stamp auto-fills from job GPS (or Hank can override)." The spec needs manual override + optional annotation (gap #3 from persona: "Photo Annotation: Hank wants to draw a red circle or arrow on the photo to point out the problem").

**Suggested fix:**  
1. **Photo location picker:** After snapping, show job map (if available) or a location text input: "Where on the job?" Auto-suggest common areas (south corner, north wall, frame, electrical closet, etc.).  
2. **Simple annotation:** Allow Hank to draw a red circle/arrow on the photo thumbnail. No complex markup, just a pointer.  
3. **Voice note tie-in:** When attaching a voice note to a photo, the note auto-links the location: "Voice: 'Water intrusion.' Location: 'Column 4D.' Photo: [thumbnail]." One record.  
4. **Offline support:** All location + annotation data cached locally, synced when online.

---

## GRIPE-7: Voice Nav Disambiguates Slowly on High-Noise Jobsites; Hank Reverts to SMS After 2 Misses

**Priority:** P1 (adoption-blocking, from persona test HANK-TC-02, HANK-TC-10)  
**Trigger:** Jackhammer running 50 feet away (100+ dB). Hank says "show equipment" (intended: equipment status). The speech recognizer catches "shout equip" or nothing. VoiceCommandNav shows "I didn't catch that. Try again." Hank re-speaks: "equipment status." The background noise defeats it again. Or the command matches something else (e.g., "show" triggers "home," and "equipment" is ignored). After 2 misses, Hank gives up on voice, pulls out his phone, and texts the GC: "Need to check what's arriving today." He's now bypassing BKG for critical communication.

**Why it kills adoption:**  
- Persona test HANK-TC-10 explicitly flags this as a critical failure mode: "Pass = voice nav works 95%+ on first try, or fallback to tap is <2 seconds + intuitive."  
- `useSpeechRecognition` returns a 'no-match' error after 8 seconds of silence (line 86). The component shows a toast ("I didn't catch that. Try again."). But there's no disambiguation menu offering alternatives.  
- Without a fast fallback (tap navigation), Hank reverts to SMS.  
- The adoption failure is not technical; it's behavioral. Once Hank doesn't trust voice, he stops trying it.

**What's actually in the code:**  
VoiceCommandNav.tsx handles `error === 'no-speech'` (line 74) but shows a generic toast. There's no disambiguation menu. The persona test calls for "Disambiguation menu appears in <1 second. Options are large (tap target ≥44pt) and voiced. Hank can tap or speak to disambiguate." This is unbuilt.

Also, the voice-commands.ts file (referenced in VoiceCommandNav.tsx line 6) isn't accessible here, but the findings-2026-05-06.md notes only 6 workflows are wired. If q10 (equipment status) isn't wired with a voice command, then "show equipment" will fail to match a known intent anyway.

**Suggested fix:**  
1. **Faster voice model:** Use a construction-specific speech model tuned on high-noise data. Whisper or similar can handle 95+ dB input with retraining.  
2. **Disambiguation menu:** On no-match, show top 3 likely intents as buttons (large, ≥48pt): "Did you mean: (a) Equipment Status, (b) Daily Log, (c) Close?"  
3. **Fallback to tap:** After 1 voice miss, auto-show the VoiceCommandNav menu below the FAB so Hank can quickly tap the right button without re-speaking.  
4. **Command alias expansion:** "Show equipment" = "equipment," "display equipment," "check equipment." Broaden fuzzy matching on construction vocab.

---

## Summary Table (5-7 gripes)

| Gripe # | Pain Point | Priority | Root Cause | Impact | Fix Effort |
|---|---|---|---|---|---|
| 1 | Always-listening mic fires on 95 dB noise / accidental taps | P1 | Feature flag on, no noise gate, always-listening behavior | Data loss, privacy concern, abandonment | M (5-7 hr) |
| 2 | No photo evidence capture on daily-log | P1 | Epic A unbuilt (project attachments) | Can't prove incidents, reverts to SMS, loses GC trust | L (5-7 days) |
| 3 | Cmd-Enter shortcut unknown on mobile | P2 | Mac-only pattern, no discoverable mobile CTA | Speed test fails (>45s), user frustration | S (1-2 hr) |
| 4 | Offline mode doesn't cache voice + metadata | P1 | useSpeechRecognition + recordStepEvent no offline fallback | Data loss on WiFi drop, GC loses job history | M (4-6 hr) |
| 5 | Q16 OSHA toolbox not wired to Project Spine | P2 | 11 workflows unbuilt; q16 is formulaic but pending | Generic talk, not contextual, defeats voice promise | S (40-50 min) |
| 6 | Photo location stamp too generic (job address, not column reference) | P1 (post-build) | No manual location picker, no annotation | Legal evidence weak, Hank doesn't trust | M (3-5 hr) |
| 7 | Voice nav disambiguation slow in high noise; Hank reverts to SMS after 2 misses | P1 | No noise gate, no fuzzy matching, no fast tap fallback | Critical adoption failure (persona test HANK-TC-10) | M (6-8 hr) |

---

## Recommended Phase-In

**Tier 0 (Day 1, minimal):**
- Fix gripe #3: Make the "I'm done" button obvious. Add voice alternative ("say done").

**Tier 1 (Week 1):**
- Fix gripe #5: Wire q16 to Project Spine (40-50 min, formulaic).
- Fix gripe #1: Add noise gate + disambiguition menu to voice nav (5-7 hr).
- Fix gripe #4: Add offline cache to useSpeechRecognition + recordStepEvent (4-6 hr).

**Tier 2 (Week 2-3):**
- Fix gripe #2: Ship photo upload (Epic A, 5-7 days).
- Fix gripe #6: Add location picker + annotation to photo step (3-5 hr).

**Tier 3 (Post-demo, phase 2):**
- Fix gripe #7: Improve voice nav with fuzzy matching + construction vocab (6-8 hr).

---

**Bottom line:** Hank's next gripes are all field-reality collisions: always-listening is dangerous in noise, no photos means no evidence, offline mode is broken, and voice nav disambiguation is missing. None are design flaws; they're unbuilt features that the persona explicitly demanded. Shipping the current fixes (Project Spine wiring, jurisdiction auto-default) is necessary but not sufficient. These 7 gripes will surface the moment Hank tries daily-log on a real 95 dB jobsite.
