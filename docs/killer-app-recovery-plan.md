# The Killer App — Gap Analysis & Recovery Plan
## What the Presentation Promises vs. What Currently Exists

**Date:** March 29, 2026

---

## THE VISION (from the Presentation)

The Killer App is described as **"The AI superhuman COO that carries the cognitive load of building anything, anywhere — so the human can focus on what matters."**

It's NOT a CRM. It's NOT a project management tool. It's the **nerve center of the entire construction lifecycle** — a single intelligent system that:

- Tracks HUNDREDS of variables (cost, quality, time, people, materials, permits, financing, insurance, legal, weather, compliance)
- Surfaces what matters NOW (humans hold 4-7 things in working memory — the Killer App holds everything)
- Presents clear options with tradeoffs
- Gets smarter every day through RSI loops

### The 15 UX Strategies (from the Presentation)

| # | Strategy | Description | Status |
|---|----------|-------------|--------|
| 1 | **Command Center** | Single-screen project health dashboard | ❌ Not built |
| 2 | **Smart Alerts** | Proactive notifications, not reactive | ❌ Not built |
| 3 | **Trade-Off Visualizer** | What-if ripple effects across budget/schedule/quality | ❌ Not built |
| 4 | **Budget Heartbeat** | Living cash flow visualization | ❌ Not built |
| 5 | **AI Decision Engine** | Options + recommendation + confidence | ❌ Not built |
| 6 | **Permit Tracker** | Countdowns, checklists, jurisdiction-aware | ❌ Not built |
| 7 | **Team Orchestrator** | Conflict detection, availability, role matching | ❌ Not built |
| 8 | **Procurement Intel** | Lead times, price alerts, alternative materials | ❌ Not built |
| 9 | **Risk Radar** | Continuous monitoring — weather, labor, materials, compliance | ❌ Not built |
| 10 | **Progress Story** | Journey narrative + milestone celebrations | ❌ Not built |
| 11 | **Finance Navigator** | Draw schedules, payment incentives, billing flow | ❌ Not built |
| 12 | **Contract Companion** | Plain-language summaries, risk flag highlights | ❌ Not built |
| 13 | **Quality Score** | Inspection pass rates, deficiency tracking | ❌ Not built |
| 14 | **Security Layer** | Physical + digital + legal protection | ❌ Not built |
| 15 | **Compromise Calculator** | Smart tradeoffs ranked by impact | ❌ Not built |

### The Full Business Operations Suite (from the Presentation)

**CRM & Pipeline** (9 features)
- Lead capture (web form, phone, email, marketplace → auto-enrichment)
- Pipeline stages (Lead → Qualified → Proposal → Negotiation → Won)
- Client portal (branded, per-client project views)
- AI proposal generator (auto-populate from knowledge engine + project data)
- Communication log (every email, call, text, in-app message)
- Win/loss analytics
- Repeat client tracking
- Review management (auto-request reviews, aggregate ratings)

**Invoicing & Payments** (6 features)
- Invoice generation from project cost codes
- AIA pay applications (G702/G703)
- Change order billing
- Lien waiver management
- Payment tracking with aging reports
- Stripe integration for online payments

**Financial Intelligence** (6 features)
- Job costing (real-time budget vs actual by cost code)
- P&L by project (revenue, COGS, gross margin, overhead)
- Cash flow forecasting
- Profitability analysis (by project type, by client, by trade)
- Tax prep exports (QuickBooks, Xero, Sage)
- Budget heartbeat dashboard

---

## WHAT CURRENTLY EXISTS

**The CRM page (`/crm`)** is a lightweight contact pipeline viewer:
- Pipeline stages (New → Contacted → Qualified → Proposal → Negotiating → Won → Lost)
- Contact list with temperature indicators (Hot/Warm/Cool/Cold)
- Lead scoring
- Basic search/filter
- Stats bar (total contacts, total value, avg score)
- Fetches from `/api/v1/crm` (which returns empty because no data is seeded)

**What it shows on screen:** "AEC CRM — Killer App · Pipeline Management — Loading pipeline..." and then nothing because the API returns empty data.

**The Smart Project Launcher (`/launch`)** has more substance:
- 4-step wizard: Building Type → Jurisdiction → Project Name → Generate
- 7-tab dashboard (Overview, Codes, Schedule, Materials, Team, Permits, Budget)
- CSI division estimates
- Constraint-aware scheduling with hold points
- Confidence score

But it's disconnected from the CRM, from invoicing, from the Command Center vision.

---

## THE GAP

The presentation sells a unified **AI COO Command Center** where you see your entire business at a glance — every project's health, every pending decision, every financial pulse, every risk, every opportunity.

What exists is two disconnected pages:
1. An empty CRM contact list
2. A project launcher wizard that generates a static dashboard

**What's missing is the BRAIN** — the single intelligent layer that:
- Connects projects to clients to invoices to schedules to permits to people
- Surfaces "attention needed" items across ALL projects
- Makes recommendations ("Lumber prices are dropping — delay your framing order 2 weeks to save $4,200")
- Shows the business holistically (not one project at a time)

---

## RECOVERY PLAN — THE KILLER APP REBUILD

### Phase 1: The Command Center (Sprint 1 — the "oh shit" moment)

The single most important screen. When a contractor logs in, THIS is what they see. Not a CRM. Not a project list. A **living war room**.

**Top strip:** Business pulse
- Total active projects (with red/yellow/green health dots)
- This month's revenue vs. projected
- Cash position (available vs. committed)
- Overdue items count (red badge)

**Left column:** Attention Queue
- AI-prioritized list of things that need human decisions RIGHT NOW
- Each item: what it is, why it matters, recommended action, deadline
- Examples: "Permit #2847 expires in 3 days — renew or request extension?"
- "Steel delivery delayed 2 weeks — here are 3 options to keep schedule on track"
- "Client hasn't signed change order #4 — follow up? Auto-reminder?"

**Center:** Active Project Cards
- Each project is a living card showing: phase, % complete, next milestone, budget burn rate, risk level
- Click → drops into the full 7-tab project dashboard (already built in launcher)

**Right column:** Upcoming
- This week's inspections, deliveries, meetings
- Weather forecast impact on active projects
- Payment due/expected timeline

### Phase 2: Smart Financial Layer (Sprint 2)

Build the financial intelligence that makes this a business tool, not a project tool.

- Invoice generator (line items from project cost codes, auto-calculate)
- AIA G702/G703 pay application templates
- Cash flow timeline visualization (Gantt-style, money edition)
- Job costing dashboard (budget vs actual, with variance alerts)
- "Budget Heartbeat" — the animated, always-visible financial pulse

### Phase 3: The AI Decision Engine (Sprint 3)

This is what makes it the MTP. Not just tracking — THINKING.

- Trade-off visualizer: change one variable, see ripple effects across budget/schedule/quality
- Procurement intelligence: "CLT prices up 12% in your region. Switch to steel? Here's the full impact analysis."
- Risk radar: continuous background monitoring of weather, material prices, labor availability, permit status
- AI recommendations with confidence scores: "87% confident: delay foundation pour to Thursday. Reason: rain forecast Wednesday. Impact: 1 day schedule shift, $0 cost, 40% reduction in quality risk."

### Phase 4: CRM That Earns Its Place (Sprint 4)

NOW the CRM makes sense — because it's connected to everything:

- Lead comes in → AI auto-enriches from Knowledge Garden (project type, typical budget, relevant codes)
- Proposal generator pulls from your actual project data + knowledge entities
- Win/loss analytics show which project types and price points you actually win
- Client portal shows their project's live Command Center (branded, filtered view)
- Repeat client detection: "Sarah Martinez hasn't built in 2 years. Her neighborhood is booming. Reach out?"

### Phase 5: Field Ops Integration (Sprint 5)

The final pillar — connecting the field to the Command Center:

- Voice daily logs → auto-update project progress % and schedule
- Safety observations → auto-update Risk Radar
- Photo documentation → auto-attach to inspection checklists
- Weather integration → auto-adjust schedule recommendations

---

## THE BEFORE/AFTER (from the Presentation)

**BEFORE (every contractor today):**
> 9 subscriptions. 9 logins. 9 data silos. Tribal knowledge. Paper permits. Manual estimates. Dropped balls. Blown budgets.

**AFTER (the Killer App):**
> One platform. One brain. Voice-first. AI-native. Every code, every material, every cost, every permit, every schedule — connected and intelligent.

---

## IMMEDIATE NEXT STEPS

1. **Redesign `/crm` as the Command Center** — this is the first screen a paid user sees. It must deliver the "oh shit this sees everything" moment.

2. **Seed realistic demo data** — the empty "Loading pipeline..." is deadly. Pre-populate with 5 demo projects at different stages, 20 contacts, 3 pending decisions, financial data.

3. **Connect the launcher to the Command Center** — projects created in the launcher should appear in the Command Center with live status.

4. **Build the Attention Queue** — the AI-prioritized "what needs your attention right now" feed. This is the single feature that makes it a COO, not a dashboard.

5. **Add the Budget Heartbeat** — animated financial visualization that's always visible. This alone justifies the subscription.

---

*"Humans hold 4-7 things in working memory. The Killer App tracks ALL of them, surfaces what matters NOW, and helps make the best decision. That's the MTP."*
