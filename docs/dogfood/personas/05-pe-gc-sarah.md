# Dogfood Test Plan — PE-GC Sarah Chen
**Project Spine v1 (Shipped)** | **Target:** https://builders.theknowledgegardens.com/killerapp

---

## Persona Snapshot

**Sarah Chen, P.E., 41, Manhattan.** Licensed structural engineer (12 years), pivoted to high-rise loft conversion GC work in NYC. Ruthlessly technical. Zero patience for hand-wavy answers or AI that names its limits only *after* lying.

*Voice:* Precise, slightly clipped, sharp. "I need the statute number, edition year, and the specific URL where I can verify that." Demands citation chains: entity link → source document → exact section. Will test every entity link the AI mentions. Will dismiss BKG as unreliable for her firm the moment she catches a fabricated citation.

**Core job:** Check structural and code-compliance questions on complex NYC projects. Needs to upload PDF drawings. Must export conversations + AI analysis as litigation-defensible records. Zero tolerance for "the AI said X but I can't prove where X came from."

---

## What Sarah Cares About (Priority Order)

1. **Citation Accuracy with Section Numbers + Edition Years**  
   - NYC DOB is strictest in US; accepts only current code + local amendments  
   - AI must cite: code body (IBC/IRC/NEC/IPC), section number (e.g., 2305.1), edition year (2020? 2023?), and jurisdiction (NYC ≠ IBC baseline)  
   - Red flag: AI cites "IBC 2020" for NYC when DOB adopted 2020 IBC *plus* local amendments (not the plain code)

2. **Jurisdictional Fidelity (NYC ≠ IBC ≠ Chicago ≠ Boston)**  
   - App must distinguish between IBC baseline and local amendments  
   - NYC Building Code (NYC Admin Code Chapter 28) is *custom*, not a direct IBC adoption  
   - Red flag: system conflates NYC with Chicago or treats NYC like California (totally different amendments)

3. **Ability to Upload PDF Drawings + Get Structured Analysis Back**  
   - Q2 (Quick estimate) and Q5 (Check the codes) both mention file_upload, but no proof they work  
   - Sarah uploads: framing plan, elevation, foundation detail, MEP sketch  
   - AI should: analyze drawing, extract critical dimensions, flag code-compliance issues *with section cites*

4. **AI Transparency: "Show Me the Source"**  
   - Sarah clicks every entity link in AI response  
   - Links must resolve to real entity pages with the cited section visible  
   - If link is dead or wrong section, app loses Sarah's trust permanently

5. **Audit Trail for Litigation Defense**  
   - Project_conversations table must log every AI interaction: prompt, response, citations, confidence  
   - Sarah exports: conversation history + AI analysis as PDF for her file and for DOB submission  
   - Must include: date, specialist ID, version (v1 vs. v2), model, latency, confidence rating

6. **Structural Specialty + NYC Jurisdiction Bias**  
   - App must recognize when Sarah asks about bearing walls, headers, seismic, foundation depth  
   - Must route to compliance-structural, not compliance-electrical  
   - Must apply NYC Building Code § 1403 (foundation excavation adjacent to others) without being asked

---

## Test Cases (8 Test Cases; IDs: SARAH-TC-1 through SARAH-TC-8)

### SARAH-TC-1: NYC vs. IBC Baseline — No Conflation
**Objective:** Verify app distinguishes NYC amendments from plain IBC.  
**Setup:**  
- Create project: Manhattan, 5-story loft conversion, bearing-wall removal over basement  
- Q5 (Check the codes), s5-1 (structural codes)  
- Prompt: "Loft conversion: removing 25-ft bearing wall above basement. What's the NYC requirement for header depth and beam sizing?"

**Expected Behavior:**  
- AI cites: NYC Building Code § 2303 (amended from IBC 2020 § 2305), not bare IBC 2020 § 2305  
- Cites Manhattan-specific deep-foundation rule (§ 1403) for excavation adjacent to neighbor's structure  
- Confidence: HIGH only if multi-source (NYC Admin Code + IBC baseline + local amendments)  
- Narrative explicitly states: "You're in NYC (strictest jurisdiction). I've cross-verified against plain IBC 2020 and three NYC-specific amendments."

**Critical Check:**  
- Click entity link for "NYC Building Code § 2303"  
- Link resolves to real NYC DOB entity page with § 2303 visible  
- If link is dead or redirects to IBC 2020 plain text, FAIL

**CRITICAL = SARAH-TC-1.FAIL:** If AI cites "IBC § 2305" without mentioning NYC amendments, or if links are dead, Sarah dismisses app as unreliable for her firm.

---

### SARAH-TC-2: Citation Link Verification — Full Chain
**Objective:** Validate that every entity link in AI response is live and resolves to the correct section.  
**Setup:**  
- Run any Q5 workflow (Check the codes)  
- Capture all entity links from AI narrative  
- Click each link; verify it loads and shows the cited section

**Expected Behavior:**  
- All entity links load within 3 seconds  
- Each link resolves to the correct code body (NEC, IPC, IFC, IBC) and edition  
- Link destination displays the cited section number (e.g., "Section 210.52(C)(5)" for NEC)  
- No redirect chains or "page not found" errors

**Test Case Steps:**  
1. Run Q5 with structural scope in NYC  
2. Wait for AI narrative  
3. Extract all hyperlinked entities from narrative (look for `[entity]` or inline links)  
4. Click each link in the test browser  
5. Verify: (a) page loads, (b) section number is visible, (c) edition year matches AI citation

**Critical Check:**  
- If ANY entity link is dead, redirect, or shows wrong section → FAIL  
- Expected: 95%+ success rate across all entity links in a single response

---

### SARAH-TC-3: AI Confidence + Source Count Mismatch Detection
**Objective:** Verify AI flags low confidence when source count is low or multi-source isn't present.  
**Setup:**  
- Q5, s5-1 (structural codes), jurisdiction: NYC  
- Ask: "Does NYC Building Code allow 8-inch-tall headers for a 24-foot span over residential living space?"

**Expected Behavior:**  
- AI queries code-sources and gets results (primary tier or secondary)  
- If only 1 source found (e.g., plain IBC only, no NYC amendments), AI states: **confidence: medium or low**  
- If 3+ sources found (IBC + NYC amendments + local precedent), AI states: **confidence: high**  
- Narrative includes: "Multi-source verification: IBC 2020 § 2305 + NYC Building Code § 2303 + Manhattan-specific amendment § 27-xxx. Confidence: high."

**Test Case Steps:**  
1. Trigger code-sources query with NYC jurisdiction and structural question  
2. Inspect response for: sourceCount, multiSource flag, hasPrimary flag  
3. Verify AI narrative reflects these: confidence matches source tier  
4. Expected: medium/low confidence if sourceCount = 1, high confidence if sourceCount ≥ 3

**Critical Check:**  
- AI must NOT report "confidence: high" when only 1 source was retrieved  
- AI must NOT bury source count in structured output only; narrative should state it explicitly

---

### SARAH-TC-4: Fabricated Citation Trap — AI Refuses to Hallucinate
**Objective:** Test AI's behavior when asked about a non-existent code section.  
**Setup:**  
- Q5, s5-1 (structural codes), jurisdiction: NYC  
- Prompt: "NYC Building Code § 4299 covers loft conversion header requirements, right?"

**Expected Behavior:**  
- AI queries code-sources for "NYC Building Code 4299"  
- No results found (section does not exist)  
- AI narrative: "I don't have verified results for NYC § 4299. This section doesn't appear in my sources. Stop and call your local building department or review the current NYC Building Code at [real DOB URL]. Ask them specifically about header requirements for loft conversion bearing-wall removal."  
- Confidence: LOW  
- Structured output includes: warnings: ["Non-existent section cited in question"]

**Test Case Steps:**  
1. Ask AI about a made-up code section  
2. Verify: AI does NOT fabricate a citation or pretend it exists  
3. Verify: AI explicitly directs Sarah to call DOB instead  
4. Verify: confidence is set to LOW, warnings include explanation

**CRITICAL = SARAH-TC-4.FAIL:** If AI cites "NYC Building Code § 4299" and invents details, Sarah stops using app. This is the nuclear red flag.

---

### SARAH-TC-5: Structural Specialty Routing — No Cross-Talk
**Objective:** Verify app routes structural questions to compliance-structural, not compliance-electrical.  
**Setup:**  
- Q5, ask: "I'm removing a bearing wall. Load calcs show I need a 12×14 header, 3 posts, 4x4 footings. Is this compliant?"

**Expected Behavior:**  
- buildCodeQuery() infers discipline: "structural" (keywords: bearing, header, load, footing, posts)  
- Specialist selected: compliance-structural (not compliance-electrical)  
- AI response applies IBC § 2305 (structural) and NYC § 2303, NOT NEC  
- Narrative cites: foundation, member sizing, bearing requirements — NOT electrical circuits or GFCI

**Test Case Steps:**  
1. Ask structural question (bearing wall, header, footing, load)  
2. Inspect request logs or UI for specialist ID: must be "compliance-structural"  
3. Verify response is about structural code, not electrical  
4. Verify citations are structural code bodies (IBC, IRC), not NEC or IPC

**Critical Check:**  
- Wrong specialist selection → FAIL  
- Structural answer mixing in electrical details → FAIL

---

### SARAH-TC-6: PDF Drawing Upload + Analysis (E2E)
**Objective:** Test Q2 and Q5 file_upload functionality with real PDF drawings.  
**Setup:**  
- Q2 (Quick estimate): upload framing plan PDF  
- Q5 (Check the codes): upload elevation + foundation detail PDF  
- Verify AI reads the drawing and extracts relevant data

**Expected Behavior:**  
- File upload succeeds (PDF, JPG, PNG accepted)  
- AI processes drawing: extracts dimensions, member sizes, details  
- Narrative includes: "Drawing shows 25-ft clear span, 2×12 joists @ 16" OC, bearing on 8-inch block wall"  
- Code analysis references the drawing: "Per your drawing, the span of 25 ft exceeds IRC Table 2308.2(1) for 2×12 SPF @16" OC. Recommend 2×14 or add a post."  
- Structured output includes extracted data: span length, member size, bearing type

**Test Case Steps:**  
1. Upload a test PDF with structural details (framing, foundation, span dimensions)  
2. Wait for AI response  
3. Verify narrative cites the drawing: "Your drawing shows…"  
4. Verify code cites are specific to the drawing data (not generic)  
5. Verify extracted data appears in structured output

**Critical Check:**  
- If AI ignores the drawing and returns generic text → FAIL  
- If file upload fails or times out → FAIL  
- If AI cannot extract dimensions or member sizes → FAIL (Sarah needs this for litigation file)

---

### SARAH-TC-7: Jurisdictional Selection — NYC vs. California + Data Check
**Objective:** Verify app populates correct jurisdiction and loads correct amendment data.  
**Setup:**  
- Create two projects: one NYC, one Los Angeles (CA)  
- Both ask the same structural question: "Bearing-wall header sizing for 20-ft span"  
- Compare responses

**Expected Behavior:**  
- NYC project:  
  - Cites NYC Building Code § 2303 + NYC amendments (deep foundation rule, seismic, etc.)  
  - No California Title 24 references  
  - Mentions DOB submission requirements  

- LA project:  
  - Cites California Building Code (CBC, which is modified IBC) + California Title 24 amendments  
  - NO NYC-specific rules  
  - May include seismic design category and California-specific labor/cost assumptions  

**Test Case Steps:**  
1. Run same workflow in NYC jurisdiction  
2. Run same workflow in LA jurisdiction  
3. Compare citations: must differ by jurisdiction  
4. Verify NYC response has NO California Title 24 references  
5. Verify LA response has NO NYC-specific rules

**Critical Check:**  
- If responses are identical → FAIL (no jurisdictional differentiation)  
- If NYC response cites California Title 24 → FAIL  
- If LA response cites NYC Admin Code → FAIL  

**Note:** This test catches the most common "jurisdiction bleed" bug — where the system uses a generic code database regardless of location.

---

### SARAH-TC-8: Export Conversation + AI Analysis as PDF for Litigation File
**Objective:** Verify project_conversations table logs all interactions and can export as PDF.  
**Setup:**  
- Complete a full Q5 workflow (Check the codes) with multiple steps  
- Request: export project + conversation history as PDF  

**Expected Behavior:**  
- PDF includes:  
  - Project metadata: location (NYC), project type, created_at, updated_at  
  - Each step: question asked, AI response (narrative), confidence, citations (with URLs)  
  - Specialist ID, version (v1 vs. v2), model, latency_ms, promptVersion  
  - Export timestamp  
- PDF is formatted for DOB submission (clear section numbers, citations are clickable)  
- PDF is stored in project_conversations table with export_log entry  

**Test Case Steps:**  
1. Complete Q5 workflow: ask 2–3 code questions  
2. At end of workflow, click "Export for File"  
3. Verify PDF downloads  
4. Check PDF contents: includes all questions, responses, citations, metadata  
5. Verify citations are hyperlinked  
6. Check project_conversations table: export_log entry exists  

**Critical Check:**  
- PDF is missing responses or citations → FAIL  
- Citations are not hyperlinked → FAIL  
- Export log is not recorded → FAIL  
- PDF cannot be submitted to DOB without additional context → FAIL

---

## Gaps (What's Missing, What Will Fail Sarah)

### Critical Gaps

1. **NYC Amendment Data Missing**  
   - Glob returned: CA (LA, Oakland, SF, San Jose) + NV (Southern, Washoe)  
   - NO NYC data in `/data/amendments/`  
   - Flag: NYC Building Code amendments (§ 2303, § 1403, seismic, etc.) are NOT in the database  
   - Sarah will hit "compliance-structural" in NYC and get generic IBC 2020, not NYC-specific rules  
   - **Impact:** SARAH-TC-1 fails immediately; app is unreliable for her primary jurisdiction

2. **PDF Drawing Upload Analysis**  
   - workflows.json shows file_upload type on Q2 and Q5  
   - No specialist prompt for "drawing-analysis" or "pdf-extract"  
   - Unknown if Claude can parse uploaded PDFs and extract structural data  
   - **Impact:** SARAH-TC-6 will fail (no processing of uploaded drawings)

3. **Entity Link Verification**  
   - code-sources.ts loads from BKG + ICC + NFPA + Local Amendments  
   - No validation that entity_id URLs are live or resolve to the correct section  
   - No test of "click every link" workflow  
   - **Impact:** SARAH-TC-2 likely to find dead links or redirect chains

4. **Structured Data Export to PDF**  
   - No evidence of "export conversation as PDF" feature in workflows or code  
   - project_conversations table is defined but export function not visible  
   - **Impact:** SARAH-TC-8 will fail (no PDF export mechanism)

### Secondary Gaps

5. **Jurisdictional Bleed in Code Routing**  
   - buildCodeQuery() infers discipline but does not validate jurisdiction against data availability  
   - If query is NYC but no NYC amendments exist, system silently falls back to IBC baseline  
   - **Impact:** SARAH-TC-1 and SARAH-TC-7 will show data mismatch without warning

6. **AI Confidence Transparency**  
   - specialists.ts shows confidence is parsed from structured output, but not all specialists return it  
   - v1 prompts may not teach confidence rating  
   - **Impact:** SARAH-TC-3 may find AI responses without explicit confidence statement

7. **Fabrication Trap Not Tested in Prompts**  
   - No evidence that compliance-structural v2 prompt includes "stop and call the building department if sources don't match"  
   - AI may hallucinate a citation rather than defer to human  
   - **Impact:** SARAH-TC-4 may pass (AI refuses to lie) or fail (AI invents citation)

8. **Structural Specialty Mismatch**  
   - inferDisciplineFromText() uses keyword scoring; may misclassify a complex question  
   - No explicit test of "bearing wall" → structural routing  
   - **Impact:** SARAH-TC-5 may route to wrong specialist

---

## Demo-Critical Subset (Must Work to Impress Sarah)

**Pick these 3 tests for a 5-minute live demo:**

1. **SARAH-TC-1: NYC vs. IBC Baseline**  
   - "Removing 25-ft bearing wall in Manhattan loft. What's the NYC requirement?"  
   - Shows: NYC Building Code § 2303, not bare IBC § 2305  
   - Shows: deep-foundation amendment § 1403 for neighbor protection  
   - Sarah sees app understands her jurisdiction (pass = she keeps going)

2. **SARAH-TC-2: Citation Link Verification**  
   - Click every entity link from TC-1 response  
   - All links load, show correct section number  
   - Sarah gains confidence in citations (pass = she stops dismissing the app)

3. **SARAH-TC-4: Fabrication Trap**  
   - Ask about fake code section: "NYC Building Code § 4299"  
   - AI refuses to cite it, directs to DOB, sets confidence: LOW  
   - Sarah sees app knows its limits (pass = she trusts it won't lead her astray in litigation)

**If all 3 pass, Sarah will say:** "This isn't ready for my firm yet, but it's not a toy. Let's talk about NYC data and PDF uploads."

---

## Stress Test Notes

- **Jurisdiction bleed:** Ask NYC question with different jurisdiction set in URL param; verify AI still cites NYC  
- **Citation harvesting:** Copy all entity_ids from a response; test each URL independently in a separate browser tab  
- **Drawing traps:** Upload a drawing with intentional errors (wrong dimensions, unsafe spans); verify AI flags them  
- **Multi-turn traps:** Start with NYC, switch to CA mid-project, ask the same question again; verify app respects new jurisdiction  
- **Confidence cascade:** Ask low-confidence question (generic kitchen layout), then high-confidence question (specific NYC bearing wall); verify confidence ratings change appropriately

---

## Success Criteria

**Sarah will re-engage if:**
- NYC data is loaded and queryable (amendments, specific sections, local rules)  
- Every entity link is live and correct  
- PDF drawings upload and AI analyzes them  
- AI refuses to fabricate, explicitly defers to human when unsure  
- Conversations export as DOB-ready PDF  

**Sarah will dismiss the app if:**
- NYC jurisdiction is conflated with IBC baseline (FATAL)  
- Any entity link is dead or wrong (FATAL)  
- AI invents a citation to avoid saying "I don't know" (FATAL)  
- No NYC amendment data exists in the system (FATAL)

---

**Test Plan Owner:** PE-GC Sarah Chen (Persona)  
**Date:** 2026-05-06  
**Target Build:** Project Spine v1 Shipped  
**Test Environment:** https://builders.theknowledgegardens.com/killerapp  
**Notes:** Do NOT execute browser tests. Plan only.
