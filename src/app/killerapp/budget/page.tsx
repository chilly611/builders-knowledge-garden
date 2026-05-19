import { Suspense } from 'react';
import BudgetClient from './BudgetClient';

/**
 * /killerapp/budget — Ship 22 (BKG demo prep, investor demo 2026-05-20).
 * ========================================================================
 *
 * Dedicated budget + estimating interface. Server Component wrapper —
 * BudgetClient reads ?project=<uuid> via useProject() (ProjectProvider is
 * mounted in /killerapp/layout.tsx). The Suspense boundary is required
 * because useProject() reaches into useSearchParams().
 *
 * Chilly's directive (verbatim, see Ship 22 brief):
 *   "For the budget NAVIGATION and the WIDGET that will work dynamically
 *    and adaptively no matter where you are in the project. This is where
 *    the user, especially the non tech savvy contractor (they get to
 *    ditch Quickbooks and Excel and whatever scraps of paper they have
 *    been keeping track of their projects with), sees the total cost of
 *    their whole project with what they have figured out so far and sees
 *    a visual representation of how it is getting spent in categories."
 *
 * Persistence note (Ship 22): the JSONB column on command_center_projects
 * for budget lines does NOT exist yet (grep'd 2026-05-19, only the
 * project_budgets TABLE exists for the legacy budget-spine). For the
 * Wednesday investor demo, BudgetClient writes to localStorage keyed by
 * `bkg-budget-{projectId}`. Real persistence is a post-demo migration.
 */

export const metadata = {
  title: 'Budget & Estimating · Builder’s Knowledge Garden',
  description:
    'See the total cost of your project at a glance. Build estimates category-by-category, lock in vendors, and watch your cash flow appear as you work.',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BudgetClient />
    </Suspense>
  );
}
