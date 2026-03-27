"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archivo_Black, Archivo } from "next/font/google";
import CopilotPanel from "@/components/CopilotPanel";
import { useSound } from "@/lib/sound-engine";

const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400" });
const archivo = Archivo({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

interface DreamPath {
  id: string; route: string; icon: string; name: string;
  tagline: string; time: string; color: string;
  image: string; // gradient placeholder for visual card
  laneWeights: Record<string, number>;
}

const DREAM_PATHS: DreamPath[] = [
  { id: "describe", route: "/dream/describe", icon: "✦", name: "Describe Your Dream",
    tagline: "Tell us in your own words", time: "~60 sec",
    color: "#E8A83E", image: "url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80&fit=crop)",
    laneWeights: { diy: 10, gc: 8, specialty: 7, supplier: 5, equipment: 5, service: 6, worker: 6, robot: 4 } },
  { id: "inspire", route: "/dream/inspire", icon: "◈", name: "Show Me Inspiration",
    tagline: "Upload photos — AI analyzes everything", time: "~2 min",
    color: "#D85A30", image: "url(https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=600&q=80&fit=crop)",
    laneWeights: { diy: 9, gc: 6, specialty: 6, supplier: 4, equipment: 3, service: 5, worker: 5, robot: 3 } },
  { id: "sketch", route: "/dream/sketch", icon: "△", name: "Sketch It Out",
    tagline: "Draw your floor plan — AI interprets live", time: "~5 min",
    color: "#C4A44A", image: "url(https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80&fit=crop)",
    laneWeights: { diy: 6, gc: 7, specialty: 8, supplier: 3, equipment: 3, service: 4, worker: 4, robot: 5 } },
  { id: "explore", route: "/dream/explore", icon: "⬡", name: "Surprise Me",
    tagline: "Answer 5 questions — AI generates concepts", time: "~90 sec",
    color: "#E07B3A", image: "url(https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80&fit=crop)",
    laneWeights: { diy: 8, gc: 5, specialty: 5, supplier: 4, equipment: 3, service: 5, worker: 7, robot: 6 } },
  { id: "browse", route: "/dream/browse", icon: "◉", name: "Browse & Discover",
    tagline: "Infinite visual scroll — save what you love", time: "Open-ended",
    color: "#B8873B", image: "url(https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80&fit=crop)",
    laneWeights: { diy: 7, gc: 4, specialty: 6, supplier: 7, equipment: 4, service: 5, worker: 5, robot: 3 } },
  { id: "plans", route: "/dream/plans", icon: "⊞", name: "I Have Plans",
    tagline: "Upload DWG, PDF — we add intelligence", time: "~10 min",
    color: "#9C7832", image: "url(https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80&fit=crop)",
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
  const { play } = useSound();
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
          height: 200px; display: flex; align-items: flex-end; padding: 16px;
          position: relative; overflow: hidden;
          background-size: cover !important; background-position: center !important;
        }
        .dream-path-card .card-visual::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%);
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#fff" }}>

        {/* ── HERO — Full-width visual with text overlay ────── */}
        <div style={{
          position: "relative", height: "clamp(300px, 45vh, 480px)", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* Real architecture photo background */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "url(https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1400&q=85&fit=crop)",
            backgroundSize: "cover", backgroundPosition: "center",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(42,31,20,0.3) 0%, rgba(42,31,20,0.7) 60%, rgba(42,31,20,0.92) 100%)",
          }} />
          <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 20px" }}>
            <p className={archivo.className} style={{ fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>Builder&rsquo;s Knowledge Garden</p>
            <h1 className={archivoBlack.className} style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", fontWeight: 900, color: "#fff", lineHeight: 1.1, marginBottom: 14 }}>
              The Dream Machine
            </h1>
            <p className={archivo.className} style={{ fontSize: "clamp(0.95rem, 2vw, 1.15rem)", color: "rgba(255,255,255,0.7)", maxWidth: 480, margin: "0 auto", fontWeight: 300 }}>
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
                onClick={() => { play("navigate"); router.push(path.route); }}
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
                    <span className={archivo.className} style={{
                      padding: "4px 10px", borderRadius: 8,
                      background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)",
                      fontSize: "0.68rem", color: path.color, fontWeight: 600,
                    }}>{path.time}</span>
                  </div>
                </div>
                {/* Text area */}
                <div style={{ padding: "16px 18px 20px" }}>
                  <h3 className={archivo.className} style={{
                    fontSize: "1.1rem", fontWeight: 700, color: "#222", marginBottom: 4,
                  }}>{path.name}</h3>
                  <p className={archivo.className} style={{
                    fontSize: "0.82rem", color: "#666", fontWeight: 300, lineHeight: 1.4,
                  }}>{path.tagline}</p>
                </div>
                {lane && (path.laneWeights[lane] ?? 5) >= 9 && (
                  <div style={{
                    position: "absolute", top: 12, right: 12, zIndex: 3,
                    padding: "3px 10px", borderRadius: 8,
                    background: path.color, color: "#222",
                    fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em",
                  }} className={archivo.className}>RECOMMENDED</div>
                )}
              </div>
            ))}
          </div>

          {/* ── YOUR GARDEN ─────────────────────────────────────── */}
          {dreams.length > 0 && (
            <div style={{ marginTop: 48, padding: "24px", borderRadius: 20, background: "#f8faf8", border: "1px solid #e0e8e0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 className={archivo.className} style={{ fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#1D9E75", fontWeight: 600 }}>Your Garden</h3>
                <Link href="/dream/garden" className={archivo.className} style={{ fontSize: "0.72rem", color: "#1D9E75", textDecoration: "none" }}>View Full Garden →</Link>
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
                      <div className={archivo.className} style={{ fontSize: "0.78rem", color: "#222", fontWeight: 500 }}>{dream.title?.slice(0, 25) || "Untitled"}</div>
                      <div className={archivo.className} style={{ fontSize: "0.62rem", color: "#555" }}>{dream.growthStage}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <p className={archivo.className} style={{ textAlign: "center", marginTop: 40, fontSize: "0.75rem", color: "#666" }}>
            Dream big. We&rsquo;ll get realistic later.
          </p>
        </div>
      </div>
      <CopilotPanel />
    </>
  );
}
