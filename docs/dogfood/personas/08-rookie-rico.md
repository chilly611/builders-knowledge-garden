# Rookie Rico Garcia — Dogfood Test Plan
## Killer App Accessibility & First-Time User Experience

---

## Persona Snapshot

**Name:** Rookie Rico Garcia  
**Age:** 28  
**Base:** Albuquerque, NM  
**Background:** 2-year painter; pivoting to finish-carpentry and GC estimating. Mid-tech (Android phone, Venmo, YouTube tutorials). Ambitious but green. Uses big-GC vocabulary he doesn't fully understand (Pre-Bid Risk Score, CPM scheduling, lien waivers). Pretends to know what he doesn't. Gets lost in jargon. Won't ask for help in a room full of people but will rage-quit silently online.

**What he'd say:**  
_"I'm trying to bid bigger. I've got two crew guys. I know paint cold, but GC work? I'm winging it. I watch a lot of YouTube but the videos are all over the place. I need something that walks me through it like I'm not stupid."_

---

## What Rico Cares About (Priority Rank)

1. **Tutorial that assumes he knows nothing** — step-by-step, plain English, no jargon unless explained
2. **"What does this mean?" buttons everywhere** — glossary tooltips inline, no modal popup BS
3. **Ability to redo or backtrack** — if he messes up or misunderstands a step, he can fix it without rage-quitting
4. **AI that explains like a foreman, not a lawyer** — "Here's what you need. Here's why. Here's what to do next."
5. **Contracts that make him look professional to his client** — "I need templates that look legit so the client doesn't think I'm a cowboy"
6. **Not getting roasted by the demo** — if he asks a basic question, he shouldn't feel stupid
7. **Voice input that works** — typing on a phone is slow; he wants to talk
8. **Clear empty state** — when he lands with NO project, he needs to know what to do next without guessing

---

## Test Cases

### RICO-TC-1: First-Time Landing (Empty State)
**Trigger:** New user, no project loaded, lands on `/killerapp`

**Expectations:**
- Hero section is clear: "The operating system for your build" + Logomark
- Search box below hero is obvious and has helpful placeholder text
- "You're not started yet. 7 stages to explore" is visible and not overwhelming
- Stage sections (Size Up, Lock, Plan, etc.) are visible below but not scary
- No "Start here" button hidden in a menu
- No requirement to "authorize" or "sign up" before exploring

**Critical Failure:** Rico lands, sees only workflows without guidance, closes the tab

---

### RICO-TC-2: Natural-Language Workflow Discovery (Search Box)
**Trigger:** Rico searches or speaks into the SearchBox

**Actions:**
- Type: "I need to estimate a kitchen remodel"
- Or voice: (says the same)

**Expectations:**
- Search returns relevant workflows (q2: Quick estimate, q6: Sequencing, q11: Supply ordering)
- Each result shows workflow name + plain-English blurb + number of steps
- Results are ranked by relevance, not alphabetical
- "Quick estimate" (q2) surfaces first
- Clicking a result navigates directly into that workflow

**Critical Failure:** Search returns nothing, or returns unrelated workflows, or requires Rico to "publish" his search

---

### RICO-TC-3: Entering a Workflow with Zero Context (Estimating Flow)
**Trigger:** Rico clicks into q2 (Quick estimate)

**Expectations:**
- Step 1 (Describe the job) is immediately visible
- Input is voice-first or text, not "pick from a dropdown"
- Placeholder text is conversational: "e.g., Kitchen remodel, 320 sq ft. Removing wall between kitchen and dining room, adding granite island…"
- Voice button is obvious and labeled "Type or use voice"
- No warning about "this will cost credits" or "XP tracking is on"

**Critical Failure:** Step 1 is buried under a "Estimating 101" tutorial; or voice button is too small; or Rico sees "XP: +50" and thinks he's being gamified

---

### RICO-TC-4: AI Analysis Result Is Explained, Not Dumped
**Trigger:** Rico completes step 2 (location), step 3 (sq ft), step 4 (trades), step 5 (upload photos), then AI runs step 6 (Specialist pulls estimate)

**Expectations:**
- AI response is itemized and plain (not a wall of bullet points)
- Each line item is labeled in plain English: "Demo + dumpster — $3,200" (not "Demo and debris removal labor + skip rental")
- "Assumptions" section is visible and readable
- Confidence level is stated ("Confidence: medium")
- Next step is clear: "Next step: site walk to confirm bearing-wall header" (not "Proceed to Cost Variance Analysis")
- If a number seems high (e.g., $18,500 for cabinetry), there's a way to ask "Why is this so much?"

**Critical Failure:** AI returns a technical spec sheet; or numbers have no explanation; or Rico can't challenge the estimate; or there's a modal that says "Share this with a specialist"

---

### RICO-TC-5: Jargon Blocker — "I Don't Know What This Means"
**Trigger:** Rico is mid-workflow and encounters unknown term

**Scenario 1:** q4 (Contracts) mentions "Conditional Lien Waiver"  
**Expectations:**
- Hovering over "Conditional Lien Waiver" shows a tooltip (not a modal)
- Tooltip is 2-3 sentences in plain English: "A waiver that says 'I waive my lien rights IF you pay me.' It protects you if the owner pays you but doesn't pay the subs."
- Tooltip includes a "Learn more" link to a glossary article (optional)
- No interruption to the workflow; Rico can continue after reading

**Scenario 2:** q1 mentions "Pre-Bid Risk Score"  
**Expectations:**
- Inline explanation available without leaving the step
- Button or icon (?) next to the term is clear and not hidden
- Rico doesn't feel dumb asking

**Critical Failure:** Only a link to an external article; or a modal that requires a form submission; or Rico has to switch tabs; or the term is never explained

---

### RICO-TC-6: Redo a Step (Backtrack Without Rage-Quit)
**Trigger:** Rico completes q2 step 1 (Describe the job) with wrong info, realizes it, wants to fix

**Expectations:**
- "Back" or "Edit" button is visible at the bottom of the expanded step
- Clicking it shows the original text he entered
- He can re-edit and re-submit without re-doing the whole workflow
- No warning: "Changes will reset the estimate"
- If he changes something that affects downstream steps, a gentle notice: "Your estimate will update when you finish here"

**Critical Failure:** He can't edit; he has to delete the whole workflow and start over; or a modal warns "You will lose all progress"

---

### RICO-TC-7: AI Explanation Tone (Foreman, Not Lawyer)
**Trigger:** q4 step 2 (Fill in the blanks on a contract)

**Expectations:**
- AI pre-fill suggestion is conversational: "Put the owner's name and address here. Include the job address so there's no confusion later."
- Not: "Per standard contract law, the parties to the agreement must be unambiguously identified with legal domicile and asset location clearly specified…"
- Rico feels like a foreman is walking him through, not a lawyer reviewing his work
- He can read it in 30 seconds

**Critical Failure:** AI response is legal jargon; or it takes a full paragraph to explain a field; or Rico feels talked down to

---

### RICO-TC-8: Multi-Step Workflow Isn't a Gauntlet
**Trigger:** q6 (Sequence the trades) has 5 steps

**Expectations:**
- Each step is clearly numbered: "1 of 5"
- Progress bar shows how far he's come (optional but nice)
- He can pause mid-workflow without losing data
- When he comes back later, the app remembers where he left off
- No "You haven't completed this workflow in 24 hours — do you want to abandon it?"

**Critical Failure:** Progress is lost; or a modal says "Your workflow timed out"; or he can't see which step is next without scrolling

---

### RICO-TC-9: Contract Templates Look Professional Enough
**Trigger:** q4 step 1 (Pick the forms you need) → Rico selects "Client Agreement"

**Expectations:**
- Template preview is visible (not hidden in a modal)
- It looks like a real construction contract, not a Google Doc template
- Filled-in example shows what his contract will look like with his data
- He can see the template has state-specific language (not generic)
- No warning: "This is not legal advice" in 14pt font (it can be there, but small, at the bottom)

**Critical Failure:** Template is blank or generic; or it's 15 pages and Rico thinks "Too complicated"; or there's a "Lawyer Review" pop-up; or the preview is tiny

---

### RICO-TC-10: Voice Input Works Offline & Fast
**Trigger:** q2 step 1 (Describe the job) — Rico taps voice button

**Expectations:**
- Microphone starts listening immediately (no "Checking permissions…" delay)
- Real-time transcription shows as he speaks
- Can pause, resume, or delete and re-record without a dialog
- Submits with a clear button (not auto-submit when silence is detected)
- Works on phone and desktop

**Critical Failure:** Voice requires internet; or transcription is 3 seconds behind; or he can't see what it's transcribing; or a modal says "Enable microphone permissions"; or it auto-submits mid-sentence

---

### RICO-TC-11: Rage-Quit Scenario (The Critical Test)
**Trigger:** Rico is in q9 (Get sub quotes), has filled in steps 1-2, then hits step 3 (Specialist pulls the estimate)

**What happens:** AI response is missing (timeout, API down, no mock data). Step 3 shows "Loading…" for 10+ seconds, then an error.

**Expectations:**
- Error message is plain English: "Something went wrong. Try again?" (not "500 Error: CORS policy violation")
- "Try again" button is visible and works
- If it fails twice, there's a "Contact support" link with a pre-filled email about the workflow and step
- Rico doesn't feel like it's his fault
- He can still see his previous answers and resume

**Critical Failure:** Error is technical jargon; or the "Try again" button doesn't work; or his data is lost; or there's a 20-minute wait before a response; or he's stuck in a loading state

---

### RICO-TC-12: Empty State Tutorial (Guided First Run)
**Trigger:** New user, no projects, lands on `/killerapp` for the first time

**Expectations:**
- A small, non-intrusive "Take a tour" button or tooltip appears (not a full-screen modal)
- Tour is optional; Rico can dismiss it and browse workflows
- If he taps "Take a tour," it highlights the SearchBox and explains: "Start here — describe what you're working on"
- Next tour step highlights the stages: "Your build has 7 phases. Start anywhere."
- Next: highlights a single workflow (q2): "This one gets you an estimate in 10 minutes"
- Tour doesn't force a workflow; Rico can exit and explore at his own pace

**Critical Failure:** Tour is mandatory; or it's too long (3+ steps); or Rico can't dismiss it; or it doesn't explain what each stage does

---

## Gaps & Friction Points

**Missing:**
1. **"I'm confused" button** — a quick way to ask an AI question mid-workflow without leaving the step
2. **Glossary with context** — terms are explained inline but no searchable glossary (lower priority, nice-to-have)
3. **Tutorial overlays** — small, non-intrusive tooltips on first-time landing aren't visible; new users feel lost
4. **Simpler language toggle** — "Pro" toggle to switch between plain English and industry terms (low priority; defaults should be plain)
5. **Offline mode hint** — no indication that some steps (voice, file upload) may not work offline
6. **Recovery flow for dead-ends** — if Rico gets stuck (missing file, bad API response, unclear step), no "Get help" flow

---

## Demo-Critical Subset

**Must pass before public demo:**

| TC | Workflow | Why Critical |
|---|---|---|
| RICO-TC-1 | Landing / Empty state | If Rico doesn't understand what to do first, he leaves |
| RICO-TC-2 | Search / Natural language | Natural-language routing proves the "Ask anything" promise |
| RICO-TC-3 | Estimating (q2) first 3 steps | Most common first workflow; voice must work; placeholder must be conversational |
| RICO-TC-4 | Estimating AI result (q2 step 6) | AI must explain in plain English, not dump raw data |
| RICO-TC-5 | Jargon tooltips | Single biggest rage-quit trigger if terms aren't explained |
| RICO-TC-7 | Contract template AI tone | If it sounds like a lawyer, Rico will skip it and use Word |
| RICO-TC-9 | Contract templates preview | Must look professional so Rico doesn't think it's a liability |
| RICO-TC-11 | Error recovery | If he hits an error and can't recover, demo fails |

---

## Success Criteria for Rookie Rico Persona

- **By end of demo:** Rico completes q2 (estimating) end-to-end and says "That was way clearer than YouTube"
- **No rage-quits:** Zero instances of getting stuck with no clear recovery path
- **Voice works:** At least one workflow step uses voice input successfully
- **No confusion on jargon:** Every unfamiliar term (Conditional Lien Waiver, Pre-Bid Risk Score, etc.) can be explained in <5 seconds without leaving the workflow
- **Contract feels legit:** Rico downloads a contract template and says "I could show this to my client"
- **Net sentiment:** "I'd use this on my next job" (not "Cool demo, but I'll stick with Excel")

---

## Empathy Lens

The Killer App's success with builders like Rico proves whether it's accessible to **apprentices and journeymen**, not just masters. If the UI expects prior knowledge of construction workflows, project management, or legal concepts, it fails this persona. Rico is the canary in the coal mine—if he can complete a workflow without rage-quitting, so can most builders.
