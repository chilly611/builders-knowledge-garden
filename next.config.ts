import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /**
   * 301 redirects for stale routes.
   *
   * 2026-05-08: /compass was a top-level Project Compass route in an early
   * iteration. The current home for it is /killerapp/workflows/compass-nav
   * (q19, the LIVE workflow). Footer link fixed in /killerapp/page.tsx;
   * keep this redirect for any bookmarks or external links.
   *
   * /dream/discover and /dream/landing were earlier names for Dream Machine
   * surfaces that consolidated into /dream during the W14 refactor. 301 so
   * old emails / docs / external links still land somewhere useful.
   */
  async redirects() {
    return [
      {
        source: '/compass',
        destination: '/killerapp/workflows/compass-nav',
        permanent: true,
      },
      {
        source: '/dream/discover',
        destination: '/dream',
        permanent: true,
      },
      {
        source: '/dream/landing',
        destination: '/dream',
        permanent: true,
      },
      {
        source: '/signup',
        destination: '/login?signup=1',
        permanent: false,
      },
      {
        source: '/dream-oracle',
        destination: '/dream/oracle',
        permanent: true,
      },
      {
        // /budget was a TODO/planned route that never landed. The
        // canonical budget surface is q17 expenses (BudgetWidget mounted
        // there). Redirect any old links that still point at /budget.
        source: '/budget',
        destination: '/killerapp/workflows/expenses',
        permanent: true,
      },
      {
        // 2026-05-28: the legacy `/projects/[id]` view (7-tab project
        // page) was demolished. The journey-aware `/killerapp/projects/
        // [id]` is the only project view that ships. Edge-level redirect
        // so saved URLs and inbound links land on the new view. The
        // `:id(?!new$)` constraint preserves `/projects/new` for the
        // separate project-creation route.
        source: '/projects/:id((?!new$).+)',
        destination: '/killerapp/projects/:id',
        permanent: true,
      },
    ];
  },
};

/**
 * Sentry wrapper — OBSERVABILITY-WIRE (2026-05-23).
 *
 * `withSentryConfig` becomes a soft no-op when SENTRY_AUTH_TOKEN /
 * SENTRY_ORG / SENTRY_PROJECT are missing (source-map upload skipped,
 * but the bundle plugin still injects the SDK).
 *
 * `silent:true` keeps the absence of those env vars from spamming
 * stdout in local dev. The runtime behavior of `Sentry.init(...)` is
 * still gated by DSN inside sentry.*.config.ts, so removing the auth
 * token doesn't disable error capture — only the symbolication uplift.
 *
 * @sentry/nextjs v8+ uses a single-options-object signature.
 */
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // 2026-05-23: Sentry @sentry/nextjs v10 renamed hideSourceMaps -> sourcemaps.disable.
  // Browser source maps stay client-readable for debugging; the server-side
  // sourcemaps that contain Stripe/Supabase code paths are uploaded to Sentry
  // and then deleted from the deployment artifacts. This is the v10 default.
  sourcemaps: {
    disable: false,  // upload to Sentry when SENTRY_AUTH_TOKEN is set
    deleteSourcemapsAfterUpload: true,
  },
  disableLogger: true,
  // Tunnel browser SDK requests through our own origin so ad-blockers
  // don't drop them. Opt-in: the route doesn't exist by default; flip
  // this if you create /monitoring later.
  // tunnelRoute: '/monitoring',
});
