# Runbook — Google OAuth consent-screen branding

*LOOP 1 deliverable (2026-06-12). Founder-only console steps — nothing here is
automatable from the repo, and none of it requires a deploy. Written against the
Google Cloud / Supabase consoles as of June 2026; if a menu label has drifted,
the search box in each console finds the page by the names given here.*

## Why this exists

**What a stranger sees today** when they tap "Continue with Google":

> Choose an account — *to continue to* **vlezoyalutexenbnzzui.supabase.co**

That string is the single least-trustworthy moment in our signup. The domain
users see is the OAuth `redirect_uri`'s domain, and ours is the raw Supabase
project domain (`https://vlezoyalutexenbnzzui.supabase.co/auth/v1/callback`).
Flow for reference:

```
builders.theknowledgegardens.com  →  accounts.google.com   (consent screen)
  →  vlezoyalutexenbnzzui.supabase.co/auth/v1/callback     (Supabase exchanges)
  →  builders.theknowledgegardens.com/auth/callback        (our server route, #24)
```

Two independent fixes, in order of effort:

| Track | What changes on the consent screen | Cost | Time |
|---|---|---|---|
| **A. Brand the consent screen** | App name + logo + support email shown; "to continue to" gains our app name | Free | ~20 min + Google review for the logo |
| **B. Supabase custom auth domain** | The `supabase.co` domain disappears entirely (e.g. `auth.theknowledgegardens.com`) | Supabase paid add-on ($10/mo as of 2026) + DNS | ~30 min + cert propagation |

Track A is the 80% win and has no dependency on Track B. Do A now, B when you
want the last 20%.

---

## Track A — Brand the Google consent screen

All steps in **Google Cloud Console** (console.cloud.google.com), in the same
GCP project that holds the OAuth client ID currently pasted into Supabase
(Supabase Dashboard → Authentication → Providers → Google shows which client
ID is in use — match it under GCP → APIs & Services → Credentials).

1. **Open the consent-screen config.** Navigation: `APIs & Services → OAuth
   consent screen` (Google has been migrating this to a "Google Auth Platform"
   section — if you see that instead, open `Google Auth Platform → Branding`).
2. **App name:** `Builder's Knowledge Garden`. This is the name users see in
   "to continue to …". Keep it exactly the product name — Google rejects names
   that look like domains or contain "Google".
3. **User support email:** `hello@theknowledgegardens.com` (must be an address
   you control in this Google account/Workspace, or a Google Group you own).
4. **App logo:** upload the BKG seal (120×120 px PNG, <1 MB, light background
   per brand rules — the herbarium seal on paper-cream works).
   **Heads-up:** adding a logo flips the app into Google's verification queue
   (Track A step 8). The name/email changes apply immediately even while the
   logo sits in review.
5. **App domain block:** Application home page `https://builders.theknowledgegardens.com`,
   privacy policy + terms links (currently `/privacy` and `/terms` on the same
   domain — confirm both resolve before submitting; Google checks).
6. **Authorized domains:** add `theknowledgegardens.com` AND `supabase.co`'s
   entry stays only if Google complains about the redirect domain — normally
   the authorized-domain list needs the domains of your home page/privacy/terms
   (i.e. just `theknowledgegardens.com`). The redirect URI's domain is governed
   by the Credentials page, not this list.
7. **Publishing status:** if the app is still "Testing", only allow-listed test
   users can sign in — switch to **"In production"** (button on the same page).
   Without scopes beyond `email/profile/openid` (we request none), pushing to
   production does NOT require full verification; you may see an "unverified
   app" interstitial only for the logo until step 8 clears.
8. **Verification (logo only):** Google will email the support address with the
   review outcome (typically days, not weeks, for branding-only review). Nothing
   to do in the meantime — the consent screen already shows the app name.

**What users see after Track A:**

> Choose an account — *to continue to* **Builder's Knowledge Garden**
> *(small print still names vlezoyalutexenbnzzui.supabase.co as the receiving site)*

## Track B — Supabase custom auth domain (kills the supabase.co small print)

In **Supabase Dashboard** (project `knowledge-gardens-prod`,
`vlezoyalutexenbnzzui`) — **shared prod: do this in a quiet window.**

1. `Project Settings → General → Custom Domains` (paid add-on — enable it on
   the project's subscription if not already active).
2. Choose the vanity domain: `auth.theknowledgegardens.com` (recommended — it's
   what users will see).
3. Add the DNS records Supabase displays (a CNAME to the project domain + TXT
   validation records) at the DNS host for `theknowledgegardens.com`.
4. Wait for validation + certificate issuance in the dashboard (minutes to ~1h),
   then **Activate**.
5. **Google side after activation:** in GCP → Credentials → the OAuth client,
   add the new redirect URI `https://auth.theknowledgegardens.com/auth/v1/callback`
   (keep the old supabase.co one during cutover, remove after confirming).
6. **App side after activation:** `NEXT_PUBLIC_SUPABASE_URL` in Vercel must
   switch to `https://auth.theknowledgegardens.com` — **founder-gated env
   change; coordinate with a deploy.** The anon key is unchanged. Sessions
   survive (the auth cookies are keyed to our app domain, not supabase.co).
7. Re-test sign-in (Chrome + Safari — Safari was the #24 problem child) before
   removing the old redirect URI.

**What users see after A + B:**

> Choose an account — *to continue to* **Builder's Knowledge Garden**
> *(small print: auth.theknowledgegardens.com)*

## Out of scope / explicitly NOT done by this lane

- No GCP or Supabase console changes were made by the agent (this doc is the
  deliverable). No env vars were touched.
- Track B step 6 is a shared-prod env change → founder-supervised only.
- If/when the marketing domain moves off `builders.` to an apex app domain,
  redo Track A step 5 and re-check the privacy/terms URLs.
