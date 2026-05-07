'use client';

/**
 * /killerapp/projects — Projects Dashboard
 * ========================================
 *
 * Client wrapper around ProjectsDashboardClient.
 *
 * History:
 *  - 2026-05-06 Sprint Agent D shipped this with a Server Component shell
 *    + Suspense boundary. Build classified the route ○ Static, but
 *    Turbopack silently produced no prerender HTML, and Vercel served
 *    Next's 500 fallback at runtime. Adding `dynamic = 'force-dynamic'`
 *    didn't fix it — something during streaming SSR was still throwing.
 *  - 2026-05-06 follow-up: convert to 'use client' to bypass the server
 *    render path entirely. The parent /killerapp/layout.tsx is already
 *    'use client', so we lose no SSR-only feature here. Suspense is
 *    no longer needed because ProjectsDashboardClient doesn't use
 *    useSearchParams (auth state lives in Supabase client SDK).
 */
import ProjectsDashboardClient from './ProjectsDashboardClient';

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
      <ProjectsDashboardClient />
    </div>
  );
}
