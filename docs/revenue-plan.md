# The 6-Week Revenue Plan

**Authored:** April 17, 2026
**Goal:** Flip BKG from pre-revenue to post-revenue by May 29, 2026 (Week 6).
**Why it matters:** Fundraising as "pre-revenue" typically yields 50-70% lower valuations and substantially worse terms (liquidation prefs, participation rights, anti-dilution) than "post-revenue, growing." Even $1-2k MRR across two markets changes the pitch from "we're building something big" to "we're building something big AND people are paying for it."

---

## The Target

By end of Week 6:
- **3-5 paying consumer customers** on pro subscription ($99-149/mo)
- **1-2 paying API customers** using Building Intelligence ($500-1000/mo enterprise or $0.50/call)
- **~$1-2k MRR** total across both markets

Consumer customers are trusted contractors and their referrals. API customers are developers building AI-native construction tools who find us through developer-community announcements.

---

## Week 1 (April 17-23) — Ship Code Compliance Lookup

**Ship by end of week:** Code Compliance Lookup fully functional for one jurisdiction (contractor's jurisdiction — likely California, specifics TBD).

**What the user sees:**
- A clean workflow picker in the Killer App
- Launch "Code Compliance Lookup" workflow
- Six step-cards: Structural (IBC/IRC), Electrical (NEC), Plumbing (IPC), Fire/Egress, AHJ Amendments, Inspection Sequence
- Each step has voice input for scope description
- Each step's analysis slot calls Claude API with the specialist prompt
- Responses cite real code entities from the BKG structured database — with entity IDs, last-updated timestamps, and jurisdiction

**What has to work:**
- Step-card primitive in `src/components/primitives/StepCard.tsx`
- Claude API integration with the compliance-structural and compliance-electrical prompts
- Database query wiring so AI citations link to real entities
- One jurisdiction's codes fully loaded and indexed (not 142 — just one to start)
- Auth and user session
- Plain URL: `/killer-app/workflows/code-compliance`

**Paywall moment:** Third Code Compliance Lookup attempt in a 30-day window prompts a paywall for free users. $99/mo unlocks unlimited.

---

## Week 2 (April 24-30) — First Paying Customer + Ship Contract Templates

**Ship by end of week:**
- Contract Templates workflow (Client Agreement, Sub Agreement, both Lien Waivers, NDA, Change Order)
- Stripe billing wired end-to-end
- Trusted contractor onboarded as paying customer #1

**What the user sees:**
- Launch Contract Templates workflow
- Template chooser with 6 types
- Fill project details form
- Payment terms selector (Net 15, Net 30, Net 45, 50/50, progress draws, milestone-based)
- Review checklist
- Generated contract downloadable as PDF, editable in Google Docs

**What has to work:**
- Template rendering from structured fields
- PDF generation (use `@react-pdf/renderer` or similar — no reinventing)
- Contract content reviewed by a lawyer before first paid use (non-negotiable — see liability note)
- Stripe subscription at $99/mo for Pro tier
- Activation email, receipt, basic customer success path

**Commercial milestone:** First paying customer by Friday of Week 2. Concrete ask: "Would you pay $99/mo for a tool that keeps your codes current, drafts your contracts, and will grow to manage your whole operational workflow? Lock in a year at this price." The trusted contractor who lost $55K on codes knows the pain is real.

**Legal prerequisite (must complete this week):**
- A qualified construction attorney reviews each of the six contract templates
- Output is framed as "starting draft for your attorney's review" NOT "ready-to-sign contract"
- BKG terms of service carries a liability limitation that passes a real lawyer's smell test

---

## Week 3 (May 1-7) — Ship Size Up (Rebuilt Opening Experience)

**Ship by end of week:** Size Up workflow fully functional — the rebuilt opening experience that replaces the risk-first SCOUT framing.

**What the user sees:**
- Launch Size Up workflow when a new lead arrives
- Voice or text description of the job
- Location, sq ft, trade specialties
- AI estimating specialist returns: scope breakdown, budget range, timeline estimate, suggested markup
- **Materials sourcing** — AI specialist returns cheap high-quality materials nearby + online sale alerts, with supplier names and prices
- Inline payment history and scope clarity signals
- Risk assessment folded in at the bottom, not the top

**What has to work:**
- Rebuilt opening flow combining prototype q1 + q2
- `estimating-job-size`, `sourcing-local-suppliers`, `sourcing-online-sales` specialist prompts wired
- Supplier database populated with at least a handful of real local sources in the contractor's area
- Voice-to-scope-description flow smooth

**Customer growth target:** Our trusted contractor refers two more. Price them at $149/mo Pro+ tier. Three paying customers by end of Week 3.

---

## Week 4 (May 8-14) — Three Paying Customers Live + Journey Map

**Ship by end of week:**
- Journey map visualization showing lifecycle position across all active projects
- Skip/done/pending states per workflow
- Multi-project support in the project selector
- All three paying customers actively using Code Compliance, Contract Templates, and Size Up

**What the user sees:**
- A visual seven-stage journey showing Size Up → Lock → Plan → Build → Adapt → Collect → Reflect
- Click any stage to see which workflows belong there
- Color-coded status per workflow (orange/teal/gray)
- Team collaboration surfaces: who's worked on what, what's pending
- Switch between projects without losing state

**What has to work:**
- Journey map React component with responsive horizontal scroll on mobile
- Project + workflow + state persistence (Supabase)
- Shared project view for collaborators (team member sees same journey state)

**Customer success focus:** Weekly check-ins with first three users. Capture feedback. Adjust pricing if signals say $149 is too low or too high. Document what they love, what's annoying, what they'd pay more for.

---

## Week 5 (May 15-21) — Launch Building Intelligence (API)

**Ship by end of week:**
- 5 specialist prompts packaged as Building Intelligence API
- MCP server endpoint live
- REST API documented
- Pricing published
- Announcement sent to Claude developer community, OpenAI dev community, Perplexity dev community

**What developers see:**
- `api.theknowledgegardens.com/building-intelligence/` — REST endpoint
- MCP server at `mcp.theknowledgegardens.com` exposing specialists
- Documentation at `docs.theknowledgegardens.com/building-intelligence`
- Five specialists available: Code Compliance, Estimating, Bid Analysis, Crew Sizing, Supply Sourcing
- Each specialist has example inputs/outputs, API key setup, rate limits

**Commercial model:**
- Free tier: 50 calls/month, rate-limited to 10/day
- Pay-as-you-go: $0.50 per specialist call (Stripe metered billing)
- Enterprise: $500/mo flat for up to 2000 calls + $0.25 per additional call
- Dedicated partnership tier: custom pricing for design firms, contech platforms, robotics companies

**Customer target:** At least one signed deal by end of Week 5. Ideal: a small design firm or contech startup integrating a specialist into their own product.

---

## Week 6 (May 22-28) — Polish, Close, Pitch

**Ship by end of week:**
- Whatever's rough from Weeks 1-5 gets its first polish pass
- One additional workflow ported from the prototype (Sub Management is a candidate — addresses a universal contractor pain)
- Case studies written for each paying customer (with permission)
- Fundraising pitch updated with revenue slide

**Revenue milestone review:**
- 3-5 consumer customers: $300-750 MRR
- 1-2 API customers: $500-1000 MRR
- Total: $800-1750 MRR
- Annualized run rate (ARR): ~$10-20k

This is modest. It's also not zero. The narrative flips: "we're signaling product-market fit in two distinct markets, with a defensible moat in construction knowledge infrastructure." That narrative is worth significantly more in fundraising terms than "we're pre-revenue but the vision is big."

---

## Accountability Checkpoints

Every Friday at 5pm, founder reviews against this plan. If a week slipped, name the slip specifically:

- What didn't ship?
- Why?
- Does next week's target need to shift?
- Is the final Week 6 target still realistic?

Don't paper over slips. The post-revenue story depends on actual revenue, not planned revenue.

---

## What Breaks This Plan

Things that would require pausing and replanning:

**1. Legal review of contract templates finds serious flaws.**
Likelihood: moderate. Mitigation: start the attorney review in Week 1, parallel to build. If templates aren't safe to sell by Week 2, either rebuild them fast or delay the Contract Templates shipping and push Size Up forward.

**2. Claude API costs spiral.**
Likelihood: low at this scale (3-5 customers). Mitigation: cap AI calls per customer tier; charge $99/mo for ~50 AI analyses, $149/mo for ~200, etc. Watch per-call costs; Anthropic's rate card already pencils.

**3. Customer #1 doesn't become customer #1.**
Likelihood: low (trusted relationship, real pain, real money saved). Mitigation: if he balks, ask why, iterate fast. If it's pricing, offer $49/mo early-adopter rate. If it's feature gaps, address in real time.

**4. API announcement falls flat (no developer pickup in Week 5).**
Likelihood: moderate. Mitigation: if zero signups in the first 72 hours, adjust pricing (go free-for-first-100-calls), improve the documentation, reach out to specific developer communities personally rather than relying on announcements.

**5. Founder burnout or team crisis.**
Likelihood: unknown. Mitigation: don't work past 11pm on a consistent basis. The cost of mistakes from fatigue exceeds the cost of one less hour of coding.

---

## What This Plan Explicitly Doesn't Include

- Full port of all 20+ prototype workflows (continues post-Week-6)
- Full XP reputation system (ships later, Phase B work)
- All eight user lanes (ships incrementally after contractors prove the model)
- The cinematic micro-site or public-facing marketing page (nice to have, not blocking revenue)
- Mobile native apps (web-responsive is sufficient for Week 6)
- Full Time Machine platform infrastructure (faked per-surface undo is fine for now)

The design draft's eleven goals are the long-term vision. This 6-week plan is the revenue dash. They're parallel tracks, and the revenue dash is explicitly narrower.

---

## What Success Looks Like on May 29

A single sentence that fits in an investor deck:

> *BKG has paying customers in two markets (contractor SaaS at $99-149/mo and developer API at $500/mo), validating both a B2C/B2B2C platform model and a B2B API model on top of the same structured data infrastructure. ARR run rate ~$10-20k, growing 50%+ per month from referrals.*

That's the sentence we're writing with our keystrokes the next six weeks.
