import { useState, useEffect } from "react";

/* ─── DATA ─── */
const LANES = [
  { id: "diy", label: "The Dreamer", sub: "DIY Homeowner", emoji: "🏠", color: "#D85A30", defaultSurface: "dream",
    briefing: "Good morning, Sarah! Your dream home is 62% designed. Today's challenge: pick your kitchen material. Here are 3 options the AI thinks you'll love based on your Oracle profile. Fun fact: the marble you liked yesterday was quarried in Carrara, Italy — the same quarry Michelangelo used.",
    quests: ["Pick 1 kitchen material (50 XP)", "Read about your climate zone (30 XP)", "Share your dream with a friend (100 XP)"],
    stats: { xp: 2340, level: 7, streak: 7, badge: "Oracle Initiate" } },
  { id: "gc", label: "The Builder", sub: "General Contractor", emoji: "🏗️", color: "#E8443A", defaultSurface: "killer",
    briefing: "Monday morning, 5 projects, zero fires. Almost. Steel delivery for Oceanview is 2 days late — I've found 2 alternatives. Permit for Downtown expires Thursday. Rain Wednesday means we should move the Hillside pour to Friday. Revenue is up 5% this month.",
    quests: ["Review 2 attention items (50 XP)", "Update Oceanview progress (75 XP)", "Send overdue invoice (100 XP)"],
    stats: { xp: 12800, level: 18, streak: 23, badge: "Budget Ninja" } },
  { id: "specialty", label: "The Specialist", sub: "Specialty Contractor", emoji: "⚡", color: "#7F77DD", defaultSurface: "killer",
    briefing: "Morning, sparky! NEC 2026 update dropped yesterday — 3 changes affect your current projects. I've flagged them. Also, 2 new RFQs matching your service area. Your OSHA 30 renewal is in 45 days — I found a class next Tuesday.",
    quests: ["Review NEC update (100 XP)", "Respond to 1 RFQ (75 XP)", "Log safety observation (50 XP)"],
    stats: { xp: 5600, level: 12, streak: 4, badge: "Code Whisperer" } },
  { id: "supplier", label: "The Merchant", sub: "Supplier / Vendor", emoji: "🏪", color: "#378ADD", defaultSurface: "killer",
    briefing: "Good news, Acme Lumber! 3 projects in your area just entered BUILD phase. Combined lumber estimate: $180K. Softwood prices are up 4% this week, and 2 contractors asked for quotes on CLT panels.",
    quests: ["Review 3 new project leads (75 XP)", "Update catalog pricing (50 XP)", "Respond to CLT quote (100 XP)"],
    stats: { xp: 3200, level: 9, streak: 11, badge: "Market Maven" } },
  { id: "equipment", label: "The Fleet", sub: "Equipment Provider", emoji: "🚜", color: "#BA7517", defaultSurface: "killer",
    briefing: "Fleet status: 14 of 18 units deployed. Excavator #7 is due for service. 2 new rental requests in your area — one needs a 30-ton crane for Thursday.",
    quests: ["Schedule unit #7 service (50 XP)", "Respond to crane request (100 XP)", "Check utilization report (30 XP)"],
    stats: { xp: 1800, level: 5, streak: 2, badge: "Iron Horse" } },
  { id: "service", label: "The Ally", sub: "Service Provider", emoji: "📐", color: "#1D9E75", defaultSurface: "knowledge",
    briefing: "Good morning! 2 new projects in your area are looking for architects. Your portfolio has been viewed 8 times this week. Also, the AIA released new contract templates yesterday — I've compared them to your current ones.",
    quests: ["Review portfolio analytics (30 XP)", "Update availability calendar (50 XP)", "Review AIA templates (75 XP)"],
    stats: { xp: 4100, level: 10, streak: 8, badge: "Trusted Advisor" } },
  { id: "worker", label: "The Crew", sub: "Field Worker", emoji: "🦺", color: "#F59E0B", defaultSurface: "killer",
    briefing: "Good morning, crew. Today's safety briefing: we're pouring footings. Key hazards: wet concrete, rebar trip points, heavy equipment. Weather: clear until 3pm. Your tasks are loaded.",
    quests: ["Complete safety check-in (50 XP)", "Log morning progress (75 XP)", "Submit material receipt (30 XP)"],
    stats: { xp: 900, level: 3, streak: 15, badge: "Safety First" } },
  { id: "robot", label: "The Machine", sub: "Robotics & AI", emoji: "🤖", color: "#6366F1", defaultSurface: "knowledge",
    briefing: "System status: All autonomous units operational. 3 API calls queued. Telemetry ingestion rate: 2.4K events/min. Next scheduled task: structural scan of Grid B4 at 14:00.",
    quests: ["Process telemetry batch (auto)", "Run compliance check (auto)", "Upload progress scan (auto)"],
    stats: { xp: 0, level: 0, streak: 0, badge: "API Connected" } },
];

const SURFACES = [
  { id: "dream", label: "Dream Machine", emoji: "✨", color: "#D85A30", bg: "#1a0f0a",
    features: ["The Oracle", "The Alchemist", "Describe Your Dream", "Browse & Discover", "Sketch It Out", "Surprise Me", "Dream Garden", "The Cosmos"] },
  { id: "knowledge", label: "Knowledge Garden", emoji: "🌿", color: "#1D9E75", bg: "#0a1a12",
    features: ["Building Codes", "Materials Library", "Methods & Techniques", "Safety Standards", "Cost Data", "Sustainability", "Trade Skills", "Code Compare"] },
  { id: "killer", label: "Killer App", emoji: "⚡", color: "#E8443A", bg: "#1a0a0a",
    features: ["Command Center", "Project Launcher", "Smart Alerts", "Budget Heartbeat", "Risk Radar", "Team Orchestrator", "Finance Navigator", "Contract Companion"] },
];

const PHASES = [
  { id: "dream", label: "DREAM", color: "#D85A30", desc: "Imagine what you want to build" },
  { id: "design", label: "DESIGN", color: "#7F77DD", desc: "Shape the vision into plans" },
  { id: "plan", label: "PLAN", color: "#1D9E75", desc: "Estimate, schedule, permit" },
  { id: "build", label: "BUILD", color: "#378ADD", desc: "Execute with precision" },
  { id: "deliver", label: "DELIVER", color: "#BA7517", desc: "Complete and hand off" },
  { id: "grow", label: "GROW", color: "#639922", desc: "Manage, maintain, expand" },
];

const NOTIFICATIONS = [
  { level: "celebrate", emoji: "🎉", color: "#22C55E", title: "Payment received!", body: "$68K cleared. Your cash flow just got healthier.", sound: "fanfare" },
  { level: "good", emoji: "✅", color: "#1D9E75", title: "Inspection passed", body: "Electrical rough-in signed off. On to drywall.", sound: "chime" },
  { level: "heads-up", emoji: "🌧️", color: "#F59E0B", title: "Weather alert", body: "Rain Thursday. 2 projects affected. Schedule adjustments drafted.", sound: "soft-tone" },
  { level: "needs-you", emoji: "🔴", color: "#EF4444", title: "Steel delivery delayed", body: "3 options ready. None are great but one saves $2K.", sound: "alert" },
];

/* ─── COMPONENT ─── */
export default function NavigationPrototype() {
  const [selectedLane, setSelectedLane] = useState(null);
  const [activeSurface, setActiveSurface] = useState(null);
  const [activePhase, setActivePhase] = useState(0);
  const [showBriefing, setShowBriefing] = useState(false);
  const [showNotification, setShowNotification] = useState(null);
  const [view, setView] = useState("lanes"); // lanes | experience | surfaces | notifications

  const lane = LANES.find(l => l.id === selectedLane);
  const surface = SURFACES.find(s => s.id === activeSurface);

  useEffect(() => {
    if (selectedLane) {
      const l = LANES.find(l2 => l2.id === selectedLane);
      setActiveSurface(l?.defaultSurface || "dream");
      setShowBriefing(true);
      const timer = setTimeout(() => setShowBriefing(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [selectedLane]);

  useEffect(() => {
    const interval = setInterval(() => setActivePhase(p => (p + 1) % 6), 3000);
    return () => clearInterval(interval);
  }, []);

  const baseStyle = {
    minHeight: "100vh",
    background: surface ? surface.bg : "#0a0a0a",
    color: "#fff",
    fontFamily: "'Archivo', 'Helvetica Neue', sans-serif",
    transition: "background 0.6s ease",
    overflow: "hidden",
  };

  return (
    <div style={baseStyle}>
      {/* Header */}
      <header style={{
        padding: "16px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: surface?.color || "#1D9E75" }}>
            Builder's Knowledge Garden
          </h1>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "2px 0 0" }}>
            Navigation & Delight System Prototype
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["lanes", "experience", "surfaces", "notifications"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? "rgba(255,255,255,0.1)" : "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "6px 12px", fontSize: "11px",
              color: view === v ? "#fff" : "rgba(255,255,255,0.5)",
              cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
            }}>{v}</button>
          ))}
        </div>
      </header>

      {/* ─── LANE SELECTOR VIEW ─── */}
      {view === "lanes" && (
        <div style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 4px", color: "#fff" }}>
            Who Are You?
          </h2>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: "0 0 20px" }}>
            Select a lane to see how the platform adapts to each user type
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {LANES.map(l => (
              <button key={l.id} onClick={() => { setSelectedLane(l.id); setView("experience"); }}
                style={{
                  background: selectedLane === l.id ? `${l.color}20` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${selectedLane === l.id ? `${l.color}80` : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 14, padding: "18px 14px", cursor: "pointer",
                  fontFamily: "inherit", textAlign: "center", transition: "all 0.2s ease",
                }}>
                <span style={{ fontSize: "32px", display: "block", marginBottom: 8 }}>{l.emoji}</span>
                <p style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: l.color }}>{l.label}</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>{l.sub}</p>
              </button>
            ))}
          </div>

          {/* Phase cycle */}
          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px", color: "rgba(255,255,255,0.6)" }}>
              The 6 Lifecycle Phases
            </h3>
            <div style={{ display: "flex", gap: 8 }}>
              {PHASES.map((p, i) => (
                <div key={p.id} style={{
                  flex: 1, padding: "12px 10px", borderRadius: 10, textAlign: "center",
                  background: activePhase === i ? `${p.color}20` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${activePhase === i ? p.color : "rgba(255,255,255,0.06)"}`,
                  transition: "all 0.4s ease",
                }}>
                  <p style={{ fontSize: "12px", fontWeight: 800, margin: 0, color: p.color }}>{p.label}</p>
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── EXPERIENCE VIEW (Morning Briefing) ─── */}
      {view === "experience" && lane && (
        <div style={{ padding: "24px" }}>
          {/* Lane header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: `${lane.color}20`, border: `2px solid ${lane.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "28px",
            }}>{lane.emoji}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: lane.color }}>{lane.label}</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: "2px 0 0" }}>{lane.sub}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "#C4A44A" }}>{lane.stats.xp.toLocaleString()} XP</p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "2px 0 0" }}>
                Level {lane.stats.level} · {lane.stats.streak} day streak 🔥
              </p>
            </div>
          </div>

          {/* Morning briefing */}
          <div style={{
            background: `linear-gradient(135deg, ${lane.color}15, rgba(255,255,255,0.02))`,
            border: `1px solid ${lane.color}30`,
            borderRadius: 16, padding: "20px", marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: "14px" }}>☀️</span>
              <p style={{ fontSize: "13px", fontWeight: 700, margin: 0, color: lane.color }}>Morning Briefing</p>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>AI-generated · just now</span>
            </div>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", lineHeight: 1.7, margin: 0 }}>
              {lane.briefing}
            </p>
          </div>

          {/* Daily quests */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 10px", color: "rgba(255,255,255,0.6)" }}>
              Today's Quests
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {lane.quests.map((q, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "10px", color: "rgba(255,255,255,0.3)",
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", flex: 1 }}>{q}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Surface switcher */}
          <h3 style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 10px", color: "rgba(255,255,255,0.6)" }}>
            Navigate to
          </h3>
          <div style={{ display: "flex", gap: 10 }}>
            {SURFACES.map(s => (
              <button key={s.id} onClick={() => { setActiveSurface(s.id); setView("surfaces"); }}
                style={{
                  flex: 1, background: activeSurface === s.id ? `${s.color}15` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${activeSurface === s.id ? s.color : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 12, padding: "14px", cursor: "pointer", fontFamily: "inherit",
                  textAlign: "center", transition: "all 0.2s ease",
                }}>
                <span style={{ fontSize: "22px", display: "block", marginBottom: 4 }}>{s.emoji}</span>
                <p style={{ fontSize: "12px", fontWeight: 700, margin: 0, color: s.color }}>{s.label}</p>
              </button>
            ))}
          </div>

          {/* Back to lanes */}
          <button onClick={() => setView("lanes")} style={{
            marginTop: 20, background: "none", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "8px 16px", fontSize: "12px",
            color: "rgba(255,255,255,0.4)", cursor: "pointer", fontFamily: "inherit",
          }}>← Switch Lane</button>
        </div>
      )}

      {/* ─── SURFACE VIEW ─── */}
      {view === "surfaces" && (
        <div style={{ padding: "24px" }}>
          {/* Surface tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {SURFACES.map(s => (
              <button key={s.id} onClick={() => setActiveSurface(s.id)} style={{
                background: "none", border: "none",
                borderBottom: activeSurface === s.id ? `2px solid ${s.color}` : "2px solid transparent",
                color: activeSurface === s.id ? s.color : "rgba(255,255,255,0.4)",
                padding: "10px 20px", fontSize: "13px", fontWeight: activeSurface === s.id ? 700 : 500,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>

          {surface && (
            <>
              <h2 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 4px", color: surface.color }}>
                {surface.emoji} {surface.label}
              </h2>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: "0 0 20px" }}>
                {lane ? `Personalized for ${lane.label} (${lane.sub})` : "Select a lane to see personalization"}
              </p>

              {/* Feature grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {surface.features.map((f, i) => (
                  <div key={f} style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${i === 0 && lane ? `${surface.color}40` : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 12, padding: "16px",
                    position: "relative", overflow: "hidden",
                  }}>
                    {i === 0 && lane && (
                      <span style={{
                        position: "absolute", top: 8, right: 8,
                        background: `${surface.color}30`, color: surface.color,
                        fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                      }}>RECOMMENDED</span>
                    )}
                    <p style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "#fff" }}>{f}</p>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>
                      {activeSurface === "dream" ? "Dream → Design" :
                       activeSurface === "knowledge" ? "Learn → Apply" : "Manage → Optimize"}
                    </p>
                  </div>
                ))}
              </div>

              {/* Cross-surface bridges */}
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: "12px", fontWeight: 700, margin: "0 0 10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Bridges to other surfaces
                </h3>
                <div style={{ display: "flex", gap: 8 }}>
                  {SURFACES.filter(s2 => s2.id !== activeSurface).map(s2 => (
                    <button key={s2.id} onClick={() => setActiveSurface(s2.id)} style={{
                      flex: 1, background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 10, padding: "10px", cursor: "pointer", fontFamily: "inherit",
                      textAlign: "center",
                    }}>
                      <span style={{ fontSize: "16px" }}>{s2.emoji}</span>
                      <p style={{ fontSize: "11px", color: s2.color, margin: "4px 0 0", fontWeight: 600 }}>
                        {activeSurface === "dream" && s2.id === "killer" ? "Make this real →" :
                         activeSurface === "dream" && s2.id === "knowledge" ? "Learn more →" :
                         activeSurface === "knowledge" && s2.id === "dream" ? "Use in my dream →" :
                         activeSurface === "knowledge" && s2.id === "killer" ? "Apply to project →" :
                         activeSurface === "killer" && s2.id === "dream" ? "Dream bigger →" :
                         "What does the code say? →"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <button onClick={() => setView(lane ? "experience" : "lanes")} style={{
            marginTop: 20, background: "none", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "8px 16px", fontSize: "12px",
            color: "rgba(255,255,255,0.4)", cursor: "pointer", fontFamily: "inherit",
          }}>← Back</button>
        </div>
      )}

      {/* ─── NOTIFICATIONS VIEW ─── */}
      {view === "notifications" && (
        <div style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 4px", color: "#fff" }}>
            The Notification Orchestra
          </h2>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: "0 0 20px" }}>
            Every notification has a personality. Click to see the full experience.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {NOTIFICATIONS.map((n, i) => (
              <button key={i} onClick={() => setShowNotification(showNotification === i ? null : i)}
                style={{
                  background: showNotification === i ? `${n.color}10` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${showNotification === i ? `${n.color}40` : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 14, padding: "16px 18px", cursor: "pointer",
                  fontFamily: "inherit", textAlign: "left", transition: "all 0.3s ease",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: "24px" }}>{n.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: n.color }}>{n.title}</p>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", margin: "4px 0 0" }}>{n.body}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      fontSize: "10px", background: `${n.color}20`, color: n.color,
                      padding: "3px 8px", borderRadius: 6, fontWeight: 600,
                    }}>{n.level}</span>
                  </div>
                </div>
                {showNotification === i && (
                  <div style={{
                    marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)",
                    display: "flex", gap: 12, alignItems: "center",
                  }}>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                      Sound: {n.sound}
                    </span>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                      Visual: {n.level === "celebrate" ? "Gold burst + confetti" :
                               n.level === "good" ? "Green glow pulse" :
                               n.level === "heads-up" ? "Amber badge pulse" :
                               "Red attention animation"}
                    </span>
                    <span style={{ fontSize: "11px", color: n.color, fontWeight: 600, marginLeft: "auto" }}>
                      {n.level === "needs-you" ? "Solution attached ✓" : "No action needed"}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Design principle callout */}
          <div style={{
            marginTop: 24, background: "rgba(196,164,74,0.06)",
            border: "1px solid rgba(196,164,74,0.2)",
            borderRadius: 14, padding: "16px 18px",
          }}>
            <p style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 6px", color: "#C4A44A" }}>
              Design Principle
            </p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0 }}>
              Even bad news is delivered with solutions attached. The user never opens a notification
              and feels helpless. The AI has always done work before surfacing the problem.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
