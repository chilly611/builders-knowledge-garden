// POST /api/v1/stripe/webhook — STRIPE-WIRE
// ==========================================
// Handles Stripe webhook events:
//   - checkout.session.completed
//   - customer.subscription.created / updated / deleted
//   - invoice.payment_succeeded / payment_failed
//
// Signature verification is REQUIRED in production (STRIPE_WEBHOOK_SECRET).
// Idempotency: we record every event.id in `stripe_webhook_events` and
// no-op on a duplicate delivery (Stripe retries on any non-2xx).
//
// IMPORTANT: this route must read the *raw* body to verify the signature.
// Next 15+ App Router gives us that via `req.text()`. Don't try to
// parse JSON before constructEvent.

import { NextRequest, NextResponse } from "next/server";
// @ts-ignore — depending on env, @types/stripe may not be installed.
import type Stripe from "stripe";
import {
  isStripeConfigured,
  constructWebhookEvent,
  getTierFromPriceId,
} from "@/lib/stripe";
import { getServiceClient } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Status normaliser — Stripe statuses → our enum
// ---------------------------------------------------------------------------

function normalizeStatus(stripeStatus: string | undefined): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "incomplete":
    case "paused":
      return stripeStatus;
    case "incomplete_expired":
      return "incomplete";
    case "unpaid":
      return "past_due";
    default:
      return stripeStatus || "none";
  }
}

// ---------------------------------------------------------------------------
// Idempotency check — return true if we've already processed this event.
// ---------------------------------------------------------------------------

async function alreadyProcessed(
  eventId: string,
  eventType: string,
): Promise<boolean> {
  const db = getServiceClient();
  // Use an INSERT … ON CONFLICT DO NOTHING-style upsert; if the row
  // already existed `data` will be empty.
  const { data, error } = await db
    .from("stripe_webhook_events")
    .insert({ event_id: eventId, event_type: eventType })
    .select("event_id");
  if (error) {
    // 23505 = unique_violation → duplicate, treat as already processed.
    if ((error as any).code === "23505") return true;
    // Other errors: log and continue (best to process than to lose
    // events; Stripe will retry on non-2xx anyway).
    console.warn(
      "[stripe-webhook] idempotency insert failed:",
      error.message,
    );
    return false;
  }
  return !(data && data.length > 0);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    // Still 200 so Stripe doesn't retry forever during a misconfig
    // window. We log loudly so ops notices.
    console.error(
      "[stripe-webhook] received event but STRIPE_SECRET_KEY not set; dropping",
    );
    return NextResponse.json(
      { received: false, error: "stripe_not_configured" },
      { status: 503 },
    );
  }

  const rawBody = await req.text();
  const sigHeader = req.headers.get("stripe-signature");

  const result = constructWebhookEvent(rawBody, sigHeader);
  if (!result) {
    return NextResponse.json(
      { error: "signature_verification_failed" },
      { status: 400 },
    );
  }
  const { event, verified } = result;
  if (!verified && process.env.NODE_ENV === "production") {
    console.error(
      "[stripe-webhook] production event lacked signature; rejecting",
    );
    return NextResponse.json(
      { error: "signature_required_in_production" },
      { status: 400 },
    );
  }

  // Idempotency gate.
  if (await alreadyProcessed(event.id, event.type)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const db = getServiceClient();

  try {
    switch (event.type) {
      // ---------------------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail =
          session.customer_details?.email || session.customer_email;
        const tier = (session.metadata?.tier as string) || "pro";
        const userId = (session.metadata?.userId as string) || null;
        const orgId = (session.metadata?.orgId as string) || null;
        const customerId = (session.customer as string) || null;
        const subscriptionId = (session.subscription as string) || null;

        // We upsert by (stripe_subscription_id) when available; else by
        // (user_id) or (email). Using onConflict on the partial unique
        // index lets us de-dup safely.
        const payload: Record<string, any> = {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          tier,
          status: "active",
          updated_at: new Date().toISOString(),
        };
        if (userId) payload.user_id = userId;
        if (orgId) payload.org_id = orgId;
        if (customerEmail) payload.email = customerEmail;

        if (subscriptionId) {
          await db
            .from("subscriptions")
            .upsert(payload, { onConflict: "stripe_subscription_id" });
        } else if (customerEmail) {
          await db
            .from("subscriptions")
            .upsert(payload, { onConflict: "email" });
        } else {
          await db.from("subscriptions").insert(payload);
        }

        // Mirror tier on user_profiles for fast UI reads.
        if (customerEmail) {
          const { data: profile } = await db
            .from("user_profiles")
            .select("id")
            .eq("email", customerEmail)
            .maybeSingle();
          if (profile?.id) {
            await db
              .from("user_profiles")
              .update({ tier, updated_at: new Date().toISOString() })
              .eq("id", profile.id);
          }
        }

        console.log(
          `[stripe-webhook] checkout.session.completed: ${customerEmail || userId} → ${tier}`,
        );
        break;
      }

      // ---------------------------------------------------------------------
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = (sub as any).items?.data?.[0]?.price?.id || "";
        const tier = getTierFromPriceId(priceId);
        const status = normalizeStatus(sub.status);

        const payload: Record<string, any> = {
          stripe_subscription_id: sub.id,
          stripe_customer_id: (sub.customer as string) || null,
          stripe_price_id: priceId || null,
          tier,
          status,
          cancel_at_period_end: Boolean((sub as any).cancel_at_period_end),
          updated_at: new Date().toISOString(),
        };
        const startTs = (sub as any).current_period_start;
        const endTs = (sub as any).current_period_end;
        if (startTs)
          payload.current_period_start = new Date(startTs * 1000).toISOString();
        if (endTs)
          payload.current_period_end = new Date(endTs * 1000).toISOString();

        // Carry user/org metadata if Stripe is sending it on the sub
        // (created from a Checkout Session metadata).
        if (sub.metadata?.userId) payload.user_id = sub.metadata.userId;
        if (sub.metadata?.orgId) payload.org_id = sub.metadata.orgId;

        await db
          .from("subscriptions")
          .upsert(payload, { onConflict: "stripe_subscription_id" });

        console.log(
          `[stripe-webhook] ${event.type}: ${sub.id} → ${tier} (${status})`,
        );
        break;
      }

      // ---------------------------------------------------------------------
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db
          .from("subscriptions")
          .update({
            tier: "free",
            status: "canceled",
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);
        console.log(`[stripe-webhook] subscription.deleted: ${sub.id}`);
        break;
      }

      // ---------------------------------------------------------------------
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const customerEmail =
          invoice.customer_email || invoice.customer_details?.email;
        // Cache the invoice for /billing — best-effort, ignore errors
        // if the columns differ in the existing invoices table.
        try {
          await db.from("invoices").upsert(
            {
              stripe_invoice_id: invoice.id,
              email: customerEmail || null,
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
            },
            { onConflict: "stripe_invoice_id" },
          );
        } catch (e) {
          console.warn(
            "[stripe-webhook] invoice upsert failed (non-fatal):",
            (e as Error).message,
          );
        }
        console.log(
          `[stripe-webhook] invoice.payment_succeeded: ${invoice.id}`,
        );
        break;
      }

      // ---------------------------------------------------------------------
      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;
        if (customerId) {
          await db
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId);
        }
        console.log(
          `[stripe-webhook] invoice.payment_failed: customer ${customerId}`,
        );
        break;
      }

      // ---------------------------------------------------------------------
      default:
        // We deliberately accept events we don't care about (Stripe
        // sends a lot) and 200 them; logging only.
        console.log(`[stripe-webhook] unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("[stripe-webhook] handler error:", e);
    // 500 → Stripe will retry, which is what we want for transient errors.
    return NextResponse.json(
      { error: e?.message || "handler_failed" },
      { status: 500 },
    );
  }
}
