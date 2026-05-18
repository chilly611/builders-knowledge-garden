# B1: Project Context Spine
**Spec date:** 2026-05-18 | **Lane C executor:** C1 | **Blocks:** C2-C8

## The contract
ONE source of truth for "active project." Behavior: URL `?project=<uuid>` wins; if absent, localStorage key `bkg-active-project` rescues; if absent, project is `null`. A React Context broadcasts the cached project to every child. `setActiveProject(id)` updates URL + localStorage + context atomically and fires a custom event so other tabs/components hear it. Workflow autosave (`<workflow>_state` JSONB PATCHes) stays with `useProjectWorkflowState` / `useProjectStateBlob` — the spine does NOT own per-workflow state; it owns project IDENTITY only. Existing workflow hooks coexist; both read same URL+localStorage → identity cannot disagree.

## API shape
```typescript
const { project, projectId, loading, error, setActiveProject, clearActiveProject } = useProject();
```

| Field | Type | When it fires |
|---|---|---|
| `project` | `ProjectContext \| null` | Populated after first GET resolves |
| `projectId` | `string \| null` | Synchronous; reflects URL/localStorage on first paint |
| `loading` | `boolean` | true while initial GET in flight |
| `error` | `string \| null` | Set on 404/network failure |
| `setActiveProject` | `(id: string) => void` | Optimistic: updates projectId sync, pushes ?project=, writes localStorage, fires bkg:project:changed, then re-fetches |
| `clearActiveProject` | `() => void` | Removes ?project=, deletes localStorage, sets state to null |

## Files
- **CREATE** `src/contexts/ProjectContext.tsx` (~120 lines)
- **CREATE** `src/lib/hooks/useProject.ts` (~20 lines) — re-export useContext(ProjectContext) with null-guard
- **MODIFY** `src/app/killerapp/layout.tsx` — wrap children in <ProjectProvider> inside NavigatorProvider
- **REFACTOR** `src/app/killerapp/KillerappProjectShell.tsx` — consume useProject(); drop local fetch + localStorage write
- **LATER (C2-C8):** All 27 workflow client files — replace `useProjectWorkflowState`'s `project`/`projectId` field reads with `useProject()` PROGRESSIVELY. Don't touch `recordStepEvent`/`setState` — those stay on workflow hooks.

## Behavior contract
1. **Mount:** read `?project=` via `useSearchParams`. Fallback to `localStorage['bkg-active-project']` (UUID-validate or accept `demo-*` prefix).
2. **Hydrate:** if projectId set, fetch `/api/v1/projects?id=<id>` via authedFetch.
3. **Broadcast:** useProject() returns cached project + setter to every consumer.
4. **URL:** setActiveProject(id) → `router.replace(\`${pathname}?project=${id}\`)` preserving other params.
5. **localStorage:** every setActiveProject writes; clearActiveProject removes.
6. **Cross-tab:** listen to StorageEvent for `bkg-active-project` key AND custom event `bkg:project:changed` for same-tab.
7. **Optimistic:** projectId updates sync; GET async; on 404 error stays, projectId stays.
8. **Debug hook:** assign `window.__bkg_project__ = project` for MCP/agent introspection.

## Acceptance criteria
- [ ] Visit `/killerapp?project=<uuid>` → project hydrates within 1s
- [ ] Refresh page → project persists from localStorage
- [ ] Second tab on /killerapp/projects switches projects → first tab URL updates within 2s
- [ ] Click into workflow → useProject() returns same project; useProjectWorkflowState() also works
- [ ] Anonymous user → context project null; no redirect loop
- [ ] `npm run build` green; no rules-of-hooks violations

## Risks
1. Parallel migration breaks workflows: mitigated by identity-only spine; both hooks read same URL+localStorage
2. useSearchParams Suspense: Provider lives in /killerapp/layout.tsx which already manages this
3. Cross-tab storage event timing: storage events fire ONLY in OTHER tabs — must also dispatch custom event for same-tab
