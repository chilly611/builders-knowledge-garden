/**
 * /killerapp/alerts — WS4 Alerts inbox.
 *
 * The RSI Heartbeat is the moat: alerts fire only when ≥ 3 sources agree, so
 * the inbox never burns the user with stale or single-source noise.
 *
 * Pattern Language composition:
 *   - InvitationCard         (Floor 0 — "What needs you now?")
 *   - TempoAdapt             (compresses to a single emergency card when stop-work)
 *   - TrustStrip + Three-Source verdict on every alert
 *   - TimeMachine            (snooze / dismiss recoverable 30 days)
 *   - ModalityMirror         (channel preview — in-app vs SMS vs voice)
 *   - useStanceCard()
 *
 * Four lanes Floor 0:
 *   Administrator: "What's on fire right now?" (urgency-sorted feed)
 *   Professional:  "What do I touch first?" (single-alert ordered queue)
 *   Public:        "What's blocking my project?" (minimal status line)
 *   Machine:       MCP feed at /api/v1/mcp/alerts (subscribable)
 */

'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';
import { useStanceCard, persistStanceOverride } from '@/lib/stance-card';
import {
  InvitationCard,
  TempoAdapt,
  TrustStrip,
  TimeMachine,
  ModalityMirror,
  verifyThreeSource,
  type StanceLane,
  type SourceCitation,
  type TimeMachineEntry,
} from '@/components/primitives';

interface Alert {
  id: string;
  humanTitle: string;
  proTitle: string;
  channel: 'in-app' | 'sms' | 'email' | 'voice';
  severity: 'info' | 'warn' | 'stop-work';
  receivedAt: string;
  body: string;
  sources: SourceCitation[];
  dismissed?: boolean;
}

const ALERTS: Alert[] = [
  {
    id: 'al-001',
    humanTitle: 'Crew member lead-safe cert expired today',
    proTitle: 'EPA RRP cert lapse · Marisol Chen · project P-2026-014',
    channel: 'in-app',
    severity: 'stop-work',
    receivedAt: '2026-05-26T07:01:00Z',
    body: 'Renewal class is 4hr refresher. Pre-1978 project paused until cleared.',
    sources: [
      { name: 'EPA Lead-Safe portal', lastVerified: '2026-05-26' },
      { name: 'BKG credentials registry', lastVerified: '2026-05-26' },
      { name: 'Project site survey', lastVerified: '2026-05-12' },
    ],
  },
  {
    id: 'al-002',
    humanTitle: 'NEC 2023 changed kitchen island rule',
    proTitle: 'NEC 2023 210.52(C)(5) eliminated; CA Electrical Code adopted',
    channel: 'in-app',
    severity: 'warn',
    receivedAt: '2026-05-25T09:30:00Z',
    body: 'Receptacle no longer mandated on kitchen island. Project spec affected.',
    sources: [
      { name: 'NFPA NEC 2023', lastVerified: '2026-05-24' },
      { name: 'CA Electrical Code 2025', lastVerified: '2026-05-24' },
      { name: 'City of SD electrical bulletin', lastVerified: '2026-05-25' },
    ],
  },
  {
    id: 'al-003',
    humanTitle: 'Final electrical inspection scheduled Wed 9am',
    proTitle: 'Permit EFR-2026-1402 · Final Electrical · 2026-05-29',
    channel: 'sms',
    severity: 'info',
    receivedAt: '2026-05-24T16:00:00Z',
    body: 'City inspector confirmed. Crew prep checklist in the project page.',
    sources: [
      { name: 'City of SD calendar', lastVerified: '2026-05-26' },
      { name: 'Permit EFR-2026-1402', lastVerified: '2026-05-26' },
      { name: 'BKG schedule', lastVerified: '2026-05-26' },
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

function sevColor(s: Alert['severity']): string {
  if (s === 'stop-work') return BRAND_COLORS.redPrimary;
  if (s === 'warn') return BRAND_COLORS.goldWarm;
  return BRAND_COLORS.steel;
}

function AlertItem({ alert, viewMode, onDismiss }: { alert: Alert; viewMode: 'human' | 'pro'; onDismiss?: () => void }) {
  const verdict = verifyThreeSource(alert.sources);
  return (
    <article
      style={{
        padding: '0.85rem 1rem',
        background: BRAND_COLORS.parchmentWarm,
        borderLeft: `4px solid ${sevColor(alert.severity)}`,
        border: `1px solid ${BRAND_COLORS.copperLine}`,
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        opacity: alert.dismissed ? 0.45 : 1,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontWeight: 500 }}>{viewMode === 'pro' ? alert.proTitle : alert.humanTitle}</h3>
        <span style={{ ...mono, color: sevColor(alert.severity) }}>{alert.severity} · {verdict.tier}</span>
      </header>
      <p style={{ margin: 0, fontSize: '0.9rem' }}>{alert.body}</p>
      <TrustStrip
        sourceCount={alert.sources.length}
        sources={alert.sources}
        lastVerified={alert.sources[0].lastVerified ?? new Date()}
        variant="inline"
      />
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
        {onDismiss && !alert.dismissed ? (
          <button type="button" onClick={onDismiss} style={{ padding: '0.2rem 0.55rem', background: 'transparent', border: `1px solid ${BRAND_COLORS.copperLine}`, fontFamily: BRAND_FONTS.mono, fontSize: '0.7rem', color: BRAND_COLORS.steel, cursor: 'pointer', borderRadius: '2px' }}>
            Dismiss (recoverable 30d)
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function AlertsPage() {
  const stance = useStanceCard();
  const [lane, setLane] = useState<StanceLane>(stance.lane);
  const [alerts, setAlerts] = useState(ALERTS);

  const stopWork = useMemo(() => alerts.find((a) => a.severity === 'stop-work' && !a.dismissed), [alerts]);
  const visibleAlerts = useMemo(() => alerts.filter((a) => !a.dismissed), [alerts]);

  const [tmHistory, setTmHistory] = useState<TimeMachineEntry<string>[]>([]);

  const dismiss = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, dismissed: true } : a)));
    setTmHistory((prev) => [
      { id: `tm-${Date.now()}`, label: `Dismissed: ${alerts.find((a) => a.id === id)?.humanTitle}`, at: new Date().toISOString(), before: 'active', after: 'dismissed' },
      ...prev,
    ]);
  };

  const proMode = lane === 'professional' || lane === 'administrator';

  return (
    <main style={{ minHeight: '100vh', background: BRAND_COLORS.parchment, color: BRAND_COLORS.forestInk, fontFamily: BRAND_FONTS.display, padding: '2.5rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: '54rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        <header>
          <p style={{ ...mono, color: BRAND_COLORS.steel, marginBottom: '0.3rem' }}>Killer App · Alerts</p>
          <h1 style={{ margin: 0, fontWeight: 500, fontSize: '2rem' }}>What needs you, in the order that matters.</h1>
        </header>

        <section aria-label="Lane selector" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(['administrator', 'professional', 'public', 'machine'] as StanceLane[]).map((l) => (
            <button key={l} type="button" onClick={() => { setLane(l); persistStanceOverride({ lane: l }); }} aria-pressed={lane === l}
              style={{ padding: '0.3rem 0.7rem', border: `1px solid ${lane === l ? BRAND_COLORS.copper : BRAND_COLORS.copperLine}`, background: lane === l ? BRAND_COLORS.parchmentWarm : 'transparent', color: lane === l ? BRAND_COLORS.copper : BRAND_COLORS.steel, fontFamily: BRAND_FONTS.mono, fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '999px' }}>
              {l}
            </button>
          ))}
        </section>

        <TempoAdapt
          leisurely={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <InvitationCard
                question={stopWork ? `Stop-work: ${stopWork.humanTitle}` : 'What needs you now?'}
                primaryLabel={stopWork ? 'Open the fix' : 'Walk the queue'}
                stance={stance}
                emphasis={stopWork ? 'ceremonial' : 'default'}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {visibleAlerts.map((a) => (
                  <AlertItem key={a.id} alert={a} viewMode={proMode ? 'pro' : 'human'} onDismiss={() => dismiss(a.id)} />
                ))}
              </div>
            </div>
          }
          focused={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {visibleAlerts.map((a) => (
                <AlertItem key={a.id} alert={a} viewMode={proMode ? 'pro' : 'human'} onDismiss={() => dismiss(a.id)} />
              ))}
            </div>
          }
          urgent={stopWork ? <AlertItem alert={stopWork} viewMode={proMode ? 'pro' : 'human'} onDismiss={() => dismiss(stopWork.id)} /> : null}
          emergency={stopWork ? (
            <InvitationCard
              question={`STOP-WORK · ${stopWork.humanTitle}`}
              primaryLabel="Open fix"
              emphasis="ceremonial"
              stance={{ ...stance, tempo: 'emergency' }}
            />
          ) : null}
        />

        <section>
          <p style={{ ...mono, color: BRAND_COLORS.steel, marginBottom: '0.5rem' }}>Same alert · different channels</p>
          {stopWork ? (
            <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: '1fr 1fr' }}>
              <article style={{ padding: '0.85rem', background: BRAND_COLORS.parchmentWarm, border: `1px solid ${BRAND_COLORS.copperLine}`, borderRadius: '4px' }}>
                <p style={{ ...mono, color: BRAND_COLORS.steel }}>SMS</p>
                <p style={{ margin: 0, fontFamily: BRAND_FONTS.mono, fontSize: '0.85rem' }}>
                  BKG ALERT: STOP-WORK. {stopWork.proTitle}. Reply STOP to opt out.
                </p>
              </article>
              <article style={{ padding: '0.85rem', background: BRAND_COLORS.parchmentWarm, border: `1px solid ${BRAND_COLORS.copperLine}`, borderRadius: '4px' }}>
                <p style={{ ...mono, color: BRAND_COLORS.steel }}>Voice script</p>
                <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>
                  &ldquo;Stop-work alert from Builder&apos;s Knowledge Garden. {stopWork.humanTitle}. Press one to open the fix.&rdquo;
                </p>
              </article>
            </div>
          ) : null}
        </section>

        <ModalityMirror
          forceModality="agent-api"
          visual={null}
          agent={
            <pre style={{ background: BRAND_COLORS.parchmentDeep, color: BRAND_COLORS.forestDeep, padding: '1rem', fontFamily: BRAND_FONTS.mono, fontSize: '0.72rem', overflowX: 'auto', borderRadius: '4px', margin: 0 }}>
              {JSON.stringify({ feed: '/api/v1/mcp/alerts', subscribers: 1, alerts: visibleAlerts }, null, 2)}
            </pre>
          }
        />

        <TimeMachine history={tmHistory} variant="tray" />

        <footer style={{ ...mono, color: BRAND_COLORS.steel, paddingTop: '1.5rem', borderTop: `1px solid ${BRAND_COLORS.copperLine}` }}>
          Three-source verdict gates which alerts surface as authoritative. Dismissed items recover for 30 days.
        </footer>
      </div>
    </main>
  );
}
