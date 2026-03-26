"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const DESTINATIONS = [
  { icon: "🌿", label: "Knowledge Garden", desc: "Codes, materials, methods", href: "/knowledge", color: "#1D9E75" },
  { icon: "💭", label: "Dream Builder", desc: "Describe what you want to build", href: "/dream", color: "#D85A30" },
  { icon: "⚡", label: "Killer App", desc: "Projects, CRM, finances", href: "/crm", color: "#E8443A" },
  { icon: "🧠", label: "AI Copilot", desc: "Ask anything about building", href: "#copilot", color: "#7F77DD" },
  { icon: "🏪", label: "Marketplace", desc: "Suppliers, subs, equipment", href: "/marketplace", color: "#378ADD" },
  { icon: "👤", label: "My Profile", desc: "Settings, team, billing", href: "/profile", color: "#BA7517" },
];

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    setDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return desktop;
}

function useLane(): string | null {
  const [lane, setLane] = useState<string | null>(null);
  useEffect(() => { setLane(localStorage.getItem("bkg-lane")); }, []);
  return lane;
}

function getLaneOrder(lane: string | null): typeof DESTINATIONS {
  if (!lane) return DESTINATIONS;
  // Reorder: put lane-relevant destination first
  const priorities: Record<string, string[]> = {
    gc: ["/launch", "/", "/dream"],
    diy: ["/dream", "/", "/launch"],
    specialty: ["/launch", "/", "#copilot"],
    supplier: ["/marketplace", "/", "/profile"],
    equipment: ["/marketplace", "/", "/profile"],
    service: ["/profile", "/", "/marketplace"],
    worker: ["/profile", "/", "#copilot"],
    robot: ["#copilot", "/", "/marketplace"],
  };
  const order = priorities[lane] || [];
  return [...DESTINATIONS].sort((a, b) => {
    const ai = order.indexOf(a.href);
    const bi = order.indexOf(b.href);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });
}

/* ═══ DESKTOP SIDEBAR ═══ */
function DesktopSidebar() {
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const pathname = usePathname();
  const lane = useLane();
  const destinations = getLaneOrder(lane);
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  const showExpanded = expanded || pinned;
  const w = showExpanded ? 220 : 64;

  return (
    <nav
      aria-label="Main navigation"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => { if (!pinned) setExpanded(false); }}
      style={{
        position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100,
        width: w, background: "var(--bg, #fff)",
        borderRight: "1px solid var(--border, #e5e5e5)",
        display: "flex", flexDirection: "column",
        transition: "width 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        overflow: "hidden",
      }}
    >
      {/* Logo / Home */}
      <Link href="/" style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "16px 16px", textDecoration: "none", color: "inherit",
        borderBottom: "1px solid var(--border, #e5e5e5)", minHeight: 60,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          <Image src="/logo/b_transparent_512.png" alt="Builder's KG" width={32} height={32} style={{ objectFit: "contain" }} />
        </div>
        {showExpanded && (
          <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.1 }}>Builder&apos;s KG</div>
            <div style={{ fontSize: 9, color: "var(--fg-secondary, #888)", letterSpacing: 1 }}>KNOWLEDGE GARDEN</div>
          </div>
        )}
      </Link>

      {/* Destination links */}
      <div style={{ flex: 1, padding: "8px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {destinations.map((dest) => {
          const active = isActive(dest.href);
          return (
            <Link key={dest.href} href={dest.href} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: showExpanded ? "10px 12px" : "10px 12px",
              borderRadius: 10, textDecoration: "none", color: "inherit",
              background: active ? `${dest.color}12` : "transparent",
              borderLeft: active ? `3px solid ${dest.color}` : "3px solid transparent",
              transition: "all 0.15s",
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--bg-hover, #f5f5f5)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              aria-current={active ? "page" : undefined}
              title={dest.label}
            >
              <span style={{ fontSize: 20, flexShrink: 0, width: 28, textAlign: "center" }}>{dest.icon}</span>
              {showExpanded && (
                <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
                  <div style={{ fontSize: 12, fontWeight: active ? 600 : 500 }}>{dest.label}</div>
                  <div style={{ fontSize: 10, color: "var(--fg-secondary, #888)" }}>{dest.desc}</div>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Pin toggle */}
      <button
        onClick={() => setPinned(p => !p)}
        title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
        style={{
          margin: "8px 8px 16px", padding: "8px 12px", borderRadius: 8,
          border: "1px solid var(--border, #e5e5e5)", background: pinned ? "#1D9E7512" : "transparent",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          color: "var(--fg-secondary, #888)", fontSize: 11,
          transition: "all 0.15s",
        }}
      >
        <span style={{ fontSize: 14 }}>{pinned ? "📌" : "📎"}</span>
        {showExpanded && <span>{pinned ? "Unpin" : "Pin open"}</span>}
      </button>
    </nav>
  );
}

/* ═══ MOBILE FAB + BLOOM ═══ */
function MobileFAB() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const lane = useLane();
  const destinations = getLaneOrder(lane);
  const firstCardRef = useRef<HTMLAnchorElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && open) { setOpen(false); fabRef.current?.focus(); }
  }, [open]);
  useEffect(() => { document.addEventListener("keydown", handleKeyDown); return () => document.removeEventListener("keydown", handleKeyDown); }, [handleKeyDown]);
  useEffect(() => { if (open && firstCardRef.current) setTimeout(() => firstCardRef.current?.focus(), 100); }, [open]);

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9998,
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
            animation: "compassFadeIn 0.2s ease",
          }}
        >
          <div role="navigation" aria-label="Main navigation" style={{
            position: "fixed", bottom: 96, right: 16,
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 10, width: 320, maxWidth: "calc(100vw - 32px)",
          }}>
            {destinations.map((dest, i) => {
              const active = isActive(dest.href);
              return (
                <Link key={dest.href} href={dest.href}
                  ref={i === 0 ? firstCardRef : undefined}
                  onClick={() => setOpen(false)}
                  style={{
                    display: "flex", flexDirection: "column", gap: 4,
                    padding: 14, borderRadius: 14,
                    background: active ? `${dest.color}12` : "var(--bg, #fff)",
                    border: active ? `2px solid ${dest.color}` : "1px solid var(--border, #e5e5e5)",
                    textDecoration: "none", color: "inherit", opacity: 0,
                    animation: `compassCardIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 50}ms forwards`,
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03) translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${dest.color}25`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                  aria-label={`${dest.label}: ${dest.desc}`}
                  aria-current={active ? "page" : undefined}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{dest.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{dest.label}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--fg-secondary, #666)", lineHeight: 1.4 }}>{dest.desc}</span>
                  {active && <div style={{ width: 20, height: 3, borderRadius: 2, background: dest.color, marginTop: 2 }} />}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <button ref={fabRef} onClick={() => setOpen(o => !o)}
        aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          width: 56, height: 56, borderRadius: 16, border: "none", cursor: "pointer",
          background: open ? "linear-gradient(135deg, #1D9E75, #0c5e45)" : "var(--bg, #fff)",
          color: open ? "#fff" : "var(--fg, #111)",
          boxShadow: open ? "0 6px 24px rgba(29,158,117,0.4)" : "0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: open ? 20 : 24,
          transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
      >
        {open ? "✕" : "🧭"}
      </button>

      <style>{`
        @keyframes compassFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes compassCardIn { from { opacity: 0; transform: translateY(20px) scale(0.9) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; } }
        @media print { button[aria-label*="navigation"], nav[aria-label*="navigation"] { display: none !important; } }
      `}</style>
    </>
  );
}

/* ═══ MAIN EXPORT — switches between desktop sidebar and mobile FAB ═══ */
export default function CompassNav() {
  const [mounted, setMounted] = useState(false);
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (pathname === "/presentation") return null;
  return isDesktop ? <DesktopSidebar /> : <MobileFAB />;
}
