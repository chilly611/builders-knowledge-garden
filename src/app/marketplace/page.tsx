"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import CopilotPanel from "@/components/CopilotPanel";

interface Material {
  id: string; slug: string; title: string; summary: string;
  tags: string[]; metadata?: Record<string, unknown>;
}

export default function MarketplacePage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) { setLoading(false); return; }
        const res = await fetch(
          `${url}/rest/v1/knowledge_entities?entity_type=eq.material&status=eq.published&select=id,slug,title,summary,tags,category,metadata&order=category.asc&limit=100`,
          { headers: { apikey: key, Authorization: `Bearer ${key}` } }
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setMaterials(data.map((e: Record<string, unknown>) => ({
            ...e,
            title: typeof e.title === "object" ? (e.title as Record<string,string>).en || "" : e.title,
            summary: typeof e.summary === "object" ? (e.summary as Record<string,string>).en || "" : e.summary,
          })) as Material[]);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const categories = ["all", ...Array.from(new Set(materials.map(m => (m.metadata as Record<string,string>)?.csi_division || "general")))];
  const filtered = materials.filter(m => {
    if (category !== "all" && (m.metadata as Record<string,string>)?.csi_division !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.title.toLowerCase().includes(q) || m.summary.toLowerCase().includes(q) || (m.tags||[]).some(t => t.includes(q));
    }
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{
        padding: "16px 24px", borderBottom: "2px solid #378ADD20",
        background: "linear-gradient(135deg, #378ADD08, #1D9E7508)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/logo/b_transparent_512.png" alt="Builder's KG" width={36} height={36} style={{ borderRadius: 10 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Marketplace</div>
            <div style={{ fontSize: 10, color: "var(--fg-secondary)", letterSpacing: 1 }}>
              {materials.length} MATERIALS · SUPPLIERS COMING SOON
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px" }}>
        {/* Coming soon banner */}
        <div style={{
          padding: "16px 20px", borderRadius: 14, marginBottom: 16,
          background: "linear-gradient(135deg, #378ADD10, #1D9E7510)",
          border: "1px solid #378ADD25",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 28 }}>🚀</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Supplier marketplace launching soon</div>
            <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>
              Below: every material in our knowledge engine. Soon: real suppliers, pricing, RFQ, and Stripe Connect transactions.
            </div>
          </div>
        </div>

        <input type="text" placeholder="Search materials by name, CSI division, or tag..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 12,
            border: "1px solid var(--border, #e5e5e5)", background: "var(--bg, #fff)",
            fontSize: 14, color: "var(--fg)", outline: "none", marginBottom: 14,
          }}
        />

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--fg-tertiary)" }}>Loading materials...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {filtered.map(mat => {
              const meta = (mat.metadata || {}) as Record<string, unknown>;
              const cost = meta.cost_per_sf || meta.cost_per_ft || meta.cost_per_unit || meta.installed_cost_range || meta.cost_per_gallon || meta.cost_per_square || meta.cost_per_sheet || meta.cost_per_lf || meta.cost_per_bf || meta.cost_range || "";
              const csi = meta.csi_division || "";
              const grade = meta.sustainability_grade || "";
              return (
                <Link key={mat.id} href={`/knowledge/${mat.slug}`} style={{
                  padding: "14px 16px", borderRadius: 14, textDecoration: "none", color: "inherit",
                  border: "1px solid var(--border, #e5e5e5)", background: "var(--bg, #fff)",
                  transition: "all 0.15s", display: "block",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#378ADD"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(55,138,221,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border, #e5e5e5)"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{mat.title}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.5, marginBottom: 8,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>{mat.summary}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {cost && <span style={{ fontSize: 12, fontWeight: 600, color: "#378ADD" }}>{String(cost)}</span>}
                    {csi && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 6, background: "#378ADD12", color: "#378ADD" }}>CSI {String(csi)}</span>}
                    {grade && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 6,
                      background: grade === "A" ? "#22C55E18" : grade === "B" ? "#60A5FA18" : grade === "C" ? "#F59E0B18" : "#EF444418",
                      color: grade === "A" ? "#22C55E" : grade === "B" ? "#60A5FA" : grade === "C" ? "#F59E0B" : "#EF4444",
                      fontWeight: 600,
                    }}>🌱 {String(grade)}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: "center", padding: "20px 0", fontSize: 11, color: "var(--fg-tertiary)" }}>
          {filtered.length} of {materials.length} materials · Supplier listings + RFQ coming Q2 2026
        </div>
      </div>
      <CopilotPanel />
    </div>
  );
}
