# The One Loop — ledger slice (apply + acceptance)

**Branch:** `feat/one-loop-ledger` · **Spec:** `BKG-One-Loop-Schema-and-Acceptance.md`

This slice ships the **reconciling double-entry money model + the live cascade + the API-first
endpoints** — the engine under the North Star loop. It does **not** yet wire the existing UI to the new
model or run on a live Supabase (both below, and both partly founder-gated).

## What's in it
- `supabase/migrations/20260623_one_loop_ledger.sql` — schema `oneloop`: project, budget_line,
  change_order(_line), account, journal_entry/journal_line (generated `amount_signed` + a deferred
  **balance constraint** Σdebit=Σcredit), commitment(_change), etc_override, **append-only hash-chained
  `event`**, the cache tables, the **canonical views** (truth), the **recompute triggers** (cache = view),
  and `assert_reconcile()` (raises rather than render a number that doesn't balance). RLS on (deny-by-
  default), Realtime publication adds (guarded).
- `supabase/migrations/20260623_one_loop_rpcs.sql` — the change-a-variable surface (public, security
  definer): `oneloop_post_expense`, `oneloop_reverse_entry` (undo), `oneloop_approve_change_order`,
  `oneloop_set_etc`, `oneloop_picture` (read). Each cascades, writes an event, reconciles, returns totals.
- Endpoints: `GET /api/v1/loop/projects/[id]/financials` (the live picture) and
  `POST /api/v1/loop/projects/[id]/change` (the four moves). Auth reuses the shared foundation.
- `scripts/oneloop/seed-marin.sql` — Marin demo seeded to the spec canon.

## Why `oneloop` schema (deviation from the spec's literal `public`)
Prod (`vlezoyalutexenbnzzui`) is shared by 6 gardens in one `public` schema (see
`bkg-supabase-prod-topology`). A dedicated schema can never collide, has clean RLS/grants, and is
trivially droppable. App access stays Supabase-native via the `public.v_oneloop_project_financials` view
+ the `public.oneloop_*` RPCs — **no exposed-schema change needed.**

## Verify locally (no Supabase, no prod) — DONE, green
```
bash scripts/oneloop/selftest.sh
# → ONE-LOOP LEDGER PROOF PASSED — reconciles to the penny, cascade propagates,
#   ledger balances, events immutable, undo settles.
```
Spins a throwaway Postgres 17, applies everything, seeds Marin, and asserts acceptance-gate
**Phases 2–6** at the data layer (penny reconciliation; +$12k-to-concrete cascade; still reconciles;
immutable hash-chained event; unbalanced entry rejected; undo settles back to $347K).

## Apply to a live Supabase (founder-gated)
1. **Pick a target.** Recommended: a Supabase **dev branch** (or the dedicated dev project once it
   exists). The `oneloop` schema is isolated + additive, so applying to supervised prod is low-risk, but
   a branch is safer to dry-run.
2. **Apply** both migrations (idempotent) via `apply_migration`, then run `scripts/oneloop/seed-marin.sql`.
   Confirm `select * from oneloop.project_financials` shows $1.65M / $312K / $186K / $1.152M / $347K.
3. **Realtime.** The migration adds `oneloop.{project_financials,cost_code_rollup,event}` to the
   `supabase_realtime` publication. The client subscribes with the schema param:
   `supabase.channel('loop').on('postgres_changes',{schema:'oneloop',table:'project_financials',filter:'project_id=eq.<id>'},…)`.

## Loop acceptance gate — status (spec §5)
| Phase | What | Status |
|---|---|---|
| 2 — reconcile to the penny | budget/actual/committed/remaining/headroom | ✅ proven (selftest) |
| 3 — change a variable → everything moves | post expense → actual/remaining/fac/headroom cascade | ✅ proven (selftest + endpoint) |
| 4 — still reconciles | identities hold after the change | ✅ proven (`assert_reconcile`) |
| 5 — immutable attributed event | append-only, hash-chained | ✅ proven (selftest) |
| 6 — undo | reversing entry, settles back | ✅ proven (selftest) |
| 1 — real sign-in | auth | ⛔ needs live app (auth foundation merged in #?) |
| Realtime "2nd tab updates live" | publication → client | ⛔ needs live Supabase + UI subscribe |
| 7 — leave/return cross-machine | persistence | ⛔ needs live Supabase + UI |
| 8 — honest empty new job | no fabricated actuals | ⛔ UI slice |
| 9 — machine twin | headless agent same numbers | ⛔ uses the RPCs; needs live apply |

## Next slices (one branch each)
- **UI wiring** — point the cockpit/budget surfaces at `v_oneloop_project_financials` + the change
  endpoint, subscribe to Realtime; this is what makes the **full loop green in a real browser** (the
  founder dogfood gate).
- **Scope/schedule date-cascade**, **facts/flags honesty layer**, **lane×lens RLS policies** (the
  Role-Lenses spec) — each a follow-on.
