/**
 * /killerapp/who-is-asking
 * =========================
 * Voice-first lead intake. The opening move of the CRM funnel.
 *
 * Server Component:
 *   - Reads ?project=<id> query param if present (passed down so the
 *     journey event lands on the right project bucket).
 *   - Renders the foreman-vernacular shell + delegates interactive
 *     state to WhoIsAskingClient.
 *
 * Wired to workflow "crm-lead-intake" in docs/workflows.json so the
 * journey-map "Lead" dot lights up the moment a contact is confirmed.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import WhoIsAskingClient from './WhoIsAskingClient';

export const metadata = {
  title: "Who's asking?",
  description:
    "Tell us about a lead. We'll capture the rough shape and you can polish it after.",
};

export default async function WhoIsAskingPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;

  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '32px 24px',
        fontFamily: 'var(--font-body, system-ui)',
      }}
    >
      <nav
        style={{
          fontSize: 13,
          color: 'var(--graphite, #2E2E30)',
          marginBottom: 16,
          opacity: 0.7,
        }}
      >
        <Link
          href="/killerapp"
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          Killer App
        </Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>Who&apos;s asking?</span>
      </nav>

      <header style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: 'var(--graphite, #1B3B5E)',
            margin: 0,
            marginBottom: 8,
            lineHeight: 1.15,
          }}
        >
          Who&apos;s asking?
        </h1>
        <p
          style={{
            fontSize: 16,
            color: 'var(--graphite, #2E2E30)',
            opacity: 0.75,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Tell us about a lead. We&apos;ll capture the rough shape and you
          can polish it after.
        </p>
      </header>

      <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
        <WhoIsAskingClient initialProjectId={project} />
      </Suspense>
    </div>
  );
}
