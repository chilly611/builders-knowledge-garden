# Stripe setup — BKG billing wiring

This is the operator runbook for taking BKG billing from “unconfigured”
(the default) → test mode → live mode. The code is already in place;
this file walks through the dashboard/env-var work the engineer can’t
do automatically.

## Architecture (TL;DR)

- `src/lib/stripe.ts` — singleton client + helpers. Returns `null`/
  `false` rather than throwing when keys are absent, so the app builds
  and ships in any environment.
- `src/app/api/v1/stripe/{checkout,portal,subscription,webhook}/route.ts`
  — HTTP surface. All return 503 `{error: 'stripe_not_configured'}`
  when `STRIPE_SECRET_KEY` is missing.
- `src/app/billing/page.tsx` — user-facing billing dashboard.
- `public.subscriptions` — extended by migration
  `subscriptions_stripe_wire_extend` to carry org_id, user_id, period
  dates, etc. Email column kept nullable for legacy.
- `public.stripe_webhook_events` — idempotency log (Stripe retries on
  any non-2xx + sometimes on 2xx).
- `/api/v1/healthcheck` reports a `stripe` sub-check (configured?
  test/live? has customers?).

## Required env vars

| Var | Notes |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` for test mode, `sk_live_…` for live. Required for any Stripe call. |
| `STRIPE_WEBHOOK_SECRET` | From the webhook endpoint config in Stripe dashboard. Required in production. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` / `pk_live_…`. Only needed if you embed Stripe.js directly. |
| `STRIPE_PRICE_PRO` | Price ID (`price_…`) for Pro monthly. |
| `STRIPE_PRICE_TEAM` | Price ID for Team monthly. |
| `STRIPE_PRICE_ENTERPRISE` | Leave empty if Enterprise is contact-sales. |
| `STRIPE_PRICE_PRO_YEARLY` | Optional yearly price IDs. |
| `STRIPE_PRICE_TEAM_YEARLY` | Optional yearly price IDs. |
| `STRIPE_PRICE_ENTERPRISE_YEARLY` | Optional. |
| `NEXT_PUBLIC_STRIPE_LINK_PRO` | Fallback Payment Link URL (used by GET `/api/v1/stripe/checkout?tier=pro`). |
| `NEXT_PUBLIC_STRIPE_LINK_TEAM` | Same, for Team. |
| `NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE` | Same, for Enterprise (or an email link). |
| `STRIPE_LIVE_MODE` | Set to `true` only when you want the client to actually accept a `sk_live_…` key. Belt-and-suspenders against an ops mistake. |

## Step-by-step: bring billing online (test mode)

### 1. Create the Stripe account
1. Go to <https://stripe.com>, create the BKG account.
2. Activate it (legal entity, bank account, tax info). You can skip
   activation for test mode but most testing flows want it complete.

### 2. Grab test-mode API keys
1. In the Stripe dashboard, make sure the toggle at top-left says
   **Test mode** (the entire env is mode-scoped).
2. Developers → API keys → copy:
   - Publishable key (`pk_test_…`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key (`sk_test_…`) → `STRIPE_SECRET_KEY`

### 3. Create the three Products
For each tier in **test mode**:

| Product name | Pricing model | Monthly price | Notes |
|---|---|---|---|
| BKG Pro | Recurring, per-month | $49.00 USD | One price object, monthly. |
| BKG Team | Recurring, per-month | $149.00 USD | Set quantity behavior to “let customer choose” if you want seats, or leave default. |
| BKG Enterprise | (skip) | — | Don’t create a product; the UI sends Enterprise users to `mailto:`. |

For each, click into the Product → Pricing → copy the **recurring Price
ID** (looks like `price_1Q…`). Don’t use the Product ID — it won’t work.

Optionally create a yearly Price on each Product (Pro $470/yr, Team
$1,430/yr) and copy those IDs too.

### 4. Set env vars in Vercel
In the Vercel project → Settings → Environment Variables. Add for the
**Production** environment (also Preview if you want to test on PRs):

```
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…             # filled in step 6
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
STRIPE_PRICE_PRO=price_…
STRIPE_PRICE_TEAM=price_…
STRIPE_PRICE_PRO_YEARLY=price_…           # optional
STRIPE_PRICE_TEAM_YEARLY=price_…          # optional
```

Redeploy. Hit `/api/v1/healthcheck?detailed=1` — the `stripe` check
should now show `configured: true, mode: "test"`.

### 5. Activate the Customer Portal
This is the part that bites every Stripe integration the first time.
The `/api/v1/stripe/portal` route will return **409
`portal_not_configured_in_stripe_dashboard`** until you do this.

1. Stripe dashboard → Settings → Billing → Customer Portal.
2. Pick what users are allowed to do:
   - Update payment method: yes.
   - Update billing/shipping info: yes.
   - View invoice history: yes.
   - Cancel subscriptions: recommended yes (immediate or at period end).
   - Switch plans: optional — if you turn this on, list the prices you
     want them to be able to switch between.
3. Save.

You have to do this **separately for test mode and live mode** — they
don’t share configs.

### 6. Set up the webhook endpoint
1. Stripe dashboard → Developers → Webhooks → Add endpoint.
2. URL: `https://builders.theknowledgegardens.com/api/v1/stripe/webhook`
   (replace with whatever your deployed URL is for the env you’re
   wiring).
3. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Save. Click into the endpoint → reveal the **Signing secret**
   (`whsec_…`) → paste into Vercel as `STRIPE_WEBHOOK_SECRET`. Redeploy.

### 7. Test the loop
Three options, in order of friction:

**a. Browser flow** — visit `/billing` in your deployed app, click
“Upgrade to Pro”. Use Stripe’s test card `4242 4242 4242 4242`, any
future expiry, any CVC, any zip. You should land back on `/billing?
success=true` with tier=pro and an active subscription.

**b. Stripe CLI** — install the CLI (`brew install stripe/stripe-cli/
stripe`), `stripe login`, then:

```
stripe listen --forward-to https://builders.theknowledgegardens.com/api/v1/stripe/webhook
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

You should see 200s in the CLI output and the `subscriptions` row
update accordingly. The handler logs `[stripe-webhook] …` lines you
can grep for in Vercel logs.

**c. SQL** — query `public.stripe_webhook_events` to confirm event ids
are recorded (idempotency working) and `public.subscriptions` to see
the synced state.

### 8. Switch to live mode
1. Stripe dashboard → flip mode toggle to **Live mode**.
2. Repeat steps 2 (API keys, now `pk_live_…`/`sk_live_…`), 3 (Products
   + Prices live-mode equivalents), 5 (portal), 6 (webhook + new
   signing secret).
3. In Vercel, update env vars to the live values. Set
   **`STRIPE_LIVE_MODE=true`** — the stripe client refuses to
   initialize on a `sk_live_…` key without this. This is intentional;
   it stops a preview deployment from charging anyone if the wrong key
   was pasted into the wrong env.
4. Redeploy. Re-test the browser flow with a real card on a $0.50
   one-shot (use a coupon, then refund) to confirm.

## Risk callouts

- **Webhook idempotency**: We dedupe on `event.id` in
  `stripe_webhook_events`. If you ever need to replay an event
  manually (e.g. after a bug fix), `DELETE FROM stripe_webhook_events
  WHERE event_id = 'evt_…'` first or the handler will short-circuit.
- **Customer portal**: Step 5 is required twice (test + live). The
  `/billing` page shows a clear message if it 409s.
- **Test vs live safety**: `STRIPE_LIVE_MODE=true` gate is the only
  thing standing between you and accidentally accepting real money
  from a preview branch. Don’t set it in Preview env.
- **Multi-tenant billing**: One sub row carries `user_id` AND `org_id`.
  Team plans should set `org_id` on the Checkout Session metadata so
  the webhook writes back to the right tenant. Pro plans default to
  `user_id` only.
- **Subscription drift**: If a customer churns and resubscribes
  outside our checkout (e.g. via Stripe’s recovery dunning), the
  webhook will create a new row keyed by the new `stripe_subscription_
  id`. Query by `user_id` ordered by `updated_at DESC` — the
  subscription route does this for you.
- **Email-only legacy rows**: One row from the previous Knowledge
  Garden Stripe integration is still email-keyed. The new schema
  treats this as a fallback identifier — leave the row alone, future
  events will populate the new columns.
