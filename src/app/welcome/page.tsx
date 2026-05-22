'use client';

/**
 * /welcome — first-time contractor landing (2026-05-20)
 *
 * Shown after a trial contractor signs in. Tells them:
 *  - which demo project we pre-loaded for them
 *  - three concrete things to try
 *  - where to give us feedback
 *  - one big CTA into their project
 *
 * Marks welcomed_at on the user's auth metadata after first view; subsequent
 * sign-ins skip /welcome (login/page.tsx + signup/page.tsx route them
 * directly to the killerapp).
 *
 * Trial accounts are seeded with user_metadata.demo_project_id (see
 * app/scripts/seed-trial-accounts.mjs); if absent we fall back to the Marin
 * farmhouse so the "Take me to my project" CTA always works.
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { safeNext } from '@/lib/safe-url';
import { LEGACY_LANE_TO_PROJECT_ROLE } from '@/lib/use-user-lane';

// DIY-COLD (2026-05-22): belt-and-suspenders cookie writer. /auth/callback
// is the primary place we set bkg-lane, but if a user lands on /welcome
// from some other entry point (e.g. an already-authenticated session that
// missed the callback, or the /signup direct sign-in path) we still want
// the cookie populated BEFORE we router.push() into /killerapp so SSR
// stamps body[data-diy-cockpit] correctly on the first byte.
const LANE_COOKIE = 'bkg-lane';
const LANE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function readLaneCookie(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|;\s*)bkg-lane=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

function writeLaneCookie(lane: string): void {
  if (typeof document === 'undefined') return;
  document.cookie =
    `${LANE_COOKIE}=${encodeURIComponent(lane)}; Path=/; ` +
    `Max-Age=${LANE_COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}

const COLORS = {
  paper: '#FAF8F2',
  ink: '#1A1A1A',
  graphite: '#3D3D3D',
  faded: '#7A766C',
  rule: '#D8D2C2',
  green: '#1D9E75',
  warm: '#D85A30',
  amber: '#C4A44A',
  red: '#E8443A',
};

// Fallback project — the Marin farmhouse (the demo's canonical project).
const FALLBACK_PROJECT_ID = '55730cd3-5225-493d-8b5c-49086d942565';

/**
 * LANE-INFRA (2026-05-22): pick the first landing route after /welcome based
 * on the user's lane/role. Keeps the existing default (`/killerapp`) and
 * only redirects elsewhere when there's a clearly better entry point.
 *
 *   owner       → /killerapp                    (with `?cockpit=owner` hint)
 *   diy/dreamer → /killerapp/workflows/architect-of-record   (find-a-pro wizard)
 *   specialist  → /killerapp                    (with `?lane=specialist` hint)
 *   default     → /killerapp
 *
 * The "find-a-GC" wizard route doesn't exist yet at the time of writing;
 * we ship the architect-of-record concierge as the closest live workflow
 * (already routed at `q-aor` in live-workflows.ts) and the next agent in
 * this lane can swap it for the GC-finder when that workflow lands.
 */
function landingRouteForLane(opts: {
  projectRole: string | null;
  legacyLane: string | null;
  projectId: string;
}): string {
  const { projectRole, legacyLane, projectId } = opts;
  const projectQs = `project=${encodeURIComponent(projectId)}`;

  if (projectRole === 'owner') {
    return `/killerapp?${projectQs}&cockpit=owner`;
  }
  if (projectRole === 'diy' || legacyLane === 'dreamer') {
    // DIY-LANE (2026-05-22): land in the simplified cockpit (3-column
    // Plan/Hire/Track view). The wizard at /welcome already offered a
    // direct "Find me a contractor" path — by the time we get here the
    // user picked "let me poke around," so respect that.
    return `/killerapp?${projectQs}&cockpit=diy`;
  }
  if (projectRole === 'specialist' || legacyLane === 'specialist') {
    return `/killerapp?${projectQs}&lane=specialist`;
  }
  return `/killerapp?${projectQs}`;
}

interface DemoProject {
  id: string;
  name: string;
  jurisdiction: string | null;
  estimated_cost_low: number | null;
  estimated_cost_high: number | null;
}

function WelcomePageContent() {
  const router = useRouter();
  const search = useSearchParams();
  // 2026-05-22 (Sec+Auth Burn 6): pass `next` through safeNext() before
  // any router.replace/push — previously this page accepted arbitrary
  // URLs in the query param and used them in router.replace(nextParam).
  const rawNext = search.get('next');
  const nextParam = rawNext ? safeNext(rawNext, '/killerapp') : null;

  const [userName, setUserName] = useState<string>('');
  const [demoProjectId, setDemoProjectId] = useState<string>(FALLBACK_PROJECT_ID);
  const [project, setProject] = useState<DemoProject | null>(null);
  const [loading, setLoading] = useState(true);
  // LANE-INFRA: resolved lane context, used for landing-route selection.
  const [projectRole, setProjectRole] = useState<string | null>(null);
  const [legacyLane, setLegacyLane] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        // 2026-05-22 (Sec+Auth Burn 6) — Reza-sub bug: this page was reading
        // a stale cached `getUser()` result that still pointed at the
        // *previous* tenant's session, causing /welcome to route into the
        // wrong project. Force a session refresh so user_metadata reflects
        // whoever JUST signed in. refreshSession() is a no-op when the
        // current token is still valid, so this is cheap on the happy path.
        try {
          await supabase.auth.refreshSession();
        } catch {
          // Non-fatal — if the refresh fails we still have the old session
          // and the auth-check below will bounce them to /login.
        }

        // Clear stale active-project state from a previous user's session
        // before the route decision below runs. The ProjectContext layer
        // also clears on SIGNED_IN events, but doing it here guarantees a
        // clean slate even if the user lands on /welcome via a deep link
        // without the killerapp shell mounted.
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('bkg-active-project');
            window.localStorage.removeItem('last-project-id');
          }
        } catch {
          // localStorage may be disabled — keep going.
        }

        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        // If they're not signed in, this page makes no sense — bounce them
        // to /login, preserving the intended destination.
        if (!user) {
          router.replace(`/login?next=${encodeURIComponent('/welcome')}`);
          return;
        }

        // If they've already been welcomed, skip straight to their project.
        const meta = (user.user_metadata || {}) as Record<string, unknown>;
        const welcomed = meta.welcomed_at;
        const metaProjectId =
          typeof meta.demo_project_id === 'string' ? (meta.demo_project_id as string) : FALLBACK_PROJECT_ID;
        const metaName = typeof meta.name === 'string' ? (meta.name as string) : (user.email?.split('@')[0] ?? '');
        const metaLane = typeof meta.lane === 'string' ? (meta.lane as string) : null;

        // LANE-INFRA: look up the per-project role (project_members) so we
        // can route by lane. A user can hold multiple roles on a project
        // (e.g. gc + owner), so pull all rows and pick the highest-priority
        // one. On error or missing rows we fall back to legacy lane mapping
        // in landingRouteForLane().
        const ROLE_PRIORITY: Record<string, number> = {
          owner: 100, gc: 90, contractor: 70, specialist: 60,
          teammate: 50, diy: 40, day_hire: 30,
        };
        let resolvedRole: string | null = null;
        try {
          const { data: pms } = await supabase
            .from('project_members')
            .select('project_role')
            .eq('project_id', metaProjectId)
            .eq('user_id', user.id);
          const roles = (pms ?? [])
            .map((r) => (r as { project_role?: string }).project_role)
            .filter((r): r is string => !!r);
          if (roles.length > 0) {
            resolvedRole = [...roles].sort(
              (a, b) => (ROLE_PRIORITY[b] ?? 0) - (ROLE_PRIORITY[a] ?? 0),
            )[0];
          }
        } catch {
          // Non-fatal — landingRouteForLane handles a null role.
        }

        // DIY-COLD (2026-05-22): belt-and-suspenders cookie write. If the
        // user got here without /auth/callback running (legacy session,
        // direct signup-then-signin, etc.) the cookie may be absent. Write
        // it SYNCHRONOUSLY before any router.replace() so the next SSR
        // pass picks up the right lane on the first byte. If a valid
        // cookie is already present we don't overwrite — ProjectContext
        // owns the "switch projects / role change" update path and we
        // don't want to race it with stale metadata-derived guesses.
        try {
          const existing = readLaneCookie();
          if (!existing) {
            const guessed: string =
              resolvedRole ??
              (metaLane === 'builder' || metaLane === 'specialist' || metaLane === 'dreamer'
                ? LEGACY_LANE_TO_PROJECT_ROLE[metaLane]
                : 'gc');
            writeLaneCookie(guessed);
          }
        } catch {
          // Non-fatal.
        }

        if (welcomed) {
          const lanePath = landingRouteForLane({
            projectRole: resolvedRole,
            legacyLane: metaLane,
            projectId: metaProjectId,
          });
          router.replace(nextParam || lanePath);
          return;
        }

        setUserName(metaName);
        setDemoProjectId(metaProjectId);
        setProjectRole(resolvedRole);
        setLegacyLane(metaLane);

        // Best-effort project hydration so we can name the project in copy.
        try {
          const { data: sess } = await supabase.auth.getSession();
          const tok = sess.session?.access_token;
          const res = await fetch(`/api/v1/projects?id=${encodeURIComponent(metaProjectId)}`, {
            headers: tok ? { Authorization: `Bearer ${tok}` } : {},
          });
          if (res.ok) {
            const json = await res.json();
            if (json && json.id) setProject(json as DemoProject);
          }
        } catch {
          // Non-fatal; the page still works without the name.
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router, nextParam]);

  async function handleEnterApp() {
    // Stamp welcomed_at so future sign-ins skip /welcome.
    try {
      await supabase.auth.updateUser({
        data: { welcomed_at: new Date().toISOString() },
      });
    } catch {
      // Even if the mark fails, let them through — the worst case is they
      // see /welcome once more.
    }
    // DIY-COLD (2026-05-22): make sure the cookie reflects the resolved
    // lane before we push into /killerapp so SSR stamps the body attr
    // correctly on the first byte. The effect above already wrote it on
    // mount if absent; this is a safety net for "lane changed between
    // mount and click" (unlikely but cheap).
    try {
      const effective: string =
        projectRole ??
        (legacyLane === 'builder' || legacyLane === 'specialist' || legacyLane === 'dreamer'
          ? LEGACY_LANE_TO_PROJECT_ROLE[legacyLane]
          : 'gc');
      writeLaneCookie(effective);
    } catch {
      // Non-fatal.
    }
    const lanePath = landingRouteForLane({
      projectRole,
      legacyLane,
      projectId: demoProjectId,
    });
    router.push(nextParam || lanePath);
  }

  const greeting = userName ? `Hey ${userName} — ` : 'Hey — ';
  const projectName = project?.name || 'a sample project';

  // DIY-LANE (2026-05-22): when the resolved lane is `diy`, the default
  // welcome (3 contractor-y "try the AI estimate" steps) reads like
  // Greek. Show the dreamer wizard instead so Nick-the-homeowner sees
  // language that matches what he came here for.
  const isDiyLane = projectRole === 'diy' || legacyLane === 'dreamer';
  if (isDiyLane && !loading) {
    return (
      <DiyWizard
        userName={userName}
        demoProjectId={demoProjectId}
        onComplete={handleEnterApp}
      />
    );
  }

  return (
    <main style={pageWrap}>
      <div style={card}>
        <p style={eyebrow}>WELCOME</p>
        <h1 style={h1Style}>
          {greeting}<br />we pre-loaded {projectName} for you to try.
        </h1>
        <p style={{ ...bodyText, marginTop: 16 }}>
          You can poke at every workflow with real-looking data. Nothing you do here will mess up anyone else&apos;s work — these are demo projects, shared across the early-tester accounts, and writes are sandboxed.
        </p>

        <div style={stepsWrap}>
          <Step
            number={1}
            color={COLORS.warm}
            title="Try the AI estimate"
            body="Workflow lane: Lock it in → Estimating. Speak or type your scope, watch a CSI breakdown form."
          />
          <Step
            number={2}
            color={COLORS.green}
            title="Push your numbers to the budget"
            body="From the estimate, click Push to budget. Categories, state chips, and a cash-flow strip populate."
          />
          <Step
            number={3}
            color={COLORS.red}
            title="Generate a draft contract"
            body="Workflow: Plan it out → Contracts. Project context autofills the agreement; download as PDF."
          />
        </div>

        <p style={{ ...bodyText, marginTop: 28 }}>
          When you find something broken or missing,{' '}
          <Link href="/feedback" style={inlineLink}>hit our feedback form</Link>.
          We read every single one and we&apos;re moving fast.
        </p>

        <button type="button" onClick={handleEnterApp} disabled={loading} style={enterButton(loading)}>
          {loading ? 'Loading your project…' : `Take me to ${project?.name || 'my project'} →`}
        </button>

        <p style={{ ...bodyText, fontSize: 13, color: COLORS.faded, marginTop: 16, textAlign: 'center' }}>
          You can re-open this welcome from <Link href="/welcome" style={inlineLink}>/welcome</Link> any time.
        </p>
      </div>

      <div style={{ maxWidth: 720, margin: '24px auto 0', textAlign: 'center' }}>
        <p style={{ ...bodyText, fontSize: 13, color: COLORS.faded }}>
          Builder&apos;s Garden — under the <strong style={{ color: COLORS.ink }}>Knowledge Gardens</strong> umbrella.{' '}
          <Link href="/intro" style={inlineLink}>Watch the 80-second intro →</Link>
        </p>
      </div>
    </main>
  );
}

// Next 16 requires useSearchParams() consumers to be wrapped in Suspense
// at build time. The fallback is intentionally minimal — the inner content
// hydrates within ~50ms once the URL params are resolved.
export default function WelcomePage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: '100vh', background: '#FAF8F2' }} />
      }
    >
      <WelcomePageContent />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// DiyWizard — DIY-LANE (2026-05-22)
//
// Three-step "what / where / what now" wizard for dreamer/homeowner lane.
// Replaces the default contractor-flavored welcome card. On completion we
// stamp welcomed_at (via onComplete) and route to either the cockpit or
// the find-a-gc workflow.
//
// Kept inline in this file so /welcome stays self-contained — the wizard
// is only used here and isn't worth its own component file.
// ─────────────────────────────────────────────────────────────────────────

type DiyBuildType = 'ADU' | 'Addition' | 'Remodel' | 'New SFR' | 'Other';

// Short, scannable list of CA cities for the autocomplete. Not exhaustive
// — we accept any free-text city. Sorted roughly by Nick-the-homeowner
// likelihood (Bay Area, LA, SF, Sac).
const CA_CITY_SUGGESTIONS = [
  'San Francisco', 'Oakland', 'Berkeley', 'San Jose', 'Palo Alto',
  'Mountain View', 'Sunnyvale', 'Marin', 'Mill Valley', 'San Rafael',
  'Sausalito', 'Larkspur', 'Petaluma', 'Santa Rosa', 'Napa',
  'Sacramento', 'Davis', 'Roseville', 'Folsom',
  'Los Angeles', 'Santa Monica', 'Pasadena', 'Burbank', 'Glendale',
  'Long Beach', 'Culver City', 'Hollywood', 'Venice',
  'San Diego', 'La Jolla', 'Encinitas', 'Carlsbad',
  'Fresno', 'Bakersfield', 'San Luis Obispo',
];

function DiyWizard({ userName, demoProjectId, onComplete }: {
  userName: string;
  demoProjectId: string;
  onComplete: () => Promise<void>;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [buildType, setBuildType] = useState<DiyBuildType | ''>('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('CA');
  const [submitting, setSubmitting] = useState(false);

  // Filter city suggestions client-side as the user types.
  const cityMatches = city.length >= 1
    ? CA_CITY_SUGGESTIONS.filter((c) => c.toLowerCase().startsWith(city.toLowerCase())).slice(0, 6)
    : [];

  async function go(target: 'cockpit' | 'find-gc') {
    if (submitting) return;
    setSubmitting(true);
    // Stamp welcomed_at like the pro flow does so the wizard only fires once.
    try {
      await supabase.auth.updateUser({
        data: {
          welcomed_at: new Date().toISOString(),
          // Stash the wizard answers so other surfaces can prefill (e.g. the
          // find-a-gc form picks up city/buildType automatically).
          diy_intent: { build_type: buildType, city, state },
        },
      });
    } catch {
      // Non-fatal — at worst the user re-sees the wizard once.
    }
    // DIY-COLD (2026-05-22): user picked the dreamer wizard, so by
    // definition they're DIY. Write the cookie BEFORE the push into
    // /killerapp so SSR stamps body[data-diy-cockpit=1] on the first
    // byte and the pro picker never flashes.
    try {
      writeLaneCookie('diy');
    } catch {
      // Non-fatal.
    }
    if (target === 'cockpit') {
      router.push(`/killerapp?project=${encodeURIComponent(demoProjectId)}&cockpit=diy`);
    } else {
      const qs = new URLSearchParams();
      qs.set('project', demoProjectId);
      if (buildType) qs.set('build_type', buildType);
      if (city) qs.set('city', city);
      if (state) qs.set('state', state);
      router.push(`/killerapp/workflows/find-a-gc?${qs.toString()}`);
    }
  }

  const greeting = userName ? `Hey ${userName} — ` : 'Hey — ';

  return (
    <main style={pageWrap}>
      <div style={card}>
        <p style={eyebrow}>WELCOME — DREAMER</p>
        <h1 style={h1Style}>
          {greeting}<br />let&apos;s figure out what you&apos;re building.
        </h1>
        <p style={{ ...bodyText, marginTop: 12, color: COLORS.graphite }}>
          Three quick questions. No jargon, no commitment — we just want to
          point you at the right starting place.
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, margin: '28px 0 20px' }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: n <= step ? COLORS.green : COLORS.rule,
              }}
            />
          ))}
        </div>

        {/* Step 1 — what are you building? */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: COLORS.ink }}>
              1. What are you building?
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              {(['ADU', 'Addition', 'Remodel', 'New SFR', 'Other'] as const).map((t) => {
                const active = buildType === t;
                return (
                  <label
                    key={t}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 14,
                      background: active ? 'rgba(29,158,117,0.08)' : '#FFFFFF',
                      border: `1px solid ${active ? COLORS.green : COLORS.rule}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 15,
                      color: COLORS.ink,
                    }}
                  >
                    <input
                      type="radio"
                      name="buildType"
                      checked={active}
                      onChange={() => setBuildType(t)}
                      style={{ accentColor: COLORS.green }}
                    />
                    {t === 'New SFR' ? 'New home' : t}
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              disabled={!buildType}
              onClick={() => setStep(2)}
              style={enterButton(!buildType)}
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 2 — where? */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: COLORS.ink }}>
              2. Where are you building?
            </h2>
            <p style={{ ...bodyText, fontSize: 14, color: COLORS.faded, margin: '0 0 16px' }}>
              City + state. Local codes, costs, and contractor availability
              all change a lot by location.
            </p>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Oakland"
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: 16,
                  border: `1px solid ${COLORS.rule}`,
                  borderRadius: 8,
                  outline: 'none',
                  fontFamily: 'inherit',
                  color: COLORS.ink,
                  boxSizing: 'border-box',
                }}
              />
              {cityMatches.length > 0 && city.length >= 1 && !cityMatches.includes(city) && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: '#FFFFFF',
                    border: `1px solid ${COLORS.rule}`,
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    zIndex: 10,
                    maxHeight: 220,
                    overflowY: 'auto',
                  }}
                >
                  {cityMatches.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 14px',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        fontSize: 15,
                        cursor: 'pointer',
                        color: COLORS.ink,
                        fontFamily: 'inherit',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: 16,
                  border: `1px solid ${COLORS.rule}`,
                  borderRadius: 8,
                  fontFamily: 'inherit',
                  color: COLORS.ink,
                  background: '#FFFFFF',
                }}
              >
                <option value="CA">California</option>
                <option value="OR">Oregon</option>
                <option value="WA">Washington</option>
                <option value="NV">Nevada</option>
                <option value="AZ">Arizona</option>
                <option value="other">Other state</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ ...enterButton(false), flex: '0 0 auto', width: 100, background: 'transparent', color: COLORS.graphite, border: `1px solid ${COLORS.rule}` }}
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={!city.trim()}
                onClick={() => setStep(3)}
                style={{ ...enterButton(!city.trim()), flex: 1 }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — pick your path */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: COLORS.ink }}>
              3. What do you want to do first?
            </h2>
            <p style={{ ...bodyText, fontSize: 14, color: COLORS.faded, margin: '0 0 20px' }}>
              You can always do both — start wherever makes sense.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                type="button"
                disabled={submitting}
                onClick={() => go('cockpit')}
                style={{
                  padding: '20px',
                  textAlign: 'left',
                  background: '#FFFFFF',
                  border: `1px solid ${COLORS.rule}`,
                  borderRadius: 10,
                  cursor: submitting ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 17, color: COLORS.ink, marginBottom: 4 }}>
                  Show me my project →
                </div>
                <div style={{ fontSize: 14, color: COLORS.graphite, lineHeight: 1.5 }}>
                  Walk through a {buildType ? buildType.toLowerCase() : 'sample'} project end-to-end. See the budget, codes that apply, what permits you&apos;ll need, and what the construction phases look like.
                </div>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => go('find-gc')}
                style={{
                  padding: '20px',
                  textAlign: 'left',
                  background: COLORS.green,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  cursor: submitting ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>
                  Find me a contractor →
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.92 }}>
                  Tell us a bit more and we&apos;ll connect you with 2-3 vetted GCs in {city || 'your area'} within 2 business days.
                </div>
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{ ...enterButton(false), background: 'transparent', color: COLORS.graphite, border: `1px solid ${COLORS.rule}` }}
              >
                ← Back
              </button>
            </div>
            {/* Quiet bypass so the user can skip the wizard entirely. */}
            <p style={{ ...bodyText, fontSize: 13, color: COLORS.faded, marginTop: 20, textAlign: 'center' }}>
              Or just{' '}
              <button
                type="button"
                onClick={onComplete}
                style={{ background: 'none', border: 'none', color: COLORS.green, textDecoration: 'underline', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
              >
                let me poke around
              </button>{' '}
              the app on my own.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function Step({ number, color, title, body }: {
  number: number;
  color: string;
  title: string;
  body: string;
}) {
  return (
    <div style={stepRow}>
      <div style={{ ...stepBadge, background: color }}>{number}</div>
      <div>
        <div style={stepTitle}>{title}</div>
        <div style={stepBody}>{body}</div>
      </div>
    </div>
  );
}

// — Styles —
const pageWrap: React.CSSProperties = {
  minHeight: '100vh',
  background: COLORS.paper,
  padding: '64px 24px',
  fontFamily: "var(--font-archivo, 'Archivo', sans-serif)",
  color: COLORS.ink,
};

const card: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  background: '#FFFFFF',
  borderRadius: 12,
  padding: '48px 40px',
  border: `1px solid ${COLORS.rule}`,
  boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.04)',
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.14em',
  color: COLORS.amber,
  textTransform: 'uppercase',
};

const h1Style: React.CSSProperties = {
  margin: '12px 0 0',
  fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)",
  fontSize: 32,
  lineHeight: 1.2,
  color: COLORS.ink,
};

const bodyText: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.55,
  color: COLORS.graphite,
};

const stepsWrap: React.CSSProperties = {
  marginTop: 28,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const stepRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 14,
};

const stepBadge: React.CSSProperties = {
  flex: '0 0 auto',
  width: 32,
  height: 32,
  borderRadius: 16,
  color: '#FFFFFF',
  fontWeight: 800,
  fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)",
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 15,
};

const stepTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: COLORS.ink,
};

const stepBody: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.5,
  color: COLORS.graphite,
  marginTop: 2,
};

const enterButton = (disabled: boolean): React.CSSProperties => ({
  marginTop: 32,
  width: '100%',
  padding: '16px 20px',
  fontSize: 17,
  fontWeight: 700,
  fontFamily: 'inherit',
  background: disabled ? COLORS.faded : COLORS.red,
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 8,
  cursor: disabled ? 'wait' : 'pointer',
  letterSpacing: '0.01em',
  opacity: disabled ? 0.7 : 1,
});

const inlineLink: React.CSSProperties = {
  color: COLORS.green,
  textDecoration: 'underline',
  textDecorationThickness: '1px',
  textUnderlineOffset: '3px',
};
