# Builder's Knowledge Garden — Master Task List

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
> Status: BLOCKED

**Blocker:** World Labs API key (needed for image generation pipeline)

- [ ] Project Editor: WBS (Work Breakdown Structure) with phases, tasks, resources
- [ ] Gantt Timeline: calendar view with critical path highlighting
- [ ] Budget Module: line-item estimates, labor rates, material costs
- [ ] Resource Management: crew assignment, skill matching, capacity planning
- [ ] RFI Tracker: open request management with auto-assignment logic
- [ ] Inspection Checkpoint System: pass/fail gates with documentation
- [ ] Build-to-Dream Linkage: projects reference original dream(s)
- [ ] Permits & Compliance: checklist tracking with jurisdiction awareness

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
- [ ] Database migration: user_profiles table with lane enum (dreamer/builder/specialist/merchant/ally/crew/fleet/machine)
- [ ] Progressive Profiling onboarding: 2-3 questions → lane determination → immediate surface routing
- [ ] Update LanePicker.tsx: 8 lanes with strategy-aligned descriptions and chrome colors
- [ ] Update auth.tsx: add lane to AuthContextType, persist in user_profiles
- [ ] Update CompassNav: lane-aware destination ordering (Builder sees Killer App first, Dreamer sees Dream first)
- [ ] Lane-specific landing surfaces: each lane routes to its primary surface on login
- [ ] Progressive data collection: additional profile questions surface naturally as user engages

### 2B. Morning Briefing & Daily Story Loop
- [ ] API route: POST /api/v1/briefing — Claude-generated, lane-aware narrative briefing
- [ ] 8 distinct briefing tonalities (warm/aspirational for Dreamer, sharp/actionable for Builder, etc.)
- [ ] Morning Briefing UI: typewriter effect, appears on app open, dismissible
- [ ] 3 daily quests generated per briefing (lane-specific, advance real work)
- [ ] "AI works while you sleep" — briefing references overnight analysis
- [ ] Streak counter: consecutive days of app engagement

### 2C. Notification Orchestra (4-Tier Emotional System)
- [ ] Database: notifications table with urgency_level enum (celebration/good_news/heads_up/needs_you)
- [ ] API route: GET/POST/PATCH /api/v1/notifications
- [ ] Notification Orchestra UI: slide-out panel, grouped by urgency, color-coded borders
- [ ] Celebration tier: gold burst animation, confetti on project completions/financial milestones
- [ ] Good News tier: green glow, smooth entry for positive progression
- [ ] Heads Up tier: amber badge, proactive warnings with drafted solutions
- [ ] Needs You tier: red attention pulse, ALWAYS includes pre-researched solution
- [ ] Governing principle: every notification is a gift. If no solution/insight attached, suppress it.

### 2D. Cross-Surface Bridges (Lifecycle Continuity)
- [ ] "Make This Real" button on Dream interfaces → pre-fills project wizard (Dream→Build)
- [ ] "Use in My Dream" button on Knowledge entities → loads as Dream ingredient (Knowledge→Dream)
- [ ] "What does the code say?" link from project items → Knowledge copilot (Build→Knowledge)
- [ ] "Continue Your Dream" card on Dream hub (growth stage: seed/sprout/bloom/harvest)
- [ ] Surface Transition Banner: context-aware suggestion for next surface
- [ ] Lifecycle Progress Bar: DREAM → DESIGN → BUILD phase indicator
- [ ] CRM rebuild: business pulse + AI attention queue wired to real project data

---

## PHASE 3 — GAMIFICATION & ENGAGEMENT ENGINE
> Imperative 2: The Delight Layer is not decoration — it's core behavioral architecture.
> Every game mechanic corresponds to real-world project advancement.

### 3A. XP & Leveling System
- [ ] Database: user_xp, xp_events tables
- [ ] API route: GET/POST /api/v1/xp — award and query XP
- [ ] Lane-aware XP values (inspection_passed=200XP for Builder, dream_shared=50XP for Dreamer)
- [ ] 5 levels: Apprentice (0-499), Builder (500-1999), Craftsman (2000-4999), Master (5000-14999), Architect (15000+)
- [ ] XP Engine UI widget: level ring, animated counter, streak flame
- [ ] "+XP" floating toast on every earn event
- [ ] Level-up celebration: full-screen burst with new title

### 3B. Quest System
- [ ] Database: daily_quests table
- [ ] API route: GET /api/v1/quests/daily — 3 AI-generated lane-specific quests
- [ ] Quest completion tracking + XP award
- [ ] "Complete all 3 for 2x bonus" multiplier
- [ ] Quests advance real work (not busywork): "Resolve open RFI", "Update crew rates", "Share your design"

### 3C. Achievement Badging
- [ ] Database: achievements, user_achievements tables
- [ ] 20 launch achievements seeded (Code Whisperer, Budget Ninja, Oracle Initiate, Iron Streak, etc.)
- [ ] 3 categories: Explorer (knowledge engagement), Builder (execution excellence), Architect (creative synthesis)
- [ ] 4 rarity tiers: Common, Rare, Epic, Legendary
- [ ] Achievement unlock animation + XP bonus
- [ ] Achievement showcase on user profile
- [ ] FLUX-generated artwork for each badge (when API available)

### 3D. Streak Mechanics
- [ ] Daily streak tracking with loss-aversion psychology
- [ ] Streak multiplier on XP (7-day streak = 1.5x, 30-day = 2x)
- [ ] "Iron Streak" achievement at 30 consecutive days
- [ ] Streak-preserving actions: safety log, compliance check, dream update, knowledge search
- [ ] Gentle recovery: 1 "streak shield" per month (miss a day, keep streak)

---

## PHASE 4 — SPATIAL INTELLIGENCE & IMMERSION
> Imperative 3: The Worldwalker and Alchemist interfaces are the ultimate Dreamer hook.
> Blocked on World Labs API key — build the pipeline, ready to connect.

### 4A. Worldwalker Pipeline
- [ ] BLOCKER: World Labs Marble API key
- [ ] Image upload → API call → Gaussian splat generation
- [ ] Three.js + SparkJS renderer for browser-based 3D walkthrough
- [ ] Voice-activated modification: "raise the ceiling", "add a fireplace"
- [ ] Semantic understanding: materials, styles, dimensions detected automatically
- [ ] WebXR export for Apple Vision Pro / Meta Quest

### 4B. Capture-First Reconstruction
- [ ] Mobile video recording (30-second walkthrough)
- [ ] Photogrammetry → point cloud → spatial model
- [ ] "Strip to studs" digital sandbox mode
- [ ] Material/style identification from existing space

### 4C. Alchemist Combinatorial Design
- [ ] Drag-and-drop ingredient crucible (style word + texture + photo → unique building)
- [ ] Claude maps semantic relationships between ingredients
- [ ] FLUX/Marble renders the synthesis
- [ ] Recipe sharing: community gallery of unique combinations
- [ ] "Surprise Me" random ingredient generator

### 4D. Construction Cosmos
- [ ] Three.js orbital visualization of the knowledge graph
- [ ] Navigate entities as stars, relationships as orbital paths
- [ ] Click a node → zoom in → entity detail
- [ ] Beautiful enough to be the screensaver/ambient mode

---

## PHASE 5 — AGENTIC INTEROPERABILITY
> Imperative 4: Within 24 months, most queries will come from non-human entities.
> Build the infrastructure for the AI-driven construction economy.

### 5A. Agent RBAC & Identity
- [ ] Database: agent_identities, agent_audit_log tables
- [ ] API route: CRUD /api/v1/agents — register, manage, deactivate agents
- [ ] API key generation (bkg_agent_xxx) with bcrypt hash storage
- [ ] 3 autonomy modes: Watch (read-only), Assist (suggestions need approval), Autonomous (full delegation)
- [ ] Permission scoping per agent (which MCP tools accessible)
- [ ] Rate limiting per agent (configurable per hour)

### 5B. MCP Server Enhancement
- [ ] Auth middleware: validate agent API keys on MCP requests
- [ ] Tool-level permission checking
- [ ] Audit logging: every tool call logged with input/output/duration
- [ ] Semantic caching: identical queries return cached results (5-min TTL)
- [ ] LLM-based query routing to authorized pathways only

### 5C. Shared Autonomy Interface
- [ ] Agent activity feed: real-time view of what agents are doing
- [ ] Watch Mode UI: observe agent tasks, read logs
- [ ] Assist Mode UI: agent proposes actions, human approves/rejects
- [ ] Autonomous Mode UI: dashboard showing completed autonomous tasks
- [ ] Explainability on demand: view logic chain and source documents for any agent decision
- [ ] Kill switch: immediately revoke agent access

### 5D. Context Engineering
- [ ] Bounded context windows per agent session
- [ ] Provenance-native responses: every fact cites its knowledge entity
- [ ] Hallucination prevention: authorized agentic pathways only
- [ ] Tamper-evident audit trail for every machine-driven decision

---

## PHASE 6 — FIRST DOLLAR
> The business becomes real. Revenue from multiple lanes.

- [ ] Onboarding gate live: free Explorer tier works, upgrade moment obvious
- [ ] Shareable dream links go viral: every dream has public `/dream/share/[id]` URL
- [ ] Lead-to-warranty CRM lifecycle tracking (full pipeline)
- [ ] AI proposal generator: Claude API → formatted proposal doc (PDF export)
- [ ] Invoice module: AIA G702/G703 pay app format
- [ ] Marketplace transactions: suppliers can list, contractors can order
- [ ] Demo preparation: clean seed data, demo accounts, 5-minute guided walkthrough
- [ ] First paying customer target: one GC or developer on Pro plan

---

## DELIGHT BACKLOG (build after core phases stable)

- [ ] Voice briefings — ElevenLabs TTS for morning briefing
- [ ] Sound design — unique sounds per notification tier (celebration/good/heads-up/urgent)
- [ ] Ambient music — mood-appropriate loops per surface and phase
- [ ] Seasonal challenges — monthly themed challenges with leaderboards
- [ ] Social sharing — dreams, achievements, progress stories
- [ ] Trade-off visualizer — change one variable, see ripple across schedule/budget/risk
- [ ] Weather impact automation — auto-adjust schedules based on forecast
- [ ] Time Machine (4D build visualization via Three.js)
- [ ] Industry news feed — Claude-summarized, lane-personalized (ENR, Construction Dive, OSHA)
- [ ] Voice-first field ops — "Works With Dirty Hands" giant-button UX for Crew lane
- [ ] WebXR full VR/AR walkthrough (Apple Vision Pro + Quest)

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

---

## OPEN BLOCKERS

1. **World Labs Marble API Key** — Required for:
   - Image → Gaussian splat generation (Worldwalker)
   - Photogrammetry reconstruction pipeline
   - FLUX-based image synthesis in Alchemist
   - Status: Awaiting API access

2. **Domain & SSL** — Production deployment needs custom domain setup
   - Status: Pending business decision

3. **Payment Infrastructure** — Stripe integration for Phase 6
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
