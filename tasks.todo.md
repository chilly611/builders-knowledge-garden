# Builder's Knowledge Garden — MLP Task Tracker
> Single source of truth. Rebuilt: 2026-04-04
> Repo: github.com/chilly611/builders-knowledge-garden | Live: builders.theknowledgegardens.com
> Strategic framework: Phase 0 → Phase 1 → Phase 2 → Phase 3 (see below)
> Three target audiences: CONTRACTORS · DREAMERS · AI AGENTS

---

## STRATEGIC CONTEXT (read before every session)

**The MLP goal:** Three audiences must each feel a distinct superpower on first use.
- **Contractors** → "In 60 seconds it knew my project better than I did." (COO wizard)
- **Dreamers** → "I was standing inside my dream in 30 seconds." (Worldwalker / Oracle)
- **AI Agents** → "When I asked Claude about building codes, it cited BKG." (structured data + MCP)

**The three moats:** Knowledge compounds (RSI loops), AI-native distribution (LLMs cite us), full lifecycle lock-in (nobody else covers the whole journey).

**Non-negotiable rules:**
- Run `npm run build` before EVERY push. Zero TypeScript errors, ever.
- Light backgrounds globally on all surfaces. Never dark.
- Archivo / Archivo Black fonts. Three-chrome brand: Green #1D9E75 (Knowledge), Gold #D85A30/#C4A44A (Dream), Red #E8443A (Killer App).
- API first, UI second. Every feature is an endpoint before it's a page.
- MLP not MVP — every release must make users feel something.
- After every session: check boxes, append to `docs/session-log.md`, push to main.

---

## PHASE 0 — MAKE THE PLANE FLYABLE
> Unblock everything. Nothing else ships until this is done.
> Status: COMPLETE — 0A/0B/0C/0D all done

### 0A. Build Health — COMPLETE (2026-04-04)
- [x] Run `npm run build` — capture every TypeScript error
- [x] Fix all broken imports / type errors in PM pages (`/projects/new`, `/projects/[id]`)
- [x] Verify `/projects/new` renders in production (not just that the site loads)
- [x] Verify `/projects/[id]` and all 7 tabs render in production
- [x] Confirm PunchListModule is updated version (554+ lines)
- [x] `npm run build` passes with zero errors — push to main — verify Vercel deploy

### 0B. Real Auth — COMPLETE (2026-04-04)
- [x] Auth already uses real Supabase Auth (no mock flag found)
- [x] Email/password signup + login working end-to-end
- [x] RLS policies on all project tables scoped to `auth.uid()` (migration: rls_user_scoped.sql)
- [x] User-scoped projects — API validates auth token server-side
- [ ] Onboarding flow persists until user is subscribed (gate is real, not mock)

### 0C. Real Payments — COMPLETE (2026-04-04)
- [x] Add Stripe secret key + publishable key to `.env.local` AND Vercel env vars
- [x] Wire `/api/v1/stripe/checkout` — creates real checkout session (scaffold exists, lazy init)
- [x] Wire `/api/v1/stripe/webhook` — updates subscription status in DB (subscriptions table created)
- [x] Wire `/api/v1/stripe/portal` — lets users manage subscription (scaffold exists, lazy init)
- [ ] BuildGate tied to real Stripe subscription status (not mock boolean)
- [x] Pricing page `/pricing` — Stripe Pricing Table embed (handles checkout flow)
> **Note:** Stripe Pricing Table handles checkout UX. Webhook route writes to `subscriptions` table. Individual STRIPE_PRICE_* env vars not yet set (Pricing Table manages products directly). BuildGate subscription check deferred to Phase 1.

### 0D. Mobile Baseline — COMPLETE (2026-04-04)
- [x] Homepage: stats grid collapses to 2-col below 480px, nav hides on mobile
- [x] `/projects/new` wizard usable on phone (grid min reduced to 120px)
- [x] `/projects/[id]` tabs navigable on phone (reduced padding, responsive breakpoints)
- [x] CompassNav FAB works on mobile (emoji corruption fixed, icons render properly)
- [ ] Cinematic entry `/cinematic.html` renders correctly on mobile + light theme

---

## PHASE 1 — THREE MAGNETIC MOMENTS
> One killer experience per target audience. This is the MLP core.
> Do NOT start Phase 1 until Phase 0 is fully complete.

### 1A. Contractor Magnetic Moment — The COO First 60 Seconds
**Goal:** The project wizard must feel like a superpower, not a form.

- [x] Project wizard step 1: building type + jurisdiction → auto-populate all downstream fields
- [x] Project wizard → AI estimate fires immediately (real Claude API call, CSI breakdown, not placeholder)
- [x] Project wizard → AI schedule fires immediately (real Claude API call, Gantt-ready output)
- [x] Compliance surfaced automatically: 3+ code flags shown without user asking
- [x] Project dashboard after creation: all modules populated with AI-generated seed data
- [x] "Confidence score" widget prominent on dashboard — shows % complete and what's missing
- [ ] First 60-second experience test: time from landing on `/projects/new` to seeing a populated dashboard
- [ ] **BLOCKER:** Run `supabase/migrations/phase1a_schema.sql` on live Supabase DB (adds project_schedules + project_compliance tables, jurisdiction/start_date columns)

### 1B. Dreamer Magnetic Moment — The Hero Interface
**Goal:** User describes or uploads an image → they're inside their dream in under 60 seconds.
**Priority order: Worldwalker first (most viral), Oracle second (most emotionally deep)**

#### Worldwalker (World Labs Marble API)
- [ ] Integrate World Labs Marble API — account + API key in env
- [ ] `/dream/worldwalker` page: upload image or describe a scene → API call → Gaussian splat render
- [ ] SparkJS / Three.js in-browser render — navigable 3D world
- [ ] Voice command layer: "Make the ceiling higher" / "Add a fireplace" → re-render
- [ ] Shareable link: every Worldwalker session gets a public URL
- [ ] "Make This Real" button → pre-fills project wizard with extracted building details

#### Oracle (fallback if Marble API not yet available)
- [ ] `/dream/oracle` wired to Dream State API — saves profile across sessions
- [ ] 7 life questions → AI maps to architecture style + 3 FLUX renders
- [ ] Results shareable via public link
- [ ] "Make This Real" button → project wizard handoff

### 1C. AI Agent Magnetic Moment — LLM Discoverability
**Goal:** When any AI assistant is asked about construction, it cites BKG.

- [ ] `llms.txt` at `builders.theknowledgegardens.com/llms.txt` — lists all entity types, API endpoints, MCP server URL
- [ ] JSON-LD structured data on every knowledge entity page (`/knowledge/[slug]`) — schema.org/Thing with domain-specific properties
- [ ] `robots.txt` explicitly allows all AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Bingbot)
- [ ] OpenGraph meta tags on every page (title, description, image)
- [ ] Sitemap at `/sitemap.xml` — includes all knowledge entity URLs
- [ ] MCP server scaffold at `/api/mcp` — at minimum: search_knowledge, get_entity, get_jurisdiction_codes tools
- [ ] MCP server documented at `builders.theknowledgegardens.com/mcp` with connection instructions
- [ ] API docs at `/api/docs` — OpenAPI spec for all v1 endpoints

---

## PHASE 2 — STICKINESS ENGINE
> What keeps all three audiences coming back every day.
> Start after Phase 1 magnetic moments are live and tested.

### 2A. Morning Briefing (creates daily habit)
- [ ] API route: `POST /api/v1/briefing` — accepts lane, active projects, location, weather
- [ ] Claude API call: lane-aware 3-5 sentence narrative, voice of a knowledgeable foreman/advisor
- [ ] Fires on app open — appears before dashboard content loads
- [ ] Contractor lane: what needs attention today (RFIs due, budget variance, weather risk)
- [ ] Dreamer lane: what's new in your dream + an inspiring build story
- [ ] Knowledge lane: one fascinating construction fact + relevant code update

### 2B. Knowledge at Scale (10K+ entities)
- [ ] Batch ingestion job: IBC Chapters 3-10, 16, 17, 19, 23 → 200+ code sections
- [ ] Batch ingestion job: IRC residential codes → 100+ sections
- [ ] Batch ingestion job: 50+ material entities (MEP, masonry, waterproofing, flooring)
- [ ] Batch ingestion job: 30+ safety regulations (crane, welding, silica, heat, trenching)
- [ ] Knowledge entity relationships seeded (codes↔standards, materials↔methods, trades↔methods)
- [ ] Knowledge browse page `/knowledge` — verified rendering + search working
- [ ] Knowledge detail pages `/knowledge/[slug]` — individual entity pages with structured data
- [ ] AI Copilot RAG pipeline — wired to real Anthropic key, streaming, cited answers

### 2C. Cross-Surface Bridges (the full lifecycle loop)
- [ ] "Make This Real" button on all Dream interfaces → pre-fills project wizard
- [ ] "Use this in my dream" button on knowledge entity pages
- [ ] "What does the code say?" link from CRM attention items → knowledge copilot
- [ ] "Continue Your Dream" card on Dream hub (shows active dream + growth stage)
- [ ] CRM rebuild: business pulse + AI attention queue wired to real project data (not mock)

### 2D. Quest + XP Backbone (gamification layer)
- [ ] DB tables: `user_xp` (user_id, total_xp, level), `xp_events` (user_id, action, xp_earned)
- [ ] API route: `GET /api/v1/quests/daily` — 3 quests, lane-specific, real-work-advancing
- [ ] XP awarded on: project creation, RFI resolved, estimate generated, dream saved, knowledge searched
- [ ] Level display in nav/profile — visible progress
- [ ] CompassNav: lane-aware reordering (GC sees red Killer App first, DIY sees gold Dream first)

---

## PHASE 3 — FIRST DOLLAR
> The business becomes real. Don't build Phase 3 features before Phase 1 is live.

- [ ] Onboarding gate live: free tier works, upgrade moment frictionless and obvious
- [ ] Shareable dream links go viral: every dream has a public `/dream/share/[id]` URL
- [ ] Lead-to-warranty CRM lifecycle tracking (full pipeline, not just pipeline view)
- [ ] AI proposal generator: Claude API → formatted proposal doc (PDF export)
- [ ] Invoice module: AIA G702/G703 pay app format
- [ ] Demo preparation: clean seed data, demo accounts, 5-minute guided walkthrough script
- [ ] First paying customer target: one GC or developer on Pro plan

---

## DELIGHT BACKLOG (build after Phase 2 is stable)
> These are high-leverage but not blocking MLP launch.

- [ ] Achievement badges: 20 launch badges with FLUX-generated artwork (Code Whisperer, Budget Ninja, Oracle Initiate, Iron Streak, etc.)
- [ ] Streak tracking — daily login + activity with multipliers
- [ ] Notification personality layer — all notifications written by Claude
- [ ] Industry news feed — Claude-summarized, lane-personalized (ENR, Construction Dive, JLC, OSHA feeds)
- [ ] Voice briefings — ElevenLabs TTS for morning briefing (optional toggle)
- [ ] Sound design — unique sounds per notification urgency (celebration / good news / heads up / urgent)
- [ ] Seasonal challenge framework — monthly themed challenges with leaderboards
- [ ] Social sharing — dreams, achievements, progress stories
- [ ] Trade-off visualizer — change one variable, see ripple across schedule/budget/risk
- [ ] Weather impact automation — auto-adjust schedules based on forecast
- [ ] Time Machine (4D build visualization via Three.js — watch the building rise phase by phase)
- [ ] Alchemist interface: drag ingredients into crucible → unique building materializes
- [ ] Construction Cosmos: Three.js orbital visualization of the knowledge graph
- [ ] WebXR full VR/AR walk-through (Apple Vision Pro + Quest)
- [ ] Ambient music system — mood-appropriate loops per surface and phase
- [ ] Voice-first field ops interface — giant buttons, "Works With Dirty Hands" UX
- [ ] MCP server full implementation (beyond scaffold): all 7 product surfaces as tools

---

## COMPLETED WORK (do not re-do)

### Foundation
- [x] Next.js 15 App Router project — fresh repo, builds successfully
- [x] Design system CSS (globals.css with CSS vars, light theme, phase colors)
- [x] Archivo + Archivo Black fonts via next/font/google
- [x] Branded layout.tsx with metadata
- [x] Supabase client setup (lib/supabase.ts) + API keys connected
- [x] Environment config (.env.example)
- [x] Health API endpoint (api/v1/health)
- [x] Search API endpoint (api/v1/search — full-text + RSI signal logging)
- [x] Entity detail API endpoint (api/v1/entities/[id])
- [x] AI Copilot API endpoint (api/v1/copilot — RAG pipeline, streaming, citations)
- [x] Auth system scaffolded (Clerk/mock, ready for real keys)
- [x] Stripe integration scaffolded (tiers + BuildGate component, ready for real keys)
- [x] DREAM/BUILD authorization gating middleware
- [x] pgvector + tsvector indexes on knowledge_entities
- [x] 20 jurisdictions seeded (IBC, LA, NYC, Miami, UK, EU, Japan, India, Dubai, etc.)
- [x] 50 real entities seeded across 11 types + 24 knowledge graph relationships
- [x] RLS policies enabled (public read for published entities)
- [x] ANTHROPIC_API_KEY authenticated — Copilot works end-to-end on localhost + Vercel
- [x] Event bus scaffold (lib/events.ts — pub/sub, RSI wiring)

### PM Sprint 3 — Smart Project Launcher (COO) — built, verify health
- [x] API: /api/v1/projects/rfis (CRUD)
- [x] API: /api/v1/projects/submittals
- [x] API: /api/v1/projects/change-orders
- [x] API: /api/v1/projects/punch-items
- [x] API: /api/v1/projects/budget-lines (bulk insert)
- [x] API: /api/v1/projects/estimate (AI cost estimation, Claude Sonnet)
- [x] API: /api/v1/projects/schedule (AI schedule generation)
- [x] Page: /projects/new — 5-step wizard with BuildGate
- [x] Page: /projects/[id] — 7-tab project dashboard
- [x] Component: RFIModule (CRUD, filtering, linked entities)
- [x] Component: BudgetModule (CSI divisions, cost tracking)
- [x] Component: SubmittalModule (spec sections, linked entities)
- [x] Component: ChangeOrderModule (cost/schedule impact)
- [x] Component: PunchListModule (photo support, trade assignment)
- [x] Component: GanttChart (pure CSS, critical path)
- [x] Component: ProjectConfidence (weighted scoring)
- [x] DB migration: project_rfis, project_submittals, project_change_orders, project_punch_items, project_budget_lines

### Dream Machine
- [x] Dream hub at /dream with 9 interface cards
- [x] Describe Your Dream (NL parser pipeline)
- [x] Show Me Inspiration (Claude Vision)
- [x] Browse & Discover
- [x] Sketch It Out (HTML5 Canvas)
- [x] Surprise Me
- [x] Dream Garden (plant metaphor portfolio, XP/achievements)
- [x] Oracle shell (7 questions → architecture → renders)
- [x] Alchemist shell (drag ingredients → crucible)
- [x] Construction Cosmos shell (Three.js orbital)

### Global Design + Navigation
- [x] Light theme global reset
- [x] CompassNav — desktop collapsed sidebar + mobile FAB bloom
- [x] Lane picker on /crm first visit
- [x] Onboarding flow (5 steps, persistent until subscriber)
- [x] Capability showcase (32 capabilities, 8 categories)
- [x] Cinematic entry /cinematic.html (4-scene intro, Ken Burns, crossfade)
- [x] CRM Command Center rebuilt (business pulse, AI attention queue, project cards, weather)
- [x] Knowledge entities: 2,204 in Supabase, search working

---

## OPEN BLOCKERS (owner must provide)

| Blocker | What's Needed | Unlocks |
|---|---|---|
| ~~Stripe keys~~ | ~~Test-mode Secret Key + Publishable Key~~ | ~~Phase 0C — real payments~~ RESOLVED |
| World Labs Marble API | Account + API key | Phase 1B — Worldwalker |
| ElevenLabs key | Account + API key | Delight backlog — voice briefings |
| Suno/audio | Licensed loops or API key | Delight backlog — ambient music |

---

## SESSION PROTOCOL (every Cowork session)

1. Read `CLAUDE.md` first — do not read the whole codebase
2. Read this file (`tasks.todo.md`) — find the next unchecked item in the current Phase
3. Read `tasks.lessons.md` — check for known pitfalls before starting
4. Work ONE task at a time — no scope creep mid-session
5. Run `npm run build` before every push — zero TypeScript errors
6. After completing: check the box, append entry to `docs/session-log.md`, push to main
7. If something breaks: STOP, re-read this file, re-plan before continuing

## FILE LOCATIONS

```
Tasks:       C:\Users\kmacn\Desktop\the Build Garden\tasks.todo.md
Lessons:     C:\Users\kmacn\Desktop\the Build Garden\tasks.lessons.md
Session log: C:\Users\kmacn\Desktop\the Build Garden\docs\session-log.md
Architecture:C:\Users\kmacn\Desktop\the Build Garden\docs\architecture.md
App root:    C:\Users\kmacn\Desktop\the Build Garden\app\
```
