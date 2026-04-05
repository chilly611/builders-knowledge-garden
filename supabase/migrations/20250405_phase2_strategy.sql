-- Builder's Knowledge Garden Phase 2 Strategy Schema
-- Comprehensive migration for User Profiles, XP System, Quests, Achievements, and Notifications
-- Created: 2026-04-05

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- User lane personas for the 8-lane navigation system
CREATE TYPE IF NOT EXISTS user_lane AS ENUM (
  'dreamer',    -- Visionaries and innovators
  'builder',    -- Hands-on creators and developers
  'specialist', -- Deep experts in specific domains
  'merchant',   -- Business and commercial focus
  'ally',       -- Community and collaboration
  'crew',       -- Team leadership and coordination
  'fleet',      -- Multi-project orchestration
  'machine'     -- Automation and systems thinking
);

-- Notification urgency levels (4-tier emotional system)
CREATE TYPE IF NOT EXISTS notification_urgency AS ENUM (
  'celebration', -- Positive achievements and milestones
  'good_news',   -- Helpful information and updates
  'heads_up',    -- Important notices requiring attention
  'needs_you'    -- Critical issues requiring action
);

-- Achievement rarity tiers
CREATE TYPE IF NOT EXISTS achievement_rarity AS ENUM (
  'common',
  'rare',
  'epic',
  'legendary'
);

-- Achievement categories
CREATE TYPE IF NOT EXISTS achievement_category AS ENUM (
  'explorer',
  'builder',
  'architect',
  'specialist'
);

-- Agent autonomy modes
CREATE TYPE IF NOT EXISTS agent_autonomy_mode AS ENUM (
  'watch',      -- Read-only monitoring
  'assist',     -- Requires approval for actions
  'autonomous'  -- Full autonomous action
);

-- ============================================================================
-- USER PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lane user_lane NOT NULL DEFAULT 'dreamer',
  display_name text NOT NULL,
  company_name text,
  progressive_profile jsonb DEFAULT '{}'::jsonb,
  onboarding_complete boolean DEFAULT false,
  preferred_surface text DEFAULT 'dream' CHECK (preferred_surface IN ('dream', 'knowledge', 'killerapp')),
  notification_preferences jsonb DEFAULT '{
    "email_digest": true,
    "push_notifications": true,
    "in_app_notifications": true,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "08:00"
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id),
  CONSTRAINT display_name_length CHECK (char_length(display_name) > 0 AND char_length(display_name) <= 255),
  CONSTRAINT company_name_length CHECK (company_name IS NULL OR (char_length(company_name) > 0 AND char_length(company_name) <= 255))
);

COMMENT ON TABLE public.user_profiles IS 'User profiles with 8-lane persona system for BKG';
COMMENT ON COLUMN public.user_profiles.lane IS 'User persona lane: dreamer, builder, specialist, merchant, ally, crew, fleet, machine';
COMMENT ON COLUMN public.user_profiles.progressive_profile IS 'Stores answers from onboarding profiling questions';
COMMENT ON COLUMN public.user_profiles.preferred_surface IS 'Primary interface preference: dream, knowledge, or killerapp';
COMMENT ON COLUMN public.user_profiles.notification_preferences IS 'User-configurable notification settings';

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role has full access"
  ON public.user_profiles FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- XP & LEVELING SYSTEM TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_xp (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp integer NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'Apprentice',
  streak_days integer NOT NULL DEFAULT 0,
  streak_last_date date,
  longest_streak integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id),
  CONSTRAINT total_xp_non_negative CHECK (total_xp >= 0),
  CONSTRAINT streak_days_non_negative CHECK (streak_days >= 0),
  CONSTRAINT longest_streak_non_negative CHECK (longest_streak >= 0)
);

COMMENT ON TABLE public.user_xp IS 'User XP accumulation and leveling progression';
COMMENT ON COLUMN public.user_xp.level IS 'User level based on total XP (e.g., Apprentice, Journeyman, Master)';
COMMENT ON COLUMN public.user_xp.streak_days IS 'Current consecutive days of activity';
COMMENT ON COLUMN public.user_xp.longest_streak IS 'Longest streak achieved all-time';

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own XP"
  ON public.user_xp FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage XP"
  ON public.user_xp FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- XP events tracking
CREATE TABLE IF NOT EXISTS public.xp_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  xp_earned integer NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  source_type text NOT NULL CHECK (source_type IN ('dream', 'knowledge', 'project', 'quest', 'achievement')),
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (id),
  CONSTRAINT xp_earned_positive CHECK (xp_earned > 0),
  CONSTRAINT action_length CHECK (char_length(action) > 0 AND char_length(action) <= 255)
);

COMMENT ON TABLE public.xp_events IS 'Immutable log of all XP-earning events';
COMMENT ON COLUMN public.xp_events.action IS 'Human-readable action description (e.g., "Completed daily quest")';
COMMENT ON COLUMN public.xp_events.source_type IS 'Source category: dream, knowledge, project, quest, achievement';

CREATE INDEX idx_xp_events_user_created ON public.xp_events(user_id, created_at DESC);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
  ON public.xp_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage events"
  ON public.xp_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- QUEST SYSTEM TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.daily_quests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_date date NOT NULL,
  quests jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_count integer NOT NULL DEFAULT 0,
  bonus_claimed boolean NOT NULL DEFAULT false,
  lane user_lane,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (id),
  UNIQUE (user_id, quest_date),
  CONSTRAINT completed_count_non_negative CHECK (completed_count >= 0),
  CONSTRAINT completed_count_max CHECK (completed_count <= 3)
);

COMMENT ON TABLE public.daily_quests IS 'Daily quest assignments for users (3 quests per day + bonus)';
COMMENT ON COLUMN public.daily_quests.quests IS 'JSONB array of quest objects: {id, title, description, xp_reward, action_type, completed, completed_at}';
COMMENT ON COLUMN public.daily_quests.completed_count IS 'Number of quests completed (0-3)';
COMMENT ON COLUMN public.daily_quests.bonus_claimed IS 'Whether the bonus XP for completing all 3 quests has been claimed';
COMMENT ON COLUMN public.daily_quests.lane IS 'Lane-specific quests; null means all-lane quests';

CREATE INDEX idx_daily_quests_user_date ON public.daily_quests(user_id, quest_date DESC);

ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quests"
  ON public.daily_quests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage quests"
  ON public.daily_quests FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- ACHIEVEMENT SYSTEM TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.achievements (
  id text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  category achievement_category NOT NULL,
  icon_url text,
  xp_reward integer NOT NULL DEFAULT 100,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  lane_specific text[] DEFAULT NULL,
  rarity achievement_rarity NOT NULL DEFAULT 'common',
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (id),
  CONSTRAINT name_length CHECK (char_length(name) > 0 AND char_length(name) <= 255),
  CONSTRAINT description_length CHECK (char_length(description) > 0),
  CONSTRAINT xp_reward_positive CHECK (xp_reward > 0),
  CONSTRAINT id_format CHECK (id ~ '^[a-z0-9_-]+$')
);

COMMENT ON TABLE public.achievements IS 'Master list of all achievements and badges available in BKG Phase 2';
COMMENT ON COLUMN public.achievements.lane_specific IS 'Array of lane IDs; NULL means available to all lanes';
COMMENT ON COLUMN public.achievements.criteria IS 'JSONB object with achievement unlock criteria (e.g., {streak_days: 7, total_dreams: 5})';

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to achievements"
  ON public.achievements FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage achievements"
  ON public.achievements FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- User achievement tracking
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES public.achievements(id) ON DELETE RESTRICT,
  earned_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (id),
  UNIQUE (user_id, achievement_id)
);

COMMENT ON TABLE public.user_achievements IS 'Tracks achievements earned by users (unlocked badges)';

CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id, earned_at DESC);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user achievements"
  ON public.user_achievements FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- NOTIFICATION ORCHESTRA (4-TIER EMOTIONAL SYSTEM)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  urgency_level notification_urgency NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  solution text,
  source_type text,
  source_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,

  PRIMARY KEY (id),
  CONSTRAINT title_length CHECK (char_length(title) > 0 AND char_length(title) <= 255),
  CONSTRAINT body_length CHECK (char_length(body) > 0),
  CONSTRAINT solution_length CHECK (solution IS NULL OR char_length(solution) > 0),
  CONSTRAINT read_at_constraint CHECK ((read = true AND read_at IS NOT NULL) OR (read = false AND read_at IS NULL))
);

COMMENT ON TABLE public.notifications IS 'Notification orchestra with 4-tier emotional system: celebration, good_news, heads_up, needs_you';
COMMENT ON COLUMN public.notifications.urgency_level IS 'Emotional tier: celebration (positive), good_news (helpful), heads_up (important), needs_you (critical)';
COMMENT ON COLUMN public.notifications.solution IS 'Pre-researched solution or action for needs_you alerts';
COMMENT ON COLUMN public.notifications.source_type IS 'Origin of notification (e.g., quest_complete, achievement_unlock, system_alert)';
COMMENT ON COLUMN public.notifications.source_id IS 'ID of source object (e.g., quest_id, achievement_id)';

CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications (read status)"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage notifications"
  ON public.notifications FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- MORNING BRIEFING SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.morning_briefings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_date date NOT NULL,
  lane user_lane NOT NULL,
  content text NOT NULL,
  quests jsonb DEFAULT '{}'::jsonb,
  weather_data jsonb DEFAULT '{}'::jsonb,
  project_summary jsonb DEFAULT '{}'::jsonb,
  knowledge_highlight jsonb DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (id),
  UNIQUE (user_id, briefing_date),
  CONSTRAINT content_length CHECK (char_length(content) > 0)
);

COMMENT ON TABLE public.morning_briefings IS 'Daily morning briefings personalized by user lane with curated content';
COMMENT ON COLUMN public.morning_briefings.quests IS 'The 3 daily quests for this briefing date';
COMMENT ON COLUMN public.morning_briefings.weather_data IS 'Optional weather/context data relevant to lane';
COMMENT ON COLUMN public.morning_briefings.project_summary IS 'Curated projects or priorities for the day';
COMMENT ON COLUMN public.morning_briefings.knowledge_highlight IS 'Knowledge article or tip of the day';

CREATE INDEX idx_morning_briefings_user_date ON public.morning_briefings(user_id, briefing_date DESC);

ALTER TABLE public.morning_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own briefings"
  ON public.morning_briefings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own briefings (read status)"
  ON public.morning_briefings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage briefings"
  ON public.morning_briefings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- AGENT RBAC (FOR MCP AUTHENTICATED AGENTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agent_identities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_hash text NOT NULL UNIQUE,
  description text,
  autonomy_mode agent_autonomy_mode NOT NULL DEFAULT 'watch',
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  rate_limit_per_hour integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  last_active_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (id),
  CONSTRAINT name_length CHECK (char_length(name) > 0 AND char_length(name) <= 255),
  CONSTRAINT description_length CHECK (description IS NULL OR char_length(description) > 0),
  CONSTRAINT rate_limit_positive CHECK (rate_limit_per_hour > 0),
  CONSTRAINT api_key_hash_length CHECK (char_length(api_key_hash) > 0)
);

COMMENT ON TABLE public.agent_identities IS 'MCP authenticated agent identities with autonomy levels and permission management';
COMMENT ON COLUMN public.agent_identities.api_key_hash IS 'SHA256 hash of API key for secure comparison (never store plain text)';
COMMENT ON COLUMN public.agent_identities.autonomy_mode IS 'Agent autonomy level: watch (read-only), assist (requires approval), autonomous (full action)';
COMMENT ON COLUMN public.agent_identities.permissions IS 'JSONB array of permitted tools/scopes (e.g., [''dream:read'', ''quest:complete''])';
COMMENT ON COLUMN public.agent_identities.rate_limit_per_hour IS 'Maximum API calls per hour for rate limiting';

CREATE INDEX idx_agent_identities_owner ON public.agent_identities(owner_user_id, active);
CREATE INDEX idx_agent_identities_api_key ON public.agent_identities(api_key_hash) WHERE active = true;

ALTER TABLE public.agent_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agents"
  ON public.agent_identities FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can update own agents"
  ON public.agent_identities FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert own agents"
  ON public.agent_identities FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Service role can manage all agents"
  ON public.agent_identities FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Agent audit log
CREATE TABLE IF NOT EXISTS public.agent_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agent_identities(id) ON DELETE CASCADE,
  action text NOT NULL,
  tool_name text,
  input_summary text,
  output_summary text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (id),
  CONSTRAINT action_length CHECK (char_length(action) > 0 AND char_length(action) <= 255),
  CONSTRAINT duration_non_negative CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

COMMENT ON TABLE public.agent_audit_log IS 'Immutable audit trail of all agent actions for compliance and debugging';
COMMENT ON COLUMN public.agent_audit_log.approved_by IS 'User ID of approver for assist mode actions; NULL for autonomous actions';
COMMENT ON COLUMN public.agent_audit_log.duration_ms IS 'Execution time in milliseconds for performance tracking';

CREATE INDEX idx_agent_audit_log_agent ON public.agent_audit_log(agent_id, created_at DESC);
CREATE INDEX idx_agent_audit_log_created ON public.agent_audit_log(created_at DESC);

ALTER TABLE public.agent_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent owners can view logs for their agents"
  ON public.agent_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_identities
      WHERE agent_identities.id = agent_audit_log.agent_id
      AND agent_identities.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage audit logs"
  ON public.agent_audit_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- SEED DATA: INITIAL ACHIEVEMENTS
-- ============================================================================

INSERT INTO public.achievements (id, name, description, category, xp_reward, lane_specific, rarity, criteria) VALUES
('code_whisperer', 'Code Whisperer', 'Write 50 dream snippets with code blocks', 'builder', 150, ARRAY['builder', 'specialist'], 'rare', '{"dream_snippets_with_code": 50}'::jsonb),
('budget_ninja', 'Budget Ninja', 'Build 5 projects with detailed budget planning', 'builder', 125, ARRAY['merchant', 'specialist'], 'epic', '{"projects_with_budget": 5}'::jsonb),
('oracle_initiate', 'Oracle Initiate', 'Complete 10 knowledge articles in a single lane', 'explorer', 100, NULL, 'common', '{"knowledge_articles_completed": 10}'::jsonb),
('iron_streak_7day', 'Iron Streak', 'Maintain a 7-day activity streak', 'architect', 200, NULL, 'rare', '{"streak_days": 7}'::jsonb),
('first_dream', 'First Dream', 'Create your first dream and share it', 'explorer', 50, NULL, 'common', '{"dreams_created": 1, "dreams_shared": 1}'::jsonb),
('speed_builder', 'Speed Builder', 'Complete 3 builder lane quests in one day', 'builder', 75, ARRAY['builder', 'fleet'], 'rare', '{"builder_quests_per_day": 3}'::jsonb),
('knowledge_seeker', 'Knowledge Seeker', 'Read 25 knowledge articles across all categories', 'explorer', 130, NULL, 'epic', '{"knowledge_articles_read": 25}'::jsonb),
('team_player', 'Team Player', 'Collaborate on 5 shared dreams', 'architect', 110, ARRAY['ally', 'crew', 'fleet'], 'rare', '{"shared_dreams_collaborated": 5}'::jsonb),
('safety_first', 'Safety First', 'Complete all safety-related quests and knowledge', 'specialist', 90, NULL, 'common', '{"safety_quests_completed": 5}'::jsonb),
('permit_pro', 'Permit Pro', 'Successfully navigate 10 permit-related scenarios', 'specialist', 140, ARRAY['specialist', 'builder'], 'epic', '{"permit_scenarios_completed": 10}'::jsonb),
('material_master', 'Material Master', 'Master material selection with 8 different materials', 'specialist', 120, ARRAY['specialist', 'builder'], 'rare', '{"materials_mastered": 8}'::jsonb),
('schedule_ace', 'Schedule Ace', 'Plan a complete project timeline in detail', 'architect', 105, ARRAY['builder', 'crew', 'fleet'], 'rare', '{"detailed_timelines": 1}'::jsonb),
('cost_hawk', 'Cost Hawk', 'Track and analyze project costs across 3 projects', 'merchant', 115, ARRAY['merchant', 'specialist'], 'epic', '{"projects_cost_tracked": 3}'::jsonb),
('inspection_ready', 'Inspection Ready', 'Prepare inspection checklists for 5 projects', 'specialist', 95, ARRAY['specialist', 'builder', 'merchant'], 'rare', '{"inspection_checklists": 5}'::jsonb),
('dream_weaver', 'Dream Weaver', 'Create 20 dreams across multiple lanes', 'explorer', 160, NULL, 'epic', '{"total_dreams": 20}'::jsonb),
('alchemist_master', 'Alchemist Master', 'Combine and remix 15 dreams into new concepts', 'architect', 180, ARRAY['dreamer', 'specialist'], 'legendary', '{"dreams_remixed": 15}'::jsonb),
('bridge_builder', 'Bridge Builder', 'Connect knowledge from 3 different specialties in one dream', 'architect', 135, ARRAY['ally', 'crew', 'architect'], 'epic', '{"cross_specialty_dreams": 1}'::jsonb),
('data_pioneer', 'Data Pioneer', 'Use data-driven insights in 8 different projects', 'specialist', 125, ARRAY['specialist', 'merchant'], 'rare', '{"data_driven_projects": 8}'::jsonb),
('night_owl', 'Night Owl', 'Maintain a 5-day activity streak between 10 PM and 6 AM', 'explorer', 110, NULL, 'rare', '{"night_activity_streak": 5}'::jsonb),
('early_bird', 'Early Bird', 'Complete 10 quests before 9 AM on different days', 'explorer', 110, NULL, 'rare', '{"early_morning_quests": 10}'::jsonb);

COMMENT ON TABLE public.achievements VALUES IS 'Seed data includes 20 initial achievements across all categories and lanes';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update user_profiles.updated_at on modification
CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles.updated_at
DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- Function to update user_xp.updated_at on modification
CREATE OR REPLACE FUNCTION public.update_user_xp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_xp.updated_at
DROP TRIGGER IF EXISTS trigger_user_xp_updated_at ON public.user_xp;
CREATE TRIGGER trigger_user_xp_updated_at
  BEFORE UPDATE ON public.user_xp
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_xp_updated_at();

-- Function to update agent_identities.updated_at and last_active_at on modification
CREATE OR REPLACE FUNCTION public.update_agent_identities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for agent_identities.updated_at
DROP TRIGGER IF EXISTS trigger_agent_identities_updated_at ON public.agent_identities;
CREATE TRIGGER trigger_agent_identities_updated_at
  BEFORE UPDATE ON public.agent_identities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agent_identities_updated_at();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User profiles queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_lane ON public.user_profiles(lane);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding ON public.user_profiles(onboarding_complete);

-- XP queries
CREATE INDEX IF NOT EXISTS idx_user_xp_level ON public.user_xp(level);
CREATE INDEX IF NOT EXISTS idx_user_xp_streak ON public.user_xp(streak_days DESC);

-- Achievements queries
CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON public.achievements(rarity);

-- Notifications queries
CREATE INDEX IF NOT EXISTS idx_notifications_urgency ON public.notifications(urgency_level);
CREATE INDEX IF NOT EXISTS idx_notifications_dismissed ON public.notifications(user_id, dismissed);

-- Morning briefings queries
CREATE INDEX IF NOT EXISTS idx_morning_briefings_lane ON public.morning_briefings(lane);

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================

-- Create metadata table for tracking migrations
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id serial PRIMARY KEY,
  version text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  applied_at timestamptz DEFAULT now()
);

INSERT INTO public.schema_migrations (version, name, description)
VALUES (
  '2026-04-05-001',
  'Phase 2 Strategy Schema',
  'Comprehensive migration for BKG Phase 2: User Profiles (8-lane system), XP & Leveling, Quests, Achievements, Notification Orchestra (4-tier), Morning Briefing, and Agent RBAC'
)
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- SUMMARY COMMENTS
-- ============================================================================

COMMENT ON SCHEMA public IS 'BKG Phase 2 core schema with user profiles, progression, gamification, and agent management';
