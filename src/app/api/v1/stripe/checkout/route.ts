// POST /api/v1/stripe/checkout — STRIPE-WIRE
// ===========================================
// Creates a Stripe Checkout Session for the requested tier and returns
// the redirect URL. Falls back to a GET-redirect to Payment Links when
// the SDK isn't configured (legacy behavior — keeps the existing
// /pricing buttons working in test environments without secrets).

import { NextRequest, NextResponse } from "next/server";
import {
  isStripeConfigured,
  createCheckoutSession,
  getPriceId,
} from "@/lib/stripe";
import { getAuthUser, getServiceClient } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 },
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const {
    tier = "pro",
    interval = "monthly",
    email,
    userId,
    orgId,
  }: {
    tier?: string;
    interval?: "monthly" | "yearly";
    email?: string;
    userId?: string;
    orgId?: string;
  } = body || {};

  const priceId = getPriceId(tier, interval);
  if (!priceId) {
    return NextResponse.json(
      { error: `No price configured for ${tier} (${interval})` },
      { status: 400 },
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://builders.theknowledgegardens.com";

  // Try to pre-fill from the authenticated user; fall back to body fields.
  const user = await getAuthUser(req).catch(() => null);
  const customerEmail = email || user?.email;
  const effectiveUserId = userId || user?.id;

  // Look up an existing Stripe customer for this user/email so we don't
  // create duplicate customers. We check user_id first (the new path),
  // then email (legacy).
  let existingCustomerId: string | undefined;
  if (effectiveUserId || customerEmail) {
    const db = getServiceClient();
    let query = db
      .from("subscriptions")
      .select("stripe_customer_id")
      .not("stripe_customer_id", "is", null);
    if (effectiveUserId) {
      query = query.eq("user_id", effectiveUserId);
    } else if (customerEmail) {
      query = query.eq("email", customerEmail);
    }
    const { data } = await query.limit(1).maybeSingle();
    if (data?.stripe_customer_id) existingCustomerId = data.stripe_customer_id;
  }

  try {
    const session = await createCheckoutSession({
      tier,
      interval,
      email: customerEmail,
      userId: effectiveUserId,
      orgId,
      customerId: existingCustomerId,
      successUrl: `${appUrl}/billing?success=true&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/pricing?checkout=cancelled`,
    });
    if (!session)
      return NextResponse.json(
        { error: "stripe_not_configured" },
        { status: 503 },
      );
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e: any) {
    console.error("Stripe checkout error:", e);
    return NextResponse.json(
      { error: e?.message || "checkout_failed" },
      { status: 500 },
    );
  }
}

// GET /api/v1/stripe/checkout?tier=pro — fallback redirect to a static
// Stripe Payment Link. Used when we don't have an SDK key but the
// operator has set the NEXT_PUBLIC_STRIPE_LINK_* env vars in Vercel.
export async function GET(req: NextRequest) {
  const tier = req.nextUrl.searchParams.get("tier") || "pro";
  const email = req.nextUrl.searchParams.get("email") || "";

  const LINKS: Record<string, string> = {
    pro: process.env.NEXT_PUBLIC_STRIPE_LINK_PRO || "",
    team: process.env.NEXT_PUBLIC_STRIPE_LINK_TEAM || "",
    enterprise: process.env.NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE || "",
  };

  const link = LINKS[tier];
  if (link) {
    const url = email
      ? `${link}?prefilled_email=${encodeURIComponent(email)}`
      : link;
    return NextResponse.redirect(url);
  }

  return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
}
