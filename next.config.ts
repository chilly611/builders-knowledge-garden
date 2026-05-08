import type { NextConfig } from "next";

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
    ];
  },
};

export default nextConfig;
