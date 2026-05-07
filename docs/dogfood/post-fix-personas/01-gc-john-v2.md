# GC John's Post-Fix Gripes — Day 2 (2026-05-06)

**Persona Recap:** John Mendoza, 52, San Diego GC. $2M annual. Runs 8 crew on ADUs + remodels. Lost $30k deposit on photo/evidence gap. Patient on demo day; brutal on day 2. Measures app by: money in/out, deposit protection, crew coordination.

**Context:** Tier 1 fixes shipped May 6:
- Project Spine wiring across 6 key workflows (estimating, code-compliance, contracts, permits, daily-log, supply-ordering)
- Project ID preserved in URLs & stage nav
- Pre-fill from raw_input (location, sqft)
- Auth pill showing login + project save state
- AI summary banner travels across workflows

---

## John's Next 5-7 Gripes (Ranked by Adoption Risk)

### GRIPE-1 (ADOPTION-BLOCKER): "I filled out the scope once. Why can't the daily log guy see it?"

**Headline:** Crew can't access daily logs without logging in, and they don't have project context.

**Trigger:** John invites his lead framing guy (Mike) to submit a daily progress log. John sends him a link to `/killerapp/workflows/daily-log?project=uuid`. Mike clicks it, sees "Sign in to save your project" pill, then hits a login wall. Even after sign-in (if he signs in at all, which crew typically won't), there's no crew-specific light UI — Mike sees the same step-by-step workflow John sees, but it's too slow/complex for a foreman on a job site who just wants to snap a photo and say "framing done tomorrow."

**Why it kills adoption:** John's bookkeeper will ask "Can my crew use this instead of texting photos?" John tries it, crew bounces off the login wall, he tells the founder: "My guys aren't signing into software on job sites. They use email." Back to SMS + file dumps.

**Suggested fix:**
- Crew invite flow: instead of login, generate a **one-time crew access token** (stateless JWT, no password, 30-day expiry) scoped to that project + workflow only. Crew link is `/killerapp/crew?token=<jwt>` with no project param needed.
- Crew lightweight UI: on `/killerapp/crew` with an active token, show **only** the daily-log submit form: voice/text input, photo upload, submit. Strip away the workflow picker, stage landscape, nav chrome. Mobile-first design (big buttons, tap-to-speak).
- On submit, crew token logs the entry to `project_id` from the JWT, not from auth. John sees it in the project's daily log immediately (no approval required; crew is already trusted).
- **Files:** `src/app/crew/[...path]/page.tsx` (new), `src/lib/crew-token.ts` (verify JWT), `src/app/killerapp/workflows/daily-log/DailyLogClient.tsx` (seed from crew context).

---

### GRIPE-2 (ADOPTION-BLOCKER): "I need photos that stand up in court. Where's the proof they're real?"

**Headline:** Photo upload exists, but no timestamp/GPS/metadata proof — useless for the deposit dispute he lost.

**Trigger:** John uploads 3 framing inspection photos to the daily log to prove progress on day 7 (because lender asked for proof before releasing draw #2). Photos upload fine. But when John tries to export them as evidence (or show them to his lawyer), they're just JPEGs with no EXIF, no GPS coordinates, no "taken at 2026-05-06T14:32:00Z" metadata. His lawyer asks: "Can you prove when these were taken?" John realizes the app doesn't solve the $30k gap he lost the deposit on — back to SMS.

**Why it kills adoption:** Photo evidence was John's #1 reason to try BKG. Without tamper-proof metadata, the app is just a fancy photo album. He specifically said "I lost a 30k deposit on this exact gap" in his persona.

**Suggested fix:**
- `project_attachments` table (per fix-list Epic A) with columns: `gps jsonb, taken_at timestamptz, metadata jsonb` (EXIF preserved, not stripped).
- On upload, use browser `Geolocation API` to capture GPS coords + timestamp (ask permission once, cache for session).
- Gallery view shows each photo with a legal-evidence stamp: "Taken May 6, 2026 at 2:34 PM at 32.7157°N, 117.1611°W" + EXIF data card.
- Export to PDF includes metadata on every photo page (timestamp, GPS, hash for tamper-proof verification).
- Add a checkbox: "This photo is admissible evidence (certified by GPS/timestamp)" — appears on exports so John can hand to lawyer.
- **Files:** `src/app/api/v1/projects/attachments/route.ts`, `src/components/PhotoUploadWithMetadata.tsx`, `src/components/AttachmentGallery.tsx` (show metadata), `src/lib/geo-metadata.ts` (capture).

---

### GRIPE-3 (ADOPTION-BLOCKER): "My bookkeeper needs the budget stuff. How does she log in without messing up the project?"

**Headline:** No way to invite a bookkeeper to "budget tracking only" without giving her full project edit access.

**Trigger:** John's bookkeeper (Maria) asks: "Can I see the project cost forecast and compare it to actuals?" John tries to add her as a collaborator (shares the project link). Maria logs in, sees the full project, and accidentally clicks into the "Estimate the job" workflow. She types a new description, workflow autosaves it, now the project description changed from John's original scope. John doesn't notice until a week later when the cost parser is off. No role-based access control.

**Why it kills adoption:** John doesn't trust adding non-crew people to the app because they might break something. His bookkeeper stays in Excel. John keeps email as the SSOT (single source of truth). The app becomes John-only, not team-wide.

**Suggested fix:**
- Role-based invite: when adding a collaborator, pick a role: "Crew (submit logs only)" / "Bookkeeper (view budget, add expenses)" / "Co-owner (full edit)".
- Bookkeeper role: can see `project_context.estimated_cost_low/high`, can add/edit expense line items in a budget dashboard, can view draws + lien waivers. Cannot edit raw_input, cannot edit contracts, cannot edit the estimate.
- URL-based permissions: when Maria logs in with role="bookkeeper", `useProjectWorkflowState` doesn't offer "Estimate" as a peer-workflow link. The banner shows cost + status, but the "Move-to" nav skips estimating.
- **Files:** `src/lib/roles.ts` (define role schema), `src/app/api/v1/projects/collaborators/route.ts` (POST invite with role), `src/app/killerapp/ProjectContextBanner.tsx` (filter peer-nav by role).

---

### GRIPE-4 (POLISH): "The AI gave me a cost estimate. I want to mark up each line item without re-typing everything into Excel."

**Headline:** Cost estimate from AI is read-only; no way to edit line items or adjust for crew cost reality without copy-paste to Excel.

**Trigger:** AI estimate says "Framing labor: $8,400." John knows his framing crew runs $45/hour, not the market default the AI used. He wants to change that line to "$9,200" (more realistic for his crew). But the estimate card is a read-only AI response. John has to copy the entire estimate into Excel, hand-edit it, then paste the final cost back into the app's cost field. The app becomes a "first-pass sketch" tool; Excel is still the operational SSOT.

**Why it kills adoption:** For expert users like John (52, runs a business), read-only AI output is insulting — it signals the app doesn't trust his judgment. He'll keep Excel as the primary tool and use the app as a dump/verification step.

**Suggested fix:**
- Add "Edit estimate line items" button on the estimate card.
- Opens a modal with an editable table: {Description | Unit | Qty | Unit Cost | Total}. All fields are editable.
- On save, recalculate the estimate total and update `estimated_cost_low/high` in the project (as a user override, not AI).
- Add a "Compare to AI" link so John can see side-by-side: "AI said $8,400 labor, you set $9,200 (+9%)"
- **Files:** `src/app/killerapp/workflows/estimating/EstimateEditModal.tsx` (new), `useProjectWorkflowState.ts` (persist edits to `estimating_state`).

---

### GRIPE-5 (POLISH): "I don't know what to fill in next. The app just sits there."

**Headline:** No proactive guidance when John gets stuck on a step.

**Trigger:** John is filling out a "Change Order" step: "Enter the change description." He types "Client wants to upgrade flooring." The next step is "Select the cost impact category." John doesn't know what category the app expects. He scrolls, no tooltip, no example. He sits idle for 30 seconds. Closes the app and texts his contractor friend instead (who mentions a category name). John re-opens, fills it in. But the moment of friction cost adoption momentum.

**Why it kills adoption:** John is patient on day 1 (demo mode); on day 2 he's busy. If the app doesn't guide him, he reverts to phone/SMS. The barrier to re-engagement is high.

**Suggested fix:**
- Idle detection on empty steps: if a step is open for >5 seconds with no input, show a subtle nudge bubble (not modal, not intrusive). Example: "Change orders usually include cost + timeline impact. What's the scope change?" + a glossary link for "scope change" → tooltip.
- Add a glossary component (`TermTooltip`) for jargon like "cost impact category", "lifecycle stage", "holdback percentage". Tooltip appears on hover/tap.
- AI proactive assist: when a step payload is empty + 5s idle, fire an AI call to suggest the next step context ("Based on the framing being done, you probably need a drywall permit change order").
- **Files:** `src/components/StepCard.tsx` (add idle timer), `src/components/TermTooltip.tsx` (new), `src/lib/glossary.json` (terms + definitions), `src/app/api/v1/copilot/route.ts` (add idle-assist endpoint).

---

### GRIPE-6 (POLISH): "Why does the app forget my location every time I start a new project?"

**Headline:** Jurisdiction context doesn't default to last-used location; John re-selects San Diego on every project.

**Trigger:** John's first ADU was in San Diego (raw_input says "San Diego ADU"). When he clicks "Check the codes," the jurisdiction picker defaults to "IBC 2024 (International), US" instead of "San Diego, CA." He clicks the picker, scrolls, finds San Diego. On his second ADU (also San Diego), same story — the jurisdiction defaults back to generic. Small friction, but multiplied across 20 projects/year.

**Why it kills adoption:** Every papercut compounds. John's mental model is "the app should be faster than email." If he's resetting location every time, it's slower.

**Suggested fix:**
- On project creation, parse raw_input for location (already done in `parseLocationAndSqftFromRaw`). If found, set `project.jurisdiction` to the parsed location (e.g., "San Diego, CA").
- When a workflow loads with `?project=<id>`, seed the jurisdiction picker default from `project.jurisdiction` (already in `useProjectWorkflowState.project.jurisdiction`).
- When John switches projects (via the stage chips), pre-fill the jurisdiction picker in the new workflow from the new project's jurisdiction.
- **Files:** `src/lib/hooks/useProjectWorkflowState.ts` (already returns `project.jurisdiction`), `src/app/killerapp/workflows/code-compliance/CodeComplianceClient.tsx` (seed picker from `project?.jurisdiction`), `src/app/api/v1/copilot/route.ts` (parse location → set jurisdiction on project creation).

---

### GRIPE-7 (POLISH): "The contract template is great, but I can't email it to my client from the app."

**Headline:** Contract is generated, but no one-click "email to client" button. John has to download, open email, attach manually.

**Trigger:** John fills out the client agreement template. The app shows a preview. At the bottom, there's no "Email to client" button — only "Download PDF." John downloads it, opens Gmail, attaches it, types an email. Three minutes of manual work. On his 10th project, that's 30 minutes of time waste compared to a one-click send.

**Why it kills adoption:** Friction on the happy path (contract generation) stalls momentum. John wanted to try the app to reduce email overhead; if the app **creates** email overhead, it's worse than Excel.

**Suggested fix:**
- Add a "Send via email" button on the contract preview. Opens a modal: "To: [client email] (pre-filled from project context if available), Subject: [auto-draft], Body: [auto-draft]". John can edit, then click Send.
- Backend: use a transactional email service (SendGrid, Resend) to send the PDF as an attachment. Track in a `contract_sends` table so John can see "Contract sent to client on May 6, awaiting signature."
- Alternative: generate a secure shareable link (`/contracts/<token>`) that renders the PDF in browser + shows a "Sign digitally" button if client has DocuSign integration (future). Send that link instead of a PDF.
- **Files:** `src/app/killerapp/workflows/contract-templates/ContractPreview.tsx` (add "Send" button), `src/app/api/v1/contracts/send/route.ts` (new, email + tracking), `src/lib/email.ts` (SendGrid helper).

---

## Summary (≤80 words)

**Top 3 Adoption-Blockers:**
1. **ADOPTION-BLOCKER: Crew can't submit dailies without login** — team friction kills usage (Gripe 1).
2. **ADOPTION-BLOCKER: No tamper-proof photo metadata** — fails John's core need (deposit protection) (Gripe 2).
3. **ADOPTION-BLOCKER: No bookkeeper role** — Maria stays in Excel, app stays John-only (Gripe 3).

**Next 2 Polish items:** estimate line-item editing (Gripe 4), idle guidance + glossary (Gripe 5).

All 7 gripes stem from John moving from single-user demo (day 1) to team + lawyer + accountant reality (day 2).
