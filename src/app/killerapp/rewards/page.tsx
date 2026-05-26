/**
 * /killerapp/rewards — WS5 GreenFlash CRM Rewards.
 *
 * The RSI Heartbeat is the moat: every reward point is sourced from a verified
 * event (completion + verified review + payment receipt). Vanity metrics never
 * accrue. The TrustStrip on each point shows the three sources behind it.
 *
 * Pattern Language composition:
 *   - EmotionalArc          (worry → control → celebration gradient)
 *   - ProgressiveReveal     (power features unlock after demonstrated use)
 *   - LifecycleMemory       (project-to-project tenure)
 *   - Whisper               (first encounter with each reward type)
 *   - TrustStrip            (point calculations: completion + review + receipt)
 *   - InvitationCard        (Floor 0 per lane)
 *   - useStanceCard()       (every primitive)
 *
 * Preserves: GreenFlashProvider at src/components/GreenFlashProvider.tsx
 *   (Canvas particles + Web Audio chimes). This surface composes AROUND it.
 *
 * Cross-link in footer to the umbrella profile at theknowledgegardens.com.
 */

'use client';

import * as React from 'react';
import { useState } from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';
import { useStanceCard, persistStanceOverride } from '@/lib/stance-card';
import {
  InvitationCard,
  EmotionalArc,
  ProgressiveReveal,
  LifecycleMemory,
  Whisper,
  TrustStrip,
  type StanceLane,
  type ArcStage,
  type SourceCitation,
} from '@/components/primitives';

interface RewardEvent {
  id: string;
  humanLabel: string;
  proLabel: string;
  points: number;
  feel: ArcStage['feel'];
  occurredAt: string;
  sources: SourceCitation[];
}

const REWARDS: RewardEvent[] = [
  {
    id: 'rw-001',
    humanLabel: 'Bayview Kitchen final inspection passed',
    proLabel: 'P-2026-014 · Final Mechanical Inspection · pass · City of SD',
    points: 250,
    feel: 'celebratory',
    occurredAt: '2026-05-24',
    sources: [
      { name: 'City of SD inspection record', lastVerified: '2026-05-25' },
      { name: 'Owner sign-off (Chen)', lastVerified: '2026-05-24' },
      { name: 'BKG project completion event', lastVerified: '2026-05-24' },
    ],
  },
  {
    id: 'rw-002',
    humanLabel: '5-star review from Patel family',
    proLabel: 'NPS verified review · 5/5 · public-attributed',
    points: 100,
    feel: 'celebratory',
    occurredAt: '2026-05-20',
    sources: [
      { name: 'Google review (verified phone)', lastVerified: '2026-05-21' },
      { name: 'Houzz Pro verified review', lastVerified: '2026-05-21' },
      { name: 'BKG referral signal', lastVerified: '2026-05-21' },
    ],
  },
  {
    id: 'rw-003',
    humanLabel: 'Six-month perfect-pay streak',
    proLabel: 'AR turnover < 14d for 6 consecutive months',
    points: 400,
    feel: 'confident',
    occurredAt: '2026-05-15',
    sources: [
      { name: 'QuickBooks AR ledger', lastVerified: '2026-05-15' },
      { name: 'Bank deposit reconciliation', lastVerified: '2026-05-15' },
      { name: 'BKG project ledger', lastVerified: '2026-05-15' },
    ],
  },
];

const arcStages: ArcStage[] = [
  { id: 'worry', label: 'Worry', feel: 'anxious' },
  { id: 'work', label: 'Work', feel: 'curious' },
  { id: 'control', label: 'Control', feel: 'confident' },
  { id: 'celebration', label: 'Celebration', feel: 'celebratory' },
];

const tenureStages = [
  { id: 'first-project', label: '1st project', complete: true, enteredAt: '2025-04-02', summary: 'First project completed — Chen Kitchen Phase 0.' },
  { id: 'fifth-project', label: '5 projects', complete: true, enteredAt: '2025-09-12', summary: '5 completions, 4.8 average review.' },
  { id: 'tenth-project', label: '10 projects', complete: true, enteredAt: '2026-02-08', summary: '10 completions, perfect-pay streak begins.' },
  { id: 'twenty-fifth-project', label: '25 projects', complete: false, summary: 'Next tier unlocks: referral multiplier 2x.' },
];

const mono: React.CSSProperties = {
  fontFamily: BRAND_FONTS.mono,
  fontSize: '0.72rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  margin: 0,
};

function RewardItem({ event, viewMode }: { event: RewardEvent; viewMode: 'human' | 'pro' }) {
  return (
    <article
      style={{
        padding: '0.85rem 1rem',
        background: BRAND_COLORS.parchmentWarm,
        border: `1px solid ${BRAND_COLORS.copperLine}`,
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontWeight: 500 }}>{viewMode === 'pro' ? event.proLabel : event.humanLabel}</h3>
        <span style={{ ...mono, color: BRAND_COLORS.copper }}>+{event.points} pts</span>
      </header>
      <p style={{ margin: 0, color: BRAND_COLORS.steel, fontSize: '0.85rem' }}>{event.occurredAt}</p>
      <TrustStrip
        sourceCount={event.sources.length}
        sources={event.sources}
        lastVerified={event.sources[0].lastVerified ?? new Date()}
        variant="inline"
      />
    </article>
  );
}

export default function RewardsPage() {
  const stance = useStanceCard();
  const [lane, setLane] = useState<StanceLane>(stance.lane);
  const totalPoints = REWARDS.reduce((sum, r) => sum + r.points, 0);
  const proMode = lane === 'professional' || lane === 'administrator';

  return (
    <main style={{ minHeight: '100vh', background: BRAND_COLORS.parchment, color: BRAND_COLORS.forestInk, fontFamily: BRAND_FONTS.display, padding: '2.5rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: '54rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        <header>
          <p style={{ ...mono, color: BRAND_COLORS.steel, marginBottom: '0.3rem' }}>Killer App · Rewards</p>
          <h1 style={{ margin: 0, fontWeight: 500, fontSize: '2rem' }}>
            Recognition that compounds. Every point sourced from verified work.
          </h1>
        </header>

        <Whisper
          whisperId="rewards-floor-0"
          message="Points only accrue from verified events — completion + verified review + payment receipt. No vanity metrics. The TrustStrip on each row shows the three sources."
        />

        <section aria-label="Lane selector" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(['administrator', 'professional', 'public', 'machine'] as StanceLane[]).map((l) => (
            <button key={l} type="button" onClick={() => { setLane(l); persistStanceOverride({ lane: l }); }} aria-pressed={lane === l}
              style={{ padding: '0.3rem 0.7rem', border: `1px solid ${lane === l ? BRAND_COLORS.copper : BRAND_COLORS.copperLine}`, background: lane === l ? BRAND_COLORS.parchmentWarm : 'transparent', color: lane === l ? BRAND_COLORS.copper : BRAND_COLORS.steel, fontFamily: BRAND_FONTS.mono, fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '999px' }}>
              {l}
            </button>
          ))}
        </section>

        <InvitationCard
          question={`${totalPoints} points this quarter — what's next?`}
          proSubtitle={`Tier: Established · ${REWARDS.length} verified events · 6mo perfect-pay streak`}
          primaryLabel="Walk the timeline"
          stance={stance}
        />

        <EmotionalArc
          stages={arcStages}
          currentStageId="celebration"
          variant="header"
        />

        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <p style={{ ...mono, color: BRAND_COLORS.steel }}>Recent verified events</p>
          {REWARDS.map((r) => <RewardItem key={r.id} event={r} viewMode={proMode ? 'pro' : 'human'} />)}
        </section>

        <ProgressiveReveal
          revealId="rewards-power-features"
          base={
            <article style={{ padding: '1rem', background: BRAND_COLORS.parchmentWarm, border: `1px solid ${BRAND_COLORS.copperLine}`, borderRadius: '4px' }}>
              <p style={{ ...mono, color: BRAND_COLORS.steel }}>Power features</p>
              <p style={{ margin: 0 }}>Referral bonuses and tier multipliers unlock after you complete 10 projects with verified reviews. You&apos;re there — open the controls.</p>
            </article>
          }
          advanced={
            <article style={{ padding: '1rem', background: BRAND_COLORS.parchmentDeep, border: `1px solid ${BRAND_COLORS.copper}`, borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ ...mono, color: BRAND_COLORS.copper }}>Power features — unlocked</p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Referral multiplier: 1.5x on next 3 referrals</li>
                <li>Tier multiplier: 1.2x on completion points</li>
                <li>Early access: AIA pay-app auto-draft (alpha)</li>
              </ul>
            </article>
          }
          advancedLabel="Unlock referral bonuses + multipliers"
        />

        <LifecycleMemory stages={tenureStages} currentStageId="tenth-project" />

        <footer style={{ paddingTop: '1.5rem', borderTop: `1px solid ${BRAND_COLORS.copperLine}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ ...mono, color: BRAND_COLORS.steel, margin: 0 }}>
            Cross-link: <a href="https://theknowledgegardens.com/profile" style={{ color: BRAND_COLORS.copper }} target="_blank" rel="noopener noreferrer">your umbrella profile at theknowledgegardens.com</a>
          </p>
          <p style={{ ...mono, color: BRAND_COLORS.steel, margin: 0 }}>
            GreenFlash particle effects + Web Audio chimes preserved on celebrations. This surface wraps the existing GreenFlashProvider.
          </p>
        </footer>
      </div>
    </main>
  );
}
