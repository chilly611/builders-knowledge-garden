"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Lane {
  id: string;
  icon: string;
  label: string;
  tagline: string;
  savings: string;
  replaces: string;
  color: string;
}

interface LanePickerProps {
  onSelect: (lane: string) => void;
  onDismiss: () => void;
}

const LANES: Lane[] = [
  {
    id: "dreamer",
    icon: "🏠",
    label: "Dreamer",
    tagline: "I'm dreaming about what to build",
    savings: "Save $50K+ on your build",
    replaces: "Angi, Houzz, guesswork",
    color: "#1D9E75",
  },
  {
    id: "builder",
    icon: "🏗️",
    label: "Builder",
    tagline: "I manage the whole build",
    savings: "Save 12+ hrs/week on paperwork",
    replaces: "Procore, Excel, QuickBooks",
    color: "#E8443A",
  },
  {
    id: "specialist",
    icon: "⚡",
    label: "Specialist",
    tagline: "Electrical, plumbing, HVAC, roofing...",
    savings: "Win 40% more bids",
    replaces: "XBuild, pen & paper estimates",
    color: "#D85A30",
  },
  {
    id: "merchant",
    icon: "🚛",
    label: "Merchant",
    tagline: "I sell materials or equipment",
    savings: "Reach contractors who need you now",
    replaces: "Cold calls, trade shows",
    color: "#BA7517",
  },
  {
    id: "ally",
    icon: "📊",
    label: "Ally",
    tagline: "I fund and develop projects",
    savings: "Track ROI across your portfolio",
    replaces: "Spreadsheets, Buildertrend",
    color: "#378ADD",
  },
  {
    id: "crew",
    icon: "👷",
    label: "Crew",
    tagline: "I work on build sites daily",
    savings: "Coordinate easier on site",
    replaces: "Paper forms, phone calls",
    color: "#6B7280",
  },
  {
    id: "fleet",
    icon: "🛠️",
    label: "Fleet",
    tagline: "I manage multiple projects or teams",
    savings: "Oversee 10+ projects at once",
    replaces: "Scattered spreadsheets",
    color: "#7F77DD",
  },
  {
    id: "machine",
    icon: "🤖",
    label: "Machine",
    tagline: "I'm a machine accessing structured data",
    savings: "MCP-native API, structured for agents",
    replaces: "Scraping, unstructured data",
    color: "#4B5563",
  },
];

export default function LanePicker({ onSelect, onDismiss }: LanePickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const celebrationFrameRef = useRef<number>(0);

  // Confetti/sparkle animation
  const createCelebration = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
    }

    const particles: Particle[] = [];

    // Create sparkle dots in brand colors (all 8 lane colors)
    const colors = ["#1D9E75", "#E8443A", "#D85A30", "#BA7517", "#378ADD", "#6B7280", "#7F77DD", "#4B5563"];
    for (let i = 0; i < 80; i++) {
      const angle = (Math.PI * 2 * i) / 80;
      const distance = 50 + Math.random() * 100;
      particles.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        vx: Math.cos(angle) * (6 + Math.random() * 8),
        vy: Math.sin(angle) * (6 + Math.random() * 8) - 3,
        size: 2 + Math.random() * 4,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;

      for (const p of particles) {
        if (p.alpha <= 0) continue;
        alive++;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // gravity
        p.vx *= 0.98;
        p.alpha -= 0.015;

        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (alive > 0) {
        celebrationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    celebrationFrameRef.current = requestAnimationFrame(animate);
  };

  const handleCardClick = (laneId: string) => {
    setSelectedId(laneId);
    setShowCelebration(true);

    // Find the center of the card for celebration origin
    const card = document.querySelector(`[data-lane="${laneId}"]`);
    if (card) {
      const rect = card.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      createCelebration(x, y);
    }

    // Auto-trigger completion after celebration
    setTimeout(() => {
      onSelect(laneId);
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (celebrationFrameRef.current) {
        cancelAnimationFrame(celebrationFrameRef.current);
      }
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
      },
    },
  };

  const selectedVariants = {
    scale: [1, 1.05, 0.98, 1],
    transition: {
      duration: 0.6,
      times: [0, 0.3, 0.7, 1],
      ease: "easeInOut" as const,
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "auto",
        fontFamily: "var(--font-archivo, system-ui, sans-serif)",
      }}
    >
      {/* Header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          style={{
            textAlign: "center",
            paddingTop: "clamp(24px, 6vw, 48px)",
            paddingBottom: "clamp(12px, 3vw, 24px)",
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          <h1
            style={{
              fontSize: "clamp(28px, 8vw, 48px)",
              fontWeight: 700,
              margin: "0 0 8px 0",
              lineHeight: 1.2,
              color: "#222222",
            }}
          >
            What are you building?
          </h1>
          <p
            style={{
              fontSize: "clamp(14px, 4vw, 18px)",
              color: "#666666",
              margin: 0,
              lineHeight: 1.5,
              maxWidth: 500,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Pick your lane. We'll set up your command center.
          </p>
        </motion.div>
      </div>

      {/* Cards Grid */}
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          marginTop: "clamp(140px, 18vw, 200px)",
          marginBottom: "clamp(80px, 10vw, 120px)",
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(clamp(150px, 45vw, 320px), 1fr))",
            gap: "clamp(12px, 4vw, 20px)",
          }}
        >
          {LANES.map((lane) => {
            const isSelected = selectedId === lane.id;

            return (
              <motion.button
                key={lane.id}
                data-lane={lane.id}
                variants={cardVariants}
                animate={isSelected ? selectedVariants : {}}
                onClick={() => handleCardClick(lane.id)}
                whileHover={!isSelected ? { y: -4, scale: 1.02 } : {}}
                whileTap={{ scale: 0.98 }}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  minHeight: 120,
                  padding: "clamp(12px, 4vw, 20px)",
                  borderRadius: 16,
                  border: "none",
                  cursor: "pointer",
                  background: isSelected ? `${lane.color}15` : "#FAFAF8",
                  textAlign: "left",
                  transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.boxShadow = `0 12px 32px ${lane.color}28`;
                    el.style.borderColor = lane.color;
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = "none";
                  el.style.borderColor = "transparent";
                }}
              >
                {/* Glow border effect */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 16,
                    border: `2px solid transparent`,
                    background: isSelected ? `linear-gradient(135deg, ${lane.color}40, ${lane.color}10)` : "none",
                    pointerEvents: "none",
                    transition: "all 0.3s ease",
                  }}
                />

                {/* Icon */}
                <div
                  style={{
                    fontSize: "clamp(32px, 8vw, 44px)",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {lane.icon}
                </div>

                {/* Label & Tagline */}
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div
                    style={{
                      fontSize: "clamp(13px, 3.5vw, 16px)",
                      fontWeight: 700,
                      color: "#222222",
                      lineHeight: 1.2,
                      marginBottom: 4,
                    }}
                  >
                    {lane.label}
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(11px, 3vw, 13px)",
                      color: lane.color,
                      fontWeight: 600,
                      lineHeight: 1.3,
                    }}
                  >
                    {lane.tagline}
                  </div>
                </div>

                {/* Savings */}
                <div
                  style={{
                    fontSize: "clamp(10px, 2.5vw, 12px)",
                    color: "#444444",
                    fontWeight: 500,
                    lineHeight: 1.4,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {lane.savings}
                </div>

                {/* Replaces */}
                <div
                  style={{
                    fontSize: "clamp(9px, 2.2vw, 11px)",
                    color: "#888888",
                    fontWeight: 400,
                    lineHeight: 1.3,
                    position: "relative",
                    zIndex: 1,
                    marginTop: "auto",
                  }}
                >
                  {lane.replaces}
                </div>

                {/* Checkmark */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        background: lane.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                        fontSize: 18,
                        fontWeight: 700,
                        zIndex: 2,
                      }}
                    >
                      ✓
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* "Let's Go" Button (appears after selection) */}
      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{
              position: "fixed",
              bottom: "clamp(20px, 6vw, 40px)",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10001,
            }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const lane = LANES.find((l) => l.id === selectedId);
                if (lane) onSelect(lane.id);
              }}
              style={{
                padding: "clamp(12px, 3vw, 16px) clamp(28px, 6vw, 40px)",
                borderRadius: 8,
                border: "none",
                background: LANES.find((l) => l.id === selectedId)?.color || "#1D9E75",
                color: "#FFFFFF",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-archivo, system-ui, sans-serif)",
                boxShadow: `0 8px 24px ${LANES.find((l) => l.id === selectedId)?.color || "#1D9E75"}40`,
                transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              Let's go!
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        style={{
          position: "fixed",
          bottom: 16,
          left: 16,
          right: 16,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "clamp(11px, 2.5vw, 12px)",
            color: "#999999",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          You can change your lane anytime in settings
        </p>
        <motion.button
          onClick={onDismiss}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            marginTop: 12,
            background: '#f5f5f0',
            border: '1px solid #e5e5e0',
            borderRadius: 10,
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 700,
            color: '#666',
            cursor: 'pointer',
            fontFamily: 'var(--font-archivo)',
          }}
        >
          Skip Intro →
        </motion.button>
      </motion.div>

      {/* Celebration canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 9999,
        }}
      />
    </motion.div>
  );
}
