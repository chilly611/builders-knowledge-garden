-- Phase 1A Schema Changes
-- Add jurisdiction and start_date to command_center_projects
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS jurisdiction text;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS start_date text;

-- Project schedules table (stores AI-generated schedule JSON)
CREATE TABLE IF NOT EXISTS project_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES command_center_projects(id) ON DELETE CASCADE,
  total_duration_weeks integer,
  phases jsonb DEFAULT '[]'::jsonb,
  critical_path jsonb DEFAULT '[]'::jsonb,
  jurisdiction_hold_points jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_schedules_project ON project_schedules(project_id);

ALTER TABLE project_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages schedules"
  ON project_schedules FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users read own schedules"
  ON project_schedules FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM command_center_projects WHERE user_id = auth.uid()
    )
  );

-- Project compliance flags table (stores AI-generated compliance data)
CREATE TABLE IF NOT EXISTS project_compliance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES command_center_projects(id) ON DELETE CASCADE,
  flags jsonb DEFAULT '[]'::jsonb,
  applicable_codes jsonb DEFAULT '[]'::jsonb,
  inspection_requirements jsonb DEFAULT '[]'::jsonb,
  estimated_permit_timeline text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_compliance_project ON project_compliance(project_id);

ALTER TABLE project_compliance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages compliance"
  ON project_compliance FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users read own compliance"
  ON project_compliance FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM command_center_projects WHERE user_id = auth.uid()
    )
  );
