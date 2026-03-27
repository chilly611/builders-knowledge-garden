"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { Archivo_Black, Archivo } from "next/font/google";
import CopilotPanel from "@/components/CopilotPanel";
import { ARCHITECTURE_STYLES, ArchStyle } from "@/lib/architecture-styles";
import { getImageForEntity } from "@/lib/image-service";

const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400" });
const archivo = Archivo({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

interface BrowseCard {
  id: string;
  title: string;
  subtitle: string;
  style: string;
  materials: string[];
  costTier: string;
  emoji: string;
  palette: string[];
  tags: string[];
  type: "style" | "material" | "building";
  slug?: string;
  costPerSf?: string;
  region?: string;
  description: string;
}

const COST_LABELS: Record<string, string> = { affordable: "$120–200/sf", moderate: "$200–350/sf", premium: "$350–550/sf", ultra: "$550+/sf" };
const ROOMS = ["Kitchen", "Bathroom", "Living Room", "Bedroom", "Office", "Outdoor", "Garage", "Basement"];
const BUDGET_RANGES = ["Under $200K", "$200K–$500K", "$500K–$1M", "$1M–$3M", "$3M+"];

function generateCards(): BrowseCard[] {
  const cards: BrowseCard[] = [];
  ARCHITECTURE_STYLES.forEach((s: ArchStyle) => {
    cards.push({
      id: `style-${s.id}`, title: s.name, subtitle: s.tagline, style: s.name,
      materials: s.materials, costTier: s.costTier, emoji: s.emoji,
      palette: s.palette, tags: [...s.tags, s.era, s.costTier],
      type: "style", slug: s.id, costPerSf: COST_LABELS[s.costTier] || "$200–350/sf",
      region: s.region, description: `${s.era} • ${s.region}. ${s.characteristics.join(". ")}.`,
    });
  });
  const materialCards: BrowseCard[] = [
    { id: "mat-clt", title: "Cross-Laminated Timber", subtitle: "The material redefining mass timber construction", style: "Biophilic", materials: ["CLT", "glulam", "timber"], costTier: "premium", emoji: "🪵", palette: ["#C4A44A", "#8B6914", "#D4B896"], tags: ["sustainable", "structural", "modern"], type: "material", slug: "cross-laminated-timber", costPerSf: "$28–45/sf", description: "Engineered wood panels for walls, floors, and roofs. Sequesters carbon. Fire-resistant when properly designed." },
    { id: "mat-rammed", title: "Rammed Earth Walls", subtitle: "Ancient technique, modern beauty", style: "Desert Modernist", materials: ["earth", "clay", "gravel"], costTier: "moderate", emoji: "🏜️", palette: ["#C4A882", "#8B7355", "#A0522D"], tags: ["sustainable", "thermal-mass", "desert"], type: "material", slug: "rammed-earth", costPerSf: "$40–80/sf wall", description: "Compressed earth walls with natural striations. Excellent thermal mass. Zero embodied carbon." },
    { id: "mat-steel", title: "Corten Steel Cladding", subtitle: "Weathered beauty that protects itself", style: "Industrial", materials: ["corten steel", "steel"], costTier: "premium", emoji: "🔶", palette: ["#8B4513", "#A0522D", "#CD853F"], tags: ["industrial", "cladding", "low-maintenance"], type: "material", slug: "corten-steel", costPerSf: "$15–30/sf", description: "Self-weathering steel forms a protective rust patina. Zero maintenance. Bold architectural statement." },
    { id: "mat-concrete", title: "Board-Formed Concrete", subtitle: "Raw texture meets sculptural precision", style: "Brutalist", materials: ["concrete", "formwork"], costTier: "premium", emoji: "🧱", palette: ["#808080", "#A9A9A9", "#696969"], tags: ["brutalist", "structural", "modern"], type: "material", slug: "concrete-4000psi", costPerSf: "$18–35/sf wall", description: "Cast-in-place concrete with wood board texture imprinted. Each pour is unique. Iconic modern aesthetic." },
    { id: "mat-green", title: "Living Green Roof", subtitle: "A meadow on your rooftop", style: "Biophilic", materials: ["vegetation", "waterproofing", "growing medium"], costTier: "premium", emoji: "🌿", palette: ["#228B22", "#1D9E75", "#8FBC8F"], tags: ["sustainable", "roofing", "biophilic"], type: "material", slug: "green-roof", costPerSf: "$25–50/sf", description: "Vegetated roofing system. Manages stormwater, reduces heat island, extends membrane life 2-3x." },
    { id: "mat-glass", title: "Structural Glass Walls", subtitle: "Where inside becomes outside", style: "Contemporary", materials: ["IGU glass", "steel", "silicone"], costTier: "ultra", emoji: "🪟", palette: ["#87CEEB", "#B0E0E6", "#ADD8E6"], tags: ["modern", "transparency", "luxury"], type: "material", slug: "low-e-window-glass", costPerSf: "$80–150/sf", description: "Floor-to-ceiling insulated glass units. Maximize natural light. Low-E coating for energy performance." },
    { id: "mat-reclaimed", title: "Reclaimed Barnwood", subtitle: "Every plank tells a century-old story", style: "Modern Farmhouse", materials: ["reclaimed wood", "timber"], costTier: "moderate", emoji: "🪵", palette: ["#8B7355", "#A0522D", "#DEB887"], tags: ["rustic", "sustainable", "character"], type: "material", slug: "reclaimed-wood", costPerSf: "$12–25/sf", description: "Salvaged wood from old barns and structures. Each piece has unique patina, nail holes, and grain patterns." },
  ];
  const buildingCards: BrowseCard[] = [
    { id: "bld-adu", title: "Backyard ADU", subtitle: "The 400-800 SF guest house revolution", style: "Contemporary", materials: ["wood frame", "metal roof", "glass"], costTier: "moderate", emoji: "🏡", palette: ["#1D9E75", "#C4A44A", "#87CEEB"], tags: ["residential", "small", "rental-income"], type: "building", slug: "adu", costPerSf: "$250–400/sf", description: "Accessory dwelling unit. Extra income, multigenerational living, or home office. Fastest-growing building type." },
    { id: "bld-barn", title: "Modern Barndominium", subtitle: "Steel shell, luxury interior", style: "Modern Farmhouse", materials: ["steel frame", "metal cladding", "concrete slab"], costTier: "affordable", emoji: "🏚️", palette: ["#8B7355", "#2F4F4F", "#DEB887"], tags: ["residential", "affordable", "rural"], type: "building", slug: "barndominium", costPerSf: "$120–200/sf", description: "Metal building exterior with custom residential interior. Fast construction. Huge open spans. Great value." },
    { id: "bld-passive", title: "Passive House", subtitle: "90% less heating energy than standard", style: "Passive House", materials: ["triple-glazed windows", "continuous insulation", "HRV"], costTier: "premium", emoji: "♻️", palette: ["#1D9E75", "#228B22", "#87CEEB"], tags: ["sustainable", "energy", "certified"], type: "building", slug: "passive-house", costPerSf: "$300–500/sf", description: "Certified to Passive House standard. Airtight envelope. Triple-glazed windows. Heat recovery ventilation. Near-zero energy bills." },
    { id: "bld-container", title: "Shipping Container Home", subtitle: "Repurposed steel, modern living", style: "Industrial", materials: ["shipping containers", "steel", "insulation"], costTier: "affordable", emoji: "📦", palette: ["#4682B4", "#808080", "#CD853F"], tags: ["alternative", "sustainable", "fast"], type: "building", slug: "container-home", costPerSf: "$150–250/sf", description: "Repurposed ISO containers as structural modules. Fast assembly. Inherently strong. Unique aesthetic." },
    { id: "bld-treehouse", title: "Luxury Treehouse", subtitle: "Elevated living among the canopy", style: "Biophilic", materials: ["timber", "steel cables", "glass"], costTier: "ultra", emoji: "🌳", palette: ["#228B22", "#8B4513", "#C4A44A"], tags: ["luxury", "unique", "hospitality"], type: "building", slug: "treehouse", costPerSf: "$500–1000/sf", description: "Engineered platforms in mature trees. Boutique hospitality or private retreat. Structural engineering required." },
    { id: "bld-datacenter", title: "Edge Data Center", subtitle: "Mission-critical infrastructure at scale", style: "Industrial", materials: ["concrete", "steel", "UPS systems"], costTier: "ultra", emoji: "🖥️", palette: ["#2F4F4F", "#4682B4", "#808080"], tags: ["commercial", "technology", "critical"], type: "building", slug: "datacenter", costPerSf: "$800–2000/sf", description: "Tier III/IV facility. N+1 redundancy. Precision cooling. 99.999% uptime. The backbone of the digital economy." },
  ];
  return [...cards, ...materialCards, ...buildingCards].sort(() => Math.random() - 0.5);
}

const ALL_CARDS = generateCards();
const STYLE_NAMES = ARCHITECTURE_STYLES.map(s => s.name);

interface TasteProfile {
  topStyles: { name: string; count: number }[];
  topMaterials: { name: string; count: number }[];
  budgetRange: string;
  summary: string;
}

function computeTaste(savedIds: string[]): TasteProfile | null {
  if (savedIds.length < 5) return null;
  const saved = ALL_CARDS.filter(c => savedIds.includes(c.id));
  const styleCounts: Record<string, number> = {};
  const matCounts: Record<string, number> = {};
  const costCounts: Record<string, number> = {};
  saved.forEach(c => {
    styleCounts[c.style] = (styleCounts[c.style] || 0) + 1;
    c.materials.forEach(m => { matCounts[m] = (matCounts[m] || 0) + 1; });
    costCounts[c.costTier] = (costCounts[c.costTier] || 0) + 1;
  });
  const topStyles = Object.entries(styleCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }));
  const topMaterials = Object.entries(matCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  const topCost = Object.entries(costCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "moderate";
  const budgetRange = COST_LABELS[topCost] || "$200–350/sf";
  const summary = `You gravitate toward ${topStyles[0]?.name || "modern"} design with ${topMaterials.slice(0, 2).map(m => m.name).join(" and ")}, in the ${budgetRange} range.`;
  return { topStyles, topMaterials, budgetRange, summary };
}

export default function BrowseDreamPage() {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null);
  const [showTaste, setShowTaste] = useState(false);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [knowledgeDrop, setKnowledgeDrop] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("bkg-dream-saves");
      if (raw) setSavedIds(JSON.parse(raw));
    } catch {}
  }, []);

  // Infinite scroll
  useEffect(() => {
    if (!mounted) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisibleCount(prev => Math.min(prev + 12, filtered.length));
    }, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  });

  // Recompute taste when saves change
  useEffect(() => {
    if (savedIds.length >= 5) setTasteProfile(computeTaste(savedIds));
  }, [savedIds]);

  const filtered = useMemo(() => {
    let cards = ALL_CARDS;
    if (search.trim()) {
      const q = search.toLowerCase();
      cards = cards.filter(c => c.title.toLowerCase().includes(q) || c.style.toLowerCase().includes(q) || c.tags.some(t => t.includes(q)) || c.materials.some(m => m.toLowerCase().includes(q)) || c.description.toLowerCase().includes(q));
    }
    if (activeFilter) {
      if (STYLE_NAMES.includes(activeFilter)) cards = cards.filter(c => c.style === activeFilter);
      else if (ROOMS.includes(activeFilter)) cards = cards.filter(c => c.tags.some(t => t.toLowerCase().includes(activeFilter.toLowerCase())));
      else if (BUDGET_RANGES.includes(activeFilter)) {
        const tierMap: Record<string, string> = { "Under $200K": "affordable", "$200K–$500K": "moderate", "$500K–$1M": "premium", "$1M–$3M": "premium", "$3M+": "ultra" };
        cards = cards.filter(c => c.costTier === tierMap[activeFilter]);
      }
    }
    return cards;
  }, [search, activeFilter]);

  const toggleSave = useCallback((id: string) => {
    setSavedIds(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      localStorage.setItem("bkg-dream-saves", JSON.stringify(next));
      if (!prev.includes(id)) {
        setJustSaved(id);
        setTimeout(() => setJustSaved(null), 800);
        // Knowledge drop every 5th save
        if ((next.length % 5) === 0) {
          const drops = ["CLT sequesters 1 ton of CO₂ per cubic meter — making buildings carbon sinks.", "The average US home uses 48 different building materials from 12+ countries.", "Passive House certification can reduce heating costs by up to 90%.", "Rammed earth walls can last 1,000+ years — some ancient examples still stand."];
          setKnowledgeDrop(drops[Math.floor(Math.random() * drops.length)]);
          setTimeout(() => setKnowledgeDrop(null), 6000);
        }
      }
      return next;
    });
  }, []);

  if (!mounted) return <div style={{ minHeight: "100vh", background: "#1a0f05" }} />;

  return (
    <>
      <style jsx global>{`
        @keyframes cardSlide { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes heartPop { 0% { transform: scale(1); } 40% { transform: scale(1.4); } 100% { transform: scale(1); } }
        @keyframes dropSlide { 0% { opacity: 0; transform: translateY(20px); } 10% { opacity: 1; transform: translateY(0); } 90% { opacity: 1; } 100% { opacity: 0; transform: translateY(-10px); } }
        @keyframes tasteReveal { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
        .browse-card { border-radius: 16px; overflow: hidden; background: #fff; border: 1px solid #e8e8e8; transition: all 0.3s; cursor: pointer; break-inside: avoid; margin-bottom: 16px; box-shadow: 0 1px 6px rgba(0,0,0,0.04); }
        .browse-card:hover { border-color: rgba(184,135,59,0.3); transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        .filter-chip { padding: 6px 14px; border-radius: 20px; border: 1px solid #e2e4e8; background: #fff; color: #666; font-size: 0.72rem; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .filter-chip:hover { border-color: rgba(184,135,59,0.4); color: #444; }
        .filter-chip.active { border-color: #B8873B; background: rgba(184,135,59,0.08); color: #B8873B; }
      `}</style>

      <div style={{
        minHeight: "100vh", position: "relative",
        background: "#fff",
        padding: "clamp(32px, 5vh, 48px) 20px 80px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Link href="/dream" className={archivo.className} style={{ color: "#a08030", textDecoration: "none", fontSize: "0.82rem", letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
            <span style={{ fontSize: "0.9em" }}>←</span> Dream Machine
          </Link>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div>
              <h1 className={archivoBlack.className} style={{ fontSize: "clamp(1.3rem, 3.5vw, 1.8rem)", color: "#B8873B", marginBottom: 4 }}>Browse &amp; Discover</h1>
              <p className={archivo.className} style={{ color: "#555", fontSize: "0.78rem" }}>{filtered.length} designs • {savedIds.length} saved</p>
            </div>
            {savedIds.length >= 5 && (
              <button onClick={() => setShowTaste(!showTaste)} className={archivo.className} style={{
                padding: "8px 16px", borderRadius: 12, background: "rgba(184,135,59,0.12)", border: "1px solid rgba(184,135,59,0.25)",
                color: "#B8873B", fontSize: "0.78rem", fontWeight: 500, cursor: "pointer",
              }}>🧬 {showTaste ? "Hide" : "Show"} Taste Profile</button>
            )}
          </div>

          {/* Search */}
          <div style={{ marginBottom: 16 }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search styles, materials, building types..."
              className={archivo.className} style={{
                width: "100%", padding: "12px 18px", borderRadius: 14, background: "#fafafa",
                border: "1px solid rgba(184,135,59,0.15)", color: "#222", fontSize: "0.9rem", outline: "none",
              }} />
          </div>

          {/* Filter chips */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, marginBottom: 16 }}>
            <button className={`filter-chip ${archivo.className} ${!activeFilter ? "active" : ""}`} onClick={() => setActiveFilter(null)}>All</button>
            {["Modern Farmhouse", "Contemporary", "Japandi", "Industrial", "Minimalist", "Craftsman", "Mid-Century Modern", "Passive House"].map(s => (
              <button key={s} className={`filter-chip ${archivo.className} ${activeFilter === s ? "active" : ""}`} onClick={() => setActiveFilter(activeFilter === s ? null : s)}>{s}</button>
            ))}
            {BUDGET_RANGES.slice(0, 3).map(b => (
              <button key={b} className={`filter-chip ${archivo.className} ${activeFilter === b ? "active" : ""}`} onClick={() => setActiveFilter(activeFilter === b ? null : b)}>{b}</button>
            ))}
          </div>

          {/* Knowledge drop toast */}
          {knowledgeDrop && (
            <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", zIndex: 100, maxWidth: 420, padding: "12px 20px", borderRadius: 14, background: "rgba(29,158,117,0.95)", backdropFilter: "blur(12px)", animation: "dropSlide 6s ease", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: "1.1rem" }}>💡</span>
              <p className={archivo.className} style={{ fontSize: "0.78rem", color: "#222", margin: 0, lineHeight: 1.4 }}>{knowledgeDrop}</p>
            </div>
          )}

          {/* Taste profile panel */}
          {showTaste && tasteProfile && (
            <div style={{ borderRadius: 18, padding: "24px 20px", marginBottom: 20, background: "rgba(184,135,59,0.06)", border: "1px solid rgba(184,135,59,0.18)", animation: "tasteReveal 0.4s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: "1.4rem" }}>🧬</span>
                <h2 className={archivoBlack.className} style={{ fontSize: "1.1rem", color: "#B8873B" }}>Your Taste Profile</h2>
              </div>
              <p className={archivo.className} style={{ color: "#555", fontSize: "0.88rem", lineHeight: 1.6, fontWeight: 300, marginBottom: 16 }}>{tasteProfile.summary}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <h4 className={archivo.className} style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#666", marginBottom: 8 }}>Top Styles</h4>
                  {tasteProfile.topStyles.map((s, i) => (
                    <div key={i} className={archivo.className} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#666", marginBottom: 4 }}>
                      <span>{s.name}</span><span style={{ color: "#B8873B" }}>×{s.count}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className={archivo.className} style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#666", marginBottom: 8 }}>Top Materials</h4>
                  {tasteProfile.topMaterials.map((m, i) => (
                    <div key={i} className={archivo.className} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#666", marginBottom: 4 }}>
                      <span>{m.name}</span><span style={{ color: "#B8873B" }}>×{m.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={archivo.className} style={{ marginTop: 12, fontSize: "0.75rem", color: "rgba(184,135,59,0.6)" }}>Budget range: {tasteProfile.budgetRange} • Based on {savedIds.length} saves</div>
            </div>
          )}

          {/* ── Masonry Grid ────────────────────────────────────── */}
          <div style={{ columns: "clamp(1, calc((100vw - 40px) / 320), 3)", columnGap: 16 }}>
            {filtered.slice(0, visibleCount).map((card, i) => {
              const isSaved = savedIds.includes(card.id);
              return (
                <div key={card.id} className="browse-card" style={{ animation: `cardSlide 0.4s ease ${Math.min(i * 0.05, 0.5)}s backwards` }}>
                  {/* Photo header */}
                  <div style={{ position: "relative", height: 140, overflow: "hidden" }}>
                    <div style={{
                      position: "absolute", inset: 0,
                      backgroundImage: `url(${getImageForEntity({ entity_type: card.type === "style" ? "architectural_style" : card.type === "material" ? "material" : "building_type", slug: card.slug || card.id, title: card.title }).url})`,
                      backgroundSize: "cover", backgroundPosition: "center",
                      transition: "transform 0.4s ease",
                    }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.6) 100%)" }} />
                    {/* Save button */}
                    <button onClick={(e) => { e.stopPropagation(); toggleSave(card.id); }} style={{
                      position: "absolute", top: 10, right: 10, zIndex: 3,
                      width: 32, height: 32, borderRadius: "50%",
                      background: isSaved ? "rgba(232,68,58,0.9)" : "rgba(0,0,0,0.4)",
                      backdropFilter: "blur(4px)", border: "none", fontSize: 14,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      animation: justSaved === card.id ? "heartPop 0.4s ease" : "none",
                      color: "#fff",
                    }}>{isSaved ? "♥" : "♡"}</button>
                    {/* Type badge */}
                    <div style={{ position: "absolute", bottom: 10, left: 12, zIndex: 2 }}>
                      <span className={archivo.className} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 8, background: "rgba(255,255,255,0.9)", color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{card.type}</span>
                    </div>
                    {/* Palette strip at bottom edge */}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", height: 3 }}>
                      {card.palette.map((c, j) => (
                        <div key={j} style={{ flex: 1, background: c }} />
                      ))}
                    </div>
                  </div>
                  {/* Text content */}
                  <div style={{ padding: "14px 16px 16px" }}>
                    <h3 className={archivo.className} style={{ fontSize: "1rem", color: "#222", fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{card.title}</h3>
                    <p className={archivo.className} style={{ fontSize: "0.78rem", color: "#666", fontWeight: 300, marginBottom: 10, lineHeight: 1.4 }}>{card.subtitle}</p>

                    {/* Material tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                      {card.materials.slice(0, 3).map((m, j) => (
                        <span key={j} className={archivo.className} style={{ padding: "2px 8px", borderRadius: 8, background: "rgba(184,135,59,0.1)", border: "1px solid rgba(184,135,59,0.15)", fontSize: "0.62rem", color: "#666" }}>{m}</span>
                      ))}
                    </div>

                    {/* Cost + region */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      {card.costPerSf && (
                        <span className={archivo.className} style={{ fontSize: "0.7rem", color: "#B8873B", fontWeight: 500 }}>{card.costPerSf}</span>
                      )}
                      {card.region && (
                        <span className={archivo.className} style={{ fontSize: "0.65rem", color: "#666" }}>{card.region}</span>
                      )}
                    </div>

                    {/* Build this */}
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #e8e8e8", display: "flex", gap: 6 }}>
                      {card.slug && (
                        <Link href={`/knowledge/${card.slug}`} className={archivo.className} style={{ padding: "5px 10px", borderRadius: 8, background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.15)", color: "#1D9E75", fontSize: "0.65rem", fontWeight: 500, textDecoration: "none" }}>Learn More</Link>
                      )}
                      <Link href={`/dream/describe?dream=${encodeURIComponent(card.description)}`} className={archivo.className} style={{ padding: "5px 10px", borderRadius: 8, background: "rgba(184,135,59,0.12)", border: "1px solid rgba(184,135,59,0.2)", color: "#B8873B", fontSize: "0.65rem", fontWeight: 500, textDecoration: "none" }}>Dream This ◈</Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Infinite scroll loader */}
          {visibleCount < filtered.length && (
            <div ref={loaderRef} style={{ textAlign: "center", padding: "32px 0" }}>
              <p className={archivo.className} style={{ color: "#666", fontSize: "0.78rem" }}>Loading more...</p>
            </div>
          )}
          {visibleCount >= filtered.length && filtered.length > 0 && (
            <p className={archivo.className} style={{ textAlign: "center", padding: "32px 0", color: "#666", fontSize: "0.78rem" }}>
              {filtered.length} designs explored • {savedIds.length} saved
            </p>
          )}

        </div>
      </div>
      <CopilotPanel />
    </>
  );
}
