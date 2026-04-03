# Builder's Knowledge Garden — Tasks & Status
## Updated: 2026-04-02 (strategic reorientation)

---

## CURRENT STATE SUMMARY

### What's Live (builders.theknowledgegardens.com)
- **Branch:** `main` | **Deploy:** Vercel auto-deploys on push
- **15 Dream Machine interfaces** — all with FLUX-generated branded logos
- **Command Center** — AI COO war room at /crm
- **Dream State persistence** — Supabase table + API route live
- **Killer App nav** — 7 module pills with status badges
- **Stub pages** — Field Ops, Finances, Clients, Documents, Site Intel (preview only)

### Dream Machine Routes (15 total, all returning 200)
| Route | Interface | Logo |
|-------|-----------|------|
| /dream/describe | Describe Your Dream | ✅ Golden quill |
| /dream/inspire | Show Me Inspiration | ✅ Crystal prism |
| /dream/sketch | Sketch It Out | ✅ Golden compass |
| /dream/explore | Surprise Me | ✅ Golden dice |
| /dream/browse | Browse & Discover | ✅ Gallery frames |
| /dream/plans | I Have Plans | ✅ Rolled blueprints |
| /dream/oracle | The Oracle | ✅ Sacred eye |
| /dream/alchemist | The Alchemist | ✅ Golden crucible |
| /dream/quest | The Quest | ✅ Sword & cornerstone |
| /dream/genome | The Genome | ✅ DNA helix |
| /dream/cosmos | The Cosmos | ✅ Golden orrery |
| /dream/narrator | The Narrator | ✅ Book & architecture |
| /dream/collider | The Collider | ✅ Particle beams |
| /dream/sandbox | The Sandbox | ✅ Golden blocks |
| /dream/voice | The Voice Architect | ✅ Golden microphone |

### Database (Supabase)
- `dream_states` table ✅ (26 columns, indexes, RLS)
- `command_center_projects` + `command_center_attention` ✅
- Dream State API at `/api/v1/dreams/state` ✅
- ~500 knowledge entities, 315+ relationships, 20+ jurisdictions

---

## DESIGN MANDATE (effective 2026-04-02)

**LIGHT backgrounds globally. No exceptions.**
- Page canvas: #FFFFFF (pure white)
- Card surfaces: #FAFAF8 (warm white)
- Recessed surfaces: #F5F5F0 (inputs, sidebars, metric cards)
- Hover: #EEEDE8 | Active: #E8E7E2
- Three chromes for color identity: Green #1D9E75 / Warm #D85A30 / Red #E8443A
- Typography: Archivo (body) + Archivo Black (display)
- Photography provides depth — not dark surfaces
- No dark backgrounds on any page unless explicitly requested for a specific context

---

## COMPETITIVE GAP ANALYSIS (2026-04-02)
Full Procore vs Oracle Smart Construction Platform report analyzed. 37 features mapped.

### 11 Critical Gaps (table-stakes features we must build)
These are what professionals ask about in the first 5 minutes of evaluating PM software:

| # | Gap | Why Critical | Sprint |
|---|-----|-------------|--------|
| 1 | RFI management | Every GC manages RFIs daily. Procore links RFIs to drawing callouts. | S3 |
| 2 | Submittal tracking | Log, review, approve submittals — specs compliance. | S3 |
| 3 | Change order management | CO creation, financial impact, approval workflows. | S3 |
| 4 | Punch list / closeout | Photo capture, assign, resolve — project handoff. | S3 |
| 5 | Budget tracking | Real-time budget vs actual. Procore draws from field data. | S3 |
| 6 | Invoice / pay apps | AIA G702/G703. Textura charges 0.22% of contract value for this. | S4 |
| 7 | Daily log module | Site conditions, weather, workforce, equipment. Voice-first. | P2 |
| 8 | Drawing management | PDF upload, OCR extraction (Claude Vision), revision tracking. | P2 |
| 9 | Document CDE | Centralized storage with audit trail, cross-module linking. | P2 |
| 10 | Inspection forms | Customizable quality/safety templates, field capture. | P2 |
| 11 | Bid management | Distribute packages, collect proposals, track coverage. | P2 |

### 12 Structural Advantages (competitors cannot replicate)
1. Construction knowledge engine (40K+ entities)
2. Dream → plan in 60 seconds
3. $49/mo transparent published pricing
4. Voice as universal layer (30+ languages)
5. AI-native architecture with RAG + citations
6. 7 self-improving RSI loops
7. Global jurisdiction awareness (142+)
8. Machine/AI agent MCP integration
9. Construction-specific CRM
10. Supplier marketplace (Stripe Connect)
11. Gamified onboarding (28 strategies, 5-min target)
12. Procore takes 4-6 weeks to onboard. Oracle takes 3-6 months. We target 5 minutes.

---

## REVISED SPRINT PLAN — 6 Weeks to Revenue-Ready

### Sprint 1: Foundation Reset + Light Mode (Week 1)
- [ ] Global light theme: globals.css, all page backgrounds, cards, nav
- [ ] Cinematic entry rebuild on light backgrounds
- [ ] Homepage rewrite: light, clean, Archivo Black, construction photography
- [ ] Compass bloom navigation (mobile FAB + desktop sidebar)
- [ ] Kill all "coming soon" — build functional or remove link

### Sprint 2: Knowledge Engine + Copilot (Week 2)
- [x] Database population: 500 → 2,204 entities ✅ DONE
- [ ] Knowledge browse: rich cards, search-as-you-type, jurisdiction filtering
- [ ] Knowledge detail pages: SEO-optimized, deep content, related entities
- [ ] AI Copilot: RAG with real Supabase data, citation links
- [ ] Voice input polish across copilot + dream builder

### Sprint 3: The COO — Smart Project Launcher (Weeks 3-4)
- [ ] Project creation: building type → jurisdiction → auto-populate everything
- [ ] AI estimate with real cost data, CSI division breakdown
- [ ] AI schedule: constraint-aware, jurisdiction hold points, Gantt
- [ ] 7-tab dashboard (Overview, Codes, Schedule, Materials, Team, Permits, Estimate)
- [ ] **RFI module** — create, track, assign, resolve, link to entities
- [ ] **Submittal log** — create, review, approve, link to specs
- [ ] **Change order module** — creation, financial impact, approval
- [ ] **Punch list** — items with photo capture, assign, resolve
- [ ] **Budget tracking** — budget vs actual by cost code
- [ ] Gamification: confidence score, completion rings, quest-line
- [ ] Stripe Pro tier ($49/mo) paywall on project creation

### Sprint 4: CRM + Dream Machine + Invoicing (Week 5)
- [ ] CRM rebuild: business pulse, AI attention queue, pipeline
- [ ] Lead → proposal → contract → project → warranty lifecycle
- [ ] AI proposal generator from project + knowledge data
- [ ] **Invoice / pay app module** — AIA G702/G703, payment tracking
- [ ] Dream Builder: ship Oracle + Alchemist interfaces fully functional
- [ ] Dream → Project conversion (pre-populate Smart Launcher)
- [ ] Shareable dream links (viral)

### Sprint 5: API + Machine Layer + Demo-Ready (Week 6)
- [ ] MCP server: batch endpoints, webhooks, confidence scores
- [ ] API docs: OpenAPI spec, playground, examples
- [ ] Platform tier with self-serve API keys
- [ ] Performance: <2s loads, skeletons, progressive loading
- [ ] Mobile responsiveness on real devices
- [ ] Demo prep: walkthrough recording, pitch deck, live script

### Phase 2 (Post-Revenue, Weeks 7-12)
- [ ] Daily log (voice-first)
- [ ] Drawing management with Claude Vision OCR
- [ ] Document CDE with audit trail
- [ ] Inspection forms engine
- [ ] Bid management
- [ ] Offline PWA (service worker)
- [ ] Lien waiver automation
- [ ] Cash flow forecasting
- [ ] Portfolio analytics / executive dashboards
- [ ] ERP connectors (QuickBooks, Xero, Sage)

### Phase 3 (Months 4-6)
- [ ] BIM viewer (Three.js)
- [ ] Resource leveling / capacity planning
- [ ] Risk register
- [ ] Last Planner / lean workflows
- [ ] Native mobile app
- [ ] Training academy v1
- [ ] Cross-org document sharing
