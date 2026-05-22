'use client';

/**
 * DiyCockpitOverlay — DIY-LANE simplified workflow picker (2026-05-22).
 *
 * Mounts on /killerapp. When the effective lane is `diy`:
 *   1. The `body[data-diy-cockpit="1"]` attribute is set SERVER-SIDE by
 *      the root layout from the `bkg-lane` cookie, so the CSS hide-picker
 *      rule fires before hydration (no flash). This overlay no longer
 *      flips the attribute on initial render — it only reconciles when
 *      the in-memory lane diverges from the cookie (sign-in/out, project
 *      switch, role swap). See ../layout.tsx + ../../middleware.ts.
 *   2. Renders a 3-column "Plan / Hire / Track" simplified view tuned for
 *      the dreamer-homeowner persona.
 *   3. Surfaces a quiet "Show all workflows" link that flips off the override
 *      for users who want the full picker.
 *
 * Cookie write contract: when the effective lane changes, this component
 * writes `bkg-lane=<role>; SameSite=Lax; Max-Age=604800` so the next SSR
 * pass picks up the new lane. On sign-out, ProjectContext clears it.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useUserLane } from '@/lib/use-user-lane';

interface SimplifiedCard {
  group: 'Plan' | 'Hire' | 'Track';
  title: string;
  body: string;
  href: (projectId: string | null) => string;
  accent: string;
}

const CARDS: SimplifiedCard[] = [
  // ─── PLAN ───────────────────────────────────────────────────────────
  {
    group: 'Plan',
    title: 'What might it cost?',
    body: 'Run a quick estimate from a spoken or typed description. See a CSI breakdown — translated into plain English.',
    href: (id) => id
      ? `/killerapp/workflows/estimating?project=${encodeURIComponent(id)}`
      : '/killerapp/workflows/estimating',
    accent: '#C9913F',
  },
  {
    group: 'Plan',
    title: 'What codes apply here?',
    body: 'Show me the building codes (Title 24, CRC, R-3) that will govern my project, in language that explains what each one means.',
    href: (id) => id
      ? `/killerapp/workflows/code-compliance?project=${encodeURIComponent(id)}`
      : '/killerapp/workflows/code-compliance',
    accent: '#C9913F',
  },
  {
    group: 'Plan',
    title: 'What permits will I need?',
    body: 'Checklist of permits, plan-check fees, and inspections — based on your jurisdiction and project type.',
    href: (id) => id
      ? `/killerapp/workflows/permit-applications?project=${encodeURIComponent(id)}`
      : '/killerapp/workflows/permit-applications',
    accent: '#C9913F',
  },
  // ─── HIRE ───────────────────────────────────────────────────────────
  {
    group: 'Hire',
    title: 'Find me a contractor',
    body: 'Tell us about your project — we connect you with 2-3 vetted GCs in your area within 2 business days.',
    href: (id) => id
      ? `/killerapp/workflows/find-a-gc?project=${encodeURIComponent(id)}`
      : '/killerapp/workflows/find-a-gc',
    accent: '#3E3A6E',
  },
  {
    group: 'Hire',
    title: 'Find me an architect',
    body: 'Need a CA-licensed architect of record? Charlie or Bou will personally email an intro within 1 business day.',
    href: (id) => id
      ? `/killerapp/workflows/architect-of-record?project=${encodeURIComponent(id)}`
      : '/killerapp/workflows/architect-of-record',
    accent: '#3E3A6E',
  },
  // ─── TRACK ──────────────────────────────────────────────────────────
  {
    group: 'Track',
    title: "What happened on site today?",
    body: 'The daily log — see what your GC reported, what got done, weather, photos, and any issues that came up.',
    href: (id) => id
      ? `/killerapp/workflows/daily-log?project=${encodeURIComponent(id)}`
      : '/killerapp/workflows/daily-log',
    accent: '#E05E4B',
  },
  {
    group: 'Track',
    title: 'Open questions',
    body: 'See and resolve open RFIs (Requests for Information) — questions your GC has about how to build something.',
    href: (id) => id
      ? `/killerapp/workflows/rfis?project=${encodeURIComponent(id)}`
      : '/killerapp/workflows/rfis',
    accent: '#E05E4B',
  },
];

export default function DiyCockpitOverlay() {
  const { effectiveLane, loading } = useUserLane();
  const search = useSearchParams();
  const projectId = search.get('project');
  // Allow the user to override and see the full picker via `&showAllWorkflows=1`.
  const showAll = search.get('showAllWorkflows') === '1';
  const [mounted, setMounted] = useState(false);

  const isDiy = effectiveLane === 'diy' && !showAll;

  // COCKPIT-PERSONALIZATION (2026-05-22): the body[data-diy-cockpit] flag
  // is now stamped server-side by the root layout from the bkg-lane
  // cookie. On INITIAL render we only mark this component as mounted —
  // we do NOT touch the body attribute, since the SSR value is already
  // correct and overwriting it would re-introduce the flash.
  //
  // After mount, when the in-memory lane diverges from the cookie
  // (sign-in, project switch, role swap, ?showAllWorkflows= toggle), we:
  //   1. Update the body attribute to match the live lane.
  //   2. Re-write the bkg-lane cookie so the next SSR pass agrees.
  // Cookie is NOT HttpOnly (so the client can read+write) and SameSite=Lax.
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      return;
    }
    if (loading) return;
    if (typeof document === 'undefined') return;

    // Reconcile body attribute against the live effective lane.
    const want = isDiy ? '1' : '0';
    if (document.body.dataset.diyCockpit !== want) {
      document.body.dataset.diyCockpit = want;
    }

    // Reconcile the cookie. ?showAllWorkflows=1 is a TEMPORARY override
    // (preserves the user's underlying lane) — don't persist it.
    if (!showAll) {
      const cookieLane = effectiveLane;
      const existing = readBkgLaneCookie();
      if (existing !== cookieLane) {
        writeBkgLaneCookie(cookieLane);
      }
    }
  }, [mounted, loading, isDiy, effectiveLane, showAll]);

  if (loading || !mounted || !isDiy) return null;

  const groups: Array<'Plan' | 'Hire' | 'Track'> = ['Plan', 'Hire', 'Track'];

  return (
    <>
      {/* Global hide-picker CSS rule lives in the ROOT layout now so it
          applies before this client island hydrates — see app/layout.tsx.
          Leaving this comment as a forwarding signpost. */}
    <section
      data-testid="diy-cockpit-overlay"
      style={{
        maxWidth: 1100,
        margin: '24px auto 48px',
        padding: '0 24px',
        fontFamily: "var(--font-archivo, 'Archivo', sans-serif)",
      }}
    >
      <header style={{ marginBottom: 28, textAlign: 'center' }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: '#1D9E75',
          }}
        >
          Your project, simplified
        </p>
        <h2
          style={{
            margin: '8px 0 6px',
            fontSize: 28,
            fontWeight: 800,
            color: '#1A1A1A',
            fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)",
          }}
        >
          What do you want to do?
        </h2>
        <p style={{ margin: 0, fontSize: 15, color: '#3D3D3D', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
          Three stages a homeowner usually moves through: plan it, hire help, track what&apos;s happening on site.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}
      >
        {groups.map((g) => (
          <div key={g} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3
              style={{
                margin: '0 0 4px',
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: CARDS.find((c) => c.group === g)?.accent ?? '#3D3D3D',
              }}
            >
              {g === 'Plan' && '01. Plan'}
              {g === 'Hire' && '02. Hire'}
              {g === 'Track' && '03. Track'}
            </h3>
            {CARDS.filter((c) => c.group === g).map((card) => (
              <Link
                key={card.title}
                href={card.href(projectId)}
                style={{
                  display: 'block',
                  background: '#FFFFFF',
                  border: '1px solid #D8D2C2',
                  borderRadius: 10,
                  padding: '18px 18px',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 120ms ease, box-shadow 120ms ease',
                  boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
                  borderLeft: `3px solid ${card.accent}`,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>
                  {card.title}
                </div>
                <div style={{ fontSize: 13, color: '#3D3D3D', lineHeight: 1.5 }}>
                  {card.body}
                </div>
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* "Why does this cost so much?" — DIY-only cost-explainer entry */}
      {projectId && (
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <Link
            href={`/killerapp/workflows/cost-explainer?project=${encodeURIComponent(projectId)}`}
            style={{
              fontSize: 14,
              color: '#1D9E75',
              textDecoration: 'underline',
              textUnderlineOffset: 4,
            }}
          >
            Or see why my project costs what it does, line by line →
          </Link>
        </div>
      )}

      {/* Quiet escape hatch so users who want the full pro picker can opt in. */}
      <p style={{ marginTop: 32, textAlign: 'center', fontSize: 13, color: '#7A766C' }}>
        Want every workflow, like a contractor would see?{' '}
        <Link
          href={`?${appendQs(search, 'showAllWorkflows', '1')}`}
          style={{ color: '#7A766C', textDecoration: 'underline' }}
          scroll={false}
        >
          Show all workflows
        </Link>
      </p>
    </section>
    </>
  );
}

/** Merge a new key into the existing query string without dropping others. */
function appendQs(search: URLSearchParams, key: string, value: string): string {
  const next = new URLSearchParams(search.toString());
  next.set(key, value);
  return next.toString();
}

/** Read the `bkg-lane` cookie, returning '' if absent. */
function readBkgLaneCookie(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|;\s*)bkg-lane=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

/** Write the `bkg-lane` cookie. Non-HttpOnly so client can read it back. */
function writeBkgLaneCookie(lane: string): void {
  if (typeof document === 'undefined') return;
  const oneWeek = 60 * 60 * 24 * 7;
  document.cookie = `bkg-lane=${encodeURIComponent(lane)}; Path=/; Max-Age=${oneWeek}; SameSite=Lax`;
}
