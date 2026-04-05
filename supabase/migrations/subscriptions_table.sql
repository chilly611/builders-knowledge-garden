-- Subscriptions table for Stripe webhook
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  tier text DEFAULT 'explorer' NOT NULL,
  status text DEFAULT 'none' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages subscriptions"
  ON subscriptions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users read own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
