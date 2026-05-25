# Builder's Knowledge Garden

![Builder's Knowledge Garden](public/logo/b_transparent_512.png)

**The operating system for the $17 trillion global construction economy.**

DREAM → DESIGN → PLAN → BUILD → DELIVER → GROW

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Required in Vercel production (and `.env.local` for local dev). Last reconciled 2026-05-25.

### Core runtime

| Variable | Service | Used By |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase (project `vlezoyalutexenbnzzui`) | Knowledge entities, audit log, gamification, auth, RLS |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Browser-side queries with RLS enforcement |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Server-side data access (API routes, scripts, batch workers) |
| `ANTHROPIC_API_KEY` | Anthropic Claude | AI specialists, copilot, `/admin/verify` auto-verify (Haiku cross-check) |
| `OPENAI_API_KEY` | OpenAI | `text-embedding-3-small` for pgvector embeddings + query-time RAG |
| `REPLICATE_API_TOKEN` | Replicate (account: xrworkers) | `/api/v1/render` — FLUX image generation for Oracle, Alchemist |

### Authentication

| Variable | Service | Used By |
|----------|---------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | Authentication UI |
| `CLERK_SECRET_KEY` | Clerk | Auth server-side |

(Supabase Auth is the primary path for the contractor app — Clerk is legacy for /killerapp surfaces. PLG signup uses Supabase.)

### Email

| Variable | Service | Used By |
|----------|---------|---------|
| `RESEND_API_KEY` | Resend (domain verified) | Transactional email (architect contact, onboarding sequence, invites) |
| `RESEND_FROM_EMAIL` | Resend | Default `From:` (e.g. `hello@theknowledgegardens.com`) |

### Billing

| Variable | Service | Used By |
|----------|---------|---------|
| `STRIPE_SECRET_KEY` | Stripe (test mode by default; `sk_test_…`) | `/api/v1/stripe/*` — checkout, portal, subscription |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | Browser-side Stripe.js (currently unused — server-redirect flow) |
| `STRIPE_WEBHOOK_SECRET` | Stripe | `/api/v1/stripe/webhook` signature verification |
| `STRIPE_PRICE_PRO_MONTHLY` | Stripe | Pro tier price ID (sandbox: tied to `prod_UGbZRkCHq81Tca`) |
| `STRIPE_PRICE_TEAM_MONTHLY` | Stripe | Team tier price ID (`prod_UGbbXH0eDldM3M`) |
| `STRIPE_PRICE_ENTERPRISE_MONTHLY` | Stripe | Enterprise tier price ID (`prod_UGbexzn30upB0v`) |
| `STRIPE_LIVE_MODE` | (gate) | Set to `1` ONLY in production to allow live-mode keys. Defaults to test-mode-only enforcement. |

### Signatures

| Variable | Service | Used By |
|----------|---------|---------|
| `DOCUMENSO_API_KEY` | Documenso Cloud v1 | Owner-lane change-order signatures (raw `Authorization: <key>` header, not Bearer) |
| `DOCUMENSO_WEBHOOK_SECRET` | Documenso | `/api/v1/signatures/webhook/documenso` signature verification |
| `SIGNATURE_PROVIDER` | (router) | `documenso` (default), `dropbox-sign`, or `noop` |

### Observability

| Variable | Service | Used By |
|----------|---------|---------|
| `SENTRY_DSN` | Sentry (`@sentry/nextjs@10`) | Server error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry | Browser error tracking |
| `SENTRY_ORG` | Sentry | Source-map upload organization |
| `SENTRY_AUTH_TOKEN` | Sentry (optional) | Build-time source-map upload — wire for clickable stack traces |
| `POSTHOG_API_KEY` | PostHog (`posthog-node`) | Server-side product analytics in 4 API routes |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog (`posthog-js`) | Browser-side product analytics provider |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog | Defaults to `https://us.i.posthog.com` |

### Cache

| Variable | Service | Used By |
|----------|---------|---------|
| `KV_REST_API_URL` | Upstash Redis (via Vercel KV) | Optional — cross-region cache backend for `aggregateSources` (paywall-spend protection). Falls back to in-memory LRU when absent. |
| `KV_REST_API_TOKEN` | Upstash Redis | Auth for the KV REST API |

### Code sources (external publishers)

| Variable | Service | Used By |
|----------|---------|---------|
| `ICC_API_KEY` | ICC Digital Codes Premium | Citation-only without key (no live contract yet) |
| `NFPA_API_KEY` | NFPA Link | Citation-only without key |
| `UPCODES_API_KEY` | UpCodes API | Reserved — consumer tiers ($39/$59/$68/mo) have NO API access. Wire for enterprise tier when sales-led contract lands. Until then, `/admin/verify` deep-links to `up.codes/search` + Copilot via clipboard prompts. |

### Cron

| Variable | Service | Used By |
|----------|---------|---------|
| `CRON_SECRET` | (shared) | Bearer auth on `/api/v1/cron/*` routes (onboarding reminder cron, CRM SMS flush, etc.) |

## Logo Assets

All logo variants live in `public/logo/`:

| File | Usage |
|------|-------|
| `b_transparent_512.png` | Primary logo — transparent, works on most backgrounds |
| `b_white_outline_512.png` | For dark backgrounds — white glow outline |
| `b_dark_outline_512.png` | For light backgrounds — dark outline |
| `b_wood_outline_512.png` | Warm organic outline — use on mid-tone backgrounds |
| `b_icon_192x192.png` | PWA / Android icon (square, centered) |
| `b_icon_512x512.png` | Large app icon (square, centered) |
| `favicon.ico` | Browser tab icon (multi-size) |
| `og_image_dark.png` | Social sharing card (1200×630, dark) |
| `og_image_light.png` | Social sharing card (1200×630, light) |
