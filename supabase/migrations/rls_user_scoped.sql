-- Phase 0B: User-scoped RLS policies
-- Scopes all project data to auth.uid() so users only see their own data

-- ============================================================
-- 1. Add user_id column to command_center_projects
-- ============================================================
ALTER TABLE command_center_projects
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_cc_projects_user_id ON command_center_projects(user_id);

-- ============================================================
-- 2. Replace permissive policies on command_center_projects
-- ============================================================
DROP POLICY IF EXISTS "allow_all_projects" ON command_center_projects;

CREATE POLICY "Users manage own projects"
  ON command_center_projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass for admin/webhook operations
CREATE POLICY "Service role full access on projects"
  ON command_center_projects FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Replace permissive policies on command_center_attention
-- ============================================================
DROP POLICY IF EXISTS "allow_all_attention" ON command_center_attention;

CREATE POLICY "Users see attention items for own projects"
  ON command_center_attention FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM command_center_projects
      WHERE command_center_projects.id = command_center_attention.project_id
        AND command_center_projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM command_center_projects
      WHERE command_center_projects.id = command_center_attention.project_id
        AND command_center_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on attention"
  ON command_center_attention FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 4. Replace permissive policies on PM module tables
--    PM tables reference project_id (text) → must cast or join
--    command_center_projects.id is uuid, PM tables store project_id as text
-- ============================================================

-- RFIs
DROP POLICY IF EXISTS "Allow all for now" ON project_rfis;

CREATE POLICY "Users manage RFIs for own projects"
  ON project_rfis FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM command_center_projects
      WHERE command_center_projects.id::text = project_rfis.project_id
        AND command_center_projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM command_center_projects
      WHERE command_center_projects.id::text = project_rfis.project_id
        AND command_center_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on rfis"
  ON project_rfis FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Submittals
DROP POLICY IF EXISTS "Allow all for now" ON project_submittals;

CREATE POLICY "Users manage submittals for own projects"
  ON project_submittals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM command_center_projects
      WHERE command_center_projects.id::text = project_submittals.project_id
        AND command_center_projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM command_center_projects
      WHERE command_center_projects.id::text = project_submittals.project_id
        AND command_center_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on submittals"
  ON project_submittals FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Change Orders
DROP POLICY IF EXISTS "Allow all for now" ON project_change_orders;

CREATE POLICY "Users manage change orders for own projects"
  ON project_change_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM command_center_projects
      WHERE command_center_projects.id::text = project_change_orders.project_id
        AND command_center_projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM command_center_projects
      WHERE command_center_projects.id::text = project_change_orders.project_id
        AND command_center_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on change orders"
  ON project_change_orders FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Punch Items
DROP POLICY IF EXISTS "Allow all for now" ON project_punch_items;

CREATE POLICY "Users manage punch items for own projects"
  ON project_punch_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM command_center_projects
      WHERE command_center_projects.id::text = project_punch_items.project_id
        AND command_center_projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM command_center_projects
      WHERE command_center_projects.id::text = project_punch_items.project_id
        AND command_center_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on punch items"
  ON project_punch_items FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Budget Lines
DROP POLICY IF EXISTS "Allow all for now" ON project_budget_lines;

CREATE POLICY "Users manage budget lines for own projects"
  ON project_budget_lines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM command_center_projects
      WHERE command_center_projects.id::text = project_budget_lines.project_id
        AND command_center_projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM command_center_projects
      WHERE command_center_projects.id::text = project_budget_lines.project_id
        AND command_center_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on budget lines"
  ON project_budget_lines FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 5. Tighten dream_states RLS for authenticated users
-- ============================================================
DROP POLICY IF EXISTS "Dreams are viewable by everyone" ON dream_states;
DROP POLICY IF EXISTS "Anyone can create dreams" ON dream_states;
DROP POLICY IF EXISTS "Users can update own dreams" ON dream_states;

-- Allow users to read their own dreams (or dreams without a user_id for pre-auth)
CREATE POLICY "Users read own dreams"
  ON dream_states FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid()::text);

-- Allow authenticated users to create dreams (auto-stamped with their id)
CREATE POLICY "Authenticated users create dreams"
  ON dream_states FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid()::text);

-- Users update only their own dreams
CREATE POLICY "Users update own dreams"
  ON dream_states FOR UPDATE
  USING (user_id IS NULL OR user_id = auth.uid()::text);

-- Allow anonymous reads for the public dream showcase
CREATE POLICY "Anon can read unowned dreams"
  ON dream_states FOR SELECT
  TO anon
  USING (user_id IS NULL);

CREATE POLICY "Service role full access on dreams"
  ON dream_states FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
