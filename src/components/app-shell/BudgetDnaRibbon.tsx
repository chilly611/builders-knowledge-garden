'use client';

/**
 * BudgetDnaRibbon — the shell's top strip, directly above the journey row.
 * =======================================================================
 *
 * A stacked-category "streamgraph" of planned cost over the build timeline
 * (project start → substantial completion), sharing the journey row's x-axis
 * and a single time playhead. Past-of-playhead is solid (money already out),
 * future is veiled + hatched (projected). A baseline carries paid / due /
 * overdue ticks. The right cap is LENS-AWARE: builder lanes see a projected
 * gross-profit + sub-markup readout; the Owner lane sees only category spend,
 * paid / unpaid, and total cost — never margin.
 *
 * Hand-coded SVG (no charting dependency — matches the InstrumentGauge
 * precedent and the "or equivalent" allowance in the spec). Data + the shared
 * playhead come from the parent (ShellStrips) so the journey row stays in sync.
 *
 * Spec: docs/design/budget-dna-and-color-system.md.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { CATEGORIES, type CategoryMeta, type PatternId } from '@/lib/budget-dna';
import type { UseBudgetDnaResult } from '@/lib/budget-dna';
import { fmtMoney } from './config';

const PLOT_TOP = 8;
const PLOT_H = 40;
const BASELINE = PLOT_TOP + PLOT_H; // 48
const TICK_LANE = 12;
const SVG_H = BASELINE + TICK_LANE; // 60
const INSET = 0.03; // matches .jline left:3%/right:3% so the axis lines up with the journey

interface Pt { x: number; y: number; }

/** Catmull-Rom → cubic-bezier smoothing for an open polyline. */
function smooth(points: Pt[]): string {
  if (points.length < 2) return points.length ? `M${points[0].x},${points[0].y}` : '';
  let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

/** Measure a host element's width (ResizeObserver) so the SVG renders crisp at real px. */
function useMeasuredWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width ?? 0;
      if (cw) setW(cw);
    });
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** One SVG <pattern> per category texture (color baked in so band = color + texture). */
function CategoryPattern({ id, hex, pattern }: { id: string; hex: string; pattern: PatternId }) {
  const stroke = 'rgba(20,16,10,0.20)';
  const common = { patternUnits: 'userSpaceOnUse' as const };
  const bg = <rect width="8" height="8" fill={hex} />;
  switch (pattern) {
    case 'stipple':
      return <pattern id={id} width="6" height="6" {...common}>{<rect width="6" height="6" fill={hex} />}<circle cx="1.5" cy="1.5" r="0.9" fill={stroke} /><circle cx="4.5" cy="4.5" r="0.9" fill={stroke} /></pattern>;
    case 'crosshatch':
      return <pattern id={id} width="8" height="8" {...common}>{bg}<path d="M0,8 L8,0 M-2,2 L2,-2 M6,10 L10,6" stroke={stroke} strokeWidth="0.8" /><path d="M0,0 L8,8 M-2,6 L2,10 M6,-2 L10,2" stroke={stroke} strokeWidth="0.8" /></pattern>;
    case 'diagonal':
      return <pattern id={id} width="7" height="7" {...common} patternTransform="rotate(0)">{<rect width="7" height="7" fill={hex} />}<path d="M0,7 L7,0 M-2,2 L2,-2 M5,9 L9,5" stroke={stroke} strokeWidth="1" /></pattern>;
    case 'vertical':
      return <pattern id={id} width="6" height="6" {...common}>{<rect width="6" height="6" fill={hex} />}<path d="M2,0 L2,6 M5,0 L5,6" stroke={stroke} strokeWidth="0.9" /></pattern>;
    case 'brick':
      return <pattern id={id} width="10" height="8" {...common}>{<rect width="10" height="8" fill={hex} />}<path d="M0,4 L10,4 M0,0 L0,4 M5,4 L5,8 M10,0 L10,4" stroke={stroke} strokeWidth="0.8" /></pattern>;
    case 'dashes':
      return <pattern id={id} width="8" height="8" {...common}>{bg}<path d="M0,8 L8,0" stroke={stroke} strokeWidth="1.1" strokeDasharray="2 2.5" /></pattern>;
    case 'chevron':
      return <pattern id={id} width="8" height="6" {...common}>{<rect width="8" height="6" fill={hex} />}<path d="M0,5 L4,1 L8,5" fill="none" stroke={stroke} strokeWidth="0.9" /></pattern>;
    case 'leaf':
      return <pattern id={id} width="9" height="9" {...common}>{<rect width="9" height="9" fill={hex} />}<path d="M4.5,2 Q6.5,4.5 4.5,7 Q2.5,4.5 4.5,2 Z" fill={stroke} /></pattern>;
    default:
      return <pattern id={id} width="8" height="8" {...common}>{bg}</pattern>;
  }
}

const TICK_TONE: Record<'paid' | 'due' | 'overdue', string> = {
  paid: 'var(--pay-paid)',
  due: 'var(--pay-due)',
  overdue: 'var(--pay-overdue)',
};

interface Props {
  dna: UseBudgetDnaResult;
  /** Shared scrub override (null = live cumulative-spend front). */
  scrubWeek: number | null;
  /** Transient drag value during an active scrub (smooth; not yet in history). */
  onScrubMove: (week: number | null) => void;
  /** Commit the time-travel to the URL — a real, Back-undoable history entry. */
  onScrubCommit: (week: number | null) => void;
  /** When false (a lens-gated static config), the ribbon is read-only. */
  interactive?: boolean;
}

export function BudgetDnaRibbon({ dna, scrubWeek, onScrubMove, onScrubCommit, interactive = true }: Props) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[:]/g, '');
  const [host, W] = useMeasuredWidth();
  const [legendOpen, setLegendOpen] = useState(false);

  const { totalWeeks, series, totals, currentWeek, ticks, profit, empty } = dna;
  const playWeek = scrubWeek ?? currentWeek;
  const isOwner = dna.lane === 'owner';

  const xOf = useCallback(
    (week: number) => {
      const plotW = W * (1 - 2 * INSET);
      return W * INSET + (week / Math.max(1, totalWeeks)) * plotW;
    },
    [W, totalWeeks],
  );

  const lastWeekRef = useRef<number | null>(null);
  const handlePointer = useCallback(
    (clientX: number, rect: DOMRect) => {
      const plotW = rect.width * (1 - 2 * INSET);
      const rel = (clientX - rect.left - rect.width * INSET) / Math.max(1, plotW);
      const week = Math.round(Math.max(0, Math.min(1, rel)) * totalWeeks);
      const wk = week === currentWeek ? null : week;
      lastWeekRef.current = wk;
      onScrubMove(wk);
    },
    [totalWeeks, currentWeek, onScrubMove],
  );

  // Empty / not-ready — honest, never fabricated.
  if (!dna.ready || empty || totalWeeks < 1 || W === 0) {
    return (
      <div className="gstrip gstrip-dna" data-dna-state={dna.ready ? 'empty' : 'loading'}>
        <div className="gstrip-lead gstrip-lead-dna"><span className="eng-label">Budget DNA · cost over time</span></div>
        <div className="gstrip-track gdna-track" ref={host}>
          <div className="gdna-empty">{dna.ready ? 'Add budget lines to grow the DNA' : 'Reading the ledger…'}</div>
        </div>
        <div className="gstrip-end" />
      </div>
    );
  }

  // Stack the categories bottom → top into cumulative pixel heights per week.
  const maxStack = Math.max(
    1,
    ...Array.from({ length: totalWeeks }, (_, w) => series.reduce((s, c) => s + c.weekly[w], 0)),
  );
  const scaleY = PLOT_H / maxStack;

  // Cumulative px above baseline for each category boundary at week-center samples.
  const cum: number[][] = []; // cum[k][w] = px height of top of band k
  let acc = new Array(totalWeeks).fill(0);
  for (let k = 0; k < series.length; k++) {
    const top = acc.map((v, w) => v + series[k].weekly[w] * scaleY);
    cum.push(top);
    acc = top;
  }

  const centerX = (w: number) => xOf(w + 0.5);
  const bandPath = (k: number): string => {
    const topPts: Pt[] = [];
    const botPts: Pt[] = [];
    for (let w = 0; w < totalWeeks; w++) {
      const yTop = BASELINE - cum[k][w];
      const yBot = BASELINE - (k > 0 ? cum[k - 1][w] : 0);
      topPts.push({ x: centerX(w), y: yTop });
      botPts.push({ x: centerX(w), y: yBot });
    }
    // Flat-extend to the track edges so bands fill the full axis width.
    const left = xOf(0), right = xOf(totalWeeks);
    topPts.unshift({ x: left, y: topPts[0].y });
    topPts.push({ x: right, y: topPts[topPts.length - 1].y });
    botPts.unshift({ x: left, y: botPts[0].y });
    botPts.push({ x: right, y: botPts[botPts.length - 1].y });
    const top = smooth(topPts);
    const bottomRev = smooth([...botPts].reverse()).replace(/^M/, 'L');
    return `${top} ${bottomRev} Z`;
  };

  const playX = xOf(playWeek);
  const futureX = playX;
  const metaById = (id: string): CategoryMeta => CATEGORIES.find((c) => c.id === id)!;

  return (
    <div className="gstrip gstrip-dna">
      <div className="gstrip-lead gstrip-lead-dna">
        <span className="eng-label">Budget DNA · cost over time</span>
        <button
          type="button"
          className="gdna-key-toggle"
          aria-expanded={legendOpen}
          onClick={() => setLegendOpen((v) => !v)}
        >
          {legendOpen ? 'Hide key' : 'Specimen key'}
        </button>
      </div>

      <div className="gstrip-track gdna-track" ref={host}>
        <svg
          width={W}
          height={SVG_H}
          viewBox={`0 0 ${W} ${SVG_H}`}
          className="gdna-svg"
          role="img"
          aria-label={`Budget DNA: ${fmtMoney(totals.total)} across ${totalWeeks} weeks, ${fmtMoney(totals.spent)} spent by week ${currentWeek}`}
          onPointerDown={interactive ? (e) => { (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); handlePointer(e.clientX, e.currentTarget.getBoundingClientRect()); } : undefined}
          onPointerMove={interactive ? (e) => { if (e.buttons === 1) handlePointer(e.clientX, e.currentTarget.getBoundingClientRect()); } : undefined}
          onPointerUp={interactive ? () => onScrubCommit(lastWeekRef.current) : undefined}
          style={{ touchAction: 'none', cursor: interactive ? 'ew-resize' : 'default' }}
        >
          <defs>
            {series.map((s) => {
              const m = metaById(s.id);
              return <CategoryPattern key={s.id} id={`pat-${uid}-${s.id}`} hex={m.hex} pattern={m.pattern} />;
            })}
            {/* Future veil hatch — projected, not yet incurred. */}
            <pattern id={`veil-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="var(--paper-cream)" opacity="0.5" />
              <path d="M0,6 L6,0" stroke="var(--paper-shadow)" strokeWidth="0.6" opacity="0.5" />
            </pattern>
            <clipPath id={`clip-${uid}`}><rect x="0" y="0" width={W} height={BASELINE} /></clipPath>
          </defs>

          {/* baseline rule */}
          <line x1={xOf(0)} y1={BASELINE + 0.5} x2={xOf(totalWeeks)} y2={BASELINE + 0.5} stroke="var(--paper-edge)" strokeWidth="1" />

          {/* stacked category bands */}
          <g clipPath={`url(#clip-${uid})`}>
            {series.map((s, k) => (
              <path
                key={s.id}
                className={reduce ? undefined : 'gdna-band'}
                d={bandPath(k)}
                fill={`url(#pat-${uid}-${s.id})`}
                stroke="var(--paper-cream)"
                strokeWidth="0.5"
                style={reduce ? undefined : { animationDelay: `${k * 60}ms` }}
              />
            ))}
            {/* future veil from the playhead to the end */}
            <rect x={futureX} y={PLOT_TOP - 2} width={Math.max(0, W - futureX)} height={PLOT_H + 4} fill={`url(#veil-${uid})`} />
          </g>

          {/* payment ticks on the baseline */}
          {ticks.map((t, i) => {
            const tx = xOf(t.week);
            if (t.kind === 'overdue') {
              return <path key={i} d={`M${tx.toFixed(1)},${BASELINE + 2} l3,5 l-6,0 Z`} fill={TICK_TONE.overdue} />;
            }
            if (t.kind === 'due') {
              return <circle key={i} cx={tx} cy={BASELINE + 5} r="2.4" fill="none" stroke={TICK_TONE.due} strokeWidth="1.3" />;
            }
            return <circle key={i} cx={tx} cy={BASELINE + 5} r="2.4" fill={TICK_TONE.paid} />;
          })}

          {/* shared time playhead */}
          <g className="gdna-playhead">
            <line x1={playX} y1={PLOT_TOP - 4} x2={playX} y2={BASELINE + TICK_LANE} stroke="var(--ink-graphite)" strokeWidth="1.5" />
            <polygon points={`${playX - 4},${PLOT_TOP - 4} ${playX + 4},${PLOT_TOP - 4} ${playX},${PLOT_TOP + 1}`} fill="var(--ink-graphite)" />
          </g>
        </svg>

        {/* week flag for the playhead (HTML, so it can carry the mono label + reset) */}
        <button
          type="button"
          className={`gdna-flag${scrubWeek != null ? ' is-scrubbed' : ''}`}
          style={{ left: `${(playX / Math.max(1, W)) * 100}%` }}
          onClick={interactive ? () => onScrubCommit(null) : undefined}
          title={scrubWeek != null ? 'Return to live' : 'Cumulative-spend week'}
        >
          wk {playWeek}{scrubWeek != null ? '' : ' · live'}
        </button>

        {legendOpen && (
          <div className="gdna-legend" role="list">
            {CATEGORIES.map((c) => (
              <span className="gdna-legend-item" role="listitem" key={c.id}>
                <span className="gdna-legend-sw" style={{ background: c.cssVar }} aria-hidden />
                {c.label}
              </span>
            ))}
            <span className="gdna-legend-sep" aria-hidden />
            <span className="gdna-legend-item"><span className="gdna-legend-tick gdna-tk-paid" aria-hidden />Paid</span>
            <span className="gdna-legend-item"><span className="gdna-legend-tick gdna-tk-due" aria-hidden />Due</span>
            <span className="gdna-legend-item"><span className="gdna-legend-tick gdna-tk-overdue" aria-hidden />Overdue</span>
          </div>
        )}
      </div>

      {/* lens-aware right cap */}
      <div className="gstrip-end gdna-cap">
        {profit && !isOwner ? (
          <>
            <div className="gstrip-end-big">{fmtMoney(profit.gross)}</div>
            <div className="gstrip-end-sub">gross · proj. {profit.marginPct}%</div>
            <div className="gdna-cap-row">incl. sub-markup {fmtMoney(profit.subMarkup)}</div>
          </>
        ) : (
          <>
            <div className="gstrip-end-big">{fmtMoney(totals.total)}</div>
            <div className="gstrip-end-sub">total cost</div>
            <div className="gdna-cap-row">
              <span className="gdna-cap-paid">{fmtMoney(totals.spent)} paid</span> · {fmtMoney(Math.max(0, totals.total - totals.spent))} unpaid
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BudgetDnaRibbon;
