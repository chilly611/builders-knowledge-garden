# Recursive Self-Improvement: Builder's Knowledge Garden's Compounding Moat

## The Bet

AI gets better faster than the marketplace can keep up. Only systems that compound from real-world use—the messy signals buried in every single contractor decision—will stay sharp enough to defend against better-funded competitors. Builder's Knowledge Garden is wired around five feedback loops that fire silently on every query, every workflow run, every vendor lookup. These loops watch the gap between what the system said and what actually happened. That gap is currency. A well-funded competitor can copy our UI, even copy our prompts—but they cannot buy our data. And they will not stay relevant without it.

---

## The Five Loops

### Loop 1: Code & Data Drift Detection

**Definition:** Every jurisdiction amendment, every NEC update, every code edition becomes a delta.

**What it watches:** New code releases from ASHRAE, IBC, IRC, NEC, IPC, IMC, and local amendments. Heartbeat job runs daily (`vercel.json` cron `/api/v1/heartbeat` at 11am UTC) to pull the latest code databases, parse them, and detect which sections changed since the last run.

**What it rewrites:** `src/lib/code-sources.ts` and `data/amendments/{jurisdiction}.json`. When the NEC moves receptacle spacing rules or when a local AHJ publishes a variance, the system detects it, flags it as a delta, and (after human review) updates the knowledge index.

**Why a competitor can't replicate:** Competitors can license the same code databases we do, but they get the same flat snapshot. They don't know which amendments their contractors are hitting in the field. We observe the full lifecycle of every project—from "Size Up" through "Reflect"—so when code is misapplied, our specialists flag it, and we know the delta matters because it affected real work.

---

### Loop 2: Specialist Prompt Improvement

**Definition:** Every wrong answer is a training signal. The system learns.

**What it watches:** Telemetry on every specialist call (`src/lib/rsi-instrumentation.ts` logs each run into `specialist_runs` table). Input: the question. Output: the narrative + structured answer. User feedback: thumbs_up, thumbs_down, correction, or outcome signals (success/failure) captured via `recordFeedback()` in `src/lib/rsi/feedback.ts`.

**What it rewrites:** `docs/ai-prompts/*.md` and prompt versions (v1, v2, production variants). The RSI synthesis engine (`src/lib/rsi/synth.ts`) clusters feedback by specialist and signal type, calls Claude to propose a concrete delta, and (after human approval in `src/lib/rsi/deltas.ts`) auto-deploys the updated prompt. Example: if 5 contractors report that the electrical specialist is missing GFCI requirements in kitchens, the system proposes a prompt patch that adds an explicit check for wet-location receptacles.

**Why a competitor can't replicate:** Competitors can hire prompt engineers. We have prompts that learned from thousands of real specialist calls, clustered by failure pattern, and refined by domain experts. Our prompts are not static; they're alive. Every Thursday night, the synthesis engine runs (`rsi/heartbeat` at 5pm UTC) and proposes improvements. The delta is reviewed by an expert, then deployed. Competitors see the same architecture as us and can copy our system design—but they don't have the 1,000+ failed specialist calls we've learned from.

---

### Loop 3: Workflow Shape Evolution

**Definition:** Every drop-off becomes a UX rewrite. If contractors abandon "Plan it out" at 40%, we change "Plan it out."

**What it watches:** Drop-off metrics on every workflow stage. Contractors flow through seven stages: Size Up → Lock it in → Plan it out → Build → Adapt → Collect → Reflect. We log entry, exit, user edits, and time spent in each. If the "Plan it out" stage has a 40% drop-off, the system flags it.

**What it rewrites:** Workflow step definitions in `src/app/killerapp/workflows/`, step prompts, and decision gates. If "Plan it out" fails, we retrain the copilot, re-order the input fields, or split it into two steps.

**Why a competitor can't replicate:** Competitors can A/B test workflows. We don't need to—we see the full journey. When a contractor drops out of "Plan," we know whether they abandoned because they got confused, because the estimate was wrong, or because they realized scope change. That granularity comes from observing the entire lifecycle and having specialists and copilots logging structured decisions at each gate. A competitor running parallel experiments sees friction; we see the reason for it.

---

### Loop 4: Vendor Adapter Accuracy

**Definition:** Every wrong price, every missed lead time becomes a retrain.

**What it watches:** Every vendor lookup, every price quote returned to the contractor, every actual order placed afterward. `src/lib/resource-broker/` logs queries and responses. When a contractor orders materials, we log the actual price paid vs. what BKG quoted.

**What it rewrites:** Vendor adapter weights, fallback rankings, and pricing adjustment factors in the resource broker configuration. If we consistently overestimate drywall pricing in Texas, the adapter learns to apply a -8% factor.

**Why a competitor can't replicate:** Competitors can license vendor APIs. We have feedback from thousands of actual procurement decisions. When BKG says "this roof will cost $12K," and the contractor pays $11.2K, that delta trains the next quote. Over time, our quotes inch closer to reality because we observe the ground truth on every project that reaches the "Collect" stage.

---

### Loop 5: Copilot Quality

**Definition:** Every latency spike, every missed citation, every user edit becomes a system prompt revision.

**What it watches:** Latency, citation accuracy, user correction patterns. When copilot responses take >3 seconds, when a citation points to the wrong section, when a contractor has to edit 30% of the narrative—all of these are signals.

**What it rewrites:** `docs/ai-prompts/copilot.production.md` (the system prompt that shapes every copilot response). If latency spikes, the synthesis engine proposes a shorter context window or a different retrieval strategy. If citations are wrong, it proposes a tighter prompting constraint or a fallback to the safer "deferred_to_human" flag.

**Why a competitor can't replicate:** Competitors run copilot on top of generic LLMs. We run a copilot that has been refined by 100,000+ individual contractor interactions. The copilot knows to cite NEC 210.52(A) instead of 210.52, because it learned the difference from user corrections. It knows to add a latency buffer before the Reflect stage, because it learned that contractors reviewing end-of-project lessons are less time-pressured. A generic copilot does not have this domain-specific wear-in.

---

## What's Already Wired

The RSI infrastructure is not theoretical. Telemetry is firing on every specialist call. The code database heartbeat job runs daily, parsing amendments and amendments variants. Signal logs are captured and queryable.

**Today:**
- Every specialist call logs to `specialist_runs` table: input, output, latency, model version, user feedback.
- Every user feedback signal logs to `rsi_feedback`: thumbs_up, thumbs_down, correction, outcome_success/failure, ahj_contradiction.
- Every broker query logs to `broker_queries`: query, response, latency, sources, warnings.
- Daily heartbeat (`/api/v1/heartbeat`, 11am UTC) updates code databases in `src/lib/code-sources.ts`.
- Daily RSI heartbeat (`/api/v1/rsi/heartbeat`, 5pm UTC) polls feedback, clusters by specialist, and triggers synthesis.

**Tomorrow:**
The synthesis engine will run nightly and automatically propose prompt deltas. Each delta will go through human-in-loop approval (pull request or dashboard UI) before auto-deploy. The loop closes: feedback → synthesis → proposal → review → deploy → next day's feedback on the improved specialist.

**The metric that matters:** Query volume. The synthesis engine needs ~100 queries per specialist per week to form reliable signal clusters. We have 22 specialists active. That's a floor of 2,200 queries/week. Today we're logging every call; we need volume to spin the loop. Once we hit 2,200 queries/week consistently, the delta proposals will start arriving daily, and competitors will start asking "how is their product getting sharper every week?"

---

## Why It Compounds

### (1) BKG Owns the Data Layer

No contractor can buy what we've learned. We own the knowledge graph: jurisdictions, code editions, vendor catalogs, contractor outcome data. Competitors can license code databases and vendor APIs. They cannot license "what actually happened on Job #47,392 in Texas when the inspector found a framing violation." They don't know why that job slipped. We do, because the contractor logged it in Reflect.

### (2) BKG Is the Only System Observing the Full Lifecycle

Competitors operate on fragments. Estimators see takeoffs. Procurement systems see orders. Project management sees schedules. We see all of it: Size Up → Lock → Plan → Build → Adapt → Collect → Reflect. Every stage is a data source. When something breaks—a wrong estimate, a vendor miscommunication, a code misapplication—we know where in the journey it happened and what decision led to it. That signals richer feedback than any isolated view.

### (3) The Contractors We Serve Are the Segment Everyone Underserves

Small and mid-sized residential/commercial contractors—the 50K-person addressable market—are too niche for enterprise software vendors and too small for white-glove consulting. They generate data that nobody else collects. They use BKG because they have no other choice. And as they use it, they're training a system that gets sharper for their specific problems every single day.

---

## Knowledge Gardens Umbrella as RSI Multiplier

The same five loops scale across verticals. Health Garden's "Loop 2: Clinician Prompt Improvement" trains the same synthesis engine: feedback on diagnostic recommendations, clustering by signal, LLM-proposed deltas, human review, auto-deploy. Orchid Garden's "Loop 1: Regulatory Drift Detection" watches FDA/clinical guidance changes the same way BKG watches code updates.

The platform-of-platforms thesis: the umbrella is the RSI engine. The gardens are the inputs. Compounding happens at the engine layer, not the garden layer.

- **Shared infrastructure:** `src/lib/rsi/synth.ts`, `src/lib/rsi/feedback.ts`, `src/lib/rsi/deltas.ts` are garden-agnostic. They take specialist runs and feedback as input, output proposed deltas.
- **Garden-specific specialization:** Each garden defines its own specialists, code sources, and vendor brokers. Health Garden's code sources are FDA/HIPAA docs. BKG's are NEC/IRC.
- **Cross-domain learning (future):** If the synthesis engine learns that "prompt brevity decreases correction rate," that insight trains all five gardens. If "contextual entity embedding improves citation accuracy," all five gardens benefit.

Over time, the umbrella compounds faster than any single garden could alone. OpenAI could build a Health Garden. Procore could build an Estimating Garden. Neither can build all five gardens simultaneously and orchestrate the feedback loops across them. The umbrella is the moat.

---

## What We Need to Make This Real

1. **Query Volume.** Target 2,200 queries/week (100/specialist/week) to reliably form signal clusters. Today we log every call; we need usage to spin the loop. This is the gas pedal.

2. **Permission to Retrain.** Legal review on the human-in-loop approval process. Can we auto-deploy approved deltas? What liability gates exist? Once cleared, we enable 1-click delta approval by domain experts.

3. **Public-Facing Delta Dashboard.** Contractors and domain experts need to see what improved and why. Transparency builds trust. "Loop 2 Improvement: Electrical specialist now catches 15% more GFCI violations because of user corrections on projects in CA, TX, FL."

4. **Partnerships with Code/Data Providers.** Codified feed from code publishers (ASHRAE, ICC, local AHJs) for faster drift detection. Today we poll; tomorrow we subscribe. Faster signals = faster loops.

5. **Capital.** The umbrella thesis requires building four more gardens (Health, Orchid, etc.) in parallel with scaling BKG. That's a multi-year, multi-disciplinary effort. Investors who see the moat understand the bet: this is a 10-year play, not a 2-year exit.

---

## Summary

Builder's Knowledge Garden's defensibility is not in the prompts, the UI, or the specialist architecture. It's in the feedback loops. Every contractor question is a data point. Every correction is a training signal. Every project outcome is ground truth. We turn that into deltas—small, reviewable improvements to prompts, entities, adapters, and workflows. Competitors can catch up to our prompts. They cannot catch up to our loops. By the time they build the infrastructure to learn from feedback, we will have learned 100 times over. The moat is recursive self-improvement.
