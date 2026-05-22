# Email setup (Resend)

Outbound email from the app — currently used by the architect-of-record
concierge form at `/killerapp/workflows/architect-of-record` — flows through
[Resend](https://resend.com) via the helper at `src/lib/email.ts`.

This doc explains the env vars, DNS, fallback behavior, and how to swap
providers if we ever want to.

---

## Required env vars

| Var | Required? | Example | Notes |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Optional (recommended) | `re_xxxxxxxxxxxxxxxxxxxxxxxx` | If unset the helper logs a warning and returns `{ ok: false, error: 'no_api_key' }`. Routes that use it should fall back gracefully (DB write only, no email). |
| `RESEND_FROM_EMAIL` | Optional | `BKG <noreply@theknowledgegardens.com>` | Defaults to `BKG <noreply@theknowledgegardens.com>`. Must be a verified sender on the Resend account or messages will bounce. |

Set them in:

- Local dev: `.env.local`
- Vercel: Project → Settings → Environment Variables (Production +
  Preview). Mark `RESEND_API_KEY` as **Sensitive**.

---

## Getting a Resend API key

1. Sign up at <https://resend.com/signup>. Use a team-owned email so the
   account doesn't bus-factor on one person.
2. **Add the domain** `theknowledgegardens.com` (Dashboard → Domains →
   Add Domain). Pick `Region: us-east-1` to match the rest of our
   infra unless we're already on EU.
3. Resend shows the DNS records to add (see below). Add them at the
   registrar, click **Verify**. Verification can take a few minutes —
   sometimes longer if the registrar caches aggressively.
4. Once the domain is `Verified`, create an API key (Dashboard → API
   Keys → Create). Scope it to **Sending access** for that one domain.
   Copy the `re_…` token and put it in `RESEND_API_KEY`.

---

## DNS records you need to add

Resend will show the exact values; the shape is:

| Type | Host | Purpose |
| --- | --- | --- |
| `MX` | `send.theknowledgegardens.com` (priority 10) | Resend bounce processing |
| `TXT` | `send.theknowledgegardens.com` | SPF — `v=spf1 include:amazonses.com ~all` |
| `TXT` | `resend._domainkey.theknowledgegardens.com` | DKIM public key |
| `TXT` | `_dmarc.theknowledgegardens.com` (optional but recommended) | DMARC policy — start with `v=DMARC1; p=none; rua=mailto:dmarc@theknowledgegardens.com` |

Notes:

- SPF: if we already have a sender (Google Workspace, etc.), **merge**
  the Resend include into the existing record rather than adding a second
  `v=spf1` TXT — having two SPF records breaks SPF entirely.
- DKIM: the host Resend gives uses a selector; don't change it.
- DMARC: start with `p=none` so we can monitor without rejecting. Move
  to `quarantine` then `reject` after a few weeks of clean reports.

---

## Fallback behavior when the key is missing

`src/lib/email.ts` is deliberately permissive:

```ts
if (!resend) {
  console.warn('[email] RESEND_API_KEY not set — skipping send', ...);
  return { ok: false, error: 'no_api_key' };
}
```

API routes that call `sendEmail` (e.g.
`/api/v1/architect-request/route.ts`) treat the DB write as the system
of record and treat email as best-effort. Concretely, for the
architect-of-record flow:

| State | DB row written? | Email sent? | `notified_at` stamped? | User sees |
| --- | --- | --- | --- | --- |
| `RESEND_API_KEY` set, send succeeds | Yes | Yes | Yes | "We got it!" + confirmation email |
| `RESEND_API_KEY` set, send errors | Yes | No | No | "We got it!" — team picks up the row manually |
| `RESEND_API_KEY` unset | Yes | No (logged warn) | No | "We got it!" — team picks up the row manually |

The team can periodically scan
`select * from architect_requests where notified_at is null order by created_at desc`
to catch any rows that didn't notify.

---

## Swapping providers

If we ever move off Resend (cost, deliverability, EU residency, etc.),
`src/lib/email.ts` is the only file that needs to change. Keep the
`sendEmail({ to, subject, html, replyTo })` signature stable and the
callers won't care.

Realistic alternatives:

- **Postmark** — transactional-only, excellent deliverability, message
  streams for marketing-vs-transactional separation. Their Node SDK
  shape is similar (`client.sendEmail({ From, To, Subject, HtmlBody })`).
- **AWS SES** — cheapest at scale once we're past 50K/month; needs
  manual sandbox-removal and per-region warming. Use `@aws-sdk/client-sesv2`.
- **SendGrid** — fine but the SDK is heavier and Twilio's pricing has
  drifted up. Not recommended unless we already have a SendGrid contract.
- **Mailgun** — solid EU option; otherwise no advantage over Resend.

For an apples-to-apples swap, the helper would become roughly:

```ts
// Postmark example
import { ServerClient } from 'postmark';
const client = new ServerClient(process.env.POSTMARK_TOKEN!);
await client.sendEmail({
  From: FROM,
  To: Array.isArray(to) ? to.join(',') : to,
  Subject: subject,
  HtmlBody: html,
  ReplyTo: replyTo,
});
```

Same fallback pattern: if the token is missing, log and return
`{ ok: false, error: 'no_api_key' }`. Never throw.
