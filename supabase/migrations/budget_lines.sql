-- Budget Lines Migration
-- Tracks project budget by CSI division with budgeted, committed, and actual spent amounts

CREATE TABLE IF NOT EXISTS project_budget_lines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id text NOT NULL,
  csi_division text NOT NULL,
  description text,
  budgeted numeric DEFAULT 0,
  committed numeric DEFAULT 0,
  actual_spent numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE project_budget_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policy (allow all for now — replace with proper auth checks in production)
CREATE POLICY "Allow all for now" ON project_budget_lines FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_lines_project_id ON project_budget_lines(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_csi_division ON project_budget_lines(csi_division);
