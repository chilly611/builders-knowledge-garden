import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Check subscription status by email
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ tier: "explorer", status: "none" });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("email", email)
      .eq("status", "active")
      .single();

    if (error || !data) {
      return NextResponse.json({ tier: "explorer", status: "none" });
    }

    return NextResponse.json({
      tier: data.tier,
      status: data.status,
      stripeCustomerId: data.stripe_customer_id,
    });
  } catch (error) {
    console.error("Subscription check error:", error);
    return NextResponse.json({ tier: "explorer", status: "error" });
  }
}
