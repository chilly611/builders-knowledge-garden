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

export const metadata: Metadata = {
  title: 'Projects — Builder\'s Knowledge Garden',
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
