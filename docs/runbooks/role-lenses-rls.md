# Role Lenses — least-privilege RLS (Owner / GC / Sub / Architect / Lender)

**Branch:** `feat/role-lenses-rls` (stacks on `feat/one-loop-ledger`) · **Spec:** `BKG-Role-Lenses-and-Fact-Provenance-Security.md`

Deny-by-default Supabase RLS over the One-Loop model, enforcing **least privilege by partition** — sensitive
money lives in tables a lower lane has *zero* access to, never a hidden column on a row it can read.

## The three load-bearing denials (proven)
- **Sub → margin / ledger / other subs = ∅** · **Architect → financials = ∅** · **Owner → cost basis / margin = ∅**

## What it adds (`supabase/migrations/20260623_one_loop_lenses_rls.sql`)
- **Lens tables:** `oneloop.project_member` (the cross-org binding — the GC's org owns the project,
  everyone else joins per project from their own org), `pay_application` (sub→GC; subs touch this, never
  the ledger), `draw` (GC→owner/lender), + `commitment.vendor_org_id`.
- **Contract relocation:** `contract_revenue` moved off the member-readable `project` row into a gated
  `oneloop.project_contract` (GC/owner only) — a sub reading the project can no longer learn the contract.
- **Helpers** (`app.lane`, `app.is_member`, `app.my_commitments`): `security definer` + pinned
  `search_path`, so they read the roster without RLS recursion. `auth.uid()` is fully qualified.
- **Policies** per the §4 matrix; financials/rollup/budget/ledger/change-orders/ETC = **GC only**;
  commitments + pay apps = **owning sub only**; draws + contract = **GC/owner(/lender)**; events = GC-all
  or own-actor, append-only.
- `v_owner_financials` (contract / funded / paid, **no cost or margin**).

## Proven — `bash scripts/oneloop/rls-selftest.sh` → PASSED (38 checks, 0 failures)
Replicates Supabase's RLS runtime on a throwaway Postgres (creates the `authenticated` role + an
`auth.uid()` shim from the JWT-claim GUC), applies the migrations, seeds a full multi-lane scenario
(GC project with owner + two subs + architect, plus a second tenant), and runs the spec **§6 leakage
gate as each role**:

| Lane | Allowed | Denied (∅) |
|---|---|---|
| **Sub A** | own commitment, own pay app, submit pay app on own commitment, project metadata | financials, ledger, budget, contract, draws, **sub B's** commitment + pay app, submitting on sub B's commitment, **tenant P2** |
| **Architect** | project metadata | financials, ledger, commitments, pay apps, budget |
| **Owner** | contract value, draws, `v_owner_financials` | GC margin, cost basis, budget, ledger, sub pay |
| **GC** | full read incl. the sub's just-submitted pay app | **another tenant's project** |
| **Other-tenant GC** | their own project | all of P1 |
| **GC (audit)** | read events | **UPDATE event → blocked** (append-only) |

FAIL = any lane reading a denied resource, any cross-tenant read, or an editable audit row. None occurred.

## Apply (founder-gated) + notes
- Apply **after** the ledger migration to the same Supabase target. On Supabase `auth.uid()` and the
  `authenticated`/`anon`/`service_role` roles exist natively — the harness's shim is **local-test only**;
  the migration's grants are guarded so they no-op where roles are absent.
- The app continues to **write via the service role after app-layer authz** (`assertProjectWriteAccess`);
  RLS is the defense-in-depth backstop, and the gate for any direct authenticated reads.
- **Deferred** (tables not built yet — the spec's design surfaces): `scope_item`, `drawing(_scope)`,
  `rfi`, `served_fact`/`flag`. Their policies land with those tables; the money-lens denials (the
  load-bearing ones) are complete here.
- **Ratification flags** from the spec §7 still open for the founder: owner-transparency default
  (`fixed_price_private`), rename `org_member.role 'owner'→'admin'`, owner-sees-roster, safety-critical
  fact threshold.
