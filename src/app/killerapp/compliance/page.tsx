/**
 * /killerapp/compliance — WS4 Compliance surface.
 *
 * The RSI Heartbeat is the moat: the compliance graph re-verifies every
 * citation against the issuing authority (state board, city building dept,
 * federal register) on a cadence. When this page renders a code section,
 * the TrustStrip on it tells you the last verification timestamp — not a
 * static snapshot from a vendor's quarterly upload.
 *
 * Pattern Language composition:
 *   - TempoAdapt           (cardinal — leisurely audit vs. emergency stop-work)
 *   - TrustPostureAdapt    (newcomer gets full context, veteran gets one tap)
 *   - TrustStrip           (every citation: source + freshness + jurisdiction)
 *   - ThreeSourceRule      (state board + city + contractor record must agree)
 *   - TimeMachine          (dismissed alerts recoverable 30 days)
 *   - ModalityMirror       (in-app card / SMS-shaped / voice-spoken — render preview)
 *   - InvitationCard       (Floor 0 — "What's on fire?")
 *   - InfiniteDescent      (F0 plain → F4 code-section diff → F6 agent payload)
 *   - useStanceCard()      (every primitive)
 *
 * Four lanes Floor 0:
 *   Administrator: "What's on fire?"
 *   Professional:  "What do I need to fix today?"
 *   Public:        not primary lane (minimal surface — link to contractor's status)
 *   Machine:       compliance feed at /api/v1/compliance/feed (MCP-ready)
 */

'use client';

import * as React from 'react';
import { useState } from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';
import { useStanceCard, persistStanceOverride } from '@/lib/stance-card';
import {
  InvitationCard,
  TempoAdapt,
  TrustStrip,
  TrustPostureAdapt,
  TimeMachine,
  ModalityMirror,
  InfiniteDescent,
  verifyThreeSource,
  type StanceLane,
  type StanceTempo,
  type SourceCitation,
  type TimeMachineEntry,
} from '@/components/primitives';

interface ComplianceAlert {
  id: string;
  humanTitle: string;
  proTitle: string;
  jurisdiction: string;
  severity: 'info' | 'warn' | 'stop-work';
  whatBroke: string;
  fix: string;
  sources: SourceCitation[];
  lastVerified: string;
  affectedProjectId?: string;
}

const TODAY = '2026-05-26';

const ALERTS: ComplianceAlert[] = [
  {
    id: 'alert-001',
    humanTitle: 'Kitchen island plug rule changed (NEC 2023)',
    proTitle: 'NEC 2023 210.52(C)(5) eliminated — receptacle requirement for kitchen island countertops no longer mandated',
    jurisdiction: 'US-CA · adopted statewide',
    severity: 'warn',
    whatBroke: 'Spec called for an island receptacle that is no longer code-required. Pulling the rough-in saves a panel slot.',
    fix: 'Confirm with AHJ; remove circuit from panel schedule before drywall.',
    sources: [
      { name: 'NFPA NEC 2023 §210.52(C)', url: 'https://www.nfpa.org', lastVerified: '2026-05-24', jurisdiction: 'US' },
      { name: 'California Electrical Code 2025 §210.52', lastVerified: '2026-05-24', jurisdiction: 'US-CA' },
      { name: 'City of SD electrical bulletin 2026-03', lastVerified: '2026-05-25', jurisdiction: 'US-CA-SD' },
    ],
    lastVerified: '2026-05-25',
    affectedProjectId: 'proj-001',
  },
  {
    id: 'alert-002',
    humanTitle: 'Inspection scheduled — final electrical Wed 9am',
    proTitle: 'EFR-2026-1402 · Final Electrical Inspection · City of SD · 2026-05-29 09:00',
    jurisdiction: 'US-CA-SD',
    severity: 'info',
    whatBroke: '',
    fix: 'Crew on-site by 8:30; panel cover off; AFCI/GFCI tester ready.',
    sources: [
      { name: 'City of SD inspection calendar', lastVerified: '2026-05-26', jurisdiction: 'US-CA-SD' },
      { name: 'Permit EFR-2026-1402', lastVerified: '2026-05-26', jurisdiction: 'US-CA-SD' },
      { name: 'BKG project schedule', lastVerified: '2026-05-26', jurisdiction: 'BKG' },
    ],
    lastVerified: '2026-05-26',
  },
  {
    id: 'alert-003',
    humanTitle: 'Stop-work: lead-safe cert expired for renovation',
    proTitle: 'EPA RRP cert expired 2026-05-19 — pre-1978 housing renovation in progress',
    jurisdiction: 'US-federal',
    severity: 'stop-work',
    whatBroke: 'Crew member Marisol Chen\'s RRP cert lapsed yesterday. Project P-2026-014 is in a pre-1978 home.',
    fix: 'Pause sanding / demo today. Renew Marisol\'s RRP cert (4hr refresher) before resuming.',
    sources: [
      { name: 'EPA Lead-Safe portal', url: 'https://www.epa.gov/lead', lastVerified: '2026-05-26', jurisdiction: 'US' },
      { name: 'BKG crew credentials (cred-003)', lastVerified: '2026-05-26', jurisdiction: 'BKG' },
      { name: 'Project P-2026-014 site survey', lastVerified: '2026-05-12', jurisdiction: 'BKG' },
    ],
    lastVerified: '2026-05-26',
    affectedProjectId: 'proj-001',
  },
];

const mono: React.CSSProperties = {
  fontFamily: BRAND_FONTS.mono,
  fontSize: '0.72rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  margin: 0,
};

function severityColor(s: ComplianceAlert['severity']): string {
  if (s === 'stop-work') return BRAND_COLORS.redPrimary;
  if (s === 'warn') return BRAND_COLORS.goldWarm;
  return BRAND_COLORS.steel;
}

function AlertCard({ alert, viewMode }: { alert: ComplianceAlert; viewMode: 'human' | 'pro' }) {
  const verdict = verifyThreeSource(alert.sources);
  return (
    <article
      style={{
        padding: '1rem 1.15rem',
        background: BRAND_COLORS.parchmentWarm,
        border: `1px solid ${severityColor(alert.severity)}`,
        borderLeft: `4px solid ${severityColor(alert.severity)}`,
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.55rem',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontWeight: 500 }}>{viewMode === 'pro' ? alert.proTitle : alert.humanTitle}</h3>
        <span style={{ ...mono, color: severityColor(alert.severity), border: `1px solid ${severityColor(alert.severity)}`, padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
          {alert.severity} · {verdict.tier}
        </span>
      </header>
      {alert.whatBroke ? <p style={{ margin: 0, color: BRAND_COLORS.forestInk }}>{alert.whatBroke}</p> : null}
      <p style={{ margin: 0, color: BRAND_COLORS.forestInk }}>
        <strong>Fix:</strong> {alert.fix}
      </p>
      <TrustStrip
        sourceCount={alert.sources.length}
        sources={alert.sources}
        lastVerified={alert.lastVerified}
        variant="inline"
        jurisdiction={alert.jurisdiction}
      />
    </article>
  );
}

function MachinePayload() {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: ALERTS.map((a, idx) => ({
      '@type': 'AlertAction',
      position: idx + 1,
      identifier: a.id,
      name: a.proTitle,
      jurisdiction: a.jurisdiction,
      severity: a.severity,
      verdict: verifyThreeSource(a.sources).tier,
      sources: a.sources,
      lastVerified: a.lastVerified,
    })),
    endpoint: '/api/v1/compliance/feed',
    mcp: '/api/v1/mcp/compliance',
  };
  return (
    <pre style={{ background: BRAND_COLORS.parchmentDeep, color: BRAND_COLORS.forestDeep, padding: '1rem', fontFamily: BRAND_FONTS.mono, fontSize: '0.72rem', overflowX: 'auto', borderRadius: '4px', margin: 0 }}>
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

export default function CompliancePage() {
  const stance = useStanceCard();
  const [lane, setLane] = useState<StanceLane>(stance.lane);
  const [tempo, setTempo] = useState<StanceTempo>(stance.tempo);

  const stopWorkAlerts = ALERTS.filter((a) => a.severity === 'stop-work');
  const warnAlerts = ALERTS.filter((a) => a.severity === 'warn');

  const onFire = stopWorkAlerts.length > 0 ? stopWorkAlerts[0] : warnAlerts[0];

  const [tmHistory] = useState<TimeMachineEntry<string>[]>([
    { id: 'tm-c1', label: 'Acknowledged: NEC 2023 island plug rule', at: '2026-05-25T15:30:00Z', before: 'unread', after: 'read' },
    { id: 'tm-c2', label: 'Snoozed: roofing weather alert', at: '2026-05-24T09:10:00Z', before: 'active', after: 'snoozed' },
  ]);

  const proMode = lane === 'professional' || lane === 'administrator';

  const adminF0 = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ ...mono, color: BRAND_COLORS.steel }}>Administrator · What&apos;s on fire</p>
      {stopWorkAlerts.length > 0 ? stopWorkAlerts.map((a) => <AlertCard key={a.id} alert={a} viewMode="pro" />) : <p>No stop-work conditions. Two warnings pending.</p>}
    </div>
  );

  const proF0 = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ ...mono, color: BRAND_COLORS.steel }}>Professional · What do I need to fix today</p>
      {[...stopWorkAlerts, ...warnAlerts].slice(0, 3).map((a) => <AlertCard key={a.id} alert={a} viewMode="pro" />)}
    </div>
  );

  const publicF0 = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ ...mono, color: BRAND_COLORS.steel }}>Public · Contractor status</p>
      <p style={{ margin: 0 }}>
        Your contractor has <strong>{stopWorkAlerts.length}</strong> stop-work item and{' '}
        <strong>{warnAlerts.length}</strong> warnings under review. Work is paused until cleared.
      </p>
    </div>
  );

  const machineF0 = <MachinePayload />;

  const floor0Content =
    lane === 'administrator' ? adminF0 :
    lane === 'professional' ? proF0 :
    lane === 'machine' ? machineF0 : publicF0;

  return (
    <main style={{ minHeight: '100vh', background: BRAND_COLORS.parchment, color: BRAND_COLORS.forestInk, fontFamily: BRAND_FONTS.display, padding: '2.5rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: '54rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <header>
          <p style={{ ...mono, color: BRAND_COLORS.steel, marginBottom: '0.3rem' }}>Killer App · Compliance</p>
          <h1 style={{ margin: 0, fontWeight: 500, fontSize: '2rem' }}>Citations sourced. Alerts triangulated. Today&apos;s code, not last quarter&apos;s.</h1>
        </header>

        <TrustPostureAdapt
          newcomer={
            <aside style={{ padding: '0.85rem 1rem', background: BRAND_COLORS.parchmentWarm, border: `1px solid ${BRAND_COLORS.copperLine}`, borderRadius: '4px' }}>
              <p style={{ ...mono, color: BRAND_COLORS.steel, marginBottom: '0.35rem' }}>How this page works</p>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Every alert shows three sources. Only alerts where state board, city, and the BKG record agree render as authoritative. Sources are re-checked nightly. Dismissed alerts come back for 30 days.
              </p>
            </aside>
          }
          veteran={null}
        />

        <section aria-label="Lane selector" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(['administrator', 'professional', 'public', 'machine'] as StanceLane[]).map((l) => (
            <button key={l} type="button" onClick={() => { setLane(l); persistStanceOverride({ lane: l }); }} aria-pressed={lane === l}
              style={{ padding: '0.3rem 0.7rem', border: `1px solid ${lane === l ? BRAND_COLORS.copper : BRAND_COLORS.copperLine}`, background: lane === l ? BRAND_COLORS.parchmentWarm : 'transparent', color: lane === l ? BRAND_COLORS.copper : BRAND_COLORS.steel, fontFamily: BRAND_FONTS.mono, fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '999px' }}>
              {l}
            </button>
          ))}
        </section>

        <section aria-label="Tempo selector" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ ...mono, color: BRAND_COLORS.steel }}>Tempo:</span>
          {(['leisurely', 'focused', 'urgent', 'emergency'] as StanceTempo[]).map((t) => (
            <button key={t} type="button" onClick={() => setTempo(t)} aria-pressed={tempo === t}
              style={{ padding: '0.25rem 0.55rem', border: `1px solid ${tempo === t ? BRAND_COLORS.copper : BRAND_COLORS.copperLine}`, background: tempo === t ? BRAND_COLORS.parchmentWarm : 'transparent', color: tempo === t ? BRAND_COLORS.copper : BRAND_COLORS.steel, fontFamily: BRAND_FONTS.mono, fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '999px' }}>
              {t}
            </button>
          ))}
        </section>

        <TempoAdapt
          forceTempo={tempo}
          leisurely={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <InvitationCard
                question="What's on fire?"
                proSubtitle={`${stopWorkAlerts.length} stop-work · ${warnAlerts.length} warnings`}
                primaryLabel={onFire ? `Open ${onFire.humanTitle}` : 'Review compliance audit'}
                stance={stance}
              />
              {floor0Content}
            </div>
          }
          focused={floor0Content}
          urgent={onFire ? <AlertCard alert={onFire} viewMode={proMode ? 'pro' : 'human'} /> : floor0Content}
          emergency={
            onFire ? (
              <InvitationCard
                question={`STOP-WORK · ${onFire.humanTitle}`}
                primaryLabel="Open fix"
                emphasis="ceremonial"
                stance={{ ...stance, tempo: 'emergency' }}
              />
            ) : floor0Content
          }
        />

        <section aria-label="Channel preview">
          <p style={{ ...mono, color: BRAND_COLORS.steel, marginBottom: '0.5rem' }}>Channel preview for this alert</p>
          <ModalityMirror
            forceModality="visual"
            visual={onFire ? <AlertCard alert={onFire} viewMode="human" /> : null}
          />
        </section>

        <ModalityMirror
          forceModality="agent-api"
          visual={null}
          agent={<MachinePayload />}
        />

        <InfiniteDescent
          stance={{ ...stance, lane }}
          floors={[
            { floor: 0, label: 'plain', content: floor0Content },
            {
              floor: 2,
              label: 'all alerts',
              content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {ALERTS.map((a) => <AlertCard key={a.id} alert={a} viewMode={proMode ? 'pro' : 'human'} />)}
                </div>
              ),
            },
            {
              floor: 4,
              label: 'citation diff',
              content: (
                <article style={{ padding: '1rem', background: BRAND_COLORS.parchmentWarm, border: `1px solid ${BRAND_COLORS.copperLine}`, borderRadius: '4px' }}>
                  <p style={{ ...mono, color: BRAND_COLORS.steel, marginBottom: '0.5rem' }}>NEC 2020 vs NEC 2023 · §210.52(C)</p>
                  <p style={{ margin: 0, fontFamily: BRAND_FONTS.mono, fontSize: '0.85rem' }}>
                    <span style={{ color: BRAND_COLORS.redPrimary, textDecoration: 'line-through' }}>
                      NEC 2020 §210.52(C)(5): Receptacle outlets shall be installed in island countertops…
                    </span>
                    <br />
                    <span style={{ color: BRAND_COLORS.greenPrimary }}>
                      NEC 2023: requirement eliminated. Optional installation only.
                    </span>
                  </p>
                </article>
              ),
            },
            { floor: 6, label: 'agent payload', content: <MachinePayload /> },
          ]}
        />

        <TimeMachine history={tmHistory} variant="tray" maxEntries={10} />

        <footer style={{ ...mono, color: BRAND_COLORS.steel, paddingTop: '1.5rem', borderTop: `1px solid ${BRAND_COLORS.copperLine}` }}>
          Heartbeat last ran {TODAY} · 87 citations re-verified · 2 jurisdictions out of sync (flagged)
        </footer>
      </div>
    </main>
  );
}
