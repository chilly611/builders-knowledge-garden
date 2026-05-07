# Sparky Pete v2 — Post-Fix Gripes (2026-05-06)

**Persona:** 45, Chicago solo electrician, 18 yrs, NEC 2017 (IL adopted).  
**Context:** Project Spine v1 wired into 6 of 17 workflows. Jurisdiction auto-default shipped. Cost parser handles `$1.4M`. AI hallucination guard passes probes. But gaps remain in data depth and form generation.  
**Test window:** Pete runs the killerapp on a real Chicago service-upgrade project and encounters friction.

---

## GRIPE-1: "Illinois Amendments Database is a Ghost — I Get Generic NEC 2017, Not Chicago Rules"

**Priority:** CRITICAL  
**Trigger:** Runs code-compliance workflow, selects "Chicago, IL" jurisdiction, asks for feedback on a 100A service upgrade with sub-panel.

**Why it kills:**
- Amendments data has CA (Title 24, all 6 major cities + state level) and NV (2 regions), zero for Illinois.
- Pete expects Chicago-specific rules: permit timing, inspection cadence, AHJ quirks, disconnect placement rules that differ from suburban IL.
- AI returns "NEC 2017 (Illinois-adopted)" but no callout that "Chicago-specific amendments not loaded" — honest or lazy?
- Pete's electrical trade Slack is where he vets tools. Generic NEC + no admission of ignorance = "not ready for Chicago" reputation kill.

**Edge case that slips through:**
- Post-hallucination-guard, the AI is truthful about missing data *when asked directly* ("Do you have Chicago-specific rules?"). But it never volunteers the gap in the jurisdiction picker or in the workflow pre-analysis.
- Pete doesn't ask "what don't you know"; he asks "what do I need to do?" The AI answers generically, and Pete assumes coverage exists.

**Suggested fix:**
- Add `il-chicago.json` and `il-state.json` to `/data/amendments/` with:
  - Chicago Department of Buildings permit forms and inspection checklist.
  - IL adopted NEC 2017 state-level deviations.
  - Chicago-specific: equipment grounding rules, main disconnect rules, sub-panel spacing (per Chicago DBS).
- Seed jurisdiction picker to show "Chicago, IL" when raw_input mentions Chicago.
- In code-compliance AI take, auto-include: "I have NEC 2017 and Chicago Department of Buildings rules loaded" or "I only have state-level IL data; Chicago-specific amendments not yet in my database."
- Estimate: 3-4 days (data collection from CDB + Chicago electrical inspector interviews).

---

## GRIPE-2: "Permit Form is Still a Checklist, Not the Actual Chicago BBO Form"

**Priority:** HIGH  
**Trigger:** Pete completes q8 (Permit Applications) workflow with full project spec, expects a pre-filled Chicago Building Office electrical permit (Form E-1 or similar).

**Why it kills:**
- Today q8 outputs a checklist (Building, Electrical, Plumbing, Mechanical).
- Pete copies the checklist to Google Forms or Word, then manually re-types address, contractor license, service amperage, scope into the *real* Chicago BBO form.
- That's the one thing he wanted to automate. "Permit form generation" was in PETE-TC-5 in the original test plan. If it just produces a checklist, he views it as half-baked.
- He'll tell his Slack: "saves maybe 10 minutes, not worth onboarding another tool."

**Edge case that slips through:**
- The banner shows "Working on: 100A service upgrade, 2000 sq ft addition" — that data is *available* in the project spine.
- But q8 doesn't link `raw_input` or `estimated_cost_low/high` to a form template, so the pre-fill is manual labor anyway.
- He'll click "Generate Permit Docs" and get a PDF that says "Complete these fields:" instead of "Address: [auto-filled]".

**Suggested fix:**
- Collect actual Chicago BBO electrical permit form (PDF or template URL from CDB).
- In q8, add "Pre-filled Chicago BBO E-1 Form" step that auto-populates:
  - Property address (from raw_input).
  - Service size (from AI take or budget panel).
  - Contractor name + license (from user profile, fallback to "YOUR LICENSE").
  - Scope summary (first 200 chars of raw_input).
  - Estimated cost (from estimated_cost_low/high).
- Output as fillable PDF (not just text checklist).
- Link q8 ↔ estimating so project context flows.
- Estimate: 2-3 days (form template acquisition + Supabase PDF generation + link to project spine).

---

## GRIPE-3: "Code Citation URLs Disappear or 404 — I Bookmark and Share in Trade Forums, Can't Trust a Broken Link"

**Priority:** HIGH  
**Trigger:** Pete runs code-compliance, gets AI response with inline citations (e.g., "NEC 230.95 service grounding"). Clicks the entity link to verify, shares the URL in his electrical trade Slack for reference.

**Why it kills:**
- The findings doc shows "**CODE-6** Citation links resolve" is NOT TESTED on prod.
- If Pete clicks `/entities/il/nec-2017/230.95` and gets 404 or the URL changes next month, he loses trust *and* looks bad in Slack ("Tool I recommended doesn't even keep its links stable").
- Entity URLs are the moat. Publish at `/entities/{jurisdiction}/{code}/{section}`, backlink from ICC and trade associations, rank for "NEC 230.95 Illinois" on Google.
- If links rot, that strategy dies.

**Edge case that slips through:**
- The copilot route.ts has hallucination guards and citation extraction, but it doesn't *validate* that `/entities/…` URLs actually exist before streaming them to Pete.
- A citation could be structurally valid ("NEC 230.95") but the entity page was never built.

**Suggested fix:**
- Before shipping any code-compliance AI response, validate each extracted citation against the entity DB (or at least log which ones don't exist yet).
- Add a warning step: if a citation fails validation, either (a) omit it and note "citation URL not yet stable", or (b) link to the official NEC database instead of `/entities/…`.
- Publish the first 30 entity pages (NEC 2017 state-level + CA Title 24 highlights) with permanent URLs before Pete's demo.
- Add a `/entities/` URL stability test to CI that crawls 10 random entity pages daily and alerts if any 404.
- Estimate: 1-2 days (entity validation in copilot, 30 entity pages hardcoded, CI test).

---

## GRIPE-4: "AI Summaries in the Banner Keep Getting Overwritten — I Can't Tell If It's the Original Advice or a Follow-up Probe"

**Priority:** MEDIUM  
**Trigger:** Pete creates a project ("100A service upgrade, Chicago"). Banner shows original AI orientation. Later, he asks the copilot a follow-up question ("Does NEC 210.12 require AFCI on this sub-panel?"). Now the banner shows the AFCI response instead of the original orientation.

**Why it kills:**
- The findings-2026-05-06 doc calls this B-8: "AI summary gets overwritten by every subsequent copilot call."
- Pete's mental model: "The banner should always show me my project summary so I know what I'm working on."
- Every time the copilot responds, the banner flickers to a new summary. This *feels* broken, even if it's technically working.
- He'll use the tool once, forget what the original scope was, and switch back to his email or notebook (the backup system he trusts).

**Edge case that slips through:**
- The fix is already identified (separate `orientation_summary` column), but it wasn't shipped with the q8/q15/q11 wiring.
- Pete will hit this on day 1 if he asks the copilot more than once per project.

**Suggested fix:**
- Add `orientation_summary` column to `command_center_projects` (same as `ai_summary` but immutable after the first AI take).
- Modify copilot/route.ts: only update `ai_summary` if `orientation_summary` is not yet set.
- Modify banner logic: prefer `orientation_summary` if it exists, fall back to `ai_summary`.
- Estimate: 20 minutes (DB migration + 5 lines of code).

---

## GRIPE-5: "Jurisdiction Auto-Default Only Works If the AI Guessed It From Raw Input — If I Type 'Chicago' It Still Defaults to IBC Generic"

**Priority:** MEDIUM  
**Trigger:** Pete manually types "Chicago, IL, 100A residential service upgrade" into the raw_input. Jurisdiction picker doesn't auto-default to Chicago until the AI take runs and parses "Chicago" from its response.

**Why it kills:**
- Jurisdiction auto-default shipped (fix #2 from fix-list.md), but it only seeds from `project.jurisdiction` *after* the AI take hydrates.
- If Pete hasn't clicked "Estimate" yet, he goes to code-compliance and the picker is still "IBC 2024 generic" — the very thing the fix was supposed to prevent.
- He has to manually change it, defeating the point of "auto-default."

**Edge case that slips through:**
- The auto-default logic looks for `projJurisdiction` from `project?.jurisdiction`. But `project.jurisdiction` is only *set* after the copilot parses it and persists it.
- If Pete skips the estimating workflow and goes straight to code-compliance, the project hydrates but `jurisdiction` is still null, so auto-default is skipped.

**Suggested fix:**
- Add a post-process step in the `/killerapp` landing page that extracts jurisdiction from `raw_input` *before* the first copilot call (regex for "Chicago", "Illinois", state abbreviations, etc.).
- Persist extracted jurisdiction to `command_center_projects.jurisdiction` immediately when the project is created, not waiting for the AI to parse it.
- Alternatively, pass `jurisdiction` as a request param to copilot so the AI orientation can use it in-context.
- Estimate: 30 minutes (regex + early persistence).

---

## GRIPE-6: "Real Chicago Jobs Have Outdoor Sub-Panels, Three-Phase Equipment, Arc-Fault Coordination Studies — The AI Never Asks About Those, Just Gives Generic NEC 2017"

**Priority:** MEDIUM  
**Trigger:** Pete uploads a PDF riser diagram for a commercial conversion (480V 3-phase, multiple sub-panels, arc-fault coordination study). The copilot accepts the file but responds with boilerplate "sub-panel must follow NEC 240.21" without analyzing the specific diagram.

**Why it kills:**
- The test plan (PETE-TC-6 and PETE-TC-10) flagged this: Pete has real files that need analysis, not generic advice.
- The copilot doesn't have a specialized arc-fault coordinator or 3-phase analyzer. It should admit this ("I can't analyze arc-fault coordination studies; recommend PE review") rather than pretend it understood the diagram.
- If it hallucinates advice about his real diagram, that's a trust killer.

**Edge case that slips through:**
- The hallucination guard works for *code questions* (fake NEC sections), but it doesn't extend to *file analysis*.
- A diagram upload gets processed as "file received" with no semantic understanding. The AI then responds generically, and Pete assumes it analyzed the diagram.

**Suggested fix:**
- Add a file-type gate in copilot: if a riser diagram or arc-fault PDF is uploaded, respond with "Riser diagram received. I can check for obvious code violations (e.g., service disconnect placement) but cannot perform arc-fault coordination analysis. Recommend a licensed PE review. For now, I'll note the following from the diagram: [list visible elements]."
- Introduce a "supported file types for analysis" list: only enable diagram analysis for residential single-phase. Reject or defer 3-phase and arc-fault studies.
- Estimate: 2-3 days (file-type detection + semantic gating + PE referral prompt).

---

## Summary: Pete's Trust Inflection Points

| Gripe | Blocker? | Trust Impact | Time to Fix |
|-------|----------|--------------|-------------|
| IL data gap (GRIPE-1) | YES | Kills trade Slack credibility | 3-4 days |
| Permit form ≠ real form (GRIPE-2) | YES | "Still half-baked" in his mind | 2-3 days |
| Citation URL rot (GRIPE-3) | NO but HIGH | Breaks the moat (entity pages) | 1-2 days |
| Banner summary overwrite (GRIPE-4) | NO but ANNOYING | Feels broken even if it works | 20 min |
| Jurisdiction default lag (GRIPE-5) | NO but FRICTION | Adds manual step he expected to skip | 30 min |
| File analysis too generic (GRIPE-6) | NO but DANGEROUS | Hallucination risk on real work | 2-3 days |

**The demo-critical path for Pete:**
1. Fix GRIPE-4 (20 min) — banner stability.
2. Fix GRIPE-5 (30 min) — jurisdiction early extraction.
3. Land GRIPE-1 (3-4 days) — at least IL state data + Chicago callout.
4. Land GRIPE-2 (2-3 days) — actual BBO form prefill, not just checklist.
5. Land GRIPE-3 (1-2 days) — entity URL validation + stable links.

**His Slack moment:** "Tried the Builder Garden on my real Chicago job. Code part is honest about what it doesn't know, which is good. But it doesn't have Chicago rules loaded yet, and the permit form is still a checklist. Once they ship those, it'll be worth recommending."

---

## Revision Notes

**v1 → v2 changes:**
- GRIPE-1 now explicit about IL data gap *and* the "no admission of ignorance" edge case post-hallucination-guard.
- GRIPE-2 expands on the auto-fill linkage between project spine and q8 form generation.
- GRIPE-3 adds the URL stability/moat strategy angle (new insight from findings).
- GRIPE-4 flags the `ai_summary` overwrite issue that shipped in findings-2026-05-06.
- GRIPE-5 identifies the lag between `raw_input` parsing and jurisdiction auto-default.
- GRIPE-6 introduces file-analysis semantic gating (new from riser diagram consideration).

**Convergence with specialist feedback:**
- UX + Data specialists both named jurisdiction propagation (GRIPE-5).
- Infra specialist named workflow wiring; Pete's angle is permit form generation (GRIPE-2).
- AI specialist named proactive assist; Pete's angle is admitting ignorance on unsupported files (GRIPE-6).
