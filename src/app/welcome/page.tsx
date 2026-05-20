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
  const nextParam = search.get('next') || null;

  const [userName, setUserName] = useState<string>('');
  const [demoProjectId, setDemoProjectId] = useState<string>(FALLBACK_PROJECT_ID);
  const [project, setProject] = useState<DemoProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
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

        if (welcomed) {
          router.replace(nextParam || `/killerapp?project=${metaProjectId}`);
          return;
        }

        setUserName(metaName);
        setDemoProjectId(metaProjectId);

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
    router.push(nextParam || `/killerapp?project=${demoProjectId}`);
  }

  const greeting = userName ? `Hey ${userName} — ` : 'Hey — ';
  const projectName = project?.name || 'a sample project';

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
