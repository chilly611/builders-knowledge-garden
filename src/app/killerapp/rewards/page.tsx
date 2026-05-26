/**
 * /killerapp/rewards — WS5 (GreenFlash CRM Rewards) target.
 *
 * The RSI Heartbeat is the moat: rewards accrue from verified work — completion
 * event + verified review + payment receipt — not vanity metrics. Every point
 * wears a TrustStrip naming its sources.
 *
 * Stub created by WS0; filled in by WS5 with EmotionalArc driving the
 * worry-→-control-→-celebration visual gradient, ProgressiveReveal surfacing
 * power features (referral bonuses, tier multipliers) only after demonstrated
 * use, LifecycleMemory tracking project-to-project tenure, and a Whisper on
 * first encounter with each reward type. GreenFlashProvider (Canvas particles
 * + Web Audio chimes) is preserved as the emotional anchor.
 */

import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';

export const metadata = {
  title: 'Rewards — Builder\'s Knowledge Garden',
  description:
    'Recognition that compounds. Every point sourced from verified work — no vanity metrics.',
};

export default function RewardsStubPage() {
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
          WS5 · Rewards
        </p>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 500,
            marginBottom: '1rem',
          }}
        >
          Rewards — coming online
        </h1>
        <p style={{ lineHeight: 1.6, color: BRAND_COLORS.forestDeep }}>
          Workstream 5 is building this surface. GreenFlash particle effects
          and Web Audio chimes will continue to anchor the celebratory moments;
          the new surfaces compose around the existing GreenFlashProvider, not
          over it.
        </p>
      </section>
    </main>
  );
}
