# Garden Engine — Extraction Plan

*CODE-2 · Separate the reusable "garden engine" from the builders-specific modules
so a new garden (killer app + dream machine) can be scaffolded in days and themed
by tokens — with **zero regression risk to the live BKG demo.***

Read alongside `01-DEPENDENCY-GRAPH.md` (what's generic vs specific + the edges to
cut) and `02-REPO-LAYOUT.md` (where everything lands + the config contracts).

---

## The thesis in one paragraph

BKG is already ~70% a generic knowledge-garden platform wearing a construction
costume. The knowledge-node schema, citation + last-verified verification pipeline,
auth/multi-tenant model, design-token machinery, the llms.txt/sitemap/MCP discovery
surface, and the killer-app/dream shells are all domain-neutral. What's
construction-specific is **data and content poured into those generic frames**: the
7-stage lifecycle, jurisdictions/permits/CSLB, MEP math, contract templates, 41
workflow screens, and the herbarium theme values. The blocker to reuse is not that
these are tangled in logic — it's that a handful of *generic* files **import the
construction modules directly** instead of receiving them as configuration. Cut
those import edges (mostly one `useLifecycle()` refactor) and the engine lifts out
cleanly.

---

## Guiding principles

1. **Refactor in place first, extract last.** Introduce every config-injection seam
   *inside the live BKG repo* and prove BKG still works before any code physically
   moves to a package. This is a strangler-fig migration, not a big-bang fork.
2. **Invert dependencies, don't copy.** The generic layer must never `import` from
   the builders layer. It receives `LifecycleDefinition[]`, a `WorkflowRegistry`, a
   `SpecialistRunner`, theme tokens, etc. via context/props.
3. **Tokens are the theming API.** A new garden re-themes by supplying a
   `ThemeTokens` object + brand assets — never by editing engine CSS. This means
   fixing the `globals.css` cascade so it stops clobbering `tokens.css`.
4. **Data-driven where it already is; honest where it isn't.** Workflow *metadata*
   is data (`workflows.json`, 244 step entries). Workflow *UI* is 41 hand-coded
   `*Client.tsx` files — a new garden still authors its own screens. Don't pretend
   that's free (see Risks).
5. **Zero shared-prod mutation.** No live env, domain, brand-asset, or DB changes
   without the founder. Migrations are split on paper first; nothing re-runs against
   `knowledge-gardens-prod` as part of this work.

---

## Decisions to confirm before Phase 4 (founder-gated)

These don't block Phases 0–3 (all in-repo, reversible). Surface early; decide before
physical extraction.

- **Packaging model.** Recommended: **npm/pnpm workspace monorepo** — `packages/garden-engine`
  + `gardens/builders` (BKG) + `gardens/<new>`. Alternative: publish `@knowledge-gardens/engine`
  to a private registry and consume from separate repos. Monorepo keeps BKG and the
  engine in lockstep during the volatile early period; registry is better once the
  engine API stabilizes. **Lean monorepo.**
- **Database model.** DB-per-garden (no schema change, simplest, recommended for
  "days to scaffold") vs shared-DB with a `garden_id` discriminator (heavier; needed
  only if gardens co-tenant one Supabase project). See `01-DEPENDENCY-GRAPH.md §5`.
- **Workflow UI strategy for new gardens.** Accept 41 hand-coded screens as the model
  (engine ships ~6 generic step types via `WorkflowRenderer`; gardens compose them),
  OR invest in a richer declarative workflow schema so simple workflows need no
  `Client.tsx`. The first ships now; the second is a follow-on engine investment.

---

## Phased plan

Effort is rough order-of-magnitude for one focused engineer-stream. Each phase ends
green: `next build` + `tsc` clean, vitest unchanged from baseline, and the BKG
shipping-gate loop verified in a real browser (sign in → open project → run workflow
→ save → leave → return → resume).

### Phase 0 — Baseline & guardrails  *(~0.5 day)*
- Tag the current green state; capture `next build`, `tsc --noEmit`, `vitest run`,
  and the e2e suite output as the **regression baseline** (the ~10 known env-only
  vitest failures are pre-existing — record them so they aren't mistaken for damage).
- Add an **architecture lint**: an ESLint `no-restricted-imports` rule (or a tiny
  dependency-cruiser config) forbidding `design-system/**` and `components/app-shell/**`
  from importing `@/lib/lifecycle-stages`, `@/lib/specialists`, `@/lib/code-sources`,
  `@/lib/knowledge-data`. It will fail loudly today — that's the worklist for Phase 2,
  and the ratchet that keeps the boundary clean forever after.

### Phase 1 — Define the config contracts  *(~1 day, additive, no behavior change)*
Create the L2 seam as TypeScript interfaces in a new `src/garden/contracts/` folder
(moves to `packages/garden-engine` later). No consumer changes yet — just the types
+ the BKG implementations that re-export today's hardcoded values.
- `ThemeTokens`, `LifecycleDefinition[]`, `WorkflowRegistry`, `RoleModel` +
  permission matrix, `KnowledgeSource` adapter, `McpToolRegistry`, `OnboardingSeed`,
  `GARDEN_NS`. (Full shapes in `02-REPO-LAYOUT.md`.)
- Implement `gardenConfig.builders` that satisfies every contract by re-exporting the
  existing `lifecycle-stages`, `workflow-roles`, `code-sources`, etc. **Net behavior:
  identical.** This is the adapter that lets Phase 2 flip consumers one at a time.

### Phase 2 — Invert the coupling edges  *(~2–3 days, the core of the work)*
Flip each generic consumer from importing builders modules to reading injected config.
Drive the list straight from the Phase 0 lint failures and `01-DEPENDENCY-GRAPH.md §4`.
- **Lifecycle context (kills ~11 of 13 edges):** add `LifecycleProvider` +
  `useLifecycle()` to the engine; mount it at `app/killerapp/layout.tsx` with
  `gardenConfig.builders.lifecycle`. Convert `StageBreadcrumb`, `StageContextPill`,
  `NextWorkflowCard`, `NavigatorMiniStrip`, `JourneyRow`, the three `cockpit/*`,
  `GlobalJourneyMapHeader`, `IntegratedNavigator`, `StageWelcomeMount`, `StageWelcome`
  to consume it. Delete the direct imports.
- **Specialist runner injection (edge 5):** `AnalysisPane` receives a
  `SpecialistRunner` via context instead of importing `specialists.client`.
- **MCP tool registry (edge 11):** extract the single source of truth
  `src/garden/mcp-tools.ts`; `api/v1/mcp/route.ts`, `app/mcp/page.tsx`, and a new
  dynamic `llms.txt` route all read from it (fixes the documented 12-vs-18 tool drift).
- Fix the **theme cascade**: make `globals.css` reference `var(--…)` from `tokens.css`
  instead of re-declaring `--bg/--fg/--accent` as raw hex. After this, swapping the
  `ThemeTokens` object actually re-themes the app.
- After each sub-step: build + browser-verify BKG. The lint rule goes green edge by edge.

### Phase 3 — Make the discovery surface data-driven  *(~1 day)*
- Convert `public/llms.txt` and `public/robots.txt` to dynamic route handlers that
  template from `capability-stats` + the MCP tool registry + the garden route manifest
  (so a new garden auto-emits correct `llms.txt`/sitemap/OpenAPI with live counts).
- Parameterize `mcp-bridge/manifest.json` `BKG_API_URL`, `/install-mcp` and `/mcp`
  copy, and the OG/favicon/title metadata in `app/layout.tsx` from garden config.

### Phase 4 — Physical extraction to the monorepo  *(~2–3 days)*
Only now does code move. The seams are clean, so this is mechanical.
- Stand up the workspace; move L0/L1 files into `packages/garden-engine` per
  `02-REPO-LAYOUT.md`; move L3 into `gardens/builders`. BKG imports the engine.
- Split `supabase/migrations` into engine-baseline vs builders migrations.
- Drop dead weight: remove `@clerk/nextjs`, reconcile/delete `lib/brand-tokens.ts`,
  move root `push-*.sh`/`batch*.mjs`/demo HTML out of the engine.
- Re-run the full baseline; browser-verify the BKG shipping gate. **BKG behavior must
  be byte-for-byte equivalent** — extraction is a move, not a rewrite.

### Phase 5 — Prove it: scaffold a second garden  *(~2–3 days, the acceptance test)*
- `create-garden <name>` (or a documented copy of `gardens/_template`): supply a
  `ThemeTokens` object, a `LifecycleDefinition[]`, an empty/seed `WorkflowRegistry`,
  and brand assets. Wire one Supabase project.
- Success = the new garden boots with its own theme, knowledge browser, verification
  UI, working killer-app shell, dream ramps, and auto-generated llms.txt/MCP — **with
  no engine edits.** The remaining work for a real garden is authoring its workflow
  Clients and seeding its knowledge corpus. That's the honest "days, not the framework"
  line.

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| A coupling-edge flip silently changes BKG rendering | Med | One edge per commit; browser-verify the shipping gate each time; the lint rule prevents regressions creeping back. |
| 41 hand-coded workflow Clients read as "free to clone" | High (expectation) | State plainly: engine gives shells + ~6 step types; gardens author their own screens. Phase 5 measures the real cost. |
| Theme cascade fix breaks existing BKG surfaces | Med | The `globals.css`→`tokens.css` change is visual; snapshot key pages (home, killerapp, knowledge, dream) before/after with the preview tools. |
| Migration split diverges from live prod schema | Med | Split is documentation-only in Phase 4; reconcile against the live `knowledge-gardens-prod` schema before any garden re-runs migrations. Never re-run against prod. |
| Shared-DB `garden_id` retrofit underestimated | Low (if DB-per-garden chosen) | Default to DB-per-garden; only take the `garden_id` path if co-tenancy is a hard requirement. |
| `@clerk` removal touches a hidden code path | Low | Confirmed 0 usages in `src/`; remove in Phase 4 with a build check. |

---

## Why this is zero-regression for the live demo

- The deliverable branch (`docs/garden-engine-extraction`) is cut from `origin/main`
  and contains **only docs** right now — it cannot affect prod.
- Phases 0–3 are in-repo, additive, and behavior-preserving; BKG ships from `main`
  throughout and each step is browser-verified against the shipping gate.
- Physical extraction (Phase 4) is a file *move* behind clean seams, validated against
  a recorded baseline — BKG’s runtime behavior is unchanged.
- Nothing in this plan mutates the live domain, env vars, brand assets, or the prod
  database. All such steps are explicitly founder-gated.
