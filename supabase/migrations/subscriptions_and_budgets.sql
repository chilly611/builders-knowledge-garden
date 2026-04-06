-- Subscriptions & Budget Tracking — Stripe billing + project financial management
-- Depends on: user_profiles, saved_projects tables

/* ─── Subscriptions ─── */

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  tier TEXT NOT NULL DEFAULT 'explorer' CHECK (tier IN ('explorer', 'pro', 'team', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'paused', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages subscriptions" ON subscriptions
  FOR ALL USING (true) WITH CHECK (true);

/* ─── Invoices (cached from Stripe for fast display) ─── */

CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  amount_paid INTEGER NOT NULL DEFAULT 0,  -- cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'draft',
  invoice_url TEXT,
  invoice_pdf TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages invoices" ON invoices
  FOR ALL USING (true) WITH CHECK (true);

/* ─── Project Budgets ─── */

CREATE TABLE IF NOT EXISTS project_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES saved_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_budget NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  alert_threshold NUMERIC(5, 2) DEFAULT 80.00,  -- % of budget to trigger alert
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_budgets_project ON project_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_budgets_user ON project_budgets(user_id);

ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own budgets" ON project_budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create budgets" ON project_budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON project_budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON project_budgets
  FOR DELETE USING (auth.uid() = user_id);

/* ─── Budget Line Items (expenses by phase/category) ─── */

CREATE TABLE IF NOT EXISTS budget_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES project_budgets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('DREAM', 'DESIGN', 'PLAN', 'BUILD', 'DELIVER', 'GROW')),
  category TEXT NOT NULL,  -- e.g. 'materials', 'labor', 'permits', 'equipment', 'subcontractor', 'overhead', 'other'
  description TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  vendor TEXT,
  receipt_url TEXT,
  is_estimate BOOLEAN DEFAULT false,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_items_budget ON budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_user ON budget_items(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_phase ON budget_items(phase);
CREATE INDEX IF NOT EXISTS idx_budget_items_date ON budget_items(date DESC);

ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own items" ON budget_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create items" ON budget_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items" ON budget_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own items" ON budget_items
  FOR DELETE USING (auth.uid() = user_id);

/* ─── Sync user_profiles.tier when subscription changes ─── */

CREATE OR REPLACE FUNCTION public.sync_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET tier = NEW.tier, updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_subscription_change ON subscriptions;
CREATE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE OF tier ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_subscription_tier();

