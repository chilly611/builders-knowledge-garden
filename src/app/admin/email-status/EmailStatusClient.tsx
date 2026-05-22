'use client';

/**
 * EmailStatusClient (EMAIL-VERIFICATION, 2026-05-22)
 * ===================================================
 *
 * Owner-only DNS setup wizard. Calls `/api/v1/email/healthcheck` on
 * mount, renders the current verification status (green/amber/red), and
 * when the domain isn't verified prints the exact DNS records to paste
 * at the user's DNS provider — each value gets a copy-to-clipboard
 * button so the operator never has to fight a hand-copy typo.
 *
 * "Re-check now" button hits `?bypassCache=1` so the operator can verify
 * propagation without waiting for the 5-minute memo to expire.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import LaneGate from '@/components/LaneGate';

interface DomainRecord {
  type: string;
  name: string;
  value: string;
  status?: string;
  priority?: number;
  ttl?: string | number;
}

interface DomainStatus {
  configured: boolean;
  reason?: 'no_api_key' | 'fetch_failed' | 'not_added';
  domain: string | null;
  status: 'verified' | 'pending' | 'failed' | 'not_added' | 'unknown';
  verified_at?: string | null;
  records: DomainRecord[];
  raw_error?: string;
  fetched_at: string;
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

const STATUS_META: Record<
  DomainStatus['status'],
  { label: string; color: string; bg: string; tone: 'good' | 'warn' | 'bad' | 'neutral' }
> = {
  verified:  { label: 'Verified',           color: COLORS.green, bg: 'rgba(29,158,117,0.12)', tone: 'good' },
  pending:   { label: 'Pending DNS',        color: COLORS.amber, bg: 'rgba(196,164,74,0.14)', tone: 'warn' },
  failed:    { label: 'Failed verification', color: COLORS.red,   bg: 'rgba(232,68,58,0.10)',  tone: 'bad' },
  not_added: { label: 'Not added to Resend', color: COLORS.red,   bg: 'rgba(232,68,58,0.10)',  tone: 'bad' },
  unknown:   { label: 'Unknown',             color: COLORS.faded, bg: 'rgba(184,181,172,0.18)', tone: 'neutral' },
};

const pageWrap: React.CSSProperties = {
  minHeight: '100vh',
  background: COLORS.paper,
  padding: '40px 24px 80px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  color: COLORS.ink,
};

const container: React.CSSProperties = {
  maxWidth: 880,
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

const ctaPrimary: React.CSSProperties = {
  display: 'inline-block',
  padding: '10px 18px',
  background: COLORS.ink,
  color: '#FFFFFF',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  textDecoration: 'none',
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

const codeChip: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 13,
  background: '#F4F0E6',
  border: `1px solid ${COLORS.rule}`,
  borderRadius: 6,
  padding: '6px 10px',
  wordBreak: 'break-all',
  color: COLORS.ink,
  flex: 1,
  minWidth: 0,
};

function NotForYourRole() {
  return (
    <main style={pageWrap}>
      <div style={{ ...container, ...card }}>
        <p style={eyebrow}>OWNERS ONLY</p>
        <h1 style={h1Style}>The email DNS wizard is for org owners.</h1>
        <p style={bodyText}>
          This page tells you whether outbound email from BKG is actually working
          — including the DNS records you&apos;d need to paste at the registrar to
          fix it. We restrict it to owners because anyone with these values can
          impersonate the sending domain.
        </p>
        <div style={{ marginTop: 24 }}>
          <Link href="/killerapp" style={ctaSecondary}>← Back to your project</Link>
        </div>
      </div>
    </main>
  );
}

export default function EmailStatusClient() {
  return (
    <LaneGate
      allow={['owner']}
      fallback={<NotForYourRole />}
      loadingFallback={<main style={pageWrap} />}
    >
      <EmailStatusPanel />
    </LaneGate>
  );
}

function EmailStatusPanel() {
  const [status, setStatus] = useState<DomainStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchStatus = useCallback(async (bypassCache: boolean) => {
    if (bypassCache) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const qs = bypassCache ? '?bypassCache=1' : '';
      const res = await fetch(`/api/v1/email/healthcheck${qs}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || `Healthcheck failed (${res.status}).`);
        return;
      }
      setStatus(json as DomainStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus(false);
  }, [fetchStatus]);

  const copy = useCallback(async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((curr) => (curr === key ? null : curr)), 1500);
    } catch {
      // Older Safari / clipboard-perm-denied — fall back to a prompt so
      // the operator can still hand-copy.
      window.prompt('Copy this value:', value);
    }
  }, []);

  const meta = status ? STATUS_META[status.status] : STATUS_META.unknown;

  return (
    <main style={pageWrap}>
      <div style={container}>
        <div style={card}>
          <p style={eyebrow}>EMAIL HEALTH</p>
          <h1 style={h1Style}>Outbound email status</h1>
          <p style={bodyText}>
            We send transactional email through Resend. If the FROM domain isn&apos;t
            verified there, every send silently bounces. This page tells you
            where things stand and exactly which DNS records to paste at your
            registrar if something is off.
          </p>

          {/* Status pill */}
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: meta.bg,
                color: meta.color,
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: meta.color,
                  display: 'inline-block',
                }}
              />
              {loading ? 'Loading…' : meta.label}
            </span>
            {status?.domain && (
              <span style={{ ...bodyText, fontSize: 14 }}>
                Domain: <strong style={{ color: COLORS.ink }}>{status.domain}</strong>
              </span>
            )}
            <button
              type="button"
              onClick={() => fetchStatus(true)}
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

          {/* Specific messaging per state */}
          {status?.configured === false && status.reason === 'no_api_key' && (
            <NoApiKeyMessage />
          )}
          {status?.configured && status.reason === 'fetch_failed' && (
            <FetchFailedMessage rawError={status.raw_error} />
          )}
          {status?.status === 'not_added' && (
            <NotAddedMessage domain={status.domain} />
          )}
          {status?.status === 'failed' && (
            <FailedMessage domain={status.domain} />
          )}
          {status?.status === 'verified' && (
            <VerifiedMessage domain={status.domain} verifiedAt={status.verified_at} />
          )}
          {status?.status === 'pending' && (
            <PendingMessage domain={status.domain} />
          )}
        </div>

        {/* DNS records — only show when there's something to paste */}
        {status && status.records && status.records.length > 0 && (
          <div style={{ ...card, marginTop: 20 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, color: COLORS.ink }}>
              DNS records to add
            </h2>
            <p style={{ ...bodyText, marginBottom: 18 }}>
              Paste each of these at your DNS provider (Cloudflare, GoDaddy,
              Route 53, etc.) on the parent zone for{' '}
              <strong>{status.domain}</strong>. Use the copy button to grab
              each value verbatim — invisible trailing spaces are the #1
              cause of failed verification.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {status.records.map((rec, idx) => (
                <RecordRow
                  key={`${rec.type}-${rec.name}-${idx}`}
                  rec={rec}
                  copied={copied}
                  onCopy={copy}
                  idx={idx}
                />
              ))}
            </div>
            <p style={{ ...bodyText, marginTop: 18, fontSize: 13, color: COLORS.faded }}>
              DNS changes typically propagate in 5–60 minutes. Some registrars
              (GoDaddy especially) can take up to 24 hours. After pasting
              everything, click <strong>Re-check now</strong> above. Status
              will flip to <strong style={{ color: COLORS.green }}>verified</strong> once
              Resend can see all the records.
            </p>
          </div>
        )}

        {/* Always-on wizard pointer */}
        <div style={{ ...card, marginTop: 20 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, color: COLORS.ink }}>
            Full setup wizard
          </h2>
          <p style={bodyText}>
            For first-time setup (creating the Resend account, adding the
            domain, the env-var step) see the full walk-through in{' '}
            <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
              docs/EMAIL-SETUP.md
            </code>{' '}
            in the repo.
          </p>
          <div style={{ marginTop: 14, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="https://resend.com/domains" target="_blank" rel="noreferrer" style={ctaPrimary}>
              Open Resend dashboard ↗
            </a>
            <a href="https://resend.com/docs/dashboard/domains/introduction" target="_blank" rel="noreferrer" style={ctaSecondary}>
              Resend DNS docs ↗
            </a>
          </div>
        </div>

        {status?.fetched_at && (
          <p style={{ ...bodyText, marginTop: 16, fontSize: 12, color: COLORS.faded, textAlign: 'center' }}>
            Status fetched {new Date(status.fetched_at).toLocaleString()} (cached 5 min)
          </p>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RecordRow({
  rec,
  copied,
  onCopy,
  idx,
}: {
  rec: DomainRecord;
  copied: string | null;
  onCopy: (key: string, value: string) => void;
  idx: number;
}) {
  const nameKey = `name-${idx}`;
  const valueKey = `value-${idx}`;
  const recStatus = (rec.status || '').toLowerCase();
  const statusColor =
    recStatus === 'verified' ? COLORS.green :
    recStatus === 'pending' ? COLORS.amber :
    recStatus === 'failed' ? COLORS.red : COLORS.faded;

  return (
    <div
      style={{
        border: `1px solid ${COLORS.rule}`,
        borderRadius: 10,
        padding: 16,
        background: '#FFFDF7',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <span
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            background: COLORS.ink,
            color: '#FFFFFF',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
          }}
        >
          {rec.type?.toUpperCase() || 'TXT'}
          {rec.priority != null && ` · prio ${rec.priority}`}
        </span>
        {rec.status && (
          <span style={{ fontSize: 12, fontWeight: 600, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {rec.status}
          </span>
        )}
      </div>

      <FieldRow
        label="Host / Name"
        value={rec.name}
        copied={copied === nameKey}
        onCopy={() => onCopy(nameKey, rec.name)}
      />
      <FieldRow
        label="Value"
        value={rec.value}
        copied={copied === valueKey}
        onCopy={() => onCopy(valueKey, rec.value)}
      />
      {rec.ttl != null && (
        <p style={{ ...bodyText, marginTop: 8, fontSize: 12, color: COLORS.faded }}>
          TTL: {rec.ttl} (or your provider&apos;s default)
        </p>
      )}
    </div>
  );
}

function FieldRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, color: COLORS.faded, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <code style={codeChip}>{value}</code>
        <button
          type="button"
          onClick={onCopy}
          style={{
            ...ctaSecondary,
            padding: '8px 12px',
            minWidth: 88,
            background: copied ? COLORS.green : '#FFFFFF',
            color: copied ? '#FFFFFF' : COLORS.ink,
            borderColor: copied ? COLORS.green : COLORS.rule,
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function NoApiKeyMessage() {
  return (
    <div style={{ marginTop: 20, padding: 16, background: 'rgba(232,68,58,0.06)', border: `1px solid ${COLORS.red}`, borderRadius: 10 }}>
      <p style={{ ...bodyText, color: COLORS.ink, fontWeight: 600, marginBottom: 6 }}>
        RESEND_API_KEY is not set.
      </p>
      <p style={bodyText}>
        No outbound email will be sent until this is configured in Vercel
        (Project → Settings → Environment Variables). Mark it{' '}
        <strong>Sensitive</strong>. See <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>docs/EMAIL-SETUP.md</code> step 1.
      </p>
    </div>
  );
}

function FetchFailedMessage({ rawError }: { rawError?: string }) {
  return (
    <div style={{ marginTop: 20, padding: 16, background: 'rgba(196,164,74,0.10)', border: `1px solid ${COLORS.amber}`, borderRadius: 10 }}>
      <p style={{ ...bodyText, color: COLORS.ink, fontWeight: 600, marginBottom: 6 }}>
        Couldn&apos;t reach Resend.
      </p>
      <p style={bodyText}>
        Common causes: API key revoked, network egress blocked, or Resend is
        having an incident. Until this clears we can&apos;t tell whether the
        domain is verified, so sends are blocked.
      </p>
      {rawError && (
        <pre style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, marginTop: 10, background: '#FFF', padding: 10, borderRadius: 6, border: `1px solid ${COLORS.rule}`, overflow: 'auto' }}>
          {rawError}
        </pre>
      )}
    </div>
  );
}

function NotAddedMessage({ domain }: { domain: string | null }) {
  return (
    <div style={{ marginTop: 20, padding: 16, background: 'rgba(232,68,58,0.06)', border: `1px solid ${COLORS.red}`, borderRadius: 10 }}>
      <p style={{ ...bodyText, color: COLORS.ink, fontWeight: 600, marginBottom: 6 }}>
        Domain {domain ? <code>{domain}</code> : '(unknown)'} has not been added in Resend yet.
      </p>
      <p style={bodyText}>
        Go to the Resend dashboard, click <strong>Domains → Add Domain</strong>,
        and paste <code>{domain}</code>. Resend will then generate the DNS
        records you need — re-check here once you&apos;ve done that and the
        records will appear below.
      </p>
    </div>
  );
}

function FailedMessage({ domain }: { domain: string | null }) {
  return (
    <div style={{ marginTop: 20, padding: 16, background: 'rgba(232,68,58,0.06)', border: `1px solid ${COLORS.red}`, borderRadius: 10 }}>
      <p style={{ ...bodyText, color: COLORS.ink, fontWeight: 600, marginBottom: 6 }}>
        Verification failed for {domain ? <code>{domain}</code> : 'this domain'}.
      </p>
      <p style={bodyText}>
        Resend tried to look up the DNS records and couldn&apos;t confirm them.
        Double-check the records below match exactly what Resend generated.
        Common gotcha: pasting <code>theknowledgegardens.com</code> into the
        host field at a registrar that auto-appends the apex (so you end up
        with <code>theknowledgegardens.com.theknowledgegardens.com</code>).
        Use <code>@</code> or leave the host blank for apex records at most
        registrars.
      </p>
    </div>
  );
}

function PendingMessage({ domain }: { domain: string | null }) {
  return (
    <div style={{ marginTop: 20, padding: 16, background: 'rgba(196,164,74,0.10)', border: `1px solid ${COLORS.amber}`, borderRadius: 10 }}>
      <p style={{ ...bodyText, color: COLORS.ink, fontWeight: 600, marginBottom: 6 }}>
        Waiting on DNS propagation for {domain ? <code>{domain}</code> : 'this domain'}.
      </p>
      <p style={bodyText}>
        You&apos;ve added the records to your registrar but Resend hasn&apos;t
        confirmed all of them yet. Typical wait: 5–60 minutes. Some
        registrars (GoDaddy) can take 24 hours. Until verified, outbound
        sends are blocked and callers will get{' '}
        <code>{`{ ok: false, error: 'domain_not_verified' }`}</code>.
      </p>
    </div>
  );
}

function VerifiedMessage({ domain, verifiedAt }: { domain: string | null; verifiedAt?: string | null }) {
  return (
    <div style={{ marginTop: 20, padding: 16, background: 'rgba(29,158,117,0.08)', border: `1px solid ${COLORS.green}`, borderRadius: 10 }}>
      <p style={{ ...bodyText, color: COLORS.ink, fontWeight: 600, marginBottom: 6 }}>
        {domain ? <code>{domain}</code> : 'This domain'} is verified — outbound mail is flowing.
      </p>
      <p style={bodyText}>
        Every send from <code>sendEmail()</code> in <code>src/lib/email.ts</code>{' '}
        will go out. If your callers (architect-request, gc-match-request)
        still see <code>emailed.internal: false</code>, the issue is either
        an invalid recipient, Resend rate-limiting, or a transient Resend
        outage — not DNS.
        {verifiedAt && (
          <>
            {' '}Verified at <strong>{new Date(verifiedAt).toLocaleString()}</strong>.
          </>
        )}
      </p>
    </div>
  );
}
