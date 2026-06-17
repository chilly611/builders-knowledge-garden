'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PATH_CARDS = [
  { id:'dream', image:'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=900&q=85&fit=crop', title:'I have a dream', desc:'Describe what you want to build — voice, text, photo, or sketch.', cta:'Start dreaming', href:'/dream', accent:'#D85A30' },
  { id:'build', image:'https://images.unsplash.com/photo-1429497419816-9ca5cfb4571a?w=900&q=85&fit=crop', title:'I build for a living', desc:'Launch projects, manage your pipeline, generate estimates, run field ops.', cta:'Start building', href:'/killerapp', accent:'#A53A2D' },
  { id:'supply', image:'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=900&q=85&fit=crop', title:'I supply the industry', desc:'List your products, connect with contractors at the right moment.', cta:'Start supplying', href:'/marketplace', accent:'#1D9E75' },
];

// Hard fallback: if the animation iframe never posts "done" (broken / slow / blocked),
// reveal the path picker anyway so this surface can NEVER dead-end on the splash.
const REVEAL_FALLBACK_MS = 12000;

export default function CinematicPage() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reveal = () => setDone(true);
    const handler = (e: MessageEvent) => {
      if (e.data === 'done') reveal();
    };
    window.addEventListener('message', handler);
    const timer = setTimeout(reveal, REVEAL_FALLBACK_MS);
    return () => {
      window.removeEventListener('message', handler);
      clearTimeout(timer);
    };
  }, []);

  if (done) {
    return (
      <main style={{ minHeight:'100vh', background:'#FBF6EC', fontFamily:"var(--font-archivo,'Archivo',sans-serif)" }}>
        <header style={{ position:'sticky', top:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 32px', background:'rgba(251,246,236,0.95)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
          <span style={{ fontFamily:"var(--font-archivo-black,'Archivo Black',sans-serif)", fontSize:20, color:'#030308' }}>Builder&apos;s Knowledge Garden</span>
          <button onClick={()=>router.push('/dream')} style={{ padding:'8px 20px', background:'#1D9E75', color:'#fff', border:'none', borderRadius:6, fontSize:14, cursor:'pointer' }}>Get started</button>
        </header>
        <section style={{ padding:'64px 32px', maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20 }}>
            {PATH_CARDS.map(card => (
              <div key={card.id} onClick={()=>router.push(card.href)}
                style={{ cursor:'pointer', borderRadius:16, overflow:'hidden', border:'1px solid rgba(0,0,0,0.08)', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', transition:'transform .2s,box-shadow .2s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform='translateY(-4px)'; el.style.boxShadow='0 12px 32px rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform='none'; el.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'; }}>
                <div style={{ height:200, background:`url(${card.image}) center/cover`, position:'relative' }}>
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.5))' }} />
                  <div style={{ position:'absolute', bottom:16, left:16, color:'#fff', fontFamily:"var(--font-archivo-black,'Archivo Black',sans-serif)", fontSize:18 }}>{card.title}</div>
                </div>
                <div style={{ padding:20 }}>
                  <p style={{ fontSize:14, color:'#666', margin:'0 0 16px', lineHeight:1.5 }}>{card.desc}</p>
                  <button style={{ padding:'8px 16px', background:card.accent, color:'#fff', border:'none', borderRadius:6, fontSize:13, cursor:'pointer' }}>{card.cta} →</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'#030308' }}>
      <iframe
        src="/bkg/anim.html"
        style={{ width:'100%', height:'100%', border:'none', display:'block' }}
        title="Builder's Knowledge Garden — B Logo Animation"
      />
      <button
        onClick={()=>setDone(true)}
        style={{ position:'fixed', top:24, right:24, zIndex:10, padding:'8px 18px', background:'rgba(255,255,255,0.12)', color:'#fff', border:'1px solid rgba(255,255,255,0.35)', borderRadius:999, fontSize:13, letterSpacing:'0.02em', cursor:'pointer', backdropFilter:'blur(6px)', fontFamily:"var(--font-archivo,'Archivo',sans-serif)" }}
        aria-label="Skip the intro animation"
      >Skip intro →</button>
    </div>
  );
}
