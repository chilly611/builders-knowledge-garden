'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const PHASE_T = [0, 5, 10.5, 15.5, 22];
const NT = 6000, NV = 4000, NTOT = NT + NV, SC = 2.1;
const VC = [[0.16,0.26,0.55],[0.58,0.22,0.07],[0.44,0.44,0.50],[0.20,0.16,0.13],[0.10,0.48,0.40],[0.36,0.16,0.07]];
const PATH_CARDS = [
  { id:'dream', image:'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=900&q=85&fit=crop', title:'I have a dream', desc:'Describe what you want to build — voice, text, photo, or sketch.', cta:'Start dreaming', href:'/dream', accent:'#D85A30' },
  { id:'build', image:'https://images.unsplash.com/photo-1429497419816-9ca5cfb4571a?w=900&q=85&fit=crop', title:'I build for a living', desc:'Launch projects, manage your pipeline, generate estimates.', cta:'Start building', href:'/killerapp', accent:'#E8443A' },
  { id:'supply', image:'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=900&q=85&fit=crop', title:'I supply the industry', desc:'List your products, connect with contractors at the right moment.', cta:'Start supplying', href:'/marketplace', accent:'#1D9E75' },
];

function lerpN(a: number, b: number, t: number) { return a + (b - a) * t; }
function easeOut(t: number) { return 1 - Math.pow(1 - t, 4); }
function easeInOut(t: number) { return t < 0.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1; }
function clamp(v: number, a: number, b: number) { return Math.min(b, Math.max(a, v)); }

function toolColor(x: number, y: number, nx: number): [number,number,number] {
  const fb = Math.max(0, y * 0.5 + 0.6);
  let r: number, g: number, b: number;
  if (y > 0.55) { r=0.18+fb*0.12; g=0.28+fb*0.1; b=0.60+fb*0.14; }
  else if (x < -0.28) { const t=Math.sin(y*5+2)*0.5+0.5; r=0.52+t*0.22; g=0.22+t*0.1; b=0.05; }
  else if (x > 0.10 && y > 0.06) { const t=(Math.sin(y*14)+1)*0.5; r=0.42+t*0.38; g=0.42+t*0.38; b=0.46+t*0.38; }
  else if (x > 0.10 && y < -0.06) { r=0.26+fb*0.1; g=0.20+fb*0.07; b=0.16+fb*0.05; }
  else { r=0.28+fb*0.14; g=0.28+fb*0.14; b=0.30+fb*0.14; }
  const ef = Math.max(0, Math.abs(nx) - 0.45) * 2.5;
  return [Math.min(1,r+ef*0.07), Math.min(1,g+ef*0.28), Math.min(1,b+ef*0.20)];
}

function decodeF16(b64: string, n: number): Float32Array {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const u16 = new Uint16Array(u8.buffer);
  const f32 = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const h = u16[i];
    const s = (h & 0x8000) ? -1 : 1;
    const e = (h & 0x7c00) >> 10;
    const f = h & 0x03ff;
    if (e === 0) f32[i] = s * 5.96e-8 * f;
    else if (e === 31) f32[i] = f ? NaN : s * Infinity;
    else f32[i] = s * Math.pow(2, e - 15) * (1 + f * 9.765625e-4);
  }
  return f32;
}

export default function CinematicPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [done, setDone] = useState(false);
  const [caption, setCaption] = useState('EVERY GREAT BUILDING');
  const [subCaption, setSubCaption] = useState('');
  const [captionColor, setCaptionColor] = useState('rgba(255,255,255,0.45)');

  const finish = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setDone(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Size canvas to window
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Particle state
    const pos = new Float32Array(NTOT * 3);
    const col = new Float32Array(NTOT * 3);
    const tPos = new Float32Array(NT * 3);
    const tCol = new Float32Array(NT * 3);
    const iPos = new Float32Array(NTOT * 3);
    const vel = new Float32Array(NTOT * 3);
    let verticesReady = false;
    let rotY = 0, rotX = 0;
    let frame = 0;
    const t0 = Date.now();

    // Scatter particles in sphere
    for (let i = 0; i < NTOT; i++) {
      const rd = (i < NT ? 8 : 5) + Math.random() * (i < NT ? 5 : 14);
      const th = Math.random() * Math.PI * 2;
      const ph = (Math.random() - 0.5) * Math.PI;
      iPos[i*3]   = pos[i*3]   = rd * Math.cos(th) * Math.cos(ph);
      iPos[i*3+1] = pos[i*3+1] = rd * Math.sin(ph) * 1.3;
      iPos[i*3+2] = pos[i*3+2] = rd * Math.sin(th) * Math.cos(ph);
      vel[i*3]   = (Math.random()-0.5) * (i < NT ? 0.022 : 0.007);
      vel[i*3+1] = (Math.random()-0.5) * (i < NT ? 0.016 : 0.005);
      vel[i*3+2] = (Math.random()-0.5) * (i < NT ? 0.022 : 0.007);
      const vc = VC[i % VC.length];
      const br = i < NT ? 0.6 : 0.28;
      col[i*3] = vc[0]*br; col[i*3+1] = vc[1]*br; col[i*3+2] = vc[2]*br;
    }

    // Load real vertex data
    Promise.all([
      fetch('/bkg/p6k.txt').then(r => r.text()),
      fetch('/bkg/n6k.txt').then(r => r.text()),
    ]).then(([pb, nb]) => {
      const RP = decodeF16(pb, NT * 3);
      const RN = decodeF16(nb, NT * 3);
      for (let i = 0; i < NT; i++) {
        tPos[i*3]   = RP[i*3]   * SC;
        tPos[i*3+1] = RP[i*3+1] * SC;
        tPos[i*3+2] = RP[i*3+2] * SC;
        const [r,g,b] = toolColor(RP[i*3], RP[i*3+1], RN[i*3]);
        tCol[i*3] = r; tCol[i*3+1] = g; tCol[i*3+2] = b;
      }
      verticesReady = true;
    }).catch(() => {
      // Procedural fallback - B shape
      for (let i = 0; i < NT; i++) {
        const t = i / NT;
        let x: number, y: number;
        if (t < 0.3) { x = -0.5 + Math.random()*0.18; y = (Math.random()-0.5)*1.8; }
        else if (t < 0.65) { const a = Math.random()*Math.PI; x = 0.1+Math.cos(a)*0.42+Math.random()*0.08; y = 0.5+Math.sin(a)*0.38+Math.random()*0.05; }
        else { const a = Math.random()*Math.PI; x = 0.1+Math.cos(a)*0.48+Math.random()*0.08; y = -0.5+Math.sin(a)*0.44+Math.random()*0.05; }
        tPos[i*3] = x*SC; tPos[i*3+1] = y*SC; tPos[i*3+2] = (Math.random()-0.5)*0.2;
        const [r,g,b] = toolColor(x,y,0);
        tCol[i*3]=r; tCol[i*3+1]=g; tCol[i*3+2]=b;
      }
      verticesReady = true;
    });

    function project(x: number, y: number, z: number): [number, number, number] {
      const W = canvas.width, H = canvas.height;
      const x1 = x*Math.cos(rotY) - z*Math.sin(rotY);
      const z1 = x*Math.sin(rotY) + z*Math.cos(rotY);
      const y1 = y*Math.cos(rotX) - z1*Math.sin(rotX);
      const z2 = y*Math.sin(rotX) + z1*Math.cos(rotX);
      const fov = 5.5, d = fov / (fov + z2 + 12);
      return [W/2 + x1*d*W*0.42, H/2 - y1*d*H*0.55, d];
    }

    let captionTriggered = [false, false, false, false];

    function draw() {
      const W = canvas.width, H = canvas.height;
      const el = (Date.now() - t0) / 1000;
      frame++;

      // Phase
      let phase = 3;
      if (el < PHASE_T[1]) phase = 0;
      else if (el < PHASE_T[2]) phase = 1;
      else if (el < PHASE_T[3]) phase = 2;

      if (el >= PHASE_T[4]) { setDone(true); return; }

      // Captions
      if (!captionTriggered[0]) { captionTriggered[0]=true; }
      if (phase>=1 && !captionTriggered[1]) { captionTriggered[1]=true; setCaption('STARTED AS A DREAM'); setCaptionColor('rgba(255,255,255,0.45)'); }
      if (phase>=2 && !captionTriggered[2]) { captionTriggered[2]=true; setCaption("BUILDER'S KNOWLEDGE GARDEN"); setCaptionColor('rgba(29,158,117,0.85)'); setSubCaption('DREAM → DESIGN → PLAN → BUILD → DELIVER → GROW'); }
      if (phase>=3 && !captionTriggered[3]) { captionTriggered[3]=true; setCaption('THE OPERATING SYSTEM FOR CONSTRUCTION'); setCaptionColor('rgba(255,255,255,0.45)'); setSubCaption(''); }

      // Clear
      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, W, H);

      // Update particles
      if (phase === 0) {
        for (let i = 0; i < NTOT; i++) {
          const t = el * 0.28;
          pos[i*3]   += vel[i*3]   + Math.sin(t+i*0.19)*0.002;
          pos[i*3+1] += vel[i*3+1] + Math.cos(t+i*0.14)*0.0015;
          pos[i*3+2] += vel[i*3+2] + Math.sin(t*0.65+i*0.21)*0.002;
          const d2 = pos[i*3]**2 + pos[i*3+1]**2 + pos[i*3+2]**2;
          if (d2 > 196) { vel[i*3]*=-.72; vel[i*3+1]*=-.72; vel[i*3+2]*=-.72; }
          if (frame%4===i%4) {
            const vc = VC[Math.floor((Math.sin(i+el)*0.5+0.5)*VC.length)];
            const br = 0.4 + Math.sin(el*1.6+i*0.5)*0.2;
            col[i*3]=vc[0]*br; col[i*3+1]=vc[1]*br; col[i*3+2]=vc[2]*br;
          }
        }
        rotY += 0.0018; rotX = Math.sin(el*0.11)*0.07;
      } else if (phase === 1 && verticesReady) {
        const tN = clamp((el-PHASE_T[1])/(PHASE_T[2]-PHASE_T[1]),0,1);
        const sp = easeOut(tN);
        for (let i = 0; i < NT; i++) {
          const ang = tN*Math.PI*2.4, r = 1-easeOut(tN), pull = 0.04+sp*0.14;
          pos[i*3]   += (tPos[i*3]  +Math.sin(ang+i*.011)*r*.6-pos[i*3])*pull;
          pos[i*3+1] += (tPos[i*3+1]+Math.cos(ang+i*.011)*r*.35-pos[i*3+1])*pull;
          pos[i*3+2] += (tPos[i*3+2]-pos[i*3+2])*pull*0.6;
          col[i*3]  =lerpN(col[i*3],  tCol[i*3],  sp*0.13);
          col[i*3+1]=lerpN(col[i*3+1],tCol[i*3+1],sp*0.13);
          col[i*3+2]=lerpN(col[i*3+2],tCol[i*3+2],sp*0.13);
        }
        for (let i=NT;i<NTOT;i++) { pos[i*3]+=vel[i*3]; pos[i*3+1]+=vel[i*3+1]; pos[i*3+2]+=vel[i*3+2]; col[i*3]*=.997; col[i*3+1]*=.997; col[i*3+2]*=.997; }
        rotY = lerpN(rotY, 0, 0.02);
        rotX = lerpN(rotX, 0, easeInOut(tN));
      } else if (phase >= 2 && verticesReady) {
        const pulse = 0.5+0.5*Math.sin(el*1.85), gb=0.07+pulse*0.14;
        for (let i=0;i<NT;i++) {
          pos[i*3]  =tPos[i*3]  +(Math.random()-.5)*.005; pos[i*3]+=(tPos[i*3]  -pos[i*3])*.18;
          pos[i*3+1]=tPos[i*3+1]+(Math.random()-.5)*.005; pos[i*3+1]+=(tPos[i*3+1]-pos[i*3+1])*.18;
          pos[i*3+2]=tPos[i*3+2]+(Math.random()-.5)*.003; pos[i*3+2]+=(tPos[i*3+2]-pos[i*3+2])*.18;
          const gw=gb*(0.4+tCol[i*3+1]*1.8);
          col[i*3]  =Math.min(1,tCol[i*3]  +gw*0.45);
          col[i*3+1]=Math.min(1,tCol[i*3+1]+gw);
          col[i*3+2]=Math.min(1,tCol[i*3+2]+gw*0.65);
        }
        for(let i=NT;i<NTOT;i++){col[i*3]*=.991;col[i*3+1]*=.991;col[i*3+2]*=.991;}
        const tN = clamp((el-PHASE_T[2])/2.8,0,1);
        rotY = lerpN(0, 0.22, easeInOut(tN)) + Math.sin(el*0.07)*0.04;
        rotX = Math.sin(el*0.14)*0.03;
      }

      // Collect + depth sort
      const drawList: [number,number,number,number,number,number][] = [];
      for (let i = 0; i < NTOT; i++) {
        const [sx,sy,d] = project(pos[i*3],pos[i*3+1],pos[i*3+2]);
        if (sx<-20||sx>W+20||sy<-20||sy>H+20) continue;
        drawList.push([sx,sy,d,col[i*3],col[i*3+1],col[i*3+2]]);
      }
      drawList.sort((a,b) => a[2]-b[2]);

      const baseR = Math.min(W,H) * 0.007;
      for (const [sx,sy,d,r,g,b] of drawList) {
        const sz = baseR * d * 8;
        if (sz < 0.4) continue;
        ctx.fillStyle = `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${Math.min(1,sz*0.6+0.15).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.4, sz*0.5), 0, Math.PI*2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  if (done) {
    return (
      <main style={{minHeight:'100vh',background:'#ffffff',fontFamily:"var(--font-archivo,'Archivo',sans-serif)"}}>
        <header style={{position:'sticky',top:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 32px',background:'rgba(255,255,255,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
          <span style={{fontFamily:"var(--font-archivo-black,'Archivo Black',sans-serif)",fontSize:20,color:'#030308'}}>BKG</span>
          <button onClick={()=>router.push('/dream')} style={{padding:'8px 20px',background:'#1D9E75',color:'#fff',border:'none',borderRadius:6,fontSize:14,cursor:'pointer'}}>Get started</button>
        </header>
        <section style={{padding:'64px 32px',maxWidth:1100,margin:'0 auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
            {PATH_CARDS.map(card=>(
              <div key={card.id} onClick={()=>router.push(card.href)}
                style={{cursor:'pointer',borderRadius:16,overflow:'hidden',border:'1px solid rgba(0,0,0,0.08)',transition:'transform .2s,box-shadow .2s',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}
                onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='translateY(-4px)';el.style.boxShadow='0 12px 32px rgba(0,0,0,0.12)';}}
                onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='none';el.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)';}}>
                <div style={{height:200,background:`url(${card.image}) center/cover`,position:'relative'}}>
                  <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.5))'}}/>
                  <div style={{position:'absolute',bottom:16,left:16,color:'#fff',fontFamily:"var(--font-archivo-black,'Archivo Black',sans-serif)",fontSize:18}}>{card.title}</div>
                </div>
                <div style={{padding:20}}>
                  <p style={{fontSize:14,color:'#666',margin:'0 0 16px',lineHeight:1.5}}>{card.desc}</p>
                  <button style={{padding:'8px 16px',background:card.accent,color:'#fff',border:'none',borderRadius:6,fontSize:13,cursor:'pointer'}}>{card.cta} →</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <div style={{position:'fixed',inset:0,background:'#030308',overflow:'hidden'}}>
      <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%'}} />
      <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
        <div style={{position:'absolute',bottom:52,left:0,right:0,textAlign:'center',transition:'opacity 0.8s'}}>
          <div style={{fontFamily:'monospace',fontSize:12,letterSpacing:'0.18em',color:captionColor,textTransform:'uppercase'}}>{caption}</div>
          {subCaption && <div style={{fontFamily:'monospace',fontSize:9,letterSpacing:'0.12em',color:'rgba(29,158,117,0.7)',marginTop:8}}>{subCaption}</div>}
        </div>
      </div>
      <button onClick={finish} style={{position:'absolute',top:20,right:20,padding:'6px 14px',background:'rgba(255,255,255,0.06)',border:'0.5px solid rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.5)',borderRadius:20,fontSize:10,letterSpacing:'0.1em',fontFamily:'monospace',cursor:'pointer'}}>
        SKIP →
      </button>
    </div>
  );
}
