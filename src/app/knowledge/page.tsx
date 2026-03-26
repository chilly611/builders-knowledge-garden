"use client";

import { useState, useEffect } from "react";
import CopilotPanel from "@/components/CopilotPanel";

const ENTITY_TYPES = [
  { id: "all", label: "All", icon: "🌿", color: "#1D9E75" },
  { id: "building_code", label: "Codes", icon: "📋", color: "#D85A30" },
  { id: "material", label: "Materials", icon: "🧱", color: "#378ADD" },
  { id: "architectural_style", label: "Styles", icon: "🏛️", color: "#7F77DD" },
  { id: "safety_regulation", label: "Safety", icon: "⛑️", color: "#EF4444" },
  { id: "trade", label: "Trades", icon: "👷", color: "#BA7517" },
  { id: "method", label: "Methods", icon: "🔧", color: "#639922" },
  { id: "standard", label: "Standards", icon: "📐", color: "#EC4899" },
  { id: "sequence_rule", label: "Sequences", icon: "🔗", color: "#8B5CF6" },
  { id: "permit_requirement", label: "Permits", icon: "📄", color: "#06B6D4" },
  { id: "building_type", label: "Building Types", icon: "🏗️", color: "#F59E0B" },
  { id: "inspection_protocol", label: "Inspections", icon: "🔍", color: "#10B981" },
  { id: "climate_zone", label: "Climate", icon: "🌡️", color: "#0EA5E9" },
];

interface Entity {
  id: string; slug: string; title: string; summary: string;
  entity_type: string; domain: string; tags: string[];
  category?: string; metadata?: Record<string, unknown>;
}

export default function KnowledgePage() {
  const [allEntities, setAllEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Fetch all published entities on mount via Supabase
  useEffect(() => {
    async function load() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) { setLoading(false); return; }
        const res = await fetch(
          `${url}/rest/v1/knowledge_entities?select=id,slug,title,summary,entity_type,domain,tags,category,metadata&status=eq.published&order=entity_type.asc,title->>en.asc&limit=300`,
          { headers: { apikey: key, Authorization: `Bearer ${key}` } }
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setAllEntities(data.map((e: Record<string, unknown>) => ({
            ...e,
            title: typeof e.title === "object" ? (e.title as Record<string,string>).en || "" : e.title,
            summary: typeof e.summary === "object" ? (e.summary as Record<string,string>).en || "" : e.summary,
          })) as Entity[]);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  // Client-side filter
  const filtered = allEntities.filter(e => {
    if (activeType !== "all" && e.entity_type !== activeType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (e.title || "").toLowerCase().includes(q) ||
        (e.summary || "").toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  // Counts per type
  const counts: Record<string, number> = { all: allEntities.length };
  for (const e of allEntities) { counts[e.entity_type] = (counts[e.entity_type] || 0) + 1; }

  const getTypeInfo = (type: string) => ENTITY_TYPES.find(t => t.id === type) || ENTITY_TYPES[0];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Garden Header — green chrome */}
      <header style={{
        padding: "16px 24px", borderBottom: "2px solid #1D9E7520",
        background: "linear-gradient(135deg, #1D9E7508, #0F6E5608)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #1D9E75, #0F6E56)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 18,
          }}>🌿</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Knowledge Garden</div>
            <div style={{ fontSize: 10, color: "var(--fg-secondary)", letterSpacing: 1 }}>
              {allEntities.length} ENTITIES · {Object.keys(counts).length - 1} TYPES
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px" }}>
        {/* Search */}
        <input
          type="text" placeholder="Search codes, materials, methods, safety..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 12,
            border: "1px solid var(--border, #e5e5e5)", background: "var(--bg, #fff)",
            fontSize: 14, color: "var(--fg)", outline: "none",
            marginBottom: 14,
          }}
        />

        {/* Type filter chips */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 20 }}>
          {ENTITY_TYPES.map(t => {
            const c = counts[t.id] || 0;
            const isActive = activeType === t.id;
            return (
              <button key={t.id} onClick={() => setActiveType(t.id)}
                style={{
                  padding: "6px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                  background: isActive ? t.color : "var(--bg-hover, #f0f0f0)",
                  color: isActive ? "#fff" : "var(--fg-secondary, #666)",
                  fontSize: 11, fontWeight: 600, transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                <span>{t.icon}</span> {t.label}
                <span style={{
                  fontSize: 9, padding: "1px 5px", borderRadius: 8,
                  background: isActive ? "rgba(255,255,255,0.25)" : "var(--border, #ddd)",
                }}>{c}</span>
              </button>
            );
          })}
        </div>

        {/* Entity Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--fg-tertiary)" }}>
            Loading knowledge garden...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--fg-tertiary)" }}>
            {search ? `No entities match "${search}"` : "No entities found"}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {filtered.map(entity => {
              const typeInfo = getTypeInfo(entity.entity_type);
              const isExpanded = expanded === entity.id;
              return (
                <div key={entity.id}
                  onClick={() => setExpanded(isExpanded ? null : entity.id)}
                  style={{
                    padding: "14px 16px", borderRadius: 14, cursor: "pointer",
                    border: isExpanded ? `2px solid ${typeInfo.color}` : "1px solid var(--border, #e5e5e5)",
                    background: isExpanded ? `${typeInfo.color}06` : "var(--bg, #fff)",
                    transition: "all 0.2s",
                  }}>
                  {/* Type badge + title */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 9, padding: "2px 8px", borderRadius: 8,
                      background: `${typeInfo.color}15`, color: typeInfo.color, fontWeight: 600,
                    }}>{typeInfo.icon} {typeInfo.label}</span>
                    {entity.category && (
                      <span style={{ fontSize: 9, color: "var(--fg-tertiary)" }}>· {entity.category}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>
                    {entity.title}
                  </div>
                  <div style={{
                    fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.5,
                    display: "-webkit-box", WebkitLineClamp: isExpanded ? 99 : 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {entity.summary}
                  </div>

                  {/* Tags */}
                  {entity.tags && entity.tags.length > 0 && (
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 6 }}>
                      {entity.tags.slice(0, isExpanded ? 20 : 4).map(tag => (
                        <span key={tag} style={{
                          fontSize: 9, padding: "2px 6px", borderRadius: 6,
                          background: "var(--bg-hover, #f0f0f0)", color: "var(--fg-tertiary)",
                        }}>{tag}</span>
                      ))}
                      {!isExpanded && entity.tags.length > 4 && (
                        <span style={{ fontSize: 9, color: "var(--fg-tertiary)" }}>+{entity.tags.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Expanded: metadata highlights */}
                  {isExpanded && entity.metadata && Object.keys(entity.metadata).length > 0 && (
                    <div style={{
                      marginTop: 10, padding: 10, borderRadius: 8,
                      background: "var(--bg, #fff)", border: "1px solid var(--border, #e5e5e5)",
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: typeInfo.color, marginBottom: 4 }}>Details</div>
                      {Object.entries(entity.metadata).slice(0, 8).map(([key, val]) => (
                        <div key={key} style={{ fontSize: 10, display: "flex", gap: 6, padding: "2px 0" }}>
                          <span style={{ color: "var(--fg-tertiary)", minWidth: 100 }}>{key.replace(/_/g, " ")}</span>
                          <span style={{ color: "var(--fg-secondary)" }}>
                            {typeof val === "object" ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Results count */}
        {!loading && (
          <div style={{ textAlign: "center", padding: "16px 0", fontSize: 11, color: "var(--fg-tertiary)" }}>
            Showing {filtered.length} of {allEntities.length} entities
            {search && ` matching "${search}"`}
            {activeType !== "all" && ` in ${getTypeInfo(activeType).label}`}
          </div>
        )}
      </div>

      <CopilotPanel />
    </div>
  );
}
