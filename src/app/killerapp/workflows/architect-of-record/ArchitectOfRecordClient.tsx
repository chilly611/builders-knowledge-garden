'use client';

/**
 * ArchitectOfRecordClient
 * =======================
 * Public-friendly form for q-aor — "Need an architect of record? Email us."
 *
 * Behavior:
 *   - Required fields: name, email. Everything else optional.
 *   - Submits to POST /api/v1/architect-request which writes to
 *     `architect_requests` and best-effort fires Resend emails.
 *   - On success: green "We got it!" card with next-step copy.
 *   - On error: inline red card with reason.
 *   - Prefills name + email if the user is signed in (Supabase session).
 *
 * Styling mirrors /feedback (the existing public-facing form) so the
 * lane reads consistently with the rest of the contractor-handover
 * surfaces.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type ProjectType = 'SFR' | 'ADU' | 'Commercial TI' | 'Remodel' | 'Other';

const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string; hint: string }[] = [
  { value: 'SFR',           label: 'Single-family home',  hint: 'New build or major addition' },
  { value: 'ADU',           label: 'ADU',                 hint: 'Detached or attached accessory unit' },
  { value: 'Commercial TI', label: 'Commercial TI',       hint: 'Tenant improvement / build-out' },
  { value: 'Remodel',       label: 'Remodel',             hint: 'Kitchen, bath, full-house, structural' },
  { value: 'Other',         label: 'Something else',      hint: 'Tell us in the scope field' },
];

const BUDGET_OPTIONS = [
  'Under $50K',
  '$50K – $150K',
  '$150K – $500K',
  '$500K – $1M',
  '$1M – $3M',
  '$3M+',
  'Not sure yet',
];

const TIMELINE_OPTIONS = [
  'ASAP — we need a stamp this month',
  'Within 1–3 months',
  '3–6 months out',
  '6+ months out',
  'Just exploring',
];

const COLORS = {
  paper:    '#FAF8F2',
  ink:      '#1A1A1A',
  graphite: '#3D3D3D',
  faded:    '#B8B5AC',
  rule:     '#D8D2C2',
  green:    '#1D9E75',
  red:      '#E8443A',
  amber:    '#C4A44A',
  indigo:   '#3E3A6E', // Lock stage accent
};

export default function ArchitectOfRecordClient() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [projectType, setProjectType] = useState<ProjectType | ''>('');
  const [scope, setScope] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [timeline, setTimeline] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from session if available — same pattern as /feedback.
  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const u = data.user;
        if (!u) return;
        if (u.email) setEmail((prev) => prev || u.email!);
        const metaName = (u.user_metadata as Record<string, unknown> | undefined)?.name;
        if (typeof metaName === 'string') setName((prev) => prev || metaName);
      } catch {
        // Best effort.
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch('/api/v1/architect-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name || null,
          email: email || null,
          phone: phone || null,
          project_address: projectAddress || null,
          project_type: projectType || null,
          scope: scope || null,
          jurisdiction: jurisdiction || null,
          budget_range: budgetRange || null,
          timeline: timeline || null,
          source_path:
            typeof window !== 'undefined' ? window.location.pathname : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Could not send your request. Try again?');
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main style={pageWrap}>
        <div style={card}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 28,
              background: 'rgba(29,158,117,0.12)',
              color: COLORS.green,
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 16,
            }}
            aria-hidden
          >
            ✓
          </div>
          <h1 style={h1Style}>We got it!</h1>
          <p style={{ ...bodyText, marginTop: 12 }}>
            Charlie or Bou will email you within <strong>1 business day</strong> to connect
            you with a CA-licensed architect of record. We sent a confirmation to{' '}
            <strong>{email}</strong> — check spam if you don&apos;t see it.
          </p>
          <p style={{ ...bodyText, marginTop: 12, color: COLORS.faded, fontSize: 14 }}>
            Need to add something? Just reply to that confirmation email — it goes
            straight to the team.
          </p>
          <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/killerapp" style={ctaPrimary}>Back to your project →</Link>
            <Link href="/" style={ctaSecondary}>Home</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageWrap}>
      <form onSubmit={onSubmit} style={card}>
        <p style={eyebrow}>STAGE 2 · LOCK</p>
        <h1 style={h1Style}>Need an architect of record?</h1>
        <p style={{ ...bodyText, marginTop: 12 }}>
          Tell us about your project. Our Knowledge Gardens team
          (<strong>Charlie</strong>, <strong>Bou</strong>, <strong>John</strong>,{' '}
          <strong>Chilly</strong>) will personally reach out and connect you with a
          CA-licensed architect who can stamp your set.
        </p>

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="name">
            Your name <span style={requiredMark}>*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sam Rivera"
            style={inputStyle}
            autoComplete="name"
            required
          />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="email">
            Email <span style={requiredMark}>*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourcompany.com"
            style={inputStyle}
            autoComplete="email"
            required
          />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="phone">Phone (optional)</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(415) 555-0123"
            style={inputStyle}
            autoComplete="tel"
          />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="projectAddress">Project address</label>
          <input
            id="projectAddress"
            type="text"
            value={projectAddress}
            onChange={(e) => setProjectAddress(e.target.value)}
            placeholder="123 Main St, Oakland, CA 94612"
            style={inputStyle}
          />
        </div>

        <fieldset style={{ ...fieldGroup, border: 'none', padding: 0, margin: '24px 0 0' }}>
          <legend style={{ ...labelStyle, padding: 0 }}>Project type</legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {PROJECT_TYPE_OPTIONS.map((opt) => {
              const active = projectType === opt.value;
              return (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: 12,
                    background: active ? 'rgba(62,58,110,0.06)' : '#FFFFFF',
                    border: `1px solid ${active ? COLORS.indigo : COLORS.rule}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  <input
                    type="radio"
                    name="projectType"
                    value={opt.value}
                    checked={active}
                    onChange={() => setProjectType(opt.value)}
                    style={{ marginTop: 3, accentColor: COLORS.indigo }}
                  />
                  <span>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: 14, color: COLORS.ink }}>
                      {opt.label}
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: COLORS.faded, marginTop: 2 }}>
                      {opt.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="scope">Scope — what are you building?</label>
          <textarea
            id="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            rows={4}
            placeholder="e.g. Detached 2-bed ADU in the back yard, ~750 sqft, slab on grade, modern finishes. Need stamped plans for permit."
            style={textareaStyle}
          />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="jurisdiction">Jurisdiction / AHJ</label>
          <input
            id="jurisdiction"
            type="text"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            placeholder="e.g. City of Oakland, Alameda County, San Francisco DBI"
            style={inputStyle}
          />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="budgetRange">Budget range</label>
          <select
            id="budgetRange"
            value={budgetRange}
            onChange={(e) => setBudgetRange(e.target.value)}
            style={inputStyle}
          >
            <option value="">— pick one —</option>
            {BUDGET_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="timeline">Timeline</label>
          <select
            id="timeline"
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            style={inputStyle}
          >
            <option value="">— pick one —</option>
            {TIMELINE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {error && (
          <div role="alert" style={errorCard}>
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} style={submitButton(submitting)}>
          {submitting ? 'Sending…' : 'Send my request →'}
        </button>

        <p style={{ ...bodyText, fontSize: 13, color: COLORS.faded, marginTop: 16 }}>
          We don&apos;t share this outside the Knowledge Gardens team. The architect we
          connect you with will see your project details once you say yes to the intro.
        </p>
      </form>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Styles — mirror /feedback (the existing public form) for consistency.
// ---------------------------------------------------------------------------

const pageWrap: React.CSSProperties = {
  minHeight: '100vh',
  background: COLORS.paper,
  padding: '64px 24px',
  fontFamily: "var(--font-archivo, 'Archivo', sans-serif)",
  color: COLORS.ink,
};

const card: React.CSSProperties = {
  maxWidth: 680,
  margin: '0 auto',
  background: '#FFFFFF',
  borderRadius: 12,
  padding: '40px 32px',
  border: `1px solid ${COLORS.rule}`,
  boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.04)',
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.14em',
  color: COLORS.indigo,
  textTransform: 'uppercase',
};

const h1Style: React.CSSProperties = {
  margin: '8px 0 0',
  fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)",
  fontSize: 32,
  lineHeight: 1.2,
  color: COLORS.ink,
};

const bodyText: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  lineHeight: 1.55,
  color: COLORS.graphite,
};

const fieldGroup: React.CSSProperties = {
  marginTop: 24,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  color: COLORS.ink,
  marginBottom: 8,
};

const requiredMark: React.CSSProperties = {
  color: COLORS.red,
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 15,
  fontFamily: 'inherit',
  background: '#FFFFFF',
  border: `1px solid ${COLORS.rule}`,
  borderRadius: 6,
  color: COLORS.ink,
  outline: 'none',
  boxSizing: 'border-box',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 100,
  lineHeight: 1.5,
};

const errorCard: React.CSSProperties = {
  padding: 12,
  marginTop: 16,
  borderRadius: 6,
  background: 'rgba(232, 68, 58, 0.08)',
  border: `1px solid rgba(232, 68, 58, 0.35)`,
  color: COLORS.red,
  fontSize: 14,
  fontWeight: 600,
};

const submitButton = (disabled: boolean): React.CSSProperties => ({
  marginTop: 28,
  width: '100%',
  padding: '14px 20px',
  fontSize: 16,
  fontWeight: 700,
  fontFamily: 'inherit',
  background: disabled ? COLORS.faded : COLORS.indigo,
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 6,
  cursor: disabled ? 'not-allowed' : 'pointer',
  letterSpacing: '0.01em',
  transition: 'transform 120ms ease, box-shadow 120ms ease',
  opacity: disabled ? 0.7 : 1,
});

const ctaPrimary: React.CSSProperties = {
  padding: '12px 20px',
  background: COLORS.indigo,
  color: '#FFFFFF',
  borderRadius: 6,
  fontSize: 15,
  fontWeight: 700,
  textDecoration: 'none',
};

const ctaSecondary: React.CSSProperties = {
  padding: '12px 20px',
  background: 'transparent',
  color: COLORS.ink,
  border: `1px solid ${COLORS.rule}`,
  borderRadius: 6,
  fontSize: 15,
  fontWeight: 600,
  textDecoration: 'none',
};
