import { NextRequest, NextResponse } from "next/server";
// @ts-ignore — types may or may not be present depending on environment
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
    [process.env.STRIPE_PRICE_PRO_MONTHLY || ""]: "pro",
    [process.env.STRIPE_PRICE_PRO_YEARLY || ""]: "pro",
    [process.env.STRIPE_PRICE_TEAM || ""]: "team",
    [process.env.STRIPE_PRICE_TEAM_MONTHLY || ""]: "team",
    [process.env.STRIPE_PRICE_TEAM_YEARLY || ""]: "team",
    [process.env.STRIPE_PRICE_ENTERPRISE || ""]: "enterprise",
    [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || ""]: "enterprise",
    [process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || ""]: "enterprise",
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

          // Also update user_profiles tier
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("email", customerEmail)
            .single();

          if (profile) {
            await supabase
              .from("user_profiles")
              .update({ tier, updated_at: new Date().toISOString() })
              .eq("id", profile.id);
          }

          console.log(`Subscription activated: ${customerEmail} → ${tier}`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        // @ts-ignore — Stripe types may vary between versions
        const invoice = event.data.object as any;
        const customerEmail = invoice.customer_email;

        if (customerEmail) {
          // Cache the invoice for fast display
          await supabase.from("invoices").upsert({
            stripe_invoice_id: invoice.id,
            amount_paid: invoice.amount_paid,
            currency: invoice.currency,
            status: "paid",
            invoice_url: invoice.hosted_invoice_url,
            invoice_pdf: invoice.invoice_pdf,
            period_start: invoice.period_start
              ? new Date(invoice.period_start * 1000).toISOString()
              : null,
            period_end: invoice.period_end
              ? new Date(invoice.period_end * 1000).toISOString()
              : null,
            paid_at: new Date().toISOString(),
          }, { onConflict: "stripe_invoice_id" });

          console.log(`Invoice paid: ${invoice.id} — ${invoice.amount_paid} ${invoice.currency}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        // @ts-ignore — Stripe types may vary between versions
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;

        // Mark subscription as past_due
        if (customerId) {
          await supabase.from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("stripe_customer_id", customerId);

          console.log(`Payment failed for customer: ${customerId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        // @ts-ignore — Stripe types may vary between versions
        const subscription = event.data.object as any;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const tier = priceId ? getTierFromPriceId(priceId) : "pro";
        const status = subscription.status === "active" ? "active" :
                       subscription.status === "trialing" ? "trialing" :
                       subscription.status === "past_due" ? "past_due" : "inactive";

        const updatePayload: Record<string, any> = {
          tier,
          status,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          updated_at: new Date().toISOString(),
        };

        // Safely extract period dates (Stripe returns Unix timestamps)
        if (subscription.current_period_start) {
          updatePayload.current_period_start = new Date(subscription.current_period_start * 1000).toISOString();
        }
        if (subscription.current_period_end) {
          updatePayload.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
        }

        await supabase.from("subscriptions")
          .update(updatePayload)
          .eq("stripe_subscription_id", subscription.id);

        console.log(`Subscription updated: ${subscription.id} → ${tier} (${status})`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase.from("subscriptions")
          .update({
            tier: "explorer",
            status: "cancelled",
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
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
