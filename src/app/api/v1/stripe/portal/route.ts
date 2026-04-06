import { NextRequest, NextResponse } from "next/server";
// @ts-ignore — types may or may not be present depending on environment
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia" as any,
  });
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { customerId, returnUrl } = body;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://builders.theknowledgegardens.com";

    if (!customerId) {
      return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${appUrl}/killerapp`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Portal error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
