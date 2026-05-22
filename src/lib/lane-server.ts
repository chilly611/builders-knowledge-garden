/**
 * lane-server — server-side companion to `useUserLane` (LANE-INFRA).
 *
 * For API routes and server components that need to check a user's role
 * on a project. Uses the same priority order as the client hook:
 *
 *   1. `project_members.project_role` for (projectId, userId)
 *   2. `auth.users.raw_user_meta_data.lane` mapped through
 *      LEGACY_LANE_TO_PROJECT_ROLE
 *   3. Default `gc`
 *
 * Reads use the service-role client so an API handler can authorise
 * before any RLS-checked write. Callers MUST verify the user's identity
 * first via `getAuthUser(request)` from `@/lib/auth-server`.
 *
 * Example:
 *
 *   import { getAuthUser, unauthorizedResponse } from '@/lib/auth-server';
 *   import { resolveUserLane, requireRole } from '@/lib/lane-server';
 *
 *   export async function POST(req: NextRequest) {
 *     const user = await getAuthUser(req);
 *     if (!user) return unauthorizedResponse();
 *     const lane = await resolveUserLane(user.id, projectId);
 *     if (!requireRole(lane.effectiveLane, ['owner', 'gc'])) {
 *       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 *     }
 *     // …authorised work…
 *   }
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ProjectRole, LegacyLane, UserLane } from '@/lib/use-user-lane';
import { LEGACY_LANE_TO_PROJECT_ROLE, pickHighestRole } from '@/lib/use-user-lane';

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

/**
 * Resolve a user's lane for a given project on the server side.
 *
 * Both args are required (vs. the client hook where projectId can be
 * null) because there's no "active project" concept on the server.
 */
export async function resolveUserLane(
  userId: string,
  projectId: string | null,
): Promise<UserLane> {
  const admin = getServiceClient();

  // 1. project_members rows for (projectId, userId). A user can hold
  //    multiple roles — pull all and pick the highest-priority one.
  let projectRole: ProjectRole | null = null;
  if (projectId) {
    const { data, error } = await admin
      .from('project_members')
      .select('project_role')
      .eq('project_id', projectId)
      .eq('user_id', userId);
    if (!error && data) {
      const roles = data
        .map((r) => r.project_role as ProjectRole | null)
        .filter((r): r is ProjectRole => !!r);
      projectRole = pickHighestRole(roles);
    }
  }

  // 2. legacy lane from auth.users.raw_user_meta_data.
  let legacyLane: LegacyLane | null = null;
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (!error && data?.user) {
      const raw = (data.user.user_metadata?.lane as string | undefined) ?? null;
      if (raw === 'builder' || raw === 'specialist' || raw === 'dreamer') {
        legacyLane = raw;
      }
    }
  } catch {
    // Non-fatal — fall through with legacyLane = null.
  }

  const effectiveLane: ProjectRole =
    projectRole ??
    (legacyLane ? LEGACY_LANE_TO_PROJECT_ROLE[legacyLane] : 'gc');

  return { projectRole, legacyLane, effectiveLane, loading: false };
}

/**
 * Boolean helper: does `lane` satisfy `allow` (and not `deny`)?
 * Mirrors the LaneGate semantics so server gates and client gates agree.
 */
export function requireRole(
  lane: ProjectRole,
  allow: ProjectRole | ProjectRole[] | '*',
  deny?: ProjectRole | ProjectRole[],
): boolean {
  const denyList = deny ? (Array.isArray(deny) ? deny : [deny]) : [];
  if (denyList.includes(lane)) return false;
  if (allow === '*') return true;
  const allowList = Array.isArray(allow) ? allow : [allow];
  return allowList.includes(lane);
}
