"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
// COMPLETION RING — SVG circular progress indicator
// Used everywhere: dashboard cards, phase indicators, confidence score
// ═══════════════════════════════════════════════════════════════════

interface CompletionRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  children?: React.ReactNode;
  animate?: boolean;
}

export function CompletionRing({
  percent,
  size = 64,
  strokeWidth = 4,
  color = "var(--accent)",
  bgColor = "var(--border)",
  children,
  animate = true,
}: CompletionRingProps) {
  const [rendered, setRendered] = useState(animate ? 0 : percent);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animate) { setRendered(percent); return; }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          // Animate from 0 to target
          let start: number | null = null;
          const duration = 800;
          const step = (ts: number) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setRendered(eased * percent);
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [percent, animate]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(rendered, 100) / 100);

  return (
    <div ref={ref} style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: animate ? "none" : "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      {children && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// ANIMATED COUNTER — Numbers roll up like an odometer
// ═══════════════════════════════════════════════════════════════════

interface AnimCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 1000,
  decimals = 0,
  className,
  style,
}: AnimCounterProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    if (animated.current) {
      // Already animated once, just update directly
      setDisplay(value);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !animated.current) {
          animated.current = true;
          let start: number | null = null;
          const step = (ts: number) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(eased * value);
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value, duration]);

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.floor(display).toLocaleString();

  return (
    <span ref={ref} className={className} style={style}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CONFIDENCE SCORE — Dynamic project readiness percentage (#9)
// ═══════════════════════════════════════════════════════════════════

interface ConfidenceScoreProps {
  codesReviewed: number;
  totalCodes: number;
  permitsIdentified: number;
  totalPermits: number;
  teamAssembled: number;
  totalTeam: number;
  estimateGenerated: boolean;
  scheduleGenerated: boolean;
  jurisdictionSet: boolean;
  buildingTypeSet: boolean;
}

export function calculateConfidence(props: ConfidenceScoreProps): number {
  let score = 0;
  // Building type selected: 10%
  if (props.buildingTypeSet) score += 10;
  // Jurisdiction set: 10%
  if (props.jurisdictionSet) score += 10;
  // Codes reviewed: up to 20%
  if (props.totalCodes > 0) score += (props.codesReviewed / props.totalCodes) * 20;
  // Permits identified: up to 15%
  if (props.totalPermits > 0) score += (props.permitsIdentified / props.totalPermits) * 15;
  // Team assembled: up to 15%
  if (props.totalTeam > 0) score += (props.teamAssembled / props.totalTeam) * 15;
  // Estimate generated: 15%
  if (props.estimateGenerated) score += 15;
  // Schedule generated: 15%
  if (props.scheduleGenerated) score += 15;
  return Math.min(Math.round(score), 100);
}

export function ConfidenceScore({ score }: { score: number }) {
  const color = score >= 85 ? "#1D9E75" : score >= 50 ? "#BA7517" : score >= 25 ? "#D85A30" : "var(--fg-tertiary)";
  const label = score >= 85 ? "Ready to Build" : score >= 50 ? "Making Progress" : score >= 25 ? "Getting Started" : "Just Beginning";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <CompletionRing percent={score} size={56} strokeWidth={5} color={color}>
        <span style={{ fontSize: 14, fontWeight: 600, color }}>{score}%</span>
      </CompletionRing>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color }}>Project Confidence</div>
        <div style={{ fontSize: 10, color: "var(--fg-tertiary)" }}>{label}</div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// LIFECYCLE FOG OF WAR — Phases illuminate as you progress (#1)
// ═══════════════════════════════════════════════════════════════════

const LIFECYCLE = [
  { id: "dream",   label: "DREAM",   color: "#D85A30", icon: "💭", desc: "Imagine & explore" },
  { id: "design",  label: "DESIGN",  color: "#7F77DD", icon: "📐", desc: "Plans & specifications" },
  { id: "plan",    label: "PLAN",    color: "#1D9E75", icon: "📋", desc: "Schedule, budget, permits" },
  { id: "build",   label: "BUILD",   color: "#378ADD", icon: "🏗️", desc: "Execute construction" },
  { id: "deliver", label: "DELIVER", color: "#BA7517", icon: "🔑", desc: "Handoff & commission" },
  { id: "grow",    label: "GROW",    color: "#639922", icon: "📈", desc: "Business & reputation" },
];

interface LifecycleFogProps {
  /** Index of the current active phase (0-5) */
  activePhase: number;
  /** Which phases have been "unlocked" (visited/completed) */
  unlockedPhases?: number[];
}

export function LifecycleFog({ activePhase, unlockedPhases = [] }: LifecycleFogProps) {
  const unlocked = new Set([...unlockedPhases, activePhase, ...Array.from({ length: activePhase }, (_, i) => i)]);

  return (
    <div style={{ display: "flex", gap: 4, width: "100%" }}>
      {LIFECYCLE.map((phase, i) => {
        const isActive = i === activePhase;
        const isUnlocked = unlocked.has(i);
        const isFuture = i > activePhase && !isUnlocked;

        return (
          <div
            key={phase.id}
            style={{
              flex: 1, padding: "10px 6px", borderRadius: 10, textAlign: "center",
              background: isActive ? phase.color + "18" : "var(--bg-secondary)",
              border: isActive ? `2px solid ${phase.color}` : "1px solid var(--border)",
              opacity: isFuture ? 0.35 : 1,
              filter: isFuture ? "blur(0.5px)" : "none",
              transition: "all 0.5s ease",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Fog overlay for future phases */}
            {isFuture && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: 10,
                background: "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)",
                opacity: 0.6,
              }} />
            )}
            <div style={{ fontSize: 18, marginBottom: 2, position: "relative" }}>{phase.icon}</div>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: 1,
              color: isActive ? phase.color : isUnlocked ? "var(--fg-secondary)" : "var(--fg-tertiary)",
              position: "relative",
            }}>
              {phase.label}
            </div>
            <div style={{
              fontSize: 8, color: "var(--fg-tertiary)", marginTop: 2, position: "relative",
            }}>
              {isUnlocked || isActive ? phase.desc : "???"}
            </div>
            {/* Active pulse indicator */}
            {isActive && (
              <div style={{
                position: "absolute", top: 4, right: 4,
                width: 6, height: 6, borderRadius: "50%",
                background: phase.color,
                animation: "pulse 2s infinite",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// QUEST LINE — Mission-based wizard step framing (#4)
// ═══════════════════════════════════════════════════════════════════

interface QuestStep {
  id: string;
  mission: string;
  subtitle: string;
  icon: string;
  complete: boolean;
  active: boolean;
}

export function QuestLine({ steps }: { steps: QuestStep[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {steps.map((s, i) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 20,
            background: s.active ? "var(--accent)" : s.complete ? "var(--accent-bg)" : "var(--bg-secondary)",
            border: `1px solid ${s.active ? "var(--accent)" : s.complete ? "var(--accent)" : "var(--border)"}`,
            transition: "all 0.3s ease",
          }}>
            <span style={{ fontSize: 12 }}>
              {s.complete ? "✅" : s.active ? s.icon : "🔒"}
            </span>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 600,
                color: s.active ? "#fff" : s.complete ? "var(--accent)" : "var(--fg-tertiary)",
              }}>
                {s.mission}
              </div>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              width: 20, height: 2, margin: "0 2px",
              background: s.complete ? "var(--accent)" : "var(--border)",
              transition: "background 0.3s ease",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CELEBRATION — First-time celebration overlay (#19)
// ═══════════════════════════════════════════════════════════════════

interface CelebrationProps {
  show: boolean;
  emoji: string;
  title: string;
  subtitle: string;
  onDone: () => void;
}

export function Celebration({ show, emoji, title, subtitle, onDone }: CelebrationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onDone, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onDone]);

  if (!show) return null;

  return (
    <div
      onClick={onDone}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)",
        animation: "fadeIn 0.3s ease",
        cursor: "pointer",
      }}
    >
      <div style={{
        textAlign: "center", padding: "32px 48px", borderRadius: 20,
        background: "var(--bg)", border: "2px solid var(--accent)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        animation: "celebrationBounce 0.5s ease",
      }}>
        <div style={{ fontSize: 48, marginBottom: 8, animation: "celebrationSpin 0.6s ease" }}>{emoji}</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--fg-secondary)" }}>{subtitle}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// KNOWLEDGE DROP — "Did you know" contextual moments (#3)
// ═══════════════════════════════════════════════════════════════════

const KNOWLEDGE_DROPS: Record<string, string[]> = {
  "ca-la": [
    "LA requires seismic retrofitting for pre-1978 buildings — budget $15-50K for soft-story upgrades.",
    "The LA Dept. of Building & Safety processes 150,000+ permits annually — plan for 6-8 week reviews.",
  ],
  "ny-nyc": [
    "NYC requires a Licensed Site Safety Manager for buildings over 15 stories — $1,500-3,000/week.",
    "NYC's Local Law 97 penalizes buildings exceeding carbon limits starting 2024 — design for compliance now.",
  ],
  "nc-ash": [
    "Asheville's sloped mountain lots require engineered foundations — budget an additional $15-30K.",
    "Western NC has unique wind exposure requirements due to mountain terrain — check ASCE 7 carefully.",
  ],
  "fl-mia": [
    "Miami-Dade has the strictest wind code in the US — all products need a Notice of Acceptance (NOA).",
    "South Florida's high water table means dewatering during excavation — budget $5-15K extra.",
  ],
  "tx-aus": [
    "Austin's permitting backlog has grown 40% since 2020 — start permit applications 2-3 months early.",
    "Travis County requires water quality controls for impervious cover — plan for detention ponds.",
  ],
  "datacenter": [
    "Data centers consume 1-2% of global electricity. Tier IV facilities require 2N cooling redundancy.",
    "Liquid cooling supports >30 kW/rack densities — 3x traditional air cooling capacity.",
  ],
  "hospital": [
    "Healthcare construction requires ICRA (Infection Control Risk Assessment) — affects phasing and containment.",
    "Hospital projects average 18-48 months — the longest in commercial construction.",
  ],
};

export function getKnowledgeDrop(jurisdictionId?: string, buildingTypeId?: string): string | null {
  const drops: string[] = [];
  if (jurisdictionId && KNOWLEDGE_DROPS[jurisdictionId]) {
    drops.push(...KNOWLEDGE_DROPS[jurisdictionId]);
  }
  if (buildingTypeId && KNOWLEDGE_DROPS[buildingTypeId]) {
    drops.push(...KNOWLEDGE_DROPS[buildingTypeId]);
  }
  if (drops.length === 0) return null;
  return drops[Math.floor(Math.random() * drops.length)];
}

export function KnowledgeDrop({ text }: { text: string }) {
  return (
    <div style={{
      display: "flex", gap: 10, padding: "12px 14px", borderRadius: 10,
      background: "linear-gradient(135deg, #7F77DD10, #1D9E7510)",
      border: "1px solid #7F77DD30",
      animation: "slideUp 0.4s ease",
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
      <div>
        <div style={{ fontSize: 9, fontWeight: 600, color: "#7F77DD", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>
          Did you know?
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.5 }}>{text}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GAMIFICATION CSS — Animations & keyframes
// Inject this once in layout or page
// ═══════════════════════════════════════════════════════════════════

export function GamificationStyles() {
  return (
    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.5); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes celebrationBounce {
        0% { opacity: 0; transform: scale(0.5); }
        60% { transform: scale(1.1); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes celebrationSpin {
        0% { transform: rotate(-10deg) scale(0.8); }
        50% { transform: rotate(10deg) scale(1.2); }
        100% { transform: rotate(0deg) scale(1); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes progressFill {
        from { width: 0%; }
      }
    `}</style>
  );
}
