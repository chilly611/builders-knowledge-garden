/**
 * Tests for the legacy-lane → project-role mapping used by /auth/callback,
 * /signup, /welcome, and the server-side lane-server.ts.
 *
 * DIY-COLD (2026-05-22): when a brand-new dreamer user clicks their magic
 * link, /auth/callback now derives `projectRole = LEGACY_LANE_TO_PROJECT_ROLE[lane]`
 * and writes it to `bkg-lane` BEFORE redirecting to /welcome. If that map
 * ever shifts (e.g. someone "fixes" the dreamer→diy edge to dreamer→gc),
 * the SSR pass that reads the cookie in app/layout.tsx will stamp the
 * wrong body[data-diy-cockpit] value and the pro picker will flash for
 * every DIY user. Lock the contract here.
 */
import { describe, it, expect, vi } from 'vitest';

// use-user-lane.ts imports `@/lib/hooks/useProject` and `@/lib/supabase`,
// which the vitest setup doesn't resolve without a tsconfig-paths plugin.
// Stub them — the helpers we're testing (LEGACY_LANE_TO_PROJECT_ROLE,
// pickHighestRole) are pure and don't touch either dependency.
vi.mock('@/lib/hooks/useProject', () => ({
  useProject: () => ({ projectId: null }),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ data: [], error: null }) }) }),
    }),
  },
}));

import { LEGACY_LANE_TO_PROJECT_ROLE, pickHighestRole } from '../use-user-lane';

describe('LEGACY_LANE_TO_PROJECT_ROLE', () => {
  it('maps dreamer → diy (load-bearing for the no-flash DIY cockpit)', () => {
    expect(LEGACY_LANE_TO_PROJECT_ROLE.dreamer).toBe('diy');
  });

  it('maps builder → gc', () => {
    expect(LEGACY_LANE_TO_PROJECT_ROLE.builder).toBe('gc');
  });

  it('maps specialist → specialist', () => {
    expect(LEGACY_LANE_TO_PROJECT_ROLE.specialist).toBe('specialist');
  });

  it('covers every legacy lane (no implicit gc fallback for known lanes)', () => {
    expect(Object.keys(LEGACY_LANE_TO_PROJECT_ROLE).sort()).toEqual(
      ['builder', 'dreamer', 'specialist'].sort(),
    );
  });
});

describe('pickHighestRole', () => {
  it('returns null for empty input', () => {
    expect(pickHighestRole([])).toBeNull();
  });

  it('prefers owner over gc', () => {
    expect(pickHighestRole(['gc', 'owner'])).toBe('owner');
  });

  it('prefers gc over diy', () => {
    expect(pickHighestRole(['diy', 'gc'])).toBe('gc');
  });

  it('returns the only role when only one provided', () => {
    expect(pickHighestRole(['diy'])).toBe('diy');
  });
});

/**
 * Integration trace (DIY-COLD, 2026-05-22)
 *
 * The /auth/callback page is a client component (uses
 * supabase.auth.exchangeCodeForSession from the browser SDK so the PKCE
 * exchange writes the session into localStorage). That makes it awkward
 * to unit-test as a request/response pair — there is no Route Handler to
 * call. Instead, here is the end-to-end trace this fix protects, plus
 * the assertions a future integration test should cover:
 *
 *   1. New DIY user signs up at /signup (lane=dreamer set by some pre-
 *      signup flow, e.g. /onboarding or seed).
 *   2. Magic link → /auth/callback?code=...
 *   3. exchangeCodeForSession succeeds → supabase.auth.getUser() returns
 *      user with user_metadata.lane='dreamer'.
 *   4. LEGACY_LANE_TO_PROJECT_ROLE.dreamer === 'diy' (asserted above).
 *   5. document.cookie is set to `bkg-lane=diy; Path=/; Max-Age=604800;
 *      SameSite=Lax` SYNCHRONOUSLY before router.replace().
 *   6. router.replace('/welcome') → browser sends the just-set cookie on
 *      the GET /welcome request.
 *   7. /welcome is a client page; its server shell + app/layout.tsx
 *      reads `cookies().get('bkg-lane')` (or the x-bkg-lane header
 *      injected by middleware.ts) and stamps body[data-diy-cockpit=1]
 *      on the SSR output.
 *   8. Same cookie rides on the subsequent navigation to /killerapp.
 *   9. DiyCockpitOverlay mounts, reads cookie, finds it matches the
 *      live lane → no-op, no flash.
 *
 * The unit test above guards step 4. A higher-level Playwright /
 * integration test would assert that after /auth/callback resolves,
 * document.cookie contains `bkg-lane=diy` BEFORE the next navigation.
 * That's tracked separately; the orchestrator's e2e suite owns it.
 */
