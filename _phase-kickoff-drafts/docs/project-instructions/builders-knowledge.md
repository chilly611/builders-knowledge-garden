> **DRAFT — for founder review. Not yet canonical.** Proposed final location: `docs/project-instructions/builders-knowledge.md` (pending founder confirmation). Drafted 2026-06 alongside the umbrella and the other two surface files. Nothing here overrides the Platform Constitution; where this draft and the constitution disagree, the constitution and the live code win.

# Builder's Knowledge (Knowledge Garden) — Project Instructions
*v1 · 2026-06 · Tier 2 · governs the knowledge surface of Builder's Knowledge Garden · governed by the Platform Constitution*

> What gets remembered. The Knowledge Garden is the structured, cited, jurisdiction-aware knowledge base — building codes, materials, safety, methods — and the lineage and lessons that make every job start smarter than the last.

## What this product is
"Builder's Knowledge" is the **Knowledge Garden surface** — the *what gets remembered* face of the four-surface system. It is the structured knowledge base behind the platform: building codes, materials, safety regulations, methods, inspections, and permits, organized as queryable entities with citations and jurisdiction, plus the lineage and lessons that accumulate as jobs run.

This surface matters more than any single screen, because **the structured database is the product** (constitution decision 8). Killer App and Dream Machine are interfaces that enter or query this knowledge; the Knowledge Garden is the knowledge. It is the moat.

## Thesis / role in the umbrella
Every garden in the umbrella is, underneath, a Knowledge Garden — a structured knowledge base the other surfaces sit on. Builder's Knowledge is the **reference implementation** of that pattern: if cited, governed, jurisdiction-aware knowledge can be built and trusted for construction compliance, the same engine grows Orchid, Toxicology, Health, and Marketing. The knowledge base is the moat (constitution decision 8); this surface is where the moat is dug, governed, and kept honest.

## Locked decisions (numbered — do not re-litigate unless reopened)
Each is consistent with, and downstream of, the Platform Constitution's numbered decisions; where a constitution decision is cited, it governs.

1. **The structured database is the product; this surface serves it.** UX serves the knowledge, not the reverse. (Constitution decision 8.)
2. **Compliance answers come only from authoritative, structured, cited data,** and are honest about coverage ("verify with your AHJ"). No answer without a citation. (Constitution decision 10.)
3. **Lean residential / light-commercial California,** where coverage is real, rather than claiming nationwide depth we do not have. (Constitution decision 10.)
4. **The human-in-the-loop gate is mandatory, not optional.** Knowledge lands as `status='review'`, goes through an approval queue, and is promoted to `status='published'` with an audit trail. Nothing is served from unreviewed rows. (Constitution: the human-in-the-loop knowledge gate; decision 10.)
5. **Coverage honesty over coverage theater.** The surface tells the truth about what it knows and what it does not. Forty-four jurisdictions today; ~2,256 entities; the surface says so rather than implying omniscience. (Constitution decisions 7, 10.)
6. **Plain language, with the citation attached.** A code answer is readable by a working contractor *and* traceable to its authoritative source. (Constitution decisions 7, 10.)
7. **Reflect feeds the garden.** Lessons synthesized at the end of a job (Killer App, Reflect stage) enter this surface through the same governed gate; lineage is preserved. (Constitution decision 14 — we own the whole journey, including memory.)
8. **Sage is the surface's chrome,** within the herbarium brand lock — the quiet, archival accent of a knowledge surface. (Constitution decision 4.)

## How we work
- **Verify in a real browser.** A code answer is verified by asking it on the live URL and confirming the citation resolves — not by trusting that the row exists.
- **The HITL gate is the working discipline.** Reviewing entities from `status='review'` to `status='published'` is real work on a real queue (the `/admin/verify` page), with attestation against a licensed source. A reviewer stamps a row only after opening it in the authoritative source and confirming the match.
- **Founder dogfood pass every sprint.** Ask the kinds of compliance questions a CA residential GC actually asks; log every wrong, missing, or uncited answer; each becomes the next NOW block.
- **One repo-WRITE lane at a time, PR-only, founder-merged.** Coordinate via `docs/session-log.md`.
- **Never publish unreviewed knowledge.** The prior failure mode was ingestion published without review; closing that gap is both a trust and a scale requirement (constitution: the knowledge gate). Do not bypass the gate, ever.

## Surfaces, chrome & accents
Builder's Knowledge is one of the four named surfaces under the umbrella. Its chrome is **specimen-sage** — the most archival, herbarium-pressed of the palettes, fitting a surface about what is remembered. Light backgrounds always; Archivo for UI, Archivo Black for display; sentence case; no prohibited red `#E8443A`, no pure white (constitution decisions 4, 5).

A code answer presents as a readable statement with its citation and jurisdiction visible, and an honest coverage note where the data is thin — the layout itself communicates "cited and bounded," not "trust me."

## Lanes served
The Knowledge Garden serves **every lane**, because every lane needs to know what is true: the **General Contractor** (beachhead) checking a code mid-job, the **Owner** understanding a requirement, the **Specialty Contractor** and **Architect/Designer** working to the relevant standard, the **Lender** and **Supplier** confirming what a job demands, the **Worker** reaching a safety reg, and the **Robots/AI Agents** lane querying entities via API/MCP (constitution decision 16). The surface is built CA-residential-first, matching the beachhead, but the knowledge it serves is lane-agnostic.

## Primitives it composes from
- **Ask Anything** — the primary way into the knowledge: ask a question, get a cited answer. This is the surface's signature primitive.
- **Time Machine** — knowledge has lineage. The Time Machine lets you see how an entity, a jurisdiction's coverage, or a lesson came to be, and trace its history.
- **Whisper** — a quiet, in-context citation or caveat surfaced at the moment it is relevant, rather than a wall of regulatory text.
- **Progressive Reveal** — a contractor sees the answer first, the citation next, and the full regulatory depth only when they ask for it.
- **Pro Toggle** — one-click plain-language answer, or full manual control to inspect the underlying entities and sources (constitution decision 13).
- **Invitation Card** and **Emotional Arc** appear lightly here; they do more in Killer App and Dream Machine, but the human arc still shapes how a hard compliance answer is delivered.

## Data it reads / writes
- **Primary store:** `knowledge_entities` — ~2,256 entities today (building codes, materials, safety regs, methods, inspections, permits) across 44 jurisdictions. This is the surface's reason to exist.
- **Status lifecycle:** every entity carries a `status`. Ingested knowledge lands as `status='review'` and is promoted to `status='published'` only through the HITL gate. The surface serves only published rows (constitution: the knowledge gate).
- **Attestation:** entities carry `manually_verified_at`, `manually_verified_by`, and `manually_verified_source` — a human reviewer stamps a row after checking it against a licensed source (e.g., UpCodes Essentials). Verified-source counting drives trust signals; attestation is real human verification, not a forged adapter result.
- **Reviewer surface:** the `/admin/verify` page pages through the unverified-but-published working set via a partial index, shrinking as the queue is worked.
- **Audit:** every attestation, promotion, revoke, and delete lands in `audit_log` via the shared `audit_trigger_fn`, with full before/after diffs and `changed_by` — so the provenance of any served answer is reconstructable.
- **Reads:** retrieval over entities (including embedding/hybrid-rerank retrieval) to answer Ask Anything queries, scoped to published, jurisdiction-relevant rows.
- **Lessons in:** synthesized lessons from the Killer App's Reflect stage enter as new entities through the *same* governed gate (constitution decision 14).

(Canonical table and index details live in `docs/SCHEMA.md`, `docs/UPCODES-VERIFICATION.md`, and `docs/EXTERNAL-CODE-SOURCES.md`; this section names what the surface touches.)

## The HITL gate (how knowledge becomes trustworthy)
This surface is where the constitution's human-in-the-loop knowledge gate is the central discipline. The path of a fact:

1. **Ingest** — knowledge enters as `status='review'`. It is not served. (No published-without-review — the prior failure mode.)
2. **Queue** — it appears in the approval/verify queue (`/admin/verify`).
3. **Attest** — a reviewer opens the row's claim in an authoritative licensed source, compares it to what BKG stored, and stamps `manually_verified_*` only if it matches.
4. **Promote** — the row moves to `status='published'` and becomes answerable.
5. **Audit** — every step is captured in `audit_log` with before/after diffs and the reviewer's identity.
6. **Revoke** — a published row can be pulled back; revocation is audited like everything else.

The gate is what lets the surface honor decision 10: compliance answers come *only* from authoritative, cited, reviewed data.

## Citations, jurisdictions & honesty
- **Every compliance answer carries its citation.** No answer is shown without a traceable, authoritative source. An uncited claim is a bug, not a feature (constitution decision 10).
- **Jurisdiction is explicit.** Forty-four jurisdictions are covered today; the answer states which jurisdiction it applies to, and the surface is honest where the asked jurisdiction is not covered.
- **Coverage honesty is the voice.** Where the data is thin or the jurisdiction is out of scope, the surface says "verify with your AHJ" rather than guessing. CA residential / light-commercial is where coverage is real, and the surface leans there deliberately (constitution decision 10).

## AI-native behaviors & voice
- **AI-native, not AI-bolted** (constitution decision 9): retrieval and synthesis over the entity store are how the surface answers, but the AI is bounded by the gate — it can only ground answers in published, cited rows.
- **Grounded-only.** The surface's defining AI behavior is refusal to free-associate: if there is no cited entity, the honest answer is "I don't have that; verify with your AHJ," not a confident guess (constitution decision 10).
- **Voice layer** — the 30+ language voice layer applies, so a worker can ask a safety question hands-busy on site (constitution decision 12).
- **Robots/AI Agents lane** — machine callers can query the knowledge via API/MCP, scoped at the umbrella; they receive the same cited, bounded answers a human does (constitution decision 16).
- **#aikidotheAI** — the surface uses AI to make authoritative knowledge reachable, redirecting the AI wave toward trustworthy answers rather than plausible-sounding ones (constitution decision 17).
- Voice and tone: plain language with the citation attached (constitution decision 7); archival calm; no exclamation points in UI copy, no emoji, no buzzwords. Brand test: a curator at the Royal Botanic Gardens and a staff engineer at Stripe both trust the provenance.

## Machine-legible exposure (Goal 8)
- **API-first**: querying the knowledge base is an endpoint before it is UI, so answers are reachable headlessly and by the Robots/AI Agents lane.
- **Citations travel with the data.** A machine caller receives the citation and jurisdiction alongside the answer, so downstream agents can themselves be honest about provenance.
- **Coverage is discoverable.** The set of covered jurisdictions and the published/review status are exposed in a machine-legible way, so a caller knows the bounds of what it is querying — honesty extends to machines (constitution decision 10).

## Shipping gate / definition of done
A Builder's Knowledge change is done when:

- A compliance question asked on the **live URL** returns an answer **grounded in a published, cited `knowledge_entities` row**, with jurisdiction shown — verified in a real browser, not by grep (constitution decisions 2, 10).
- **No unreviewed knowledge is served.** Anything new went through the HITL gate (`review` → attest → `published`) with an audit trail (constitution: the knowledge gate).
- The surface is **honest about coverage**: out-of-scope jurisdictions get "verify with your AHJ," not a guess.
- The **Pro Toggle** works: plain-language answer and full inspection of underlying entities/sources both available (constitution decision 13).
- The brand lock holds (specimen-sage on light backgrounds, Archivo, sentence case, no prohibited red or pure white).
- A founder dogfood pass asked real CA-residential compliance questions and logged any uncited, wrong, or missing answer.

## Cross-references
- Governing document → `docs/PLATFORM-CONSTITUTION.md`
- Umbrella shell / account / cross-surface nav → `docs/project-instructions/kg-umbrella.md`
- Do-the-work surface (queries this knowledge for compliance) → `docs/project-instructions/killer-app.md`
- Generative surface → `docs/project-instructions/dream-machine.md`
- Governed ingestion gate → `docs/code-ingestion-hitl.md` *(planned; referenced by the constitution)*
- Licensed-source verification → `docs/UPCODES-VERIFICATION.md`
- External code sources → `docs/EXTERNAL-CODE-SOURCES.md`
- CA contractor compliance context → `docs/CA-HIC-COMPLIANCE.md`
- Schema (knowledge_entities, indexes, audit) → `docs/SCHEMA.md`

## Open questions for the founder
1. **Reviewer capacity.** The HITL gate's throughput is bounded by reviewer time (today, the owner with a licensed seat). Is there a plan to add reviewers, and does the surface need a multi-reviewer queue and roles before then?
2. **Jurisdiction expansion order.** Beyond the 44 covered, what is the priority order for new jurisdictions, and is expansion demand-driven (where GCs actually work) or coverage-driven?
3. **Surfacing coverage to users.** How explicitly should the live surface show "here is what we cover / don't"? A visible coverage map builds trust but also advertises the gaps.
4. **Lessons re-entry rules.** When Reflect-stage lessons enter the gate, do they get the same licensed-source attestation standard as code entities, or a separate "field-learned" trust tier with its own labeling?
5. **Embedding/retrieval freshness.** When a row is revoked or re-attested, what is the required latency before the change is reflected in retrieval answers — immediate, or acceptable to lag a rebuild?
