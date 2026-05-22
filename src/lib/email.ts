/**
 * src/lib/email.ts
 * ================
 * Thin wrapper around the Resend SDK with a graceful fallback when
 * `RESEND_API_KEY` is unset (local dev, preview builds, or before the
 * Resend account is provisioned) AND a domain-verification guard that
 * refuses to send when Resend reports the FROM domain is unverified
 * (the whole point of EMAIL-VERIFICATION, 2026-05-22).
 *
 * Design choices:
 *   - Never throws. The form flow that calls `sendEmail` should treat
 *     email as best-effort: the database write is the system of record;
 *     the email is a courtesy notification on top.
 *   - Logs (warn) when the key is missing so the absence is visible in
 *     server logs but doesn't 500 the request.
 *   - Single FROM address controlled by `RESEND_FROM_EMAIL`. Falls back
 *     to a placeholder using the BKG domain so misconfiguration is
 *     loud (the message will bounce until the domain is verified).
 *   - Pre-flight DNS check: before each send we ask Resend "is this
 *     domain verified?" (cached for 5 minutes via a module-level memo
 *     so we don't hammer their API). If the answer is "no" we REFUSE
 *     and return `{ ok: false, error: 'domain_not_verified',
 *     dns_setup_url: '/admin/email-status' }` so the caller can surface
 *     the wizard instead of silently bouncing.
 *   - `force: true` on the call bypasses the verification gate — used
 *     by the admin "send a test email" tool that has to be able to push
 *     even when the domain isn't fully wired so the operator can see
 *     the bounce themselves.
 *
 * See docs/EMAIL-SETUP.md for env var + DNS configuration.
 */

import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const FROM = process.env.RESEND_FROM_EMAIL || 'BKG <noreply@theknowledgegardens.com>';

/**
 * Pull the bare domain out of either:
 *   - `RESEND_FROM_EMAIL` (e.g. `"BKG <noreply@theknowledgegardens.com>"` or
 *     `"noreply@theknowledgegardens.com"`)
 *   - explicit `FROM_DOMAIN` env var (overrides parsing — useful for sub-
 *     domain senders like `send.theknowledgegardens.com` where the FROM
 *     address might use the apex but the verified Resend domain is the
 *     subdomain).
 *
 * Exported so the healthcheck route + admin page can re-use the same
 * parsing logic without dragging a regex copy around.
 */
export function getFromDomain(): string | null {
  const explicit = process.env.FROM_DOMAIN?.trim();
  if (explicit) return explicit.toLowerCase();
  const raw = process.env.RESEND_FROM_EMAIL || FROM;
  // Strip a display name + angle brackets if present.
  const match = raw.match(/<([^>]+)>/);
  const addr = (match ? match[1] : raw).trim();
  const at = addr.lastIndexOf('@');
  if (at < 0) return null;
  return addr.slice(at + 1).toLowerCase() || null;
}

// ---------------------------------------------------------------------------
// Domain verification cache
// ---------------------------------------------------------------------------

const VERIFY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface DomainRecord {
  type: string;
  name: string;
  value: string;
  status?: string;
  priority?: number;
  ttl?: string | number;
}

export interface DomainStatus {
  configured: boolean;
  reason?: 'no_api_key' | 'fetch_failed' | 'not_added';
  domain: string | null;
  status: 'verified' | 'pending' | 'failed' | 'not_added' | 'unknown';
  verified_at?: string | null;
  records: DomainRecord[];
  raw_error?: string;
  fetched_at: string;
}

interface CacheEntry {
  fetched_at: number;
  status: DomainStatus;
}

let cache: CacheEntry | null = null;

/**
 * Fetch the verification status for the configured FROM domain from
 * Resend. Cached for `VERIFY_CACHE_TTL_MS` so back-to-back sends share
 * the same answer. Pass `{ bypassCache: true }` from the admin
 * "Re-check now" button to force a fresh lookup.
 */
export async function checkDomainVerification(
  opts: { bypassCache?: boolean } = {},
): Promise<DomainStatus> {
  const now = Date.now();
  if (!opts.bypassCache && cache && now - cache.fetched_at < VERIFY_CACHE_TTL_MS) {
    return cache.status;
  }

  const domain = getFromDomain();

  if (!apiKey) {
    const status: DomainStatus = {
      configured: false,
      reason: 'no_api_key',
      domain,
      status: 'unknown',
      records: [],
      fetched_at: new Date(now).toISOString(),
    };
    cache = { fetched_at: now, status };
    return status;
  }

  try {
    const res = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // Avoid Next caching this on the edge — we already memoize ourselves.
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const status: DomainStatus = {
        configured: true,
        reason: 'fetch_failed',
        domain,
        status: 'unknown',
        records: [],
        raw_error: `resend ${res.status}: ${body.slice(0, 400)}`,
        fetched_at: new Date(now).toISOString(),
      };
      cache = { fetched_at: now, status };
      return status;
    }

    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        name: string;
        status: string;
        created_at?: string;
        records?: DomainRecord[];
      }>;
    };

    const list = Array.isArray(json?.data) ? json.data : [];
    const match = domain
      ? list.find((d) => d.name?.toLowerCase() === domain)
      : null;

    if (!match) {
      const status: DomainStatus = {
        configured: true,
        reason: 'not_added',
        domain,
        status: 'not_added',
        records: [],
        fetched_at: new Date(now).toISOString(),
      };
      cache = { fetched_at: now, status };
      return status;
    }

    const normalized: DomainStatus = {
      configured: true,
      domain: match.name,
      status:
        match.status === 'verified'
          ? 'verified'
          : match.status === 'pending'
            ? 'pending'
            : match.status === 'failed'
              ? 'failed'
              : 'unknown',
      verified_at: match.status === 'verified' ? match.created_at ?? null : null,
      records: Array.isArray(match.records) ? match.records : [],
      fetched_at: new Date(now).toISOString(),
    };
    cache = { fetched_at: now, status: normalized };
    return normalized;
  } catch (e) {
    const status: DomainStatus = {
      configured: true,
      reason: 'fetch_failed',
      domain,
      status: 'unknown',
      records: [],
      raw_error: String(e),
      fetched_at: new Date(now).toISOString(),
    };
    cache = { fetched_at: now, status };
    return status;
  }
}

/** Test hook: clear the in-memory cache. */
export function _resetDomainVerificationCache() {
  cache = null;
}

export interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  /**
   * Bypass the domain-verification gate. Used by the admin "send a test
   * email" tool — never set this from a user-facing route or you defeat
   * the whole anti-silent-bounce mechanism.
   */
  force?: boolean;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
  dns_setup_url?: string;
}

/**
 * Send an HTML email through Resend. Returns `{ ok: false, error: 'no_api_key' }`
 * (without throwing) when `RESEND_API_KEY` is not configured, and
 * `{ ok: false, error: 'domain_not_verified', dns_setup_url: '/admin/email-status' }`
 * when Resend reports the FROM domain is not verified. Callers can pass
 * `force: true` to override the verification gate.
 */
export async function sendEmail(args: SendArgs): Promise<SendResult> {
  if (!resend) {
    console.warn(
      '[email] RESEND_API_KEY not set — skipping send.',
      'subject=', args.subject,
      'to=', Array.isArray(args.to) ? args.to.join(',') : args.to,
    );
    return { ok: false, error: 'no_api_key' };
  }

  // Pre-flight domain check (cached). Bypass for forced sends.
  if (!args.force) {
    const verification = await checkDomainVerification();
    if (verification.status !== 'verified') {
      console.warn(
        '[email] REFUSING to send — domain not verified.',
        'domain=', verification.domain,
        'status=', verification.status,
        'subject=', args.subject,
        'to=', Array.isArray(args.to) ? args.to.join(',') : args.to,
      );
      return {
        ok: false,
        error: 'domain_not_verified',
        dns_setup_url: '/admin/email-status',
      };
    }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
    });
    if (error) {
      console.error('[email] resend error:', error);
      return { ok: false, error: String(error) };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error('[email] send threw:', e);
    return { ok: false, error: String(e) };
  }
}

/**
 * Tiny HTML escape so user-typed strings can be safely interpolated into
 * the templated bodies that the architect-request route (and future
 * callers) build inline.
 */
export function escapeHtml(s: string | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
