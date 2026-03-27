"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LaneSelector from "@/components/LaneSelector";

export default function OnboardPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const lane = localStorage.getItem("bkg-lane");
    if (lane) setSelected(lane);
  }, []);

  const handleSelect = (laneId: string) => {
    setSelected(laneId);
    localStorage.setItem("bkg-lane", laneId);
  };

  const handleContinue = () => {
    if (!selected) return;
    setShowCelebration(true);
    setTimeout(() => {
      // Route based on lane
      const routes: Record<string, string> = {
        gc: "/launch", diy: "/dream", specialty: "/launch",
        supplier: "/marketplace", equipment: "/marketplace",
        service: "/profile", worker: "/profile", robot: "/api/v1/mcp",
      };
      router.push(routes[selected] || "/");
    }, 1500);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <LaneSelector onSelect={handleSelect} selected={selected} />

      {/* Continue button */}
      {selected && !showCelebration && (
        <div style={{ textAlign: "center", padding: "0 16px 40px" }}>
          <button
            onClick={handleContinue}
            style={{
              padding: "14px 40px", borderRadius: 24, border: "none",
              background: "linear-gradient(135deg, #1D9E75, #0F6E56)",
              color: "#222", fontSize: 15, fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s",
              boxShadow: "0 4px 16px rgba(29,158,117,0.3)",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
          >
            Continue as {selected === "gc" ? "General Contractor" : selected === "diy" ? "DIY Builder" : selected === "specialty" ? "Specialty Contractor" : selected === "supplier" ? "Supplier" : selected === "equipment" ? "Equipment Provider" : selected === "service" ? "Service Provider" : selected === "worker" ? "Worker" : "Robot/AI"} →
          </button>
        </div>
      )}

      {/* Celebration overlay */}
      {showCelebration && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)",
          animation: "compassFadeIn 0.3s ease",
        }}>
          <div style={{
            textAlign: "center", padding: "40px 48px", borderRadius: 24,
            background: "var(--bg, #fff)", boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
            animation: "compassCardIn 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Welcome, Builder!</div>
            <div style={{ fontSize: 13, color: "var(--fg-secondary, #666)" }}>
              Your garden is ready. Let&apos;s build something amazing.
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes compassFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes compassCardIn { from { opacity: 0; transform: translateY(20px) scale(0.9) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}
