> **DRAFT — for founder review. Not yet canonical.** Proposed final location: `docs/project-instructions/killer-app.md` (pending founder confirmation). Drafted 2026-06 alongside the umbrella and the other two surface files. Nothing here overrides the Platform Constitution; where this draft and the constitution disagree, the constitution and the live code win.

# Killer App — Project Instructions
*v1 · 2026-06 · Tier 2 · governs the do-the-work surface of Builder's Knowledge Garden · governed by the Platform Constitution*

> What gets done today. The Killer App is where a contractor runs the actual job — the instrumented, lifecycle-driven surface that turns a project into work that moves and persists.

## What this product is
The Killer App is the **operational surface** of Builder's Knowledge Garden: dashboards, the project lifecycle, and the instrumentation that makes a real job legible and movable. Where Dream Machine asks "what could this be" and Knowledge Garden answers "what do we know," the Killer App answers **"what do I do next, and did it stick."**

It is the surface that owns the **whole journey** of a construction project (constitution decision 14), not a feature sliver. It is also the surface the entire platform is judged on: proving the engine ships, functions, and *scales* in construction is what unlocks the umbrella (constitution, umbrella thesis).

## Thesis / role in the umbrella
Builder's Knowledge Garden is the flagship revenue garden, and the Killer App is its beating heart — the place value is delivered and the place money is made. If the Killer App's real signed-in loop works for a general contractor on a real-feeling job, the platform's core claim is proven and the meaning gardens get funded (constitution, umbrella thesis; money gardens fund meaning gardens).

## Locked decisions (numbered — do not re-litigate unless reopened)
Each is consistent with, and downstream of, the Platform Constitution's numbered decisions; where a constitution decision is cited, it governs.

1. **The seven-stage lifecycle, names locked:** Size Up → Lock → Plan → Build → Adapt → Collect → Reflect. These names ship verbatim. (Constitution decision 3.)
2. **Dream and Design are freely navigable, not lifecycle-gated.** The lifecycle structures *the work*; it does not trap a user who wants to imagine or design. Dream lives in Dream Machine; the lifecycle stages do not lock those doors. (Constitution decision 3.)
3. **The real signed-in loop is this surface's shipping gate.** Sign in → open a project → run a workflow → save → leave → return → resume; entries persist and survive reload. A green smoke test is not the gate. (Constitution decisions 1, 2.)
4. **General Contractor is the beachhead; Owner is the second seat.** The Killer App is built first for the GC running the job, with the Owner as the adjacent lane it must also serve well. (Constitution decision 16.)
5. **No "CRM" anywhere a user can read.** The relationship/contact surface is "Pipeline" or "Command Center." (Constitution decision 6.)
6. **Compliance answers in the Killer App come only from the Knowledge Garden's cited data,** honest about coverage, with "verify with your AHJ" where coverage is thin. The Killer App never free-associates a code answer. (Constitution decision 10; the data lives in `builders-knowledge.md`.)
7. **Contract TEMPLATES wait for legal review; the e-signature mechanism ships now.** The GC signs their *own* documents today; platform-authored templates do not ship before legal review and the first paid sale. (Constitution decision 11; see `docs/SIGNATURE-SERVICES.md`.)
8. **Professionals get one-click convenience AND full manual control,** on every workflow. The Pro Toggle is visible on every screen. (Constitution decision 13.)
9. **Every workflow emits events.** The lifecycle is instrumented end to end so the RSI loop has real data; instrumentation is not optional polish. (Constitution decisions 9, 15.)

## How we work
- **Verify in a real browser.** "It works" means: signed in, on the live URL, a project opened, a workflow run, a save made, the tab closed, reopened, and the entry still there. Grep and smoke probes do not count (constitution decision 2).
- **Founder dogfood pass every sprint.** Run the Killer App as a contractor on a real-feeling job. Every break becomes the next NOW block in `tasks.todo.md`.
- **One repo-WRITE lane at a time, PR-only, founder-merged.** The Killer App is the largest surface; keep edits scoped to the worktree off current `main` and coordinate via `docs/session-log.md`.
- **Never mutate the demo DB rows or production env unsupervised.** Freeze production during demos. Back up and git-tag before risky lifecycle or schema changes.
- **API-first.** Each lifecycle stage and workflow is an endpoint before it is a screen, so the loop is testable headlessly and reachable by the Robots/AI Agents lane.

## Surfaces, chrome & accents
The Killer App is one of the four named surfaces under the umbrella. Its chrome is **specimen-teal `#3C7A8A`** with **specimen-rust `#A53A2D`** as the action/alert accent — the most "engineered" of the four palettes, fitting a surface about getting work done. Light backgrounds always; Archivo for UI, Archivo Black for display; sentence case; no prohibited red `#E8443A`, no pure white (constitution decisions 4, 5).

Within the surface, the seven stages are the primary spatial structure: a project moves through Size Up → Lock → Plan → Build → Adapt → Collect → Reflect, with the current stage foregrounded and the rest legible as where-you've-been and where-you're-going.

## Lanes served
Primary: **General Contractor** (the beachhead) and **Owner**. The Killer App is where a GC runs the job and an Owner watches it move. The other lanes — Specialty Contractor, Architect/Designer, Lender, Supplier, Equipment/Service Provider, Worker — appear as participants the GC coordinates *through* the lifecycle (subs bid in, suppliers fulfill, lenders fund draws), and the **Robots/AI Agents** lane reaches the same lifecycle via API/MCP (constitution decision 16). The surface is designed GC-first; serving the other lanes well is how we own the whole journey rather than a sliver (constitution decision 14).

## Primitives it composes from
All seven primitives appear here; the Killer App is where they do the most operational work:

- **Time Machine** — platform infrastructure, and the spine of the lifecycle. Every stage transition, save, and adaptation is a point on the project's timeline you can move along.
- **Emotional Arc** — the human emotional arc is the default. The Killer App acknowledges that running a job is stressful; the arc shapes how progress and setbacks are surfaced.
- **Whisper** — quiet, in-context guidance at the moment a stage needs a decision, never a wall of text.
- **Ask Anything** — ask the project a question and get an answer grounded in its own data and the Knowledge Garden's cited entities.
- **Invitation Card** — how subs, owners, lenders, and other lanes are brought into a project's lifecycle.
- **Pro Toggle** — on every screen: one-click default, full manual control underneath (constitution decision 13).
- **Progressive Reveal** — a new GC sees Size Up first, not all seven stages and every workflow at once.

## Data it reads / writes
- **Primary store:** `command_center_projects` is the live project record the lifecycle reads and writes. Project state, stage, and the work within each stage persist here so leave-and-return works (constitution decision 2).
- **Writes:** project creation and stage transitions; the workflow outputs of each stage — budget lines (`project_budget_lines`, the canonical budget store), change orders, RFIs, submittals, punch items, sub bids, vendors, invoices, signed documents and signature events. Budget autosave is debounced (~500 ms) and high-volume during active editing.
- **Reads (compliance):** the Knowledge Garden's `knowledge_entities` for cited code/material/safety answers — only published, cited rows, honest about coverage (constitution decision 10).
- **Events:** the lifecycle emits to the platform event/RSI stream (`rsi`, plus surface-specific event tables like `xp_events`) so every workflow feeds the RSI loop (constitution decisions 9, 15).
- **Audit:** mutations land in `audit_log` via the shared `audit_trigger_fn`, so "who changed this project, and when" always has an answer.

(Canonical table details live in `docs/SCHEMA.md`; this section names what the surface touches, not the full schema.)

## The lifecycle, stage by stage
The seven stages are the locked structure of the do-the-work surface. Names are fixed (constitution decision 3); the descriptions below are how each stage shows up to a GC.

1. **Size Up** — understand the job before committing. Scope, site, constraints, a first read on feasibility. Pulls Knowledge Garden context (codes, jurisdiction) so the GC sizes against reality.
2. **Lock** — commit the job. Scope and terms settle; this is where the e-signature *mechanism* applies (the GC signs their own documents — constitution decision 11). After Lock, the job is real.
3. **Plan** — turn the locked job into a plan: budget lines, schedule, the subs and suppliers needed. The estimating/takeoff and budget workflows live here.
4. **Build** — execute. The day-to-day: daily logs, RFIs, submittals, sub coordination, draws. This is the longest-lived stage and where most events fire.
5. **Adapt** — the job changed (it always does). Change orders, schedule impacts, cost deltas — the structured response to reality moving. Adapt is not failure; it is the instrumented loop that keeps the job honest.
6. **Collect** — get paid and close financial loops. Invoices, draws, retainage, lien waivers — the money side of finishing.
7. **Reflect** — what did we learn. Lessons are synthesized and flow into the Knowledge Garden so the next job starts smarter. Reflect is the bridge from "what got done" to "what gets remembered."

Dream and Design sit *outside* this gating: a GC can imagine or design at any point without the lifecycle blocking them (constitution decision 3).

## The signed-in loop (the gate, in detail)
This surface is where the constitution's shipping gate (decision 2) is most literally tested. The loop, fully:

1. **Sign in** (one account, shared across all four surfaces via the umbrella).
2. **Open a project** from the Command Center.
3. **Run a workflow** inside a stage (e.g., add budget lines in Plan, log an RFI in Build).
4. **Save** — explicitly or via autosave.
5. **Leave** — close the tab, sign out, walk away.
6. **Return** — come back later, sign in.
7. **Resume** — the project is where you left it; the entries persist and survive reload.

If any step fails, the surface is not shippable, regardless of what a smoke test says (constitution decision 1 — MLP, never MVP).

## AI-native behaviors & voice
- **AI-native, not AI-bolted** (constitution decision 9): every stage has AI woven in — Size Up reads the job against codes, Plan drafts estimates, Adapt analyzes change-order impact, Reflect synthesizes lessons. AI is assumed, not added.
- **Compliance is grounded.** Any code or safety answer in the Killer App comes from the Knowledge Garden's cited `knowledge_entities`, honest about coverage, "verify with your AHJ" where thin (constitution decision 10). The Killer App never invents a citation.
- **Voice layer** — the 30+ language voice layer applies here so a job can be run hands-busy, on a site (constitution decision 12).
- **Robots/AI Agents lane** — the lifecycle is reachable by machine callers via API/MCP, scoped at the umbrella (constitution decision 16).
- **#aikidotheAI** — AI redirects the wave as a multiplier for the builder's goal; it amplifies the GC's judgment, never replaces it (constitution decision 17).
- Voice and tone: plain language a working contractor reads without a glossary (constitution decision 7); no exclamation points in UI copy, no emoji, no buzzwords. Brand test: a curator at the Royal Botanic Gardens and a staff engineer at Stripe both respect it.

## Machine-legible exposure (Goal 8)
- **API-first**: each lifecycle stage and workflow is an endpoint before it is UI, so the loop is callable headlessly.
- The **Robots/AI Agents lane** (constitution decision 16) can drive a project through the lifecycle via API/MCP, scoped and tenant-isolated at the umbrella.
- **Events are machine-legible**: the RSI event stream the lifecycle emits is structured for downstream consumption, so the loop data is usable, not just logged (constitution decision 15).

## Shipping gate / definition of done
A Killer App change is done when:

- The **full signed-in loop** (above) works end to end on the **live URL**, verified in a real browser — not by grep, not by smoke probe (constitution decision 2).
- Entries **persist and survive reload**; leave-and-return lands the GC where they were.
- Any compliance answer shown is **sourced from cited `knowledge_entities`**, honest about coverage (constitution decision 10).
- The **Pro Toggle** is present and functional on the screen, with both one-click and manual paths working (constitution decision 13).
- The workflow **emitted its events** to the RSI stream and mutations hit `audit_log`.
- The brand lock holds (specimen-teal/rust on light backgrounds, Archivo, sentence case, no prohibited red or pure white).
- A founder dogfood pass ran the workflow as a contractor and logged any break.

## Cross-references
- Governing document → `docs/PLATFORM-CONSTITUTION.md`
- Umbrella shell / account / cross-surface nav → `docs/project-instructions/kg-umbrella.md`
- Knowledge surface (the cited data this surface reads) → `docs/project-instructions/builders-knowledge.md`
- Generative surface (where projects originate) → `docs/project-instructions/dream-machine.md`
- E-signature mechanism vs. templates → `docs/SIGNATURE-SERVICES.md`
- CA contractor compliance context → `docs/CA-HIC-COMPLIANCE.md`
- Schema (project + lifecycle tables) → `docs/SCHEMA.md`
- Observability → `docs/OBSERVABILITY.md`
- Interface behavior → `docs/INTERFACE-PROTOCOLS.md` *(planned; referenced by the constitution)*

## Open questions for the founder
1. **Stage advancement — strict or soft?** Can a project skip from Plan to Collect, or are transitions enforced forward-only with required exits per stage? This shapes the lifecycle UI and the data model.
2. **Owner seat scope.** How much of the lifecycle does the Owner see and act on — read-only visibility into Build, or active participation in Lock and Collect (approvals, draws)?
3. **Where does a project enter the lifecycle?** Does every project start at Size Up, or can a Dream Machine project arrive pre-populated into Plan (see the Dream Machine handoff question)?
4. **Multi-project Command Center.** Is the Command Center a single-project cockpit or a portfolio view across many jobs? Affects the "open a project" step of the gate.
5. **Reflect → Knowledge Garden flow.** When a job's lessons are synthesized in Reflect, do they auto-enter the Knowledge Garden's HITL review queue, or does the GC explicitly publish them?
