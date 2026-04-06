import { NextRequest, NextResponse } from "next/server";
// @ts-ignore — types may or may not be present depending on environment
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia" as any,
  });
}

const PRICE_MAP: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_PRO || "",
  team: process.env.STRIPE_PRICE_TEAM || "",
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || "",
};

// All tiers are recurring monthly subscriptions
const MODE_MAP: Record<string, "subscription" | "payment"> = {
  pro: "subscription",
  team: "subscription",
  enterprise: "subscription",
};

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { tier = "pro", email, userId } = body;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://builders.theknowledgegardens.com";

    if (!PRICE_MAP[tier]) {
      return NextResponse.json({ error: `Invalid tier: ${tier}` }, { status: 400 });
    }

    const sessionParams: any = {
      payment_method_types: ["card"],
      line_items: [{ price: PRICE_MAP[tier], quantity: 1 }],
      mode: MODE_MAP[tier],
      success_url: `${appUrl}/killerapp?checkout=success&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      metadata: { tier, userId: userId || "" },
    };

    if (email) {
      sessionParams.customer_email = email;
    }

    const session = await getStripe().checkout.sessions.create(sessionParams);
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
