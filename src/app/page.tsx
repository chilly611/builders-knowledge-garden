"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { AnimCounter, GamificationStyles } from "@/components/Gamification";
import CopilotPanel from "@/components/CopilotPanel";

/* ═══════════════════════════════════════════════════════════════════
   BUILDER'S KNOWLEDGE GARDEN — HOMEPAGE
   Conversion-focused landing page with scroll animations,
   animated demo, 8-lane visualization, social proof, pricing teaser.
   ═══════════════════════════════════════════════════════════════════ */

// ── Intersection Observer hook ──────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Stagger children wrapper ────────────────────────────────────────
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } } as const;
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as const } },
} as const;

// ═══ DATA ═══════════════════════════════════════════════════════════

const PHASES = [
  { label: "DREAM", color: "#D85A30", icon: "💭", desc: "Describe what you want to build — in words, photos, or voice. AI creates a full concept in 60 seconds." },
  { label: "DESIGN", color: "#7F77DD", icon: "📐", desc: "Architect matching, BIM modeling, code compliance checks, material selection, energy modeling." },
  { label: "PLAN", color: "#1D9E75", icon: "📋", desc: "AI estimating, smart scheduling, jurisdiction-aware permits, financing, AI contract drafting." },
  { label: "BUILD", color: "#378ADD", icon: "🏗️", desc: "Voice field reporting, daily ops, safety briefings, drone progress tracking, supply chain management." },
  { label: "DELIVER", color: "#BA7517", icon: "🏠", desc: "Punch list, commissioning, digital twin handoff, as-built docs, client portal, warranty tracking." },
  { label: "GROW", color: "#639922", icon: "📈", desc: "AEC-native CRM, portfolio analytics, business intelligence, team training, reputation building." },
];

const DEMO_SCREENS = [
  { title: "Dream Builder", sub: "Describe your vision — watch it become a plan", color: "#D85A30", mockContent: "dream" as const },
  { title: "Smart Project Launcher", sub: "AI generates estimates, schedules, and compliance in seconds", color: "#1D9E75", mockContent: "launcher" as const },
  { title: "Knowledge Database", sub: "2,200+ building codes, materials, methods — all searchable", color: "#7F77DD", mockContent: "knowledge" as const },
  { title: "AI Copilot", sub: "Any construction question. Cited, jurisdiction-aware answers.", color: "#378ADD", mockContent: "copilot" as const },
];

const FEATURES = [
  { name: "Dream Builder", tag: "FREE — VIRAL ENTRY", desc: "Describe your dream in words, photos, or voice. Walk through a building you love. AI generates a full concept with cost estimate, timeline, and next steps — in 60 seconds.", color: "#D85A30", href: "/dream", icon: "✨" },
  { name: "Smart Project Launcher", tag: "THE AI COO", desc: "Your AI superhuman Chief Operating Officer. One-click project creation with auto-populated codes, phases, permits, materials, and CSI-division estimates. Full manual control when you need it.", color: "#1D9E75", href: "/launch", icon: "🚀" },
  { name: "Knowledge Database", tag: "2,200+ ENTITIES", desc: "The world's construction encyclopedia. Building codes, materials, methods, safety regulations — all searchable, all jurisdiction-aware, growing every day.", color: "#7F77DD", href: "/knowledge", icon: "📚" },
  { name: "AI Construction Copilot", tag: "VOICE + TEXT", desc: "Ask anything about construction. Get cited, jurisdiction-aware answers instantly. Works hands-free with voice input and response. 30+ languages.", color: "#378ADD", href: "#copilot", icon: "🧠" },
  { name: "Killer App CRM", tag: "FULL LIFECYCLE", desc: "Lead → proposal → contract → project → warranty. Pipeline dashboard, lead scoring, AI proposal generation — all enriched by the knowledge engine.", color: "#E8443A", href: "/killerapp", icon: "⚡" },
  { name: "Marketplace", tag: "COMING SOON", desc: "Every material in the knowledge engine connects to real suppliers. RFQ system, subcontractor network, Stripe Connect marketplace transactions.", color: "#639922", href: "/marketplace", icon: "🏪" },
];

const LANES = [
  { name: "Dreamer", emoji: "💭", desc: "Homeowners & first-time builders with a vision", color: "#D85A30" },
  { name: "Builder", emoji: "🏗️", desc: "General contractors running projects daily", color: "#1D9E75" },
  { name: "Specialist", emoji: "🔧", desc: "Architects, engineers, and licensed trades", color: "#7F77DD" },
  { name: "Merchant", emoji: "🏪", desc: "Material suppliers and equipment vendors", color: "#BA7517" },
  { name: "Ally", emoji: "🤝", desc: "Inspectors, lenders, insurers, and realtors", color: "#378ADD" },
  { name: "Crew", emoji: "👷", desc: "Skilled labor and on-site workforce", color: "#E8443A" },
  { name: "Fleet", emoji: "🚛", desc: "Heavy equipment and logistics operators", color: "#639922" },
  { name: "Machine", emoji: "🤖", desc: "AI agents, drones, and construction robots", color: "#888" },
];

const TESTIMONIALS = [
  { quote: "I described my dream house in three sentences and got a full project breakdown with cost estimates. This is what I've been looking for.", name: "Sarah M.", role: "First-time home builder", lane: "Dreamer" },
  { quote: "The knowledge database alone is worth it. I can look up code requirements across jurisdictions in seconds instead of hours.", name: "Marcus T.", role: "General Contractor, 15 years", lane: "Builder" },
  { quote: "Voice field reporting on-site is a game-changer. My crew can log daily progress without touching a keyboard.", name: "Lisa K.", role: "Project Manager", lane: "Specialist" },
  { quote: "Finally, a platform that understands the full pipeline from first conversation to warranty closeout. Not just another PM tool.", name: "David R.", role: "Owner, DR Construction", lane: "Builder" },
];

const STATS = [
  { value: 17, prefix: "$", suffix: "T", label: "Global construction economy" },
  { value: 2200, prefix: "", suffix: "+", label: "Knowledge entities" },
  { value: 142, prefix: "", suffix: "", label: "Jurisdictions covered" },
  { value: 6, prefix: "", suffix: "", label: "Lifecycle phases" },
];

const PRICING = [
  { tier: "Explorer", price: "Free", sub: "forever", target: "Everyone", features: ["Browse all knowledge", "5 AI queries/day", "Dream Builder", "Community access"], cta: "Start Free", href: "/pricing" },
  { tier: "Pro", price: "$49", sub: "/month", target: "Individual builder", features: ["Unlimited AI copilot", "5 active projects", "Estimating + scheduling", "Full marketplace access"], cta: "Start Building", href: "/pricing", highlight: true },
  { tier: "Team", price: "$199", sub: "/month", target: "Companies 5–50", features: ["Unlimited projects", "Team management", "Financial tools + CRM", "Voice field ops"], cta: "Start Team", href: "/pricing" },
  { tier: "Enterprise", price: "$499+", sub: "/month", target: "Large contractors", features: ["White-label + SSO", "Robot integration API", "Advanced analytics", "Dedicated support"], cta: "Contact Sales", href: "/pricing" },
];

const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "Dream Builder", href: "/dream" },
    { label: "Project Launcher", href: "/launch" },
    { label: "Knowledge Database", href: "/knowledge" },
    { label: "AI Copilot", href: "#copilot" },
    { label: "CRM", href: "/killerapp" },
    { label: "Marketplace", href: "/marketplace" },
  ],
  Company: [
    { label: "About", href: "/site/about" },
    { label: "Pricing", href: "/pricing" },
    { label: "Blog", href: "/site/blog" },
    { label: "Careers", href: "/site/careers" },
  ],
  Resources: [
    { label: "Documentation", href: "/documents" },
    { label: "API", href: "/mcp" },
    { label: "Community", href: "/site/community" },
    { label: "Contact", href: "/site/contact" },
  ],
};

// ═══ MINI COMPONENTS ═════════════════════════════════════════════════

function GradientOrb({ color, size, top, left, delay = 0 }: { color: string; size: number; top: string; left: string; delay?: number }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.28, 0.18] }}
      transition={{ duration: 6, repeat: Infinity, delay, ease: "easeInOut" }}
      style={{
        position: "absolute", top, left, width: size, height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
        filter: "blur(40px)", pointerEvents: "none", zIndex: 0,
      }}
    />
  );
}

/* ── Animated demo screens ── */

function DemoScreen({ screen, isActive }: { screen: typeof DEMO_SCREENS[number]; isActive: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 0.96 }}
      transition={{ duration: 0.5 }}
      style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", pointerEvents: isActive ? "auto" : "none" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px", background: "var(--bg-tertiary)", borderRadius: "12px 12px 0 0", borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
        <div style={{ flex: 1, marginLeft: 8, padding: "5px 12px", borderRadius: 6, background: "var(--bg)", fontSize: 11, color: "var(--fg-tertiary)", border: "1px solid var(--border)" }}>
          builders.theknowledgegardens.com
        </div>
      </div>
      <div style={{ flex: 1, padding: 20, background: "var(--bg)", borderRadius: "0 0 12px 12px", overflow: "hidden", position: "relative" }}>
        {screen.mockContent === "dream" && <DreamMockUI color={screen.color} />}
        {screen.mockContent === "launcher" && <LauncherMockUI color={screen.color} />}
        {screen.mockContent === "knowledge" && <KnowledgeMockUI color={screen.color} />}
        {screen.mockContent === "copilot" && <CopilotMockUI color={screen.color} />}
      </div>
    </motion.div>
  );
}

function DreamMockUI({ color }: { color: string }) {
  const [typing, setTyping] = useState(0);
  const text = "I want to build a modern farmhouse in Asheville, NC with 3 bedrooms and a big porch";
  useEffect(() => {
    const t = setInterval(() => setTyping(p => p < text.length ? p + 1 : p), 45);
    return () => clearInterval(t);
  }, [text.length]);

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>What&apos;s your dream?</div>
      <div style={{ fontSize: 12, color: "var(--fg-tertiary)", marginBottom: 16 }}>Describe your vision in your own words</div>
      <div style={{ padding: "14px 16px", borderRadius: 10, border: `2px solid ${color}40`, background: `${color}08`, fontSize: 14, lineHeight: 1.6, minHeight: 60 }}>
        {text.slice(0, typing)}
        <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }} style={{ display: "inline-block", width: 2, height: 16, background: color, marginLeft: 1, verticalAlign: "text-bottom" }} />
      </div>
      {typing >= text.length && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {["Modern Farmhouse", "$385K estimate", "8-month timeline"].map((label, i) => (
              <motion.div key={label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.15 }}
                style={{ padding: "10px 12px", borderRadius: 8, background: `${color}12`, border: `1px solid ${color}30`, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color }}>{label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function LauncherMockUI({ color }: { color: string }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setProgress(p => p < 100 ? p + 2 : p), 50);
    return () => clearInterval(t);
  }, []);
  const items = [
    { label: "Building codes loaded", threshold: 15 },
    { label: "Cost estimate generated", threshold: 35 },
    { label: "Schedule created", threshold: 55 },
    { label: "Permits identified", threshold: 75 },
    { label: "Team requirements set", threshold: 95 },
  ];

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Launching: Modern Farmhouse</div>
      <div style={{ fontSize: 11, color: "var(--fg-tertiary)", marginBottom: 16 }}>Asheville, NC — Buncombe County</div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--bg-tertiary)", overflow: "hidden", marginBottom: 16 }}>
        <motion.div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${color}, ${color}cc)`, width: `${progress}%` }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, opacity: progress >= item.threshold ? 1 : 0.3, transition: "opacity 0.3s" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, background: progress >= item.threshold ? `${color}20` : "var(--bg-tertiary)", color: progress >= item.threshold ? color : "var(--fg-tertiary)", border: `1px solid ${progress >= item.threshold ? color + "40" : "var(--border)"}` }}>
              {progress >= item.threshold ? "✓" : "·"}
            </div>
            <span style={{ fontSize: 13, fontWeight: progress >= item.threshold ? 500 : 400 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KnowledgeMockUI({ color }: { color: string }) {
  const entries = [
    { type: "CODE", title: "IRC R301.2 — Wind Speed Requirements", jurisdiction: "International" },
    { type: "MATERIAL", title: "Fiber Cement Siding — HardiePlank", jurisdiction: "All US" },
    { type: "METHOD", title: "Continuous Insulation (CI) Installation", jurisdiction: "Energy Code" },
    { type: "SAFETY", title: "Fall Protection — OSHA 1926.502", jurisdiction: "Federal" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, color: "var(--fg-tertiary)" }}>Search codes, materials, safety...</div>
        <div style={{ padding: "8px 14px", borderRadius: 8, background: color, color: "#fff", fontSize: 13, fontWeight: 500 }}>Search</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {entries.map((e, i) => (
          <motion.div key={e.title} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.12 }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)" }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: `${color}15`, color, letterSpacing: 0.5 }}>{e.type}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{e.title}</div>
              <div style={{ fontSize: 10, color: "var(--fg-tertiary)" }}>{e.jurisdiction}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CopilotMockUI({ color }: { color: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = [setTimeout(() => setStep(1), 800), setTimeout(() => setStep(2), 1800)];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ alignSelf: "flex-end", padding: "10px 14px", borderRadius: "12px 12px 4px 12px", background: `${color}15`, border: `1px solid ${color}30`, fontSize: 13, maxWidth: "80%" }}>
        Do I need a vapor barrier under my slab in North Carolina?
      </div>
      {step >= 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ alignSelf: "flex-start", padding: "10px 14px", borderRadius: "12px 12px 12px 4px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", fontSize: 13, maxWidth: "85%", lineHeight: 1.5 }}>
          {step >= 2 ? (
            <>
              <strong>Yes.</strong> Per NC Residential Code R506.2.3, a minimum 6-mil polyethylene vapor retarder is required between the subgrade and the concrete slab.
              <div style={{ marginTop: 8, fontSize: 10, color, fontWeight: 500 }}>Cited: NC Building Code R506.2.3</div>
            </>
          ) : (
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ display: "flex", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, opacity: 0.6 }} />
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, opacity: 0.3 }} />
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ═══ MAIN PAGE ═══════════════════════════════════════════════════════

export default function Home() {
  const router = useRouter();
  const [heroSearch, setHeroSearch] = useState("");
  const [activeDemo, setActiveDemo] = useState(0);
  const [activePhase, setActivePhase] = useState(0);
  const [activeLane, setActiveLane] = useState<number | null>(null);

  const stats = useInView(0.2);
  const demo = useInView(0.1);
  const lifecycle = useInView(0.1);
  const features = useInView(0.1);
  const lanes = useInView(0.1);
  const testimonials = useInView(0.1);
  const pricingSection = useInView(0.1);

  // Auto-cycle demo
  useEffect(() => {
    if (!demo.visible) return;
    const t = setInterval(() => setActiveDemo(d => (d + 1) % DEMO_SCREENS.length), 5000);
    return () => clearInterval(t);
  }, [demo.visible]);

  // Auto-cycle lifecycle
  useEffect(() => {
    if (!lifecycle.visible) return;
    const t = setInterval(() => setActivePhase(p => (p + 1) % 6), 3500);
    return () => clearInterval(t);
  }, [lifecycle.visible]);

  // Parallax for hero
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", overflow: "hidden" }}>
      <GamificationStyles />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: HERO
          ═══════════════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", overflow: "hidden", background: "linear-gradient(170deg, #0a1628 0%, #122035 30%, #0d1a2e 60%, #091420 100%)" }}>
        <GradientOrb color="#D85A30" size={500} top="-10%" left="-5%" delay={0} />
        <GradientOrb color="#1D9E75" size={400} top="50%" left="70%" delay={2} />
        <GradientOrb color="#7F77DD" size={350} top="20%" left="80%" delay={4} />
        <GradientOrb color="#378ADD" size={300} top="70%" left="10%" delay={1} />

        {/* Subtle grid */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, opacity: 0.04, backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        {/* Nav */}
        <nav style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image src="/logo/b_transparent_512.png" alt="Builder's Knowledge Garden" width={36} height={36} style={{ borderRadius: 8 }} />
            <span className="hero-brand" style={{ color: "#fff", fontWeight: 600, fontSize: 14, letterSpacing: 0.3 }}>Builder&apos;s Knowledge Garden</span>
          </div>
          <div className="hero-links" style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Link href="/knowledge" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>Knowledge</Link>
            <Link href="/dream" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>Dream</Link>
            <Link href="/pricing" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>Pricing</Link>
            <Link href="/login" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>Log in</Link>
            <Link href="/launch" style={{ padding: "9px 20px", borderRadius: 24, background: "linear-gradient(135deg, #1D9E75, #178a66)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none", boxShadow: "0 4px 16px rgba(29,158,117,0.3)" }}>
              Start Building
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <motion.div style={{ y: heroY, opacity: heroOpacity }}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "0 24px", maxWidth: 780 }}
          >
            {/* Badge */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.5 }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 18px", borderRadius: 24, background: "rgba(29,158,117,0.15)", border: "1px solid rgba(29,158,117,0.3)", marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5DCAA5", animation: "pulse 2s infinite" }} />
              <span style={{ color: "#5DCAA5", fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>The Operating System for Construction</span>
            </motion.div>

            <h1 style={{ color: "#fff", fontSize: "clamp(36px, 5.5vw, 64px)", fontWeight: 800, lineHeight: 1.08, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
              Every phase of building.
              <br />
              <span style={{ background: "linear-gradient(135deg, #5DCAA5 0%, #1D9E75 40%, #7F77DD 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                One platform.
              </span>
            </h1>

            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "clamp(15px, 1.8vw, 18px)", lineHeight: 1.65, margin: "0 auto 36px", maxWidth: 560 }}>
              From the first spark of an idea to the final invoice. AI-native project management, knowledge, and tools for the $17 trillion construction economy.
            </p>

            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
              <Link href="/dream" style={{ padding: "15px 36px", borderRadius: 28, background: "linear-gradient(135deg, #D85A30, #E87040)", color: "#fff", fontSize: 15, fontWeight: 600, textDecoration: "none", boxShadow: "0 8px 32px rgba(216,90,48,0.35), inset 0 1px 0 rgba(255,255,255,0.15)" }}>
                Start Dreaming — Free
              </Link>
              <Link href="/launch" style={{ padding: "15px 36px", borderRadius: 28, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 15, fontWeight: 500, textDecoration: "none", backdropFilter: "blur(8px)" }}>
                Launch a Project
              </Link>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (heroSearch.trim()) router.push(`/knowledge?q=${encodeURIComponent(heroSearch.trim())}`); }}
              style={{ display: "flex", gap: 8, maxWidth: 500, margin: "0 auto" }}>
              <input type="text" value={heroSearch} onChange={e => setHeroSearch(e.target.value)}
                placeholder="Search codes, materials, safety regulations..."
                style={{ flex: 1, padding: "13px 20px", borderRadius: 24, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, outline: "none", backdropFilter: "blur(8px)" }} />
              <button type="submit" style={{ padding: "13px 22px", borderRadius: 24, background: "rgba(29,158,117,0.8)", color: "#fff", border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Search</button>
            </form>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", bottom: 32, zIndex: 10, color: "rgba(255,255,255,0.4)", fontSize: 11, textAlign: "center" }}>
          <div style={{ width: 24, height: 38, borderRadius: 12, border: "2px solid rgba(255,255,255,0.2)", margin: "0 auto 8px", position: "relative" }}>
            <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: 4, height: 8, borderRadius: 2, background: "rgba(255,255,255,0.4)", position: "absolute", top: 6, left: "50%", marginLeft: -2 }} />
          </div>
          Scroll to explore
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: STATS BAR
          ═══════════════════════════════════════════════════════════════ */}
      <section ref={stats.ref} style={{ padding: "64px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
        <div className="stats-grid" style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {STATS.map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={stats.visible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: "var(--accent)", lineHeight: 1, letterSpacing: "-0.02em" }}>
                {stats.visible ? <AnimCounter value={s.value} prefix={s.prefix} suffix={s.suffix} duration={1200} /> : `${s.prefix}0${s.suffix}`}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 6, color: "var(--fg-secondary)" }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: ANIMATED DEMO / PREVIEW
          ═══════════════════════════════════════════════════════════════ */}
      <section ref={demo.ref} style={{ padding: "100px 24px", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={demo.visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
            style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#D85A30", fontWeight: 600 }}>See It In Action</span>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 700, margin: "8px 0 12px" }}>From sketch to job site in minutes</h2>
            <p style={{ fontSize: 15, color: "var(--fg-secondary)", maxWidth: 520, margin: "0 auto" }}>
              Watch how a single idea becomes a running project. AI handles the grunt work — you stay in control.
            </p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" animate={demo.visible ? "visible" : "hidden"}
            style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 24, alignItems: "start" }} className="demo-layout">
            {/* Demo sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DEMO_SCREENS.map((s, i) => (
                <motion.button key={s.title} variants={fadeUp} onClick={() => setActiveDemo(i)}
                  style={{ textAlign: "left", padding: "14px 16px", borderRadius: 12, cursor: "pointer", background: activeDemo === i ? "var(--bg)" : "transparent", border: activeDemo === i ? `1px solid ${s.color}40` : "1px solid transparent", boxShadow: activeDemo === i ? `0 4px 16px ${s.color}12` : "none", transition: "all 0.25s ease" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: activeDemo === i ? s.color : "var(--fg)", marginBottom: 3, transition: "color 0.2s" }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-tertiary)", lineHeight: 1.4 }}>{s.sub}</div>
                  {activeDemo === i && <motion.div layoutId="demo-indicator" style={{ height: 3, borderRadius: 2, background: s.color, marginTop: 10 }} />}
                </motion.button>
              ))}
            </div>

            {/* Demo viewport */}
            <motion.div variants={fadeUp}
              style={{ position: "relative", height: 380, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg)", boxShadow: "0 8px 40px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              {DEMO_SCREENS.map((s, i) => (
                <DemoScreen key={s.title} screen={s} isActive={activeDemo === i} />
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: FULL LIFECYCLE
          ═══════════════════════════════════════════════════════════════ */}
      <section ref={lifecycle.ref} style={{ padding: "100px 24px", background: "var(--bg)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={lifecycle.visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
            style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--accent)", fontWeight: 600 }}>The Full Lifecycle</span>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 700, margin: "8px 0 12px" }}>Every competitor covers a sliver. We cover everything.</h2>
            <p style={{ fontSize: 15, color: "var(--fg-secondary)", maxWidth: 520, margin: "0 auto" }}>
              From the moment you dream it to the day you grow your portfolio. One platform, six phases, zero gaps.
            </p>
          </motion.div>

          {/* Phase pills */}
          <div className="phase-timeline" style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 40, flexWrap: "wrap" }}>
            {PHASES.map((p, i) => (
              <motion.button key={p.label} onClick={() => setActivePhase(i)}
                initial={{ opacity: 0, scale: 0.8 }} animate={lifecycle.visible ? { opacity: 1, scale: 1 } : {}} transition={{ delay: i * 0.06, duration: 0.35 }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 24, cursor: "pointer", border: "none", background: activePhase === i ? p.color : "var(--bg-tertiary)", color: activePhase === i ? "#fff" : "var(--fg-secondary)", fontSize: 12, fontWeight: 600, letterSpacing: 0.5, transition: "all 0.25s ease", boxShadow: activePhase === i ? `0 4px 16px ${p.color}30` : "none" }}>
                <span style={{ fontSize: 15 }}>{p.icon}</span>
                {p.label}
              </motion.button>
            ))}
          </div>

          {/* Active phase card */}
          <AnimatePresence mode="wait">
            <motion.div key={activePhase} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}
              style={{ maxWidth: 600, margin: "0 auto", padding: 32, borderRadius: 16, background: "var(--bg-secondary)", border: `1px solid ${PHASES[activePhase].color}25`, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{PHASES[activePhase].icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: PHASES[activePhase].color, textTransform: "uppercase", marginBottom: 8 }}>{PHASES[activePhase].label}</div>
              <p style={{ fontSize: 15, color: "var(--fg-secondary)", lineHeight: 1.65, margin: 0 }}>{PHASES[activePhase].desc}</p>
            </motion.div>
          </AnimatePresence>

          {/* Phase dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 24 }}>
            {PHASES.map((p, i) => (
              <div key={i} style={{ width: activePhase === i ? 24 : 8, height: 8, borderRadius: 4, background: activePhase === i ? p.color : "var(--border)", transition: "all 0.3s ease" }} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5: FEATURE SHOWCASE
          ═══════════════════════════════════════════════════════════════ */}
      <section ref={features.ref} style={{ padding: "100px 24px", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={features.visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
            style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#7F77DD", fontWeight: 600 }}>The Platform</span>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 700, margin: "8px 0 12px" }}>One knowledge engine. Six killer products.</h2>
            <p style={{ fontSize: 15, color: "var(--fg-secondary)", maxWidth: 520, margin: "0 auto" }}>
              Each does the job alone. Together they cover the full build — from first dream through final invoice.
            </p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" animate={features.visible ? "visible" : "hidden"}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {FEATURES.map((f) => (
              <motion.div key={f.name} variants={fadeUp} whileHover={{ y: -4, boxShadow: `0 12px 40px ${f.color}12` }}
                style={{ padding: 24, borderRadius: 16, background: "var(--bg)", border: "1px solid var(--border)", cursor: "pointer", transition: "border-color 0.2s" }}
                onClick={() => router.push(f.href)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = f.color + "40"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: `${f.color}10`, border: `1px solid ${f.color}20` }}>{f.icon}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{f.name}</div>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: "2px 8px", borderRadius: 4, background: `${f.color}12`, color: f.color }}>{f.tag}</span>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6: THE 8 LANES
          ═══════════════════════════════════════════════════════════════ */}
      <section ref={lanes.ref} style={{ padding: "100px 24px", background: "var(--bg)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={lanes.visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
            style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#BA7517", fontWeight: 600 }}>Built for Everyone</span>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 700, margin: "8px 0 12px" }}>8 lanes. One platform.</h2>
            <p style={{ fontSize: 15, color: "var(--fg-secondary)", maxWidth: 520, margin: "0 auto" }}>
              Whether you&apos;re a first-time homeowner or an AI-powered robot, the platform adapts to how you work.
            </p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" animate={lanes.visible ? "visible" : "hidden"}
            className="lanes-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {LANES.map((lane, i) => (
              <motion.div key={lane.name} variants={fadeUp} whileHover={{ scale: 1.03, y: -4 }}
                onMouseEnter={() => setActiveLane(i)} onMouseLeave={() => setActiveLane(null)}
                style={{ padding: 20, borderRadius: 14, textAlign: "center", background: activeLane === i ? `${lane.color}08` : "var(--bg-secondary)", border: `1px solid ${activeLane === i ? lane.color + "35" : "var(--border)"}`, cursor: "default", transition: "all 0.25s ease" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 12px", background: `${lane.color}12`, border: `1px solid ${lane.color}20`, transition: "transform 0.3s ease", transform: activeLane === i ? "scale(1.1)" : "scale(1)" }}>{lane.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: activeLane === i ? lane.color : "var(--fg)" }}>{lane.name}</div>
                <div style={{ fontSize: 12, color: "var(--fg-tertiary)", lineHeight: 1.4 }}>{lane.desc}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7: SOCIAL PROOF
          ═══════════════════════════════════════════════════════════════ */}
      <section ref={testimonials.ref} style={{ padding: "100px 24px", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={testimonials.visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
            style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#E8443A", fontWeight: 600 }}>What Builders Say</span>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 700, margin: "8px 0 12px" }}>Trusted by builders who demand more</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" animate={testimonials.visible ? "visible" : "hidden"}
            className="testimonials-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {TESTIMONIALS.map((t) => (
              <motion.div key={t.name} variants={fadeUp}
                style={{ padding: 28, borderRadius: 16, background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 28, color: "var(--accent)", marginBottom: 12, lineHeight: 1 }}>&ldquo;</div>
                <p style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.65, margin: "0 0 16px", fontStyle: "italic" }}>{t.quote}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>{t.name.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-tertiary)" }}>{t.role}</div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 600, padding: "3px 10px", borderRadius: 4, background: "var(--bg-tertiary)", color: "var(--fg-tertiary)", letterSpacing: 0.5 }}>{t.lane}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 8: PRICING TEASER
          ═══════════════════════════════════════════════════════════════ */}
      <section ref={pricingSection.ref} style={{ padding: "100px 24px", background: "var(--bg)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={pricingSection.visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
            style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#D85A30", fontWeight: 600 }}>Transparent Pricing</span>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 700, margin: "8px 0 12px" }}>No &quot;request a demo&quot; games.</h2>
            <p style={{ fontSize: 15, color: "var(--fg-secondary)", maxWidth: 480, margin: "0 auto" }}>Procore charges $10K–$60K+/year. We deliver the full lifecycle at a fraction of the cost.</p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" animate={pricingSection.visible ? "visible" : "hidden"}
            className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {PRICING.map((p) => (
              <motion.div key={p.tier} variants={fadeUp} whileHover={{ y: -4 }}
                style={{ padding: 28, borderRadius: 16, textAlign: "center", background: "var(--bg)", border: p.highlight ? "2px solid var(--accent)" : "1px solid var(--border)", boxShadow: p.highlight ? "0 8px 40px rgba(29,158,117,0.1)" : "none", position: "relative" }}>
                {p.highlight && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", padding: "4px 14px", borderRadius: 12, background: "var(--accent)", color: "#fff" }}>Most Popular</div>
                )}
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--fg-tertiary)", marginBottom: 4 }}>{p.tier}</div>
                <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 0, letterSpacing: "-0.02em" }}>{p.price}</div>
                <div style={{ fontSize: 12, color: "var(--fg-tertiary)", marginBottom: 20 }}>{p.sub}</div>
                <div style={{ marginBottom: 20 }}>
                  {p.features.map((f, fi) => (
                    <div key={fi} style={{ fontSize: 12, color: "var(--fg-secondary)", padding: "5px 0", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                      <span style={{ color: "var(--accent)", fontSize: 11 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <Link href={p.href} style={{ display: "block", padding: "11px 24px", borderRadius: 24, background: p.highlight ? "var(--accent)" : "var(--bg-tertiary)", color: p.highlight ? "#fff" : "var(--fg)", fontSize: 13, fontWeight: 600, textDecoration: "none", transition: "all 0.2s" }}>{p.cta}</Link>
                <div style={{ fontSize: 10, color: "var(--fg-tertiary)", marginTop: 10 }}>{p.target}</div>
              </motion.div>
            ))}
          </motion.div>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <Link href="/pricing" style={{ fontSize: 14, color: "var(--accent)", fontWeight: 500, textDecoration: "none" }}>View full pricing details →</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 9: FINAL CTA
          ═══════════════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", padding: "120px 24px", textAlign: "center", overflow: "hidden", background: "linear-gradient(170deg, #0a1628 0%, #122035 50%, #0d1a2e 100%)" }}>
        <GradientOrb color="#D85A30" size={400} top="10%" left="5%" delay={0} />
        <GradientOrb color="#1D9E75" size={300} top="40%" left="75%" delay={2} />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, opacity: 0.03, backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }}
          style={{ position: "relative", zIndex: 10, maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ color: "#fff", fontSize: "clamp(28px, 4.5vw, 48px)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
            The $17 trillion gap
            <br />
            <span style={{ background: "linear-gradient(135deg, #5DCAA5, #1D9E75)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>nobody fills. Until now.</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 16, lineHeight: 1.65, marginBottom: 40 }}>
            $3B+ invested across 12+ contech companies. Each covers a sliver. Nobody owns the full lifecycle. That&apos;s the opportunity — and this is the platform.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/dream" style={{ padding: "16px 40px", borderRadius: 28, background: "linear-gradient(135deg, #D85A30, #E87040)", color: "#fff", fontSize: 16, fontWeight: 600, textDecoration: "none", boxShadow: "0 8px 32px rgba(216,90,48,0.35), inset 0 1px 0 rgba(255,255,255,0.15)" }}>
              Start Building Today
            </Link>
            <Link href="/onboard" style={{ padding: "16px 40px", borderRadius: 28, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 16, fontWeight: 500, textDecoration: "none", backdropFilter: "blur(8px)" }}>
              Take the Tour
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 10: FOOTER
          ═══════════════════════════════════════════════════════════════ */}
      <footer style={{ padding: "64px 24px 40px", borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Image src="/logo/b_transparent_512.png" alt="B" width={28} height={28} style={{ borderRadius: 6 }} />
                <span style={{ fontSize: 15, fontWeight: 700 }}>Builder&apos;s Knowledge Garden</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.6, maxWidth: 260, marginBottom: 16 }}>
                The operating system for the $17 trillion global construction economy. Every phase. One platform.
              </p>
              <div style={{ display: "flex", gap: 2, maxWidth: 180 }}>
                {["#D85A30", "#7F77DD", "#1D9E75", "#378ADD", "#BA7517", "#639922"].map((c, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: c, opacity: 0.6 }} />
                ))}
              </div>
            </div>
            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div key={title}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--fg-tertiary)", marginBottom: 14 }}>{title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {links.map(l => <Link key={l.href} href={l.href} style={{ fontSize: 13, color: "var(--fg-secondary)", textDecoration: "none" }}>{l.label}</Link>)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 11, color: "var(--fg-tertiary)", margin: 0 }}>DREAM → DESIGN → PLAN → BUILD → DELIVER → GROW</p>
            <p style={{ fontSize: 11, color: "var(--fg-tertiary)", margin: 0 }}>&copy; {new Date().getFullYear()} Builder&apos;s Knowledge Garden. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <CopilotPanel />

      {/* ═══ RESPONSIVE STYLES ═══ */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 768px) {
          .hero-brand { display: none !important; }
          .hero-links a:not(:last-child):not(:nth-last-child(2)) { display: none !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 20px !important; }
          .demo-layout { grid-template-columns: 1fr !important; }
          .demo-layout > div:first-child { display: flex !important; flex-direction: row !important; overflow-x: auto !important; gap: 6px !important; padding-bottom: 4px !important; }
          .demo-layout > div:first-child > button { min-width: 140px !important; flex-shrink: 0 !important; }
          .lanes-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 24px !important; }
          .phase-timeline { gap: 6px !important; }
          .phase-timeline button { padding: 8px 12px !important; font-size: 11px !important; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .lanes-grid { grid-template-columns: 1fr 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
          .phase-timeline button span { display: none !important; }
        }
      `}</style>
    </div>
  );
}
