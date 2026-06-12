'use client';

/**
 * Builders garden — specialist runner adapter
 * ===========================================
 *
 * Satisfies the L2 `SpecialistRunner` contract with BKG's existing
 * client-side helper (`fetch` to `POST /api/v1/specialists/[id]`). The engine
 * (`AnalysisPane`) receives this via `<SpecialistRunnerProvider>` and never
 * imports `specialists.client` directly.
 *
 * Importing the builders module here is correct — this file IS builders
 * garden code (see `lifecycle.ts` in this directory for the same pattern).
 *
 * Client-only ('use client'): the runner wraps a browser fetch helper and is
 * only ever consumed by client components through context.
 */

import { runSpecialist } from '@/lib/specialists.client';
import type { SpecialistRunner } from '@/garden/contracts/specialists';

export const buildersSpecialistRunner: SpecialistRunner = (specialistId, context) =>
  runSpecialist(specialistId, context);
