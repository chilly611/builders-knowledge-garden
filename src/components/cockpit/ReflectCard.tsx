'use client';

/**
 * ReflectCard — Killer App cockpit close-out card (Fidelity spec B5).
 *
 * The journey's forward-looking end-note: a quiet card that previews the
 * Reflect stage (stage 7) and, once the build actually wraps, invites the
 * close-out. Reads the REAL journey progress from the shell config.
 *
 * HONESTY:
 *   - Mid-build (the normal case — Marin 42%, demos ~60%) there is genuinely
 *     no close-out data, so it shows an honest "Reflect opens at wrap-up"
 *     preview with the real % — it does NOT fabricate a retrospective.
 *   - The % renders only when the journey reports one (>0); SSR + first client
 *     render both see 0 (no % line), so it never flashes a fake "0%".
 *   - The Reflect stage itself is honestly "coming soon"; this card mirrors
 *     that rather than inventing warranty/lessons/portfolio content.
 *
 * Tokens only; dusk-purple stage-7 accent (matches stages/reflect/page.tsx).
 */

import Link from 'next/link';
import { useShellConfig } from '@/components/app-shell/ShellConfigContext';

const MONO = 'var(--bp-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-archivo-black, var(--font-archivo)), sans-serif';
const GRAPHITE = 'var(--ink-graphite, #2A2620)';
const ACCENT = '#5E4B7C'; // stage 7 dusk purple — same as the Reflect stage

export default function ReflectCard({ projectId }: { projectId: string }) {
  const cfg = useShellConfig();
  const pct = Math.round(cfg.journey?.pct ?? 0);
  // Show the % whenever the journey reports one (>0); don't gate on cfg.ready,
  // which stays false on the demo even though journey.pct is populated. SSR +
  // first client render both see pct 0 (no % line), so there's no mismatch —
  // the line appears once the shell config hydrates.
  const hasPct = pct > 0;
  const wrapped = pct >= 98;
  const href = `/killerapp/stages/reflect?project=${encodeURIComponent(projectId)}`;

  return (
    <section
      data-machine="reflect_card"
      style={{
        marginTop: 20,
        padding: '16px 18px',
        borderRadius: 12,
        borderLeft: `4px solid ${ACCENT}`,
        border: `1px solid color-mix(in srgb, ${ACCENT} 38%, transparent)`,
        borderLeftWidth: 4,
        background: `color-mix(in srgb, ${ACCENT} 8%, var(--paper-cream, #F2E9D2))`,
      }}
    >
      <script
        type="application/json"
        data-machine-twin="reflect_card"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ type: 'reflect_card', pct: hasPct ? pct : null, wrapped }) }}
      />
      <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT, marginBottom: 6 }}>
        Reflect · close-out
      </div>
      <h3 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 17, lineHeight: 1.2, margin: '0 0 6px', color: GRAPHITE }}>
        {wrapped ? 'Time to close out & reflect' : 'Reflect opens when the build wraps'}
      </h3>
      <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5, color: 'var(--ink-faded, #6A6256)' }}>
        {wrapped ? (
          <>Capture lessons learned, manage warranties, and add this project to your portfolio.</>
        ) : (
          <>
            {hasPct ? <>You&rsquo;re {pct}% through. </> : null}
            When you wrap, this is where warranty, lessons learned, your portfolio update, and referrals come together.
          </>
        )}
      </p>
      <Link
        href={href}
        style={{
          fontFamily: MONO,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: ACCENT,
          textDecoration: 'none',
          borderBottom: `1px solid color-mix(in srgb, ${ACCENT} 50%, transparent)`,
          paddingBottom: 1,
        }}
      >
        {wrapped ? 'Open Reflect →' : 'Peek at Reflect →'}
      </Link>
    </section>
  );
}
