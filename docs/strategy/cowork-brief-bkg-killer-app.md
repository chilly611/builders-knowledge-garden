# Cowork Session Brief — BKG Killer App Rehaul + Pattern Language Completion

**For:** Cowork session with parallel agents
**Founder:** Chilly Dahlgren
**Tool stack:** Claude Design (verify enablement at session start) + Claude Sonnet/Opus 4.7 parallel agents + frontend-design skill + relevant SKILL.md files
**Date:** 2026-05-26
**Estimated parallel agents:** 6 (one per workstream below)

---

## ⚡ READ THIS FIRST — The Moat

**The RSI Heartbeat is the platform.** One self-improving knowledge graph per garden, ingesting source data on a domain cadence, re-verifying every entity, surfacing freshness on every claim, learning from use. The platform doesn't hold knowledge — it improves itself in public. Every other platform in our space holds static data and ages. We get more right every week. **That is the moat in the AI era.**

This paragraph leads every commit, every PR description, every code comment, every customer-facing artifact you produce in this session. If your code change does not feed the RSI Heartbeat or operate on data that does, ask yourself why you're writing it.

---

## Required reading before any agent writes any code

Each agent reads, in order, before claiming a workstream:

1. **`docs/strategy/lane-stance-strategy-v3.md`** (in BKG repo) — the v3 strategy memo, decisions locked
2. **`docs/strategy/kgos-architecture.svg`** (in BKG repo) — the platform architecture diagram
3. **`docs/strategy/the-knowledge-gardens-os.html`** (presentation site, deploy this too at `frontiermap.theknowledgegardens.com/TheKnowledgeGardensOS`) — visual education on the 20-piece Pattern Language
4. **`FRONTIER_MAP_PORTABLE.md`** (in umbrella project; paste into Cowork session as context) — canonical 55-garden roster, federation contract, brand system
5. **`knowledge-gardens-os-v2.md`** (in umbrella project; paste into Cowork session as context) — platform OS spine
6. **`02_BRANDING.md`** + **`02_BRANDING_AIKIDO_ADDENDUM.md`** (in umbrella project) — full brand system + BKG voice playbook
7. **`design-constitution.md`** (in BKG repo, locked 2026-04-16) — the 7 primitives + 10 goals
8. **`BKG_SHIP_STRATEGY.md`** (in BKG repo) — current feature inventory, 45+ user-facing surfaces
9. **`tasks.lessons.md`** (in BKG repo) — accumulated process lessons; read at every session start
10. **`/mnt/skills/public/frontend-design/SKILL.md`** — design tokens and styling constraints for this environment

If any of these files is missing or inaccessible, **stop and flag to Chilly before proceeding**. Do not invent.

---

## Tool stack — what each agent uses

- **Claude Design** — Anthropic's design tool (Chilly to verify enablement at session start). If available, use it for any visual surface design. If not available, fall back to direct Next.js/React work on the existing codebase using the `frontend-design` skill.
- **Read the `frontend-design` SKILL.md first** before writing any frontend code. It encodes environment-specific constraints (available libraries, rendering quirks, output paths) that aren't in training data.
- **Read the relevant SKILL.md files** for any deliverable: `docx`, `pdf`, `pptx`, `xlsx`, `frontend-design` — each at `/mnt/skills/public/<name>/SKILL.md`.
- **Use the BKG MCP endpoint** at `/api/v1/mcp` for any agent that needs structured data from the BKG knowledge graph.
- **Use Supabase MCP** for any database-touching work (HKG and TKG share Supabase; BKG has its own).
- **Live site for visual verification** — `builders.theknowledgegardens.com`. BKG is Next.js, so `web_fetch` returns shell HTML only; use a browser DevTools session if visual inspection is needed.

---

## The 6 parallel workstreams

Each agent claims ONE workstream, reads the required files, then executes. No agent claims a workstream another agent has claimed.

### Workstream 1 · Presentation Site — finish the deep-dive (pieces 13–20)
**File:** `/mnt/user-data/outputs/the-knowledge-gardens-os.html` (already has pieces 1–12 deep-dived; needs 13–20)

The HTML file already contains:
- All CSS for the deep-dive blocks (`.pl-piece-detail`, `.pl-axes-dots`, etc.) — do not modify CSS
- 12 fully deep-dived pieces (Invitation Card through Infinite Descent)
- A "Pieces 13–20 forthcoming" closing note that needs to be replaced

Your task: write 8 more `.pl-piece-detail` blocks for pieces 13–20, in the exact same format as pieces 1–12. Look at piece 12 (Infinite Descent) as the template. Each block has:
- Header (`<span class="num">`, `<span class="name">`, `<span class="cat-badge">Rendering</span>`)
- Plain English (`<div class="pl-piece-detail-plain">`)
- 3 BKG examples (`<div class="pl-examples-row">` with three `<div class="pl-example">` cards, each containing an inline SVG + surface label + caption)
- 14-axis dot indicator (`<div class="pl-axes-row">` with `<div class="pl-axes-dots">` containing 14 `<span class="axis-dot">` elements; mark relevant ones with class `active`; mark primary ones with class `primary`)
- Why it matters (`<div class="pl-piece-detail-why">`)

The 8 remaining pieces:
- **13 · Modality Mirror** — visual / voice / gestural / agent-API renderings. BKG examples: Daily Field Log (speak/tap/agent), project setup (voice/type/API), Equipment Schedule (visual UI / voice / agent JSON). Axes primary: **Modality, Device class**. Also: Accessibility, Surface, Lane.
- **14 · Tempo Adapt** — primitives breathe per time pressure. BKG examples: compliance alerts (32 days vs 2 days), Field Log (sunny morning vs thunderstorm), Pay App (day 25 vs day 30). Primary: **Time pressure**. Also: Emotional state, Time horizon.
- **15 · Cultural Render** — language, units, jurisdiction, currency as data. BKG examples: Equipment Schedule (US tons vs MX kW), permits search (CA CBC vs TX IBC), Pay App currency (USD G702 vs CAD CCDC 12). Primary: **Cultural frame**. Also: Domain, Economic position.
- **16 · Accessibility Adapt** — color/motor/cognitive/neurodivergent profiles operationalized. BKG examples: budget cockpit (default vs low-vision 1.4×), Estimating flow (default vs neurodivergent-friendly one-task-per-screen), mobile Field Log (default vs motor-impaired with larger tap targets). Primary: **Accessibility**. Also: Device class, Modality.
- **17 · Cross-Surface Bridge** — context flows Dream → Garden → Killer App without retyping. BKG examples: Dream Machine sketch → AIA Pay App phase anchor, Knowledge Garden code clauses → Plan-stage Code Compliance worksheet, Field Log countertop mention → supplier marketplace link. Primary: **Surface**. Also: Stage, Lane.
- **18 · Lifecycle Memory** — projects live years; the platform remembers. BKG examples: Reflect-stage homeowner sees Size Up promises, GC pay app sees June estimate variance, worker sees last project framing comparison. Primary: **Time horizon**. Also: Stage, Lane.
- **19 · Trust Posture Adapt** — defensiveness scales inversely with user trust. BKG examples: new homeowner gets confirmations / returning contractor sees just "submitted", new contractor slow listing rollout / tenured one publishes instantly, first Equipment Schedule export with caveats / 50th clean. Primary: **Trust posture**. Also: Skill, Time horizon.
- **20 · Stance Card** — the operational mechanism, 14-axis snapshot every primitive reads. BKG examples: homeowner on phone Saturday at lunch ({lane:public, device:phone, tempo:leisurely} → F0 friendly), contractor on desktop Friday 5pm ({lane:pro, device:desktop, tempo:urgent} → F4 procurement), agent via API ({lane:machine} → F6 JSON). **Axes touched: ALL 14** (this is the only piece where every dot is `active` and at least two are `primary`).

After writing pieces 13–20, replace the closing-note `<div class="pl-explainer">` with the new content. Then verify HTML tag balance (`<div>` opens == closes, `<svg>` opens == closes).

Deploy target: `frontiermap.theknowledgegardens.com/TheKnowledgeGardensOS` once Chilly approves the finished file.

**Use the `frontend-design` SKILL.md for the SVG mini-mockups** — keep them brand-compliant (parchment background `#F8F3EB`, Cormorant Garamond serif, Space Mono monospace, copper `#B87333` accents).

### Workstream 2 · Killer App credentialing dashboard rehaul
**Surfaces:** `/killerapp/credentialing` (and any sub-routes)
**Goal:** Rebuild the credentialing dashboard composing from the 20-piece Pattern Language.

Required compositions:
- **Invitation Card** (Floor 0): "Renew which credential first?" with three soonest-expiring as buttons
- **TrustStrip** on every credential record: source authority, last-verified, expiration date
- **Three-Source Rule**: credential validity verified against state board API + employer record + the user's own record before rendering as "active"
- **Tempo Adapt**: full UI when 30+ days out; stripped-to-one-button at 2 days out
- **Pro Toggle**: "OSHA-10" in human mode / "OSHA Construction Industry Outreach Training Program, 10hr" in pro mode
- **Time Machine**: every renewal action has a 7-day undo window
- **Stance Card** read on every page load to determine lane (Admin/Pro/Public/Machine) and tempo

Each surface must answer the four umbrella lanes' Floor 0 questions before any code is written. Lane checklist:
- Administrator (GC running the firm): "what's expiring across my crew?"
- Professional (the licensed contractor): "how do I renew this fastest?"
- Public (the homeowner): "is my contractor properly licensed?"
- Machine (agent acting on user's behalf): structured JSON payload of renewal actions

Preserve as-is: GreenFlash particle effects + Web Audio chimes on successful renewals.

### Workstream 3 · Killer App project pipeline rehaul
**Surfaces:** `/killerapp/projects`, `/killerapp/projects/[id]`
**Goal:** Rebuild the project pipeline composing from the 20-piece Pattern Language.

Required compositions:
- **Invitation Card**: "What's next on which project?"
- **Pro Toggle**: human cards mode / Gantt critical-path mode
- **Cross-Surface Bridge**: Dream Machine sketches anchor onto project pages; Knowledge Garden citations propagate to Code Compliance worksheets
- **Lifecycle Memory**: every project shows context from prior stages (Size Up → Lock → Plan → Build → Adapt → Collect → Reflect)
- **TrustStrip** on every budget/schedule claim
- **Infinite Descent**: F0 "what's happening?" → F4 "AIA pay app status with line-item variance" → F6 agent payload

Four-lane Floor 0 checklist:
- Administrator: "which projects are at risk this week?"
- Professional: "what's blocking me right now?"
- Public (homeowner viewing their project): "where is my house at?"
- Machine: project state as JSON for agent action

### Workstream 4 · Killer App compliance alerts rehaul
**Surfaces:** `/killerapp/compliance`, `/killerapp/alerts`
**Goal:** Rebuild compliance alerts composing from the 20-piece Pattern Language.

Required compositions:
- **Tempo Adapt** (cardinal feature): leisurely → focused → urgent → emergency gradient drives entire UI
- **Trust Posture Adapt**: new users get full context; veterans get one-tap "renew"
- **TrustStrip**: every regulatory citation wears source + freshness + jurisdiction
- **Three-Source Rule**: alerts triggered only when state board + city + contractor record agree
- **Time Machine**: dismissed alerts recoverable for 30 days
- **Modality Mirror**: alerts surface via in-app, SMS, email, voice call as tempo escalates

Four-lane Floor 0:
- Administrator: "what's on fire?"
- Professional: "what do I need to fix today?"
- Public: not primary lane here; minimal surface
- Machine: alert stream as MCP feed

### Workstream 5 · Killer App GreenFlash CRM reward loop rehaul
**Surfaces:** `/killerapp/rewards`, the GreenFlash particle layer
**Goal:** Rebuild the reward loop composing from the 20-piece Pattern Language.

Required compositions:
- **Emotional Arc**: worry → control → celebration gradient drives the visual progression
- **Progressive Reveal**: power features (referral bonuses, tier multipliers) emerge after demonstrated use
- **Lifecycle Memory**: rewards track project-to-project tenure
- **Whisper** for first-time encounter with each reward type
- **TrustStrip** on point calculations (sources: completion event + verified review + payment receipt)
- **Federation Contract**: reward events surface to umbrella `theknowledgegardens.com` profile

**Critical preservation:** GreenFlash particle effects (Canvas) + Web Audio chimes are the brand's emotional anchor — preserve the existing implementation; rebuild the surfaces around them, not them.

### Workstream 6 · Search + Ask Anything Copilot integration
**Surfaces:** the global search/ask box, integrated across all Killer App surfaces
**Goal:** Make Ask Anything live on every page, context-aware to the current screen.

Required compositions:
- **Ask Anything** (cardinal): omnipresent box, one tap away
- **Cultural Render**: results in user's locale (US English / Spanish / units / jurisdiction)
- **TrustStrip** on every answer with source attribution
- **Three-Source Rule** before any answer renders as authoritative
- **Stance Card** read to scope results (a GC asking "what's a Manual J" gets pro-level; a homeowner gets plain-language)
- **Machine-Legible Everything**: agent-facing version of every answer accessible via MCP

Four-lane Floor 0:
- Administrator: "answer with operations focus"
- Professional: "answer with code/spec depth"
- Public: "answer in plain English"
- Machine: structured JSON

---

## Hard gates — apply to every workstream before merge

Each workstream agent walks this checklist before submitting a PR:

- [ ] The RSI Heartbeat moat paragraph appears in the PR description
- [ ] Each rebuilt surface composes from named pieces of the 20-piece Pattern Language (list them)
- [ ] All four umbrella lanes (Admin, Pro, Public, Machine) have a Floor 0 question + Floor 0 answer
- [ ] TrustStrip renders on every primary claim
- [ ] Three-Source Rule enforced on every authoritative claim
- [ ] Federation Contract met (umbrella header, parchment, Cormorant + Space Mono, cross-links, JSON-LD, llms.txt entry, MCP endpoint reachable)
- [ ] Stance Card consumed by every primitive on the surface
- [ ] Constitution's 10 goals all pass
- [ ] Brand test: "Would a curator at Royal Botanic Gardens AND a staff engineer at Stripe both respect this?" If no — back to the drawing board.
- [ ] No buzzword copy: no "revolutionize", "disrupt", "game-changer", "cutting-edge", "innovative", "leveraging synergies"
- [ ] No "We think...", "Probably...", "Our AI believes...", "Trust us"

If any gate fails, the surface is not ready. Send it back. Do not merge.

---

## Founder dogfood gate — end of sprint

After all 6 workstreams complete and merge, Chilly walks the Killer App as four different users in sequence:

1. **Charlie the homeowner** — first-time visitor, mobile, weekend, leisurely tempo
2. **Charlie the contractor** — Friday 5pm desktop, urgent tempo, looking up a specific code citation
3. **Charlie the agent** — calls the MCP endpoint with a structured query
4. **Charlie the GC** — Monday morning, reviewing the week ahead across 3 active projects

If any of the four walks reveals friction that the Pattern Language pieces should have prevented — that friction is a bug. File an issue, queue for next sprint.

Then Mike Bou walkthrough: **live product, not deck.** Pre-read = the lane-stance-strategy-v3.md memo and the presentation site at frontiermap.theknowledgegardens.com/TheKnowledgeGardensOS. The actual review is the walkthrough.

---

## Coordination protocol

- **Branch-per-workstream**: `feature/ws1-presentation-deep-dive`, `feature/ws2-credentialing`, etc.
- **Shared blocking list**: any agent that needs Stripe keys, Supabase auth, or design-token additions raises a flag in the session — Chilly resolves before that workstream can ship
- **Cross-workstream dependencies**: Workstream 6 (search) depends on Stance Card schema being finalized; that schema lives in the design constitution and may need a tiny extension. Agent 6 flags this if hit.
- **Build verification**: every PR runs Vercel preview; main branch never breaks
- **Commit message convention**: starts with the workstream tag and a piece name. Example: `[WS2] credentialing: apply TrustStrip + Tempo Adapt to renewal cards`

---

## What to do if you (the agent) get stuck

Three escape valves, in order:
1. **Re-read the relevant SKILL.md** — `/mnt/skills/public/frontend-design/SKILL.md` covers most frontend constraints
2. **Check `tasks.lessons.md`** — past sessions encoded the answer; many constraints are non-obvious from the docs alone
3. **Flag in the session** with the marker `🛑 WS<n> blocked: <one-line reason>` so Chilly can resolve

Do not invent. Do not ship a surface that violates the federation contract because "the docs were unclear." If you're not sure, ask.

---

## Why this brief is structured this way

This brief embeds the Pattern Language into its own structure. The "Required reading" is Progressive Reveal (you can't access the workstreams until you've shown you've read the foundation). The "Hard gates" are Three-Source Rule applied to your own PR. The "Founder dogfood gate" is the Emotional Arc closing on commitment. The brief teaches the philosophy by being built with it.

If the brief works on you — if reading it makes the pieces feel obvious — that's the test passing. Now go build.

— Chilly, 2026-05-26
