// Stripe server-side client — singleton for API routes
// Uses STRIPE_SECRET_KEY (test mode key for now)

// @ts-ignore — types may or may not be present depending on environment
import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.includes("placeholder")) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Add it to your .env.local file."
    );
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: "2024-12-18.acacia" as any,
  });

  return stripeInstance;
}

/* ─── Tier → Stripe Price mapping ─── */
// These map to Stripe Price IDs created in the Stripe Dashboard (test mode)
// Replace with real price IDs from your Stripe dashboard

export const TIER_PRICES: Record<string, { monthly: string; yearly: string }> = {
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "price_pro_monthly",
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || "price_pro_yearly",
  },
  team: {
    monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || "price_team_monthly",
    yearly: process.env.STRIPE_PRICE_TEAM_YEARLY || "price_team_yearly",
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || "price_enterprise_monthly",
    yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || "price_enterprise_yearly",
  },
};

/* ─── Tier details (shared between server + client) ─── */

export interface TierInfo {
  name: string;
  slug: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
  limits: {
    projects: number;     // -1 = unlimited
    aiQueries: number;    // -1 = unlimited, per day
    teamMembers: number;  // -1 = unlimited
  };
  cta: string;
  highlighted?: boolean;
}

export const TIERS: TierInfo[] = [
  {
    name: "Explorer",
    slug: "explorer",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Explore the knowledge garden and dream freely",
    features: [
      "Browse 40,000+ knowledge entities",
      "5 AI Copilot queries per day",
      "Dream Builder (all interfaces)",
      "1 saved project",
      "Community access",
    ],
    limits: { projects: 1, aiQueries: 5, teamMembers: 1 },
    cta: "Get Started Free",
  },
  {
    name: "Pro",
    slug: "pro",
    monthlyPrice: 49,
    yearlyPrice: 470,
    description: "Everything you need to build professionally",
    features: [
      "Unlimited AI Copilot queries",
      "5 active projects",
      "Smart Project Launcher (The COO)",
      "AI estimating & scheduling",
      "Compliance checker (all jurisdictions)",
      "Budget tracking & burn rate",
      "Full CRM pipeline",
      "Marketplace access",
      "Voice field reporting",
      "Priority support",
    ],
    limits: { projects: 5, aiQueries: -1, teamMembers: 1 },
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Team",
    slug: "team",
    monthlyPrice: 199,
    yearlyPrice: 1910,
    description: "Scale your construction business",
    features: [
      "Everything in Pro",
      "Unlimited projects",
      "Team management (up to 50 members)",
      "Financial tools & invoicing",
      "Voice field ops (offline + multi-language)",
      "Integrations (QuickBooks, Procore, etc.)",
      "XR-ready work instructions",
      "Advanced analytics",
      "Dedicated onboarding",
    ],
    limits: { projects: -1, aiQueries: -1, teamMembers: 50 },
    cta: "Start Team Trial",
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    monthlyPrice: 499,
    yearlyPrice: 4790,
    description: "Full platform power for large operations",
    features: [
      "Everything in Team",
      "Unlimited team members",
      "White-label & custom domains",
      "Dedicated API & MCP server",
      "Robot integration layer",
      "Advanced analytics & BI",
      "SSO / SAML",
      "Custom SLA",
      "Co-development partnership",
    ],
    limits: { projects: -1, aiQueries: -1, teamMembers: -1 },
    cta: "Contact Sales",
  },
];

/* ─── Helpers ─── */

export function getTierBySlug(slug: string): TierInfo | undefined {
  return TIERS.find((t) => t.slug === slug);
}

export function canAccessFeature(
  userTier: string,
  requiredTier: string
): boolean {
  const tierOrder = ["explorer", "pro", "team", "enterprise"];
  return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier);
}

