/**
 * Marin adapter — bridge from the canonical seed into the `KacProject`
 * shape the killerapp-chrome reads.
 *
 * 2026-05-28: rewritten to thin-wrap `getCanonicalProject()` so the
 * BudgetRibbon stops disagreeing with the rest of the app. Previously
 * this file rolled up `MARIN_BUDGET_LINES` by `state` (paid / locked-in /
 * estimated / pending), which produced $116K spent / $1.157M committed
 * — not the canonical $312K / $186K / $1.15M. Roll-ups belong in one
 * place; that place is the seed-data file.
 *
 * Kept as a re-export for backwards compatibility with the existing
 * `marinKacProject()` call sites.
 */

import { getCanonicalProject } from '@/lib/projects/getCanonicalProject';
import type { KacProject } from './types';

export function marinKacProject(): KacProject {
  return getCanonicalProject();
}

export { MARIN_PROJECT_ID } from '@/lib/seed-data/marin-farmhouse';
