"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ConstructionAnimation — Watch a building rise phase by phase
 * 
 * 6 construction phases crossfading with labels and progress bar.
 * Uses curated stock photos per phase, or AI-generated renders.
 */

interface Props {
  buildingType?: string;
  images?: string[];
  autoPlay?: boolean;
  interval?: number;
  height?: number;
  onComplete?: () => void;
}

const PHASES = [
  { label: "Site Preparation", sub: "Grading, excavation, utilities", progress: 8 },
  { label: "Foundation", sub: "Footings, slab, waterproofing", progress: 20 },
  { label: "Framing", sub: "Structure rising, roof trusses", progress: 40 },
  { label: "Envelope", sub: "Roofing, siding, windows, doors", progress: 60 },
  { label: "Interior", sub: "MEP, drywall, finishes, fixtures", progress: 85 },
  { label: "Complete", sub: "Landscaping, final touches", progress: 100 },
];

// Stock construction phase photos from Unsplash
const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80&fit=crop", // excavation/grading
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80&fit=crop",  // foundation
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80&fit=crop",  // framing
  "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80&fit=crop",    // envelope/exterior
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80&fit=crop",  // interior
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80&fit=crop",  // complete home
];

export default function ConstructionAnimation({
  buildingType,
  images,
  autoPlay = true,
  interval = 3,
  height = 360,
  onComplete,
}: Props) {
  const [activePhase, setActivePhase] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const phaseImages = images || DEFAULT_IMAGES;

  // Auto-advance
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActivePhase(prev => {
        if (prev >= 5) {
          setIsPlaying(false);
          onComplete?.();
          return 5;
        }
        return prev + 1;
      });
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [isPlaying, interval, onComplete]);

  const goTo = useCallback((idx: number) => {
    setActivePhase(idx);
    setIsPlaying(false);
  }, []);

  const phase = PHASES[activePhase];

  return (
    <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid var(--border, #e5e5e5)", background: "#000" }}>
      {/* Image area with crossfade */}
      <div style={{ position: "relative", height, overflow: "hidden" }}>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activePhase}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${phaseImages[activePhase] || phaseImages[0]})`,
              backgroundSize: "cover", backgroundPosition: "center",
            }}
          />
        </AnimatePresence>

        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%)", zIndex: 2 }} />

        {/* Phase info overlay */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 24px", zIndex: 3 }}>
          <motion.div
            key={`label-${activePhase}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#1D9E75", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
              Phase {activePhase + 1} of 6
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
              {phase.label}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
              {phase.sub}
            </div>
          </motion.div>
        </div>

        {/* Play/pause button */}
        <button
          onClick={() => { if (activePhase >= 5) { setActivePhase(0); setIsPlaying(true); } else { setIsPlaying(!isPlaying); } }}
          style={{
            position: "absolute", top: 16, right: 16, zIndex: 5,
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.2)", color: "#fff",
            fontSize: 14, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
          {activePhase >= 5 ? "↻" : isPlaying ? "❚❚" : "▶"}
        </button>
      </div>

      {/* Phase timeline + progress bar */}
      <div style={{ padding: "12px 16px", background: "var(--bg, #fff)" }}>
        {/* Progress bar */}
        <div style={{ height: 3, borderRadius: 2, background: "var(--border, #e5e5e5)", marginBottom: 10, overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${phase.progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #1D9E75, #5DCAA5)" }}
          />
        </div>

        {/* Clickable phase dots */}
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          {PHASES.map((p, i) => (
            <button key={i} onClick={() => goTo(i)}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 8, border: "none", cursor: "pointer",
                background: i === activePhase ? "var(--accent, #1D9E75)" + "15" : "transparent",
                transition: "all 0.2s",
              }}>
              <div style={{
                width: "100%", height: 3, borderRadius: 2, marginBottom: 4,
                background: i <= activePhase ? "var(--accent, #1D9E75)" : "var(--border, #e5e5e5)",
                transition: "background 0.3s",
              }} />
              <div style={{
                fontSize: 9, fontWeight: i === activePhase ? 600 : 400,
                color: i === activePhase ? "var(--accent, #1D9E75)" : "var(--fg-tertiary, #999)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {p.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
