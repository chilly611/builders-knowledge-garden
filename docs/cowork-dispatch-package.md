# COWORK DISPATCH — Builder's Knowledge Garden
## 4 Tasks Ready to Launch
### Created: 2026-03-30

---

# HOW TO USE THIS

In Cowork, click **"+ New task"** for each of the 4 tasks below.
- Set the project to **Builder's Knowledge Garden**
- Paste the entire task spec into the task description
- Set model to **Opus 4.6**
- Each task is self-contained with full context

Make sure your Cowork project has the **Builder's Knowledge Garden** folder connected under Context → Working folders (you already have this set up based on your screenshot).

---

---

# TASK 1: THE ORACLE — AI Dream Profiler
## (Fastest to ship — mostly Claude + FLUX, minimal new UI)

---

**Goal:** Build "The Oracle" — a dream builder interface where users answer 7 questions about their LIFE (not architecture), and AI reverse-engineers the building that fits them. This replaces/supplements the current Browse & Discover experience.

**What this is:** Instead of asking "how many bedrooms?" like every other tool, we ask "What does your perfect morning look like?" and "What makes you feel safe?" — then Claude maps those answers to spatial needs, material preferences, light quality, and scale. We render 3 wildly different buildings that all embody those answers.

**Location:** `src/app/dream/oracle/page.tsx` (new route)

**Design specs:**
- Warm/gold chrome (#D85A30 / #C4A44A) — this is Dream Machine territory
- Archivo font family (already global)
- Dark background, immersive feel — NOT a form, more like a conversation
- Each question appears one at a time, full screen, with atmospheric imagery behind it
- Voice input option on every question (mic icon)
- After all 7 questions: dramatic reveal sequence → "dream profile" card → 3 building renders

**The 7 Questions (design these beautifully, one per screen):**
1. "What does your perfect morning look like?" (captures light, orientation, kitchen/outdoor relationship)
2. "How do you entertain?" (captures social spaces, indoor-outdoor flow, kitchen scale)
3. "What's your relationship with nature?" (captures windows, outdoor spaces, materials, landscaping)
4. "Describe the most beautiful place you've ever been." (captures aesthetic DNA, texture, mood)
5. "What makes you feel safe?" (captures enclosure, privacy, security, material weight)
6. "How do you recharge?" (captures private spaces, bathroom luxury, quiet zones)
7. "What would your home say about you to a stranger?" (captures identity, style ambition, personality)

**Technical implementation:**
- State machine: 7 questions → processing → profile → renders
- Each answer → Claude API call to extract architectural implications (async, don't block UI)
- After all 7: Claude synthesizes into a "dream profile" JSON: `{lightPreference, socialScale, natureRelationship, aestheticDNA, securityStyle, retreatNeeds, identityStatement, inferredStyle, inferredMaterials, inferredScale}`
- Dream profile → 3 FLUX image generations via `/api/v1/render` (already exists) with 3 different architectural interpretations
- Save dream profile to Supabase `dreams` table (schema already exists)
- Shareable URL: `/dream/shared/[slug]`

**API keys (in .env.local on the machine):**
- ANTHROPIC_API_KEY for Claude reasoning
- REPLICATE_API_TOKEN for FLUX image generation
- Supabase keys for persistence

**Success criteria:**
- Route `/dream/oracle` loads and shows question 1
- All 7 questions work with text input
- Claude generates a coherent dream profile from answers
- 3 different building renders appear after processing
- The whole experience takes < 90 seconds
- It feels MAGICAL, not like filling out a form

**Reference:** The existing Dream Machine at `/dream` shows the navigation patterns. The Describe Your Dream page at `/dream/describe` shows the Claude + FLUX pipeline. Reuse those patterns.

---

---

# TASK 2: THE ALCHEMIST — Combinatorial Dream Builder
## (Highest virality potential, replaces Browse & Discover)

---

**Goal:** Build "The Alchemist" — a dream builder interface where users drag symbols, images, words, textures, and moods onto a mystical workbench. The combination "reacts" and a unique building concept materializes.

**What this is:** A floating palette of "ingredients" — style tags ("Mediterranean", "Brutalist", "Farmhouse"), material swatches (warm wood, raw concrete, glass), feature tokens (infinity pool, courtyard, rooftop garden), mood images (sunset, mountains, city lights), and wild cards (emojis, uploaded photos). Users drag 3-7 ingredients into a central "crucible." An animation plays (swirl, react, spark), and a completely unique building concept materializes with a full render, description, and cost estimate.

**Location:** `src/app/dream/alchemist/page.tsx` (new route)

**Design specs:**
- Warm/gold chrome, dark background — the "workbench" feel
- Ingredient palette: scrollable horizontal trays at the bottom, categorized
- Central crucible: circular drop zone, center screen, with particle effects
- When ingredients are dropped in: they orbit inside the crucible
- "Transmute" button: triggers the reaction animation
- Result: full-bleed render with concept card overlay

**Ingredient categories (build the palette):**
- **Styles** (15-20 tags): Mediterranean, Modern, Craftsman, Art Deco, Brutalist, Japanese, Scandinavian, Spanish Colonial, Industrial, Farmhouse, Tudor, Prairie, Tropical, Minimalist, Biophilic, etc.
- **Materials** (10-15 swatches): Warm wood, Raw concrete, Brushed steel, Natural stone, Floor-to-ceiling glass, Exposed brick, Terracotta, Copper, Marble, Bamboo
- **Features** (15-20 tokens): Infinity pool, Courtyard, Green roof, Home theater, Chef's kitchen, Library, Wine cellar, Rooftop deck, Indoor-outdoor living, Skylight, Firepit, Workshop, Home gym
- **Moods** (8-10): 🌅 Sunset, 🏔️ Mountains, 🌊 Ocean, 🌲 Forest, 🏙️ City, 🌸 Garden, ❄️ Snow, 🌙 Night
- **Upload**: drag a photo from your phone/desktop as an ingredient

**Technical implementation:**
- React DnD or custom drag-and-drop (keep it smooth, 60fps)
- Crucible state: array of ingredient objects `{type, value, id}`
- On "Transmute": 
  1. Play swirl animation (CSS/Three.js particles)
  2. Send ingredients to Claude API: "Given these design ingredients: [list], synthesize a unique building concept. Return: name, description, style analysis, estimated cost range, 3 key features, and a detailed image prompt for FLUX."
  3. Claude returns JSON → fire FLUX render with the image prompt
  4. Display result card with render + concept details
- "Save Recipe" → save ingredient combination to Supabase
- "Share Recipe" → shareable URL that pre-loads the same ingredients
- "Remix" → modify ingredients and re-transmute

**Success criteria:**
- Smooth drag-and-drop at 60fps
- At least 50 ingredients across all categories
- Transmutation animation feels MAGICAL (not loading spinner)
- Every combination produces something unique
- Recipe sharing works via URL
- The whole flow from first drag to rendered result < 60 seconds

**Reference files:**
- `src/app/dream/browse/page.tsx` — current browse page to understand navigation
- `src/app/dream/describe/page.tsx` — Claude + FLUX pipeline pattern
- `src/components/CopilotPanel.tsx` — Claude API calling pattern

---

---

# TASK 3: THE CONSTRUCTION COSMOS — Orrery for Buildings
## (Reuses orchid orrery architecture, showcases Knowledge Garden)

---

**Goal:** Build "The Construction Cosmos" — a 3D orbital visualization of the entire building universe, like the orchid orrery (https://orchids.theknowledgegardens.com/orrery) but for construction. At the center: the user's emerging dream. Orbiting it: architectural styles, materials, building codes, trades, costs — all interconnected, all navigable.

**What this is:** A Three.js 3D scene with concentric orbits. The center glows with a representation of the user's current dream (starts as an abstract form, gains definition as they interact). Inner orbit: architectural styles (Mediterranean, Modern, Craftsman, etc.) as clickable nodes. Middle orbit: materials (timber, steel, concrete, glass, stone). Outer orbit: constraints (codes, budget, climate, lot size). Users click or drag orbital elements toward the center to influence the design. As elements accumulate, the center morphs.

**Location:** `src/app/dream/cosmos/page.tsx` (new route)

**Design specs:**
- Green chrome (#1D9E75) — this is Knowledge Garden territory (educational/scientific)
- Dark background (space-like), subtle star particles
- Three.js scene fills the viewport
- Orbital rings visible as subtle glowing circles
- Each node: sphere or icon with label, hover shows details
- Drag interaction: pull a node toward center → it "absorbs" → center morphs
- Click a node → side panel shows Knowledge Garden entity details
- Smooth camera: orbit controls, zoom to nodes, auto-rotate when idle

**Orbit layers:**
1. **Center (r=0):** User's dream — starts as glowing abstract form, gains architectural shape
2. **Inner orbit (r=150):** 12 Architectural Styles — each a sphere with style name, click to see examples
3. **Middle orbit (r=300):** 8 Material Families — timber, steel, concrete, masonry, glass, stone, composite, earth
4. **Outer orbit (r=450):** Constraints — IBC code nodes, budget brackets, climate zones, lot sizes
5. **Background:** Particle field (stars), subtle nebula gradients

**Technical implementation:**
- Three.js scene with OrbitControls
- Each orbital node: Three.js Mesh (sphere geometry) + HTML label (CSS2DRenderer)
- Orbit animation: nodes rotate on their orbital path at different speeds
- Interaction: raycasting for click/hover, drag-toward-center with spring physics
- When element absorbed: 
  1. Animate node flying to center
  2. Update center mesh (morph geometry or swap model)
  3. Trigger AI: "User selected [style/material/constraint]. Update building concept."
  4. Optionally render a small preview image
- Knowledge Garden connection: each node links to real entity data from `/api/v1/entities`
- Camera: THREE.OrbitControls with damping, auto-rotate, zoom limits

**Reference:** Study the orchid orrery at https://orchids.theknowledgegardens.com/orrery for the interaction model. We already have Three.js in the project (`src/components/BuildingViewer.tsx` has the Three.js setup pattern).

**Data source:** Fetch styles/materials/codes from `/api/v1/search` and `/api/v1/entities` endpoints (already built).

**Success criteria:**
- 3D scene loads smoothly (60fps on modern hardware)
- All three orbital layers visible and rotating
- Click any node → see Knowledge Garden details
- Drag a style toward center → center reacts
- Feels like the orchid orrery but for construction — "wow, this is how building works"
- Works on desktop; degrades gracefully on mobile (2D fallback OK)

---

---

# TASK 4: KILLER APP COMMAND CENTER — Replace the CRM
## (The AI COO war room that makes contractors feel superhuman)

---

**Goal:** Replace the current `/crm` page with The Command Center — the AI COO war room described in the presentation. NOT a CRM. A living dashboard that tracks hundreds of variables across all projects and surfaces what matters NOW.

**What this is:** When a contractor logs in, this is the first screen they see. It shows their entire business at a glance: every project's health, every pending decision, cash flow, upcoming inspections, weather impact, and AI-prioritized recommendations. It makes them feel like they have a superhuman COO.

**Location:** `src/app/crm/page.tsx` (replace existing file)

**Design specs:**
- Red chrome (#E8443A) — this is Killer App territory
- Dark background for the header hero, white/light for the dashboard body
- Dense but not cluttered — think Bloomberg Terminal meets Apple design
- Every number should feel ALIVE (subtle animations, pulse on change)
- Archivo font family

**Layout (4 zones):**

**ZONE 1 — Top Strip: Business Pulse**
- 5 metric cards in a row:
  - Active Projects: count + mini sparkline
  - Monthly Revenue: vs projected (green if ahead, red if behind)  
  - Cash Position: available vs committed
  - Overdue Items: red badge count
  - Win Rate: trailing 6 months
- Each card: ~120px wide, subtle border, number large, label small

**ZONE 2 — Left Column (30%): AI Attention Queue**
- Header: "Needs Your Attention" with count badge
- Stack of cards, each one is a decision the AI has identified:
  - Icon + urgency color (red/yellow/green)
  - Title: "Steel delivery delayed 2 weeks"
  - Body: "Project: Oceanview Residence. Impact: 5-day schedule slip. Options: expedite (+$2,400), substitute material, adjust sequence."
  - Action buttons: "View Options" / "Snooze" / "Delegate"
- AI generates these from project data + external signals (weather, prices, permits)
- For demo: seed 5-7 realistic attention items

**ZONE 3 — Center (45%): Active Project Cards**
- Grid of project cards (2 columns)
- Each card shows:
  - Project name + photo thumbnail
  - Phase indicator (DREAM → DESIGN → PLAN → BUILD → DELIVER → GROW)
  - Progress bar (% complete)
  - Budget burn rate (ahead/on track/over — color coded)
  - Risk level (low/medium/high — icon)
  - Next milestone + days until
  - Click → navigates to full project dashboard (/launch with project data)
- For demo: seed 5 projects at different stages

**ZONE 4 — Right Column (25%): Upcoming & Weather**
- This Week section:
  - Calendar-style list of inspections, deliveries, meetings
  - Each with time, project name, and type icon
- Weather Impact:
  - 5-day forecast for primary project location
  - Flags: "Rain Thursday — 2 active projects affected"
- Payment Timeline:
  - Next 3 incoming payments (expected) + next 3 outgoing (committed)
  - Mini cash flow bar chart

**Demo data to seed (build this into the component):**
```
Projects:
1. "Oceanview Residence" — BUILD phase, 62% complete, $1.2M budget, on track
2. "Downtown Mixed-Use" — PLAN phase, 15% complete, $8.5M budget, over budget
3. "Hillside Renovation" — DESIGN phase, 30% complete, $420K budget, on track  
4. "Tech Campus Phase 2" — BUILD phase, 85% complete, $24M budget, ahead
5. "Beachfront Duplex" — DELIVER phase, 95% complete, $680K budget, on track

Attention Queue:
1. 🔴 "Steel delivery delayed" — Oceanview, 5-day slip, 3 options
2. 🟡 "Permit expiring in 5 days" — Downtown, renewal needed
3. 🟡 "Change order unsigned" — Hillside, client hasn't responded in 4 days
4. 🟢 "Inspection passed" — Tech Campus, electrical sign-off complete
5. 🔴 "Budget variance alert" — Downtown, 12% over in concrete costs
6. 🟡 "Weather alert" — Rain Thursday, affects Oceanview foundation pour
7. 🟢 "Payment received" — Beachfront, $68K draw #4 cleared
```

**Technical implementation:**
- React client component with useState for demo data (no API calls needed for v1)
- Framer Motion for card animations (already in project)
- Click project card → navigate to `/launch?project=[id]`
- Attention queue items: expandable cards with action buttons
- All data hardcoded in component for demo — API integration comes later
- Keep CopilotPanel integration (the floating AI button, already exists)

**Success criteria:**
- Page loads with all 4 zones populated
- Looks like a Bloomberg Terminal designed by Apple
- 5 project cards with realistic data
- 7 attention queue items with urgency colors
- Upcoming section with inspections/deliveries
- Feels like you're looking at your ENTIRE BUSINESS in one glance
- The contractor reaction: "holy shit, it sees EVERYTHING"

**Reference:** Read `docs/killer-app-recovery-plan.md` in the repo (just pushed). The presentation slide for "15 UX Strategies" defines: Command Center, Smart Alerts, Trade-Off Viz, Budget Heartbeat, AI Decisions, Permit Tracker, Team Orchestrator, Procurement, Risk Radar, Progress Story, Finance Nav, Contract Companion, Quality Score, Security, Compromise Calculator.

---

---

# QUICK REFERENCE — SHARED ACROSS ALL TASKS

**Repo:** github.com/chilly611/builders-knowledge-garden (branch: main)
**Live:** builders.theknowledgegardens.com
**Stack:** Next.js 15, TypeScript, Supabase, Clerk, Stripe, Vercel
**Fonts:** Archivo (body), Archivo Black (display)
**Colors:** --garden: #1D9E75, --dream-warm: #D85A30, --dream-gold: #C4A44A, --killer-red: #E8443A
**Deploy:** Push to main → Vercel auto-deploys

**Key existing files to study:**
- `src/app/dream/describe/page.tsx` — Claude + FLUX pipeline
- `src/app/dream/page.tsx` — Dream Machine navigation
- `src/components/CopilotPanel.tsx` — Claude API calling pattern
- `src/components/BuildingViewer.tsx` — Three.js setup
- `tasks.todo.md` — full project status
- `tasks.lessons.md` — patterns and mistakes to avoid
- `docs/dream-builder-interface-brainstorm.md` — full brainstorm (18 concepts)
- `docs/killer-app-recovery-plan.md` — gap analysis and rebuild plan
