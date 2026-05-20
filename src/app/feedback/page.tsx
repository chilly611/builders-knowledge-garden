'use client';

/**
 * /feedback — contractor handover feedback form (2026-05-20)
 *
 * Single-screen, no auth required. Captures structured input from the early
 * contractor trials kicked off after the May 20 SF investor demo. Inserts
 * directly to public.contractor_feedback via /api/v1/feedback (service-role
 * insert; RLS policy also allows anon insert as belt-and-suspenders).
 *
 * Linked from LegalFooter ("Help us improve") and from /welcome.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Trade = 'gc' | 'specialty' | 'diy' | 'architect' | 'other';

const TRADE_OPTIONS: { value: Trade; label: string }[] = [
  { value: 'gc',        label: 'General contractor' },
  { value: 'specialty', label: 'Specialty trade (electrical, plumbing, HVAC, framing, etc.)' },
  { value: 'diy',       label: 'DIY / owner-builder' },
  { value: 'architect', label: 'Architect or designer' },
  { value: 'other',     label: 'Something else' },
];

const COLORS = {
  paper: '#FAF8F2',
  ink: '#1A1A1A',
  graphite: '#3D3D3D',
  faded: '#B8B5AC',
  rule: '#D8D2C2',
  green: '#1D9E75', // Knowledge Garden chrome
  red: '#E8443A',   // Killer App chrome
  amber: '#C4A44A', // Dream Machine chrome (highlight)
};

export default function FeedbackPage() {
  const [firstName, setFirstName] = useState('');
  const [trade, setTrade] = useState<Trade | ''>('');
  const [projectDescription, setProjectDescription] = useState('');
  const [worked, setWorked] = useState('');
  const [didnt, setDidnt] = useState('');
  const [missing, setMissing] = useState('');
  const [email, setEmail] = useState('');
  const [followUpOk, setFollowUpOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill name + email if the user is signed in.
  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const u = data.user;
        if (!u) return;
        if (u.email) setEmail((prev) => prev || u.email!);
        const metaName = (u.user_metadata as Record<string, unknown> | undefined)?.name;
        if (typeof metaName === 'string') setFirstName((prev) => prev || metaName);
      } catch {
        // Best effort; form still works signed-out.
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
      const res = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          first_name: firstName || null,
          trade: trade || null,
          project_description: projectDescription || null,
          what_worked: worked || null,
          what_didnt: didnt || null,
          what_missing: missing || null,
          email: email || null,
          follow_up_ok: followUpOk,
          source_path: typeof window !== 'undefined' ? window.location.pathname : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Could not save. Try again.');
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
          <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 16, color: COLORS.green }}>—</div>
          <h1 style={h1Style}>Thanks — heard you.</h1>
          <p style={{ ...bodyText, marginTop: 12 }}>
            We read every one of these. If you left an email and said it&apos;s okay to follow up, we&apos;ll be in touch.
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
        <p style={eyebrow}>HANDOVER FEEDBACK</p>
        <h1 style={h1Style}>Tell us what worked. And what didn&apos;t.</h1>
        <p style={{ ...bodyText, marginTop: 12 }}>
          You&apos;re one of the first contractors using this. We want to know what felt useful, what felt rough, and what&apos;s missing. Nothing is required — fill in whatever you have time for.
        </p>

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="firstName">Your first name</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Sam"
            style={inputStyle}
            autoComplete="given-name"
          />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="trade">Your trade or role</label>
          <select
            id="trade"
            value={trade}
            onChange={(e) => setTrade(e.target.value as Trade | '')}
            style={inputStyle}
          >
            <option value="">— select —</option>
            {TRADE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="projectDescription">What project did you try with us?</label>
          <input
            id="projectDescription"
            type="text"
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="e.g. ADU in Oakland, kitchen reno in San Jose"
            style={inputStyle}
          />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="worked">What worked?</label>
          <textarea
            id="worked"
            value={worked}
            onChange={(e) => setWorked(e.target.value)}
            rows={3}
            placeholder="Anything that felt obvious, useful, or saved you time."
            style={textareaStyle}
          />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="didnt">What didn&apos;t?</label>
          <textarea
            id="didnt"
            value={didnt}
            onChange={(e) => setDidnt(e.target.value)}
            rows={3}
            placeholder="Where did you get stuck or frustrated?"
            style={textareaStyle}
          />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="missing">What&apos;s missing that you wish was there?</label>
          <textarea
            id="missing"
            value={missing}
            onChange={(e) => setMissing(e.target.value)}
            rows={3}
            placeholder="The feature that would make this part of your daily kit."
            style={textareaStyle}
          />
        </div>

        <div style={{ ...fieldGroup, borderTop: `1px solid ${COLORS.rule}`, paddingTop: 24 }}>
          <label style={labelStyle} htmlFor="email">Can we follow up?</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@company.com"
            style={inputStyle}
            autoComplete="email"
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 14, color: COLORS.graphite, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={followUpOk}
              onChange={(e) => setFollowUpOk(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: COLORS.red, cursor: 'pointer' }}
            />
            <span>It&apos;s okay to email me with a follow-up question.</span>
          </label>
        </div>

        {error && (
          <div role="alert" style={{
            padding: 12, marginTop: 16, borderRadius: 6,
            background: 'rgba(232, 68, 58, 0.08)',
            color: COLORS.red, fontSize: 14, fontWeight: 600,
          }}>{error}</div>
        )}

        <button type="submit" disabled={submitting} style={submitButton(submitting)}>
          {submitting ? 'Sending…' : 'Send feedback →'}
        </button>

        <p style={{ ...bodyText, fontSize: 13, color: COLORS.faded, marginTop: 16 }}>
          We don&apos;t share this with anyone outside the team. We use it to figure out what to build next.
        </p>
      </form>
    </main>
  );
}

// — Styles —
const pageWrap: React.CSSProperties = {
  minHeight: '100vh',
  background: COLORS.paper,
  padding: '64px 24px',
  fontFamily: "var(--font-archivo, 'Archivo', sans-serif)",
  color: COLORS.ink,
};

const card: React.CSSProperties = {
  maxWidth: 640,
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
  color: COLORS.amber,
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
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 80,
  lineHeight: 1.5,
};

const submitButton = (disabled: boolean): React.CSSProperties => ({
  marginTop: 28,
  width: '100%',
  padding: '14px 20px',
  fontSize: 16,
  fontWeight: 700,
  fontFamily: 'inherit',
  background: disabled ? COLORS.faded : COLORS.red,
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
  background: COLORS.red,
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
