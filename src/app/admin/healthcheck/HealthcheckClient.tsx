'use client';

/**
 * HealthcheckClient (PLATFORM-HEALTHCHECK, 2026-05-22)
 * =====================================================
 * Owner-only dashboard. Polls `/api/v1/healthcheck?detailed=1` every
 * 30s, renders each sub-check as a card with a status dot, exposes the
 * raw JSON in a collapsible section for ops debugging, and offers a
 * "Re-check now" button that forces a fresh fetch (the route's 10s
 * module cache means clicking it more than once in 10s returns the
 * same payload — that's by design).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import LaneGate from '@/components/LaneGate';

interface SubCheck {
  ok: boolean;
  value?: unknown;
  error?: string;
  warning?: string;
  latency_ms: number;
}

interface HealthcheckResponse {
  ok: boolean;
  ts: string;
  summary: string;
  version?: {
    commit?: string;
    branch?: string;
    deployment_id?: string;
  };
  checks?: Record<string, SubCheck>;
}

const COLORS = {
  paper:    '#FAF8F2',
  ink:      '#1A1A1A',
  graphite: '#3D3D3D',
  faded:    '#B8B5AC',
  rule:     '#D8D2C2',
  green:    '#1D9E75',
  red:      '#E8443A',
  amber:    '#C4A44A',
  teal:     '#0E7F8C',
};

const CHECK_LABELS: Record<string, string> = {
  db: 'Database',
  rls: 'Row-level security',
  audit_log: 'Audit log',
  embeddings: 'Embeddings',
  source_urls: 'Source URLs',
  email: 'Outbound email',
  rag_cache: 'RAG cache',
  workflows: 'Live workflows',
  mcp: 'MCP capability',
  pg_cron: 'pg_cron jobs',
  vercel: 'Deploy metadata',
};

const CHECK_DESCRIPTIONS: Record<string, string> = {
  db: 'Service-role round-trip against Supabase.',
  rls: 'All 7 critical project + CRM tables reachable.',
  audit_log: 'Recent activity captured in the audit trail.',
  embeddings: 'Vector embeddings populated for knowledge_entities.',
  source_urls: 'Coverage of source citations on knowledge entities.',
  email: 'Resend domain verification (DNS).',
  rag_cache: 'Hit ratio + per-source cache sizes.',
  workflows: 'Every workflow in LIVE_WORKFLOW_PATHS has a route on disk.',
  mcp: 'Public MCP endpoint reports non-zero entity + jurisdiction counts.',
  pg_cron: 'Audit-log maintenance + retention jobs scheduled.',
  vercel: 'Commit + deployment id for ops traceability.',
};

const pageWrap: React.CSSProperties = {
  minHeight: '100vh',
  background: COLORS.paper,
  padding: '40px 24px 80px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  color: COLORS.ink,
};

const container: React.CSSProperties = {
  maxWidth: 1040,
  margin: '0 auto',
};

const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: `1px solid ${COLORS.rule}`,
  borderRadius: 12,
  padding: 28,
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  letterSpacing: '0.14em',
  fontWeight: 700,
  color: COLORS.amber,
  textTransform: 'uppercase',
};

const h1Style: React.CSSProperties = {
  margin: '6px 0 14px',
  fontSize: 28,
  lineHeight: 1.2,
  color: COLORS.ink,
};

const bodyText: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  lineHeight: 1.55,
  color: COLORS.graphite,
};

const ctaSecondary: React.CSSProperties = {
  display: 'inline-block',
  padding: '10px 18px',
  background: '#FFFFFF',
  color: COLORS.ink,
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  border: `1px solid ${COLORS.rule}`,
  cursor: 'pointer',
  textDecoration: 'none',
};

function NotForYourRole() {
  return (
    <main style={pageWrap}>
      <div style={{ ...container, ...card }}>
        <p style={eyebrow}>OWNERS ONLY</p>
        <h1 style={h1Style}>The platform healthcheck is for org owners.</h1>
        <p style={bodyText}>
          This page surfaces operational counts — entity totals, audit
          activity, cache stats — that we don&apos;t expose to other roles. If
          you&apos;re running ops or on-call, ask the org owner to grant
          access.
        </p>
        <div style={{ marginTop: 24 }}>
          <Link href="/killerapp" style={ctaSecondary}>← Back to your project</Link>
        </div>
      </div>
    </main>
  );
}

export default function HealthcheckClient() {
  return (
    <LaneGate
      allow={['owner']}
      fallback={<NotForYourRole />}
      loadingFallback={<main style={pageWrap} />}
    >
      <HealthcheckPanel />
    </LaneGate>
  );
}

function HealthcheckPanel() {
  const [data, setData] = useState<HealthcheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else if (!data) setLoading(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch('/api/v1/healthcheck?detailed=1', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 503) {
        setError((json as { error?: string })?.error || `Healthcheck failed (${res.status}).`);
        return;
      }
      setData(json as HealthcheckResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetchHealth(false);
    timerRef.current = setInterval(() => void fetchHealth(false), 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchHealth]);

  const overallColor = !data ? COLORS.faded : data.ok ? COLORS.green : COLORS.red;
  const overallLabel = !data
    ? 'Loading…'
    : data.ok
    ? 'All systems operational'
    : 'Degraded';

  return (
    <main style={pageWrap}>
      <div style={container}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={eyebrow}>PLATFORM HEALTH</p>
              <h1 style={h1Style}>Operational status</h1>
              <p style={bodyText}>
                One endpoint, eleven sub-checks. Hard fails (red) page
                ops; soft warns (amber) wait until business hours.
                Auto-refreshes every 30 seconds.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchHealth(true)}
              disabled={refreshing}
              style={{
                ...ctaSecondary,
                opacity: refreshing ? 0.5 : 1,
                cursor: refreshing ? 'wait' : 'pointer',
              }}
            >
              {refreshing ? 'Re-checking…' : 'Re-check now'}
            </button>
          </div>

          {/* Overall status pill */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: `${overallColor}1A`,
                color: overallColor,
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: overallColor }} />
              {overallLabel}
            </span>
            {data?.summary && (
              <span style={{ ...bodyText, fontSize: 14 }}>{data.summary}</span>
            )}
          </div>

          {data?.version && (
            <div style={{ marginTop: 14, fontSize: 13, color: COLORS.faded, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              {data.version.branch && <span>branch <strong style={{ color: COLORS.ink }}>{data.version.branch}</strong> · </span>}
              {data.version.commit && <span>commit <strong style={{ color: COLORS.ink }}>{data.version.commit.slice(0, 7)}</strong> · </span>}
              {data.version.deployment_id && <span>deploy <strong style={{ color: COLORS.ink }}>{data.version.deployment_id.slice(0, 12)}</strong></span>}
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: 'rgba(232,68,58,0.08)',
                border: `1px solid ${COLORS.red}`,
                borderRadius: 8,
                color: COLORS.red,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Sub-check grid */}
        <div style={{ ...card, marginTop: 20 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 20, color: COLORS.ink }}>Sub-checks</h2>
          {!data?.checks && (
            <p style={{ ...bodyText, color: COLORS.faded }}>
              {loading ? 'Running checks…' : 'No check data — see error above.'}
            </p>
          )}
          {data?.checks && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 14,
              }}
            >
              {Object.entries(data.checks).map(([name, check]) => (
                <SubCheckCard key={name} name={name} check={check} />
              ))}
            </div>
          )}
        </div>

        {/* Raw JSON */}
        {data && (
          <div style={{ ...card, marginTop: 20 }}>
            <button
              type="button"
              onClick={() => setShowRaw((s) => !s)}
              style={{
                ...ctaSecondary,
                marginBottom: showRaw ? 14 : 0,
              }}
            >
              {showRaw ? 'Hide' : 'Show'} raw JSON
            </button>
            {showRaw && (
              <pre
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 12,
                  background: '#F4F0E6',
                  border: `1px solid ${COLORS.rule}`,
                  borderRadius: 8,
                  padding: 14,
                  overflow: 'auto',
                  maxHeight: 480,
                  color: COLORS.ink,
                }}
              >
                {JSON.stringify(data, null, 2)}
              </pre>
            )}
          </div>
        )}

        {data?.ts && (
          <p style={{ ...bodyText, marginTop: 16, fontSize: 12, color: COLORS.faded, textAlign: 'center' }}>
            Last refreshed {new Date(data.ts).toLocaleString()} · auto-refresh every 30s · server cache 10s
          </p>
        )}
      </div>
    </main>
  );
}

function SubCheckCard({ name, check }: { name: string; check: SubCheck }) {
  // Color logic: red on !ok, amber on ok+warning, green otherwise.
  const tone: 'green' | 'amber' | 'red' = !check.ok
    ? 'red'
    : check.warning
    ? 'amber'
    : 'green';
  const dotColor = tone === 'red' ? COLORS.red : tone === 'amber' ? COLORS.amber : COLORS.green;
  const label = CHECK_LABELS[name] ?? name;
  const desc = CHECK_DESCRIPTIONS[name] ?? '';

  return (
    <div
      style={{
        border: `1px solid ${COLORS.rule}`,
        borderRadius: 10,
        padding: 16,
        background: '#FFFDF7',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        <strong style={{ fontSize: 15, color: COLORS.ink }}>{label}</strong>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.faded, fontFamily: 'ui-monospace, monospace' }}>
          {check.latency_ms}ms
        </span>
      </div>
      <p style={{ ...bodyText, fontSize: 13, color: COLORS.faded, margin: 0 }}>{desc}</p>
      {check.warning && (
        <div style={{ fontSize: 12, color: COLORS.amber, fontWeight: 600, lineHeight: 1.4 }}>
          ⚠ {check.warning}
        </div>
      )}
      {check.error && (
        <div style={{ fontSize: 12, color: COLORS.red, fontWeight: 600, lineHeight: 1.4 }}>
          ✕ {check.error}
        </div>
      )}
      {check.value !== undefined && check.value !== null && (
        <pre
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 11,
            margin: 0,
            padding: 8,
            background: '#F4F0E6',
            border: `1px solid ${COLORS.rule}`,
            borderRadius: 6,
            overflow: 'auto',
            maxHeight: 140,
            color: COLORS.graphite,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {JSON.stringify(check.value, null, 2)}
        </pre>
      )}
    </div>
  );
}
