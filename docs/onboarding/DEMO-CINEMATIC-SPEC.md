# Cinematic intro / presentation — full spec

**Mount point:** `/intro` (top-level, not under `/killerapp`)
**Audience:** investors first (Wed May 20 demo), contractors second (post-demo handover)
**Duration target:** ~80 seconds end-to-end, fully skippable at any moment
**Tech:** Framer Motion (already in repo), Tailwind via design-system tokens, three chromes (Green `#1D9E75` / Warm `#D85A30`+`#C4A44A` / Red `#E8443A`), Archivo + Archivo Black fonts. NO Three.js (too risky for a 24-hour ship).
**A11y:** respects `prefers-reduced-motion` (motion turns off but copy + final state still show). Keyboard `Esc` skips. `Space` pauses.

## The story arc (the brand frame)

We are **Builder's Garden** — software that lets contractors run their entire business by talking to it. We sit under the **Knowledge Gardens** umbrella, which is a platform: same engine, multiple verticals (we're starting with construction, then Health, Legal, Education, Energy). The killer app is what builders interact with daily. The motto is **#aikidotheAI** — use AI's strength against the fragmented mess AI is making of the contractor's day. Voice-first, photos, video, sketches, docs. The platform tracks estimates / budgets / payments / contracts / sequencing / codes / permits / risk in real time. Tech-savvy and non-tech-savvy contractors both win.

The cinematic is **NOT a pitch deck.** It's a short, watchable, skippable proof of presence. By the end, the investor has felt the brand AND seen the product is real. The contractor has felt seen.

## 5 acts (timings approximate)

### Act 1 — The umbrella (0:00 → 0:08)

**Visual:**
- Black-on-cream Trace paper background
- Knowledge Gardens **K** logomark fades up center (1s, ease-out)
- Tagline below: *"the operating system for knowledge work, one vertical at a time"* (typewriter effect, 1.5s)
- Three chrome dots orbit out from behind the K — Green right, Warm lower-left, Red upper-left. Each carries its label: "Knowledge Garden / Dream Machine / Killer App"

**Copy:**
- Top-right unobtrusive: "Skip → Start building" (link to `/onboard`)

**Beat:** "We're a platform. Today's chapter is one of many."

### Act 2 — The problem (0:08 → 0:20)

**Visual:** scroll-triggered (or auto-advance) montage. Four 3-second micro-vignettes side-scrolling left-to-right:
1. A wadded napkin with a hand-scrawled "$48k?" — *Estimate-on-napkin*
2. A texting thread "@Mike u know the code for stair handrails?" — *Code-lookup-by-text*
3. A Word doc with mismatched fonts + a "[CLIENT NAME]" placeholder still in the contract — *Contract-in-Word*
4. A whiteboard with crossed-out dates + "WHO'S ON MONDAY???" — *Schedule-on-whiteboard*

Each scene cross-dissolves into the next. Soft static-y SFX optional (off by default; investor demos shouldn't surprise with audio).

**Copy** (single line above the montage):
> "The job is hard. The tools shouldn't be."

**Beat:** "We see the actual daily reality, not the SaaS-vendor fantasy of it."

### Act 3 — #aikidotheAI (0:20 → 0:50)

The headline act. **30 seconds of compressed time** showing the platform respond to a single spoken intent.

**Visual:** split screen.
- **Left (40%):** a stylized phone mic icon pulsing, with the user's spoken text appearing as it would in the prod Dream Builder. The text is: *"I want to build a custom modern farmhouse in Marin. 1,800 square feet. 3 bed 2 bath. Slab on grade. Late summer 2026."*
- **Right (60%):** the platform's responses materialize as the user is still speaking. In sequence:
  1. (~2s in) A small project card appears: "Modern farmhouse in Marin · CRC R301, R403.1 · $750k–$1.06M"
  2. (~6s in) An estimate breakdown table starts populating: Foundation $X, Framing $Y, Title 24 envelope $Z...
  3. (~12s in) A code-citation card slides in: "CRC R327 — Wildland-Urban Interface · Class A roof, ember-resistant vents, ignition-resistant siding"
  4. (~20s in) A contract draft preview: "**Client Agreement** — Modern farmhouse in Marin · Contract amount: $905,000 · Marin County, CA"
  5. (~25s in) The journey strip lights up showing stage 1 (Size up) completed → stage 2 (Lock it in) in progress

**Copy:**
- Above the split, centered: **#aikidotheAI**
- Below, smaller: *"Voice in. Estimate, code, contract, schedule out. The platform does the parsing."*

**Beat:** "Watch one sentence become a project."

### Act 4 — The killer app, live (0:50 → 1:10)

**Visual:** the whole screen becomes a real, interactive embed of `/killerapp/budget?project=55730cd3-…` (the Marin farmhouse). NOT a video. NOT a screenshot. The actual live route, rendered inline.

For the first 5 seconds, a subtle "Hover the categories →" prompt floats over the page. Then it fades. The investor can interact with it as long as they want. The "Continue" button at the bottom moves to Act 5 when ready.

**Beat:** "This is the actual product, with actual data. You can use it right now."

### Act 5 — The vision (1:10 → 1:22)

**Visual:**
- The three chromes from Act 1 return, this time exploded into orbit around the K logomark
- Five additional chrome-dots fade in around them, labeled: "Health · Legal · Education · Energy · Coming"
- Each addition pulses gently

**Copy** (one line that types out):
> "Today: Builder's Garden. Tomorrow: every domain that has a knowledge problem."

**Final CTA** appears below:
- Primary button (Red Killer App chrome): "Start building →" → `/onboard`
- Secondary text link: "Show me the demo project →" → `/killerapp?project=55730cd3-5225-493d-8b5c-49086d942565`

## Technical implementation hints

- **Framer Motion + viewport triggers.** Use `useInView` for scroll-triggered acts. Auto-advance via `useEffect` + setTimeout for the on-rails sections.
- **NO video files.** Everything is HTML/CSS/SVG/Framer-Motion. A video would balloon bundle size + create a maintenance burden every time a screenshot is stale.
- **Use the existing design tokens** (`fonts`, `fontSizes`, `colors`, `spacing`, `radii`). Three chrome colors are explicit overrides — use them as hardcoded hex inline.
- **The Act 4 live embed:** the simplest path is to make it a same-origin iframe pointing at `/killerapp/budget?project=…&hideShell=1` and ship a `hideShell` query param that suppresses CompassWorkflowNav + KillerAppNav inside the iframe. Alternative: route-level render branch. Either works; iframe is faster to land.
- **Skip behavior:** clicking "Skip" at any moment immediately replays Act 5's CTAs (no animation), so the user can choose where to land.

## Animation timing reference

| Act | Duration | Key motion | Auto-advance? |
|---|---|---|---|
| 1 | 8s | Logomark fade-up + tagline typewriter + 3-chrome orbit-out | Yes |
| 2 | 12s | Four 3s cross-dissolved vignettes, then 0s hold | Yes |
| 3 | 30s | Split-screen, sequenced text reveal on right pane synced to "spoken" text on left | Yes |
| 4 | unlimited | Static (the live `/killerapp/budget` route handles its own interactions) | No, user clicks "Continue" |
| 5 | 12s | 3-chrome orbit-back + 5-chrome fade-in + typewriter final copy | Yes (then idle) |

Total on-rails: ~62s. Act 4 user-controlled.

## What we are explicitly NOT building (don't get sidetracked)

- No video assets
- No 3D / Three.js
- No music or SFX (audio is investor-meeting hazard)
- No login gate (the intro is public)
- No analytics beyond basic page-view (we'll wire telemetry post-demo)
- No "Watch the founder" video (it's a SOFTWARE demo, the founder is in the room)
