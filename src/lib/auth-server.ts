// Server-side auth helper — extracts user from Supabase session in API routes
// Usage: const user = await getAuthUser(request);

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Extract authenticated user from request headers.
 * Supabase client-side SDK sends the access token in the Authorization header.
 * Returns null if not authenticated.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.replace("Bearer ", "");

    // Create a temporary client with the user's token to verify it
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    return {
      id: user.id,
      email: user.email || "",
      name: user.user_metadata?.name || user.email?.split("@")[0] || "Builder",
    };
  } catch {
    return null;
  }
}

/**
 * Get the service-role Supabase client for admin operations.
 * Bypasses RLS — use carefully.
 */
export function getServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Return a 401 JSON response for unauthenticated requests.
 */
export function unauthorizedResponse(message = "Authentication required") {
  return NextResponse.json({ error: message }, { status: 401 });
}
