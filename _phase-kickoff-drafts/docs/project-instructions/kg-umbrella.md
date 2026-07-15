> **DRAFT — for founder review. Not yet canonical.** Proposed final location: `docs/project-instructions/kg-umbrella.md` (pending founder confirmation). Drafted 2026-06 alongside the three surface files. Nothing here overrides the Platform Constitution; where this draft and the constitution disagree, the constitution and the live code win.

# Knowledge Gardens (Umbrella) — Project Instructions
*v1 · 2026-06 · Tier 2 · governs the umbrella shell and cross-garden concerns · governed by the Platform Constitution*

> One engine, many gardens. The umbrella is the shell that lets a person move between gardens and surfaces, holds their account, and keeps every garden honest to the same brand and the same gate.

## What this product is
The umbrella is not a fourth surface with its own job-to-be-done — it is the **shell** the other three surfaces live inside, plus the **operating stance** for running more than one garden on one engine. Concretely, the umbrella owns:

- **Cross-surface navigation** — the way a signed-in person moves between Killer App, Dream Machine, and Knowledge Garden inside a single garden, and (later) between gardens.
- **Account, identity, billing, settings** — who you are, what you can see, what you pay for, how the product behaves for you.
- **The garden registry** — which gardens exist (Builder's, Orchid, Toxicology, Health, Marketing…), their state (live / building / planned), and which surfaces each one turns on.
- **The shared production posture** — one Supabase production project, multi-tenant isolation, governed ingestion, observability — that lets a second and tenth garden ship without a second and tenth rebuild.

The operator entity behind the umbrella is **XRWorkers**.

## Thesis / role in the umbrella
One engine powers all the gardens. **Money gardens fund meaning gardens** — Builder's Knowledge Garden is the flagship revenue garden, and proving the engine ships, functions, and *scales* in construction is what unlocks investment for the whole umbrella (constitution, umbrella thesis + decision 15). Orchid is live; Toxicology, Health, and Marketing are gardens the same engine is built to grow.

The umbrella's job is to make that "one engine, many gardens" claim *true in the product*, not just on a slide: a new garden should be a configuration of the engine, not a fork of it. The structured knowledge base is the moat (constitution, decision 8); the umbrella is what lets that moat be reused.

## Locked decisions (numbered — do not re-litigate unless reopened)
These are umbrella-level commitments. Each is consistent with, and downstream of, the Platform Constitution's numbered decisions; where a constitution decision is cited, it governs.

1. **The umbrella is a shell, not a product.** It has no lifecycle of its own and competes with nothing. Its quality bar is "you never feel lost moving between surfaces or gardens." (Serves constitution decision 14 — we own the whole journey, including the seams.)
2. **One engine, many gardens — gardens are configuration, not forks.** A new garden is spun up by registering it and turning on surfaces, not by copying the codebase. (Codifies the umbrella thesis and decision 15.)
3. **One shared Supabase production project; tenant isolation is the boundary.** Gardens and accounts are isolated by row-level tenancy and generalized context-routing, never by a separate stack per garden. (Constitution decision 15.)
4. **Four named surfaces, one account.** Killer App, Dream Machine, Knowledge Garden, and the umbrella shell share a single sign-in and a single identity. Signing into a garden signs you into all of its surfaces. (Supports constitution decision 2 — the real signed-in loop is the gate.)
5. **The umbrella inherits the brand lock verbatim.** Herbarium palette, light backgrounds always, Archivo / Archivo Black, sentence case, no "CRM" in user copy, prohibited red `#E8443A` and pure white. The umbrella chrome is **ink-sepia on paper-cream** — the quietest chrome, so the surfaces' accents read. (Constitution decisions 4, 5, 6, 7.)
6. **Every garden ships behind the same gate.** No garden goes live until its real signed-in loop works end to end (sign in → open → run → save → leave → return → resume; persists). MLP, never MVP. (Constitution decisions 1, 2.)
7. **Governed ingestion is a platform service, not a per-garden bolt-on.** Every garden's knowledge lands as `status='review'` and is promoted through the human-in-the-loop gate with an audit trail. The umbrella owns the gate; gardens own their queues. (Constitution: the human-in-the-loop knowledge gate; decision 10.)
8. **Observability is umbrella-level.** Cross-garden health, event volume, and the RSI loop data are visible from one place. All features emit events. (Constitution decision 15; see `docs/OBSERVABILITY.md`.)
9. **Voice and machine access are platform layers, declared once at the umbrella.** The 30+ language voice layer and the Robots/AI Agents lane (API/MCP) are platform capabilities every garden inherits, not features re-invented per garden. (Constitution decisions 12, 16.)

## How we work
The umbrella is where the constitution's working values land as concrete shell behavior:

- **Verify in a real browser.** The seam between two surfaces is exactly where things silently break. Umbrella changes are verified by signing in and *walking* the nav across all four surfaces on the live URL — not by grep, not by a smoke probe.
- **One repo-WRITE lane at a time.** The umbrella shell touches global layout and account, so it is the highest-blast-radius area in the repo. Umbrella edits stay PR-only, founder-merged, with every other agent read-only / plan-only. Coordinate via `docs/session-log.md`.
- **Never mutate shared production unsupervised.** The umbrella is literally the shared-production layer — its Vercel domains, env vars, and the single Supabase project. Back up and git-tag before risky changes; freeze during demos.
- **Tightly scope every umbrella task.** Because the shell is global, "while I was in there" edits are the known failure mode. Refuse out-of-scope file changes and flag them.

## Surfaces, chrome & accents
The umbrella holds the four-surface system and assigns each its chrome:

| Surface | Job-to-be-done | Accent |
| --- | --- | --- |
| **Killer App** | What gets done today | specimen-teal `#3C7A8A` + specimen-rust `#A53A2D` |
| **Dream Machine** | What gets imagined | specimen-brass `#B08D5C` + specimen-amber `#C68A3D` |
| **Knowledge Garden** ("Builder's Knowledge") | What gets remembered | specimen-sage |
| **Umbrella** | Cross-surface nav, account, settings | ink-sepia on paper-cream |

The umbrella chrome is deliberately the quietest. When you are in account or settings, the surface accents recede; when you cross into a surface, its accent comes forward. Light backgrounds always; the teal `#3C7A8A` and rust `#A53A2D` are the herbarium constants the whole system shares.

## Lanes served
The umbrella serves **all nine lanes** because it is the shell every lane signs into (constitution decision 16): Owner, General Contractor (the beachhead), Specialty Contractor, Architect/Designer, Lender, Supplier, Equipment/Service Provider, Worker, and Robots/AI Agents (the API/MCP lane). The umbrella's specific responsibility is making sure a person in any lane sees the surfaces and gardens appropriate to them, and nothing they shouldn't — lane and tenant are enforced at the shell, not re-checked ad hoc in each surface.

## Primitives it composes from
The umbrella is mostly the frame around the primitives, but two of the seven live here as shell-level infrastructure:

- **Progressive Reveal** — the umbrella decides how much of the four-surface, multi-garden world a new account sees first, and reveals more as they go. A first-day GC should not see ten gardens.
- **Pro Toggle** — visible on every screen, including account and settings, so one-click convenience and full manual control are a shell-level guarantee, not a per-surface afterthought (constitution decision 13).

The remaining five primitives — Invitation Card, Emotional Arc, Whisper, Time Machine, Ask Anything — are composed *inside* the surfaces; the umbrella's job is only to not get in their way.

## Data it reads / writes
- **Reads:** the account/identity record, the garden registry, tenant membership, and entitlements (what this account can see and is paying for). The umbrella reads broadly and writes narrowly.
- **Writes:** account and settings changes, billing state, and the navigation/last-place state that lets "leave and return" land you where you were (constitution decision 2).
- **Shared production:** one Supabase project. Cross-garden isolation is by row-level tenancy on the shared tables, not separate databases. The umbrella never reads another tenant's rows.
- **Audit:** account, entitlement, and tenancy changes are auditable on the same pattern the rest of the platform uses (`audit_log` via the shared audit trigger), so "who changed this account's access" always has an answer.

## Spinning up a new garden
This is the umbrella's signature workflow and the proof of "one engine, many gardens." A new garden is *registered and configured*, never forked:

1. **Register** the garden in the registry (name, slug, state = `building`).
2. **Choose its surfaces.** Not every garden turns on all three; a reference garden might be Knowledge-Garden-only at first, a revenue garden turns on all three.
3. **Point it at its knowledge.** The garden's entities flow through the *same* governed ingestion path — landing as `status='review'`, promoted through the HITL gate. No garden ships published-without-review (constitution: the knowledge gate).
4. **Assign its chrome** from the herbarium palette, within the brand lock.
5. **Walk the gate.** The garden flips to `live` only when its real signed-in loop works end to end. Orchid is live by this bar; Builder's is the flagship; the rest are `building` or `planned`.

The test of the engine is that step 1–5 is a configuration exercise, not an engineering project.

## AI-native behaviors & voice
- The umbrella is **AI-native, not AI-bolted** (constitution decision 9): the shell itself can be navigated by asking (Ask Anything reaches across surfaces from the umbrella), and AI is assumed present in every garden, not added later.
- **Voice is a universal layer** declared at the umbrella — 30+ languages, designed-in (constitution decision 12). A garden inherits voice; it does not build it.
- **Machine callers are first-class at the umbrella.** The Robots/AI Agents lane (constitution decision 16) authenticates and is scoped at the shell, so an API/MCP caller is subject to the same tenant isolation as a human.
- **#aikidotheAI** — the umbrella's stance toward the AI wave is to redirect it as a multiplier for the person's goals, across every garden (constitution decision 17).
- Voice and tone: plain language; ink-sepia calm; the umbrella never shouts. No exclamation points in UI copy, no emoji, no buzzwords. Brand test: a curator at the Royal Botanic Gardens and a staff engineer at Stripe would both trust the seams.

## Machine-legible exposure (Goal 8)
The umbrella is where the platform's machine-legibility commitment is enforced as policy, even though most exposed endpoints belong to the surfaces:

- The **garden registry, surface map, and lane model** are exposed in a machine-readable form so an agent can discover which gardens and surfaces exist and what it is allowed to touch.
- **Tenant and lane scoping is declared once** and applies to every machine caller, so "what can this agent see" has a single, auditable answer.
- **API-first holds at the shell:** account, entitlement, and navigation state are reachable as endpoints before they are UI, consistent with the platform's API-first stance.

## Shipping gate / definition of done
An umbrella change is done when:

- A signed-in person can move across all four surfaces and (where applicable) between gardens without losing context, on the **live URL**, verified in a real browser.
- **Leave-and-return works:** sign out or close, come back, and you land where you were, with your garden and surface intact (constitution decision 2).
- **Tenant isolation holds:** no account can see another tenant's gardens, projects, or knowledge. This is checked, not assumed.
- The brand lock holds on every umbrella surface (light backgrounds, herbarium palette, Archivo, sentence case, no prohibited red or pure white).
- The change emitted its events and is visible in cross-garden observability.
- A founder dogfood pass crossed the seams as a real user and logged any break.

## Cross-references
- Governing document → `docs/PLATFORM-CONSTITUTION.md`
- Sibling surface instructions → `docs/project-instructions/killer-app.md`, `docs/project-instructions/builders-knowledge.md`, `docs/project-instructions/dream-machine.md`
- Strategy → `docs/STRATEGY-bulletproof-and-scale.md`
- Repos / worktrees / deploy / access → `docs/REPO-AND-WORKTREE-MAP.md`
- Observability → `docs/OBSERVABILITY.md`
- Schema (shared production) → `docs/SCHEMA.md`
- Governed ingestion gate → `docs/code-ingestion-hitl.md` *(planned; referenced by the constitution)*
- Interface behavior → `docs/INTERFACE-PROTOCOLS.md` *(planned; referenced by the constitution)*

## Open questions for the founder
1. **Garden registry — where does it live?** Is the list of gardens a config file in the repo, a Supabase table, or both? This determines whether "spin up a garden" is a deploy or a row insert.
2. **Cross-garden nav — now or later?** Today the four surfaces relate *inside* Builder's. Is there a near-term need to switch *between* gardens (e.g., a user with Builder's + Orchid) in the umbrella nav, or is that explicitly post-flagship?
3. **Entitlements model.** Are surfaces (Dream Machine, Killer App) independently entitled, or does a garden seat grant all three? This shapes both billing and the Pro Toggle behavior.
4. **Tenant granularity.** Is the tenant the organization, the garden, or the (org × garden) pair? The isolation rules in decision 3 depend on this answer.
5. **Operator surfacing.** Should XRWorkers appear anywhere user-facing (footer, billing, legal), or stay strictly an internal/operating entity?
