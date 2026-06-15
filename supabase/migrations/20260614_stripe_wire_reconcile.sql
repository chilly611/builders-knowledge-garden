-- 20260614_stripe_wire_reconcile.sql
-- ============================================================================
-- STRIPE-WIRE schema reconciliation — converge the live `subscriptions` table
-- (and the idempotency log + the profile mirror) onto what the webhook/route
-- code actually reads & writes.
--
-- WHY: three earlier migrations (subscriptions.sql, subscriptions_table.sql,
-- subscriptions_and_budgets.sql) each define `subscriptions` with
-- `CREATE TABLE IF NOT EXISTS` — so only the FIRST to ever run wins and the
-- others silently no-op. They disagree (email-keyed vs. user_id-keyed; only one
-- makes stripe_subscription_id UNIQUE; none has org_id). The handler, however,
-- was written against the UNION of all three plus an `org_id` column and a
-- `stripe_webhook_events` idempotency log that NO committed migration creates.
-- The result: on a real purchase the webhook's upsert (which needs unique
-- arbiters on BOTH stripe_subscription_id AND email) and the idempotency insert
-- can fail, so the subscription is never persisted and entitlement never flips.
--
-- This migration makes the live schema match the code, idempotently, so it is
-- safe to run regardless of which variant is currently live.
--
-- SAFE TO RE-RUN. Every statement is IF [NOT] EXISTS / guarded in a DO block.
-- APPLY: supervised, against shared prod (knowledge-gardens-prod /
-- vlezoyalutexenbnzzui). After apply, reload the PostgREST schema cache:
--     NOTIFY pgrst, 'reload schema';
-- (Supabase usually auto-reloads on DDL; the NOTIFY is belt-and-suspenders.)
-- ============================================================================

-- 0. Guarantee the table exists (no-op if any prior variant already made it).
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY
);

-- 1. Every column the code reads/writes — add any the live variant lacks.
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_price_id text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tier text DEFAULT 'free';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS status text DEFAULT 'none';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS current_period_start timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS canceled_at timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. The email-keyed variant declares `email UNIQUE NOT NULL`; the user_id
--    variant declares `user_id NOT NULL`. Either NOT NULL blocks a legitimate
--    insert from the other code path (a Pro checkout has user_id but no email
--    until customer_details arrives; a legacy row has email but no user_id).
--    Make both nullable.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='subscriptions' AND column_name='email') THEN
    ALTER TABLE public.subscriptions ALTER COLUMN email DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='subscriptions' AND column_name='user_id') THEN
    ALTER TABLE public.subscriptions ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- 3. Drop any strict tier/status CHECK (one variant only allows
--    explorer/pro/team/enterprise + a status enum that excludes the 'free' /
--    'none' values the handler writes) and replace with permissive ones.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass AND contype = 'c'
      AND (pg_get_constraintdef(oid) ILIKE '%tier%' OR pg_get_constraintdef(oid) ILIKE '%status%')
  LOOP
    EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT %I', c);
  END LOOP;
  ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_tier_check
    CHECK (tier IN ('free','explorer','pro','team','enterprise'));
  ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_status_check
    CHECK (status IN ('active','trialing','past_due','canceled','incomplete',
                      'incomplete_expired','paused','unpaid','none'));
END $$;

-- 4. Unique indexes that BOTH webhook upsert arbiters require. Full (non-
--    partial) so PostgREST `on_conflict=<col>` can use them as the conflict
--    target; nullable columns permit many NULLs (each NULL is distinct), so
--    this does NOT constrain rows that lack the key.
--    NOTE: a CREATE UNIQUE INDEX will FAIL if the live table already holds
--    DUPLICATE non-null values in either column. None are expected (Stripe was
--    never live), but if it errors, dedupe those rows first, then re-run.
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_stripe_subscription_id
  ON public.subscriptions (stripe_subscription_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_email
  ON public.subscriptions (email);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions (org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON public.subscriptions (stripe_customer_id);

-- 5. RLS: service role manages, users read their own (by user_id OR email).
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.subscriptions;
CREATE POLICY "Service role manages subscriptions" ON public.subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Users read own subscription" ON public.subscriptions;
CREATE POLICY "Users read own subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 6. Idempotency log the webhook depends on (no committed migration made it).
--    The handler inserts event.id here and treats a 23505 unique-violation as
--    "already processed". Without this table the insert errors with a
--    non-23505 code and every Stripe retry reprocesses the event.
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id    text PRIMARY KEY,
  event_type  text,
  received_at timestamptz DEFAULT now()
);
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Service role manages webhook events" ON public.stripe_webhook_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. The entitlement mirror on user_profiles is the `lane` column, NOT `tier`
--    (user_profiles has no `tier` column — lane's CHECK is
--    explorer/pro/team/enterprise). Redefine the sync trigger to write `lane`,
--    collapsing the billing-world 'free' → 'explorer' to satisfy that CHECK.
--    (The previous version wrote a non-existent `tier` column and would throw,
--    rolling back the subscription write that fired it.)
CREATE OR REPLACE FUNCTION public.sync_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.user_profiles
       SET lane = CASE WHEN NEW.tier IN ('free') THEN 'explorer' ELSE NEW.tier END,
           updated_at = now()
     WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_subscription_change ON public.subscriptions;
CREATE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE OF tier ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_subscription_tier();
