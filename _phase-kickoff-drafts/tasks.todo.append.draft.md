<!-- DRAFT tasks.todo additions — NOT pushed. Merge into tasks.todo.md NOW block from a bkg-main worktree if you accept these drafts. -->

## Phase kickoff — awaiting founder review/merge (drafted 2026-06-08, in `_phase-kickoff-drafts/`)

- [ ] **HITL gate:** decide treatment of the 2,256 published / 0-verified rows (recommended: Option B — gate trust badge on `manually_verified_at`); then review & merge `docs/code-ingestion-hitl.md`.
- [ ] **HITL cleanup:** re-bucket the 474 mis-domained rows (457 `building_code`→`codes`, 9 `permit_requirement`→`permits`, stray `code_section`s) per HITL §4; add the entity_type↔domain forward guard.
- [ ] **HITL backfill:** stand up Wave 1 triage of the 1,998 `auto_verification_flagged` rows (codes/permits/safety + CA first); set the burn-down metric.
- [x] **Frontiermap (RESOLVED 2026-06-08):** no repo — CLI-deployed static site (Vercel project `frontiermap`, `link=null`, `source=cli`). Follow-ups: (a) decide whether to create a real repo + connect Git so it's versioned; (b) update `REPO-AND-WORKTREE-MAP.md`; (c) **rotate the Vercel token** pasted into chat.
- [ ] **Bug:** fix `src/app/globals.css --bg:#ffffff` (prohibited pure white overriding `tokens.css`); audit the deprecated `--bp-*` blueprint palette + `typography.ts` Inter/Playfair against the Archivo lock.
- [ ] **Per-product instructions:** confirm `docs/project-instructions/` location; resolve the dream→project handoff entry point (Dream Machine + Killer App must agree); then merge the four files.
- [ ] **Enterprise:** decide separate Supabase instance vs. shared-instance RLS; SSO phase (2 vs 3); SOC 2 vs ISO 27001 first.
- [ ] **Design system:** pick the one true Viver seal source (Supabase mp4 vs local owner-lane mp4); build the 7 hand-drawn stage glyphs to replace `JourneyRow` emoji; de-dupe `plates/` vs `logos/gardens/`.
- [ ] **Docs hygiene:** correct the `/TheKnowledgeGardensOS` → `/theKnowledgeGardensOS` casing in the kickoff brief + WS1 handoff.
