# Multifamily Mari — Dogfood Test Plan

**Persona:** Mari DeSantis, 47 · Tampa FL · General Contractor (28 staff, $14M annual revenue)  
**Focus:** Multi-family builds + townhome subdivisions in hurricane wind-zone code (HVHZ)  
**Critical need:** Juggle 3–5 projects without losing place (state isolation)

---

## Persona Snapshot

Mari runs a mid-size GC firm managing concurrent multi-family and townhome projects across Florida. She's always on her laptop at the office or tablet on site — flipping between projects mid-thought. She's fast, efficient, knows the rules (FBC 2020, ASCE 7-22 wind), and delegates ruthlessly to her project managers and foremen. Losing data or accidentally editing the wrong project is a deal-killer.

---

## What Mari Cares About (Priority Order)

1. **State isolation across projects** — Open three projects in separate tabs/windows. Zero cross-contamination.
2. **Shareable project links** — One URL per project. Forward to foreman, site super, PM. No auth theater.
3. **FL-specific codes** — FBC 2020, HVHZ wind loads, coastal construction. Not California.
4. **Change order tracking** — Every CO updates the budget. CSV export for her CFO.
5. **Foreman delegation** — Invite a foreman by email, assign workflows, check-in without handoff friction.
6. **Offline robustness** — Tablet loses signal; don't lose unsaved work.

---

## Test Cases (8 core + 4 advanced)

### Core Isolation & State

**MARI-TC-01: Multi-project URL state isolation**
- Open 3 browser tabs: `/killerapp?project=proj-a`, `/killerapp?project=proj-b`, `/killerapp?project=proj-c`
- Each tab loads its own project data (name, raw_input, ai_summary, jurisdiction)
- Switch tabs rapidly. Verify each retains its context without bleeding state
- Close a tab. Remaining tabs unaffected
- Expected: Zero cross-talk; local storage shows last active project

**MARI-TC-02: Autosave state lock per project**
- In proj-a, fill a workflow step (e.g., crew size = 6)
- In proj-b tab, open same workflow, fill crew size = 12
- Return to proj-a. Verify crew size still = 6, not 12
- Expected: Each project's draft state saved separately

**MARI-TC-03: Project shell hydration integrity**
- Load `/killerapp?project=multi-family-tower` (existing project with raw_input + ai_summary)
- Verify KillerappProjectShell renders: user query, AI take, "What next?" CTAs
- All three CTAs append ?project=multi-family-tower to their URLs
- Click "Estimate the job" → lands on `/killerapp/workflows/estimating?project=multi-family-tower`
- Expected: Project ID preserved in every link

**MARI-TC-04: Missing project graceful fallback**
- Load `/killerapp?project=nonexistent-uuid`
- Verify error message: "We couldn't find that project." + "Start a new project →" link
- Link points to `/killerapp` (without project param)
- Expected: No crash, clear CTA to create new

**MARI-TC-05: No project param renders nothing**
- Load `/killerapp` (no ?project=)
- Verify KillerappProjectShell returns null (renders nothing above workflow picker)
- Expected: Workflow picker visible, no error

### Sharing & Link Integrity

**MARI-TC-06: Share link with foreman**
- Create project: "Cypress Ridge Towers, Tampa, 240 units"
- Copy URL: `https://builders.theknowledgegardens.com/killerapp?project=cypress-ridge`
- Send to foreman via Slack
- Foreman clicks link (fresh browser, different device)
- Verify: Project loads, foreman sees user query + AI summary + workflows
- Expected: No auth required; full read access to project

**MARI-TC-07: PDF/CSV export with project ID**
- In proj-a, complete "Expense report" workflow (upload receipts, get categorization)
- Export as CSV
- Verify filename includes project ID: `cypress-ridge-expenses-2026-05.csv`
- Verify: CFO can import into QuickBooks, see project context
- Expected: Export includes jurisdiction, project name, all expense lines

### Florida Jurisdiction Compliance

**MARI-TC-08: FBC 2020 + ASCE 7-22 routing (CRITICAL GAP)**
- Create project: "Tampa waterfront, 8-story multi-family, coastal high hazard zone"
- Set jurisdiction: Florida / Hillsborough County
- Run "Check the codes" workflow (q5)
- Step s5-0 (compliance-router): AI should route to Florida-specific:
  - FBC 2020 Section 1609.3 (wind loads for HVHZ)
  - ASCE 7-22 Figure 29 (coastal velocity pressure)
  - Florida Administrative Code 62-6.002 (flood elevation)
- Expected: AI mentions FBC 2020, ASCE 7-22, NOT IRC generic references
- **BLOCKER:** Check if /data/amendments/fl-* files exist (they don't per glob)

**MARI-TC-09: Hurricane wind code compliance**
- Create project with jurisdiction: Florida / Miami-Dade (Design Category D — maximum wind)
- Run code check
- AI output should flag: roof tie-downs, impact glass, continuous load path, FBC Table 1610.1
- Expected: No California Title 24 references

### Change Order & Budget Integration

**MARI-TC-10: CO updates autosave budget**
- Project budget: $2.8M (from initial estimate)
- Create CO: Add structural engineer, 3rd stairwell (+$185k)
- Save CO
- Return to project dashboard: Budget now shows $2.985M
- Export CSV: CO line-items included with costs, approval status
- Expected: Real-time budget sync, CFO gets clean export

**MARI-TC-11: Foreman workflow delegation (ADVANCED)**
- Mari invites foreman (mike@site.construction) to project
- Foreman role: view-only on estimate, full edit on daily-logbook + punch-list
- Foreman lands on `/killerapp?project=cypress-ridge` (same URL)
- Foreman can't edit "Manage scope changes" workflow
- Foreman **can** submit daily logbook entry (voice + categories)
- Expected: Role-based UI (CTA grayed out for foreman on locked workflows)

### Stress & Edge Cases

**MARI-TC-12: Rapid project switching (stress)**
- Open 5 project tabs
- Rapid-click between them in quick succession (< 500ms per switch)
- Fill random fields in each
- Close 2 tabs randomly
- Verify remaining 3 tabs still hold their own state
- Expected: No memory leaks, no state cross-talk, local storage consistent

**MARI-TC-13: Offline autosave resilience (TABLET SIM)**
- On tablet, load proj-a, start "Quick estimate" workflow
- Simulate offline (airplane mode or DevTools throttle to offline)
- Fill fields (voice job description, crew count, etc.)
- Auto-save should queue locally (IndexedDB or localStorage)
- Restore connection
- Verify: All draft data syncs to server without user friction
- Expected: Seamless sync, no data loss

---

## Gaps & Missing Features (HIGH IMPACT FOR MARI)

1. **No Florida amendments** (`/data/amendments/fl-*.json` missing entirely)
   - Impact: Can't route to FBC 2020, ASCE 7-22, or local Miami/Hillsborough rules
   - Workaround: Mari manually notes "Check FBC Table 1610 for wind loads"
   - Fix priority: **CRITICAL** — block state change without FL jurisdiction file

2. **Multi-project dashboard** (not in Spine v1 scope?)
   - Mari needs: "View all projects, sorted by stage or deadline, with status badges"
   - Current: Each project is a separate URL; no dashboard list
   - Impact: Can't see at a glance which projects need action
   - Scope for v2

3. **Role-based permissions** (missing)
   - Foreman can't selectively edit workflows (all-or-nothing today)
   - Can't lock "Code Check" while letting PM edit "Punch List"
   - Impact: Mari can't safely delegate without fear of accidental overwrites
   - Scope for v2

4. **Real-time collaboration signals** (missing)
   - No "Mike is editing this workflow right now" indicator
   - Mari opens proj-a while PM is filling it; both autosave → potential race
   - Impact: Change order data loss in multi-user scenarios
   - Scope for v2

5. **QuickBooks Online integration** (missing)
   - Mari's expense tracking lives in QBO
   - Today: Export CSV, manual import
   - Impact: Duplicate entry, reconciliation lag
   - Scope for v2/integration layer

---

## Demo-Critical Subset (5 minutes)

**For investor/stakeholder demo, test these in order:**

1. **Multi-project state isolation** (MARI-TC-01)
   - "Here's my three active projects" → open 3 tabs, switch rapidly
   - "No data bleeds between projects" → fill field in proj-a, switch to proj-b, verify proj-a unchanged

2. **Share link with zero friction** (MARI-TC-06)
   - "I send this URL to my site foreman" → copy project URL, paste, show it loads in fresh browser

3. **Florida jurisdiction + code routing** (MARI-TC-08)
   - "My projects are all in Florida, hurricane-zone code" → create proj with FL jurisdiction, run code-check, show AI mentions FBC 2020
   - **Caveat:** If FL amendments missing, acknowledge gap: "v1 ships with CA. FL files coming week of [date]"

4. **Change order cascades to budget** (MARI-TC-10)
   - "When a change order hits, the budget updates in real-time" → create CO, show budget bar move, export CSV

5. **Foreman delegates without friction** (MARI-TC-11)
   - "I invite my foreman to this project by email" → send invite, show foreman lands on same URL, can add daily logbook

---

## Known Issues & Blockers

- **FL amendments missing:** Zero FBC 2020 / ASCE 7-22 / HVHZ-specific code support
  - Blocks: MARI-TC-08, MARI-TC-09
  - Workaround: Mari falls back to manual code review
  - Fix: Provision `/data/amendments/fl-hillsborough.json`, `fl-miami-dade.json`, `fl-coastal-base.json` with FBC 2020 tables

- **No autosave queue on offline mode:**
  - Blocks: MARI-TC-13
  - Workaround: Mari must check connection before filling forms on tablet
  - Fix: Implement IndexedDB + sync-on-reconnect in KillerappProjectShell

- **No role-based permissions UI:**
  - Blocks: MARI-TC-11 (foreman can edit everything or nothing)
  - Workaround: Mari does all edits herself, foreman read-only
  - Fix: Add `role` field to project invite, gate workflows by role in next-step CTAs

---

## Test Environment Notes

- **Target:** https://builders.theknowledgegardens.com/killerapp (Project Spine v1)
- **Auth:** Bearer token via Supabase session
- **Browsers:** Chrome 126+, Safari 17+, Firefox 127+ (Mari's laptop)
- **Mobile:** iPad Safari 17+ (Mari's tablet on site)
- **DevTools:** Simulate offline mode, throttle to "Slow 4G" to stress queue
- **Database:** Test projects seeded in /data/projects (scope of test setup, not this plan)

---

## Success Criteria

- All MARI-TC-01 through -07 pass without intervention
- MARI-TC-08 & -09 pass *if* FL amendments exist; document gap if missing
- MARI-TC-10 passes with CFO export validation
- MARI-TC-11 passes with role-based UI visible (even if feature not fully shipped)
- MARI-TC-12 completes without console errors, no state cross-talk
- MARI-TC-13 queues offline, syncs clean on reconnect (optional for v1 if OOG)

---

*Test plan authored from Multifamily Mari's perspective (Tampa, FL, 28-person GC, $14M annual revenue, multi-project juggling, HVHZ focus).*
