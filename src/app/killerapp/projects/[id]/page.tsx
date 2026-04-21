/**
 * Project Dashboard — Route Handler
 * ==================================
 *
 * Server component that renders the project dashboard for a given [id].
 * For the demo-project, this loads demo data and displays a populated
 * Compass view showing a mid-flight residential build.
 *
 * When a real project is implemented, this will fetch live data from the API.
 */

import ProjectDashboardClient from './ProjectDashboardClient';

interface ProjectPageProps {
  params: {
    id: string;
  };
}

export const metadata = {
  title: 'Project Dashboard — Builder\'s Knowledge Garden',
  description: 'View your project status, budget, team, and timeline.',
};

export default function ProjectPage({ params }: ProjectPageProps) {
  return <ProjectDashboardClient projectId={params.id} />;
}
