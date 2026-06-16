'use client';

/**
 * InstrumentGauge — the signature herbarium-engineering KPI dial.
 * =================================================================
 *
 * SHARED Section-A primitive (the Killer App Builder lane composes three of
 * these for B3; the Dream Machine inherits the same component later). Ported
 * faithfully from the design-system kit's `Gauge` (ui_kits/builders-knowledge-
 * garden/components.jsx) with three production hardenings:
 *
 *   1. SSR-safe gradient ids via React.useId() (the kit used Math.random(),
 *      which mismatches between server + client render).
 *   2. Tokens only — every colour is a --paper- / --specimen- / --ink- CSS
 *      var (the kit hard-coded hexes). NO #E8443A.
 *   3. An honest `tone="none"` NO-DATA state — a parked needle + muted face +
 *      "No data" engraving — so a metric with no real source (quality,
 *      schedule variance, …) NEVER shows a fabricated reading (Decision 19/21).
 *
 * Health colour follows the flag law (Decision 19/21): sage = good, amber =
 * watch, rust = risk — never #E8443A. The needle sweeps from rest to its
 * reading on mount; under prefers-reduced-motion it renders the static
 * end-state (no sweep), per the brand motion rule.
 */

import { useEffect, useId, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import './specimen.css';

export type GaugeTone = 'good' | 'watch' | 'risk' | 'none';

/** A slice of the category-composition ring (e.g. a Budget-DNA category's share). */
export interface GaugeSegment {
  /** CSS color (a `--cat-*` token or hex). */
  color: string;
  /** Relative weight; normalized across all segments. */
  value: number;
}

export interface InstrumentGaugeProps {
  /** Reading, 0..1. Ignored (needle parked) when `tone="none"`. */
  value?: number;
  /** Engraved dial label, e.g. "BUDGET". */
  label: string;
  /** Big readout beneath the dial, e.g. "$1.15M". Defaults to "—" with no data. */
  display?: string;
  /** Small sub-line, e.g. "left of $1.65M" or the no-data reason. */
  caption?: string;
  /** Health → face accent. `none` = honest no-data (parked needle, muted). */
  tone?: GaugeTone;
  /** Pixel width of the dial (height tracks it). */
  size?: number;
  /**
   * Optional category-composition ring drawn along the arc (the "burn"
   * breakdown — what the reading is made of, by Budget-DNA category). Purely
   * additive: omit it and the gauge renders exactly as before.
   */
  segments?: GaugeSegment[];
}

const REST_DEG = -130; // needle home position (far left of the 260° sweep)
const SWEEP = 260;

/** Stroked-arc path between two sweep angles at radius r, centred on (85,85). */
function arc(r: number, a0deg: number, a1deg: number): string {
  const a0 = (a0deg * Math.PI) / 180;
  const a1 = (a1deg * Math.PI) / 180;
  const x0 = 85 + r * Math.cos(a0), y0 = 85 + r * Math.sin(a0);
  const x1 = 85 + r * Math.cos(a1), y1 = 85 + r * Math.sin(a1);
  const large = a1deg - a0deg > 180 ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

/**
 * Face accent per health tone — a GLOBAL token var, set INLINE on the gradient
 * stops. (A locally-set custom property like `--ig-accent` does not reliably
 * inherit into the SVG <defs>/<stop> subtree across engines — it renders black;
 * a global token var set inline does, matching the brass-bezel stops.)
 */
const FACE_VAR: Record<GaugeTone, string> = {
  good: 'var(--specimen-sage)',
  watch: 'var(--specimen-amber)',
  risk: 'var(--specimen-rust)',
  none: 'var(--paper-cream)',
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export default function InstrumentGauge({
  value = 0,
  label,
  display,
  caption,
  tone = 'good',
  size = 200,
  segments,
}: InstrumentGaugeProps) {
  const reduce = useReducedMotion();
  const rawId = useId();
  const gid = rawId.replace(/[^a-zA-Z0-9_-]/g, ''); // safe for url(#…) refs
  const noData = tone === 'none';
  const faceVar = FACE_VAR[tone];

  // Target needle angle. No data → parked at rest (reads as "no reading"),
  // never the misleading centre.
  const v = clamp01(value);
  const targetDeg = noData ? REST_DEG : REST_DEG + v * 260;

  // Sweep from rest → reading on mount. Reduced-motion renders the end-state
  // immediately (the CSS transition is stripped under the media query, so
  // setting the final angle here is an instant, static placement).
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLit(true), 40);
    return () => clearTimeout(t);
  }, []);
  const deg = noData ? REST_DEG : (lit || reduce ? targetDeg : REST_DEG);

  // Major (every 5th) + minor ticks across the 260° arc.
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = ((REST_DEG + i * 26) * Math.PI) / 180;
    const major = i % 5 === 0;
    const r1 = 60;
    const r2 = major ? 52 : 56;
    ticks.push(
      <line
        key={i}
        x1={85 + Math.cos(a) * r1}
        y1={85 + Math.sin(a) * r1}
        x2={85 + Math.cos(a) * r2}
        y2={85 + Math.sin(a) * r2}
        style={{
          stroke: major ? 'var(--ink-graphite)' : 'var(--ink-sepia)',
          strokeWidth: major ? 1.4 : 0.8,
          strokeLinecap: 'round',
          opacity: major ? 0.9 : 0.55,
        }}
      />,
    );
  }

  return (
    <div
      className={`ig ig--${tone}`}
      data-tone={tone}
      style={{ maxWidth: size }}
      role="img"
      aria-label={`${label}: ${noData ? 'no data yet' : display || `${Math.round(v * 100)}%`}`}
    >
      <svg viewBox="0 0 170 170" width="100%" aria-hidden="true">
        <defs>
          <radialGradient id={`ig-brass-${gid}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%" style={{ stopColor: 'var(--specimen-brass-pale)' }} />
            <stop offset="55%" style={{ stopColor: 'var(--specimen-brass)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--specimen-brass-aged)' }} />
          </radialGradient>
          <radialGradient id={`ig-face-${gid}`} cx="50%" cy="40%" r="62%">
            <stop offset="0%" style={{ stopColor: faceVar, stopOpacity: 0.95 }} />
            <stop offset="100%" style={{ stopColor: faceVar, stopOpacity: 0.5 }} />
          </radialGradient>
        </defs>

        {/* Brass bezel */}
        <circle cx="85" cy="85" r="78" fill={`url(#ig-brass-${gid})`} className="ig-bezel" />
        {/* Cream rim + face */}
        <circle cx="85" cy="85" r="66" className="ig-rim" />
        <circle cx="85" cy="85" r="62" fill={noData ? 'var(--paper-cream)' : `url(#ig-face-${gid})`} className="ig-face" />

        {ticks}

        {/* Category-composition ring — the "burn" breakdown, by Budget-DNA
            category. A thin band in the face/rim gap; omitted with no data. */}
        {!noData && segments && segments.length > 0 && (() => {
          const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
          if (total <= 0) return null;
          let acc = 0;
          return (
            <g className="ig-segments">
              {segments.map((seg, i) => {
                const f0 = acc / total;
                acc += Math.max(0, seg.value);
                const f1 = acc / total;
                const a0 = REST_DEG + f0 * SWEEP + 0.5;
                const a1 = REST_DEG + f1 * SWEEP - 0.5;
                if (a1 <= a0) return null;
                return <path key={i} d={arc(63.5, a0, a1)} fill="none" stroke={seg.color} strokeWidth={3} strokeLinecap="butt" opacity={0.92} />;
              })}
            </g>
          );
        })()}

        <text x="85" y="128" textAnchor="middle" className="ig-label">
          {label.toUpperCase()}
        </text>

        {/* Needle — the outer translate puts the pivot at the dial centre; the
            inner group rotates around its OWN origin (0,0 == centre), so no
            transform-box / transform-origin is needed (those compute
            unreliably on SVG groups). The CSS transition on .ig-needle animates
            the sweep; stroke is inline (global token var) for reliable SVG
            rendering. */}
        <g transform="translate(85 85)">
          <g className="ig-needle" style={{ transform: `rotate(${deg}deg)` }}>
            <line
              x1="0"
              y1="6"
              x2="0"
              y2="-50"
              style={{
                stroke: noData ? 'var(--ink-faded)' : 'var(--ink-graphite)',
                strokeWidth: 2,
                strokeLinecap: 'round',
                opacity: noData ? 0.55 : 1,
              }}
            />
          </g>
        </g>
        <circle cx="85" cy="85" r="6" style={{ fill: 'var(--specimen-brass-aged)', stroke: 'var(--ink-graphite)', strokeWidth: 0.6 }} />
        <circle cx="85" cy="85" r="2.5" style={{ fill: 'var(--ink-graphite)' }} />
      </svg>

      <div className={`ig-display${noData ? ' ig-display--empty' : ''}`}>
        {noData ? 'No data' : display || `${Math.round(v * 100)}%`}
      </div>
      {caption && <div className="ig-caption">{caption}</div>}
    </div>
  );
}
