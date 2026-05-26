/**
 * /killerapp/alerts — WS4 (Compliance Alerts) target.
 *
 * The RSI Heartbeat is the moat: alerts fire only when ≥ 3 sources agree, and
 * each alert carries a TrustStrip showing when each source was last verified.
 *
 * Stub created by WS0; filled in by WS4 with TempoAdapt driving the entire
 * UI from leisurely → emergency, ThreeSourceRule gating which alerts surface
 * as authoritative, and ModalityMirror escalating channel from in-app to SMS
 * to voice call as tempo rises.
 */

import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';

export const metadata = {
  title: 'Alerts — Builder\'s Knowledge Garden',
  description:
    'What needs attention now. Every alert is sourced, fresh, and recoverable for 30 days.',
};

export default function AlertsStubPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: BRAND_COLORS.parchment,
        color: BRAND_COLORS.forestInk,
        fontFamily: BRAND_FONTS.display,
        padding: '4rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <section style={{ maxWidth: '36rem', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: BRAND_FONTS.mono,
            fontSize: '0.78rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: BRAND_COLORS.steel,
            marginBottom: '1rem',
          }}
        >
          WS4 · Alerts
        </p>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 500,
            marginBottom: '1rem',
          }}
        >
          Alerts — coming online
        </h1>
        <p style={{ lineHeight: 1.6, color: BRAND_COLORS.forestDeep }}>
          Workstream 4 is building this surface. Dismissed alerts will be
          recoverable for 30 days via the TimeMachine primitive.
        </p>
      </section>
    </main>
  );
}
