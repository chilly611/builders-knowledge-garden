'use client';

/**
 * CodeLookup — plain-speak code lookup for one jurisdiction (San Francisco).
 *
 * Quick-pick a topic or type a question → the compliance specialist rewrites
 * the relevant code in plain language (the narrative) with verifiable
 * citations. If the live call fails or is slow, the curated SF summary is
 * shown instantly so the lookup is never empty. Pro mode surfaces the formal
 * section number and source citations.
 */

import { Fragment, useState } from 'react';
import {
  SF_CODE_TOPICS,
  SF_JURISDICTION_LABEL,
  findTopic,
  topicsForPhase,
  type CodeTopic,
} from './code-data';
import { runCodeLookup as runPlanLookup } from '@/lib/specialists/plan';
import { runCodeLookup as runBuildLookup } from '@/lib/specialists/build';
import type { SpecialistResult } from '@/lib/specialists';
import { colors, fonts } from '@/design-system/tokens';

function renderInline(text: string): React.ReactNode {
  // Light markdown: **bold** only. Keeps specialist narratives readable
  // without pulling in a markdown dependency.
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i}>{p}</strong> : <Fragment key={i}>{p}</Fragment>,
  );
}

interface LookupState {
  status: 'idle' | 'loading' | 'done';
  topic: CodeTopic | null;
  narrative: string;
  citations: SpecialistResult['citations'];
  live: boolean;
}

export default function CodeLookup({
  phase,
  proMode,
  projectType,
}: {
  phase: 'plan' | 'build';
  proMode: boolean;
  projectType?: string;
}) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<LookupState>({
    status: 'idle',
    topic: null,
    narrative: '',
    citations: [],
    live: false,
  });

  const pool = topicsForPhase(phase);
  const runLookup = phase === 'plan' ? runPlanLookup : runBuildLookup;

  async function lookup(topic: CodeTopic) {
    setQuery(topic.label);
    setState({ status: 'loading', topic, narrative: '', citations: [], live: false });
    try {
      const res = await runLookup({
        topicLabel: topic.label,
        section: topic.section,
        discipline: topic.discipline,
        jurisdiction: SF_JURISDICTION_LABEL,
        query: query.trim() || topic.label,
        projectType,
      });
      const narrative = (res.narrative || '').trim();
      // Treat empty/placeholder mock narratives as a fallback case.
      const looksReal = narrative.length > 40 && !/^placeholder/i.test(narrative);
      setState({
        status: 'done',
        topic,
        narrative: looksReal ? narrative : topic.plain,
        citations: res.citations ?? [],
        live: looksReal,
      });
    } catch {
      setState({ status: 'done', topic, narrative: topic.plain, citations: [], live: false });
    }
  }

  function lookupFromQuery() {
    const topic = findTopic(query, phase) ?? pool[0];
    if (topic) void lookup(topic);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 9px',
            borderRadius: 999,
            background: `${colors.robin}26`,
            border: `1px solid ${colors.robin}`,
            fontFamily: fonts.body,
            fontSize: 11,
            fontWeight: 700,
            color: colors.navy,
          }}
        >
          <span aria-hidden>📍</span> {SF_JURISDICTION_LABEL}
          <span style={{ color: '#14B8A6' }}>· live</span>
        </div>
        <span style={{ fontSize: 11, color: colors.graphite }}>
          {SF_CODE_TOPICS.length} of 200 UpCodes rows wired
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookupFromQuery();
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={phase === 'build' ? 'e.g. smoke alarm placement' : 'e.g. bedroom egress window size'}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '8px 12px',
            borderRadius: 8,
            border: `1.5px solid ${colors.paper.border}`,
            fontFamily: fonts.body,
            fontSize: 13,
            color: colors.navy,
            background: '#fff',
          }}
        />
        <button
          type="submit"
          style={{
            flex: '0 0 auto',
            padding: '8px 14px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: colors.navy,
            color: '#fff',
            fontFamily: fonts.body,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Look up
        </button>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {pool.map((t) => {
          const active = state.topic?.id === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => void lookup(t)}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                cursor: 'pointer',
                fontFamily: fonts.body,
                fontSize: 11.5,
                fontWeight: 600,
                color: active ? '#fff' : colors.navy,
                background: active ? colors.navy : colors.paper.white,
                border: `1.5px solid ${active ? colors.navy : colors.paper.border}`,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          borderRadius: 10,
          border: `1px solid ${colors.paper.border}`,
          background: '#fff',
          padding: 14,
        }}
      >
        {state.status === 'idle' && (
          <p style={{ margin: 0, fontSize: 13, color: colors.graphite }}>
            Pick a topic above or type a question. You&rsquo;ll get a plain-language answer for{' '}
            <b style={{ color: colors.navy }}>{SF_JURISDICTION_LABEL}</b> — no code-speak required.
          </p>
        )}

        {state.status === 'loading' && (
          <p style={{ margin: 0, fontSize: 13, color: colors.graphite }}>
            <span aria-hidden>✨</span> Reading the code and rewriting it in plain language…
          </p>
        )}

        {state.status === 'done' && state.topic && (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontFamily: fonts.display, fontSize: 16, fontWeight: 700, color: colors.navy }}>
                {state.topic.label}
              </h3>
              {proMode && (
                <span style={{ fontFamily: fonts.mono, fontSize: 11.5, color: colors.brass, fontWeight: 600 }}>
                  {state.topic.section}
                </span>
              )}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: state.live ? '#0E7C66' : colors.brass,
                  background: state.live ? '#14B8A622' : `${colors.brass}1A`,
                  padding: '2px 7px',
                  borderRadius: 999,
                }}
              >
                {state.live ? 'AI plain-speak' : 'plain-speak'}
              </span>
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 13.5,
                lineHeight: 1.5,
                color: colors.graphite,
                whiteSpace: 'pre-wrap',
              }}
            >
              {renderInline(state.narrative)}
            </div>

            {proMode && state.citations.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${colors.paper.border}` }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.brass }}>
                  Sources
                </div>
                <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 12, color: colors.navy }}>
                  {state.citations.slice(0, 4).map((c) => (
                    <li key={c.entity_id}>
                      {c.url ? (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: colors.ink[600] }}>
                          {c.section || c.entity_id} ↗
                        </a>
                      ) : (
                        <span>{c.section || c.entity_id}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p style={{ margin: '10px 0 0', fontSize: 11, color: colors.graphite, fontStyle: 'italic' }}>
              Plain-language guidance for orientation — always verify against{' '}
              <a href="https://up.codes" target="_blank" rel="noopener noreferrer" style={{ color: colors.ink[600] }}>
                UpCodes
              </a>{' '}
              and your AHJ before building.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
