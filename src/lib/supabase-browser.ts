// Supabase browser client accessor — delegates to the ONE shared client.
//
// P0 close (2026-06-11): this module used to call createBrowserClient
// itself. @supabase/ssr's browser singleton meant it usually got the same
// instance as `@/lib/supabase`, but keeping a second creation path invited
// drift (and the placeholder branch here returned a separate supabase-js
// client — a stray GoTrueClient). Now there is exactly one module-level
// auth client in the app: src/lib/supabase.ts. This accessor survives for
// its existing importers; new code can import { supabase } directly.

import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export function getSupabaseBrowser(): SupabaseClient {
  return supabase;
}
