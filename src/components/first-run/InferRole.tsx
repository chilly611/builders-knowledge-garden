'use client';

/**
 * InferRole — first-run Principle #4 (docs/first-run-and-onboarding.md):
 * "Infer the role, confirm in one tap. Echo the user's exact words back
 *  unedited; present a single inferred role as the bright pre-selected card
 *  with the alternate visible but recessive; rationale is one whisper line;
 *  switching is instant and non-punishing. Owner voice = outcomes/cost/
 *  timeline/look; contractor voice = working-docs/compliance/lifecycle. Same
 *  engine, copy swaps only."
 *
 * v1 ships Owner + GC (the beachhead). The mechanism is data-driven, so it
 * extends to the nine-lane canon without redesign — roles are rows, not code.
 * Obeys the herbarium lock (parchment ground, sepia ink, one brass accent,
 * Archivo — no #E8443A, no pure white, no emoji in chrome), one-thing-brightest
 * (the selected role card), reduced-motion, and Goal-8 (a machine twin so a
 * headless agent can confirm the same role).
 */

import { useState, useCallback, useEffect, useId, useRef } from 'react';

export type FirstRunRole = 'owner' | 'gc';

export interface RoleOption {
  key: FirstRunRole;
  /** Plain-language identity, first person — no garden-speak. */
  label: string;
  /** One plain line naming the voice this role gets downstream. */
  voice: string;
}

export const ROLE_OPTIONS: Record<FirstRunRole, RoleOption> = {
  owner: {
    key: 'owner',
    label: "I'm planning my own project",
    voice: 'Outcomes, cost, timeline, and how it looks — in plain language.',
  },
  gc: {
    key: 'gc',
    label: 'I build for clients',
    voice: 'Working docs, compliance, and the job lifecycle — the pro view.',
  },
};

/**
 * Infer Owner vs GC from the user's own words. A transparent keyword read, not
 * a model call — the user confirms or flips in one tap, so a wrong guess costs
 * nothing. Bidding / estimating / for-a-client language reads as GC; everything
 * else (including dreamer voice) reads as an owner planning a project.
 */
export function inferRole(intent: string | undefined | null): FirstRunRole {
  const t = (intent ?? '').toLowerCase();
  if (!t.trim()) return 'owner';
  const gcSignals = [
    'bid', 'estimat', 'for a client', 'for my client', 'for our client', 'my crew',
    'subcontract', 'sub out', 'takeoff', 'take-off', 'rfp', 'scope of work',
    'change order', 'draw schedule', 'jobsite', 'job site', 'win the', 'price the',
    'price a', 'pricing for', 'proposal for', 'walk the job', 'the bid',
  ];
  return gcSignals.some((s) => t.includes(s)) ? 'gc' : 'owner';
}

const PROMPT = 'Who am I helping?';

export interface InferRoleProps {
  /** The user's exact words from The One Door — echoed back unedited. */
  intent?: string;
  /** Confirm/continue with the selected role. */
  onConfirm: (role: FirstRunRole) => void;
  /** Disable while the handoff is in flight (routing). */
  busy?: boolean;
}

export default function InferRole({ intent, onConfirm, busy = false }: InferRoleProps) {
  const inferred = inferRole(intent);
  const [selected, setSelected] = useState<FirstRunRole>(inferred);
  const touched = useRef(false);
  const twinId = useId();

  // `intent` arrives from sessionStorage in a client effect, so the FIRST
  // render infers from an empty string (→ owner). Once the real words load and
  // the inference settles, follow it — unless the user has already picked, in
  // which case their choice wins (non-punishing switch, Principle #4).
  useEffect(() => {
    if (!touched.current) setSelected(inferred);
  }, [inferred]);

  const choose = useCallback((role: FirstRunRole) => {
    touched.current = true;
    setSelected(role);
  }, []);

  const rationale =
    inferred === 'gc'
      ? 'Your words sound like bidding or building for a client.'
      : 'Your words sound like planning your own project.';

  // Goal 8 — the machine twin: the same role-read, structured for an agent.
  const machineTwin = {
    type: 'first_run_role',
    echo: intent ?? null,
    inferred,
    options: Object.values(ROLE_OPTIONS).map((r) => ({ key: r.key, label: r.label, voice: r.voice })),
    action: { method: 'confirm', selected, switchable: true },
  };

  const confirm = useCallback(() => {
    if (busy) return;
    onConfirm(selected);
  }, [onConfirm, selected, busy]);

  // Inferred card first (bright, pre-selected); the alternate second (recessive).
  const ordered: FirstRunRole[] = inferred === 'owner' ? ['owner', 'gc'] : ['gc', 'owner'];

  return (
    <main
      data-machine="first_run_role"
      style={{
        minHeight: '100vh',
        background: 'var(--bp-paper-cream, var(--bg, #FAF8F2))',
        color: 'var(--ink, var(--fg, #1A1A1A))',
        fontFamily: 'var(--font-archivo), system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <script
        type="application/json"
        data-machine-twin="first_run_role"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(machineTwin) }}
      />

      <div style={{ width: '100%', maxWidth: 640 }} className="bkg-role">
        <p
          style={{
            margin: '0 0 14px',
            fontSize: 12,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--fg-tertiary, #8A8478)',
            fontFamily: 'var(--bp-font-mono, ui-monospace, monospace)',
          }}
        >
          Builder's Knowledge Garden
        </p>

        {/* Echo the user's exact words back, unedited (Principle #4). */}
        {intent ? (
          <p
            data-machine-echo
            style={{ margin: '0 0 8px', fontSize: 16, color: 'var(--fg-secondary, #4A463E)' }}
          >
            You said: <span style={{ fontStyle: 'italic' }}>&ldquo;{intent}&rdquo;</span>
          </p>
        ) : null}

        <h1 id={`${twinId}-prompt`} style={{ margin: '0 0 20px', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, lineHeight: 1.14 }}>
          {PROMPT}
        </h1>

        <div role="radiogroup" aria-labelledby={`${twinId}-prompt`} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ordered.map((key) => {
            const opt = ROLE_OPTIONS[key];
            const isSelected = selected === key;
            const isInferred = inferred === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-machine-role={key}
                data-inferred={isInferred ? 'true' : 'false'}
                disabled={busy}
                onClick={() => choose(key)}
                className={`bkg-role-card${isSelected ? ' is-selected' : ''}`}
                style={{
                  textAlign: 'left',
                  border: `1.5px solid ${isSelected ? 'var(--brass, #9A6A2F)' : 'var(--border, #D8D2C2)'}`,
                  background: isSelected ? 'var(--bp-paper-white, #FFFDF7)' : 'transparent',
                  borderRadius: 'var(--radius-lg, 14px)',
                  padding: '16px 18px',
                  cursor: busy ? 'default' : 'pointer',
                  opacity: isSelected ? 1 : 0.72,
                  transition: 'border-color 0.18s ease, opacity 0.18s ease, background 0.18s ease',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink, #1A1A1A)' }}>{opt.label}</span>
                  <span
                    aria-hidden
                    style={{
                      fontSize: 12,
                      fontFamily: 'var(--bp-font-mono, ui-monospace, monospace)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: isSelected ? 'var(--brass, #9A6A2F)' : 'var(--fg-tertiary, #8A8478)',
                    }}
                  >
                    {isSelected ? 'Selected' : 'Switch'}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--fg-secondary, #4A463E)', lineHeight: 1.5 }}>
                  {opt.voice}
                </p>
                {isInferred ? (
                  <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--fg-tertiary, #8A8478)', fontStyle: 'italic' }}>
                    {rationale} You can switch — it costs nothing.
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          data-machine-action="confirm"
          disabled={busy}
          onClick={confirm}
          className="bkg-role-continue"
          style={{
            marginTop: 20,
            border: 'none',
            borderRadius: 'var(--radius-lg, 14px)',
            padding: '14px 26px',
            fontSize: 16,
            fontWeight: 600,
            fontFamily: 'inherit',
            color: 'var(--bp-paper-white, #FFFDF7)',
            background: 'var(--brass, #9A6A2F)',
            cursor: busy ? 'default' : 'pointer',
            transition: 'transform 0.18s ease, opacity 0.18s ease',
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? 'Opening…' : 'Continue →'}
        </button>
      </div>

      <style jsx>{`
        .bkg-role {
          animation: bkg-role-in 0.5s ease both;
        }
        .bkg-role-card:hover:not(:disabled):not(.is-selected) {
          border-color: var(--brass, #9a6a2f);
          opacity: 0.92;
        }
        .bkg-role-continue:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        @keyframes bkg-role-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .bkg-role {
            animation: none;
          }
          .bkg-role-card,
          .bkg-role-continue {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}
