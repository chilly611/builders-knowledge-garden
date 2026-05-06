'use client';

/**
 * EmptyStateOrProjectIndicator (Project Spine v1, 2026-05-05)
 *
 * Replaces the static "You're not started yet. 7 stages to explore."
 * line on /killerapp with a context-aware version:
 *   - Without ?project=<id>: shows "You're not started yet."
 *   - With ?project=<id>: hides itself entirely (the
 *     KillerappProjectShell already shows the project context above
 *     the picker; a redundant indicator is noise).
 *
 * Persona findings: the stale "not started yet" copy after the user
 * had ALREADY started a project was one of the "feels nowhere" tells
 * the founder kept flagging.
 *
 * Suspense:
 *   This component uses `useSearchParams` and so requires a Suspense
 *   boundary in the parent (Next.js 16 requirement).
 */

import { useSearchParams } from 'next/navigation';
import { LIFECYCLE_STAGES } from '@/lib/lifecycle-stages';

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
      You&rsquo;re not started yet. {LIFECYCLE_STAGES.length} stages to explore.
    </div>
  );
}
