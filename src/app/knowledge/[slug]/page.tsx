"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import CopilotPanel from "@/components/CopilotPanel";

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  building_code: { icon: "📋", color: "#D85A30", label: "Building Code" },
  material: { icon: "🧱", color: "#378ADD", label: "Material" },
  architectural_style: { icon: "🏛️", color: "#7F77DD", label: "Architectural Style" },
  safety_regulation: { icon: "⛑️", color: "#EF4444", label: "Safety Regulation" },
  trade: { icon: "👷", color: "#BA7517", label: "Trade" },
  method: { icon: "🔧", color: "#639922", label: "Method" },
  standard: { icon: "📐", color: "#EC4899", label: "Standard" },
  sequence_rule: { icon: "🔗", color: "#8B5CF6", label: "Sequence" },
  permit_requirement: { icon: "📄", color: "#06B6D4", label: "Permit" },
  building_type: { icon: "🏗️", color: "#F59E0B", label: "Building Type" },
  inspection_protocol: { icon: "🔍", color: "#10B981", label: "Inspection" },
  climate_zone: { icon: "🌡️", color: "#0EA5E9", label: "Climate Zone" },
  zoning_district: { icon: "📍", color: "#84CC16", label: "Zoning" },
};

interface Entity {
  id: string; slug: string; title: unknown; summary: unknown; body: unknown;
  entity_type: string; domain: string; tags: string[]; category?: string;
  metadata?: Record<string, unknown>; source_urls?: string[];
  created_at: string; updated_at: string;
}
interface Relationship {
  id: string; source_id: string; target_id: string;
  relationship: string; strength: number;
  metadata?: Record<string, unknown>;
}

function jsonText(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && "en" in val) return String((val as Record<string, string>).en || "");
  return JSON.stringify(val);
}

export default function EntityDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [entity, setEntity] = useState<Entity | null>(null);
  const [related, setRelated] = useState<{ entity: Entity; relationship: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) { setLoading(false); return; }
      const headers = { apikey: key, Authorization: `Bearer ${key}` };

      // Fetch entity by slug
      const res = await fetch(`${url}/rest/v1/knowledge_entities?slug=eq.${slug}&limit=1`, { headers });
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) { setLoading(false); return; }
      const e = data[0] as Entity;
      setEntity(e);

      // Fetch relationships where this entity is source or target
      const [srcRes, tgtRes] = await Promise.all([
        fetch(`${url}/rest/v1/entity_relationships?source_id=eq.${e.id}&limit=20`, { headers }),
        fetch(`${url}/rest/v1/entity_relationships?target_id=eq.${e.id}&limit=20`, { headers }),
      ]);
      const srcRels: Relationship[] = await srcRes.json();
      const tgtRels: Relationship[] = await tgtRes.json();

      // Collect unique related entity IDs
      const relatedIds = new Set<string>();
      const relMap: Record<string, string> = {};
      for (const r of srcRels) { relatedIds.add(r.target_id); relMap[r.target_id] = r.relationship; }
      for (const r of tgtRels) { relatedIds.add(r.source_id); relMap[r.source_id] = r.relationship; }
      relatedIds.delete(e.id);

      if (relatedIds.size > 0) {
        const ids = Array.from(relatedIds);
        const relRes = await fetch(
          `${url}/rest/v1/knowledge_entities?id=in.(${ids.join(",")})&select=id,slug,title,summary,entity_type,domain,tags&limit=20`,
          { headers }
        );
        const relEntities: Entity[] = await relRes.json();
        setRelated(relEntities.map(re => ({ entity: re, relationship: relMap[re.id] || "related" })));
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--fg-tertiary)" }}>Loading entity...</div>;
  if (!entity) return (
    <div style={{ padding: 60, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Entity not found</div>
      <Link href="/knowledge" style={{ color: "#1D9E75", fontSize: 13 }}>← Back to Knowledge Garden</Link>
    </div>
  );

  const t = TYPE_META[entity.entity_type] || { icon: "📄", color: "#888", label: entity.entity_type };
  const title = jsonText(entity.title);
  const summary = jsonText(entity.summary);
  const body = jsonText(entity.body);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Breadcrumb */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border, #e5e5e5)", fontSize: 12 }}>
        <Link href="/knowledge" style={{ color: "var(--fg-tertiary)", textDecoration: "none" }}>🌿 Knowledge Garden</Link>
        <span style={{ color: "var(--fg-tertiary)", margin: "0 6px" }}>›</span>
        <span style={{ color: t.color, fontWeight: 500 }}>{t.icon} {t.label}</span>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{
              fontSize: 10, padding: "3px 10px", borderRadius: 8,
              background: `${t.color}15`, color: t.color, fontWeight: 600,
            }}>{t.icon} {t.label}</span>
            {entity.category && <span style={{ fontSize: 10, color: "var(--fg-tertiary)" }}>· {entity.category}</span>}
            {entity.domain && <span style={{ fontSize: 10, color: "var(--fg-tertiary)" }}>· {entity.domain}</span>}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.3, marginBottom: 8 }}>{title}</h1>
          <p style={{ fontSize: 14, color: "var(--fg-secondary)", lineHeight: 1.6 }}>{summary}</p>
        </div>

        {/* Body */}
        {body && (
          <div style={{
            padding: "20px 24px", borderRadius: 14,
            border: "1px solid var(--border, #e5e5e5)", background: "var(--bg, #fff)",
            marginBottom: 20, fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.8,
            whiteSpace: "pre-wrap",
          }}>
            {body}
          </div>
        )}

        {/* Tags */}
        {entity.tags && entity.tags.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 20 }}>
            {entity.tags.map(tag => (
              <Link key={tag} href={`/knowledge?q=${encodeURIComponent(tag)}`} style={{
                fontSize: 11, padding: "4px 10px", borderRadius: 8,
                background: "var(--bg-hover, #f0f0f0)", color: "var(--fg-secondary)",
                textDecoration: "none", transition: "all 0.15s",
              }}>{tag}</Link>
            ))}
          </div>
        )}

        {/* Metadata */}
        {entity.metadata && Object.keys(entity.metadata).length > 0 && (
          <div style={{
            padding: "16px 20px", borderRadius: 14,
            border: `1px solid ${t.color}20`, background: `${t.color}04`,
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.color, marginBottom: 8 }}>
              {t.icon} Details
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
              {Object.entries(entity.metadata).map(([key, val]) => (
                <div key={key} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--border, #e5e5e5)" }}>
                  <div style={{ fontSize: 10, color: "var(--fg-tertiary)", marginBottom: 2 }}>{key.replace(/_/g, " ")}</div>
                  <div style={{ color: "var(--fg-secondary)" }}>
                    {typeof val === "object" ? JSON.stringify(val, null, 1) : String(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Entities (Knowledge Graph) */}
        {related.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span>🔗</span> Related Entities ({related.length})
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
              {related.map(({ entity: re, relationship }) => {
                const rt = TYPE_META[re.entity_type] || { icon: "📄", color: "#888", label: re.entity_type };
                return (
                  <Link key={re.id} href={`/knowledge/${re.slug}`} style={{
                    padding: "12px 14px", borderRadius: 12,
                    border: "1px solid var(--border, #e5e5e5)", background: "var(--bg, #fff)",
                    textDecoration: "none", color: "inherit", transition: "all 0.15s",
                    display: "block",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = rt.color; e.currentTarget.style.background = `${rt.color}06`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border, #e5e5e5)"; e.currentTarget.style.background = "var(--bg, #fff)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 6, background: `${rt.color}15`, color: rt.color, fontWeight: 600 }}>
                        {rt.icon} {rt.label}
                      </span>
                      <span style={{ fontSize: 9, color: "var(--fg-tertiary)", fontStyle: "italic" }}>
                        {relationship.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{jsonText(re.title)}</div>
                    <div style={{ fontSize: 10, color: "var(--fg-secondary)", marginTop: 2, lineHeight: 1.4,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>{jsonText(re.summary)}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Source URLs */}
        {entity.source_urls && entity.source_urls.length > 0 && (
          <div style={{ fontSize: 11, color: "var(--fg-tertiary)", marginBottom: 20 }}>
            <span style={{ fontWeight: 600 }}>Sources: </span>
            {entity.source_urls.map((url, i) => (
              <span key={i}><a href={url} target="_blank" rel="noopener" style={{ color: t.color }}>{new URL(url).hostname}</a>{i < entity.source_urls!.length - 1 ? ", " : ""}</span>
            ))}
          </div>
        )}

        {/* Footer meta */}
        <div style={{
          padding: "12px 0", borderTop: "1px solid var(--border, #e5e5e5)",
          display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--fg-tertiary)",
        }}>
          <span>Entity: {entity.slug}</span>
          <span>Updated: {new Date(entity.updated_at).toLocaleDateString()}</span>
        </div>
      </div>

      <CopilotPanel />
    </div>
  );
}
