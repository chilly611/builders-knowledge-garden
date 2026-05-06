# Dogfood Test Plan: Deck Curtis

## Persona Snapshot

**Deck Curtis Williams** — 33, Charlotte NC. Solo deck/fence/patio guy, 6 years running. Does 30+ jobs a year at $4-15k each. Low-tech, thumbs too big for iPhone keyboard, hates apps. Cares about *speed*. Wants estimates done in under 60 seconds, quick contracts he can text to a customer, and payment *now* — not in 30 days. Shows up with photos of finished decks, expects an invoice same-day.

Voice: Southern, blunt, impatient. "Ain't got time for that" = test failed.

---

## What Curtis Cares About

**Priority 1: Voice Input (Mobile Safari)**
- Talking to his phone while standing on the job is faster than typing.
- No account creation. No login.
- Microphone should be live and ready on first load.

**Priority 2: Speed — "60-Second Scope → Estimate"**
- Open app → describe job (voice or one-handed text) → AI estimate ready.
- Target: 30 seconds from "start" to "here's your rough cost."
- Anything longer = he closes it and calls a spreadsheet guy.

**Priority 3: Simple Contracts**
- Quick template he can open one-handed.
- Fill two blanks: client name, cost.
- Text to customer (not email PDF hell).
- Signature capture would be gold.

**Priority 4: Photo → Invoice Flow**
- Snap photos of finished deck from camera roll.
- AI pulls details, auto-generates invoice.
- Email to customer with payment link.

**Priority 5: No Friction**
- Skip account creation, wizard onboarding, feature tours.
- Land on the tool — use it immediately.

---

## Test Cases (8/12 with Speed Targets)

### CURTIS-TC-1: Voice Input on Mobile Safari — Cold Start
- **Scenario:** Curtis opens `/killerapp` on his iPhone Safari (no prior session).
- **Expected:** Microphone button visible, live, no "connect to account" modal.
- **Target Time:** <10 seconds from open to "tap to record."
- **Pass Criteria:** Can tap mic and say "18-foot composite deck, 2×6 boards, simple railing" without login.
- **Why:** Voice is the only input method that works for him on site.

### CURTIS-TC-2: Q2 Quick Estimate — Full Flow <30 Seconds
- **Scenario:** Voice input → location → photo → AI estimate.
- **Expected:** Result in under 30 seconds after final input.
- **Target Time:** <30 seconds from "start" to "Rough total: $8,200."
- **Pass Criteria:** Estimate appears with itemized cost + assumptions visible one-handed.
- **Demo-Critical:** This is the demo.

### CURTIS-TC-3: Q2 Audio Drift — Interruptions
- **Scenario:** Describe scope → phone rings → resume → complete.
- **Expected:** Mic stays active across interruption. No re-start.
- **Target Time:** <2 seconds to resume.
- **Pass Criteria:** No "session expired" modal. Continues where he left off.

### CURTIS-TC-4: Contract Template — One-Handed, No Scrolling
- **Scenario:** Q4 contract flow. Fill blanks (client name, cost) without scrolling.
- **Target Time:** <20 seconds from "pick template" to "ready to send."
- **Pass Criteria:** Form fits in viewport. "Text to customer" button, not email.
- **Why:** He sends it via text from the truck, not email.

### CURTIS-TC-5: Contract → Text Link (vs. Email PDF)
- **Scenario:** After filling Q4 template, Curtis taps "share" and gets a text-friendly link.
- **Expected:** Link that opens contract in mobile browser (not PDF download).
- **Target Time:** <5 seconds to generate + copy link.
- **Pass Criteria:** No email modal. Direct "copy to clipboard" → paste in SMS.

### CURTIS-TC-6: Photo Upload from Camera Roll — <15 Seconds
- **Scenario:** Q2 step asks for photos. Curtis taps upload, selects 3 photos from camera roll.
- **Expected:** Photos load and auto-attach without refresh.
- **Target Time:** <15 seconds from tap to "photos attached."
- **Pass Criteria:** No file picker hang. Spinner appears while uploading.

### CURTIS-TC-7: Estimate → Invoice (Demo Flow)
- **Scenario:** Q2 estimate complete. Curtis taps "invoice" → AI fills invoice from estimate.
- **Expected:** Invoice template pre-filled with scope, cost, his info, customer name.
- **Target Time:** <20 seconds from estimate to invoice ready.
- **Pass Criteria:** Invoice loads with signature line visible. Payment link generated.
- **Demo-Critical:** Shows "estimate to cash" story.

### CURTIS-TC-8: Q15 Daily Log — Voice Entry <20 Seconds
- **Scenario:** End of day. Curtis says "Framing on west side done, electrical roughed in tomorrow, client came by at 2." AI auto-categorizes.
- **Expected:** Voice logged and tagged (progress, schedule, visitor) instantly.
- **Target Time:** <20 seconds from "say it" to "saved."
- **Pass Criteria:** No typing. Categories auto-filled. Timestamp captured.

### CURTIS-TC-9: 90-Second Abandonment — App Responsiveness
- **Scenario:** Curtis opens app, taps Q2, starts voice input. If any step takes >15 seconds, he closes.
- **Expected:** App responds in <3 seconds to any tap.
- **Target Time:** All UI interactions <3 seconds.
- **Pass Criteria:** No spinners on first load. No "thinking..." delays.
- **Critical Failure:** Any step >15 seconds = he bails.

### CURTIS-TC-10: No Account Creation — Direct Access
- **Scenario:** Fresh device, fresh session. Open `/killerapp` and use Q2.
- **Expected:** Zero auth prompts, zero "create account" modals.
- **Target Time:** 0 seconds blocked by login.
- **Pass Criteria:** Use the tool immediately. No credentials, no email.

### CURTIS-TC-11: Mobile Menu Navigation — One-Handed
- **Scenario:** While on Q4, navigate to Q2. Tap stage, pick workflow.
- **Expected:** All taps land on thumb zone (bottom 60% of screen). No tiny links.
- **Target Time:** <10 seconds to switch workflows.
- **Pass Criteria:** No scrolling up to tap nav. Back button always visible.

### CURTIS-TC-12: Payment Link Generation (Future-Ready)
- **Scenario:** Invoice complete. Curtis taps "send payment link."
- **Expected:** Square/Stripe link generated, copyable to SMS.
- **Target Time:** <10 seconds to get shareable link.
- **Pass Criteria:** Works one-handed. Link is short (bitly-style, not long query params).

---

## Gaps (What's Missing)

1. **No-Account Quick Quote** — v1 likely requires login. Curtis needs guest access to Q2.
2. **Customer Signature Capture** — Q4 template has no built-in eSignature. He texts link; customer signs in browser or paper.
3. **Payment Link (Stripe/Square)** — Invoice has no "share payment" button. Manual copy-paste required.
4. **Photo Auto-Analysis** — Q2 photo upload doesn't auto-extract scope details. Manual typing still needed.
5. **SMS/Text Share (vs. Email)** — All share flows likely default to email. Curtis hates email.

---

## Demo-Critical Subset

1. **CURTIS-TC-1:** Voice input lives on first load, no auth wall.
2. **CURTIS-TC-2:** Full Q2 flow (voice → location → photo → estimate) in <30 seconds.
3. **CURTIS-TC-7:** Estimate → invoice auto-fill.
4. **CURTIS-TC-10:** Zero login friction.

Land these 4 on mobile Safari in front of Curtis, timed with a stopwatch. If any exceeds its target, he stops engagement.

---

## Summary

Curtis is the speed demon. His 90-second timer starts the moment he opens the app. Voice-first mobile input, no login, estimate in 30 seconds, contracts he can text, photos → invoices. Deliver these and Killer App becomes his daily driver. Miss the speed and he forgets it exists.
