# Observability — Sentry + PostHog

OBSERVABILITY-WIRE (2026-05-23). Wires error tracking (Sentry) and
product analytics (PostHog) into the BKG Next.js app. Both providers
are gracefully no-op when their env vars are absent — observability
must never break a request.

---

## 1. Sentry setup (error tracking + performance)

### 1a. Sign up + create a project
1. Go to https://sentry.io/ and create an account (Anthropic SSO works).
2. **Create a new project** → platform: **Next.js** → name: `bkg-app`.
3. Sentry shows you a DSN that looks like
   `https://<hash>@o<org-id>.ingest.sentry.io/<project-id>`.
4. (Optional, recommended) **Settings → Auth Tokens** → create a token
   with `project:releases` + `project:read` scope. This is what unlocks
   automatic source-map upload on deploy.

### 1b. Add the env vars to Vercel
In **Vercel → Project → Settings → Environment Variables**:

| Name | Scope | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | All envs | The DSN from step 3 |
| `SENTRY_DSN` | All envs | Same value as above (server-only mirror) |
| `SENTRY_AUTH_TOKEN` | Prod + Preview | The auth token from step 4 |
| `SENTRY_ORG` | Prod + Preview | Your Sentry org slug (lowercase) |
| `SENTRY_PROJECT` | Prod + Preview | `bkg-app` |
| `SENTRY_ENVIRONMENT` | Prod | `production` (optional — defaults to `VERCEL_ENV`) |

> **Why two DSNs?** `NEXT_PUBLIC_SENTRY_DSN` is bundled into the client
> JS; `SENTRY_DSN` stays server-only. They can be the same value or two
> separate projects (recommended for high-volume apps so server noise
> doesn't drown out client errors).

### 1c. Verify
- Trigger an error somewhere in the app (e.g. throw in a route handler
  during dev).
- Open the Sentry issues feed — the event should land within 30s.
- Healthcheck dashboard at `/admin/healthcheck` will show
  `observability.sentry.configured: true`.

---

## 2. PostHog setup (product analytics)

### 2a. Sign up + create a project
1. Go to https://posthog.com/ and create an account.
2. Create a project → platform: **Web** → name: `bkg-app`.
3. Project Settings → grab the **Project API Key** (`phc_...`) and the
   **API Host** (US cloud → `https://us.posthog.com`, EU →
   `https://eu.posthog.com`).

### 2b. Add the env vars to Vercel

| Name | Scope | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` | All envs | `phc_...` |
| `NEXT_PUBLIC_POSTHOG_HOST` | All envs | `https://us.posthog.com` |
| `POSTHOG_KEY` | All envs | Same as `NEXT_PUBLIC_POSTHOG_KEY` (server mirror) |

> Server-side capture (`captureServerEvent`) reads `POSTHOG_KEY` first
> and falls back to `NEXT_PUBLIC_POSTHOG_KEY`. One key is fine; two keys
> only matters if you want to scope server vs. browser events to
> separate PostHog projects.

### 2c. Verify
- Sign up a new user. PostHog → Activity → Live Events should show
  `signup_completed`.
- Healthcheck `/admin/healthcheck` will show
  `observability.posthog.configured: true`.

---

## 3. Events being captured

All server-side events identify by `user.id` (UUID) only — **never
email** (PII rule).

| Event | Triggered in | Properties |
| --- | --- | --- |
| `signup_completed` | `POST /api/v1/onboard-new-user` (after org+project+budget seed) | `lane`, `org_id`, `project_id`, `env` |
| `signature_sent` | `POST /api/v1/signatures` (after `signed_documents` insert) | `lane`, `project_id`, `document_type`, `provider` (`documenso` \| `in_app`), `env` |
| `change_order_signed` | `PATCH /api/v1/signatures/:id/sign` (every signer leg) | `project_id`, `document_type`, `method` (`typed` \| `drawn` \| `documenso` \| ...), `finalized` (bool), `env` |
| `sub_bid_submitted` | `POST /api/v1/sub-bids` (after `sub_bids` insert) | `lane`, `project_id`, `trade_label`, `csi_division`, `env` |

`env` is auto-stamped from `VERCEL_ENV` (`production` / `preview` /
`development`).

### Client-side events
`PostHogProvider` (mounted in `src/components/Providers.tsx`) auto-fires:
- `$pageview` on every Next.js route change.
- `posthog.identify(user.id)` on auth state change. `posthog.reset()`
  on sign-out.

---

## 4. How "graceful no-key" works

| Component | Missing env var | Behavior |
| --- | --- | --- |
| `sentry.{client,server,edge}.config.ts` | No DSN | `Sentry.init({ enabled: false })` → SDK is a no-op |
| `withSentryConfig` in `next.config.ts` | No `SENTRY_AUTH_TOKEN` | Source-map upload skipped; runtime SDK still works |
| `src/lib/posthog.ts → getPostHogServerClient()` | No `POSTHOG_KEY` | Returns `null` |
| `src/lib/posthog.ts → captureServerEvent()` | No key | Returns immediately, no network |
| `src/components/PostHogProvider.tsx` | No `NEXT_PUBLIC_POSTHOG_KEY` | Mounts as a transparent pass-through |

Local dev with no env vars set: the app runs identically to before this
wire. The healthcheck just reports `configured:false`.

---

## 5. PII safety notes

- **Never** pass `user.email` as a property to `captureServerEvent`.
- **Never** call `posthog.identify(user.id, { email: ... })` client-side.
- PostHog auto-captures URL params; the `purchaseOrderId`, `projectId`,
  and similar UUIDs in URLs are intentional and OK.
- Sentry's `beforeSend` is NOT customized here; add a scrubbing hook if
  the team ever starts logging request bodies in error breadcrumbs.

---

## 6. Adding new events

```ts
import { captureServerEvent } from '@/lib/posthog';

try {
  await captureServerEvent(user.id, 'your_event_name', {
    project_id: someId,
    // ...any non-PII properties
  });
} catch {
  // captureServerEvent already swallows, but belt-and-braces
  // is fine — analytics must never break the request.
}
```

Rule: every new event needs a row in section 3 of this doc.
