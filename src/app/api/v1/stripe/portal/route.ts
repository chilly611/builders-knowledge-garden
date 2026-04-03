import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey || stripeKey.trim() === "") {
    return NextResponse.json(
      {
        error: "Stripe not configured",
        message: "Add STRIPE_SECRET_KEY to .env.local to enable billing portal",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { customerId, returnUrl } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Missing customerId" },
        { status: 400 }
      );
    }

    // When Stripe is fully configured:
    // const Stripe = (await import("stripe")).default;
    // const stripe = new Stripe(stripeKey);
    //
    // const session = await stripe.billingPortal.sessions.create({
    //   customer: customerId,
    //   return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/account`,
    // });
    //
    // return NextResponse.json({ url: session.url });

    return NextResponse.json({
      message: "Billing portal ready — configure STRIPE_SECRET_KEY",
      customerId,
      status: "not_configured",
    });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: String(error) },
      { status: 500 }
    );
  }
}
