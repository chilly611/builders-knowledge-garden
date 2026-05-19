ALTER TABLE command_center_projects
ADD COLUMN IF NOT EXISTS project_budgets jsonb NOT NULL DEFAULT '{"lines":[]}'::jsonb;

COMMENT ON COLUMN command_center_projects.project_budgets IS
  'Demo-driven budget store for /killerapp/budget. Shape:
   { lines: [{ id, category, description, amount, state, vendor?, dueDate?, notes?, createdAt, updatedAt }] }.
   Persisted via the BudgetClient autosave. localStorage is the
   offline fallback when this column is empty for a project_id.';
