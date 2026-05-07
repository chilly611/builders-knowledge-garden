# Dogfood Persona Post-Fix Gripes: Two-Tool Maria Vasquez v2
**Date:** 2026-05-06 (post-spine-v1 + wave-2 wiring)  
**Context:** Project autosave, banner navigation, and 6-workflow spine now shipped. Maria still faces friction on her primary device (iPhone 12 Safari) and her core workflows (voice, Spanish, contracts, customer onboarding).

---

## GRIPE-1: Voice Input Loses Accuracy & Dialogue Context at Jobsite Noise Levels
**Priority:** ADOPTION-BLOCKER  
**Trigger:** Maria dictates a job scope while standing in a bathroom with a table saw running two rooms away. She says: *"Kitchen remodel Mr. Lopez 2br add island granite stainless tops new appliances..."* The voice input captures `"Kitchen remodel Mr Lo[P missing] two bee-are add island..."`

**Why it kills:** Voice transcription breaks under 85+ dB ambient noise (jobsites routinely hit 90 dB during demo). Maria refuses to type; if voice fails, she abandons the app mid-estimate and falls back to a voice memo sent via WhatsApp. The app feels "not built for my world."

**Suggested fix:**  
1. Add explicit noise-resilience mode toggle on voice inputs (headset icon + tap for "hearing protection on" → routes to higher-confidence model or fallback to mic input repeat-and-confirm UX).
2. Implement phrase-context seeding: since Maria just opened q2 Job Description, prime the STT model with construction vocab (cabinet, backsplash, peninsula, quartz, subway tile, etc.) + location-hint from raw_input if present.
3. Show transcription confidence badge (green checkmark if 95%+, yellow caution icon if 75-95%); let Maria re-dictate low-confidence segments inline without losing the rest.

---

## GRIPE-2: iPhone Safari Mobile Safari Touch Targets Too Small for One-Handed Fieldwork
**Priority:** ADOPTION-BLOCKER  
**Trigger:** Maria taps the voice button on q2 textarea. Her thumb hits the location input below instead (44px spacing recommended by Apple, but the buttons are 36px and the gap is 6px). She taps three times to retry, getting frustrated.

**Why it kills:** Maria works with one hand free (holding a measuring tape, adjusting light with phone flashlight in her other hand). Buttons need 52px+ minimum tap targets. Small buttons = repeated misses = app feels "not made for someone who's actually on a jobsite."

**Suggested fix:**  
1. Audit all interactive elements on `/killerapp` workflows + project shell for 48px minimum (including padding around voice buttons, step submit buttons, Next/Previous nav).  
2. On mobile (viewport < 640px), expand button padding to 12px × 16px (48px height), stack vertically instead of inline where space is tight.
3. Add haptic feedback on successful tap (navigator.vibrate([50]) on click) so Maria gets physical confirmation her thumb landed.

---

## GRIPE-3: No Spanish-Language Contracts, Voice, or AI Responses
**Priority:** DEMO-BLOCKER  
**Trigger:** Maria opens q4 Lock Down Paperwork, selects "Sub Agreement" template. The form is in English. She needs a Spanish version to send to her electrician's lawyer (who reads no English). She manually copies the English contract into Google Translate, re-saves it, and now it's 2x as long because Spanish translations expand. She can't send the translated PDF link because it's hosted on her Google Drive, not BKG.

**Why it kills:** Maria's entire sub network is Spanish-speaking. Without native Spanish contracts, she loses deal-closing credibility. Without Spanish voice and AI replies, the app is English-only. She'll route all subs through a bilingual project manager (cost: her margin) instead of using BKG.

**Suggested fix:**  
1. Translate all contract templates (q4) to Spanish by legal review. Expose a `locale` toggle on /killerapp that defaults to browser/OS language setting; store in `project.locale`.  
2. Seed AI copilot with language preference from `project.locale`: if Spanish, respond in Spanish. If bilingual scope (mix of English + Spanish input), respond in the language of the user's most recent input.
3. Add Spanish voice input / TTS (Elevenlabs ES-ES or similar) so Maria can dictate in Spanish and hear AI replies read aloud.
4. Pre-populate contract blanks (sub name, payment terms) in the user's selected language and auto-generate a shareable link (not Drive attachment) that Maria can SMS to the sub.

---

## GRIPE-4: Pre-Fill Engine Misses Informal Scope Wording ("kitchen redo", Not "kitchen remodel")
**Priority:** ADOPTION-BLOCKER  
**Trigger:** Maria dictates: *"kitchen redo Mr. Lopez 2br"* (her shorthand for "2-bedroom kitchen renovation at Mr. Lopez's house"). The AI take parses it correctly ("Kitchen renovation, 2-bedroom home, Mr. Lopez"). But the pre-fill engine looks for exact keywords: "remodel", "renovation", "new", "replace". It doesn't find "redo", so it skips pre-fill. Maria has to re-enter location + sqft manually.

**Why it kills:** Maria's vocabulary is her own — "redo", "redo kitchen", "update bathroom", "new kitchen". The app assumes textbook industry terms. Every time she uses her own phrasing, the app re-asks questions she already answered. Feels broken.

**Suggested fix:**  
1. Expand `LOCATION_REGEX` and `SQFT_REGEX` in `useProjectWorkflowState.ts` to match colloquial variants: "redo", "redo kitchen", "kitchen job", "bath job", "update", "reno" (slang for renovation).
2. Normalize user input via a light pre-processor before regex matching: lowercase, strip punctuation, expand common abbreviations ("bath" → "bathroom", "2br" → "2 bedroom").
3. OR: Run a lightweight NLU classifier (similar to what the AI does) on `raw_input` to extract intent (location, sqft, scope category) rather than regex. Cost: 1-2 extra API calls on project creation, but accuracy jumps 40-60%.

---

## GRIPE-5: Onboarding Flow for Customer (Mr. Lopez) to Receive Draft Contract via SMS is Unclear
**Priority:** DEMO-BLOCKER  
**Trigger:** Maria fills out q4 Contract Templates, exports a draft agreement for Mr. Lopez's approval. She wants to send it via SMS (her and Mr. Lopez communicate 100% by text). The app gives her a "Copy Link" button for `/contracts/<id>`. She copies it, pastes it in a WhatsApp message. Mr. Lopez clicks the link, sees "Sign in to view" — he has no account, no interest in creating one. He texts back: *"¿qué es esto?"* ("what is this?"). Deal stalls.

**Why it kills:** Maria's clients are not tech-forward. If the contract link requires signup/auth, they won't open it. She'll print it, scan it, and email it (the slow way). The app assumes customers are also users; they're not.

**Suggested fix:**  
1. Generate share-only URLs for draft contracts that do NOT require auth: `/contracts/<uuid>?token=<unguessable>` where the token is a short-lived (7-day) public key scoped to that contract only.  
2. Offer a "Share via SMS" button on contract export that auto-fills a text template in iMessage/WhatsApp: *"Mr. Lopez, please review and approve this contract: [link]. It expires in 7 days."* (message + link pre-populated, Maria just sends).  
3. Track "contract viewed" and "signed" events without requiring login; notify Maria when Mr. Lopez opens or signs (SMS or in-app toast).
4. Add a fallback "Print-Friendly PDF" option so Maria can still hand-deliver a paper copy if the client refuses digital.

---

## GRIPE-6: Persistent Listening Toggle on Workflows Drains Battery & Doesn't Persist Across Navigation
**Priority:** POLISH  
**Trigger:** Maria enables "always listening" on q6 Job Sequencing so she can dictate phases hands-free while she's measuring framing. She enters "Demo" → microphone hears ambient noise, tries to parse it, drains battery 8% per minute. She navigates to q2 to add a note. The listening toggle is gone. When she comes back to q6, she has to re-enable it. She does this 3 times, kills her battery, and disables listening permanently.

**Why it kills:** Maria needs voice input to stay *on* as she moves between workflows — it's her primary input mode. Battery drain + navigation forgetting = the feature feels "half-built, not for someone in the field."

**Suggested fix:**  
1. Store persistent listening state in localStorage: `bkg-listening-mode: true/false` + `bkg-listening-until: <timestamp>`. When Maria enables on any step, it stays on across all workflows for 60 minutes (or until she explicitly toggles off).
2. Optimize mic polling: instead of continuous listening, use `silence-detection` (if no sound for 2s, stop recording; resume on sound) to reduce battery drain from 8% → 1-2% per minute.
3. Show battery indicator on the voice button: if battery drops below 20%, auto-suggest disabling listening mode or switching to text input.
4. Allow voice command shortcuts: *"Go to daily log" / "Submit" / "Next"* so Maria can navigate without touching the screen.

---

## Summary (≤80 words)

**Maria's top 3 gripes post-fix:**  
1. **Voice input fails at jobsite noise (85+ dB).** Confidence badges + noise-resilience mode + phrase-context seeding needed.  
2. **iPhone touch targets too small for one-handed fieldwork (36px vs. 48px).** Haptic feedback + vertical stack on mobile fixes fieldwork friction.  
3. **No Spanish contracts, AI replies, or customer SMS onboarding.** Spanish templates + locale toggle + auth-free contract sharing kills her sub network bottleneck.

---

## Test Cases (Maria v2)

### MARIA-TC-14 | Voice Input in Noisy Environment (85+ dB)
- **Platform:** iPhone 12 Safari, jobsite with ambient noise  
- **Steps:** Enable "noise resilience mode"; dictate scope with table saw running nearby; verify transcription accuracy or confidence badge appears  
- **Expected:** Confident transcription or "re-dictate this phrase?" prompt  
- **Critical reason:** Jobsites are loud; voice must work or Maria abandons

### MARIA-TC-15 | Touch Targets & One-Handed Fieldwork
- **Platform:** iPhone 12 Safari, one-hand hold  
- **Steps:** Tap voice button with thumb; verify hit (no adjacent button tapped); repeat 3× on q2, q6, q11; verify haptic feedback on success  
- **Expected:** 48px+ buttons, physical confirmation, no misdirects  
- **Critical reason:** Maria's hands are often full; must be fault-tolerant

### MARIA-TC-16 | Spanish-Language Contracts & SMS Sharing  
- **Platform:** iPhone 12 Safari, locale set to Spanish  
- **Steps:** Open q4, select Sub Agreement, verify Spanish template loads; export PDF; tap "Share via SMS"; verify pre-filled message + token-based link generated  
- **Expected:** Spanish boilerplate, SMS template ready to send, Mr. Lopez can view without signup  
- **Critical reason:** Subs are Spanish-speaking; SMS is how Maria communicates

### MARIA-TC-17 | Informal Scope Wording Pre-Fill ("kitchen redo" → location + sqft auto-filled)
- **Platform:** iPhone 12 Safari, new project  
- **Steps:** Dictate raw_input: *"kitchen redo Mr. Lopez 2br"*; navigate to q2 Estimating; verify location + sqft pre-filled from colloquial input  
- **Expected:** Location field = "Mr. Lopez's location" (or fuzzy-matched), sqft = 2 (bedroom count as proxy); marked complete for XP  
- **Critical reason:** Maria uses her own vocab; app shouldn't re-ask answered questions

