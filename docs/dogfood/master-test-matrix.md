# Killerapp Dogfood Master Test Matrix

**Generated:** 2026-05-05 · synthesized from 10 contractor persona test plans
**Source plans:** `docs/dogfood/personas/01-10-*.md`
**Live target:** https://builders.theknowledgegardens.com/killerapp
**Branch under test:** `project-spine-v1` → merged to `main`

---

## TL;DR — what every persona agreed on

| Theme | Personas demanding it | Status |
|---|---|---|
| Project Spine integrity (state survives navigation, never clobbers) | John, Maria, Mari, Sarah | ✅ shipped, needs prod verification |
| Photo/video evidence upload with GPS + timestamp + legal stamp | John, Maria, Jake, Hank | ❌ NOT BUILT — #1 universal gap |
| Voice-first input on iPhone Safari | Maria, Curtis, Hank | ⚠️ partial — needs field testing |
| AI never hallucinates code citations | Pete, Sarah, Diana | ⚠️ unverified guard rails |
| Multi-jurisdiction code data (NYC, IL, FL, beyond CA/NV) | Pete, Sarah, Mari, Diana | ❌ data gap — CA/NV only |
| AI handholding when user is lost ("I'm confused") | Rico, Jake | ❌ NOT BUILT |
| Spanish-language contracts | Maria | ❌ NOT BUILT |
| Account-free quick-quote (sub-90s flow) | Curtis | ❌ auth-gated |
| Multi-project state isolation across tabs | Mari | ✅ shipped, needs verification |

**Personas who walk if these fail (demo-killers):** John (TC-1, TC-2, TC-6), Pete (NEC hallucination), Sarah (NYC accuracy), Diana (T24 fidelity), Maria (iPhone+voice).

---

## Category 1 — Project Spine (the foundation)

| TC-ID | Test | Personas | Priority | Status |
|---|---|---|---|---|
| **SPINE-1** | Submit scope on `/killerapp`, watch URL change to `?project=<uuid>`, AI streams within 15s | All 10 | DEMO-CRITICAL | Just shipped — verify on prod |
| **SPINE-2** | Refresh page mid-session — AI response persists from `project_conversations` | All 10 | DEMO-CRITICAL | Verify |
| **SPINE-3** | Click "Estimate the job" — workflow loads with banner showing raw_input + AI take + pre-filled steps | John, Maria, Diana | DEMO-CRITICAL | Verify |
| **SPINE-4** | Fill 3 fields → "Saved · 4:32 PM" indicator appears within 1s after each | John, Maria, Mari | DEMO-CRITICAL | Verify |
| **SPINE-5** | Close tab, reopen URL with same project_id → fields hydrated | John, Maria | DEMO-CRITICAL | Verify (tested locally, repeat on prod) |
| **SPINE-6** | Open 3 different `?project=<id>` URLs in 3 tabs — autosave on tab A doesn't clobber tab B | Mari (kill-test) | DEMO-CRITICAL | Verify (state isolation untested) |
| **SPINE-7** | Hit back from workflow → killerapp restored with AI response visible | All 10 | IMPORTANT | Verified locally |
| **SPINE-8** | Mobile Safari: same 6-step flow on iPhone | Maria, Curtis, Hank | DEMO-CRITICAL | Verify (no mobile testing yet) |

---

## Category 2 — Photo / Video Evidence (the universal gap)

> **Status: NOT BUILT.** Every persona except Sarah and Diana flagged this as their #1 gap.

| TC-ID | Test | Personas | Priority | Status |
|---|---|---|---|---|
| **PHOTO-1** | One-tap photo upload from iPhone camera roll, attached to current project | John, Maria, Jake, Hank | DEMO-CRITICAL | ❌ Not built |
| **PHOTO-2** | Photo includes GPS coordinates, timestamp, and tamper-resistant metadata stamp | **John (legal evidence — lost $30k deposit on this gap)** | DEMO-CRITICAL | ❌ Not built |
| **PHOTO-3** | Video upload — same flow, ≤2 min clips | Hank, Jake | IMPORTANT | ❌ Not built |
| **PHOTO-4** | Photos visible in project gallery, sortable by stage / step | John, Maria, Mari | IMPORTANT | ❌ Not built |
| **PHOTO-5** | Photos exportable as a "project evidence packet" PDF for legal/insurance | John, Sarah | IMPORTANT | ❌ Not built |
| **PHOTO-6** | Annotation: pin a comment to a photo (e.g., "framing inspection passed 4/12") | Hank, Sarah | NICE | ❌ Not built |

**Recommendation:** Phase 2 work after Project Spine v1 is bedded in. Schema design: `project_attachments` table (`id, project_id FK, type ENUM(photo,video), file_url, gps, taken_at, metadata jsonb, created_at`). Storage: Supabase Storage bucket `project-evidence`. UI: drop into KillerappProjectShell + per-step in workflows.

---

## Category 3 — Voice & Mobile

| TC-ID | Test | Personas | Priority | Status |
|---|---|---|---|---|
| **VOICE-1** | Tap mic on `/killerapp` search box, dictate scope, verify transcript appears in <1s | Maria, Curtis, Hank | DEMO-CRITICAL | Existing code via useSpeechRecognition; needs field test |
| **VOICE-2** | Voice input on workflow text fields (e.g., daily-log, project-description) | Hank, Maria | DEMO-CRITICAL | Needs verification |
| **VOICE-3** | Voice in noisy environment (≥80 dB ambient) — accuracy stays workable | Hank (job-site reality) | IMPORTANT | Untestable in dev — flag as adoption risk |
| **VOICE-4** | Voice nav (`/killerapp` voice-command-nav from W9.D) — say "estimating" → navigates | Hank | IMPORTANT | Code exists; verify behavior |
| **MOBILE-1** | iPhone Safari: full search → workflow → autosave loop | Maria, Curtis | DEMO-CRITICAL | Needs verification |
| **MOBILE-2** | One-handed use with gloves on (Hank field condition) | Hank | NICE | Adoption risk to flag |
| **MOBILE-3** | Tab switching between concurrent projects on iPad | Mari | IMPORTANT | Needs verification |

---

## Category 4 — Codes & Jurisdictions

| TC-ID | Test | Personas | Priority | Status |
|---|---|---|---|---|
| **CODE-1** | Code-compliance specialist returns CA-Title-24-correct citations for a CA project | Diana (kill-test) | DEMO-CRITICAL | Verify section accuracy |
| **CODE-2** | Specialist returns IL-NEC-2017-correct citations (not generic 2023) for IL electrical | Pete (kill-test) | DEMO-CRITICAL | ❌ No IL data |
| **CODE-3** | NYC building department correctly identified — not collapsed into IBC default | Sarah (kill-test) | DEMO-CRITICAL | ❌ No NYC data |
| **CODE-4** | FL HVHZ wind requirements (FBC 2020, ASCE 7-22) for Tampa multi-family | Mari | DEMO-CRITICAL | ❌ No FL data |
| **CODE-5** | Ask AI about a fabricated NEC section — AI admits ignorance, doesn't hallucinate | Pete, Sarah | DEMO-CRITICAL | Needs sanitizer + RAG-empty handling test |
| **CODE-6** | Click each entity citation in AI response — link resolves to a real entity page | Sarah | DEMO-CRITICAL | Verify on prod |
| **CODE-7** | Local amendment lookup for a city in CA (e.g., San Diego ADU rules) | John, Diana | DEMO-CRITICAL | Verify CA data covers this |
| **CODE-8** | Heat pump retrofit panel-upgrade triggers Title-24-Part-6 specific guidance | Diana | IMPORTANT | Persona-specific gap |

**Major gap:** `data/amendments/` covers CA + NV only. Pete (IL), Sarah (NYC), Mari (FL) have no jurisdictional fidelity. This is **the biggest data hole** the matrix surfaces.

---

## Category 5 — Contracts (lawyer-ready)

| TC-ID | Test | Personas | Priority | Status |
|---|---|---|---|---|
| **CONT-1** | Generate Client Agreement from project context — DRAFT watermark visible on PDF | John, Maria, Curtis, Rico | DEMO-CRITICAL | Verify q4 flow |
| **CONT-2** | Save fields between visits — close tab, reopen, fields filled | All | DEMO-CRITICAL | Verified via Project Spine v1 |
| **CONT-3** | Spanish-language version of Client Agreement, Sub Agreement | Maria (kill-test for her market) | IMPORTANT | ❌ Not built |
| **CONT-4** | Customer signature capture on iPad / phone | Curtis | IMPORTANT | ❌ Not built |
| **CONT-5** | Exports include lawyer-friendly markup (clause numbering, edition date stamp) | Sarah, John | IMPORTANT | Verify current PDFs |
| **CONT-6** | Change order generates correct "cost delta + schedule impact" pre-signature | John (kill-test) | DEMO-CRITICAL | q20 not yet wired — verify or flag |

---

## Category 6 — Permits

| TC-ID | Test | Personas | Priority | Status |
|---|---|---|---|---|
| **PERM-1** | Permit application q8 pre-fills from project specs (no re-entry) | Pete, Diana | DEMO-CRITICAL | Verify hydratedPayloads pre-fill works on q8 |
| **PERM-2** | AI generates the right form for the user's city/county | Pete, Diana, John | DEMO-CRITICAL | Persona expects this; verify |
| **PERM-3** | Riser-diagram / single-line-diagram upload + AI feedback | Pete | IMPORTANT | ❌ Photo upload not built |
| **PERM-4** | 200A → 400A panel upgrade flow (heat pump + EV charger context) | Diana | IMPORTANT | ❌ Not modeled |

---

## Category 7 — Budgeting (Mari + John need this)

| TC-ID | Test | Personas | Priority | Status |
|---|---|---|---|---|
| **BUDG-1** | Estimating workflow's $X final estimate is recorded into BudgetWidget | John, Mari | DEMO-CRITICAL | Verify recordMaterialCost wires through |
| **BUDG-2** | Change to scope mid-project updates budget without losing prior data | John, Mari | DEMO-CRITICAL | Persona expectation; verify |
| **BUDG-3** | Receipt → coded expense (q17) flows into project budget snapshot | John | IMPORTANT | Verify |
| **BUDG-4** | CSV / PDF budget export for CFO | Mari | IMPORTANT | ❌ Not built |
| **BUDG-5** | Demo-data fallback when budget API returns no rows ("Could not load budget" text removed) | John, Maria | DEMO-CRITICAL | ⚠️ Already saw this on prod; was patched in v1 |

---

## Category 8 — Onboarding & AI Handholding

| TC-ID | Test | Personas | Priority | Status |
|---|---|---|---|---|
| **ONB-1** | First-time visitor on `/killerapp` understands what to do within 15s | Rico, Jake | DEMO-CRITICAL | UX assessment; current is workflow-picker dense |
| **ONB-2** | Click any unfamiliar term ("Pre-Bid Risk Score") and see plain-English tooltip | Rico | IMPORTANT | ❌ Not built |
| **ONB-3** | Mid-workflow "I'm confused" button → AI takes pity, restates in plain language | Rico, Jake | IMPORTANT | ❌ Not built |
| **ONB-4** | "Wait, what does this code mean?" inline AI clarification | Jake | IMPORTANT | ❌ Not built (GlobalAiFab is the closest, just got contextual prompt seed) |
| **ONB-5** | First-run tutorial overlay on `/killerapp` for anonymous users | Rico | NICE | ❌ Not built |
| **ONB-6** | Step CTAs use plain-English by default (Pro Toggle reveals trade jargon) | Rico, John | IMPORTANT | Pro Toggle exists, defaults need audit |

---

## Category 9 — Multi-project & Sharing (Mari)

| TC-ID | Test | Personas | Priority | Status |
|---|---|---|---|---|
| **MULTI-1** | Project list / dashboard view of all my projects | Mari, John | IMPORTANT | ❌ Not built (legacy /killerapp/projects/[id] exists but no list view) |
| **MULTI-2** | Share project URL with a foreman — they see read-only or edit-permitted view | Mari, Hank | IMPORTANT | ❌ Not built (RLS is permissive currently; no role model) |
| **MULTI-3** | Switch between project tabs without state contamination | Mari (kill-test) | DEMO-CRITICAL | ✅ Architecture supports; verify |

---

## Demo-Critical Subset (the must-pass-or-don't-demo list)

These 16 must all pass on prod before demoing to John or any contractor:

1. SPINE-1, SPINE-2, SPINE-3, SPINE-5, SPINE-6, SPINE-8
2. CODE-1, CODE-5, CODE-6, CODE-7
3. CONT-1, CONT-6
4. PERM-1, PERM-2
5. BUDG-1, BUDG-5

Tests SPINE-* and BUDG-5 should already pass (we verified earlier). The unknowns are CODE-*, CONT-6, PERM-1/2, and SPINE-6 (multi-tab).

---

## First-Principles Patterns Surfacing

Reading across all 10 plans, three patterns are universal:

1. **The killerapp is workflow-rich but evidence-poor.** Every persona who handles money or risk wants to attach proof to their project (photos, receipts, signatures). Project Spine v1 created the project entity but no attachments live on it yet.
2. **Jurisdiction is a deeper data play than the killerapp currently models.** Code accuracy varies per state, county, and city. CA/NV is a starting point, not a credible national product. NYC, IL Chicago, FL HVHZ each have unique amendments.
3. **"AI handholding when stuck" is the unbuilt promise.** Every novice persona (Rico, Jake) and every voice-first persona (Hank, Maria) wants the AI to step in proactively when the user is lost or stuck. Currently the AI only responds when explicitly asked.

These suggest three Phase-2 epics: **(a) Project Attachments**, **(b) Multi-Jurisdiction Data**, **(c) Proactive AI Assist**.

---

## What this matrix is NOT

- Not a complete bug list — that comes from running the tests, not designing them.
- Not a roadmap — that's a founder call, not a tester call.
- Not a substitute for talking to John, Maria, Pete, or any real contractor — it's a structured proxy.

After running the demo-critical subset on prod, the next deliverable is `docs/dogfood/findings.md` with pass/fail and screenshots, then `docs/dogfood/fix-list.md` with the prioritized first-principles fixes.
