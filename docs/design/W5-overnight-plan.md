# Overnight plan — 2026-04-20 → 21

Kicked off while founder sleeps. Six parallel agents, one integrator pass (me) when they return.

## Decisions locked before launch

1. **Demo anchor for tomorrow:** Supply Ordering (q11) as the ResourceBroker showcase.
2. **Resource broker scope tonight:** spec + scaffolded route + **live web search**.
3. **Logomark direction:** AI-generated photoreal engraved-plate references (8–12 candidates, picker to compare).
4. **RSI tonight:** structured event log of every specialist run (Supabase `specialist_runs`).
5. **Palette update:** Blueprint Navy lifted to `#1B3B5E`; Robin's Egg `#7FCFCB` + Deep Orange `#D9642E` added as the **peak pair** (moment punctuation only, never everyday chrome).

## Six agents, one integrator pass

| # | Task | Agent | Isolation | Deliverable |
| --- | --- | --- | --- | --- |
| W5.A | ResourceBroker module (live web search, Supabase event log) | general-purpose | worktree | `src/lib/resource-broker/*` — types, search(), demo fixtures |
| W5.B | Supply Ordering (q11) rewrite with design system + broker | general-purpose | worktree | `SupplyOrderingClient.tsx` polished to new palette + motifs, broker integrated |
| W5.C | Photoreal logomark candidates | general-purpose | none | `design-assets/logomark/*.{png,webp}` + `logomark-picker.html` |
| W5.D | `bkg-design` skill scaffold | general-purpose | none | `/sessions/serene-wonderful-feynman/mnt/.claude/skills/bkg-design/` with SKILL.md + references/ + assets/ |
| W5.E | Compass close-out ritual spec | general-purpose | none | `compass-closeout-spec.md` + asset pipeline notes |
| W5.F | RSI event-log instrumentation | general-purpose | worktree | Supabase migration + specialist-runner hook + TS types |
| W5.G | Integrate + commit + bundle | me | — | atomic commits per agent, re-bundle, docs updated |

## Contracts handed to agents

- `design-moodboard-v1.md` — palette + motifs + animation register + typography (updated with peak pair tonight)
- `resource-broker-contract.md` — the shared interface both W5.A and W5.B build against
- `tasks.lessons.md` — 30+ prior lessons including the "farm worksheet" rule requiring in-spec event shapes + per-agent tsc gates
- `tasks.todo.md` — the running backlog

## Constraints every agent got

- **Per-agent tsc gate before reporting ready.** "Ready" without `pnpm tsc --noEmit` passing is not ready.
- **No git commits from agents.** Each agent reports its changes; I review + commit atomically in W5.G.
- **Read the moodboard + contract before writing code.** No inventing interfaces.
- **Use the `--navy`, `--robin`, `--orange` tokens by name.** Don't hardcode hex.
- **Degrade gracefully.** If a live API fails, fall back to fixtures so tomorrow's demo never 500s.

## What founder sees in the morning

1. This doc (so you know what ran)
2. Each agent's deliverable in the `Builder's Knowledge Garden/` folder or the repo
3. A single commit per agent, bundled for inspection
4. Updated `W4.1-pickup.md` with the new commit count and what each did
5. An integrator report from me covering what worked, what needs fixup in daylight, demo-readiness status

## Morning ritual (for founder)

1. Open `morning-report.md` (I'll write it when W5.G completes)
2. Open `design-assets/logomark/logomark-picker.html` and pick the hero asset
3. Smoke-test `/killerapp/workflows/supply-ordering` locally or on Vercel
4. Red-pencil any palette or component that doesn't feel right
5. Demo dry-run for John Bou + contractor

## Risks being taken tonight

- **Live web search** may rate-limit or require a key we don't have. Fallback: scaffolded route with fixtures so the surface looks real even if live search is degraded for the demo.
- **Image generation** for the logomark may not be available in-session. Fallback: agent delivers a paste-ready prompt pack with composition notes + ref links.
- **Supabase migration** applied overnight touches live data plane. Mitigation: table is additive (new table only, no altering existing schema), so rollback is a `drop table`.
