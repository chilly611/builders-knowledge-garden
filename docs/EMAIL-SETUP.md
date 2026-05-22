# Email setup (Resend)

Outbound email from the app — currently used by the architect-of-record
concierge form at `/killerapp/workflows/architect-of-record` and the
find-a-GC form at `/killerapp/workflows/find-a-gc` — flows through
[Resend](https://resend.com) via the helper at `src/lib/email.ts`.

This doc explains the env vars, the **full DNS wizard**, the
verification healthcheck, fallback behavior, and how to swap providers
if we ever want to.

> **TL;DR for new ops people:** sign in to the app as an org owner and
> visit **`/admin/email-status`**. The page tells you what's broken and
> shows the exact DNS records to paste. The wizard below is the long
> version of that page.

---

## Required env vars

| Var | Required? | Example | Notes |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Yes (or no email goes out) | `re_xxxxxxxxxxxxxxxxxxxxxxxx` | If unset the helper logs a warning and returns `{ ok: false, error: 'no_api_key' }`. Routes that use it fall back gracefully (DB write only, no email). |
| `RESEND_FROM_EMAIL` | Optional | `BKG <noreply@theknowledgegardens.com>` | Defaults to `BKG <noreply@theknowledgegardens.com>`. Must be on a verified Resend domain or every send bounces. |
| `FROM_DOMAIN` | Optional | `theknowledgegardens.com` | Explicit override for the domain we check verification against. If unset we parse it out of `RESEND_FROM_EMAIL` (or the default). Useful when the FROM address uses the apex but the verified Resend record is on a subdomain (e.g. `send.theknowledgegardens.com`). |

Set them in:

- Local dev: `.env.local`
- Vercel: Project → Settings → Environment Variables (Production +
  Preview). Mark `RESEND_API_KEY` as **Sensitive**.

---

## The DNS setup wizard (do this once, end-to-end)

This is the path from "nothing configured" to "verified, outbound mail
flowing." Budget 30 minutes if you're new to DNS; 5 if you're not.

### Step 1 — Create a Resend account + API key

1. Sign up at <https://resend.com/signup>. Use a **team-owned email**
   (e.g. `ops@theknowledgegardens.com`) so the account doesn't
   bus-factor on one person.
2. Once in: **API Keys → Create API Key**. Name it
   `bkg-app-production`. Scope to **Sending access**. Copy the
   `re_…` token immediately — Resend won't show it again.
3. Paste the token into Vercel as `RESEND_API_KEY`:
   - **Vercel dashboard → Project → Settings → Environment Variables**
   - Name: `RESEND_API_KEY`
   - Value: `re_…`
   - Environments: **Production**, **Preview**
   - Mark as **Sensitive**
4. Redeploy (Vercel won't pick up a new env var until the next deploy).
5. _Optional sanity check:_ visit `/admin/email-status` as an org
   owner. Status should show **"Not added to Resend"** (we have the
   key but no domain yet). That's the next step.

> _Screenshot placeholder: `docs/img/email-setup/01-resend-api-keys.png`_

### Step 2 — Add the domain in Resend

1. Resend dashboard → **Domains → Add Domain**.
2. Enter `theknowledgegardens.com`. Region: **us-east-1** to match the
   rest of our infra (unless we're already on EU).
3. Resend will generate a list of DNS records (MX, TXT for SPF, TXT for
   DKIM, optional DMARC). Don't close this page yet — you'll either
   paste them at your registrar manually (step 3) or pull them from
   `/admin/email-status` once the key is live.

> _Screenshot placeholder: `docs/img/email-setup/02-resend-add-domain.png`_

### Step 3 — Paste the DNS records at your DNS provider

The fastest way: go to **`/admin/email-status`** in the deployed app
and use the copy-to-clipboard buttons. Each record card shows you the
exact host and value Resend wants. Paste them at your registrar:

**Cloudflare:**
1. dash.cloudflare.com → your domain → **DNS → Records**
2. **Add record** for each row in `/admin/email-status`. Match the type
   (TXT / MX / CNAME), paste the host into **Name**, paste the value
   into **Content**. **Proxy status: DNS only** (the grey cloud, not
   orange — Cloudflare's proxy doesn't forward MX/TXT).
3. TTL: Auto.

**GoDaddy:**
1. dcc.godaddy.com → **My Products → DNS** for the domain.
2. **Add → choose type**, paste host into **Name** (or `@` for apex),
   value into **Value**.
3. GoDaddy is the slowest to propagate — budget up to 24h before
   panicking.

**Route 53 (AWS):**
1. Console → Route 53 → **Hosted zones → your zone → Create record**.
2. For each row: choose the record type, paste **Record name** and
   **Value**. Routing policy: Simple. TTL: 300.

**Squarespace / Namecheap / Porkbun / etc:** same idea — every
registrar has a "DNS records" panel; the field labels are slightly
different ("Host" vs "Name", "Value" vs "Content" vs "Points to"), but
the values you paste are identical.

> _Screenshot placeholder: `docs/img/email-setup/03-cloudflare-records.png`_

**Records you should end up with** (Resend will show the exact values
in its dashboard and on the admin page; this is the shape):

| Type | Host | Purpose |
| --- | --- | --- |
| `MX` | `send.theknowledgegardens.com` (priority 10) | Resend bounce processing |
| `TXT` | `send.theknowledgegardens.com` | SPF — `v=spf1 include:_spf.resend.com ~all` (modern Resend; legacy accounts may still show `include:amazonses.com`) |
| `TXT` | `resend._domainkey.theknowledgegardens.com` | DKIM public key (a long `p=…` blob) |
| `TXT` | `_dmarc.theknowledgegardens.com` (recommended) | DMARC policy — start with `v=DMARC1; p=none; rua=mailto:dmarc@theknowledgegardens.com` |

### Step 4 — Wait for propagation, then verify

1. DNS changes typically appear in 5–60 minutes. GoDaddy occasionally
   takes 24 hours. You can spot-check propagation with
   `dig TXT send.theknowledgegardens.com +short` from any shell.
2. Resend dashboard → your domain → click **Verify Records**. Each row
   should flip to a green check.
3. In the app: visit `/admin/email-status` and click **Re-check now**
   (which calls `/api/v1/email/healthcheck?bypassCache=1`). Status
   should flip to **Verified**.

> _Screenshot placeholder: `docs/img/email-setup/04-admin-verified.png`_

### Step 5 — Confirm an actual send

1. Submit a test through `/killerapp/workflows/architect-of-record`
   with your own email as the contact.
2. Check the response payload — `emailed.internal` and
   `emailed.confirmation` should both be `true`.
3. Check your inbox. The confirmation should land within a minute.
4. Check `architect_requests` in Supabase — `notified_at` should be
   stamped.

If you don't see the email: re-open `/admin/email-status`. If it still
says **Verified**, the problem is either an invalid recipient address
or Resend rate-limiting (free tier is 100/day). Check Resend's
**Emails** tab for the bounce reason.

---

## Healthcheck endpoint

`GET /api/v1/email/healthcheck` returns the current verification status:

```bash
# As an authenticated user (prod). In dev, anon also works.
curl -s "$APP_URL/api/v1/email/healthcheck" \
  -H "Authorization: Bearer $TOKEN" | jq
```

Response shapes:

```jsonc
// Key missing
{ "configured": false, "reason": "no_api_key", "domain": "theknowledgegardens.com", "status": "unknown", "records": [], "fetched_at": "..." }

// Key set, domain not added in Resend yet
{ "configured": true, "reason": "not_added", "domain": "theknowledgegardens.com", "status": "not_added", "records": [], "fetched_at": "..." }

// Domain added, DNS pending
{ "configured": true, "domain": "theknowledgegardens.com", "status": "pending", "records": [ /* TXT/MX/CNAME rows with per-record status */ ], "fetched_at": "..." }

// Verified — sends will go out
{ "configured": true, "domain": "theknowledgegardens.com", "status": "verified", "verified_at": "2026-...", "records": [...], "fetched_at": "..." }
```

The response is memoized in-process for 5 minutes; pass
`?bypassCache=1` to force a fresh Resend lookup.

---

## What `sendEmail()` does when DNS isn't ready

The helper now refuses to call Resend if it knows the domain isn't
verified — that's the whole point of EMAIL-VERIFICATION. So callers
will see:

| Condition | `sendEmail()` returns |
| --- | --- |
| `RESEND_API_KEY` unset | `{ ok: false, error: 'no_api_key' }` |
| Key set, domain `pending` / `failed` / `not_added` | `{ ok: false, error: 'domain_not_verified', dns_setup_url: '/admin/email-status' }` |
| Key set, domain `verified`, Resend errors at send time | `{ ok: false, error: '<resend message>' }` |
| Key set, domain `verified`, send succeeds | `{ ok: true, id: '<resend message id>' }` |

Callers (`architect-request`, `gc-match-request`) treat any `ok: false`
the same: don't stamp `notified_at`, log it, and let the team back-fill
from the table. The DB row is the system of record either way.

**Force flag:** internal tools can pass `force: true` to `sendEmail()`
to bypass the verification gate (so an admin "send a test email" button
can show you the actual bounce instead of being blocked by our
pre-flight). **Never set `force` from a user-facing route** or you
defeat the anti-silent-bounce behavior.

---

## Troubleshooting

### "We added the records but Resend still says pending"

- **#1 cause: trailing whitespace.** Some registrar UIs trim, some
  don't. Re-paste the value using the copy buttons in
  `/admin/email-status`.
- **#2 cause: registrar auto-appending the apex.** If your DKIM host
  field looks like `resend._domainkey.theknowledgegardens.com` and the
  registrar appends the zone, you end up with
  `resend._domainkey.theknowledgegardens.com.theknowledgegardens.com`.
  Strip the trailing apex from the host field (most providers want
  just `resend._domainkey`).
- **#3 cause: Cloudflare proxy enabled.** TXT/MX/CNAME used for email
  must be **DNS only** (grey cloud). Orange-cloud will silently break
  verification.
- **#4 cause: just slow DNS.** Especially GoDaddy. Wait an hour, click
  **Re-check now**.

### "We added SPF but mail is still going to spam"

- **You probably have two `v=spf1` records.** Having two SPF TXTs at
  the same host invalidates SPF entirely (RFC 7208 §3.2). You have to
  **merge** them:
  - Wrong (two records): `v=spf1 include:_spf.google.com ~all` and
    `v=spf1 include:_spf.resend.com ~all`
  - Right (one record): `v=spf1 include:_spf.google.com include:_spf.resend.com ~all`
- **SPF flattening tools that 10x your DNS lookups.** SPF has a
  10-lookup limit. If you've stacked Google + Resend + a marketing
  tool + a CRM, you can blow the limit. Use an SPF lookup tool
  (mxtoolbox SPF check) to count.

### "MX vs CNAME confusion"

- Resend's bounce-processing record is **MX** at
  `send.theknowledgegardens.com` (priority 10) pointing to a
  `feedback-smtp.us-east-1.amazonses.com` style host. It is NOT a
  CNAME — pasting it as CNAME will reject because MX is required
  at that name.
- DKIM is a **TXT** record (or sometimes presented as CNAME on newer
  Resend setups — follow what the dashboard says, not what this doc
  guesses).

### "Verified yesterday, broken today"

- DKIM key rotation: if you regenerated the API key or changed regions,
  DKIM may need to be re-pasted. Visit `/admin/email-status` and check.
- Domain expiry. Check WHOIS.
- DNSSEC misconfiguration. If you flipped on DNSSEC after the records
  were added, signature mismatches can make resolvers refuse the
  records. Disable DNSSEC, verify, re-enable.

---

## Fallback behavior matrix

| State | DB row written? | Email sent? | `notified_at` stamped? | User sees |
| --- | --- | --- | --- | --- |
| Verified, send succeeds | Yes | Yes | Yes | "We got it!" + confirmation email |
| Verified, Resend errors | Yes | No | No | "We got it!" — team picks up the row manually |
| Domain not verified | Yes | No (refused pre-flight) | No | "We got it!" — admin should fix DNS via `/admin/email-status` |
| `RESEND_API_KEY` unset | Yes | No (logged warn) | No | "We got it!" — team picks up the row manually |

The team can periodically scan
`select * from architect_requests where notified_at is null order by created_at desc`
(and the same for `gc_match_requests`) to catch any rows that didn't
notify.

---

## Swapping providers

If we ever move off Resend (cost, deliverability, EU residency, etc.),
`src/lib/email.ts` is the only file that needs to change. Keep the
`sendEmail({ to, subject, html, replyTo })` signature stable and the
callers won't care. The healthcheck endpoint at
`/api/v1/email/healthcheck` and the `/admin/email-status` page would
need their internals re-pointed at the new provider's domain API but
their public shape can stay the same.

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
`{ ok: false, error: 'no_api_key' }`. Never throw. Same verification
gate: pre-flight check the provider's domain API and refuse
`domain_not_verified` rather than letting a silent bounce through.
