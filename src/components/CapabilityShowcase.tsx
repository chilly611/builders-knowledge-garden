"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

interface Capability {
  title: string;
  description: string;
  status: "live" | "coming" | "phase2";
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  capabilities: Capability[];
  relevantLanes?: string[];
}

interface CapabilityShowcaseProps {
  lane?: string;
  compact?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════

const CATEGORIES: Category[] = [
  {
    id: "estimates",
    name: "Estimates & Budgets",
    icon: "💰",
    color: "#22C55E",
    relevantLanes: ["gc", "specialty", "equipment"],
    capabilities: [
      {
        title: "AI Cost Estimating",
        description: "CSI division breakdown in seconds",
        status: "live",
      },
      {
        title: "Budget Tracking",
        description: "Real-time budget vs actual",
        status: "live",
      },
      {
        title: "Change Orders",
        description: "Auto-priced from knowledge engine",
        status: "live",
      },
      {
        title: "Invoice / Pay Apps",
        description: "AIA G702/G703 generation",
        status: "coming",
      },
    ],
  },
  {
    id: "scheduling",
    name: "Scheduling & Planning",
    icon: "📅",
    color: "#378ADD",
    relevantLanes: ["gc", "specialty"],
    capabilities: [
      {
        title: "AI Schedule Generation",
        description: "Constraint-aware, jurisdiction hold points",
        status: "live",
      },
      {
        title: "Gantt Charts",
        description: "Visual timeline with dependencies",
        status: "live",
      },
      {
        title: "Daily Logs",
        description: "Voice-first field reporting",
        status: "coming",
      },
      {
        title: "Resource Planning",
        description: "Labor, equipment, materials",
        status: "phase2",
      },
    ],
  },
  {
    id: "compliance",
    name: "Code Compliance",
    icon: "📋",
    color: "#E8443A",
    relevantLanes: ["gc", "diy", "specialty", "service"],
    capabilities: [
      {
        title: "2,200+ Building Codes",
        description: "Updated nightly from 142+ jurisdictions",
        status: "live",
      },
      {
        title: "Inspection Checklists",
        description: "Code-aware field checks",
        status: "coming",
      },
      {
        title: "Permit Requirements",
        description: "Jurisdiction-specific permit guides",
        status: "live",
      },
      {
        title: "Safety Briefings",
        description: "AI-generated daily safety reports",
        status: "coming",
      },
    ],
  },
  {
    id: "permits",
    name: "Permits & Approvals",
    icon: "📑",
    color: "#BA7517",
    relevantLanes: ["gc", "diy", "specialty", "service"],
    capabilities: [
      {
        title: "Permit Research",
        description: "Requirements by jurisdiction",
        status: "live",
      },
      {
        title: "Application Prep",
        description: "Auto-fill from project data",
        status: "coming",
      },
      {
        title: "Status Tracking",
        description: "Real-time permit approval status",
        status: "coming",
      },
      {
        title: "First-Try Approval AI",
        description: "Pre-check against all requirements",
        status: "phase2",
      },
    ],
  },
  {
    id: "supply",
    name: "Supply Chain",
    icon: "🚛",
    color: "#D85A30",
    relevantLanes: ["gc", "supplier", "equipment"],
    capabilities: [
      {
        title: "Material Sourcing",
        description: "Find best value from verified suppliers",
        status: "coming",
      },
      {
        title: "Price Comparison",
        description: "Real-time material pricing",
        status: "coming",
      },
      {
        title: "Delivery Tracking",
        description: "GPS-tracked deliveries",
        status: "phase2",
      },
      {
        title: "Supplier Marketplace",
        description: "Stripe Connect powered",
        status: "coming",
      },
    ],
  },
  {
    id: "people",
    name: "People & Payroll",
    icon: "👷",
    color: "#7F77DD",
    relevantLanes: ["gc", "specialty", "worker"],
    capabilities: [
      {
        title: "Sub-Contractor Finding",
        description: "Find, hire, manage subs",
        status: "coming",
      },
      {
        title: "Team Management",
        description: "Roles, permissions, assignments",
        status: "live",
      },
      {
        title: "Automated Payroll",
        description: "Time tracking to payroll",
        status: "phase2",
      },
      {
        title: "Worker Profiles",
        description: "Skills, certs, availability",
        status: "coming",
      },
    ],
  },
  {
    id: "contracts",
    name: "Contracts & Legal",
    icon: "⚖️",
    color: "#639922",
    relevantLanes: ["gc", "service"],
    capabilities: [
      {
        title: "Contract Generation",
        description: "AI-drafted from project data",
        status: "coming",
      },
      {
        title: "Lien Waivers",
        description: "Jurisdiction-aware, auto-generated",
        status: "coming",
      },
      {
        title: "Insurance Tracking",
        description: "COI management",
        status: "phase2",
      },
      {
        title: "Legal Templates",
        description: "State-specific construction law",
        status: "coming",
      },
    ],
  },
  {
    id: "documents",
    name: "Documents & Drawings",
    icon: "📐",
    color: "#378ADD",
    relevantLanes: ["gc", "service", "specialty"],
    capabilities: [
      {
        title: "RFI Management",
        description: "Create, track, resolve",
        status: "live",
      },
      {
        title: "Submittal Tracking",
        description: "Full approval chain",
        status: "live",
      },
      {
        title: "Drawing Management",
        description: "PDF upload, OCR, revisions",
        status: "coming",
      },
      {
        title: "Punch Lists",
        description: "Photo capture, assign, resolve",
        status: "live",
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function CapabilityShowcase({
  lane,
  compact = false,
}: CapabilityShowcaseProps) {
  // Track which categories are expanded (default: all expanded on desktop, collapsed on mobile)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return new Set();
    }
    return new Set(CATEGORIES.map((c) => c.id));
  });

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Calculate stats
  const stats = useMemo(() => {
    let live = 0;
    let coming = 0;
    let phase2 = 0;

    CATEGORIES.forEach((cat) => {
      cat.capabilities.forEach((cap) => {
        if (cap.status === "live") live++;
        else if (cap.status === "coming") coming++;
        else if (cap.status === "phase2") phase2++;
      });
    });

    return { live, coming, phase2 };
  }, []);

  // Filter relevant categories if lane is specified
  const visibleCategories = lane
    ? CATEGORIES.filter(
        (cat) =>
          !cat.relevantLanes ||
          cat.relevantLanes.length === 0 ||
          cat.relevantLanes.includes(lane)
      )
    : CATEGORIES;

  const containerPadding = compact ? "16px" : "24px";
  const containerMaxWidth = compact ? "100%" : "1200px";

  return (
    <div
      style={{
        padding: containerPadding,
        maxWidth: containerMaxWidth,
        margin: "0 auto",
        fontFamily: "var(--font-archivo, 'Helvetica Neue', sans-serif)",
      }}
    >
      {/* HEADER */}
      {!compact && (
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 12,
              lineHeight: 1.2,
              color: "var(--fg, #222)",
            }}
          >
            Platform Capabilities
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--fg-secondary, #666)",
              lineHeight: 1.6,
              marginBottom: 20,
              maxWidth: 600,
              margin: "0 auto",
            }}
          >
            Everything you need to run construction projects from estimate to completion.
          </p>

          {/* STATS */}
          <div
            style={{
              display: "flex",
              gap: 24,
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#22C55E",
                  marginBottom: 4,
                }}
              >
                {stats.live}
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-tertiary, #999)" }}>
                Live Now
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#F59E0B",
                  marginBottom: 4,
                }}
              >
                {stats.coming}
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-tertiary, #999)" }}>
                Coming This Quarter
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#9CA3AF",
                  marginBottom: 4,
                }}
              >
                {stats.phase2}
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-tertiary, #999)" }}>
                Phase 2 Development
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORIES GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            compact || typeof window !== "undefined" && window.innerWidth < 768
              ? "1fr"
              : "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          marginBottom: compact ? 0 : 32,
        }}
      >
        {visibleCategories.map((category) => {
          const isExpanded = expandedCategories.has(category.id);

          return (
            <motion.div
              key={category.id}
              layout
              style={{
                background: "#FAFAF8",
                border: "1px solid var(--border, #e5e5e5)",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                transition: "all 0.2s ease",
              }}
              whileHover={{
                boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
              }}
            >
              {/* CATEGORY HEADER - Click to expand/collapse */}
              <motion.button
                onClick={() => toggleCategory(category.id)}
                style={{
                  width: "100%",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "inherit",
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
                whileHover={{ background: "rgba(0,0,0,0.02)" }}
              >
                {/* Icon */}
                <div
                  style={{
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  {category.icon}
                </div>

                {/* Title */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--fg, #222)",
                      marginBottom: 2,
                    }}
                  >
                    {category.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: category.color,
                      fontWeight: 500,
                    }}
                  >
                    {category.capabilities.filter((c) => c.status === "live")
                      .length}{" "}
                    Live
                  </div>
                </div>

                {/* Chevron */}
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "var(--fg-tertiary, #999)",
                  }}
                >
                  ▼
                </motion.div>
              </motion.button>

              {/* CAPABILITIES LIST - Collapsible */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      overflow: "hidden",
                      borderTop: "1px solid var(--border, #e5e5e5)",
                    }}
                  >
                    <div style={{ padding: "12px 16px" }}>
                      {category.capabilities.map((cap, idx) => (
                        <motion.div
                          key={cap.title}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.2,
                            delay: idx * 0.04,
                          }}
                          style={{
                            paddingBottom: idx < category.capabilities.length - 1 ? 12 : 0,
                            paddingTop: idx > 0 ? 12 : 0,
                            borderBottom:
                              idx < category.capabilities.length - 1
                                ? "1px solid var(--border, #e5e5e5)"
                                : "none",
                          }}
                        >
                          {/* Capability Row */}
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "flex-start",
                            }}
                          >
                            {/* Status Dot */}
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                flexShrink: 0,
                                marginTop: 6,
                                background:
                                  cap.status === "live"
                                    ? "#22C55E"
                                    : cap.status === "coming"
                                      ? "#F59E0B"
                                      : "#D1D5DB",
                              }}
                            />

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "var(--fg, #222)",
                                  marginBottom: 2,
                                  lineHeight: 1.4,
                                }}
                              >
                                {cap.title}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--fg-secondary, #666)",
                                  lineHeight: 1.4,
                                  marginBottom: 4,
                                }}
                              >
                                {cap.description}
                              </div>

                              {/* Status Badge */}
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "2px 8px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  background:
                                    cap.status === "live"
                                      ? "#DCFCE7"
                                      : cap.status === "coming"
                                        ? "#FEF3C7"
                                        : "#F3F4F6",
                                  color:
                                    cap.status === "live"
                                      ? "#166534"
                                      : cap.status === "coming"
                                        ? "#92400E"
                                        : "#6B7280",
                                }}
                              >
                                {cap.status === "live" && "✅ Live"}
                                {cap.status === "coming" && "🔜 Coming"}
                                {cap.status === "phase2" && "📦 Phase 2"}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* FOOTER - Replaces */}
      {!compact && (
        <div
          style={{
            textAlign: "center",
            marginTop: 32,
            padding: "24px",
            background: "#FAFAF8",
            borderRadius: 12,
            border: "1px solid var(--border, #e5e5e5)",
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "var(--fg-secondary, #666)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            <strong style={{ color: "var(--fg, #222)" }}>
              Replaces QuickBooks + Excel + Procore + pen & paper
            </strong>
            <br />
            All in one $49/mo platform
          </p>
        </div>
      )}
    </div>
  );
}
