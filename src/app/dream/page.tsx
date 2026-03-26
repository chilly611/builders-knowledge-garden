"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cinzel, Outfit } from "next/font/google";
import CopilotPanel from "@/components/CopilotPanel";

// ═══════════════════════════════════════════════════════════════
// THE DREAM MACHINE — Entry Shell
// Chrome: Warm/Gold (#D85A30 → #C4A44A → #E8A83E)
// Aesthetic: Magical, immersive, game-like opening screen
// ═══════════════════════════════════════════════════════════════

const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "700", "900"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

// ── Dream path definitions ──────────────────────────────────────
interface DreamPath {
  id: string;
  route: string;
  icon: string;
  name: string;
  tagline: string;
  time: string;
  color: string;
  glow: string;
  laneWeights: Record<string, number>;
}

const DREAM_PATHS: DreamPath[] = [
  {
    id: "describe",
    route: "/dream/describe",
    icon: "✦",
    name: "Describe Your Dream",
    tagline: "Tell us what you want to build in your own words",
    time: "~60 seconds",
    color: "#E8A83E",
    glow: "rgba(232, 168, 62, 0.4)",
    laneWeights: { diy: 10, gc: 8, specialty: 7, supplier: 5, equipment: 5, service: 6, worker: 6, robot: 4 },
  },
  {
    id: "inspire",
    route: "/dream/inspire",
    icon: "◈",
    name: "Show Me Inspiration",
    tagline: "Upload photos or paste URLs — AI analyzes style, materials, layout",
    time: "~2 minutes",
    color: "#D85A30",
    glow: "rgba(216, 90, 48, 0.4)",
    laneWeights: { diy: 9, gc: 6, specialty: 6, supplier: 4, equipment: 3, service: 5, worker: 5, robot: 3 },
  },
  {
    id: "sketch",
    route: "/dream/sketch",
    icon: "△",
    name: "Sketch It Out",
    tagline: "Draw freehand — AI interprets your sketch into a floor plan",
    time: "~5 minutes",
    color: "#C4A44A",
    glow: "rgba(196, 164, 74, 0.4)",
    laneWeights: { diy: 6, gc: 7, specialty: 8, supplier: 3, equipment: 3, service: 4, worker: 4, robot: 5 },
  },
  {
    id: "explore",
    route: "/dream/explore",
    icon: "⬡",
    name: "Surprise Me",
    tagline: "Answer 5 quick questions — AI generates visual concepts for you",
    time: "~90 seconds",
    color: "#E07B3A",
    glow: "rgba(224, 123, 58, 0.4)",
    laneWeights: { diy: 8, gc: 5, specialty: 5, supplier: 4, equipment: 3, service: 5, worker: 7, robot: 6 },
  },
  {
    id: "browse",
    route: "/dream/browse",
    icon: "◉",
    name: "Browse & Discover",
    tagline: "Infinite visual scroll — save, star, collect. AI learns your taste",
    time: "Open-ended",
    color: "#B8873B",
    glow: "rgba(184, 135, 59, 0.4)",
    laneWeights: { diy: 7, gc: 4, specialty: 6, supplier: 7, equipment: 4, service: 5, worker: 5, robot: 3 },
  },
  {
    id: "plans",
    route: "/dream/plans",
    icon: "⊞",
    name: "I Have Plans",
    tagline: "Upload DWG, PDF, or photos — we enrich with knowledge intelligence",
    time: "~10 minutes",
    color: "#9C7832",
    glow: "rgba(156, 120, 50, 0.4)",
    laneWeights: { diy: 3, gc: 10, specialty: 9, supplier: 6, equipment: 7, service: 8, worker: 4, robot: 8 },
  },
];

// ── Saved dream interface (localStorage) ───────────────────────
interface SavedDream {
  id: string;
  title: string;
  createdAt: string;
  growthStage: "seed" | "sprout" | "sapling" | "bloom";
  path: string;
  preview?: string;
}

// ── Lane-aware path ordering ───────────────────────────────────
function getOrderedPaths(lane: string | null): DreamPath[] {
  if (!lane) return DREAM_PATHS;
  return [...DREAM_PATHS].sort((a, b) => {
    const wa = a.laneWeights[lane] ?? 5;
    const wb = b.laneWeights[lane] ?? 5;
    return wb - wa;
  });
}

// ── Growth stage visuals ───────────────────────────────────────
const GROWTH_ICONS: Record<string, { icon: string; label: string }> = {
  seed: { icon: "🌱", label: "Seed" },
  sprout: { icon: "🌿", label: "Sprout" },
  sapling: { icon: "🌳", label: "Sapling" },
  bloom: { icon: "🌸", label: "Bloom" },
};

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function DreamMachinePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [lane, setLane] = useState<string | null>(null);
  const [dreams, setDreams] = useState<SavedDream[]>([]);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read lane from localStorage
    const storedLane = localStorage.getItem("bkg-lane");
    if (storedLane) setLane(storedLane);
    // Read saved dreams
    try {
      const raw = localStorage.getItem("bkg-dreams");
      if (raw) setDreams(JSON.parse(raw));
    } catch { /* ignore */ }
    // First visit detection
    const visited = localStorage.getItem("bkg-dream-visited");
    if (!visited) {
      setIsFirstVisit(true);
      localStorage.setItem("bkg-dream-visited", "1");
    }
  }, []);

  const orderedPaths = getOrderedPaths(lane);

  const handlePathClick = useCallback((path: DreamPath) => {
    router.push(path.route);
  }, [router]);

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "#1a0f05" }} />;
  }

  return (
    <>
      <style jsx global>{`
        @keyframes meshDrift {
          0% { background-position: 0% 50%, 100% 50%, 50% 0%; }
          25% { background-position: 50% 0%, 0% 100%, 100% 50%; }
          50% { background-position: 100% 50%, 50% 0%, 0% 100%; }
          75% { background-position: 50% 100%, 100% 0%, 50% 50%; }
          100% { background-position: 0% 50%, 100% 50%, 50% 0%; }
        }
        @keyframes floatEmber {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100vh) scale(0.3); opacity: 0; }
        }
        @keyframes titleGlow {
          0%, 100% { text-shadow: 0 0 40px rgba(232,168,62,0.3), 0 0 80px rgba(216,90,48,0.15); }
          50% { text-shadow: 0 0 60px rgba(232,168,62,0.5), 0 0 120px rgba(216,90,48,0.25); }
        }
        @keyframes cardEnter {
          0% { opacity: 0; transform: translateY(30px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes welcomeFade {
          0% { opacity: 0; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes subtitleReveal {
          0% { opacity: 0; letter-spacing: 0.3em; }
          100% { opacity: 1; letter-spacing: 0.15em; }
        }
        @keyframes gardenPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(29, 158, 117, 0.3); }
          50% { box-shadow: 0 0 0 8px rgba(29, 158, 117, 0); }
        }
        .dream-card {
          position: relative;
          cursor: pointer;
          border-radius: 20px;
          padding: 28px 24px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(20px);
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
          animation: cardEnter 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
        }
        .dream-card:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.07);
        }
        .dream-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }
        .dream-card:hover::before {
          opacity: 1;
        }
        .dream-card .card-icon {
          font-size: 2.8rem;
          line-height: 1;
          margin-bottom: 14px;
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .dream-card:hover .card-icon {
          transform: scale(1.15) rotate(5deg);
        }
        .dream-card .time-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 0.72rem;
          letter-spacing: 0.05em;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.6);
          margin-top: 12px;
        }
      `}</style>

      {/* ── Full-viewport Dream Machine ───────────────────────── */}
      <div style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        background: `
          radial-gradient(ellipse at 20% 30%, rgba(216,90,48,0.25) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 70%, rgba(196,164,74,0.2) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(232,168,62,0.15) 0%, transparent 60%),
          linear-gradient(135deg, #1a0f05 0%, #1e1208 30%, #15100a 60%, #0f0a05 100%)
        `,
        backgroundSize: "200% 200%, 200% 200%, 150% 150%, 100% 100%",
        animation: "meshDrift 20s ease-in-out infinite",
      }}>

        {/* ── Floating embers ─────────────────────────────────── */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            borderRadius: "50%",
            background: `rgba(${200 + Math.random() * 55}, ${120 + Math.random() * 80}, ${30 + Math.random() * 40}, ${0.4 + Math.random() * 0.3})`,
            left: `${5 + Math.random() * 90}%`,
            bottom: "-10px",
            animation: `floatEmber ${8 + Math.random() * 12}s linear ${Math.random() * 8}s infinite`,
            pointerEvents: "none",
          }} />
        ))}

        {/* ── First-visit welcome moment ──────────────────────── */}
        {isFirstVisit && !welcomeDismissed && (
          <div
            onClick={() => setWelcomeDismissed(true)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(10, 5, 2, 0.92)",
              backdropFilter: "blur(30px)",
              cursor: "pointer",
              animation: "welcomeFade 1.2s ease",
            }}
          >
            <div style={{ fontSize: "3.5rem", marginBottom: 20 }}>✦</div>
            <h2 className={cinzel.className} style={{
              fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
              color: "#E8A83E",
              textAlign: "center",
              lineHeight: 1.4,
              maxWidth: 500,
              animation: "titleGlow 3s ease-in-out infinite",
            }}>
              You&rsquo;ve been invited to dream
            </h2>
            <p className={outfit.className} style={{
              color: "rgba(255,255,255,0.5)",
              marginTop: 16,
              fontSize: "0.9rem",
              letterSpacing: "0.08em",
            }}>tap anywhere to begin</p>
          </div>
        )}

        {/* ── Content container ───────────────────────────────── */}
        <div style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(40px, 8vh, 80px) 20px 60px",
        }}>

          {/* ── Hero title ─────────────────────────────────────── */}
          <div style={{ textAlign: "center", marginBottom: "clamp(40px, 6vh, 64px)" }}>
            <p className={outfit.className} style={{
              fontSize: "0.75rem",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "rgba(232, 168, 62, 0.6)",
              marginBottom: 12,
              animation: "subtitleReveal 1s ease 0.3s backwards",
            }}>
              Builder&rsquo;s Knowledge Garden
            </p>
            <h1 className={cinzel.className} style={{
              fontSize: "clamp(2rem, 5.5vw, 3.8rem)",
              fontWeight: 900,
              color: "#E8A83E",
              lineHeight: 1.15,
              animation: "titleGlow 4s ease-in-out infinite",
              marginBottom: 16,
            }}>
              The Dream Machine
            </h1>
            <p className={outfit.className} style={{
              fontSize: "clamp(0.95rem, 2vw, 1.15rem)",
              color: "rgba(255,255,255,0.55)",
              maxWidth: 520,
              margin: "0 auto",
              lineHeight: 1.6,
              fontWeight: 300,
            }}>
              Every great building begins as a feeling. Choose how you want to begin.
            </p>
          </div>

          {/* ── Path cards — creative asymmetric layout ─────────── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
            maxWidth: 980,
            margin: "0 auto",
          }}>
            {orderedPaths.map((path, i) => (
              <div
                key={path.id}
                className="dream-card"
                data-sound="select"
                role="button"
                tabIndex={0}
                aria-label={`${path.name} — ${path.tagline}`}
                onClick={() => handlePathClick(path)}
                onKeyDown={(e) => e.key === "Enter" && handlePathClick(path)}
                onMouseEnter={() => setHoveredPath(path.id)}
                onMouseLeave={() => setHoveredPath(null)}
                style={{
                  animationDelay: `${i * 0.1 + 0.2}s`,
                  ...(hoveredPath === path.id ? {
                    boxShadow: `0 0 40px ${path.glow}, 0 8px 32px rgba(0,0,0,0.3)`,
                  } : {}),
                }}
              >
                {/* Glow overlay */}
                <div style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 20,
                  background: `radial-gradient(ellipse at 50% 0%, ${path.glow} 0%, transparent 70%)`,
                  opacity: hoveredPath === path.id ? 1 : 0,
                  transition: "opacity 0.4s ease",
                  pointerEvents: "none",
                }} />

                <div style={{ position: "relative", zIndex: 1 }}>
                  <div className="card-icon" style={{
                    color: path.color,
                    filter: `drop-shadow(0 0 12px ${path.glow})`,
                  }}>{path.icon}</div>

                  <h3 className={outfit.className} style={{
                    fontSize: "1.15rem",
                    fontWeight: 600,
                    color: "#fff",
                    marginBottom: 6,
                    letterSpacing: "-0.01em",
                  }}>{path.name}</h3>

                  <p className={outfit.className} style={{
                    fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.5)",
                    lineHeight: 1.5,
                    fontWeight: 300,
                  }}>{path.tagline}</p>

                  <span className="time-badge">{path.time}</span>
                </div>

                {/* Lane-priority indicator (top-right) */}
                {lane && (path.laneWeights[lane] ?? 5) >= 9 && (
                  <div style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    fontSize: "0.65rem",
                    letterSpacing: "0.06em",
                    color: path.color,
                    opacity: 0.7,
                    fontWeight: 500,
                  }} className={outfit.className}>RECOMMENDED</div>
                )}
              </div>
            ))}
          </div>

          {/* ── Dream Garden — returning user seeds ────────────── */}
          {dreams.length > 0 && (
            <div style={{
              marginTop: 56,
              padding: "28px 24px",
              borderRadius: 20,
              background: "rgba(29, 158, 117, 0.06)",
              border: "1px solid rgba(29, 158, 117, 0.15)",
              backdropFilter: "blur(12px)",
              animation: "cardEnter 0.8s ease 0.8s backwards",
            }}>
              <h3 className={outfit.className} style={{
                fontSize: "0.85rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#1D9E75",
                marginBottom: 16,
                fontWeight: 600,
              }}>Your Garden</h3>

              <div style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
              }}>
                {dreams.slice(0, 6).map((dream) => {
                  const stage = GROWTH_ICONS[dream.growthStage] || GROWTH_ICONS.seed;
                  return (
                    <Link
                      key={dream.id}
                      href={`/dream/${dream.path}?resume=${dream.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 16px",
                        borderRadius: 12,
                        background: "rgba(29, 158, 117, 0.08)",
                        border: "1px solid rgba(29, 158, 117, 0.12)",
                        textDecoration: "none",
                        transition: "all 0.3s ease",
                        animation: "gardenPulse 3s ease-in-out infinite",
                      }}
                    >
                      <span style={{ fontSize: "1.3rem" }}>{stage.icon}</span>
                      <div>
                        <div className={outfit.className} style={{
                          fontSize: "0.82rem",
                          color: "#fff",
                          fontWeight: 500,
                        }}>{dream.title || "Untitled dream"}</div>
                        <div className={outfit.className} style={{
                          fontSize: "0.7rem",
                          color: "rgba(255,255,255,0.4)",
                        }}>{stage.label}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Bottom tagline ─────────────────────────────────── */}
          <p className={outfit.className} style={{
            textAlign: "center",
            marginTop: 48,
            fontSize: "0.78rem",
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.08em",
            fontWeight: 300,
          }}>
            Dream big. We&rsquo;ll get realistic later.
          </p>

        </div>{/* end content container */}
      </div>{/* end full-viewport */}

      <CopilotPanel />
    </>
  );
}
