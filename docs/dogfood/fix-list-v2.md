# Killerapp Master Fix List — v2 (Post-Fix Persona Round)

**Date:** 2026-05-06
**Synthesized from:** 6 persona-v2 reports after the 5-fix push (commit `810a55d`)
**Sources:** `docs/dogfood/post-fix-personas/{01,02,04,05,07,10}-*-v2.md`

---

## What changed since yesterday

We shipped (and verified on prod):
- Wave 2: q8 permits, q15 daily-log, q11 supply-ordering wired into Project Spine v1
- 5 UX fixes: empty-state copy, smart pre-fill (location + sqft + auto-XP), nav project_id preservation (KillerAppNav stage chips + AI action buttons), auth + project-saved indicators
- Total: 6 of 17 workflows now have the spine; banner travels everywhere on the demo path; auth pill always visible

The personas were briefed on all of this and told to predict what their NEXT 5–7 gripes would be. No re-running the same complaints — forward-looking gap analysis only.

---

## Convergence map (issue → personas calling it out)

| Issue | Personas | Severity |
|---|---|---|
| **Photo/video evidence upload not built** | John, Maria, Sarah, Hank | All call DEMO/ADOPTION-BLOCKER |
| **Multi-jurisdiction code data missing (IL, NYC, FL)** | Pete, Sarah, Mari | All CRITICAL |
| **Multi-project dashboard / list view** | Mari, Sarah | Both CRITICAL — they manage 6+ active projects |
| **AI summary overwrite by every copilot call (B-8)** | Pete, Sarah | Both CRITICAL — destroys trust + breaks export |
| **Role-based permissions (delegate to PM/bookkeeper)** | John, Sarah, Mari | All ADOPTION-BLOCKER |
| **Voice in 85+ dB jobsite noise** | Maria, Hank | Both ADOPTION-BLOCKER |
| **Always-listening mic fires accidentally** | Hank | DEMO-BLOCKER (Hank is the daily user) |
| **Mobile touch targets too small (<48px)** | Maria | ADOPTION-BLOCKER for one-handed mobile use |
| **Spanish-language contracts + AI** | Maria | ADOPTION-BLOCKER for her market |
| **Crew/team invite without auth wall** | John | ADOPTION-BLOCKER day 2 |

---

## Tier 1.5 — Quick wins (do these first, ~3-4 hours total)

These are 30-minute-to-1-hour fixes that 2+ personas independently flagged. Highest impact-per-minute.

### Fix #1 — `ai_summary` overwrite (B-8 from yesterday)

**Personas hit:** Pete, Sarah (both CRITICAL).
**Symptom:** Banner shows the most recent copilot response, not the original orientation. After Sarah runs a code probe, the banner stops showing her project's $1.2M–$1.6M Manhattan loft scope and shows the AI's hallucination disclaimer instead.
**Fix:** In `src/app/api/v1/copilot/route.ts` `persistProjectExchange`, only update `ai_summary` when the project's current value is null/empty. Or better: add a `orientation_summary text` column that only the FIRST copilot call (from the killerapp landing flow) writes to. Banner reads `orientation_summary` first, falls back to `ai_summary`.
**Effort:** 15 min.

### Fix #2 — Push-to-talk on the AI fab (replace always-listening)

**Personas hit:** Hank (DEMO-BLOCKER), Maria (would also benefit).
**Symptom:** Hank accidentally taps the floating mic on his iPhone in his pocket; it records jackhammer noise as a query. Or accidental clicks while wearing gloves trigger it.
**Fix:** In `GlobalAiFab.tsx`, change voice button to require press-and-hold (mousedown → start, mouseup → stop) instead of tap-to-toggle. Visual cue: pulsing ring while listening.
**Effort:** 30 min.

### Fix #3 — Mobile touch targets ≥48px

**Personas hit:** Maria (ADOPTION-BLOCKER).
**Symptom:** Buttons in the workflow picker, search box, fab are 36px. Maria misses on a one-handed tap and abandons.
**Fix:** Audit the 6 wired workflow clients + KillerappProjectShell + AuthAndProjectIndicator for any element with `padding < 12px` or `min-height < 44px`. Bump to design-system tokens that hit 48px.
**Effort:** 1 hr.

### Fix #4 — Crew/team magic-link invite (skip the auth wall)

**Personas hit:** John (ADOPTION-BLOCKER day 2).
**Symptom:** John's foreman Mike clicks the project link from John's text. Hits sign-in. Bounces. John reverts to SMS.
**Fix (v1):** Generate a one-time signed URL from a project that grants 7-day read-only access to a single project without account creation. Foreman lands on a stripped-down read view with "Sign in to do more →" CTA. ~3-4 hr.
**Effort:** 3-4 hr (defer to Tier 2 if Tier 1.5 has to be < 3 hr).

### Fix #5 — Audit + adjust default project name

**Personas hit:** John, Sarah (POLISH but immediately visible).
**Symptom:** "2500 sf ADU in San Diego with spa, gym, cold plunge..." truncated to 60 chars looks like a fragment. Project deserves a clean human-friendly name like "San Diego ADU — wellness package".
**Fix:** In `/api/v1/projects/route.ts` POST handler, after creating the project, fire a fast Haiku-class call to derive a clean 4-8 word name from raw_input. Update the row asynchronously. Or simpler: give the user a rename input on the AuthAndProjectIndicator pill.
**Effort:** 30 min for rename input. 1.5 hr for AI-derived name.

---

## Tier 2 — High-impact features (this week, 1-3 days each)

### Multi-project dashboard view

**Personas hit:** Mari (CRITICAL — 6 active projects), Sarah (her firm pipeline).
**Spec:**
- New page at `/killerapp/projects` (or repurpose existing `/projects` route).
- Grid of project cards: name, raw_input preview, current stage, last-updated, status (estimated cost range, % complete).
- Filter by phase/risk. Sort by last-updated.
- Click a card → `/killerapp?project=<id>` (the existing landing flow).
- Reuse the existing `GET /api/v1/projects` (already lists all of user's projects).
- Add filter+sort UI on the page.
**Effort:** 1-2 days.

### Role-based permissions (project_collaborators)

**Personas hit:** John (his bookkeeper + foreman), Sarah (her PM), Mari (her team).
**Spec:**
- New table `project_collaborators(project_id FK, user_id FK, role text CHECK in 'owner'/'editor'/'viewer'/'finance'/'field', created_at)`.
- RLS update on `command_center_projects` and all `project_*` tables to also check `project_collaborators`.
- UI: a "Share" button in `AuthAndProjectIndicator` opens a dialog: enter email, pick role.
- Roles map to which workflows are visible: `field` sees daily-log + supply-ordering only; `finance` sees expenses + contracts but not estimating; `viewer` sees read-only banner + AI take.
**Effort:** 3-5 days (RLS testing is the time sink).

### Photo/video evidence upload (Epic A from yesterday)

**Personas hit:** John (ADOPTION-BLOCKER, lost $30k on this gap), Maria, Sarah, Hank.
**Spec (refined from yesterday):**
- New table `project_attachments(id, project_id FK, type ENUM('photo','video','document'), file_url, file_size, gps jsonb, taken_at timestamptz, exif jsonb, metadata jsonb, uploaded_by, created_at)`.
- Supabase Storage bucket `project-evidence` with RLS scoped to project access.
- Upload component: drag-drop on desktop + `<input type="file" accept="image/*,video/*" capture="environment">` for mobile camera.
- Preserve EXIF (especially GPS + timestamp) — use `piexifjs` or similar. Mark as "tamper-stamped" via SHA-256 hash stored alongside.
- Gallery view in `KillerappProjectShell` + per-step in workflows.
- Export: "Project Evidence Packet" PDF generator that compiles all attachments with metadata into a single legally-defensible document.
**Effort:** 5-7 days.

### Multi-tab state isolation kill-test (Mari's concern)

**Personas hit:** Mari (CRITICAL).
**Spec:**
- E2E test (Playwright preferred): open Project A in tab 1 + Project B in tab 2 simultaneously. Edit A. Verify B is untouched. Edit B. Verify A is untouched.
- The hook architecture supports this (each hook reads `?project=<id>` from its own URL), but the localStorage `bkg-active-project` key is shared across tabs — this CAN leak state into journey-progress writes.
- Fix: namespace the localStorage key by current URL's project id, or eliminate the localStorage usage entirely on Spine-aware pages.
**Effort:** 2-3 hours including test.

---

## Tier 3 — Phase 2 epics (multi-week)

### Multi-jurisdiction code data (Epic B from yesterday)

**Personas hit:** Pete (Chicago IL), Sarah (NYC), Mari (FL HVHZ).
**Phasing:** IL week 1 (Pete), NYC week 2 (Sarah), FL week 3 (Mari). CA already deepest in repo.
**Citation moat:** publish 50 URL-stable entity pages at `/entities/{jurisdiction}/{code}/{section}` with plain-English summaries.

### Spanish-language flows (Maria's market)

**Phasing:**
- Week 1: Spanish contract templates (translation + legal review).
- Week 2: AI replies in Spanish when user query language is Spanish.
- Week 3: Locale toggle in UI + translated Killerapp chrome.

### PDF drawing upload + parsing (Sarah's ask)

**Spec:**
- Drawing upload component (handles multi-page PDF + DWG via cloud conversion).
- Drawing-aware specialist that extracts span / member / load callouts.
- AI references the uploaded drawing in its response with page+coordinate citations.
**Effort:** 1-2 weeks.

### Real permit-form auto-fill (Pete's ask)

**Spec:**
- Per-jurisdiction form templates (Chicago BBO E-1, NYC PW-1, etc.).
- Auto-fill from project context.
- PDF generator with proper form layout.
**Effort:** Per-jurisdiction (Chicago first: 1 week).

---

## Patterns and themes (the meta-insight)

Reading across all 6 v2 reports, three patterns emerge:

### 1. **Trust signals beat features.**
Every persona is hyper-attuned to "does this app know what I told it?" The pre-fill + auto-XP + auth pill we shipped today move trust forward by miles. The AI summary overwrite bug moves it backward by miles for technical users (Pete, Sarah). The next big trust signal is photo evidence (proof) and the multi-project dashboard (continuity).

### 2. **Field reality is brutal.**
Hank (95dB jobsite), Maria (table saw + Spanish customer + tiny touch targets), Curtis (90-second abandon threshold) all surface the same truth: the killerapp's design language is currently for a desk, not a worksite. Field-mode treatment (large buttons, push-to-talk, offline cache, voice-first flows) is the difference between adoption and abandonment for the field-half of contractors.

### 3. **Demo path ≠ adoption path.**
Day 1 demos are patient: "This is impressive, let me try it." Day 2 reality is brutal: "Why does my foreman need to sign in? Why doesn't it remember my project name? Why does the AI keep showing me the wrong summary?" Tier 1.5 is the bridge between Day 1 demo readiness and Day 2 adoption.

---

## Recommended next moves

**This block (1-2 hours) — Tier 1.5 quick wins:**
1. AI summary overwrite fix (15 min)
2. Push-to-talk on AI fab (30 min)
3. Mobile touch target audit (1 hr)
4. Project rename input on auth pill (30 min)

**Total: ~2.5 hr, kills 4 universal gripes, John demo on Day 2 stays alive.**

**This week (1-3 days each) — Tier 2:**
1. Multi-project dashboard
2. Role-based permissions
3. Multi-tab kill-test + fix

**Next 5-7 days — Epic A:**
1. Photo/video evidence upload (the universal #1)

**Next 4-5 weeks — Epic B + C:**
1. Multi-jurisdiction code data
2. Spanish-language flows
3. PDF drawing parsing
