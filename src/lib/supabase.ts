import { createBrowserClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Uses a placeholder URL when env vars aren't set (build time, dev without Supabase)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Auth client.
//
// In the BROWSER this is an @supabase/ssr cookie-backed client. Google OAuth
// (signInWithOAuth in login/page.tsx + AuthModal.tsx) initiates PKCE; the SERVER
// route /auth/callback does the code exchange, reading the verifier cookie from
// the request — the path that survives Safari's cross-site redirect. (Client-side
// localStorage (#22) and a client-set verifier cookie (#23) both failed in Safari.)
// The session lives in cookies, shared with getSupabaseBrowser() + the server
// client so the whole app sees ONE session.
//
// On the SERVER this module is also imported by a few /api/v1 routes for anon RLS
// queries; createBrowserClient needs `document`, so there we fall back to a plain
// anon client (no session) — identical to the prior behavior, since a browser
// client never had a session server-side anyway.
export const supabase: SupabaseClient =
  typeof window === "undefined"
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (createBrowserClient(supabaseUrl, supabaseAnonKey) as unknown as SupabaseClient);

// Check if Supabase is actually configured (not placeholder)
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
}

// Server-side client with service role for admin operations
export function getServiceClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";
  return createClient(supabaseUrl, serviceKey);
}
