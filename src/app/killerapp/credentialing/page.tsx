/**
 * /killerapp/credentialing — WS2 Credentialing Dashboard.
 *
 * The RSI Heartbeat is the platform. One self-improving knowledge graph per
 * garden, ingesting source data on a domain cadence, re-verifying every
 * entity, surfacing freshness on every claim, learning from use. The platform
 * doesn't hold knowledge — it improves itself in public. Every other platform
 * in our space holds static data and ages. We get more right every week.
 * That is the moat in the AI era.
 *
 * In credentialing that moat is literal: state license boards expire, OSHA
 * cards lapse, manufacturer certs revoke. The platform re-verifies each
 * credential against its issuer on a cadence and surfaces freshness on every
 * row via TrustStrip. A contractor who walks onto a job site knows the
 * platform checked yesterday, not last quarter.
 *
 * Pattern Language composition (per docs/strategy/lane-stance-strategy-v3.md):
 *   - InvitationCard         (Floor 0 — "Renew which credential first?")
 *   - TrustStrip             (every credential row — source + freshness)
 *   - ThreeSourceRule        (state board + city + contractor record agree)
 *   - TempoAdapt             (30+ days = full UI, 2 days = one button)
 *   - ProToggle              (OSHA-10 vs. "OSHA Construction Industry Outreach
 *                             Training Program, 10hr")
 *   - TimeMachine            (7-day undo on every renewal)
 *   - LifecycleMemory        (license tenure across projects)
 *   - InfiniteDescent        (F0 plain question → F6 agent payload)
 *   - useStanceCard()        (every primitive on the page)
 *
 * Four-lane Floor 0 (per the Killer App federation contract):
 *   Administrator (GC running the firm): "What's expiring across my crew?"
 *     → Renders credential roll-up cards grouped by crew member, sorted by
 *       soonest expiry first, with bulk-renew affordance.
 *   Professional (the licensed contractor): "How do I renew this fastest?"
 *     → Renders the user's own credentials with one-tap renewal links to the
 *       issuing authority and pre-filled forms where the issuer supports it.
 *   Public (the homeowner verifying): "Is my contractor properly licensed?"
 *     → Renders a public-facing card with green TrustStrip ("Verified across
 *       3 sources") and last-checked stamp.
 *   Machine (agent on user's behalf): /api/v1/credentialing — JSON payload
 *     returns the same data set as JSON-LD-shaped records.
 */

'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';
import { useStanceCard, persistStanceOverride } from '@/lib/stance-card';
import {
  InvitationCard,
  ProToggle,
  TempoAdapt,
  TrustStrip,
  TimeMachine,
  LifecycleMemory,
  InfiniteDescent,
  type StanceLane,
  type SourceCitation,
  type TimeMachineEntry,
} from '@/components/primitives';

interface Credential {
  id: string;
  humanName: string;
  proName: string;
  holder: string;
  expiresAt: string;
  jurisdiction: string;
  sources: SourceCitation[];
  renewalUrl?: string;
}

const TODAY = new Date('2026-05-26');

function daysUntil(iso: string): number {
  const d = new Date(iso);
  return Math.round((d.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
}

const CREDENTIALS: Credential[] = [
  {
    id: 'cred-001',
    humanName: 'OSHA-10',
    proName: 'OSHA Construction Industry Outreach Training Program, 10hr',
    holder: 'Marisol Chen',
    expiresAt: '2026-05-28',
    jurisdiction: 'US-federal',
    sources: [
      { name: 'OSHA Outreach Portal', url: 'https://www.osha.gov/training', lastVerified: '2026-05-25', jurisdiction: 'US' },
      { name: 'CSLB Roster', url: 'https://www.cslb.ca.gov', lastVerified: '2026-05-24', jurisdiction: 'US-CA' },
      { name: 'Internal crew record', lastVerified: '2026-05-26', jurisdiction: 'BKG' },
    ],
    renewalUrl: 'https://www.osha.gov/training/outreach',
  },
  {
    id: 'cred-002',
    humanName: 'CA B-General Contractor License',
    proName: 'California Contractors State License Board, Class B (General Building)',
    holder: 'Chilly Dahlgren',
    expiresAt: '2026-08-15',
    jurisdiction: 'US-CA',
    sources: [
      { name: 'CSLB License #', url: 'https://www.cslb.ca.gov/onlineservices/checklicenseii', lastVerified: '2026-05-22', jurisdiction: 'US-CA' },
      { name: 'CA SOS business filing', lastVerified: '2026-05-22', jurisdiction: 'US-CA' },
      { name: 'BKG primary record', lastVerified: '2026-05-26', jurisdiction: 'BKG' },
    ],
  },
  {
    id: 'cred-003',
    humanName: 'EPA Lead-Safe Cert (renovation)',
    proName: 'EPA RRP Renovator Certification (40 CFR Part 745)',
    holder: 'Marisol Chen',
    expiresAt: '2026-06-04',
    jurisdiction: 'US-federal',
    sources: [
      { name: 'EPA Lead-Safe portal', url: 'https://www.epa.gov/lead', lastVerified: '2026-05-19', jurisdiction: 'US' },
      { name: 'Internal cert scan', lastVerified: '2026-05-19', jurisdiction: 'BKG' },
    ],
  },
  {
    id: 'cred-004',
    humanName: 'San Diego Business License',
    proName: 'City of San Diego Business Tax Certificate',
    holder: 'Chilly Builders LLC',
    expiresAt: '2027-01-31',
    jurisdiction: 'US-CA-SD',
    sources: [
      { name: 'sandiego.gov business search', url: 'https://www.sandiego.gov', lastVerified: '2026-05-20', jurisdiction: 'US-CA-SD' },
      { name: 'BKG primary record', lastVerified: '2026-05-26', jurisdiction: 'BKG' },
    ],
  },
];

const mono: React.CSSProperties = {
  fontFamily: BRAND_FONTS.mono,
  fontSize: '0.72rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  margin: 0,
};

function AdminFloor0({ creds }: { creds: Credential[] }) {
  const expiring = [...creds]
    .filter((c) => daysUntil(c.expiresAt) <= 60)
    .sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt));
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ ...mono, color: BRAND_COLORS.steel }}>Administrator · What&apos;s expiring across the crew</p>
      {expiring.length === 0 ? (
        <p>Nothing expires in the next 60 days — full breath.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {expiring.map((cred) => (
            <li key={cred.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${BRAND_COLORS.copperLine}`, paddingBottom: '0.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span>
                <strong>{cred.humanName}</strong> — {cred.holder} — {daysUntil(cred.expiresAt)}d
              </span>
              <TrustStrip
                sourceCount={cred.sources.length}
                sources={cred.sources}
                lastVerified={cred.sources[0].lastVerified ?? TODAY}
                variant="badge"
                jurisdiction={cred.jurisdiction}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProFloor0({ cred }: { cred: Credential }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ ...mono, color: BRAND_COLORS.steel }}>Professional · How to renew this fastest</p>
      <h3 style={{ margin: 0 }}>{cred.humanName}</h3>
      <p style={{ margin: 0, color: BRAND_COLORS.steel, fontSize: '0.85rem' }}>{cred.proName}</p>
      <TrustStrip
        sourceCount={cred.sources.length}
        sources={cred.sources}
        lastVerified={cred.sources[0].lastVerified ?? TODAY}
        variant="full"
        jurisdiction={cred.jurisdiction}
      />
      {cred.renewalUrl ? (
        <a
          href={cred.renewalUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '0.6rem 1rem',
            background: BRAND_COLORS.copper,
            color: BRAND_COLORS.parchment,
            fontFamily: BRAND_FONTS.mono,
            fontSize: '0.8rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            borderRadius: '2px',
            alignSelf: 'flex-start',
          }}
        >
          Renew at issuer →
        </a>
      ) : null}
    </section>
  );
}

function PublicFloor0({ cred }: { cred: Credential }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <p style={{ ...mono, color: BRAND_COLORS.steel }}>Public · Is this contractor properly licensed?</p>
      <p style={{ margin: 0 }}>
        <strong>{cred.holder}</strong> holds <strong>{cred.humanName}</strong> in {cred.jurisdiction}.
      </p>
      <TrustStrip
        sourceCount={cred.sources.length}
        sources={cred.sources}
        lastVerified={cred.sources[0].lastVerified ?? TODAY}
        variant="inline"
        jurisdiction={cred.jurisdiction}
      />
    </section>
  );
}

function MachineFloor0({ creds }: { creds: Credential[] }) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: creds.map((c, idx) => ({
      '@type': 'EducationalOccupationalCredential',
      position: idx + 1,
      name: c.proName,
      credentialCategory: c.humanName,
      issuingAuthority: c.sources[0]?.name,
      expires: c.expiresAt,
      jurisdiction: c.jurisdiction,
      sources: c.sources.map((s) => ({ '@type': 'CreativeWork', name: s.name, url: s.url, dateModified: s.lastVerified })),
    })),
    endpoint: '/api/v1/credentialing',
    moat: 'RSI Heartbeat — every credential re-verified on a cadence',
  };
  return (
    <pre
      style={{
        background: BRAND_COLORS.parchmentDeep,
        color: BRAND_COLORS.forestDeep,
        padding: '1rem',
        fontFamily: BRAND_FONTS.mono,
        fontSize: '0.75rem',
        overflowX: 'auto',
        borderRadius: '4px',
        margin: 0,
      }}
    >
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

const lifecycleStages = [
  { id: 'apply', label: 'Apply', complete: true, enteredAt: '2025-01-12', summary: 'License application filed with CSLB.' },
  { id: 'examine', label: 'Examine', complete: true, enteredAt: '2025-02-08', summary: 'Trade + Law/Business exams passed.' },
  { id: 'bond', label: 'Bond', complete: true, enteredAt: '2025-03-01', summary: '$25,000 contractor bond posted.' },
  { id: 'active', label: 'Active', complete: true, enteredAt: '2025-03-15', summary: 'License issued. First project bid 2025-04-02.' },
  { id: 'renewal', label: 'Renewal', complete: false, summary: 'Two-year renewal cycle. Next: 2027-03.' },
];

export default function CredentialingPage() {
  const stance = useStanceCard();
  const [lane, setLane] = useState<StanceLane>(stance.lane);
  const sortedByExpiry = useMemo(
    () => [...CREDENTIALS].sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt)),
    [],
  );
  const soonestThree = sortedByExpiry.slice(0, 3);
  const mostUrgent = sortedByExpiry[0];

  const [tmHistory, setTmHistory] = useState<TimeMachineEntry<string>[]>([
    {
      id: 'tm-init',
      label: 'Logged into credentialing',
      at: '2026-05-25T08:14:00Z',
      before: '',
      after: '',
    },
  ]);

  const recordRenewal = (cred: Credential) => {
    setTmHistory((prev) => [
      {
        id: `tm-${Date.now()}`,
        label: `Renewed ${cred.humanName}`,
        at: new Date().toISOString(),
        before: cred.expiresAt,
        after: '2028-05-26',
      },
      ...prev,
    ]);
  };

  const leisurelyRenewBlock = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* WHISPER REMOVED 2026-05-27 per Charlie — demo clarity. Restore post-demo. */}
      <InvitationCard
        question="Renew which credential first?"
        proSubtitle="Sorted by soonest expiry; bulk-renew available in Pro mode."
        primaryLabel={`Start with ${mostUrgent.humanName}`}
        helper={`${mostUrgent.humanName} expires in ${daysUntil(mostUrgent.expiresAt)} days.`}
        stance={stance}
        primaryHref={mostUrgent.renewalUrl}
      />
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {soonestThree.map((cred) => (
          <button
            key={cred.id}
            type="button"
            onClick={() => recordRenewal(cred)}
            style={{
              padding: '0.5rem 0.85rem',
              border: `1px solid ${BRAND_COLORS.copperLine}`,
              background: BRAND_COLORS.parchmentWarm,
              color: BRAND_COLORS.forestInk,
              fontFamily: BRAND_FONTS.display,
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: '2px',
              textAlign: 'left',
            }}
          >
            <strong>{cred.humanName}</strong> · {daysUntil(cred.expiresAt)}d
          </button>
        ))}
      </div>
    </div>
  );

  const emergencyRenewBlock = (
    <InvitationCard
      question={`Renew ${mostUrgent.humanName} now — ${daysUntil(mostUrgent.expiresAt)} days left.`}
      primaryLabel="Renew now"
      primaryHref={mostUrgent.renewalUrl}
      stance={{ ...stance, tempo: 'emergency' }}
      emphasis="ceremonial"
    />
  );

  return (
    <main
      style={{
        minHeight: '100vh',
        background: BRAND_COLORS.parchment,
        color: BRAND_COLORS.forestInk,
        fontFamily: BRAND_FONTS.display,
        padding: '2.5rem 1.5rem 4rem',
      }}
    >
      <div style={{ maxWidth: '54rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ ...mono, color: BRAND_COLORS.steel, marginBottom: '0.3rem' }}>Killer App · Credentialing</p>
            <h1 style={{ margin: 0, fontWeight: 500, fontSize: '2rem', color: BRAND_COLORS.forestInk }}>
              Every credential, re-verified on a cadence.
            </h1>
          </div>
          <ProToggle
            initialPro={stance.lane === 'professional' || stance.lane === 'administrator'}
            onChange={(isPro) => {
              const nextLane: StanceLane = isPro ? 'professional' : 'public';
              setLane(nextLane);
              persistStanceOverride({ lane: nextLane, skill_signal: isPro ? 0.85 : 0.3 });
            }}
          />
        </header>

        <section aria-label="Lane selector" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(['administrator', 'professional', 'public', 'machine'] as StanceLane[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLane(l);
                persistStanceOverride({ lane: l });
              }}
              aria-pressed={lane === l}
              style={{
                padding: '0.3rem 0.7rem',
                border: `1px solid ${lane === l ? BRAND_COLORS.copper : BRAND_COLORS.copperLine}`,
                background: lane === l ? BRAND_COLORS.parchmentWarm : 'transparent',
                color: lane === l ? BRAND_COLORS.copper : BRAND_COLORS.steel,
                fontFamily: BRAND_FONTS.mono,
                fontSize: '0.72rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                borderRadius: '999px',
              }}
            >
              {l}
            </button>
          ))}
        </section>

        <TempoAdapt
          leisurely={leisurelyRenewBlock}
          focused={leisurelyRenewBlock}
          urgent={leisurelyRenewBlock}
          emergency={emergencyRenewBlock}
        />

        <InfiniteDescent
          stance={{ ...stance, lane }}
          floors={[
            {
              floor: 0,
              label: 'plain',
              content:
                lane === 'administrator' ? (
                  <AdminFloor0 creds={CREDENTIALS} />
                ) : lane === 'professional' ? (
                  <ProFloor0 cred={mostUrgent} />
                ) : lane === 'machine' ? (
                  <MachineFloor0 creds={CREDENTIALS} />
                ) : (
                  <PublicFloor0 cred={mostUrgent} />
                ),
            },
            {
              floor: 2,
              label: 'full roster',
              content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {CREDENTIALS.map((cred) => (
                    <article
                      key={cred.id}
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
                      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
                        <strong>{cred.humanName}</strong>
                        <span style={{ ...mono, color: BRAND_COLORS.steel }}>
                          {cred.holder} · {daysUntil(cred.expiresAt)}d
                        </span>
                      </header>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: BRAND_COLORS.steel }}>{cred.proName}</p>
                      <TrustStrip
                        sourceCount={cred.sources.length}
                        sources={cred.sources}
                        lastVerified={cred.sources[0].lastVerified ?? TODAY}
                        variant="inline"
                        jurisdiction={cred.jurisdiction}
                      />
                    </article>
                  ))}
                </div>
              ),
            },
            { floor: 6, label: 'agent payload', content: <MachineFloor0 creds={CREDENTIALS} /> },
          ]}
        />

        <LifecycleMemory stages={lifecycleStages} currentStageId="renewal" />

        <TimeMachine history={tmHistory} variant="tray" />

        <footer style={{ ...mono, color: BRAND_COLORS.steel, paddingTop: '1.5rem', borderTop: `1px solid ${BRAND_COLORS.copperLine}` }}>
          API · GET /api/v1/credentialing (WS2 wires this to Supabase)
        </footer>
      </div>
    </main>
  );
}
