'use client';

/**
 * /accept-invite/[token] — invitee landing page.
 *
 * Flow:
 *   1. Read the token from route params.
 *   2. Hit GET /api/v1/orgs/accept-invite?token=… for a preview
 *      (org name, role, invited email, status, expiry). No auth
 *      required for the preview — the token itself is the credential.
 *   3. If the invite is bad (not found, expired, accepted, revoked)
 *      show an error state.
 *   4. If the user is NOT signed in: redirect to
 *      /signup?invite_email=<email>&invite_token=<token>.
 *   5. If the user IS signed in but with the wrong email: tell them
 *      to sign out and sign back in as the invited address.
 *   6. If signed in with the right email: show "Accept invitation to
 *      [org name] as [role]" + a button. On click POST to
 *      /api/v1/orgs/accept-invite, then redirect to
 *      /killerapp?org=<org_id>.
 *
 * IMPORTANT: we keep this a client component because the supabase
 * session lives in the browser. The server preview API is intentionally
 * read-only.
 *
 * RISK CALLOUT — referrer leakage: the token is in the URL, so the
 * browser may include it in Referer headers when the user clicks any
 * outbound link on this page. The page therefore contains NO outbound
 * links during the accept flow, and the document `meta` sets
 * referrer="no-referrer" so any future link additions don't quietly
 * leak the token.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface InvitePreview {
  email: string;
  org_name: string;
  role: string;
  status: string;
  expires_at: string;
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'bad'; reason: string }
  | { kind: 'need-signin'; preview: InvitePreview; token: string }
  | { kind: 'wrong-email'; preview: InvitePreview; signedInAs: string }
  | { kind: 'ready'; preview: InvitePreview; token: string }
  | { kind: 'accepting' }
  | { kind: 'accept-error'; message: string };

function formatExpiry(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = typeof params?.token === 'string' ? params.token : '';
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  // Defense in depth: tell the browser not to leak the token via Referer.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let meta = document.querySelector('meta[name="referrer"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'referrer');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'no-referrer');
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token || !/^[0-9a-f]{64}$/i.test(token)) {
        setPhase({ kind: 'bad', reason: 'invalid_token' });
        return;
      }

      // 1) Preview.
      let preview: InvitePreview;
      try {
        const res = await fetch(
          `/api/v1/orgs/accept-invite?token=${encodeURIComponent(token)}`,
          { cache: 'no-store' },
        );
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          if (cancelled) return;
          setPhase({ kind: 'bad', reason: j.error || `http_${res.status}` });
          return;
        }
        preview = (await res.json()) as InvitePreview;
      } catch {
        if (cancelled) return;
        setPhase({ kind: 'bad', reason: 'network_error' });
        return;
      }
      if (cancelled) return;

      // 2) Gate on status/expiry.
      if (preview.status === 'accepted') {
        setPhase({ kind: 'bad', reason: 'already_accepted' });
        return;
      }
      if (preview.status === 'revoked') {
        setPhase({ kind: 'bad', reason: 'revoked' });
        return;
      }
      if (
        preview.status === 'expired' ||
        new Date(preview.expires_at).getTime() < Date.now()
      ) {
        setPhase({ kind: 'bad', reason: 'expired' });
        return;
      }

      // 3) Auth state.
      const { data } = await supabase.auth.getUser();
      const signedInEmail = data.user?.email?.trim().toLowerCase() || '';
      const inviteEmail = preview.email.trim().toLowerCase();

      if (!signedInEmail) {
        // Not signed in — push them to signup with the token + email
        // pre-filled.
        const qs = new URLSearchParams({
          invite_email: preview.email,
          invite_token: token,
        });
        router.replace(`/signup?${qs.toString()}`);
        setPhase({ kind: 'need-signin', preview, token });
        return;
      }

      if (signedInEmail !== inviteEmail) {
        setPhase({ kind: 'wrong-email', preview, signedInAs: signedInEmail });
        return;
      }

      setPhase({ kind: 'ready', preview, token });
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  async function onAccept() {
    if (phase.kind !== 'ready') return;
    setPhase({ kind: 'accepting' });
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) {
        setPhase({
          kind: 'accept-error',
          message: 'You appear to be signed out. Refresh and try again.',
        });
        return;
      }
      const res = await fetch('/api/v1/orgs/accept-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        org_id?: string;
        error?: string;
      };
      if (!res.ok || !j.ok || !j.org_id) {
        setPhase({
          kind: 'accept-error',
          message: j.error || `Acceptance failed (HTTP ${res.status}).`,
        });
        return;
      }
      router.push(`/killerapp?org=${encodeURIComponent(j.org_id)}`);
    } catch (err) {
      setPhase({
        kind: 'accept-error',
        message:
          err instanceof Error ? err.message : 'Acceptance failed.',
      });
    }
  }

  // ---------- render ----------

  const card: React.CSSProperties = {
    width: '100%',
    maxWidth: 460,
    background: '#ffffff',
    border: '1px solid var(--border, #e5e5e5)',
    borderRadius: 'var(--radius-lg, 12px)',
    padding: '40px 32px',
    boxShadow: 'var(--shadow-lg, 0 10px 30px rgba(0,0,0,0.08))',
    fontFamily: 'var(--font-archivo, system-ui)',
    color: 'var(--fg, #1F2937)',
  };
  const page: React.CSSProperties = {
    minHeight: '100vh',
    background: 'var(--bg, #f9fafb)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  };
  const heading: React.CSSProperties = { margin: '0 0 12px', fontSize: 22, fontWeight: 700 };
  const sub: React.CSSProperties = {
    margin: '0 0 24px',
    fontSize: 14,
    color: 'var(--fg-secondary, #555)',
    lineHeight: 1.5,
  };
  const button: React.CSSProperties = {
    width: '100%',
    padding: 12,
    background: '#1D9E75',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md, 8px)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  };
  const muted: React.CSSProperties = {
    fontSize: 12,
    color: '#888',
    marginTop: 12,
  };

  if (phase.kind === 'loading' || phase.kind === 'need-signin') {
    return (
      <div style={page}>
        <div style={card}>
          <h1 style={heading}>Loading invitation…</h1>
          <p style={sub}>One moment.</p>
        </div>
      </div>
    );
  }

  if (phase.kind === 'bad') {
    const reasonText: Record<string, string> = {
      not_found: "We couldn't find that invitation. It may have been deleted.",
      expired: 'This invitation has expired. Ask the person who invited you for a new one.',
      already_accepted: 'This invitation has already been accepted.',
      revoked: 'This invitation was revoked by an admin.',
      invalid_token: 'That invite link looks wrong.',
      network_error: 'We couldn\'t reach the server. Check your connection and try again.',
    };
    return (
      <div style={page}>
        <div style={card}>
          <h1 style={heading}>Invitation unavailable</h1>
          <p style={sub}>{reasonText[phase.reason] || `Something went wrong (${phase.reason}).`}</p>
        </div>
      </div>
    );
  }

  if (phase.kind === 'wrong-email') {
    return (
      <div style={page}>
        <div style={card}>
          <h1 style={heading}>Signed in as the wrong account</h1>
          <p style={sub}>
            This invitation was sent to <strong>{phase.preview.email}</strong>, but
            you're signed in as <strong>{phase.signedInAs}</strong>. Sign out and
            sign back in with the invited email to continue.
          </p>
          <button
            type="button"
            style={button}
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace(
                `/login?next=${encodeURIComponent(`/accept-invite/${token}`)}`,
              );
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (phase.kind === 'ready') {
    return (
      <div style={page}>
        <div style={card}>
          <h1 style={heading}>You're invited to {phase.preview.org_name}</h1>
          <p style={sub}>
            You'll join as a <strong>{phase.preview.role}</strong> and see the
            same projects, vendors, and budget lines as the rest of the team.
            This invitation expires on <strong>{formatExpiry(phase.preview.expires_at)}</strong>.
          </p>
          <button type="button" style={button} onClick={onAccept}>
            Accept invitation
          </button>
          <p style={muted}>
            Signed in as {phase.preview.email}. If that's not you, sign out first.
          </p>
        </div>
      </div>
    );
  }

  if (phase.kind === 'accepting') {
    return (
      <div style={page}>
        <div style={card}>
          <h1 style={heading}>Joining…</h1>
          <p style={sub}>Adding you to the team. One moment.</p>
        </div>
      </div>
    );
  }

  if (phase.kind === 'accept-error') {
    return (
      <div style={page}>
        <div style={card}>
          <h1 style={heading}>Couldn't accept invitation</h1>
          <p style={sub}>{phase.message}</p>
          <button
            type="button"
            style={button}
            onClick={() => router.refresh()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
