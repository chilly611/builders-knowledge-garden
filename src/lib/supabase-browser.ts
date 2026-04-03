// Supabase browser client — singleton for client-side auth operations
// Uses the anon key and relies on Supabase's built-in cookie/token handling

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes("placeholder")) {
    // Return a "noop" client that won't crash but won't work
    // This lets the app build without env vars
    return createClient(
      "https://placeholder.supabase.co",
      "placeholder-anon-key"
    );
  }

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
