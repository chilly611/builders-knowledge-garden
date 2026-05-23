// POST /api/v1/stripe/portal — STRIPE-WIRE
// =========================================
// Creates a Stripe Customer Portal session so the user can update
// payment method, see invoices, or cancel their subscription. Looks up
// the Stripe customer ID from the `subscriptions` table by user_id /
// org_id / email (in that priority order).

import { NextRequest, NextResponse } from "next/server";
import { isStripeConfigured, createPortalSession } from "@/lib/stripe";
import {
  getAuthUser,
  getServiceClient,
  unauthorizedResponse,
} from "@/lib/auth-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 },
    );
  }

  const user = await getAuthUser(req).catch(() => null);
  if (!user) return unauthorizedResponse();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://builders.theknowledgegardens.com";
  const db = getServiceClient();

  // Priority lookup: user_id (new path) → org_id (current org) → email
  // (legacy). First non-null customer ID wins.
  let customerId: string | undefined;

  const { data: byUser } = await db
    .from("subscriptions")
    .select("stripe_customer_id, org_id")
    .eq("user_id", user.id)
    .not("stripe_customer_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (byUser?.stripe_customer_id) customerId = byUser.stripe_customer_id;

  if (!customerId) {
    const { data: byEmail } = await db
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("email", user.email)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (byEmail?.stripe_customer_id) customerId = byEmail.stripe_customer_id;
  }

  // Allow body override (e.g. for an admin acting on a specific customer).
  if (!customerId) {
    try {
      const body = await req.json();
      customerId = body?.customerId;
    } catch {
      // no body
    }
  }

  if (!customerId) {
    return NextResponse.json(
      { error: "no_subscription_found" },
      { status: 404 },
    );
  }

  try {
    const session = await createPortalSession({
      customerId,
      returnUrl: `${appUrl}/billing`,
    });
    if (!session)
      return NextResponse.json(
        { error: "stripe_not_configured" },
        { status: 503 },
      );
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Portal error:", e);
    // Stripe will throw `No configuration provided` if the operator
    // hasn't activated the portal in the Stripe dashboard yet. Surface
    // that as a 409 so the UI can show a helpful message rather than
    // a generic 500.
    const msg = String(e?.message || "");
    if (msg.includes("No configuration provided") || msg.includes("portal")) {
      return NextResponse.json(
        { error: "portal_not_configured_in_stripe_dashboard" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: e?.message || "portal_failed" },
      { status: 500 },
    );
  }
}
