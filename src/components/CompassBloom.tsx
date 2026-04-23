"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, type UserLane } from "@/lib/auth";
import { useGamification } from "@/components/GamificationProvider";

// ============================================================================
// PALETTE (W8 LOCK)
// ============================================================================

const COLORS = {
  navy: "#1B3B5E",
  navyDeep: "#0E2A47",
  trace: "#F4F0E6",
  brass: "#B6873A",
  fadedRule: "#C9C3B3",
  graphite: "#2E2E30",
  redline: "#A1473A",
  robin: "#7FCFCB",
  orange: "#D9642E",
} as const;

// ============================================================================
// DATA: 8 LANES — each is a compass position
// ============================================================================

interface SubRoute {
  label: string;
  href: string;
  emoji: string;
  desc: string;
}

interface LaneConfig {
  id: UserLane;
  label: string;
  sub: string;
  emoji: string;
  color: string;
  angle: number; // degrees around the circle (0 = top, clockwise)
  routes: SubRoute[];
}

const LANES: LaneConfig[] = [
  {
    id: "dreamer", label: "The Dreamer", sub: "DIY Homeowner", emoji: "\u{1F3E0}", color: "#D85A30", angle: 0,
    routes: [
      { label: "The Oracle", href: "/dream/oracle", emoji: "\u{1F52E}", desc: "AI Dream Profiler" },
      { label: "The Alchemist", href: "/dream/alchemist", emoji: "\u2697\uFE0F", desc: "Mix ingredients" },
      { label: "The Cosmos", href: "/dream/cosmos", emoji: "\u{1F30C}", desc: "Orbital explorer" },
      { label: "Dream Garden", href: "/dream/garden", emoji: "\u{1F331}", desc: "Browse & discover" },
      { label: "Describe It", href: "/dream/describe", emoji: "\u{1F4AC}", desc: "Text to dream" },
      { label: "Sketch It", href: "/dream/sketch", emoji: "\u270F\uFE0F", desc: "Draw your vision" },
    ],
  },
  {
    id: "builder", label: "The Builder", sub: "General Contractor", emoji: "\u{1F3D7}\uFE0F", color: "#E8443A", angle: 45,
    routes: [
      { label: "Workflows", href: "/killerapp", emoji: "\u{1F3AF}", desc: "Project dashboard" },
      { label: "Project Launcher", href: "/launch", emoji: "\u{1F680}", desc: "Start a project" },
      { label: "Finances", href: "/finances", emoji: "\u{1F4B0}", desc: "Financial overview" },
      { label: "My Projects", href: "/projects", emoji: "\u{1F4C1}", desc: "Active projects" },
    ],
  },
  {
    id: "specialist", label: "The Specialist", sub: "Specialty Contractor", emoji: "\u26A1", color: "#7F77DD", angle: 90,
    routes: [
      { label: "Building Codes", href: "/knowledge", emoji: "\u{1F4CB}", desc: "Code compliance" },
      { label: "AI Copilot", href: "/killerapp#copilot", emoji: "\u{1F9E0}", desc: "Ask anything" },
      { label: "Field Ops", href: "/field", emoji: "\u{1F4F1}", desc: "Daily logs & safety" },
      { label: "My Projects", href: "/projects", emoji: "\u{1F4C1}", desc: "Active work" },
    ],
  },
  {
    id: "merchant", label: "The Merchant", sub: "Supplier / Vendor", emoji: "\u{1F3EA}", color: "#378ADD", angle: 135,
    routes: [
      { label: "Marketplace", href: "/marketplace", emoji: "\u{1F6D2}", desc: "Products & bids" },
      { label: "Knowledge Base", href: "/knowledge", emoji: "\u{1F33F}", desc: "Materials library" },
      { label: "My Profile", href: "/profile", emoji: "\u{1F4E6}", desc: "Your listings" },
      { label: "Clients", href: "/clients", emoji: "\u{1F465}", desc: "Customer CRM" },
    ],
  },
  {
    id: "ally", label: "The Ally", sub: "Service Provider", emoji: "\u{1F4D0}", color: "#1D9E75", angle: 180,
    routes: [
      { label: "Knowledge Garden", href: "/knowledge", emoji: "\u{1F33F}", desc: "Full library" },
      { label: "CRM", href: "/clients", emoji: "\u{1F465}", desc: "Client management" },
      { label: "Documents", href: "/documents", emoji: "\u{1F4C4}", desc: "Contracts & docs" },
      { label: "Projects", href: "/projects", emoji: "\u{1F3A8}", desc: "Your portfolio" },
    ],
  },
  {
    id: "crew", label: "The Crew", sub: "Field Worker", emoji: "\u{1F9BA}", color: "#F59E0B", angle: 225,
    routes: [
      { label: "Field Ops", href: "/field", emoji: "\u{1F4F1}", desc: "Daily logs" },
      { label: "My Tasks", href: "/projects", emoji: "\u2705", desc: "Assigned work" },
      { label: "Safety", href: "/field#safety", emoji: "\u{1F6D1}", desc: "Briefings & hazards" },
      { label: "Voice Report", href: "/field#voice", emoji: "\u{1F399}\uFE0F", desc: "Hands-free" },
    ],
  },
  {
    id: "fleet", label: "The Fleet", sub: "Equipment Provider", emoji: "\u{1F69C}", color: "#BA7517", angle: 270,
    routes: [
      { label: "Marketplace", href: "/marketplace", emoji: "\u{1F527}", desc: "Equipment hub" },
      { label: "My Projects", href: "/projects", emoji: "\u{1F4C1}", desc: "Active rentals" },
      { label: "Profile", href: "/profile", emoji: "\u{1F4C8}", desc: "Fleet analytics" },
      { label: "Finances", href: "/finances", emoji: "\u{1F4B0}", desc: "Revenue tracking" },
    ],
  },
  {
    id: "machine", label: "The Machine", sub: "Robotics & AI", emoji: "\u{1F916}", color: "#6366F1", angle: 315,
    routes: [
      { label: "API Console", href: "/mcp", emoji: "\u{1F4BB}", desc: "MCP server" },
      { label: "Knowledge API", href: "/knowledge", emoji: "\u{1F33F}", desc: "Entity queries" },
      { label: "Site Intel", href: "/site", emoji: "\u{1F4E1}", desc: "Telemetry" },
      { label: "Integrations", href: "/profile", emoji: "\u{1F50C}", desc: "Connect systems" },
    ],
  },
];

// ============================================================================
// LEVEL TIERS (mirrors GamificationProvider)
// ============================================================================

const LEVEL_TIERS = [
  { name: "Apprentice", maxXp: 500, color: COLORS.graphite },
  { name: "Builder", maxXp: 2000, color: COLORS.brass },
  { name: "Craftsman", maxXp: 5000, color: COLORS.robin },
  { name: "Master", maxXp: 15000, color: COLORS.navy },
  { name: "Architect", maxXp: Infinity, color: COLORS.orange },
];

function getLevelInfo(xp: number) {
  let accumulated = 0;
  for (const tier of LEVEL_TIERS) {
    const tierRange = tier.maxXp === Infinity ? 99999 : tier.maxXp - accumulated;
    if (xp < tier.maxXp) {
      const progress = (xp - accumulated) / tierRange;
      return { name: tier.name, color: tier.color, progress: Math.min(progress, 1) };
    }
    accumulated = tier.maxXp;
  }
  return { name: "Architect", color: COLORS.orange, progress: 1 };
}

// ============================================================================
// HOOKS
// ============================================================================

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return desktop;
}

function detectActiveLane(pathname: string): UserLane | null {
  if (pathname.startsWith("/dream")) return "dreamer";
  if (pathname.startsWith("/killerapp") || pathname.startsWith("/launch") || pathname.startsWith("/finances")) return "builder";
  if (pathname.startsWith("/field")) return "crew";
  if (pathname.startsWith("/marketplace")) return "merchant";
  if (pathname.startsWith("/mcp") || pathname.startsWith("/site")) return "machine";
  if (pathname.startsWith("/clients") || pathname.startsWith("/documents")) return "ally";
  if (pathname.startsWith("/knowledge")) return "ally";
  return null;
}

function isRouteActive(href: string, pathname: string): boolean {
  const base = href.split("#")[0];
  if (!base) return false;
  return pathname === base || pathname.startsWith(base + "/");
}

// ============================================================================
// COMPASS BLOOM COMPONENT
// ============================================================================

export default function CompassBloom() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [expandedLane, setExpandedLane] = useState<UserLane | null>(null);
  const [hoverLane, setHoverLane] = useState<UserLane | null>(null);
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const router = useRouter();
  const { lane: userLane, setLane } = useAuth();
  const gamification = useGamification();
  const bloomRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  const xp = gamification.xp;
  const level = gamification.level;
  const streak = gamification.streak;

  useEffect(() => setMounted(true), []);

  // Close bloom on navigation
  useEffect(() => {
    setOpen(false);
    setExpandedLane(null);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (expandedLane) {
          setExpandedLane(null);
        } else if (open) {
          setOpen(false);
          fabRef.current?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, expandedLane]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (bloomRef.current && !bloomRef.current.contains(e.target as Node) &&
          fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setOpen(false);
        setExpandedLane(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeLane = useMemo(() => detectActiveLane(pathname), [pathname]);
  const levelInfo = useMemo(() => getLevelInfo(xp), [xp]);

  const handlePetalClick = useCallback((laneId: UserLane) => {
    if (expandedLane === laneId) {
      setExpandedLane(null);
    } else {
      setExpandedLane(laneId);
      setLane(laneId);
    }
  }, [expandedLane, setLane]);

  const handleSubRouteClick = useCallback((href: string) => {
    setOpen(false);
    setExpandedLane(null);
    router.push(href);
  }, [router]);

  if (!mounted) return null;
  if (pathname === "/presentation" || pathname === "/cinematic") return null;

  // ── LAYOUT CONFIG ──
  const compassSize = isDesktop ? 420 : 350;
  const legRadius = isDesktop ? 140 : 115;
  const center = compassSize / 2;
  const hubRadius = isDesktop ? 20 : 16;
  const tickMajor = 8;
  const tickMinor = 4;

  return (
    <>
      {/* ── BACKDROP ── */}
      {open && (
        <div
          onClick={() => { setOpen(false); setExpandedLane(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9997,
            background: "rgba(0,0,0,0.2)",
            backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)",
            animation: "compassFadeIn 0.25s ease",
          }}
          aria-hidden
        />
      )}

      {/* ── COMPASS CONTAINER ── */}
      {open && (
        <div
          ref={bloomRef}
          role="navigation"
          aria-label="Compass Navigator"
          style={{
            position: "fixed",
            zIndex: 9998,
            width: compassSize,
            height: compassSize,
            bottom: 24 + 28 - center,
            right: 24 + 28 - center,
            transform: `rotate(${activeLane ? (LANES.find((l: LaneConfig) => l.id === activeLane)?.angle ?? 0) : 0}deg)`,
            transformOrigin: "center",
            transition: "transform 0.2s ease",
          }}
        >
          {/* ── TRACE PAPER BACKGROUND + FADED RULE GRID ── */}
          <svg
            width={compassSize}
            height={compassSize}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 0,
              background: COLORS.trace,
              animation: "compassFadeIn 0.3s ease",
            }}
          >
            {/* Faded rule grid */}
            {Array.from({ length: Math.ceil(compassSize / 40) }).map((_, i) => (
              <g key={`grid-${i}`}>
                <line
                  x1={i * 40}
                  y1={0}
                  x2={i * 40}
                  y2={compassSize}
                  stroke={COLORS.fadedRule}
                  strokeWidth={0.5}
                  opacity={0.3}
                />
                <line
                  x1={0}
                  y1={i * 40}
                  x2={compassSize}
                  y2={i * 40}
                  stroke={COLORS.fadedRule}
                  strokeWidth={0.5}
                  opacity={0.3}
                />
              </g>
            ))}

            {/* Architect dividers: navy ink legs with brass protractor arc */}
            {LANES.map((lane, i) => {
              const angleRad = (lane.angle - 90) * (Math.PI / 180);
              const isActive = activeLane === lane.id || expandedLane === lane.id;

              // Navy ink leg line (angled metal divider leg)
              const legEnd = legRadius;
              const x2 = center + Math.cos(angleRad) * legEnd;
              const y2 = center + Math.sin(angleRad) * legEnd;

              // Measurement ticks along the leg
              const tickCount = 6;
              const ticks = [];
              for (let t = 1; t <= tickCount; t++) {
                const tickDist = (legEnd / tickCount) * t;
                const tx = center + Math.cos(angleRad) * tickDist;
                const ty = center + Math.sin(angleRad) * tickDist;
                const tickLen = t % 2 === 0 ? tickMajor : tickMinor;
                const perpRad = angleRad + Math.PI / 2;
                const tx1 = tx - Math.cos(perpRad) * (tickLen / 2);
                const ty1 = ty - Math.sin(perpRad) * (tickLen / 2);
                const tx2 = tx + Math.cos(perpRad) * (tickLen / 2);
                const ty2 = ty + Math.sin(perpRad) * (tickLen / 2);
                ticks.push(
                  <line
                    key={`tick-${lane.id}-${t}`}
                    x1={tx1}
                    y1={ty1}
                    x2={tx2}
                    y2={ty2}
                    stroke={isActive ? COLORS.navy : COLORS.fadedRule}
                    strokeWidth={isActive ? 1.2 : 0.8}
                    opacity={isActive ? 0.7 : 0.4}
                  />
                );
              }

              return (
                <g key={`leg-${lane.id}`}>
                  {/* Navy ink leg (main divider arm) */}
                  <line
                    x1={center}
                    y1={center}
                    x2={x2}
                    y2={y2}
                    stroke={isActive ? COLORS.navy : COLORS.fadedRule}
                    strokeWidth={isActive ? 2.2 : 1.4}
                    opacity={isActive ? 1 : 0.5}
                    style={{
                      animation: `compassLegIn 0.35s ease ${i * 30}ms both`,
                    }}
                  />
                  {/* Measurement ticks */}
                  {ticks}
                  {/* Endpoint dot (leg terminus) */}
                  <circle
                    cx={x2}
                    cy={y2}
                    r={isActive ? 1.8 : 1.2}
                    fill={isActive ? COLORS.navy : COLORS.fadedRule}
                    opacity={isActive ? 0.8 : 0.4}
                  />
                </g>
              );
            })}

            {/* Brass protractor arc (half-circle with degree ticks) */}
            <g opacity={0.7}>
              {/* Main arc path (brass colored) */}
              <path
                d={`M ${center - legRadius * 0.75} ${center} A ${legRadius * 0.75} ${legRadius * 0.75} 0 0 1 ${center + legRadius * 0.75} ${center}`}
                stroke={COLORS.brass}
                strokeWidth={1.5}
                fill="none"
                opacity={0.5}
              />
              {/* Degree tick marks around the arc */}
              {Array.from({ length: 13 }).map((_, i) => {
                const ratio = i / 12; // 0 to 1 along semicircle
                const angle = Math.PI * ratio; // 0 to π
                const arcRadius = legRadius * 0.75;
                const isMajor = i % 3 === 0;
                const tickLength = isMajor ? 5 : 2.5;

                const x1 = center - arcRadius * Math.cos(angle);
                const y1 = center + arcRadius * Math.sin(angle);
                const x2 = center - (arcRadius + tickLength) * Math.cos(angle);
                const y2 = center + (arcRadius + tickLength) * Math.sin(angle);

                return (
                  <line
                    key={`arc-tick-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={COLORS.brass}
                    strokeWidth={isMajor ? 0.8 : 0.6}
                    opacity={isMajor ? 0.6 : 0.4}
                  />
                );
              })}
            </g>
          </svg>

          {/* ── CENTER HUB: Architect's drafting-dividers hinge ── */}
          <svg
            width={hubRadius * 2.8}
            height={hubRadius * 2.8}
            style={{
              position: "absolute",
              left: center - hubRadius * 1.4,
              top: center - hubRadius * 1.4,
              zIndex: 20,
              animation: "compassHubIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}
            viewBox={`0 0 ${hubRadius * 2.8} ${hubRadius * 2.8}`}
          >
            {/* Outer brass knurled hinge body (large circle) */}
            <circle
              cx={hubRadius * 1.4}
              cy={hubRadius * 1.4}
              r={hubRadius * 1.2}
              fill={COLORS.brass}
              opacity={0.85}
            />
            {/* Knurled texture: radial ridges */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i / 12) * Math.PI * 2;
              const x1 = hubRadius * 1.4 + Math.cos(angle) * (hubRadius * 0.9);
              const y1 = hubRadius * 1.4 + Math.sin(angle) * (hubRadius * 0.9);
              const x2 = hubRadius * 1.4 + Math.cos(angle) * (hubRadius * 1.1);
              const y2 = hubRadius * 1.4 + Math.sin(angle) * (hubRadius * 1.1);
              return (
                <line
                  key={`knurl-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={COLORS.graphite}
                  strokeWidth={0.6}
                  opacity={0.4}
                />
              );
            })}
            {/* Inner navy pivot disc */}
            <circle
              cx={hubRadius * 1.4}
              cy={hubRadius * 1.4}
              r={hubRadius * 0.7}
              fill={COLORS.navy}
              opacity={0.9}
            />
            {/* Center highlight */}
            <circle
              cx={hubRadius * 1.4}
              cy={hubRadius * 1.4}
              r={hubRadius * 0.4}
              fill="none"
              stroke={COLORS.trace}
              strokeWidth={0.8}
              opacity={0.3}
            />
            {/* XP text in center */}
            <text
              x={hubRadius * 1.4}
              y={hubRadius * 1.4 - 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={isDesktop ? 5.5 : 4}
              fontWeight="700"
              fill={COLORS.trace}
              title={`${xp.toLocaleString()} XP (${levelInfo.name})`}
            >
              {xp < 1000 ? xp : (xp / 1000).toFixed(1) + "k"}
            </text>
            {/* Level badge below */}
            <text
              x={hubRadius * 1.4}
              y={hubRadius * 1.4 + 2.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={isDesktop ? 3.5 : 2.5}
              fontWeight="600"
              fill={COLORS.trace}
              opacity={0.7}
            >
              {level}
            </text>
          </svg>

          {/* ── COMPASS POSITIONS: Lane buttons along the legs ── */}
          {LANES.map((lane, i) => {
            const isActive = activeLane === lane.id;
            const isUserLane = userLane === lane.id;
            const isExpanded = expandedLane === lane.id;
            const isHovered = hoverLane === lane.id;
            const angleRad = (lane.angle - 90) * (Math.PI / 180);

            // Position at end of leg
            const labelDist = legRadius + 24;
            const x = center + Math.cos(angleRad) * labelDist - 16;
            const y = center + Math.sin(angleRad) * labelDist - 16;

            // Position sub-routes panel
            const subAngleRad = angleRad;
            const subDist = isDesktop ? 85 : 70;
            const subX = center + Math.cos(subAngleRad) * (legRadius + subDist);
            const subY = center + Math.sin(subAngleRad) * (legRadius + subDist);

            return (
              <div key={lane.id}>
                {/* Lane position button */}
                <button
                  onClick={() => handlePetalClick(lane.id)}
                  onMouseEnter={() => { if (isDesktop) setHoverLane(lane.id); }}
                  onMouseLeave={() => { if (isDesktop) setHoverLane(null); }}
                  onTouchStart={() => { if (!isDesktop && !isExpanded) handlePetalClick(lane.id); }}
                  aria-label={`${lane.label} \u2014 ${lane.sub}. ${isExpanded ? "Showing sub-routes." : "Tap to expand."}`}
                  aria-expanded={isExpanded}
                  style={{
                    position: "absolute",
                    left: x,
                    top: y,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: `1.5px solid ${(isActive || isUserLane || isExpanded) ? lane.color : COLORS.fadedRule}`,
                    background: isActive || isUserLane || isExpanded ? lane.color : COLORS.trace,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                    transform: isExpanded ? "scale(1.2)" : isHovered ? "scale(1.1)" : "scale(1)",
                    boxShadow:
                      isExpanded
                        ? `0 3px 12px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.2)`
                        : "0 2px 6px rgba(0,0,0,0.1)",
                    animation: `compassPosIn 0.35s ease ${i * 25}ms both`,
                    zIndex: isExpanded ? 15 : 5,
                    padding: 0,
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      lineHeight: 1,
                      filter: isActive || isUserLane || isExpanded ? "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" : "none",
                    }}
                  >
                    {lane.emoji}
                  </span>
                </button>

                {/* Hover label (desktop only) */}
                {isDesktop && isHovered && !isExpanded && (
                  <div
                    style={{
                      position: "absolute",
                      left: x + 16,
                      top: y - 36,
                      transform: "translateX(-50%)",
                      background: COLORS.trace,
                      border: `1px solid ${lane.color}60`,
                      borderRadius: 6,
                      padding: "4px 8px",
                      pointerEvents: "none",
                      whiteSpace: "nowrap",
                      animation: "compassLabelIn 0.15s ease forwards",
                      zIndex: 25,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, color: lane.color }}>{lane.label}</div>
                    <div style={{ fontSize: 8, color: COLORS.graphite, opacity: 0.6 }}>{lane.sub}</div>
                  </div>
                )}

                {/* ── SUB-ROUTES PANEL ── */}
                {isExpanded && (
                  <div
                    style={{
                      position: "absolute",
                      left: subX,
                      top: subY,
                      transform: "translate(-50%, -50%)",
                      background: COLORS.trace,
                      border: `2px solid ${lane.color}`,
                      borderRadius: 12,
                      padding: "12px 8px",
                      minWidth: isDesktop ? 210 : 185,
                      maxWidth: 250,
                      animation: "compassSubIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)",
                      zIndex: 30,
                    }}
                  >
                    {/* Lane header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                        paddingBottom: 8,
                        borderBottom: `1px solid ${lane.color}40`,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{lane.emoji}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: lane.color }}>{lane.label}</div>
                        <div style={{ fontSize: 8, color: COLORS.graphite, opacity: 0.6 }}>{lane.sub}</div>
                      </div>
                    </div>

                    {/* Route links */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {lane.routes.map((route) => {
                        const active = isRouteActive(route.href, pathname);
                        return (
                          <button
                            key={route.href + route.label}
                            onClick={() => handleSubRouteClick(route.href)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "6px 8px",
                              borderRadius: 8,
                              background: active ? `${lane.color}20` : "transparent",
                              border: active ? `1px solid ${lane.color}40` : "1px solid transparent",
                              cursor: "pointer",
                              transition: "all 0.15s",
                              textAlign: "left",
                              width: "100%",
                              fontFamily: "inherit",
                              color: "inherit",
                            }}
                            onMouseEnter={(e) => {
                              if (!active) e.currentTarget.style.background = `${lane.color}10`;
                            }}
                            onMouseLeave={(e) => {
                              if (!active) e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <span style={{ fontSize: 14, flexShrink: 0 }}>{route.emoji}</span>
                            <div style={{ overflow: "hidden", flex: 1 }}>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: active ? 700 : 500,
                                  color: active ? lane.color : COLORS.graphite,
                                }}
                              >
                                {route.label}
                              </div>
                              <div style={{ fontSize: 8, color: COLORS.graphite, opacity: 0.5 }}>{route.desc}</div>
                            </div>
                            {active && (
                              <div
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: lane.color,
                                  flexShrink: 0,
                                }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── FLOATING ACTION BUTTON ── */}
      <button
        ref={fabRef}
        onClick={() => { setOpen((o) => !o); setExpandedLane(null); }}
        aria-label={open ? "Close compass navigator" : "Open compass navigator"}
        aria-expanded={open}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: `2px solid ${COLORS.brass}`,
          cursor: "pointer",
          background: open ? COLORS.trace : COLORS.navyDeep,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: open
            ? `0 4px 12px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.2)`
            : "0 4px 12px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1)",
          transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          transform: open ? "scale(1)" : "scale(1)",
          fontFamily: "inherit",
          padding: 0,
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.transform = "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {open ? (
          <span style={{ fontSize: 20, color: COLORS.navy, lineHeight: 1 }}>{"\u2715"}</span>
        ) : (
          <>
            {/* Mini drafting-dividers icon */}
            <svg width={28} height={28} style={{ position: "absolute" }}>
              {/* Brass hinge circle */}
              <circle
                cx={14}
                cy={14}
                r={4.5}
                fill={COLORS.brass}
                opacity={0.8}
              />
              {/* Left navy leg (upward angle) */}
              <line
                x1={14}
                y1={14}
                x2={8}
                y2={6}
                stroke={COLORS.navy}
                strokeWidth={1.8}
                opacity={0.9}
              />
              {/* Right navy leg (downward angle) */}
              <line
                x1={14}
                y1={14}
                x2={20}
                y2={22}
                stroke={COLORS.navy}
                strokeWidth={1.8}
                opacity={0.9}
              />
              {/* Small arc (protractor indicator) */}
              <path
                d="M 10 14 A 5 5 0 0 1 18 14"
                stroke={COLORS.brass}
                strokeWidth={1}
                fill="none"
                opacity={0.6}
              />
              {/* Center navy pivot */}
              <circle cx={14} cy={14} r={2} fill={COLORS.navy} opacity={0.95} />
            </svg>
          </>
        )}
      </button>

      {/* ── ANIMATIONS ── */}
      <style>{`
        @keyframes compassFadeIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @keyframes compassHubIn {
          from { opacity: 0; transform: scale(0.4) }
          to { opacity: 1; transform: scale(1) }
        }
        @keyframes compassLegIn {
          from { opacity: 0; stroke-dashoffset: 200px; stroke-dasharray: 200px }
          to { opacity: 1; stroke-dashoffset: 0; stroke-dasharray: 200px }
        }
        @keyframes compassPosIn {
          from { opacity: 0; transform: scale(0) }
          to { opacity: 1; transform: scale(1) }
        }
        @keyframes compassLabelIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px) }
          to { opacity: 1; transform: translateX(-50%) translateY(0) }
        }
        @keyframes compassSubIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.85) }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1) }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
          div[role="navigation"] {
            transform: rotate(0deg) !important;
          }
        }
        @media print {
          button[aria-label*="compass"], div[aria-label*="Compass"] {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
