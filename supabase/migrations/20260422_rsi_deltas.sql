-- RSI (Recursive Self-Improvement) Feedback & Deltas Migration
-- Created: 2026-04-22
-- Description: Outcome capture, feedback aggregation, and delta proposal/approval workflow

-- ============================================================================
-- RSI_FEEDBACK TABLE: User signals and corrections on specialist runs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rsi_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_run_id UUID NOT NULL,
  user_id TEXT,
  signal TEXT NOT NULL CHECK (signal IN ('thumbs_up', 'thumbs_down', 'correction', 'outcome_success', 'outcome_failure', 'ahj_contradiction')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  context JSONB,
  CONSTRAINT fk_rsi_feedback_specialist_run FOREIGN KEY (specialist_run_id) REFERENCES public.specialist_runs(id) ON DELETE CASCADE
);

ALTER TABLE public.rsi_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback they created" ON public.rsi_feedback
  FOR SELECT USING (
    user_id = auth.uid()::text OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can insert feedback" ON public.rsi_feedback
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text OR auth.role() = 'service_role'
  );

CREATE INDEX idx_rsi_feedback_specialist_run ON public.rsi_feedback(specialist_run_id);
CREATE INDEX idx_rsi_feedback_signal ON public.rsi_feedback(signal);
CREATE INDEX idx_rsi_feedback_created_at ON public.rsi_feedback(created_at);

-- ============================================================================
-- RSI_DELTAS TABLE: Proposed improvements to prompts, entities, or amendments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rsi_deltas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected', 'applied')),
  kind TEXT NOT NULL CHECK (kind IN ('prompt_patch', 'entity_add', 'entity_update', 'amendment_add', 'specialist_tool_tweak')),
  target TEXT NOT NULL,
  rationale TEXT NOT NULL,
  diff_preview TEXT,
  patch JSONB,
  source_feedback_ids UUID[] DEFAULT ARRAY[]::uuid[],
  created_at TIMESTAMPTZ DEFAULT now(),
  applied_at TIMESTAMPTZ,
  reviewer TEXT,
  review_notes TEXT
);

ALTER TABLE public.rsi_deltas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage deltas" ON public.rsi_deltas
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view deltas" ON public.rsi_deltas
  FOR SELECT USING (true);

CREATE INDEX idx_rsi_deltas_status ON public.rsi_deltas(status);
CREATE INDEX idx_rsi_deltas_kind ON public.rsi_deltas(kind);
CREATE INDEX idx_rsi_deltas_created_at ON public.rsi_deltas(created_at);
CREATE INDEX idx_rsi_deltas_target ON public.rsi_deltas(target);
