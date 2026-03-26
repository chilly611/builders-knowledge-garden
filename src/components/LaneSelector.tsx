"use client";

import { useState } from "react";

export interface Lane {
  id: string;
  icon: string;
  label: string;
  tagline: string;
  desc: string;
  color: string;
  features: string[];
  pricing: string;
}

export const LANES: Lane[] = [
  {
    id: "gc", icon: "🏗️", label: "General Contractor",
    tagline: "Run your entire operation",
    desc: "Projects, crews, invoicing, CRM, compliance — one platform replacing Procore + QuickBooks + Excel.",
    color: "#1D9E75",
    features: ["Full PM suite", "AIA invoicing", "CRM", "Scheduling", "Safety briefings"],
    pricing: "Pro $49/mo or Team $199/mo",
  },
  {
    id: "diy", icon: "🔨", label: "DIY / Owner-Builder",
    tagline: "Build with confidence",
    desc: "First-time builder? We explain the codes, find the permits, and make sure you pass inspection.",
    color: "#D85A30",
    features: ["Dream Builder", "Permit navigator", "Budget tracking", "Code guidance"],
    pricing: "Free → Pro $49/mo",
  },
  {
    id: "specialty", icon: "⚡", label: "Specialty Contractor",
    tagline: "Win more, track certs, get paid faster",
    desc: "Electrical, plumbing, HVAC, concrete, steel, roofing — trade-specific codes and crew management.",
    color: "#7F77DD",
    features: ["Trade-specific codes", "Cert tracking", "Job costing", "Crew scheduling"],
    pricing: "Pro $49/mo or Team $199/mo",
  },
  {
    id: "supplier", icon: "📦", label: "Supplier / Manufacturer",
    tagline: "Get found by every builder who needs your products",
    desc: "List products, receive RFQs, auto-match when a code requires your material.",
    color: "#378ADD",
    features: ["Product listings", "RFQ inbox", "Code-connected products", "Lead analytics"],
    pricing: "Pro $49/mo",
  },
  {
    id: "equipment", icon: "🚜", label: "Equipment Sales & Rental",
    tagline: "100% utilization, zero downtime",
    desc: "Fleet management, availability calendar, auto-bookings from project schedules.",
    color: "#BA7517",
    features: ["Fleet management", "Availability calendar", "Utilization tracking", "Booking pipeline"],
    pricing: "Pro $49/mo or Team $199/mo",
  },
  {
    id: "service", icon: "🔧", label: "Service Provider",
    tagline: "Steady pipeline, visible reputation",
    desc: "Architects, engineers, surveyors, inspectors, consultants — portfolio + lead generation.",
    color: "#639922",
    features: ["Portfolio showcase", "Lead pipeline", "Proposal templates", "Client portal"],
    pricing: "Pro $49/mo",
  },
  {
    id: "worker", icon: "👷", label: "Job Seeker / Worker",
    tagline: "Level up skills, never between jobs",
    desc: "Skills profile, certification tracking, training courses, job board, crew matching.",
    color: "#EC4899",
    features: ["Skills profile", "Cert tracking", "Training courses", "Job board"],
    pricing: "Free → Pro $49/mo",
  },
  {
    id: "robot", icon: "🤖", label: "Robot / AI Agent",
    tagline: "One knowledge backbone for all autonomous systems",
    desc: "MCP server, REST API, structured JSON, machine-readable work instructions.",
    color: "#8B5CF6",
    features: ["MCP server (10 tools)", "REST API", "Structured JSON", "Real-time codes"],
    pricing: "Platform tier (custom)",
  },
];

interface LaneSelectorProps {
  onSelect: (laneId: string) => void;
  selected?: string | null;
}

export default function LaneSelector({ onSelect, selected }: LaneSelectorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🏗️</div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6, lineHeight: 1.2 }}>
          Welcome to the Builder&apos;s Knowledge Garden
        </h1>
        <p style={{ fontSize: 14, color: "var(--fg-secondary, #666)", lineHeight: 1.6, maxWidth: 460, margin: "0 auto" }}>
          Tell us what you do so we can customize your experience. You can always change this later.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {LANES.map((lane) => {
          const isSelected = selected === lane.id;
          const isHovered = hoveredId === lane.id;
          return (
            <button
              key={lane.id}
              onClick={() => onSelect(lane.id)}
              onMouseEnter={() => setHoveredId(lane.id)}
              onMouseLeave={() => setHoveredId(null)}
              aria-pressed={isSelected}
              style={{
                display: "flex", flexDirection: "column", gap: 6,
                padding: "16px 18px", borderRadius: 16, cursor: "pointer",
                border: isSelected ? `2px solid ${lane.color}` : "1px solid var(--border, #e5e5e5)",
                background: isSelected
                  ? `${lane.color}10`
                  : isHovered ? "var(--bg-hover, #f8f8f8)" : "var(--bg, #fff)",
                textAlign: "left", color: "inherit",
                transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                transform: isHovered ? "translateY(-2px)" : "none",
                boxShadow: isHovered
                  ? `0 8px 24px ${lane.color}18`
                  : isSelected ? `0 4px 16px ${lane.color}20` : "none",
                borderLeft: isSelected ? `4px solid ${lane.color}` : undefined,
              }}
            >
              {/* Icon + Label */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 28 }}>{lane.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{lane.label}</div>
                  <div style={{ fontSize: 11, color: lane.color, fontWeight: 500 }}>{lane.tagline}</div>
                </div>
                {isSelected && (
                  <span style={{
                    marginLeft: "auto", width: 22, height: 22, borderRadius: 11,
                    background: lane.color, color: "#fff", fontSize: 13, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>✓</span>
                )}
              </div>

              {/* Description */}
              <div style={{ fontSize: 12, color: "var(--fg-secondary, #666)", lineHeight: 1.5 }}>
                {lane.desc}
              </div>

              {/* Feature pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                {lane.features.map((f) => (
                  <span key={f} style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 8,
                    background: isSelected ? `${lane.color}18` : "var(--bg-hover, #f0f0f0)",
                    color: isSelected ? lane.color : "var(--fg-secondary, #888)",
                    fontWeight: 500,
                  }}>{f}</span>
                ))}
              </div>

              {/* Pricing hint */}
              <div style={{ fontSize: 10, color: "var(--fg-tertiary, #aaa)", marginTop: 2 }}>
                {lane.pricing}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom hint */}
      <p style={{
        textAlign: "center", fontSize: 11, marginTop: 20,
        color: "var(--fg-tertiary, #aaa)", lineHeight: 1.5,
      }}>
        💡 You can select multiple lanes or change anytime in Settings → Profile.
        <br />Robots and AI agents should use the <a href="/api/v1/mcp" style={{ color: "#8B5CF6" }}>MCP Server</a> directly.
      </p>
    </div>
  );
}
