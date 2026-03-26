"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cinzel, Outfit } from "next/font/google";
import CopilotPanel from "@/components/CopilotPanel";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "700", "900"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

interface DreamPath {
  id: string; route: string; icon: string; name: string;
  tagline: string; time: string; color: string;
  image: string; // gradient placeholder for visual card
  laneWeights: Record<string, number>;
}

const DREAM_PATHS: DreamPath[] = [
  { id: "describe", route: "/dream/describe", icon: "✦", name: "Describe Your Dream",
    tagline: "Tell us in your own words", time: "~60 sec",
    color: "#E8A83E", image: "linear-gradient(135deg, #f5e6d3, #e8d5b7, #c4a882)",
    laneWeights: { diy: 10, gc: 8, specialty: 7, supplier: 5, equipment: 5, service: 6, worker: 6, robot: 4 } },
  { id: "inspire", route: "/dream/inspire", icon: "◈", name: "Show Me Inspiration",
    tagline: "Upload photos — AI analyzes everything", time: "~2 min",
    color: "#D85A30", image: "linear-gradient(135deg, #e8d0c0, #d4a88a, #c48a6a)",
    laneWeights: { diy: 9, gc: 6, specialty: 6, supplier: 4, equipment: 3, service: 5, worker: 5, robot: 3 } },
  { id: "sketch", route: "/dream/sketch", icon: "△", name: "Sketch It Out",
    tagline: "Draw your floor plan — AI interprets live", time: "~5 min",
    color: "#C4A44A", image: "linear-gradient(135deg, #e0dcd0, #c4c0b0, #a8a498)",
    laneWeights: { diy: 6, gc: 7, specialty: 8, supplier: 3, equipment: 3, service: 4, worker: 4, robot: 5 } },
  { id: "explore", route: "/dream/explore", icon: "⬡", name: "Surprise Me",
    tagline: "Answer 5 questions — AI generates concepts", time: "~90 sec",
    color: "#E07B3A", image: "linear-gradient(135deg, #f0d8c8, #e0b8a0, #d09880)",
    laneWeights: { diy: 8, gc: 5, specialty: 5, supplier: 4, equipment: 3, service: 5, worker: 7, robot: 6 } },
  { id: "browse", route: "/dream/browse", icon: "◉", name: "Browse & Discover",
    tagline: "Infinite visual scroll — save what you love", time: "Open-ended",
    color: "#B8873B", image: "linear-gradient(135deg, #d8ccb8, #c4b8a0, #b0a488)",
    laneWeights: { diy: 7, gc: 4, specialty: 6, supplier: 7, equipment: 4, service: 5, worker: 5, robot: 3 } },
  { id: "plans", route: "/dream/plans", icon: "⊞", name: "I Have Plans",
    tagline: "Upload DWG, PDF — we add intelligence", time: "~10 min",
    color: "#9C7832", image: "linear-gradient(135deg, #d0c8b8, #b8b0a0, #a09888)",
    laneWeights: { diy: 3, gc: 10, specialty: 9, supplier: 6, equipment: 7, service: 8, worker: 4, robot: 8 } },
];

interface SavedDream {
  id: string; title: string; createdAt: string;
  growthStage: "seed" | "sprout" | "sapling" | "bloom"; path: string;
}
const GROWTH_ICONS: Record<string, string> = { seed: "🌱", sprout: "🌿", sapling: "🌳", bloom: "🌸" };

function getOrderedPaths(lane: string | null): DreamPath[] {
  if (!lane) return DREAM_PATHS;
  return [...DREAM_PATHS].sort((a, b) => (b.laneWeights[lane] ?? 5) - (a.laneWeights[lane] ?? 5));
}

export default function DreamMachinePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [lane, setLane] = useState<string | null>(null);
  const [dreams, setDreams] = useState<SavedDream[]>([]);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const storedLane = localStorage.getItem("bkg-lane");
    if (storedLane) setLane(storedLane);
    try { const raw = localStorage.getItem("bkg-dreams"); if (raw) setDreams(JSON.parse(raw)); } catch {}
  }, []);

  const orderedPaths = getOrderedPaths(lane);
  if (!mounted) return <div style={{ minHeight: "100vh", background: "#fff" }} />;

  return (
    <>
      <style jsx global>{`
        @keyframes heroFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes cardEnter { 0% { opacity: 0; transform: translateY(24px) scale(0.97); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .dream-path-card {
          position: relative; border-radius: 20px; overflow: hidden; cursor: pointer;
          transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          animation: cardEnter 0.6s cubic-bezier(0.34,1.56,0.64,1) backwards;
        }
        .dream-path-card:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 12px 40px rgba(0,0,0,0.12); }
        .dream-path-card .card-visual {
          height: 180px; display: flex; align-items: flex-end; padding: 16px;
          position: relative; overflow: hidden;
        }
        .dream-path-card .card-visual::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%);
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#fff" }}>

        {/* ── HERO — Full-width visual with text overlay ────── */}
        <div style={{
          position: "relative", height: "clamp(280px, 40vh, 420px)", overflow: "hidden",
          background: "linear-gradient(135deg, #f5e6d3 0%, #e8d5b7 30%, #d4c4a0 60%, #c4a882 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* Animated architectural silhouettes */}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 8, padding: "0 40px", opacity: 0.12 }}>
            {[120, 200, 160, 280, 140, 220, 180, 100, 240].map((h, i) => (
              <div key={i} style={{
                width: `${40 + i * 8}px`, height: `${h}px`, borderRadius: "4px 4px 0 0",
                background: "#1a1a1a", animation: `heroFloat ${3 + i * 0.4}s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
          <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 20px" }}>
            <p className={outfit.className} style={{ fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", marginBottom: 12 }}>Builder&rsquo;s Knowledge Garden</p>
            <h1 className={cinzel.className} style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", fontWeight: 900, color: "#2a1f14", lineHeight: 1.1, marginBottom: 14 }}>
              The Dream Machine
            </h1>
            <p className={outfit.className} style={{ fontSize: "clamp(0.95rem, 2vw, 1.15rem)", color: "rgba(42,31,20,0.6)", maxWidth: 480, margin: "0 auto", fontWeight: 300 }}>
              Every great building begins as a feeling. Choose how you want to begin.
            </p>
          </div>
        </div>

        {/* ── PATH CARDS — Visual grid ──────────────────────── */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 60px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
          }}>
            {orderedPaths.map((path, i) => (
              <div
                key={path.id}
                className="dream-path-card"
                onClick={() => router.push(path.route)}
                onMouseEnter={() => setHoveredPath(path.id)}
                onMouseLeave={() => setHoveredPath(null)}
                role="button" tabIndex={0} data-sound="select"
                onKeyDown={(e) => e.key === "Enter" && router.push(path.route)}
                style={{ animationDelay: `${i * 0.08 + 0.1}s`, background: "#fff" }}
              >
                {/* Visual area with gradient image placeholder */}
                <div className="card-visual" style={{ background: path.image }}>
                  <div style={{
                    position: "absolute", top: 16, left: 16, zIndex: 2,
                    fontSize: "2.4rem", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))",
                    animation: hoveredPath === path.id ? "heroFloat 2s ease-in-out infinite" : "none",
                  }}>{path.icon}</div>
                  <div style={{ position: "relative", zIndex: 2 }}>
                    <span className={outfit.className} style={{
                      padding: "4px 10px", borderRadius: 8,
                      background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)",
                      fontSize: "0.68rem", color: path.color, fontWeight: 600,
                    }}>{path.time}</span>
                  </div>
                </div>
                {/* Text area */}
                <div style={{ padding: "16px 18px 20px" }}>
                  <h3 className={outfit.className} style={{
                    fontSize: "1.1rem", fontWeight: 700, color: "#1a1a1a", marginBottom: 4,
                  }}>{path.name}</h3>
                  <p className={outfit.className} style={{
                    fontSize: "0.82rem", color: "#888", fontWeight: 300, lineHeight: 1.4,
                  }}>{path.tagline}</p>
                </div>
                {lane && (path.laneWeights[lane] ?? 5) >= 9 && (
                  <div style={{
                    position: "absolute", top: 12, right: 12, zIndex: 3,
                    padding: "3px 10px", borderRadius: 8,
                    background: path.color, color: "#fff",
                    fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em",
                  }} className={outfit.className}>RECOMMENDED</div>
                )}
              </div>
            ))}
          </div>

          {/* ── YOUR GARDEN ─────────────────────────────────────── */}
          {dreams.length > 0 && (
            <div style={{ marginTop: 48, padding: "24px", borderRadius: 20, background: "#f8faf8", border: "1px solid #e0e8e0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 className={outfit.className} style={{ fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#1D9E75", fontWeight: 600 }}>Your Garden</h3>
                <Link href="/dream/garden" className={outfit.className} style={{ fontSize: "0.72rem", color: "#1D9E75", textDecoration: "none" }}>View Full Garden →</Link>
              </div>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
                {dreams.slice(0, 6).map((dream) => (
                  <Link key={dream.id} href={`/dream/${dream.path}`} style={{
                    flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 16px", borderRadius: 12, background: "#fff",
                    border: "1px solid #e0e8e0", textDecoration: "none", transition: "all 0.2s",
                  }}>
                    <span style={{ fontSize: "1.2rem" }}>{GROWTH_ICONS[dream.growthStage] || "🌱"}</span>
                    <div>
                      <div className={outfit.className} style={{ fontSize: "0.78rem", color: "#1a1a1a", fontWeight: 500 }}>{dream.title?.slice(0, 25) || "Untitled"}</div>
                      <div className={outfit.className} style={{ fontSize: "0.62rem", color: "#999" }}>{dream.growthStage}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <p className={outfit.className} style={{ textAlign: "center", marginTop: 40, fontSize: "0.75rem", color: "#ccc" }}>
            Dream big. We&rsquo;ll get realistic later.
          </p>
        </div>
      </div>
      <CopilotPanel />
    </>
  );
}
