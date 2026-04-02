# Builder's Knowledge Garden — Tasks & Status
## Updated: 2026-03-30 (evening)

---

## CURRENT STATE SUMMARY

### What's Live & Working (builders.theknowledgegardens.com)
- **Branch:** `main` (synced to `master`)
- **Vercel:** Auto-deploys from `main`
- **24+ routes live** including all new Dream Builder interfaces
- **GitHub PAT** (`claude 2`): Has Contents: Read/Write. Use GitHub Contents API to push files.

### Routes (all returning 200)
**Homepage & Core:**
- `/` — Full homepage with hero, lifecycle phases, 7 products, pricing
- `/presentation` — Team update slide deck
- `/knowledge` + `/knowledge/[slug]` — Knowledge entity browse + detail
- `/marketplace` — Supply chain page
- `/onboard` + `/launch` + `/profile` — User flow pages
- `/cinematic.html` — v4 cinematic intro (static HTML)

**Dream Machine (9 interfaces!):**
- `/dream` — Dream Machine hub (6-path entry)
- `/dream/describe` — Text/voice → AI Dream Card ✅
- `/dream/browse` — Browse & Discover (photo alignment needs fix) ⚠️
- `/dream/sketch` — Drawing canvas with room tools ✅
- `/dream/garden` — Plant metaphor portfolio with XP ✅
- `/dream/inspire` — Show Me Inspiration ✅
- `/dream/oracle` — 🆕 The Oracle: 7 life questions → AI dream profile → 3 renders ✅
- `/dream/alchemist` — 🆕 The Alchemist: Drag ingredients → crucible → unique building ✅
- `/dream/cosmos` — 🆕 The Construction Cosmos: 3D orbital orrery ✅
- `/dream/quest` — 🆕 The Quest: RPG adventure, branching scenes, design tokens, FLUX renders ✅
- `/dream/genome` — 🆕 The Genome: DNA helix, 12 gene sliders, evolution mechanics ✅
- `/dream/narrator` — 🆕 The Narrator: Story-driven, 3 narrative paths, typewriter reveal ✅

**Killer App:**
- `/crm` — 🆕 **REBUILT as Command Center!** AI COO war room with:
  - Business pulse strip (5 metrics: projects, revenue, cash, overdue, win rate)
  - AI Attention Queue (7 items with urgency colors)
  - Active Project Cards (5 projects with health, phase, budget, risk)
  - This Week column (inspections, deliveries, meetings)
  - Weather Impact section
  - Demo data seeded (Oceanview Residence, Downtown Mixed-Use, Hillside Renovation, Tech Campus Phase 2, Beachfront Duplex)

### Database (Supabase)
- ~500 knowledge entities, 315+ relationships, 20+ jurisdictions, 8 domains
- Schema: 12 DB schemas, RSI tables, audit log, gamification tables

---

## COMPLETED TODAY (2026-03-30)

### Dream Builder — 6 New Interface Concepts Built & Deployed
- [x] The Oracle — 7 life questions → AI architectural psychology → 3 FLUX renders
- [x] The Alchemist — Drag symbols/images/words → crucible → unique building materializes
- [x] The Construction Cosmos — 3D orbital visualization (orrery for buildings)
- [x] The Quest — RPG adventure with branching scenes and design token collection
- [x] The Genome — DNA double helix with 12 gene sliders and evolution mechanics
- [x] The Narrator — Story-driven dream builder with 3 narrative paths and typewriter reveal

### Killer App — Command Center Rebuilt
- [x] Replaced old CRM pipeline viewer with AI COO Command Center
- [x] Business pulse strip with 5 live metrics
- [x] AI Attention Queue with urgency-prioritized decision items
- [x] Active Project Cards with health/phase/budget/risk
- [x] This Week upcoming items
- [x] Weather Impact section
- [x] 5 demo projects + 7 attention items seeded

### Bug Fixes
- [x] Oracle "Failed to analyze answers" — fixed answers format (array → named object)
- [x] Branch sync — force-updated `main` to match `master` (good visual version)
- [x] Pushed tracking files (tasks.todo.md, tasks.lessons.md) to repo
- [x] Pushed docs (dream-builder-brainstorm.md, killer-app-recovery-plan.md, cowork-dispatch-package.md)

---

## REMAINING PRIORITIES

### Priority 1: Polish & Connect the New Interfaces
- [ ] Oracle: Verify FLUX rendering works end-to-end (may need Anthropic API key refresh)
- [ ] Alchemist: Test drag-and-drop on mobile
- [ ] Cosmos: Verify Three.js performance, test on lower-end devices
- [ ] Quest: Test full branching flow through all scenes
- [ ] Genome: Verify 12 gene sliders produce varied outputs
- [ ] Narrator: Test all 3 narrative paths
- [ ] Browse & Discover: Fix photo alignment issue

### Priority 2: Command Center Phase 2 — Financial Layer
- [ ] Invoice generator (line items from project cost codes)
- [ ] AIA G702/G703 pay application templates
- [ ] Cash flow timeline visualization
- [ ] Job costing dashboard (budget vs actual)
- [ ] Budget Heartbeat animated visualization

### Priority 3: Command Center Phase 3 — AI Decision Engine
- [ ] Trade-off visualizer (change one variable → see ripple effects)
- [ ] Procurement intelligence (price monitoring, alternatives)
- [ ] Risk radar (weather, labor, materials, compliance)
- [ ] AI recommendations with confidence scores

### Priority 4: Worldwalker (World Labs Marble API)
- [ ] Sign up for World Labs API access
- [ ] Integrate Marble API endpoint
- [ ] SparkJS + Three.js Gaussian splat renderer
- [ ] Voice edit commands while immersed

### Priority 5: Cinematic Entry Integration
- [ ] Replace Unsplash stock with AI-generated imagery
- [ ] Wire launch sequence to actual app routes
- [ ] Integrate cinematic as Next.js first-time visitor flow

### Priority 6: Knowledge Population
- Current: ~500 entities → Target: 40,000+
- [ ] Bulk ingestion pipeline
- [ ] Cross-jurisdiction comparisons
- [ ] Cost benchmarks by region

---

## DEPLOYMENT WORKFLOW

Push files via GitHub Contents API:
```bash
TOKEN="<stored locally>"
CONTENT=$(base64 -w 0 /path/to/file)  # or base64 -i on Mac
# Create: curl -X PUT with content + branch
# Update: curl -X PUT with content + sha + branch
# Vercel auto-deploys on push to main
```

## TECH STACK
Next.js 15, TypeScript, Supabase, Clerk, Stripe, Vercel, Three.js, Tone.js, Replicate FLUX, Anthropic Claude API
Fonts: Archivo + Archivo Black
Colors: --garden #1D9E75, --dream-warm #D85A30, --dream-gold #C4A44A, --killer-red #E8443A
