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
 * Persistence note (JSONB-DROP-V2, 2026-05-24): canonical store is
 * `public.project_budget_lines`, written through `PATCH /api/v1/budget`
 * (upserts by `(project_id, csi_division)`). BudgetClient mirrors to
 * localStorage keyed by `bkg-budget-{projectId}` so the offline / anon
 * demo path still works. The legacy
 * `command_center_projects.project_budgets` JSONB column has been DROPPED;
 * no code path should reference it.
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
