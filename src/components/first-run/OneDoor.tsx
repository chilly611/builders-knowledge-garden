'use client';

/**
 * The One Door — first-run Principle #1 (docs/first-run-and-onboarding.md).
 *
 * "A single plain-language input ('What do you want to build — or get done?')
 *  with 3–5 example chips. No competing CTAs, no sidebar, no floating buttons.
 *  Empty submit is blocked silently; chips are always a valid path forward.
 *  Chips span the lanes — a dreamer ('a treehouse for my kids') sees themselves
 *  in five seconds alongside the GC ('Bid the Twin Peaks remodel')."
 *
 * This is the cold user's first move. It re-houses the proven engine behind a
 * simpler front (Principle #7) — presentational only; `onSubmit` hands the
 * user's exact words to the existing flow. It obeys: plain words (no
 * garden-speak), one-thing-brightest (the field is the only bright element),
 * the herbarium lock (parchment ground, sepia ink, one brass accent, Archivo —
 * no #E8443A, no pure white, no emoji in chrome), and reduced-motion.
 *
 * Goal 8 (machine twins): a structured-data twin is emitted as a JSON <script>
 * and mirrored on data-* attributes so a headless agent can traverse the same
 * door — the spec makes this a binding requirement on every first-run screen.
 */

import { useState, useCallback, useId } from 'react';

export interface OneDoorChip {
  /** The exact words submitted when the chip is tapped. */
  text: string;
  /** Which lane the example evokes — for the machine twin, not shown as chrome. */
  lane: 'dreamer' | 'owner' | 'gc';
}

/**
 * Lane-spanning examples (Principle #1: "a dreamer sees themselves in five
 * seconds alongside the GC"). Plain words only.
 */
export const DEFAULT_CHIPS: OneDoorChip[] = [
  { text: 'A treehouse for my kids', lane: 'dreamer' },
  { text: 'Add an ADU in the backyard', lane: 'owner' },
  { text: 'Plan a kitchen remodel', lane: 'owner' },
  { text: 'Bid the Twin Peaks remodel', lane: 'gc' },
  { text: 'Price a new custom home', lane: 'gc' },
];

const PROMPT = 'What do you want to build — or get done?';

export interface OneDoorProps {
  /** Receives the user's exact words (field text or a tapped chip). */
  onSubmit: (text: string) => void;
  chips?: OneDoorChip[];
  /** Disable interaction while the handoff is in flight (e.g. routing). */
  busy?: boolean;
}

export default function OneDoor({ onSubmit, chips = DEFAULT_CHIPS, busy = false }: OneDoorProps) {
  const [value, setValue] = useState('');
  const twinId = useId();
  const canSubmit = value.trim().length > 0 && !busy;

  const submit = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || busy) return; // empty submit blocked silently — no error shout
      onSubmit(t);
    },
    [onSubmit, busy]
  );

  // Goal 8 — the machine twin: the same door, structured for an agent.
  const machineTwin = {
    type: 'first_run_door',
    prompt: PROMPT,
    action: { method: 'submit', accepts: 'free_text', empty_blocked: true },
    chips: chips.map((c) => ({ text: c.text, lane: c.lane })),
  };

  return (
    <main
      data-machine="first_run_door"
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
      {/* Machine twin (Goal 8) — traversable structured data for a headless agent. */}
      <script
        type="application/json"
        data-machine-twin="first_run_door"
        // The flow's binding requirement: every first-run screen exposes a twin.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(machineTwin) }}
      />

      <div style={{ width: '100%', maxWidth: 640 }} className="bkg-onedoor">
        {/* Quiet brand whisper — recedes to paper; the field is the bright thing. */}
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

        {/* One thing brightest: the prompt + field. */}
        <h1
          id={`${twinId}-prompt`}
          style={{ margin: '0 0 20px', fontSize: 'clamp(26px, 4.5vw, 40px)', fontWeight: 700, lineHeight: 1.12 }}
        >
          {PROMPT}
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(value);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div
            className="bkg-onedoor-field"
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'stretch',
              background: 'var(--bp-paper-white, #FFFDF7)',
              border: '1.5px solid var(--border, #D8D2C2)',
              borderRadius: 'var(--radius-lg, 14px)',
              padding: 6,
              boxShadow: '0 1px 0 var(--paper-edge, rgba(0,0,0,0.04))',
            }}
          >
            <input
              aria-labelledby={`${twinId}-prompt`}
              data-machine-field="intent"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={busy}
              placeholder="Tell me in your own words…"
              autoFocus
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                padding: '14px 14px',
                fontSize: 17,
                fontFamily: 'inherit',
                color: 'var(--ink, #1A1A1A)',
              }}
            />
            <button
              type="submit"
              data-machine-action="submit"
              disabled={!canSubmit}
              aria-label="Start"
              style={{
                border: 'none',
                borderRadius: 'calc(var(--radius-lg, 14px) - 4px)',
                padding: '0 22px',
                fontSize: 16,
                fontWeight: 600,
                fontFamily: 'inherit',
                color: 'var(--bp-paper-white, #FFFDF7)',
                background: canSubmit ? 'var(--brass, #9A6A2F)' : 'var(--border, #D8D2C2)',
                cursor: canSubmit ? 'pointer' : 'default',
                transition: 'background 0.18s ease, transform 0.18s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {busy ? 'Opening…' : 'Start →'}
            </button>
          </div>

          {/* Example chips — always a valid path forward; span the lanes. */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} aria-label="Examples">
            {chips.map((chip) => (
              <button
                key={chip.text}
                type="button"
                data-machine-chip={chip.lane}
                disabled={busy}
                onClick={() => submit(chip.text)}
                className="bkg-onedoor-chip"
                style={{
                  border: '1px solid var(--border, #D8D2C2)',
                  background: 'transparent',
                  color: 'var(--fg-secondary, #4A463E)',
                  borderRadius: 999,
                  padding: '7px 14px',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  cursor: busy ? 'default' : 'pointer',
                  transition: 'border-color 0.18s ease, color 0.18s ease, background 0.18s ease',
                }}
              >
                {chip.text}
              </button>
            ))}
          </div>
        </form>
      </div>

      <style jsx>{`
        .bkg-onedoor {
          animation: bkg-onedoor-in 0.5s ease both;
        }
        .bkg-onedoor-field:focus-within {
          border-color: var(--brass, #9a6a2f);
        }
        .bkg-onedoor-chip:hover:not(:disabled) {
          border-color: var(--brass, #9a6a2f);
          color: var(--ink, #1a1a1a);
          background: var(--bp-paper-white, #fffdf7);
        }
        @keyframes bkg-onedoor-in {
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
          .bkg-onedoor {
            animation: none;
          }
          .bkg-onedoor-chip,
          .bkg-onedoor-field :global(button) {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}
