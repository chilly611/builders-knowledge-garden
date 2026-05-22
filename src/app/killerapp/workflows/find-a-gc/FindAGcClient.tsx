'use client';

/**
 * FindAGcClient — DIY-LANE concierge form (q-find-gc, 2026-05-22).
 *
 * Public-friendly form for homeowner/dreamer-lane users looking for a
 * general contractor. Mirrors ArchitectOfRecordClient so the two intake
 * surfaces behave identically (prefill from session, same submit/error
 * cards, same green confirmation).
 *
 * Behavior:
 *   - Required: name + email. Everything else optional.
 *   - Submits to POST /api/v1/gc-match-request which writes
 *     gc_match_requests + best-effort fires Resend emails to the team.
 *   - On success: green "We got it!" card with 2-business-day SLA.
 *   - Prefills from the DIY wizard's `?build_type=&city=&state=` query
 *     params so the user doesn't repeat themselves.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type ProjectType = 'ADU' | 'Addition' | 'Remodel' | 'New SFR' | 'Other';

const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string; hint: string }[] = [
  { value: 'ADU',      label: 'ADU',          hint: 'Backyard cottage, garage conversion, or attached unit' },
  { value: 'Addition', label: 'Addition',     hint: 'Adding square footage to an existing home' },
  { value: 'Remodel',  label: 'Remodel',      hint: 'Kitchen, bath, whole-house — interior work' },
  { value: 'New SFR',  label: 'New home',     hint: 'Building from the ground up' },
  { value: 'Other',    label: 'Something else', hint: 'Tell us in the scope field' },
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
  'ASAP — ready to start in 30 days',
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

export default function FindAGcClient() {
  const search = useSearchParams();
  const prefillBuildType = search.get('build_type');
  const prefillCity = search.get('city');
  const prefillState = search.get('state');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [projectAddress, setProjectAddress] = useState(
    prefillCity && prefillState ? `${prefillCity}, ${prefillState}` : ''
  );
  const [projectType, setProjectType] = useState<ProjectType | ''>(
    (PROJECT_TYPE_OPTIONS.find((o) => o.value === prefillBuildType)?.value as ProjectType) || ''
  );
  const [scope, setScope] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [timeline, setTimeline] = useState('');
  const [concerns, setConcerns] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill name/email from session like the architect form does.
  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const u = data.user;
        if (!u) return;
        if (u.email) setEmail((prev) => prev || u.email!);
        const metaName = (u.user_metadata as Record<string, unknown> | undefined)?.name;
        if (typeof metaName === 'string') setName((prev) => prev || metaName);
        // Also try DIY wizard's stashed intent if present.
        const intent = (u.user_metadata as Record<string, unknown> | undefined)?.diy_intent as
          | { build_type?: string; city?: string; state?: string }
          | undefined;
        if (intent) {
          if (intent.build_type && PROJECT_TYPE_OPTIONS.some((o) => o.value === intent.build_type)) {
            setProjectType((prev) => prev || (intent.build_type as ProjectType));
          }
          if (intent.city && intent.state) {
            setProjectAddress((prev) => prev || `${intent.city}, ${intent.state}`);
          }
        }
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
      const res = await fetch('/api/v1/gc-match-request', {
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
          budget_range: budgetRange || null,
          timeline: timeline || null,
          concerns: concerns || null,
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
          <h1 style={h1Style}>We received your request.</h1>
          <p style={{ ...bodyText, marginTop: 12 }}>
            Charlie, Bou, or John will email you with <strong>matches within
            2 business days</strong>. We&apos;ll send 2&ndash;3 vetted GCs
            who&apos;ve done work like yours in {projectAddress || 'your area'} —
            we don&apos;t ghost-list everyone, just the ones we&apos;d hire
            ourselves.
          </p>
          <p style={{ ...bodyText, marginTop: 12, color: COLORS.faded, fontSize: 14 }}>
            Confirmation sent to <strong>{email}</strong>. Reply to it to add
            anything — it goes straight to the team.
          </p>
          <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/killerapp" style={ctaPrimary}>Back to my project →</Link>
            <Link href="/" style={ctaSecondary}>Home</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageWrap}>
      <form onSubmit={onSubmit} style={card}>
        <p style={eyebrow}>STAGE 2 · LOCK — PRE-HIRE</p>
        <h1 style={h1Style}>Find a vetted GC for your project</h1>
        <p style={{ ...bodyText, marginTop: 12 }}>
          Tell us about your project. We&apos;ll match you with{' '}
          <strong>2&ndash;3 vetted general contractors</strong> in your area.
          No bots, no lead-resellers — these are GCs the Knowledge Gardens
          team (<strong>Charlie</strong>, <strong>Bou</strong>,{' '}
          <strong>John</strong>) has worked with directly.
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
            placeholder="e.g. Nick Riviera"
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
            placeholder="you@email.com"
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
          <label style={labelStyle} htmlFor="scope">Scope — what do you want to build?</label>
          <textarea
            id="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            rows={4}
            placeholder="e.g. Convert the detached garage into a 1-bed ADU for my mom. About 600 sqft. Already have rough drawings from an architect."
            style={textareaStyle}
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

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="concerns">
            Anything specific you&apos;re worried about? (optional)
          </label>
          <textarea
            id="concerns"
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            rows={3}
            placeholder="e.g. Last GC ghosted us mid-project. We need someone who'll communicate. Or: not sure if the lot qualifies for an ADU. Or: nervous about going over budget."
            style={textareaStyle}
          />
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
          We don&apos;t sell your info or share it outside the Knowledge
          Gardens team. The GCs we connect you with will only see your
          project details after you say yes to the intro.
        </p>
      </form>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Styles — mirror ArchitectOfRecordClient for visual consistency.
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
  background: disabled ? COLORS.faded : COLORS.green,
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
  background: COLORS.green,
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
