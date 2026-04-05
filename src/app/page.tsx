"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimCounter, GamificationStyles } from "@/components/Gamification";
import CopilotPanel from "@/components/CopilotPanel";
// Image URLs are inline in data arrays below — image-service used by other pages
import ConstructionAnimation from "@/components/visuals/ConstructionAnimation";

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
  { label: "DREAM", color: "#D85A30", desc: "\"I want to build...\" → full plan in 60 seconds",
    img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80&fit=crop" },
  { label: "DESIGN", color: "#7F77DD", desc: "Architect matching, BIM, code compliance, materials",
    img: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80&fit=crop" },
  { label: "PLAN", color: "#1D9E75", desc: "AI estimating, smart scheduling, permits, contracts",
    img: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80&fit=crop" },
  { label: "BUILD", color: "#378ADD", desc: "Voice field ops, daily logs, safety, drone progress",
    img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80&fit=crop" },
  { label: "DELIVER", color: "#BA7517", desc: "Punch list, commissioning, digital twin, handoff",
    img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80&fit=crop" },
  { label: "GROW", color: "#639922", desc: "CRM, portfolio analytics, reputation, community",
    img: "https://images.unsplash.com/photo-1460472178825-e5240623afd5?w=600&q=80&fit=crop" },
];

const PRODUCTS = [
  { name: "Smart Project Launcher", tag: "THE COO", desc: "See and manage codes, phases, team, permits, materials, estimate. Your AI superhuman Chief Operating Officer.", color: "#1D9E75", href: "/launch",
    img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80&fit=crop" },
  { name: "Dream Builder", tag: "FREE", desc: "Describe your dream in words, photos, or voice. Watch it come to life in 60 seconds.", color: "#D85A30", href: "/dream",
    img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80&fit=crop" },
  { name: "Knowledge Garden", tag: "2,200+ ENTITIES", desc: "Browse building codes, materials, methods, safety, trades — the world's construction encyclopedia.", color: "#1D9E75", href: "/knowledge",
    img: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&q=80&fit=crop" },
  { name: "AI Copilot", tag: "VOICE + TEXT", desc: "Any construction question, cited jurisdiction-aware answer. Lane-aware personality. Hands-free.", color: "#7F77DD", href: "#copilot",
    img: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&fit=crop" },
  { name: "AEC CRM", tag: "KILLER APP", desc: "Lead → proposal → contract → project → warranty. Pipeline dashboard, lead scoring, full lifecycle.", color: "#E8443A", href: "/killerapp",
    img: "https://images.unsplash.com/photo-1460472178825-e5240623afd5?w=600&q=80&fit=crop" },
  { name: "Marketplace", tag: "COMING", desc: "Every material connects to real suppliers. RFQ system. Stripe Connect marketplace.", color: "#639922", href: "/marketplace",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80&fit=crop" },
];

const STATS = [
  { value: 17, prefix: "$", suffix: "T", label: "Global construction economy" },
  { value: 2200, prefix: "", suffix: "+", label: "Knowledge entities" },
  { value: 315, prefix: "", suffix: "+", label: "Knowledge graph edges" },
  { value: 30, prefix: "", suffix: "", label: "Routes live" },
];

const PRICING = [
  { tier: "Explorer", price: "Free", target: "Everyone", features: ["Browse all knowledge", "5 AI queries/day", "Dream Builder", "Community access"], cta: "Start Free" },
  { tier: "Pro", price: "$49", target: "Individual builder", features: ["Unlimited AI copilot", "5 projects", "Estimating + scheduling", "Full marketplace"], cta: "Start Building", highlight: true },
  { tier: "Team", price: "$199", target: "Companies 5-50", features: ["Unlimited projects", "Team management", "Financial tools + CRM", "Voice field ops + XR"], cta: "Start Team" },
  { tier: "Enterprise", price: "$499+", target: "Large contractors", features: ["White-label + SSO", "Robot integration API", "Advanced analytics", "Dedicated support"], cta: "Contact Us" },
];

// Rotating hero images for the background
const HERO_GALLERY = [
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=85&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=85&fit=crop",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=85&fit=crop",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=85&fit=crop",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1600&q=85&fit=crop",
];

export default function Home() {
  const router = useRouter();
  const [heroSearch, setHeroSearch] = useState("");
  const [heroIdx, setHeroIdx] = useState(0);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const stats = useInView(0.2);
  const phases = useInView(0.15);
  const products = useInView(0.15);
  const pricing = useInView(0.15);
  const [activePhase, setActivePhase] = useState(0);

  // Rotate hero background every 6 seconds
  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO_GALLERY.length), 6000);
    return () => clearInterval(t);
  }, []);

  // Detect first-time visitors
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("bkg-lane")) {
        setIsFirstVisit(true);
      }
    }
  }, []);

  const [userLane, setUserLane] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserLane(localStorage.getItem("bkg-lane"));
    }
  }, []);

  // Auto-cycle phases
  useEffect(() => {
    if (!phases.visible) return;
    const t = setInterval(() => setActivePhase(p => (p + 1) % 6), 3000);
    return () => clearInterval(t);
  }, [phases.visible]);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <GamificationStyles />

      {/* ═══ HERO — Full-bleed architecture photo ═══ */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
        {/* Rotating background images */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={heroIdx}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${HERO_GALLERY[heroIdx]})`,
              backgroundSize: "cover", backgroundPosition: "center",
            }}
          />
        </AnimatePresence>

        {/* Dark overlay for text readability */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.85) 100%)", zIndex: 1 }} />

        {/* Nav overlay */}
        <nav className="hero-nav" style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image src="/logo/b_transparent_512.png" alt="B" width={36} height={36} style={{ borderRadius: 8 }} />
            <span className="hero-nav-title" style={{ color: "#fff", fontWeight: 600, fontSize: 14, letterSpacing: "0.3px" }}>Builder&apos;s Knowledge Garden</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/knowledge" className="hero-nav-link" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, textDecoration: "none" }}>Knowledge</Link>
            <Link href="/dream" className="hero-nav-link" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, textDecoration: "none" }}>Dream</Link>
            <Link href="/launch" style={{ padding: "8px 16px", borderRadius: 24, background: "#1D9E75", color: "#fff", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
              Launch Project
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          style={{ position: "relative", zIndex: 5, textAlign: "center", padding: "0 24px", maxWidth: 700 }}>

          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 20, background: "rgba(29,158,117,0.25)", border: "1px solid rgba(29,158,117,0.4)", marginBottom: 20 }}>
            <span style={{ color: "#5DCAA5", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>The AI Superhuman COO for Construction</span>
          </div>

          <h1 style={{ color: "#fff", fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 700, lineHeight: 1.1, margin: "0 0 16px" }}>
            Build anything.<br/>
            <span style={{ background: "linear-gradient(135deg, #5DCAA5, #1D9E75)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Anywhere.</span>
          </h1>

          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 17, lineHeight: 1.6, margin: "0 0 32px", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            One platform for the entire journey of building. From the first dream to the last invoice. 500+ knowledge entities. Voice-first. AI-native.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
            <Link href="/dream" style={{ padding: "14px 32px", borderRadius: 28, background: "linear-gradient(135deg, #D85A30, #E07B3A)", color: "#fff", fontSize: 15, fontWeight: 600, textDecoration: "none", boxShadow: "0 8px 30px rgba(216,90,48,0.35)" }}>
              Start Dreaming
            </Link>
            <Link href="/launch" style={{ padding: "14px 32px", borderRadius: 28, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", fontSize: 15, fontWeight: 500, textDecoration: "none", backdropFilter: "blur(8px)" }}>
              Launch a Project
            </Link>
          </div>

          {/* Search bar */}
          <form onSubmit={(e) => { e.preventDefault(); if (heroSearch.trim()) router.push(`/knowledge?q=${encodeURIComponent(heroSearch.trim())}`); }}
            style={{ display: "flex", gap: 8, maxWidth: 480, margin: "0 auto" }}>
            <input type="text" value={heroSearch} onChange={e => setHeroSearch(e.target.value)}
              placeholder="Search codes, materials, safety regulations..."
              style={{ flex: 1, padding: "12px 20px", borderRadius: 24, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, outline: "none", backdropFilter: "blur(8px)" }} />
            <button type="submit" style={{ padding: "12px 20px", borderRadius: 24, background: "#1D9E75", color: "#fff", border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Search</button>
          </form>

          {/* First-time user nudge */}
          {isFirstVisit && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.5 }}
              style={{ marginTop: 20, padding: "12px 24px", borderRadius: 16, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", display: "inline-flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>👋</span>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>First time here?</span>
              <Link href="/onboard" style={{ color: "#5DCAA5", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                Let us guide you →
              </Link>
            </motion.div>
          )}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", bottom: 32, zIndex: 5, color: "rgba(255,255,255,0.5)", fontSize: 11, textAlign: "center" }}>
          <div style={{ width: 24, height: 38, borderRadius: 12, border: "2px solid rgba(255,255,255,0.3)", margin: "0 auto 8px", position: "relative" }}>
            <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: 4, height: 8, borderRadius: 2, background: "rgba(255,255,255,0.5)", position: "absolute", top: 6, left: "50%", marginLeft: -2 }} />
          </div>
          Scroll to explore
        </motion.div>
      </section>

      {/* ═══ QUICK ACTIONS for returning users ═══ */}
      {userLane && !isFirstVisit && (
        <section style={{ padding: "32px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 12 }}>
              Quick actions
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
              {(userLane === "diy" ? [
                { icon: "💭", label: "Describe a dream", href: "/dream/describe", color: "#D85A30" },
                { icon: "📷", label: "Get inspired", href: "/dream/browse", color: "#B8873B" },
                { icon: "📚", label: "Learn about codes", href: "/knowledge", color: "#1D9E75" },
                { icon: "🚀", label: "Launch a project", href: "/launch", color: "#378ADD" },
              ] : [
                { icon: "🚀", label: "Launch a project", href: "/launch", color: "#1D9E75" },
                { icon: "📋", label: "Look up a code", href: "/knowledge", color: "#D85A30" },
                { icon: "⚡", label: "Manage pipeline", href: "/killerapp", color: "#E8443A" },
                { icon: "🧠", label: "Ask AI Copilot", href: "#copilot", color: "#7F77DD" },
              ]).map(a => (
                <Link key={a.href} href={a.href} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                  borderRadius: 12, background: "#fff", border: "1px solid #e2e4e8",
                  textDecoration: "none", color: "#111", fontSize: 13, fontWeight: 500,
                  transition: "all 0.15s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 4px 12px ${a.color}15`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e4e8"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  <span style={{ fontSize: 20 }}>{a.icon}</span>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ STATS ═══ */}
      <section ref={stats.ref} style={{ padding: "80px 24px", borderBottom: "1px solid var(--border)" }}>
        <div className="stats-grid" style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {STATS.map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={stats.visible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>
                {stats.visible ? <AnimCounter value={s.value} prefix={s.prefix} suffix={s.suffix} duration={1200} /> : `${s.prefix}0${s.suffix}`}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 6, color: "var(--fg)" }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ CONSTRUCTION ANIMATION — Watch a building rise ═══ */}
      <section style={{ padding: "60px 24px", background: "var(--bg)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#D85A30", fontWeight: 600 }}>Watch It Rise</span>
            <h2 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700, margin: "6px 0 8px" }}>From bare ground to move-in ready</h2>
            <p style={{ fontSize: 14, color: "var(--fg-secondary)" }}>Every building follows this journey. We manage every phase.</p>
          </div>
          <ConstructionAnimation autoPlay interval={4} height={340} />
        </div>
      </section>

      {/* ═══ LIFECYCLE — Photo-backed phase cards ═══ */}
      <section ref={phases.ref} style={{ padding: "80px 24px", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--accent)", fontWeight: 600 }}>The Full Lifecycle</span>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, margin: "8px 0 12px" }}>Every phase. One platform.</h2>
            <p style={{ fontSize: 15, color: "var(--fg-secondary)", maxWidth: 480, margin: "0 auto" }}>Every competitor covers a sliver. We cover the entire journey of building anything, anywhere.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {PHASES.map((p, i) => (
              <motion.button key={p.label}
                onClick={() => setActivePhase(i)}
                initial={{ opacity: 0, y: 20 }}
                animate={phases.visible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ scale: 1.02 }}
                style={{
                  position: "relative", overflow: "hidden", borderRadius: 16, height: 180,
                  border: activePhase === i ? `2px solid ${p.color}` : "1px solid var(--border)",
                  cursor: "pointer", textAlign: "left", padding: 0, background: "none",
                }}>
                {/* Photo background */}
                <div style={{
                  position: "absolute", inset: 0,
                  backgroundImage: `url(${p.img})`,
                  backgroundSize: "cover", backgroundPosition: "center",
                  filter: activePhase === i ? "none" : "grayscale(60%) brightness(0.7)",
                  transition: "filter 0.4s ease",
                }} />
                {/* Gradient overlay */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: `linear-gradient(180deg, transparent 20%, ${activePhase === i ? p.color + "dd" : "rgba(0,0,0,0.65)"} 100%)`,
                  transition: "background 0.4s ease",
                }} />
                {/* Text */}
                <div style={{ position: "relative", zIndex: 2, padding: 20, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: activePhase === i ? "#fff" : "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
                    {p.label}
                  </span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.4, marginTop: 4 }}>
                    {p.desc}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRODUCTS — Photo-backed cards ═══ */}
      <section ref={products.ref} style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#7F77DD", fontWeight: 600 }}>7 Magnetic Products</span>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, margin: "8px 0 12px" }}>One knowledge engine. Seven killer products.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {PRODUCTS.map((p, i) => (
              <motion.div key={p.name}
                initial={{ opacity: 0, y: 24 }}
                animate={products.visible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer" }}
                onClick={() => router.push(p.href)}>
                {/* Product image */}
                <div style={{ position: "relative", height: 160, overflow: "hidden" }}>
                  <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `url(${p.img})`,
                    backgroundSize: "cover", backgroundPosition: "center",
                    transition: "transform 0.4s ease",
                  }} />
                  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 30%, ${p.color}cc 100%)` }} />
                  <div style={{ position: "absolute", bottom: 12, left: 16, right: 16, zIndex: 2 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 12, background: "rgba(255,255,255,0.2)", color: "#fff", backdropFilter: "blur(4px)", letterSpacing: 1 }}>
                      {p.tag}
                    </span>
                  </div>
                </div>
                {/* Product info */}
                <div style={{ padding: "16px 20px 20px" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>{p.name}</h3>
                  <p style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section ref={pricing.ref} style={{ padding: "80px 24px", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#D85A30", fontWeight: 600 }}>Transparent Pricing</span>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, margin: "8px 0 12px" }}>Published tiers. No &quot;request a demo&quot; games.</h2>
            <p style={{ fontSize: 15, color: "var(--fg-secondary)", maxWidth: 480, margin: "0 auto" }}>Procore charges $10K-$60K+/year. We deliver the full lifecycle at a fraction.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {PRICING.map((p, i) => (
              <motion.div key={p.tier}
                initial={{ opacity: 0, y: 16 }}
                animate={pricing.visible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                style={{
                  padding: 24, borderRadius: 16, textAlign: "center",
                  background: "var(--bg)",
                  border: p.highlight ? "2px solid var(--accent)" : "1px solid var(--border)",
                  boxShadow: p.highlight ? "0 8px 30px rgba(29,158,117,0.12)" : "none",
                }}>
                {p.highlight && (
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, padding: "4px 12px", borderRadius: 12, display: "inline-block", background: "var(--accent)", color: "#fff" }}>Most Popular</div>
                )}
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--fg-tertiary)", marginBottom: 4 }}>{p.tier}</div>
                <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 2 }}>{p.price}</div>
                <div style={{ fontSize: 11, color: "var(--fg-tertiary)", marginBottom: 20 }}>{p.price !== "Free" ? "/mo" : "forever"}</div>
                <div style={{ marginBottom: 16 }}>
                  {p.features.map((f, fi) => (
                    <div key={fi} style={{ fontSize: 12, color: "var(--fg-secondary)", padding: "4px 0" }}>
                      <span style={{ color: "var(--accent)", marginRight: 6 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-tertiary)" }}>{p.target}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA — Photo background ═══ */}
      <section style={{ position: "relative", padding: "100px 24px", textAlign: "center", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url(https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1400&q=80&fit=crop)",
          backgroundSize: "cover", backgroundPosition: "center",
        }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)" }} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          style={{ position: "relative", zIndex: 2, maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ color: "#fff", fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 700, lineHeight: 1.2, margin: "0 0 16px" }}>
            The $17 trillion gap nobody fills.<br/>
            <span style={{ color: "#5DCAA5" }}>Until now.</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
            $3B+ invested across 12+ contech companies. Each covers a sliver.
            Nobody owns the full lifecycle. That&apos;s the opportunity.
          </p>
          <Link href="/dream" style={{ display: "inline-block", padding: "16px 40px", borderRadius: 28, background: "linear-gradient(135deg, #D85A30, #E07B3A)", color: "#fff", fontSize: 16, fontWeight: 600, textDecoration: "none", boxShadow: "0 8px 30px rgba(216,90,48,0.35)" }}>
            Start Your Dream
          </Link>
        </motion.div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ padding: "48px 24px", textAlign: "center", borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
          <Image src="/logo/b_transparent_512.png" alt="B" width={24} height={24} style={{ borderRadius: 6 }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Builder&apos;s Knowledge Garden</span>
        </div>
        <div style={{ display: "flex", gap: 2, justifyContent: "center", maxWidth: 200, margin: "0 auto 16px" }}>
          {["#D85A30","#7F77DD","#1D9E75","#378ADD","#BA7517","#639922"].map((c, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: c, opacity: 0.5 }} />
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--fg-tertiary)" }}>The EVERYTHING platform for the $17T global construction economy</p>
        <p style={{ fontSize: 10, color: "var(--fg-tertiary)", marginTop: 4 }}>DREAM → DESIGN → PLAN → BUILD → DELIVER → GROW</p>
      </footer>

      <CopilotPanel />

      {/* Mobile responsive overrides */}
      <style>{`
        @media (max-width: 480px) {
          .hero-nav { padding: 12px 16px !important; }
          .hero-nav-title { display: none !important; }
          .hero-nav-link { display: none !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 16px !important; }
        }
      `}</style>
    </div>
  );
}
