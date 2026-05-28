# DEMO MORNING CHECKLIST — Thursday 2026-05-28

*Written 2026-05-27 late after PATCH 1 + PATCH 1 Coordination Resolutions shipped to `main`. Walk this top to bottom before the demo starts and the Killer App's 7-stage journey is rock solid end to end.*

---

## TL;DR

- **Live URL:** https://builders.theknowledgegardens.com
- **Demo project:** Marin Farmhouse · 4,000 sqft · Marin County, CA · client The Harwell Family
- **Project UUID:** `55730cd3-5225-493d-8b5c-49086d942565` (allowlisted; readable by any signed-in account)
- **Canonical numbers** that should read the same on every screen:
  - Total budget **$1,650,000**
  - Spent-to-date **$312,400** ($312K rounded in the chip)
  - Committed **$186,200** · Remaining **$1,151,400** · Headroom **$347K**
  - Planned timeline **37 weeks** (Mar 17 → Dec 3, 2026)
  - Stage completion: Size Up 100 · Lock 100 · Plan 85 · Build 42 · Adapt/Collect/Reflect 0
- **What's wired live:** all 7 stages render and the action bar walks the journey end to end.

---

## Pre-demo verification (5 min)

1. **Open the live URL** in Chrome on whatever machine will drive the demo. Sign in with the demo trial account (so DB writes in Build's voice field report actually land).
2. **Bookmark the entry URL:**  
   `https://builders.theknowledgegardens.com/killerapp/stages/size-up?project=55730cd3-5225-493d-8b5c-49086d942565`
3. **Optional reset:** in DevTools console clear past completion marks so the journey starts fresh —  
   `localStorage.removeItem('bkg:stage-complete:55730cd3-5225-493d-8b5c-49086d942565')` then refresh.
4. **Confirm the deploy is the latest:** in the page source `<head>`, the build hash should be from a commit ≥ `0e381d0` (the PATCH 1 Coordination Resolutions ship). If unsure, force-reload (⌘⇧R) and check.
5. **Test responsive once:** DevTools mobile mode at 380×820. Make sure the journey row strip is still readable; the stage body should be a single column with no horizontal overflow.

---

## The 7-stage demo walk

Every stage shows the same persistent chrome at the top — JourneyRow with the current stage glowing rust-red, BudgetRibbon "**BUDGET $312K / $1.65M · TIMELINE 37 wk**", and the Pro-mode toggle in the top right. The sticky **primary action button** sits at the bottom of every stage and advances the journey when tapped.

### 1 · Size up — "What are you building?"
- URL: `/killerapp/stages/size-up?project=55730cd3-…`
- One question at a time: building type (Home / Shop / Mix) → address → square footage → trades → review.
- Voice button + ✨ Auto-fill on every text input.
- **Wow:** Auto-fill on the review step runs the Size Up specialist (real LLM) and lands an editable estimate.
- **Tap:** *"Lock the scope"* → Lock.

### 2 · Lock it in — "Three quick confirmations"
- URL: `/killerapp/stages/lock?project=55730cd3-…`
- Three cards: ① Pick materials (chips), ② Lock the budget number, ③ Set up the client agreement (Documenso route prepared).
- **Wow:** Plain-language scope agreement auto-drafted from the Size Up output; one tap to send.
- **Tap:** *"Send the agreement"* → Plan.

### 3 · Plan it out — drag-drop sequencing + plain-speak code lookup *(functional hero)*
- URL: `/killerapp/stages/plan?project=55730cd3-…`
- **Left column:** 10-phase job sequencing list. Drag the MEP rough-ins apart and the BudgetRibbon's **TIMELINE** climbs live + the insight card's "saves N wk · ~$X overhead" updates. Drag them back together to bank the savings.
- **Right column:** Plain-speak SF code lookup. Tap *"Bedroom egress windows"* → the compliance specialist returns a plain-language answer with citations (real Claude call, ~2 s). Flip **Pro** on the top-right → section number + sources appear.
- **Coming soon (collapsible):** scheduling calendar + planning whiteboard, both alpha-labeled.
- **Insight card:** "**37 wk timeline · running trades concurrently saves 5 wk** · ≈ $47,500 in general-conditions overhead saved · $1.65M budget holding steady."
- **Tap:** *"Approve the plan, start building"* → Build.

### 4 · Build — voice field report → DB *(functional hero)*
- URL: `/killerapp/stages/build?project=55730cd3-…`
- **Left:** 🎙 *"Speak your update"* — Web Speech captures the foreman's spoken report. Hit *"Structure with AI"* and the daily-log specialist breaks it into work-completed / crew / deliveries / issues / weather. *"Save to daily log"* writes to the project's `daily_log_state` JSONB column AND a localStorage mirror (so the entry shows instantly even if the network is slow).
- **Right top:** Plain-speak code lookup, build-phase framing (smoke alarms, CO alarms, garage separation, guards/handrails…).
- **Right bottom:** Project photos uploader (real Supabase storage, tagged to the project + workflow + step).
- **Coming soon (collapsible):** Drone progress, Robot coordination, IoT sensors — all alpha-labeled.
- **Insight card:** "**42% complete · framing inspection passed** · $312K of $1.65M spent · $186K committed next · hold change orders to protect the $347K headroom."
- **Tap:** *"Wrap up build, move to adapt"* → Adapt.

### 5 · Adapt — *(stub, alpha-labeled)*
- URL: `/killerapp/stages/adapt?project=55730cd3-…`
- Honest stub: one placeholder card ("Change orders, RFIs, submittals…") with **"ALPHA — COMING SOON"** pill.
- **Insight:** "**3 changes this week · +$4,200 cost · +1 wk schedule** · Settle the open changes and roll them into the next pay application."
- **Tap:** *"Settle changes, send pay app"* → Collect.

### 6 · Collect — *(stub, alpha-labeled)*
- URL: `/killerapp/stages/collect?project=55730cd3-…`
- Placeholder ("Pay applications, draws, lien waivers…") + ALPHA pill.
- **Insight:** "**Awaiting first draw close · $0 collected · 12 draws pending** · Assemble the foundation-milestone draw package so it's ready the day the inspection passes."
- **Tap:** *"Close the books"* → Reflect.

### 7 · Reflect — *(stub, alpha-labeled, end of journey)*
- URL: `/killerapp/stages/reflect?project=55730cd3-…`
- Placeholder ("Warranty, lessons learned, portfolio…") + ALPHA pill.
- **Insight:** "**Project complete · 9 mo total · final variance −$8,300** · Capture lessons learned and add the Marin Farmhouse to the portfolio."
- **Tap:** *"Save reflections, finish project"* → action bar morphs to ✓ "reflect wrapped — done coming soon." (No 8th stage.)

---

## What to highlight

- **One number everywhere.** $1.65M total, $312K spent, 37 wk, $347K headroom — same on every stage. The dual-ribbon "$16K / $914K vs $2.34M" mismatch is gone (KillerAppChrome is gated off `/killerapp/stages/*`).
- **Live, not faked.** Code lookup is a real Claude Sonnet call with citations. Voice field report is real Web Speech → daily-log specialist → daily_log_state Supabase JSONB.
- **Honest about the alpha.** Drone / robot / IoT (Build), scheduling calendar / whiteboard (Plan), and Adapt / Collect / Reflect stage bodies are visibly labeled "alpha — coming soon." The journey walks all 7 stages; the alpha caveat protects the demo.
- **Mobile-ready.** Every stage stacks to a single column under 768px with no horizontal overflow. The journey strip stays scrollable.
- **Pro mode.** Top-right toggle flips foreman-vernacular to code-citation framing. Showed on Plan/Build code lookup it reveals section numbers + source links.

---

## Known constraints — don't go here during the demo

- **`/killerapp/credentialing`, `/killerapp/ask`, `/killerapp/rewards`** — V3 surfaces, still carry on-page whispers per Charlie's #5 removal directive. They're not in the stage walk; just don't navigate there.
- **`/projects/[id]` view** — a real surface (Agent A's `KillerAppChrome` + AI Attention Items), but not part of the 7-stage walk. The Marin AI attention items are aligned to the $1.65M canonical, so it's safe if you do click through.
- **Voice field report DB write requires sign-in.** Signed-out users get the localStorage mirror only (still shows the entry on screen).
- **`docs/session-log.md`** has one cosmetic artifact (`$(cat /tmp/session-log-b64.txt)` literal at line 1 from a botched shell substitution by another session). Doesn't affect anything; cosmetic.

---

## Fallback plan

- **If the build is broken on Vercel.** Vercel never promotes a failed build; the last good deploy stays live. Check the Vercel dashboard for the latest passing build SHA. The last green sequence is: `dd85884` (Agent A's whisper/budget) → `0e381d0` (my coordination resolutions) → `e73e8df` (header overlap fix). Any of those will run the demo.
- **If a stage 404s.** Pull origin/main locally and run `npm run build` to surface the error; the routes are committed at `src/app/killerapp/stages/{size-up,lock,plan,build,adapt,collect,reflect}/page.tsx`.
- **If the code lookup hangs.** It falls back to a curated SF summary instantly — the tool never shows an empty result. Worst case, the "AI plain-speak" badge becomes a "plain-speak" badge.
- **If voice doesn't work in the browser.** Web Speech is Chrome/Edge only; if Safari is the demo browser, the textarea is still typeable and "Structure with AI" + "Save to daily log" still work.

---

## After the demo (post-demo carry-forward)

1. Remove whisper renders on `credentialing`, `ask`, `rewards` per Charlie #5 (Agent A's domain).
2. Update the DB Marin row (`command_center_projects` UUID `55730cd3-…`) to `sqft="4000"`, `total_budget=1650000`, `spent_to_date=312400` so the project view matches the fixture exactly. Without this, signed-in `useProject()` would override the fixture sqft with the stale DB value (currently "2800").
3. Collapse the two stage-chrome systems (`killerapp-chrome/*` for `/projects/[id]`, `stage-shell/*` for `/killerapp/stages/*`) onto one shared `ProjectContext` so their numbers are guaranteed identical, not just coincidentally aligned today.
4. Wire Size Up + Lock onto `StageShell.primaryAction` (deferred during the demo sprint to avoid colliding with Agent A's wizard rewrite) so the sticky action bar is the single primary across all 7 stages.
5. Fix the `docs/session-log.md` line-1 artifact when someone next appends.
