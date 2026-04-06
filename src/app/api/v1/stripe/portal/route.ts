import { NextRequest, NextResponse } from "next/server";
// @ts-ignore — types may or may not be present depending on environment
import Stripe from "stripe";
import { getAuthUser, getServiceClient, unauthorizedResponse } from "@/lib/auth-server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia" as any,
  });
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://builders.theknowledgegardens.com";
    const db = getServiceClient();

    // Look up the user's Stripe customer ID from the subscriptions table
    const { data: sub } = await db
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("email", user.email)
      .single();

    let customerId = sub?.stripe_customer_id;

    // Also accept customerId from body as fallback
    if (!customerId) {
      try {
        const body = await req.json();
        customerId = body.customerId;
      } catch {
        // No body — that's fine
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "No subscription found. Please subscribe first." },
        { status: 404 }
      );
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/billing?success=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Portal error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
