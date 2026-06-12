# Garden Engine — Dependency Graph & Coupling Map

*Source of truth for the CODE-2 extraction. Built from a full read of the BKG repo
at `origin/main` (commit `55a50bd`). Every classification below cites real files.*

This document answers one question: **what is garden-generic, what is builders-specific,
and which import edges currently break the boundary?** The extraction plan
(`00-EXTRACTION-PLAN.md`) sequences the work; the repo layout (`02-REPO-LAYOUT.md`)
shows where each piece lands.

---

## 1. The four layers (target state)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  L0  PLATFORM PRIMITIVES                                                   │
│      Supabase clients · auth (JWT/SSR) · MCP-agent auth · middleware ·     │
│      SemanticCache · QueryRouter · spine cores · theming machinery         │
│      → 100% generic. No domain knowledge.                                  │
├──────────────────────────────────────────────────────────────────────────┤
│  L1  GARDEN ENGINE                                                         │
│      knowledge-node schema (kg_entities / kg_assertions / jurisdictions) · │
│      verification pipeline (manual attest + auto-verify) · RAG retrieval · │
│      discovery surface (llms.txt / sitemap / OpenAPI / MCP / .mcpb) ·      │
│      app shells (killerapp ShellStrips/ShellNav, dream ramps+project) ·    │
│      WorkflowShell / WorkflowRenderer / StageShell                         │
│      → generic, but TODAY imports L3 directly (the edges to cut, §4).      │
├──────────────────────────────────────────────────────────────────────────┤
│  L2  GARDEN CONFIG CONTRACTS  (the seam — injected, not imported)          │
│      ThemeTokens · LifecycleDefinition[] · WorkflowRegistry ·              │
│      RoleModel + permission matrix · KnowledgeSource[] adapters ·          │
│      McpToolRegistry · OnboardingSeed · GARDEN_NS (namespace)              │
│      → defined by the engine, SUPPLIED by each garden.                     │
├──────────────────────────────────────────────────────────────────────────┤
│  L3  BUILDERS GARDEN  (one implementation of L2)                           │
│      7-stage lifecycle · jurisdictions + amendments · permits · CSLB ·     │
│      MEP load calc · contract/lien templates · 41 workflow Clients ·       │
│      30+ construction specialists · herbarium theme values                 │
│      → stays builders-specific. A new garden replaces this layer.          │
└──────────────────────────────────────────────────────────────────────────┘
```

**The whole extraction is about making L1 depend only on L2, never on L3.**
Today several L1 (and even L0-adjacent `design-system`) files reach straight into L3.

---

## 2. Module classification

### L0 / L1 — Garden-generic (lift into the engine)

| Area | Files | Verdict | Notes |
|---|---|---|---|
| Supabase clients | `src/lib/supabase.ts`, `supabase-browser.ts`, `supabase-server.ts` | **GENERIC** | `@supabase/ssr` cookie sessions, env-aware. No domain logic. |
| Auth (API) | `src/lib/auth-server.ts`, `src/lib/mcp-auth.ts` | **GENERIC** | Pure JWT validation; bcrypt agent keys + rate limit. |
| Auth (client) | `src/lib/auth.tsx` | **MIXED→GENERIC** | Tier gating (explorer/pro/team/enterprise) is domain-agnostic; tier *limits* become config. |
| Middleware | `src/middleware.ts` | **GENERIC** | Session refresh + lane-cookie hint. Lane *values* → config. |
| Org / tenancy schema | `supabase/migrations/20260522d_orgs.sql`, `rls_user_scoped.sql`, `20260531_rls_group_a_lockdown.sql` | **GENERIC** | `organizations` + `org_members` + RLS. No construction refs. |
| Knowledge schema | `kg_entities`, `kg_assertions`, `kg_jurisdictions`, `kg_entity_jurisdictions` (`src/types/database.ts`; `phase1a_schema.sql`, `20250405_phase2_strategy.sql`) | **GENERIC** | Domain-agnostic node + citation + jurisdiction model; `entity_type_id` is an FK, not an enum. |
| Citation/verify columns | `20260524_…manual_attestation.sql`, `20260525_…auto_verification.sql`, `20260522c_…embedding_hnsw.sql`, `20260523_hybrid_rerank_rpc.sql` | **GENERIC** | `manually_verified_*`, `auto_verified_*`, `last-verified` dates, HNSW + hybrid rerank — all domain-neutral. |
| Verification pipeline | `src/lib/auto-verify/cross-check.ts`, `auto-verify/persist.ts`, `src/app/admin/verify/page.tsx` | **GENERIC** | "Re-check a source, stamp a date/confidence, flag for human." Owner allowlist + `DEFAULT_SOURCE='upcodes-essentials'` → config. |
| RAG / retrieval | `src/lib/rag.ts`, `SemanticCache.ts`, `QueryRouter.ts` | **GENERIC** | FTS + pgvector + rerank; `extractCitations`. Only the `"Construction Copilot"` prompt string + entity-type filter need parameterizing. |
| Discovery machinery | `scripts/mcp-bridge.js`, `scripts/build-mcpb.mjs`, `src/app/api/docs/page.tsx`, `src/lib/capability-stats.ts`, `src/app/sitemap.ts` (entity loop) | **GENERIC** | stdio↔HTTP bridge, .mcpb packer, OpenAPI renderer, live capability counts, entity sitemap loop. |
| Theming machinery | `src/design-system/tokens/spacing.ts`, `tokens/index.ts`, `motion/tokens.ts`, `design-system/index.ts` | **GENERIC** | Spacing grid, radii, shadows, motion constants — no brand values. |
| App-shell skeleton | `src/components/app-shell/*` (ShellStrips, ShellNav, ShellConfigContext, types.ts), `src/app/killerapp/layout.tsx` | **GENERIC** | Chrome driven by `ShellConfig`. Reusable as-is once config is injected. |
| Stage/workflow render | `src/components/stage-shell/StageShell.tsx`, `design-system/components/WorkflowShell.tsx`, `WorkflowRenderer.tsx`, `StepCard.tsx` | **GENERIC** | Renders `workflow.steps` from JSON. Accepts accents/labels via props. |
| Dream project model | `src/app/dream-shared/ProjectContext.tsx`, `SaveLoadPanel.tsx`, `ProjectPicker.tsx`, `dream-shared/types.ts` | **GENERIC** | localStorage-backed project CRUD; no construction assumptions. |
| Spine cores | `src/lib/budget-spine.ts`, `crm-spine.ts` | **HAS-GENERIC-CORE** | Write-once spine pattern + status machine are generic; the *category/phase enums* and `bkg:` JSON-LD are builders config. |
| Compliance core | `src/lib/compliance-lookup.ts` | **HAS-GENERIC-CORE** | `matchJurisdictions()`, `collectWithAncestors()`, `scoreRelevance()` are generic; the jurisdiction registry + seeded codes are builders data. |

### L3 — Builders-specific (stays in the builders garden)

| Area | Files | Verdict |
|---|---|---|
| 7-stage lifecycle | `src/lib/lifecycle-stages.ts`, `stage-prompts.ts`, `stage-welcome-copy.ts`, `stage-from-pathname.ts` | **SPECIFIC** — names ("Size Up → Reflect"), order, 27 workflow buckets. |
| Building types / jurisdictions data | `src/lib/knowledge-data.ts`, `data/amendments/*.json`, the `jurisdictions` rows | **SPECIFIC** — sfr/datacenter/hospital, CA/NV codes, CSI materials. |
| Code-source adapters | `src/lib/code-sources/*` (icc, nfpa, upcodes, bkg-seed, types, index) | **SPECIFIC** — ICC/NFPA/UpCodes APIs, disciplines, confidence tiers. |
| Compliance/CSLB | `src/lib/cslb-scraper.ts`, `api/v1/cslb-lookup`, `api/v1/compliance/*` | **SPECIFIC** — California contractor license scraper. |
| MEP load calc | `src/lib/mep-load-calc.ts`, `mep-calc-router.ts`, `api/v1/load-calc` | **SPECIFIC** — NEC 220 / UPC 422 / panel schedule math. |
| Contracts | `src/lib/contract-templates.ts`, `.server.ts`, `contract-templates/*.md` | **SPECIFIC** — CA HIC §7159, lien waivers §8132–8138. |
| Specialists | `src/lib/specialists.ts`, `specialists.client.ts`, `src/lib/specialists/{size-up,lock,plan,build}.ts` | **SPECIFIC** — 30+ construction specialists, discipline inference, R-3 gate. |
| Workflow Clients | `src/app/killerapp/workflows/*` (41 dirs, 41 `*Client.tsx`) | **SPECIFIC** — hand-coded UX per workflow. |
| Stage pages | `src/app/killerapp/stages/*` (7) | **SPECIFIC** — per-stage construction pages. |
| Onboarding | `src/app/onboarding/page.tsx`, `api/v1/onboard-new-user` | **SPECIFIC** — TRADES, GOALS, CSI starter budget, `single_family`. |
| Theme values | `src/styles/tokens.css`, `src/app/globals.css`, `src/lib/brand-tokens.ts`, `components/brand/*`, `design-system/tokens/{colors,typography,stage-accents}.ts` | **SPECIFIC (values)** — herbarium palette, Archivo, BKG seal paths, stage-accent hexes. |
| Lane / permission data | `20260528_lanes_lens_permission_matrix.sql`, `src/lib/workflow-roles.ts`, `use-user-lane.ts` (enums), `lane-server.ts` (enums) | **SPECIFIC (values)** — GC/sub/owner/DIY roles, 11 construction data categories. |

> **Dead weight to drop on extraction:** `@clerk/nextjs` is in `package.json` but has **0 usages** in `src/` (auth is 100% Supabase). `src/lib/brand-tokens.ts` is a second, mostly-unused token vocabulary (parchment/copper/steel) that competes with `tokens.css` — consolidate or delete. Root-level `push-*.sh`, `batch*.mjs`, `count.js`, `knowledge-gardens-descent.html`, `john walkthrough May 28 files/` are demo/one-off cruft, not engine.

---

## 3. The hot coupling node: `lifecycle-stages.ts`

`src/lib/lifecycle-stages.ts` (L3) is imported by **20 files**, including four
`design-system` components that are supposed to be the generic shell. These are
**value imports** (`LIFECYCLE_STAGES`, `STAGE_WORKFLOWS`, `WORKFLOW_TO_STAGE`),
not type-only — so they hard-bind the generic layer to the 7 construction stages.

```
                          src/lib/lifecycle-stages.ts   (L3 — 7 construction stages)
                                       ▲
        ┌──────────────┬──────────────┼───────────────┬───────────────────┐
        │              │              │               │                   │
 design-system/   design-system/  components/     components/         app/killerapp/
 StageBreadcrumb  NextWorkflowCard cockpit/*(3)    GlobalJourney…      page.tsx, projects…
 StageContextPill NavigatorMiniStrip stage-shell/  StageWelcomeMount
   (L1 generic!)    (L1 generic!)   JourneyRow      IntegratedNavigator
```

**Fix (one pattern, applied everywhere):** invert the dependency. The engine
defines a `LifecycleProvider` / `useLifecycle()` context carrying a
`LifecycleDefinition[]`; these components read stages from context/props instead
of importing the construction array. BKG supplies the array at the app root.
`WorkflowRenderer.types.ts:32` already does this manually ("we duplicate the shape…
let specialists.client.ts bridge") — generalize that instinct.

---

## 4. Coupling edges to cut (the actionable list)

Each row is a generic file that currently imports a builders module. Cutting all
of these is the precondition for physically moving L1 into a package.

| # | Generic file (L0/L1) | imports | Builders module (L3) | Cut by |
|---|---|---|---|---|
| 1 | `design-system/components/StageBreadcrumb.tsx` | `LIFECYCLE_STAGES` | `lib/lifecycle-stages` | `useLifecycle()` context |
| 2 | `design-system/components/StageContextPill.tsx` | `LIFECYCLE_STAGES` | `lib/lifecycle-stages` | `useLifecycle()` context |
| 3 | `design-system/components/NextWorkflowCard.tsx` | `LIFECYCLE_STAGES, STAGE_WORKFLOWS, WORKFLOW_TO_STAGE` | `lib/lifecycle-stages` | props from registry |
| 4 | `design-system/components/NavigatorMiniStrip.tsx` | `STAGE_WORKFLOWS` | `lib/lifecycle-stages` | props from registry |
| 5 | `design-system/components/AnalysisPane.tsx` | `runSpecialist`, `SpecialistContext` | `lib/specialists.client`, `lib/specialists` | `SpecialistRunner` injected via context |
| 6 | `components/stage-shell/JourneyRow.tsx` | `LIFECYCLE_STAGES` | `lib/lifecycle-stages` | `useLifecycle()` |
| 7 | `components/cockpit/{ProjectCockpit,JourneyTimeline,JourneyArc}.tsx` | `LIFECYCLE_STAGES`, `STAGE_WORKFLOWS`, `shouldSurfaceMepCalcs` | `lib/lifecycle-stages`, `lib/mep-calc-router` | `useLifecycle()`; MEP hint behind feature flag |
| 8 | `components/GlobalJourneyMapHeader.tsx` | `LIFECYCLE_STAGES`, `ROUTE_TO_WORKFLOW_ID`, `stageIdForPath` | `lib/lifecycle-stages`, `lib/stage-from-pathname` | `useLifecycle()` + registry route map |
| 9 | `components/IntegratedNavigator.tsx`, `StageWelcomeMount.tsx` | `STAGE_WORKFLOWS`, `STAGE_WELCOME` | `lifecycle-stages`, `stage-welcome-copy` | injected config |
| 10 | `design-system/components/StageWelcome.tsx` | `STAGE_WELCOME` | `lib/stage-welcome-copy` | props |
| 11 | `app/api/v1/mcp/route.ts` | building types, `estimateCost`, permits | `lib/knowledge-data`, builders tools | tool registry adapter (L2) |
| 12 | `app/sitemap.ts` (static pages block) | hardcoded `/dream/*`, `/pricing` routes | — | garden route manifest |
| 13 | `design-system/components/SourceCountBadge.tsx` | *(comment-only ref today)* | `lib/code-sources` | already soft; keep prop-driven |

> Edges 1–4, 6–10 are all the **same fix** (`useLifecycle()` context). Do that one
> refactor and ~11 of 13 edges fall at once. Edge 5 (specialist runner injection)
> and edge 11 (MCP tool registry) are the two genuinely separate pieces of work.

---

## 5. Database extraction note

There is no `garden_id` discriminator today — the schema is single-garden. Two
options, decided per deployment model (see plan §Decisions):

- **Repo-per-garden / DB-per-garden (recommended for "scaffold in days"):** no schema
  change needed. Each garden gets its own Supabase project; the generic migrations
  (`orgs`, `kg_*`, verification, RLS) are the shared baseline, builders-specific
  migrations (`lanes`, `cslb_cache`, `crm_*`, demo seeds) ship in the builders garden.
- **Shared-DB multi-garden:** add `garden_id` to `organizations`,
  `command_center_projects`, `kg_entities`, and `AND garden_id = …` into every RLS
  policy; remove the hardcoded demo-project UUIDs in `20260522_secauth_rls_lockdown.sql:93`.
  Heavier and riskier; only if gardens must co-tenant one database.

The BKG demo already co-hosts on a shared Supabase project (`knowledge-gardens-prod`),
so the generic-vs-builders **migration split** matters regardless of which option.
