"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import CopilotPanel from "@/components/CopilotPanel";

const STAGES = [
  { id: "new", label: "New", color: "#94A3B8", icon: "🆕" },
  { id: "contacted", label: "Contacted", color: "#60A5FA", icon: "📞" },
  { id: "qualified", label: "Qualified", color: "#A78BFA", icon: "✅" },
  { id: "proposal", label: "Proposal", color: "#F59E0B", icon: "📄" },
  { id: "negotiation", label: "Negotiating", color: "#F97316", icon: "🤝" },
  { id: "won", label: "Won", color: "#22C55E", icon: "🏆" },
  { id: "lost", label: "Lost", color: "#EF4444", icon: "❌" },
];

const TEMPS = [
  { id: "hot", label: "Hot", color: "#EF4444", icon: "🔥" },
  { id: "warm", label: "Warm", color: "#F59E0B", icon: "☀️" },
  { id: "cool", label: "Cool", color: "#60A5FA", icon: "🌤️" },
  { id: "cold", label: "Cold", color: "#94A3B8", icon: "❄️" },
];

interface Contact {
  id: string; first_name: string; last_name?: string; company?: string;
  email?: string; phone?: string; contact_type: string; stage: string;
  temperature: string; project_type?: string; project_location?: string;
  estimated_value?: number; lead_score: number; notes?: string;
  tags: string[]; created_at: string; updated_at: string;
  last_contact_at?: string; next_followup?: string; activity_count?: number;
}

interface PipelineStats {
  pipeline: Record<string, { count: number; value: number }>;
  totals: { contacts: number; total_value: number; avg_score: number; hot: number; needs_followup: number };
}

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch data
  useEffect(() => {
    Promise.all([
      fetch("/api/v1/crm").then(r => r.json()),
      fetch("/api/v1/crm?stats=1").then(r => r.json()),
    ]).then(([contactData, statsData]) => {
      setContacts(contactData.contacts || []);
      setStats(statsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = contacts.filter(c => {
    if (filter !== "all" && c.stage !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.first_name.toLowerCase().includes(q) ||
        (c.last_name || "").toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Killer App Header — warm/red chrome */}
      <header style={{
        padding: "16px 24px", borderBottom: "2px solid #E8443A20",
        background: "linear-gradient(135deg, #E8443A08, #D85A3008)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/logo/b_transparent_512.png" alt="Builder's KG" width={36} height={36} style={{ borderRadius: 10 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>AEC CRM</div>
            <div style={{ fontSize: 10, color: "var(--fg-secondary)", letterSpacing: 1 }}>KILLER APP · PIPELINE</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "var(--fg-tertiary)" }}>🔒 Private & Encrypted</span>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px" }}>
        {/* Pipeline Stats Bar */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Total Pipeline", value: formatCurrency(stats.totals.total_value), sub: `${stats.totals.contacts} contacts`, color: "#E8443A" },
              { label: "Avg Lead Score", value: `${stats.totals.avg_score}`, sub: "out of 100", color: "#7F77DD" },
              { label: "Hot Leads", value: `${stats.totals.hot}`, sub: "need attention", color: "#EF4444" },
              { label: "Follow-ups Due", value: `${stats.totals.needs_followup}`, sub: "overdue", color: "#F59E0B" },
              { label: "Won This Month", value: formatCurrency(stats.pipeline.won?.value || 0), sub: `${stats.pipeline.won?.count || 0} deals`, color: "#22C55E" },
            ].map((s, i) => (
              <div key={i} style={{
                padding: "14px 12px", borderRadius: 12,
                border: "1px solid var(--border, #e5e5e5)",
                background: "var(--bg, #fff)",
              }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                <div style={{ fontSize: 9, color: "var(--fg-tertiary)" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Pipeline Kanban Bar */}
        {stats && (
          <div style={{ display: "flex", gap: 3, marginBottom: 16, borderRadius: 10, overflow: "hidden" }}>
            {STAGES.map(s => {
              const data = stats.pipeline[s.id];
              const total = stats.totals.contacts || 1;
              const pct = ((data?.count || 0) / total) * 100;
              return (
                <button key={s.id} onClick={() => setFilter(filter === s.id ? "all" : s.id)}
                  style={{
                    flex: Math.max(pct, 8), padding: "8px 6px", border: "none", cursor: "pointer",
                    background: filter === s.id ? s.color : `${s.color}30`,
                    color: filter === s.id ? "#fff" : s.color,
                    fontSize: 9, fontWeight: 600, textAlign: "center",
                    transition: "all 0.2s", borderRadius: 4,
                  }}>
                  {s.icon} {data?.count || 0}
                </button>
              );
            })}
          </div>
        )}

        {/* Search + Filter row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <input
            ref={searchRef} type="text" placeholder="Search contacts..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 10,
              border: "1px solid var(--border, #e5e5e5)", background: "var(--bg, #fff)",
              fontSize: 13, color: "var(--fg)", outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 4 }}>
            {TEMPS.map(t => (
              <button key={t.id} onClick={() => setFilter(filter === t.id ? "all" : t.id)}
                style={{
                  padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: filter === t.id ? t.color : "var(--bg-hover, #f5f5f5)",
                  color: filter === t.id ? "#fff" : "var(--fg-secondary)",
                  fontSize: 10, fontWeight: 500, transition: "all 0.15s",
                }}>{t.icon}</button>
            ))}
          </div>
        </div>

        {/* Contact List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--fg-tertiary)" }}>Loading pipeline...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--fg-tertiary)" }}>No contacts match your filter</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(c => {
              const stage = STAGES.find(s => s.id === c.stage);
              const temp = TEMPS.find(t => t.id === c.temperature);
              const isSelected = selectedContact?.id === c.id;
              return (
                <button key={c.id} onClick={() => setSelectedContact(isSelected ? null : c)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 16px", borderRadius: 14, cursor: "pointer",
                    border: isSelected ? "2px solid #E8443A" : "1px solid var(--border, #e5e5e5)",
                    background: isSelected ? "#E8443A08" : "var(--bg, #fff)",
                    textAlign: "left", color: "inherit", width: "100%",
                    transition: "all 0.15s",
                  }}>
                  {/* Score ring */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 22, flexShrink: 0,
                    background: `conic-gradient(${stage?.color || "#888"} ${c.lead_score * 3.6}deg, var(--border, #e5e5e5) 0deg)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 17, background: "var(--bg, #fff)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: stage?.color,
                    }}>{c.lead_score}</div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{c.first_name} {c.last_name}</span>
                      <span style={{ fontSize: 12 }}>{temp?.icon}</span>
                      {c.company && <span style={{ fontSize: 11, color: "var(--fg-secondary)" }}>· {c.company}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--fg-secondary)", marginTop: 2 }}>
                      {c.project_type && <span>{c.project_type} · </span>}
                      {c.project_location && <span>{c.project_location} · </span>}
                      {c.estimated_value ? formatCurrency(c.estimated_value) : ""}
                    </div>
                  </div>

                  {/* Stage + timing */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 8,
                      background: `${stage?.color}18`, color: stage?.color,
                    }}>{stage?.icon} {stage?.label}</div>
                    {c.last_contact_at && (
                      <div style={{ fontSize: 9, color: "var(--fg-tertiary)", marginTop: 4 }}>
                        {timeAgo(c.last_contact_at)}
                      </div>
                    )}
                    {c.next_followup && new Date(c.next_followup) <= new Date() && (
                      <div style={{ fontSize: 9, color: "#EF4444", fontWeight: 600, marginTop: 2 }}>
                        ⚠️ Follow-up due
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Detail Panel */}
        {selectedContact && (
          <div style={{
            marginTop: 16, padding: 20, borderRadius: 16,
            border: "2px solid #E8443A30", background: "#E8443A04",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {selectedContact.first_name} {selectedContact.last_name}
                </div>
                {selectedContact.company && <div style={{ fontSize: 13, color: "var(--fg-secondary)" }}>{selectedContact.company}</div>}
              </div>
              <button onClick={() => setSelectedContact(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--fg-tertiary)" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              {selectedContact.email && <div style={{ fontSize: 11 }}>📧 {selectedContact.email}</div>}
              {selectedContact.phone && <div style={{ fontSize: 11 }}>📱 {selectedContact.phone}</div>}
              {selectedContact.estimated_value && <div style={{ fontSize: 11 }}>💰 {formatCurrency(selectedContact.estimated_value)}</div>}
            </div>

            {selectedContact.notes && (
              <div style={{ fontSize: 12, color: "var(--fg-secondary)", lineHeight: 1.6, marginBottom: 12,
                padding: 12, borderRadius: 10, background: "var(--bg, #fff)", border: "1px solid var(--border, #e5e5e5)" }}>
                {selectedContact.notes}
              </div>
            )}

            {selectedContact.tags.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {selectedContact.tags.map(t => (
                  <span key={t} style={{
                    fontSize: 10, padding: "3px 8px", borderRadius: 8,
                    background: "#E8443A12", color: "#E8443A", fontWeight: 500,
                  }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CopilotPanel />
    </div>
  );
}
