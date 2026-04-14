# Builder's Knowledge Garden — Master Task List


## ═══ DREAM MACHINE CONSOLIDATION (2026-04-14) — IN PROGRESS ═══

### Architecture + Components (Chat session — DONE)
- [x] Audit 6 dream interfaces → identify 3 user intents (Discover/Express/Upload)
- [x] Audit 3 live pages (/dream/upload, /dream/design, /dream/imagine)
- [x] Lock 12 architectural decisions (all approved)
- [x] Build unified /dream landing page (3-ramp entry)
- [x] Build DiscoverFlow component (5-question Oracle)
- [x] Build DreamReveal component (AI synthesis + profile card)
- [x] Build useSpeechRecognition hook (Web Speech API)
- [x] Write COWORK-BUILD-SPEC.md (complete wiring instructions)
- [x] Push all files to main

### Wiring (next Cowork session — TODO)
- [ ] Add 301 redirects for old dream sub-routes in next.config.ts
- [ ] Archive old dream sub-pages to _archived/
- [ ] Wire GreenFlash celebrations (4 moments)
- [ ] Wire Design Studio handoff (read localStorage on mount)
- [ ] Wire Express path (prompt → Design Studio auto-generate)
- [ ] Run npm run build — verify 0 TypeScript errors
- [ ] Deploy to Vercel
- [ ] Test full flow: landing → discover → reveal → design studio

## PHASE 0 — PLATFORM FOUNDATIONS
> Status: COMPLETE

- [x] Core database schema: users, projects, knowledge, storage
- [x] Auth system: email/password + Google OAuth via Supabase
- [x] Navigation architecture: CompassNav with 7 surfaces
- [x] Dream interface: drag-drop ingredient UI with schema binding
- [x] Project editor: visual task/phase/resource breakdown
- [x] Knowledge graph: entity storage and semantic linking
- [x] MCP server: Claude integration with authorized tool access
- [x] Deployment: Next.js production on Vercel

---

## PHASE 1A — DREAMER SURFACE
> Status: COMPLETE

- [x] Dream Editor: canvas-based ingredient picking
- [x] Dream Schema: aspirational_name, brief_description, user_ingredients, lifecycle_stage
- [x] Claude Integration: narrative expansion from ingredients
- [x] Dream Sharing: public dream links with embedded read-only view
- [x] Dream Timeline: growth visualization (seed → sprout → bloom → harvest)
- [x] Persistent Storage: dreams saved to PostgreSQL with DreamEssence format
- [x] UI Polish: typewriter effect, smooth transitions, color per lifecycle stage

---

## PHASE 1B — BUILDER SURFACE
> Status: COMPLETE (Wave 4)

- [x] Project Editor: WBS (Work Breakdown Structure) with phases, tasks, resources
- [x] Gantt Timeline: calendar view with critical path highlighting
- [x] Budget Module: line-item estimates, labor rates, material costs
- [x] Resource Management: crew assignment, skill matching, capacity planning
- [x] RFI Tracker: open request management with auto-assignment logic
- [x] Inspection Checkpoint System: pass/fail gates with documentation
- [x] Build-to-Dream Linkage: projects reference original dream(s) with lifecycle pipeline
- [x] Permits & Compliance: checklist tracking with jurisdiction awareness

---

## PHASE 1C — KNOWLEDGE SURFACE
> Status: COMPLETE

- [x] Knowledge Editor: flexible entity creation with schema inference
- [x] Entity Types: materials, techniques, suppliers, standards, regulations
- [x] Graph Visualization: node-link diagram of relationships
- [x] Full-Text Search: semantic search across all knowledge
- [x] Claude Copilot: "What does the code say?" for any entity
- [x] Ingredient Harvesting: drag knowledge entities into dreams
- [x] Citation System: provenance tracking for every fact
- [x] Persistent Storage: knowledge base saved in PostgreSQL

---

## PHASE 2 — PERSONA ROUTING & VALUE DELIVERY
> Imperative 1: Eradicate the value discrepancy. First 30 seconds must deliver on the marketing promise.
> The platform dynamically reconfigures based on who the user IS.

### 2A. 8-Lane Persona Architecture
- [x] Database migration: user_profiles table with lane enum (dreamer/builder/specialist/merchant/ally/crew/fleet/machine)
- [x] Progressive Profiling onboarding: 2-3 questions → lane determination → immediate surface routing
- [x] Update LanePicker.tsx: 8 lanes with strategy-aligned descriptions and chrome colors
- [x] Update auth.tsx: add lane to AuthContextType, persist in user_profiles
- [x] Update CompassNav: lane-aware destination ordering (Builder sees Killer App first, Dreamer sees Dream first)
- [x] Lane-specific landing surfaces: each lane routes to its primary surface on login
- [x] Progressive data collection: additional profile questions surface naturally as user engages

### 2B. Morning Briefing & Daily Story Loop
- [x] API route: POST /api/v1/briefing — Claude-generated, lane-aware narrative briefing
- [x] 8 distinct briefing tonalities (warm/aspirational for Dreamer, sharp/actionable for Builder, etc.)
- [x] Morning Briefing UI: typewriter effect, appears on app open, dismissible
- [x] 3 daily quests generated per briefing (lane-specific, advance real work)
- [x] "AI works while you sleep" — briefing references overnight analysis
- [x] Streak counter: consecutive days of app engagement

### 2C. Notification Orchestra (4-Tier Emotional System)
- [x] Database: notifications table with urgency_level enum (celebration/good_news/heads_up/needs_you)
- [x] API route: GET/POST/PATCH /api/v1/notifications
- [x] Notification Orchestra UI: slide-out panel, grouped by urgency, color-coded borders
- [x] Celebration tier: gold burst animation, confetti on project completions/financial milestones
- [x] Good News tier: green glow, smooth entry for positive progression
- [x] Heads Up tier: amber badge, proactive warnings with drafted solutions
- [x] Needs You tier: red attention pulse, ALWAYS includes pre-researched solution
- [x] Governing principle: every notification is a gift. If no solution/insight attached, suppress it.

### 2D. Cross-Surface Bridges (Lifecycle Continuity)
- [x] "Make This Real" button on Dream interfaces → pre-fills project wizard (Dream→Build)
- [x] "Use in My Dream" button on Knowledge entities → loads as Dream ingredient (Knowledge→Dream)
- [x] "What does the code say?" link from project items → Knowledge copilot (Build→Knowledge)
- [x] "Continue Your Dream" card on Dream hub (growth stage: seed/sprout/bloom/harvest)
- [x] Surface Transition Banner: context-aware suggestion for next surface
- [x] Lifecycle Progress Bar: DREAM → DESIGN → BUILD phase indicator
- [x] CRM rebuild: business pulse + AI attention queue wired to real project data

---

## PHASE 3 — GAMIFICATION & ENGAGEMENT ENGINE
> Imperative 2: The Delight Layer is not decoration — it's core behavioral architecture.
> Every game mechanic corresponds to real-world project advancement.

### 3A. XP & Leveling System
- [x] Database: user_xp, xp_events tables
- [x] API route: GET/POST /api/v1/xp — award and query XP
- [x] Lane-aware XP values (inspection_passed=200XP for Builder, dream_shared=50XP for Dreamer)
- [x] 5 levels: Apprentice (0-499), Builder (500-1999), Craftsman (2000-4999), Master (5000-14999), Architect (15000+)
- [x] XP Engine UI widget: level ring, animated counter, streak flame
- [x] "+XP" floating toast on every earn event
- [x] Level-up celebration: full-screen burst with new title

### 3B. Quest System
- [x] Database: daily_quests table
- [x] API route: GET /api/v1/quests/daily — 3 AI-generated lane-specific quests
- [x] Quest completion tracking + XP award
- [x] "Complete all 3 for 2x bonus" multiplier
- [x] Quests advance real work (not busywork): "Resolve open RFI", "Update crew rates", "Share your design"

### 3C. Achievement Badging
- [x] Database: achievements, user_achievements tables
- [x] 20 launch achievements seeded (Code Whisperer, Budget Ninja, Oracle Initiate, Iron Streak, etc.)
- [x] 3 categories: Explorer (knowledge engagement), Builder (execution excellence), Architect (creative synthesis)
- [x] 4 rarity tiers: Common, Rare, Epic, Legendary
- [x] Achievement unlock animation + XP bonus
- [x] Achievement showcase on user profile
- [x] FLUX-generated artwork for each badge (when API available)

### 3D. Streak Mechanics
- [x] Daily streak tracking with loss-aversion psychology
- [x] Streak multiplier on XP (7-day streak = 1.5x, 30-day = 2x)
- [x] "Iron Streak" achievement at 30 consecutive days
- [x] Streak-preserving actions: safety log, compliance check, dream update, knowledge search
- [x] Gentle recovery: 1 "streak shield" per month (miss a day, keep streak)

---

## PHASE 4 — SPATIAL INTELLIGENCE & IMMERSION
> Imperative 3: The Worldwalker and Alchemist interfaces are the ultimate Dreamer hook.
> Blocked on World Labs API key — build the pipeline, ready to connect.

### 4A. Worldwalker Pipeline
- [x] Image upload UI with drag-and-drop and processing pipeline visualization
- [x] Three.js 3D viewer with placeholder house model and manual orbit controls
- [x] Voice command panel UI (microphone button + example commands)
- [x] Material detection sidebar with confidence scores
- [x] Dimension overlay on 3D model
- [x] API route with mock processing pipeline (ready for World Labs API key)
- [ ] PENDING: World Labs Marble API key — will activate real 3D generation

### 4B. Capture-First Reconstruction
- [x] Camera/video capture interface with 30-second recording timer
- [x] Photo mode: snap multiple photos for photogrammetry (min 8)
- [x] Point cloud preview: Three.js animated particle cloud
- [x] "Strip to studs" digital sandbox mode with demolition level slider
- [x] Material/style identification panel with confidence scores
- [ ] PENDING: Photogrammetry API — will activate real point cloud generation

### 4C. Alchemist Combinatorial Design
- [x] Drag-and-drop ingredient crucible (style word + texture + mood → synthesis)
- [x] Compatibility scoring and semantic relationships between ingredients
- [ ] FLUX/Marble renders the synthesis (blocked on World Labs API)
- [x] Recipe sharing: community gallery of unique combinations
- [x] "Surprise Me" random ingredient generator

### 4D. Construction Cosmos
- [x] Three.js orbital visualization of the knowledge graph
- [x] Navigate entities as stars, relationships as orbital paths
- [x] Click a node → zoom in → entity detail
- [x] Beautiful enough to be the screensaver/ambient mode

---

## PHASE 5 — AGENTIC INTEROPERABILITY
> Imperative 4: Within 24 months, most queries will come from non-human entities.
> Build the infrastructure for the AI-driven construction economy.

### 5A. Agent RBAC & Identity
- [x] Database: agent_identities, agent_audit_log tables
- [x] API route: CRUD /api/v1/agents — register, manage, deactivate agents
- [x] API key generation (bkg_agent_xxx) with bcrypt hash storage
- [x] 3 autonomy modes: Watch (read-only), Assist (suggestions need approval), Autonomous (full delegation)
- [x] Permission scoping per agent (which MCP tools accessible)
- [x] Rate limiting per agent (configurable per hour)

### 5B. MCP Server Enhancement
- [x] Auth middleware: validate agent API keys on MCP requests
- [x] Tool-level permission checking
- [x] Audit logging: every tool call logged with input/output/duration
- [x] Semantic caching: identical queries return cached results (5-min TTL)
- [x] LLM-based query routing to authorized pathways only

### 5C. Shared Autonomy Interface
- [x] Agent activity feed: real-time view of what agents are doing
- [x] Watch Mode UI: observe agent tasks, read logs
- [x] Assist Mode UI: agent proposes actions, human approves/rejects
- [x] Autonomous Mode UI: dashboard showing completed autonomous tasks
- [x] Explainability on demand: view logic chain and source documents for any agent decision
- [x] Kill switch: immediately revoke agent access

### 5D. Context Engineering
- [x] Bounded context windows per agent session
- [x] Provenance-native responses: every fact cites its knowledge entity
- [x] Hallucination prevention: authorized agentic pathways only
- [x] Tamper-evident audit trail for every machine-driven decision

---

## PHASE 6 — FIRST DOLLAR
> The business becomes real. Revenue from multiple lanes.

- [x] Onboarding gate live: free Explorer tier works, upgrade moment obvious
- [x] Shareable dream links go viral: every dream has public `/dream/share/[id]` URL
- [x] Lead-to-warranty CRM lifecycle tracking (full pipeline)
- [x] AI proposal generator: Claude API → formatted proposal doc (PDF export)
- [x] Invoice module: AIA G702/G703 pay app format
- [x] Marketplace transactions: suppliers can list, contractors can order
- [x] Demo preparation: clean seed data, demo accounts, 8-step guided walkthrough
- [ ] First paying customer target: one GC or developer on Pro plan

---

## DELIGHT BACKLOG (build after core phases stable)

- [x] Voice briefings — ElevenLabs TTS for morning briefing
- [x] Sound design — unique sounds per notification tier (celebration/good/heads-up/urgent)
- [x] Ambient music — Web Audio synthesis with 3 mood profiles (Dream/Build/Knowledge)
- [x] Seasonal challenges — monthly themed challenges with leaderboards
- [x] Social sharing — dreams, achievements, progress stories with card generator
- [x] Trade-off visualizer — change one variable, see ripple across schedule/budget/risk
- [x] Weather impact automation — auto-adjust schedules based on forecast
- [x] Time Machine (4D build visualization via Three.js)
- [x] Industry news feed — Claude-summarized, lane-personalized (ENR, Construction Dive, OSHA)
- [x] Voice-first field ops — "Works With Dirty Hands" giant-button UX for Crew lane
- [x] WebXR viewer: VR/AR with measurement tools, annotations, hotspots (Apple Vision Pro + Quest ready)

---

## COMPLETED WORK

### Foundation & Infrastructure
- Supabase Auth integration (email/password + Google OAuth)
- PostgreSQL schema for users, projects, dreams, knowledge entities
- Next.js deployment on Vercel
- MCP server with Claude integration
- DreamEssence portable format for cross-interface storage
- CompassNav 7-surface architecture

### Phase 0-1C Implementation
- Dream Editor with ingredient UI and lifecycle tracking
- Project Editor with WBS and timeline views
- Knowledge Graph with full-text search and entity linking
- Claude Copilot for knowledge interrogation
- Dream-to-Project and Project-to-Knowledge navigation bridges

### Phase 2-6 Strategy Overhaul (2026-04-05)
- 8-Lane Persona Architecture with Progressive Profiling
- Morning Briefing with Claude-generated lane-specific narratives
- Notification Orchestra (4-tier emotional system)
- XP Engine with leveling, streaks, and daily quests
- Achievement system with 20 seeded badges
- Cross-Surface Bridge components
- Agent RBAC with Watch/Assist/Autonomous modes
- MCP Authentication middleware
- Shared Autonomy Interface (agent observation and control)
- Context Engineering (provenance, audit trails, hallucination guard)
- CRM Dashboard with AI Attention Queue
- Sound Engine (Web Audio API synthesis)
- AI Proposal Generator with streaming Claude
- Trade-off Visualizer with ripple effects
- Database: 10 new tables, 5 enums, 20 seed achievements, full RLS

### Wave 3 — Cosmos, Cache, Invoice, Demo, News, FieldOps (2026-04-05)
- Construction Cosmos: Three.js orbital knowledge graph visualization
- Semantic Cache: LRU with 5-min TTL and cosine similarity
- Query Router: classification, permission checking, rate limiting
- Invoice Module: AIA G702/G703 with PDF generation (jsPDF)
- Demo Mode: 8-step guided walkthrough with seed data
- Industry News Feed: lane-personalized with 4-hour cache
- Voice-first FieldOps: giant-button UX for Crew lane

### Wave 4 — Phase 1B Builder Surface + Marketplace (2026-04-05)
- WBS Editor: hierarchical project breakdown with inline editing
- Gantt Timeline: critical path, dependencies, zoom levels
- Budget Module: CSI divisions, change orders, variance tracking
- Resource Management: crew roster, capacity planning, skill matching
- RFI Tracker: auto-assignment, response workflow, metrics
- Inspection Checkpoints: jurisdiction-aware checklists, digital signatures
- Permits & Compliance: tracker with expiry alerts, AHJ contacts
- Marketplace: supplier directory, product catalog, quote requests

### Wave 5 — Delight + Phase 4C + Dream Linkage (2026-04-05)
- Time Machine: 4D Three.js construction phase visualization with manual orbit
- Ambient Music: Web Audio procedural synthesis, 3 mood profiles (Dream/Build/Knowledge)
- Seasonal Challenges: 12 monthly themes with leaderboards and lane bonuses
- Social Sharing: card generator, QR codes, community feed, reactions
- Weather Impact: 7-day forecast with construction safety assessment
- Build-to-Dream Linkage: lifecycle pipeline (Dream→Design→Build→Complete)
- Alchemist Crucible: drag-and-drop ingredient combinatorial design
- Weather API: mock forecast with construction activity flags

### Wave 6 — Worldwalker, CaptureFirst, WebXR, Marketplace API, Dashboards (2026-04-06)
- Worldwalker: full spatial intelligence pipeline UI with 3D viewer and voice commands
- Worldwalker API: job processing pipeline with World Labs integration path
- CaptureFirst: camera/video capture, point cloud preview, strip-to-studs demolition
- WebXR Viewer: VR/AR-ready Three.js room with measurements, annotations, hotspots
- Marketplace API: products, quotes, orders with full CRUD
- Marketplace Transactions: Stripe integration path with fee calculation and webhooks
- Builder Dashboard: Command Center integrating all 8 Phase 1B tabs
- Platform Dashboard: lane-aware landing with XP, notifications, cross-surface bridges

---

## OPEN BLOCKERS

1. **World Labs Marble API Key** — Required for:
   - Real 3D generation in Worldwalker (pipeline UI ready)
   - Real photogrammetry in CaptureFirst (UI ready)
   - FLUX-based image synthesis in Alchemist (UI ready)
   - Status: Awaiting API access — all UI/pipeline code is deployed and waiting

2. **Stripe API Key** — Required for:
   - Real payment processing in Marketplace transactions
   - Status: Transaction API deployed with mock mode, real payments activate when STRIPE_SECRET_KEY is set
   - Status: Not yet started

---

## SESSION PROTOCOL

- **Principles:** User needs first, strategic imperatives guide all decisions
- **Decision-making:** When in doubt, check against the 4 imperatives (value discrepancy, delight layer, spatial immersion, agentic future)
- **Code quality:** All new features include test coverage, type safety (TypeScript), and accessibility compliance
- **Documentation:** Every new route/component gets API comments and usage examples
- **Review process:** Feature PRs require walkthrough against this roadmap

---

## FILE LOCATIONS

Key project files referenced in this task list:

- `/app/components/dream/DreamEditor.tsx` — Dream interface
- `/app/components/build/ProjectEditor.tsx` — Project/Builder interface
- `/app/components/knowledge/KnowledgeGraph.tsx` — Knowledge surface
- `/app/components/nav/CompassNav.tsx` — Main navigation
- `/app/api/mcp/route.ts` — MCP server
- `/lib/storage/DreamEssence.ts` — Portable dream format
- `/lib/db/schema.ts` — Database schema
- `/app/api/v1/briefing/route.ts` — Morning briefing endpoint (Phase 2B)
- `/app/api/v1/notifications/route.ts` — Notification orchestra (Phase 2C)
- `/app/api/v1/quests/route.ts` — Quest system (Phase 3B)
- `/app/api/v1/agents/route.ts` — Agent RBAC (Phase 5A)
