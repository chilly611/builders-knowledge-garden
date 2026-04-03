import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || stripeKey.trim() === "") {
    return NextResponse.json(
      {
        error: "Stripe not configured",
        message: "Add STRIPE_SECRET_KEY to .env.local",
      },
      { status: 503 }
    );
  }

  if (!webhookSecret || webhookSecret.trim() === "") {
    return NextResponse.json(
      {
        error: "Webhook secret not configured",
        message: "Add STRIPE_WEBHOOK_SECRET to .env.local",
      },
      { status: 503 }
    );
  }

  try {
    // When Stripe is fully configured:
    // const body = await req.text();
    // const sig = req.headers.get("stripe-signature");
    // if (!sig) {
    //   return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    // }
    //
    // const Stripe = (await import("stripe")).default;
    // const stripe = new Stripe(stripeKey);
    //
    // let event;
    // try {
    //   event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    // } catch (err) {
    //   console.error("Webhook signature verification failed:", err);
    //   return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
    // }
    //
    // // Handle events
    // switch (event.type) {
    //   case "checkout.session.completed":
    //     const session = event.data.object;
    //     // Update user subscription in database
    //     console.log("Checkout completed:", session);
    //     break;
    //
    //   case "customer.subscription.updated":
    //     const subscription = event.data.object;
    //     // Update subscription in database
    //     console.log("Subscription updated:", subscription);
    //     break;
    //
    //   case "customer.subscription.deleted":
    //     const deletedSub = event.data.object;
    //     // Mark subscription as cancelled
    //     console.log("Subscription cancelled:", deletedSub);
    //     break;
    //
    //   default:
    //     console.log("Unhandled event type:", event.type);
    // }
    //
    // return NextResponse.json({ received: true });

    return NextResponse.json({
      message: "Webhook ready — configure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET",
      status: "not_configured",
      received: true,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: String(error) },
      { status: 500 }
    );
  }
}
