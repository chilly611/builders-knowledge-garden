# Builder's Knowledge Garden — Session Log
## Persistent record of all work sessions (Chat + Cowork)

Every agent (Chat or Cowork) appends a session entry at the end of every work session.
This file is the canonical timeline of what was built, when, and why.

---

## 2026-03-28 — Chat Session: Visual Transformation
**Agent:** Chat (Claude Opus)
**What was built:**
- Cinematic entry experience prototype (public/cinematic.html)
- 4-scene intro: glass tower → warm home → workers → completed architecture
- 3-column path cards (Dream/Build/Supply) + full-width Explore the Garden card
- Surrealist tool collage for Explore card (crane, theodolite, compass, drill, hammer)
- Deployed to builders.theknowledgegardens.com/cinematic.html

**Key decisions:**
- Cinematic energy over marketing page aesthetic
- "Explore the Garden" as 4th path into educational/scientific layer
- mix-blend-mode: lighten for tool images on dark backgrounds

---

## 2026-03-29 — Chat Session: Branch Sync + Cinematic v4
**Agent:** Chat (Claude Opus)
**What was built:**
- Discovered master/main branch divergence — main had bare scaffold, master had good version
- Force-synced main to master via GitHub API
- Cinematic v4: Spanish villa infinity pool (Dream card + Scene 2), luxury art interior (Scene 4)
- Updated tool collage with user's uploaded images (crane, theodolite, compass, Caterpillar, hammer, drill, phoropter, gear)
- Fixed Oracle "Failed to analyze answers" bug (array→named object format mismatch)
- Created tasks.todo.md, tasks.lessons.md, pushed to repo
- Created dream-builder-interface-brainstorm.md (18 concepts across 6 categories)
- Created killer-app-recovery-plan.md (gap analysis + 5-phase rebuild)
- Created cowork-dispatch-package.md (4 task specs for parallel agent execution)

**Key decisions:**
- GitHub Contents API is the reliable deployment path (not git push)
- GitHub PAT needs explicit "Contents: Read and write" permission
- Vercel auto-deploys from main — any push triggers build

---

## 2026-03-30 — Cowork Sessions: Dream Builders + Command Center
**Agent:** Cowork (multiple tasks)
**What was built:**
- The Oracle (/dream/oracle) — 7 life questions → AI dream profile → 3 FLUX renders
- The Alchemist (/dream/alchemist) — Drag ingredients → crucible → unique building
- The Construction Cosmos (/dream/cosmos) — 3D orbital orrery for buildings
- The Quest (/dream/quest) — RPG adventure, branching scenes, design tokens, FLUX renders
- The Genome (/dream/genome) — DNA double helix, 12 gene sliders, evolution mechanics
- The Narrator (/dream/narrator) — Story-driven, 3 narrative paths, typewriter reveal
- Command Center (/crm) — REBUILT as AI COO war room (business pulse, attention queue, project cards, weather impact)

**Key decisions:**
- 6 Dream Builder interfaces shipped in one day via parallel Cowork tasks
- Command Center seeded with 5 realistic demo projects + 7 attention items
- Killer App red chrome (#E8443A) for Command Center
- RPG/game mechanics in Quest and Genome (design tokens, evolution, branching)

---

## SESSION LOG PROTOCOL

Every agent must append an entry following this format:

```
## YYYY-MM-DD — [Chat/Cowork] Session: [Brief Title]
**Agent:** [Chat/Cowork] ([model])
**What was built:**
- [bullet list of deliverables]

**Key decisions:**
- [bullet list of design/architecture decisions]

**Issues/bugs found:**
- [optional]
```

Push this file after every session:
```bash
# Get SHA first, then update
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/chilly611/builders-knowledge-garden/contents/docs/session-log.md?ref=main"
# Then PUT with new content + sha
```

---

## 2026-04-01 — Chat Session: Three New Dream Interfaces + Session Tracking
**Agent:** Chat (Claude Opus 4.6)
**What was built:**
- The Collider (/dream/collider) — Two dreams enter, one building leaves. Couples/partners each pick style/material/feature/mood/scale independently, then "collide" their dreams. Shows harmonies, tensions, and synthesized compromises.
- The Sandbox (/dream/sandbox) — Minecraft for real buildings. 12×12 grid, 10 room types with colored blocks, drag to place, real-time stats (rooms, sq ft, stories). Preview modal shows full blueprint.
- The Voice Architect (/dream/voice) — Pure conversational dream building. Voice input via Web Speech API, chat-style UI, AI architect responds with spatial/material/cost insights. Suggestion prompts for getting started.
- CLAUDE.md pushed to repo with mandatory end-of-session protocol
- docs/session-log.md created as persistent timeline
- tasks.todo.md and tasks.lessons.md fully updated
- Project Instructions updated with end-of-session mandate
- Memory updated with tracking strategy

**Key decisions:**
- Chose Collider, Sandbox, and Voice Architect as next 3 (complementary to Oracle, Alchemist, Cosmos, Quest, Genome, Narrator already built)
- The repo is the SINGLE SOURCE OF TRUTH — not chat threads, not Cowork tasks
- Every session (Chat or Cowork) must append to session-log.md
- Fixed Unicode minus sign that broke Vercel build

**Routes now live (12 Dream interfaces!):**
- /dream/describe, /dream/browse, /dream/sketch, /dream/garden, /dream/inspire
- /dream/oracle, /dream/alchemist, /dream/cosmos, /dream/quest, /dream/genome, /dream/narrator
- /dream/collider, /dream/sandbox, /dream/voice (NEW)

**Issues found:**
- Unicode minus sign (−) vs ASCII hyphen (-) caused Vercel build failure — fixed
- Chrome extension connection from Chat is unreliable — works intermittently
- Cowork tasks don't persist between sessions — repo files are the solution

---

## 2026-04-01 (evening) — Chat Session: FLUX Logos, Dream State Persistence, Hub Update
**Agent:** Chat (Claude Opus 4.6)
**What was built:**
- 15 FLUX-generated branded logos for all Dream Machine interfaces
  - Generated via Replicate FLUX 1.1 Pro with architectural game-title aesthetic prompts
  - Golden motifs on dark backgrounds: quill (Describe), prism (Inspire), compass (Sketch), dice (Explore), frames (Browse), blueprints (Plans), eye (Oracle), crucible (Alchemist), sword (Quest), helix (Genome), orrery (Cosmos), book (Narrator), beams (Collider), blocks (Sandbox), microphone (Voice)
  - Downloaded and permanently hosted at public/logos/dream/*.webp
- Dream hub page updated with all 15 cards using permanent logo URLs
- 3 new cards added to hub: Collider, Sandbox, Voice Architect
- Dream State API route: src/app/api/v1/dreams/state/route.ts (POST create/update, GET retrieve)
- Supabase dream_states table created via SQL Editor (Chrome automation)
  - 26 columns covering all 15 interfaces + synthesized properties + growth tracking
  - Indexes on user_id and updated_at
  - RLS policies: public read, anyone insert, anyone update
  - Test insert succeeded: "Test Dream - Mediterranean Villa" with oracle_profile and alchemist_recipe
- Migration SQL pushed to supabase/migrations/dream_states.sql

**Key decisions:**
- Permanent logo hosting at /logos/dream/*.webp instead of Replicate CDN (expires)
- Dream state uses single table with per-interface JSONB columns (not separate tables)
- Growth stage auto-calculated: 1 interface = seed, 2-3 = sprout, 4-6 = sapling, 7+ = bloom
- Used Monaco editor JavaScript API to set SQL content (more reliable than typing)

**Files pushed:**
- public/logos/dream/{describe,inspire,sketch,explore,browse,plans,oracle,alchemist,quest,genome,cosmos,narrator,collider,sandbox,voice}.webp
- src/app/dream/page.tsx (15 cards with permanent logo URLs)
- src/app/api/v1/dreams/state/route.ts
- supabase/migrations/dream_states.sql

---

## 2026-04-01 (late) — Chat Session: Killer App Command Center v2 — Real Data Layer
**Agent:** Chat (Claude Sonnet 4.6)

**What was built:**
- **`src/app/api/v1/projects/route.ts`** (new) — Supabase CRUD for projects: GET list, POST create, PATCH update, DELETE
- **`src/app/api/v1/projects/analyze/route.ts`** (new) — AI COO analysis:
  - GET: load saved unresolved attention items from Supabase
  - POST: calls Claude with all active project data → generates 5-10 prioritized attention items → saves to Supabase
  - PATCH: resolve/dismiss individual attention item
- **`src/app/crm/page.tsx`** (rebuilt) — Command Center with real data:
  - Loads projects from `/api/v1/projects` on mount (Supabase)
  - Loads saved attention items from `/api/v1/projects/analyze`
  - "+ Add Project" button → full modal with all fields (name, phase, progress, budget, risk, milestone, location, client, notes)
  - "🤖 AI Analyze" button → calls Claude with live project data → AI COO generates specific, dollar-aware attention items
  - Attention items dismissible with "✓ Resolve" (persists to Supabase)
  - Dynamic date in header (real today's date, not hardcoded)
  - Empty state with CTA when no projects yet
  - Project cards expandable (show location, type, notes, delete)
  - Real business pulse metrics derived from live project data
- **`supabase/migrations/command_center.sql`** (new) — table definitions for `command_center_projects` and `command_center_attention`

**Required action (1 step):**
- Run `supabase/migrations/command_center.sql` in Supabase SQL Editor to create the two tables

**What changed from previous version:**
- Before: all data hardcoded in TypeScript constants, no persistence, no real AI calls, static date
- After: full Supabase persistence, real Claude API calls, CRUD, dismissable attention items

**Key decisions:**
- Used service role key for Supabase writes (bypasses RLS) with open policies for now — add org_id filtering once Clerk is wired
- AI analysis uses claude-opus-4-6, clears old AI items on each re-analysis run
- Projects API falls back gracefully (returns empty array) if Supabase tables don't exist yet

**Files changed:** 4 files pushed to main → Vercel auto-deploying
