# Garden Engine — Recommended Repo Layout & Config Contracts

*Where every piece lands after extraction, the contracts a new garden must satisfy,
and the "scaffold a garden in days" workflow. Pairs with `00-EXTRACTION-PLAN.md`
(sequencing) and `01-DEPENDENCY-GRAPH.md` (generic vs specific).*

---

## 1. Target: a workspace monorepo

```
knowledge-gardens/                      # repo root (pnpm/npm workspaces)
├─ package.json                         # workspaces: ["packages/*", "gardens/*"]
├─ pnpm-workspace.yaml
│
├─ packages/
│  ├─ garden-engine/                    # L0+L1 — the reusable platform
│  │  ├─ package.json                   #   name: @knowledge-gardens/engine
│  │  ├─ src/
│  │  │  ├─ contracts/                  # ← L2: the config interfaces (the SEAM)
│  │  │  │  ├─ theme.ts                 #   ThemeTokens
│  │  │  │  ├─ lifecycle.ts             #   LifecycleDefinition, LifecycleProvider, useLifecycle
│  │  │  │  ├─ workflows.ts             #   WorkflowRegistry, WorkflowDefinition
│  │  │  │  ├─ roles.ts                 #   RoleModel, PermissionMatrix
│  │  │  │  ├─ knowledge-source.ts      #   KnowledgeSource adapter interface
│  │  │  │  ├─ mcp.ts                   #   McpToolRegistry, McpTool
│  │  │  │  ├─ onboarding.ts            #   OnboardingSeed
│  │  │  │  └─ garden.ts                #   GardenConfig (composes all of the above) + GARDEN_NS
│  │  │  ├─ auth/                       # supabase clients, auth-server, mcp-auth, middleware factory
│  │  │  ├─ knowledge/                  # kg schema types, rag, SemanticCache, QueryRouter
│  │  │  ├─ verification/               # cross-check, persist, admin verify UI
│  │  │  ├─ discovery/                  # llms.txt + sitemap + openapi + mcp route factories, mcp-bridge, build-mcpb
│  │  │  ├─ theming/                    # tokens machinery (spacing, radii, shadows, motion), ThemeProvider, cascade-safe base.css
│  │  │  ├─ shell/                      # app-shell (ShellStrips/ShellNav/ShellConfig), StageShell, WorkflowShell/Renderer, StepCard
│  │  │  ├─ dream/                      # dream-shared ProjectContext, ramps skeleton, SaveLoad/Picker
│  │  │  └─ spines/                     # budget-spine core, crm-spine core (generic; enums injected)
│  │  ├─ migrations/                    # ENGINE-baseline SQL: orgs, kg_*, verification, RLS, embeddings
│  │  └─ README.md
│  │
│  └─ create-garden/                    # scaffolding CLI (copies gardens/_template, prompts for tokens)
│
├─ gardens/
│  ├─ _template/                        # minimal garden: stub config, 1 sample workflow, placeholder theme
│  │
│  ├─ builders/                         # L3 — BKG, the first real garden (the current app, slimmed)
│  │  ├─ package.json                   #   depends on @knowledge-gardens/engine
│  │  ├─ next.config.ts, app/, public/  # Next.js app; app/ mounts engine providers + this garden's config
│  │  ├─ garden.config.ts               # ← satisfies every L2 contract (the BKG implementation)
│  │  ├─ src/
│  │  │  ├─ theme/                      # herbarium ThemeTokens + brand assets manifest
│  │  │  ├─ lifecycle/                  # the 7 stages (lifecycle-stages, stage-prompts, welcome-copy, stage-from-pathname)
│  │  │  ├─ workflows/                  # 41 *Client.tsx + workflows.json + WorkflowRegistry
│  │  │  ├─ knowledge-sources/          # code-sources (icc/nfpa/upcodes/bkg-seed), compliance-lookup adapter
│  │  │  ├─ domain/                     # cslb-scraper, mep-load-calc, contract-templates, specialists, jurisdictions/amendments
│  │  │  └─ roles/                      # lanes, permission matrix, workflow-roles
│  │  └─ migrations/                    # BUILDERS SQL: lanes, cslb_cache, crm_*, marin demo seed
│  │
│  └─ <new-garden>/                     # scaffolded from _template in days
│
└─ docs/garden-engine/                  # these three docs travel with the engine
```

> **Migration note:** Phases 0–3 of the plan create `src/garden/contracts/` and
> `garden.config.ts` *inside the current BKG repo* so nothing moves until the seams
> are proven. The tree above is the Phase-4 destination. The folder names map 1:1, so
> the physical move is a `git mv` exercise, not a re-architecture.

---

## 2. The config contracts (what every garden supplies)

These are the L2 seam. The engine **defines** them; each garden **implements** one
`GardenConfig`. Shapes below are the intended API (illustrative TypeScript).

```ts
// contracts/garden.ts — the single object an app hands the engine
export interface GardenConfig {
  namespace: string;                 // GARDEN_NS — replaces hardcoded 'bkg-' in localStorage/cookies
  theme: ThemeTokens;
  brand: BrandAssets;                // logo/favicon/og/hero-plate paths or URLs
  lifecycle: LifecycleDefinition[];  // ordered stages
  workflows: WorkflowRegistry;
  roles: RoleModel;
  knowledgeSources: KnowledgeSource[];
  mcpTools: McpToolRegistry;
  onboarding: OnboardingSeed;
  copilot: { systemPersona: string; entityTypeFilter: string[] }; // de-hardcodes rag.ts "Construction Copilot"
}
```

```ts
// contracts/theme.ts — re-theming is THIS object, never engine CSS edits
export interface ThemeTokens {
  colors: {                          // paper/ink/specimen families + semantic + status
    surface: string; surfaceAlt: string; border: string; shadow: string;
    text: string; textStrong: string; textMuted: string;
    accent: string; accentDeep: string; accentPale: string;
    success: string; warning: string; danger: string; info: string;
  };
  fonts: { display: string; body: string; mono: string; script?: string };
  typeScale: Record<'xs'|'sm'|'base'|'lg'|'xl'|'2xl'|'3xl'|'4xl'|'5xl', string>;
  radii: Record<'sm'|'md'|'lg'|'pill', string>;
  shadows: Record<'sm'|'md'|'lg', string>;
  motion: { durQuick: string; durBase: string; durSlow: string; easeOut: string; easeSpring: string };
  stageAccents: string[];            // one hex per lifecycle stage (length === lifecycle.length)
}
// Engine renders these to CSS custom properties at the root; components read var(--…).
// The cascade fix (plan Phase 2) ensures these win — globals.css no longer overrides them.
```

```ts
// contracts/lifecycle.ts — the construction "7 stages" become data
export interface LifecycleDefinition {
  id: number; slug: string; name: string; icon?: string;
  accentIndex: number;               // → theme.stageAccents[accentIndex]
  welcome?: { headline: string; body: string; ctaWorkflowIds: string[] };
  workflowIds: string[];             // which workflows live in this stage
}
// Engine exports LifecycleProvider + useLifecycle(); shell components read from it.
// This single context kills ~11 of the 13 coupling edges (see dependency graph §4).
```

```ts
// contracts/workflows.ts — metadata is data; UI is per-garden components
export interface WorkflowDefinition {
  id: string; label: string; blurb?: string;
  stageId: number; allowedRoles: string[];
  steps: WorkflowStep[];             // from workflows.json — rendered by engine WorkflowRenderer
  Component?: React.ComponentType;   // optional custom Client.tsx for rich UX
}
export type WorkflowRegistry = Record<string, WorkflowDefinition>;
// Engine ships ~6 generic step types (text_input, voice_input, analysis_result, …).
// Simple workflows need only `steps`; rich ones supply `Component`.
```

```ts
// contracts/roles.ts            — RBAC values per garden (BKG: owner/gc/sub/diy/…)
export interface RoleModel { roles: string[]; defaultRole: string;
  priority: Record<string, number>; permissionMatrix: PermissionRule[]; }

// contracts/knowledge-source.ts — BKG supplies ICC/NFPA/UpCodes/CSLB; a new garden supplies its own
export interface KnowledgeSource {
  name: string;
  query(q: KnowledgeQuery): Promise<KnowledgeResult[]>;   // engine RAG source is one built-in impl
}

// contracts/mcp.ts              — single source of truth for tools (fixes 12-vs-18 drift)
export interface McpTool { name: string; description: string; inputSchema: object;
  requiresAuth?: boolean; run(params: unknown, ctx: McpContext): Promise<unknown>; }
export type McpToolRegistry = McpTool[];   // route.ts, /mcp page, llms.txt all read this

// contracts/onboarding.ts       — starter project + seed (BKG: single_family + CSI budget)
export interface OnboardingSeed { projectDefaults: Record<string, unknown>;
  budgetTemplate?: BudgetLine[]; welcomeEmail?: EmailTemplate; }
```

---

## 3. What stays generic vs what each garden writes

| Engine provides (write once) | Garden supplies (per garden) |
|---|---|
| Supabase/auth/middleware, MCP-agent auth | OAuth provider config, owner allowlist |
| `kg_entities`/`kg_assertions`/jurisdictions schema + migrations | The seeded knowledge corpus + jurisdiction rows |
| Verification pipeline (manual attest + auto-verify + last-verified dates) + admin UI | `DEFAULT_SOURCE`, attest allowlist, verify cadence |
| RAG retrieval, SemanticCache, QueryRouter | `copilot.systemPersona`, `entityTypeFilter` |
| llms.txt/sitemap/OpenAPI/MCP generators, .mcpb bridge+packer | `McpToolRegistry`, route manifest, install copy |
| Theming machinery + `ThemeProvider` + cascade-safe base | `ThemeTokens` object + brand assets |
| App-shell (ShellStrips/ShellNav), StageShell, WorkflowShell/Renderer, ~6 step types | `LifecycleDefinition[]`, `WorkflowRegistry`, 0–N `*Client.tsx` screens |
| Dream ramps skeleton + project model | Prompt pool, taxonomy, "build" CTA target |
| Spine cores (budget/crm) | Category/phase enums, JSON-LD extensions |

---

## 4. "Scaffold a new garden in days" — the workflow

1. `pnpm create-garden orchids` → copies `gardens/_template`, prompts for namespace + brand name.
2. Fill `gardens/orchids/garden.config.ts`:
   - drop in a `ThemeTokens` object (the `theme-factory`/`knowledge-gardens-design`
     skill can generate one) → instant re-theme;
   - define the garden's `LifecycleDefinition[]` (its own stages, any count);
   - register `McpTool`s and `KnowledgeSource`s for its domain;
   - point `brand` at its logo/favicon/og assets.
3. Provision one Supabase project; run the **engine-baseline** migrations + the
   garden's own seed migration.
4. `pnpm --filter orchids dev` → working app: themed shell, knowledge browser +
   verification UI, killer-app + dream shells, auto-generated llms.txt/sitemap/MCP.
5. Author domain content: workflow `*Client.tsx` screens (or pure-`steps` workflows),
   seed the knowledge corpus, write specialist prompts.

**Days** covers steps 1–4 (the framework). Step 5 (domain content) is the real,
unavoidable product work — sized honestly in plan Phase 5. The engine guarantees you
never touch its internals to get there.

---

## 5. Naming / hygiene cleanups folded into extraction

- Remove `@clerk/nextjs` (0 usages; auth is Supabase).
- Collapse the dual token systems: `lib/brand-tokens.ts` (parchment/copper/steel) is
  largely unused and competes with `styles/tokens.css` — pick `ThemeTokens` as the one
  source, delete the other.
- Replace the hardcoded `bkg-` localStorage/cookie prefix (15+ keys: `bkg-active-project`,
  `bkg-lane`, `bkg-jurisdiction`, `bkg-dream-profile`, …) with `${GARDEN_NS}-…`.
- Move root-level one-offs (`push-*.sh`, `batch*.mjs`, `count.js`,
  `knowledge-gardens-descent.html`, `john walkthrough May 28 files/`) out of the engine —
  they're demo/scratch artifacts, not platform.
