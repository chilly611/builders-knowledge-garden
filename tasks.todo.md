# Builder's Knowledge Garden — Tasks & Status
## Updated: 2026-04-01 (evening)

---

## CURRENT STATE SUMMARY

### What's Live (builders.theknowledgegardens.com)
- **Branch:** `main` | **Deploy:** Vercel auto-deploys on push
- **15 Dream Machine interfaces** — all with FLUX-generated branded logos
- **Command Center** — AI COO war room at /crm
- **Dream State persistence** — Supabase table + API route live

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

### Killer App
| Route | Status |
|-------|--------|
| /crm | ✅ Command Center live (business pulse, attention queue, project cards, weather) |

### Database (Supabase)
- `dream_states` table ✅ created with 26 columns, indexes, RLS
- Dream State API at `/api/v1/dreams/state` ✅ (POST create/update, GET retrieve)
- ~500 knowledge entities, 315+ relationships, 20+ jurisdictions

### Permanent Assets
- 15 FLUX logos at `public/logos/dream/*.webp`
- BKG logo variants at `public/logo/`
- Cinematic entry at `public/cinematic.html`

---

## COMPLETED (this session)

- [x] 15 FLUX-generated branded logos for all Dream interfaces
- [x] Dream hub updated with 15 cards + permanent logo URLs
- [x] 3 new interfaces built: Collider, Sandbox, Voice Architect
- [x] Dream State API + Supabase table created and tested
- [x] CLAUDE.md pushed with mandatory session protocol
- [x] Session log, tasks, lessons all updated
- [x] Oracle bug fixed (array → named object format)
- [x] Unicode minus sign build error fixed in Collider

---

## NEXT PRIORITIES

### Priority 1: Wire Dream Interfaces to Dream State API
Each interface should save its data to the shared dream_state on user interaction:
- [ ] Oracle: save oracle_profile after analysis
- [ ] Alchemist: save alchemist_recipe after transmutation
- [ ] Quest: save quest_tokens after each scene
- [ ] Genome: save genome_dna on slider changes
- [ ] Narrator: save narrator_story on path completion
- [ ] Collider: save collider_synthesis after collision
- [ ] Sandbox: save sandbox_blocks on preview
- [ ] Voice: save voice_conversation on send
- [ ] Cosmos: save cosmos_selections on element absorption
- [ ] Describe: save describe_text on submit
- [ ] Sketch: save sketch_data on save
- [ ] Inspire: save inspire_photos on analysis

### Priority 2: Dream Continuity UX
- [ ] "Continue Your Dream" card on hub page (shows active dream, growth stage)
- [ ] Dream selector: switch between saved dreams
- [ ] Cross-interface synthesis: when dream has data from 3+ interfaces, show unified concept
- [ ] Growth visualization: seed → sprout → sapling → bloom animation

### Priority 3: Command Center Phase 2 — Financial Layer
- [ ] Invoice generator, AIA pay apps, cash flow, job costing, Budget Heartbeat

### Priority 4: Worldwalker (World Labs Marble API)
- [ ] Sign up, integrate API, SparkJS renderer, voice editing

### Priority 5: Polish & Testing
- [ ] Oracle: verify FLUX rendering end-to-end
- [ ] Browse & Discover: fix photo alignment
- [ ] Mobile testing across all 15 interfaces
- [ ] Each interface: add "Start this project" → paid gate

### Priority 6: Knowledge Population
- ~500 entities → 40,000+ target
