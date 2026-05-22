/**
 * /admin/healthcheck (PLATFORM-HEALTHCHECK, 2026-05-22)
 * ======================================================
 * Owner-only operational dashboard. Calls `/api/v1/healthcheck?detailed=1`
 * on mount, then auto-refreshes every 30 seconds. Each sub-check
 * renders with a green/amber/red dot mirroring the severity tiers
 * defined in the route file:
 *
 *   green = check.ok && no warning
 *   amber = check.ok && warning present (soft-warn tier)
 *   red   = !check.ok
 *
 * Mirrors the visual style of `/admin/email-status` so an operator
 * jumping between the two pages doesn't have to re-orient.
 */

import HealthcheckClient from './HealthcheckClient';

export const metadata = {
  title: 'Platform healthcheck · BKG admin',
  description:
    'Operational status of every BKG sub-system: db, RLS, audit log, embeddings, email, RAG cache, workflows, MCP, pg_cron, Vercel.',
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return <HealthcheckClient />;
}
