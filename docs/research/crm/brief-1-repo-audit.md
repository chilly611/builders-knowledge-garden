# Brief 1 — Repo Audit (read-only)

Generated: 2026-05-12. Source: `https://raw.githubusercontent.com/chilly611/builders-knowledge-garden/main/`.
Audit purpose: surface exact existing patterns Brief 1 (`/killerapp/who-is-asking` → `bkg_contact`) must match, so type shapes are not reinvented.

## Headline findings

- **15 of 18 files found, 3 of 18 are 404.** The three 404s are **signal**: `docs/schemas/crm-schema.sql` does **not** exist, `app/llms.txt` / root `llms.txt` do **not** exist (the canonical file is `public/llms.txt`), and `src/app/crm/page.tsx` does **not** exist (no public CRM surface yet — only the API route).
- **`src/app/api/v1/crm/route.ts` exists and is fully mocked.** It defines an in-memory `CRMContact` / `CRMActivity` TS shape and a `MOCK_CONTACTS` array. There is **no Supabase table** behind it yet (`src/types/database.ts` has zero matches for "contact" or "crm" or "bkg_contact"). Brief 1 needs to either (a) extend this mock with a `bkg_contact` JSON-LD payload field, or (b) flip it to a real Supabase table in the same migration that adds the schema.
- **Next 15+ params Promise pattern is real.** `src/app/api/v1/specialists/[id]/route.ts` uses `{ params }: { params: Promise<{ id: string }> }` then `const { id } = await params;` — every new dynamic route must do the same.
- **No `crm-schema.sql` and no CRM migration anywhere in `supabase/migrations/`.** Brief 1 is greenfield on the schema side.

---

## 1. `src/app/killerapp/page.tsx`

- **Status:** Found (200)
- **Purpose (1 line):** Server component workflow-picker landing — reads `docs/workflows.json` at render and groups workflows by 7-stage lifecycle. `LIVE_WORKFLOWS` is a hard-coded `Record<string, string>` (q-id → route) — Brief 1's new route will **not** auto-appear here; if you want it discoverable via the picker, add an entry to `LIVE_WORKFLOWS` AND a row to `docs/workflows.json`. Otherwise the page is just a parallel `/killerapp/who-is-asking` route, accessible only via deep link.
- **Exported types (full code blocks):**

```ts
interface LifecycleStage {
  id: number;
  name: string;
  original_prototype_name?: string;
  emoji: string;
}

interface WorkflowSummary {
  id: string;
  stageId: number;
  label: string;
  totalXp: number;
  steps: unknown[];
}

interface WorkflowsJson {
  lifecycleStages: LifecycleStage[];
  workflows: WorkflowSummary[];
}
```

- **Exported functions:**

```ts
export const metadata: Metadata = { /* title, description, openGraph, twitter */ };
export default async function KillerAppPage({
  searchParams,
}: {
  searchParams?: Promise<{ project?: string | string[] }>;
}): Promise<JSX.Element>;
// Reads docs/workflows.json, groups workflows by stage, renders TOC.
```

- **Patterns to match:**
  - **Server Component** (no `'use client'`). Reads from `process.cwd()` via `fs.readFileSync`.
  - `searchParams` is **always a Promise** in Next 16 — `await` before using. Single-or-array handling: `const projectId = Array.isArray(raw) ? raw[0] : raw;`.
  - Default export is the page function; `metadata` is a named export.
  - `LIVE_WORKFLOWS` and `WORKFLOW_BLURBS` are flat top-level `Record<string, string>` maps — explicit-by-design ("'Coming soon' never lies"). If Brief 1 ships an entry, add it here.
  - Stage color is read from `STAGE_ACCENTS[stageId]` + a local `STAGE_COLORS` fallback. Don't invent new colors — pick the stage and inherit.
  - Workflow routes live at `/killerapp/workflows/<slug>`. `/killerapp/who-is-asking` is a **sibling route**, not a workflow — it sits beside `workflows/` not under it. That's intentional per Brief 1's framing, but means it won't auto-pickup the WorkflowShell chrome unless you wrap it.

---

## 2. `src/app/killerapp/layout.tsx`

- **Status:** Found (200)
- **Purpose (1 line):** Client-component layout that wraps every `/killerapp/*` route with the global chrome (StageBackdrop, KillerAppNav, AuthAndProjectIndicator, ProjectCockpit, VoiceCommandNav, CommandPalette, GreenFlashProvider, NavigatorProvider) and seeds the demo project on first visit.
- **Exported types:** None.
- **Exported functions:**

```ts
export default function KillerAppLayout({ children }: { children: React.ReactNode }): JSX.Element;
```

- **Patterns to match:**
  - **Client component** (`'use client'` at top). The layout itself is client because it uses `usePathname` + `useRouter` + a voice-command handler.
  - Everything wraps in **`<GreenFlashProvider><NavigatorProvider initialCollapseState="expanded">`** — your `/killerapp/who-is-asking` route automatically inherits both. Don't re-mount them.
  - **AuthAndProjectIndicator is mounted inside `<Suspense fallback={null}>`** because it uses `useSearchParams` (Next 16 requirement). Any sibling that uses `useSearchParams` must be Suspense-wrapped.
  - **Stage is derived from pathname** via `stageFromPathname(pathname)`. For `/killerapp/who-is-asking` to render a colored StageBackdrop, that helper must know the slug. Check `src/lib/stage-from-pathname.ts` if you want a specific stage tint (likely Stage 1 — Size Up, since "who is asking" is lead-qualification).
  - The layout adds `paddingTop: 48` to children — your page can render flush at the top of its own container.
  - **Auto-seed runs unconditionally on mount** (`autoSeedDemoOnFirstVisit()`). Don't break that contract.

---

## 3. `src/design-system/components/StepCard.types.ts`

- **Status:** Found (200)
- **Purpose (1 line):** Canonical type contracts for every workflow step input — `StepResult` is the universal event payload emitted to `onAction`/`onEvent`.
- **Exported types (full code blocks):**

```ts
export type StepType =
  | 'text_input'
  | 'voice_input'
  | 'number_input'
  | 'location_input'
  | 'multi_select'
  | 'select'
  | 'file_upload'
  | 'template_chooser'
  | 'checklist'
  | 'analysis_result';

export type StepStatus = 'pending' | 'in_progress' | 'complete';

export interface TemplateOption {
  icon?: string;
  name: string;
  desc: string;
}

export interface WorkflowStep {
  id: string;
  label: string;
  type: StepType;
  promptId?: string;
  analysisTitle?: string;
  exampleOutput?: string;
  placeholder?: string;
  options?: string[];
  templates?: TemplateOption[];
  unit?: string;
  accept?: string;
  notes?: string;
}

export interface StepResult {
  type: 'step_opened' | 'step_saved' | 'step_skipped' | 'step_completed';
  stepId: string;
  payload?: unknown;
  timestamp: number;
}

export interface StepCardProps {
  step: WorkflowStep;
  status?: StepStatus;
  stepNumber?: number;
  totalSteps?: number;
  xpReward?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onAction?: (result: StepResult) => void;
  renderAnalysis?: (step: WorkflowStep, input: string) => React.ReactNode;
  proMode?: boolean;
  ctaLabel?: string;
  initialPayload?: {
    value?: string;
    selected?: string[];
    checked?: Record<string, boolean>;
    input?: string;
  };
}
```

- **Exported functions:** None (types-only file).
- **Patterns to match (THIS IS THE 2026-04-19 LESSON):**
  - The **`StepResult`** event has exactly four `type` literals: `step_opened | step_saved | step_skipped | step_completed`. Your voice/photo capture handlers must emit one of these four, not a custom string.
  - `payload` is **`unknown`** at the type level. The conventions per step type are documented in `StepCardProps.initialPayload`:
    - `text_input` / `voice_input` / `number_input` → `{ value: string }`
    - `select` / `multi_select` → `{ selected: string[] }`
    - `checklist` → `{ checked: Record<string, boolean> }`
    - `analysis_result` → `{ input: string }`
  - **No `voice_input` payload conventions for audio blobs.** This is a gap. If Brief 1 captures raw audio (Blob/base64), pick a convention — likely `{ value: <transcript>, audioBase64?: string, durationMs?: number }` — and document it. Same for `file_upload`: no current shape spec, so for the photo capture step, propose `{ value: <storageUrl>, mimeType: string, base64?: string }`.
  - **Always include `timestamp: Date.now()`** in the event. Don't omit it.
  - **stepId must match `WorkflowStep.id`** — these are referenced by id in the journey-progress reducer (`event.stepId`).

---

## 4. `src/design-system/components/WorkflowShell.tsx`

- **Status:** Found (200)
- **Purpose (1 line):** Reusable workflow chrome — breadcrumb + Pro Toggle + trade/lane context chooser + WorkflowRenderer wiring + event counter + journey-progress emission. Brief 1 *may* wrap with this OR build a bespoke page; the latter is simpler since `who-is-asking` has only 2 input steps (voice + photo) rather than a multi-step workflow.
- **Exported types:**

```ts
export type ContextField = 'trade' | 'lane';

export interface WorkflowShellProps {
  workflow: Workflow;
  stages?: LifecycleStage[]; // deprecated, accepted for back-compat
  breadcrumbLabel: string;
  contextFields?: ContextField[];
  defaultContext?: Partial<WorkflowContext>;
  topPanel?: ReactNode;
  sidePanel?: ReactNode;
  onStepComplete?: (result: StepResult & { workflowId: string }) => void;
  projectId?: string;
  surfaceId?: string;
  hydratedPayloads?: Record<
    string,
    {
      value?: string;
      selected?: string[];
      checked?: Record<string, boolean>;
      input?: string;
    }
  >;
  statusMap?: Record<string, 'pending' | 'in_progress' | 'complete'>;
}
```

- **Exported functions:**

```ts
export default function WorkflowShell(props: WorkflowShellProps): JSX.Element;
```

- **Patterns to match:**
  - **Client component** (`'use client'`).
  - Wires **two parallel event streams** on every step event:
    1. `window.dispatchEvent(new CustomEvent('bkg:workflow:event', { detail: event }))` (legacy bus).
    2. `emitJourneyEvent({ type: 'started' | 'step_completed', workflowId, projectId, ... })` (journey-progress).
  - **Resolves `projectId` on mount** via `useEffect` calling `resolveProjectId()` (which reads `bkg-active-project` from localStorage). Don't read localStorage during render — it'll SSR-mismatch.
  - **`firstStageId` is typed `1 | 2 | 3 | 4 | 5 | 6 | 7`** — these are the seven lifecycle stages, not a freeform number.
  - The `<main>` element gets **`data-bkg-surface={surfaceId ?? `workflow-${workflow.id}`}`** so the global AI FAB and voice nav can target it. Brief 1 should set `data-bkg-surface="who-is-asking"` on its root element (even if not wrapping with WorkflowShell).
  - **Decision per the brief:** the 2-step voice+photo flow doesn't fit cleanly in WorkflowShell (no workflows.json entry, no trade/lane context, no analysis step). A bespoke client component is justified — but it should still call `emitJourneyEvent` and dispatch `bkg:workflow:event` so the existing chrome reacts.

---

## 5. `src/lib/specialists.ts`

- **Status:** Found (200, server-only — uses Node `fs`)
- **Purpose (1 line):** Server-side specialist runner. Loads a prompt by id, builds context, queries `code-sources` RAG if applicable, calls Anthropic SDK, parses structured `<json>` blocks. Brief 1 doesn't run a specialist directly, but `who-is-asking` will likely need a `contact-extract` specialist that turns voice transcript + photo into structured `bkg_contact` JSON — call it via `runSpecialist` from the client.
- **Exported types (full code blocks):**

```ts
export interface SpecialistContext {
  scope_description: string;
  jurisdiction?: string;
  trade?: string;
  lane?: "gc" | "diy" | "specialty" | "worker" | "supplier" | "equipment" | "service" | "agent";
  project_phase?: string;
  extra?: Record<string, unknown>;
}

export interface SpecialistCitation {
  entity_id: string;
  code_body?: string;
  section?: string;
  jurisdiction?: string;
  edition?: string;
  updated_at?: string;
  relevance?: string;
}

export interface DisciplineHandoff {
  detected: "electrical" | "structural" | "plumbing" | "mechanical" | "fire";
  suggestStep: string;
  message: string;
}

export interface SupersededNotice {
  oldSection: string;
  newSection: string;
  summary: string;
}

export interface SpecialistResult {
  narrative: string;
  structured: Record<string, unknown>;
  citations: SpecialistCitation[];
  confidence: "high" | "medium" | "low";
  deferred_to_human?: string;
  raw_response: string;
  model: string;
  latency_ms: number;
  promptVersion: "v1" | "v2";
  disciplineHandoff?: DisciplineHandoff;
  supersededNotice?: SupersededNotice;
  code_sections?: { section: string; title: string; requirement: string; status?: string }[];
  warnings?: string[];
}
```

- **Exported functions:**

```ts
export async function callSpecialist(
  specialistId: string,
  context: SpecialistContext,
  options?: { mockIfNoKey?: boolean; preferProductionPrompt?: boolean; version?: "v1" | "v2" }
): Promise<SpecialistResult>;
// Loads prompt, optionally retrieves RAG context, calls claude-sonnet-4-20250514
// (MAX_TOKENS=2500), parses structured + narrative. Has a deterministic
// short-circuit for specialistId === "payroll-classification-gate".
```

- **Patterns to match:**
  - **Server-only**. Never import from a client component. Use `specialists.client.ts` instead.
  - Model: `claude-sonnet-4-20250514`, MAX_TOKENS: 2500.
  - **Brief 1 specialist** (if you build one — name suggestion `contact-extract`) should:
    - Live as a prompt under `src/prompts/specialists/contact-extract.{v1,v2}.md` (existing convention — verify path against repo).
    - Return structured JSON-LD-shaped output inside `<json>...</json>` tags.
    - Be invoked via `runSpecialist('contact-extract', { scope_description: <transcript>, extra: { workflow_id: 'who-is-asking', step_id: 'voice' | 'photo', photo_base64?: string } })`.
  - `context.extra` is the **escape hatch** for workflow_id, step_id, photo_base64, etc. Use it; don't add top-level fields.

---

## 6. `src/lib/specialists.client.ts`

- **Status:** Found (200)
- **Purpose (1 line):** Client-side thin wrapper that POSTs to `/api/v1/specialists/[id]` and returns a `SpecialistResult`.
- **Exported types:** None (re-imports from `./specialists`).
- **Exported functions:**

```ts
export async function runSpecialist(
  specialistId: string,
  context: SpecialistContext
): Promise<SpecialistResult>;
/**
 * Call a specialist from the client.
 * Fetches to POST /api/v1/specialists/[id] with the given context.
 * Returns a SpecialistResult with narrative, structured output, and citations.
 */
```

- **Patterns to match:**
  - **`'use client'`** directive at top.
  - **`import type`** only from `./specialists` — never run-time import (would pull Node `fs` into the bundle).
  - URL: `/api/v1/specialists/${encodeURIComponent(specialistId)}`.
  - Body: `JSON.stringify(context)` — the entire `SpecialistContext` is the body.
  - Error path: throws `Error('Specialist call failed (${status}): ${msg}')` — your UI must catch and degrade gracefully (e.g., show the raw transcript even if extraction failed).
  - **Note:** the route response actually includes a `_run_id` field tacked on top of `SpecialistResult` (see `[id]/route.ts`). The client returns `response.json() as Promise<SpecialistResult>` — losing the `_run_id` from the type, but it's still there at runtime if you cast. For Brief 1, you may want to capture `_run_id` so user edits to the extracted contact can be logged back as RSI feedback.

---

## 7. `src/lib/journey-progress.ts`

- **Status:** Found (200)
- **Purpose (1 line):** localStorage-backed event store + reducer for "what has the user done across workflows?" Emits `bkg:journey:changed` and writes Time Machine snapshots on `step_completed`.
- **Exported types (full code blocks):**

```ts
export type JourneyEventType =
  | 'started'
  | 'step_completed'
  | 'completed'
  | 'needs_attention';

export interface JourneyEventBase {
  workflowId: string;
  projectId: string;
}

export type JourneyEvent =
  | ({ type: 'started' } & JourneyEventBase)
  | ({ type: 'completed' } & JourneyEventBase)
  | ({
      type: 'step_completed';
      stepId: string;
      stepIndex: number;
      totalSteps: number;
    } & JourneyEventBase)
  | ({ type: 'needs_attention'; reason?: string } & JourneyEventBase);

export type JourneyWorkflowStatus =
  | 'untouched'
  | 'in_progress'
  | 'needs_attention'
  | 'done';

export interface JourneyWorkflowState {
  workflowId: string;
  status: JourneyWorkflowStatus;
  stepsCompleted: number;
  totalSteps: number;
  lastEventAt: number;
  lastReason?: string;
}

export type JourneyState = Record<string, JourneyWorkflowState>;

export interface StageProgress {
  worked: number;
  done: number;
  needsAttention: number;
  total: number;
}
```

- **Exported functions:**

```ts
export function resolveProjectId(): string;
// Reads localStorage 'bkg-active-project', defaults to 'default'. SSR-safe.

export function resolveJurisdiction(): string;
// Reads localStorage 'bkg-jurisdiction', defaults to 'Local AHJ'. SSR-safe.

export function emitJourneyEvent(event: JourneyEvent): void;
// Reduces state, persists, dispatches 'bkg:journey:changed', writes Time Machine snapshot on step_completed.

export function getJourneyState(projectId: string): JourneyState;

export function subscribeJourney(
  projectId: string,
  callback: (state: JourneyState) => void
): () => void;
// Subscribe with immediate callback fire; returns unsubscribe.

export function rollupByStage(
  state: JourneyState,
  stageWorkflows: Record<number, string[]>
): Record<number, StageProgress>;
```

- **Patterns to match (the typed-event-emit pattern):**
  - **`workflowId: 'who-is-asking'`** — use the route slug, not a q-id (since this isn't a numbered workflow).
  - **`projectId` resolved via `resolveProjectId()`** — defaults to literal `'default'` for anonymous users. Don't pass `undefined`.
  - **Storage key shape:** `bkg:journey:${userKey()}:${projectId}` with `userKey()` reading `bkg-user-id` from localStorage (default `'anon'`).
  - **Change event:** `bkg:journey:changed` with `detail: { projectId }`.
  - Brief 1's emit sequence for a successful capture:
    1. On mount: `emitJourneyEvent({ type: 'started', workflowId: 'who-is-asking', projectId })`.
    2. On voice or photo save: `emitJourneyEvent({ type: 'step_completed', workflowId: 'who-is-asking', stepId: 'voice'|'photo', stepIndex: 0|1, totalSteps: 2, projectId })`.
    3. On contact created: `emitJourneyEvent({ type: 'completed', workflowId: 'who-is-asking', projectId })`.

---

## 8. `src/lib/budget-spine.ts`

- **Status:** Found (200)
- **Purpose (1 line):** Typed client-side helpers for every workflow that writes a budget line. Single entry point so `BudgetWidget` and P&L stay coherent. Brief 1 likely does **not** write a budget line for a contact capture (no money moves), but the patterns here are the canonical model for typed event emit + active-project resolution.
- **Exported types (full code blocks):**

```ts
export type BudgetPhase = 'DREAM' | 'DESIGN' | 'PLAN' | 'BUILD' | 'DELIVER' | 'GROW';

export type BudgetCategory =
  | 'materials'
  | 'labor'
  | 'permits'
  | 'equipment'
  | 'subcontractor'
  | 'overhead'
  | 'other';

export type BudgetWriteReason =
  | 'no-active-project'
  | 'not-authenticated'
  | 'budget-create-failed'
  | 'item-create-failed'
  | 'validation'
  | 'network';

export interface BudgetWriteOkResult {
  ok: true;
  itemId: string;
  budgetId: string;
}

export interface BudgetWriteFailResult {
  ok: false;
  reason: BudgetWriteReason;
  detail?: string;
}

export type BudgetWriteResult = BudgetWriteOkResult | BudgetWriteFailResult;

export interface BaseWriteInput {
  description: string;
  amount: number;
  lifecycleStageId: number;
  vendor?: string;
  isEstimate?: boolean;
  date?: string;
  receiptUrl?: string;
  projectId?: string;
}
```

- **Exported functions (signatures):**

```ts
export function getActiveProjectId(): string | null;

export function recordMaterialCost(input: BaseWriteInput): Promise<BudgetWriteResult>;
export function recordSubcontractorCost(input: BaseWriteInput): Promise<BudgetWriteResult>;
export function recordEquipmentCost(input: BaseWriteInput): Promise<BudgetWriteResult>;
export function recordLaborCost(input: BaseWriteInput): Promise<BudgetWriteResult>;
export function recordPermitCost(input: BaseWriteInput): Promise<BudgetWriteResult>;
export function recordExpense(
  input: BaseWriteInput & { category?: BudgetCategory }
): Promise<BudgetWriteResult>;
// q17 Expense Tracking — receipts the contractor actually paid. Defaults
// is_estimate to FALSE because receipts are cash out the door.
export function recordClientPayment(
  input: Omit<BaseWriteInput, 'isEstimate'> & { invoiceNumber?: string }
): Promise<BudgetWriteResult>;
// Stored as a NEGATIVE overhead line in MVP.
export function getProjectBudget(projectId?: string): Promise<
  | { ok: true; budgetId: string; summary: unknown }
  | { ok: false; reason: BudgetWriteReason; detail?: string }
>;
```

- **Patterns to match (this IS the prescribed event-emit shape for Brief 1's CRM writes):**
  - **Result shape: discriminated `{ ok: true, ... } | { ok: false, reason, detail? }`.** Never throw on expected failure modes (no project, not authenticated). Brief 1's `recordContact(input)` function should return `ContactWriteResult` with the same shape.
  - **Suggested CRM spine:** create `src/lib/crm-spine.ts` mirroring this file with:
    ```ts
    export type ContactWriteReason =
      | 'no-active-project'
      | 'not-authenticated'
      | 'validation'
      | 'storage-upload-failed'   // photo blob upload
      | 'extraction-failed'        // specialist returned non-parseable
      | 'item-create-failed'
      | 'network';

    export interface ContactWriteOkResult { ok: true; contactId: string; }
    export interface ContactWriteFailResult { ok: false; reason: ContactWriteReason; detail?: string; }
    export type ContactWriteResult = ContactWriteOkResult | ContactWriteFailResult;

    export interface CaptureContactInput {
      source: 'voice' | 'photo';
      audioBase64?: string;
      audioDurationMs?: number;
      photoBase64?: string;
      photoMimeType?: string;
      transcript?: string;
      projectId?: string;
    }

    export function recordContact(input: CaptureContactInput): Promise<ContactWriteResult>;
    ```
  - **After a successful write, dispatch `bkg:crm:changed`** (mirroring `bkg:budget:changed`) so any future contact widgets refresh. Document it; even if nothing listens yet, the pattern is the contract.
  - Use Supabase browser client + bearer token the same way: `getBrowserClient()` + `getSessionToken()`. Don't re-implement auth. Or — since CRM is currently mocked — just POST to `/api/v1/crm` and let the route handle persistence.

---

## 9. `src/app/api/v1/specialists/[id]/route.ts`

- **Status:** Found (200, via URL-encoded `%5Bid%5D`)
- **Purpose (1 line):** POST handler for specialist invocation. Validates body, computes prompt version, logs RSI start/complete/error, returns `SpecialistResult & { _run_id }`. Method-allowlist returns 405 on GET/PUT/DELETE.
- **Exported types:**

```ts
interface RateLimitResult {
  allowed: boolean;
  remaining?: number;
  resetAt?: string;
}
// (Internal — not exported.)
```

- **Exported functions (signatures):**

```ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse>;

export async function GET(): Promise<NextResponse>;   // returns 405
export async function PUT(): Promise<NextResponse>;   // returns 405
export async function DELETE(): Promise<NextResponse>; // returns 405
```

- **Patterns to match (THIS IS THE 2026-04-18 LESSON):**
  - **`params` is a Promise in Next 16.** Destructure inside the function body: `const { id: specialistId } = await params;`. Brief 1's `/api/v1/crm/contacts/[id]/route.ts` (if added) must use the exact same signature.
  - **Method allowlist via explicit `export async function GET/PUT/DELETE` returning 405** — the same `route.ts` exports all four to make Vercel surface a clear method-not-allowed instead of a 405-from-default.
  - **Body parsing pattern:**
    ```ts
    let body: SomeRequestType;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
    ```
  - **Validation pattern:** check existence + type + non-empty + length cap (`scope_description.length > 10_000`).
  - **RSI instrumentation pattern:** call `logSpecialistRunStart` before the work, `logSpecialistRunComplete` after success, `logSpecialistRunError` on catch. Each returns silently on failure. Brief 1's contact-extract specialist must do the same (`workflow_id: 'who-is-asking', step_id: 'voice'|'photo'`).
  - **Error response shape:** `{ error: 'kebab_case_code', message: 'user-facing', _run_id }`. Never leak internal `err.message`.
  - **Success response:** spread `result` then add `_run_id`: `return NextResponse.json({ ...result, _run_id }, { status: 200 });`.

---

## 10. `docs/schemas/crm-schema.sql`

- **Status:** **404 — does not exist.**
- **Surprise/signal:** there is no `docs/schemas/` folder at all in the repo. The `docs/` listing has 23 files/folders, none of them `schemas`. Likewise no CRM-related `.sql` lives in `supabase/migrations/` (the 18 migrations there are: phase2_strategy, wave3_6_tables, rsi_deltas, more_workflow_states, project_attachments, remaining_workflow_states, soon_workflow_state_columns, budget_lines, command_center, dream_states, heartbeat_reports, phase1a_schema, pm_modules, rls_user_scoped, subscriptions × 3, user_profiles).
- **Implication:** Brief 1 is **greenfield** on the contact schema. You will be the first to define `crm_contacts` (and optionally `crm_activities`, `crm_attachments`). Suggested migration filename: `supabase/migrations/20260512_crm_contacts.sql`. Schema should include at minimum (matching the existing `/api/v1/crm` mock + JSON-LD requirement):
  - `id uuid primary key`
  - `org_id uuid` (so future RLS works)
  - `project_id text` (for `bkg-active-project` linkage; nullable)
  - `first_name text not null`
  - `last_name text`
  - `company text`
  - `email text`
  - `phone text`
  - `contact_type text check (contact_type in ('lead','prospect','client','past_client','vendor','partner'))`
  - `stage text check (stage in ('new','contacted','qualified','proposal','negotiation','won','lost','dormant'))`
  - `temperature text check (temperature in ('hot','warm','cool','cold'))`
  - `project_type text`, `project_location text`, `estimated_value numeric`, `lead_score int`
  - `notes text`
  - `tags text[]`
  - `jsonld jsonb` — **the `bkg_contact` JSON-LD record itself** (`@context`, `@type: 'Person'` or `'Organization'`, `name`, `email`, `telephone`, `image`, `description`, `additionalType: 'https://builders.theknowledgegardens.com/schemas/bkg_contact'`)
  - `source text check (source in ('voice','photo','manual','dream_builder'))`
  - `source_audio_url text` (Supabase Storage), `source_photo_url text`
  - `created_at timestamptz default now()`, `updated_at timestamptz default now()`
  - `last_contact_at timestamptz`, `next_followup timestamptz`
  - `archived boolean default false`
  - `stage_changed_at timestamptz`
- **Decision:** because the existing `/api/v1/crm` is purely mocked with an in-memory array, Brief 1 has a choice: (a) ship the schema + flip the API to real Supabase in one PR, or (b) keep the API mocked and just add a `jsonld` field to the in-memory `CRMContact` interface. The brief order language ("JSON-LD record") suggests (a) is the eventual intent; the lightest possible Brief 1 is (b) with the schema staged in a follow-up brief.

---

## 11. `src/types/database.ts`

- **Status:** Found (200, 72,181 bytes, 2,422 lines)
- **Purpose (1 line):** Auto-generated (Supabase CLI) TypeScript types for every public-schema table, view, function, enum, and composite type.
- **Exported types:** `Json`, `Database`. Tables present: `achievements, agent_audit_log, agent_identities, broker_queries, challenge_progress, command_center_attention, command_center_projects, daily_quests, dream_project_links, inspection_items, inspection_records, invoice_line_items, invoices, kg_api_keys, kg_assertions, kg_audit_log, kg_domains, kg_entities, kg_entity_jurisdictions, kg_entity_types, kg_jurisdictions, kg_org_members, kg_organizations, kg_profiles, kg_relationships, marketplace_listings, marketplace_orders, marketplace_transactions, morning_briefings, notifications, permits, project_compliance, project_schedules, rfi_items, rsi_deltas, rsi_feedback, saved_projects, schema_migrations, seasonal_challenges, social_shares, specialist_runs, subscriptions, user_achievements, user_profiles, user_xp, weather_logs, worldwalker_jobs, xp_events`.
- **Exported functions:** None (types-only file). Views section has `kg_entities_at_time, kg_resolve_jurisdiction_stack`. Functions section follows. Enums at line 2197 and 2369. CompositeTypes at line 2244.
- **Patterns to match:**
  - **Every table has the canonical `Row | Insert | Update | Relationships` quad.** When you add `crm_contacts`, regenerate this file with `supabase gen types typescript` so types stay in sync.
  - **Sample shape (use `specialist_runs` as the template for your new `crm_contacts`):**
    ```ts
    specialist_runs: {
      Row: { /* all fields, nullable as `T | null` */ }
      Insert: { /* fields, defaults marked `?:` */ }
      Update: { /* all optional */ }
      Relationships: []
    }
    ```
  - **`Json` type is the canonical JSONB representation** — use `Json` for the `jsonld` column type, not `Record<string, unknown>` or `any`.
  - **No `crm_contacts`, no `bkg_contact`, no `contact*` anywhere.** Confirmed via `grep -niE "contact|bkg_contact|jsonld|json_ld"` returning zero matches. Brief 1 owns the first definition.

---

## 12. `package.json`

- **Status:** Found (200)
- **Summary:** Next 16.2.1 (note: **CLAUDE.md says "Next 15", actual is 16.2.1** — the params-Promise pattern is real and required). React 19.2.4. Anthropic SDK ^0.80.0, Clerk ^7.0.6, Supabase JS ^2.99.3, Stripe ^22.0.0, jsPDF ^4.2.1 + jspdf-autotable ^5.0.7 (available for any contact-sheet export), framer-motion ^12.38.0, lucide-react ^1.7.0, tone ^15.1.22 (audio synth, NOT speech recognition — Brief 1 needs Web Speech API or a recorder), three.js + R3F (heavy 3D, irrelevant to Brief 1), uuid ^9.0.0.
- **No mic/speech/voice library**. Brief 1's voice input must use the browser-native `MediaRecorder` API (or `SpeechRecognition` if you want client-side transcription). For the photo step, browser-native `<input type="file" accept="image/*" capture="environment">` is sufficient — no library needed.
- **No image-OCR or contact-parsing library** like `tesseract.js`. The photo path either (a) uploads the raw image to Supabase Storage and lets a Claude vision call extract fields, or (b) does nothing client-side and just stores the URL. Recommend (a) via `claude-sonnet-4-20250514` with an image content block.
- **devDependencies:** vitest ^4.1.4 for tests, eslint-config-next 16.2.1.

---

## 13. `tsconfig.json`

- **Status:** Found (200)
- **Key flags:**
  - `strict: true` — **all strict-mode checks on**. No implicit any, no unchecked indexed access (default off in this config, watch out), strict null checks ON.
  - `target: ES2017`, `module: esnext`, `moduleResolution: bundler`.
  - `jsx: react-jsx` (no React import needed for JSX).
  - `isolatedModules: true` — every file must be independently transpilable (no `const enum`, no `export = `).
  - `paths: { "@/*": ["./src/*"] }` — use `@/lib/journey-progress`, not relative paths.
  - `resolveJsonModule: true` — `import workflows from 'docs/workflows.json'` would work but the repo uses `fs.readFileSync` in the picker; keep that pattern.
- **Patterns to match:** Brief 1 code must compile under strict null checks. Every optional payload field must be `?:` and null-guarded. Use `@/` for all internal imports.

---

## 14. `vercel.json`

- **Status:** Found (200, 99 bytes)
- **Full content:**
  ```json
  {
    "rewrites": [
      { "source": "/investor-brief", "destination": "/investor-brief.html" }
    ]
  }
  ```
- **No crons.** Brief 3's cron will be the first one. Add a `"crons"` array when Brief 3 lands; example shape:
  ```json
  {
    "rewrites": [...],
    "crons": [
      { "path": "/api/v1/crm/followup-digest", "schedule": "0 13 * * 1" }
    ]
  }
  ```

---

## 15. `app/llms.txt` / `llms.txt` / `public/llms.txt`

- **Status:** `app/llms.txt` **404**, root `llms.txt` **404**, **`public/llms.txt` Found (200, 6,173 bytes)**.
- **Purpose (1 line):** The canonical agent-discoverability manifest served at `https://builders.theknowledgegardens.com/llms.txt`. Lists entities, REST API endpoints, MCP server tools, knowledge pages, OpenAPI link.
- **Surprise:** the MCP tool list already mentions **`crm_list_contacts`** and **`crm_pipeline_stats`** (tools 11 and 12 of 12). So Brief 1 isn't introducing CRM to the agent surface — it's filling out what's already advertised but only mock-backed.
- **What Brief 1 must append:** A new section near the REST API block documenting the contact-capture intent, e.g.:
  ```
  **POST /api/v1/crm**
  Create a contact. Accepts JSON-LD `bkg_contact` shape (Schema.org Person/Organization
  with additionalType `https://builders.theknowledgegardens.com/schemas/bkg_contact`).
  Source field may be 'voice' | 'photo' | 'manual' | 'dream_builder'.

  **Knowledge Page:** /killerapp/who-is-asking — voice + photo contact capture for
  builders meeting leads in the field.
  ```
- **Patterns to match:** plain markdown, no frontmatter, no code blocks for endpoints — just bolded paths followed by prose. Keep the "12 total" count current — adding endpoints means updating the tool count.

---

## 16. `src/components/JurisdictionPicker.tsx` (optional but useful)

- **Status:** Found (200)
- **Purpose (1 line):** Client-component typeahead combobox for selecting a jurisdiction. Shows the Server/Client split pattern: data (jurisdictions list) is fetched server-side and passed in via props; all interactive state (input, focus, keyboard nav) lives in this client component.
- **Exported types:**

```ts
interface JurisdictionPickerProps {
  jurisdictions: Jurisdiction[];
  value: string;
  onChange: (id: string) => void;
  autoFocus?: boolean;
}
// (Internal SearchResult type not exported.)
```

- **Exported functions:**

```ts
// Default export, no signature on the export line — standard React component.
export default function JurisdictionPicker(props: JurisdictionPickerProps): JSX.Element;
```

- **Patterns to match:**
  - **`'use client'` at top**, single default export.
  - Receives data as **prop**, not as a fetch — the server component above must hydrate it. For Brief 1, if the contact form needs a project-list dropdown, fetch projects in the server component (or a Server Action) and pass them down.
  - **Token imports from `@/design-system/tokens`** — `colors, fonts, fontSizes, fontWeights, spacing, radii, zIndex, transitions`. Don't hardcode hex; use tokens.
  - **WAI-ARIA combobox pattern** — Brief 1's contact form should aim for the same: proper `role`, `aria-expanded`, `aria-controls`, keyboard navigation. Don't skip a11y on a voice/photo flow where the keyboard fallback matters.

---

## 17. `src/design-system/components/WorkflowRenderer.tsx` (optional)

- **Status:** Found (200)
- **Purpose (1 line):** Consumes a `Workflow` (workflows.json shape) and renders a sequence of StepCards; wires `analysis_result` steps to the live specialist runner via `AnalysisPane`. **Brief 1 likely doesn't use this directly** because `who-is-asking` isn't a workflows.json entry, but the event-payload-on-completion pattern is here.
- **Exported types:** None (component file; imports `Workflow, WorkflowRendererProps, WorkflowContext` from `./WorkflowRenderer.types`).
- **Exported functions:**

```ts
export default function WorkflowRenderer(props: WorkflowRendererProps): JSX.Element;
```

- **Patterns to match (event payload shape on completion):**
  - `onEvent?.({ ...event, workflowId: workflow.id })` — the `StepResult` from a StepCard is **augmented with `workflowId`** before bubbling to the parent. WorkflowShell relies on this contract.
  - **First step expanded by default** — gentle progressive reveal. Brief 1's 2-step flow should respect this: voice step open on landing, photo step collapsed until voice is submitted (or both open in parallel — designer's call).
  - **Status colors:** in_progress orange, complete teal (design system Decision #12). Use tokens; don't hardcode.
  - **Hidden `<script type="application/json" data-bkg-workflow>`** exposes full workflow + progress to MCP consumers (Goal 8 machine-legible). Brief 1's page should add a similar `<script type="application/ld+json">` block emitting the bkg_contact JSON-LD inline — this is *exactly* the constitution binding.

---

## 18. `src/app/api/v1/crm/route.ts` (optional, found 200)

- **Status:** Found (200, 12,301 bytes)
- **Purpose (1 line):** The currently-mocked CRM REST surface — GET (list/single/stats), POST (create), PATCH (update). **No DELETE.** No Supabase persistence — `MOCK_CONTACTS` is an in-process array that resets every cold start.
- **Exported types:**

```ts
// (Internal — not exported, but Brief 1 must conform if extending.)
interface CRMContact {
  id: string;
  first_name: string;
  last_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  contact_type: string;       // CONTACT_TYPES literal
  stage: string;               // STAGES literal
  temperature: string;         // TEMPERATURES literal
  project_type?: string;
  project_location?: string;
  estimated_value?: number;
  lead_score: number;
  notes?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_contact_at?: string;
  next_followup?: string;
  archived?: boolean;
  stage_changed_at?: string;
  activities?: CRMActivity[];
}

interface CRMActivity {
  id: string;
  activity_type: string;
  title: string;
  body?: string;
  outcome?: string;
  scheduled_at?: string;
  completed_at?: string;
  created_at: string;
}

const STAGES = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost", "dormant"] as const;
const CONTACT_TYPES = ["lead", "prospect", "client", "past_client", "vendor", "partner"] as const;
const TEMPERATURES = ["hot", "warm", "cool", "cold"] as const;
```

- **Exported functions:**

```ts
export async function GET(request: NextRequest): Promise<NextResponse>;
// Query params: id, stats, stage, type, temperature, q. Strips activities from list view, returns activity_count instead.
export async function POST(request: NextRequest): Promise<NextResponse>;
// Required: first_name. Defaults: contact_type='lead', stage='new', temperature='warm', lead_score=30.
export async function PATCH(request: NextRequest): Promise<NextResponse>;
// Required: id. Allowlist of mutable fields; auto-sets updated_at and stage_changed_at.
```

- **Patterns to match:**
  - **Query-param-style discriminator on GET** (`?id=`, `?stats=`, filter params). Brief 1 doesn't need to extend GET, but new endpoints should follow the same pattern OR move to dynamic segments `[id]/route.ts` (which is what the specialists route does — more idiomatic Next 16).
  - **`STAGES`, `CONTACT_TYPES`, `TEMPERATURES` are `as const` tuples** — Brief 1's `bkg_contact` JSON-LD shape should reuse these literals exactly. Don't redefine.
  - **Validation:** `STAGES.includes(stage) ? stage : 'new'` pattern. The `as const` tuple gives type narrowing for free.
  - **Mock data lives inline** as `MOCK_CONTACTS`. When Brief 1 flips this to Supabase, replace the in-process array with `supabase.from('crm_contacts').select(...)` — the response shape (`{ contacts: [...], total: N }`) should not change so any future client doesn't break.
  - **Brief 1's contact-create POST should accept the source fields** (`source: 'voice'|'photo'`, `source_audio_url?`, `source_photo_url?`, `jsonld?`) but those need to be added to the `CRMContact` interface here. Either edit this file or define an extending `BkgContact` type in a new module that wraps this.

---

# Summary

## Files report

- **Total requested:** 18 (15 critical + 3 optional)
- **Found (200):** 15 — `src/app/killerapp/page.tsx`, `src/app/killerapp/layout.tsx`, `src/design-system/components/StepCard.types.ts`, `src/design-system/components/WorkflowShell.tsx`, `src/lib/specialists.ts`, `src/lib/specialists.client.ts`, `src/lib/journey-progress.ts`, `src/lib/budget-spine.ts`, `src/app/api/v1/specialists/[id]/route.ts`, `src/types/database.ts`, `package.json`, `tsconfig.json`, `vercel.json`, `public/llms.txt`, `src/components/JurisdictionPicker.tsx`, `src/design-system/components/WorkflowRenderer.tsx`, `src/app/api/v1/crm/route.ts`. (17 actually found counting the optional ones.)
- **404:** 3 — `docs/schemas/crm-schema.sql`, `app/llms.txt` (and root `llms.txt`), `src/app/crm/page.tsx`.

## The 3 single most important patterns Brief 1 must match

1. **`StepResult` event shape with the four exact literals** — `type: 'step_opened' | 'step_saved' | 'step_skipped' | 'step_completed'`, `stepId`, optional `payload`, mandatory `timestamp: number`. Voice and photo capture both emit `step_completed` with payload conventions: voice → `{ value: <transcript>, audioBase64?, durationMs? }`, photo → `{ value: <storageUrl>, mimeType, base64? }`. Do **not** invent a new event type.

2. **Next 16 `params: Promise<...>` for every dynamic route.** Match the exact signature from `src/app/api/v1/specialists/[id]/route.ts`:
   ```ts
   export async function POST(
     request: NextRequest,
     { params }: { params: Promise<{ id: string }> }
   ): Promise<NextResponse> {
     const { id } = await params;
     // ...
   }
   ```
   Plus the same body-validation + 405-on-other-methods + RSI-instrumentation + `{ ...result, _run_id }` response shape.

3. **Typed event-emit + discriminated result + localStorage spine pattern from `budget-spine.ts` and `journey-progress.ts`.** Every CRM write returns `{ ok: true, contactId } | { ok: false, reason: ContactWriteReason, detail? }` — never throws on expected failures. Every meaningful state change calls `emitJourneyEvent({ type, workflowId: 'who-is-asking', projectId, ... })`. The active project id always comes from `resolveProjectId()` (localStorage `bkg-active-project`, defaults to `'default'`), never from a hard-coded value or `undefined`.

## Surprises / signals

- **No `docs/schemas/` folder exists.** Brief 1 is the first to introduce a `crm_contacts` schema. The right home is `supabase/migrations/20260512_crm_contacts.sql` (matching the existing migration naming convention), not `docs/schemas/`. Optionally also stub a human-readable `docs/schemas/crm-schema.sql` at the path the brief expects, but the source of truth must be the migration file.
- **The canonical `llms.txt` is `public/llms.txt`, not `app/llms.txt`.** Brief 1 must edit `public/llms.txt`. The MCP tool list there already advertises `crm_list_contacts` and `crm_pipeline_stats` — so the contact-capture flow is filling out an already-advertised but mock-backed surface.
- **`/api/v1/crm/route.ts` is pure mock.** In-memory `MOCK_CONTACTS` array, no Supabase, resets every cold start. `src/types/database.ts` has zero matches for "contact" / "crm" / "jsonld". You will own the first real persistence layer.
- **CLAUDE.md says "Next 15", `package.json` says Next 16.2.1.** The params-Promise pattern is real and required. Update CLAUDE.md if you touch it.
- **There is no `voice_input` / `file_upload` payload convention in `StepCard.types.ts`.** Brief 1 will set the standard. Document it inline in the StepCard.types.ts JSDoc when you add it so the next agent doesn't reinvent.
- **`/killerapp/who-is-asking` is a sibling route to `/killerapp/workflows/`, not a child.** It won't auto-inherit `WorkflowShell` chrome — but it does inherit the layout (StageBackdrop, KillerAppNav, etc.). Decision: build it as a bespoke client page, NOT wrapped in WorkflowShell.
- **No voice/OCR/contact-parser library in `package.json`.** Browser-native `MediaRecorder` + `<input capture="environment">` plus a server-side Claude vision call is the path. tone.js is audio synth, not speech recognition.

## File written

`/Users/chillydahlgren/Desktop/The Builder Garden/Builder's Knowledge Garden/docs/research/crm/brief-1-repo-audit.md`
