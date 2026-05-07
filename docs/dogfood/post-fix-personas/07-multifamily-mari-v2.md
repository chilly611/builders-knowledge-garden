# Multifamily Mari — Next-Generation Gripes (v2)

**Context:** Mari runs a 28-person GC firm in Tampa with 6 active projects (multi-family + townhomes, FL HVHZ). Post-Tier-1 fix testing reveals she now has *baseline* spine functionality — projects persist, workflows know about each other, state isolation works for single-project users. But Mari juggles. Here are her next 5–7 demands that will block adoption at scale.

---

## GRIPE-1: No Multi-Project Dashboard
**Priority:** CRITICAL (blocks her #1 workflow — "what needs action today?")  
**Trigger:** Mari opens KillerApp. No project list. Only `/killerapp?project=<uuid>`. She must:
1. Bookmark 6 project URLs separately
2. Command+Tab between tabs to remember which is which
3. Manually check each one to find "who's blocked waiting for my sign-off"

**Why It Kills:** Mari's a juggler. When she has 15 minutes between site visits, she needs to see all 6 projects, spot 3 that need action (one waiting on her permit review, one waiting on the budget sign-off, one ready to move to "Build" phase), and drill down. Today she drills into a random project and has to backtrack to find the right one. Time tax: 3–5 minutes per visit.

**Suggested Fix:**
- New `/killerapp/dashboard` page (or `/killerapp` without ?project param)
- Grid of 6 project cards showing: thumbnail (first 80 chars of raw_input), current stage (phase badge), last-updated, next-milestone date, status health (on-track/at-risk)
- Click to open project (appends ?project=<id>)
- Filter by phase (PLAN/PERMIT/BUILD/CLOSE) or by risk (RED/YELLOW/GREEN)
- Sort by "last-touched", "next-milestone-due", "risk-level"
- Est. effort: 4–6 hours (design + component + query)

---

## GRIPE-2: No Role-Based Permissions on PM Team
**Priority:** HIGH (kills delegation at scale)  
**Trigger:** Mari invites her PM to a project. She wants him to:
- EDIT: "Manage scope changes" workflow (change orders)
- EDIT: "Daily logbook" (field updates)
- VIEW-ONLY: "Financials" tab (contracts + budget breakdown — she doesn't want him touching)
- VIEW-ONLY: "Code review" (she handles compliance herself)

Today: all-or-nothing. If he's invited, he can edit *every* workflow. If she wants to lock him out of financials, she can't invite him at all.

**Why It Kills:** Mari's company is growing. She has a $14M revenue base and needs to delegate safely. Her PM is trustworthy but she doesn't want accidental edits to the contract templates (which have legal implications). A few seconds of PM fumbling and suddenly the contractor schedule in the contract shifts, which cascades to the insurance rider. No audit trail. Mari rolls it back manually. She never invites him again; she does all the data entry herself. Team throughput stays flat.

**Suggested Fix:**
- Add `project_team_members(id, project_id, user_id, role, created_at)` table
- Roles: `owner`, `pm`, `foreman`, `finance_viewer`
- Each role has explicit RBAC policy:
  - `pm`: can edit q11/q15 (supply/daily-log), can view q2/q4/q5/q8 (estimate/contracts/codes/permits), cannot edit q4 contracts
  - `foreman`: can view everything, edit q15 (daily-log) only
  - `finance_viewer`: can view q4 contracts + budget lines, cannot edit anything
- Codify in RLS + frontend: gate workflow nav/edit buttons by role
- Est. effort: 6–8 hours (schema + RLS policy + UI gates + role-picker on invite modal)

---

## GRIPE-3: Multi-Tab Data Leak / Race Condition
**Priority:** HIGH (trust killer)  
**Trigger:** Mari opens Project A in Tab 1, Project B in Tab 2. She's on Tab 2 editing the "Daily Logbook" entry for Project B. Meanwhile, her foreman (who has access to Project A) opens Tab 1 and auto-saves a crew-count change on Project A. Mari clicks back to Tab 2 and hits Save. 

The app silently merges both auto-save batches. But if there's a transient failure on one of the saves, or a race condition in the IndexedDB + server queue, the saved state on Tab 1 (Project A) might show Tab 2's data (Project B) or vice versa. Or worse: Mari's change to Project B overwrites the foreman's change to Project A because they both hit the PATCH endpoint within 50ms of each other.

**Why It Kills:** Mari lost a $2k budget line on an earlier test. She updated the budget on Project A while her PM was editing the same project in another tab (unknown to her). The PM's save won. Mari's change evaporated. No undo, no conflict indicator, no audit log. She discovered it during the weekly reconciliation. Mari declares the tool "unsafe for multi-user" and hires a PM to manage a shared Excel file instead. Platform adoption stops.

**Suggested Fix:**
- Implement **client-side key isolation:** each tab/session writes drafts to its own localStorage key (`project_<id>_draft_session_<sessionId>`)
- On server-side autosave, include `session_id` in PATCH payload
- Before merging: check if a newer save from a *different* session exists on this project → show "Someone else just edited this. Do you want to reload, merge, or overwrite?" conflict UI
- Better: implement **optimistic lock** via `version` field on JSONB columns (e.g., `workflow_estimating` versioning). Each save increments version. If version has drifted, server returns 409 Conflict; client merges or rejects
- Est. effort: 8–10 hours (session-key logic + conflict detection + UI + testing)

---

## GRIPE-4: No FL HVHZ Code Data → Blocked Compliance Check
**Priority:** CRITICAL (state-specific blocker — makes app unusable in her region)  
**Trigger:** Mari creates a project in Miami-Dade (Design Category D, maximum hurricane wind). She runs the "Check the Codes" workflow (q5). The AI summary is smart — it mentions FBC 2020, ASCE 7-22 wind loads, continuous load path. But when she clicks "Learn more" on wind-load citations, the links 404. Or the AI says "FBC Table 1610.1 Figure 2" but the entity page only has generic IBC references.

**Why It Kills:** Mari's a rule-follower. HVHZ code is not optional in Florida — it's mandated by the state. When she hands a permit to the county, they fact-check her structural assumptions against FBC 2020 Section 1609 and ASCE 7-22 Figure 29. If her BKG app doesn't have FL-specific amendments, she can't trust its AI take. She'll manually cross-check against the FBC book or hire a consultant. The app becomes "a nice sketch tool, but I can't rely on it for compliance." Feature parity with the CA version (which has Title 24 tables baked in) is table stakes.

**Suggested Fix:**
- Provision `/data/amendments/fl-base.json`, `fl-hillsborough.json`, `fl-miami-dade.json`, `fl-coastal-base.json`
- Each JSON file should list:
  - FBC 2020 sections (1606 wind design, 1609 loads, 1610 load cases)
  - ASCE 7-22 references (Figure 29 coastal velocity pressure, Table 26 building category)
  - FAC 62-6.002 flood elevation thresholds by county
  - Local amendments (Miami-Dade Design Category D specifics)
- Create entity pages at `/entities/florida-hillsborough/fbc-2020-1610-1/` with plain-English summary, load table, example, link to official FBC PDF
- Backlink from ICC, APA trade associations for SEO
- Est. effort: 40–50 hours for complete FL coverage (data compilation + entity pages + AI routing refinement)

---

## GRIPE-5: CFO Export (Quarterly Board Deck Due Next Week)
**Priority:** HIGH (immediate deadline; CFO is waiting)  
**Trigger:** Mari's board meeting is in 8 days. Her CFO needs a **portfolio P&L by project** for the investor deck:
- Project name, start date, current phase
- Original budget vs. actuals (change orders applied)
- Remaining contingency
- Milestone completion % (vs. plan)
- Risk flags (budget overrun, schedule slip, code hold-up)

Mari can export each project individually. But consolidating 6 projects into one board-ready CSV/Excel = 45 minutes of manual stitching in Excel. And if a change order gets added between now and the meeting, she has to re-export and re-consolidate manually.

**Why It Kills:** Mari's founder. She's proud of her firm. If the investor asks "how are you tracking against budget?" on 3 of the 6 projects and Mari has to say "Let me check…" (fumbling through tabs), or "I'll get back to you" (lowers confidence), the investor's trust drops. The CFO is already skeptical of adopting new tools; if the export is janky, the CFO will veto further use and push back to QuickBooks.

**Suggested Fix:**
- Add `/killerapp/dashboard/export?format=xlsx&projects=<id1>,<id2>,<id3>` endpoint
- Return a single Excel file with:
  - Sheet 1: "Portfolio Summary" (all projects, one row each, key metrics)
  - Sheet 2–7: "Project A Detail", "Project B Detail", etc. (one sheet per project with all workflows, budget lines, change orders)
  - Pivot table option: "by phase" (how many projects in PLAN vs. BUILD vs. CLOSE)
  - Data includes timestamps so CFO can trace edits ("last updated 2026-05-06 14:32 by Mari")
- Est. effort: 6–8 hours (query logic + Excel templating + XLSX generation)

---

## GRIPE-6: Bulk Operations (Apply Budget Update Across 3 Similar Projects)
**Priority:** MEDIUM-HIGH (efficiency killer; slows iteration)  
**Trigger:** Mari has 3 townhome projects with nearly identical specs (all 12-unit complexes, all in Polk County, all starting in August). During the pre-bid phase, the concrete quote from the supplier increases by 8%. Mari needs to:
1. Open Project A
2. Find the "concrete foundation" line in the budget
3. Increase cost by 8%
4. Save
5. (Repeat 2 more times for Projects B and C)

Time cost: 10 minutes. But if she's doing this across 6 projects and the supplier changes twice a month, that's hours of repetitive clicking per month.

**Why It Kills:** Mari doesn't have a dedicated "budget analyst" yet. She's doing her own data entry. The tool should amplify her efficiency (no copy-pasting into Excel, no manual email chains asking PMs for confirmation). Instead, BKG forces her to *multiply* clicks. She considers abandoning the tool for a simpler spreadsheet where she can apply formulas across columns in one go.

**Suggested Fix:**
- Add "Select Multiple Projects" mode on dashboard
- Checkbox picker: select 3 projects (visual indication "3 selected")
- Button: "Apply change order to selected"
- Modal opens: "Which line item? What's the delta?" (dropdown + cost field)
- Confirm: "Increase concrete on 3 projects by $X? Cost goes from $Y to $Z"
- Single PATCH request batches the updates
- Audit log tracks "Mari applied +8% concrete adjustment to projects A, B, C on 2026-05-06"
- Est. effort: 5–7 hours (UI + batch PATCH logic + audit trail)

---

## GRIPE-7: Missing Photo/Video Evidence Tagging
**Priority:** MEDIUM (nice-to-have, but blocks field workflow)  
**Trigger:** Mari's foreman is on-site doing the framing inspection. He snaps a photo of a critical juncture (roof-to-wall tie-down on the 4th floor) and wants to attach it to the "Daily Logbook" entry with a caption: "4th-floor corner, roof plate secured, ready for inspection." 

Today: he texts Mari the photo. Mari forwards it to herself. Mari creates a project folder structure in Google Drive. Mari manually links it to the KillerApp project in the notes field. It's lossy and unsearchable.

**Why It Kills:** Photo evidence is gold in construction. It's the audit trail if there's a dispute with a contractor, a claim with insurance, or a punch-list item that got overlooked. When evidence lives in 3 different places (phone, email, Google Drive, project notes), it's fragile. Mari wants one source of truth: "Open this project, click 'Evidence' tab, see all photos from this job site, each time-stamped and geotagged." Without that, she reverts to email + shared drives. The app feels like a nice UI on top of a fragmented process.

**Suggested Fix:**
- Add `project_attachments(id, project_id FK, type ENUM('photo','video','document'), file_url, gps jsonb, taken_at timestamptz, uploaded_by, created_at)` table
- Upload component on `/killerapp?project=<id>` (drag-drop for desktop, camera capture for mobile)
- Gallery view in KillerappProjectShell showing all photos/videos for this project, sorted by date
- Per-workflow: ability to attach evidence to "Daily Logbook" or "Punch List" entries
- GPS + timestamp preserved (EXIF extraction on mobile)
- Est. effort: 8–10 hours (storage setup + component + RLS policy + gallery + metadata handling)

---

## Priority Ranking (for Mari's next sprint)

1. **GRIPE-4 (FL HVHZ code data)** — State-specific blocker. She can't use the app in Florida without this. CRITICAL.
2. **GRIPE-1 (Dashboard)** — Core workflow blocker. She needs to see all 6 projects at once. CRITICAL.
3. **GRIPE-2 (Role-based perms)** — Delegation blocker. She can't scale her team without this. HIGH.
4. **GRIPE-3 (Multi-tab race condition)** — Trust killer. Data loss risk. HIGH.
5. **GRIPE-5 (CFO export)** — Immediate business need (board meeting in 8 days). HIGH.
6. **GRIPE-6 (Bulk operations)** — Efficiency killer. MEDIUM-HIGH.
7. **GRIPE-7 (Photo evidence)** — Nice-to-have for field ops, but low on Mari's priority vs. compliance/dashboard/delegation. MEDIUM.

---

## Success Criteria (Mari adoption target)

- GRIPE-1 ✅: Dashboard loads all 6 projects under 2s, filter/sort works, drill-down is instant
- GRIPE-2 ✅: PM can edit supply/daily-log, cannot touch contracts or financials; role picker visible on invite modal
- GRIPE-3 ✅: Open 2 projects in tabs, edit each, save both, verify neither overwrites the other (verify via DB audit log)
- GRIPE-4 ✅: Create Miami-Dade project, run code-check, AI mentions FBC 2020 + ASCE 7-22, entity links resolve
- GRIPE-5 ✅: Export all 6 projects to Excel in one click, board format ready (no post-processing needed)
- GRIPE-6 ✅: Select 3 projects, apply +8% concrete, verify all 3 updated + audit trail shows change
- GRIPE-7 ✅: Snap photo on mobile, attach to daily-log, see it in evidence gallery with geotag + timestamp

---

*Persona author: Multifamily Mari (47, Tampa, 28-person GC, $14M revenue, multi-project juggling, HVHZ focus). Post-Spine-v1-fixes. Predictions for next wave of adoption blockers.*
