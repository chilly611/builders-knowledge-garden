// Server-side Supabase client (@supabase/ssr) — reads/writes the auth session
// from Next.js request cookies. Used by the OAuth callback route and any server
// code that needs the signed-in user from cookies. The OAuth code exchange runs
// here (server-side) so the PKCE verifier cookie is read from the request — the
// path that survives Safari's cross-site OAuth redirect.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component where cookies are read-only — safe to
          // ignore; the middleware refreshes the session cookie on the next request.
        }
      },
    },
  });
}
