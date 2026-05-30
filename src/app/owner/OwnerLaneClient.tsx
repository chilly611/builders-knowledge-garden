'use client';

/**
 * OwnerLaneClient — the homeowner's view of the Killer App.
 *
 * Faithful recreation of the Knowledge Gardens design bundle's "Owner Lane"
 * (project/owner-lane/{app,components}.jsx, chats/chat2.md), rebuilt as a
 * production React surface that:
 *
 *   • uses the 7 LOCKED lifecycle stages (Size Up → Reflect) instead of the
 *     design prototype's 6 phases (Dream → Grow) — founder-locked decision
 *     #2, mirrored from KAC_STAGES / lifecycle-stages.ts;
 *   • reads only herbarium tokens (no #fff / #000 / foreign red — chat2:
 *     "the system wins"); SVG instrument internals reuse the exact hex the
 *     tokens resolve to, lifted verbatim from the design's Gauge;
 *   • is fed entirely by the server page from canonical Marin data
 *     (getCanonicalProject + MARIN_OWNER_LENS) — no numbers live here.
 *
 * The persistent compass-bloom + "Ask the garden" fab the design calls
 * `PersistentNav` already exist app-wide via GlobalChromeGate (CompassBloom
 * + GlobalAiFab in the root layout), so they are intentionally NOT rebuilt
 * here — this surface would only collide with them bottom-right.
 *
 * Approve / hold / add-to-log are local-optimistic (demo surface, no write
 * path yet); the real routes land when the Owner Lens write API ships.
 */

import { useEffect, useId, useRef, useState } from 'react';

// ── Data contract (resolved server-side, serializable) ──────────────────
export interface OwnerStage {
  slug: string;
  label: string;
  n: string;
  icon: string; // key into STAGE_ICO (calipers · seal · blueprint · …)
  plain: string; // plain-language journey sublabel (`.ol-jplain`)
  money: 'paid' | 'now' | 'soon';
  status: 'done' | 'current' | 'upcoming';
  payLabel?: string;
}
export interface OwnerReading {
  key: string;
  label: string;
  question: string;
  value: number; // 0..1
  accent: string; // hex == token value (used inside SVG)
  read: string;
  big: string;
  caption: string;
  note: string;
  noteTone: 'good' | 'watch' | 'info';
}
export interface OwnerEntryData {
  plate: string;
  date: string;
  title: string;
  meta: string;
  quote: string;
  tag: string;
  tagTone: 'teal' | 'sage' | 'amber' | 'rust';
  thumb?: string;
}
export interface OwnerLaneData {
  projectName: string;
  ownerGreeting: string;
  detailMono: string;
  logoSrc: string;
  heroImg: string;
  stages: OwnerStage[];
  buildPct: number;
  weekOf: number;
  weeksTotal: number;
  budgetLeftLabel: string;
  budgetLeftValue: number; // numeric remaining, drives the strip count-up
  budgetTotalLabel: string;
  jscrubLabel: string;
  readings: OwnerReading[];
  summaryLeadBefore: string;
  summaryStageLabel: string;
  summaryLeadAfter: string;
  summaryStats: { num: string; lab: string }[];
  needsYou: {
    plate: string;
    amountLabel: string;
    sub: string;
    framer: string;
    budgetLeftLabel: string;
    pctOfRemaining: number;
  };
  entries: OwnerEntryData[];
}

// ── Hand-drawn line icons (brass/sepia, stroke 1.5, no fill) ─────────────
type IcoProps = React.SVGProps<SVGSVGElement>;
const Ico = {
  check: (p: IcoProps) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6 L9 17 l-5 -5" /></svg>
  ),
  camera: (p: IcoProps) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8 h3.5 l1.5 -2.2 h8 l1.5 2.2 H21 v11 H3 z" /><circle cx="12" cy="13" r="3.6" /></svg>
  ),
  ruler: (p: IcoProps) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 14.5 L14.5 4 l5.5 5.5 L9.5 20 z" /><path d="M8 8.5 l1.6 1.6 M11 5.5 l1.6 1.6 M5 11.5 l1.6 1.6" /></svg>
  ),
  receipt: (p: IcoProps) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 3 h12 v18 l-2 -1.4 l-2 1.4 l-2 -1.4 l-2 1.4 l-2 -1.4 L6 21 z" /><path d="M9 8 h6 M9 12 h6" /></svg>
  ),
  video: (p: IcoProps) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="6" width="13" height="12" rx="1.5" /><path d="M16 10 l5 -3 v10 l-5 -3 z" /></svg>
  ),
  clip: (p: IcoProps) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 11.5 l-9 9 a5 5 0 0 1 -7 -7 l9 -9 a3.2 3.2 0 0 1 4.6 4.6 l-9 9 a1.4 1.4 0 0 1 -2 -2 l8.2 -8.2" /></svg>
  ),
  arrow: (p: IcoProps) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12 h13 M13 6 l6 6 -6 6" /></svg>
  ),
  pause: (p: IcoProps) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}><path d="M9 5 v14 M15 5 v14" /></svg>
  ),
  search: (p: IcoProps) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" /></svg>
  ),
};

const KIND_ICONS = {
  photo: Ico.camera,
  video: Ico.video,
  sketch: Ico.ruler,
  receipt: Ico.receipt,
} as const;

// ── Stage icons — herbarium / botanical-instrument line set ──────────────
// One mark per lifecycle stage (Size Up → Reflect), lifted verbatim from the
// design's STAGE_ICO. Shared by the budget cells (.ol-bcell-ico) and the
// journey nodes (.ol-jico); `color` is inherited so the herbarium tokens win.
const _si: IcoProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};
const STAGE_ICO: Record<string, (p: IcoProps) => React.ReactElement> = {
  calipers: (p) => (
    <svg viewBox="0 0 24 24" {..._si} {...p}><path d="M8 3v15M16 3v18" /><path d="M8 6h4M8 10h4M16 12h-4" /><path d="M8 18h8" /></svg>
  ),
  seal: (p) => (
    <svg viewBox="0 0 24 24" {..._si} {...p}><circle cx="12" cy="9.5" r="5.5" /><circle cx="12" cy="9.5" r="2.2" /><path d="M9 14l-1.3 7 4.3-2.2 4.3 2.2L15 14" /></svg>
  ),
  blueprint: (p) => (
    <svg viewBox="0 0 24 24" {..._si} {...p}><path d="M5 5h11l3 3v11H5z" /><path d="M16 5v3h3" /><path d="M8 12h7M8 15h7M8 9h3" /></svg>
  ),
  square: (p) => (
    <svg viewBox="0 0 24 24" {..._si} {...p}><path d="M6 4v14h14" /><path d="M9.5 18v-2.5M13 18v-2.5M16.5 18v-2.5M6 7.5h2.5M6 11h2.5M6 14.5h2.5" /></svg>
  ),
  wrench: (p) => (
    <svg viewBox="0 0 24 24" {..._si} {...p}><path d="M16 3.5a4 4 0 00-3.2 6.4L5 18l1.6 1.6 7.9-7.8A4 4 0 1016 3.5z" /><path d="M14.2 4.4l-1.7 2 1 2.6 2.6.6 1.7-2" /></svg>
  ),
  ledger: (p) => (
    <svg viewBox="0 0 24 24" {..._si} {...p}><circle cx="12" cy="12" r="7.5" /><path d="M12 7.5v9M14 9.6h-3a1.6 1.6 0 000 3.2h2a1.6 1.6 0 010 3.2H9.8" /></svg>
  ),
  leaf: (p) => (
    <svg viewBox="0 0 24 24" {..._si} {...p}><path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14z" /><path d="M5 19C9 15 12.5 11.5 16 8" /></svg>
  ),
};

// ── Count-up (reduced-motion aware) — animates a number on mount ─────────
function CountUp({ to, format, dur = 700 }: { to: number; format: (v: number) => string; dur?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      // Snap to the final value on the next frame (deferring the setState keeps
      // it out of the effect body so it can't trigger a cascading render).
      const raf = requestAnimationFrame(() => setVal(to));
      return () => cancelAnimationFrame(raf);
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setVal(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, dur]);
  return <>{format(val)}</>;
}

// ── BKG logo mark — the animated "Viver" hammer-with-roots ───────────────
function BkgMark({ size = 28, radius = 4, src }: { size?: number; radius?: number; src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const go = () => {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    go();
    if (v.readyState < 2) v.addEventListener('loadeddata', go, { once: true });
  }, []);
  return (
    <span className="ol-mark" style={{ width: size, height: size, borderRadius: radius }}>
      <video ref={ref} src={src} autoPlay loop muted playsInline preload="auto" />
    </span>
  );
}

// ── Instrument gauge — brass bezel, lifted from the BKG kit ──────────────
function Gauge({ value = 0.5, accent = '#3C7A8A', label = '' }: { value?: number; accent?: string; label?: string }) {
  const deg = -130 + value * 260;
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = ((-130 + i * 26) * Math.PI) / 180;
    const r1 = 60;
    const r2 = i % 5 === 0 ? 52 : 56;
    ticks.push(
      <line
        key={i}
        x1={85 + Math.cos(a) * r1}
        y1={85 + Math.sin(a) * r1}
        x2={85 + Math.cos(a) * r2}
        y2={85 + Math.sin(a) * r2}
        stroke={i % 5 === 0 ? '#2A2620' : '#5A3B1F'}
        strokeWidth={i % 5 === 0 ? 1.4 : 0.8}
        strokeLinecap="round"
        opacity={i % 5 === 0 ? 0.9 : 0.55}
      />
    );
  }
  // Stable, SSR-safe, per-instance id for the SVG gradient defs. Strip the
  // colons React's useId emits — they break `url(#…)` references in SVG.
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 170 170" width="100%" role="img" aria-label={label}>
      <defs>
        <radialGradient id={`brass-${id}`} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#E2CFA6" />
          <stop offset="55%" stopColor="#B08D5C" />
          <stop offset="100%" stopColor="#7C6235" />
        </radialGradient>
        <radialGradient id={`face-${id}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.5" />
        </radialGradient>
      </defs>
      <circle cx="85" cy="85" r="78" fill={`url(#brass-${id})`} stroke="#7C6235" strokeWidth="1.5" />
      <circle cx="85" cy="85" r="66" fill="#F2E9D2" stroke="#7C6235" strokeWidth="0.5" />
      <circle cx="85" cy="85" r="62" fill={`url(#face-${id})`} />
      {ticks}
      <g transform={`translate(85 85) rotate(${deg})`}>
        <line x1="0" y1="6" x2="0" y2="-50" stroke="#2A2620" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx="85" cy="85" r="6" fill="#7C6235" stroke="#2A2620" strokeWidth="0.6" />
      <circle cx="85" cy="85" r="2.5" fill="#2A2620" />
    </svg>
  );
}

// ── Persistent strips — budget + journey, owner's plain-words slice ──────
// Two representations of one project (money + time), aligned column-for-column
// across the 7 locked stages. Reveals on mount: the journey line draws in, the
// instrument marks rise (`is-lit`), and the budget counts up. Hovering a stage
// scrubs the "you are here" flag along the timeline. All motion is suppressed
// under prefers-reduced-motion: the CSS kills the keyframes/transitions, so
// flipping `lit` on the next frame applies the final state instantly.
function OwnerStrips({ data }: { data: OwnerLaneData }) {
  const [lit, setLit] = useState(false);
  const [scrub, setScrub] = useState<number | null>(null);
  useEffect(() => {
    const r = requestAnimationFrame(() => setLit(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const curIndex = data.stages.findIndex((s) => s.status === 'current');
  const segW = 100 / data.stages.length;
  const cur = curIndex * segW + segW * (data.buildPct / 100);
  const fillW = lit ? cur : 0;
  const scrubLeft = scrub != null ? scrub : lit ? cur : 0;

  return (
    <div className={`ol-strips ${lit ? 'is-lit' : ''}`}>
      {/* BUDGET — money */}
      <div className="ol-strip">
        <div className="ol-strip-lead">
          <BkgMark size={38} src={data.logoSrc} />
          <div style={{ minWidth: 0 }}>
            <div className="ol-strip-brand">{data.projectName}</div>
            <div className="ol-strip-kicker">Builder&rsquo;s Knowledge Garden &middot; Owner</div>
          </div>
        </div>
        <div className="ol-btrack">
          {data.stages.map((s, i) => {
            const Icon = STAGE_ICO[s.icon] ?? STAGE_ICO.square;
            return (
              <div
                key={s.slug}
                className={`ol-bcell is-${s.money} ${s.status === 'current' ? 'is-cur' : ''}`}
                style={{ animationDelay: `${i * 55}ms` }}
                title={`${s.label} — ${s.money === 'paid' ? 'paid' : s.money === 'now' ? 'awaiting you' : 'upcoming'}`}
              >
                <span className="ol-bcell-ico">
                  <Icon width={15} height={15} />
                </span>
                <span className="ol-bcell-amt">
                  {s.money === 'paid' ? 'Paid' : s.money === 'now' ? s.payLabel : 'Soon'}
                </span>
                {s.status === 'current' && <span className="ol-bcell-tick" aria-hidden="true" />}
              </div>
            );
          })}
        </div>
        <div className="ol-strip-end">
          <div className="ol-strip-end-big">
            <CountUp to={data.budgetLeftValue} format={(v) => `$${(v / 1e6).toFixed(2)}M`} />
          </div>
          <div className="ol-strip-end-sub">left of {data.budgetTotalLabel}</div>
        </div>
      </div>

      {/* JOURNEY / TIME MACHINE — time */}
      <div className="ol-strip ol-strip-j">
        <div className="ol-strip-lead ol-strip-lead-j">
          <span className="ol-eng">Journey &middot; time machine</span>
        </div>
        <div className="ol-jtrack">
          <div className="ol-jline">
            <div className="ol-jline-fill" style={{ width: `${fillW}%` }} />
          </div>
          {data.stages.map((s, i) => {
            const Icon = STAGE_ICO[s.icon] ?? STAGE_ICO.square;
            const nodeLit = lit && i <= curIndex;
            return (
              <div
                key={s.slug}
                className={`ol-jnode ${s.status === 'done' ? 'is-done' : ''} ${s.status === 'current' ? 'is-cur' : ''} ${nodeLit ? 'lit' : ''}`}
                onMouseEnter={() => setScrub((i + 0.5) * segW)}
                onMouseLeave={() => setScrub(null)}
              >
                <span className="ol-jdot" />
                <span className="ol-jico" style={{ animationDelay: `${i * 70}ms` }}>
                  <Icon width={16} height={16} />
                </span>
                <span className="ol-jname">{s.label}</span>
                <span className="ol-jplain">{s.plain}</span>
              </div>
            );
          })}
          <div className="ol-jscrub" style={{ left: `${scrubLeft}%` }}>
            <span className="ol-jscrub-flag">{data.jscrubLabel}</span>
          </div>
        </div>
        <div className="ol-strip-end">
          <div className="ol-strip-end-big">{data.buildPct}%</div>
          <div className="ol-strip-end-sub">
            wk {data.weekOf} / {data.weeksTotal}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Needs-you — the framing pay-app approval ─────────────────────────────
function NeedsYou({ data }: { data: OwnerLaneData }) {
  const [state, setState] = useState<'pending' | 'approved' | 'held'>('pending');
  const ny = data.needsYou;

  if (state === 'approved') {
    return (
      <article className="ol-specimen">
        <header className="ol-specimen-head">
          <span className="ol-eng">{ny.plate}</span>
          <span className="ol-tag tone-sage">Approved</span>
        </header>
        <h2 className="ol-ny-title">Payment released &mdash; {ny.amountLabel}</h2>
        <p className="ol-ny-blurb">
          <em>{ny.framer}</em> has been paid for the framing. It&rsquo;s recorded in your field log and your budget &mdash; nothing more is needed from you right now.
        </p>
        <button className="ol-btn-link" onClick={() => setState('pending')}>
          Undo <Ico.arrow />
        </button>
      </article>
    );
  }

  const held = state === 'held';
  return (
    <article className="ol-specimen ol-ny">
      <header className="ol-specimen-head">
        <span className="ol-eng">{ny.plate}</span>
        <span className="ol-tag tone-rust">Needs you</span>
      </header>
      <div className="ol-ny-grid">
        <div>
          <h2 className="ol-ny-title">Approve the framing payment</h2>
          <p className="ol-ny-blurb">
            <em>{ny.framer}</em> &mdash; your framing crew &mdash; is asking to be paid <em>{ny.amountLabel}</em> for the framing they&rsquo;ve finished. Both floors are framed and the framing inspection passed. Your builder has reviewed it and approved.
          </p>
          <div className="ol-ny-checks">
            <div className="ol-ny-check"><Ico.check /><span>Both floors framed &mdash; framing inspection passed Tuesday.</span></div>
            <div className="ol-ny-check"><Ico.check /><span>Matches the framing amount in your contract &mdash; no change to the total.</span></div>
            <div className="ol-ny-check"><Ico.check /><span>Photos of the finished framing are attached below.</span></div>
          </div>
          {held && (
            <p className="ol-ny-hold">
              On hold &mdash; your builder has been asked to walk you through it before you approve.
            </p>
          )}
          <div className="ol-ny-actions">
            <button className="ol-btn ol-btn-accent ol-btn-amount" onClick={() => setState('approved')}>
              Approve {ny.amountLabel}
            </button>
            <button className="ol-btn ol-btn-ghost" onClick={() => setState(held ? 'pending' : 'held')}>
              <Ico.pause /> {held ? 'Resume' : 'Hold — ask a question'}
            </button>
            <button className="ol-btn-link">See the framing photos <Ico.arrow /></button>
          </div>
        </div>
        <div className="ol-ny-amount">
          <div className="ol-ny-amount-label">This payment</div>
          <div className="ol-ny-amount-big">{ny.amountLabel}</div>
          <div className="ol-ny-amount-sub">{ny.sub}</div>
          <div>
            <div className="ol-ny-meter-track">
              <div className="ol-ny-meter-fill" style={{ width: `${ny.pctOfRemaining}%` }} />
            </div>
            <div className="ol-ny-meter-cap">
              About {ny.pctOfRemaining}% of the {ny.budgetLeftLabel} you have left
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Big three — gauges or specimen cards ─────────────────────────────────
function BigThree({ readings, mode }: { readings: OwnerReading[]; mode: 'gauges' | 'cards' }) {
  if (mode === 'cards') {
    return (
      <div className="ol-gauges">
        {readings.map((r) => {
          const tone = r.noteTone === 'good' ? 'sage' : r.noteTone === 'watch' ? 'amber' : 'teal';
          return (
            <article key={r.key} className="ol-specimen">
              <header className="ol-specimen-head">
                <span className="ol-eng">{r.label}</span>
                <span className={`ol-tag tone-${tone}`}>{r.note}</span>
              </header>
              <div className="ol-ovstat-big">{r.big}</div>
              <div className="ol-ovstat-cap">{r.caption}</div>
              <div className="ol-ovstat-meter">
                <div className="ol-ovstat-fill" style={{ width: `${Math.round(r.value * 100)}%`, background: r.accent }} />
              </div>
            </article>
          );
        })}
      </div>
    );
  }
  return (
    <div className="ol-gauges">
      {readings.map((r) => (
        <div key={r.key} className="ol-ovg">
          <div className="ol-ovg-q">{r.question}</div>
          <div className="ol-ovg-gaugewrap">
            <Gauge value={r.value} accent={r.accent} label={`${r.label}: ${r.read}`} />
          </div>
          <div className="ol-ovg-read">{r.read}</div>
          <div className={`ol-ovg-note ol-note-${r.noteTone}`}>
            <span className="ol-pip" />
            {r.note}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Field-log composer (owner upload) ────────────────────────────────────
function FieldLog() {
  const KINDS: { id: keyof typeof KIND_ICONS; label: string }[] = [
    { id: 'photo', label: 'Photo' },
    { id: 'video', label: 'Video' },
    { id: 'sketch', label: 'Sketch' },
    { id: 'receipt', label: 'Receipt' },
  ];
  const [kind, setKind] = useState<keyof typeof KIND_ICONS>('photo');
  const [note, setNote] = useState('');
  return (
    <div className="ol-fl">
      <div>
        <button type="button" className="ol-fl-slot">Drop a photo, video, sketch, or receipt</button>
        <div className="ol-fl-kinds">
          {KINDS.map((k) => {
            const Icon = KIND_ICONS[k.id];
            return (
              <button key={k.id} type="button" className={`ol-fl-chip ${kind === k.id ? 'is-on' : ''}`} onClick={() => setKind(k.id)}>
                <Icon /> {k.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="ol-fl-note">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for your builder — a question, something you noticed on a walkthrough, or a change you're thinking about."
        />
        <div className="ol-fl-foot">
          <span className="ol-eng"><Ico.clip /> Goes straight to your builder &amp; your field log</span>
          <button className="ol-btn ol-btn-accent" disabled={!note.trim()}>Add to log</button>
        </div>
      </div>
    </div>
  );
}

// ── Recent field-log entry ───────────────────────────────────────────────
function OwnerEntry({ entry }: { entry: OwnerEntryData }) {
  return (
    <article className="ol-specimen">
      <header className="ol-specimen-head">
        <span className="ol-eng">PLATE NO. {entry.plate} &middot; BUILD &middot; {entry.date}</span>
        {entry.tag && <span className={`ol-tag tone-${entry.tagTone}`}>{entry.tag}</span>}
      </header>
      {entry.thumb && <div className="ol-entry-thumb" style={{ backgroundImage: `url(${entry.thumb})` }} />}
      <h3 className="ol-entry-title">{entry.title}</h3>
      {entry.meta && <div className="ol-entry-meta">{entry.meta}</div>}
      {entry.quote && <p className="ol-entry-quote">&ldquo;{entry.quote}&rdquo;</p>}
    </article>
  );
}

// ── The surface ──────────────────────────────────────────────────────────
export default function OwnerLaneClient({ data }: { data: OwnerLaneData }) {
  const [bigThree, setBigThree] = useState<'gauges' | 'cards'>('gauges');
  return (
    <div className="ol-root">
      <OwnerStrips data={data} />

      <div className="ol-content">
        <div className="ol-greetrow">
          <div className="ol-greet">Good morning, {data.ownerGreeting} &mdash; here&rsquo;s your build today.</div>
          <div className="ol-greet-mono">{data.detailMono}</div>
        </div>

        {/* HERO — the owner's favourite: home rendering behind the headline */}
        <header className="ol-hero">
          <div className="ol-hero-img" style={{ backgroundImage: `url(${data.heroImg})` }} />
          <div className="ol-hero-tint" />
          <div className="ol-hero-grid" />
          <div className="ol-hero-scrim" />
          <div className="ol-hero-text">
            <div className="ol-hero-eyebrow">Your build &middot; by the instruments</div>
            <h1 className="ol-hero-title">Where your build stands</h1>
            <div className="ol-hero-sub">The same gauges your builder reads &mdash; in plain words, just for you.</div>
          </div>
          <div className="ol-hero-cap"><span className="ol-plate-caption">Modern Farmhouse</span></div>
        </header>

        <section className="ol-section">
          <div className="ol-section-head">
            <h2>Needs you</h2>
            <span className="ol-eng">1 waiting &middot; approvals</span>
          </div>
          <NeedsYou data={data} />
        </section>

        <section className="ol-section">
          <div className="ol-section-head">
            <h2>The big three, at a glance</h2>
            <div className="ol-section-head-actions">
              <span className="ol-eng">Marin &middot; wk {data.weekOf} of {data.weeksTotal}</span>
              <div className="ol-toggle" role="group" aria-label="Show the readings as">
                <button type="button" className={bigThree === 'gauges' ? 'is-on' : ''} onClick={() => setBigThree('gauges')} aria-pressed={bigThree === 'gauges'}>
                  Gauges
                </button>
                <button type="button" className={bigThree === 'cards' ? 'is-on' : ''} onClick={() => setBigThree('cards')} aria-pressed={bigThree === 'cards'}>
                  Cards
                </button>
              </div>
            </div>
          </div>
          <BigThree readings={data.readings} mode={bigThree} />
        </section>

        <section className="ol-section">
          <div className="ol-summary">
            <div className="ol-summary-lead">
              <div className="ol-eng">The short version</div>
              <p>
                {data.summaryLeadBefore}
                <strong>{data.summaryStageLabel}</strong>
                {data.summaryLeadAfter}
              </p>
            </div>
            <div className="ol-summary-rule" />
            {data.summaryStats.map((s) => (
              <div key={s.lab} className="ol-stat">
                <div className="ol-stat-num">{s.num}</div>
                <div className="ol-stat-lab">{s.lab}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="ol-section">
          <div className="ol-section-head">
            <h2>Add to your file</h2>
            <span className="ol-eng">Field log &middot; goes to your builder</span>
          </div>
          <FieldLog />
        </section>

        <section className="ol-section">
          <div className="ol-section-head">
            <h2>Lately on site</h2>
            <span className="ol-eng">2026 &middot; 05 &middot; recent</span>
          </div>
          <div className="ol-specimens">
            {data.entries.map((e) => (
              <OwnerEntry key={e.plate} entry={e} />
            ))}
          </div>
        </section>
      </div>

      <div className="ol-foot">
        <span>Builder&rsquo;s Knowledge Garden &middot; Killer App &middot; Owner lane</span>
        <span>XRWorkers &middot; Knowledge Gardens &middot; 2026</span>
      </div>
    </div>
  );
}
