-- Nightly heartbeat reports table
CREATE TABLE IF NOT EXISTS heartbeat_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  location text DEFAULT 'United States',
  project_types text[] DEFAULT '{}',
  alert_level text DEFAULT 'green' CHECK (alert_level IN ('green','yellow','red')),
  summary text,
  report_data jsonb DEFAULT '{}',
  generated_by text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

-- Index for fast latest-report queries
CREATE INDEX IF NOT EXISTS heartbeat_reports_created_at_idx ON heartbeat_reports(created_at DESC);

ALTER TABLE heartbeat_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'heartbeat_reports' AND policyname = 'allow_all_heartbeat'
  ) THEN
    CREATE POLICY allow_all_heartbeat ON heartbeat_reports FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
