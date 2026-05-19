# A4 — Contract Templates Audit

## Executive summary

All six templates are **defined and registered** in `contract-templates.ts`. PDF generation infrastructure is complete. **Note:** the auditor flagged "the six .md body files are missing" but they DO exist on disk — directory listing of `app/src/lib/contract-templates/` shows all 6 `.md` files plus a `_shared/` directory. The auditor likely hit a Glob/Read permission path. Production load path is intact.

## Findings

### Template registry: all 6 present ✓

`TEMPLATE_META` (lines 147-351 of `contract-templates.ts`) defines all six templates with complete field definitions.

| Template id | Name | Body file | Required fields | Generates PDF | Legal review |
|---|---|---|---|---|---|
| client-agreement | Client Agreement | `client-agreement.md` ✓ | 13 | YES | NOT REVIEWED |
| sub-agreement | Subcontractor Agreement | `sub-agreement.md` ✓ | 15 | YES | NOT REVIEWED |
| lien-waiver-conditional | Lien Waiver — Conditional | `lien-waiver-conditional.md` ✓ | 5 | YES | NOT REVIEWED |
| lien-waiver-unconditional | Lien Waiver — Unconditional | `lien-waiver-unconditional.md` ✓ | 4 | YES | NOT REVIEWED |
| nda | Mutual NDA | `nda.md` ✓ | 7 | YES | NOT REVIEWED |
| change-order | Change Order | `change-order.md` ✓ | 16 | YES | NOT REVIEWED |

### PDF generation: complete ✓

`contract-pdf.ts` implements full jsPDF rendering with:
- DRAFT watermark enforced: 35° diagonal "DRAFT" stamp at 18% opacity (line 420-424)
- Attorney-review disclaimer enforced: footer "DRAFT — not reviewed by an attorney" in amber on every page (lines 471-477)
- Default `draft: true` baked in at line 195 of `ContractTemplatesClient.tsx`
- No UI path to flip `draft` off (intentional — see page.tsx:16-18 comment)

### Field registry consistency ✓

Uses centralized field definitions (`FIELD_PROJECT_NAME`, `FIELD_CONTRACT_AMOUNT`, etc.). Common fields:
- `projectName` (text) — client-agreement, sub-agreement, change-order
- `contractAmount` (currency) — all six templates
- `scopeOfWork` (textarea) — client-agreement, sub-agreement, nda

No conflicting type definitions across templates.

### Autofill effect (shipped commit `ebdb85b` 2026-05-18) ✓

`ContractTemplatesClient.tsx:107-132` correctly seeds three fields from `project`:
- `seed('projectName', project.name)` — matches registry ✓
- `seed('contractAmount', '$...')` from midpoint of `estimated_cost_low/high` — matches registry ✓
- `seed('scopeOfWork', project.ai_summary ?? project.raw_input)` — matches registry ✓

Guarded by `didAutofill` (line 106), never clobbers user input.

### Legal review status: BLOCKED ✗

Per `tasks.todo.md:172-176`:
```
### Legal prerequisites (MUST complete before first paid Contract Templates use)
- [ ] Construction attorney reviews all six templates
- [ ] Output framed as "starting draft for attorney review," NOT "ready-to-sign"
- [ ] Terms of service includes real liability limitation reviewed by the same attorney
```

Currently unchecked. Workflow ships DRAFT-only by design.

## Recommendation for demo

Safe to show with a live project in context. Three demo projects are now seeded:
- `Modern farmhouse in Marin` (55730cd3-…) — projectName="Modern farmhouse in Marin", contractAmount=$905,000
- `ADU in Sausalito` (aa11b22c-…) — projectName="ADU in Sausalito", contractAmount=$250,000
- `Commercial TI in SoMa` (bb22c33d-…) — projectName="Commercial TI in SoMa", contractAmount=$1,125,000

Pick template → autofill paints → fill missing fields → preview shows DRAFT watermark and attorney disclaimer. **Do not** attempt to download a real PDF as part of the live demo — pre-generate one if needed.
