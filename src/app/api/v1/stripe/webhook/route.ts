import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia" as any,
  });
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Map Stripe price IDs to tier names
function getTierFromPriceId(priceId: string): string {
  const map: Record<string, string> = {
    [process.env.STRIPE_PRICE_PRO || ""]: "pro",
    [process.env.STRIPE_PRICE_TEAM || ""]: "team",
    [process.env.STRIPE_PRICE_ENTERPRISE || ""]: "enterprise",
  };
  return map[priceId] || "explorer";
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // If webhook secret is configured, verify signature
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      try {
        event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
      }
    } else {
      // In development/test mode without webhook secret, parse directly
      event = JSON.parse(body) as Stripe.Event;
    }

    const supabase = getSupabase();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_details?.email || session.customer_email;
        const tier = session.metadata?.tier || "pro";
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (customerEmail) {
          // Upsert subscription record
          await supabase.from("subscriptions").upsert({
            email: customerEmail,
            stripe_customer_id: customerId || null,
            stripe_subscription_id: subscriptionId || null,
            tier,
            status: "active",
            updated_at: new Date().toISOString(),
          }, { onConflict: "email" });

          console.log(`Subscription activated: ${customerEmail} → ${tier}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price?.id;
        const tier = priceId ? getTierFromPriceId(priceId) : "pro";
        const status = subscription.status === "active" ? "active" : "inactive";

        await supabase.from("subscriptions")
          .update({ tier, status, updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscription.id);

        console.log(`Subscription updated: ${subscription.id} → ${tier} (${status})`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase.from("subscriptions")
          .update({ tier: "explorer", status: "cancelled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscription.id);

        console.log(`Subscription cancelled: ${subscription.id}`);
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
