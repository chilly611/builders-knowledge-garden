-- fix/context-routing (2026-06-07) — multi-tenant context GATE support.
--
-- The SoMa "Commercial TI" demo project (allowlisted in /api/v1/projects) had
-- a NULL budget_amount, so the per-project budget chip rendered empty for it.
-- Give it a budget distinct from Marin's $1.65M so the context-routing GATE
-- demonstrates budget threading per project (Marin $1.65M vs SoMa $1.25M).
--
-- Additive + idempotent: BKG's own command_center_projects table, single demo
-- row, only fills when unset. Safe to re-run.
update public.command_center_projects
set budget_amount = 1250000,
    updated_at = now()
where id = 'bb22c33d-2222-4d78-bbbb-ccddee223344'
  and budget_amount is null;
