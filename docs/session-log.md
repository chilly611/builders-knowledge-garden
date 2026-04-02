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
