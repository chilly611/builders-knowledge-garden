"use client";

import { useState, useCallback, useEffect } from "react";
import {
  BUILDING_TYPES,
  JURISDICTIONS,
  PROJECT_PHASES,
  getCodeRequirements,
  getPermitRequirements,
  getTeamNeeds,
  generateEstimate,
  getMaterialSuggestions,
  generateSchedule,
} from "@/lib/knowledge-data";
import Link from "next/link";
import Image from "next/image";
import CopilotPanel from "@/components/CopilotPanel";
import {
  CompletionRing,
  AnimCounter,
  ConfidenceScore,
  calculateConfidence,
  LifecycleFog,
  QuestLine,
  Celebration,
  KnowledgeDrop,
  getKnowledgeDrop,
  GamificationStyles,
} from "@/components/Gamification";

type Step = "type" | "location" | "params" | "dashboard";

export default function LaunchPage() {
  const [step, setStep] = useState<Step>("type");
  const [buildingType, setBuildingType] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [sqft, setSqft] = useState(2500);
  const [quality, setQuality] = useState("standard");
  const [projectName, setProjectName] = useState("");
  const [dashTab, setDashTab] = useState("overview");
  const [searchJ, setSearchJ] = useState("");

  // Gamification state
  const [celebration, setCelebration] = useState<{ emoji: string; title: string; subtitle: string } | null>(null);
  const [knowledgeDrop, setKnowledgeDrop] = useState<string | null>(null);
  const [codesReviewed, setCodesReviewed] = useState(0);
  const [firstDashboard, setFirstDashboard] = useState(true);
  const [reviewedCodes, setReviewedCodes] = useState<Set<number>>(new Set());

  // Derived data from knowledge engine
  const bt = BUILDING_TYPES.find((b) => b.id === buildingType);
  const jd = JURISDICTIONS.find((j) => j.id === jurisdiction);
  const codes = buildingType && jurisdiction ? getCodeRequirements(buildingType, jurisdiction) : [];
  const permits = buildingType && jurisdiction ? getPermitRequirements(buildingType, jurisdiction) : [];
  const team = buildingType ? getTeamNeeds(buildingType) : [];
  const estimate = buildingType ? generateEstimate(buildingType, sqft, quality) : [];
  const totalCost = estimate.reduce((s, e) => s + e.amount, 0);
  const filteredJ = JURISDICTIONS.filter(
    (j) => j.name.toLowerCase().includes(searchJ.toLowerCase()) || j.code.toLowerCase().includes(searchJ.toLowerCase())
  );
  const materials = buildingType && jurisdiction ? getMaterialSuggestions(buildingType, jurisdiction, quality) : [];
  const schedule = buildingType ? generateSchedule(buildingType, sqft, jurisdiction || "ibc-2024") : null;

  // Confidence score (#9)
  const confidence = calculateConfidence({
    buildingTypeSet: !!buildingType,
    jurisdictionSet: !!jurisdiction,
    codesReviewed: reviewedCodes.size,
    totalCodes: codes.length,
    permitsIdentified: permits.length,
    totalPermits: permits.length,
    teamAssembled: 0,
    totalTeam: team.filter((t) => t.required).length,
    estimateGenerated: estimate.length > 0,
    scheduleGenerated: true,
  });

  // Quest steps (#4)
  const questSteps = [
    { id: "type", mission: "Define Vision", subtitle: "What are you building?", icon: "🎯", complete: !!buildingType, active: step === "type" },
    { id: "location", mission: "Set Jurisdiction", subtitle: "Where?", icon: "📍", complete: !!jurisdiction, active: step === "location" },
    { id: "params", mission: "Configure", subtitle: "Size & quality", icon: "⚙️", complete: step === "dashboard", active: step === "params" },
    { id: "dashboard", mission: "Launch", subtitle: "Your project", icon: "🚀", complete: false, active: step === "dashboard" },
  ];

  // Knowledge drop on jurisdiction selection
  useEffect(() => {
    if (jurisdiction || buildingType) {
      const drop = getKnowledgeDrop(jurisdiction, buildingType);
      setKnowledgeDrop(drop);
    }
  }, [jurisdiction, buildingType]);

  // First dashboard celebration
  useEffect(() => {
    if (step === "dashboard" && firstDashboard) {
      setFirstDashboard(false);
      setCelebration({
        emoji: "🚀",
        title: "Project Launched!",
        subtitle: `${bt?.name} in ${jd?.name} — your AI COO is ready`,
      });
    }
  }, [step, firstDashboard, bt, jd]);

  const goNext = useCallback(() => {
    if (step === "type" && buildingType) setStep("location");
    else if (step === "location" && jurisdiction) setStep("params");
    else if (step === "params") {
      if (!projectName) setProjectName(`${bt?.name || "Project"} — ${jd?.name || ""}`);
      setStep("dashboard");
    }
  }, [step, buildingType, jurisdiction, projectName, bt, jd]);

  const STEPS: { id: Step; label: string }[] = [
    { id: "type", label: "Building Type" },
    { id: "location", label: "Jurisdiction" },
    { id: "params", label: "Parameters" },
    { id: "dashboard", label: "Project Dashboard" },
  ];

  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const card = "rounded-xl border p-5";
  const cardStyle = { borderColor: "var(--border)", background: "var(--bg-secondary)" };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <GamificationStyles />

      {/* Celebration overlay */}
      {celebration && (
        <Celebration
          show={true}
          emoji={celebration.emoji}
          title={celebration.title}
          subtitle={celebration.subtitle}
          onDone={() => setCelebration(null)}
        />
      )}

      {/* Top Nav with Quest Line */}
      <nav className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo/b_transparent_512.png" alt="Builder's KG" width={28} height={28} className="rounded-md" />
          <span className="font-semibold text-sm">Smart Project Launcher</span>
        </Link>
        {step !== "dashboard" ? (
          <div className="hidden sm:block">
            <QuestLine steps={questSteps} />
          </div>
        ) : (
          <ConfidenceScore score={confidence} />
        )}
      </nav>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 1: Building Type — "Mission 1: Define Your Vision"   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === "type" && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🎯</span>
              <div>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--accent)" }}>
                  Mission 1 of 4
                </div>
                <h1 className="text-2xl font-semibold">What are you building?</h1>
              </div>
            </div>
            <p className="text-sm mb-8 ml-10" style={{ color: "var(--fg-secondary)" }}>
              Select your building type. The knowledge engine auto-populates codes, phases, team needs, and cost estimates.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BUILDING_TYPES.map((b) => (
                <button key={b.id} onClick={() => { setBuildingType(b.id); if (!buildingType) setCelebration({ emoji: b.icon, title: "Vision Set!", subtitle: `${b.name} — great choice. Let's find your jurisdiction.` }); }}
                  className={`${card} text-left cursor-pointer transition-all`}
                  style={{
                    ...cardStyle,
                    borderColor: buildingType === b.id ? "#1D9E75" : "var(--border)",
                    borderWidth: buildingType === b.id ? 2 : 1,
                    transform: buildingType === b.id ? "scale(1.02)" : "scale(1)",
                    transition: "all 0.2s ease",
                  }}>
                  <div className="text-2xl mb-2">{b.icon}</div>
                  <div className="text-sm font-medium">{b.name}</div>
                  <div className="text-[10px] mt-1" style={{ color: "var(--fg-tertiary)" }}>{b.description}</div>
                  <div className="text-[10px] mt-2 font-medium" style={{ color: "var(--accent)" }}>{b.typical_cost}</div>
                </button>
              ))}
            </div>
            {buildingType && (
              <div className="mt-6 flex justify-end" style={{ animation: "slideUp 0.3s ease" }}>
                <button onClick={goNext}
                  className="px-6 py-2.5 rounded-full text-white text-sm font-medium transition-all hover:scale-105"
                  style={{ background: "#1D9E75" }}>
                  Next Mission: Select Jurisdiction →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 2: Jurisdiction — "Mission 2: Know Your Codes"       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === "location" && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            <button onClick={() => setStep("type")} className="text-xs mb-4 flex items-center gap-1" style={{ color: "var(--fg-tertiary)" }}>
              ← Back to building type
            </button>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📍</span>
              <div>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#7F77DD" }}>
                  Mission 2 of 4
                </div>
                <h1 className="text-2xl font-semibold">Where are you building?</h1>
              </div>
            </div>
            <p className="text-sm mb-6 ml-10" style={{ color: "var(--fg-secondary)" }}>
              Jurisdiction determines codes, permits, inspections, and compliance. We cover 142+ and growing.
            </p>

            {/* Knowledge drop for building type */}
            {knowledgeDrop && !jurisdiction && (
              <div className="mb-4 ml-10">
                <KnowledgeDrop text={knowledgeDrop} />
              </div>
            )}

            <input type="text" placeholder="Search jurisdictions..."
              value={searchJ} onChange={(e) => setSearchJ(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border text-sm mb-4 outline-none"
              style={{ borderColor: "var(--border)", background: "var(--bg-secondary)", color: "var(--fg)" }} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {filteredJ.map((j) => (
                <button key={j.id} onClick={() => setJurisdiction(j.id)}
                  className={`${card} text-left cursor-pointer transition-all py-3 px-4`}
                  style={{
                    ...cardStyle,
                    borderColor: jurisdiction === j.id ? "#1D9E75" : "var(--border)",
                    borderWidth: jurisdiction === j.id ? 2 : 1,
                  }}>
                  <div className="text-sm font-medium">{j.name}</div>
                  <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>{j.code} ({j.year})</div>
                </button>
              ))}
            </div>
            {jurisdiction && knowledgeDrop && (
              <div className="mt-4">
                <KnowledgeDrop text={knowledgeDrop} />
              </div>
            )}
            {jurisdiction && (
              <div className="mt-6 flex justify-end" style={{ animation: "slideUp 0.3s ease" }}>
                <button onClick={goNext}
                  className="px-6 py-2.5 rounded-full text-white text-sm font-medium transition-all hover:scale-105"
                  style={{ background: "#1D9E75" }}>
                  Next Mission: Set Parameters →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 3: Parameters — "Mission 3: Chart the Course"        */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === "params" && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            <button onClick={() => setStep("location")} className="text-xs mb-4 flex items-center gap-1" style={{ color: "var(--fg-tertiary)" }}>
              ← Back to jurisdiction
            </button>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">⚙️</span>
              <div>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#1D9E75" }}>
                  Mission 3 of 4
                </div>
                <h1 className="text-2xl font-semibold">Project parameters</h1>
              </div>
            </div>
            <p className="text-sm mb-8 ml-10" style={{ color: "var(--fg-secondary)" }}>
              Set size and quality level. The knowledge engine calculates everything else.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div className={card} style={cardStyle}>
                <label className="text-xs font-medium block mb-3" style={{ color: "var(--fg-secondary)" }}>Project Name</label>
                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)}
                  placeholder={`${bt?.name || "Project"} — ${jd?.name || ""}`}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--fg)" }} />
              </div>
              <div className={card} style={cardStyle}>
                <label className="text-xs font-medium block mb-3" style={{ color: "var(--fg-secondary)" }}>Square Footage</label>
                <input type="range" min={500} max={100000} step={500} value={sqft}
                  onChange={(e) => setSqft(Number(e.target.value))} className="w-full accent-[#1D9E75]" />
                <div className="text-right text-sm font-medium mt-1">
                  <AnimCounter value={sqft} suffix=" sf" />
                </div>
              </div>
              <div className={card} style={cardStyle}>
                <label className="text-xs font-medium block mb-3" style={{ color: "var(--fg-secondary)" }}>Quality Level</label>
                <div className="flex gap-2">
                  {["economy", "standard", "premium"].map((q) => (
                    <button key={q} onClick={() => setQuality(q)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all"
                      style={{
                        background: quality === q ? "#1D9E75" : "var(--bg-tertiary)",
                        color: quality === q ? "#fff" : "var(--fg-secondary)",
                        border: `1px solid ${quality === q ? "#1D9E75" : "var(--border)"}`,
                      }}>{q}</button>
                  ))}
                </div>
              </div>
              <div className={card} style={cardStyle}>
                <label className="text-xs font-medium block mb-2" style={{ color: "var(--fg-secondary)" }}>Preliminary Estimate</label>
                <div className="text-2xl font-semibold" style={{ color: "var(--accent)" }}>
                  <AnimCounter value={totalCost} prefix="$" />
                </div>
                <div className="text-[10px] mt-1" style={{ color: "var(--fg-tertiary)" }}>
                  <AnimCounter value={sqft} /> sf × {quality} · CSI division breakdown on dashboard
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={goNext}
                className="px-8 py-3 rounded-full text-white text-sm font-medium transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #1D9E75, #0F6E56)" }}>
                🚀 Final Mission: Launch Project Dashboard
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 4: Full Project Dashboard — Gamified                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === "dashboard" && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            {/* Dashboard header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] tracking-widest uppercase" style={{ color: "var(--fg-tertiary)" }}>Project Dashboard</div>
                <h1 className="text-xl font-semibold">{projectName || `${bt?.name} — ${jd?.name}`}</h1>
                <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--fg-secondary)" }}>
                  <span>{bt?.icon} {bt?.name}</span>
                  <span>·</span>
                  <span>📍 {jd?.name}</span>
                  <span>·</span>
                  <span><AnimCounter value={sqft} /> sf</span>
                  <span>·</span>
                  <span className="capitalize">{quality}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold" style={{ color: "var(--accent)" }}>
                  <AnimCounter value={totalCost} prefix="$" />
                </div>
                <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>Preliminary estimate</div>
              </div>
            </div>

            {/* Lifecycle Fog of War (#1) */}
            <div className="mb-6">
              <LifecycleFog activePhase={2} unlockedPhases={[0, 1]} />
            </div>

            {/* Dashboard tabs */}
            <div className="flex gap-1 mb-6 border-b pb-0 overflow-x-auto" style={{ borderColor: "var(--border)" }}>
              {[
                { id: "overview", label: "Overview", icon: "📊" },
                { id: "codes", label: "Codes", icon: "📋" },
                { id: "schedule", label: "Schedule", icon: "📅" },
                { id: "materials", label: "Materials", icon: "🧱" },
                { id: "team", label: "Team", icon: "👥" },
                { id: "permits", label: "Permits", icon: "📄" },
                { id: "estimate", label: "Estimate", icon: "💰" },
              ].map((t) => (
                <button key={t.id} onClick={() => setDashTab(t.id)}
                  className="px-4 py-2.5 text-xs font-medium transition-all relative whitespace-nowrap"
                  style={{
                    color: dashTab === t.id ? "var(--accent)" : "var(--fg-tertiary)",
                    borderBottom: dashTab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                    marginBottom: -1,
                  }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW TAB — with completion rings (#20) */}
            {dashTab === "overview" && (<>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={card} style={cardStyle}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium mb-1" style={{ color: "var(--fg-tertiary)" }}>Code Requirements</div>
                      <div className="text-2xl font-semibold"><AnimCounter value={codes.length} /></div>
                      <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>
                        {reviewedCodes.size} of {codes.length} reviewed
                      </div>
                    </div>
                    <CompletionRing percent={codes.length > 0 ? (reviewedCodes.size / codes.length) * 100 : 0} size={44} strokeWidth={3}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: "var(--accent)" }}>
                        {codes.length > 0 ? Math.round((reviewedCodes.size / codes.length) * 100) : 0}%
                      </span>
                    </CompletionRing>
                  </div>
                </div>

                <div className={card} style={cardStyle}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium mb-1" style={{ color: "var(--fg-tertiary)" }}>Construction Phases</div>
                      <div className="text-2xl font-semibold"><AnimCounter value={PROJECT_PHASES.length} /></div>
                      <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>
                        {PROJECT_PHASES.reduce((s, p) => s + p.tasks.length, 0)} tasks total
                      </div>
                    </div>
                    <CompletionRing percent={0} size={44} strokeWidth={3} color="var(--border)">
                      <span style={{ fontSize: 9, fontWeight: 600, color: "var(--fg-tertiary)" }}>0%</span>
                    </CompletionRing>
                  </div>
                </div>

                <div className={card} style={cardStyle}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium mb-1" style={{ color: "var(--fg-tertiary)" }}>Permits Required</div>
                      <div className="text-2xl font-semibold"><AnimCounter value={permits.length} /></div>
                      <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>across {jd?.name}</div>
                    </div>
                    <CompletionRing percent={100} size={44} strokeWidth={3} color="#BA7517">
                      <span style={{ fontSize: 9, fontWeight: 600, color: "#BA7517" }}>ID</span>
                    </CompletionRing>
                  </div>
                </div>

                <div className={card} style={cardStyle}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium mb-1" style={{ color: "var(--fg-tertiary)" }}>Team Members</div>
                      <div className="text-2xl font-semibold"><AnimCounter value={team.filter(t => t.required).length} /></div>
                      <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>required + {team.filter(t => !t.required).length} optional</div>
                    </div>
                    <CompletionRing percent={0} size={44} strokeWidth={3} color="#378ADD">
                      <span style={{ fontSize: 9, fontWeight: 600, color: "#378ADD" }}>0/{team.filter(t => t.required).length}</span>
                    </CompletionRing>
                  </div>
                </div>

                <div className={card} style={cardStyle}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium mb-1" style={{ color: "var(--fg-tertiary)" }}>CSI Divisions</div>
                      <div className="text-2xl font-semibold"><AnimCounter value={estimate.length} /></div>
                      <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>cost line items</div>
                    </div>
                    <CompletionRing percent={100} size={44} strokeWidth={3} color="#639922">
                      <span style={{ fontSize: 9, fontWeight: 600, color: "#639922" }}>✓</span>
                    </CompletionRing>
                  </div>
                </div>

                <div className={card} style={cardStyle}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium mb-1" style={{ color: "var(--fg-tertiary)" }}>Jurisdiction</div>
                      <div className="text-sm font-semibold">{jd?.code}</div>
                      <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>{jd?.name} ({jd?.year})</div>
                    </div>
                    <CompletionRing percent={100} size={44} strokeWidth={3} color="#7F77DD">
                      <span style={{ fontSize: 9, fontWeight: 600, color: "#7F77DD" }}>✓</span>
                    </CompletionRing>
                  </div>
                </div>
              </div>

                {/* ═══ WHAT TO DO NEXT ═══ */}
                <div style={{ marginTop: 20, padding: "20px 24px", borderRadius: 16, background: "linear-gradient(135deg, rgba(29,158,117,0.06), rgba(55,138,221,0.04))", border: "1px solid rgba(29,158,117,0.15)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 18 }}>🎯</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>What to do next</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button onClick={() => setDashTab("codes")} style={{ padding: "14px 16px", borderRadius: 12, background: "#fff", border: "1px solid #e2e4e8", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 2 }}>📋 Review Code Requirements</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{reviewedCodes.size} of {codes.length} reviewed</div>
                    </button>
                    <button onClick={() => setDashTab("schedule")} style={{ padding: "14px 16px", borderRadius: 12, background: "#fff", border: "1px solid #e2e4e8", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 2 }}>📅 Review Schedule</div>
                      <div style={{ fontSize: 11, color: "#888" }}>AI timeline with hold points</div>
                    </button>
                    <button onClick={() => setDashTab("materials")} style={{ padding: "14px 16px", borderRadius: 12, background: "#fff", border: "1px solid #e2e4e8", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 2 }}>🧱 Select Materials</div>
                      <div style={{ fontSize: 11, color: "#888" }}>Cost and compliance info</div>
                    </button>
                    <button onClick={() => setDashTab("estimate")} style={{ padding: "14px 16px", borderRadius: 12, background: "#fff", border: "1px solid #e2e4e8", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 2 }}>💰 Review Estimate</div>
                      <div style={{ fontSize: 11, color: "#888" }}>CSI MasterFormat breakdown</div>
                    </button>
                  </div>
                </div>
            </>)}


            {/* CODES TAB — with reviewable items */}
            {dashTab === "codes" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs" style={{ color: "var(--fg-secondary)" }}>
                    Auto-populated for {bt?.name} in {jd?.name}. Click to mark as reviewed.
                  </p>
                  <div className="flex items-center gap-2">
                    <CompletionRing percent={codes.length > 0 ? (reviewedCodes.size / codes.length) * 100 : 0} size={32} strokeWidth={3}>
                      <span style={{ fontSize: 8, fontWeight: 600, color: "var(--accent)" }}>
                        {reviewedCodes.size}/{codes.length}
                      </span>
                    </CompletionRing>
                  </div>
                </div>
                {codes.map((c, i) => (
                  <div key={i}
                    onClick={() => {
                      const next = new Set(reviewedCodes);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      setReviewedCodes(next);
                    }}
                    className="flex items-center justify-between py-3 border-b cursor-pointer transition-all"
                    style={{
                      borderColor: "var(--border)",
                      background: reviewedCodes.has(i) ? "var(--accent-bg)" : "transparent",
                      padding: "12px 8px", borderRadius: 6, marginBottom: 2,
                    }}>
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] border"
                        style={{
                          borderColor: reviewedCodes.has(i) ? "var(--accent)" : "var(--border)",
                          background: reviewedCodes.has(i) ? "var(--accent)" : "transparent",
                          color: reviewedCodes.has(i) ? "#fff" : "var(--fg-tertiary)",
                        }}>
                        {reviewedCodes.has(i) ? "✓" : ""}
                      </span>
                      <div>
                        <div className="text-sm font-medium">{c.code}</div>
                        <div className="text-xs" style={{ color: "var(--fg-secondary)" }}>{c.title}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full capitalize font-medium"
                        style={{
                          background: c.priority === "critical" ? "#fecaca" : c.priority === "high" ? "#fef3c7" : "#d1fae5",
                          color: c.priority === "critical" ? "#991b1b" : c.priority === "high" ? "#92400e" : "#065f46",
                        }}>
                        {c.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SCHEDULE TAB — Constraint-aware with hold points */}
            {dashTab === "schedule" && schedule && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs" style={{ color: "var(--fg-secondary)" }}>
                    AI-generated schedule with constraint solver. {schedule.tasks.filter(t => t.holdPoint).length} inspection hold points identified.
                  </p>
                  <div className="text-right">
                    <div className="text-lg font-semibold"><AnimCounter value={schedule.totalWeeks} /> weeks</div>
                    <div className="text-[9px]" style={{ color: "var(--fg-tertiary)" }}>{schedule.tasks.length} tasks · {schedule.criticalPath.length} on critical path</div>
                  </div>
                </div>

                {/* Gantt-style timeline */}
                <div className="mb-4 p-3 rounded-xl overflow-x-auto" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <div className="text-[9px] font-medium mb-2 flex" style={{ color: "var(--fg-tertiary)", minWidth: 600 }}>
                    <div style={{ width: 140, flexShrink: 0 }}>Task</div>
                    <div className="flex-1 flex">
                      {Array.from({ length: Math.ceil(schedule.totalWeeks / 4) }, (_, i) => (
                        <div key={i} style={{ flex: 1, borderLeft: "1px solid var(--border)", paddingLeft: 4 }}>Month {i + 1}</div>
                      ))}
                    </div>
                  </div>
                  {schedule.tasks.map((task) => (
                    <div key={task.id} className="flex items-center mb-0.5" style={{ minWidth: 600, height: 20 }}>
                      <div className="text-[9px] truncate" style={{ width: 140, flexShrink: 0, color: task.holdPoint ? "#dc3545" : task.critical ? "var(--fg)" : "var(--fg-secondary)", fontWeight: task.critical ? 500 : 400 }}>
                        {task.holdPoint ? "⛔ " : ""}{task.name}
                      </div>
                      <div className="flex-1 relative" style={{ height: 14 }}>
                        <div
                          className="absolute top-0 rounded-sm"
                          style={{
                            left: `${(task.startWeek / schedule.totalWeeks) * 100}%`,
                            width: `${Math.max(((task.endWeek - task.startWeek) / schedule.totalWeeks) * 100, 1.5)}%`,
                            height: 14,
                            background: task.holdPoint ? "#dc354580" : task.phaseColor,
                            opacity: task.critical ? 0.9 : 0.5,
                            border: task.holdPoint ? "1px solid #dc3545" : "none",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hold points callout */}
                <div className="space-y-2">
                  {schedule.tasks.filter(t => t.holdPoint).map((task) => (
                    <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg text-[11px]"
                      style={{ background: "#dc354508", border: "1px solid #dc354530" }}>
                      <span style={{ color: "#dc3545", flexShrink: 0 }}>⛔</span>
                      <div>
                        <div className="font-medium" style={{ color: "#dc3545" }}>{task.name} — Week {task.startWeek}</div>
                        <div style={{ color: "var(--fg-secondary)" }}>{task.holdPointReason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MATERIALS TAB */}
            {dashTab === "materials" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs" style={{ color: "var(--fg-secondary)" }}>
                    Materials auto-selected for {bt?.name} at {quality} quality. Code compliance verified.
                  </p>
                  <CompletionRing percent={(materials.filter(m => m.compliance === "compliant").length / Math.max(materials.length, 1)) * 100} size={36} strokeWidth={3}>
                    <span style={{ fontSize: 8, fontWeight: 600, color: "var(--accent)" }}>
                      {materials.filter(m => m.compliance === "compliant").length}/{materials.length}
                    </span>
                  </CompletionRing>
                </div>
                {materials.map((m, i) => (
                  <div key={i} className="py-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: m.compliance === "compliant" ? "#1D9E75" : m.compliance === "review_needed" ? "#f0a500" : "var(--border)" }} />
                        <span className="text-sm font-medium">{m.name}</span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${m.sustainability === "A" ? "#1D9E75" : m.sustainability === "B" ? "#378ADD" : "#BA7517"}15`, color: m.sustainability === "A" ? "#1D9E75" : m.sustainability === "B" ? "#378ADD" : "#BA7517" }}>
                        Sustainability: {m.sustainability}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                      <div className="text-[10px]"><span style={{ color: "var(--fg-tertiary)" }}>Category:</span> {m.category}</div>
                      <div className="text-[10px]"><span style={{ color: "var(--fg-tertiary)" }}>Cost:</span> {m.costRange}</div>
                      <div className="text-[10px]"><span style={{ color: "var(--fg-tertiary)" }}>Lead time:</span> {m.leadTime}</div>
                      <div className="text-[10px]"><span style={{ color: "var(--fg-tertiary)" }}>Code:</span> {m.codeRef}</div>
                    </div>
                    <div className="text-[9px] mt-1" style={{ color: "var(--fg-tertiary)" }}>{m.spec}</div>
                  </div>
                ))}
              </div>
            )}

            {/* TEAM TAB */}
            {dashTab === "team" && (
              <div>
                <p className="text-xs mb-4" style={{ color: "var(--fg-secondary)" }}>
                  Recommended team based on {bt?.name}. Required roles are marked. Connect through the marketplace.
                </p>
                {team.map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full`} style={{ background: t.required ? "#1D9E75" : "var(--border)" }} />
                      <div>
                        <div className="text-sm font-medium">{t.role}</div>
                        <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>Phase: {t.phase}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs" style={{ color: "var(--fg-secondary)" }}>{t.typical_fee}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: t.required ? "var(--accent-bg)" : "var(--bg-tertiary)", color: t.required ? "var(--accent)" : "var(--fg-tertiary)" }}>
                        {t.required ? "Required" : "Optional"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PERMITS TAB */}
            {dashTab === "permits" && (
              <div>
                <p className="text-xs mb-4" style={{ color: "var(--fg-secondary)" }}>
                  Permits auto-identified for {bt?.name} in {jd?.name}. Timelines and fees are estimates based on jurisdiction data.
                </p>
                {permits.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full" style={{ background: p.status === "required" ? "#dc3545" : "#f0a500" }} />
                      <div>
                        <div className="text-sm font-medium">{p.type}</div>
                        <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>{p.authority}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium">{p.timeline}</div>
                      <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>{p.fee}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                        style={{
                          background: p.status === "required" ? "#fecaca" : "#fef3c7",
                          color: p.status === "required" ? "#991b1b" : "#92400e",
                        }}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ESTIMATE TAB — with animated bars */}
            {dashTab === "estimate" && (
              <div>
                <p className="text-xs mb-4" style={{ color: "var(--fg-secondary)" }}>
                  Preliminary CSI MasterFormat estimate for <AnimCounter value={sqft} /> sf {bt?.name} at {quality} quality.
                </p>
                <div className="mb-4 p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Total estimated cost</div>
                      <div className="text-3xl font-semibold" style={{ color: "var(--accent)" }}>
                        <AnimCounter value={totalCost} prefix="$" />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Cost per sf</div>
                      <div className="text-lg font-medium">
                        <AnimCounter value={Math.round(totalCost / sqft)} prefix="$" suffix="/sf" />
                      </div>
                    </div>
                  </div>
                </div>
                {estimate.map((e, i) => {
                  const maxAmt = Math.max(...estimate.map(x => x.amount));
                  const pct = (e.amount / maxAmt) * 100;
                  return (
                    <div key={i} className="py-2 border-b" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{e.division}</span>
                        <span className="text-xs font-medium"><AnimCounter value={e.amount} prefix="$" /></span>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ background: "var(--bg-tertiary)" }}>
                        <div className="h-full rounded-full" style={{ background: "var(--accent)", width: `${pct}%`, animation: "progressFill 0.8s ease" }} />
                      </div>
                      <div className="text-[10px] text-right mt-0.5" style={{ color: "var(--fg-tertiary)" }}>
                        {(e.pct * 100).toFixed(0)}% of total
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dashboard action bar */}
            <div className="mt-8 pt-6 border-t flex flex-wrap items-center justify-between gap-4" style={{ borderColor: "var(--border)" }}>
              <div className="flex gap-2">
                <button onClick={() => setStep("type")}
                  className="px-4 py-2 rounded-lg text-xs border transition-all"
                  style={{ borderColor: "var(--border)", color: "var(--fg-secondary)" }}>
                  ← Edit Project
                </button>
                <button className="px-4 py-2 rounded-lg text-xs border transition-all"
                  style={{ borderColor: "var(--border)", color: "var(--fg-secondary)" }}>
                  Export PDF
                </button>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg text-xs border transition-all"
                  style={{ borderColor: "var(--border)", color: "var(--fg-secondary)" }}>
                  Share Link
                </button>
                <button className="px-5 py-2 rounded-lg text-xs text-white font-medium transition-all hover:scale-105"
                  style={{ background: "#1D9E75" }}>
                  Save Project →
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-[10px] border-t" style={{ borderColor: "var(--border)", color: "var(--fg-tertiary)" }}>
        The Builder&apos;s Knowledge Garden · The EVERYTHING platform for the $17T global construction economy
        <br />DREAM → DESIGN → PLAN → BUILD → DELIVER → GROW
      </footer>

      {/* AI Construction Copilot */}
      <CopilotPanel
        jurisdiction={jd?.name}
        buildingType={bt?.name}
        projectContext={step === "dashboard" ? {
          building_type: bt?.name,
          jurisdiction: jd?.name,
          sqft,
          quality,
          project_name: projectName,
        } : undefined}
      />
    </div>
  );
}
