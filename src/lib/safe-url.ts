/**
 * safe-url — open-redirect defense for `?next=` / `?redirectTo=` params.
 *
 * 2026-05-22 (Sec+Auth Burn 6): the audit found that login/signup/callback
 * pages all forwarded arbitrary URLs from `next` / `redirectTo`. An attacker
 * could craft `/login?next=https://evil.example.com` and the page would
 * happily `router.push()` straight off-site after a successful auth,
 * preserving the session cookie and dropping the user on a phishing page.
 *
 * Rules implemented by safeNext():
 *   - must be a non-empty string
 *   - must start with `/` (server-relative)
 *   - must NOT start with `//` (protocol-relative — browsers treat as off-site)
 *   - must NOT start with `/\` (Windows-style protocol-relative; old IE quirk
 *     still recognized by some HTTP libraries / bots)
 *   - must NOT contain `\` anywhere (some parsers treat backslash as `/`)
 *   - must NOT contain newline / CR (header-injection defense for any caller
 *     that pipes the string into a redirect header)
 *   - everything else falls back to `defaultPath` (default `/welcome`)
 *
 * Absolute URLs are always rejected, even if their origin is "ours" —
 * the orchestrator pushes by domain alias and we don't want to whitelist
 * every preview URL. Internal navigation never needs an absolute URL.
 */

const DEFAULT_FALLBACK = '/welcome';

export function safeNext(raw: string | null | undefined, defaultPath: string = DEFAULT_FALLBACK): string {
  if (typeof raw !== 'string' || raw.length === 0) return defaultPath;

  // Reject CR/LF — header-injection defense.
  if (/[\r\n]/.test(raw)) return defaultPath;

  // Reject backslashes outright. Some browsers / proxies treat `\` as `/`
  // so a path like `/\evil.com` could be interpreted as `//evil.com`.
  if (raw.includes('\\')) return defaultPath;

  // Must be server-relative.
  if (!raw.startsWith('/')) return defaultPath;

  // Reject protocol-relative URLs (//evil.com/...) which navigate off-site.
  if (raw.startsWith('//')) return defaultPath;

  // Defensive: reject anything that parses as an absolute URL. raw starts
  // with `/` already, so this should only ever trigger on weird inputs that
  // bypassed the earlier checks (e.g. URL-encoded schemes). If we can't
  // parse it as a relative URL against our placeholder origin, bail out.
  try {
    const parsed = new URL(raw, 'https://placeholder.invalid');
    if (parsed.origin !== 'https://placeholder.invalid') return defaultPath;
  } catch {
    return defaultPath;
  }

  return raw;
}

/**
 * For use in OAuth `redirectTo`, where we send the user away to the IdP
 * and they come back to our /auth/callback?redirectTo=<x>. We have to put
 * a full URL on the wire (Supabase requires it) but the embedded `redirectTo`
 * query param must still be safe.
 */
export function safeCallbackRedirect(origin: string, next: string | null | undefined): string {
  const safe = safeNext(next);
  return `${origin}/auth/callback?redirectTo=${encodeURIComponent(safe)}`;
}
