'use client';

/**
 * EmptyStateOrProjectIndicator (Project Spine v1, 2026-05-05)
 *
 * Tiny copy that sits ABOVE the workflow picker on /killerapp:
 *   - Without ?project=<id>: a one-line invitation to start somewhere.
 *   - With ?project=<id>: hides itself entirely (the
 *     KillerappProjectShell already shows the project context above
 *     the picker; a redundant indicator is noise).
 *
 * Persona findings: the stale "not started yet" copy after the user
 * had ALREADY started a project was one of the "feels nowhere" tells
 * the founder kept flagging.
 *
 * 2026-05-07 demo readiness pass: "You're not started yet. N stages
 * to explore." reads like the app isn't set up. Replaced with an
 * action-first invitation.
 *
 * Suspense:
 *   This component uses `useSearchParams` and so requires a Suspense
 *   boundary in the parent (Next.js 16 requirement).
 */

import { useSearchParams } from 'next/navigation';

export default function EmptyStateOrProjectIndicator() {
  const searchParams = useSearchParams();
  const hasProject = !!searchParams.get('project');

  if (hasProject) return null; // Project shell tells the story now.

  return (
    <div
      style={{
        fontSize: '12px',
        color: '#2E2E30',
        opacity: 0.6,
        marginBottom: '40px',
        fontWeight: 500,
        letterSpacing: '0.3px',
      }}
    >
      Pick a workflow below to start — or describe your project up top.
    </div>
  );
}
