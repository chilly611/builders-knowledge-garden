'use client';

// Builder's Knowledge Garden — VoiceTone (Brief 2)
//
// Three-chip tone selector: Warm / Professional / Brief. Tapping a chip
// fires onChange. Selected chip wears a brass border + brass-tinted fill.

const BRASS = '#B6873A';
const INK = '#1A1A1A';
const PAPER = '#FFFDF7';
const GRAPHITE = '#2E2E30';

type Tone = 'warm' | 'professional' | 'brief';

interface VoiceToneProps {
  value?: Tone;
  onChange: (tone: Tone) => void;
  disabled?: boolean;
}

const OPTIONS: Array<{ tone: Tone; label: string; hint: string }> = [
  { tone: 'warm', label: 'Warm', hint: 'friendly + signoff' },
  { tone: 'professional', label: 'Professional', hint: 'full sentences' },
  { tone: 'brief', label: 'Brief', hint: 'yes/no + one detail' },
];

export default function VoiceTone({
  value = 'warm',
  onChange,
  disabled = false,
}: VoiceToneProps) {
  return (
    <div
      role="radiogroup"
      aria-label="reply tone"
      style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      {OPTIONS.map((opt) => {
        const selected = opt.tone === value;
        return (
          <button
            key={opt.tone}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${opt.label} — ${opt.hint}`}
            onClick={() => !disabled && onChange(opt.tone)}
            disabled={disabled}
            style={{
              background: selected ? '#FFF1D6' : PAPER,
              color: selected ? INK : GRAPHITE,
              border: `1px solid ${selected ? BRASS : '#D9D2BC'}`,
              borderRadius: 999,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: selected ? 700 : 500,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              transition: 'background 120ms ease, border-color 120ms ease',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
