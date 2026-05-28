/**
 * Project-ownership guard shared by every per-project API route.
 *
 * Pre-2026-05-28 each route (attachments/, conversations/, etc.) duplicated
 * its own `assertProjectOwnership` that compared only `command_center_projects.user_id`
 * to the bearer-token user id. That ran AHEAD of any DEMO_PROJECT_IDS allowlist
 * or `user_metadata.demo_project_id` grant, so a signed-in dogfooder hitting
 * /api/v1/projects/55730cd3-.../attachments would get
 * `403 "Unauthorized: you do not own this project"` even though
 *   - the SELECT RLS policy `ccp_demo_select` permits it,
 *   - and the parent /api/v1/projects route had already special-cased the
 *     same project id on its own GET path.
 *
 * This module centralizes the same three-tier grant the parent route uses so
 * every sub-route stays consistent:
 *   1. Owner: `command_center_projects.user_id === requesterUserId`
 *   2. Demo allowlist: project id is one of the three seeded demos
 *   3. Token-scoped demo: caller's `user_metadata.demo_project_id` matches
 *
 * Reads (assertProjectReadAccess) honor all three. Writes (assertProjectWriteAccess)
 * also honor all three; we intentionally do NOT enforce a stricter rule for
 * demo writes because /api/v1/projects/route.ts already proves trial accounts
 * are allowed to PATCH their seeded demo (Sec+Auth Burn 6, 2026-05-22).
 *
 * Callers still use the service client for the actual data fetch — RLS isn't
 * the line of defense here, this helper is. RLS remains in place as a
 * defense-in-depth backstop.
 */

import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/auth-server';

/**
 * The three seeded demo projects. Mirrors the inline set in
 * src/app/api/v1/projects/route.ts; kept in sync because that route uses it
 * for list-page hydration semantics that don't fit this helper.
 */
export const DEMO_PROJECT_IDS = new Set<string>([
  '55730cd3-5225-493d-8b5c-49086d942565', // Modern farmhouse in Marin (canonical)
  'aa11b22c-1111-4d78-aaaa-bbccdd112233', // ADU in Sausalito
  'bb22c33d-2222-4d78-bbbb-ccddee223344', // Commercial TI in SoMa
]);

export type OwnershipResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Pull `user_metadata.demo_project_id` from the bearer token, if any.
 * Returns null if the header is missing, the token is invalid, env is
 * unconfigured, or the metadata field isn't a non-empty string.
 *
 * Signed by Supabase, so the client cannot forge it.
 */
async function getCallerDemoProjectId(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice('Bearer '.length);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    const sb = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return null;
    const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
    const v = meta.demo_project_id;
    return typeof v === 'string' && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/**
 * Returns { ok: true } if the caller may read this project. Three accepted
 * grants: owner, demo allowlist, or token-scoped demo_project_id.
 *
 * Returns 404 (not 403) when the project doesn't exist so we don't leak
 * existence to unrelated callers.
 */
export async function assertProjectReadAccess(
  request: NextRequest,
  projectId: string,
  userId: string
): Promise<OwnershipResult> {
  if (DEMO_PROJECT_IDS.has(projectId)) {
    // Demo allowlist is satisfied before we even hit the DB. Existence is
    // implied by the constant; if the row was deleted somehow, the caller's
    // downstream query will return its own empty-state.
    return { ok: true };
  }

  const { data, error } = await getServiceClient()
    .from('command_center_projects')
    .select('user_id')
    .eq('id', projectId)
    .single();

  if (error || !data) {
    return { ok: false, status: 404, error: 'Project not found' };
  }

  if (data.user_id === userId) return { ok: true };

  const callerDemoProjectId = await getCallerDemoProjectId(request);
  if (callerDemoProjectId && callerDemoProjectId === projectId) {
    return { ok: true };
  }

  return {
    ok: false,
    status: 403,
    error: 'Unauthorized: you do not own this project',
  };
}

/**
 * Write access uses the same three grants as read. The parent
 * /api/v1/projects PATCH path established this precedent (Sec+Auth Burn 6,
 * 2026-05-22) so trial accounts can edit their seeded demo project.
 *
 * If you need a stricter rule (e.g. DELETE intentionally disallows demo
 * writes — see projects/route.ts DELETE), call assertProjectOwnerStrict
 * directly instead.
 */
export const assertProjectWriteAccess = assertProjectReadAccess;

/**
 * Owner-only grant. Use for irreversible operations (DELETE) where the
 * demo-allowlist semantics would let one trial account torch another's
 * seeded demo.
 */
export async function assertProjectOwnerStrict(
  projectId: string,
  userId: string
): Promise<OwnershipResult> {
  const { data, error } = await getServiceClient()
    .from('command_center_projects')
    .select('user_id')
    .eq('id', projectId)
    .single();

  if (error || !data) {
    return { ok: false, status: 404, error: 'Project not found' };
  }

  if (data.user_id !== userId) {
    return {
      ok: false,
      status: 403,
      error: 'Unauthorized: you do not own this project',
    };
  }

  return { ok: true };
}
