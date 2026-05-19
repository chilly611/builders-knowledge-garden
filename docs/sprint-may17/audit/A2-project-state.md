# A2 — Project State Persistence Audit

## Summary

The BKG codebase has **TWO competing project state systems** that partially overlap but don't fully coordinate:
- `ProjectContext` (Lane C1, manages project identity + cross-tab sync)
- `useProjectWorkflowState` (per-workflow JSONB state)

The former is wired into `/killerapp` + helpers; the latter requires `?project=` to hydrate. **Critical gaps exist**: many workflow surfaces and admin pages don't read selected-project state at all, and cross-surface project identity is fragile due to localStorage-only fallback.

## Audit table

| Workflow surface | Claimed state | Actual state | Files to change |
|---|---|---|---|
| `/killerapp` (workflow picker) | One-page nav with active project context persistent across routes | PARTIAL: `AuthAndProjectIndicator` reads `?project=` correctly; `KillerappProjectShell` hydrates + displays project; workflow links append `?project=<id>` when active. localStorage key set on hydrate. | ✓ Working as designed |
| Workflow pages (q2, q5, q4 etc.) | Each workflow auto-rescues project context from URL or localStorage, shows project metadata | PARTIAL: `useProjectWorkflowState` reads `?project=` and falls back to localStorage (`bkg-active-project`). Hydration fires only if `projectId` truthy; the fallback redirect to `/killerapp?toast=needs-project` bounces the user instead of rescuing. Pre-fill from `raw_input` works. | `app/src/lib/hooks/useProjectWorkflowState.ts` — log fallback rescue rate; tag LSK writes |
| Project detail `/killerapp/projects/[id]` | Shows full project record with all workflow-state columns | ASSUMED: pattern suggests it uses `useProject` + renders saved workflow states, but file not directly audited | `app/src/app/killerapp/projects/[id]/page.tsx` — verify route-param read, not query |
| `/dashboard` | Renders projects list, action items, activity feed — all project-aware | **NO:** hardcoded demo data. No project hook. Links to `/dream-oracle`, `/dream-imagine` don't pass `?project=`. | `app/src/app/dashboard/page.tsx` — wire `useProject`, pass project ID to Dream links |
| `/marketplace`, `/clients`, `/field` | Vendor browse, CRM, field ops — scoped to active project | **NO:** marketplace lists generic vendors. Clients page is a Q3 stub. Field Ops renders generic component, no project awareness. | All three — require `useProject` + project-scoped data fetches |
| `/launch` (project wizard) | AI-guided 4-mission onboarding that **creates** and names a project, lands on dashboard | **NO:** Standalone page, no state integration. Creates data in memory only. "Save Project" button is a **no-op** — never calls POST /api/v1/projects. | `app/src/app/launch/page.tsx` — integrate ProjectProvider; call POST /api/v1/projects on final button; set active project |
| `/dream/*` interfaces (oracle, design, imagine) | Load/save dreams tied to active project; project-scoped gallery | PARTIAL: `dream/design/page.tsx` has its own `ProjectContext` (different file from the spine). Reads `currentProject` but isolated to subtree. Dream projects don't appear in `/killerapp` picker. | `dream-shared/ProjectContext.tsx` vs `contexts/ProjectContext.tsx` — pick one source of truth |
| `/inspections` | Inspection records + checkpoints scoped to active project | **NO:** passes hardcoded `projectId="default"`. No query param or context hook. | `app/src/app/inspections/page.tsx` — wire `useProject()`, pass `project?.id` |

## Critical findings

1. **localStorage is the only fallback.** If `?project=` is dropped (browser back/forward, address-bar typo), the app relies on `bkg-active-project` being valid. If localStorage clears, the user bounces to `/killerapp` without graceful recovery.
2. **Dream uses a separate Context.** `/dream` subtree has its own `ProjectContext`. Projects saved in Dream don't surface in the workflow picker.
3. **`/launch` doesn't persist.** It's a 4-step onboarding that generates a project in memory but never writes to Supabase. The "Save Project" button at the end is a no-op.
4. **Hardcoded demo project IDs.** `/launch` uses `projectId="project-1"` for budget/RFI/punch-list demos. `/inspections` uses `"default"`. Neither reflects the active project.
5. **Admin/non-workflow surfaces are stateless.** `/dashboard`, `/marketplace`, `/field`, `/clients` don't read project context at all.

## Investor demo risk (Wed May 20)

- ✓ Core spine works for `/killerapp` → workflow → workflow (happy path).
- ✗ Clicking from `/dashboard` to a workflow loses context (dashboard doesn't know about `/killerapp?project=`).
- ✗ Closing Dream Studio and returning to workflows may show stale project context (separate tree).
- ✗ `/launch` is a front-end prototype only — it does not actually create a project in Supabase.
- ✗ "Active project indicator" in top-right shows saved state, but many surfaces don't act on it.

**Recommendation:** For demo, stick to the `/killerapp` → workflow → workflow path. **Avoid `/dashboard`, `/launch`, and `/dream` interfaces** in the live flow to sidestep these gaps. Post-demo, prioritize wiring dashboard and consolidating dream context before public beta.
