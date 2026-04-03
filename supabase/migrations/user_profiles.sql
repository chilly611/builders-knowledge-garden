-- User Profiles — auto-created on signup, stores display info + preferences
-- Saved Projects — universal project storage for all dream interfaces

-- ============================================================
-- 1. user_profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  display_name TEXT DEFAULT 'Builder',
  avatar_url  TEXT,
  lane        TEXT DEFAULT 'explorer'
              CHECK (lane IN ('explorer','pro','team','enterprise')),
  preferences JSONB DEFAULT '{}'::jsonb,
  onboarded   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (for upsert)
CREATE POLICY "Users insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Service role can do everything (for triggers)
CREATE POLICY "Service role full access on profiles"
  ON public.user_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 2. saved_projects table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Untitled Project',
  description TEXT,
  project_type TEXT DEFAULT 'dream',
  state       JSONB DEFAULT '{}'::jsonb,
  thumbnail_url TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.saved_projects ENABLE ROW LEVEL SECURITY;

-- Users can read their own projects
CREATE POLICY "Users read own projects"
  ON public.saved_projects FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own projects
CREATE POLICY "Users insert own projects"
  ON public.saved_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users update own projects"
  ON public.saved_projects FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users delete own projects"
  ON public.saved_projects FOR DELETE
  USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access on projects"
  ON public.saved_projects FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 3. Auto-create profile on signup (trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.user_profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_saved_projects_user_id
  ON public.saved_projects(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_projects_updated
  ON public.saved_projects(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_projects_type
  ON public.saved_projects(project_type);
