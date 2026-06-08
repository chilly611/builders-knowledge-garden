import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase client for server-side use
// The existing builders.theknowledgegardens.com data lives here
// Uses a placeholder URL when env vars aren't set (build time, dev without Supabase)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// PKCE verifier storage — hybrid cookie/localStorage adapter.
//
// supabase-js writes the PKCE `code_verifier` to localStorage at sign-in, then
// we immediately navigate to the IdP. Safari does NOT reliably persist that
// just-before-unload localStorage write across the cross-site OAuth bounce
// (builders → supabase.co → Google → supabase.co → builders), so the callback's
// exchangeCodeForSession can't find it → "PKCE code verifier not found in
// storage" (Chrome persists it, so Chrome works). `document.cookie` writes are
// synchronous + committed before navigation and survive as a first-party
// cookie, so we route ONLY the `*-code-verifier` key to a cookie. Everything
// else (the session) stays in localStorage — unchanged — so every other client
// that reads `sb-<ref>-auth-token` from localStorage keeps sharing the same
// session (no divergence, no app-wide migration). SSR-safe: no-op on the server.
const VERIFIER_TTL = 600; // seconds — covers the OAuth round-trip
const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';
const isVerifierKey = (k: string) => k.includes('-code-verifier');
const verifierCookieAttrs = () =>
  `Path=/; Max-Age=${VERIFIER_TTL}; SameSite=Lax` +
  (typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '');
function readVerifierCookie(name: string): string | null {
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'),
  );
  return m ? decodeURIComponent(m[1]) : null;
}
const pkceHybridStorage = {
  getItem(key: string): string | null {
    if (!isBrowser()) return null;
    return isVerifierKey(key) ? readVerifierCookie(key) : window.localStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    if (!isBrowser()) return;
    if (isVerifierKey(key)) {
      document.cookie = `${key}=${encodeURIComponent(value)}; ${verifierCookieAttrs()}`;
    } else {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem(key: string): void {
    if (!isBrowser()) return;
    if (isVerifierKey(key)) {
      document.cookie = `${key}=; Path=/; Max-Age=0; SameSite=Lax`;
    } else {
      window.localStorage.removeItem(key);
    }
  },
};

// Browser auth singleton (also used for plain queries). Google OAuth sign-in
// (signInWithOAuth in login/page.tsx + AuthModal.tsx) and the callback's
// exchangeCodeForSession share THIS client. flowType 'pkce' makes the IdP
// return `?code=` (implicit would return a hash → /login?error=missing_code);
// `storage` routes the PKCE verifier to a cookie so it survives Safari's
// cross-site redirect (the session stays in localStorage).
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    storage: pkceHybridStorage,
  },
});

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
