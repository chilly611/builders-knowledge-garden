-- Command Center tables for Killer App
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS command_center_projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phase text DEFAULT 'PLAN' CHECK (phase IN ('DREAM','DESIGN','PLAN','BUILD','DELIVER','GROW')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  budget_amount numeric,
  budget_status text DEFAULT 'on-track' CHECK (budget_status IN ('on-track','over','ahead')),
  risk_level text DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high')),
  next_milestone text,
  milestone_date date,
  project_type text,
  location text,
  client_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS command_center_attention (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES command_center_projects(id) ON DELETE CASCADE,
  project_name text,
  urgency text DEFAULT 'yellow' CHECK (urgency IN ('red','yellow','green')),
  title text NOT NULL,
  body text,
  options jsonb DEFAULT '[]',
  resolved boolean DEFAULT false,
  ai_generated boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS: allow all operations (add auth filtering once Clerk is wired)
ALTER TABLE command_center_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_center_attention ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'command_center_projects' AND policyname = 'allow_all_projects'
  ) THEN
    CREATE POLICY allow_all_projects ON command_center_projects FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'command_center_attention' AND policyname = 'allow_all_attention'
  ) THEN
    CREATE POLICY allow_all_attention ON command_center_attention FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
