"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, type UserLane } from "@/lib/auth";
import { useGamification } from "@/components/GamificationProvider";

// ============================================================================
// DATA: 8 LANES — each is a petal in the compass bloom
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
  { name: "Apprentice", maxXp: 500, color: "#666666" },
  { name: "Builder", maxXp: 2000, color: "#1D9E75" },
  { name: "Craftsman", maxXp: 5000, color: "#D85A30" },
  { name: "Master", maxXp: 15000, color: "#7F77DD" },
  { name: "Architect", maxXp: Infinity, color: "#E8443A" },
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
  return { name: "Architect", color: "#E8443A", progress: 1 };
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
  const bloomSize = isDesktop ? 420 : 350;
  const petalRadius = isDesktop ? 140 : 115;
  const center = bloomSize / 2;
  const petalSize = isDesktop ? 56 : 46;
  const hubSize = isDesktop ? 88 : 72;

  return (
    <>
      {/* ── BACKDROP ── */}
      {open && (
        <div
          onClick={() => { setOpen(false); setExpandedLane(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9997,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            animation: "bloomFadeIn 0.25s ease",
          }}
          aria-hidden
        />
      )}

      {/* ── BLOOM CONTAINER ── */}
      {open && (
        <div
          ref={bloomRef}
          role="navigation"
          aria-label="Compass Bloom navigation"
          style={{
            position: "fixed",
            zIndex: 9998,
            width: bloomSize,
            height: bloomSize,
            bottom: 24 + 28 - center,
            right: 24 + 28 - center,
          }}
        >
          {/* ── CONNECTING LINES ── */}
          <svg
            width={bloomSize}
            height={bloomSize}
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 0 }}
          >
            {LANES.map((lane, i) => {
              const angleRad = (lane.angle - 90) * (Math.PI / 180);
              const endR = petalRadius - petalSize / 2 + 4;
              const x2 = center + Math.cos(angleRad) * endR;
              const y2 = center + Math.sin(angleRad) * endR;
              const isActive = activeLane === lane.id || expandedLane === lane.id;
              return (
                <line
                  key={lane.id}
                  x1={center} y1={center} x2={x2} y2={y2}
                  stroke={isActive ? `${lane.color}70` : "rgba(255,255,255,0.06)"}
                  strokeWidth={isActive ? 2 : 1}
                  strokeDasharray={isActive ? "none" : "3 5"}
                  style={{ animation: `bloomLineIn 0.3s ease ${i * 40}ms both` }}
                />
              );
            })}
          </svg>

          {/* ── CENTER HUB: XP Display ── */}
          <div
            style={{
              position: "absolute",
              left: center - hubSize / 2,
              top: center - hubSize / 2,
              width: hubSize,
              height: hubSize,
              borderRadius: "50%",
              background: "radial-gradient(circle at 30% 30%, #1a1a2e, #0a0a14)",
              border: `2px solid ${levelInfo.color}40`,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 40px ${levelInfo.color}15, inset 0 0 20px rgba(0,0,0,0.5)`,
              animation: "bloomCenterIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
              zIndex: 10,
            }}
          >
            <svg width={hubSize} height={hubSize} style={{ position: "absolute", top: 0, left: 0 }}>
              <circle
                cx={hubSize / 2} cy={hubSize / 2} r={hubSize / 2 - 4}
                fill="none" stroke={`${levelInfo.color}20`} strokeWidth={3}
              />
              <circle
                cx={hubSize / 2} cy={hubSize / 2} r={hubSize / 2 - 4}
                fill="none" stroke={levelInfo.color} strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={`${levelInfo.progress * Math.PI * (hubSize - 8)} ${Math.PI * (hubSize - 8)}`}
                transform={`rotate(-90 ${hubSize / 2} ${hubSize / 2})`}
                style={{ transition: "stroke-dasharray 0.6s ease" }}
              />
            </svg>
            <span style={{ fontSize: isDesktop ? 13 : 11, fontWeight: 800, color: levelInfo.color, lineHeight: 1, zIndex: 1 }}>
              {xp.toLocaleString()}
            </span>
            <span style={{ fontSize: isDesktop ? 8 : 7, color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: 0.5, zIndex: 1 }}>
              XP
            </span>
            <span style={{ fontSize: isDesktop ? 9 : 7, color: levelInfo.color, fontWeight: 700, marginTop: 1, zIndex: 1 }}>
              {level}
            </span>
            {streak > 0 && (
              <span style={{ fontSize: isDesktop ? 8 : 7, color: "#F59E0B", zIndex: 1 }}>
                {streak}d {"\u{1F525}"}
              </span>
            )}
          </div>

          {/* ── PETALS: 8 Lanes ── */}
          {LANES.map((lane, i) => {
            const isActive = activeLane === lane.id;
            const isUserLane = userLane === lane.id;
            const isExpanded = expandedLane === lane.id;
            const isHovered = hoverLane === lane.id;
            const angleRad = (lane.angle - 90) * (Math.PI / 180);
            const x = center + Math.cos(angleRad) * petalRadius - petalSize / 2;
            const y = center + Math.sin(angleRad) * petalRadius - petalSize / 2;

            // Position sub-routes panel: push it further out along the petal's angle
            const subAngleRad = angleRad;
            const subDist = isDesktop ? 85 : 70;
            const subX = center + Math.cos(subAngleRad) * (petalRadius + subDist);
            const subY = center + Math.sin(subAngleRad) * (petalRadius + subDist);

            return (
              <div key={lane.id}>
                {/* Petal button */}
                <button
                  onClick={() => handlePetalClick(lane.id)}
                  onMouseEnter={() => { if (isDesktop) setHoverLane(lane.id); }}
                  onMouseLeave={() => { if (isDesktop) setHoverLane(null); }}
                  onTouchStart={() => { if (!isDesktop && !isExpanded) handlePetalClick(lane.id); }}
                  aria-label={`${lane.label} \u2014 ${lane.sub}. ${isExpanded ? "Showing sub-routes." : "Tap to expand."}`}
                  aria-expanded={isExpanded}
                  style={{
                    position: "absolute",
                    left: x, top: y,
                    width: petalSize, height: petalSize,
                    borderRadius: "50%",
                    border: `2px solid ${(isActive || isUserLane || isExpanded) ? lane.color : `${lane.color}40`}`,
                    background: isExpanded
                      ? `radial-gradient(circle, ${lane.color}35, ${lane.color}12)`
                      : isActive || isUserLane
                        ? `radial-gradient(circle, ${lane.color}20, ${lane.color}06)`
                        : "radial-gradient(circle, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
                    cursor: "pointer",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                    transform: isExpanded ? "scale(1.18)" : isHovered ? "scale(1.1)" : "scale(1)",
                    boxShadow: isExpanded
                      ? `0 0 24px ${lane.color}40, 0 4px 16px rgba(0,0,0,0.3)`
                      : isActive
                        ? `0 0 12px ${lane.color}20`
                        : "0 2px 8px rgba(0,0,0,0.2)",
                    animation: `bloomPetalIn 0.35s cubic-bezier(0.34,1.56,0.64,1) ${i * 45}ms both`,
                    zIndex: isExpanded ? 5 : 2,
                    padding: 0,
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: isDesktop ? 22 : 18, lineHeight: 1 }}>{lane.emoji}</span>
                  <span style={{
                    fontSize: isDesktop ? 7 : 6, fontWeight: 700,
                    color: (isActive || isUserLane || isExpanded) ? lane.color : "rgba(255,255,255,0.55)",
                    marginTop: 1, letterSpacing: 0.3,
                    maxWidth: petalSize - 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {lane.label.replace("The ", "")}
                  </span>
                  {/* Active indicator dot */}
                  {isActive && (
                    <div style={{
                      position: "absolute", bottom: -1, left: "50%", transform: "translateX(-50%)",
                      width: 6, height: 6, borderRadius: "50%",
                      background: lane.color, boxShadow: `0 0 6px ${lane.color}`,
                    }} />
                  )}
                </button>

                {/* Hover tooltip (desktop only, not when expanded) */}
                {isDesktop && isHovered && !isExpanded && (
                  <div style={{
                    position: "absolute",
                    left: x + petalSize / 2, top: y - 28,
                    transform: "translateX(-50%)",
                    background: "rgba(15,15,30,0.95)",
                    border: `1px solid ${lane.color}40`,
                    borderRadius: 8, padding: "4px 10px",
                    pointerEvents: "none", whiteSpace: "nowrap",
                    animation: "bloomLabelIn 0.15s ease forwards",
                    zIndex: 20,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: lane.color }}>{lane.label}</span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginLeft: 6 }}>{lane.sub}</span>
                  </div>
                )}

                {/* ── SUB-ROUTES PANEL ── */}
                {isExpanded && (
                  <div
                    style={{
                      position: "absolute",
                      left: subX, top: subY,
                      transform: "translate(-50%, -50%)",
                      background: "rgba(12, 12, 28, 0.96)",
                      border: `1px solid ${lane.color}30`,
                      borderRadius: 16, padding: 10,
                      minWidth: isDesktop ? 210 : 185,
                      maxWidth: 250,
                      animation: "bloomSubIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards",
                      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${lane.color}10`,
                      zIndex: 30,
                    }}
                  >
                    {/* Lane header */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                      paddingBottom: 8, borderBottom: `1px solid ${lane.color}20`,
                    }}>
                      <span style={{ fontSize: 18 }}>{lane.emoji}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: lane.color }}>{lane.label}</div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{lane.sub}</div>
                      </div>
                    </div>

                    {/* Route links */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {lane.routes.map((route) => {
                        const active = isRouteActive(route.href, pathname);
                        return (
                          <button
                            key={route.href + route.label}
                            onClick={() => handleSubRouteClick(route.href)}
                            style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "7px 10px", borderRadius: 10,
                              background: active ? `${lane.color}15` : "transparent",
                              border: active ? `1px solid ${lane.color}30` : "1px solid transparent",
                              cursor: "pointer", transition: "all 0.15s",
                              textAlign: "left", width: "100%",
                              fontFamily: "inherit", color: "inherit",
                            }}
                            onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                            onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? `${lane.color}15` : "transparent"; }}
                          >
                            <span style={{ fontSize: 15, flexShrink: 0 }}>{route.emoji}</span>
                            <div style={{ overflow: "hidden", flex: 1 }}>
                              <div style={{
                                fontSize: 11, fontWeight: active ? 700 : 500,
                                color: active ? lane.color : "rgba(255,255,255,0.8)",
                              }}>
                                {route.label}
                              </div>
                              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{route.desc}</div>
                            </div>
                            {active && (
                              <div style={{
                                width: 6, height: 6, borderRadius: "50%",
                                background: lane.color, flexShrink: 0,
                                boxShadow: `0 0 4px ${lane.color}`,
                              }} />
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
        onClick={() => { setOpen(o => !o); setExpandedLane(null); }}
        aria-label={open ? "Close compass navigation" : "Open compass navigation"}
        aria-expanded={open}
        style={{
          position: "fixed",
          bottom: 24, right: 24,
          zIndex: 9999,
          width: 56, height: 56,
          borderRadius: "50%",
          border: "none", cursor: "pointer",
          background: open
            ? `conic-gradient(from 0deg, ${LANES.map(l => l.color).join(", ")}, ${LANES[0].color})`
            : "linear-gradient(135deg, #1D9E75, #0c5e45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: open
            ? "0 0 30px rgba(29,158,117,0.5), 0 4px 20px rgba(0,0,0,0.3)"
            : "0 4px 16px rgba(0,0,0,0.2), 0 1px 4px rgba(0,0,0,0.1)",
          transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          fontFamily: "inherit",
          padding: 0,
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = open ? "rotate(45deg)" : ""; }}
      >
        {open ? (
          <div style={{
            width: 46, height: 46, borderRadius: "50%",
            background: "#0f0f1e",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 18, color: "#fff", transform: "rotate(-45deg)", lineHeight: 1 }}>{"\u2715"}</span>
          </div>
        ) : (
          <>
            {/* Show mini XP ring on the FAB when closed */}
            <svg width={56} height={56} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
              <circle
                cx={28} cy={28} r={25}
                fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={2}
              />
              <circle
                cx={28} cy={28} r={25}
                fill="none" stroke={levelInfo.color} strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray={`${levelInfo.progress * Math.PI * 50} ${Math.PI * 50}`}
                transform="rotate(-90 28 28)"
                style={{ transition: "stroke-dasharray 0.6s ease" }}
              />
            </svg>
            <span style={{ fontSize: 26, zIndex: 1 }}>{"\u{1F9ED}"}</span>
          </>
        )}
      </button>

      {/* ── ANIMATIONS ── */}
      <style>{`
        @keyframes bloomFadeIn {
          from { opacity: 0 } to { opacity: 1 }
        }
        @keyframes bloomCenterIn {
          from { opacity: 0; transform: scale(0.3) }
          to { opacity: 1; transform: scale(1) }
        }
        @keyframes bloomPetalIn {
          from { opacity: 0; transform: scale(0) rotate(-30deg) }
          to { opacity: 1; transform: scale(1) rotate(0deg) }
        }
        @keyframes bloomLineIn {
          from { opacity: 0 } to { opacity: 1 }
        }
        @keyframes bloomLabelIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px) }
          to { opacity: 1; transform: translateX(-50%) translateY(0) }
        }
        @keyframes bloomSubIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.8) }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1) }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
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
