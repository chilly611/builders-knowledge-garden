"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Cinzel, Outfit } from "next/font/google";
import CopilotPanel from "@/components/CopilotPanel";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "700", "900"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

interface SavedDream {
  id: string;
  title: string;
  createdAt: string;
  growthStage: "seed" | "sprout" | "sapling" | "bloom";
  path: string;
  preview?: string;
  plan?: { confidence: number; totalCost: number; sqft: number; timeline: string; quality: string };
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (stats: GardenStats) => boolean;
}

interface GardenStats {
  totalDreams: number;
  materialsCollected: number;
  stylesExplored: number;
  codesReviewed: number;
  maxConfidence: number;
  streakDays: number;
  pathsUsed: string[];
}

const GROWTH_VISUALS: Record<string, { icon: string; label: string; size: number; glow: string }> = {
  seed: { icon: "🌱", label: "Seed", size: 36, glow: "rgba(196,164,74,0.2)" },
  sprout: { icon: "🌿", label: "Sprout", size: 44, glow: "rgba(29,158,117,0.25)" },
  sapling: { icon: "🌳", label: "Sapling", size: 52, glow: "rgba(29,158,117,0.35)" },
  bloom: { icon: "🌸", label: "Bloom", size: 60, glow: "rgba(216,90,48,0.35)" },
};

const ACHIEVEMENTS: Achievement[] = [
  { id: "first-dream", title: "First Dream", description: "Plant your first seed", icon: "🌱", condition: s => s.totalDreams >= 1 },
  { id: "style-explorer", title: "Style Explorer", description: "Explore 5+ architectural styles", icon: "🎨", condition: s => s.stylesExplored >= 5 },
  { id: "material-maven", title: "Material Maven", description: "Collect 25+ materials", icon: "🧱", condition: s => s.materialsCollected >= 25 },
  { id: "code-scholar", title: "Code Scholar", description: "Review 10+ building codes", icon: "📋", condition: s => s.codesReviewed >= 10 },
  { id: "dream-streak-7", title: "Dream Streak: 7", description: "Refine dreams 7 days in a row", icon: "🔥", condition: s => s.streakDays >= 7 },
  { id: "ready-to-build", title: "Ready to Build", description: "Reach 85%+ confidence on any dream", icon: "🚀", condition: s => s.maxConfidence >= 85 },
  { id: "multi-path", title: "Pathfinder", description: "Try 3+ different dream paths", icon: "🧭", condition: s => s.pathsUsed.length >= 3 },
  { id: "prolific", title: "Prolific Dreamer", description: "Create 10+ dreams", icon: "✨", condition: s => s.totalDreams >= 10 },
  { id: "five-dreams", title: "Dream Garden", description: "Grow 5 dreams in your garden", icon: "🏡", condition: s => s.totalDreams >= 5 },
];

const LEVELS = [
  { name: "Apprentice Dreamer", minXp: 0, icon: "🌱" },
  { name: "Journeyman Visionary", minXp: 100, icon: "🌿" },
  { name: "Master Builder", minXp: 300, icon: "🌳" },
  { name: "Grand Architect", minXp: 600, icon: "🏛️" },
  { name: "Dream Weaver", minXp: 1000, icon: "✨" },
];

function computeStats(dreams: SavedDream[]): GardenStats {
  const saves = JSON.parse(localStorage.getItem("bkg-dream-saves") || "[]");
  const pathsUsed = [...new Set(dreams.map(d => d.path))];
  const maxConf = dreams.reduce((max, d) => Math.max(max, d.plan?.confidence || 0), 0);
  // Streak: count consecutive days with dreams
  const dates = dreams.map(d => new Date(d.createdAt).toDateString());
  const uniqueDates = [...new Set(dates)].sort().reverse();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const check = new Date(today);
    check.setDate(check.getDate() - i);
    if (uniqueDates.includes(check.toDateString())) streak++;
    else if (i > 0) break;
  }
  return {
    totalDreams: dreams.length,
    materialsCollected: saves.length,
    stylesExplored: Math.min(pathsUsed.length * 3 + dreams.length, 30),
    codesReviewed: dreams.length * 2,
    maxConfidence: maxConf,
    streakDays: streak,
    pathsUsed,
  };
}

function computeXp(stats: GardenStats): number {
  return stats.totalDreams * 20 + stats.materialsCollected * 2 + stats.stylesExplored * 5 + stats.codesReviewed * 3 + stats.streakDays * 10;
}

export default function DreamGardenPage() {
  const [mounted, setMounted] = useState(false);
  const [dreams, setDreams] = useState<SavedDream[]>([]);
  const [stats, setStats] = useState<GardenStats>({ totalDreams: 0, materialsCollected: 0, stylesExplored: 0, codesReviewed: 0, maxConfidence: 0, streakDays: 0, pathsUsed: [] });
  const [selectedDream, setSelectedDream] = useState<SavedDream | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [earnedIds, setEarnedIds] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("bkg-dreams");
      if (raw) {
        const parsed = JSON.parse(raw) as SavedDream[];
        setDreams(parsed);
        const s = computeStats(parsed);
        setStats(s);
        // Compute earned achievements
        const earned = ACHIEVEMENTS.filter(a => a.condition(s)).map(a => a.id);
        setEarnedIds(earned);
        localStorage.setItem("bkg-achievements", JSON.stringify(earned));
      }
    } catch {}
  }, []);

  const xp = useMemo(() => computeXp(stats), [stats]);
  const level = useMemo(() => {
    for (let i = LEVELS.length - 1; i >= 0; i--) { if (xp >= LEVELS[i].minXp) return LEVELS[i]; }
    return LEVELS[0];
  }, [xp]);
  const nextLevel = useMemo(() => LEVELS.find(l => l.minXp > xp) || LEVELS[LEVELS.length - 1], [xp]);
  const levelProgress = useMemo(() => {
    const curr = level.minXp;
    const next = nextLevel.minXp;
    return next > curr ? Math.round(((xp - curr) / (next - curr)) * 100) : 100;
  }, [xp, level, nextLevel]);

  const deleteDream = useCallback((id: string) => {
    setDreams(prev => {
      const next = prev.filter(d => d.id !== id);
      localStorage.setItem("bkg-dreams", JSON.stringify(next));
      return next;
    });
    if (selectedDream?.id === id) setSelectedDream(null);
  }, [selectedDream]);

  const fmt = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;

  if (!mounted) return <div style={{ minHeight: "100vh", background: "#1a0f05" }} />;

  return (
    <>
      <style jsx global>{`
        @keyframes cardSlide { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes plantSway { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        @keyframes gardenGlow { 0%,100% { box-shadow: 0 0 0 0 var(--glow); } 50% { box-shadow: 0 0 16px 4px var(--glow); } }
        @keyframes badgeReveal { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
        .plant-cell { border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.3s; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px 12px; min-height: 120px; position: relative; }
        .plant-cell:hover { border-color: rgba(29,158,117,0.25); background: rgba(29,158,117,0.04); transform: translateY(-2px); }
        .badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); transition: all 0.3s; }
        .badge.earned { border-color: rgba(232,168,62,0.25); background: rgba(232,168,62,0.06); }
        .badge.locked { opacity: 0.35; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: `radial-gradient(ellipse at 30% 80%, rgba(29,158,117,0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 20%, rgba(196,164,74,0.08) 0%, transparent 50%), linear-gradient(180deg, #1a0f05 0%, #0d1a12 60%, #0a1510 100%)`,
        padding: "clamp(32px, 5vh, 48px) 20px 80px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Link href="/dream" className={outfit.className} style={{ color: "rgba(29,158,117,0.5)", textDecoration: "none", fontSize: "0.82rem", letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
            <span style={{ fontSize: "0.9em" }}>←</span> Dream Machine
          </Link>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h1 className={cinzel.className} style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", color: "#1D9E75", marginBottom: 8 }}>Your Dream Garden</h1>
            <p className={outfit.className} style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", fontWeight: 300 }}>Every great building starts as a seed. Watch yours grow.</p>
          </div>

          {/* Level + XP bar */}
          <div style={{ borderRadius: 16, padding: "18px 20px", background: "rgba(29,158,117,0.04)", border: "1px solid rgba(29,158,117,0.12)", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: "2rem" }}>{level.icon}</div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div className={outfit.className} style={{ fontSize: "0.9rem", color: "#1D9E75", fontWeight: 600 }}>{level.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #1D9E75, #C4A44A)", width: `${levelProgress}%`, transition: "width 0.8s ease" }} />
                </div>
                <span className={outfit.className} style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>{xp} XP</span>
              </div>
              <p className={outfit.className} style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)", marginTop: 2 }}>Next: {nextLevel.name} ({nextLevel.minXp} XP)</p>
            </div>
            <button onClick={() => setShowAchievements(!showAchievements)} className={outfit.className} style={{ padding: "6px 14px", borderRadius: 10, background: "rgba(232,168,62,0.1)", border: "1px solid rgba(232,168,62,0.2)", color: "#E8A83E", fontSize: "0.75rem", cursor: "pointer" }}>🏆 {earnedIds.length}/{ACHIEVEMENTS.length}</button>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Dreams", value: stats.totalDreams, icon: "🌱" },
              { label: "Materials", value: `${stats.materialsCollected}/500`, icon: "🧱" },
              { label: "Styles", value: `${stats.stylesExplored}/30`, icon: "🎨" },
              { label: "Streak", value: `${stats.streakDays} days`, icon: "🔥" },
            ].map((s, i) => (
              <div key={i} style={{ borderRadius: 12, padding: "12px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>{s.icon}</div>
                <div className={outfit.className} style={{ fontSize: "1rem", color: "#1D9E75", fontWeight: 700 }}>{s.value}</div>
                <div className={outfit.className} style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Achievements panel */}
          {showAchievements && (
            <div style={{ borderRadius: 16, padding: "20px 18px", background: "rgba(232,168,62,0.03)", border: "1px solid rgba(232,168,62,0.12)", marginBottom: 20, animation: "cardSlide 0.4s ease" }}>
              <h3 className={outfit.className} style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(232,168,62,0.6)", marginBottom: 14, fontWeight: 600 }}>🏆 Achievements</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ACHIEVEMENTS.map((a, i) => {
                  const earned = earnedIds.includes(a.id);
                  return (
                    <div key={a.id} className={`badge ${earned ? "earned" : "locked"}`} style={{ animation: earned ? `badgeReveal 0.4s ease ${i * 0.08}s backwards` : "none" }}>
                      <span style={{ fontSize: "1.2rem" }}>{a.icon}</span>
                      <div>
                        <div className={outfit.className} style={{ fontSize: "0.72rem", color: earned ? "#E8A83E" : "rgba(255,255,255,0.3)", fontWeight: 600 }}>{a.title}</div>
                        <div className={outfit.className} style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)" }}>{a.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── THE GARDEN GRID ─────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
            {dreams.map((dream, i) => {
              const vis = GROWTH_VISUALS[dream.growthStage] || GROWTH_VISUALS.seed;
              return (
                <div key={dream.id} className="plant-cell" onClick={() => setSelectedDream(dream)}
                  style={{ "--glow": vis.glow, animation: `cardSlide 0.4s ease ${i * 0.06}s backwards, gardenGlow 4s ease-in-out ${i * 0.5}s infinite` } as React.CSSProperties}>
                  <div style={{ fontSize: vis.size, animation: "plantSway 3s ease-in-out infinite", marginBottom: 8 }}>{vis.icon}</div>
                  <div className={outfit.className} style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.65)", fontWeight: 500, textAlign: "center", lineHeight: 1.3 }}>{dream.title?.slice(0, 30) || "Untitled"}</div>
                  <div className={outfit.className} style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{vis.label}</div>
                  {dream.plan?.confidence && (
                    <div style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(29,158,117,0.2)" }}>
                      <span className={outfit.className} style={{ fontSize: "0.5rem", color: "#1D9E75", fontWeight: 700 }}>{dream.plan.confidence}%</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty plot — plant new dream */}
            <Link href="/dream" style={{ textDecoration: "none" }}>
              <div className="plant-cell" style={{ borderStyle: "dashed", borderColor: "rgba(29,158,117,0.15)" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8, opacity: 0.4 }}>+</div>
                <div className={outfit.className} style={{ fontSize: "0.72rem", color: "rgba(29,158,117,0.4)", fontWeight: 400 }}>Plant a new dream</div>
              </div>
            </Link>
          </div>

          {/* ── DREAM DETAIL PANEL ──────────────────────────────── */}
          {selectedDream && (
            <div style={{ borderRadius: 18, padding: "24px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(29,158,117,0.15)", animation: "cardSlide 0.4s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "1.6rem" }}>{(GROWTH_VISUALS[selectedDream.growthStage] || GROWTH_VISUALS.seed).icon}</span>
                  <div>
                    <h3 className={outfit.className} style={{ fontSize: "1rem", color: "#1D9E75", fontWeight: 600 }}>{selectedDream.title || "Untitled Dream"}</h3>
                    <p className={outfit.className} style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>
                      {(GROWTH_VISUALS[selectedDream.growthStage] || GROWTH_VISUALS.seed).label} • Created {new Date(selectedDream.createdAt).toLocaleDateString()} • via {selectedDream.path}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedDream(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
              </div>

              {selectedDream.preview && (
                <p className={outfit.className} style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, fontWeight: 300, fontStyle: "italic", marginBottom: 16, paddingLeft: 14, borderLeft: "2px solid rgba(29,158,117,0.15)" }}>
                  &ldquo;{selectedDream.preview.slice(0, 200)}{selectedDream.preview.length > 200 ? "..." : ""}&rdquo;
                </p>
              )}

              {selectedDream.plan && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: "Est. Cost", value: fmt(selectedDream.plan.totalCost) },
                    { label: "Size", value: `${selectedDream.plan.sqft?.toLocaleString()} sf` },
                    { label: "Timeline", value: selectedDream.plan.timeline },
                    { label: "Confidence", value: `${selectedDream.plan.confidence}%` },
                  ].map((s, i) => (
                    <div key={i} style={{ borderRadius: 10, padding: "10px 8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
                      <div className={outfit.className} style={{ fontSize: "0.55rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 3 }}>{s.label}</div>
                      <div className={outfit.className} style={{ fontSize: "0.95rem", color: "#1D9E75", fontWeight: 600 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href={`/dream/${selectedDream.path}`} className={outfit.className} style={{
                  padding: "8px 16px", borderRadius: 10, background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.2)",
                  color: "#1D9E75", fontSize: "0.78rem", fontWeight: 500, textDecoration: "none",
                }}>🌿 Continue Dreaming</Link>
                <Link href={`/launch?sqft=${selectedDream.plan?.sqft || 2500}`} className={outfit.className} style={{
                  padding: "8px 16px", borderRadius: 10, background: "linear-gradient(135deg, #D85A30, #E8A83E)",
                  color: "#fff", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none",
                }}>🚀 Start Project</Link>
                <button onClick={() => deleteDream(selectedDream.id)} className={outfit.className} style={{
                  padding: "8px 16px", borderRadius: 10, background: "rgba(220,53,69,0.08)", border: "1px solid rgba(220,53,69,0.15)",
                  color: "rgba(220,53,69,0.6)", fontSize: "0.78rem", cursor: "pointer",
                }}>Remove</button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {dreams.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: "4rem", marginBottom: 16, opacity: 0.3 }}>🌱</div>
              <h2 className={outfit.className} style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.4)", fontWeight: 400, marginBottom: 12 }}>Your garden is empty</h2>
              <p className={outfit.className} style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.25)", marginBottom: 24 }}>Plant your first dream and watch it grow.</p>
              <Link href="/dream" className={outfit.className} style={{
                padding: "12px 28px", borderRadius: 14, background: "linear-gradient(135deg, #1D9E75, #C4A44A)",
                color: "#fff", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none",
              }}>Plant a Dream 🌱</Link>
            </div>
          )}
        </div>
      </div>
      <CopilotPanel />
    </>
  );
}
