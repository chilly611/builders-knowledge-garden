import type { Metadata } from 'next';

// HIDDEN SURFACE — "Site Intelligence" is a Q4-2026 feature preview, not yet shipped.
// De-linked from CompassBloom and noindexed so it never surfaces in nav or search.
// The route is intentionally kept (reachable by direct URL) as an internal preview;
// see docs/sitemap.md → "Hidden / not-for-demo".
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
