/**
 * Lens enforcement middleware — pure authorization decision layer.
 *
 * Given (userId, projectId, dataCategory, action) returns 'permitted' or
 * 'not-permitted'. Does NOT resolve auth; callers must verify the user's
 * identity before invoking (see lane-server.ts for the established pattern).
 *
 * Semantics:
 *   - FAIL CLOSED: any DB error or absence of matching rows → 'not-permitted'.
 *   - UNION across lanes: a user holding multiple active memberships is
 *     permitted if ANY single membership permits the requested cell.
 *   - OVERRIDES FIRST: custom_lens_overrides on a membership is evaluated
 *     before the shared lens_permission_matrix. A boolean override is final
 *     for that membership — the matrix is not consulted when an override
 *     exists for the (dataCategory, action) cell.
 *   - ABSENCE IS DENY: a matrix row missing for a (lane, dataCategory, action)
 *     triple is treated as denied; no row = no permission.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DataCategory, LensAction, PermissionDecision } from './types';

export type { DataCategory, LensAction, PermissionDecision };

// ---------------------------------------------------------------------------
// Service client (lazy singleton — mirrors lane-server.ts convention)
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

let serviceClient: SupabaseClient | null = null;
function getServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient;
  serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return serviceClient;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CheckLensPermissionArgs {
  userId: string;
  projectId: string;
  dataCategory: DataCategory;
  action: LensAction;
}

/**
 * Authorisation decision for a single (user, project, dataCategory, action)
 * tuple. Returns 'permitted' if any active lane membership grants access,
 * 'not-permitted' otherwise.
 *
 * @param args  - The permission check inputs.
 * @param client - Optional injected Supabase client (for testing without a
 *                 real DB). Defaults to the lazy service-role singleton.
 */
export async function checkLensPermission(
  args: CheckLensPermissionArgs,
  client?: SupabaseClient,
): Promise<PermissionDecision> {
  const { userId, projectId, dataCategory, action } = args;
  const db = client ?? getServiceClient();

  // Step 1: fetch all active lane memberships for this (project, user) pair.
  const { data, error } = await db
    .from('project_lane_memberships')
    .select('lane_id, custom_lens_overrides')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .is('revoked_at', null);

  // Fail closed on any error or empty result set.
  if (error || !data || data.length === 0) {
    return 'not-permitted';
  }

  // Step 2: UNION across memberships — permitted if ANY membership permits.
  for (const membership of data) {
    // OVERRIDES FIRST: check the per-membership sparse override map.
    const override =
      membership.custom_lens_overrides?.[dataCategory]?.[action];

    if (typeof override === 'boolean') {
      // Override is decisive for this membership. If true, short-circuit the
      // entire check — union semantics mean one permit wins.
      if (override === true) return 'permitted';
      // override === false: this membership explicitly denies; skip matrix.
      continue;
    }

    // No override for this cell — fall through to the shared matrix.
    const { data: matrixRow, error: matrixError } = await db
      .from('lens_permission_matrix')
      .select('permitted')
      .eq('lane_id', membership.lane_id)
      .eq('data_category', dataCategory)
      .eq('action', action)
      .maybeSingle();

    // Absence-is-deny: missing row or error → this membership denies.
    if (!matrixError && matrixRow?.permitted === true) {
      return 'permitted';
    }
  }

  // No membership granted access.
  return 'not-permitted';
}

/**
 * Convenience boolean wrapper around checkLensPermission.
 */
export async function isLensPermitted(
  args: CheckLensPermissionArgs,
  client?: SupabaseClient,
): Promise<boolean> {
  return (await checkLensPermission(args, client)) === 'permitted';
}
