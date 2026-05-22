/**
 * src/lib/email.ts
 * ================
 * Thin wrapper around the Resend SDK with a graceful fallback when
 * `RESEND_API_KEY` is unset (local dev, preview builds, or before the
 * Resend account is provisioned).
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
 *
 * See docs/EMAIL-SETUP.md for env var + DNS configuration.
 */

import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const FROM = process.env.RESEND_FROM_EMAIL || 'BKG <noreply@theknowledgegardens.com>';

export interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Send an HTML email through Resend. Returns `{ ok: false, error: 'no_api_key' }`
 * (without throwing) when `RESEND_API_KEY` is not configured so callers can
 * continue their happy path.
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
