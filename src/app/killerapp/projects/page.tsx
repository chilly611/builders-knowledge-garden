/**
 * /killerapp/projects — Projects Dashboard
 * ========================================
 *
 * Server Component:
 *   - Renders the page shell with metadata
 *   - Wraps ProjectsDashboardClient in a Suspense boundary (required for useSearchParams in nav links)
 *   - Auth check happens client-side in ProjectsDashboardClient (via Supabase client SDK)
 *
 * The actual dashboard UI (cards, filters, sorting) + auth check lives in ProjectsDashboardClient.
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import ProjectsDashboardClient from './ProjectsDashboardClient';

// Force runtime SSR. Static prerender silently produced no HTML for this
// route (build classified it ○ Static but no projects.html landed in
// .next/server/app/killerapp/), and Vercel served Next's 500 fallback
// for every request. Forcing dynamic skips the static-prerender path and
// renders at request time with full Node.js runtime — robust and small.
// (2026-05-06 prod fix.)
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  // Just "Projects" — root layout's title.template adds "— Builder's
  // Knowledge Garden". Setting the full string here would duplicate
  // (the rendered title was "Projects — BKG — BKG").
  title: 'Projects',
  description: 'View and manage all your projects in one place.',
};

export default function ProjectsPage() {
  return (
    <div
      style={{
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 24,
        paddingBottom: 48,
        minHeight: '100vh',
        background: 'var(--trace, #F4F0E6)',
      }}
    >
      <Suspense fallback={null}>
        <ProjectsDashboardClient />
      </Suspense>
    </div>
  );
}
