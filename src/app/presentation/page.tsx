"use client";

import { useState, useEffect, useRef } from "react";

const ACCENT = "#1D9E75";
const BRASS = "#C4A44A";
const WARM = "#D85A30";
const PURPLE = "#7F77DD";
const BLUE = "#378ADD";
const GOLD = "#BA7517";
const GREEN = "#639922";

function AnimNum({ val, prefix = "", suffix = "", dur = 1200 }: { val: number; prefix?: string; suffix?: string; dur?: number }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let s = performance.now();
        const f = (t: number) => { const p = Math.min((t - s) / dur, 1); setN(1 - Math.pow(1 - p, 3)); if (p < 1) requestAnimationFrame(f); };
        requestAnimationFrame(f);
        obs.disconnect();
      }
    }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [val, dur]);
  const display = val >= 100 ? Math.floor(n * val).toLocaleString() : (n * val).toFixed(val < 10 ? 1 : 0);
  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

function Ring({ pct, size = 48, sw = 4, color = ACCENT, children }: { pct: number; size?: number; sw?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" />
      </svg>
      {children && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>}
    </div>
  );
}

const SLIDES = [
  { id: "cover", label: "Home" },
  { id: "mtp", label: "⚡ The MTP" },
  { id: "killer", label: "Killer App" },
  { id: "vision", label: "Vision" },
  { id: "built", label: "What's Built" },
  { id: "routes", label: "Architecture" },
  { id: "databases", label: "40 Databases" },
  { id: "products", label: "7 Products" },
  { id: "ux", label: "UX Strategy" },
  { id: "competition", label: "Competition" },
  { id: "next", label: "Next Steps" },
];

const PHASES = [
  { l: "DREAM", c: WARM, i: "💭" },
  { l: "DESIGN", c: PURPLE, i: "📐" },
  { l: "PLAN", c: ACCENT, i: "📋" },
  { l: "BUILD", c: BLUE, i: "🏗️" },
  { l: "DELIVER", c: GOLD, i: "🔑" },
  { l: "GROW", c: GREEN, i: "📈" },
];

export default function PresentationPage() {
  const [sl, setSl] = useState(0);
  const cur = SLIDES[sl].id;
  const go = (i: number) => { setSl(i); window.scrollTo?.({ top: 0 }); };
  const next = () => sl < SLIDES.length - 1 && go(sl + 1);
  const prev = () => sl > 0 && go(sl - 1);

  const S = ({ title, sub, children }: { title?: string; sub?: string; children: React.ReactNode }) => (
    <div style={{ padding: "24px 0" }}>
      {title && <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: sub ? 6 : 16, lineHeight: 1.2 }}>{title}</h2>}
      {sub && <p style={{ fontSize: 12, color: "var(--fg-secondary)", marginBottom: 20, lineHeight: 1.6, maxWidth: 560 }}>{sub}</p>}
      {children}
    </div>
  );

  const Card = ({ children, accent, style = {} }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) => (
    <div style={{ padding: 16, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-secondary)", borderLeft: accent ? `3px solid ${accent}` : undefined, ...style }}>{children}</div>
  );

  const Stat = ({ v, p = "", s = "", label, sub, color = ACCENT }: { v: number; p?: string; s?: string; label: string; sub?: string; color?: string }) => (
    <Card><div style={{ fontSize: 28, fontWeight: 600, color, lineHeight: 1 }}><AnimNum val={v} prefix={p} suffix={s} /></div><div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>{label}</div>{sub && <div style={{ fontSize: 9, color: "var(--fg-tertiary)", marginTop: 2 }}>{sub}</div>}</Card>
  );

  const ToolDivider = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0", opacity: 0.3 }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${BRASS}, transparent)` }} />
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BRASS} strokeWidth="1.5"><path d="M3 21L21 3M7.5 16.5L9 15M11.5 12.5L13 11M15.5 8.5L17 7" /></svg>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${BRASS}, transparent)` }} />
    </div>
  );

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "var(--fg)", maxWidth: 700, margin: "0 auto", padding: "0 12px", minHeight: "100vh" }}>
      {/* NAV */}
      <div style={{ padding: "14px 0 10px", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--bg)", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${ACCENT}, #0F6E56)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, flexShrink: 0 }}>🏗️</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.1 }}>Builder&apos;s Knowledge Garden</div>
            <div style={{ fontSize: 9, color: "var(--fg-tertiary)", letterSpacing: 1.5, textTransform: "uppercase" }}>team update · march 2026</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {SLIDES.map((s, i) => (
            <button key={i} onClick={() => go(i)} style={{ padding: "4px 10px", borderRadius: 14, border: sl === i ? `1.5px solid ${s.id === "mtp" || s.id === "killer" ? WARM : "var(--fg)"}` : "1px solid var(--border)", background: sl === i ? (s.id === "mtp" || s.id === "killer" ? WARM : "var(--fg)") : (s.id === "mtp" || s.id === "killer" ? WARM + "12" : "transparent"), color: sl === i ? "#fff" : (s.id === "mtp" || s.id === "killer" ? WARM : "var(--fg-secondary)"), fontSize: 10, fontWeight: s.id === "mtp" || s.id === "killer" ? 700 : 500, cursor: "pointer" }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* ═══ COVER ═══ */}
      {cur === "cover" && (
        <S>
          <div style={{ textAlign: "center", padding: "28px 0 0" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 14, opacity: 0.4 }}>{PHASES.map(p => <span key={p.l} style={{ fontSize: 20 }}>{p.i}</span>)}</div>
            <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: BRASS, marginBottom: 8 }}>The Operating System for the $17T Construction Economy</div>
            <h1 style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.25, marginBottom: 12 }}>The Builder&apos;s<br/>Knowledge Garden</h1>
            <p style={{ fontSize: 13, color: "var(--fg-secondary)", maxWidth: 460, margin: "0 auto 8px", lineHeight: 1.65 }}>One platform. Every phase. 40 structured databases. Voice-first. AI-native. The thing that makes every competitor look like a point solution.</p>
            <div onClick={() => go(1)} style={{ margin: "16px auto", maxWidth: 420, padding: "14px 20px", borderRadius: 14, background: `linear-gradient(135deg, ${WARM}12, ${WARM}06)`, border: `2px solid ${WARM}40`, cursor: "pointer" }}>
              <div style={{ fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: WARM, fontWeight: 700, marginBottom: 4 }}>⚡ The Massive Transformational Product</div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>The Builder&apos;s Killer App</div>
              <div style={{ fontSize: 10, color: "var(--fg-secondary)", marginTop: 4 }}>An AI superhuman COO that carries the cognitive load of building anything, anywhere — so the human can focus on what matters.</div>
              <div style={{ fontSize: 9, color: WARM, fontWeight: 600, marginTop: 6 }}>See the MTP →</div>
            </div>
            <div style={{ display: "flex", gap: 3, justifyContent: "center", margin: "16px 0" }}>{PHASES.map(p => <div key={p.l} style={{ flex: 1, maxWidth: 80, padding: "8px 4px", borderRadius: 8, background: p.c + "12", border: `1px solid ${p.c}30`, textAlign: "center" }}><span style={{ fontSize: 14 }}>{p.i}</span><div style={{ fontSize: 8, fontWeight: 600, color: p.c, letterSpacing: 1, marginTop: 2 }}>{p.l}</div></div>)}</div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              <Stat v={17} p="$" s="T" label="Market size" sub="Largest industry on earth" />
              <Stat v={40000} s="+" label="Knowledge entities" sub="And growing daily" color={PURPLE} />
              <Stat v={142} s="+" label="Jurisdictions" sub="Global from day one" color={BLUE} />
              <Stat v={40} label="Databases planned" sub="The data IS the product" color={WARM} />
            </div>
            <button onClick={next} style={{ marginTop: 20, padding: "10px 24px", borderRadius: 20, border: "none", background: WARM, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>⚡ See the MTP →</button>
          </div>
        </S>
      )}

      {/* ═══ MTP ═══ */}
      {cur === "mtp" && (
        <S>
          <div style={{ textAlign: "center", padding: "16px 0 0" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 12 }}>
              {["📐","⛑️","🏗️","🎙️","🧠","📈"].map((e,i) => (<div key={i} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: `linear-gradient(135deg, ${[WARM,PURPLE,ACCENT,BLUE,GOLD,GREEN][i]}10, transparent)`, border: `1px solid ${[WARM,PURPLE,ACCENT,BLUE,GOLD,GREEN][i]}20` }}>{e}</div>))}
            </div>
            <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: WARM, fontWeight: 700, marginBottom: 6 }}>⚡ Massive Transformational Product</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2, marginBottom: 6 }}>The Builder&apos;s Killer App</h1>
            <p style={{ fontSize: 11, color: "var(--fg-secondary)", marginBottom: 4 }}>Not a tool. Not a feature. Not incremental improvement.</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: WARM, marginBottom: 16 }}>The AI superhuman COO for the construction economy.</p>
          </div>
          <ToolDivider />
          <div style={{ padding: "16px 20px", borderRadius: 14, background: `linear-gradient(135deg, ${WARM}08, ${GOLD}06)`, border: `1.5px solid ${WARM}25`, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: WARM }}>What makes this an MTP?</div>
            <div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.7 }}>A Massive Transformational Product doesn&apos;t just improve a workflow — it <strong style={{ color: "var(--fg)" }}>fundamentally transforms how an entire industry operates</strong>. The Builder&apos;s Killer App transforms the $17 trillion construction economy from fragmented, tribal-knowledge-dependent chaos into a single intelligent system that knows everything, coordinates everyone, and gets smarter every day.</div>
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <div style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: WARM }}>BEFORE</div>
                <div style={{ fontSize: 10, color: "var(--fg-tertiary)", lineHeight: 1.5, marginTop: 2 }}>9 subscriptions. 9 logins. 9 data silos. Tribal knowledge. Paper permits. Manual estimates. Dropped balls. Blown budgets.</div>
              </div>
              <div style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: ACCENT + "08", border: `1px solid ${ACCENT}25` }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: ACCENT }}>AFTER</div>
                <div style={{ fontSize: 10, color: "var(--fg-secondary)", lineHeight: 1.5, marginTop: 2 }}>One platform. One brain. Voice-first. AI-native. Every code, every material, every cost, every permit, every schedule — connected and intelligent.</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>The 4 Pillars of the MTP</div>
          {[
            { icon: "🧠", t: "The Knowledge Layer Nobody Else Has", d: "40 structured databases. Every building code on earth. Every material. Every method. Every cost benchmark. Every permit requirement. 142+ jurisdictions. Cross-referenced, searchable, AI-queryable.", c: PURPLE, num: "40 DBs" },
            { icon: "⚡", t: "The AI COO That Never Sleeps", d: "Tracks hundreds of variables. Surfaces what needs attention NOW. Presents clear options with tradeoffs. The human decides — the platform executes and updates everything downstream.", c: WARM, num: "∞ vars" },
            { icon: "🎙️", t: "Voice-First in a Hands-Dirty Industry", d: "349K worker shortage. 40% retiring by 2031. They'll TALK. \"Show me the schedule.\" \"Log safety observation.\" \"What are the fire exit requirements?\" 30+ languages.", c: BLUE, num: "30+ lang" },
            { icon: "🔄", t: "RSI: The Moat That Widens Every Day", d: "7 self-improvement loops. After 12 months, our estimates are calibrated to real projects, our compliance checker matches inspector behavior. Competitors need 12 months for parity — but we're 12 months further ahead.", c: GREEN, num: "7 loops" },
          ].map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < 3 ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: p.c + "12", border: `1px solid ${p.c}25`, flexShrink: 0 }}><span style={{ fontSize: 18 }}>{p.icon}</span><span style={{ fontSize: 7, fontWeight: 700, color: p.c, marginTop: 1 }}>{p.num}</span></div>
              <div><div style={{ fontSize: 12, fontWeight: 700 }}>{p.t}</div><div style={{ fontSize: 10, color: "var(--fg-secondary)", lineHeight: 1.6, marginTop: 2 }}>{p.d}</div></div>
            </div>
          ))}
          <ToolDivider />
          <div style={{ textAlign: "center", padding: "8px 0" }}><div style={{ fontSize: 11, color: "var(--fg-tertiary)", marginBottom: 4 }}>This is the product that makes visionary builders</div><div style={{ fontSize: 16, fontWeight: 700 }}>stand up and take notice.</div></div>
        </S>
      )}

      {/* ═══ KILLER APP ═══ */}
      {cur === "killer" && (
        <S>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${WARM}, #B84A25)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16 }}>⚡</div>
            <div><div style={{ fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: WARM, fontWeight: 700 }}>The Builder&apos;s Killer App</div><div style={{ fontSize: 18, fontWeight: 700 }}>What It Actually Does</div></div>
          </div>
          <p style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.6, marginBottom: 16 }}>From &quot;I want to build...&quot; to handing over the keys — one intelligent system that handles the complexity so the human can focus on building.</p>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: WARM }}>The Killer App Journey</div>
          {[
            { phase: "DREAM", c: WARM, i: "💭", action: "I want to build a modern farmhouse in Asheville", result: "Full plan in 60 seconds: codes, estimate, timeline, challenges, team, permits. Voice or text. Free. Shareable. Viral.", app: "Dream Builder" },
            { phase: "PLAN", c: ACCENT, i: "📋", action: "Start this project", result: "Auto-populates: 7-tab dashboard with every code, material, schedule task, team role, permit, and CSI estimate. Confidence score. Hold points. Dependencies.", app: "Smart Project Launcher" },
            { phase: "BUILD", c: BLUE, i: "🏗️", action: "What's the status?", result: "Command center shows project health. Smart notifications catch problems before they happen. Budget heartbeat. Risk radar.", app: "AI COO Dashboard" },
            { phase: "FIELD", c: GOLD, i: "🎙️", action: "Log safety observation (voice)", result: "Structured safety report. Daily briefing auto-created from tasks + jurisdiction + weather. Offline. 30+ languages.", app: "Voice Field Ops" },
            { phase: "DECIDE", c: PURPLE, i: "🧠", action: "Should I use CLT or steel framing?", result: "AI Copilot: cost delta, schedule impact, code implications, carbon difference, local installer availability. Cited. One recommendation.", app: "AI Copilot" },
            { phase: "GROW", c: GREEN, i: "📈", action: "Project complete", result: "Data feeds RSI loops. Next estimate more accurate. Next schedule smarter. The platform got smarter from YOUR project.", app: "RSI Flywheel" },
          ].map((s, i) => (
            <div key={i} style={{ marginBottom: 10, padding: "12px 14px", borderRadius: 12, background: s.c + "06", border: `1px solid ${s.c}20` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><span style={{ fontSize: 14 }}>{s.i}</span><span style={{ fontSize: 9, fontWeight: 700, color: s.c, letterSpacing: 1 }}>{s.phase}</span><span style={{ marginLeft: "auto", fontSize: 8, padding: "2px 8px", borderRadius: 8, background: s.c + "15", color: s.c, fontWeight: 600 }}>{s.app}</span></div>
              <div style={{ fontSize: 11, fontWeight: 600, fontStyle: "italic", marginBottom: 4 }}>&quot;{s.action}&quot;</div>
              <div style={{ fontSize: 10, color: "var(--fg-secondary)", lineHeight: 1.6 }}>{s.result}</div>
            </div>
          ))}
          <ToolDivider />
          <Card accent={WARM} style={{ marginTop: 8 }}><div style={{ fontSize: 12, fontWeight: 700, color: WARM, marginBottom: 4 }}>The Force Multiplier Effect</div><div style={{ fontSize: 10, color: "var(--fg-secondary)", lineHeight: 1.7 }}>Every variable that keeps a builder up at night — cost, quality, time, people, permits, financing, insurance, legal, materials, equipment, safety, weather, compliance — the Killer App tracks ALL of them simultaneously, surfaces what matters NOW, and helps make the best decision. <strong>Superhuman situational awareness.</strong></div></Card>
          <div style={{ textAlign: "center", marginTop: 14, padding: 12, borderRadius: 12, background: `linear-gradient(135deg, ${WARM}10, ${ACCENT}08)`, border: `1.5px solid ${WARM}20` }}><div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>One person with the Killer App</div><div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>can manage what used to take a team of 10.</div></div>
        </S>
      )}

      {/* ═══ VISION ═══ */}
      {cur === "vision" && (
        <S title="The North Star" sub="Two goals driving every decision. The databases are the foundation. The Killer App is the experience.">
          <Card accent={ACCENT} style={{ marginBottom: 12 }}><div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>🌍 Goal 1: Most Informed AEC Destination in the Universe</div><div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.6 }}>40 structured databases. Every entity gets its own URL. Data serves humans, AI agents, robots, and LLM crawlers.</div></Card>
          <Card accent={WARM} style={{ marginBottom: 16 }}><div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>⚡ Goal 2: The Builder&apos;s Killer App (MTP)</div><div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.6 }}>Platform carries cognitive load. Human makes decisions. Track ALL variables, surface what needs attention NOW, present options with tradeoffs.</div></Card>
          {[{icon:"💎",t:"Minimal LOVABLE Products",d:"MVP not in vocabulary. Every release: 'I need this.'"},{icon:"🗃️",t:"Databases ARE the product",d:"Everything else is UI on top of data."},{icon:"⚡",t:"MTP: Massive Transformational",d:"Not incremental. Makes Elon Musk pay attention."},{icon:"🎙️",t:"Voice as universal layer",d:"30+ languages. Hands-dirty industry."},{icon:"🤖",t:"AI-native, not AI-bolted",d:"Woven in from day one."},{icon:"🔄",t:"RSI is the moat",d:"7 loops. 12 months = insurmountable."}].map((p,i)=>(<div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<5?"1px solid var(--border)":"none"}}><span style={{fontSize:16,flexShrink:0}}>{p.icon}</span><div><div style={{fontSize:11,fontWeight:600}}>{p.t}</div><div style={{fontSize:10,color:"var(--fg-tertiary)"}}>{p.d}</div></div></div>))}
        </S>
      )}

      {/* ═══ BUILT ═══ */}
      {cur === "built" && (
        <S title="What's Built & Working" sub="Everything compiles, runs, and has been tested. The MTP taking shape.">
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
            {[{n:"Pages",v:3,c:ACCENT,items:["MLP Landing","Dream Builder","Smart Launcher"]},{n:"API Routes",v:7,c:BLUE,items:["Health","Search","Entities","Copilot","MCP (10 tools)","OpenAPI","Safety Briefing"]},{n:"Libraries",v:7,c:PURPLE,items:["Knowledge Engine","RAG Pipeline","Dream Parser","Auth/Subscriptions","Event Bus","Gamification","Supabase Client"]}].map((g,i)=>(<Card key={i}><div style={{fontSize:24,fontWeight:600,color:g.c}}>{g.v}</div><div style={{fontSize:11,fontWeight:600,marginBottom:6}}>{g.n}</div>{g.items.map((it,j)=><div key={j} style={{fontSize:9,color:"var(--fg-tertiary)",padding:"1px 0"}}>✓ {it}</div>)}</Card>))}
          </div>
          {[{t:"Smart Project Launcher",d:"4-step wizard → 7-tab dashboard. Constraint-aware scheduling. CSI estimates. Materials with sustainability.",c:ACCENT,done:"100%",tag:"THE COO"},{t:"Dream Builder",d:"NL → full plan in 60 seconds. Voice input. Shareable links. Budget comparison.",c:WARM,done:"85%",tag:"FREE · VIRAL"},{t:"AI Construction Copilot",d:"RAG pipeline. SSE streaming. Voice. Citations. Rate limiting. Every page.",c:PURPLE,done:"80%",tag:"CORE AI"},{t:"MCP Server",d:"10 tools. 2ms latency. AI agent + robot integration.",c:BLUE,done:"100%",tag:"INFRA"},{t:"Gamification Phase 1",d:"Fog of War, Quest Line, Confidence Score, Celebrations, Knowledge Drops.",c:GOLD,done:"100%",tag:"DELIGHT"},{t:"Auth + Gating",d:"5 tiers, BuildGate, AIRateLimit. Ready for Clerk + Stripe.",c:GREEN,done:"70%",tag:"REVENUE"}].map((f,i)=>(<div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:"1px solid var(--border)"}}><Ring pct={parseInt(f.done)} size={40} sw={3} color={f.c}><span style={{fontSize:8,fontWeight:700,color:f.c}}>{f.done}</span></Ring><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:600}}>{f.t}</span><span style={{fontSize:7,padding:"1px 5px",borderRadius:6,background:f.c+"15",color:f.c,fontWeight:700}}>{f.tag}</span></div><div style={{fontSize:10,color:"var(--fg-secondary)",lineHeight:1.5}}>{f.d}</div></div></div>))}
        </S>
      )}

      {/* ═══ ARCHITECTURE ═══ */}
      {cur === "routes" && (
        <S title="Technical Architecture" sub="Next.js 16, Tailwind 4, Supabase, Anthropic Claude, TypeScript. API-first. Every feature = MCP tool.">
          <Card style={{marginBottom:16,fontFamily:"monospace",fontSize:10}}>
            {[{r:"○ /",d:"MLP landing page",t:"s"},{r:"○ /dream",d:"Dream Builder + voice + share",t:"s"},{r:"○ /launch",d:"Smart Project Launcher",t:"s"},{r:"ƒ /api/v1/health",d:"Health check",t:"d"},{r:"ƒ /api/v1/search",d:"Knowledge search + RSI",t:"d"},{r:"ƒ /api/v1/entities/[id]",d:"Entity detail",t:"d"},{r:"ƒ /api/v1/copilot",d:"AI Copilot SSE stream",t:"d"},{r:"ƒ /api/v1/mcp",d:"MCP Server (10 tools)",t:"d"},{r:"ƒ /api/v1/openapi",d:"OpenAPI 3.1 spec",t:"d"},{r:"ƒ /api/v1/safety-briefing",d:"Safety briefing gen",t:"d"}].map((rt,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:i<9?"1px solid var(--border)":"none"}}><span style={{color:rt.t==="s"?ACCENT:BLUE}}>{rt.r}</span><span style={{color:"var(--fg-tertiary)"}}>{rt.d}</span></div>))}
          </Card>
          <Card accent={WARM}><div style={{fontSize:10,fontWeight:600,marginBottom:4}}>⚡ Every Feature = MCP Tool = Killer App Capability</div><div style={{fontSize:9,color:"var(--fg-secondary)",lineHeight:1.5}}>The MTP is an intelligence layer. Every feature is API-first. The MCP server exposes 10 tools. Robots, drones, and AI systems consume the same knowledge that powers the human UI.</div></Card>
        </S>
      )}

      {/* ═══ DATABASES ═══ */}
      {cur === "databases" && (
        <S title="The 40 Databases" sub="The databases ARE the product. The Killer App is intelligence on top.">
          {[{tier:"Tier 1: Build NOW",color:"#dc3545",sub:"Makes every Killer App feature smarter",dbs:[{n:"Global Building Codes",d:"Every code, every jurisdiction"},{n:"Construction Materials",d:"Properties, compliance, costs"},{n:"Cost Benchmarks",d:"Unit costs by region/quality"},{n:"Permit Requirements",d:"Every permit, everywhere"},{n:"Safety & Hazard Regs",d:"Task-specific. Life-safety."},{n:"Sequencing & Dependencies",d:"What before what. Hold points."},{n:"Trades & Roles",d:"100+ classifications, certs"}]},{tier:"Tier 2: Revenue",color:GOLD,sub:"Drives paid features + marketplace",dbs:[{n:"Manufactured Products",d:"Specs, BIM, pricing, lead times"},{n:"Company Registry",d:"Verified licenses, insurance"},{n:"Contract Templates",d:"AIA, FIDIC + clause library"},{n:"Licensing Requirements",d:"Every license by jurisdiction"},{n:"Climate & Weather",d:"ASHRAE zones, seismic, loads"},{n:"Inspection Protocols",d:"What inspectors ACTUALLY enforce"},{n:"Methods & Techniques",d:"Step-by-step, productivity rates"},{n:"Standards & Testing",d:"ASTM, NFPA, ASHRAE, ACI, UL"}]},{tier:"Tier 3: Ecosystem",color:BLUE,sub:"Network effects + verticals",dbs:[{n:"Equipment + Rental",d:"Specs, costs, rent-vs-buy"},{n:"Financing + Insurance",d:"Lenders, surety bonds"},{n:"Zoning + Utilities",d:"Land use, setbacks, connections"},{n:"Market Intelligence",d:"Active projects, pricing trends"},{n:"Legal + Workforce",d:"Lien rights, skills, training"},{n:"Specialty Verticals",d:"Data center, renewable, modular"}]}].map((tier,ti)=>(<div key={ti} style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><div style={{width:8,height:8,borderRadius:4,background:tier.color}}/><div style={{fontSize:11,fontWeight:700,color:tier.color}}>{tier.tier}</div><div style={{fontSize:8,color:"var(--fg-tertiary)"}}>— {tier.sub}</div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>{tier.dbs.map((db,di)=>(<div key={di} style={{padding:"6px 8px",borderRadius:6,border:"1px solid var(--border)",background:"var(--bg-secondary)"}}><div style={{fontSize:10,fontWeight:600}}>{db.n}</div><div style={{fontSize:8,color:"var(--fg-tertiary)"}}>{db.d}</div></div>))}</div></div>))}
          <Card accent={BRASS}><div style={{fontSize:10,fontWeight:600,marginBottom:4}}>Every entity gets its own URL</div><div style={{fontSize:9,color:"var(--fg-secondary)",lineHeight:1.5}}>Human page + JSON-LD + API endpoint + embedding vector + cross-links. AI agents query our API. Humans land on our pages.</div></Card>
        </S>
      )}

      {/* ═══ PRODUCTS ═══ */}
      {cur === "products" && (
        <S title="7 Magnetic Products" sub="Each a facet of the Killer App. Together = the MTP. Each competitor validates one. We ship all seven.">
          {[{n:"Smart Project Launcher",tag:"THE COO",d:"7-tab dashboard. Constraint-aware scheduling. The nerve center.",c:ACCENT,s:"✅ v1"},{n:"Dream Builder",tag:"FREE · VIRAL",d:"\"I want to build...\" → plan in 60 seconds. Voice. Share links. The gravity well.",c:WARM,s:"✅ v1"},{n:"AI Construction Copilot",tag:"CORE AI",d:"Any question, cited answer. RAG + streaming. Voice. On every page.",c:PURPLE,s:"✅ v1"},{n:"AEC CRM",tag:"STICKY",d:"Lead → warranty. Knowledge-enriched. Client portal.",c:BLUE,s:"planned"},{n:"Voice-First Field Ops",tag:"FIELD",d:"Safety briefings (API built). Offline. 30+ languages.",c:GOLD,s:"API ✅"},{n:"Supply Chain + Marketplace",tag:"REVENUE",d:"Materials → suppliers. Stripe Connect (2-5%).",c:GREEN,s:"planned"},{n:"Site Intelligence",tag:"CAPTURE",d:"Drones, LiDAR → digital twin. SucceLens AI.",c:"#EC4899",s:"planned"}].map((p,i)=>(<Card key={i} accent={p.c} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:700}}>{p.n}</span><span style={{fontSize:8,padding:"1px 6px",borderRadius:8,background:p.c,color:"#fff",fontWeight:600}}>{p.tag}</span></div><span style={{fontSize:8,padding:"2px 8px",borderRadius:8,background:p.s.includes("✅")?ACCENT+"20":"var(--bg-tertiary)",color:p.s.includes("✅")?ACCENT:"var(--fg-tertiary)",fontWeight:600}}>{p.s}</span></div><div style={{fontSize:10,color:"var(--fg-secondary)",lineHeight:1.5}}>{p.d}</div></Card>))}
        </S>
      )}

      {/* ═══ UX ═══ */}
      {cur === "ux" && (
        <S title="Making Complexity Feel Simple" sub="The MTP in action: platform carries cognitive load, human makes decisions.">
          <Card accent={WARM} style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:600,marginBottom:4}}>The Killer App Promise</div><div style={{fontSize:10,color:"var(--fg-secondary)",lineHeight:1.6}}>Hundreds of variables. Humans hold 4-7 in memory. The Killer App tracks ALL of them, surfaces what matters NOW, and helps decide.</div></Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            {[{n:"Command Center",i:"🎯",d:"Project health"},{n:"Smart Alerts",i:"🔔",d:"Proactive"},{n:"Trade-Off Viz",i:"⚖️",d:"What-if ripples"},{n:"Budget Heartbeat",i:"💰",d:"Living cash flow"},{n:"AI Decisions",i:"🧠",d:"Options + recs"},{n:"Permit Tracker",i:"📋",d:"Countdowns"},{n:"Team Orchestrator",i:"👥",d:"Conflict detection"},{n:"Procurement",i:"📦",d:"Lead times"},{n:"Risk Radar",i:"🛡️",d:"Continuous"},{n:"Progress Story",i:"📖",d:"Celebrations"},{n:"Finance Nav",i:"🏦",d:"Draw schedules"},{n:"Contract Companion",i:"📝",d:"Risk flags"},{n:"Quality Score",i:"⭐",d:"Pass rates"},{n:"Security",i:"🔐",d:"Physical+digital"},{n:"Compromise Calc",i:"🎛️",d:"Smart tradeoffs"}].map((s,i)=>(<div key={i} style={{padding:"8px 6px",borderRadius:8,border:"1px solid var(--border)",textAlign:"center",background:"var(--bg-secondary)"}}><span style={{fontSize:16}}>{s.i}</span><div style={{fontSize:9,fontWeight:600,marginTop:2}}>{s.n}</div><div style={{fontSize:8,color:"var(--fg-tertiary)",marginTop:1}}>{s.d}</div></div>))}
          </div>
        </S>
      )}

      {/* ═══ COMPETITION ═══ */}
      {cur === "competition" && (
        <S title="The Competitive Gap" sub="$3B+ invested. Each covers a sliver. The Killer App covers everything.">
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",gap:2,marginBottom:4,paddingLeft:100}}>{PHASES.map(p=><div key={p.l} style={{flex:1,textAlign:"center",fontSize:7,fontWeight:600,color:p.c}}>{p.l}</div>)}</div>
            {[{n:"Procore",f:"$2B+",p:[0,0,.4,1,.4,0]},{n:"Autodesk",f:"$5.5B",p:[0,1,.3,.4,.4,0]},{n:"PermitFlow",f:"$54M",p:[0,0,.5,0,0,0]},{n:"XBuild",f:"$19M",p:[0,0,.4,0,0,0]},{n:"ALICE",f:"$47M",p:[0,0,.6,0,0,0]},{n:"Bedrock",f:"$350M+",p:[0,0,0,.5,0,0]},{n:"FieldAI",f:"$405M",p:[0,0,0,.5,0,0]},{n:"Benetics",f:"Seed",p:[0,0,0,.4,0,0]},{n:"UpCodes",f:"~$10M",p:[0,.5,0,0,0,0]},{n:"Buildertrend",f:"Private",p:[0,0,.4,.8,.4,0]}].map((c,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"98px 1fr",gap:6,alignItems:"center",marginBottom:3}}><div style={{fontSize:9,display:"flex",alignItems:"center",gap:4}}><span style={{fontWeight:500}}>{c.n}</span><span style={{fontSize:7,color:"var(--fg-tertiary)"}}>{c.f}</span></div><div style={{display:"flex",gap:2,height:14}}>{c.p.map((v,j)=><div key={j} style={{flex:1,background:v>0?PHASES[j].c:"var(--border)",opacity:v>0?v*0.7+0.2:0.12,borderRadius:2}}/>)}</div></div>))}
            <div style={{display:"grid",gridTemplateColumns:"98px 1fr",gap:6,alignItems:"center",marginTop:10,paddingTop:8,borderTop:`2px solid ${WARM}`}}><div style={{fontSize:10,fontWeight:700}}>⚡ Killer App</div><div style={{display:"flex",gap:2,height:18}}>{PHASES.map((_,j)=><div key={j} style={{flex:1,background:PHASES[j].c,opacity:0.85,borderRadius:2}}/>)}</div></div>
          </div>
          <Card accent={WARM}><div style={{fontSize:10,fontWeight:600,color:WARM,marginBottom:4}}>⚡ What Each Competitor Validates</div><div style={{fontSize:9,color:"var(--fg-secondary)",lineHeight:1.8}}>Procore → PM is massive. PermitFlow → AI permitting works. ALICE → AI scheduling works. Bedrock → Robots need knowledge. <strong style={{color:WARM}}>The Killer App includes ALL as features, connected by 40 databases + 7 RSI loops.</strong></div></Card>
        </S>
      )}

      {/* ═══ NEXT ═══ */}
      {cur === "next" && (
        <S title="Next Steps" sub="Ship the MTP. Make the Killer App real.">
          <div style={{fontSize:11,fontWeight:700,color:"#dc3545",marginBottom:6}}>🔴 #1: Build the Databases</div>
          <Card accent="#dc3545" style={{marginBottom:12}}><div style={{fontSize:10,color:"var(--fg-secondary)",lineHeight:1.6}}>7 Tier 1 databases = foundation the Killer App stands on. Global Codes, Materials, Cost Benchmarks, Permits, Safety, Sequencing, Trades. Without deep data, the MTP is just a pretty UI. With it, we&apos;re the most informed AEC destination in the universe.</div></Card>
          <div style={{fontSize:11,fontWeight:700,color:WARM,marginBottom:6}}>⚡ #2: Ship the MTP</div>
          <Card accent={WARM} style={{marginBottom:12}}><div style={{fontSize:10,color:"var(--fg-secondary)",lineHeight:1.6}}>The Killer App v1 is BUILT. 3 pages, 7 APIs, gamification, voice, AI copilot, MCP server. Needs: real data (Supabase), real auth (Clerk), real payments (Stripe). Then deploy.</div></Card>
          {[{icon:"🔑",t:"API Keys",d:"Supabase, Anthropic, Clerk, Stripe.",u:true},{icon:"🗃️",t:"Database Sprint",d:"Code PDFs → entities. Material specs → catalog. Cost data → benchmarks.",u:true},{icon:"🚀",t:"Deploy to Vercel",d:"Git push → live at builders.theknowledgegardens.com.",u:false}].map((s,i)=>(<div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid var(--border)"}}><span style={{fontSize:18}}>{s.icon}</span><div><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,fontWeight:600}}>{s.t}</span>{s.u&&<span style={{fontSize:7,padding:"1px 5px",borderRadius:6,background:"#dc354520",color:"#dc3545",fontWeight:700}}>URGENT</span>}</div><div style={{fontSize:10,color:"var(--fg-secondary)",lineHeight:1.5}}>{s.d}</div></div></div>))}
          <div style={{textAlign:"center",marginTop:20,padding:16,borderRadius:14,background:`linear-gradient(135deg, ${WARM}12, ${ACCENT}08)`,border:`2px solid ${WARM}30`}}><div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:WARM,fontWeight:700}}>⚡ The Massive Transformational Product</div><div style={{fontSize:15,fontWeight:700,marginTop:4}}>The Builder&apos;s Killer App</div><div style={{fontSize:10,color:"var(--fg-secondary)",marginTop:4}}>The $17 trillion gap nobody fills. Until now.</div><div style={{display:"flex",gap:2,justifyContent:"center",marginTop:8,maxWidth:200,margin:"8px auto 0"}}>{PHASES.map(p=><div key={p.l} style={{flex:1,height:4,borderRadius:2,background:p.c,opacity:0.7}}/>)}</div></div>
        </S>
      )}

      {/* PAGINATION */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 0",borderTop:"1px solid var(--border)"}}>
        <button onClick={prev} disabled={sl===0} style={{padding:"6px 16px",borderRadius:14,border:"1px solid var(--border)",background:"transparent",color:sl===0?"var(--fg-tertiary)":"var(--fg-secondary)",fontSize:10,cursor:sl===0?"default":"pointer",opacity:sl===0?0.4:1}}>← Previous</button>
        <span style={{fontSize:9,color:"var(--fg-tertiary)"}}>{sl+1} / {SLIDES.length}</span>
        <button onClick={next} disabled={sl===SLIDES.length-1} style={{padding:"6px 16px",borderRadius:14,border:sl===SLIDES.length-1?"1px solid var(--border)":`1px solid ${WARM}`,background:sl===SLIDES.length-1?"transparent":WARM,color:sl===SLIDES.length-1?"var(--fg-tertiary)":"#fff",fontSize:10,cursor:sl===SLIDES.length-1?"default":"pointer"}}>Next →</button>
      </div>
    </div>
  );
}
