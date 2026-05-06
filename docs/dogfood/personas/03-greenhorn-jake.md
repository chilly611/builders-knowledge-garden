# Greenhorn Jake — First-Year Trim Carpenter Solo Operator

**Persona ID:** `03-greenhorn-jake`  
**Age:** 24, Boston metro, solo trim carpenter (1 year licensed)  
**Tech Stack:** Native voice commands, Discord, Notion, TikTok  
**Confidence:** Fakes it with clients, genuinely terrified of code violations and lawsuits  

---

## Persona Snapshot (Jake's Voice)

Yo, I'm Jake. Literally just got my trim license after leaving a framing crew — way more money solo but also way more stress because it's ALL on me now. I'm not gonna lie, I'm tech-native. I live in Discord, my estimating lives in Notion, I post my work on TikTok (clout is real). But the thing that keeps me up at night? Code stuff. Like, I know my framing is solid, but what if I miss something about window headers or egress windows and some inspector decides I'm hacking it and it ends up in court? I've heard horror stories. I need the AI to be my lawyer buddy — in plain English, no jargon, and **I need receipts and photos** because if a client ever comes back and says "but you said X," I need proof it was in the system.

I'll try every keyboard shortcut, every voice command, every URL hack. I find bugs others miss because I'm not afraid to poke around. But I also respect that the app needs to keep me from accidentally breaking the law.

---

## What Jake Cares About (Priority List)

1. **Not Getting Sued** (CRITICAL)  
   Code compliance that's plain English, not contractor-bluff jargon. When the AI says "this header needs to span 10 feet," I need to understand *why* and have proof I asked.

2. **AI Handholding Through Hard Moments** (CRITICAL)  
   Mid-job, I need to ask "wait, is THIS safe?" and get a straight answer in 30 seconds, not dig through PDFs.

3. **Receipts & Photos for Everything** (CRITICAL)  
   Every contract, every code reference, every approval needs to be in the app. If a dispute happens, it's documented.

4. **Contract Templates I Can Sanity-Check** (IMPORTANT)  
   I can't hire a lawyer, so I need templates that are real but also readable. And I need the AI to flag obvious gaps before I send to a client.

5. **Learning Code Rules in Plain English** (IMPORTANT)  
   Not memorizing code books — understanding *what contractors actually get wrong* and *why it matters*.

6. **Bluffing Competence with Clients** (IMPORTANT)  
   Clients expect confidence. I need the app to help me talk through problems without sounding like I don't know what I'm doing. Voice notes, quick summaries, confidence-builders.

7. **Jurisdiction Differences** (NICE)  
   MA vs. RI rules are different. The app should know that. I shouldn't have to guess.

8. **Video Upload for Client Progress Updates** (NICE)  
   I want to send my clients "here's what we did today" video clips. Keeps them happy, gives me receipts.

---

## Test Cases — Jake's Dogfood Suite

**Format:** `JAKE-TC-N` | Priority | Category | Scenario | Expected Outcome | Jake-Specific Assert

---

### JAKE-TC-01 | CRITICAL | Workflow Entry  
**Voice Search to Code Compliance Lookup**

Launch the app cold. Say: "I just framed a window opening and need to check egress codes."  
Voice search routes to **Code Compliance Lookup (q5)** workflow. Result renders cleanly.  
_Jake Assert:_ "I found the code help with my voice. No typing, no guessing. I trust this route me right."

---

### JAKE-TC-02 | CRITICAL | AI Chat Mid-Workflow  
**Interrupt & Ask "Is This Safe?"**

In Code Compliance workflow, at the structural codes step. I've entered my scope: "2x6 header, 8-foot opening, single-story residential."  
Code analysis returns. I interrupt by typing: "Wait — how do I know if this is actually safe for snow load in Boston?"  
AI answers in-line within the step card. Explains which variable (snow load zone, truss spacing, material grade) matters for Boston specifically. Links or quotes the relevant IRC section in plain English.  
_Jake Assert:_ "I got an answer WITHOUT leaving the workflow. It wasn't scary jargon. It told me what to check."

---

### JAKE-TC-03 | CRITICAL | Contract Templates  
**Load, Edit, and Sanity-Check Before Sending**

"Lock down the paperwork" (q4) workflow. Pick **Client Agreement** template. Fill in: Owner name, address, scope (trim carpentry on kitchen remodel, 320 sqft, 3-week timeline), price ($8,500), payment terms (net-30).  
Template auto-fills. I read it. The checklist step shows: "Payment terms present? ✓ | Warranty clause present? ✓ | Change-order process clear? ✓"  
I flag: "Warranty — should I promise 2-year paint or 1-year?"  
AI suggests based on regional norms + scope complexity. I approve or edit. Export PDF ready to send to client.  
_Jake Assert:_ "I felt like a professional. The template wasn't scary. I got the AI to review my thinking before I sent it. No lawsuit risk."

---

### JAKE-TC-04 | CRITICAL | Photo Upload & Receipts  
**Document a Job With Photos Mid-Project**

"Daily logbook" (q15) workflow. Today's work: framed window opening, ran electrical rough. I voice-log: "West wall window done, header went in clean. Electrician coming tomorrow for rough-in. Found a water stain in the south corner — need to investigate."  
Upload 4 photos: header detail, water stain close-up, window opening before/after, crew group shot.  
AI categorizes: Progress (window done), Quality (water stain flagged), Schedule (electrical tomorrow).  
Photos are tagged and stored. All saved in the project file.  
_Jake Assert:_ "If my client ever questions whether that water stain was there before I started, I have a photo and a timestamp. I'm covered."

---

### JAKE-TC-05 | IMPORTANT | Code Rule in Plain English  
**Explain a Violation Without Jargon**

Code Compliance Lookup. I've uploaded plans for an ADU (accessory dwelling unit) rough-in in MA. AI flags: "IRC R303.2 — every room needs minimum 10 sq ft of glazing (window area)."  
I don't know what that means. I ask: "ELI5 — why?"  
AI: "Imagine you're in a small bedroom with no windows on a hot day. Illegal egress = illegal room. Windows = emergency exit + fresh air. MA requires it. If you miss it, inspector fails you and you have to cut a hole in the wall later (expensive)."  
Then: "Your bedroom is 8×10 with one 2×2 window (4 sq ft). You need ~2.5 more sq ft of glass. Either add another window or make the existing window bigger."  
_Jake Assert:_ "I understood why it matters. I'm not memorizing code. I'm learning WHAT builders get wrong and WHY I should care."

---

### JAKE-TC-06 | IMPORTANT | Contract Void-Risk Flag  
**AI Flags Missing Clause Before I Send**

Lock Paperwork workflow. I fill in Client Agreement for a $12k kitchen trim-out. I skip the "What happens if the scope changes?" section.  
On the checklist step: "Specify change-order approval process?" — AI shows a YELLOW flag: "This contract doesn't say how you'll handle mid-project changes. Without it, clients can demand extras without paying, or blame you for scope creep. Recommend adding a 'any changes need written approval + signed CO.'"  
I either accept the boilerplate or write my own.  
_Jake Assert:_ "The AI protected me from a legal gap. I would have sent this contract and regretted it. Now I'm smart."

---

### JAKE-TC-07 | IMPORTANT | Jurisdiction Awareness  
**Same Scope, Different Rules for RI vs. MA**

Code Compliance Lookup. I enter: "Window replacement, existing residential house, MA."  
AI returns: "MA adopts 2021 IBC with amendments. Key MA rule: window sills must be 36" above grade in habitable rooms. Original opening was 32" (non-compliant). You need to either raise the window or move the opening."  
I change the location to "RI" on the input.  
AI re-runs: "RI adopts 2020 IBC, no sill-height amendment for windows. Your 32" sill is compliant in RI. Same window, different state, legal or illegal — RI allows it."  
_Jake Assert:_ "The app knew my state rules. I didn't have to second-guess whether a code change meant my quote was wrong."

---

### JAKE-TC-08 | NICE | Keyboard & URL Hacks  
**Power-User Shortcuts (Jake Loves This)**

- Press `/` — open command palette (search any workflow by label or ID)
- Press `v` — open voice input on current step
- Press `c` — copy current step card output to clipboard
- URL: `/killerapp/workflows/code-compliance?scope=window-opening&location=ma` — pre-fills the workflow
- URL: `/killerapp?project=jake-kitchen-2026&stage=3` — jumps to Plan stage for a specific project

I discover these by poking around. They feel like magic. I use them every day.  
_Jake Assert:_ "This app respects keyboard warriors. I'm not clicking through menus. I'm flying."

---

### JAKE-TC-09 | IMPORTANT | XP + Badge Visibility  
**See My Reputation Build**

After completing 5 workflows (Code Compliance, Contract Templates, Estimating, Sequencing, Hiring), I've earned 300 XP. The app shows a rank badge: "Apprentice → Estimator" (50 XP), "Code Scholar" (100 XP), "People Manager" (50 XP).  
Profile shows: "Jake Thompson — Estimator + Code Scholar, 300 XP." I can screenshot it for LinkedIn.  
_Jake Assert:_ "The app is building my reputation. This is real social proof, not a game. I'm proud of it."

---

### JAKE-TC-10 | CRITICAL | Missing Data State  
**App Tells Me What I'm Missing Before I Proceed**

Seq the Trades workflow (q6). I fill in phases (demo, framing, MEP, drywall, paint) and dependencies. Step 5 asks for "Total weeks on the job."  
I leave it blank by accident.  
I try to proceed to the bottleneck analysis step. Error: "We need a timeline to find your bottleneck. How many weeks are you planning for?"  
Not a scary error — a helpful question.  
_Jake Assert:_ "The app didn't let me guess. It asked me to fill in the gap. No confusion downstream."

---

### JAKE-TC-11 | NICE | AI Response Tone Calibration  
**AI Sounds Like a Tradesperson, Not a Chatbot**

Expense Report workflow. I upload 15 receipts (lumber, fasteners, paint, labor). AI categorizes them.  
Response tone: "You've got $8,200 in materials, $3,400 labor, $1,200 rental gear. You're tracking clean — no red flags. Materials are 2% under budget (nice work sourcing). Labor is tracking on plan. Keep it up."  
NOT: "EXPENSE CATEGORIZATION COMPLETE. 15 ITEMS PROCESSED."  
_Jake Assert:_ "The AI sounds like my foreman, not a robot. I believe it. I'll trust it more next time."

---

### JAKE-TC-12 | IMPORTANT | Video Upload for Progress  
**Send Client a 30-Second "Here's Today" Clip**

Daily Logbook (q15). Video upload option appears alongside voice input.  
I shoot a 20-second clip on my phone: "Window framing done, it's square and level, electrician coming tomorrow."  
Upload. AI transcribes: "Window framing complete. Square and level. Electrical rough-in scheduled for [date]."  
I share a client-facing link. Client sees the video, timestamp, and AI-generated summary. Gives them confidence. Gives me a receipt.  
_Jake Assert:_ "My client saw proof of work today. I'm not radio-silent. They trust me more. And the AI wrote the caption for me."

---

## Gaps / Wishlist for Jake

1. **"Is This Safe?" Emergency Button**  
   Mid-workflow quick-ask without leaving context. RFI-style: snap a photo, ask the question, get a 2-minute answer.

2. **State License Lookup Integration**  
   "Is electrician Joe licensed in MA?" — app checks against state DB, flags if license expired or inactive.

3. **Client Dispute Resolution**  
   "If my client claims I said X and I didn't, can the app show our conversation history?" — Built-in mediation trail.

4. **Plain-English Code Summaries**  
   When code analysis returns, a 1-paragraph human-readable summary at the top, then details below. (Currently: might be too dense.)

5. **Lien Filing Integration**  
   If I don't get paid, the app auto-fills my state's lien notice with my project data. (Currently: manual.)

6. **Cost Variance Warnings**  
   If I'm tracking 10% over budget at the midpoint, the app alerts me and suggests where to save. (Currently: I have to watch manually.)

---

## Demo-Critical Subset (For Jake's POV)

These five tests **MUST pass** for Jake to ship confidence and come back:

1. **JAKE-TC-01** — Voice route to Code Compliance  
   *"If voice search breaks, I'm done. That's the whole reason I installed this."*

2. **JAKE-TC-02** — Mid-workflow AI chat (interrupt & ask "is this safe?")  
   *"I need to know the AI understands my question INSIDE the workflow. Not in a sidebar. Not in a new tab."*

3. **JAKE-TC-03** — Contract template sanity-check before send  
   *"I WILL send a contract without reviewing it if the process is painful. Make it easy or I'll use Google Docs and regret it."*

4. **JAKE-TC-06** — AI flags missing contract clause  
   *"If the app doesn't catch my mistakes, what's the point? This is the liability protection moment."*

5. **JAKE-TC-04** — Photo uploads + timestamps in project file  
   *"Without photos and dates, I have nothing to prove. This is how I protect myself from disputes."*

---

## What Matters Most

Jake is **task-oriented, suspicious of jargon, and terrified of liability**. He'll adopt the app if it:

- **Sounds like a tradesperson**, not a corporate AI  
- **Catches his mistakes** before they become legal problems  
- **Keeps receipts** (photos, timestamps, contract versions)  
- **Works with voice** when he's on site with his hands full  
- **Explains the why**, not just the rule  
- **Respects his time** — no 5-step dialogs for simple questions  

He'll evangelize it to his crew if it also gives him **social proof** (badges, XP) that he's building real expertise, not just spinning in circles.
