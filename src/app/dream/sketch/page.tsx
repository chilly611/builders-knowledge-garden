"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Cinzel, Outfit } from "next/font/google";
import CopilotPanel from "@/components/CopilotPanel";
import { parseDream, generateDreamPlan, DreamPlan } from "@/lib/dream-parser";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "700", "900"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

type Tool = "draw" | "rect" | "label" | "eraser";
type RoomType = "bedroom" | "kitchen" | "bathroom" | "living" | "office" | "garage" | "other";

const ROOM_COLORS: Record<RoomType, string> = {
  bedroom: "#5B8DEF", kitchen: "#E8A83E", bathroom: "#3DC8C0",
  living: "#1D9E75", office: "#9B7BDB", garage: "#808080", other: "#C4A44A",
};
const ROOM_LABELS: Record<RoomType, string> = {
  bedroom: "Bedroom", kitchen: "Kitchen", bathroom: "Bath",
  living: "Living", office: "Office", garage: "Garage", other: "Room",
};

interface DrawnRect {
  id: string;
  x: number; y: number; w: number; h: number;
  roomType: RoomType;
  label: string;
  sqft: number;
}

interface FreeStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface Label {
  id: string;
  x: number; y: number;
  text: string;
}

const SCALE_FACTOR = 0.5; // 1 canvas pixel = 0.5 feet

export default function SketchDreamPage() {
  const [mounted, setMounted] = useState(false);
  const [tool, setTool] = useState<Tool>("rect");
  const [roomType, setRoomType] = useState<RoomType>("living");
  const [showGrid, setShowGrid] = useState(true);
  const [rects, setRects] = useState<DrawnRect[]>([]);
  const [strokes, setStrokes] = useState<FreeStroke[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentStroke, setCurrentStroke] = useState<FreeStroke | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [history, setHistory] = useState<{ rects: DrawnRect[]; strokes: FreeStroke[]; labels: Label[] }[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [labelInput, setLabelInput] = useState("");
  const [labelPos, setLabelPos] = useState<{ x: number; y: number } | null>(null);
  const [aiNotes, setAiNotes] = useState<string[]>([]);
  const [plan, setPlan] = useState<DreamPlan | null>(null);
  const [guidedStep, setGuidedStep] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fmt = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;

  useEffect(() => { setMounted(true); }, []);

  // Load saved sketch
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem("bkg-dream-sketch");
      if (raw) {
        const data = JSON.parse(raw);
        if (data.rects) setRects(data.rects);
        if (data.strokes) setStrokes(data.strokes);
        if (data.labels) setLabels(data.labels);
      }
    } catch {}
  }, [mounted]);

  // Auto-save
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("bkg-dream-sketch", JSON.stringify({ rects, strokes, labels }));
  }, [rects, strokes, labels, mounted]);

  // Computed values
  const totalSqft = rects.reduce((sum, r) => sum + r.sqft, 0);
  const roughCostPerSf = 280;
  const roughCost = totalSqft * roughCostPerSf;

  // Push history state
  const pushHistory = useCallback(() => {
    const state = { rects: [...rects], strokes: [...strokes], labels: [...labels] };
    setHistory(prev => [...prev.slice(0, historyIdx + 1), state]);
    setHistoryIdx(prev => prev + 1);
  }, [rects, strokes, labels, historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx < 0) return;
    const prev = history[historyIdx];
    if (prev) { setRects(prev.rects); setStrokes(prev.strokes); setLabels(prev.labels); }
    setHistoryIdx(i => i - 1);
  }, [history, historyIdx]);

  // AI interpretation
  const generateAiNotes = useCallback(() => {
    const notes: string[] = [];
    rects.forEach(r => {
      const dim = `${Math.round(r.w * SCALE_FACTOR)}×${Math.round(r.h * SCALE_FACTOR)} ft`;
      notes.push(`${r.label}: ${dim} (${r.sqft} sf)`);
      if (r.roomType === "bedroom" && r.sqft < 70) notes.push(`⚠️ ${r.label} is below minimum 70 sf per IRC R304`);
      if (r.roomType === "bedroom") notes.push(`📋 ${r.label} needs egress window per IRC R310`);
      if (r.roomType === "bathroom") notes.push(`🔧 ${r.label} needs GFCI outlets + exhaust fan per NEC 210.8`);
      if (r.roomType === "kitchen") notes.push(`🔥 ${r.label} needs 2+ dedicated 20A circuits per NEC 210.11`);
    });
    if (totalSqft > 0) notes.push(`📐 Total: ${totalSqft} sf • Est. ${fmt(roughCost)} at $${roughCostPerSf}/sf`);
    setAiNotes(notes);
  }, [rects, totalSqft, roughCost, roughCostPerSf, fmt]);

  useEffect(() => { generateAiNotes(); }, [rects, generateAiNotes]);

  // Canvas rendering
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }

    // Freehand strokes
    strokes.forEach(s => {
      if (s.points.length < 2) return;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      s.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });

    // Rectangles
    rects.forEach(r => {
      const color = ROOM_COLORS[r.roomType] || "#C4A44A";
      ctx.fillStyle = color + "18";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = color + "80";
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      // Label
      ctx.fillStyle = color;
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(r.label, r.x + r.w / 2, r.y + r.h / 2 - 4);
      ctx.font = "10px sans-serif";
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillText(`${r.sqft} sf`, r.x + r.w / 2, r.y + r.h / 2 + 10);
    });

    // Labels
    labels.forEach(l => {
      ctx.fillStyle = "#E8A83E";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(l.text, l.x, l.y);
    });

    // Current drawing preview
    if (currentRect) {
      const color = ROOM_COLORS[roomType] || "#C4A44A";
      ctx.strokeStyle = color + "60";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.w, currentRect.h);
      ctx.setLineDash([]);
    }
    if (currentStroke && currentStroke.points.length > 1) {
      ctx.strokeStyle = currentStroke.color;
      ctx.lineWidth = currentStroke.width;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
      currentStroke.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
  }, [showGrid, strokes, rects, labels, currentRect, currentStroke, roomType]);

  useEffect(() => { render(); }, [render]);

  // Resize canvas
  useEffect(() => {
    if (!mounted || !containerRef.current || !canvasRef.current) return;
    const resize = () => {
      const el = containerRef.current!;
      canvasRef.current!.width = el.clientWidth;
      canvasRef.current!.height = Math.max(400, el.clientHeight);
      render();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [mounted, render]);

  // Mouse/touch position helper
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    setIsDrawing(true);
    setDrawStart(pos);
    if (tool === "draw") {
      setCurrentStroke({ points: [pos], color: ROOM_COLORS[roomType], width: 3 });
    } else if (tool === "label") {
      setLabelPos(pos);
    }
  }, [tool, roomType]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !drawStart) return;
    const pos = getPos(e);
    if (tool === "draw" && currentStroke) {
      setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, pos] } : null);
    } else if (tool === "rect") {
      setCurrentRect({ x: drawStart.x, y: drawStart.y, w: pos.x - drawStart.x, h: pos.y - drawStart.y });
    }
    render();
  }, [isDrawing, drawStart, tool, currentStroke, render]);

  const handlePointerUp = useCallback(() => {
    if (tool === "draw" && currentStroke && currentStroke.points.length > 1) {
      pushHistory();
      setStrokes(prev => [...prev, currentStroke]);
    } else if (tool === "rect" && currentRect) {
      const w = Math.abs(currentRect.w);
      const h = Math.abs(currentRect.h);
      if (w > 10 && h > 10) {
        pushHistory();
        const sqft = Math.round(w * SCALE_FACTOR * h * SCALE_FACTOR);
        const newRect: DrawnRect = {
          id: crypto.randomUUID(),
          x: currentRect.w < 0 ? currentRect.x + currentRect.w : currentRect.x,
          y: currentRect.h < 0 ? currentRect.y + currentRect.h : currentRect.y,
          w, h, roomType, label: ROOM_LABELS[roomType], sqft,
        };
        setRects(prev => [...prev, newRect]);
      }
    }
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentStroke(null);
    setCurrentRect(null);
  }, [tool, currentStroke, currentRect, roomType, pushHistory]);

  const handleLabelSubmit = useCallback(() => {
    if (!labelInput.trim() || !labelPos) return;
    pushHistory();
    setLabels(prev => [...prev, { id: crypto.randomUUID(), x: labelPos.x, y: labelPos.y, text: labelInput.trim() }]);
    setLabelInput("");
    setLabelPos(null);
  }, [labelInput, labelPos, pushHistory]);

  const clearAll = useCallback(() => {
    pushHistory();
    setRects([]); setStrokes([]); setLabels([]);
    localStorage.removeItem("bkg-dream-sketch");
  }, [pushHistory]);

  const generateDreamFromSketch = useCallback(() => {
    const roomDesc = rects.map(r => `${r.label} (${r.sqft} sf)`).join(", ");
    const dreamText = `A ${totalSqft} square foot home with ${roomDesc}`;
    const parsed = parseDream(dreamText);
    const dreamPlan = generateDreamPlan(parsed);
    setPlan(dreamPlan);
    setShowResult(true);
  }, [rects, totalSqft]);

  const GUIDED_STEPS = [
    { icon: "📐", title: "Draw the exterior", desc: "Select Rectangle tool and draw the building footprint" },
    { icon: "🏠", title: "Add rooms", desc: "Choose a room type and draw rectangles for each room" },
    { icon: "🏷️", title: "Label rooms", desc: "Use the Label tool to name each space" },
    { icon: "✨", title: "Generate dream", desc: "Click 'See My Dream' to get codes, costs, and AI analysis" },
  ];

  if (!mounted) return <div style={{ minHeight: "100vh", background: "#1a0f05" }} />;

  return (
    <>
      <style jsx global>{`
        @keyframes cardSlide { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .tool-btn { padding: 8px; border-radius: 10px; border: 1px solid #e2e2e2; background: #f8f8f8; color: #777; font-size: 1.1rem; cursor: pointer; transition: all 0.2s; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
        .tool-btn:hover { border-color: rgba(196,164,74,0.3); color: rgba(255,255,255,0.8); }
        .tool-btn.active { border-color: #C4A44A; background: rgba(196,164,74,0.15); color: #C4A44A; }
        .room-chip { padding: 4px 10px; border-radius: 12px; border: 1px solid #e2e2e2; font-size: 0.65rem; cursor: pointer; transition: all 0.2s; }
        .room-chip:hover { border-color: rgba(196,164,74,0.3); }
        .room-chip.active { border-color: var(--rc); background: color-mix(in srgb, var(--rc) 15%, transparent); color: var(--rc); }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#fff",
        padding: "clamp(24px, 4vh, 40px) 16px 80px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Link href="/dream" className={outfit.className} style={{ color: "#a08840", textDecoration: "none", fontSize: "0.82rem", letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
            <span style={{ fontSize: "0.9em" }}>←</span> Dream Machine
          </Link>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <div>
              <h1 className={cinzel.className} style={{ fontSize: "clamp(1.3rem, 3.5vw, 1.8rem)", color: "#C4A44A", marginBottom: 4 }}>Sketch It Out</h1>
              <p className={outfit.className} style={{ color: "#aaa", fontSize: "0.78rem" }}>{rects.length} rooms • {totalSqft} sf • Est. {fmt(roughCost)}</p>
            </div>
            <button onClick={() => setGuidedStep(guidedStep === null ? 0 : null)} className={outfit.className} style={{
              padding: "6px 14px", borderRadius: 10, background: "rgba(196,164,74,0.1)", border: "1px solid rgba(196,164,74,0.2)",
              color: "#C4A44A", fontSize: "0.75rem", cursor: "pointer",
            }}>{guidedStep !== null ? "Hide Guide" : "📖 Help Me Draw"}</button>
          </div>

          {/* Guided steps */}
          {guidedStep !== null && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
              {GUIDED_STEPS.map((step, i) => (
                <div key={i} onClick={() => setGuidedStep(i)} className={outfit.className} style={{
                  flex: "0 0 auto", padding: "10px 14px", borderRadius: 12, cursor: "pointer",
                  background: guidedStep === i ? "rgba(196,164,74,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${guidedStep === i ? "rgba(196,164,74,0.25)" : "rgba(255,255,255,0.06)"}`,
                  opacity: guidedStep === i ? 1 : 0.5,
                }}>
                  <span style={{ fontSize: "1.1rem" }}>{step.icon}</span>
                  <div style={{ fontSize: "0.7rem", color: guidedStep === i ? "#C4A44A" : "rgba(255,255,255,0.5)", marginTop: 4, fontWeight: 500 }}>{step.title}</div>
                </div>
              ))}
            </div>
          )}

          {/* Main layout: tools | canvas | interpretation */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr minmax(220px, 280px)", gap: 12 }}>

            {/* Tool palette */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {([
                { id: "rect" as Tool, icon: "⬜", tip: "Rectangle" },
                { id: "draw" as Tool, icon: "✏️", tip: "Freehand" },
                { id: "label" as Tool, icon: "🏷️", tip: "Label" },
                { id: "eraser" as Tool, icon: "🧹", tip: "Eraser" },
              ]).map(t => (
                <button key={t.id} className={`tool-btn ${tool === t.id ? "active" : ""}`} title={t.tip} onClick={() => setTool(t.id)}>{t.icon}</button>
              ))}
              <div style={{ height: 1, background: "#f2f2f2", margin: "4px 0" }} />
              <button className="tool-btn" title="Undo" onClick={undo}>↩</button>
              <button className="tool-btn" title="Grid" onClick={() => setShowGrid(!showGrid)} style={{ color: showGrid ? "#C4A44A" : undefined }}>⊞</button>
              <button className="tool-btn" title="Clear" onClick={clearAll}>🗑️</button>
            </div>

            {/* Canvas area */}
            <div ref={containerRef} style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid #e2e2e2", background: "#f8f8f8", minHeight: 400 }}>
              <canvas ref={canvasRef}
                onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp}
                style={{ display: "block", cursor: tool === "draw" ? "crosshair" : tool === "rect" ? "crosshair" : tool === "label" ? "text" : "pointer" }}
              />
              {/* Label input overlay */}
              {labelPos && tool === "label" && (
                <div style={{ position: "absolute", left: labelPos.x - 60, top: labelPos.y - 16, zIndex: 10 }}>
                  <input type="text" value={labelInput} onChange={e => setLabelInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleLabelSubmit(); if (e.key === "Escape") setLabelPos(null); }}
                    autoFocus placeholder="Label..."
                    className={outfit.className}
                    style={{ padding: "4px 10px", borderRadius: 8, background: "#fff", border: "1px solid #C4A44A", color: "#222", fontSize: "0.8rem", outline: "none", width: 120, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                </div>
              )}
              {/* Room type selector */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 12px", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderTop: "1px solid #e8e8e8", display: "flex", gap: 6, overflowX: "auto" }}>
                {(Object.keys(ROOM_COLORS) as RoomType[]).map(rt => (
                  <button key={rt} className={`room-chip ${outfit.className} ${roomType === rt ? "active" : ""}`}
                    onClick={() => setRoomType(rt)}
                    style={{ "--rc": ROOM_COLORS[rt], color: roomType === rt ? ROOM_COLORS[rt] : "rgba(255,255,255,0.4)" } as React.CSSProperties}
                  >{ROOM_LABELS[rt]}</button>
                ))}
              </div>
            </div>

            {/* Interpretation panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ borderRadius: 14, padding: "16px 14px", background: "#f8f8f8", border: "1px solid #e8e8e8", flex: 1, overflowY: "auto", maxHeight: 420 }}>
                <h3 className={outfit.className} style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#aaa", marginBottom: 10, fontWeight: 600 }}>🧠 AI Interpretation</h3>
                {aiNotes.length === 0 ? (
                  <p className={outfit.className} style={{ fontSize: "0.78rem", color: "#bbb", fontStyle: "italic" }}>Draw rooms to see AI analysis...</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {aiNotes.map((note, i) => (
                      <p key={i} className={outfit.className} style={{ fontSize: "0.75rem", color: note.startsWith("⚠") ? "rgba(216,90,48,0.8)" : note.startsWith("📋") || note.startsWith("🔧") || note.startsWith("🔥") ? "rgba(196,164,74,0.7)" : "rgba(255,255,255,0.5)", lineHeight: 1.4, margin: 0 }}>{note}</p>
                    ))}
                  </div>
                )}
              </div>

              {rects.length >= 1 && (
                <button onClick={generateDreamFromSketch} className={outfit.className} data-sound="select" style={{
                  padding: "12px 16px", borderRadius: 12, border: "none",
                  background: "linear-gradient(135deg, #C4A44A, #E8A83E)", color: "#222",
                  fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
                }}>See My Dream △</button>
              )}
            </div>
          </div>

          {/* Result panel */}
          {showResult && plan && (
            <div style={{ marginTop: 24, animation: "cardSlide 0.5s ease" }}>
              <div style={{ borderRadius: 18, padding: "24px 20px", background: "rgba(196,164,74,0.04)", border: "1px solid rgba(196,164,74,0.15)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: "1.4rem" }}>△</span>
                  <h2 className={cinzel.className} style={{ fontSize: "1.2rem", color: "#C4A44A" }}>Your Sketch Dream</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: "Total Area", value: `${totalSqft} sf`, sub: `${rects.length} rooms` },
                    { label: "Est. Cost", value: fmt(plan.totalCost), sub: `${fmt(plan.costPerSf)}/sf` },
                    { label: "Timeline", value: plan.timeline, sub: plan.quality },
                    { label: "Team", value: `${plan.team.length} roles`, sub: plan.team.slice(0, 2).map(t => t.role).join(", ") },
                  ].map((s, i) => (
                    <div key={i} style={{ borderRadius: 12, padding: "12px 10px", background: "#f8f8f8", border: "1px solid #e8e8e8", textAlign: "center" }}>
                      <div className={outfit.className} style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#bbb", marginBottom: 4 }}>{s.label}</div>
                      <div className={outfit.className} style={{ fontSize: "1.05rem", color: "#C4A44A", fontWeight: 700 }}>{s.value}</div>
                      <div className={outfit.className} style={{ fontSize: "0.65rem", color: "#bbb" }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link href={`/launch?sqft=${totalSqft}`} className={outfit.className} style={{
                    padding: "10px 18px", borderRadius: 12, background: "linear-gradient(135deg, #C4A44A, #E8A83E)",
                    color: "#222", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none",
                  }}>🚀 Start Project</Link>
                  <Link href={`/dream/describe?dream=${encodeURIComponent(`A ${totalSqft} sf home with ${rects.map(r => r.label).join(", ")}`)}`} className={outfit.className} style={{
                    padding: "10px 18px", borderRadius: 12, background: "rgba(232,168,62,0.1)", border: "1px solid rgba(232,168,62,0.2)",
                    color: "#E8A83E", fontSize: "0.82rem", fontWeight: 500, textDecoration: "none",
                  }}>✦ Describe Further</Link>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      <CopilotPanel />
    </>
  );
}
