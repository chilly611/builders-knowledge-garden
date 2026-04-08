'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/* ─── Path cards data ─────────────────────────────────────────── */
const PATH_CARDS = [
  {
    id: 'dream', badge: '✦',
    image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=900&q=85&fit=crop',
    title: 'I have a dream',
    desc: 'Describe what you want to build — voice, text, photo, or sketch.',
    cta: 'Start dreaming', href: '/dream', accent: '#D85A30',
  },
  {
    id: 'build', badge: '⚒',
    image: 'https://images.unsplash.com/photo-1429497419816-9ca5cfb4571a?w=900&q=85&fit=crop',
    title: 'I build for a living',
    desc: 'Launch projects, manage your pipeline, generate estimates.',
    cta: 'Start building', href: '/killerapp', accent: '#E8443A',
  },
  {
    id: 'supply', badge: '◈',
    image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=900&q=85&fit=crop',
    title: 'I supply the industry',
    desc: 'List your products, connect with contractors at the right moment.',
    cta: 'Start supplying', href: '/marketplace', accent: '#1D9E75',
  },
];

/* ─── Float16 decoder ─────────────────────────────────────────── */
function decodeF16(b64: string, n: number): Float32Array {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const u16 = new Uint16Array(u8.buffer);
  const f32 = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const h = u16[i], s = (h & 0x8000) ? -1 : 1;
    const e = (h & 0x7c00) >> 10, f = h & 0x03ff;
    if (e === 0) f32[i] = s * 5.96e-8 * f;
    else if (e === 31) f32[i] = s * (f ? NaN : Infinity);
    else f32[i] = s * Math.pow(2, e - 15) * (1 + f * 9.765625e-4);
  }
  return f32;
}

/* ─── Color by position ───────────────────────────────────────── */
function toolColor(x: number, y: number, nx: number): [number, number, number] {
  const fb = Math.max(0, y * 0.5 + 0.6);
  let r, g, b;
  if (y > 0.55) { r = 0.18 + fb * 0.12; g = 0.28 + fb * 0.1; b = 0.60 + fb * 0.14; }
  else if (x < -0.28) { const t = Math.sin(y * 5 + 2) * 0.5 + 0.5; r = 0.52 + t * 0.22; g = 0.22 + t * 0.1; b = 0.05; }
  else if (x > 0.10 && y > 0.06) { const t = (Math.sin(y * 14) + 1) * 0.5; r = 0.42 + t * 0.38; g = 0.42 + t * 0.38; b = 0.46 + t * 0.38; }
  else if (x > 0.10 && y < -0.06) { r = 0.26 + fb * 0.1; g = 0.20 + fb * 0.07; b = 0.16 + fb * 0.05; }
  else { r = 0.28 + fb * 0.14; g = 0.28 + fb * 0.14; b = 0.30 + fb * 0.14; }
  const ef = Math.max(0, Math.abs(nx) - 0.45) * 2.5;
  return [Math.min(1, r + ef * 0.07), Math.min(1, g + ef * 0.28), Math.min(1, b + ef * 0.20)];
}

/* ─── Canvas renderer ─────────────────────────────────────────── */
function BLogoCanvas({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    pos: Float32Array; col: Float32Array;
    tPos: Float32Array; tCol: Float32Array;
    iPos: Float32Array; vel: Float32Array;
    raf: number; t0: number; ready: boolean;
    phase: number; phaseTriggered: number[];
    rotY: number; rotX: number;
  } | null>(null);

  const NT = 6000, NV = 5000, NTOT = NT + NV, SC = 2.1;
  const PHASE_T = [0, 5, 10.5, 15.5, 22];
  const VC = [[0.16,0.26,0.55],[0.58,0.22,0.07],[0.44,0.44,0.50],[0.20,0.16,0.13],[0.10,0.48,0.40],[0.36,0.16,0.07]];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    const H = canvas.height = canvas.offsetHeight * window.devicePixelRatio;

    // Init state
    const pos = new Float32Array(NTOT * 3);
    const col = new Float32Array(NTOT * 3);
    const tPos = new Float32Array(NT * 3);
    const tCol = new Float32Array(NT * 3);
    const iPos = new Float32Array(NTOT * 3);
    const vel = new Float32Array(NTOT * 3);

    const rnd = () => Math.random();
    function scatter(i: number, scale: number) {
      const rd = 8 + rnd() * 5, th = rnd() * Math.PI * 2, ph = (rnd() - 0.5) * Math.PI;
      iPos[i*3] = pos[i*3] = rd * Math.cos(th) * Math.cos(ph) * scale;
      iPos[i*3+1] = pos[i*3+1] = rd * Math.sin(ph) * 1.3 * scale;
      iPos[i*3+2] = pos[i*3+2] = rd * Math.sin(th) * Math.cos(ph) * scale;
      vel[i*3] = (rnd()-0.5)*0.022; vel[i*3+1] = (rnd()-0.5)*0.016; vel[i*3+2] = (rnd()-0.5)*0.022;
    }
    for (let i = 0; i < NT; i++) scatter(i, 1);
    for (let i = NT; i < NTOT; i++) {
      const rd = 5 + rnd()*14, th = rnd()*Math.PI*2, ph = (rnd()-0.5)*Math.PI;
      iPos[i*3]=pos[i*3]=rd*Math.cos(th)*Math.cos(ph); iPos[i*3+1]=pos[i*3+1]=rd*Math.sin(ph)*1.3; iPos[i*3+2]=pos[i*3+2]=rd*Math.sin(th)*Math.cos(ph);
      vel[i*3]=(rnd()-0.5)*0.007; vel[i*3+1]=(rnd()-0.5)*0.005; vel[i*3+2]=(rnd()-0.5)*0.007;
      const vc=VC[i%VC.length]; col[i*3]=vc[0]*0.28; col[i*3+1]=vc[1]*0.28; col[i*3+2]=vc[2]*0.28;
    }
    for (let i = 0; i < NT; i++) {
      const vc=VC[i%VC.length]; col[i*3]=vc[0]*0.6; col[i*3+1]=vc[1]*0.6; col[i*3+2]=vc[2]*0.6;
    }

    stateRef.current = { pos, col, tPos, tCol, iPos, vel, raf: 0, t0: Date.now(), ready: false, phase: 0, phaseTriggered: [], rotY: 0, rotX: 0 };

    // Load real vertex data
    Promise.all([fetch('/bkg/p6k.txt').then(r=>r.text()), fetch('/bkg/n6k.txt').then(r=>r.text())])
      .then(([pb, nb]) => {
        const RP = decodeF16(pb, NT*3), RN = decodeF16(nb, NT*3);
        const st = stateRef.current!;
        for (let i = 0; i < NT; i++) {
          st.tPos[i*3]=RP[i*3]*SC; st.tPos[i*3+1]=RP[i*3+1]*SC; st.tPos[i*3+2]=RP[i*3+2]*SC;
          const [r,g,b] = toolColor(RP[i*3], RP[i*3+1], RN[i*3]);
          st.tCol[i*3]=r; st.tCol[i*3+1]=g; st.tCol[i*3+2]=b;
        }
        st.ready = true;
      })
      .catch(() => {
        // Fallback: procedural B
        const st = stateRef.current!;
        for (let i = 0; i < NT; i++) {
          const t = i / NT, angle = t * Math.PI * 2;
          const bump = t < 0.5 ? 0 : 1;
          const bx = 0.3 + Math.cos(angle) * (0.3 + bump * 0.15);
          const by = (t < 0.5 ? t * 4 - 1 : (t - 0.5) * 4 - 1) * 0.9;
          const bz = (Math.random()-0.5)*0.1;
          st.tPos[i*3]=bx*SC; st.tPos[i*3+1]=by*SC; st.tPos[i*3+2]=bz*SC;
          const [r,g,b] = toolColor(bx, by, 0);
          st.tCol[i*3]=r; st.tCol[i*3+1]=g; st.tCol[i*3+2]=b;
        }
        st.ready = true;
      });

    // Render loop
    function lerp(a: number, b: number, t: number) { return a + (b-a)*t; }
    function eo(t: number) { return 1-(1-t)**4; }
    function ei(t: number) { return t<0.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1; }
    function cl(v: number, a: number, b: number) { return Math.min(b, Math.max(a, v)); }

    // Camera: project 3D → 2D
    function project(x: number, y: number, z: number, ry: number, rx: number) {
      // Rotate Y
      const x1 = x*Math.cos(ry) - z*Math.sin(ry);
      const z1 = x*Math.sin(ry) + z*Math.cos(ry);
      // Rotate X
      const y1 = y*Math.cos(rx) - z1*Math.sin(rx);
      const z2 = y*Math.sin(rx) + z1*Math.cos(rx);
      // Perspective
      const fov = 5.5, dist = fov / (fov + z2 + 12);
      return [W/2 + x1 * dist * W * 0.42, H/2 - y1 * dist * H * 0.55, dist];
    }

    let frame = 0;
    function draw() {
      if (!ctx) return;
      const st = stateRef.current;
      if (!st) return;
      const el = (Date.now() - st.t0) / 1000;
      frame++;

      // Determine phase
      let phase = 3;
      if (el < PHASE_T[1]) phase = 0;
      else if (el < PHASE_T[2]) phase = 1;
      else if (el < PHASE_T[3]) phase = 2;
      else if (el < PHASE_T[4]) phase = 3;
      else { onDone(); return; }
      st.phase = phase;

      const { pos: p, col: c, tPos, tCol, vel } = st;

      // Phase 0: vapor drift
      if (phase === 0) {
        for (let i = 0; i < NTOT; i++) {
          const tt = el * 0.28;
          p[i*3] += vel[i*3] + Math.sin(tt + i*0.19)*0.002;
          p[i*3+1] += vel[i*3+1] + Math.cos(tt + i*0.14)*0.0015;
          p[i*3+2] += vel[i*3+2] + Math.sin(tt*0.65 + i*0.21)*0.002;
          const d2 = p[i*3]**2 + p[i*3+1]**2 + p[i*3+2]**2;
          if (d2 > 196) { vel[i*3]*=-.72; vel[i*3+1]*=-.72; vel[i*3+2]*=-.72; }
          if (frame%4===i%4) { const vc=VC[Math.floor((Math.sin(i+el)*.5+.5)*VC.length)]; const br=.4+Math.sin(el*1.6+i*.5)*.2; c[i*3]=vc[0]*br; c[i*3+1]=vc[1]*br; c[i*3+2]=vc[2]*br; }
        }
        st.rotY += 0.0018; st.rotX = Math.sin(el*0.11)*0.07;
      }
      // Phase 1: converge to B
      else if (phase === 1 && st.ready) {
        const tN = cl((el-PHASE_T[1])/(PHASE_T[2]-PHASE_T[1]),0,1), sp=eo(tN);
        for (let i = 0; i < NT; i++) {
          const tx=tPos[i*3],ty=tPos[i*3+1],tz=tPos[i*3+2];
          const ang=tN*Math.PI*2.4, r=1-eo(tN), pull=0.04+sp*0.14;
          p[i*3]+=(tx+Math.sin(ang+i*.011)*r*.6-p[i*3])*pull;
          p[i*3+1]+=(ty+Math.cos(ang+i*.011)*r*.35-p[i*3+1])*pull;
          p[i*3+2]+=(tz-p[i*3+2])*pull*0.6;
          c[i*3]=lerp(c[i*3],tCol[i*3],sp*0.13); c[i*3+1]=lerp(c[i*3+1],tCol[i*3+1],sp*0.13); c[i*3+2]=lerp(c[i*3+2],tCol[i*3+2],sp*0.13);
        }
        for (let i=NT;i<NTOT;i++){p[i*3]+=vel[i*3];p[i*3+1]+=vel[i*3+1];p[i*3+2]+=vel[i*3+2];c[i*3]*=.997;c[i*3+1]*=.997;c[i*3+2]*=.997;}
        st.rotY = lerp(st.rotY, -0.22, 0.02) + lerp(-0.22, 0, ei(tN)) * 0.01;
        st.rotX = lerp(-0.3, 0, ei(tN));
      }
      // Phase 2 + 3: formed + glow
      else if (phase >= 2 && st.ready) {
        const pulse = 0.5 + 0.5*Math.sin(el*1.85), gb=0.07+pulse*0.14;
        for (let i=0;i<NT;i++) {
          const tx=tPos[i*3],ty=tPos[i*3+1],tz=tPos[i*3+2];
          p[i*3]=tx+(Math.random()-.5)*.005; p[i*3+1]=ty+(Math.random()-.5)*.005; p[i*3+2]=tz+(Math.random()-.5)*.003;
          p[i*3]+=(tx-p[i*3])*.18; p[i*3+1]+=(ty-p[i*3+1])*.18; p[i*3+2]+=(tz-p[i*3+2])*.18;
          const gw=gb*(0.4+tCol[i*3+1]*1.8);
          c[i*3]=Math.min(1,tCol[i*3]+gw*0.45); c[i*3+1]=Math.min(1,tCol[i*3+1]+gw); c[i*3+2]=Math.min(1,tCol[i*3+2]+gw*0.65);
        }
        for(let i=NT;i<NTOT;i++){c[i*3]*=.991;c[i*3+1]*=.991;c[i*3+2]*=.991;}
        const tN=cl((el-PHASE_T[2])/2.8,0,1);
        st.rotY = lerp(0, 0.22, ei(tN)) + Math.sin(el*0.07)*0.04;
        st.rotX = Math.sin(el*0.14)*0.03;
      }

      // Clear
      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, W, H);

      // Sort & draw particles
      const ptSize = phase === 0 ? (0.006 + Math.sin(el*1.9)*0.0012) : (phase === 1 ? lerp(0.007, 0.0058, cl((el-PHASE_T[1])/(PHASE_T[2]-PHASE_T[1]),0,1)) : 0.006);
      const baseSize = Math.max(W, H) * ptSize;

      // Build projected list for depth sorting
      const pts: Array<[number, number, number, number, number, number, number]> = [];
      for (let i = 0; i < NTOT; i++) {
        const [sx, sy, dist] = project(p[i*3], p[i*3+1], p[i*3+2], st.rotY, st.rotX);
        if (sx < -10 || sx > W+10 || sy < -10 || sy > H+10) continue;
        pts.push([sx, sy, dist, c[i*3], c[i*3+1], c[i*3+2], baseSize * dist * 12]);
      }
      pts.sort((a, b) => a[2] - b[2]);

      for (const [sx, sy, , r, g, b, sz] of pts) {
        if (sz < 0.3) continue;
        const alpha = Math.min(1, sz * 0.8 + 0.2);
        ctx.fillStyle = `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.5, sz * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      st.raf = requestAnimationFrame(draw);
    }

    stateRef.current.raf = requestAnimationFrame(draw);
    return () => { if (stateRef.current) cancelAnimationFrame(stateRef.current.raf); };
  }, []);

  return <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block' }} />;
}

/* ─── Caption overlay ─────────────────────────────────────────── */
const CAPTIONS = [
  { t: 0,    text: 'EVERY GREAT BUILDING',                    sub: '' },
  { t: 5,    text: 'STARTED AS A DREAM',                      sub: '' },
  { t: 10.5, text: "BUILDER'S KNOWLEDGE GARDEN",              sub: 'DREAM → DESIGN → PLAN → BUILD → DELIVER → GROW' },
  { t: 15.5, text: 'THE OPERATING SYSTEM FOR CONSTRUCTION',   sub: '' },
];

/* ─── Main page ───────────────────────────────────────────────── */
export default function CinematicPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'logo' | 'main'>('logo');
  const [caption, setCaption] = useState(CAPTIONS[0]);
  const [captionVisible, setCaptionVisible] = useState(false);
  const t0 = useRef(Date.now());

  useEffect(() => {
    if (phase !== 'logo') return;
    setCaptionVisible(true);
    const interval = setInterval(() => {
      const el = (Date.now() - t0.current) / 1000;
      let cur = CAPTIONS[0];
      for (const c of CAPTIONS) { if (el >= c.t) cur = c; }
      setCaption(cur);
    }, 200);
    return () => clearInterval(interval);
  }, [phase]);

  const handleDone = useCallback(() => setPhase('main'), []);

  if (phase === 'logo') {
    return (
      <div style={{ position:'fixed', inset:0, background:'#030308', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        {/* Skip */}
        <button
          onClick={handleDone}
          style={{ position:'absolute', top:24, right:24, padding:'6px 16px', background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.2)', color:'rgba(255,255,255,0.5)', borderRadius:20, fontSize:11, letterSpacing:'0.1em', fontFamily:'monospace', cursor:'pointer', zIndex:10 }}>
          SKIP →
        </button>

        {/* Canvas */}
        <div style={{ width:'100%', height:'100vh' }}>
          <BLogoCanvas onDone={handleDone} />
        </div>

        {/* Captions */}
        <div style={{ position:'absolute', bottom:48, left:0, right:0, textAlign:'center', pointerEvents:'none' }}>
          <div style={{ fontFamily:'monospace', fontSize:13, letterSpacing:'0.18em', color:'rgba(255,255,255,0.45)', transition:'opacity 1s', opacity: captionVisible ? 1 : 0 }}>
            {caption.text}
          </div>
          {caption.sub && (
            <div style={{ fontFamily:'monospace', fontSize:10, letterSpacing:'0.12em', color:'rgba(29,158,117,0.7)', marginTop:8 }}>
              {caption.sub}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main landing after animation ──────────────────────────────
  return (
    <main style={{ minHeight:'100vh', background:'#ffffff', fontFamily:'var(--font-archivo, Archivo, sans-serif)' }}>
      {/* Header */}
      <header style={{ position:'sticky', top:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 32px', background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontFamily:'var(--font-archivo-black, "Archivo Black", sans-serif)', fontSize:20, color:'#030308', letterSpacing:'-0.02em' }}>BKG</span>
        <nav style={{ display:'flex', gap:24 }}>
          {['Knowledge','Dream','Build','Marketplace'].map(n=>(
            <button key={n} style={{ background:'none', border:'none', fontSize:14, color:'#555', cursor:'pointer', fontFamily:'inherit' }}>{n}</button>
          ))}
        </nav>
        <button onClick={()=>router.push('/dream')} style={{ padding:'8px 20px', background:'#1D9E75', color:'#fff', border:'none', borderRadius:6, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Get started</button>
      </header>

      {/* Hero */}
      <section style={{ padding:'80px 32px 60px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20 }}>
          {PATH_CARDS.map(card=>(
            <div key={card.id} onClick={()=>router.push(card.href)} style={{ cursor:'pointer', borderRadius:16, overflow:'hidden', border:'1px solid rgba(0,0,0,0.08)', transition:'transform .2s,box-shadow .2s', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}
              onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.transform='translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 12px 32px rgba(0,0,0,0.12)'; }}
              onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.transform='translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'; }}>
              <div style={{ height:200, background:`url(${card.image}) center/cover`, position:'relative' }}>
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5))' }} />
                <div style={{ position:'absolute', bottom:16, left:16, color:'#fff', fontFamily:'var(--font-archivo-black,"Archivo Black",sans-serif)', fontSize:20 }}>{card.title}</div>
              </div>
              <div style={{ padding:20 }}>
                <p style={{ fontSize:14, color:'#666', margin:'0 0 16px', lineHeight:1.5 }}>{card.desc}</p>
                <button style={{ padding:'8px 16px', background:card.accent, color:'#fff', border:'none', borderRadius:6, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>{card.cta} →</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
