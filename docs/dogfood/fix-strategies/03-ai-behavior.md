# AI Behavior Fix Strategy
**Date:** 2026-05-06  
**Scope:** Copilot + Estimating AI behavior across dogfood findings  
**Target:** John demo readiness + proactive-assist pattern for voice-first personas

---

## 1. What the AI Got Right (Test Evidence)

### Hallucination Guard Works
**Test:** Sparky Pete (CODE-5) probed with fabricated NEC section 919.7(D)(4).  
**Result:** AI explicitly admitted "I don't have NEC 919.7(D)(4) in my knowledge base" and pivoted to general guidance.  
**Why it worked:**
- The copilot system prompt (route.ts, line 386-408) includes `sanitizeCopilotResponse()` which strips "consult a licensed" hedging but preserves honest "I don't know" statements.
- `STAGES_THAT_USE_CODE_RAG` (line 253) limits code entity injection to stage 2 only, preventing RAG hallucinations from polluting other stages.
- The prompt explicitly says "If knowledge entities don't have enough info, say so honestly. Never fabricate codes or safety info" (line 389-390).

**Regression risk:** If future prompts expand RAG to all stages (e.g., pulling code entities into stage 3/4), the LLM will hallucinate jurisdictional specifics it doesn't have. **Keep stage-gating.**

### Contractor Voice + Jurisdictional Awareness
**Test:** San Diego ADU demo project ($1.4M–$1.8M cost, Title 24, spa/gym/plunge).  
**Result:** AI response mentioned "Title 24 energy compliance," "San Diego plan check," MEP load specifics, drainage risk.  
**Why it worked:**
- Estimating prompt (estimating-takeoff.production.md, line 4) is a senior-estimator persona ("20 years in California residential"). No hedging, no "consult an engineer" CYA.
- System prompt rule (line 45): "Do NOT recommend consulting an architect, structural engineer, or Building Department." This forces concreteness.
- Regional multiplier logic (line 87-88 example) anchors estimates to San Diego cost basis. No generic national average.
- Confidence signal ties to local comps: "Based on recent San Diego modernist residential comps (North Park, Hillcrest, Ocean Beach), this number holds within ±15%."

**Regression risk:** If prompts drift to generic cost templates (e.g., swap regional multipliers for national average), estimates lose credibility. **Lock regional tables as mandatory input.**

---

## 2. Top 3 AI Behavior Bugs

### Bug 1: AI Doesn't Proactively Offer Help When User Is Lost (Jake, Rico, Hank Gap)
**Symptom:** JAKE-TC-02 ("Wait, is THIS safe?") requires explicit user interrupt. No "I sense you're confused" or "want help here?" affordance.  
**Impact:** Greenhorns (Jake, Rico) and voice-first users (Hank, Maria) hit dead ends silently. They don't ask the AI because they don't know they can ask in-workflow.  
**Root cause:**
- Copilot is purely reactive: `POST /api/v1/copilot` only responds to explicit user query.
- No "empty-step detection" — if a workflow step has no user input yet, no AI proactive nudge fires.
- No ambient listening on text inputs — AI doesn't analyze mid-keystroke confusion signals (e.g., user backspaces 5 times, deletes text, starts over).

**Fix:** See **Proactive AI Assist Pattern** (section 3).

### Bug 2: Cost Parser Misses `$1.4M`–`$1.8M` Format (Demo-Blocking)
**Symptom:** findings.md B-3: "parseAiResponse() in copilot/route.ts has regex for `$X-$Y` and `Xk-Yk thousand`, but not `Xm/Million`."  
**Impact:** Realistic ADU/wellness projects output `$1.4M–$1.8M` ranges. Parser stays null, pre-fill breaks, budget widget shows "No budget yet."  
**Code location:** route.ts, lines 38–49 (COST_RANGE_PATTERNS array).  
**Current patterns:**
```javascript
/\$\s?([\d,]+(?:\.\d+)?)\s?(?:[-–—]|to)\s?\$\s?([\d,]+(?:\.\d+)?)/,  // $X-$Y
/([\d,]+(?:\.\d+)?)\s?(?:[-–—]|to)\s?([\d,]+(?:\.\d+)?)\s?(k|thousand)/i,  // Xk-Yk
```

**Missing:** `$1.4M–$1.8M`, `1.4 million`, `1.4m-1.8m`.

**Fix:** Add two patterns:
```javascript
/\$\s?([\d.]+)\s?(?:m|million)\s?(?:[-–—]|to)\s?\$?\s?([\d.]+)\s?(?:m|million)/i,  // $1.4M–$1.8M
/\$\s?([\d.]+)\s?[km]\s?(?:[-–—]|to)\s?\$?\s?([\d.]+)\s?[km]/i,  // Mixed k/m: $1.4M–$1.8K
```
Wrap parsed values: if unit is `m|million`, multiply by 1,000,000.

### Bug 3: AI Is Reactive Only; Never Volunteers "Next Step" Without Being Asked
**Symptom:** Hank (voice-first, busy foreman) expects "Here's what you should do next" but gets silence between steps.  
**Impact:** HANK-TC-01 voice entry succeeds, but no follow-up like "That's logged. Want to add a photo or move to tomorrow?"  
**Root cause:** Copilot response is a one-shot answer to the user's query. No ambient state machine watching for "user has completed step X" and suggesting next action.  
**Evidence:** copilot.production.md (line 63) says "Keep answers under 250 words" but doesn't mandate next-step guidance. Action buttons are static (stage-based), not dynamic ("based on what you just did").

**Fix:** See **Proactive AI Assist Pattern** (section 3).

---

## 3. Proactive AI Assist Pattern

### Design Spec: When & How the AI Steps In

**Trigger conditions (NO user query needed):**
1. **Empty-step detection:** User lands on a workflow step with 0 saved inputs. After 5 seconds idle, fire a gentle nudge.
2. **Confusion signal:** User starts typing, backspaces excessively (>3 consecutive deletes), clears field repeatedly in 10 seconds.
3. **Voice pause:** Voice input ends, transcript is <10 words or contains "uh" / "um" / "I don't know" — ask "want me to help clarify?"
4. **Manual "I'm stuck" button:** Right-side affordance on every step card: "I'm confused" or "What should I say?" (label TBD via UX copy review).

**What the AI says:**
- **Not:** "You have reached the help system. Please describe your confusion."
- **Yes:** "Looks like you're working on [step name]. Here's what we usually see: [2–3 real examples]. Want me to help you draft an answer?"
- **Example (daily log):** "You're logging today's work. Most foremen mention: what got done, any surprises, safety incidents, crew attendance. What happened on your site?"

**What it does NOT do:**
- Do NOT interrupt every keystroke (maddening on mobile).
- Do NOT suggest an entire answer (user owns the final answer).
- Do NOT appear if user is actively typing (only on idle gaps).
- Do NOT push the AI into a 1:1 chat session (keep it attached to the step).

**Mechanic (technical):**
1. Each step card (`StepCard.tsx` or equivalent) tracks:
   - `last_user_input_at` (timestamp of last keystroke, voice end, or tap)
   - `is_focused` (user is actively in the field)
2. After 5 seconds idle + focused = true, emit event `step:idle-long`.
3. GlobalAiFab (or new `ProactiveAIBubble` component) subscribes to `step:idle-long`.
4. Fire `/api/v1/copilot` with special flag:
   ```
   {
     "query": "[AUTO-PROACTIVE] Step type: ${stepType}, context: ${userInputSoFar}",
     "stage": ${currentStage},
     "workflow_id": ${workflowId},
     "project_id": ${projectId},
     "proactive": true,  // NEW flag
     "step_context": {
       "step_name": "daily-log-entry",
       "step_description": "Describe what happened on your site today",
       "user_input_so_far": "" or "Framing on..." (truncated)
     }
   }
   ```
5. Copilot response for proactive queries:
   - **System prompt addition:** "If this is a proactive assist (user didn't ask), respond ONLY with a short contextual nudge (2–3 sentences) + 1–2 real examples of what we see contractors enter. NO action buttons. NO long explanation."
   - **Response format:** Render in a soft badge/bubble (bottom-left of step card, non-blocking).
   - **Dismissible:** Single X; don't re-trigger for this step this session.

**Integration with GlobalAiFab:**
- GlobalAiFab is the existing right-side chat panel.
- ProactiveAIBubble is a NEW lightweight component (not a full chat).
- Both share the same backend copilot API but differ in:
  - Trigger: explicit user query (GlobalAiFab) vs. idle detection (ProactiveAIBubble).
  - UI: side panel with history (GlobalAiFab) vs. transient badge (ProactiveAIBubble).
  - Content: "Answer my question" (GlobalAiFab) vs. "Here's what we typically see" (ProactiveAIBubble).

**Demo-critical for:**
- **Jake (greenhorn):** JAKE-TC-02 ("Is this safe?") becomes a proactive nudge on code-compliance steps.
- **Hank (voice-first):** HANK-TC-01 daily log gets a follow-up suggestion: "Got it logged. Want to add a photo or note a safety incident?"
- **Rico (confused):** Landing on any step triggers "What should I enter here?" without him asking.

---

## 4. Citation Discipline

### The Problem
When AI cites "IBC 903.2.1" or "CA Title 24 Part 3," the link must resolve to a real entity or user gets a 404.

**Current state:**
- Copilot response includes `[Title](entity:INDEX)` format (route.ts line 375–379).
- IndexedDB / retrieval system maps entity:INDEX to `e.id` (entity database ID).
- But if the entity doesn't exist, or the link is broken, user clicks and gets error.

### Citation Verification in CI

**Test spec:**
1. **Citation extraction:** After copilot responds, regex-match all `[label](entity:N)` patterns.
2. **Entity resolution:** For each matched INDEX, query the knowledge base: `SELECT * FROM knowledge_entities WHERE id = entities[INDEX].id`.
3. **Link validation:** For each entity, verify the entity page exists at `/api/v1/entities/{entity.id}` or `/entities/{entity.slug}`.
4. **CI gate:**
   - **FAIL:** Any entity:INDEX that resolves to null, or any entity whose detail page returns 404.
   - **PASS:** All 100 most recent copilot responses + all entity links they cite resolve within 200ms.

**Implementation sketch (pseudo-code):**
```yaml
# In your CI pipeline (GitHub Actions / GitLab CI):
test-citation-links:
  script:
    - fetch_recent_copilot_responses(limit=100)
    - for response in responses:
      - citations = extract_entity_citations(response.text)
      - for entity_index in citations:
        - entity = knowledge_entities[entity_index]
        - if !entity: fail("Entity ${entity_index} not found")
        - status = curl -o /dev/null -s -w "%{http_code}" /api/v1/entities/{entity.id}
        - if status != 200: fail("Entity link broken: ${entity.id}")
    - pass if all links resolve
```

**Where to implement:**
- Hook: CI job after copilot model updates or after data/amendments/ changes.
- Location: `.github/workflows/test-copilot-citations.yml` (if using GitHub Actions).
- Frequency: Pre-merge (every PR that touches `copilot.production.md` or `data/amendments/`).

**What it catches:**
- Typos in entity IDs (entity:999 but only 50 entities exist).
- Stale entity references (entity was deleted, link still in copilot response).
- Dead entity detail pages (entity exists in DB but detail endpoint is broken).

---

## 5. Voice-First Interaction Model (v1.5)

### Current State (v1.0)
- **Input:** `useSpeechRecognition` hook on `WorkflowPickerSearchBox` (search bar only).
- **Transcript → action:** "Estimate the job" → navigates to estimating workflow.
- **AI response:** Text only, streamed to copilot panel.

**Gaps:** No voice-to-speech output, no continuous listening during workflow, no voice-first affordances for Hank/Maria/Curtis.

### v1.5 Design: Voice-Reply + Persistent Listening

#### Component A: Voice Output (AI Speaks Back)
**Trigger:** When AI completes response (copilot stream done), check user settings.  
**If voice enabled:**
1. TTS (text-to-speech) on the AI response (via Web Audio API or third-party service like ElevenLabs).
2. Playback in background (don't block user interaction).
3. Cancel button (X) to stop playback.
4. Volume control (user preference: mute, 50%, 100%).

**Voice persona:** Foreman tone (male, neutral accent, 1.2× playback speed for clarity on noisy sites).

**UX note:** Only read the first 200 words of the response; trim action buttons from TTS (users see buttons, don't need them read aloud).

#### Component B: Persistent Voice Listening (Optional, Accessibility)
**Trigger:** Toggle in settings: "Always listening for voice commands."  
**If enabled:**
1. Microphone stays active after user submits a workflow step.
2. Listen for command words: "help," "next," "save," "what should I say," "I'm stuck," "show me options."
3. Route recognized commands to `/api/v1/voice-commands` (new endpoint) which maps to proactive AI assist or step navigation.

**Example flow (Hank on job site):**
- Hank finishes voice daily log: "Framing done, electrical tomorrow."
- BKG saves entry.
- Microphone stays listening (low-power, no UI change).
- 3 seconds later, Hank says "help" (thinking about adding a photo).
- BKG fires proactive assist: "Want to add a photo of that water stain?"
- Hank says "yes" (voice confirms).
- Photo picker opens, one-handed.

**Non-goals for v1.5:**
- Do NOT implement always-on listening from app launch (battery drain, privacy concern).
- Do NOT route voice commands to text search (too many false positives on job sites).

#### Component C: Voice-First Navigation (Improve Current)
**Current:** Voice search on `/killerapp` landing only.  
**v1.5 improvement:**
1. Add voice button (🎤 icon) to every step card (not just search bar).
2. Tapping 🎤 on a step opens `<VoiceInputModal>`: "Tap to start, release to stop" (push-to-talk, not always-listening).
3. Transcribed text appears in the step field.
4. User can edit or say "again" (re-record).

**Why push-to-talk:** Hank on a 85 dB job site gets better accuracy with explicit start/stop vs. "is this speech or background noise?"

#### Component D: Voice Command Vocabulary
**Define command set for stage 4 (Build):**
```
"save" → submit step
"next" → move to next step
"back" → previous step
"help" → proactive assist
"photo" → open camera / photo picker
"log this" → save current voice input as daily log
"safety" → open safety incident report step
"what should I say?" → proactive assist
"show options" → reveal step dropdown/choices
"done" → finalize workflow
```

**Pre-train:** Copilot system prompt includes: "If user voice input is one of these commands, respond by calling the action, NOT by answering the question. Example: User says 'save' → BKG calls step submit, not 'I'll save that for you.'"

### v1.5 Implementation Roadmap

| Component | Effort | Priority | Owner |
|---|---|---|---|
| A. Voice output (TTS) | 8h | High (Maria, Hank demo) | Frontend + AI integration |
| B. Persistent listening (toggle) | 12h | Medium (phase 2) | Frontend + audio infra |
| C. Voice button per step | 4h | High (UX affordance) | Frontend |
| D. Command vocab + routing | 6h | High (stage 4 workflows) | Frontend + copilot prompt update |

**Dependencies:** A (voice output) is independent; ship first. B/C/D can ship in parallel post-A.

---

## 6. Regression Prevention & Testing

### What to Watch
1. **Hallucination guard:** Quarterly spot-checks on fabricated code sections (like Pete's NEC 919.7 probe). If AI ever generates plausible-sounding false citations, revert to earlier prompt version.
2. **Cost parser:** Every new estimate response, log the parsed low/high costs. If >5% are null, alert on cost pattern changes (e.g., AI starts using "hundreds of thousands" instead of "$X–$Y").
3. **Proactive assist:** A/B test idle-nudge frequency. If engagement drops (users dismiss >80%), reduce trigger threshold from 5s to 10s. If adoption spikes >20%, measure time-to-completion on steps.
4. **Voice accuracy:** Hank field test: measure transcription accuracy ≥90% on daily logs in 85 dB noise. If drops below 85%, flag for model tuning.

### Metrics to Track (RSI Loop 5)
- `copilot_hallucination_rate`: % of responses with entity:INDEX links that resolve (target: 100%).
- `cost_parse_success_rate`: % of estimate responses with non-null estimated_cost_low/high (target: >95%).
- `proactive_assist_engagement`: % of steps with nudge-triggered AI response (target: 20–40%, adjust on feedback).
- `voice_transcription_accuracy`: % of voice inputs transcribed correctly, grouped by noise level (target: ≥90% at ≤85 dB).

---

## Summary

| Item | Top Bug | Fix | Priority |
|---|---|---|---|
| **Proactive assist** | AI never volunteers help when user is stuck (Jake, Rico, Hank) | Add idle-detection trigger + gentle nudge bubble to step cards; integrate with ProactiveAIBubble component | HIGH (demo-critical) |
| **Cost parser** | `$1.4M–$1.8M` format unrecognized, nulls pre-fill | Extend COST_RANGE_PATTERNS in route.ts with `m/million` regex; multiply by 1M when unit detected | HIGH (B-3, budget display) |
| **Reactive-only** | AI never suggests "what's next" without being asked | Pair cost-parser fix with proactive-next-step prompt rule: after step completes, ask "want to add a photo / move to next stage?" | MEDIUM (Hank satisfaction) |
| **Citation discipline** | Entity links may break silently (404s) | Add CI gate: validate all entity:INDEX citations in recent copilot responses resolve within 200ms pre-merge | MEDIUM (reliability) |
| **Voice-first model** | No voice output, no listening post-input, limited affordances | Implement TTS on copilot response (A); add voice button to each step (C); define command vocab (D); persistent listening as phase 2 (B) | HIGH (Maria, Hank, Curtis adoption) |

