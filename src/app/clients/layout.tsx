import type { Metadata } from 'next';

// HIDDEN SURFACE — "Pipeline / Clients" is a Q3-2026 feature preview, not yet shipped.
// De-linked from CompassBloom and noindexed so it never surfaces in nav or search.
// The route is intentionally kept (reachable by direct URL) as an internal preview;
// see docs/sitemap.md → "Hidden / not-for-demo".
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
