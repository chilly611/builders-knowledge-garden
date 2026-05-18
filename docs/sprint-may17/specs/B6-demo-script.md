# B6: 4-Minute Investor Demo Script
**Demo:** 2026-05-20 9am SF | **Presenter:** Chilly | **Length:** 240 seconds

## Pre-demo setup (8:55am)
- Quit background apps, mute Slack/iMessage/Calendar, Do Not Disturb on
- Chrome fresh profile "InvestorDemo", 1440×900, zoom 100%
- Tab 1: `/manifesto`
- Tab 2: `/dream/oracle`
- Tab 3: `/killerapp?project=<seeded-id>` (pre-confirm Spine context renders, then re-open cold)
- Tab 4: Claude Desktop, BKG MCP green
- Demo seeder: localStorage has one project "Modern farmhouse in Marin", 1800sf/3bed/2bath/slab/mid-grade
- ≥3 snapshots so Time Machine has something to scrub
- Mic check; water; phone face-down

## 0:00-0:30 — THE OPEN
**Screen:** /manifesto
**Voice:** "What you're about to see is the operating system for the residential GC. Every workflow inside one project. Every decision reversible. Every record readable by humans and AI agents alike. Four minutes. Watch."
**Action:** Scroll-snap through first two panels (don't read); click "Enter the app" → Tab 2

## 0:30-1:30 — THE DREAM
**Screen:** /dream/oracle
**Voice (as GC):** "I want to build a custom modern farmhouse in Marin. About 1800 square feet. Three bed, two bath. Slab foundation. Mid-grade finishes."
**Action:** Push-to-talk; release; AI take streams ~6s
**Visible:** Marin/CA tag, code callouts (CRC R301, Title 24), cost range $720k-$960k, 3 next-step cards
**Voice narration:** "Real model call, not script. Location parsed. Cost band anchored. Three next moves."
**Tap:** "Make This Real" CTA (C8 ships this on /dream/oracle)
**Fallback:** "Wires this week — for demo we jump to the seeded project." Click Tab 3.

## 1:30-2:00 — WHO'S ASKING? (CRM moment, C7 Stream-E Brief 1)
**Screen:** /killerapp/who-is-asking?project=<id>
**Voice:** "Before a nail, the GC needs to know who they're talking to. CRM that doesn't look like one."
**Visible:** Lead card, voice-memo bubble (pre-seeded transcript), AI-drafted reply, journey-strip dot at "Lead"
**Action:** Click AI-drafted reply — tone-matched, scope-aware
**Voice:** "Same project context the Dream Builder wrote. No re-entry."
**Fallback (if C7 not ready):** Pivot to /killerapp picker, click "Who's asking?" card, narrate "ships Tuesday."

## 2:00-2:30 — WHAT DOES THE CODE SAY?
**Screen:** /killerapp/workflows/code-compliance?project=<id>
**Voice:** "Same project. Different lens."
**Visible:** Banner YOUR PROJECT · Modern farmhouse · Marin · 1800sf; 3 Marin code rules pre-loaded (CRC R301.2, Title 24 2022, CRC R403.1)
**Action:** Toggle Pro/Plain. Click citation — drawer opens with code text + BKG entity link
**Voice:** "Citations real. Ask a fake code, it admits it doesn't know. Hallucination guard."

## 2:30-3:00 — COST + AGREEMENT (split screen)
**Screen A (2:30-2:45):** /killerapp/workflows/estimating?project=<id>
**Visible:** AI takeoff pre-run, CSI division breakdown, total $843,200, same project banner
**Voice:** "Same context. Real specialist. Real CSI breakdown. Number moves when scope moves."
**Screen B (2:45-3:00):** /killerapp/workflows/contract-templates?project=<id>
**Action:** Click Client Agreement card; fields auto-populate from spine; click "Preview PDF" → new tab with DRAFT watermark
**Voice:** "Six template bodies. Contract knows the project. Watermark says draft — human signs after human reads."

## 3:00-3:30 — TIME MACHINE + JOURNEY MAP
**Screen:** Back to /killerapp?project=<id>
**Action:** Click Journey Map strip — 7 stages visible (Size Up → Lock → Plan → Build → Adapt → Collect → Reflect), current dot on Lock. Click "Plan" — routes there. Click back.
**Voice:** "Where am I. One glance. Click any stage to jump."
**Action:** Open Time Machine dial. Scrub backward 2 snapshots. Budget reverts, scope reverts, journey dot moves back to Size Up.
**Voice:** "Every decision is a snapshot. Rewind one. Branch a what-if. Move on."
**Fallback (if C5 rewind doesn't ship):** Open dial, narrate "lever ships this week — captures every state change, replay this week." Do NOT scrub if dead.

## 3:30-4:00 — MCP CLOSE
**Screen:** Tab 4 Claude Desktop
**Voice:** "Last thirty seconds. Everything you saw is a database. That database speaks MCP — the protocol AI agents use to read live state. Watch Claude reach into the same project."
**Type and send (verbatim):**
> Using the BKG MCP, show me the current scope, budget, and stage of the Marin farmhouse project, and tell me which code rule has the biggest cost impact.

**Visible:** Claude calls MCP tool, returns scope + budget + stage=Lock + names CRC R403.1 (or Title 24 envelope) as biggest cost lever
**Voice (close):** "Same project. Same spine. Read by human in browser. Read by agent in Claude. One operating system. That's what we're building. Questions."

## Q&A talking points
1. **vs Procore:** "Procore for GCs running 50 jobs with back office. We're for GCs running 1-5 whose back office is AI. Procore makes you click between modules — we don't."
2. **Why agents matter:** "The contractor IS the back office. MCP-readable project = Claude/ChatGPT/custom agent answers 'did inspector sign off?' without anyone logging in. System of record."
3. **Moat:** "Plain-language URLs + project spine + voice-first capture + knowledge graph the agent layer reads. Procore can't retrofit any one without breaking enterprise contracts."
4. **Multi-state codes:** "CA + NV today. Five weeks per jurisdiction. Next three are paid-customer-led, not speculative."

## Hard rules during demo
- If error, do NOT debug on screen. Say "we'll come back" and advance.
- If forget line, look at screen, describe what's there. Product carries you.
- Do not exceed 4 minutes. Cut Time Machine first if running long.
- End on MCP moment. No coda. Silence sells.
