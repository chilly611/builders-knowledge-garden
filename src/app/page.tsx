"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { CompletionRing, AnimCounter, LifecycleFog, GamificationStyles } from "@/components/Gamification";
import CopilotPanel from "@/components/CopilotPanel";

// Animated visibility hook
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const PHASES = [
  { label: "DREAM", color: "#D85A30", icon: "💭", desc: "\"I want to build...\" → full plan in 60 seconds" },
  { label: "DESIGN", color: "#7F77DD", icon: "📐", desc: "Architect matching, BIM, code compliance, materials" },
  { label: "PLAN", color: "#1D9E75", icon: "📋", desc: "AI estimating, smart scheduling, permits, contracts" },
  { label: "BUILD", color: "#378ADD", icon: "🏗️", desc: "Voice field ops, daily logs, safety, drone progress" },
  { label: "DELIVER", color: "#BA7517", icon: "🔑", desc: "Punch list, commissioning, digital twin, handoff" },
  { label: "GROW", color: "#639922", icon: "📈", desc: "CRM, portfolio analytics, reputation, community" },
];

const PRODUCTS = [
  { name: "Smart Project Launcher", tag: "THE COO", desc: "Building type → jurisdiction → auto-populate everything. See and manage codes, phases, team, permits, materials, estimate.", color: "#1D9E75", icon: "🚀", href: "/launch" },
  { name: "Dream Builder", tag: "FREE", desc: "\"I want to build a farmhouse in Asheville\" → full plan in 60 seconds. Voice, text, or image. Shareable dream link.", color: "#D85A30", icon: "💭", href: "/dream" },
  { name: "Knowledge Garden", tag: "229 ENTITIES", desc: "Browse building codes, materials, methods, safety, trades, standards — 229 entities across 14 types. Every entity has its own page.", color: "#1D9E75", icon: "🌿", href: "/knowledge" },
  { name: "AI Construction Copilot", tag: "CORE", desc: "Any question, cited answer. Lane-aware personality. Voice or text. RAG pipeline with 229+ entities.", color: "#7F77DD", icon: "🧠", href: "#copilot" },
  { name: "AEC CRM", tag: "KILLER APP", desc: "Lead → proposal → contract → project → warranty. Pipeline dashboard, lead scoring, activity tracking.", color: "#E8443A", icon: "⚡", href: "/crm" },
  { name: "Supply Chain + Marketplace", tag: "COMING", desc: "Every material connects to real suppliers. RFQ system. 2-5% marketplace fee.", color: "#639922", icon: "🏪", href: "/marketplace" },
];

const STATS = [
  { value: 17, prefix: "$", suffix: "T", label: "Global construction economy", sub: "Largest industry on earth" },
  { value: 229, prefix: "", suffix: "+", label: "Knowledge entities", sub: "Codes, materials, methods, safety, styles" },
  { value: 171, prefix: "", suffix: "+", label: "Knowledge graph edges", sub: "Codes↔standards↔materials↔methods" },
  { value: 20, prefix: "", suffix: "", label: "Routes live now", sub: "8 pages + 12 API endpoints" },
];

const PRICING = [
  { tier: "Explorer", price: "Free", target: "Everyone", features: ["Browse all knowledge", "5 AI queries/day", "Dream Builder", "Community access"], cta: "Start Free" },
  { tier: "Pro", price: "$49", target: "Individual builder", features: ["Unlimited AI copilot", "5 projects", "Estimating + scheduling", "Full marketplace"], cta: "Start Building", highlight: true },
  { tier: "Team", price: "$199", target: "Companies 5-50", features: ["Unlimited projects", "Team management", "Financial tools + CRM", "Voice field ops + XR"], cta: "Start Team" },
  { tier: "Enterprise", price: "$499+", target: "Large contractors", features: ["White-label + SSO", "Robot integration API", "Advanced analytics", "Dedicated support"], cta: "Contact Us" },
];

export default function Home() {
  const hero = useInView(0.1);
  const stats = useInView(0.2);
  const phases = useInView(0.15);
  const products = useInView(0.15);
  const pricing = useInView(0.15);
  const [activePhase, setActivePhase] = useState(0);

  // Auto-cycle phases
  useEffect(() => {
    if (!phases.visible) return;
    const t = setInterval(() => setActivePhase((p) => (p + 1) % 6), 3000);
    return () => clearInterval(t);
  }, [phases.visible]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <GamificationStyles />

      {/* ═══ NAV ═══ */}
      <nav className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-20"
        style={{ borderColor: "var(--border)", background: "var(--bg)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
               style={{ background: "linear-gradient(135deg, #1D9E75, #0F6E56)" }}>🏗️</div>
          <span className="font-semibold text-sm">Builder&apos;s Knowledge Garden</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] hidden sm:inline" style={{ color: "var(--fg-tertiary)" }}>40K+ entities · 142 jurisdictions</span>
          <Link href="/launch"
            className="px-4 py-1.5 rounded-full text-white text-xs font-medium transition-all hover:scale-105"
            style={{ background: "#1D9E75" }}>
            Launch Project →
          </Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section ref={hero.ref} className="flex flex-col items-center justify-center px-6 py-20 sm:py-28 text-center">
        <div className="flex gap-2 mb-6 text-lg" style={{ opacity: hero.visible ? 0.5 : 0, transition: "opacity 0.8s ease" }}>
          <span>📐</span><span>⛑️</span><span>🏗️</span><span>🎙️</span><span>🧠</span><span>📈</span>
        </div>
        <p className="text-[10px] tracking-[3px] uppercase mb-4"
          style={{ color: "var(--accent)", opacity: hero.visible ? 1 : 0, transition: "opacity 0.6s 0.2s ease" }}>
          The AI Superhuman COO for the $17T Construction Economy
        </p>
        <h1 className="text-3xl sm:text-5xl font-semibold leading-tight mb-5 max-w-2xl"
          style={{ opacity: hero.visible ? 1 : 0, transform: hero.visible ? "none" : "translateY(20px)", transition: "all 0.7s 0.3s ease" }}>
          Build anything, anywhere.<br/>
          <span style={{ color: "var(--accent)" }}>Start here.</span>
        </h1>
        <p className="text-sm sm:text-base max-w-lg mb-10 leading-relaxed"
          style={{ color: "var(--fg-secondary)", opacity: hero.visible ? 1 : 0, transition: "opacity 0.7s 0.5s ease" }}>
          One platform. Every phase. 40,000+ knowledge entities. Voice-first. AI-native.
          The thing that makes every competitor look like a point solution.
        </p>
        <div className="flex flex-col sm:flex-row gap-3"
          style={{ opacity: hero.visible ? 1 : 0, transition: "opacity 0.6s 0.7s ease" }}>
          <Link href="/launch"
            className="px-8 py-3 rounded-full text-white font-medium text-sm transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #1D9E75, #0F6E56)", boxShadow: "0 4px 20px rgba(29,158,117,0.3)" }}>
            🚀 Launch a Project
          </Link>
          <Link href="/dream"
            className="px-8 py-3 rounded-full font-medium text-sm transition-all hover:scale-105 border"
            style={{ borderColor: "var(--border)", color: "var(--fg-secondary)" }}>
            💭 Dream Builder (Free)
          </Link>
        </div>
        <Link href="/onboard"
          className="mt-4 text-xs transition-all hover:underline"
          style={{ color: "var(--fg-tertiary)" }}>
          Not sure where to start? Choose your lane →
        </Link>
      </section>

      {/* ═══ STATS ═══ */}
      <section ref={stats.ref} className="px-6 py-16 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <div key={i} className="text-center"
              style={{ opacity: stats.visible ? 1 : 0, transform: stats.visible ? "none" : "translateY(16px)",
                transition: `all 0.5s ${i * 0.1}s ease` }}>
              <div className="text-3xl sm:text-4xl font-semibold" style={{ color: "var(--accent)" }}>
                {stats.visible ? <AnimCounter value={s.value} prefix={s.prefix} suffix={s.suffix} duration={1200} /> : `${s.prefix}0${s.suffix}`}
              </div>
              <div className="text-xs font-medium mt-1">{s.label}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--fg-tertiary)" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ LIFECYCLE ═══ */}
      <section ref={phases.ref} className="px-6 py-16 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] tracking-[2px] uppercase mb-2" style={{ color: "var(--accent)" }}>The Full Lifecycle</p>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3">Every phase. Every stakeholder. One platform.</h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: "var(--fg-secondary)" }}>
              Every competitor covers a sliver. We cover the entire journey of building anything, anywhere.
            </p>
          </div>

          {/* Phase cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {PHASES.map((p, i) => (
              <button key={p.label} onClick={() => setActivePhase(i)}
                className="text-left p-4 rounded-xl transition-all"
                style={{
                  background: activePhase === i ? p.color + "15" : "var(--bg)",
                  border: `1.5px solid ${activePhase === i ? p.color : "var(--border)"}`,
                  opacity: phases.visible ? 1 : 0,
                  transform: phases.visible ? "none" : "translateY(12px)",
                  transition: `all 0.4s ${i * 0.08}s ease`,
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{p.icon}</span>
                  <span className="text-[10px] font-bold tracking-wider" style={{ color: activePhase === i ? p.color : "var(--fg-tertiary)" }}>
                    {p.label}
                  </span>
                </div>
                <div className="text-[11px] leading-relaxed" style={{ color: activePhase === i ? "var(--fg)" : "var(--fg-secondary)" }}>
                  {p.desc}
                </div>
              </button>
            ))}
          </div>

          {/* Fog of War teaser */}
          <LifecycleFog activePhase={activePhase} unlockedPhases={[0, 1, 2]} />
        </div>
      </section>

      {/* ═══ PRODUCTS ═══ */}
      <section ref={products.ref} className="px-6 py-16 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] tracking-[2px] uppercase mb-2" style={{ color: "#7F77DD" }}>7 Magnetic Products</p>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3">One knowledge engine. Seven killer products.</h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: "var(--fg-secondary)" }}>
              Each competitor validates one of these. We include ALL of them in one platform.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRODUCTS.map((p, i) => (
              <Link key={p.name} href={p.href}
                className="p-5 rounded-xl transition-all hover:scale-[1.01]"
                style={{
                  background: "var(--bg-secondary)", border: "1px solid var(--border)",
                  borderTop: `3px solid ${p.color}`, textDecoration: "none", color: "inherit", display: "block",
                  opacity: products.visible ? 1 : 0,
                  transform: products.visible ? "none" : "translateY(16px)",
                  transition: `all 0.4s ${i * 0.08}s ease`,
                }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{p.icon}</span>
                    <span className="text-sm font-semibold">{p.name}</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: p.color }}>
                    {p.tag}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--fg-secondary)" }}>{p.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section ref={pricing.ref} className="px-6 py-16 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] tracking-[2px] uppercase mb-2" style={{ color: "#D85A30" }}>Transparent Pricing</p>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3">Published tiers. No &quot;request a demo&quot; games.</h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: "var(--fg-secondary)" }}>
              Procore charges $10K-$60K+/year. We deliver the full lifecycle at a fraction of the price.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRICING.map((p, i) => (
              <div key={p.tier}
                className="p-4 rounded-xl text-center transition-all"
                style={{
                  background: "var(--bg)",
                  border: p.highlight ? "2px solid var(--accent)" : "1px solid var(--border)",
                  boxShadow: p.highlight ? "0 4px 20px rgba(29,158,117,0.15)" : "none",
                  opacity: pricing.visible ? 1 : 0, transform: pricing.visible ? "none" : "translateY(12px)",
                  transition: `all 0.4s ${i * 0.1}s ease`,
                }}>
                {p.highlight && (
                  <div className="text-[8px] font-bold tracking-wider uppercase mb-2 px-2 py-0.5 rounded-full inline-block"
                    style={{ background: "var(--accent)", color: "#fff" }}>Most Popular</div>
                )}
                <div className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: "var(--fg-tertiary)" }}>{p.tier}</div>
                <div className="text-2xl font-semibold mb-0.5">{p.price}</div>
                <div className="text-[10px] mb-3" style={{ color: "var(--fg-tertiary)" }}>{p.price !== "Free" ? "/mo" : "forever"}</div>
                <div className="space-y-1.5 mb-4">
                  {p.features.map((f, fi) => (
                    <div key={fi} className="text-[10px]" style={{ color: "var(--fg-secondary)" }}>
                      <span style={{ color: "var(--accent)" }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <div className="text-[10px] font-medium" style={{ color: "var(--fg-tertiary)" }}>{p.target}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="px-6 py-20 text-center border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
            The $17 trillion gap nobody fills.<br/>
            <span style={{ color: "var(--accent)" }}>Until now.</span>
          </h2>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--fg-secondary)" }}>
            $3B+ invested across 12+ contech companies. Each covers a sliver.
            Nobody owns the full lifecycle from dream to delivery. That&apos;s the opportunity.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/launch"
              className="px-8 py-3 rounded-full text-white font-medium text-sm transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #1D9E75, #0F6E56)", boxShadow: "0 4px 20px rgba(29,158,117,0.3)" }}>
              🚀 Launch Your First Project
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="px-6 py-10 border-t text-center" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px]"
              style={{ background: "linear-gradient(135deg, #1D9E75, #0F6E56)" }}>🏗️</div>
            <span className="text-sm font-semibold">Builder&apos;s Knowledge Garden</span>
          </div>
          <div className="flex gap-1 justify-center mb-4 w-full max-w-xs mx-auto">
            {["DREAM","DESIGN","PLAN","BUILD","DELIVER","GROW"].map((p, i) => (
              <div key={p} className="flex-1 h-1.5 rounded-full"
                style={{ background: ["#D85A30","#7F77DD","#1D9E75","#378ADD","#BA7517","#639922"][i], opacity: 0.5 }} />
            ))}
          </div>
          <p className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>
            The EVERYTHING platform for the $17T global construction economy
          </p>
          <p className="text-[9px] mt-1" style={{ color: "var(--fg-tertiary)" }}>
            DREAM → DESIGN → PLAN → BUILD → DELIVER → GROW
          </p>
        </div>
      </footer>

      {/* AI Copilot — available site-wide */}
      <CopilotPanel />
    </div>
  );
}
