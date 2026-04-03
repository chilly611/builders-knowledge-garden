// User Profile API Ã¢ÂÂ GET + PATCH
// Returns/updates the authenticated user's profile
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getServiceClient, unauthorizedResponse } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const supabase = getServiceClient();
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Profile fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch profile", detail: error.message },
        { status: 500 }
      );
    }

    // Return profile or sensible defaults
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = ((user as any).user_metadata || {}) as Record<string, string>;
    const result = profile || {
      id: user.id,
      email: user.email,
      display_name: meta?.full_name || user.email?.split("@")[0] || "Builder",
      avatar_url: meta?.avatar_url || null,
      lane: "explorer",
      preferences: {},
      onboarded: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch profile", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const allowedFields = ["display_name", "avatar_url", "lane", "preferences", "onboarded"];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert({ id: user.id, email: user.email, ...updates })
      .select()
      .single();

    if (error) {
      console.error("Profile update error:", error);
      return NextResponse.json(
        { error: "Failed to update profile", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update profile", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
// User Profile API â GET + PATCH
