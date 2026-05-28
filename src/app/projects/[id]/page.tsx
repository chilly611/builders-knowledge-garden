/**
 * LEGACY ROUTE — DEMOLISHED 2026-05-28.
 * =====================================
 *
 * The old `/projects/[id]` view (the 7-tab project page with the
 * legacy back-link header and the orphan RFI/Submittals/Change-Orders/
 * Punch-List/Budget pill row) has been retired. The new project view
 * is the journey-aware `/killerapp/projects/[id]` (ProjectCompass +
 * persistent stage chrome). The internal pipeline language is no
 * longer surfaced to users; it remains only as an internal concept.
 *
 * Sub-surfaces that lived on the old page have been extracted to
 * reusable components and re-mounted on the journey:
 *   - AIAttentionItems       → `/killerapp/projects/[id]`
 *   - PermitsList            → Plan stage
 *   - MaterialsCSI           → Plan stage (Pro / alpha)
 *   - TeamRoster             → Size Up stage
 *   - GanttChartPlaceholder  → Plan stage (alpha — coming soon)
 *
 * This file is a server-side redirect so any inbound link or saved
 * URL lands on the new view automatically. Belt-and-suspenders with
 * the edge-level 308 in `next.config.ts`.
 *
 * The MARIN_TEAM / getCanonicalProject hydration logic the
 * data-consistency agent landed on this file the same day is
 * preserved in `src/lib/seed-data/marin-farmhouse.ts` and
 * `src/lib/projects/getCanonicalProject.ts` — the new project view
 * (and any other journey-aware surface that needs the canonical
 * Marin data) should consume those modules directly.
 */

import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LegacyProjectRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/killerapp/projects/${encodeURIComponent(id)}`);
}
