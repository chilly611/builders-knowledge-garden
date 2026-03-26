"use client";
import { useState, useEffect, useRef, ReactNode } from "react";

// ═══ COLORS ═══
const C = { ac:"#1D9E75", w:"#D85A30", p:"#7F77DD", bl:"#378ADD", gd:"#BA7517", gn:"#639922", rd:"#E8443A", pk:"#EC4899", ind:"#6366F1", br:"#C4A44A" };
const PH = [{l:"DREAM",c:C.w,i:"💭"},{l:"DESIGN",c:C.p,i:"📐"},{l:"PLAN",c:C.ac,i:"📋"},{l:"BUILD",c:C.bl,i:"🏗️"},{l:"DELIVER",c:C.gd,i:"🔑"},{l:"GROW",c:C.gn,i:"📈"}];

// ═══ SLIDES ═══
const SLIDES = [
  {id:"cover",lb:"🏠 Home"},{id:"mtp",lb:"⚡ MTP"},{id:"killer",lb:"🎯 Killer App"},
  {id:"compass",lb:"🧭 Navigation"},{id:"split",lb:"🌿 Garden vs App"},{id:"lanes",lb:"👥 User Lanes"},
  {id:"biz",lb:"💰 Business Ops"},{id:"security",lb:"🔒 Security"},{id:"gamify",lb:"🎮 Gamification"},
  {id:"compete",lb:"📊 Competition"},{id:"rsi",lb:"🔄 RSI Loops"},{id:"built",lb:"✅ Built"},
  {id:"dbs",lb:"🗃️ 40 Databases"},{id:"next",lb:"🚀 Next Steps"},
];

// ═══ ANIMATED COUNTER ═══
function AN({val,pre="",suf="",dur=1400}:{val:number;pre?:string;suf?:string;dur?:number}){
  const [n,setN]=useState(0);const ref=useRef<HTMLSpanElement>(null);const ran=useRef(false);
  useEffect(()=>{const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting&&!ran.current){ran.current=true;let s=performance.now();const f=(t:number)=>{const p=Math.min((t-s)/dur,1);setN(1-Math.pow(1-p,3));if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f);obs.disconnect()}},{threshold:0.2});if(ref.current)obs.observe(ref.current);return()=>obs.disconnect()},[val,dur]);
  const d=val>=100?Math.floor(n*val).toLocaleString():(n*val).toFixed(val<10?1:0);
  return <span ref={ref}>{pre}{d}{suf}</span>;
}

// ═══ REVEAL ON SCROLL ═══
function Rv({children,delay=0,className=""}:{children:ReactNode;delay?:number;className?:string}){
  const ref=useRef<HTMLDivElement>(null);const [v,setV]=useState(false);
  useEffect(()=>{const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){setTimeout(()=>setV(true),delay);obs.disconnect()}},{threshold:0.08});if(ref.current)obs.observe(ref.current);return()=>obs.disconnect()},[delay]);
  return <div ref={ref} className={className} style={{opacity:v?1:0,transform:v?"none":"translateY(32px)",transition:`opacity 0.7s ${delay}ms cubic-bezier(0.16,1,0.3,1), transform 0.7s ${delay}ms cubic-bezier(0.16,1,0.3,1)`}}>{children}</div>;
}

// ═══ RING ═══
function Ring({pct,sz=48,sw=4,clr=C.ac,children}:{pct:number;sz?:number;sw?:number;clr?:string;children?:ReactNode}){
  const r=(sz-sw)/2,ci=2*Math.PI*r;
  return <div style={{width:sz,height:sz,position:"relative",flexShrink:0}}><svg width={sz} height={sz} style={{transform:"rotate(-90deg)"}}><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="#e8ecf0" strokeWidth={sw}/><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={clr} strokeWidth={sw} strokeDasharray={ci} strokeDashoffset={ci*(1-pct/100)} strokeLinecap="round"/></svg>{children&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{children}</div>}</div>;
}

// ═══ PARTICLE CANVAS ═══
function Particles(){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{const cv=ref.current;if(!cv)return;const cx=cv.getContext("2d");if(!cx)return;
    let w=cv.width=window.innerWidth,h=cv.height=window.innerHeight;
    const pts=Array.from({length:40},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.5+.4,dx:(Math.random()-.5)*.3,dy:(Math.random()-.5)*.3,o:Math.random()*.25+.05}));
    const rs=()=>{w=cv.width=innerWidth;h=cv.height=innerHeight};window.addEventListener("resize",rs);
    let af:number;const draw=()=>{cx.clearRect(0,0,w,h);for(const p of pts){p.x+=p.dx;p.y+=p.dy;if(p.x<0)p.x=w;if(p.x>w)p.x=0;if(p.y<0)p.y=h;if(p.y>h)p.y=0;cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.28);cx.fillStyle=`rgba(29,158,117,${p.o})`;cx.fill()}af=requestAnimationFrame(draw)};draw();
    return()=>{cancelAnimationFrame(af);window.removeEventListener("resize",rs)}
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,opacity:.5}}/>;
}

// ═══ COMPASS NAVIGATOR ═══
function Compass({cur,go}:{cur:number;go:(i:number)=>void}){
  const [open,setOpen]=useState(false);
  const navs=[{i:"🌿",l:"Garden",c:C.ac},{i:"💭",l:"Dream",c:C.w},{i:"⚡",l:"Killer App",c:C.rd},{i:"🧠",l:"Copilot",c:C.p},{i:"🏪",l:"Market",c:C.bl},{i:"👤",l:"Profile",c:C.gd}];
  return(<div style={{position:"fixed",bottom:24,right:24,zIndex:200}}>
    {open&&<div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.2)",backdropFilter:"blur(4px)",zIndex:199}}/>}
    {open&&<div style={{position:"absolute",bottom:72,right:0,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,width:260,zIndex:201}}>
      {navs.map((n,i)=><div key={i} onClick={()=>setOpen(false)} style={{padding:"14px 12px",borderRadius:14,background:"#fff",border:"1px solid #e8ecf0",cursor:"pointer",transition:"all .3s cubic-bezier(.34,1.56,.64,1)",transform:open?`translateY(0) scale(1)`:`translateY(20px) scale(.8)`,opacity:open?1:0,transitionDelay:`${i*50}ms`,boxShadow:"0 4px 20px rgba(0,0,0,.06)",display:"flex",alignItems:"center",gap:8}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=n.c;(e.currentTarget as HTMLElement).style.transform="translateY(-2px) scale(1.03)"}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="#e8ecf0";(e.currentTarget as HTMLElement).style.transform="translateY(0) scale(1)"}}>
        <span style={{fontSize:20}}>{n.i}</span>
        <div><div style={{fontSize:11,fontWeight:600,color:n.c}}>{n.l}</div></div>
      </div>)}
    </div>}
    <button onClick={()=>setOpen(!open)} style={{width:56,height:56,borderRadius:16,border:"none",background:open?"linear-gradient(135deg,#1D9E75,#0c5e45)":"#fff",color:open?"#fff":"#1a2433",fontSize:open?20:22,cursor:"pointer",boxShadow:open?"0 8px 32px rgba(29,158,117,.4)":"0 4px 24px rgba(0,0,0,.1)",transition:"all .3s",display:"flex",alignItems:"center",justifyContent:"center",zIndex:202}}>
      {open?"✕":"🧭"}
    </button>
  </div>);
}

// ═══ SHARED UI ═══
const Card=({children,accent,style={}}:{children:ReactNode;accent?:string;style?:React.CSSProperties})=><div style={{padding:18,borderRadius:14,border:"1px solid #e2e6ec",background:"#fff",borderLeft:accent?`3px solid ${accent}`:undefined,boxShadow:"0 2px 12px rgba(0,0,0,.04)",transition:"all .3s",...style}}>{children}</div>;
const Stat=({v,p="",s="",label,sub,clr=C.ac}:{v:number;p?:string;s?:string;label:string;sub?:string;clr?:string})=><Card><div style={{fontSize:30,fontWeight:700,color:clr,lineHeight:1}}><AN val={v} pre={p} suf={s}/></div><div style={{fontSize:11,fontWeight:600,marginTop:6}}>{label}</div>{sub&&<div style={{fontSize:9,color:"#7a8a9a",marginTop:2}}>{sub}</div>}</Card>;
const Sec=({title,sub,children}:{title?:string;sub?:string;children:ReactNode})=><div style={{padding:"48px 0"}}>{title&&<Rv><h2 style={{fontSize:28,fontWeight:700,letterSpacing:-.5,marginBottom:sub?6:20,color:"#1a2433"}}>{title}</h2></Rv>}{sub&&<Rv delay={80}><p style={{fontSize:13,color:"#5a6a7a",marginBottom:28,maxWidth:580,lineHeight:1.75}}>{sub}</p></Rv>}{children}</div>;
const PhBar=()=><div style={{display:"flex",gap:3,height:28}}>{PH.map((p,i)=><div key={i} style={{flex:1,background:p.c,opacity:.75,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:9,fontWeight:600,color:"#fff"}}>{p.l}</span></div>)}</div>;
const FL=()=><div style={{height:2,background:"#e8ecf0",borderRadius:1,margin:"24px 0",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",width:"40%",height:"100%",borderRadius:1,background:`linear-gradient(90deg,transparent,${C.ac},transparent)`,animation:"flowR 2.5s linear infinite"}}/></div>;

// ═══ MAIN COMPONENT ═══
export default function PresentationPage(){
  const [sl,setSl]=useState(0);const cur=SLIDES[sl].id;
  const go=(i:number)=>{if(i>=0&&i<SLIDES.length){setSl(i);window.scrollTo({top:0,behavior:"smooth"})}};
  const [openLane,setOpenLane]=useState<string|null>(null);

  useEffect(()=>{const h=()=>{const t=document.documentElement;const p=t.scrollTop/(t.scrollHeight-t.clientHeight)*100;const el=document.getElementById("scroll-prog");if(el)el.style.width=p+"%"};window.addEventListener("scroll",h);return()=>window.removeEventListener("scroll",h)},[]);

  return(<div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:"#1a2433",background:"#f7f8fa",minHeight:"100vh"}}>
    <Particles/>
    {/* SCROLL PROGRESS */}
    <div id="scroll-prog" style={{position:"fixed",top:0,left:0,height:3,background:`linear-gradient(90deg,${C.ac},${C.bl},${C.p})`,zIndex:300,width:"0%",transition:"width .15s"}}/>
    {/* NAV */}
    <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(247,248,250,.92)",backdropFilter:"blur(16px)",borderBottom:"1px solid #e2e6ec",padding:"12px 0"}}>
      <div style={{maxWidth:820,margin:"0 auto",padding:"0 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#1D9E75,#0c5e45)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 4px 16px #1D9E7530"}}>🏗️</div>
          <div><div style={{fontSize:14,fontWeight:700}}>Builder&apos;s Knowledge Garden</div><div style={{fontSize:9,color:"#7a8a9a",letterSpacing:2,textTransform:"uppercase"}}>complete platform architecture · march 2026</div></div>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{SLIDES.map((s,i)=><button key={i} onClick={()=>go(i)} style={{padding:"5px 12px",borderRadius:16,border:sl===i?"1.5px solid #1a2433":"1px solid #e2e6ec",background:sl===i?"#1a2433":"#fff",color:sl===i?"#fff":"#7a8a9a",fontSize:10,fontWeight:500,cursor:"pointer",transition:".2s",whiteSpace:"nowrap"}}>{s.lb}</button>)}</div>
      </div>
    </div>
    <div style={{maxWidth:820,margin:"0 auto",padding:"0 20px",position:"relative",zIndex:1}}>

    {/* ═══ COVER ═══ */}
    {cur==="cover"&&<Sec>
      <div style={{textAlign:"center",paddingTop:32}}>
        <Rv><div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:18}}>{PH.map((p,i)=><div key={i} style={{width:48,height:48,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,background:`${p.c}10`,border:`1px solid ${p.c}25`,animation:`float 3s ease-in-out ${i*.2}s infinite`}}>{p.i}</div>)}</div></Rv>
        <Rv delay={100}><div style={{fontSize:9,letterSpacing:3,textTransform:"uppercase",color:C.br,fontWeight:600}}>The Operating System for the $17T Construction Economy</div></Rv>
        <Rv delay={200}><h1 style={{fontSize:38,fontWeight:700,margin:"12px 0",lineHeight:1.2,background:`linear-gradient(135deg,#1a2433 40%,${C.ac})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>The Builder&apos;s<br/>Knowledge Garden</h1></Rv>
        <Rv delay={300}><p style={{fontSize:14,color:"#5a6a7a",maxWidth:520,margin:"0 auto 16px",lineHeight:1.7}}>One platform. Every phase. 40 structured databases. Voice-first. AI-native. The thing that makes every competitor look like a point solution.</p></Rv>
        <Rv delay={350}><div onClick={()=>go(1)} style={{margin:"20px auto",maxWidth:480,padding:"18px 24px",borderRadius:18,background:`linear-gradient(135deg,${C.w}08,${C.w}04)`,border:`2px solid ${C.w}35`,cursor:"pointer",transition:".3s",boxShadow:`0 4px 24px ${C.w}10`}}>
          <div style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:C.w,fontWeight:700}}>⚡ Massive Transformational Product</div>
          <div style={{fontSize:18,fontWeight:700,marginTop:4}}>The Builder&apos;s Killer App</div>
          <div style={{fontSize:11,color:"#5a6a7a",marginTop:6}}>An AI superhuman COO that carries the cognitive load of building anything, anywhere.</div>
          <div style={{fontSize:10,color:C.w,fontWeight:600,marginTop:8}}>See the MTP →</div>
        </div></Rv>
        <Rv delay={400}><PhBar/></Rv>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginTop:20}}>
          {[{v:17,p:"$",s:"T",l:"Global market",su:"Largest industry on earth",c:C.ac},{v:58,s:" seeded",l:"Knowledge entities",su:"58 structured + 40K target",c:C.p},{v:20,s:"",l:"Jurisdictions",su:"142+ target — global",c:C.bl},{v:40,l:"Databases planned",su:"The data IS the product",c:C.w}].map((s,i)=><Rv key={i} delay={450+i*60}><Stat v={s.v} p={s.p||""} s={s.s||""} label={s.l} sub={s.su} clr={s.c}/></Rv>)}
        </div>
      </div>
    </Sec>}

    {/* ═══ MTP ═══ */}
    {cur==="mtp"&&<Sec>
      <div style={{textAlign:"center",marginBottom:24}}>
        <Rv><div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:14}}>{["📐","⛑️","🏗️","🎙️","🧠","📈"].map((e,i)=><div key={i} style={{width:42,height:42,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,background:`${[C.w,C.p,C.ac,C.bl,C.gd,C.gn][i]}10`,border:`1px solid ${[C.w,C.p,C.ac,C.bl,C.gd,C.gn][i]}20`}}>{e}</div>)}</div></Rv>
        <Rv delay={100}><div style={{fontSize:9,letterSpacing:3,textTransform:"uppercase",color:C.w,fontWeight:700}}>⚡ Massive Transformational Product</div></Rv>
        <Rv delay={150}><h2 style={{fontSize:32,fontWeight:700,margin:"8px 0 6px"}}>The Builder&apos;s Killer App</h2></Rv>
        <Rv delay={200}><p style={{fontSize:12,color:"#5a6a7a"}}>Not a tool. Not incremental. <strong style={{color:C.w}}>The AI superhuman COO for the construction economy.</strong></p></Rv>
      </div>
      <FL/>
      <Rv delay={250}><Card accent={C.w} style={{background:`linear-gradient(135deg,${C.w}06,${C.gd}04)`,borderColor:`${C.w}25`,marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:700,color:C.w,marginBottom:10}}>What makes this an MTP?</div>
        <div style={{fontSize:12,color:"#5a6a7a",lineHeight:1.8}}>A Massive Transformational Product doesn&apos;t just improve a workflow — it <strong style={{color:"#1a2433"}}>fundamentally transforms how an entire industry operates</strong>.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:14}}>
          <div style={{padding:12,borderRadius:10,background:"#f7f8fa",border:"1px solid #e2e6ec"}}><div style={{fontSize:9,fontWeight:700,color:C.w}}>BEFORE</div><div style={{fontSize:10,color:"#7a8a9a",lineHeight:1.6,marginTop:4}}>9 subscriptions. 9 logins. 9 data silos. Tribal knowledge. Paper permits.</div></div>
          <div style={{padding:12,borderRadius:10,background:`${C.ac}06`,border:`1px solid ${C.ac}20`}}><div style={{fontSize:9,fontWeight:700,color:C.ac}}>AFTER</div><div style={{fontSize:10,color:"#5a6a7a",lineHeight:1.6,marginTop:4}}>One platform. One brain. Voice-first. AI-native. Every code, material, cost, schedule — connected.</div></div>
        </div>
      </Card></Rv>
      <Rv delay={300}><div style={{fontSize:12,fontWeight:700,marginBottom:10}}>The 4 Pillars of the MTP</div></Rv>
      {[{i:"🧠",t:"The Knowledge Layer Nobody Else Has",d:"40 structured databases. Every building code on earth. Every material. 142+ jurisdictions. Cross-referenced, AI-queryable.",c:C.p,n:"40 DBs"},
        {i:"⚡",t:"The AI COO That Never Sleeps",d:"Tracks hundreds of variables. Surfaces what needs attention NOW. Presents options with tradeoffs. Human decides — platform executes.",c:C.w,n:"∞ vars"},
        {i:"🎙️",t:"Voice-First in a Hands-Dirty Industry",d:"349K worker shortage. 40% retiring by 2031. \"Show me the schedule.\" \"Log safety observation.\" 30+ languages.",c:C.bl,n:"30+ lang"},
        {i:"🔄",t:"RSI: The Moat That Widens Every Day",d:"7 self-improvement loops. After 12 months, estimates calibrated to real projects. Competitors need 12 months to reach parity — but by then we're 12 months ahead.",c:C.gn,n:"7 loops"},
      ].map((p,i)=><Rv key={i} delay={350+i*80}><div style={{display:"flex",gap:14,padding:"14px 0",borderBottom:i<3?"1px solid #e8ecf0":"none"}}>
        <div style={{width:56,height:56,borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:`${p.c}10`,border:`1px solid ${p.c}20`,flexShrink:0}}><span style={{fontSize:22}}>{p.i}</span><span style={{fontSize:8,fontWeight:700,color:p.c}}>{p.n}</span></div>
        <div><div style={{fontSize:13,fontWeight:700}}>{p.t}</div><div style={{fontSize:11,color:"#5a6a7a",lineHeight:1.7,marginTop:4}}>{p.d}</div></div>
      </div></Rv>)}
    </Sec>}

    {/* ═══ KILLER APP ═══ */}
    {cur==="killer"&&<Sec>
      <Rv><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <div style={{width:40,height:40,borderRadius:12,background:`linear-gradient(135deg,${C.w},#b84a25)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⚡</div>
        <div><div style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:C.w,fontWeight:700}}>The Builder&apos;s Killer App</div><h2 style={{fontSize:22,fontWeight:700}}>What It Actually Does</h2></div>
      </div></Rv>
      <Rv delay={80}><p style={{fontSize:12,color:"#5a6a7a",lineHeight:1.7,marginBottom:20}}>From &quot;I want to build...&quot; to handing over the keys — one intelligent system with gamified progress that makes building feel like leveling up.</p></Rv>
      {[{ph:"DREAM",c:C.w,i:"💭",act:"I want to build a modern farmhouse in Asheville",res:"Full plan in 60 seconds: codes, estimate, timeline, challenges. Voice or text. Free. Shareable. Viral.",app:"Dream Builder",gam:"🏆 \"Dream Launched\" unlocked"},
        {ph:"PLAN",c:C.ac,i:"📋",act:"Start this project",res:"Auto-populates 7-tab dashboard. Codes, materials, schedule, team, permits. Confidence score tracks readiness.",app:"Smart Launcher",gam:"📊 Confidence: 23% → watch it climb"},
        {ph:"BUILD",c:C.bl,i:"🏗️",act:"What's the status?",res:"Command center: project health, smart alerts, budget heartbeat, risk radar monitoring weather + labor + materials.",app:"AI COO Dashboard",gam:"🗺️ Fog of War lifts as phases complete"},
        {ph:"FIELD",c:C.gd,i:"🎙️",act:"Log safety observation (voice)",res:"Structured report generated. Daily briefing from tasks + jurisdiction + weather. Offline. 30+ languages.",app:"Voice Field Ops",gam:"⭐ Safety streak: 14 days!"},
        {ph:"DECIDE",c:C.p,i:"🧠",act:"CLT or steel framing?",res:"Cost delta, schedule impact, code implications, carbon, local installers. Cited answer. Clear recommendation.",app:"AI Copilot",gam:"💡 \"CLT reduces carbon 60%\""},
        {ph:"GROW",c:C.gn,i:"📈",act:"Project complete",res:"Data feeds RSI. Next estimate more accurate. Next schedule smarter. Platform got smarter from YOUR project.",app:"RSI Flywheel",gam:"🎓 Master Builder: 74%"},
      ].map((s,i)=><Rv key={i} delay={120+i*70}><div style={{marginBottom:10,padding:"14px 16px",borderRadius:14,background:`${s.c}04`,border:`1px solid ${s.c}18`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontSize:14}}>{s.i}</span><span style={{fontSize:9,fontWeight:700,color:s.c,letterSpacing:1}}>{s.ph}</span><span style={{marginLeft:"auto",fontSize:8,padding:"3px 10px",borderRadius:8,background:`${s.c}12`,color:s.c,fontWeight:600}}>{s.app}</span></div>
        <div style={{fontSize:12,fontWeight:600,fontStyle:"italic",marginBottom:4}}>&quot;{s.act}&quot;</div>
        <div style={{fontSize:11,color:"#5a6a7a",lineHeight:1.6,marginBottom:6}}>{s.res}</div>
        <div style={{fontSize:9,padding:"5px 10px",borderRadius:8,background:"#f7f8fa",border:"1px solid #e2e6ec",color:C.gd}}>{s.gam}</div>
      </div></Rv>)}
    </Sec>}

    {/* ═══ COMPASS NAVIGATION ═══ */}
    {cur==="compass"&&<Sec title="Navigate the Garden" sub="Adapted from the orchid garden's orrery. A persistent compass button in the bottom-right blooms into rectangular cards. Always one tap away.">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24}}>
        {[{i:"🌿",t:"Knowledge Garden",d:"Browse codes, materials, methods, safety. 40K+ entities. Free. Open.",c:C.ac},
          {i:"💭",t:"Dream Builder",d:"Describe what you want to build. Full plan in 60 seconds. Free & viral.",c:C.w},
          {i:"⚡",t:"Killer App",d:"Your projects, CRM, invoicing, finances. Private & encrypted.",c:C.rd},
          {i:"🧠",t:"AI Copilot",d:"Ask anything about construction. Cited answers. Voice or text.",c:C.p},
          {i:"🏪",t:"Marketplace",d:"Suppliers, subcontractors, equipment, services. Search, RFQ, transact.",c:C.bl},
          {i:"👤",t:"My Profile",d:"Settings, team, billing, certifications, reputation.",c:C.gd},
        ].map((card,i)=><Rv key={i} delay={i*70}><div style={{padding:20,borderRadius:16,background:"#fff",border:"1px solid #e2e6ec",cursor:"pointer",transition:"all .35s cubic-bezier(.34,1.56,.64,1)",position:"relative",overflow:"hidden"}} onMouseEnter={e=>{const t=e.currentTarget;t.style.transform="translateY(-4px) scale(1.02)";t.style.borderColor=card.c;t.style.boxShadow=`0 12px 32px ${card.c}15`}} onMouseLeave={e=>{const t=e.currentTarget;t.style.transform="none";t.style.borderColor="#e2e6ec";t.style.boxShadow="none"}}>
          <span style={{fontSize:32,display:"block",marginBottom:8}}>{card.i}</span>
          <div style={{fontSize:14,fontWeight:700,color:card.c}}>{card.t}</div>
          <div style={{fontSize:10,color:"#7a8a9a",marginTop:6,lineHeight:1.5}}>{card.d}</div>
        </div></Rv>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Rv delay={420}><Card><div style={{fontSize:12,fontWeight:700,color:C.ac,marginBottom:8}}>📱 Mobile — Bottom-right FAB</div><div style={{fontSize:10,color:"#7a8a9a",lineHeight:1.7}}>56px compass button, always visible. Tap → 6 rectangular cards bloom upward with spring animation. Background dims. Tap outside to dismiss.</div></Card></Rv>
        <Rv delay={480}><Card><div style={{fontSize:12,fontWeight:700,color:C.bl,marginBottom:8}}>🖥️ Desktop — Left sidebar</div><div style={{fontSize:10,color:"#7a8a9a",lineHeight:1.7}}>72px collapsed sidebar. Icon + label. Active = accent fill. Expandable to 240px. Compass logo at top. Always accessible.</div></Card></Rv>
      </div>
      <Rv delay={540}><Card accent={C.w} style={{marginTop:14}}><div style={{fontSize:12,fontWeight:700,color:C.w,marginBottom:6}}>Context-aware intelligence</div><div style={{fontSize:11,color:"#5a6a7a",lineHeight:1.8}}>Inside a project → &quot;back to project&quot; shortcut. AI Copilot pulses when you&apos;re stuck (30+ seconds on a form). Field devices swap copilot for Voice. Killer App shows 🔒 if unauthenticated.</div></Card></Rv>
    </Sec>}

    {/* ═══ GARDEN vs APP ═══ */}
    {cur==="split"&&<Sec title="Knowledge Garden vs Killer App" sub="Two products, one platform. The Garden is shared knowledge. The App is your private cockpit.">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
        <Rv><div style={{padding:24,borderRadius:18,background:`${C.ac}04`,border:`2px solid ${C.ac}20`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span style={{fontSize:28}}>🌿</span><div><div style={{fontSize:18,fontWeight:700,color:C.ac}}>Knowledge Garden</div><div style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:"#7a8a9a"}}>shared · public · growing</div></div></div>
          <div style={{fontSize:11,color:"#5a6a7a",lineHeight:1.7,marginBottom:14}}>The world&apos;s construction knowledge. Anyone can browse. AI agents query it. Every entity has a public URL.</div>
          {["Building codes (every jurisdiction)","Materials encyclopedia","Construction methods library","Safety & hazard regulations","Permit requirements","Cost benchmarks (anonymized)","Sequencing & dependencies","Community Q&A + contributions"].map((g,i)=><div key={i} style={{fontSize:10,color:"#7a8a9a",padding:"2px 0"}}>✦ {g}</div>)}
          <div style={{marginTop:14,padding:8,borderRadius:10,background:`${C.ac}10`,textAlign:"center",fontSize:10,fontWeight:600,color:C.ac}}>🌍 OPEN · NO LOGIN · SEO-INDEXED</div>
        </div></Rv>
        <Rv delay={100}><div style={{padding:24,borderRadius:18,background:`${C.rd}04`,border:`2px solid ${C.rd}20`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span style={{fontSize:28}}>⚡</span><div><div style={{fontSize:18,fontWeight:700,color:C.rd}}>Killer App</div><div style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:"#7a8a9a"}}>private · secure · yours</div></div></div>
          <div style={{fontSize:11,color:"#5a6a7a",lineHeight:1.7,marginBottom:14}}>Your private business cockpit. Encrypted, backed up, exclusively yours. Never trains AI models.</div>
          {["Project management dashboards","CRM (leads → contracts → warranty)","Invoicing & AIA pay applications","Budgets, P&L, cash flow","Client portal (branded)","Scheduling & resource allocation","Field reports & safety logs","Team & subcontractor mgmt"].map((a,i)=><div key={i} style={{fontSize:10,color:"#7a8a9a",padding:"2px 0"}}>🔒 {a}</div>)}
          <div style={{marginTop:14,padding:8,borderRadius:10,background:`${C.rd}10`,textAlign:"center",fontSize:10,fontWeight:600,color:C.rd}}>🔐 AUTH · ENCRYPTED · NIGHTLY BACKUP</div>
        </div></Rv>
      </div>
      <FL/>
      <Rv delay={200}><Card accent={C.p}><div style={{fontSize:12,fontWeight:700,marginBottom:6}}>The bridge</div><div style={{fontSize:11,color:"#5a6a7a",lineHeight:1.8}}>The Garden enriches the App. Create a project → it pulls codes, materials, safety reqs automatically. Browse a code → one click saves to your project. Garden = brain. App = hands.</div></Card></Rv>
      <Rv delay={260}><div style={{marginTop:16,fontSize:13,fontWeight:700,marginBottom:10}}>Data classification</div></Rv>
      {[["🌍","Public knowledge","IBC §903.2.1 fire sprinklers","Garden",C.ac],["🌍","Benchmarks","Avg cost Type IA in SE region","Garden (aggregated)",C.ac],["🔒","Your projects","123 Main St — $847K budget","Killer App only",C.rd],["🔒","Your financials","March P&L, invoices","Killer App only",C.rd],["🔒","Your clients","Contacts, proposals, comms","Killer App only",C.rd],["🔒","AI queries","Questions about YOUR project","Session only",C.p]].map((d,i)=><Rv key={i} delay={300+i*40}><div style={{display:"grid",gridTemplateColumns:"160px 1fr 130px",gap:10,padding:"7px 0",borderBottom:"1px solid #e8ecf0",fontSize:10,alignItems:"center"}}><div style={{display:"flex",gap:6,alignItems:"center"}}><span>{d[0]}</span><span style={{fontWeight:600}}>{d[1]}</span></div><div style={{color:"#7a8a9a"}}>{d[2]}</div><div style={{color:d[4] as string,fontWeight:500,textAlign:"right"}}>{d[3]}</div></div></Rv>)}
    </Sec>}

    {/* ═══ USER LANES ═══ */}
    {cur==="lanes"&&<Sec title="Choose Your Lane" sub="8 user types, each with different dreams. Onboarding adapts. Dashboard adapts. AI adapts. One platform, 8 experiences.">
      {[{id:"gc",i:"🏗️",t:"General Contractors",c:C.bl,d:"Run projects, manage subs, invoice clients",n:"Full PM, CRM, invoicing, AIA pay apps, scheduling, field ops, safety, compliance, cash flow, sub mgmt",dr:"One platform replacing Procore + QuickBooks + Excel. See every project in one glance."},
        {id:"diy",i:"🔨",t:"DIY Builders",c:C.w,d:"Building their own home — learning everything",n:"Dream Builder (free), permit navigator, simple budgets, plain-language codes, contractor matching",dr:"Feel confident. Understand what they don't know. Stay on budget. Pass inspection first time."},
        {id:"spec",i:"⚡",t:"Specialty Contractors",c:C.p,d:"Electrical, plumbing, HVAC, fire, concrete",n:"Trade-specific codes, cert tracking, workforce scheduling, job costing, procurement, toolbox talks",dr:"Win more work. Keep crews busy. Track certs. Get paid faster."},
        {id:"sup",i:"📦",t:"Suppliers & Manufacturers",c:C.ac,d:"Sell materials, products, systems",n:"Product listings, lead gen, RFQ mgmt, order tracking, code compliance mapping",dr:"Auto-matches: 'fire-rated drywall required' → their product appears."},
        {id:"eq",i:"🚜",t:"Equipment Sales & Rentals",c:C.gd,d:"Cranes, excavators, lifts, tools",n:"Fleet mgmt, availability, rates, utilization, maintenance, delivery logistics",dr:"100% utilization. Auto-bookings from project schedules."},
        {id:"svc",i:"🔧",t:"Service Providers",c:C.gn,d:"Architects, engineers, surveyors, consultants",n:"Profile, portfolio, leads, proposals, scheduling, client portal",dr:"Steady pipeline of qualified leads. Reputation builds visibly."},
        {id:"wk",i:"👷",t:"Job Seekers & Workers",c:C.pk,d:"Apprentice to master",n:"Skills profile, cert tracking, training, job board, crew matching",dr:"Never between jobs. Verified resume. Level up → earn more."},
        {id:"rb",i:"🤖",t:"Robots & AI Agents",c:C.ind,d:"Autonomous equipment, drones, AI",n:"MCP server, REST API, structured JSON, machine-readable instructions",dr:"Single knowledge backbone. Query once, authoritative answers."},
      ].map((l,i)=><Rv key={l.id} delay={i*50}><div onClick={()=>setOpenLane(openLane===l.id?null:l.id)} style={{padding:"14px 16px",borderRadius:14,borderLeft:`3px solid ${openLane===l.id?l.c:"transparent"}`,background:openLane===l.id?"#fff":"transparent",cursor:"pointer",transition:".3s",marginBottom:2}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:48,height:48,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,background:`${l.c}10`,border:`1px solid ${l.c}20`,flexShrink:0,transition:".3s"}}>{l.i}</div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{l.t}</div><div style={{fontSize:10,color:"#7a8a9a"}}>{l.d}</div></div>
          <span style={{fontSize:11,color:l.c,transition:".3s",display:"inline-block",transform:`rotate(${openLane===l.id?90:0}deg)`}}>▶</span>
        </div>
        {openLane===l.id&&<div style={{marginTop:12,paddingLeft:58,animation:"fadeUp .3s ease"}}>
          <div style={{fontSize:11,fontWeight:600,color:l.c,marginBottom:4}}>What they need</div>
          <div style={{fontSize:10,color:"#5a6a7a",lineHeight:1.7,marginBottom:10}}>{l.n}</div>
          <div style={{fontSize:11,fontWeight:600,color:l.c,marginBottom:4}}>Their dream</div>
          <div style={{fontSize:10,color:"#5a6a7a",lineHeight:1.7}}>{l.dr}</div>
        </div>}
      </div></Rv>)}
      <Rv delay={400}><Card accent={C.w} style={{marginTop:16}}><div style={{fontSize:12,fontWeight:700,color:C.w,marginBottom:6}}>🎮 Gamified onboarding per lane</div><div style={{fontSize:11,color:"#5a6a7a",lineHeight:1.8}}>First screen: &quot;I am a...&quot; → select lane → 🏆 &quot;Welcome, Builder!&quot; achievement. Tutorial quest. Lane-specific milestones: contractors unlock &quot;First Invoice&quot;, DIY earn &quot;Code Scholar&quot;, workers achieve &quot;Certified Pro&quot;.</div></Card></Rv>
    </Sec>}

    {/* ═══ BUSINESS OPS ═══ */}
    {cur==="biz"&&<Sec title="Full Business Operations" sub="Everything a construction business does digitally — inside the Killer App. No more spreadsheets, no more 9 subscriptions.">
      {[{t:"CRM & Pipeline",c:C.bl,i:"📊",its:[["Lead capture","Web form, phone, email, marketplace → auto-create"],["Pipeline","Lead → Qualified → Proposal → Won/Lost. Kanban."],["Client portal","Branded: progress, budget, selections, approvals"],["Proposal AI","Drafts from project type + knowledge engine"],["Comms log","Email, call, text — timestamped, searchable"],["Win/loss","Project types, margins, patterns"],["Reviews","Auto-request post-project. Profile display."]]},
        {t:"Invoicing & Payments",c:C.ac,i:"💰",its:[["Invoice gen","Line items from cost codes. Retainage, tax."],["AIA pay apps","G702/G703, schedule of values, % complete"],["Change orders","Approved COs auto-add to next pay app"],["Lien waivers","Conditional/unconditional. Deadline alerts."],["Payments","Aging reports. Auto-reminders."],["Stripe","Online, ACH, credit card. Split payments."]]},
        {t:"Financial Intelligence",c:C.w,i:"📈",its:[["Job costing","Real-time budget vs actual by cost code"],["P&L","Revenue, COGS, margin — per project & portfolio"],["Cash flow AI","'Shortfall in 6 weeks based on billing'"],["Profitability","By project type, client, trade, region"],["Tax exports","QuickBooks, Xero, Sage. Multi-jurisdiction."],["Budget heartbeat","Committed, spent, remaining, projected"]]},
        {t:"Marketing & Growth",c:C.gn,i:"📣",its:[["Profile SEO","Optimized marketplace profile + portfolio"],["Lead scoring","Match marketplace leads to strengths"],["Retention","Warranty reminders, seasonal check-ins"],["Referrals","Track sources. Thank-you automation."],["Market intel","Growing project types? Competitor pricing?"]]},
      ].map((cat,ci)=><Rv key={ci} delay={ci*80}><div style={{marginBottom:24}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{fontSize:20}}>{cat.i}</span><span style={{fontSize:15,fontWeight:700,color:cat.c}}>{cat.t}</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{cat.its.map((it,ii)=><Card key={ii} style={{padding:12}}><div style={{fontSize:11,fontWeight:600}}>{it[0]}</div><div style={{fontSize:9,color:"#7a8a9a",marginTop:3,lineHeight:1.5}}>{it[1]}</div></Card>)}</div>
      </div></Rv>)}
    </Sec>}

    {/* ═══ SECURITY ═══ */}
    {cur==="security"&&<Sec title="Security, Trust & Data" sub="Construction professionals trust us with their livelihood. That trust is earned through visible, verifiable security.">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[{i:"🔐",t:"Encrypted at rest",d:"AES-256 on all private data",c:C.rd},{i:"🔒",t:"Encrypted in transit",d:"TLS 1.3 everywhere. HSTS.",c:C.p},{i:"💾",t:"Nightly backups",d:"PITR. 30-day. Geo-redundant.",c:C.bl},{i:"🛡️",t:"Row-level security",d:"org_id filter at DB level.",c:C.ac},{i:"👁️",t:"Full audit trail",d:"Every action logged. Immutable.",c:C.gd},{i:"🚫",t:"Data isolation",d:"Never trains AI. Never shared.",c:C.w}].map((s,i)=><Rv key={i} delay={i*60}><Card style={{textAlign:"center",borderColor:`${s.c}20`,background:`${s.c}04`}}><span style={{fontSize:28}}>{s.i}</span><div style={{fontSize:11,fontWeight:600,marginTop:8}}>{s.t}</div><div style={{fontSize:9,color:"#7a8a9a",marginTop:3}}>{s.d}</div></Card></Rv>)}
      </div>
      <Rv delay={360}><Card accent={C.rd} style={{marginBottom:16}}><div style={{fontSize:13,fontWeight:700,color:C.rd,marginBottom:8}}>Trust signals visible to users</div><div style={{fontSize:11,color:"#5a6a7a",lineHeight:1.8}}>Every Killer App screen: shield icon. Settings: last backup, data export (your format, anytime), full deletion, active sessions, integration revoke. Client portal: &quot;encrypted and private&quot; badge.</div></Card></Rv>
      <Rv delay={420}><div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Three-zone architecture</div></Rv>
      {[{n:"Zone 1: Public Knowledge",c:C.ac,d:"Knowledge entities, codes, materials. SEO-indexed. No auth.",b:"World-readable",bk:"Continuous replication"},
        {n:"Zone 2: Authenticated Shared",c:C.p,d:"Marketplace listings, profiles, credentials. Requires account.",b:"Auth + privacy controls",bk:"Daily + transaction-level"},
        {n:"Zone 3: Private Business",c:C.rd,d:"Projects, financials, clients, team, field reports. Encrypted. RLS.",b:"Auth + RLS + encryption",bk:"Nightly PITR + geo-redundant"},
      ].map((z,i)=><Rv key={i} delay={460+i*80}><div style={{padding:20,borderRadius:16,border:`2px solid ${z.c}25`,background:`${z.c}04`,marginBottom:10,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:z.c}}/>
        <div style={{fontSize:13,fontWeight:700,color:z.c,marginBottom:6}}>{z.n}</div>
        <div style={{fontSize:11,color:"#5a6a7a",lineHeight:1.6,marginBottom:10}}>{z.d}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:9}}><div><strong>Boundary:</strong> <span style={{color:"#7a8a9a"}}>{z.b}</span></div><div><strong>Backup:</strong> <span style={{color:"#7a8a9a"}}>{z.bk}</span></div></div>
      </div></Rv>)}
    </Sec>}

    {/* ═══ GAMIFICATION ═══ */}
    {cur==="gamify"&&<Sec title="🎮 Gamification Strategy" sub="Serious business, playful experience. Every gamification element maps to real business value. Construction is hard — progress should feel satisfying.">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[{i:"🌫️",t:"Fog of War",d:"Lifecycle phases dimmed until unlocked. DREAM→PLAN lit. BUILD→GROW show '???'. Dramatic reveal animation.",c:C.p,s:"✅ Built"},
          {i:"📋",t:"Quest Line",d:"Setup becomes missions: 'Define Your Build' → 'Know Your Codes' → 'Assemble Team' → 'Launch Project'.",c:C.bl,s:"✅ Built"},
          {i:"📊",t:"Confidence Score",d:"Dynamic % in nav. Building type (+15%), jurisdiction (+15%), codes reviewed (+20%), estimate (+20%). Addictive.",c:C.ac,s:"✅ Built"},
          {i:"🎯",t:"Completion Rings",d:"Circular SVG progress on every card. Codes review ring, schedule ring, budget ring. Animated cubic fill.",c:C.w,s:"✅ Built"},
          {i:"🎆",t:"Celebrations",d:"Building type selected → emoji bounce. Dashboard launched → '🚀 Project Launched!' overlay. Invoice → confetti.",c:C.gd,s:"✅ Built"},
          {i:"💡",t:"Knowledge Drops",d:"Random facts as toasts: 'CLT reduces carbon 60%.' Linked to entities. Collectible series.",c:C.gn,s:"Planned"},
          {i:"🏆",t:"Achievements",d:"Lane-specific: 'Code Scholar' (10 codes), 'Safety Streak' (14 days), 'Master Estimator'. Visible on profile.",c:C.pk,s:"Planned"},
          {i:"⚔️",t:"Challenge Mode",d:"Weekly: 'Estimate a warehouse in 5 min' — compete, leaderboard, prizes (free Pro month).",c:C.ind,s:"Planned"},
        ].map((f,i)=><Rv key={i} delay={i*60}><Card accent={f.c} style={{padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:18}}>{f.i}</span><span style={{fontSize:12,fontWeight:700}}>{f.t}</span></div>
            <span style={{fontSize:8,padding:"3px 8px",borderRadius:8,background:f.s.includes("✅")?`${C.ac}12`:`${C.gd}12`,color:f.s.includes("✅")?C.ac:C.gd,fontWeight:600}}>{f.s}</span>
          </div>
          <div style={{fontSize:10,color:"#5a6a7a",lineHeight:1.6}}>{f.d}</div>
        </Card></Rv>)}
      </div>
      <FL/>
      <Rv delay={500}><Card accent={C.ac}><div style={{fontSize:12,fontWeight:700,marginBottom:6}}>Make invisible progress visible</div><div style={{fontSize:11,color:"#5a6a7a",lineHeight:1.8}}>Construction has thousands of tasks. Without gamification = endless slog. With it, every inspection, every code review, every sent invoice = visible win. Confidence score climbing from 23% → 87% is the most satisfying progress bar in construction.</div></Card></Rv>
    </Sec>}

    {/* ═══ COMPETITION ═══ */}
    {cur==="compete"&&<Sec title="The Competitive Gap" sub="$3B+ invested across 12+ companies. Each covers a sliver. The Killer App covers everything.">
      <Rv><div style={{display:"flex",gap:3,marginBottom:6,paddingLeft:110}}>{PH.map(p=><div key={p.l} style={{flex:1,textAlign:"center",fontSize:8,fontWeight:600,color:p.c}}>{p.l}</div>)}</div></Rv>
      {[{n:"Procore",f:"$2B+",p:[0,0,.4,1,.4,0]},{n:"Autodesk",f:"$5.5B",p:[0,1,.3,.4,.4,0]},{n:"PermitFlow",f:"$54M",p:[0,0,.5,0,0,0]},{n:"XBuild",f:"$19M",p:[0,0,.4,0,0,0]},{n:"ALICE",f:"$47M",p:[0,0,.6,0,0,0]},{n:"Bedrock",f:"$350M+",p:[0,0,0,.5,0,0]},{n:"FieldAI",f:"$405M",p:[0,0,0,.5,0,0]},{n:"Benetics",f:"Seed",p:[0,0,0,.4,0,0]},{n:"UpCodes",f:"~$10M",p:[0,.5,0,0,0,0]},{n:"Buildertrend",f:"Private",p:[0,0,.4,.8,.4,0]},{n:"Fieldwire",f:"Hilti",p:[0,0,0,.6,.3,0]},{n:"Bridgit",f:"~$44M",p:[0,0,.3,.3,0,0]}
      ].map((c,i)=><Rv key={i} delay={i*30}><div style={{display:"grid",gridTemplateColumns:"108px 1fr",gap:8,alignItems:"center",marginBottom:3}}>
        <div style={{fontSize:10,display:"flex",gap:4,alignItems:"center"}}><span style={{fontWeight:500}}>{c.n}</span><span style={{fontSize:7,color:"#7a8a9a"}}>{c.f}</span></div>
        <div style={{display:"flex",gap:2,height:16}}>{c.p.map((v,j)=><div key={j} style={{flex:1,background:v>0?[C.w,C.p,C.ac,C.bl,C.gd,C.gn][j]:"#e2e6ec",opacity:v>0?v*.7+.2:.15,borderRadius:3}}/>)}</div>
      </div></Rv>)}
      <Rv delay={360}><div style={{display:"grid",gridTemplateColumns:"108px 1fr",gap:8,alignItems:"center",marginTop:14,paddingTop:10,borderTop:`2px solid ${C.w}`}}>
        <div style={{fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>⚡ Killer App</div>
        <div style={{display:"flex",gap:2,height:22}}>{PH.map((p,j)=><div key={j} style={{flex:1,background:p.c,opacity:.85,borderRadius:3}}/>)}</div>
      </div></Rv>
      <Rv delay={400}><Card accent={C.w} style={{marginTop:16}}><div style={{fontSize:12,fontWeight:700,color:C.w,marginBottom:6}}>What each competitor validates</div><div style={{fontSize:10,color:"#5a6a7a",lineHeight:2}}>Procore ($2B) → PM is massive. PermitFlow ($54M) → AI permitting works. ALICE ($47M) → AI scheduling works. Bedrock ($350M+) → Autonomous construction is real. <strong style={{color:C.w}}>We include ALL of these as features, connected by 40 databases and 7 RSI loops.</strong></div></Card></Rv>
    </Sec>}

    {/* ═══ RSI ═══ */}
    {cur==="rsi"&&<Sec title="RSI: 7 Self-Improvement Loops" sub="Every feature feeds the flywheel. User lanes, business ops, security, navigation — all generate signals that compound daily.">
      {[{n:"Knowledge Enrichment",c:C.p,s:["Lane selection → prioritize domains to deepen","Supplier listings enrich material entities with real pricing","DIY questions expose plain-language gaps","Equipment rental data adds real utilization costs"]},
        {n:"Search Quality",c:C.bl,s:["Lane-specific ranking models","Marketplace: which suppliers get clicked, products get RFQs","Zero-result queries → targeted content generation"]},
        {n:"Estimating Accuracy",c:C.w,s:["Contractor invoices (anonymized) calibrate benchmarks","Supplier pricing → real-time cost updates","Change order data reveals systematic bias"]},
        {n:"Compliance Checker",c:C.ac,s:["Inspection results improve pass/fail prediction","DIY failures → better plain-language guidance","Specialty trade enforcement notes"]},
        {n:"AI Copilot Quality",c:C.gn,s:["Lane-specific satisfaction scores","Business ops queries expand training data","Voice patterns → construction speech recognition"]},
        {n:"Content Pipeline",c:C.pk,s:["New lanes reveal content gaps","Supplier onboarding → auto-generate product entities","Marketplace demand → content + recruitment"]},
        {n:"Codebase Health",c:C.ind,s:["Compass patterns reveal UX bugs","Business ops errors → auto-fix priority","Performance by lane → optimization"]},
      ].map((l,i)=><Rv key={i} delay={i*60}><Card accent={l.c} style={{marginBottom:8,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:l.c,marginBottom:6}}>Loop {i+1}: {l.n}</div>
        {l.s.map((s,si)=><div key={si} style={{fontSize:10,color:"#5a6a7a",lineHeight:1.6,padding:"2px 0",display:"flex",gap:6}}><span style={{color:l.c,flexShrink:0}}>→</span><span>{s}</span></div>)}
      </Card></Rv>)}
      <Rv delay={420}><Card accent={C.ac}><div style={{fontSize:12,fontWeight:700,marginBottom:6}}>5 new data models</div><div style={{fontSize:10,color:"#5a6a7a",lineHeight:2}}><code style={{background:"#f0f2f5",padding:"2px 6px",borderRadius:4,fontSize:10}}>lane_selection_signals</code> · <code style={{background:"#f0f2f5",padding:"2px 6px",borderRadius:4,fontSize:10}}>business_ops_signals</code> · <code style={{background:"#f0f2f5",padding:"2px 6px",borderRadius:4,fontSize:10}}>marketplace_signals</code> · <code style={{background:"#f0f2f5",padding:"2px 6px",borderRadius:4,fontSize:10}}>security_audit_events</code> · <code style={{background:"#f0f2f5",padding:"2px 6px",borderRadius:4,fontSize:10}}>navigation_signals</code></div></Card></Rv>
    </Sec>}

    {/* ═══ BUILT ═══ */}
    {cur==="built"&&<Sec title="What's Built & Working" sub="Everything compiles, runs, and has been tested. The MTP taking shape.">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
        {[{n:"Pages",v:3,c:C.ac,its:["MLP Landing","Dream Builder (5 modes)","Smart Launcher (7 tabs)"]},{n:"API Routes",v:7,c:C.bl,its:["Health, Search, Entities","Copilot (RAG+SSE), MCP (10 tools)","OpenAPI, Safety Briefing, Dream Vision"]},{n:"Libraries",v:8,c:C.p,its:["Knowledge Engine, RAG Pipeline","Dream Parser, Architecture Styles","Auth, Events, Gamification, Supabase"]}].map((g,i)=><Rv key={i} delay={i*80}><Card><div style={{fontSize:30,fontWeight:700,color:g.c}}>{g.v}</div><div style={{fontSize:11,fontWeight:600,marginTop:4}}>{g.n}</div>{g.its.map((it,j)=><div key={j} style={{fontSize:9,color:"#7a8a9a",padding:"1px 0"}}>✓ {it}</div>)}</Card></Rv>)}
      </div>
      {[{t:"Smart Project Launcher",d:"4-step wizard → 7-tab dashboard. Constraint-aware scheduling. CSI estimates. Materials with sustainability.",c:C.ac,pct:100,tag:"THE COO"},
        {t:"Dream Builder",d:"5 interaction modes: Tell, Show, Browse & Pick, Surprise Me, Famous References. Voice input. Shareable links. AI vision analysis.",c:C.w,pct:90,tag:"FREE · VIRAL"},
        {t:"AI Construction Copilot",d:"RAG pipeline. SSE streaming. Voice input. Citation badges. Rate limiting. Floating panel on every page.",c:C.p,pct:85,tag:"CORE AI"},
        {t:"MCP Server",d:"10 tools. 2ms latency. AI agent integration. Every robot and AI system queries us.",c:C.bl,pct:100,tag:"INFRA"},
        {t:"Gamification Phase 1",d:"Fog of War, Quest Line, Confidence Score, Completion Rings, Celebrations, Knowledge Drops.",c:C.gd,pct:100,tag:"DELIGHT"},
        {t:"Auth + Gating",d:"5 tiers, BuildGate component, AIRateLimit. Ready for Clerk + Stripe.",c:C.gn,pct:70,tag:"REVENUE"},
      ].map((f,i)=><Rv key={i} delay={240+i*60}><div style={{display:"flex",gap:12,padding:"12px 0",borderBottom:"1px solid #e8ecf0"}}>
        <Ring pct={f.pct} sz={48} sw={3} clr={f.c}><span style={{fontSize:9,fontWeight:700,color:f.c}}>{f.pct}%</span></Ring>
        <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,fontWeight:600}}>{f.t}</span><span style={{fontSize:8,padding:"2px 8px",borderRadius:8,background:`${f.c}12`,color:f.c,fontWeight:600}}>{f.tag}</span></div><div style={{fontSize:10,color:"#5a6a7a",lineHeight:1.5,marginTop:3}}>{f.d}</div></div>
      </div></Rv>)}
    </Sec>}

    {/* ═══ 40 DATABASES ═══ */}
    {cur==="dbs"&&<Sec title="The 40 Databases" sub="The foundation. The databases ARE the product. The Killer App is the intelligence layer on top.">
      {[{t:"Tier 1: Build NOW",c:C.rd,sub:"Killer App foundation",dbs:[["Global Building Codes","Every code, every jurisdiction"],["Construction Materials","Properties, compliance, costs, sustainability"],["Cost Benchmarks","Unit costs by region, quality, type"],["Permit Requirements","Every permit, every building type"],["Safety & Hazard Regs","OSHA/HSE/EU. Task-specific."],["Sequencing & Dependencies","What before what. Cure times. Hold points."],["Trades & Roles","100+ classifications, certs, compensation"]]},
        {t:"Tier 2: Revenue",c:C.gd,sub:"Paid features + marketplace",dbs:[["Manufactured Products","Specs, BIM, pricing, lead times"],["Company Registry","Licenses, insurance, safety"],["Contract Templates","AIA, FIDIC, ConsensusDocs"],["Licensing Requirements","Every license by jurisdiction"],["Climate & Weather","ASHRAE zones, seismic, flood"],["Inspection Protocols","What inspectors ACTUALLY enforce"],["Methods & Techniques","Step-by-step, productivity rates"],["Standards & Testing","ASTM, NFPA, ASHRAE, ISO"]]},
        {t:"Tier 3: Ecosystem",c:C.bl,sub:"Network effects",dbs:[["Equipment + Rental","Specs, costs, rent-vs-buy"],["Financing + Insurance","Lenders, surety, coverage"],["Zoning + Utilities","Land use, setbacks"],["Market Intelligence","Active projects, trends"],["Legal + Workforce","Lien rights, skills, training"],["Specialty Verticals","Data center, renewable, modular"]]},
      ].map((tier,ti)=><Rv key={ti} delay={ti*100}><div style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{width:10,height:10,borderRadius:5,background:tier.c}}/><span style={{fontSize:12,fontWeight:700,color:tier.c}}>{tier.t}</span><span style={{fontSize:9,color:"#7a8a9a"}}>— {tier.sub}</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{tier.dbs.map((d,di)=><Card key={di} style={{padding:"10px 12px"}}><div style={{fontSize:11,fontWeight:600}}>{d[0]}</div><div style={{fontSize:8,color:"#7a8a9a",marginTop:2}}>{d[1]}</div></Card>)}</div>
      </div></Rv>)}
      <Rv delay={300}><Card accent={C.ac}><div style={{fontSize:11,fontWeight:600,marginBottom:4}}>Every entity gets its own URL</div><div style={{fontSize:10,color:"#5a6a7a",lineHeight:1.6}}>Human page + JSON-LD + API endpoint + embedding vector + cross-links. When an AI agent needs rebar spacing for Tokyo, it queries our API.</div></Card></Rv>
    </Sec>}

    {/* ═══ NEXT STEPS ═══ */}
    {cur==="next"&&<Sec title="🚀 Next Steps" sub="Everything maps to files. Here's what gets created and updated.">
      <Rv><div style={{fontSize:12,fontWeight:700,color:C.rd,marginBottom:8}}>🔴 #1: Build the Databases</div></Rv>
      <Rv delay={60}><Card accent={C.rd} style={{marginBottom:16}}><div style={{fontSize:11,color:"#5a6a7a",lineHeight:1.7}}>Tier 1 databases are the foundation. Global Codes, Materials, Costs, Permits, Safety, Sequencing, Trades. Without deep data, the MTP is just UI.</div></Card></Rv>
      <Rv delay={120}><div style={{fontSize:12,fontWeight:700,color:C.w,marginBottom:8}}>⚡ #2: Ship the MTP</div></Rv>
      <Rv delay={180}><Card accent={C.w} style={{marginBottom:20}}><div style={{fontSize:11,color:"#5a6a7a",lineHeight:1.7}}>v1 is BUILT. 3 pages, 7 APIs, 8 libraries, gamification, voice, copilot, MCP, 5 dream modes. Needs: more Supabase data, Clerk auth, Stripe payments. Then deploy.</div></Card></Rv>
      <Rv delay={240}><div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Files to create / update</div></Rv>
      {[{f:"docs/security-architecture.md",a:"CREATE",d:"Three-zone data, encryption, RLS, backups, audit, trust signals",c:C.rd},
        {f:"docs/garden-vs-app.md",a:"CREATE",d:"Garden/App boundary. Public vs private. Data classification.",c:C.p},
        {f:"docs/user-lanes.md",a:"CREATE",d:"8 user types. Onboarding, dashboards, AI personality, features.",c:C.w},
        {f:"docs/business-ops.md",a:"CREATE",d:"CRM, invoicing, financials, marketing. APIs, integrations.",c:C.gn},
        {f:"docs/navigation.md",a:"CREATE",d:"Compass bloom. Mobile/desktop. Context-aware. Animations.",c:C.ac},
        {f:"docs/gamification.md",a:"CREATE",d:"All features. Achievements. Lane milestones. Quest design.",c:C.gd},
        {f:"docs/architecture.md",a:"UPDATE",d:"Add security zones, lanes, compass, business ops modules.",c:C.bl},
        {f:"docs/rsi-architecture.md",a:"UPDATE",d:"5 new signal tables. Lane-specific collection.",c:C.p},
        {f:"tasks.todo.md",a:"UPDATE",d:"Prioritized tasks: compass, lanes, biz ops, security, RSI.",c:C.gd},
      ].map((f,i)=><Rv key={i} delay={280+i*40}><div style={{display:"grid",gridTemplateColumns:"210px 70px 1fr",gap:10,padding:"10px 0",borderBottom:"1px solid #e8ecf0",alignItems:"start"}}>
        <div style={{fontSize:11,fontWeight:600,fontFamily:"monospace",color:f.c}}>{f.f}</div>
        <div><span style={{fontSize:9,padding:"3px 8px",borderRadius:8,background:f.a==="CREATE"?`${C.ac}12`:`${C.gd}12`,color:f.a==="CREATE"?C.ac:C.gd,fontWeight:700}}>{f.a}</span></div>
        <div style={{fontSize:10,color:"#5a6a7a",lineHeight:1.5}}>{f.d}</div>
      </div></Rv>)}
      <Rv delay={640}><div style={{textAlign:"center",marginTop:32,padding:24,borderRadius:20,background:`linear-gradient(135deg,${C.ac}06,${C.w}04)`,border:`2px solid ${C.ac}20`}}>
        <div style={{fontSize:9,letterSpacing:3,textTransform:"uppercase",color:C.ac,fontWeight:700}}>Ready to build</div>
        <div style={{fontSize:20,fontWeight:700,marginTop:8,background:`linear-gradient(90deg,#1a2433 40%,${C.ac} 50%,#1a2433 60%)`,backgroundSize:"200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 3s linear infinite"}}>6 new docs + 3 updates = complete spec</div>
        <div style={{fontSize:12,color:"#5a6a7a",marginTop:8}}>Every feature has a home. Every data point has a zone. Every interaction feeds the RSI flywheel.</div>
        <div style={{display:"flex",gap:3,justifyContent:"center",marginTop:14}}>{PH.map((p,i)=><div key={i} style={{width:48,height:5,borderRadius:3,background:p.c,opacity:.7}}/>)}</div>
        <div style={{fontSize:9,color:"#7a8a9a",marginTop:8}}>DREAM → DESIGN → PLAN → BUILD → DELIVER → GROW</div>
      </div></Rv>
    </Sec>}

    </div>{/* end max-width container */}

    {/* PAGINATION */}
    <div style={{maxWidth:820,margin:"0 auto",padding:"0 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 0",borderTop:"1px solid #e2e6ec"}}>
        <button onClick={()=>go(sl-1)} disabled={sl===0} style={{padding:"8px 22px",borderRadius:20,border:"1px solid #e2e6ec",background:"#fff",color:sl===0?"#bbb":"#5a6a7a",fontSize:11,cursor:sl===0?"default":"pointer",opacity:sl===0?.4:1}}>← Previous</button>
        <span style={{fontSize:10,color:"#7a8a9a"}}>{sl+1} / {SLIDES.length}</span>
        <button onClick={()=>go(sl+1)} disabled={sl===SLIDES.length-1} style={{padding:"8px 22px",borderRadius:20,border:"none",background:sl===SLIDES.length-1?"#e2e6ec":C.ac,color:sl===SLIDES.length-1?"#999":"#fff",fontSize:11,cursor:sl===SLIDES.length-1?"default":"pointer"}}>Next →</button>
      </div>
    </div>

    {/* COMPASS NAVIGATOR */}
    <Compass cur={sl} go={go}/>

    {/* GLOBAL STYLES */}
    <style>{`
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
      @keyframes flowR{0%{left:-40%}100%{left:140%}}
      @keyframes shimmer{0%{background-position:200%}100%{background-position:-200%}}
      @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(29,158,117,.4)}50%{box-shadow:0 0 0 14px rgba(29,158,117,0)}}
      html{scroll-behavior:smooth}
      body{margin:0;-webkit-font-smoothing:antialiased}
      *{box-sizing:border-box}
    `}</style>
  </div>);
}
