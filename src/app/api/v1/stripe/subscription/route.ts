// GET /api/v1/stripe/subscription — STRIPE-WIRE
// ==============================================
// Returns the current authenticated user's subscription state.
//
// Priority lookup: user_id → org_id (via org_members) → email (legacy).
// Returns the first match. Default response is `tier=free, status=none`
// when no row exists or Stripe isn't configured — callers can treat
// that as "free tier" and proceed.

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getServiceClient } from "@/lib/auth-server";
import { isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

interface SubResponse {
  tier: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_configured: boolean;
}

const FREE: SubResponse = {
  tier: "free",
  status: "none",
  stripe_customer_id: null,
  stripe_subscription_id: null,
  current_period_end: null,
  cancel_at_period_end: false,
  stripe_configured: false,
};

export async function GET(req: NextRequest) {
  const stripeConfigured = isStripeConfigured();
  const user = await getAuthUser(req).catch(() => null);
  const emailQuery = req.nextUrl.searchParams.get("email");
  const lookupEmail = user?.email || emailQuery;

  // No identity at all → return defaults rather than 401 so the
  // /pricing page can call this without auth.
  if (!user && !emailQuery) {
    return NextResponse.json({ ...FREE, stripe_configured: stripeConfigured });
  }

  const db = getServiceClient();
  let row: any = null;

  // 1. user_id (preferred)
  if (user?.id) {
    const { data } = await db
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) row = data;
  }

  // 2. org_id (via org_members)
  if (!row && user?.id) {
    const { data: memberRows } = await db
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id);
    const orgIds = (memberRows ?? []).map((m: any) => m.org_id).filter(Boolean);
    if (orgIds.length > 0) {
      const { data } = await db
        .from("subscriptions")
        .select("*")
        .in("org_id", orgIds)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) row = data;
    }
  }

  // 3. Legacy email match
  if (!row && lookupEmail) {
    const { data } = await db
      .from("subscriptions")
      .select("*")
      .eq("email", lookupEmail)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) row = data;
  }

  if (!row) {
    return NextResponse.json({ ...FREE, stripe_configured: stripeConfigured });
  }

  // Normalize legacy `explorer` tier to `free`.
  const tier =
    row.tier === "explorer" || !row.tier ? "free" : String(row.tier);

  const resp: SubResponse = {
    tier,
    status: row.status || "none",
    stripe_customer_id: row.stripe_customer_id ?? null,
    stripe_subscription_id: row.stripe_subscription_id ?? null,
    current_period_end: row.current_period_end ?? null,
    cancel_at_period_end: Boolean(row.cancel_at_period_end),
    stripe_configured: stripeConfigured,
  };
  return NextResponse.json(resp);
}
