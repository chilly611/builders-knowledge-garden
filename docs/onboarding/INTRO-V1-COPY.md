# /intro — V1 copy reference (as currently shipped)

Every line of text the investor sees, in order. Use this as the starting point for your rewrite — the V2 spec at `DEMO-CINEMATIC-SPEC-V2.md` proposes my read of the changes, but this file is the **untouched current state** for you to riff off.

Line locations are in `src/app/intro/page.tsx`.

---

## Persistent chrome (every act)

**Top-left** (`TopBar`, L95-100):
> KNOWLEDGE GARDENS

**Top-right** (`TopBar`, L116-120):
> Skip → Start building

**Bottom-center** (`ActIndicator`, L127):
Pills labeled, with active one expanded:
> Umbrella · The problem · #aikidotheAI · Live killer app · Tomorrow

**When paused** (`ActIndicator`, L181):
> Paused · press space to resume

---

## Act 1 — The umbrella (6s)

**Three chrome dot labels** (L282/290/298) — orbit out from the hammer:
> Killer App  ·  Dream Machine  ·  Knowledge Garden

**Typewriter line 1** (L304):
> the operating system for knowledge work,

**Typewriter line 2** (L309):
> one vertical at a time.

---

## Act 2 — The problem (12s, currently — V2 proposed 10s)

**Eyebrow** (L296 in original, now around L320 with offsets):
> THE DAILY REALITY

**Headline** (h2, two lines):
> The job is hard.
> The tools shouldn't be.

**Vignette titles** (cycle every 2.8s, L271-275):
1. Estimate on a napkin
2. Code lookup by text
3. Contract in Word
4. Schedule on a whiteboard

**Vignette meta** (under each title, L333-336):
> Every contractor we've talked to. Every day.

**SVG vignette contents (rendered as art):**

*NapkinArt:*
> drywall ~ $4800?
> frmg crew × 3 days
> **$48k?**

*TextThreadArt:*
> @Mike u know stair handrail code?
> idk lemme ask jim
> …3 days later

*ContractArt:*
> AGREEMENT
> This agreement between [CLIENT NAME]
> and Contractor for work at
> [ADDRESS GOES HERE]
> for the sum of $___________
> fonts not matching ↑↑↑

*WhiteboardArt:*
> Mon — framing  *(crossed out)*
> Tue — drywall?
> Wed — plumb (J. out?)
> **WHO'S ON MONDAY???**

---

## Act 3 — #aikidotheAI (22s, trimmed from 30s)

**Headline** (large, multi-color, L460-465):
> #aikidotheAI

(`#` is red, `aikido` is ink, `the` is warm, `AI` is ink)

**Sub** (single line, L468):
> Voice in. Estimate, code, contract, schedule out. The platform does the parsing.

**Listening badge** (L483):
> Listening

**Voice transcript** (typewriter, L407-408):
> "I want to build a custom modern farmhouse in Marin. 1,800 square feet. 3 bed 2 bath. Slab on grade. Late summer 2026."

**Cards (right panel), in order they stream in:**

*CardProject (lands at 2s, L548-552):*
> PROJECT CREATED
> **Modern farmhouse in Marin**
> CRC R301 · R403.1 · $750k–$1.06M

*CardEstimate (lands at 5s, L555-571):*
> AI ESTIMATE
> Foundation        $ 86,400
> Framing           $142,800
> Title 24 envelope $ 71,200
> MEP rough-in      $ 98,100
> **Midpoint        $905,000**

*CardCode (lands at 9s, L574-580):*
> CODE CITATION
> **CRC R327 — Wildland-Urban Interface**
> Class A roof · ember-resistant vents · ignition-resistant siding

*CardContract (lands at 14s, L583-589):*
> CONTRACT DRAFT
> **Client Agreement · Modern farmhouse in Marin**
> Contract amount $905,000 · Marin County, CA

*CardJourney (lands at 18s, L592-621):*
> JOURNEY
> [Size up]  →  **[Lock it in]**  →  [Plan it out]

(L is the only filled pill; Size up is gray-on-paper, Plan it out is dashed-outline-only)

---

## Act 4 — Live killer app (user-controlled)

**Eyebrow** (L648):
> THE ACTUAL PRODUCT — RIGHT NOW

**Headline** (L649-651):
> You can use it. Real data. Live route.

**Iframe contents:**
The live `/killerapp/budget?project=…&hideShell=1` route — not copy, the actual app.

**Floating prompt** (fades after 6.5s, L680):
> Hover the categories →

**Continue button** (L690-692):
> Continue →

**Ghost link** (L693-695):
> Open full app in a new tab

---

## Act 5 — The vision (12s — V2 proposed 8s)

**Vertical labels** (around the tree, L857):
> BUILDER'S · HEALTH · TOXICOLOGY · ORCHID · COMING

**Typewriter line 1** (large, L863-865):
> Today: Builder's Garden.

**Typewriter line 2** (smaller, L868-871):
> Tomorrow: every domain that has a knowledge problem.

**Primary CTA** (red, L777-779):
> Start building →

**Ghost CTA** (L780-782):
> Show me the demo project →

---

## Source signal (Chilly, 2026-05-20 PT)

For reference while rewriting — the prompt you wrote:

> "a cinematic, animated and interactive presentation explaining where we are and where we are going with the builder's garden, the killer app and the knowledge gardens umbrella. We are starting with software that works in a super user friendly way that utilizes the force multipliers of AI tools in this new era. It really is an evolution of business and we are going to #aikidotheAI as my motto says. We are shipping the tool so that an adaptive, integrated, real time software you can talk to with text, your voice, upload photos, videos, docs, notes and sketches and you will keep track of estimates, budgets, payments, contracts, sequencing, codes, permits, various ways of mitigating risk, keeping track of moving parts like they never have been before regardless the size of the job, for people who are tech savvy and non tech savvy."

Things in this prompt that the current V1 copy doesn't yet land:
- "force multipliers of AI tools in this new era" → not surfaced
- "evolution of business" → not surfaced
- "talk to with text, your voice, upload photos, videos, docs, notes and sketches" → only "voice" lands explicitly in Act 3
- "payments, sequencing, permits, risk mitigation, moving parts" → only "estimate, code, contract, schedule" lands in Act 3 sub
- "for people who are tech savvy and non tech savvy" → not surfaced at all

These are the natural targets for your rewrite. V2 spec proposes specific reframings for each.

---

## How edits land

`/intro/page.tsx` is the single file. Each act is its own function (`Act1Umbrella`, `Act2Problem`, etc). Copy is inline strings — find the line and edit. No copy translation layer, no JSON, no CMS. Cowork or you can edit a string and push.

When you're ready, the V2 spec at `docs/onboarding/DEMO-CINEMATIC-SPEC-V2.md` has my proposed reframings, including:
- Tighter Act 1 typewriter ("The operating system for knowledge work. / One vertical at a time." — declarative not fragmentary)
- Act 2 headline shift ("The job is hard. **The tools are harder.**")
- New Act 4 subhead carrying the full tracking list
- Act 5 "Health. Legal. Education. Energy. Same engine. Same conversation."
