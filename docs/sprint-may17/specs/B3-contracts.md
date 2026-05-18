# B3: Contract Templates demo
**Lane C executor:** C3 | **Depends on:** C1 spine | **All 6 .md bodies exist (verified)**

## 90-second demo flow
1. ProjectContextBanner shows "Modern farmhouse in Marin · California"
2. Amber DRAFT disclaimer block visible
3. GC clicks **Client Agreement** card
4. 13 fields render; 4 pre-fill from spine (projectName, projectAddress, clientName, jurisdiction hint)
5. GC types contractorName, contractAmount, clicks a **payment-terms preset chip** (Net 30 / 10/40/40/10 / 50% up front)
6. Click "Get your draft (PDF)" → jsPDF generates with DRAFT watermark on every page

## Field autofill from spine
On mount, seed `contractsState.fields` from `project` if field is EMPTY (never overwrite user edits):
- `project.name` → `projectName`
- `project.client_name` (add to ProjectContext if missing) → `clientName`
- `project.name` → `projectAddress` (best-effort)
- `project.jurisdiction` → injected into paymentTerms placeholder hint (CA: "California: 10% / $1,000 deposit cap")

## Payment-terms preset chips
3 chips above existing textarea:
- **Net 30** → "Net 30. Contractor invoices monthly; Client pays within 30 days of invoice date."
- **10/40/40/10** → "10% on signing, 40% at rough-in, 40% at substantial completion, 10% on punch-list sign-off."
- **50% up front** → "50% on signing, 50% on substantial completion." + CA deposit cap warning if jurisdiction=CA

Click overwrites textarea; user can edit after.

## DRAFT disclaimer
- Existing `<DraftDisclaimer>` stays as FIRST content block (don't collapse)
- Add micro-disclaimer under generate button: "Send to your attorney before signing."
- PDF: confirm first-page footer = amber DRAFT line (already true)

## Files to touch
- `src/app/killerapp/workflows/contract-templates/ContractTemplatesClient.tsx` — spine autofill effect + payment-preset chip row + micro-disclaimer
- `src/lib/contract-templates.ts` — export PAYMENT_PRESETS const

## Acceptance criteria
- Clicking chip replaces paymentTerms textarea; autosave ticks
- Selecting Client Agreement on project with name/jurisdiction populates fields on first render
- PDF download includes DRAFT watermark on every page + amber footer + filename `client-agreement-draft-<yyyymmdd>.pdf`
- All 13 fields render in PDF (filled or `[Bracketed]`) — zero unresolved `{{varname}}`
