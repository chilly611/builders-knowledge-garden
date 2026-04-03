import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey || stripeKey.trim() === "") {
    return NextResponse.json(
      {
        error: "Stripe not configured",
        message: "Add STRIPE_SECRET_KEY to .env.local to enable checkout",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { tier = "pro", successUrl, cancelUrl } = body;

    const prices: Record<string, string> = {
      pro: process.env.STRIPE_PRICE_PRO || "",
      team: process.env.STRIPE_PRICE_TEAM || "",
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE || "",
    };

    // Validate tier
    if (!prices[tier]) {
      return NextResponse.json(
        {
          error: "Invalid tier",
          message: `Tier "${tier}" not recognized`,
        },
        { status: 400 }
      );
    }

    // When Stripe is fully configured:
    // const Stripe = (await import("stripe")).default;
    // const stripe = new Stripe(stripeKey);
    // const session = await stripe.checkout.sessions.create({
    //   payment_method_types: ["card"],
    //   line_items: [
    //     {
    //       price: prices[tier],
    //       quantity: 1,
    //     },
    //   ],
    //   mode: "subscription",
    //   success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    //   cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    // });
    // return NextResponse.json({ url: session.url });

    return NextResponse.json({
      message: "Stripe checkout ready — configure STRIPE_SECRET_KEY and price IDs",
      tier,
      priceId: prices[tier],
      status: "not_configured",
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const tier = req.nextUrl.searchParams.get("tier") || "pro";
  const body = { tier };

  return POST(
    new NextRequest(req, {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
}
