# Killer App Direction — Post-Prototype Analysis

**Authored:** April 17, 2026 (session ran late into the night of April 16)
**Status:** Working doc. Decisions listed are founder-locked. Unresolved items flagged explicitly.
**Purpose:** The canonical reference for all Killer App work going forward. Every Cowork session and every future Chat session reads this first alongside `docs/design-draft-v0.1.md`.

---

## Context

The BKG prototype at `https://chilly611.github.io/bkg-killer-app/` (v3.2) was reviewed line-by-line during the session that produced this document. The prototype is a single `index.html` file, 3322 lines, containing 11+ real contractor workflows, 15+ AI specialist prompts, a step-card UX primitive, voice input affordances, and a quest/XP/level gamification wrapper.

The critical reading of the prototype produced two insights:

1. **The content is excellent.** The 11+ workflows map real contractor operational sequences. The AI specialist prompts are thoughtfully scoped. The step-card primitive is a real building block.
2. **The container is wrong.** The quest/level/XP gamification treats construction as a linear game campaign. Real construction is networked, multi-path, skipped, revisited. The container must be rebuilt.

The rest of this document records what that means concretely.

---

## The Overall Product Architecture (Confirmed This Session)

BKG consists of three distinct but interconnected surfaces. Users can navigate freely between them at any time.

### DREAM — Freemium

Open to anyone with an idea: dreamers, homeowners, curious pros, AI agents with ambitious machines behind them. Approximately 14 experimental interfaces currently in development; will converge to a few that work best. Entry is emotional and visual. Free tier with generous limits.

### DESIGN — The Bridge

Where a dream becomes buildable. Progression is visible to the user:

```
Rendered images → Blueprints → CAD 3D models → Fully rendered 3D digital twins
(walk-through, drone view)
```

Multiple interfaces; this is the transition from imagination to specification. Pro users can drop in mid-project; dreamers graduate into it.

### KILLER APP — Pro + Lifecycle-Driven

Starts once plans exist. This is where dreams become work. Governed by the seven-stage lifecycle (see below). Paid tiers. But pros and workers can always navigate back to Dream or Design for inspiration, exploration, or alternative choices.

**Navigation principle:** No surface locks another out. A GC deep in the Killer App can drop into Dream to explore an alternative aesthetic and return with enriched context. A worker can wander through Dream to plan their own future home. A dreamer can peek at the Killer App to understand what execution actually looks like.

---

## The Killer App Lifecycle (Renamed and Locked)

```
Size Up → Lock → Plan → Build → Adapt → Collect → Reflect
```

**Original prototype vocabulary:** Scout, Lock, Plan, Build, Adapt, Collect, Reflect.

**Change:** "Scout" was renamed to "Size Up" because the prototype's Scout level led with Pre-Bid Risk Score — a defensive, lawyer-first framing. Builders don't open with risk. They open with "let me size up this opportunity and figure out how to win it and build it well." Size Up leads with estimating and sourcing, which is a forward-leaning, offensive posture. Risk assessment is folded into Size Up but not the opening frame.

### Stage-by-Stage Role

| Stage | Role | Example workflows |
|---|---|---|
| **Size Up** | Opportunity assessment — can we do this, what will it cost, what materials, what crew | Estimating, material sourcing, client lookup, payment history, markup calculation |
| **Lock** | Contracts signed, scope fixed, commitments made | Contract templates (client, sub, lien waivers, NDA, change orders), code compliance lookup, permit applications |
| **Plan** | Detailed execution plan | Job sequencing, worker count, sub management, equipment management, supply ordering |
| **Build** | Construction itself | Daily logs, field reports, safety briefings, progress tracking, inspection coordination |
| **Adapt** | In-flight changes | Change orders, RFIs, submittals, schedule adjustments, unexpected conditions |
| **Collect** | Invoicing, draws, payment | Pay apps (AIA G702/G703), lien waiver management, change order billing, Stripe integration |
| **Reflect** | Post-project | Warranty management, lessons learned, portfolio update, referral management |

---

## Decisions Locked This Session

All 18+ decisions are listed below in order of consequence. Each is accompanied by its rationale and any implementation notes.

### UX and Navigation

**1. Not quest-driven — fluid paths instead.**
The quest-list left column is discarded. Users run workflows in any order, skip steps, return later. Matches Goal 5 of the design draft (Fearless Navigation).

**2. Journey map visualization is a keeper, with additions.**
The horizontal-scrollable journey-section from the prototype is ported, extended with skip/done/pending states, team visibility (who did what), and clickable deep-linking into workflows.

**3. Workflow picker replaces quest list.**
Primary navigation in the Killer App is a searchable, filterable workflow picker. Each workflow is a collection of steps; users launch any workflow at any time.

**4. Step-card primitive is ported cleanly.**
Expandable card with status indicator, step number, optional XP tally, optional AI analysis slot, and inside-the-expanded-state: textareas, voice input, file upload, radio/checkbox, template chooser. This is a real reusable primitive that belongs in the shared component library.

**5. Voice affordance on every textarea.**
The voice button pattern from the prototype is preserved everywhere. Aligns with Goal 9 of the design draft (Voice Is Equal).

**6. Inline AI analysis result box.**
The `analysis_result` slot pattern is ported. AI responses render inline in the step that requested them, not in a separate modal or panel.

**7. Template cards.**
The 2-column template grid is a keeper. Applied first to contract templates (Client, Sub, Lien Waivers, NDA, Change Orders), then expanded across the workflow library.

### Gamification Reframe

**8. XP as always-on tally — not progress bar.**
XP accumulates forever. Every real action — completing an estimate, logging a code reference, resolving an RFI, contributing a photo, filing a permit — adds XP. There is no "next level unlock" gate.

**9. XP converts to reputation + certification.**
Accumulated XP becomes a **badge of honor** and, at defined thresholds, unlocks real BKG certifications (verified profile, skill credentials, contractor-trust scores). This gives XP real-world value outside the platform.

**10. Rank/level becomes badge-of-honor titles.**
Instead of game-campaign levels, users earn meaningful titles tied to real contribution. Exact title list to be designed; candidates include "Code Scholar," "Estimator," "Material Maven," "Template Maker," "Site Photographer," "Knowledge Contributor." These are lane-agnostic and honor real work, not progression grinding.

**11. Discard: quest-list left column, level-group headers, "earn XP to unlock" framing, quest-per-project enforced sequence.**
Explicit rejections of the prototype's gamification wrapper.

### Visual Identity

**12. Status color language — orange and teal.**

| State | Value |
|---|---|
| Not started | muted gray |
| In progress | `#D85A30` (Dream Machine warm orange) |
| Complete | `#14B8A6` (modern teal) |

**13. Knowledge Garden green (`#1D9E75`) stays as brand identity.**
The existing green remains the chrome for the Knowledge Garden surface. It stops doing double-duty as "task complete." Complete = teal. Brand = green. Separation clarifies both.

**14. Discard the prototype's blue-ink palette.**
The three-chrome system (green/warm/red) already in production brand stays canonical. Prototype's navy+blue does not come over.

### AI Integration

**15. AI specialist prompts get wired to real LLM.**
The 15+ drafted system prompts (code compliance, estimating, crew analysis, supply chain, bid analysis, sequencing) are no longer decoration. Every `analysis_result` slot calls a real LLM with the relevant specialist prompt.

**16. AI specialists cite the real BKG database.**
Every prompt is rewritten to instruct the AI to cite entities from the BKG structured database (with entity IDs, updated timestamps, jurisdictions) rather than hallucinate code sections or prices. This honors Goal 11 of the design draft (Database Is the Moat).

**17. AI specialist prompts become a permanent prompt library.**
Saved at `app/docs/ai-prompts/` with each specialist getting its own file (path updated 2026-04-17 from the original `docs/ai-prompts/` to match the extraction commit). Verbatim prototype prompts preserved at `{specialistId}.md`; production rewrites live at `{specialistId}.production.md` so both can be introspected by `src/lib/specialists.ts` at call time.

**18. The specialist library becomes a product: Building Intelligence.**
Packaged and exposed via MCP server + REST API, sold as a B2B developer product. Any AI agent, design firm, or contech startup can integrate a BKG specialist (code compliance, estimating, crew sizing, etc.) into their own product. Pricing and commercial model defined in `docs/revenue-plan.md`.

### Workflow Library

**19. Port all 11+ workflows.**
Phased — three workflows for the demo, rest over the following weeks, all of them eventually. The library becomes a permanent BKG feature with workflows addressable by URL, indexed, and consumable by humans and agents.

**20. Three workflows prioritized for the demo.**

- **Code Compliance Lookup (q5 in the prototype)** — the $55K pain the contractor experienced. First wired demo.
- **Contract Templates (q4)** — six template types, jurisdiction-aware clauses.
- **Size Up (rebuilt from q1 + q2)** — replaces the risk-first SCOUT opening with an estimating-and-sourcing-first Size Up experience.

---

## The Full Workflow Catalog (from the Prototype)

Extracted from lines 1137-2480 of the prototype index.html. Lines 1600+ remain to be read; likely contains q12-q20+. This list is through q11.

### Size Up stage (originally Level 1 / Scout)

**Pre-Bid Risk Score (q1)** — payment history check, scope clarity, material availability, crew capacity, risk-adjusted markup. *Note: being rebuilt as part of Size Up, risk framing de-emphasized.*

**AI Estimating Gate (q2)** — project description, location, sq ft, trade specialties needed, document upload. *Note: this becomes the opening move of the Size Up workflow.*

**CRM Client Lookup (q3)** — contact import, tagging, payment notes, past project photos, follow-up schedule.

### Lock stage (Level 2)

**Contract Templates (q4)** — template chooser (Client Agreement, Sub Agreement, Conditional Lien Waiver, Unconditional Lien Waiver, NDA, Change Order), project details fill, payment terms, finalization.

**Code Compliance Lookup (q5)** — structural IBC/IRC, electrical NEC, plumbing IPC, fire/egress, AHJ-specific amendments, inspection sequence.

### Plan stage (Level 3)

**Job Sequencing (q6)** — define phases, map dependencies, identify parallel work, set duration, flag bottlenecks.

**Worker Count (q7)** — crew benchmarks, sizing analysis, availability check, conflict flagging, labor optimization.

**Permit Applications (q8)** — building, electrical, plumbing, mechanical, approval tracking.

**Sub Management (q9)** — SOW generation, RFQ distribution, bid comparison, sub selection, calendar coordination, insurance tracking.

**Equipment Management (q10)** — equipment list, inventory check, rental quotes, delivery scheduling, maintenance reminders.

**Supply Ordering (q11)** — material list extraction, supplier search, price comparison, lead time flagging. *Additional steps beyond s11-4 remain to be read.*

### Remaining (to be extracted tomorrow)

Lines 1600-2480 of the prototype contain additional workflows for Build, Adapt, Collect, and Reflect stages, plus any supporting data structures. Extraction scheduled for next Cowork session.

---

## The AI Specialist Prompt Library (Partial)

Confirmed from the prototype read through q11. Expected to grow when the remainder is extracted.

### Confirmed specialist prompts (referenced by `promptId`)

- `risk-payment-history`
- `risk-material-availability`
- `risk-markup-calculation`
- `compliance-structural` (full prompt text visible in prototype)
- `compliance-electrical` (full prompt text visible in prototype)
- `sequencing-bottlenecks`
- `crew-analysis`
- `crew-conflicts`
- `crew-optimization`
- `supply-materials`
- `supply-suppliers`
- `supply-pricing`
- `supply-leadtimes`

Plus two additional unnamed prompts for bid analysis and rental cost analysis that appeared as `analysis_result` slots without explicit promptIds.

### Specialist production requirements

Each specialist prompt gets rewritten to meet three requirements:

1. **BKG voice** — warm, builder-first, plain-language, not corporate
2. **Database awareness** — instructed to cite BKG entity IDs with timestamps and jurisdictions
3. **Lane awareness** — responses tuned to the user's lane (GC, DIY, worker, etc.) where applicable

### Building Intelligence — the product wrapper

Repackaged and exposed via:

- **MCP server** — AI agents discover specialists and call them directly
- **REST API** — traditional HTTP access for developers
- **llms.txt** — public discovery document for LLM crawlers

Commercial model and launch plan in `docs/revenue-plan.md`.

---

## What Ports and What Doesn't

### Ports (keepers from the prototype)

- Seven-stage lifecycle vocabulary (with Size Up replacing Scout)
- Step-card primitive (full UX pattern)
- Voice button on textareas
- Inline AI analysis slot
- Template card grid
- Journey map visualization
- Status color language (updated to orange/teal)
- 11+ workflow definitions (as data, not as React components)
- 15+ AI specialist prompts (rewritten for production)
- Project selector concept (extended to multi-project simultaneity)

### Does not port (rejects)

- Quest-list left column as primary navigation
- Level-group headers
- Quest-ladder sequencing
- "Earn XP to unlock" framing
- Navy+blue palette
- React-via-CDN + Babel Standalone architecture
- Babel-standalone in-browser transpilation (production uses Next.js build)

### Rebuilds (ported conceptually, reimplemented)

- XP system (becomes always-on reputation tally)
- Ranks/levels (become badge-of-honor titles)
- App component (rebuilt in Next.js with TypeScript)
- Styling (uses production design system, not inline CSS)

---

## Porting Sequence (High-Level)

Detailed week-by-week plan in `docs/revenue-plan.md`. At a high level, the sequence is:

1. **Extract data from the prototype** (single Cowork session, produces `docs/workflows.json` and `docs/ai-prompts/*.md`)
2. **Build the step-card primitive** in `src/components/primitives/StepCard.tsx`
3. **Wire the first specialist** (Code Compliance) to Claude API + real database
4. **Ship Code Compliance Lookup** as the first live workflow
5. **Ship Contract Templates** as the second live workflow
6. **Ship Size Up** as the rebuilt opening experience
7. **Build the journey map** for lifecycle visualization
8. **Build the workflow picker** as primary navigation
9. **Roll XP system out** as always-on reputation tally
10. **Launch Building Intelligence** as the MCP-exposed API product

---

## Open Questions Deferred to the Team

- Does the Size Up rename need team input, or is founder-locked sufficient?
- What's the certification authority behind BKG badges? (Self-issued? Partnered with AGC, NAHB, a state licensing board?)
- What's the exact title list for badge-of-honor ranks? (Need 10-20 initial titles; "Code Scholar," "Estimator," etc. as starting candidates)
- Who reviews the contract templates for legal accuracy before first paid user? (Not optional — real liability if we sell a flawed template.)
- Does "Building Intelligence" as a product name survive a trademark search? (Needs checking before public launch.)

---

## Session of Record

This direction was formed in a single Chat session the evening of April 16 running past 2am on April 17. The prototype was read chunk-by-chunk; decisions were made collaboratively with the founder responding to each inventory pass. The 18+ locked decisions above represent founder direction. Open questions listed at the end are flagged for team input in the upcoming design review.
