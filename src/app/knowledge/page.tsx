"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import CopilotPanel from "@/components/CopilotPanel";
import { getImageForEntity } from "@/lib/image-service";

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

const SORT_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "alpha", label: "A → Z" },
  { id: "type", label: "By Type" },
  { id: "recent", label: "Recent" },
];

interface Entity {
  id: string; slug: string; title: string; summary: string;
  entity_type: string; domain: string; tags: string[];
  category?: string; metadata?: Record<string, unknown>;
  updated_at?: string;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function KnowledgePageWrapper() {
  return <Suspense fallback={<div style={{ padding: 60, textAlign: "center" }}>Loading knowledge garden...</div>}><KnowledgePageInner /></Suspense>;
}

function KnowledgePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const initialType = searchParams.get("type") || "all";
  const initialJurisdiction = searchParams.get("jurisdiction") || "all";

  const [allEntities, setAllEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialQuery);
  const [activeType, setActiveType] = useState(initialType);
  const [activeJurisdiction, setActiveJurisdiction] = useState(initialJurisdiction);
  const [sortBy, setSortBy] = useState(initialQuery ? "relevance" : "alpha");
  const [expanded, setExpanded] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Fetch all published entities on mount
  useEffect(() => {
    async function load() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) { setLoading(false); return; }
        const res = await fetch(
          `${url}/rest/v1/knowledge_entities?select=id,slug,title,summary,entity_type,domain,tags,category,metadata,updated_at&status=eq.published&order=entity_type.asc,title->>en.asc&limit=500`,
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
      } catch { /* silently fail */ }
      setLoading(false);
    }
    load();
  }, []);

  // Extract unique jurisdictions from entities
  const jurisdictions = useMemo(() => {
    const domainCounts: Record<string, number> = {};
    for (const e of allEntities) {
      if (e.domain) {
        domainCounts[e.domain] = (domainCounts[e.domain] || 0) + 1;
      }
    }
    return Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([domain, count]) => ({ id: domain, label: domain.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()), count }));
  }, [allEntities]);

  // Sync filters to URL (without full page reload)
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (activeType !== "all") params.set("type", activeType);
    if (activeJurisdiction !== "all") params.set("jurisdiction", activeJurisdiction);
    const qs = params.toString();
    const newUrl = qs ? `/knowledge?${qs}` : "/knowledge";
    router.replace(newUrl, { scroll: false });
  }, [debouncedSearch, activeType, activeJurisdiction, router]);

  // Search scoring function for relevance sort
  const scoreEntity = useCallback((entity: Entity, query: string): number => {
    if (!query) return 0;
    const q = query.toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    let score = 0;
    for (const w of words) {
      if ((entity.title || "").toLowerCase().includes(w)) score += 3;
      if ((entity.tags || []).some(t => t.toLowerCase().includes(w))) score += 2;
      if ((entity.summary || "").toLowerCase().includes(w)) score += 1;
      if ((entity.category || "").toLowerCase().includes(w)) score += 1;
    }
    return score;
  }, []);

  // Client-side filter + sort
  const filtered = useMemo(() => {
    let results = allEntities.filter(e => {
      if (activeType !== "all" && e.entity_type !== activeType) return false;
      if (activeJurisdiction !== "all" && e.domain !== activeJurisdiction) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        return (e.title || "").toLowerCase().includes(q) ||
          (e.summary || "").toLowerCase().includes(q) ||
          (e.tags || []).some(t => t.toLowerCase().includes(q)) ||
          (e.category || "").toLowerCase().includes(q) ||
          (e.domain || "").toLowerCase().includes(q);
      }
      return true;
    });

    // Sort
    switch (sortBy) {
      case "relevance":
        if (debouncedSearch) {
          const scored = results.map(e => ({ entity: e, score: scoreEntity(e, debouncedSearch) }));
          scored.sort((a, b) => b.score - a.score);
          results = scored.map(s => s.entity);
        }
        break;
      case "alpha":
        results.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      case "type":
        results.sort((a, b) => a.entity_type.localeCompare(b.entity_type) || (a.title || "").localeCompare(b.title || ""));
        break;
      case "recent":
        results.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
        break;
    }
    return results;
  }, [allEntities, activeType, activeJurisdiction, debouncedSearch, sortBy, scoreEntity]);

  // Counts per type (respects jurisdiction filter)
  const counts = useMemo(() => {
    const base = activeJurisdiction !== "all"
      ? allEntities.filter(e => e.domain === activeJurisdiction)
      : allEntities;
    const c: Record<string, number> = { all: base.length };
    for (const e of base) c[e.entity_type] = (c[e.entity_type] || 0) + 1;
    return c;
  }, [allEntities, activeJurisdiction]);

  const getTypeInfo = (type: string) => ENTITY_TYPES.find(t => t.id === type) || ENTITY_TYPES[0];
  const activeFilters = (activeType !== "all" ? 1 : 0) + (activeJurisdiction !== "all" ? 1 : 0) + (debouncedSearch ? 1 : 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Garden Header */}
      <header style={{
        padding: "16px 24px", borderBottom: "2px solid #1D9E7520",
        background: "linear-gradient(135deg, #1D9E7508, #0F6E5608)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/logo/b_transparent_512.png" alt="Builder's Knowledge Garden" width={36} height={36} style={{ borderRadius: 10 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Knowledge Garden</div>
            <div style={{ fontSize: 10, color: "var(--fg-secondary)", letterSpacing: 1 }}>
              {allEntities.length} ENTITIES · {Object.keys(counts).length - 1} TYPES
              {activeJurisdiction !== "all" && ` · ${activeJurisdiction.toUpperCase()}`}
            </div>
          </div>
        </div>
        <Link href="/" style={{ fontSize: 12, color: "#1D9E75", textDecoration: "none", fontWeight: 500 }}>
          ← Home
        </Link>
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px" }}>
        {/* Search bar with icon */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <div style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            fontSize: 16, color: "var(--fg-tertiary)", pointerEvents: "none",
          }}>🔍</div>
          <input
            type="text" placeholder="Search codes, materials, methods, safety, jurisdictions..."
            value={search} onChange={e => { setSearch(e.target.value); if (e.target.value && sortBy === "alpha") setSortBy("relevance"); }}
            style={{
              width: "100%", padding: "12px 16px 12px 42px", borderRadius: 12,
              border: "1px solid var(--border, #e5e5e5)", background: "var(--bg, #fff)",
              fontSize: 14, color: "var(--fg)", outline: "none",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "var(--bg-hover, #f0f0f0)", border: "none", borderRadius: 10,
              width: 22, height: 22, cursor: "pointer", fontSize: 11, color: "var(--fg-tertiary)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          )}
        </div>

        {/* Sort + filter count row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {SORT_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => setSortBy(opt.id)}
                style={{
                  padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: sortBy === opt.id ? "#1D9E75" : "transparent",
                  color: sortBy === opt.id ? "#fff" : "var(--fg-tertiary)",
                  fontSize: 10, fontWeight: 600, transition: "all 0.15s",
                }}>{opt.label}</button>
            ))}
          </div>
          {activeFilters > 0 && (
            <button onClick={() => { setSearch(""); setActiveType("all"); setActiveJurisdiction("all"); setSortBy("alpha"); }}
              style={{
                padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "var(--bg-hover, #f0f0f0)", color: "var(--fg-tertiary)",
                fontSize: 10, fontWeight: 500,
              }}>Clear {activeFilters} filter{activeFilters > 1 ? "s" : ""} ✕</button>
          )}
        </div>

        {/* Type filter chips */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
          {ENTITY_TYPES.map(t => {
            const c = counts[t.id] || 0;
            const isActive = activeType === t.id;
            return (
              <button key={t.id} onClick={() => setActiveType(isActive && t.id !== "all" ? "all" : t.id)}
                style={{
                  padding: "6px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                  background: isActive ? t.color : "var(--bg-hover, #f0f0f0)",
                  color: isActive ? "#fff" : "var(--fg-secondary, #666)",
                  fontSize: 11, fontWeight: 600, transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 4,
                  opacity: c === 0 && t.id !== "all" ? 0.4 : 1,
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

        {/* Jurisdiction filter chips */}
        {jurisdictions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fg-tertiary)", marginBottom: 6, letterSpacing: 0.5 }}>
              JURISDICTIONS
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button onClick={() => setActiveJurisdiction("all")}
                style={{
                  padding: "4px 10px", borderRadius: 14, border: "none", cursor: "pointer",
                  background: activeJurisdiction === "all" ? "#1D9E75" : "var(--bg-hover, #f0f0f0)",
                  color: activeJurisdiction === "all" ? "#fff" : "var(--fg-secondary)",
                  fontSize: 10, fontWeight: 600,
                }}>All</button>
              {jurisdictions.map(j => {
                const isActive = activeJurisdiction === j.id;
                return (
                  <button key={j.id} onClick={() => setActiveJurisdiction(isActive ? "all" : j.id)}
                    style={{
                      padding: "4px 10px", borderRadius: 14, border: "none", cursor: "pointer",
                      background: isActive ? "#1D9E75" : "var(--bg-hover, #f0f0f0)",
                      color: isActive ? "#fff" : "var(--fg-secondary)",
                      fontSize: 10, fontWeight: 500, transition: "all 0.15s",
                    }}>
                    {j.label} <span style={{ fontSize: 8, opacity: 0.7 }}>({j.count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Entity Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--fg-tertiary)" }}>
            Loading knowledge garden...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--fg-tertiary)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🌿</div>
            {debouncedSearch ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>No entities match &ldquo;{debouncedSearch}&rdquo;</div>
                <div style={{ fontSize: 12 }}>Try different keywords or clear your filters</div>
              </>
            ) : "No entities found"}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {filtered.map(entity => {
              const typeInfo = getTypeInfo(entity.entity_type);
              const isExpanded = expanded === entity.id;
              return (
                <Link key={entity.id} href={`/knowledge/${entity.slug}`}
                  onMouseEnter={() => setExpanded(entity.id)}
                  onMouseLeave={() => setExpanded(null)}
                  style={{
                    borderRadius: 14, cursor: "pointer", overflow: "hidden",
                    border: isExpanded ? `2px solid ${typeInfo.color}` : "1px solid var(--border, #e5e5e5)",
                    background: "var(--bg, #fff)",
                    transition: "all 0.2s", textDecoration: "none", color: "inherit", display: "block",
                    transform: isExpanded ? "translateY(-2px)" : "none",
                    boxShadow: isExpanded ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
                  }}>
                  {/* Entity type image strip */}
                  <div style={{
                    height: 80, position: "relative", overflow: "hidden",
                    backgroundImage: `url(${getImageForEntity(entity).url})`,
                    backgroundSize: "cover", backgroundPosition: "center",
                  }}>
                    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 20%, ${typeInfo.color}bb 100%)` }} />
                    <div style={{ position: "absolute", bottom: 6, left: 10, zIndex: 2, display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{
                        fontSize: 9, padding: "2px 8px", borderRadius: 8,
                        background: "rgba(255,255,255,0.9)", color: typeInfo.color, fontWeight: 600,
                      }}>{typeInfo.icon} {typeInfo.label}</span>
                      {entity.domain && (
                        <span style={{
                          fontSize: 8, padding: "2px 6px", borderRadius: 6,
                          background: "rgba(255,255,255,0.7)", color: "#555", fontWeight: 500,
                        }}>{entity.domain}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: "10px 14px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>
                      {entity.title}
                    </div>
                    <div style={{
                      fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.5,
                      display: "-webkit-box", WebkitLineClamp: isExpanded ? 6 : 2,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                      transition: "all 0.2s",
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
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Results count */}
        {!loading && (
          <div style={{ textAlign: "center", padding: "16px 0", fontSize: 11, color: "var(--fg-tertiary)" }}>
            Showing {filtered.length} of {allEntities.length} entities
            {debouncedSearch && ` matching "${debouncedSearch}"`}
            {activeType !== "all" && ` in ${getTypeInfo(activeType).label}`}
            {activeJurisdiction !== "all" && ` · ${activeJurisdiction}`}
          </div>
        )}
      </div>

      <CopilotPanel />
    </div>
  );
}
