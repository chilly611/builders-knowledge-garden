'use client';

/**
 * Owner Lane — presentational + lightly-interactive parts.
 *
 * Ported from the Knowledge Gardens design export
 * (owner-lane/components.jsx). The originals hard-coded the Marin numbers;
 * here every value is a prop so the data can flow from the permission-gated
 * /api/owner-home loader (a denied Lens cell renders a redacted state in the
 * composition layer, not inside these parts).
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Ico } from './icons';
import { KAC_STAGES } from '@/components/killerapp-chrome/types';

// ── Journey phases — the 7 LOCKED lifecycle stages, sourced from the shared
//    canon (KAC_STAGES) so the owner strip can never drift from the rest of the
//    Killer App: Size Up → Lock → Plan → Build → Adapt → Collect → Reflect.
export const PHASES = KAC_STAGES.map((s) => ({
  id: s.slug as string,
  label: s.short,
  n: String(s.id).padStart(2, '0'),
}));

// Where the money sits across the 7 stages, for the budget strip.
const MONEY_STATE: Record<string, 'paid' | 'now' | 'soon'> = {
  'size-up': 'paid', lock: 'paid', plan: 'paid', build: 'now', adapt: 'soon', collect: 'soon', reflect: 'soon',
};

const fmtUSD = (n: number) => '$' + n.toLocaleString('en-US');
const fmtK = (n: number) => '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';

// ── Animated botanical logo mark ─────────────────────────────────────────────
export function BkgMark({ size = 28, radius = 4 }: { size?: number; radius?: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const go = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    go();
    if (v.readyState < 2) v.addEventListener('loadeddata', go, { once: true });
  }, []);
  return (
    <span className="bkg-mark" style={{ width: size, height: size, borderRadius: radius }}>
      <video ref={ref} src="/owner-lane/bkg-logo.mp4" autoPlay loop muted playsInline preload="auto" />
    </span>
  );
}

// ── Instrument gauge (SVG) ───────────────────────────────────────────────────
export function Gauge({ value = 0.5, label = '', accent = '#3C7A8A' }: { value?: number; label?: string; accent?: string }) {
  const deg = -130 + value * 260;
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = ((-130 + i * 26) * Math.PI) / 180;
    const r1 = 60;
    const r2 = i % 5 === 0 ? 52 : 56;
    ticks.push(
      <line key={i}
        x1={85 + Math.cos(a) * r1} y1={85 + Math.sin(a) * r1}
        x2={85 + Math.cos(a) * r2} y2={85 + Math.sin(a) * r2}
        stroke={i % 5 === 0 ? '#2A2620' : '#5A3B1F'}
        strokeWidth={i % 5 === 0 ? 1.4 : 0.8} strokeLinecap="round"
        opacity={i % 5 === 0 ? 0.9 : 0.55} />,
    );
  }
  const id = useRef(`g${Math.random().toString(36).slice(2, 7)}`).current;
  return (
    <svg viewBox="0 0 170 170" width="100%">
      <defs>
        <radialGradient id={`brass-${id}`} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#E2CFA6" /><stop offset="55%" stopColor="#B08D5C" /><stop offset="100%" stopColor="#7C6235" />
        </radialGradient>
        <radialGradient id={`face-${id}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.95" /><stop offset="100%" stopColor={accent} stopOpacity="0.5" />
        </radialGradient>
      </defs>
      <circle cx="85" cy="85" r="78" fill={`url(#brass-${id})`} stroke="#7C6235" strokeWidth="1.5" />
      <circle cx="85" cy="85" r="66" fill="#F2E9D2" stroke="#7C6235" strokeWidth="0.5" />
      <circle cx="85" cy="85" r="62" fill={`url(#face-${id})`} />
      {ticks}
      {label && <text x="85" y="128" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="8" letterSpacing="1.6" fill="#2A2620">{label.toUpperCase()}</text>}
      <g transform={`translate(85 85) rotate(${deg})`}>
        <line x1="0" y1="6" x2="0" y2="-50" stroke="#2A2620" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx="85" cy="85" r="6" fill="#7C6235" stroke="#2A2620" strokeWidth="0.6" />
      <circle cx="85" cy="85" r="2.5" fill="#2A2620" />
    </svg>
  );
}

type NoteTone = 'good' | 'watch' | 'info';
export interface Reading {
  label: string; question: string; value: number; accent: string;
  gaugeRead: string; big: string; caption: string; note: string; noteTone: NoteTone;
}

export function OwnerGauge({ question, value, accent, read, note, noteTone = 'info' }: { question: string; value: number; accent: string; read: string; note: string; noteTone?: NoteTone }) {
  return (
    <div className="ovg">
      <div className="ovg-q">{question}</div>
      <div className="ovg-gaugewrap"><Gauge value={value} accent={accent} /></div>
      <div className="ovg-read">{read}</div>
      <div className={`ovg-note note-${noteTone}`}><span className="pip" />{note}</div>
    </div>
  );
}

export function OwnerStatCard({ label, big, caption, value, accent = '#3C7A8A', note, noteTone = 'info' }: { label: string; big: string; caption: string; value: number; accent?: string; note: string; noteTone?: NoteTone }) {
  const tone = noteTone === 'good' ? 'sage' : noteTone === 'watch' ? 'amber' : 'teal';
  return (
    <article className="bkg-specimen ovstat">
      <header className="bkg-specimen-head">
        <span className="eng-label">{label}</span>
        <span className={`bkg-specimen-tag tone-${tone}`}>{note}</span>
      </header>
      <div className="ovstat-big">{big}</div>
      <div className="ovstat-cap">{caption}</div>
      <div className="ovstat-meter"><div className="ovstat-fill" style={{ width: Math.round(value * 100) + '%', background: accent }} /></div>
    </article>
  );
}

export function BigThree({ readings, style }: { readings: Reading[]; style: 'gauges' | 'cards' }) {
  if (style === 'cards') {
    return (
      <div className="ov-gauges">
        {readings.map((r, i) => (
          <OwnerStatCard key={i} label={r.label} big={r.big} caption={r.caption} value={r.value} accent={r.accent} note={r.note} noteTone={r.noteTone} />
        ))}
      </div>
    );
  }
  return (
    <div className="ov-gauges">
      {readings.map((r, i) => (
        <OwnerGauge key={i} question={r.question} value={r.value} accent={r.accent} read={r.gaugeRead} note={r.note} noteTone={r.noteTone} />
      ))}
    </div>
  );
}

// ── NEEDS-YOU — the framing pay-app approval (REAL, persisted) ───────────────
export function NeedsYouCard({
  amount, budgetLeft, budgetLeftLabel, framer, canApprove,
  approved = false, projectId, preview = false,
}: {
  amount: number; budgetLeft: number; budgetLeftLabel: string; framer: string;
  canApprove: boolean; approved?: boolean; projectId: string; preview?: boolean;
}) {
  const [state, setState] = useState<'pending' | 'approved' | 'held'>(approved ? 'approved' : 'pending');
  const [busy, setBusy] = useState(false);
  const pct = Math.max(2, Math.round((amount / budgetLeft) * 100));

  // Reflect server truth if the loader re-resolves the approval (e.g. on return).
  useEffect(() => { setState(approved ? 'approved' : 'pending'); }, [approved]);

  // REAL approval. POSTs to /api/owner-home/approve, which re-checks the
  // change_orders/approve Lens server-side and persists to project_change_orders
  // so the decision survives leave → return. No optimistic fake: the card only
  // flips after the server confirms.
  async function postApproval(next: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch(`/api/owner-home/approve${preview ? '?preview=1' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ projectId, approve: next }),
      });
      if (!res.ok) throw new Error(`approve ${res.status}`);
      setState(next ? 'approved' : 'pending');
    } catch (err) {
      console.error('[NeedsYou] approval failed:', err);
      // Leave state unchanged on failure — never show a success that didn't persist.
    } finally {
      setBusy(false);
    }
  }

  if (state === 'approved') {
    return (
      <article className="bkg-specimen">
        <header className="bkg-specimen-head">
          <span className="eng-label">PLATE NO. 0042 · BUILD · PAY APPLICATION 04</span>
          <span className="bkg-specimen-tag tone-sage">Approved</span>
        </header>
        <h2 className="ny-title">Payment approved — {fmtUSD(amount)}</h2>
        <p className="ny-blurb">You&apos;ve approved the framing payment for <em>{framer}</em>. It&apos;s recorded in your field log and your budget — nothing more is needed from you right now.</p>
        <button className="btn-link" onClick={() => postApproval(false)} disabled={busy}>{busy ? 'Saving…' : <>Undo <Ico.arrow /></>}</button>
      </article>
    );
  }
  const held = state === 'held';
  return (
    <article className="bkg-specimen ny">
      <header className="bkg-specimen-head">
        <span className="eng-label">PLATE NO. 0042 · BUILD · PAY APPLICATION 04</span>
        <span className="bkg-specimen-tag tone-rust">Needs you</span>
      </header>
      <div className="ny-grid">
        <div className="ny-main">
          <h2 className="ny-title">Approve the framing payment</h2>
          <p className="ny-blurb">
            <em>{framer}</em> — your framing crew — is asking to be paid <em>{fmtUSD(amount)}</em> for the framing they&apos;ve finished. Both floors are framed and the framing inspection passed. Your builder has reviewed it and approved.
          </p>
          <div className="ny-checks">
            <div className="ny-check"><Ico.check /><span>Both floors framed — framing inspection passed Tuesday.</span></div>
            <div className="ny-check"><Ico.check /><span>Matches the framing amount in your contract — no change to the total.</span></div>
            <div className="ny-check"><Ico.check /><span>Photos of the finished framing are attached below.</span></div>
          </div>
          {held && (
            <p className="ny-blurb" style={{ fontStyle: 'normal', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--specimen-rust-deep)' }}>
              On hold — your builder has been asked to walk you through it before you approve.
            </p>
          )}
          <div className="ny-actions">
            <button className="btn btn-accent btn-amount" onClick={() => postApproval(true)} disabled={!canApprove || busy} title={canApprove ? undefined : 'Your Lens does not permit approving payments'}>{busy ? 'Approving…' : `Approve ${fmtUSD(amount)}`}</button>
            <button className="btn btn-ghost" onClick={() => setState(held ? 'pending' : 'held')} disabled={busy}>
              <Ico.pause /> {held ? 'Resume' : 'Hold — ask a question'}
            </button>
            <button className="btn-link is-alpha" disabled title="Alpha — photo viewing is coming soon">See the framing photos · soon</button>
          </div>
        </div>
        <div className="ny-amount">
          <div className="ny-amount-label">This payment</div>
          <div className="ny-amount-big">{fmtUSD(amount)}</div>
          <div className="ny-amount-sub">Framing labor — {framer}</div>
          <div className="ny-amount-meter">
            <div className="ny-meter-track"><div className="ny-meter-fill" style={{ width: pct + '%' }} /></div>
            <div className="ny-meter-cap">About {pct}% of the {budgetLeftLabel} you have left</div>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Field-log composer (owner upload — SA3 contributions stream) ─────────────
const KINDS = [
  { id: 'photo', label: 'Photo', icon: Ico.camera },
  { id: 'video', label: 'Video', icon: Ico.video },
  { id: 'sketch', label: 'Sketch', icon: Ico.ruler },
  { id: 'receipt', label: 'Receipt', icon: Ico.receipt },
] as const;

export function FieldLog({ canCreate }: { projectId: string; canCreate: boolean; preview?: boolean }) {
  const [kind, setKind] = useState<string>('photo');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ALPHA — saving an owner upload to the shared field log is not wired yet.
  // The composer stays fully interactive so the experience is legible, but the
  // action is honestly disabled rather than faking a successful save. (The
  // Owner Lens also grants photos_field_logs VIEW/EXPORT only, not create.)
  const alphaNote = canCreate ? 'Alpha · coming soon' : 'Not on your Lens yet';

  return (
    <div className="fl">
      <div className="fl-row">
        <div className="fl-drop">
          <label
            className={`fl-slot ${drag ? 'is-drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
          >
            {file
              ? <span className="fl-slot-name">{file.name}</span>
              : <span className="fl-slot-hint">Drop a photo, video, sketch, or receipt</span>}
            <input ref={inputRef} type="file" accept="image/*,video/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <div className="fl-kinds">
            {KINDS.map((k) => (
              <button key={k.id} type="button" className={`fl-chip ${kind === k.id ? 'is-on' : ''}`} onClick={() => setKind(k.id)}>
                <k.icon /> {k.label}
              </button>
            ))}
          </div>
        </div>
        <div className="fl-note">
          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for your builder — a question, something you noticed on a walkthrough, or a change you're thinking about." />
          <div className="fl-foot">
            <span className="eng-label"><Ico.clip /> &nbsp;Goes straight to your builder &amp; your field log</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <span className="ov-alpha-tag">{alphaNote}</span>
              <button className="btn btn-accent" disabled title="Alpha — saving to your file is coming soon">Add to log</button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Owner field-log entry ────────────────────────────────────────────────────
export interface EntryData { plate: string; date: string; title: string; meta?: string; quote?: string; tag?: string; tagTone?: string; thumb?: string }
export function OwnerEntry({ plate, date, title, meta, quote, tag, tagTone, thumb }: EntryData) {
  return (
    <article className="bkg-specimen">
      <header className="bkg-specimen-head">
        <span className="eng-label">PLATE NO. {plate} · BUILD · {date}</span>
        {tag && <span className={`bkg-specimen-tag tone-${tagTone}`}>{tag}</span>}
      </header>
      {thumb && <div className="ov-entry-thumb" style={{ backgroundImage: `url(${thumb})` }} />}
      <h3 className="bkg-specimen-title">{title}</h3>
      {meta && <div className="bkg-specimen-meta">{meta}</div>}
      {quote && <p className="bkg-specimen-quote">&quot;{quote}&quot;</p>}
    </article>
  );
}

// ── GLOBAL STRIPS — budget + journey/time-machine, persistent, aligned ───────
export interface StripProps {
  projectName: string;
  active?: string;
  payApp: number;
  budgetLeftLabel: string;
  budgetTotalLabel: string;
  buildPct: number;
  weekOf: number;
  weeksTotal: number;
  showBudget: boolean;
  showSchedule: boolean;
}
export function GlobalStrips({ projectName, active = 'build', payApp, budgetLeftLabel, budgetTotalLabel, buildPct, weekOf, weeksTotal, showBudget, showSchedule }: StripProps) {
  const ai = PHASES.findIndex((p) => p.id === active);
  const segW = 100 / PHASES.length;
  const cur = ai * segW + segW * (buildPct / 100);
  const payLabel = fmtK(payApp);
  return (
    <div className="gstrips">
      <div className="gstrip">
        <div className="gstrip-lead">
          <BkgMark size={38} />
          <div className="gstrip-lead-txt">
            <div className="gstrip-brand">{projectName}</div>
            <div className="gstrip-kicker">Builder&apos;s Knowledge Garden · Owner</div>
          </div>
        </div>
        {showBudget ? (
          <>
            <div className="gstrip-track btrack">
              {PHASES.map((p) => {
                const st = MONEY_STATE[p.id];
                return (
                  <div key={p.id} className={`bcell st-${st} ${p.id === active ? 'is-cur' : ''}`}>
                    <span className="bcell-lab">{p.label}</span>
                    <span className="bcell-amt">{st === 'paid' ? 'Paid' : st === 'now' ? payLabel : 'Soon'}</span>
                    {p.id === active && <span className="bcell-tick" title="Framing payment awaiting you" />}
                  </div>
                );
              })}
            </div>
            <div className="gstrip-end">
              <div className="gstrip-end-big">{budgetLeftLabel}</div>
              <div className="gstrip-end-sub">left of {budgetTotalLabel}</div>
            </div>
          </>
        ) : (
          <div className="gstrip-track"><RedactedInline label="Budget" /></div>
        )}
      </div>

      <div className="gstrip gstrip-j">
        <div className="gstrip-lead gstrip-lead-j">
          <span className="eng-label">Journey · time machine</span>
        </div>
        {showSchedule ? (
          <>
            <div className="gstrip-track jtrack">
              <div className="jline"><div className="jline-fill" style={{ width: cur + '%' }} /></div>
              {PHASES.map((p, i) => (
                <div key={p.id} className={`jnode ${ai > i ? 'is-done' : ''} ${p.id === active ? 'is-cur' : ''}`}>
                  <span className="jdot" />
                  <span className="jn">{p.n}</span>
                  <span className="jl">{p.label}</span>
                </div>
              ))}
              <div className="jscrub" style={{ left: cur + '%' }}><span className="jscrub-flag">wk {weekOf}</span></div>
            </div>
            <div className="gstrip-end">
              <div className="gstrip-end-big">{buildPct}%</div>
              <div className="gstrip-end-sub">wk {weekOf} / {weeksTotal}</div>
            </div>
          </>
        ) : (
          <div className="gstrip-track"><RedactedInline label="Schedule" /></div>
        )}
      </div>
    </div>
  );
}

function RedactedInline({ label }: { label: string }) {
  return (
    <span className="ov-redacted" style={{ padding: '6px 10px' }}>
      <span className="ov-redacted-mark">Restricted</span>
      <span className="ov-redacted-txt">{label} isn&apos;t shared with your Lens.</span>
    </span>
  );
}

// ── Compass rose + persistent nav ────────────────────────────────────────────
function CompassRose({ open }: { open: boolean }) {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" style={{ transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 220ms var(--ease-out-paper)' }}>
      <circle cx="24" cy="24" r="20" stroke="#234C5A" strokeWidth=".7" opacity=".25" fill="none" />
      <path d="M24 5 L26.5 24 L21.5 24 Z" fill="#234C5A" opacity=".8" />
      <path d="M24 43 L21.5 24 L26.5 24 Z" fill="#A53A2D" opacity=".6" />
      <path d="M5 24 L24 21.5 L24 26.5 Z" fill="#B08D5C" opacity=".6" />
      <path d="M43 24 L24 26.5 L24 21.5 Z" fill="#B08D5C" opacity=".6" />
      <circle cx="24" cy="24" r="3" fill="none" stroke="#234C5A" strokeWidth=".9" />
      <circle cx="24" cy="24" r="1.3" fill="#A53A2D" />
    </svg>
  );
}

export function PersistentNav() {
  const [nav, setNav] = useState(false);
  const [ask, setAsk] = useState(false);
  const sections = [
    { id: 'home', label: 'Your build', sub: 'Where things stand' },
    { id: 'needs', label: 'Needs you', sub: '1 waiting', flag: true },
    { id: 'files', label: 'Photos & files', sub: 'Your field log' },
    { id: 'money', label: 'Money', sub: 'Budget & payments' },
    { id: 'people', label: 'People', sub: 'Builder & crew' },
  ];
  return (
    <div className="pnav">
      {ask && (
        <div className="pnav-panel pnav-ask-panel">
          <div className="pnav-panel-head"><span className="eng-label">Ask the garden</span><span className="pnav-lane">Alpha</span><button className="pnav-x" onClick={() => setAsk(false)}>✕</button></div>
          <form className="bkg-composer" onSubmit={(e) => e.preventDefault()}>
            <div className="bkg-composer-leader"><Ico.search /></div>
            <input className="bkg-composer-input" placeholder="Ask about your build, budget, or a decision…" disabled />
            <button type="submit" className="bkg-composer-submit" disabled title="Alpha — coming soon">Ask</button>
          </form>
          <div className="pnav-ask-hint">Alpha — the garden&apos;s plain-language answers are coming soon.</div>
        </div>
      )}
      {nav && (
        <div className="pnav-panel pnav-menu">
          <div className="pnav-panel-head"><span className="eng-label">Navigate</span><span className="pnav-lane">Owner lane</span></div>
          {sections.map((s) => (
            <button key={s.id} className="pnav-item" type="button">
              <span className="pnav-item-marker" style={s.flag ? { background: 'var(--specimen-rust)' } : undefined} />
              <span className="pnav-item-txt">
                <span className="pnav-item-l">{s.label}</span>
                <span className="pnav-item-s">{s.sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="pnav-cluster">
        <button className="pnav-ask" type="button" onClick={() => { setAsk(!ask); setNav(false); }}>
          <span className="pnav-ask-dot" /> Ask the garden
        </button>
        <button className="pnav-compass" type="button" aria-label="Navigate" onClick={() => { setNav(!nav); setAsk(false); }}>
          <CompassRose open={nav} />
        </button>
      </div>
    </div>
  );
}
