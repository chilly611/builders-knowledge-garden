'use client';

/**
 * Dream Machine v2 — the imagine → build pipeline (Claude Design mock, ported).
 * ===========================================================================
 * A five-stage forward pipeline on the shared App Shell: a sticky Spine rail +
 * one active stage. NEW surface at /killerapp/dream-studio-2; coexists with
 * /killerapp/dream-studio and /killerapp/dream (untouched). The shell chrome
 * (UmbrellaBar / GlobalStrips / PersistentNav) comes from killerapp/layout.tsx
 * (useStageProject-driven); the five-stage CONTENT renders from the DM2 demo
 * literal (Twin Peaks Residence). High-fidelity interactive prototype — the
 * cheap interactions are live; FLUX/plan-gen/persistence are a follow-up.
 *
 * Schematic drawings are rectilinear SVG line-work (on-brand engineering
 * schematic), not raster. Tokens only; reduced-motion honored (CSS).
 */

import { useEffect, useState } from 'react';
import { DM2 as D } from './dm2-data';
import './dream-studio-2.css';

type StageT = (typeof D.stages)[number];
type Variant = 'desktop' | 'mobile';

/* ── herbarium line icons (inherit currentColor) ── */
const _v = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
type IP = React.SVGProps<SVGSVGElement>;
const V2I = {
  mic: (p: IP) => (<svg width="20" height="20" viewBox="0 0 24 24" {..._v} {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v3.5M9 20.5h6" /></svg>),
  type: (p: IP) => (<svg width="20" height="20" viewBox="0 0 24 24" {..._v} {...p}><path d="M5 7V5h14v2M12 5v14M9.5 19h5" /></svg>),
  image: (p: IP) => (<svg width="20" height="20" viewBox="0 0 24 24" {..._v} {...p}><rect x="3.5" y="5" width="17" height="14" rx="1.5" /><circle cx="9" cy="10" r="1.8" /><path d="M5 18l4.5-4.5 3 2.5 3.5-3.5 3 3" /></svg>),
  arrow: (p: IP) => (<svg width="15" height="15" viewBox="0 0 24 24" {..._v} {...p}><path d="M5 12h13M13 6l6 6-6 6" /></svg>),
  check: (p: IP) => (<svg width="15" height="15" viewBox="0 0 24 24" {..._v} {...p}><path d="M20 6 L9 17l-5-5" /></svg>),
  back: (p: IP) => (<svg width="15" height="15" viewBox="0 0 24 24" {..._v} {...p}><path d="M19 12H6M11 6l-6 6 6 6" /></svg>),
  sun: (p: IP) => (<svg width="15" height="15" viewBox="0 0 24 24" {..._v} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" /></svg>),
  // herbarium sprig (the seal mark + door foot)
  sprig: (p: IP) => (<svg width="16" height="16" viewBox="0 0 24 24" {..._v} {...p}><path d="M12 21V8M12 12c0-3 2-5 5-5 0 3-2 5-5 5M12 14c0-3-2-5-5-5 0 3 2 5 5 5M12 9c0-2 1.4-3.5 3.5-3.5C15.5 7.6 14 9 12 9" /></svg>),
};

/* shared forward affordance — the no-dead-ends promise */
function NextStep({ stage, go }: { stage: StageT; go: (d: number) => void }) {
  if (!stage.nextTo) return null;
  return (
    <div className="dm2-next">
      <div className="dm2-next-txt">
        <div className="l">{stage.nextLabel}</div>
        <div className="t">Carry <em>this project</em> forward — nothing re-entered.</div>
      </div>
      <div className="row">
        <button className="dm2-btn dm2-btn-back" type="button" onClick={() => go(-1)}><V2I.back /> Back</button>
        <button className="dm2-btn dm2-btn-onlight" type="button" onClick={() => go(1)}>{stage.nextVerb} <V2I.arrow /></button>
      </div>
    </div>
  );
}

function StageHead({ stage, variant }: { stage: StageT; variant: Variant }) {
  return (
    <div className="dm2-stagehead">
      <div className="dm2-stagehead-l">
        <div className="eyebrow">{stage.eyebrow}</div>
        <h1>{stage.h}</h1>
        <div className="sub">{stage.s}</div>
      </div>
      {variant !== 'mobile' && (
        <div className="dm2-stagehead-meta">{D.project.name}<br />{D.project.detail}<br />Step {stage.n} of 05</div>
      )}
    </div>
  );
}

/* ── STAGE 1 · IMAGINE ── */
function ImagineView({ stage, go, variant }: { stage: StageT; go: (d: number) => void; variant: Variant }) {
  const [door, setDoor] = useState('talk');
  const [style, setStyle] = useState<string | null>(null);
  return (
    <div className="dm2-body">
      <StageHead stage={stage} variant={variant} />
      <div className="dm2-sec">
        <div className="dm2-doors">
          {D.doors.map((dr) => {
            const on = door === dr.id;
            const Icon = V2I[dr.icon as keyof typeof V2I];
            return (
              <button key={dr.id} type="button" className={`dm2-door ${on ? 'is-on' : ''}`} onClick={() => setDoor(dr.id)}>
                <div className="dm2-door-ico"><Icon /></div>
                <div className="dm2-door-n">{dr.n}</div>
                <div className="dm2-door-t">{dr.t}</div>
                <div className="dm2-door-d">{dr.d}</div>
                <div className="dm2-door-foot"><V2I.sprig width="13" height="13" /> {dr.foot}</div>
                {on && dr.id === 'talk' && (
                  <div className="dm2-transcript">
                    {D.transcript.map((l, i) => <div key={i} className="dm2-tline"><span className="who">{l.who}</span>{l.t}</div>)}
                    <div className="dm2-mic"><span className="wave"><i /><i /><i /><i /><i /></span> Listening — sketching as you speak</div>
                  </div>
                )}
                {on && dr.id === 'describe' && (
                  <div className="dm2-constraints">
                    {D.constraints.map((c, i) => <div key={i} className="dm2-cfield"><div className="k">{c.k}</div><div className="v">{c.v}</div></div>)}
                  </div>
                )}
                {on && dr.id === 'show' && (
                  <div className="dm2-tray">
                    {D.styles.map((s, i) => <div key={i} className="dm2-tray-img" style={{ backgroundImage: `url(${s.img})` }} />)}
                    <div className="dm2-tray-add">+</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="dm2-converge"><span className="ln" />every door converges on one seed of intent<span className="ln" /></div>
      </div>

      <div className="dm2-sec">
        <div className="dm2-sec-head"><h2>Or take the fast on-ramp</h2><span className="eng-label">Choose your direction · already shipped</span></div>
        <div className="dm2-styles">
          {D.styles.map((s) => (
            <button key={s.id} type="button" className={`dm2-style ${style === s.id ? 'is-on' : ''}`} onClick={() => { setStyle(s.id); go(1); }}>
              <div className="dm2-style-img" style={{ backgroundImage: `url(${s.img})` }} />
              <div className="dm2-style-cap"><div className="nm">{s.nm}</div><div className="dd">{s.dd}</div></div>
              <div className="dm2-style-tick"><V2I.check width="11" height="11" /></div>
            </button>
          ))}
        </div>
      </div>
      <NextStep stage={stage} go={go} />
    </div>
  );
}

/* ── STAGE 2 · EXPLORE ── */
function ExploreView({ stage, go, variant }: { stage: StageT; go: (d: number) => void; variant: Variant }) {
  const [sel, setSel] = useState(D.concepts[1].id);
  const [hot, setHot] = useState(D.hotspots[0].id);
  const [blend, setBlend] = useState(D.blend.map((b) => b.pc));
  const selConcept = D.concepts.find((c) => c.id === sel)!;
  const openHot = D.hotspots.find((h) => h.id === hot) || D.hotspots[0];
  return (
    <div className="dm2-body">
      <StageHead stage={stage} variant={variant} />
      <div className="dm2-sec">
        <div className="dm2-explore">
          <div>
            <div className="dm2-sec-head"><h2>Concepts in motion</h2><span className="eng-label">6 renders · iterate any</span></div>
            <div className="dm2-grid">
              {D.concepts.map((c) => (
                <div key={c.id} className={`dm2-concept ${sel === c.id ? 'is-sel' : ''}`} onClick={() => setSel(c.id)}>
                  <div className="dm2-concept-img" style={{ backgroundImage: `url(${c.img})` }}>
                    <div className="dm2-concept-tag">{c.tag}</div>
                    <div className="dm2-concept-acts">
                      {D.conceptActs.map((a, i) => <span key={i} className="dm2-cact" onClick={(e) => e.stopPropagation()}>{a}</span>)}
                    </div>
                  </div>
                  <div className="dm2-concept-cap"><div className="nm">{c.nm}</div><div className="mt">{c.mt}</div></div>
                </div>
              ))}
            </div>

            <div className="dm2-sec-head" style={{ marginTop: 20 }}><h2>Inspiration with intelligence</h2><span className="eng-label">Tap an element · {selConcept.nm}</span></div>
            <div className="dm2-shop">
              <div className="dm2-shop-stage">
                <div className="dm2-shop-img" style={{ backgroundImage: `url(${selConcept.img})` }} />
                {D.hotspots.map((h) => (
                  <div key={h.id} className={`dm2-hot ${hot === h.id ? 'is-on' : ''}`} style={{ left: h.x + '%', top: h.y + '%' }} onClick={() => setHot(h.id)}>+</div>
                ))}
              </div>
              <div className="dm2-shop-card">
                <div>
                  <div className="nm">{openHot.nm}</div>
                  <div className="dd">{openHot.mat}</div>
                </div>
                <div className="price">{openHot.price}<small>est. installed</small></div>
                <div className="dm2-shop-meta">
                  <span className="dm2-chiplet code"><span style={{ width: 6, height: 6, borderRadius: 9, background: 'var(--specimen-sage)', display: 'inline-block' }} />{openHot.code}</span>
                  <span className="dm2-chiplet supplier">{openHot.supplier}</span>
                </div>
              </div>
            </div>
            <div className="dm2-shop-hint">Every element traces back to a Knowledge-Garden entry — material, code note, and a supplier you can actually call.</div>
          </div>

          <div className="dm2-rail-r">
            <div className="dm2-panel">
              <div className="dm2-panel-h"><div className="dm2-panel-t">Style blend</div><span className="eng-label">Genome mix</span></div>
              {D.blend.map((b, i) => (
                <div key={b.id} className="dm2-blend-row">
                  <span className="nm">{b.nm}</span>
                  <input className="dm2-slider" type="range" min="0" max="100" value={blend[i]}
                    onChange={(e) => { const nx = blend.slice(); nx[i] = +e.target.value; setBlend(nx); }} />
                  <span className="pc">{blend[i]}%</span>
                </div>
              ))}
            </div>
            <div className="dm2-panel">
              <div className="dm2-panel-h"><div className="dm2-panel-t">The Alchemist</div><span className="eng-label">Advanced remix</span></div>
              <div className="dm2-crucible">
                {D.ingredients.map((g, i) => <span key={i} className="dm2-ingredient">{g}<span className="x">✕</span></span>)}
                <span className="dm2-ingredient add">+ drop ingredient</span>
              </div>
              <div className="dm2-recipe"><b>Recipe</b> — {D.recipe}</div>
              <button className="dm2-btn dm2-btn-accent" type="button" style={{ marginTop: 12, width: '100%', justifyContent: 'center', background: 'var(--specimen-brass-aged)', borderColor: 'var(--specimen-brass-aged)' }}>Brew a concept <V2I.arrow /></button>
            </div>
          </div>
        </div>
      </div>
      <NextStep stage={stage} go={go} />
    </div>
  );
}

/* schematic massing — redraws from genome values */
function Massing({ g }: { g: Record<string, number> }) {
  const stories = g.stories, foot = g.footprint, pitch = g.roof, win = g.window, ceil = g.ceiling;
  const w = 120 + ((foot - 1400) / 1200) * 170;
  const fh = 22 + ((ceil - 8) / 6) * 22;
  const h = fh * stories;
  const cx = 200, baseY = 232;
  const x0 = cx - w / 2, y0 = baseY - h;
  const ridge = (pitch / 12) * (w / 2) * 0.9;
  const rooms = [];
  for (let s = 0; s < stories; s++) {
    const ry = baseY - fh * (s + 1);
    rooms.push(<line key={'f' + s} x1={x0} y1={ry} x2={x0 + w} y2={ry} stroke="#7C6235" strokeWidth="1" opacity="0.7" />);
  }
  const winCount = Math.round(2 + (win / 100) * 4);
  const wins = [];
  for (let s = 0; s < stories; s++) {
    for (let i = 0; i < winCount; i++) {
      const ww = (w - 20) / winCount;
      const wx = x0 + 10 + i * ww;
      const wy = baseY - fh * (s + 1) + 7;
      const wHpx = fh - 14;
      wins.push(<rect key={`w${s}-${i}`} x={wx + 3} y={wy} width={ww - 6} height={wHpx} fill="#A6C4CC" opacity={0.35 + (win / 200)} stroke="#234C5A" strokeWidth="0.6" />);
    }
  }
  return (
    <svg className="dm2-massing" viewBox="0 0 400 268" preserveAspectRatio="xMidYMid meet">
      <line x1="20" y1="232" x2="380" y2="232" stroke="#7C6235" strokeWidth="1.2" />
      <path d="M20 246 Q140 236 230 240 T380 232" stroke="#5E7A56" strokeWidth="1" fill="none" opacity="0.6" strokeDasharray="2 3" />
      <rect x={x0} y={y0} width={w} height={h} fill="#F2E9D2" stroke="#2A2620" strokeWidth="1.4" />
      {rooms}
      {wins}
      <path d={`M${x0 - 6} ${y0} L${cx} ${y0 - ridge} L${x0 + w + 6} ${y0}`} fill="none" stroke="#A53A2D" strokeWidth="1.6" strokeLinejoin="round" />
      <path d={`M${x0} ${baseY + 12} L${x0 + w} ${baseY + 12}`} stroke="#8C6A45" strokeWidth="0.8" />
      <path d={`M${x0} ${baseY + 8} v8 M${x0 + w} ${baseY + 8} v8`} stroke="#8C6A45" strokeWidth="0.8" />
      <text x={cx} y={baseY + 26} textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fill="#8C6A45">{g.footprint.toLocaleString()} sqft footprint</text>
      <text x={x0 - 10} y={y0 + h / 2} textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fill="#8C6A45" transform={`rotate(-90 ${x0 - 10} ${y0 + h / 2})`}>{stories}× {g.ceiling}ft</text>
    </svg>
  );
}

/* drone-eye lot — building on the real lot, sun/shadow */
function LotView({ sun }: { sun: number }) {
  const ang = ((sun - 12) / 6) * 60;
  const len = 26 + Math.abs(sun - 12) * 5;
  const rad = (ang * Math.PI) / 180;
  const bx = 168, by = 96, bw = 84, bh = 58;
  const cx = bx + bw / 2, cy = by + bh / 2;
  const dx = Math.sin(rad) * len, dy = Math.cos(rad) * len;
  return (
    <svg className="dm2-lot" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid meet">
      <path d="M40 30 L356 44 L344 196 L60 184 Z" fill="color-mix(in oklab,#5E7A56 6%,#F2E9D2)" stroke="#7C6235" strokeWidth="1.3" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M52 ${66 + i * 30} Q200 ${52 + i * 30} 348 ${72 + i * 30}`} stroke="#5E7A56" strokeWidth="0.7" fill="none" opacity="0.4" strokeDasharray="3 4" />
      ))}
      <polygon points={`${bx},${by} ${bx + bw},${by} ${bx + bw + dx},${by + dy} ${bx + dx},${by + dy}`} fill="#5A3B1F" opacity="0.14" />
      <polygon points={`${bx + bw},${by} ${bx + bw},${by + bh} ${bx + bw + dx},${by + bh + dy} ${bx + bw + dx},${by + dy}`} fill="#5A3B1F" opacity="0.14" />
      <rect x={bx} y={by} width={bw} height={bh} fill="#F2E9D2" stroke="#2A2620" strokeWidth="1.5" />
      <line x1={bx} y1={by + 22} x2={bx + bw} y2={by + 22} stroke="#7C6235" strokeWidth="0.7" opacity="0.6" />
      <path d="M60 184 L150 150 L168 130" stroke="#8C6A45" strokeWidth="3" fill="none" opacity="0.5" strokeLinecap="round" />
      {[[300, 150], [320, 110], [96, 70]].map((t, i) => <circle key={i} cx={t[0]} cy={t[1]} r="7" fill="none" stroke="#3E5638" strokeWidth="1" opacity="0.7" />)}
      <path d={`M${bx} ${cy} L${bx - 40} ${cy - 26} M${bx} ${cy} L${bx - 40} ${cy + 26}`} stroke="#3C7A8A" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.7" />
      <text x={bx - 44} y={cy + 2} textAnchor="end" fontFamily="Space Mono, monospace" fontSize="8" fill="#234C5A">valley view</text>
      <g transform={`translate(${cx + Math.sin(rad) * -64} ${cy + Math.cos(rad) * -64})`}>
        <circle r="9" fill="none" stroke="#C68A3D" strokeWidth="1.2" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => { const r = (d * Math.PI) / 180; return <line key={d} x1={Math.cos(r) * 11} y1={Math.sin(r) * 11} x2={Math.cos(r) * 14} y2={Math.sin(r) * 14} stroke="#C68A3D" strokeWidth="1" />; })}
      </g>
      <g transform="translate(366 30)"><path d="M0 12 L4 0 L8 12 L4 9 Z" fill="#2A2620" /><text x="4" y="22" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="8" fill="#8C6A45">N</text></g>
    </svg>
  );
}

/* ── STAGE 3 · SHAPE ── */
function ShapeView({ stage, go, variant }: { stage: StageT; go: (d: number) => void; variant: Variant }) {
  const init: Record<string, number> = {}; D.genome.forEach((g) => { init[g.id] = g.val; });
  const [vals, setVals] = useState(init);
  const [sun, setSun] = useState(8);
  const [pin, setPin] = useState(0);
  const sunLabel = sun <= 9 ? '8am · December' : sun <= 13 ? 'noon · June' : '5pm · September';
  return (
    <div className="dm2-body">
      <StageHead stage={stage} variant={variant} />
      <div className="dm2-sec">
        <div className="dm2-shape">
          <div>
            <div className="dm2-sec-head"><h2>Architect&apos;s Table</h2><span className="eng-label">Concept + refs · AI keeps it coherent</span></div>
            <div className="dm2-table">
              <Massing g={vals} />
              <div className="dm2-table-strip">
                {D.tableThumbs.map((t, i) => <div key={i} className={`dm2-table-thumb ${i === pin ? 'is-pin' : ''}`} style={{ backgroundImage: `url(${t})` }} onClick={() => setPin(i)} />)}
              </div>
            </div>

            <div className="dm2-sec-head" style={{ marginTop: 20 }}><h2>Drone-Eye — your lot</h2><span className="eng-label">{D.project.lot}</span></div>
            <div className="dm2-drone">
              <div className="dm2-dronestage">
                <LotView sun={sun} />
                <div className="dm2-dronectl">
                  <V2I.sun />
                  <span className="sun">Sun · <b>{sunLabel}</b></span>
                  <input className="dm2-slider" type="range" min="6" max="18" step="1" value={sun} onChange={(e) => setSun(+e.target.value)} style={{ flex: 1 }} />
                </div>
              </div>
              <div className="dm2-view-note">What your kitchen window sees at 8am in December — low sun across the valley, no overshadowing from the ridge.</div>
            </div>
          </div>

          <div className="dm2-rail-r">
            <div className="dm2-panel dm2-genome">
              <div className="dm2-panel-h"><div className="dm2-panel-t">The Genome</div><span className="eng-label">Parametric</span></div>
              {D.genome.map((g) => (
                <div key={g.id} className="grow">
                  <div className="dm2-grow-h"><span className="nm">{g.nm}</span><span className="val"><b>{g.fmt(vals[g.id])}</b></span></div>
                  <input className="dm2-slider" type="range" min={g.min} max={g.max} step={g.step} value={vals[g.id]}
                    onChange={(e) => setVals({ ...vals, [g.id]: +e.target.value })} />
                </div>
              ))}
              <div className="dm2-recipe" style={{ marginTop: 4 }}><b>Live</b> — the massing and the lot redraw as you tune. Every change stays checked against the structure.</div>
            </div>
          </div>
        </div>
      </div>
      <NextStep stage={stage} go={go} />
    </div>
  );
}

/* schematic drawings for Realize */
function FloorPlan({ overlay }: { overlay: boolean }) {
  return (
    <svg className="dm2-draw" viewBox="0 0 520 372" preserveAspectRatio="xMidYMid meet">
      <rect x="40" y="36" width="440" height="300" fill="none" stroke="#2A2620" strokeWidth="2" />
      <line x1="240" y1="36" x2="240" y2="220" stroke="#2A2620" strokeWidth="1.4" />
      <line x1="40" y1="220" x2="480" y2="220" stroke="#2A2620" strokeWidth="1.4" />
      <line x1="350" y1="36" x2="350" y2="220" stroke="#7C6235" strokeWidth="1.1" />
      <line x1="240" y1="130" x2="40" y2="130" stroke="#7C6235" strokeWidth="1.1" />
      <line x1="240" y1="278" x2="480" y2="278" stroke="#7C6235" strokeWidth="1.1" />
      <line x1="40" y1="60" x2="40" y2="200" stroke="#3C7A8A" strokeWidth="3" />
      <path d="M150 220 a26 26 0 0 1 26 -26" fill="none" stroke="#8C6A45" strokeWidth="0.8" />
      <path d="M300 220 a22 22 0 0 1 22 -22" fill="none" stroke="#8C6A45" strokeWidth="0.8" />
      {[0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1={386} y1={244 + i * 13} x2={462} y2={244 + i * 13} stroke="#7C6235" strokeWidth="0.8" />)}
      <text x="140" y="120" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fill="#5A3B1F">LIVING · valley</text>
      <text x="140" y="180" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fill="#8C6A45">22&apos;-6&quot; × 18&apos;-0&quot;</text>
      <text x="300" y="100" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fill="#5A3B1F">KITCHEN</text>
      <text x="420" y="120" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fill="#5A3B1F">DINING</text>
      <text x="140" y="285" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fill="#5A3B1F">PRIMARY</text>
      <text x="320" y="270" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="10" fill="#5A3B1F">STAIR</text>
      <line x1="40" y1="352" x2="480" y2="352" stroke="#8C6A45" strokeWidth="0.7" />
      <path d="M40 348v8M480 348v8" stroke="#8C6A45" strokeWidth="0.7" />
      <text x="260" y="366" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fill="#8C6A45">48&apos;-0&quot; overall</text>
      {overlay && <>
        <rect x="40" y="36" width="440" height="300" fill="#5E7A56" opacity="0.06" />
        <text x="60" y="56" fontFamily="Space Mono, monospace" fontSize="9" fill="#3E5638">⬡ EGRESS OK · §1011</text>
        <circle cx="44" cy="130" r="9" fill="none" stroke="#C68A3D" strokeWidth="1.2" /><text x="60" y="320" fontFamily="Space Mono, monospace" fontSize="9" fill="#8C5E22">⬡ WEST GLAZING — ADD SHADE</text>
      </>}
    </svg>
  );
}
function Elevation({ overlay }: { overlay: boolean }) {
  return (
    <svg className="dm2-draw" viewBox="0 0 520 372" preserveAspectRatio="xMidYMid meet">
      <line x1="30" y1="320" x2="490" y2="320" stroke="#7C6235" strokeWidth="1.4" />
      <rect x="120" y="150" width="280" height="170" fill="none" stroke="#2A2620" strokeWidth="2" />
      <line x1="120" y1="235" x2="400" y2="235" stroke="#7C6235" strokeWidth="1" />
      <path d="M110 150 L260 118 L410 150" fill="none" stroke="#A53A2D" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="60" y="150" width="60" height="60" fill="none" stroke="#2A2620" strokeWidth="1.6" />
      <path d="M60 210 L120 210" stroke="#2A2620" strokeWidth="1.6" /><path d="M70 210 v18 M110 210 v18" stroke="#8C6A45" strokeWidth="0.8" strokeDasharray="2 3" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={70 + i * 0} y={158} width={42} height={44} fill="#A6C4CC" opacity="0.4" stroke="#234C5A" strokeWidth="0.6" />)}
      {[0, 1, 2, 3, 4].map((i) => <rect key={'u' + i} x={134 + i * 52} y={158} width={42} height={64} fill="#A6C4CC" opacity="0.35" stroke="#234C5A" strokeWidth="0.6" />)}
      {[0, 1, 2, 3, 4].map((i) => <rect key={'l' + i} x={134 + i * 52} y={244} width={42} height={62} fill="#A6C4CC" opacity="0.28" stroke="#234C5A" strokeWidth="0.6" />)}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <line key={'b' + i} x1={120 + i * 36} y1={306} x2={120 + i * 36} y2={320} stroke="#7C6235" strokeWidth="0.7" />)}
      <text x="260" y="345" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fill="#8C6A45">WEST ELEVATION · valley face · 1/8&quot; = 1&apos;-0&quot;</text>
      <line x1="430" y1="150" x2="430" y2="320" stroke="#8C6A45" strokeWidth="0.7" /><path d="M426 150h8M426 320h8" stroke="#8C6A45" strokeWidth="0.7" />
      <text x="448" y="240" fontFamily="Space Mono, monospace" fontSize="9" fill="#8C6A45">24&apos;</text>
      {overlay && <text x="60" y="120" fontFamily="Space Mono, monospace" fontSize="9" fill="#3E5638">⬡ HILLSIDE SETBACK OK · §242</text>}
    </svg>
  );
}
function SitePlan({ overlay }: { overlay: boolean }) {
  return (
    <svg className="dm2-draw" viewBox="0 0 520 372" preserveAspectRatio="xMidYMid meet">
      <path d="M50 40 L470 56 L456 320 L70 304 Z" fill="color-mix(in oklab,#5E7A56 5%,#F2E9D2)" stroke="#7C6235" strokeWidth="1.4" />
      <path d="M86 76 L434 90 L422 286 L104 272 Z" fill="none" stroke="#A53A2D" strokeWidth="1" strokeDasharray="5 4" opacity="0.7" />
      <rect x="150" y="120" width="170" height="118" fill="#F2E9D2" stroke="#2A2620" strokeWidth="1.8" />
      <line x1="150" y1="170" x2="320" y2="170" stroke="#7C6235" strokeWidth="0.8" opacity="0.6" />
      <path d="M70 304 L180 250 L210 238" stroke="#8C6A45" strokeWidth="6" fill="none" opacity="0.45" strokeLinecap="round" />
      {[0, 1, 2].map((i) => <path key={i} d={`M70 ${120 + i * 60} Q260 ${100 + i * 60} 450 ${130 + i * 60}`} stroke="#5E7A56" strokeWidth="0.7" fill="none" opacity="0.4" strokeDasharray="3 4" />)}
      <text x="235" y="184" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="10" fill="#5A3B1F">RESIDENCE</text>
      <text x="120" y="270" fontFamily="Space Mono, monospace" fontSize="9" fill="#8C6A45">drive</text>
      <text x="380" y="80" fontFamily="Space Mono, monospace" fontSize="9" fill="#A53A2D">setback line</text>
      <g transform="translate(450 44)"><path d="M0 14 L4 0 L8 14 L4 10 Z" fill="#2A2620" /><text x="4" y="26" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="8" fill="#8C6A45">N</text></g>
      {overlay && <text x="90" y="316" fontFamily="Space Mono, monospace" fontSize="9" fill="#8C5E22">⬡ LOT COVERAGE 44% — NEAR 45% LIMIT</text>}
    </svg>
  );
}

/* ── STAGE 4 · REALIZE ── */
function RealizeView({ stage, go, variant }: { stage: StageT; go: (d: number) => void; variant: Variant }) {
  const [tab, setTab] = useState('plan');
  const [overlay, setOverlay] = useState(false);
  const Draw = tab === 'plan' ? FloorPlan : tab === 'elev' ? Elevation : SitePlan;
  return (
    <div className="dm2-body">
      <StageHead stage={stage} variant={variant} />
      <div className="dm2-sec">
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <span className="dm2-tier v1"><V2I.check width="11" height="11" /> v1 · AI concept + clean schematic</span>
          <span className="dm2-tier pro">Professional CAD / BIM · DWG · IFC — later tier</span>
        </div>
        <div className="dm2-realize">
          <div className="dm2-sheet">
            <div className="dm2-sheet-tabs">
              {D.sheetTabs.map((t) => <button key={t.id} type="button" className={`dm2-sheet-tab ${tab === t.id ? 'is-on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <div className="dm2-sheet-canvas"><Draw overlay={overlay} /></div>
            <div className="dm2-sheet-cap">
              <span>{D.project.name} · schematic · not for construction</span>
              <span className={`dm2-overlay-toggle ${overlay ? 'is-on' : ''}`} onClick={() => setOverlay(!overlay)}><span className="sw" /> Code overlay</span>
            </div>
          </div>

          <div className="dm2-realize-r">
            <div className="dm2-panel">
              <div className="dm2-panel-h"><div className="dm2-panel-t">Material schedule</div><span className="eng-label">From the garden</span></div>
              <table className="dm2-schedule">
                <thead><tr><th>Material</th><th className="r">Qty</th><th className="r">Cost</th></tr></thead>
                <tbody>
                  {D.schedule.map((r, i) => (
                    <tr key={i}><td><span className="it">{r.it}</span><span className="sp">{r.sp}</span></td><td className="r">{r.qty}</td><td className="r">{r.cost}</td></tr>
                  ))}
                  <tr className="total"><td><span className="it">Materials total</span></td><td className="r" /><td className="r">{D.scheduleTotal}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="dm2-panel">
              <div className="dm2-panel-h"><div className="dm2-panel-t">Code compliance</div><span className="eng-label">5 checks</span></div>
              {D.codes.map((c, i) => (
                <div key={i} className="dm2-code-row">
                  <div className="nm">{c.nm}<small>{c.sp}{c.note ? ' · ' + c.note : ''}</small></div>
                  <span className={`dm2-pass ${c.state}`}><span className="pip" />{c.state === 'ok' ? 'Pass' : 'Watch'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <NextStep stage={stage} go={go} />
    </div>
  );
}

/* ── STAGE 5 · BUILD ── */
function BuildView({ stage, go, variant }: { stage: StageT; go: (d: number) => void; variant: Variant }) {
  const [ported, setPorted] = useState(false);
  return (
    <div className="dm2-body">
      <StageHead stage={stage} variant={variant} />
      <div className="dm2-sec">
        <div className="dm2-build">
          {!ported ? (
            <div className="dm2-port-hero">
              <div className="eyebrow">The loop closes here</div>
              <h2>Make this real.</h2>
              <p>One action ports the dream you built into a Killer App project — the same project, no re-entry.</p>
              <div className="dm2-port-flow">
                <div className="dm2-port-app from"><div className="l">From</div><div className="n">Dream Machine</div></div>
                <span className="dm2-port-arrow"><V2I.arrow /></span>
                <div className="dm2-port-app to"><div className="l">Into</div><div className="n">Killer App</div></div>
              </div>
              <button className="dm2-btn dm2-makebtn" type="button" onClick={() => setPorted(true)}>Make This Real <V2I.arrow /></button>
              <div className="dm2-port-note">Same useStageProject() identity · {D.project.name}</div>
            </div>
          ) : (
            <div className="dm2-ported">
              <div className="seal"><V2I.check width="26" height="26" /></div>
              <h2>It&apos;s a build project now.</h2>
              <p>{D.project.name} opened in the Killer App with Size Up, Lock, and Plan already seeded. Pick up in the Killer App — nothing to re-enter.</p>
              <button className="dm2-btn dm2-btn-accent" type="button" style={{ justifyContent: 'center' }} onClick={() => setPorted(false)}>Open in Killer App <V2I.arrow /></button>
            </div>
          )}

          <div>
            <div className="dm2-manifest-h">What carries over</div>
            <div className="dm2-manifest-sub">Everything you imagined, mapped to where it lands in the build.</div>
            <div className="dm2-carry">
              {D.carry.map((c, i) => (
                <div key={i} className="dm2-carry-row">
                  <div className="dm2-carry-ico"><V2I.check width="14" height="14" /></div>
                  <div className="dm2-carry-txt"><div className="k">{c.k}</div><div className="v">{c.v}</div></div>
                  <span className="dm2-carry-dest">{c.dest}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <NextStep stage={stage} go={go} />
    </div>
  );
}

const STAGE_VIEWS: Record<string, (p: { stage: StageT; go: (d: number) => void; variant: Variant }) => React.ReactElement> = {
  imagine: ImagineView, explore: ExploreView, shape: ShapeView, realize: RealizeView, build: BuildView,
};

/* ── PIPELINE SPINE — the always-forward rail ── */
function Spine({ active, setActive, variant }: { active: string; setActive: (id: string) => void; variant: Variant }) {
  const ai = D.stages.findIndex((s) => s.id === active);
  const fill = (ai / (D.stages.length - 1)) * 100;
  return (
    <div className="dm2-spine">
      <div className="dm2-spine-row">
        <div className="dm2-spine-id">
          <span className="dm2-spine-id-seal"><V2I.sprig width="17" height="17" /></span>
          <div className="dm2-spine-id-txt">
            <div className="dm2-spine-id-kick">Dreaming · one project</div>
            <div className="dm2-spine-id-name">{D.project.name}</div>
          </div>
        </div>
        <div className="dm2-rail">
          <div className="dm2-rail-line"><div className="dm2-rail-fill" style={{ width: fill + '%' }} /></div>
          {D.stages.map((s, i) => (
            <button key={s.id} type="button" className={`dm2-node ${i < ai ? 'is-done' : ''} ${s.id === active ? 'is-cur' : ''}`} onClick={() => setActive(s.id)}>
              <span className="dm2-node-dot"><span>{i < ai ? '✓' : s.n}</span></span>
              <span className="dm2-node-lab">{s.label}</span>
              {variant !== 'mobile' && <span className="dm2-node-sub">{s.sub}</span>}
            </button>
          ))}
        </div>
        <div className="dm2-spine-act">
          <span className="dm2-step-of">Step <b>{D.stages[ai].n}</b> / 05</span>
        </div>
      </div>
    </div>
  );
}

export default function DreamStudio2Client() {
  const [active, setActive] = useState('imagine');
  const [mounted, setMounted] = useState(false);
  // Canonical "client mounted" flag — a one-shot setState on mount is the intended
  // pattern here (gates the client-only render below); the rule's a false positive.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const ai = D.stages.findIndex((s) => s.id === active);
  const stage = D.stages[ai];
  const go = (dir: number) => setActive(D.stages[Math.min(D.stages.length - 1, Math.max(0, ai + dir))].id);
  const StageView = STAGE_VIEWS[active];
  // Client-only render. This is a heavy interactive prototype; rendering it during
  // SSR triggered a production-only hydration mismatch that double-mounted the whole
  // tree and killed every interaction. SSR + the first client render both emit the
  // same empty placeholder, so hydration matches cleanly; `mounted` then flips in an
  // effect and swaps in the live surface. Single tree, fully interactive.
  if (!mounted) return <div className="ds2-root" aria-busy="true" />;
  return (
    <div className="ds2-root" data-surface="dream-studio-2">
      <Spine active={active} setActive={setActive} variant="desktop" />
      <StageView stage={stage} go={go} variant="desktop" />
    </div>
  );
}
