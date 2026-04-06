"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LANES } from "@/components/LaneSelector";
import CopilotPanel from "@/components/CopilotPanel";
import { useSound } from "@/lib/sound-engine";

export default function ProfilePage() {
  const [lane, setLane] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { enabled: soundEnabled, setEnabled: setSoundEnabled, play } = useSound();

  useEffect(() => {
    setMounted(true);
    setLane(localStorage.getItem("bkg-lane"));
  }, []);

  if (!mounted) return null;

  const laneData = LANES.find(l => l.id === lane);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{
        padding: "16px 24px", borderBottom: "2px solid #BA751720",
        background: "linear-gradient(135deg, #BA751708, #D85A3008)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/logo/b_transparent_512.png" alt="Builder's KG" width={36} height={36} style={{ borderRadius: 10 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>My Profile</div>
            <div style={{ fontSize: 10, color: "var(--fg-secondary)", letterSpacing: 1 }}>SETTINGS · TEAM · BILLING</div>
          </div>
        </div>
        <span style={{ fontSize: 10, color: "var(--fg-tertiary)" }}>🔒 Private & Encrypted</span>
      </header>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
        {/* Lane card */}
        {laneData ? (
          <div style={{
            padding: "20px 24px", borderRadius: 16, marginBottom: 20,
            border: `2px solid ${laneData.color}30`, background: `${laneData.color}06`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 36 }}>{laneData.icon}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{laneData.label}</div>
                <div style={{ fontSize: 12, color: laneData.color, fontWeight: 500 }}>{laneData.tagline}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-secondary)", lineHeight: 1.6, marginBottom: 12 }}>{laneData.desc}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {laneData.features.map(f => (
                <span key={f} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 8, background: `${laneData.color}15`, color: laneData.color, fontWeight: 500 }}>{f}</span>
              ))}
            </div>
            <Link href="/onboard" style={{ display: "inline-block", marginTop: 12, fontSize: 11, color: "var(--fg-tertiary)" }}>
              Change lane →
            </Link>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 32, marginBottom: 20, borderRadius: 16, border: "1px dashed var(--border, #ddd)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👤</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No lane selected yet</div>
            <Link href="/onboard" style={{
              display: "inline-block", marginTop: 8, padding: "10px 24px", borderRadius: 20,
              background: "#1D9E75", color: "#222", fontSize: 12, fontWeight: 600, textDecoration: "none",
            }}>Choose your lane →</Link>
          </div>
        )}

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Plan", value: "Explorer", sub: "Free tier", color: "#1D9E75" },
            { label: "AI Queries", value: "5/day", sub: "Upgrade for unlimited", color: "#7F77DD" },
            { label: "Projects", value: "0", sub: "Launch your first →", color: "#D85A30" },
          ].map(s => (
            <div key={s.label} style={{
              padding: "14px 12px", borderRadius: 12, border: "1px solid var(--border, #e5e5e5)", background: "var(--bg, #fff)",
            }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: 9, color: "var(--fg-tertiary)" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Sound toggle */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", borderRadius: 12, border: "1px solid var(--border, #e5e5e5)",
          marginBottom: 16, background: soundEnabled ? "rgba(29,158,117,0.04)" : "var(--bg, #fff)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{soundEnabled ? "🔊" : "🔇"}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Sound Effects</div>
              <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>Subtle audio feedback on interactions</div>
            </div>
          </div>
          <button onClick={() => { const next = !soundEnabled; setSoundEnabled(next); if (next) play("complete"); }}
            style={{
              width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
              background: soundEnabled ? "#1D9E75" : "var(--border, #ddd)", position: "relative",
              transition: "background 0.2s",
            }}>
            <div style={{
              width: 18, height: 18, borderRadius: 9, background: "#fff",
              position: "absolute", top: 3,
              left: soundEnabled ? 23 : 3,
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>

        {/* Settings sections */}
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Settings</div>
        {[
          { icon: "🔐", label: "Security", desc: "Password, 2FA, sessions, data export", href: "#" },
          { icon: "💳", label: "Billing", desc: "Subscription, payment method, invoices", href: "/billing" },
          { icon: "👥", label: "Team", desc: "Invite members, roles, permissions", href: "#" },
          { icon: "🔔", label: "Notifications", desc: "Email, push, in-app preferences", href: "#" },
          { icon: "🎨", label: "Appearance", desc: "Theme, language, display preferences", href: "#" },
          { icon: "🔌", label: "Integrations", desc: "QuickBooks, Procore, Google, Slack", href: "#" },
          { icon: "📤", label: "Data Export", desc: "Download your data (GDPR compliant)", href: "#" },
        ].map(s => (
          <div key={s.label} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
            borderRadius: 12, border: "1px solid var(--border, #e5e5e5)", marginBottom: 6,
            cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover, #f8f8f8)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = ""; }}
          >
            <span style={{ fontSize: 20 }}>{s.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>{s.desc}</div>
            </div>
            <span style={{ color: "var(--fg-tertiary)", fontSize: 14 }}>›</span>
          </div>
        ))}

        {/* Pricing upsell */}
        <div style={{
          marginTop: 20, padding: "16px 20px", borderRadius: 14, textAlign: "center",
          background: "linear-gradient(135deg, #1D9E7510, #7F77DD10)",
          border: "1px solid #1D9E7525",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Upgrade to Pro — $49/mo</div>
          <div style={{ fontSize: 11, color: "var(--fg-secondary)", marginBottom: 8 }}>Unlimited AI, 5 projects, estimating, scheduling, compliance, CRM</div>
          <button style={{
            padding: "10px 24px", borderRadius: 20, border: "none",
            background: "linear-gradient(135deg, #1D9E75, #0F6E56)",
            color: "#222", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>Upgrade Now</button>
        </div>
      </div>
      <CopilotPanel />
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LANES } from "@/components/LaneSelector";
import CopilotPanel from "@/components/CopilotPanel";
import { useSound } from "@/lib/sound-engine";

export default function ProfilePage() {
  const [lane, setLane] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { enabled: soundEnabled, setEnabled: setSoundEnabled, play } = useSound();

  useEffect(() => {
    setMounted(true);
    setLane(localStorage.getItem("bkg-lane"));
  }, []);

  if (!mounted) return null;

  const laneData = LANES.find(l => l.id === lane);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{
        padding: "16px 24px", borderBottom: "2px solid #BA751720",
        background: "linear-gradient(135deg, #BA751708, #D85A3008)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/logo/b_transparent_512.png" alt="Builder's KG" width={36} height={36} style={{ borderRadius: 10 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>My Profile</div>
            <div style={{ fontSize: 10, color: "var(--fg-secondary)", letterSpacing: 1 }}>SETTINGS · TEAM · BILLING</div>
          </div>
        </div>
        <span style={{ fontSize: 10, color: "var(--fg-tertiary)" }}>🔒 Private & Encrypted</span>
      </header>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
        {/* Lane card */}
        {laneData ? (
          <div style={{
            padding: "20px 24px", borderRadius: 16, marginBottom: 20,
            border: `2px solid ${laneData.color}30`, background: `${laneData.color}06`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 36 }}>{laneData.icon}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{laneData.label}</div>
                <div style={{ fontSize: 12, color: laneData.color, fontWeight: 500 }}>{laneData.tagline}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-secondary)", lineHeight: 1.6, marginBottom: 12 }}>{laneData.desc}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {laneData.features.map(f => (
                <span key={f} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 8, background: `${laneData.color}15`, color: laneData.color, fontWeight: 500 }}>{f}</span>
              ))}
            </div>
            <Link href="/onboard" style={{ display: "inline-block", marginTop: 12, fontSize: 11, color: "var(--fg-tertiary)" }}>
              Change lane →
            </Link>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 32, marginBottom: 20, borderRadius: 16, border: "1px dashed var(--border, #ddd)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👤</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No lane selected yet</div>
            <Link href="/onboard" style={{
              display: "inline-block", marginTop: 8, padding: "10px 24px", borderRadius: 20,
              background: "#1D9E75", color: "#222", fontSize: 12, fontWeight: 600, textDecoration: "none",
            }}>Choose your lane →</Link>
          </div>
        )}

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Plan", value: "Explorer", sub: "Free tier", color: "#1D9E75" },
            { label: "AI Queries", value: "5/day", sub: "Upgrade for unlimited", color: "#7F77DD" },
            { label: "Projects", value: "0", sub: "Launch your first →", color: "#D85A30" },
          ].map(s => (
            <div key={s.label} style={{
              padding: "14px 12px", borderRadius: 12, border: "1px solid var(--border, #e5e5e5)", background: "var(--bg, #fff)",
            }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: 9, color: "var(--fg-tertiary)" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Sound toggle */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", borderRadius: 12, border: "1px solid var(--border, #e5e5e5)",
          marginBottom: 16, background: soundEnabled ? "rgba(29,158,117,0.04)" : "var(--bg, #fff)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{soundEnabled ? "🔊" : "🔇"}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Sound Effects</div>
              <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>Subtle audio feedback on interactions</div>
            </div>
          </div>
          <button onClick={() => { const next = !soundEnabled; setSoundEnabled(next); if (next) play("complete"); }}
            style={{
              width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
              background: soundEnabled ? "#1D9E75" : "var(--border, #ddd)", position: "relative",
              transition: "background 0.2s",
            }}>
            <div style={{
              width: 18, height: 18, borderRadius: 9, background: "#fff",
              position: "absolute", top: 3,
              left: soundEnabled ? 23 : 3,
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>

        {/* Settings sections */}
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Settings</div>
        {[
          { icon: "🔐", label: "Security", desc: "Password, 2FA, sessions, data export", href: "#" },
          { icon: "💳", label: "Billing", desc: "Subscription, payment method, invoices", href: "#" },
          { icon: "👥", label: "Team", desc: "Invite members, roles, permissions", href: "#" },
          { icon: "🔔", label: "Notifications", desc: "Email, push, in-app preferences", href: "#" },
          { icon: "🎨", label: "Appearance", desc: "Theme, language, display preferences", href: "#" },
          { icon: "🔌", label: "Integrations", desc: "QuickBooks, Procore, Google, Slack", href: "#" },
          { icon: "📤", label: "Data Export", desc: "Download your data (GDPR compliant)", href: "#" },
        ].map(s => (
          <div key={s.label} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
            borderRadius: 12, border: "1px solid var(--border, #e5e5e5)", marginBottom: 6,
            cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover, #f8f8f8)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = ""; }}
          >
            <span style={{ fontSize: 20 }}>{s.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>{s.desc}</div>
            </div>
            <span style={{ color: "var(--fg-tertiary)", fontSize: 14 }}>›</span>
          </div>
        ))}

        {/* Pricing upsell */}
        <div style={{
          marginTop: 20, padding: "16px 20px", borderRadius: 14, textAlign: "center",
          background: "linear-gradient(135deg, #1D9E7510, #7F77DD10)",
          border: "1px solid #1D9E7525",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Upgrade to Pro — $49/mo</div>
          <div style={{ fontSize: 11, color: "var(--fg-secondary)", marginBottom: 8 }}>Unlimited AI, 5 projects, estimating, scheduling, compliance, CRM</div>
          <button style={{
            padding: "10px 24px", borderRadius: 20, border: "none",
            background: "linear-gradient(135deg, #1D9E75, #0F6E56)",
            color: "#222", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>Upgrade Now</button>
        </div>
      </div>
      <CopilotPanel />
    </div>
  );
}
