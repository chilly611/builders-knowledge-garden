import { NextRequest, NextResponse } from "next/server";
// @ts-ignore — types may or may not be present depending on environment
import Stripe from "stripe";
import { getAuthUser, getServiceClient } from "@/lib/auth-server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia" as any,
  });
}

// Price ID mapping — supports both monthly and yearly intervals
function getPriceId(tier: string, interval: string = "monthly"): string {
  const key = interval === "yearly" ? "YEARLY" : "MONTHLY";
  const map: Record<string, string> = {
    pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.STRIPE_PRICE_PRO || "",
    pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || "",
    team_monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || process.env.STRIPE_PRICE_TEAM || "",
    team_yearly: process.env.STRIPE_PRICE_TEAM_YEARLY || "",
    enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || process.env.STRIPE_PRICE_ENTERPRISE || "",
    enterprise_yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || "",
  };
  return map[`${tier}_${interval}`] || "";
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { tier = "pro", interval = "monthly", email, userId } = body;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://builders.theknowledgegardens.com";

    const priceId = getPriceId(tier, interval);
    if (!priceId) {
      return NextResponse.json({ error: `No price configured for ${tier} (${interval})` }, { status: 400 });
    }

    // Try to get authenticated user for pre-filling
    const user = await getAuthUser(req);
    const customerEmail = email || user?.email;

    const stripe = getStripe();
    const db = getServiceClient();

    // Check if user already has a Stripe customer ID
    let customerId: string | undefined;
    if (customerEmail) {
      const { data: existingSub } = await db
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("email", customerEmail)
        .single();

      if (existingSub?.stripe_customer_id) {
        customerId = existingSub.stripe_customer_id;
      }
    }

    const sessionParams: any = {
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${appUrl}/billing?success=true&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      metadata: { tier, interval, userId: userId || user?.id || "" },
      allow_promotion_codes: true,
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Store the customer ID if we created a new one
    if (session.customer && customerEmail) {
      await db.from("subscriptions").upsert({
        email: customerEmail,
        stripe_customer_id: session.customer as string,
        tier: "explorer",
        status: "incomplete",
        updated_at: new Date().toISOString(),
      }, { onConflict: "email" });
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: error.message || "Checkout failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const tier = req.nextUrl.searchParams.get("tier") || "pro";
  const email = req.nextUrl.searchParams.get("email") || "";

  // For GET requests, redirect to Stripe Payment Links directly
  const LINKS: Record<string, string> = {
    pro: process.env.NEXT_PUBLIC_STRIPE_LINK_PRO || "",
    team: process.env.NEXT_PUBLIC_STRIPE_LINK_TEAM || "",
    enterprise: process.env.NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE || "",
  };

  const link = LINKS[tier];
  if (link) {
    const url = email ? `${link}?prefilled_email=${encodeURIComponent(email)}` : link;
    return NextResponse.redirect(url);
  }

  return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
}
