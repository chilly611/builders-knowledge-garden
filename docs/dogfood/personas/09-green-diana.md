# Green Diana — Dogfood Test Plan

**Persona:** Green Diana Schultz, 39, San Francisco. Title-24 / Passive House specialist GC with 11 years in residential electrification (EV chargers, heat pump retrofits, all-electric ADUs). Notion power user, API integrations comfortable. Decarbonization mission-driven. Lives by Title 24 Part 6 (Energy) and CALGreen Part 11 accuracy. Will walk if AI hallucinates section numbers.

---

## What Diana Cares About

**Priority stack (descending):**

1. **Title 24 Part 6 (Energy) section accuracy** — exact citations, no invented rules. Hallucinated sections are unforgivable and cause loss of trust.
2. **CALGreen Part 11 cross-references** — building envelope, sustainability, integration with energy code.
3. **Heat pump load calculations** — COP ratings, auxiliary resistance backup sizing, HPWH mandatory vs. retrofits.
4. **EV charger amperage/voltage requirements** — Level 2 (240V, 30–40A minimum per q8 spec), panel upgrade workflows (200A → 400A understanding).
5. **All-electric project tagging** — ability to flag a project as "all-electric" or "passive house" preset so AI response prioritizes relevant code sections.
6. **Jurisdiction-specific amendments** — San Francisco addenda, CA coastal rules, solar mandate carve-outs.
7. **Permitting workflow integration** — does the q8 permit checklist understand that a 200A → 400A upgrade triggers additional inspections and Title 24 demand-response compliance?

---

## Test Cases (ID: DIANA-TC-N)

### DIANA-TC-1: Title 24 §130.7 Solar Mandate Identification
**Setup:** Code Compliance lookup, jurisdiction = San Francisco, lane = GC, all-electric residential ADU (detached).  
**Action:** Select "Solar requirements" or query "what solar do I need for new residential?"  
**Verify:** AI returns "CA Title 24 Energy §130.7" with exact section number. Includes 3 kW minimum (small homes) vs. 5 kW (larger), roof-ready exception language.  
**Fail:** Invents section number (e.g., "§130.6.1"), misses roof-ready option, claims solar is optional.  
**Critical:** Yes — Diana will walk on hallucinated section.

---

### DIANA-TC-2: Heat Pump Water Heater (HPWH) vs. Retrofit Path
**Setup:** Code Compliance, jurisdiction = SF, lane = GC.  
**Action:** Query "heat pump water heater rules — new vs. existing."  
**Verify:** AI distinguishes:
- New residential: mandatory HPWH, §150.0(h), COP ≥3.0 (ENERGY STAR Most Efficient).
- Retrofit: HPWH encouraged/rebated, not mandatory (unless state-funded project).
- Electric resistance backup permitted for peak demand.
- Natural gas water heaters only permitted in rural areas (define criteria).  
**Fail:** Says retrofit HPWH is mandatory, or doesn't mention rural exception.  
**Critical:** Yes — affects cost model for existing homes.

---

### DIANA-TC-3: EV Charger Amperage + Panel Upgrade Integration
**Setup:** Pull Permits (q8), jurisdiction = SF, new residential with 10+ DUs.  
**Action:** Select "Electrical permit" checklist; then ask AI "200A service upgrade for EV charger — is that right?"  
**Verify:**
- AI confirms Level 2 minimum = 240V, 30–40A per §110.2(f).
- For EV charger retrofit, 200A → 400A upgrade is plausible but requires:
  - New main service inspection.
  - Utility approval (PG&E in SF).
  - Demand-response preparation (grid communication capability per §110.2(f)).
  - Title 24 Title 24 demand-response readiness flagged in permit docs.  
**Fail:** Suggests 200A is insufficient without noting utility and Title 24 implications. Doesn't mention demand-response requirement.  
**Critical:** Yes — Diana sizes panels daily; wrong guidance cascades to clients.

---

### DIANA-TC-4: CALGreen Part 11 Integration with Energy Code
**Setup:** Code Compliance, query "building envelope compliance — how do Title 24 and CALGreen overlap?"  
**Action:** Ask for specific sections on insulation, air barrier, commissioning.  
**Verify:** AI returns:
- Title 24 Part 6 §110.2(a) insulation minimums (R-38 attic, R-13 walls, varies by zone).
- CALGreen Part 11 §5.410 (envelope continuity, air barrier specs).
- Passive House approach exceeds both (R-45+ attic, triple-glazed, blower-door ≤0.6 ACH50).
- Commissioning gate: new residential must commission HVAC/water heating per CAL Green §5.411.  
**Fail:** Conflates Part 6 and Part 11 or omits commissioning requirement.  
**Critical:** Yes — DIY over-builders miss commissioning and fail final inspection.

---

### DIANA-TC-5: All-Electric Project Tagging + AI Context
**Setup:** Start a new project workflow, flag as "all-electric ADU" or "passive house retrofit."  
**Action:** Check whether AI response context shifts to prioritize relevant code sections (no gas appliances, solar + storage, heat pump HVAC, EV ready).  
**Verify:**
- When tagging "all-electric," AI prioritizes Title 24 Part 6 sections on HPWH, heat pump space heating, solar, EV charger.
- Omits natural gas code sections or clearly flags them as not applicable.
- Mentions CALGreen wildfire resilience (Part 11 §5.404) if in high-fire zone.  
**Fail:** No tagging system exists; AI returns generic code guidance regardless of project type.  
**CRITICAL MISSING FEATURE** — Diana needs this to avoid wading through irrelevant sections.

---

### DIANA-TC-6: Cool Roof Mandate Exception (Coastal Carve-Out)
**Setup:** Code Compliance, jurisdiction = SF (coastal), project type = re-roof low-slope.  
**Action:** Query "cool roof requirement — any exceptions for coastal?"  
**Verify:** AI cites §110.9(c) and mentions: "Coastal zones may reduce cool roof reflectance if glare hazard perceived. Consult AHJ for waiver."  
**Fail:** Says cool roof is mandatory in all CA zones, no exception.  
**Critical:** Yes — SF Bay Area has localized reflectance waivers.

---

### DIANA-TC-7: Fenestration U-Factor by Climate Zone
**Setup:** Code Compliance, jurisdiction = SF (climate zone 3a for Bay Area), query fenestration specs.  
**Action:** AI returns U-factor ≤0.30 (or 0.28 for colder zones), SHGC ≤0.25–0.40 depending on solar gain zone.  
**Verify:** Triple-glazed windows mentioned as encouraged for cold climates. Rebate reference included (state HVAC rebate program).  
**Fail:** Omits climate zone specificity or claims all windows must meet 0.28 (not true in moderate zones).  
**Critical:** No — guidance error but Diana can verify with NFRC labels.

---

### DIANA-TC-8: Duct Sealing + Blower-Door Testing Integration
**Setup:** Code Compliance, query "HVAC duct sealing — what's required and how is it tested?"  
**Action:** AI returns §110.2(e): mastic + clamp seals (no duct tape), R-8 insulation for unconditioned ductwork, post-install blower-door test ≤15% leakage.  
**Verify:**
- Clear on who runs the test (mechanical sub or third-party).
- Mentions rebate triggers (CA Energy Commission rebate program requires third-party verification).
- Links to Title 24 demand-response readiness (sealed ducts = lower fan energy, better grid response capability).  
**Fail:** Says duct tape is acceptable or omits testing threshold.  
**Critical:** Yes — Diana specs retrofits and overlooks testing = failed permitting.

---

### DIANA-TC-9: Solar Mandate + Battery Storage Rebate Pathway
**Setup:** Code Compliance, jurisdiction = SF, query "solar mandate for new residential + battery storage rules."  
**Action:** AI returns:
- §130.7 solar mandate: 3–5 kW nameplate, roof-ready acceptable.
- §140.11 battery storage: if solar ≥5 kW, battery ≥10 kWh eligible for SOMAH/CTCBP rebate.
- AC coupling inverters must support OpenADR 2.0 for virtual power plant.  
**Verify:** Exact section numbers, rebate program names, VPP communication requirement.  
**Fail:** Invents section numbers or misses rebate program acronyms.  
**Critical:** Yes — Diana ties project economics to available incentives.

---

### DIANA-TC-10: Passive House + Title 24 Dual Compliance
**Setup:** Code Compliance, flag project as "passive house retrofit," jurisdiction = SF.  
**Action:** Query "what's the minimum I need for Title 24 Part 6 if I'm already Passive House certified?"  
**Verify:** AI confirms:
- Passive House *exceeds* Title 24 Part 6 minimums (R-45 attic vs. R-38, U-0.12 windows vs. U-0.30, blower-door ≤0.6 vs. air-sealing only).
- PH retrofit still must meet Title 24 baseline (HPWH §150.0(h), solar §130.7 if applicable, cool roof §110.9(c)).
- Commissioning required per CALGreen §5.411.  
**Fail:** Claims Passive House certifies full Title 24 compliance (not automatic).  
**Critical:** Yes — Diana pitches PH as decarbonization standard, not Title 24 substitute.

---

### DIANA-TC-11: Demand-Response Readiness Flag in Permit Checklist
**Setup:** Pull Permits (q8), electrical sub-section.  
**Action:** Verify that "demand-response readiness" or "grid communication capability" is listed as a checkbox for EV charger + battery systems.  
**Verify:** Checklist includes:
- ☐ EV charger networked and demand-response capable per §110.2(f).
- ☐ Battery system OpenADR 2.0 compatible (if installed).
- ☐ HVAC controls support dynamic pricing signals (CALGreen §5.411 commissioning).  
**Fail:** Checklist omits demand-response entirely.  
**CRITICAL MISSING FEATURE** — Diana flags this as California's grid decarbonization strategy; miss = non-compliant permit.

---

### DIANA-TC-12: Title 24 vs. Local Amendments (SF-Specific)
**Setup:** Code Compliance, jurisdiction = San Francisco (not state-level), query "what's different in SF?"  
**Action:** AI returns SF addenda:
- ✓ Cool roof exception (coastal glare waiver, §110.9(c) amended).
- ✓ Solar mandate applies (no SF carve-out for residential new construction).
- ✓ EV charger ready (wiring/conduit even if charger not installed).
- ✗ SF encourages (not mandates) gas heat elimination; state has more aggressive language.  
**Verify:** AI clearly distinguishes state (Part 6) from SF amendments.  
**Fail:** Conflates state + SF rules or misses local amendments.  
**Critical:** Yes — Diana manages multiple jurisdictions; confusion = code violations.

---

## Gaps / Missing Integrations

### 1. **Title 24 Compliance Calculator** (PRIORITY: HIGH)
AI provides section text, but Diana needs a tool to verify her designs against calculations:
- Heat pump COP + auxiliary resistance backup sizing.
- Solar PV nameplate capacity vs. load profile.
- Insulation R-value thresholds by climate zone.
- Fenestration U-factor + SHGC by orientation/zone.

**Current:** AI text-based guidance. **Needed:** Calculator interface (or API to external tool like CEC's *Building Energy Efficiency Standards* spreadsheet).

---

### 2. **HERS Rater Workflow** (PRIORITY: MEDIUM)
Title 24 Part 6 often requires HERS (Home Energy Rating System) certification for new residential and high-performance retrofits.
- Workflow should trigger HERS rater involvement checklist.
- AI should cite HERS certification gate (CEC requirement).
- Link to certified rater locator (RESNET directory).

**Current:** No explicit HERS workflow. **Needed:** q5 (Check the codes) should flag "HERS rating required? Y/N" decision.

---

### 3. **CEC-Listed Equipment Lookup** (PRIORITY: MEDIUM)
Diana specifies HVAC (heat pump brands, COP), water heaters (HPWH models, ENERGY STAR tier), windows (U-factor + SHGC by model).
- Workflow should have searchable database of Title 24-listed equipment.
- Query by category + performance tier (e.g., "HPWH, COP ≥4.0, compact size").
- Return CEC compliance + rebate eligibility.

**Current:** AI mentions compliance specs but no linked equipment database. **Needed:** Integration with CEC Title 24 Appliances Directory or equivalent.

---

### 4. **All-Electric / Passive House Project Presets** (PRIORITY: HIGH)
Diana has repeating project archetypes:
- All-electric ADU (solar + battery + HPWH + heat pump + EV charger ready).
- Passive House retrofit (SF Bay Area retrofit to 0.6 ACH50 + triple-glazed + ERV).
- Retrofit electrification (remove gas, install heat pump + HPWH + solar).

**Current:** Generic Code Compliance workflow. **Needed:** Project-type selector that auto-populates relevant code sections and checklists.

---

### 5. **Demand-Response + Grid Integration Prompts** (PRIORITY: MEDIUM)
Title 24 Part 6 increasingly mandates or encourages demand-response capabilities (OpenADR 2.0 for batteries, networked EV chargers, dynamic HVAC controls).
- Diana needs clear guidance on grid communication requirements per section.
- Checklist should include "demand-response readiness" as a gate.

**Current:** Sections mention it; no explicit workflow. **Needed:** Separate "demand-response compliance" decision tree in q5 or q8.

---

### 6. **CALGreen Commissioning Gate** (PRIORITY: MEDIUM)
CALGreen Part 11 §5.411 commissioning is mandatory; Diana must budget for it.
- Workflow should flag commissioning checklist before final payment.
- Link to available certifiers (Cx Agents, ASHRAE Cx protocols).

**Current:** Not explicitly surfaced in q5 or q26 (final). **Needed:** q5 expanded or q24–26 amended to include Cx gate.

---

## Demo-Critical Subset

**Minimal viable test for stakeholder demo (5 workflows max):**

1. **DIANA-TC-1** (Solar mandate — must cite §130.7 exactly)
2. **DIANA-TC-3** (EV charger + panel upgrade — 200A → 400A + demand-response flag)
3. **DIANA-TC-5** (All-electric tagging — AI context shifts)
4. **DIANA-TC-11** (Permit checklist demand-response checkbox exists)
5. **DIANA-TC-10** (Passive House + Title 24 dual compliance framing)

**Demo script:**
- Load jurisdiction = SF, lane = GC, all-electric ADU flag.
- Enter Code Compliance workflow q5 (Check the codes).
- Verify solar §130.7 + HPWH §150.0(h) sections returned.
- Toggle all-electric flag; observe AI context shift (no gas sections).
- Open q8 (Pull permits), electrical section; confirm demand-response checkbox.
- Report: "AI grounds claims in exact section numbers, respects all-electric context, permits workflow acknowledges grid-integration requirements."

---

## Verification Approach

**Diana's testing method:** "Show me the exact section number" — repeated 8+ times per workflow.
- Tolerates brief guidance errors (e.g., climate zone thresholds off by 1°C).
- **Will not tolerate** hallucinated sections, omitted exceptions, or conflation of Part 6 + Part 11.
- Expects AI confidence tags: "I'm certain of this section" vs. "Consult AHJ for local amendments."

**Failure threshold:** Any single hallucinated section number → Diana walks, trust broken, dogfood fails.

---

## Summary

Diana is Title 24 compliance auditor + decarbonization builder. She tests whether AI **grounds all guidance in exact CA code sections**, **respects all-electric project context**, and **flags grid-integration requirements** (demand-response, OpenADR 2.0). She will walk on hallucinated sections. Critical missing features: all-electric tagging, HERS workflow gate, demand-response checkbox in permits, and project-type presets (all-electric ADU, Passive House retrofit, electrification retrofit). Minimal demo: solar mandate + EV charger + panel upgrade + all-electric context shift + demand-response permit checkbox.
