"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Cinzel, Outfit } from "next/font/google";
import CopilotPanel from "@/components/CopilotPanel";
import { parseDream, generateDreamPlan, DreamPlan } from "@/lib/dream-parser";
import { VisionAnalysis } from "@/app/api/v1/dream-vision/route";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "700", "900"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

type Phase = "upload" | "analyzing" | "synthesis" | "result";

interface AnalyzedPhoto {
  id: string;
  src: string;
  status: "pending" | "analyzing" | "done" | "error";
  analysis?: VisionAnalysis;
  error?: string;
}

interface StyleDNA {
  summary: string;
  dominantStyle: string;
  materials: { name: string; count: number }[];
  features: { name: string; count: number }[];
  conflicts: string[];
}

function synthesizeTaste(photos: AnalyzedPhoto[]): StyleDNA {
  const done = photos.filter(p => p.status === "done" && p.analysis);
  if (done.length === 0) return { summary: "", dominantStyle: "", materials: [], features: [], conflicts: [] };
  const styleCounts: Record<string, number> = {};
  const matCounts: Record<string, number> = {};
  const featCounts: Record<string, number> = {};
  done.forEach(p => {
    const a = p.analysis!;
    styleCounts[a.style] = (styleCounts[a.style] || 0) + 1;
    a.materials.forEach(m => { matCounts[m] = (matCounts[m] || 0) + 1; });
    a.features.forEach(f => { featCounts[f] = (featCounts[f] || 0) + 1; });
  });
  const styles = Object.entries(styleCounts).sort((a, b) => b[1] - a[1]);
  const dominantStyle = styles[0]?.[0] || "Contemporary";
  const materials = Object.entries(matCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  const features = Object.entries(featCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  const conflicts: string[] = [];
  if (styles.length > 1 && styles[0][1] === styles[1][1]) {
    conflicts.push(`Your photos blend ${styles[0][0]} and ${styles[1][0]} equally — which direction excites you more?`);
  }
  const summary = `You gravitate toward ${dominantStyle.toLowerCase()} with ${materials.slice(0, 3).map(m => m.name).join(", ")}, featuring ${features.slice(0, 3).map(f => f.name).join(", ")}.`;
  return { summary, dominantStyle, materials, features, conflicts };
}

export default function InspireDreamPage() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("upload");
  const [photos, setPhotos] = useState<AnalyzedPhoto[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [styleDNA, setStyleDNA] = useState<StyleDNA | null>(null);
  const [plan, setPlan] = useState<DreamPlan | null>(null);
  const [aiNarrative, setAiNarrative] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fmt = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;

  useEffect(() => { setMounted(true); }, []);

  const analyzePhoto = useCallback(async (photo: AnalyzedPhoto) => {
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: "analyzing" as const } : p));
    try {
      const resp = await fetch("/api/v1/dream-vision", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "base64", data: photo.src }),
      });
      if (!resp.ok) throw new Error("Vision API error");
      const { analysis } = await resp.json();
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: "done" as const, analysis } : p));
    } catch {
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: "error" as const, error: "Analysis failed" } : p));
    }
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, 20 - photos.length);
    arr.forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const newPhoto: AnalyzedPhoto = { id: crypto.randomUUID(), src: reader.result as string, status: "pending" };
        setPhotos(prev => {
          const updated = [...prev, newPhoto];
          return updated.slice(0, 20);
        });
        analyzePhoto(newPhoto);
      };
      reader.readAsDataURL(file);
    });
  }, [photos.length, analyzePhoto]);

  const addUrl = useCallback(async () => {
    if (!urlInput.trim()) return;
    const newPhoto: AnalyzedPhoto = { id: crypto.randomUUID(), src: "", status: "analyzing" };
    setPhotos(prev => [...prev, newPhoto]);
    try {
      const resp = await fetch("/api/v1/dream-vision", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "url", data: urlInput.trim() }),
      });
      if (!resp.ok) throw new Error("URL analysis failed");
      const { analysis } = await resp.json();
      setPhotos(prev => prev.map(p => p.id === newPhoto.id ? { ...p, status: "done" as const, analysis, src: urlInput } : p));
    } catch {
      setPhotos(prev => prev.map(p => p.id === newPhoto.id ? { ...p, status: "error" as const, error: "Could not analyze URL" } : p));
    }
    setUrlInput("");
  }, [urlInput]);

  const removePhoto = useCallback((id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  }, []);

  const runSynthesis = useCallback(() => {
    const dna = synthesizeTaste(photos);
    setStyleDNA(dna);
    setPhase("synthesis");
  }, [photos]);

  const generateDreamFromPhotos = useCallback(() => {
    if (!styleDNA) return;
    const dreamText = `A ${styleDNA.dominantStyle.toLowerCase()} building with ${styleDNA.materials.slice(0, 4).map(m => m.name).join(", ")}, featuring ${styleDNA.features.slice(0, 4).map(f => f.name).join(", ")}`;
    const parsed = parseDream(dreamText);
    const dreamPlan = generateDreamPlan(parsed);
    setPlan(dreamPlan);
    setPhase("result");
    // AI narrative async
    setIsStreaming(true);
    fetch("/api/v1/copilot", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `You are the Dream Machine. Based on analyzing ${photos.filter(p => p.status === "done").length} inspiration photos, the user's Style DNA is: "${styleDNA.summary}". Dominant style: ${styleDNA.dominantStyle}. Key materials: ${styleDNA.materials.slice(0, 5).map(m => m.name).join(", ")}. Features: ${styleDNA.features.slice(0, 5).map(f => f.name).join(", ")}. Write a vivid 2-paragraph vision of a building that synthesizes these inspirations into a coherent dream. Then list top 3 codes, 5 materials with costs, and the biggest challenge.`,
      }),
    }).then(async resp => {
      if (!resp.ok) return;
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
          for (const line of lines) {
            try { const d = JSON.parse(line.slice(6)); if (d.type === "chunk") setAiNarrative(prev => prev + d.text); } catch {}
          }
        }
      }
    }).catch(() => {}).finally(() => setIsStreaming(false));
  }, [styleDNA, photos]);

  const saveDream = useCallback(() => {
    if (!plan || !styleDNA) return;
    const dream = {
      id: crypto.randomUUID(), title: `Inspired: ${styleDNA.dominantStyle}`,
      createdAt: new Date().toISOString(), growthStage: "sprout" as const,
      path: "inspire", preview: styleDNA.summary, plan,
    };
    const existing = JSON.parse(localStorage.getItem("bkg-dreams") || "[]");
    existing.unshift(dream);
    localStorage.setItem("bkg-dreams", JSON.stringify(existing.slice(0, 20)));
    setSaved(true);
  }, [plan, styleDNA]);

  const shareDream = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/dream/inspire`);
    setShared(true);
    setTimeout(() => setShared(false), 3000);
  }, []);

  const doneCount = photos.filter(p => p.status === "done").length;
  const analyzingCount = photos.filter(p => p.status === "analyzing").length;
  const confidence = Math.min(20 + doneCount * 5 + (styleDNA ? 15 : 0) + (plan ? 10 : 0), 100);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }, [addFiles]);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  if (!mounted) return <div style={{ minHeight: "100vh", background: "#1a0f05" }} />;

  return (
    <>
      <style jsx global>{`
        @keyframes cardSlide { 0% { opacity: 0; transform: translateY(24px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(216,90,48,0.3); } 50% { box-shadow: 0 0 20px 4px rgba(216,90,48,0.15); } }
        @keyframes dnaReveal { 0% { opacity: 0; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes micPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(216,90,48,0.4); } 50% { box-shadow: 0 0 0 12px rgba(216,90,48,0); } }
        .drop-zone { border: 2px dashed rgba(216,90,48,0.3); border-radius: 20px; padding: 48px 24px; text-align: center; cursor: pointer; transition: all 0.3s; background: rgba(216,90,48,0.03); }
        .drop-zone.active { border-color: #D85A30; background: rgba(216,90,48,0.08); transform: scale(1.01); }
        .photo-strip { display: flex; gap: 12px; overflow-x: auto; padding: 8px 0 16px; scroll-snap-type: x mandatory; }
        .photo-strip::-webkit-scrollbar { height: 4px; } .photo-strip::-webkit-scrollbar-thumb { background: rgba(216,90,48,0.3); border-radius: 2px; }
        .photo-card { flex-shrink: 0; width: 180px; border-radius: 14px; overflow: hidden; position: relative; scroll-snap-align: start; border: 1px solid rgba(255,255,255,0.08); transition: all 0.3s; }
        .photo-card:hover { border-color: rgba(216,90,48,0.3); }
        .entity-link { color: #D85A30; text-decoration: none; border-bottom: 1px dotted rgba(216,90,48,0.3); transition: border-color 0.2s; }
        .entity-link:hover { border-bottom-color: #D85A30; }
      `}</style>

      <div style={{
        minHeight: "100vh", position: "relative",
        background: "#fff",
        padding: "clamp(32px, 6vh, 60px) 20px 80px",
      }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <Link href="/dream" className={outfit.className} style={{ color: "rgba(216,90,48,0.5)", textDecoration: "none", fontSize: "0.82rem", letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
            <span style={{ fontSize: "0.9em" }}>←</span> Dream Machine
          </Link>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>◈</div>
            <h1 className={cinzel.className} style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", color: "#D85A30", marginBottom: 10 }}>Show Me Inspiration</h1>
            <p className={outfit.className} style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.95rem", fontWeight: 300, maxWidth: 480, margin: "0 auto" }}>
              Upload photos of buildings you love. AI analyzes each one and synthesizes your Style DNA.
            </p>
          </div>

          {/* Confidence + counter bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span className={outfit.className} style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Confidence</span>
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #D85A30, #E8A83E)", width: `${confidence}%`, transition: "width 0.6s ease" }} />
            </div>
            <span className={outfit.className} style={{ fontSize: "0.82rem", color: "#D85A30", fontWeight: 600 }}>{confidence}%</span>
            <span className={outfit.className} style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginLeft: 8 }}>{doneCount}/{photos.length} analyzed</span>
          </div>

          {/* Upload zone — always visible in upload/analyzing phases */}
          {(phase === "upload" || phase === "analyzing") && (
            <div style={{ animation: "cardSlide 0.5s ease" }}>
              <div className={`drop-zone ${isDragOver ? "active" : ""}`} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => fileInputRef.current?.click()}>
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => e.target.files && addFiles(e.target.files)} />
                <div style={{ fontSize: "2.4rem", marginBottom: 12 }}>📷</div>
                <p className={outfit.className} style={{ color: "#D85A30", fontSize: "1rem", fontWeight: 500, marginBottom: 6 }}>Drop up to 20 inspiration photos</p>
                <p className={outfit.className} style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", fontWeight: 300 }}>or click to browse • JPG, PNG, WebP</p>
              </div>

              {/* URL input */}
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addUrl()}
                  placeholder="Paste a Zillow, Realtor, or Airbnb image URL..." className={outfit.className}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(216,90,48,0.15)", color: "#fff", fontSize: "0.85rem", outline: "none" }} />
                <button onClick={addUrl} disabled={!urlInput.trim()} className={outfit.className} style={{
                  padding: "10px 18px", borderRadius: 10, background: urlInput.trim() ? "rgba(216,90,48,0.15)" : "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(216,90,48,0.2)", color: urlInput.trim() ? "#D85A30" : "rgba(255,255,255,0.3)",
                  fontSize: "0.85rem", fontWeight: 500, cursor: urlInput.trim() ? "pointer" : "not-allowed",
                }}>Analyze URL</button>
              </div>

              {/* Photo strip */}
              {photos.length > 0 && (
                <div className="photo-strip" style={{ marginTop: 20 }}>
                  {photos.map(photo => (
                    <div key={photo.id} className="photo-card">
                      {photo.src && photo.src.startsWith("data:") ? (
                        <img src={photo.src} alt="Inspiration" style={{ width: 180, height: 140, objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ width: 180, height: 140, background: "rgba(216,90,48,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span className={outfit.className} style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>URL image</span>
                        </div>
                      )}
                      {/* Status overlay */}
                      {photo.status === "analyzing" && (
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(216,90,48,0.1) 25%, rgba(216,90,48,0.2) 50%, rgba(216,90,48,0.1) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span className={outfit.className} style={{ color: "#D85A30", fontSize: "0.72rem", fontWeight: 500 }}>Analyzing...</span>
                        </div>
                      )}
                      {photo.status === "error" && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span className={outfit.className} style={{ color: "#dc3545", fontSize: "0.72rem" }}>Failed</span>
                        </div>
                      )}
                      {/* Tags overlay */}
                      {photo.status === "done" && photo.analysis && (
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 8px", background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
                          <div className={outfit.className} style={{ fontSize: "0.62rem", color: "#D85A30", fontWeight: 600, marginBottom: 2 }}>{photo.analysis.style}</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                            {photo.analysis.materials.slice(0, 3).map((m, j) => (
                              <span key={j} style={{ padding: "1px 5px", borderRadius: 6, background: "rgba(216,90,48,0.2)", fontSize: "0.56rem", color: "rgba(255,255,255,0.7)" }}>{m}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Remove button */}
                      <button onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: "0.6rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Synthesize button */}
              {doneCount >= 2 && analyzingCount === 0 && (
                <button onClick={runSynthesis} className={outfit.className} data-sound="select" style={{
                  width: "100%", padding: "14px 24px", borderRadius: 14, border: "none", marginTop: 20,
                  background: "linear-gradient(135deg, #D85A30, #E8A83E)", color: "#fff",
                  fontSize: "1rem", fontWeight: 600, cursor: "pointer", animation: "pulseGlow 3s ease-in-out infinite",
                }}>Reveal My Style DNA ◈ ({doneCount} photos)</button>
              )}
              {analyzingCount > 0 && (
                <p className={outfit.className} style={{ textAlign: "center", marginTop: 16, color: "rgba(216,90,48,0.6)", fontSize: "0.82rem", fontStyle: "italic" }}>Analyzing {analyzingCount} photo{analyzingCount > 1 ? "s" : ""}...</p>
              )}
            </div>
          )}

          {/* ── SYNTHESIS PHASE — Style DNA ──────────────────────── */}
          {phase === "synthesis" && styleDNA && (
            <div style={{ animation: "dnaReveal 0.6s ease" }}>
              <div style={{ borderRadius: 20, padding: "28px 24px", background: "rgba(216,90,48,0.04)", border: "1px solid rgba(216,90,48,0.15)", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: "1.6rem" }}>🧬</span>
                  <h2 className={cinzel.className} style={{ fontSize: "1.3rem", color: "#D85A30" }}>Your Style DNA</h2>
                </div>
                <p className={outfit.className} style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.95rem", lineHeight: 1.7, fontWeight: 300, marginBottom: 20 }}>{styleDNA.summary}</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                  <div style={{ borderRadius: 14, padding: "14px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <h4 className={outfit.className} style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8, fontWeight: 600 }}>🧱 Materials</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {styleDNA.materials.slice(0, 8).map((m, i) => (
                        <span key={i} className={outfit.className} style={{ padding: "3px 10px", borderRadius: 12, background: "rgba(216,90,48,0.1)", border: "1px solid rgba(216,90,48,0.15)", fontSize: "0.72rem", color: "rgba(255,255,255,0.6)" }}>{m.name} <span style={{ color: "#D85A30", fontWeight: 600 }}>×{m.count}</span></span>
                      ))}
                    </div>
                  </div>
                  <div style={{ borderRadius: 14, padding: "14px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <h4 className={outfit.className} style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8, fontWeight: 600 }}>✨ Features</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {styleDNA.features.slice(0, 8).map((f, i) => (
                        <span key={i} className={outfit.className} style={{ padding: "3px 10px", borderRadius: 12, background: "rgba(196,164,74,0.1)", border: "1px solid rgba(196,164,74,0.15)", fontSize: "0.72rem", color: "rgba(255,255,255,0.6)" }}>{f.name} <span style={{ color: "#C4A44A", fontWeight: 600 }}>×{f.count}</span></span>
                      ))}
                    </div>
                  </div>
                </div>

                {styleDNA.conflicts.length > 0 && (
                  <div style={{ borderRadius: 12, padding: "12px 14px", background: "rgba(232,168,62,0.06)", border: "1px solid rgba(232,168,62,0.15)" }}>
                    <p className={outfit.className} style={{ fontSize: "0.8rem", color: "#E8A83E", margin: 0, lineHeight: 1.5 }}>💭 {styleDNA.conflicts[0]}</p>
                  </div>
                )}
              </div>

              {/* Individual analyses */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
                {photos.filter(p => p.status === "done" && p.analysis).map(photo => (
                  <div key={photo.id} style={{ borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {photo.src && photo.src.startsWith("data:") && (
                      <img src={photo.src} alt="" style={{ width: "100%", height: 120, objectFit: "cover" }} />
                    )}
                    <div style={{ padding: "10px 12px" }}>
                      <p className={outfit.className} style={{ fontSize: "0.75rem", color: "#D85A30", fontWeight: 600, marginBottom: 4 }}>{photo.analysis!.style}</p>
                      <p className={outfit.className} style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.4, margin: 0 }}>{photo.analysis!.vibe}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={generateDreamFromPhotos} className={outfit.className} data-sound="select" style={{
                width: "100%", padding: "14px 24px", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #D85A30, #E8A83E)", color: "#fff",
                fontSize: "1rem", fontWeight: 600, cursor: "pointer", animation: "pulseGlow 3s ease-in-out infinite",
              }}>Generate Dream from Style DNA ◈</button>
            </div>
          )}

          {/* ── RESULT PHASE — Dream Card ───────────────────────── */}
          {phase === "result" && plan && styleDNA && (
            <div style={{ animation: "cardSlide 0.6s ease" }}>
              <div style={{ borderRadius: 20, padding: "28px 24px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(216,90,48,0.12)", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: "1.6rem" }}>◈</span>
                  <h2 className={cinzel.className} style={{ fontSize: "1.3rem", color: "#D85A30" }}>Your Photo-Inspired Dream</h2>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  <span className={outfit.className} style={{ padding: "5px 14px", borderRadius: 20, background: "rgba(216,90,48,0.1)", border: "1px solid rgba(216,90,48,0.2)", color: "#D85A30", fontSize: "0.78rem", fontWeight: 500 }}>🧬 {styleDNA.dominantStyle}</span>
                  <span className={outfit.className} style={{ padding: "5px 14px", borderRadius: 20, background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.2)", color: "#1D9E75", fontSize: "0.78rem", fontWeight: 500 }}>📷 {doneCount} photos analyzed</span>
                </div>
                {aiNarrative ? (
                  <div className={outfit.className} style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.92rem", lineHeight: 1.75, fontWeight: 300, whiteSpace: "pre-wrap" }}>{aiNarrative}</div>
                ) : isStreaming ? (
                  <div className={outfit.className} style={{ color: "rgba(216,90,48,0.5)", fontSize: "0.85rem", fontStyle: "italic", animation: "micPulse 2s infinite" }}>Writing your vision...</div>
                ) : null}
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Estimated Cost", value: fmt(plan.totalCost), sub: `${fmt(plan.costPerSf)}/sf` },
                  { label: "Timeline", value: plan.timeline, sub: `${plan.sqft.toLocaleString()} sf` },
                  { label: "Quality Tier", value: plan.quality.charAt(0).toUpperCase() + plan.quality.slice(1), sub: `${plan.codes.length} codes` },
                  { label: "Team Size", value: `${plan.team.length} roles`, sub: plan.team.slice(0, 2).map(t => t.role).join(", ") },
                ].map((stat, i) => (
                  <div key={i} style={{ borderRadius: 14, padding: "16px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                    <div className={outfit.className} style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>{stat.label}</div>
                    <div className={outfit.className} style={{ fontSize: "1.15rem", color: "#D85A30", fontWeight: 700, marginBottom: 3 }}>{stat.value}</div>
                    <div className={outfit.className} style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>{stat.sub}</div>
                  </div>
                ))}
              </div>

              {/* Challenges */}
              {plan.challenges.length > 0 && (
                <div style={{ borderRadius: 16, padding: "20px 18px", marginBottom: 20, background: "rgba(216,90,48,0.04)", border: "1px solid rgba(216,90,48,0.12)" }}>
                  <h3 className={outfit.className} style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(216,90,48,0.7)", marginBottom: 12, fontWeight: 600 }}>⚠️ Watch Out For</h3>
                  {plan.challenges.map((ch, i) => (
                    <p key={i} className={outfit.className} style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5, fontWeight: 300, margin: "0 0 6px" }}>• {ch}</p>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                <button onClick={saveDream} disabled={saved} className={outfit.className} style={{
                  padding: "12px 16px", borderRadius: 12, background: saved ? "rgba(29,158,117,0.15)" : "rgba(216,90,48,0.1)",
                  border: `1px solid ${saved ? "rgba(29,158,117,0.3)" : "rgba(216,90,48,0.2)"}`, color: saved ? "#1D9E75" : "#D85A30",
                  fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", transition: "all 0.3s",
                }}>{saved ? "✓ Saved" : "🌱 Save Dream"}</button>
                <button onClick={() => { setPhase("upload"); setStyleDNA(null); setPlan(null); setAiNarrative(""); }} className={outfit.className} style={{
                  padding: "12px 16px", borderRadius: 12, background: "rgba(196,164,74,0.1)", border: "1px solid rgba(196,164,74,0.2)",
                  color: "#C4A44A", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer",
                }}>📷 Add More Photos</button>
                <Link href={`/launch?type=${plan.input.buildingType || "sfr"}&sqft=${plan.sqft}`} className={outfit.className} style={{
                  padding: "12px 16px", borderRadius: 12, background: "linear-gradient(135deg, #D85A30, #E8A83E)",
                  color: "#fff", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none", textAlign: "center",
                }}>🚀 Start Project</Link>
                <button onClick={shareDream} className={outfit.className} style={{
                  padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: shared ? "#1D9E75" : "rgba(255,255,255,0.5)", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer",
                }}>{shared ? "✓ Copied!" : "🔗 Share"}</button>
              </div>
            </div>
          )}

        </div>
      </div>
      <CopilotPanel />
    </>
  );
}
