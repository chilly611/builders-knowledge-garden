# The Knowledge Gardens — Platform Constitution
*v2 · 2026-06 · Tier 0 · governs every garden · supersedes v1*

> **This supersedes the stale v1** (DREAM→GROW, "AI COO," 40k/142 counts, red chrome, white backgrounds, "Akida"). Where any older doc disagrees with this file or the live product, **this file and the code are the truth.**

## What the platform is
An AI-native operating system that turns expert knowledge into **structured, queryable, commercially-linked experiences** — one engine, many gardens. **Builder's Knowledge Garden** (the Killer App for construction) is the flagship revenue garden. Money gardens fund meaning gardens. **The structured knowledge base is the moat;** every interface exists to enter or query it.

## The umbrella thesis
One engine powers all the gardens — Builder's, Orchid (live), Toxicology, Marketing, and more. Proving the engine ships, functions, and **scales** in construction is what proves the platform — and unlocks investment for the whole umbrella.

## Locked decisions (numbered — do not re-litigate unless explicitly reopened)
1. **MLP, not MVP.** Minimal *Lovable* Product is the gate.
2. **The real signed-in loop is the shipping gate.** Smoke-test green ≠ product works. The loop: sign in → open a project → run a workflow → save → leave → return → resume; entries persist and survive reload.
3. **Seven-stage Killer App lifecycle (names locked):** Size Up → Lock → Plan → Build → Adapt → Collect → Reflect. Dream and Design are freely navigable, not lifecycle-gated.
4. **Herbarium brand. Light backgrounds always — never dark.** Cream/parchment, teal `#3C7A8A`, rust `#A53A2D`, sage, gold. **Prohibited:** red `#E8443A`, pure white.
5. **Typography:** Archivo (body/UI), Archivo Black (display). Global, no exceptions.
6. **No "CRM" in user-facing copy.** The pipeline tool is "Pipeline" / "Command Center."
7. **Plain language** accessible to anyone — no jargon-without-translation on any user-facing surface.
8. **The structured database *is* the product.** UX serves the database, not the reverse.
9. **AI-native, not AI-bolted.** AI is woven into every feature from the start.
10. **Compliance answers come only from authoritative, structured, cited data**, honest about coverage ("verify with your AHJ"). Lean residential / light-commercial California, where coverage is real.
11. **Platform-authored contract TEMPLATES require legal review before the first paid sale.** The e-signature **mechanism** (the GC signs their *own* documents) ships now; templates wait.
12. **Voice is a universal layer** (30+ languages) — designed-in, on the roadmap.
13. **Professionals get one-click convenience AND full manual control.**
14. **We own the full lifecycle/journey,** not a feature sliver. Competitors own slivers; we own the job.
15. **Scalability is a first-class requirement, not an afterthought:** multi-tenant isolation, generalized context-routing, governed ingestion, observability. *(Codifies the current mission.)*
16. **Nine lanes, one source of truth** (as shipped): Owner, General Contractor, Specialty Contractor, Architect/Designer, Lender, Supplier, Equipment/Service Provider, Worker, and Robots/AI Agents (the API/MCP lane). **GC is the beachhead.**
17. **#aikidotheAI** — spelled "aikido" (the martial art). Redirect the AI wave as a multiplier for builders' goals.
18. Visual-first, within the brand lock. Every surface earns its keep visually — branded imagery and motion we author, plus context-generated visuals (e.g., the Budget / Business Class / First-Class Luxury tiers rendered as real architectural options in distinct styles, generated from what we know about the user and their choices). Visual richness, animation, and expressive use of the herbarium palette serve the user's sense of agency — they carry the user forward through the work and hide exposition and the pain of labor. The brand lock governs the look (light backgrounds always, herbarium palette, no pure white, no red #E8443A, Archivo): generated content fills the system, it never overrides it. Generated imagery is labeled concept/inspiration, never an actual permitted design. We accept higher generation cost and authoring effort as the price of a premium, lovable product (decision 1, MLP). Practice — generation contract, caching, styles, fallbacks — lives in the per-product instructions and the design system.
19. The engine's judgment is legible: green flags, red flags, and a deeper dive. The platform surfaces opportunity and risk as plain, scannable signals — GREEN for ease, upside, and location-inherent advantages; RED for schedule, cost, code/permit, and difficulty risk — visually and everywhere, not buried in prose. A "go deeper" option runs a fuller pass for more flags and the variables anyone weighs before a project. Because LLM output varies run-to-run, we DIRECT the model toward a required structured output (the flag set) rather than chase determinism, and we SAVE the first good result rather than regenerate (decisions 2, 8). Flags that assert code, permit, or cost facts inherit decision 10: cited or honestly hedged ("verify with your AHJ"). Market and opportunity reads are labeled as the engine's judgment, not fact.

## How we work (the values, hard-won)
- **Verify in a real browser** — not by grep, not by smoke probe. Fetch the live URL.
- **Founder dogfood pass every sprint** — use the product as a contractor on a real-feeling job; log every break; breaks become the next NOW block.
- **One repo-WRITE lane per repo at a time** — own worktree off current `main`, PR-only, founder merges. Every other agent stays read-only / plan-only. Coordinate via `session-log` so the two fronts don't collide.
- **Never mutate shared production unsupervised** — the Vercel domains, env vars, brand assets, or the demo DB rows.
- **Back up + git-tag before risky changes;** rollback = reset to the tag + CLI redeploy.
- **Freeze production during demos.**
- **The repo is the source of truth.** `docs/session-log.md` is the canonical timeline; every session appends and pushes. `tasks.todo.md` keeps a NOW block; `tasks.lessons.md` is updated after any correction.
- **Tightly scope every agent task; flag and refuse out-of-scope file changes.** (Known failure mode: agents adding out-of-scope files or over-editing.)
- **Don't chicken out on principles.** Blunt is load-bearing.

## The human-in-the-loop knowledge gate (standard, not optional)
Code/knowledge ingestion lands as `status='review'` → an approval queue → promoted to `status='published'` with an audit trail. *(Current gap: prior ingestion was published without review. Closing this is both a trust and a scale requirement; spec lives at `docs/code-ingestion-hitl.md`.)*

## Cross-references
- Strategy → `STRATEGY-bulletproof-and-scale.md`
- Repos / worktrees / deploy / access → `REPO-AND-WORKTREE-MAP.md`
- Session ritual & starters → `SESSION-PROMPTS.md`, `MANUAL-RSI-PROTOCOL.md`
- Interface behavior → `INTERFACE-PROTOCOLS.md`
- Per-product → the Project-Instructions for KG Umbrella, Builder's Knowledge, Killer App, Dream Machine.
