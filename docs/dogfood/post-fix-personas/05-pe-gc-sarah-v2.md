# PE-GC Sarah Chen — Next 5-7 Gripes (Post-Fix Dogfood)

**Date:** 2026-05-06  
**Persona:** Sarah Chen, P.E., 41, Manhattan. Structural PE, 12-year GC. Ruthlessly technical. Zero tolerance for fabricated citations or missing audit trails.  
**Context:** Project Spine v1 shipped 2026-05-03. Wave 2 wiring (q8, q15, q11) shipped 2026-05-06. NYC amendment data still missing. Cost parser now handles `$1.4M`. B-8 bug (ai_summary overwrite) identified but not yet fixed.

---

## GRIPE-1: Every Copilot Call Overwrites the Orientation Summary

**Priority:** CRITICAL (kills trust in 3 minutes)  
**Trigger:** Sarah creates project with raw_input: "Manhattan loft, 5-story, bearing-wall removal, basement." AI streams excellent orientation ($1.2M–$1.6M range, NYC Title 24 callout, foundation risk). She clicks to Code Compliance workflow. **The banner still shows the right summary.** Then she runs a code probe: "What does NEC 919.7(D)(4) say?" (fake section). AI correctly refuses: "I don't have NEC 919.7(D)(4) in my knowledge base…" **The banner now shows the refusal text instead of the orientation.**  
**Why it kills her:**  
- She's building a litigation-defensible file. The first AI take (the foreman orientation) is the baseline. Every subsequent call is a narrow probe.  
- When the banner shows the refusal instead of the orientation, she can't tell if the system is tracking context or if each call is isolated.  
- **Exported conversation will show hallucination-disclaimer as the "ai_summary" rather than the real scope analysis.** DOB reviewer reads this and thinks the system is broken.  

**Suggested fix:** In `copilot/route.ts`, split persistence: introduce `orientation_summary` column (only written when `ai_summary` is null/empty on first killerapp landing call). Keep `ai_summary` for "latest exchange" if she wants it. Then the banner always shows `orientation_summary` (the foreman take), and she can see all probes in `project_conversations`. This is what she called "audit trail" in TC-8.

---

## GRIPE-2: NYC Data Is Still Completely Missing — System Falls Back to Generic IBC, Silently

**Priority:** CRITICAL (app is unusable for her firm)  
**Trigger:** Sarah creates project in NYC jurisdiction. Raw_input says "Manhattan bearing-wall removal." She clicks Code Compliance, sees jurisdictions default to "IBC 2024 (International), US" (not NYC). She asks: "Bearing-wall header sizing — what does NYC Building Code § 2303 say?" AI responds with a competent-looking answer citing IBC 2020 § 2305 + some generic guidance. **No warning that she's not in NYC anymore.** She clicks the entity link for "IBC 2020 § 2305" — it resolves to the plain IBC text, not the NYC-amended version. She checks the amendments data in the code browser: **CA cities (LA, SF, Oakland, San Jose), Nevada (Southern, Washoe). Zero NYC.**  
**Why it kills her:**  
- NYC Building Code § 2303 is NOT IBC § 2305. NYC has bespoke amendments (deep-foundation rules § 1403, seismic, material restrictions) that IBC doesn't have.  
- If she relies on IBC 2020 for a bearing-wall design and DOB inspector calls out a NYC-specific rule she missed, she's exposed.  
- **She will immediately dismiss the app as "not for serious NYC work."** This is the FATAL red flag from her test plan (SARAH-TC-1.FAIL).  

**Suggested fix:** This is Epic B in the fix list — data ingestion + loading. Interim: code a fallback message in compliance-structural prompt: "I notice you're in NYC but I don't have NYC-specific amendment data yet. Here's the IBC baseline (§ 2305); you MUST verify against current NYC Building Code § 2303 and local amendments at the NYC DOB website (nyc.gov/dob) before submitting any design."

---

## GRIPE-3: Can't Upload and Analyze Her PDF Drawings — No Drawing Parser

**Priority:** CRITICAL (missing core workflow)  
**Trigger:** Sarah has a PDF of framing plan showing 25-ft clear span, 2×12 joists @ 16" OC, bearing on 8" block wall. Workflows.json shows Q2 and Q5 have `file_upload` type. She clicks "Upload drawing" in Code Compliance. **Upload button exists, form accepts PDFs.** She submits. AI response is generic: "To check if your joists are compliant, I'd need to know the span, member size, spacing, and bearing type. Can you tell me those?" **No parsing. No extraction of dimensions from the PDF.** She has to re-type the data from her own drawing.  
**Why it kills her:**  
- She uploaded the drawing precisely so the AI would read it. If the system can't parse structural PDFs, the file_upload feature is a lie.  
- **For litigation defense, she needs the AI to cite her drawing:** "Your drawing shows a 25-ft span with 2×12 SPF @ 16" OC." This proves she had a real design document, and the AI analysis was run against it.  
- Without drawing-aware citations, the export PDF won't stand up to a DOB review or an adverse claim.  

**Suggested fix:** Build a "drawing-analysis" specialist prompt that instructs Claude to: (1) describe what it sees (span, member type, spacing, bearing), (2) extract those values into structured fields, (3) cite the drawing in the narrative: "Your drawing shows X; code requires Y." This requires a multi-turn flow or a stronger file-handling instruction in the specialist prompt. Claude 4 can parse PDFs; the prompt just doesn't ask it to.

---

## GRIPE-4: Entity Links Are Dead or Redirect to Wrong Section

**Priority:** HIGH (undermines citation chain)  
**Trigger:** Sarah gets an AI response citing "NYC Building Code § 1403 (foundation excavation adjacent to others)". She clicks the entity link. **Link redirects to a generic ICC entity page, not the NYC-specific amendment.** She tries searching NYC DOB website directly and finds § 1403 exists, but the link the system provided doesn't resolve correctly. She clicks entity links from three other responses. **Two are dead (404). One redirects to a parent section instead of the exact subsection cited.**  
**Why it kills her:**  
- Test plan SARAH-TC-2 explicitly requires: "All entity links load within 3 seconds. Each link resolves to the correct code body and edition. Link destination displays the cited section number."  
- **If links don't resolve, she can't defend the citation in court.** "I used an AI tool that cited code § X" is not defensible if she can't point to the actual section.  
- She will export the conversation and submit it to DOB review; broken links look like she didn't verify the citations.  

**Suggested fix:** In code-sources.ts, validate every `entity_id` URL before returning it in the response. Add a health-check endpoint that tests links on load. Return only links with a 200 response and verify the section number appears in the page title or H1. For NYC, ensure entity links point to official NYC DOB pages (currently missing, so this is part of Epic B).

---

## GRIPE-5: Permission Delegation — Her PM Can't Access Expense/Daily-Log Without See-All-Contracts

**Priority:** HIGH (workflow blocker for multi-person firm)  
**Trigger:** Sarah wants to invite her project manager (PM) to manage daily-log (Q15) and expense tracking, but NOT estimating or contracts. The invite system (implicit in the personas) doesn't have granular permissions: it's all-or-nothing. PM gets invited and can see Estimate (Q2), Codes (Q5), Contracts (Q4), **everything.** Sarah can't create a "view-only daily-log + expenses, no estimate/contract access" role.  
**Why it kills her:**  
- For a 12-person firm with 6 active projects, she needs: PMs who log daily progress but can't change the estimate. Subs who see their own line items but not the overall budget. Site foremen who log photos/expenses but don't touch codes.  
- Without fine-grained permissions, she has to choose: (a) keep everything to herself (doesn't scale), (b) give everyone full access (security/liability risk).  
- This blocks her pipeline of 6 active conversions from being managed by a team.  

**Suggested fix:** Introduce role-based access control (RBAC) on the project: `roles: ['owner', 'estimator', 'compliance-reviewer', 'daily-log-only', 'photo-evidence-only']`. Assign collaborators a role when inviting them. Lock workflows behind role gates. This is a product design + auth work (~3-4 hr for MVP).

---

## GRIPE-6: Jurisdiction Auto-Default Isn't Enough — She Needs NYC Amendments IN the Data

**Priority:** HIGH (blocker for correct code citations)  
**Trigger:** Sarah creates a project, sets jurisdiction to NYC. The Code Compliance workflow now defaults to "NYC Building Code (Admin Code Chapter 28), US" instead of generic IBC (Tier 1 fix #2 shipped). **But when she queries for structural compliance, the AI response cites IBC 2020 § 2305 anyway, not NYC § 2303.** She checks the code-sources retrieval in the logs. **The system returned only IBC 2020 results because no NYC amendment data exists in the database.** The jurisdiction picker defaulted correctly, but the data backend doesn't have NYC coverage.  
**Why it kills her:**  
- Auto-defaulting the picker is window dressing if the knowledge base is empty.  
- She asked for NYC-specific guidance and got IBC baseline. She can't tell if the system is ignorant or if she picked the wrong jurisdiction.  
- Test plan SARAH-TC-7 (jurisdictional fidelity) requires NYC and LA responses to differ by jurisdiction. This test fails because NYC data is missing.  

**Suggested fix:** This is Epic B (multi-jurisdiction data). For demo purposes, code a banner in Code Compliance: "⚠️ NYC amendment data is not yet loaded. Citations will reference IBC baseline. Before submitting designs to DOB, verify against current NYC Building Code at nyc.gov/dob." Then do the real work: load NYC Building Code § 2303, § 1403, seismic amendments, etc. into amendments/nyc-admin-code.json.

---

## GRIPE-7: AI Summary Stability — She Wants a Frozen "Orientation Take" for the Export, Not a Rolling "Latest Exchange"

**Priority:** MEDIUM (related to Gripe-1, but a distinct UX pain)  
**Trigger:** Sarah completes the killerapp landing flow and exports the project to PDF. The export includes "AI Take: [first 600 chars of orientation]" which is perfect: "$1.2M–$1.6M range, 5-story Manhattan loft, Title 24 relevance, foundation risk, 22-week critical path." She runs a few code probes. She exports the conversation again (Tier 1 feature, not yet built). **The "AI Take" section now shows the latest probe response (the hallucination-guard refusal text) instead of the orientation.** The export PDF is now inconsistent with the first one — DOB reviewer sees two different "AI Takes" for the same project and questions whether the system is tracking context correctly.  
**Why it kills her:**  
- The export is meant to be a **snapshot** of her decision-making at a point in time. If the "AI Take" field is a rolling cursor instead of a pinned orientation, the export loses its narrative integrity.  
- Test plan SARAH-TC-8 requires: "PDF includes each step: question asked, AI response (narrative), confidence, citations (with URLs). PDF is formatted for DOB submission."  
- If the PDF is overwritten by every new probe, she can't build a clean narrative of her design decisions.  

**Suggested fix:** Introduce separate columns: `orientation_summary` (pinned on first creation, never updated) and `latest_exchange` (rolling). Export uses `orientation_summary`. Workflows show `latest_exchange` in the conversation history. This is the same fix as Gripe-1 but framed from an export/narrative angle.

---

## GRIPE-8 (Optional): She Can't Tell If the System Knows Its Own Limits — Confidence Ratings Are Invisible

**Priority:** MEDIUM (test plan SARAH-TC-3 explicitly checks this)  
**Trigger:** Sarah runs a code probe: "Bearing-wall header sizing for 20-ft span over residential living space." The AI responds with a substantive answer citing IBC § 2305 and NYS guidance. She reads the response and has no idea if the system found 5 sources or just 1. Test plan requires: AI must state confidence explicitly and explain source count. **The response has no confidence statement, no "multi-source verification" callout, no warning if sources are scarce.**  
**Why it kills her:**  
- She's building a defensible file. If the AI had only one source, she needs to flag that ("confidence: medium, single source, verified independently with licensed PE"). If it had five sources, she's more confident.  
- Test plan SARAH-TC-3 expects: "If sourceCount ≥ 3, confidence: high. If sourceCount = 1, confidence: medium/low."  
- Without this transparency, she's flying blind.  

**Suggested fix:** Add a confidence section to the specialist response format: 
```
**Confidence: [HIGH | MEDIUM | LOW]**  
Sources: [N] cross-verified.  
[If low: explicit link to NYC DOB or call-to-action to verify independently.]
```

---

## Summary: Top 3 Gripes for Sarah (by kill-speed)

| Gripe | Priority | Kill Speed | Fix Effort |
|-------|----------|-----------|-----------|
| **#2: NYC data missing** | CRITICAL | 3 min (she asks for NYC § 2303, gets IBC 2020) | Epic B (5 weeks) |
| **#1: ai_summary overwrites** | CRITICAL | 5 min (banner shows wrong content) | 15 min code |
| **#3: No PDF drawing parser** | CRITICAL | 8 min (upload → no extraction) | 2-3 hr specialist prompt + test |

**Other blockers:** Gripe #4 (dead entity links), Gripe #5 (no RBAC), Gripe #6 (jurisdiction window dressing), Gripe #7 (export snapshot stability), Gripe #8 (confidence opacity).

**Demo-killing:** If Sarah hits Gripe #2 (NYC data absent) or Gripe #1 (banner shows wrong content) in the first demo, she will say: "This isn't ready for my firm. Let's talk when you have NYC coverage and audit-trail stability."

---

**Persona:** PE-GC Sarah Chen  
**Date:** 2026-05-06  
**Status:** Post-fix, pre-NYC-data, pre-PDF-parsing  
**Test Plan Reference:** SARAH-TC-1 through SARAH-TC-8  
