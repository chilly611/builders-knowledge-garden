'use client';

/**
 * OnboardingModal — first-run experience for ONBOARDING-V1 (2026-05-22).
 *
 * Drives the 4-step "welcome → project → invite → contract" flow that
 * lands a brand-new GC at a drafted contract within ~3 minutes. State
 * lives in `user_metadata.onboarding` (see `src/lib/onboarding-state.ts`)
 * so a reload picks up exactly where the user left off — no localStorage,
 * no Zustand, no separate table.
 *
 * Mount contract (see /killerapp/page.tsx & layout):
 *   - Only renders when ALL of the following are true:
 *       1. user is signed in
 *       2. `effectiveLane` ∈ {gc, owner}  ← DIY has its own wizard
 *       3. EITHER url has ?first_run=1 OR onboarding.step !== 'completed'
 *       4. onboarding.step ≠ 'completed'
 *   - First-time render sets step='welcome' + started_at if missing.
 *
 * Skip semantics: any "Skip" button or the X chip jumps to
 * step='completed' and persists. The cron-reminder loop will then
 * stop bothering them — and the modal won't re-appear.
 *
 * NB: this is intentionally framework-light (no framer-motion) to
 * keep first-paint snappy on the picker. The transitions are CSS.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUserLane } from '@/lib/use-user-lane';
import {
  freshState,
  getOnboardingFromUser,
  isCompleted,
  setOnboardingStep,
  type OnboardingState,
  type OnboardingStep,
} from '@/lib/onboarding-state';
import type { User } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────

// The demo Marin farmhouse (canonical seeded project). Matches the
// allowlist in /api/v1/projects/route.ts so the modal's "Use the demo"
// button always lands on something real for trial accounts.
const DEMO_PROJECT_ID = '55730cd3-5225-493d-8b5c-49086d942565';

const GC_LANES = new Set(['gc', 'owner']);

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

export default function OnboardingModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firstRunParam = searchParams?.get('first_run') === '1';
  const { effectiveLane, loading: laneLoading } = useUserLane();

  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [busy, setBusy] = useState(false);

  // 1) Load the current user once, then subscribe to auth changes.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(data.user ?? null);
      setState(getOnboardingFromUser(data.user));
      setBootstrapped(true);
    }
    void load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setState(getOnboardingFromUser(u));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 2) When the user lands with ?first_run=1 and we have no state yet,
  //    bootstrap to step='welcome' and stamp started_at.
  useEffect(() => {
    if (!bootstrapped || !user) return;
    if (state) return;
    if (!firstRunParam) return; // don't auto-start unless the URL says so
    if (!GC_LANES.has(effectiveLane)) return;

    void (async () => {
      const initial = freshState();
      const next = await setOnboardingStep(supabase, initial.step);
      setState(next ?? initial);
    })();
  }, [bootstrapped, user, state, firstRunParam, effectiveLane]);

  const visible = useMemo(() => {
    if (!bootstrapped) return false;
    if (!user) return false;
    if (laneLoading) return false;
    if (!GC_LANES.has(effectiveLane)) return false;
    if (!state) return false;
    if (isCompleted(state)) return false;
    return true;
  }, [bootstrapped, user, laneLoading, effectiveLane, state]);

  // ─────────────────────────────────────────────────────────────────
  // Step-advance helpers
  // ─────────────────────────────────────────────────────────────────

  const advance = useCallback(
    async (next: OnboardingStep) => {
      if (busy) return;
      setBusy(true);
      const updated = await setOnboardingStep(supabase, next);
      setState(updated ?? null);
      setBusy(false);
    },
    [busy],
  );

  const complete = useCallback(async () => {
    await advance('completed');
  }, [advance]);

  if (!visible || !state) return null;

  // ─────────────────────────────────────────────────────────────────
  // Render — step routing
  // ─────────────────────────────────────────────────────────────────

  return (
    <Backdrop>
      <Card>
        <SkipChip onSkip={complete} disabled={busy} />

        {state.step === 'welcome' && (
          <StepWelcome
            onNext={() => advance('project_created')}
            busy={busy}
          />
        )}

        {state.step === 'project_created' && (
          <StepProject
            onUseDemo={async () => {
              await advance('sub_invited');
              router.push(`/killerapp?project=${DEMO_PROJECT_ID}`);
            }}
            onCreateReal={async () => {
              await advance('sub_invited');
              router.push('/killerapp/projects?new=1');
            }}
            busy={busy}
          />
        )}

        {state.step === 'sub_invited' && (
          <StepInvite
            onDone={() => advance('contract_drafted')}
            onSkip={() => advance('contract_drafted')}
            busy={busy}
          />
        )}

        {state.step === 'contract_drafted' && (
          <StepContract
            onGo={async () => {
              await complete();
              router.push('/killerapp/workflows/contract-templates?template=ca-hic');
            }}
            onSkip={complete}
            busy={busy}
          />
        )}
      </Card>
    </Backdrop>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Layout primitives (kept inline so the modal is self-contained)
// ─────────────────────────────────────────────────────────────────────

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Builder's Knowledge Garden"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9990,
        background: 'rgba(20, 18, 12, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--paper, #FAFAF8)',
        color: 'var(--graphite, #1F2937)',
        borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        width: '100%',
        maxWidth: 520,
        padding: '28px 28px 24px',
        fontFamily: 'var(--font-archivo, system-ui, sans-serif)',
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
}

function SkipChip({ onSkip, disabled }: { onSkip: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onSkip}
      disabled={disabled}
      aria-label="Skip onboarding"
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'wait' : 'pointer',
        fontSize: 12,
        color: 'var(--graphite, #1F2937)',
        opacity: 0.55,
        padding: '4px 8px',
      }}
    >
      Skip ×
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: '#1D9E75',
        color: '#fff',
        border: 'none',
        padding: '10px 18px',
        borderRadius: 6,
        fontWeight: 600,
        fontSize: 14,
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        color: 'var(--graphite, #1F2937)',
        border: '1px solid rgba(0,0,0,0.15)',
        padding: '10px 18px',
        borderRadius: 6,
        fontWeight: 500,
        fontSize: 14,
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function StepHeader({ idx, title }: { idx: number; title: string }) {
  return (
    <>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: 'var(--graphite, #1F2937)',
          opacity: 0.55,
          marginBottom: 6,
        }}
      >
        Step {idx} of 4
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.25 }}>
        {title}
      </h2>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step 1: Welcome
// ─────────────────────────────────────────────────────────────────────

function StepWelcome({ onNext, busy }: { onNext: () => void; busy: boolean }) {
  return (
    <>
      <StepHeader idx={1} title="Welcome to Builder's Garden — let's set you up in 3 minutes." />
      <ul style={{ paddingLeft: 18, margin: '0 0 20px', lineHeight: 1.55, fontSize: 14 }}>
        <li>Your demo project is ready — explore freely before touching real data.</li>
        <li>Try these 3 things to see what&rsquo;s possible: pick a project, invite a teammate, draft a contract.</li>
      </ul>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <PrimaryButton onClick={onNext} disabled={busy}>Got it →</PrimaryButton>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step 2: Project
// ─────────────────────────────────────────────────────────────────────

function StepProject({
  onUseDemo,
  onCreateReal,
  busy,
}: {
  onUseDemo: () => void;
  onCreateReal: () => void;
  busy: boolean;
}) {
  return (
    <>
      <StepHeader idx={2} title="Pick a project" />
      <p style={{ fontSize: 14, lineHeight: 1.5, margin: '0 0 18px', opacity: 0.85 }}>
        Either explore the demo Marin farmhouse or create your real project. You can
        always switch later.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onUseDemo}
          disabled={busy}
          style={projectChoiceStyle}
        >
          <strong>Use the demo Marin project</strong>
          <span style={{ fontSize: 12, opacity: 0.7, display: 'block', marginTop: 4 }}>
            Pre-seeded budget, schedule, RFIs — safe to click around.
          </span>
        </button>
        <button
          onClick={onCreateReal}
          disabled={busy}
          style={projectChoiceStyle}
        >
          <strong>Create my real project</strong>
          <span style={{ fontSize: 12, opacity: 0.7, display: 'block', marginTop: 4 }}>
            Name + address + type + square footage. Two minutes.
          </span>
        </button>
      </div>
    </>
  );
}

const projectChoiceStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '14px 16px',
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.12)',
  background: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: 'inherit',
  fontSize: 14,
};

// ─────────────────────────────────────────────────────────────────────
// Step 3: Invite
// ─────────────────────────────────────────────────────────────────────

function StepInvite({
  onDone,
  onSkip,
  busy,
}: {
  onDone: () => void;
  onSkip: () => void;
  busy: boolean;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin' | 'owner'>('member');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      // Best-effort: org_members + Resend invite. The endpoint silently
      // no-ops if RESEND_API_KEY is unset (the email is a courtesy, the
      // database write is the system of record).
      await fetch('/api/v1/orgs/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      }).catch(() => null);
      onDone();
    } catch {
      // Best-effort — still advance so we don't trap them.
      onDone();
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <StepHeader idx={3} title="Invite a teammate" />
      <p style={{ fontSize: 14, lineHeight: 1.5, margin: '0 0 14px', opacity: 0.85 }}>
        Add a sub, foreman, or project manager. They&rsquo;ll get a magic-link invite.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          style={inputStyle}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'member' | 'admin' | 'owner')}
          style={inputStyle}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
        {error && <div style={{ color: '#E8443A', fontSize: 12 }}>{error}</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <SecondaryButton onClick={onSkip} disabled={busy || sending}>
          Skip for now
        </SecondaryButton>
        <PrimaryButton onClick={send} disabled={busy || sending}>
          {sending ? 'Sending…' : 'Send invite →'}
        </PrimaryButton>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 6,
  border: '1px solid rgba(0,0,0,0.18)',
  fontSize: 14,
  background: '#fff',
  fontFamily: 'inherit',
};

// ─────────────────────────────────────────────────────────────────────
// Step 4: Contract
// ─────────────────────────────────────────────────────────────────────

function StepContract({
  onGo,
  onSkip,
  busy,
}: {
  onGo: () => void;
  onSkip: () => void;
  busy: boolean;
}) {
  return (
    <>
      <StepHeader idx={4} title="Draft your first contract" />
      <p style={{ fontSize: 14, lineHeight: 1.5, margin: '0 0 8px', opacity: 0.85 }}>
        We&rsquo;ll load the default California Home Improvement Contract template — fill in
        the parties and scope, and you&rsquo;ll have a draft in under a minute.
      </p>
      <p style={{ fontSize: 12, lineHeight: 1.5, margin: '0 0 18px', opacity: 0.65, fontStyle: 'italic' }}>
        Don&rsquo;t worry — every contract has a &ldquo;DRAFT&rdquo; watermark until you say it&rsquo;s final.
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <SecondaryButton onClick={onSkip} disabled={busy}>
          Skip
        </SecondaryButton>
        <PrimaryButton onClick={onGo} disabled={busy}>
          Open contract template →
        </PrimaryButton>
      </div>
    </>
  );
}
