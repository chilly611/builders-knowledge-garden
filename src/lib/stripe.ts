// src/lib/stripe.ts — STRIPE-WIRE central client + helpers
// =========================================================
// All Stripe access in the app should go through this module so that:
//
//   1. The SDK is constructed once per lambda (singleton).
//   2. Code paths that don't need Stripe (most of the app) can be
//      compiled and shipped even when STRIPE_SECRET_KEY is unset.
//      Helpers return `null` / `false` rather than throwing so callers
//      can decide whether to 503 or just no-op.
//   3. Mode (test vs live) is computed from the key prefix; we refuse
//      to use a live key unless STRIPE_LIVE_MODE=true is also set —
//      a belt-and-suspenders guard against an ops mistake billing
//      real customers from a dev branch.
//
// Public surface:
//   - isStripeConfigured()        boolean
//   - getStripeMode()             'test' | 'live' | 'unconfigured'
//   - getStripeOrNull()           Stripe | null
//   - createCheckoutSession(...)  -> { url } | null
//   - createPortalSession(...)    -> { url } | null
//   - getSubscription(id)         -> Stripe.Subscription | null
//   - getCustomerCountSnapshot()  -> { has_customers, mode } | null
//   - TIERS / TIER_PRICES / getTierBySlug / canAccessFeature
//     (kept for backwards compat with existing /pricing UI).

// @ts-ignore — depending on env, @types/stripe may not be installed.
import Stripe from "stripe";

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let stripeInstance: Stripe | null = null;

function placeholderKey(k: string | undefined | null): boolean {
  if (!k) return true;
  return k.includes("placeholder") || k.length < 12;
}

/**
 * True iff we have a usable STRIPE_SECRET_KEY. Doesn't actually probe
 * the API — just inspects the env var shape. Cheap; safe to call on
 * every request.
 */
export function isStripeConfigured(): boolean {
  return !placeholderKey(process.env.STRIPE_SECRET_KEY);
}

/**
 * Reports which mode the configured key is in. Returns `'unconfigured'`
 * when no key is present, `'test'` for `sk_test_…` keys, `'live'` for
 * `sk_live_…` keys.
 */
export function getStripeMode(): "test" | "live" | "unconfigured" {
  const k = process.env.STRIPE_SECRET_KEY;
  if (placeholderKey(k)) return "unconfigured";
  if (k!.startsWith("sk_live_")) return "live";
  return "test";
}

/**
 * Returns a Stripe SDK instance, or `null` if the secret is missing/
 * placeholder. Never throws. Callers that need to fail loudly should
 * use the `getStripe()` shim below.
 */
export function getStripeOrNull(): Stripe | null {
  if (stripeInstance) return stripeInstance;
  if (!isStripeConfigured()) return null;

  // LIVE-mode safety: refuse to construct a live client unless the
  // operator explicitly opted in via STRIPE_LIVE_MODE=true. This guards
  // against a preview deployment accidentally charging customers if
  // someone copy-pastes a live key into a dev env.
  if (
    getStripeMode() === "live" &&
    process.env.STRIPE_LIVE_MODE !== "true"
  ) {
    console.warn(
      "[stripe] Live-mode key detected but STRIPE_LIVE_MODE!=true; refusing to initialize.",
    );
    return null;
  }

  stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // Pinning an API version stops Stripe from silently changing field
    // shapes under our feet. Bump deliberately when upgrading.
    apiVersion: "2024-12-18.acacia" as any,
    // Surfacing a user-agent makes Stripe's request logs grep-able.
    appInfo: { name: "bkg-app", version: "1.0.0" },
  });
  return stripeInstance;
}

/**
 * Throws if Stripe isn't configured. Use sparingly — most callers
 * should prefer `getStripeOrNull()` so the route can return 503.
 */
export function getStripe(): Stripe {
  const s = getStripeOrNull();
  if (!s) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured (or is in live mode without STRIPE_LIVE_MODE=true). Add it to your Vercel env.",
    );
  }
  return s;
}

/**
 * Reset the cached client. Tests should call this between cases when
 * they swap the env var.
 */
export function _resetStripeForTests() {
  stripeInstance = null;
}

// ---------------------------------------------------------------------------
// Tier → Price ID mapping
// ---------------------------------------------------------------------------
//
// Pricing tiers per the STRIPE-WIRE spec (see docs/STRIPE-SETUP.md).
// Operator populates STRIPE_PRICE_PRO etc. with the recurring Price
// IDs from the Stripe dashboard. We accept both the bare env vars and
// the older `_MONTHLY` / `_YEARLY` split so this module stays backward
// compatible with anything that was already referencing them.

// We re-read env on each call rather than freezing at module-load so
// hot-reload + tests + Vercel env-var changes pick up without needing a
// process restart. Cost is one object literal allocation per call.
export function tierPrices(): Record<string, { monthly: string; yearly: string }> {
  return {
    pro: {
      monthly:
        process.env.STRIPE_PRICE_PRO_MONTHLY ||
        process.env.STRIPE_PRICE_PRO ||
        "",
      yearly: process.env.STRIPE_PRICE_PRO_YEARLY || "",
    },
    team: {
      monthly:
        process.env.STRIPE_PRICE_TEAM_MONTHLY ||
        process.env.STRIPE_PRICE_TEAM ||
        "",
      yearly: process.env.STRIPE_PRICE_TEAM_YEARLY || "",
    },
    enterprise: {
      monthly:
        process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ||
        process.env.STRIPE_PRICE_ENTERPRISE ||
        "",
      yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || "",
    },
  };
}

// Back-compat — some callers import TIER_PRICES directly. This is a
// snapshot at module-load time; prefer `tierPrices()` for fresh reads.
export const TIER_PRICES = tierPrices();

export function getPriceId(
  tier: string,
  interval: "monthly" | "yearly" = "monthly",
): string {
  const t = tierPrices()[tier];
  if (!t) return "";
  return t[interval] || "";
}

/**
 * Reverse-map a Stripe Price ID back to our tier slug. Used by the
 * webhook handler so we know which tier to write into the DB when
 * Stripe tells us about a subscription change.
 */
export function getTierFromPriceId(priceId: string): string {
  if (!priceId) return "free";
  for (const [tier, prices] of Object.entries(tierPrices())) {
    if (prices.monthly === priceId || prices.yearly === priceId) return tier;
  }
  return "free";
}

// ---------------------------------------------------------------------------
// Tier metadata (shared between server + client)
// ---------------------------------------------------------------------------

export interface TierInfo {
  name: string;
  slug: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
  limits: {
    projects: number; // -1 = unlimited
    contractsPerMonth: number; // -1 = unlimited
    teamMembers: number; // -1 = unlimited
  };
  cta: string;
  highlighted?: boolean;
}

export const TIERS: TierInfo[] = [
  {
    name: "Free",
    slug: "free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Run a single project, sign in-app, learn the platform.",
    features: [
      "1 project",
      "5 contracts/month (in-app signatures only)",
      "100 RFIs / 100 punch items / 100 invoices (lifetime)",
      "Single user — no org members",
      "Knowledge corpus read access",
    ],
    limits: { projects: 1, contractsPerMonth: 5, teamMembers: 1 },
    cta: "Get started",
  },
  {
    name: "Pro",
    slug: "pro",
    monthlyPrice: 49,
    yearlyPrice: 470,
    description: "Everything a solo builder needs to run jobs end-to-end.",
    features: [
      "5 active projects",
      "50 contracts/month",
      "Documenso e-signatures (5/mo)",
      "Unlimited RFIs / punch / invoices",
      "Knowledge corpus + MEP calcs + vendor master",
      "Priority email support",
    ],
    limits: { projects: 5, contractsPerMonth: 50, teamMembers: 1 },
    cta: "Start Pro",
    highlighted: true,
  },
  {
    name: "Team",
    slug: "team",
    monthlyPrice: 149,
    yearlyPrice: 1430,
    description: "Multi-user org with sub-bid inbox and unlimited contracts.",
    features: [
      "Unlimited projects",
      "Unlimited contracts + Documenso",
      "Multi-user org (up to 10) with project_members",
      "Sub-bid inbox",
      "Real CSLB integration",
      "Priority email support",
    ],
    limits: { projects: -1, contractsPerMonth: -1, teamMembers: 10 },
    cta: "Start Team",
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    monthlyPrice: 1500,
    yearlyPrice: 14400,
    description: "For builders running enterprise-grade construction ops.",
    features: [
      "Everything in Team",
      "Dedicated success manager",
      "Custom integrations (UpCodes/ICC when licensed)",
      "Audit log API access",
      "SLA, SOC2 promised by 2027",
    ],
    limits: { projects: -1, contractsPerMonth: -1, teamMembers: -1 },
    cta: "Contact sales",
  },
];

export function getTierBySlug(slug: string): TierInfo | undefined {
  return TIERS.find((t) => t.slug === slug);
}

export function canAccessFeature(
  userTier: string,
  requiredTier: string,
): boolean {
  // Legacy `explorer` (Knowledge Garden naming) maps to the new `free`.
  const norm = (t: string) => (t === "explorer" ? "free" : t);
  const order = ["free", "pro", "team", "enterprise"];
  return order.indexOf(norm(userTier)) >= order.indexOf(norm(requiredTier));
}

// ---------------------------------------------------------------------------
// High-level helpers — return null when Stripe is unconfigured so route
// handlers can return 503 without try/catching every call.
// ---------------------------------------------------------------------------

export interface CheckoutArgs {
  tier: string;
  interval?: "monthly" | "yearly";
  email?: string;
  userId?: string;
  orgId?: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export async function createCheckoutSession(
  args: CheckoutArgs,
): Promise<{ id: string; url: string | null } | null> {
  const stripe = getStripeOrNull();
  if (!stripe) return null;

  const priceId = getPriceId(args.tier, args.interval ?? "monthly");
  if (!priceId) {
    throw new Error(
      `No Stripe price configured for tier=${args.tier} interval=${args.interval ?? "monthly"}. Set STRIPE_PRICE_${args.tier.toUpperCase()} in env.`,
    );
  }

  const params: any = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      tier: args.tier,
      interval: args.interval ?? "monthly",
      userId: args.userId ?? "",
      orgId: args.orgId ?? "",
      ...(args.metadata ?? {}),
    },
  };

  if (args.customerId) {
    params.customer = args.customerId;
  } else if (args.email) {
    params.customer_email = args.email;
  }

  const session = await stripe.checkout.sessions.create(params);
  return { id: session.id, url: session.url ?? null };
}

export async function createPortalSession(args: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string } | null> {
  const stripe = getStripeOrNull();
  if (!stripe) return null;
  const session = await stripe.billingPortal.sessions.create({
    customer: args.customerId,
    return_url: args.returnUrl,
  });
  return { url: session.url };
}

export async function getSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription | null> {
  const stripe = getStripeOrNull();
  if (!stripe || !subscriptionId) return null;
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (e) {
    console.warn("[stripe] getSubscription failed:", (e as Error).message);
    return null;
  }
}

/**
 * Cheap probe used by the platform healthcheck. Returns the count
 * snapshot ("has customers or not") + the current mode. Returns null
 * if Stripe isn't configured.
 */
export async function getCustomerCountSnapshot(): Promise<
  | { mode: "test" | "live"; has_customers: boolean; sampled: number }
  | null
> {
  const stripe = getStripeOrNull();
  const mode = getStripeMode();
  if (!stripe || mode === "unconfigured") return null;
  try {
    const list = await stripe.customers.list({ limit: 1 });
    return {
      mode,
      has_customers: (list.data?.length ?? 0) > 0 || Boolean(list.has_more),
      sampled: list.data?.length ?? 0,
    };
  } catch (e) {
    console.warn(
      "[stripe] getCustomerCountSnapshot failed:",
      (e as Error).message,
    );
    return null;
  }
}

/**
 * Construct + verify a webhook event. Returns the parsed event, or
 * `null` if signature verification fails (caller should return 400).
 * If STRIPE_WEBHOOK_SECRET isn't set we still parse the body but mark
 * the event as unverified — handy for local `stripe trigger` testing,
 * but logs a warning so production misconfigurations are visible.
 */
export function constructWebhookEvent(
  rawBody: string,
  signatureHeader: string | null,
): { event: Stripe.Event; verified: boolean } | null {
  const stripe = getStripeOrNull();
  if (!stripe) return null;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (secret && signatureHeader) {
    try {
      const ev = stripe.webhooks.constructEvent(
        rawBody,
        signatureHeader,
        secret,
      );
      return { event: ev, verified: true };
    } catch (e) {
      console.error(
        "[stripe] webhook signature verification failed:",
        (e as Error).message,
      );
      return null;
    }
  }
  // Unverified path — only safe when STRIPE_WEBHOOK_SECRET isn't set
  // (i.e. local dev). In production this branch should never run; the
  // env var is required.
  console.warn(
    "[stripe] webhook received without STRIPE_WEBHOOK_SECRET; trusting payload as-is",
  );
  try {
    return { event: JSON.parse(rawBody) as Stripe.Event, verified: false };
  } catch {
    return null;
  }
}
