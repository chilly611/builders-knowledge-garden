"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useSound } from "@/lib/sound-engine";

type Step = "welcome" | "who" | "goal" | "celebrate";

interface LaneOption {
  id: string;
  label: string;
  tagline: string;
  icon: string;
  color: string;
  img: string;
  features: string[];
}

const LANES: LaneOption[] = [
  {
    id: "diy", label: "I Want to Build Something", tagline: "Homeowner, dreamer, first-time builder",
    icon: "🏠", color: "#D85A30",
    img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80&fit=crop",
    features: ["Dream Builder — describe what you want", "Instant cost estimates", "Find contractors near you", "Understand codes & permits"],
  },
  {
    id: "gc", label: "I Build for a Living", tagline: "General contractor, builder, developer",
    icon: "🏗️", color: "#1D9E75",
    img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80&fit=crop",
    features: ["Smart Project Launcher", "AI estimating & scheduling", "CRM & pipeline management", "Code compliance by jurisdiction"],
  },
  {
    id: "specialty", label: "Specialty Contractor", tagline: "Electrician, plumber, HVAC, roofer",
    icon: "⚡", color: "#7F77DD",
    img: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&fit=crop",
    features: ["Trade-specific knowledge", "Lead generation", "Certification tracking", "Voice field reports"],
  },
  {
    id: "supplier", label: "I Sell Materials or Services", tagline: "Supplier, vendor, architect, engineer",
    icon: "🏪", color: "#378ADD",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80&fit=crop",
    features: ["Marketplace listings", "RFQ responses", "Product catalog", "Contractor connections"],
  },
];

interface GoalOption {
  id: string; label: string; desc: string; icon: string; route: string;
}

const GOALS_BY_LANE: Record<string, GoalOption[]> = {
  diy: [
    { id: "dream", label: "Describe my dream", desc: "Tell us what you want — get a plan in 60 seconds", icon: "💭", route: "/dream/describe" },
    { id: "browse", label: "Get inspired", desc: "Browse beautiful architecture and save what you love", icon: "📷", route: "/dream/browse" },
    { id: "learn", label: "Learn about building", desc: "Explore codes, materials, and methods", icon: "📚", route: "/knowledge" },
    { id: "cost", label: "How much will it cost?", desc: "Get a quick estimate for your project", icon: "💰", route: "/launch" },
  ],
  gc: [
    { id: "launch", label: "Launch a project", desc: "Building type → jurisdiction → full dashboard in seconds", icon: "🚀", route: "/launch" },
    { id: "estimate", label: "Quick estimate", desc: "Get a CSI MasterFormat cost breakdown", icon: "📊", route: "/launch" },
    { id: "codes", label: "Look up a code", desc: "Search IBC, NEC, OSHA across jurisdictions", icon: "📋", route: "/knowledge" },
    { id: "crm", label: "Manage my pipeline", desc: "Track leads, proposals, and projects", icon: "⚡", route: "/killerapp" },
  ],
  specialty: [
    { id: "launch", label: "Start a project", desc: "Set up your next job with codes and scheduling", icon: "🚀", route: "/launch" },
    { id: "codes", label: "Check trade codes", desc: "NEC, IPC, IMC — jurisdiction-specific", icon: "📋", route: "/knowledge" },
    { id: "safety", label: "Safety briefing", desc: "Generate a task-specific safety briefing", icon: "⛑️", route: "/knowledge" },
    { id: "crm", label: "Track my leads", desc: "Pipeline from conversation to completion", icon: "⚡", route: "/killerapp" },
  ],
  supplier: [
    { id: "list", label: "List my products", desc: "Get in front of contractors and builders", icon: "🏪", route: "/marketplace" },
    { id: "browse", label: "See what's needed", desc: "Browse active projects and material needs", icon: "🔍", route: "/marketplace" },
    { id: "connect", label: "Find contractors", desc: "Connect with builders who need your products", icon: "🤝", route: "/killerapp" },
    { id: "learn", label: "Explore the knowledge base", desc: "500+ entities of construction intelligence", icon: "📚", route: "/knowledge" },
  ],
};

export default function OnboardPage() {
  const router = useRouter();
  const { play } = useSound();
  const [step, setStep] = useState<Step>("welcome");
  const [lane, setLane] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const existing = localStorage.getItem("bkg-lane");
    if (existing) { setLane(existing); setStep("goal"); }
  }, []);

  const selectedLane = LANES.find(l => l.id === lane);
  const goals = lane ? (GOALS_BY_LANE[lane] || GOALS_BY_LANE.diy) : [];

  const selectLane = (id: string) => {
    setLane(id);
    localStorage.setItem("bkg-lane", id);
    play("select");
    setTimeout(() => setStep("goal"), 300);
  };

  const selectGoal = (route: string) => {
    play("celebrate");
    setStep("celebrate");
    setTimeout(() => router.push(route), 1800);
  };

  if (!mounted) return <div style={{ minHeight: "100vh", background: "#fff" }} />;

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      {/* Progress dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "24px 0 0" }}>
        {(["welcome", "who", "goal"] as Step[]).map((s, i) => {
          const steps: Step[] = ["welcome", "who", "goal"];
          const currentIdx = steps.indexOf(step === "celebrate" ? "goal" : step);
          const thisIdx = i;
          return (
            <div key={s} style={{
              width: thisIdx <= currentIdx ? 24 : 8, height: 8, borderRadius: 4,
              background: thisIdx <= currentIdx ? "var(--accent, #1D9E75)" : "#e2e4e8",
              transition: "all 0.3s ease",
            }} />
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ═══ STEP 1: WELCOME ═══ */}
        {step === "welcome" && (
          <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
            <Image src="/logo/b_transparent_512.png" alt="B" width={64} height={64} style={{ marginBottom: 24 }} />
            <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 800, color: "#111", lineHeight: 1.15, marginBottom: 12 }}>
              Welcome to the<br />
              <span style={{ color: "var(--accent, #1D9E75)" }}>Builder&apos;s Knowledge Garden</span>
            </h1>
            <p style={{ fontSize: 16, color: "#666", maxWidth: 420, margin: "0 auto 32px", lineHeight: 1.6 }}>
              The AI-powered platform for building anything, anywhere. Let&apos;s personalize your experience in 30 seconds.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}
              onClick={() => { play("navigate"); setStep("who"); }}
              style={{
                padding: "16px 48px", borderRadius: 28, border: "none",
                background: "linear-gradient(135deg, #1D9E75, #0F6E56)",
                color: "#fff", fontSize: 17, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 8px 30px rgba(29,158,117,0.3)",
              }}>
              Get Started
            </motion.button>
            <p style={{ fontSize: 12, color: "#999", marginTop: 16 }}>Takes less than 30 seconds</p>
          </motion.div>
        )}

        {/* ═══ STEP 2: WHO ARE YOU? ═══ */}
        {step === "who" && (
          <motion.div key="who" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            style={{ flex: 1, padding: "32px 24px", maxWidth: 800, margin: "0 auto", width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: "#111", marginBottom: 8 }}>What brings you here?</h2>
              <p style={{ fontSize: 15, color: "#666" }}>Choose the option that fits best. You can always change later.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {LANES.map((l, i) => (
                <motion.button key={l.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.3 }}
                  whileHover={{ y: -4 }}
                  onClick={() => selectLane(l.id)}
                  style={{
                    borderRadius: 16, overflow: "hidden", border: lane === l.id ? `2px solid ${l.color}` : "1px solid #e2e4e8",
                    background: "#fff", cursor: "pointer", textAlign: "left", padding: 0,
                    boxShadow: lane === l.id ? `0 4px 20px ${l.color}25` : "0 2px 8px rgba(0,0,0,0.04)",
                    transition: "all 0.2s",
                  }}>
                  {/* Photo */}
                  <div style={{ height: 120, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${l.img})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 30%, ${l.color}cc 100%)` }} />
                    <div style={{ position: "absolute", bottom: 10, left: 14, fontSize: 28 }}>{l.icon}</div>
                    {lane === l.id && (
                      <div style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: "50%", background: l.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700 }}>✓</div>
                    )}
                  </div>
                  {/* Text */}
                  <div style={{ padding: "14px 16px 16px" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 2 }}>{l.label}</div>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{l.tagline}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {l.features.map((f, fi) => (
                        <div key={fi} style={{ fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: l.color, fontSize: 10 }}>●</span> {f}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 3: WHAT DO YOU WANT TO DO? ═══ */}
        {step === "goal" && selectedLane && (
          <motion.div key="goal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            style={{ flex: 1, padding: "32px 24px", maxWidth: 700, margin: "0 auto", width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{selectedLane.icon}</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", marginBottom: 6 }}>
                What would you like to do first?
              </h2>
              <p style={{ fontSize: 14, color: "#888" }}>
                as a <span style={{ color: selectedLane.color, fontWeight: 600 }}>{selectedLane.label}</span>
                <button onClick={() => setStep("who")} style={{ background: "none", border: "none", color: "#aaa", fontSize: 12, marginLeft: 8, cursor: "pointer", textDecoration: "underline" }}>change</button>
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {goals.map((g, i) => (
                <motion.button key={g.id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.3 }}
                  whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectGoal(g.route)}
                  style={{
                    padding: "20px 18px", borderRadius: 16, border: "1px solid #e2e4e8",
                    background: "#fff", cursor: "pointer", textAlign: "left",
                    transition: "all 0.2s",
                  }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{g.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111", marginBottom: 4 }}>{g.label}</div>
                  <div style={{ fontSize: 12, color: "#888", lineHeight: 1.4 }}>{g.desc}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 4: CELEBRATION ═══ */}
        {step === "celebrate" && selectedLane && (
          <motion.div key="celebrate" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6 }}
              style={{ fontSize: 72, marginBottom: 20 }}>
              🎉
            </motion.div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#111", marginBottom: 8 }}>You&apos;re all set!</h2>
            <p style={{ fontSize: 15, color: "#666", maxWidth: 360 }}>
              Welcome to the Builder&apos;s Knowledge Garden. Your {selectedLane.label.toLowerCase()} dashboard is loading...
            </p>
            <motion.div animate={{ width: ["0%", "100%"] }} transition={{ duration: 1.5, ease: "easeInOut" }}
              style={{ height: 4, borderRadius: 2, background: selectedLane.color, marginTop: 24, maxWidth: 200 }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
