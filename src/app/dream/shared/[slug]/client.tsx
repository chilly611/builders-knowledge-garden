"use client";

import Link from "next/link";
import { Cinzel, Outfit } from "next/font/google";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "700", "900"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

interface SharedDream {
  id: string;
  input_mode: string;
  prompt: string;
  lane?: string;
  jurisdiction?: string;
  building_type?: string;
  style_slug?: string;
  materials: string[];
  codes: string[];
  estimate_low?: number;
  estimate_high?: number;
  timeline_months?: number;
  confidence_score: number;
  growth_stage: string;
  created_at: string;
}

const GROWTH_ICONS: Record<string, string> = { seed: "🌱", sprout: "🌿", sapling: "🌳", bloom: "🌸" };
const fmt = (n?: number) => !n ? "—" : n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;

export default function SharedDreamClient({ dream, slug }: { dream: SharedDream | null; slug: string }) {
  if (!dream) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #1a0f05 0%, #1e1208 50%, #0f0a05 100%)", padding: 24, textAlign: "center",
      }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>🌱</div>
        <h1 className={cinzel.className} style={{ fontSize: "1.5rem", color: "#E8A83E", marginBottom: 8 }}>Dream Not Found</h1>
        <p className={outfit.className} style={{ color: "#555", marginBottom: 24 }}>This dream may have been removed or the link is invalid.</p>
        <Link href="/dream" className={outfit.className} style={{ padding: "10px 24px", borderRadius: 12, background: "linear-gradient(135deg, #D85A30, #E8A83E)", color: "#222", textDecoration: "none", fontWeight: 600 }}>Start Your Own Dream ✦</Link>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(ellipse at 30% 20%, rgba(232,168,62,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(216,90,48,0.08) 0%, transparent 50%), linear-gradient(135deg, #1a0f05 0%, #1e1208 40%, #15100a 100%)`,
      padding: "clamp(40px, 8vh, 80px) 20px 60px",
    }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p className={outfit.className} style={{ fontSize: "0.72rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#b8873b", marginBottom: 8 }}>Builder&rsquo;s Knowledge Garden</p>
          <h1 className={cinzel.className} style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", color: "#E8A83E", marginBottom: 8 }}>A Shared Dream</h1>
          <p className={outfit.className} style={{ fontSize: "0.82rem", color: "#555" }}>Someone imagined something beautiful. Now it&rsquo;s your turn.</p>
        </div>

        {/* Dream Card */}
        <div style={{ borderRadius: 20, padding: "28px 24px", background: "#f8f8f8", border: "1px solid rgba(232,168,62,0.15)", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: "1.8rem" }}>{GROWTH_ICONS[dream.growth_stage] || "🌱"}</span>
            <div>
              <div className={outfit.className} style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#555" }}>{dream.input_mode} dream</div>
              <div className={outfit.className} style={{ fontSize: "0.7rem", color: "#555" }}>{new Date(dream.created_at).toLocaleDateString()}</div>
            </div>
            <div style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 10, background: "rgba(232,168,62,0.1)", border: "1px solid rgba(232,168,62,0.2)" }}>
              <span className={outfit.className} style={{ fontSize: "0.75rem", color: "#E8A83E", fontWeight: 600 }}>{dream.confidence_score}%</span>
            </div>
          </div>

          {dream.prompt && (
            <p className={outfit.className} style={{ fontSize: "1rem", color: "#555", lineHeight: 1.7, fontWeight: 300, fontStyle: "italic", marginBottom: 20, paddingLeft: 16, borderLeft: "2px solid rgba(232,168,62,0.2)" }}>
              &ldquo;{dream.prompt.slice(0, 300)}{dream.prompt.length > 300 ? "..." : ""}&rdquo;
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {dream.building_type && <span className={outfit.className} style={{ padding: "5px 14px", borderRadius: 20, background: "rgba(232,168,62,0.1)", border: "1px solid rgba(232,168,62,0.2)", color: "#E8A83E", fontSize: "0.78rem", fontWeight: 500 }}>{dream.building_type}</span>}
            {dream.jurisdiction && <span className={outfit.className} style={{ padding: "5px 14px", borderRadius: 20, background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.2)", color: "#1D9E75", fontSize: "0.78rem", fontWeight: 500 }}>📍 {dream.jurisdiction}</span>}
            {dream.style_slug && <span className={outfit.className} style={{ padding: "5px 14px", borderRadius: 20, background: "rgba(196,164,74,0.1)", border: "1px solid rgba(196,164,74,0.2)", color: "#C4A44A", fontSize: "0.78rem", fontWeight: 500 }}>🎨 {dream.style_slug}</span>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Est. Range", value: `${fmt(dream.estimate_low)} – ${fmt(dream.estimate_high)}` },
            { label: "Timeline", value: dream.timeline_months ? `${dream.timeline_months} months` : "—" },
            { label: "Materials", value: `${(dream.materials as string[])?.length || 0} selected` },
            { label: "Codes", value: `${(dream.codes as string[])?.length || 0} apply` },
          ].map((s, i) => (
            <div key={i} style={{ borderRadius: 14, padding: "14px 12px", background: "#f8f8f8", border: "1px solid #e8e8e8", textAlign: "center" }}>
              <div className={outfit.className} style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#555", marginBottom: 4 }}>{s.label}</div>
              <div className={outfit.className} style={{ fontSize: "0.95rem", color: "#E8A83E", fontWeight: 600 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <Link href="/dream" className={outfit.className} style={{
            display: "inline-block", padding: "14px 32px", borderRadius: 14,
            background: "linear-gradient(135deg, #D85A30, #E8A83E)", color: "#222",
            fontSize: "1rem", fontWeight: 600, textDecoration: "none",
            letterSpacing: "0.02em",
          }}>Dream Something Like This ✦</Link>
          <p className={outfit.className} style={{ marginTop: 16, fontSize: "0.75rem", color: "#555" }}>Powered by Builder&rsquo;s Knowledge Garden — the operating system for the global construction economy</p>
        </div>

      </div>
    </div>
  );
}
