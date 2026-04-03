-- PM Modules Migration
-- RFIs, Submittals, Change Orders, Punch List

-- RFIs Table
CREATE TABLE IF NOT EXISTS project_rfis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id text NOT NULL,
  number serial,
  subject text NOT NULL,
  description text,
  status text DEFAULT 'draft' CHECK (status IN ('draft','open','under_review','answered','closed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  assigned_to text,
  due_date date,
  answer text,
  linked_entities text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Submittals Table
CREATE TABLE IF NOT EXISTS project_submittals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id text NOT NULL,
  number serial,
  spec_section text,
  description text NOT NULL,
  status text DEFAULT 'required' CHECK (status IN ('required','submitted','under_review','approved','revise_resubmit','rejected')),
  subcontractor text,
  due_date date,
  linked_entities text[] DEFAULT '{}',
  review_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Change Orders Table
CREATE TABLE IF NOT EXISTS project_change_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id text NOT NULL,
  number serial,
  description text NOT NULL,
  reason text CHECK (reason IN ('owner_request','field_condition','code_requirement','design_error')),
  cost_impact numeric DEFAULT 0,
  schedule_impact_days integer DEFAULT 0,
  status text DEFAULT 'proposed' CHECK (status IN ('proposed','under_review','approved','executed','rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Punch List Items Table
CREATE TABLE IF NOT EXISTS project_punch_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id text NOT NULL,
  location text,
  description text NOT NULL,
  assigned_trade text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text DEFAULT 'open' CHECK (status IN ('open','in_progress','complete','verified')),
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE project_rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_submittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_punch_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now)
CREATE POLICY "Allow all for now" ON project_rfis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for now" ON project_submittals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for now" ON project_change_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for now" ON project_punch_items FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rfis_project_id ON project_rfis(project_id);
CREATE INDEX IF NOT EXISTS idx_submittals_project_id ON project_submittals(project_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_project_id ON project_change_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_punch_items_project_id ON project_punch_items(project_id);
