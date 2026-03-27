"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number; color: string;
  decay: number;
}

export default function SplashIntro({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const [phase, setPhase] = useState<"logo" | "explode" | "done">("logo");
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  const explode = useCallback(() => {
    const canvas = canvasRef.current;
    const logo = logoRef.current;
    if (!canvas || !logo) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Draw logo to offscreen canvas to sample pixels
    const offscreen = document.createElement("canvas");
    const logoSize = Math.min(280, window.innerWidth * 0.5);
    offscreen.width = logoSize;
    offscreen.height = logoSize;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;
    offCtx.drawImage(logo, 0, 0, logoSize, logoSize);
    const imageData = offCtx.getImageData(0, 0, logoSize, logoSize);

    // Sample pixels from logo to create particles
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const ox = cx - logoSize / 2;
    const oy = cy - logoSize / 2;
    const step = 3; // sample every 3rd pixel
    const particles: Particle[] = [];

    for (let y = 0; y < logoSize; y += step) {
      for (let x = 0; x < logoSize; x += step) {
        const i = (y * logoSize + x) * 4;
        const r = imageData.data[i], g = imageData.data[i + 1], b = imageData.data[i + 2], a = imageData.data[i + 3];
        if (a < 50) continue; // skip transparent pixels
        const px = ox + x;
        const py = oy + y;
        const angle = Math.atan2(py - cy, px - cx) + (Math.random() - 0.5) * 1.2;
        const speed = 4 + Math.random() * 12;
        particles.push({
          x: px, y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 3,
          alpha: 1,
          color: `rgb(${r},${g},${b})`,
          decay: 0.015 + Math.random() * 0.025,
        });
      }
    }
    // Add extra sparkle particles in warm gold
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * logoSize * 0.4;
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: Math.cos(angle) * (8 + Math.random() * 16),
        vy: Math.sin(angle) * (8 + Math.random() * 16),
        size: 1 + Math.random() * 4,
        alpha: 1,
        color: ["#E8A83E", "#D85A30", "#C4A44A", "#1D9E75"][Math.floor(Math.random() * 4)],
        decay: 0.02 + Math.random() * 0.03,
      });
    }
    particlesRef.current = particles;

    setPhase("explode");

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      for (const p of particlesRef.current) {
        if (p.alpha <= 0) continue;
        alive++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.vx *= 0.99;
        p.alpha -= p.decay;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      if (alive > 0) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setPhase("done");
        onComplete();
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);
  }, [onComplete]);

  useEffect(() => {
    // After logo displays for 1.2s, trigger explosion
    const timer = setTimeout(() => explode(), 1200);
    return () => { clearTimeout(timer); cancelAnimationFrame(animFrameRef.current); };
  }, [explode]);

  // Safety timeout — force complete after 4s no matter what
  useEffect(() => {
    const safety = setTimeout(() => { setPhase("done"); onComplete(); }, 4000);
    return () => clearTimeout(safety);
  }, [onComplete]);

  if (phase === "done") return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "opacity 0.4s ease",
      opacity: phase === "explode" ? 1 : 1,
    }}>
      {/* Logo — visible during "logo" phase, hidden during "explode" */}
      {phase === "logo" && (
        <div style={{ animation: "splashLogoIn 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <img
            ref={logoRef}
            src="/logo/b_transparent_512.png"
            alt="Builder's Knowledge Garden"
            style={{ width: "clamp(160px, 35vw, 280px)", height: "auto" }}
            crossOrigin="anonymous"
          />
        </div>
      )}
      {/* Hidden img for pixel sampling during explode */}
      {phase !== "logo" && (
        <img ref={logoRef} src="/logo/b_transparent_512.png" alt="" style={{ display: "none" }} crossOrigin="anonymous" />
      )}
      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none",
      }} />
      <style jsx global>{`
        @keyframes splashLogoIn {
          0% { opacity: 0; transform: scale(0.3) rotate(-10deg); }
          60% { opacity: 1; transform: scale(1.05) rotate(2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0); }
        }
      `}</style>
    </div>
  );
}
