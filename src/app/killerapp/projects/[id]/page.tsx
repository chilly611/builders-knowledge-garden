/**
 * Project Dashboard — Route Handler
 * ==================================
 *
 * Server component for the project home at /killerapp/projects/[id]. It
 * defers to LaneRouter, which resolves the signed-in user's Lane for THIS
 * project and renders the matching home: Owner → OwnerHomeClient, GC →
 * the existing ProjectDashboardClient (untouched), anything else → a
 * "your Lane home is coming" placeholder.
 */

import LaneRouter from './LaneRouter';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Project Dashboard',
  description: 'View your project status, budget, team, and timeline.',
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  return <LaneRouter projectId={id} />;
}
