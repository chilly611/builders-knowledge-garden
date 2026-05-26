/**
 * /killerapp/ask — WS6 Ask Anything surface.
 *
 * The RSI Heartbeat is the platform. One self-improving knowledge graph per
 * garden, ingesting source data on a domain cadence, re-verifying every
 * entity, surfacing freshness on every claim, learning from use. The platform
 * doesn't hold knowledge — it improves itself in public. Every other platform
 * in our space holds static data and ages. We get more right every week.
 * That is the moat in the AI era.
 *
 * WS6 mounts the AskAnything box at this dedicated route AND exposes it for
 * layout-level embedding. We intentionally do NOT touch
 * src/app/killerapp/layout.tsx in this branch — that file is heavy and has a
 * history of regressions (see W7.O bug 1 in tasks.todo.md). Founder-approved
 * follow-up wires the floating box into the layout once this dedicated route
 * passes review.
 *
 * Pattern Language composition:
 *   - AskAnything (cardinal — omnipresent box)
 *   - CulturalRender (results in user's locale)
 *   - TrustStrip on every answer
 *   - ThreeSourceRule before any answer renders as authoritative
 *   - useStanceCard() (a GC asking "what's a Manual J?" gets pro-level; a
 *                     homeowner gets plain-language)
 *   - Machine-Legible Everything (agent-facing version of every answer at
 *                                 /api/v1/ask)
 *
 * Four lanes Floor 0:
 *   Administrator: "Answer with operations focus."
 *   Professional:  "Answer with code/spec depth."
 *   Public:        "Answer in plain English."
 *   Machine:       structured JSON at POST /api/v1/ask
 */

'use client';

import * as React from 'react';
import { useState } from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';
import { useStanceCard, persistStanceOverride } from '@/lib/stance-card';
import {
  AskAnything,
  CulturalRender,
  TrustStrip,
  Whisper,
  InvitationCard,
  useLocale,
  formatCurrency,
  formatLength,
  type StanceLane,
} from '@/components/primitives';

const mono: React.CSSProperties = {
  fontFamily: BRAND_FONTS.mono,
  fontSize: '0.72rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  margin: 0,
};

function LocaleDemo() {
  const locale = useLocale();
  return (
    <article style={{ padding: '0.85rem 1rem', background: BRAND_COLORS.parchmentWarm, border: `1px solid ${BRAND_COLORS.copperLine}`, borderRadius: '4px' }}>
      <p style={{ ...mono, color: BRAND_COLORS.steel }}>Cultural Render preview</p>
      <p style={{ margin: 0, fontSize: '0.9rem' }}>
        Language: {locale.language} · Jurisdiction: {locale.jurisdiction} · Units: {locale.units} · Currency: {locale.currency}
      </p>
      <p style={{ margin: 0, fontSize: '0.9rem' }}>
        24 ft renders as <strong>{formatLength(24, 'ft', locale)}</strong>. $18,400 renders as <strong>{formatCurrency(18400, locale)}</strong>.
      </p>
    </article>
  );
}

function MachinePayloadDemo() {
  const payload = {
    endpoint: 'POST /api/v1/ask',
    body: { question: 'string', context: 'string?', stance: 'StanceCard?' },
    response: {
      answer: 'string',
      verdict: { tier: '\"authoritative\"|\"corroborated\"|\"single\"|\"unsourced\"', sourceCount: 'number' },
      sources: 'SourceCitation[]',
      heartbeat: { moat: 'string', lastRun: 'ISO8601' },
      machineLegible: { llmsTxt: '/llms.txt', mcp: '/api/v1/mcp/ask' },
    },
  };
  return (
    <pre style={{ background: BRAND_COLORS.parchmentDeep, color: BRAND_COLORS.forestDeep, padding: '1rem', fontFamily: BRAND_FONTS.mono, fontSize: '0.72rem', overflowX: 'auto', borderRadius: '4px', margin: 0 }}>
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

export default function AskPage() {
  const stance = useStanceCard();
  const [lane, setLane] = useState<StanceLane>(stance.lane);

  const placeholderByLane: Record<StanceLane, string> = {
    administrator: 'What\'s the operational risk this week?',
    professional: 'Ask about a code section, spec, or jurisdiction.',
    public: 'Ask anything about your project — in plain language.',
    machine: 'POST a JSON body to /api/v1/ask',
  };

  const exampleQuestions: Record<StanceLane, string[]> = {
    administrator: [
      'Which crew members have credentials expiring in 30 days?',
      'Which projects are running over budget this month?',
    ],
    professional: [
      'What is a Manual J load calculation, in pro depth?',
      'Did the NEC 2023 kitchen island plug rule change in CA?',
    ],
    public: [
      'What\'s a Manual J? (plain language)',
      'Is my contractor properly licensed?',
    ],
    machine: [
      'curl -X POST /api/v1/ask -d \'{ "question": "..." }\'',
    ],
  };

  return (
    <CulturalRender>
      <main style={{ minHeight: '100vh', background: BRAND_COLORS.parchment, color: BRAND_COLORS.forestInk, fontFamily: BRAND_FONTS.display, padding: '2.5rem 1.5rem 4rem' }}>
        <div style={{ maxWidth: '54rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <header>
            <p style={{ ...mono, color: BRAND_COLORS.steel, marginBottom: '0.3rem' }}>Killer App · Ask Anything</p>
            <h1 style={{ margin: 0, fontWeight: 500, fontSize: '2rem' }}>
              One box, every question, three-source-verified answers.
            </h1>
          </header>

          <Whisper
            whisperId="ask-anything-floor-0"
            message="Same box, four lanes. Toggle below to see how the answer changes for an administrator vs. a professional vs. a homeowner vs. an AI agent."
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
            question="What do you want to know?"
            proSubtitle={`Lane: ${lane} · Locale: ${stance.locale.language} · Tempo: ${stance.tempo}`}
            primaryLabel="Use the box below"
            stance={stance}
            helper={placeholderByLane[lane]}
          />

          <AskAnything
            placeholder={placeholderByLane[lane]}
            context={`lane=${lane}`}
            variant="inline"
          />

          <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ ...mono, color: BRAND_COLORS.steel }}>Example questions for {lane}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {exampleQuestions[lane].map((q) => (
                <li key={q} style={{ fontSize: '0.9rem' }}>
                  · {q}
                </li>
              ))}
            </ul>
          </section>

          <LocaleDemo />

          <section>
            <p style={{ ...mono, color: BRAND_COLORS.steel, marginBottom: '0.5rem' }}>Same answer, agent-shape</p>
            <MachinePayloadDemo />
          </section>

          <article style={{ padding: '0.85rem 1rem', background: BRAND_COLORS.parchmentWarm, border: `1px solid ${BRAND_COLORS.copperLine}`, borderRadius: '4px' }}>
            <p style={{ ...mono, color: BRAND_COLORS.steel, marginBottom: '0.35rem' }}>Sample answer (mock pipeline)</p>
            <p style={{ margin: 0, marginBottom: '0.5rem' }}>
              The NEC 2023 eliminated the kitchen island receptacle requirement. California Electrical Code 2025 adopted this. San Diego AHJ confirmed no local override.
            </p>
            <TrustStrip
              sourceCount={3}
              sources={[
                { name: 'NFPA NEC 2023 §210.52(C)', url: 'https://www.nfpa.org', lastVerified: new Date(), jurisdiction: 'US' },
                { name: 'CA Electrical Code 2025 §210.52', lastVerified: new Date(), jurisdiction: 'US-CA' },
                { name: 'City of SD electrical bulletin 2026-03', lastVerified: new Date(), jurisdiction: 'US-CA-SD' },
              ]}
              lastVerified={new Date()}
              variant="full"
              jurisdiction="US-CA-SD"
            />
          </article>

          <footer style={{ ...mono, color: BRAND_COLORS.steel, paddingTop: '1.5rem', borderTop: `1px solid ${BRAND_COLORS.copperLine}` }}>
            Machine-Legible Everything · POST /api/v1/ask · MCP at /api/v1/mcp/ask (WS6 wires this)
          </footer>
        </div>
      </main>
    </CulturalRender>
  );
}
