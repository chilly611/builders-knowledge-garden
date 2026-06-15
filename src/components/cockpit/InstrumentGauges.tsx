'use client';

/**
 * InstrumentGauges — Killer App "This week's instruments" (Fidelity spec B3).
 *
 * Three analog dials with brass herbarium bezels — the signature "wow," and
 * Decision 19 (Legible Judgment) made physical: the needle position AND the
 * green/amber/rust face tier ARE the flag.
 *
 * HONESTY (spec B3 + "no hallucinated readings"): every needle is data-driven
 * from existing hooks, never a fake value. A metric with no data shows an
 * explicit "no signal yet" face — it does not invent a reading.
 *   - Budget burn  → useStageProject().budgetSpent / budgetTotal (real).
 *   - On schedule  → useShellConfig().journey progress vs weeks-elapsed
 *                    (real when a schedule exists; else "no signal yet").
 *   - Quality      → no rollup exists yet → "no signal yet" (honest), wired
 *                    when a quality/flag rollup lands.
 *
 * Tokens only (no raw hex outside the few legible-text shades the design
 * system itself uses); reduced-motion → needle static at its value, no sweep.
 */

import { useEffect, useId, useState } from 'react';
import { useStageProject } from '@/lib/hooks/useStageProject';
import { useShellConfig } from '@/components/app-shell/ShellConfigContext';
import { useProjectLedger } from '@/components/app-shell/useProjectLedger';

type Tier = 'sage' | 'amber' | 'rust' | 'none';

const TIER_VAR: Record<Exclude<Tier, 'none'>, string> = {
  sage: 'var(--specimen-sage)',
  amber: 'var(--specimen-brass)', // warm-ochre "watch"
  rust: 'var(--specimen-rust)',
};

const MIN_DEG = -120; // needle angle (from straight-up) at value 0
const SWEEP = 240; // total travel to value 1

/** value 0..1 → needle rotation in degrees from straight-up. */
function needleDeg(value: number): number {
  return MIN_DEG + Math.max(0, Math.min(1, value)) * SWEEP;
}

/** Point on the dial circle. deg measured from straight-up, clockwise. */
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

interface GaugeProps {
  /** Space Mono question label above the dial. */
  question: string;
  /** value 0..1 — needle position. Ignored when noData. */
  value: number;
  /** Big readout under the hub (e.g. "19%"). */
  readout: string;
  /** Cormorant sub-caption (e.g. "WK 6 / 14"). */
  sub?: string;
  tier: Tier;
  /** Face wash tint behind the dial — teal / rust / sage per the spec. */
  face: 'teal' | 'rust' | 'sage';
  noData?: boolean;
}

function Gauge({ question, value, readout, sub, tier, face, noData = false }: GaugeProps) {
  const cx = 100;
  const cy = 104;
  const R = 80;
  const target = noData ? 0 : needleDeg(value);

  // Sweep on entrance: both SSR and first client render start at MIN (no
  // hydration mismatch); the effect moves the needle to `target`, which the
  // CSS transition animates — and prefers-reduced-motion disables, so it
  // simply snaps to the value with no sweep.
  const [deg, setDeg] = useState(MIN_DEG);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDeg(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  const faceWash =
    face === 'teal'
      ? 'rgba(60, 122, 138, 0.06)'
      : face === 'rust'
        ? 'rgba(165, 58, 45, 0.07)'
        : 'rgba(94, 122, 86, 0.07)';
  const tierColor = tier === 'none' ? 'var(--ink-faded, #8A8478)' : TIER_VAR[tier];

  // Tick marks every 30° across the 240° arc.
  const ticks = Array.from({ length: 9 }, (_, i) => MIN_DEG + (i * SWEEP) / 8);
  const [arcStartX, arcStartY] = polar(cx, cy, R, MIN_DEG);
  const [arcEndX, arcEndY] = polar(cx, cy, R, MIN_DEG + SWEEP);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, minWidth: 180 }}>
      <span
        style={{
          fontFamily: 'var(--bp-font-mono, ui-monospace, monospace)',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-faded, #8A8478)',
          textAlign: 'center',
        }}
      >
        {question}
      </span>

      <svg viewBox="0 0 200 150" width="100%" style={{ maxWidth: 220, overflow: 'visible' }} role="img" aria-label={`${question} ${noData ? 'no signal yet' : readout}`}>
        {/* Face wash */}
        <circle cx={cx} cy={cy} r={R - 4} fill={faceWash} />
        {/* Dial track */}
        <path
          d={`M ${arcStartX} ${arcStartY} A ${R} ${R} 0 1 1 ${arcEndX} ${arcEndY}`}
          fill="none"
          stroke="var(--paper-edge, rgba(0,0,0,0.12))"
          strokeWidth={2}
        />
        {/* Brass bezel — herbarium ring just outside the track */}
        <path
          d={`M ${polar(cx, cy, R + 7, MIN_DEG)[0]} ${polar(cx, cy, R + 7, MIN_DEG)[1]} A ${R + 7} ${R + 7} 0 1 1 ${polar(cx, cy, R + 7, MIN_DEG + SWEEP)[0]} ${polar(cx, cy, R + 7, MIN_DEG + SWEEP)[1]}`}
          fill="none"
          stroke="var(--specimen-brass, #B08D5C)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Ticks */}
        {ticks.map((t, i) => {
          const [x1, y1] = polar(cx, cy, R - 7, t);
          const [x2, y2] = polar(cx, cy, R, t);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-faded, #8A8478)" strokeWidth={1.5} opacity={0.6} />;
        })}
        {/* Needle (drawn pointing up, rotated to value) */}
        <g
          className="bkg-gauge-needle"
          style={{ transform: `rotate(${deg}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'transform 0.9s cubic-bezier(0.22,1,0.36,1)' }}
        >
          <line x1={cx} y1={cy} x2={cx} y2={cy - (R - 16)} stroke={tierColor} strokeWidth={noData ? 2 : 3} strokeLinecap="round" opacity={noData ? 0.45 : 1} />
        </g>
        {/* Hub */}
        <circle cx={cx} cy={cy} r={6} fill="var(--specimen-brass, #B08D5C)" />
        <circle cx={cx} cy={cy} r={2.5} fill="var(--paper-cream, #F2E9D2)" />
        {/* Readout */}
        <text x={cx} y={cy + 34} textAnchor="middle" fontFamily="var(--font-archivo-black, var(--font-archivo)), sans-serif" fontSize={noData ? 13 : 22} fontWeight={800} fill={tierColor}>
          {noData ? 'no signal yet' : readout}
        </text>
      </svg>

      {sub && !noData ? (
        <span style={{ fontFamily: 'var(--bp-font-serif, Georgia, serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-faded, #8A8478)' }}>{sub}</span>
      ) : (
        <span style={{ minHeight: 18 }} aria-hidden />
      )}

      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          .bkg-gauge-needle {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function InstrumentGauges() {
  const sp = useStageProject();
  const cfg = useShellConfig();
  const ledger = useProjectLedger(sp.projectId);
  const twinId = useId();

  // ── Budget burn (real) — read the SAME ledger the budget ribbon reads, so
  //    the dial agrees with the "$N left of $M" readout. Burn = consumed/total
  //    (consumed = total − remaining), matching the ribbon's "left" framing. ──
  const total = ledger.budget?.total ?? 0;
  const remaining = ledger.budget?.remaining ?? total;
  const consumed = Math.max(0, total - remaining);
  const hasBudget = total > 0;
  const burn = hasBudget ? consumed / total : 0;
  const budgetTier: Tier = !hasBudget ? 'none' : burn >= 0.9 ? 'rust' : burn >= 0.7 ? 'amber' : 'sage';

  // ── On schedule (real when a schedule exists) ──
  const pct = cfg.journey?.pct ?? 0; // overall progress %
  const weekOf = cfg.journey?.weekOf ?? 0;
  const weeksTotal = cfg.journey?.weeksTotal ?? 0;
  const hasSchedule = weeksTotal > 0;
  const elapsed = hasSchedule ? weekOf / weeksTotal : 0;
  const progress = pct / 100;
  // Health = progress vs time elapsed. Ahead/on → sage; a little behind →
  // amber; well behind → rust. Honest only when a schedule exists.
  const scheduleTier: Tier = !hasSchedule
    ? 'none'
    : progress >= elapsed - 0.05
      ? 'sage'
      : progress >= elapsed - 0.15
        ? 'amber'
        : 'rust';

  // ── Quality (no rollup yet → honest no-signal) ──
  // Wired when a quality/flag rollup lands; never a fabricated reading.

  const twin = {
    type: 'instrument_gauges',
    gauges: [
      { key: 'schedule', question: 'On schedule?', value: hasSchedule ? progress : null, tier: scheduleTier },
      { key: 'budget', question: 'Budget burn?', value: hasBudget ? burn : null, tier: budgetTier },
      { key: 'quality', question: 'Quality?', value: null, tier: 'none' },
    ],
  };

  return (
    <section
      data-machine="instrument_gauges"
      aria-labelledby={`${twinId}-h`}
      style={{ padding: '8px 0 4px' }}
    >
      <script type="application/json" data-machine-twin="instrument_gauges" dangerouslySetInnerHTML={{ __html: JSON.stringify(twin) }} />

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <h2 id={`${twinId}-h`} style={{ fontFamily: 'var(--font-archivo-black, var(--font-archivo)), sans-serif', fontWeight: 800, fontSize: 'clamp(18px, 2.4vw, 24px)', margin: 0, color: 'var(--ink-graphite, #2A2620)' }}>
          This week&rsquo;s instruments
        </h2>
        {hasSchedule ? (
          <span style={{ fontFamily: 'var(--bp-font-mono, ui-monospace, monospace)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faded, #8A8478)' }}>
            WK {weekOf} OF {weeksTotal}
          </span>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Gauge
          question="On schedule?"
          value={progress}
          readout={`${Math.round(pct)}%`}
          sub={hasSchedule ? `WK ${weekOf} / ${weeksTotal}` : undefined}
          tier={scheduleTier}
          face="teal"
          noData={!hasSchedule}
        />
        <Gauge
          question="Budget burn?"
          value={burn}
          readout={`${Math.round(burn * 100)}%`}
          sub={hasBudget ? 'spent of plan' : undefined}
          tier={budgetTier}
          face="rust"
          noData={!hasBudget}
        />
        <Gauge
          question="Quality?"
          value={0}
          readout=""
          tier="none"
          face="sage"
          noData
        />
      </div>
    </section>
  );
}
