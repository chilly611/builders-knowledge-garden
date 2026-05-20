# Cinematic intro — story rewrite (V2)

**Status:** revised story arc + new copy for `/intro/page.tsx`. Cowork can lift this verbatim. Existing spec (`DEMO-CINEMATIC-SPEC.md`) stays as the technical reference for motion/timing/scaffolding.

**Source signal (from Chilly, 2026-05-20 PT):**
> "a cinematic, animated and interactive presentation explaining where we are and where we are going with the builder's garden, the killer app and the knowledge gardens umbrella. We are starting with software that works in a super user friendly way that utilizes the force multipliers of AI tools in this new era. It really is an evolution of business and we are going to #aikidotheAI as my motto says. We are shipping the tool so that an adaptive, integrated, real time software you can talk to with text, your voice, upload photos, videos, docs, notes and sketches and you will keep track of estimates, budgets, payments, contracts, sequencing, codes, permits, various ways of mitigating risk, keeping track of moving parts like they never have been before regardless the size of the job, for people who are tech savvy and non tech savvy."

## The thesis (one sentence)

**Construction is the test bed for a platform that lets any knowledge-work domain — Health, Legal, Education, Energy — be run from a real conversation, not a 12-tab dashboard.**

The cinematic carries one promise across 5 acts: *you can talk to your business now, and it will keep up.*

## The story arc

Each act answers ONE question the investor is silently asking.

| Act | Investor's question | What we show | Beat |
|---|---|---|---|
| 1 | "Who is this?" | Knowledge Gardens umbrella + 3 chromes (Killer App / Dream Machine / Knowledge Garden) | We're a *platform*. Today's chapter is one of many. |
| 2 | "What's actually broken?" | 4 daily-life vignettes from a contractor's reality | The tools haven't caught up to the work. |
| 3 | "How is this different?" | Voice in → estimate / code / contract / schedule out in one minute | #aikidotheAI. The platform parses; the human stays in command. |
| 4 | "Is it real?" | Live `/killerapp/budget` iframe — they can click into it | Not a mockup. The data is real. The route is live. |
| 5 | "Where does it go?" | Knowledge Gardens umbrella with 5 future verticals lighting up | Construction is chapter one. Every domain that has a knowledge problem is next. |

## Revised copy by act

### ACT 1 — The umbrella (target 6s)

Existing visuals (K logomark + 3 orbiting chromes) stay. Copy gets crisper.

**Top-right (unobtrusive, same as today):**
> Skip → Start building

**Below the K, line 1 (typewriter):**
> The operating system for knowledge work.

**Line 2 (typewriter, starts ~0.8s after line 1 finishes):**
> One vertical at a time.

**Why this is tighter than the current copy:** "the operating system for knowledge work, / one vertical at a time" reads as 2 incomplete fragments. Two complete declarative sentences land harder. Same character count, more authority.

### ACT 2 — What contractors actually do (target 10s)

Keep the 4 vignettes (napkin / text thread / Word doc / whiteboard). Tighten the eyebrow + headline.

**Eyebrow (small caps):**
> WHAT THE WORK LOOKS LIKE TODAY

**Headline (display, two lines):**
> The job is hard.
> The tools are harder.

**Lower meta (single line, faded):**
> We've sat with general contractors, specialty trades, and DIY home-builders. Every one of them runs their business out of a phone and a glove box.

**Beat:** investors should feel "I know these people / I've watched this happen."

### ACT 3 — #aikidotheAI (target 22s, cut from 30s)

The marquee act. The 30s slot is too long given how fast the cards land. 22s is enough to feel earned without feeling stretched. Adjust card timings to:
- 2s — Project card
- 5s — Estimate card
- 9s — Code citation card
- 14s — Contract draft card
- 18s — Journey card
- 22s — auto-advance to Act 4

**Eyebrow:**
> THE EVOLUTION OF BUSINESS — IN ONE SENTENCE

**Headline (the motto, large, multi-color):**
> #aikido**the**AI

**Sub (single line):**
> You talk. The platform parses. You stay in command.

**Left panel ("Listening" badge + mic pulse stays the same). New transcript:**
> "I want to build a modern farmhouse in Marin. Eighteen-hundred square feet. Three bed two bath, slab on grade. Late summer 2026."

(Slightly tightened from current — same beat, fewer syllables.)

**Right panel cards — copy refinement:**

- **Project card (red chrome):**
  - eyebrow: PROJECT CREATED
  - title: Modern farmhouse · Marin County, CA
  - meta: CRC R301 · R403.1 · est. $900k–$1.06M

- **Estimate card (warm-B chrome, dashed table):**
  - eyebrow: AI ESTIMATE — TEN SECONDS IN
  - same 4 rows + midpoint $905,000

- **Code citation card (warm chrome):**
  - eyebrow: REGS THAT APPLY HERE
  - title: CRC R327 — Wildland-Urban Interface
  - meta: Class A roof · ember-resistant vents · ignition-resistant siding

- **Contract draft card (green chrome):**
  - eyebrow: CONTRACT DRAFT
  - title: Client agreement — Modern farmhouse in Marin
  - meta: $905,000 · Marin County, CA · ready for review

- **Journey card** — REPLACE the existing dark `#15151A` panel with the SAME visual register as the other cards (white card, ink border-left). The dark frame currently reads as "broken / blank" on mobile.
  - eyebrow: WHERE THIS PROJECT IS
  - body (no nested pills — just text): **Size up** ✓ → **Lock it in** in progress → Plan it out · Build · Adapt · Collect · Reflect
  - tiny meta line: Photos, voice notes, contracts, change orders, and codes all attach to this same project — automatically.

**This is where the user's full list lives:** the meta line on the Journey card mentions photos / voice / contracts / change orders / codes. That carries the "anything you give it, it tracks" promise without a wall of bullet points.

### ACT 4 — The actual product (user-controlled)

Existing structure good. Three copy changes:

**Eyebrow (current is fine):**
> THE ACTUAL PRODUCT — RIGHT NOW

**Headline (replace current "You can use it. Real data. Live route."):**
> Click anywhere. It's the live app. Real data. Real route.

**Subhead under the iframe (NEW — short, replaces the floating "Hover the categories →" tip):**
> Everything you'd track on paper, lives in here together. Estimates. Budgets. Payments. Contracts. Sequencing. Codes. Permits. Risk.

**Mobile fix (not copy — flagging):** the Continue + ghost link bar (`ctaPrimary + ctaGhost`) must render ABOVE the iframe on viewports < 768px, OR the iframe height must be capped so it doesn't push the bar below the fold. Currently investors hit a dead-end at Act 4 on mobile.

### ACT 5 — Where this goes (target 8s)

Visual stays — K + 3 chromes + 5 future-vertical dots fading in. Copy needs to feel like a closer, not a fade-out.

**Visual change:** after the 3 chromes settle, the 5 future-vertical dots fade in faster (currently `1.6 + i * 0.12` — drop to `0.8 + i * 0.10`). Get to the CTAs sooner.

**Line 1 (typewriter):**
> Today, contractors. Tomorrow, every domain that has a knowledge problem.

**Line 2 (typewriter, smaller):**
> Health. Legal. Education. Energy. Same engine. Same conversation.

**CTAs (unchanged structurally):**
- Primary (red): `Start building →` → `/onboard`
- Ghost: `Show me the demo project →` → `/killerapp?project=55730cd3-…`

## Total timing

| Act | Old | New |
|---|---|---|
| 1 | 6s (already trimmed) | 6s |
| 2 | 12s | 10s |
| 3 | 30s | 22s |
| 4 | user-controlled | user-controlled |
| 5 | 12s | 8s |
| **On-rails total** | 60s + Act 4 | **46s + Act 4** |

23% faster. Investors who skip Act 4 get to the CTAs in under a minute.

## What this rewrite does NOT touch

- The 3 chrome colors (Green / Warm / Red) — they ARE the brand frame.
- The 4-vignette structure in Act 2 — the art works.
- The iframe-of-real-app in Act 4 — that IS the wow moment.
- The Skip → Start building escape hatch — present at all times.

## Implementation order (suggested for the Cowork agents already on /intro)

1. **P0 mobile + button visibility:** Act 4 mobile-CTA fix (separate from this copy doc). Without this, investors on mobile get stuck.
2. **P1 Act 3 timing:** cut to 22s, re-time the 5 cards as above. Replace dark journey card with light card.
3. **P1 Act 3 mobile grid:** split `gridTemplateColumns` so right column stacks below the left on < 768px.
4. **P2 copy swap:** all the textual changes above (this is what investors actually read).
5. **P3 Act 5 visual quickening:** 0.8 + i*0.10 dot delays so the closing CTAs feel earned, not stalled.

5 small commits, each independently testable. Cowork's 5 agents can take one each.
