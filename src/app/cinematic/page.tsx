'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CinematicPage() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    function onMsg(e: { data: unknown }) {
      if (e.data === 'done') setDone(true);
    }
    window.addEventListener('message', onMsg as EventListener);
    return () => window.removeEventListener('message', onMsg as EventListener);
  }, []);

  if (done) {
    return (
      <div style={{minHeight:'100vh',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:24,fontFamily:'sans-serif'}}>
        <h1 style={{fontSize:32,fontWeight:900}}>{"Builder's Knowledge Garden"}</h1>
        <div style={{display:'flex',gap:16}}>
          <button onClick={()=>router.push('/dream')} style={{padding:'12px 24px',background:'#D85A30',color:'#fff',border:'none',borderRadius:8,fontSize:16,cursor:'pointer'}}>Dream</button>
          <button onClick={()=>router.push('/killerapp')} style={{padding:'12px 24px',background:'#E8443A',color:'#fff',border:'none',borderRadius:8,fontSize:16,cursor:'pointer'}}>Build</button>
          <button onClick={()=>router.push('/marketplace')} style={{padding:'12px 24px',background:'#1D9E75',color:'#fff',border:'none',borderRadius:8,fontSize:16,cursor:'pointer'}}>Supply</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{position:'fixed',inset:0,background:'#030308'}}>
      <iframe
        src="/bkg/anim.html"
        style={{width:'100%',height:'100%',border:'none'}}
        title="BKG"
      />
    </div>
  );
}
