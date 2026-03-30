# Builder's Knowledge Garden — Tasks & Status
## Updated: 2026-03-30

---

## CURRENT STATE SUMMARY

### What's Live & Working (builders.theknowledgegardens.com)
- **Branch:** `main` (force-synced to `master` on 2026-03-29)
- **Vercel:** Auto-deploys from `main`
- **18 routes live:** /, /dream, /dream/describe, /dream/browse, /dream/sketch, /dream/garden, /dream/inspire, /dream/explore, /dream/plans, /dream/shared/[slug], /knowledge, /knowledge/[slug], /crm, /marketplace, /presentation, /onboard, /launch, /profile
- **Static:** /cinematic.html (v4: Spanish villa dream, luxury art interior, surrealist tool garden)
- **GitHub PAT** (`claude 2`): `<GITHUB_PAT_STORED_LOCALLY>` — has Contents: Read/Write for the repo. Use GitHub Contents API to push files.

### What's Been Built (master branch, March 26-28)
- Cinematic entry experience (4-scene intro, Ken Burns zoom, skip button, progress bar)
- Dream Machine: Describe, Inspire, Browse, Sketch, Surprise Me, Dream Garden (XP/achievements)
- Smart Project Launcher: 4-step wizard → 7-tab dashboard (Overview, Codes, Schedule, Materials, Team, Permits, Budget)
- CRM: Basic pipeline viewer (stages, temperature, lead scoring) — NEEDS MAJOR UPGRADE
- Knowledge browse with entity detail pages
- Marketplace page (placeholder)
- Presentation page (team update slides)
- Onboard flow, Profile page
- AI Copilot (RAG pipeline, streaming, citations, floating panel)
- MCP Server (10 tools, 2ms latency)
- Gamification Phase 1 (Fog of War, Quest Line, Confidence Score, Celebrations)
- Three.js BuildingDesigner with parametric sliders
- Tone.js sound engine
- Replicate FLUX 1.1 Pro AI image generation
- Logo asset library (transparent variants, outline styles, app icons, favicon, OG images)
- Visual transformation: photo heroes, Archivo font family, dark/light theme with CSS vars

### Database (Supabase)
- ~500 knowledge entities seeded
- 315+ knowledge graph relationships
- 20+ jurisdictions (IBC, LA, NYC, Asheville, Miami, UK, EU, Japan, India, Dubai, etc.)
- 8 knowledge domains
- Schema: 12 DB schemas, RSI tables, audit log, gamification tables

---

## ACTIVE PRIORITIES (as of 2026-03-30)

### 🔥 Priority 1: Dream Builder — 4 New Interface Concepts
Replace current Browse & Discover with transformative experiences.
See: `dream-builder-interface-brainstorm.md` in project files

#### 1A. The Alchemist (#8) — SPRINT 1
- Drag symbols, images, words, textures onto a mystical workbench
- Combinations "react" and a unique building concept materializes
- Shareable "recipes" for virality
- Tech: Drag-and-drop UI, Claude for combinatorial reasoning, FLUX/Marble for output
- [ ] Design the ingredient palette (styles, materials, features, moods, photos, emojis)
- [ ] Build drag-and-drop crucible UI (React DnD or custom)
- [ ] Wire Claude API for combinatorial synthesis
- [ ] Wire FLUX/Replicate for concept rendering
- [ ] "Recipe" save and share (shareable URL)
- [ ] Animation: swirl/react/materialize sequence

#### 1B. The Worldwalker (#1) — SPRINT 2
- World Labs Marble API generates navigable 3D worlds from images/text
- Walk through your dream in the browser in 30 seconds
- Tech: World Labs API ($20-95/mo), SparkJS (Three.js integration), Gaussian splats
- [ ] Sign up for World Labs API access (marble.worldlabs.ai)
- [ ] Integrate Marble API endpoint
- [ ] SparkJS + Three.js Gaussian splat renderer
- [ ] Voice edit commands while immersed
- [ ] Export to VR (WebXR for Vision Pro / Quest)

#### 1C. The Construction Cosmos (#17) — SPRINT 3
- 3D orbital visualization of the building universe (like orchid orrery)
- Center: your dream. Orbits: styles, materials, codes, constraints
- Tech: Three.js orbital mechanics, parametric building generator
- [ ] Port orchid orrery orbital mechanics to construction context
- [ ] Define orbit layers (styles, materials, codes, constraints)
- [ ] Interactive: drag elements toward center to influence design
- [ ] Connect to Knowledge Garden entities
- [ ] Parametric building morphing in center

#### 1D. The Oracle (#10) — SPRINT 1 (fastest to ship)
- 7 questions about YOUR LIFE (not architecture) → AI reverse-engineers the building
- "What does your perfect morning look like?" → spatial needs, materials, light quality
- Tech: Claude for psychological → architectural mapping, FLUX for rendering
- [ ] Design the 7 questions
- [ ] Claude prompt engineering for life→architecture mapping
- [ ] Generate "dream profile" visualization
- [ ] Render 3 wildly different buildings from answers
- [ ] Save and share dream profile

### 🔥 Priority 2: Killer App — Command Center Rebuild
The CRM page must become an AI COO war room, not a SaaS CRM demo.
See: `killer-app-recovery-plan.md` in project files

#### Phase 1: Command Center (replace /crm)
- [ ] Top strip: Business pulse (active projects, monthly revenue, cash position, overdue count)
- [ ] Left column: AI Attention Queue (prioritized decisions needed NOW)
- [ ] Center: Active Project Cards (health dots, phase, % complete, budget burn, risk)
- [ ] Right column: Upcoming (inspections, deliveries, weather, payments)
- [ ] Seed realistic demo data (5 projects, 20 contacts, financial data)
- [ ] Connect launcher projects to Command Center

#### Phase 2: Smart Financial Layer
- [ ] Invoice generator (line items from project cost codes)
- [ ] AIA G702/G703 pay application templates
- [ ] Cash flow timeline visualization
- [ ] Job costing dashboard (budget vs actual)
- [ ] Budget Heartbeat animated visualization

#### Phase 3: AI Decision Engine
- [ ] Trade-off visualizer (change one variable → see ripple effects)
- [ ] Procurement intelligence (price monitoring, alternative suggestions)
- [ ] Risk radar (weather, labor, materials, compliance monitoring)
- [ ] AI recommendations with confidence scores

### Priority 3: Browse & Discover Photo Fix
- [ ] Fix photo alignment in Browse & Discover grid
- [ ] Ensure architecture style photos render correctly at consistent aspect ratios

### Priority 4: Cinematic Entry — Ongoing Iteration
- [x] v4 deployed: Spanish villa infinity pool, luxury art interior finale, surrealist tool garden
- [ ] Replace Unsplash stock with custom AI-generated imagery (Replicate FLUX)
- [ ] Wire launch sequence to actual app routes
- [ ] Integrate cinematic as Next.js entry (first-time visitor flow)

### Priority 5: Knowledge Population
- Current: ~500 entities
- Target: 40,000+ entities
- [ ] Bulk ingestion pipeline for building codes
- [ ] Cross-jurisdiction comparisons
- [ ] Cost benchmarks by region
- [ ] Material sustainability ratings

---

## DEPLOYMENT WORKFLOW

```bash
# Push file to GitHub (from any environment with curl)
TOKEN="<GITHUB_PAT_STORED_LOCALLY>"
CONTENT=$(base64 -w 0 /path/to/file.ext)  # or base64 -i on Mac
SHA="<get from API first if updating existing file>"

# Create new file:
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/chilly611/builders-knowledge-garden/contents/path/to/file.ext" \
  -d '{"message":"commit msg","content":"'$CONTENT'","branch":"main"}'

# Update existing file (need SHA):
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/chilly611/builders-knowledge-garden/contents/path/to/file.ext" \
  -d '{"message":"commit msg","content":"'$CONTENT'","sha":"'$SHA'","branch":"main"}'

# Vercel auto-deploys on push to main
```

---

## TECH STACK REFERENCE
- Next.js 15 (App Router), TypeScript, Supabase, Clerk auth, Stripe, Vercel
- Archivo + Archivo Black fonts
- CSS vars: --garden (#1D9E75), --dream-warm (#D85A30), --dream-gold (#C4A44A), --killer-red (#E8443A)
- Three.js for 3D, Tone.js for sound, Replicate FLUX for AI images
- Anthropic Claude API for AI copilot and reasoning
