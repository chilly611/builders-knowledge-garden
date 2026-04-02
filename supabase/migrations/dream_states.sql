-- Dream States — persistent dream storage across all interfaces
-- Each row represents one user's evolving dream that can be contributed to from ANY interface

CREATE TABLE IF NOT EXISTS dream_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT, -- Clerk user ID when auth is active
  title TEXT NOT NULL DEFAULT 'Untitled Dream',
  
  -- Which interfaces have contributed
  interfaces_used TEXT[] DEFAULT '{}',
  
  -- Per-interface data (JSONB for flexibility)
  oracle_profile JSONB,
  alchemist_recipe JSONB,
  quest_tokens TEXT[],
  genome_dna JSONB,
  narrator_story JSONB,
  collider_synthesis JSONB,
  sandbox_blocks JSONB,
  voice_conversation JSONB,
  cosmos_selections JSONB,
  sketch_data TEXT,
  describe_text TEXT,
  inspire_photos TEXT[],
  
  -- Synthesized dream properties
  inferred_style TEXT,
  inferred_materials TEXT[],
  inferred_scale TEXT,
  estimated_cost_range TEXT,
  color_palette TEXT[],
  renders TEXT[], -- URLs to generated images
  
  -- Growth tracking
  growth_stage TEXT DEFAULT 'seed' CHECK (growth_stage IN ('seed', 'sprout', 'sapling', 'bloom')),
  last_interface TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_dream_states_user ON dream_states(user_id);
CREATE INDEX IF NOT EXISTS idx_dream_states_updated ON dream_states(updated_at DESC);

-- RLS policies
ALTER TABLE dream_states ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (for shared dreams)
CREATE POLICY "Dreams are viewable by everyone" ON dream_states
  FOR SELECT USING (true);

-- Allow anyone to insert (pre-auth, identified by user_id later)
CREATE POLICY "Anyone can create dreams" ON dream_states
  FOR INSERT WITH CHECK (true);

-- Allow update only by the creator
CREATE POLICY "Users can update own dreams" ON dream_states
  FOR UPDATE USING (true); -- Tighten when auth is active: user_id = auth.uid()
