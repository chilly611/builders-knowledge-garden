// Supabase browser client — singleton for client-side auth operations.
// @supabase/ssr cookie-backed client so the session is shared (via cookies) with
// the main `@/lib/supabase` client and the server. (Was a localStorage client;
// migrated to cookies for Safari OAuth — see src/lib/supabase.ts header.)

import { createBrowserClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes("placeholder")) {
    // Noop client so the app builds without env vars.
    return createClient("https://placeholder.supabase.co", "placeholder-anon-key");
  }

  browserClient = createBrowserClient(url, anonKey) as unknown as SupabaseClient;
  return browserClient;
}
