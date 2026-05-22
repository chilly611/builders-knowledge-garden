/**
 * /killerapp/workflows/cost-explainer
 * ====================================
 * DIY-LANE "why does this cost so much?" budget walkthrough
 * (q-cost-explainer, stage 1 — Size Up).
 *
 * Server Component shell. The client component reads the active project's
 * `project_budget_lines`, maps each row's CSI division to a plain-English
 * label + one-sentence explainer (data/csi-plain-english.json), and shows
 * a total with a $/sf badge.
 *
 * Designed for the dreamer/homeowner lane — pro lanes have the full
 * budget workflow at /killerapp/budget instead.
 */

import { Suspense } from 'react';
import CostExplainerClient from './CostExplainerClient';

export const metadata = {
  title: 'Why does this cost so much?',
  description:
    "Plain-English breakdown of your construction budget — what each category is, why it costs what it does, and where the variability comes from.",
};

export default function CostExplainerPage() {
  return (
    <Suspense fallback={null}>
      <CostExplainerClient />
    </Suspense>
  );
}
