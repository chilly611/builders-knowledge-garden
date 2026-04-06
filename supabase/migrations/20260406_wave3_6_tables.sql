-- Wave 3-6 Tables Migration for Builder's Knowledge Garden
-- Created: 2026-04-06
-- Description: Invoices, Marketplace, Dream Links, Weather, Challenges, Social, WorldWalker, RFI, Inspections, Permits

-- ============================================================================
-- 1. INVOICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_address TEXT,
  contractor_name TEXT NOT NULL,
  contract_amount NUMERIC(15, 2) NOT NULL,
  total_completed NUMERIC(15, 2) DEFAULT 0,
  total_retainage NUMERIC(15, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'paid')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_invoices_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices for their projects" ON public.invoices
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invoices they create" ON public.invoices
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update invoices they created" ON public.invoices
  FOR UPDATE USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Service role can do everything" ON public.invoices
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX idx_invoices_created_by ON public.invoices(created_by);
CREATE INDEX idx_invoices_status ON public.invoices(status);

-- ============================================================================
-- 2. INVOICE LINE ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL,
  description TEXT NOT NULL,
  scheduled_value NUMERIC(15, 2) NOT NULL,
  previous_work NUMERIC(15, 2) DEFAULT 0,
  current_work NUMERIC(15, 2) DEFAULT 0,
  materials_stored NUMERIC(15, 2) DEFAULT 0,
  total_completed NUMERIC(15, 2) DEFAULT 0,
  retainage_percent NUMERIC(5, 2) DEFAULT 10,
  item_number INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_invoice_line_items_invoice FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE
);

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice line items" ON public.invoice_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND (invoices.created_by = auth.uid() OR auth.role() = 'service_role')
    )
  );

CREATE POLICY "Users can insert invoice line items" ON public.invoice_line_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update invoice line items" ON public.invoice_line_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.created_by = auth.uid()
    )
  );

CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);

-- ============================================================================
-- 3. MARKETPLACE LISTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  unit_price NUMERIC(15, 2) NOT NULL,
  unit TEXT NOT NULL,
  lead_time_days INT DEFAULT 0,
  min_order_qty INT DEFAULT 1,
  specifications JSONB DEFAULT '{}',
  rating NUMERIC(3, 2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_marketplace_listings_supplier FOREIGN KEY (supplier_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active listings" ON public.marketplace_listings
  FOR SELECT USING (is_active = true OR supplier_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Suppliers can insert their own listings" ON public.marketplace_listings
  FOR INSERT WITH CHECK (supplier_id = auth.uid());

CREATE POLICY "Suppliers can update their own listings" ON public.marketplace_listings
  FOR UPDATE USING (supplier_id = auth.uid())
  WITH CHECK (supplier_id = auth.uid());

CREATE POLICY "Suppliers can delete their own listings" ON public.marketplace_listings
  FOR DELETE USING (supplier_id = auth.uid());

CREATE INDEX idx_marketplace_listings_supplier_id ON public.marketplace_listings(supplier_id);
CREATE INDEX idx_marketplace_listings_category ON public.marketplace_listings(category);
CREATE INDEX idx_marketplace_listings_is_active ON public.marketplace_listings(is_active);

-- ============================================================================
-- 4. MARKETPLACE ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(15, 2) NOT NULL,
  total_amount NUMERIC(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'quoted' CHECK (status IN ('quoted', 'ordered', 'shipped', 'delivered', 'installed')),
  shipping_address TEXT,
  tracking_number TEXT,
  expected_delivery DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_marketplace_orders_listing FOREIGN KEY (listing_id) REFERENCES public.marketplace_listings(id) ON DELETE RESTRICT,
  CONSTRAINT fk_marketplace_orders_buyer FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_marketplace_orders_supplier FOREIGN KEY (supplier_id) REFERENCES auth.users(id) ON DELETE RESTRICT
);

ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders" ON public.marketplace_orders
  FOR SELECT USING (buyer_id = auth.uid() OR supplier_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Buyers can create orders" ON public.marketplace_orders
  FOR INSERT WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Buyers and suppliers can update orders" ON public.marketplace_orders
  FOR UPDATE USING (buyer_id = auth.uid() OR supplier_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid() OR supplier_id = auth.uid());

CREATE INDEX idx_marketplace_orders_listing_id ON public.marketplace_orders(listing_id);
CREATE INDEX idx_marketplace_orders_buyer_id ON public.marketplace_orders(buyer_id);
CREATE INDEX idx_marketplace_orders_supplier_id ON public.marketplace_orders(supplier_id);
CREATE INDEX idx_marketplace_orders_status ON public.marketplace_orders(status);

-- ============================================================================
-- 5. MARKETPLACE TRANSACTIONS TABLE
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('card', 'ach', 'net30');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded', 'simulated');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL,
  payment_method payment_method NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  fee_amount NUMERIC(15, 2) DEFAULT 0,
  net_amount NUMERIC(15, 2) NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  idempotency_key TEXT UNIQUE,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_marketplace_transactions_order FOREIGN KEY (order_id) REFERENCES public.marketplace_orders(id) ON DELETE RESTRICT
);

ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their transaction details" ON public.marketplace_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_orders
      WHERE marketplace_orders.id = marketplace_transactions.order_id
      AND (marketplace_orders.buyer_id = auth.uid() OR marketplace_orders.supplier_id = auth.uid())
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Service role can manage transactions" ON public.marketplace_transactions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update transactions" ON public.marketplace_transactions
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE INDEX idx_marketplace_transactions_order_id ON public.marketplace_transactions(order_id);
CREATE INDEX idx_marketplace_transactions_status ON public.marketplace_transactions(status);
CREATE INDEX idx_marketplace_transactions_stripe_payment_intent ON public.marketplace_transactions(stripe_payment_intent_id);

-- ============================================================================
-- 6. WEATHER LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.weather_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  location TEXT NOT NULL,
  date DATE NOT NULL,
  condition TEXT,
  temp_high NUMERIC(5, 2),
  temp_low NUMERIC(5, 2),
  wind_speed NUMERIC(5, 2),
  precipitation_probability NUMERIC(5, 2) CHECK (precipitation_probability >= 0 AND precipitation_probability <= 100),
  impact_assessment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_weather_logs_project FOREIGN KEY (project_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.weather_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view weather logs for their projects" ON public.weather_logs
  FOR SELECT USING (auth.uid() = project_id OR auth.role() = 'service_role');

CREATE POLICY "Users can insert weather logs for their projects" ON public.weather_logs
  FOR INSERT WITH CHECK (auth.uid() = project_id);

CREATE POLICY "Users can update their own weather logs" ON public.weather_logs
  FOR UPDATE USING (auth.uid() = project_id);

CREATE INDEX idx_weather_logs_project_id ON public.weather_logs(project_id);
CREATE INDEX idx_weather_logs_date ON public.weather_logs(date);

-- ============================================================================
-- 7. DREAM PROJECT LINKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dream_project_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dream_id UUID NOT NULL,
  project_id UUID NOT NULL,
  created_by UUID NOT NULL,
  match_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (match_percentage >= 0 AND match_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(dream_id, project_id),
  CONSTRAINT fk_dream_project_links_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.dream_project_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dream project links they created" ON public.dream_project_links
  FOR SELECT USING (created_by = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Users can create dream project links" ON public.dream_project_links
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update links they created" ON public.dream_project_links
  FOR UPDATE USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete links they created" ON public.dream_project_links
  FOR DELETE USING (created_by = auth.uid());

CREATE INDEX idx_dream_project_links_dream_id ON public.dream_project_links(dream_id);
CREATE INDEX idx_dream_project_links_project_id ON public.dream_project_links(project_id);
CREATE INDEX idx_dream_project_links_created_by ON public.dream_project_links(created_by);

-- ============================================================================
-- 8. SEASONAL CHALLENGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.seasonal_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  year INT NOT NULL,
  theme TEXT NOT NULL,
  description TEXT,
  objectives JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.seasonal_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges" ON public.seasonal_challenges
  FOR SELECT USING (is_active = true OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage challenges" ON public.seasonal_challenges
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update challenges" ON public.seasonal_challenges
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE INDEX idx_seasonal_challenges_month_year ON public.seasonal_challenges(month, year);
CREATE INDEX idx_seasonal_challenges_is_active ON public.seasonal_challenges(is_active);

-- ============================================================================
-- 9. CHALLENGE PROGRESS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.challenge_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL,
  objective_index INT NOT NULL,
  progress INT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, challenge_id, objective_index),
  CONSTRAINT fk_challenge_progress_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_challenge_progress_challenge FOREIGN KEY (challenge_id) REFERENCES public.seasonal_challenges(id) ON DELETE CASCADE
);

ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own challenge progress" ON public.challenge_progress
  FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own progress" ON public.challenge_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progress (update)" ON public.challenge_progress
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_challenge_progress_user_id ON public.challenge_progress(user_id);
CREATE INDEX idx_challenge_progress_challenge_id ON public.challenge_progress(challenge_id);
CREATE INDEX idx_challenge_progress_completed ON public.challenge_progress(completed);

-- ============================================================================
-- 10. SOCIAL SHARES TABLE
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE share_type AS ENUM ('dream', 'achievement', 'progress', 'project');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.social_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  share_type share_type NOT NULL,
  card_data JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  views INT DEFAULT 0,
  clicks INT DEFAULT 0,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_social_shares_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.social_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public shares" ON public.social_shares
  FOR SELECT USING (is_public = true OR user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Users can create shares" ON public.social_shares
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own shares" ON public.social_shares
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own shares" ON public.social_shares
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_social_shares_user_id ON public.social_shares(user_id);
CREATE INDEX idx_social_shares_is_public ON public.social_shares(is_public);
CREATE INDEX idx_social_shares_created_at ON public.social_shares(created_at);

-- ============================================================================
-- 11. WORLDWALKER JOBS TABLE
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE worldwalker_status AS ENUM ('uploaded', 'analyzing', 'generating', 'rendering', 'complete', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.worldwalker_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  status worldwalker_status NOT NULL DEFAULT 'uploaded',
  input_image_url TEXT,
  model_url TEXT,
  materials_detected JSONB DEFAULT '[]',
  dimensions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_worldwalker_jobs_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.worldwalker_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs" ON public.worldwalker_jobs
  FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Users can create jobs" ON public.worldwalker_jobs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own jobs" ON public.worldwalker_jobs
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_worldwalker_jobs_user_id ON public.worldwalker_jobs(user_id);
CREATE INDEX idx_worldwalker_jobs_status ON public.worldwalker_jobs(status);
CREATE INDEX idx_worldwalker_jobs_created_at ON public.worldwalker_jobs(created_at);

-- ============================================================================
-- 12. RFI ITEMS TABLE
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE rfi_status AS ENUM ('open', 'answered', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.rfi_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  rfi_number SERIAL NOT NULL,
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  status rfi_status NOT NULL DEFAULT 'open',
  priority priority_level NOT NULL DEFAULT 'medium',
  submitted_by UUID NOT NULL,
  assigned_to UUID,
  due_date DATE,
  responded_at TIMESTAMP WITH TIME ZONE,
  cost_impact NUMERIC(15, 2),
  schedule_impact INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_rfi_items_project FOREIGN KEY (project_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rfi_items_submitted_by FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_rfi_items_assigned_to FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.rfi_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view RFI items for their projects" ON public.rfi_items
  FOR SELECT USING (auth.uid() = project_id OR submitted_by = auth.uid() OR assigned_to = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Users can create RFI items" ON public.rfi_items
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Users can update RFI items" ON public.rfi_items
  FOR UPDATE USING (submitted_by = auth.uid() OR assigned_to = auth.uid())
  WITH CHECK (submitted_by = auth.uid() OR assigned_to = auth.uid());

CREATE INDEX idx_rfi_items_project_id ON public.rfi_items(project_id);
CREATE INDEX idx_rfi_items_submitted_by ON public.rfi_items(submitted_by);
CREATE INDEX idx_rfi_items_assigned_to ON public.rfi_items(assigned_to);
CREATE INDEX idx_rfi_items_status ON public.rfi_items(status);
CREATE INDEX idx_rfi_items_priority ON public.rfi_items(priority);
CREATE INDEX idx_rfi_items_due_date ON public.rfi_items(due_date);

-- ============================================================================
-- 13. INSPECTION RECORDS TABLE
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE inspection_status AS ENUM ('pending', 'pass', 'fail', 'conditional');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.inspection_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  category TEXT NOT NULL,
  inspector TEXT NOT NULL,
  inspection_date DATE NOT NULL,
  status inspection_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  jurisdiction TEXT,
  signature_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_inspection_records_project FOREIGN KEY (project_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.inspection_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inspection records for their projects" ON public.inspection_records
  FOR SELECT USING (auth.uid() = project_id OR auth.role() = 'service_role');

CREATE POLICY "Users can create inspection records" ON public.inspection_records
  FOR INSERT WITH CHECK (auth.uid() = project_id);

CREATE POLICY "Users can update their own inspection records" ON public.inspection_records
  FOR UPDATE USING (auth.uid() = project_id)
  WITH CHECK (auth.uid() = project_id);

CREATE INDEX idx_inspection_records_project_id ON public.inspection_records(project_id);
CREATE INDEX idx_inspection_records_status ON public.inspection_records(status);
CREATE INDEX idx_inspection_records_inspection_date ON public.inspection_records(inspection_date);

-- ============================================================================
-- 14. INSPECTION ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inspection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status inspection_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  photos_required BOOLEAN DEFAULT false,
  item_order INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_inspection_items_inspection FOREIGN KEY (inspection_id) REFERENCES public.inspection_records(id) ON DELETE CASCADE
);

ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inspection items" ON public.inspection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inspection_records
      WHERE inspection_records.id = inspection_items.inspection_id
      AND (inspection_records.project_id = auth.uid() OR auth.role() = 'service_role')
    )
  );

CREATE POLICY "Users can insert inspection items" ON public.inspection_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_records
      WHERE inspection_records.id = inspection_items.inspection_id
      AND inspection_records.project_id = auth.uid()
    )
  );

CREATE POLICY "Users can update inspection items" ON public.inspection_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.inspection_records
      WHERE inspection_records.id = inspection_items.inspection_id
      AND inspection_records.project_id = auth.uid()
    )
  );

CREATE INDEX idx_inspection_items_inspection_id ON public.inspection_items(inspection_id);

-- ============================================================================
-- 15. PERMITS TABLE
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE permit_status AS ENUM ('not_applied', 'submitted', 'under_review', 'approved', 'expired', 'denied');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.permits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  permit_type TEXT NOT NULL,
  status permit_status NOT NULL DEFAULT 'not_applied',
  jurisdiction TEXT NOT NULL,
  permit_number TEXT,
  submitted_date DATE,
  approval_date DATE,
  expiry_date DATE,
  cost NUMERIC(15, 2),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_permits_project FOREIGN KEY (project_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_permits_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT
);

ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view permits for their projects" ON public.permits
  FOR SELECT USING (auth.uid() = project_id OR created_by = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Users can create permits" ON public.permits
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update permits they created" ON public.permits
  FOR UPDATE USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE INDEX idx_permits_project_id ON public.permits(project_id);
CREATE INDEX idx_permits_created_by ON public.permits(created_by);
CREATE INDEX idx_permits_status ON public.permits(status);
CREATE INDEX idx_permits_expiry_date ON public.permits(expiry_date);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON
  public.invoices,
  public.invoice_line_items,
  public.marketplace_listings,
  public.marketplace_orders,
  public.marketplace_transactions,
  public.weather_logs,
  public.dream_project_links,
  public.seasonal_challenges,
  public.challenge_progress,
  public.social_shares,
  public.worldwalker_jobs,
  public.rfi_items,
  public.inspection_records,
  public.inspection_items,
  public.permits
TO authenticated;
