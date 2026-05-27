# BKG Ship Strategy — From Prototype to Paying Customers
## April 13, 2026 · Confidential · The Knowledge Gardens

---

## SITUATION

We have a **rich but scattered** codebase with ~45 user-facing features built across multiple sessions, multiple repos, and multiple design philosophies. The platform is live on Vercel and works — but a contractor arriving today would encounter multiple overlapping interfaces, mock data where real data should be, and no enforced paywall. We need to consolidate, ship, and get real humans using this within 2 weeks.

**The goal is simple:** Get 10+ contractors actively using BKG, 5+ past the paywall, and screenshots of happy customers for the investor conversation. This changes the raise from "we have an idea" to "we have traction."

---

## PART I: FEATURE INVENTORY — WHAT WE'VE BUILT

### A. Onboarding (2 Variants)

| Variant | Location | Lines | Architecture | Verdict |
|---------|----------|-------|-------------|---------|
| **Modular** | `/onboarding/` (11 files) | 1,118 | Clean component-per-step, centralized types/tokens | **KEEP — this is production** |
| **Monolithic** | `/page.tsx` (root) | 1,397 | All 7 steps inline in one file | **DELETE — technical debt** |

**Modular Flow (7 steps, ~3 min):**
1. Trade Selection — 12 trades (GC, Electrician, Plumber, HVAC, Roofer, Solar, Cabinetmaker, Remodeler, ADU, Supplier, Inspector, Architect)
2. Goals — Multi-select (Projects, Clients, Codes, Dream/Design, Estimates, All)
3. Company Info — Name, location, team size (Solo → 100+)
4. Quick Win — Trade-specific benefit preview (e.g., HVAC gets SEER2 reqs, A2L transition, Manual J/S)
5. Voice Intro — Voice capability showcase
6. Tour Highlights — 3-surface carousel (Dream/Plan/Know)
7. Celebration — Confetti + XP + 3 action buttons

**Shared Infrastructure:** Profile API (awards +100 XP on first onboard), DB migration (trade, goals, company columns on user_profiles)

### B. Killer App / Dashboard (2 Variants)

| Variant | Location | Size | Theme | Data | Verdict |
|---------|----------|------|-------|------|---------|
| **Dashboard Launchpad** | `/dashboard/` (8 files) | ~21 KB | Light cream/blueprint | Mock | **KEEP as post-onboarding landing** |
| **Command Center** | `/command-center/page.tsx` | 32.7 KB | Dark chrome/glass | Mock | **KEEP as Pro-tier project CRM** |

**Dashboard Launchpad features:** Welcome header (name, XP, streak), recent projects, 6 quick-launch cards (dream interfaces), action items sidebar, tips/news, activity feed. Blueprint aesthetic (cream #FDF8F0).

**Command Center features:** 5-project tracker with 6-phase pipeline (DREAM→GROW), 7 attention alerts with urgency colors, calendar, weather forecast, payment tracking, session XP. Dark theme (#0a0a0a) with GreenFlash gamification.

**GreenFlash System** (shared): Canvas particle effects + Web Audio chimes. Two modes: flashGreen (2s milestone, 50 XP) and sustainGreen (20s celebration, 250 XP). Beautiful — this is a differentiator.

### C. Dream Interfaces (6 Total) — DECOUPLED, SEPARATE WORKSTREAM

**Status:** Being consolidated separately (see DREAM_INTERFACE_CONSOLIDATION_PROMPT.md). Will be injected as a self-contained module when ready. The killer app is designed with a placeholder slot for the dream experience.

| Interface | Purpose | Status |
|-----------|---------|--------|
| The Oracle | Conversational AI → dream profile | Functional |
| The Alchemist | Ingredient mixing → concept | Functional |
| Construction Cosmos | Orbital node exploration | Functional |
| Imagination Sandbox | Freeform canvas design | Functional |
| Design Studio | AI generation with sliders | Functional |
| Upload Studio | File/media → AI analysis | Functional |

All 6 share the **dream-shared** save/load system. The killer app will expose a single "Dream It" entry point that routes to whatever the consolidated dream experience becomes.

### D. Billing & Monetization

| Component | Status | Notes |
|-----------|--------|-------|
| **Pricing Page** | Complete | 4 tiers (Free/Pro $49/Team $199/Enterprise $499), annual toggle, feature grid, FAQ |
| **Billing Dashboard** | Complete | Current plan, invoice history, Stripe portal button |
| **Budget Page** | Complete | Phase-based budget tracking with line items |
| **Stripe Checkout** | Scaffolded | API route exists, needs product IDs configured |
| **Stripe Webhook** | Scaffolded | Event handler exists, needs testing |
| **Stripe Portal** | Scaffolded | Redirect works, needs customer creation |

### E. Auth System

| Component | Status |
|-----------|--------|
| AuthModal (email/password + Google OAuth) | Working |
| Session management (Supabase) | Working |
| User profiles API | Working |
| Saved projects API | Working |

### F. Navigation & Design System

| Component | Status | Notes |
|-----------|--------|-------|
| **CompassBloom** | Working | 8-lane circular nav with sub-routes, XP/level display |
| **Design System** | Complete | Button, Card, Badge, Input, Modal, Panel, Tooltip, Divider, BlueprintBackground |
| **Blueprint Aesthetic** | Consistent | Cream bg, blue ink, grid patterns, Inter/Playfair Display/IBM Plex Mono |

### G. Backend APIs

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/api/v1/oracle/analyze` | Dream profile AI analysis (Claude Sonnet) | Working |
| `/api/v1/auth/session` | Auth session management | Working |
| `/api/v1/user/profile` | User CRUD | Working |
| `/api/v1/saved-projects` | Project CRUD | Working |
| `/api/v1/stripe/*` | Billing (checkout, portal, webhook) | Scaffolded |
| `/api/v1/budget/*` | Budget tracking | Working |

---

## PART II: THE CONSOLIDATION DECISIONS

These are the decisions we need to make before writing any more code.

### Decision 1: What Does a Contractor See First?

**Current state:** After onboarding, user goes to `/dream` which is... the Dashboard Launchpad with 6 dream interface quick-launch cards. This is great for the "Dream It" use case but doesn't immediately show a contractor why they should pay $49/mo.

**Recommendation:** After onboarding, the contractor should land on a **trade-customized Dashboard Launchpad** that leads with the three paid features (AI estimating, license tracker, AI copilot) as prominent action cards — with the dream interfaces below as "Plan Your Next Project." The Dashboard Launchpad becomes the hub, the Command Center becomes what you graduate to when you have active projects.

### Decision 2: The Contractor's "Aha" Moment

A contractor who isn't accustomed to using software needs to feel value in **under 60 seconds** after onboarding. The Quick Win step in onboarding previews this, but it needs to deliver immediately.

**The play:** During onboarding, when they select their trade and jurisdiction, we **immediately generate** a personalized dashboard that shows:
- Their state's license renewal dates and requirements
- The top 3 code changes affecting their trade this year
- A sample AI estimate for a common job in their trade
- "Ask me anything about [trade] codes in [jurisdiction]" AI copilot prompt

This isn't mock data — it comes from the 40,000+ knowledge entities, 142 jurisdictions, 8 domains, and 2,847 code sections already in the BKG database.

### Decision 3: What Gets Cut (For Now)

These features are beautiful but distract from the revenue mission:

| Feature | Action | Reason |
|---------|--------|--------|
| Construction Cosmos (orbital viz) | **Hide** | Too exploratory for first-time contractor UX |
| The Alchemist (ingredient mixing) | **Hide** | Cool but not solving a contractor pain point |
| Voice Intro (onboarding step 5) | **Simplify** | Nice-to-have, slows onboarding |
| Tour Highlights (onboarding step 6) | **Simplify** | Let the product speak instead |
| Weather forecast (Command Center) | **Keep** | Contractors love this — it's practical |
| GreenFlash celebrations | **Keep** | This is the delight layer — it's the MLP magic |

**Net effect:** Onboarding goes from 7 steps to 5 (trade → goals → company → quick win → celebration). Dream interfaces reduce to 3 visible (Oracle, Imagination Sandbox, Upload Studio — the ones closest to real project planning).

### Decision 4: Free vs. Paid Gate

| Feature | Tier | Rationale |
|---------|------|-----------|
| Browse knowledge entities | Free | Gravity well — this is what pulls contractors in |
| AI copilot (5 queries/day) | Free | Hook them, then limit |
| AI copilot (unlimited) | Pro | This alone is worth $49/mo to a busy contractor |
| AI estimating | Pro | The killer feature — describe a job, get a CSI estimate |
| License & compliance tracker | Pro | Peace of mind, automated renewals |
| Dream interfaces (3) | Pro | Project planning and design exploration |
| Project dashboard (Command Center) | Pro | Full project CRM |
| Budget tracking | Pro | Financial management |
| Team features | Team ($199) | Multi-user, shared projects |

### Decision 5: Monolithic vs. Modular Onboarding

**Decision: Delete the monolithic version from page.tsx.** The modular `/onboarding/` is cleaner, more maintainable, and production-ready. The root page.tsx should become the marketing landing page, not a duplicate onboarding flow.

---

## PART III: THE EXECUTION PLAN

### Phase 1: Consolidate & Connect (Days 1-4)

**Goal:** One clean user path from landing → onboard → personalized dashboard → value. No dead ends, no mock data where real data should be, no duplicate interfaces.

#### Workstream 1A: Landing Page & Routing (Agent 1)
- [ ] Replace root `page.tsx` monolithic onboarding with a proper marketing landing page
- [ ] Real stats from Supabase (40K+ entities, 142 jurisdictions, etc.)
- [ ] Clear CTA: "Start Free" → `/onboarding`, "Sign In" → `/auth`
- [ ] Route verification: every CompassBloom link resolves
- [ ] Mobile responsive check

#### Workstream 1B: Onboarding Streamline (Agent 2)
- [ ] Reduce to 5 steps: Trade → Goals → Company → Quick Win → Celebration
- [ ] Quick Win step becomes **interactive**: show real data for their trade + jurisdiction
- [ ] Celebration step directs to trade-customized dashboard (not generic `/dream`)
- [ ] Ensure profile API saves trade, goals, company, jurisdiction to Supabase
- [ ] Test full flow: fresh signup → onboard → land on dashboard

#### Workstream 1C: Dashboard Consolidation (Agent 3)
- [ ] Dashboard Launchpad becomes the post-onboarding hub
- [ ] Top row: 3 Pro feature cards (AI Estimating, License Tracker, AI Copilot) — the revenue drivers
- [ ] Middle row: Quick-launch dream interfaces (Oracle, Sandbox, Upload Studio only)
- [ ] Sidebar: Trade-specific knowledge feed (real data from BKG knowledge entities)
- [ ] Connect WelcomeHeader to real user profile (name, trade, XP from Supabase)
- [ ] Replace all mock project data with either real saved projects or empty-state CTAs

#### Workstream 1D: Knowledge Engine Connection (Agent 4)
- [ ] Wire dashboard knowledge feed to real BKG Supabase data
- [ ] Build trade-specific knowledge queries (HVAC codes, electrical NEC updates, plumbing IPC changes, etc.)
- [ ] AI Copilot: connect to Claude API with BKG knowledge context (RAG or system prompt with entity data)
- [ ] Ensure search works across all knowledge entity types

### Phase 2: Paywall & Billing (Days 5-8)

**Goal:** Free tier works and hooks. Paid tier gates and delivers. Stripe processes real money.

#### Workstream 2A: Stripe Integration (Agent 5)
- [ ] Create Stripe products and prices for all 4 tiers
- [ ] Wire checkout flow: Pricing Page → Stripe Checkout → Success redirect
- [ ] Wire Stripe webhook to update subscription status in Supabase
- [ ] Wire Stripe Portal for subscription management
- [ ] Test full payment flow with Stripe test mode

#### Workstream 2B: Feature Gating (Agent 6)
- [ ] Implement `useSubscription` hook that checks user's tier
- [ ] Gate AI copilot beyond 5 queries/day for free users
- [ ] Gate AI estimating, license tracker, dream interfaces for free users
- [ ] Gate Command Center for free users
- [ ] Show tasteful upgrade prompts when free users hit gates ("Unlock unlimited AI copilot — $49/mo")
- [ ] Ensure free tier is still genuinely useful (browse knowledge, limited copilot)

#### Workstream 2C: AI Estimating MVP (Agent 7)
- [ ] Build the AI estimating interface: describe a job in text → get CSI-division estimate
- [ ] Use Claude API with BKG cost data context
- [ ] Output: line items by CSI division, materials, labor, timeline, total
- [ ] Save estimates to project
- [ ] This is the feature that makes contractors say "shut up and take my money"

#### Workstream 2D: License Tracker MVP (Agent 8)
- [ ] Build license tracking interface: add licenses → see renewal dates → get alerts
- [ ] Pre-populate jurisdiction requirements based on trade + location from onboarding
- [ ] Dashboard card showing license status (green/yellow/red)
- [ ] This solves a real pain point — contractors lose licenses because they forget to renew

### Phase 3: Polish & Recruit (Days 9-14)

**Goal:** 10 real contractors using the platform. 5 past the paywall. Screenshots for investors.

#### Workstream 3A: End-to-End Testing (Agent 9)
- [ ] Full user journey test: land → sign up → onboard → explore free tier → hit gate → pay → use Pro features
- [ ] Mobile responsiveness on all key pages
- [ ] Performance audit (Lighthouse score, load times)
- [ ] Cross-browser check (Chrome, Safari, Firefox, Edge)
- [ ] Error handling: what happens when API calls fail, Stripe fails, auth fails?

#### Workstream 3B: Contractor Recruitment Content (Agent 10)
- [ ] Landing page copy optimized for contractors (not investors)
- [ ] 3 trade-specific landing page variants (linked from social/outreach)
- [ ] "What you get" comparison grid on pricing page (real examples, not abstract features)
- [ ] Testimonial placeholder structure (fill with real quotes as contractors use it)

#### Workstream 3C: Analytics & Feedback (Agent 11)
- [ ] PostHog or simple event tracking: onboarding completion, feature usage, paywall hits, conversion
- [ ] Feedback widget: "How's this working for you?" on key pages
- [ ] Session recording (PostHog) so we can watch real contractor behavior

#### Workstream 3D: Cross-Garden Navigation (Agent 12)
- [ ] Universal garden switcher component in header
- [ ] Links to HKG (health.theknowledgegardens.com) and OKG (orchids.theknowledgegardens.com)
- [ ] Consistent Knowledge Gardens umbrella branding across all sites

---

## PART IV: PARALLEL AGENT DEPLOYMENT STRATEGY

The power move here is running multiple agents simultaneously on independent workstreams. Here's the dependency graph:

```
                    ┌─────────────────────────────┐
                    │     Phase 1 (Days 1-4)       │
                    │                               │
                    │  1A: Landing     1B: Onboard  │
                    │  Page & Routes   Streamline   │
                    │       │              │         │
                    │  1C: Dashboard   1D: Knowledge │
                    │  Consolidation   Connection    │
                    └──────────┬──────────┬─────────┘
                               │          │
                    ┌──────────▼──────────▼─────────┐
                    │     Phase 2 (Days 5-8)        │
                    │                                │
                    │  2A: Stripe   2B: Feature Gate │
                    │       │              │         │
                    │  2C: AI        2D: License     │
                    │  Estimating    Tracker         │
                    └──────────┬──────────┬─────────┘
                               │          │
                    ┌──────────▼──────────▼─────────┐
                    │     Phase 3 (Days 9-14)       │
                    │                                │
                    │  3A: E2E Test  3B: Recruitment │
                    │  3C: Analytics 3D: Cross-Garden│
                    └───────────────────────────────┘
```

**Within each phase, agents run in parallel.** Phase 2 depends on Phase 1 completion. Phase 3 depends on Phase 2 completion.

**Optimal agent groupings per session:**
- **Session 1:** Agents 1A + 1B in parallel (landing page + onboarding — independent files)
- **Session 2:** Agents 1C + 1D in parallel (dashboard + knowledge — independent but need onboarding complete)
- **Session 3:** Agents 2A + 2C in parallel (Stripe + AI estimating — fully independent)
- **Session 4:** Agents 2B + 2D in parallel (feature gating + license tracker — need Stripe scaffolding)
- **Session 5:** Agents 3A + 3B + 3C in parallel (testing + content + analytics — all independent)
- **Session 6:** Agent 3D (cross-garden — needs everything else stable)

---

## PART V: SUCCESS METRICS

| Metric | Target | Why It Matters |
|--------|--------|---------------|
| Onboarding completion rate | >70% | Proves the flow works for non-technical contractors |
| Free-to-Pro conversion | >10% | Proves the value prop resonates |
| Paying customers | 5+ in 2 weeks | Changes the investor conversation |
| Active daily users | 10+ | Proves retention, not just signup |
| AI copilot queries/day | 50+ | Proves the knowledge engine has real utility |
| NPS from first 10 users | >40 | Proves MLP quality bar is met |

---

## PART VI: WHAT THIS UNLOCKS FOR THE RAISE

With 5+ paying contractors and usage data:
- **Investor demo** becomes a live product with real users, not a prototype
- **Revenue proof** (even $245/mo = 5 × $49) proves willingness to pay
- **Usage patterns** show which features drive engagement (data for the pitch)
- **Testimonials** from real contractors ("this saved me 10 hours this week")
- **The Anthropic conversation** shifts from "we want to build" to "we've built it, here's the MCP server, here's the usage data, let's talk partnership"

---

## APPENDIX: FILE ARCHITECTURE AFTER CONSOLIDATION

```
builders-knowledge-garden/
├── page.tsx                    ← Marketing landing page (NEW — replace monolithic)
├── onboarding/                 ← 5-step modular flow (STREAMLINED)
│   ├── StepTradeSelection.tsx
│   ├── StepGoals.tsx
│   ├── StepCompanyInfo.tsx
│   ├── StepQuickWin.tsx        ← Interactive, real data (ENHANCED)
│   └── StepCelebration.tsx
├── dashboard/                  ← Post-onboarding hub (CONSOLIDATED)
│   ├── page.tsx                ← Trade-customized, real data
│   ├── ProFeatureCards.tsx     ← AI Estimating, License Tracker, Copilot CTAs
│   └── KnowledgeFeed.tsx       ← Trade-specific real knowledge
├── command-center/             ← Pro-tier project CRM (KEPT)
├── estimating/                 ← AI Estimating tool (NEW)
├── license-tracker/            ← License management (NEW)
├── copilot/                    ← AI construction copilot (NEW)
├── dream-oracle/               ← KEPT (visible)
├── dream-imagine/              ← KEPT (visible)
├── dream-upload/               ← KEPT (visible)
├── dream-alchemist/            ← HIDDEN (still works, just not in nav)
├── dream-cosmos/               ← HIDDEN (still works, just not in nav)
├── dream-design/               ← HIDDEN (still works, just not in nav)
├── dream-shared/               ← Save/load system (KEPT)
├── killerapp/                  ← GreenFlash reward system (KEPT)
├── auth-system/                ← Supabase auth (KEPT)
├── stripe-billing/             ← Payment processing (ACTIVATED)
├── design-system/              ← Component library (KEPT)
├── pricing/                    ← Pricing page (KEPT)
├── billing/                    ← Billing dashboard (KEPT)
└── budget/                     ← Budget tracking (KEPT, Pro-gated)
```

---

*Strategy authored April 13, 2026. Ready for execution.*
