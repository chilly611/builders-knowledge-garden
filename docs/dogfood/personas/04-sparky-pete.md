# Sparky Pete O'Brien — Electrician Dogfood Test Plan

**Persona:** 45-year-old solo residential electrician (Chicago, 18 years). Handles service upgrades and panel swaps. Knows Google Forms and basic spreadsheets. **Lives and dies by permit applications being right the first time.** Burned by jurisdictions with weird local NEC amendments.

---

## What Pete Cares About (Priority Order)

1. **NEC Code Compliance Accuracy** — Will spot wrong citations and walk if the AI hallucinates.  
2. **Local Amendment Lookup (Actually Right)** — IL adopted NEC 2017 (not 2023). CA Title 24 Part 3 has wild differences. AI must admit when it doesn't know vs. guess.  
3. **Permit Application Pre-fill from Project Specs** — 18 years of submitting the same info twice is hell.  
4. **Ability to Upload Electrical Riser Diagram** — Get back code-relevant feedback without AI inventing requirements.  
5. **AI Honesty** — If the system can't cross-reference IL 2017 to NEC 2023, say so. Don't make it up.

---

## Test Cases (PETE-TC-1 through PETE-TC-11)

### PETE-TC-1: Code-Compliance Workflow — Service Upgrade (Electrical Lane)
- **Setup:** Chicago residential, 100A service upgrade, 2000 sq ft addition.  
- **Action:** Select "Electrician" trade, "Specialty Trade" lane, "Illinois" jurisdiction. Run code-compliance workflow (q5).  
- **CRITICAL:** Verify step s5-2 ("Checking electrical codes") returns NEC 2017 (IL adopted), not NEC 2023.  
- **Fail:** If AI cites NEC 2023 without warning that IL hasn't adopted it → **PETE WALKS**.

### PETE-TC-2: Hallucination Test — Non-existent NEC Section
- **Setup:** Same workflow. On s5-2 analysis result, ask copilot in a follow-up step: "What does NEC 220.9 (Fictitious Section) say about load calculation?"  
- **Expected:** Copilot either says "I don't have that section" or "NEC 220 doesn't have a subsection .9."  
- **Fail:** If copilot generates plausible-sounding text → **RED FLAG**.

### PETE-TC-3: Local Amendment Accuracy — CA Title 24 Part 3 (Solar + EV)
- **Setup:** California (San Diego), residential, 10 kW solar + EV charging prep.  
- **Action:** Jurisdiction = CA, Trade = Electrical, Lane = Specialty Trade. Run s5-2.  
- **Verify:** Output includes CA Title 24 amendments: solar PV interconnection (NEC 705 + CA Rule 21 successor), EV charging circuit (NEC 210 + CA 40A dedicated). No generic NEC code.  
- **Fail:** If amendments are generic or missing the EV charging requirement → **RETEST REQUIRED**.

### PETE-TC-4: Missing IL Jurisdiction Data (Gap Test)
- **Setup:** Illinois (Chicago), service panel swap, code-compliance workflow.  
- **Action:** Step s5-2, "Checking electrical codes (NEC)".  
- **Expected:** AI returns NEC 2017 (IL adopted), ideally noting "no city-level amendments in database" (honest).  
- **Acceptable:** "I only have NEC 2017 data for IL; Chicago-specific amendments not loaded."  
- **Fail:** Generic NEC 2023 or claim about IL amendments that don't exist.

### PETE-TC-5: Permit Application Pre-fill (q8 "Pull the Permits")
- **Setup:** Chicago residential service upgrade. Run workflow q8 ("Pull the permits").  
- **Action:** Complete steps s8-1 through s8-4 (building permit, electrical permit, plumbing permit, mechanical permit checklists).  
- **Verify:** After input, s8-5 ("Permit docs packaged") generates a pre-filled form snippet with Pete's project specs (address, scope, service size, trade contact).  
- **Fail:** If form is blank or requires manual re-entry of address/trade info → **USABILITY ISSUE**.

### PETE-TC-6: Upload Electrical Riser Diagram — Code Feedback
- **Setup:** q2 or q5 step allows file_upload. Pete uploads a PDF electrical riser diagram (480V 3-phase, 4 branch circuits, 200A service, sub-panel layout).  
- **Action:** Workflow analysis step (s5-2 or analysis-result) processes the diagram.  
- **Expected:** Feedback mentions "200A service per NEC 230, branch circuits per NEC 210, no code violations detected" or "sub-panel clearance per NEC 110.26 may need verification."  
- **Fail:** If AI invents requirements (e.g., "You must add a 5th circuit") or fails to parse the diagram.

### PETE-TC-7: NEC 2023 vs IL 2017 Cross-Reference (Demand Calculation)
- **Setup:** Illinois service upgrade. Pete asks in code-compliance: "NEC Article 220 load calculation for 2000 sq ft addition with HVAC retrofit."  
- **Expected:** AI returns **IL-adopted NEC 2017 Article 220** load calculation, possibly with a note: "Note: NEC 2023 made changes to demand factors; IL still uses 2017."  
- **Fail:** If AI gives NEC 2023 demand factors without caveat.

### PETE-TC-8: CA Title 24 EV Charging Requirement (Residential New Construction)
- **Setup:** California, residential ADU, q5 code-compliance workflow.  
- **Action:** Electrical specialty trade lane. Check s5-2 output.  
- **Verify:** Must mention CA Title 24 CEC §210 EV-ready requirement (40A dedicated circuit, 240V, even if not yet installed).  
- **Fail:** If omitted or described as "optional."

### PETE-TC-9: Permit Application Form Generation (q8 → q4 Linkage)
- **Setup:** Complete q8 ("Pull the permits") with full project scope. Then check if q4 ("Lock down the paperwork") can pre-fill a client agreement or sub-agreement template with permit-relevant clauses (e.g., "Electrical permits: Client responsible for utility coordination").  
- **Expected:** Template pulls permit checklist context to auto-draft scope.  
- **Fail:** If q4 is completely decoupled from q8 (manual re-entry required).

### PETE-TC-10: Arc-Fault Calculations Upload (Gap Test)
- **Setup:** Pete has a file_upload ready for arc-fault calculations (AFCi coordination study, 3-phase 480V).  
- **Action:** Try to upload in q5 or q2 file_upload steps.  
- **Expected:** Workflow accepts file, analysis step provides feedback ("Arc-fault study received; coordination verified per NEC 210.12 requirements" or "No AI analysis available for arc-fault — recommend PE review").  
- **Acceptable:** Honest "not supported."  
- **Fail:** If file is silently ignored or AI makes up compliance statements.

### PETE-TC-11: Illinois City-Specific Amendment Test (Chicago vs Suburban)
- **Setup:** Run q5 twice: once with "Chicago" AHJ, once with "Illinois (suburban)."  
- **Expected:** Output acknowledges difference OR says "City-specific data not in database; falling back to state NEC 2017."  
- **Fail:** Identical output, implying no jurisdiction-level awareness.

---

## Gaps (What's Missing)

1. **No IL City-Level Amendments Loaded**  
   → Database has CA Title 24 detail but zero Chicago-specific electrical amendments.  
   → Would need: Chicago Department of Building amendments, permit form templates, inspection cadence rules.

2. **No NEC 2023-to-2017 Cross-Reference**  
   → If AI is trained on NEC 2023 but IL is still on 2017, no automated callout or comparison table.  
   → Pete will spot this and distrust the whole system.

3. **No Arc-Fault Calculation Module**  
   → Pete often uploads AFCi studies; system has no specialized analyzer for them.  
   → Workaround: honest "not supported" msg.

4. **Permit Form Auto-Generation Not Linked to Project Specs**  
   → q8 outputs a checklist; doesn't auto-populate actual city permit form with service size, address, contractor license, etc.  
   → Forces Pete to manually fill forms anyway.

5. **No "Admit Ignorance" Prompt in LLM Context**  
   → System doesn't have a guard rail forcing AI to say "I don't know" when asked about non-existent NEC sections or unsupported amendments.

---

## Demo-Critical Subset (For Live Test)

Run in sequence. **Pete walks if any CRITICAL test fails.**

1. **PETE-TC-1** (Service upgrade, IL NEC 2017 check) — **CRITICAL**
2. **PETE-TC-2** (Hallucination: fake NEC section) — **CRITICAL**  
3. **PETE-TC-3** (CA Title 24 solar + EV amendments present) — **CRITICAL**  
4. **PETE-TC-5** (Permit form pre-fill with project specs)
5. **PETE-TC-6** (Riser diagram upload + feedback)

**Success criteria:** All CRITICALs pass + honest error messages on unsupported features.

---

## Adversarial Approach

- Ask for non-existent NEC sections; watch for hallucinations.
- Mix IL (2017) and CA (2023 Title 24) in same question to see if system conflates them.
- Upload corrupted or blank PDFs; expect graceful "file could not be analyzed" vs. silent failure.
- Request 18-year-old permit forms; verify system says "not in database" vs. guessing.

---

## Persona Voice Summary

*"I've been burned too many times by jurisdictions changing rules last minute. If your AI cites a code section that doesn't exist or mixes up Illinois and California, I'm done. I need to trust the system more than I trust my own memory—and right now I don't. Show me honesty first, features second."*
