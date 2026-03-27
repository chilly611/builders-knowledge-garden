"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Cinzel, Outfit } from "next/font/google";
import CopilotPanel from "@/components/CopilotPanel";
import { parseDream, generateDreamPlan, DreamPlan } from "@/lib/dream-parser";
import { ARCHITECTURE_STYLES } from "@/lib/architecture-styles";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "700", "900"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

type Phase = "quiz" | "generating" | "concepts" | "detail";

interface QuizAnswers {
  buildingType: string;
  location: string;
  vibes: string[];
  size: string;
  budget: string;
  priorities: string[];
}

interface Concept {
  id: string;
  name: string;
  style: string;
  materials: string[];
  costRange: string;
  description: string;
  match: number;
  emoji: string;
  palette: string[];
}

const BUILDING_TYPES = [
  { id: "house", icon: "🏠", label: "House" },
  { id: "adu", icon: "🏡", label: "ADU / Tiny" },
  { id: "addition", icon: "🔨", label: "Addition" },
  { id: "commercial", icon: "🏢", label: "Commercial" },
  { id: "multi", icon: "🏘️", label: "Multi-Family" },
  { id: "other", icon: "✨", label: "Other" },
];

const VIBES = [
  { id: "warm", icon: "🌿", label: "Warm & Natural", color: "#8B6914" },
  { id: "cool", icon: "❄️", label: "Cool & Modern", color: "#5B8DEF" },
  { id: "bold", icon: "⚡", label: "Bold & Industrial", color: "#E8443A" },
  { id: "classic", icon: "🏛️", label: "Classic & Timeless", color: "#9B7BDB" },
  { id: "playful", icon: "🎨", label: "Playful & Eclectic", color: "#E07B3A" },
  { id: "minimal", icon: "◻️", label: "Minimal & Zen", color: "#808080" },
];

const SIZE_OPTIONS = [
  { id: "tiny", label: "Tiny", sub: "Under 1,000 sf", sf: 800 },
  { id: "cozy", label: "Cozy", sub: "1,000–2,000 sf", sf: 1500 },
  { id: "comfortable", label: "Comfortable", sub: "2,000–3,000 sf", sf: 2500 },
  { id: "spacious", label: "Spacious", sub: "3,000–5,000 sf", sf: 4000 },
  { id: "grand", label: "Grand", sub: "5,000+ sf", sf: 6000 },
];

const BUDGET_OPTIONS = [
  { id: "100k", label: "$100K–$250K", avg: 175000 },
  { id: "250k", label: "$250K–$500K", avg: 375000 },
  { id: "500k", label: "$500K–$1M", avg: 750000 },
  { id: "1m", label: "$1M–$2M", avg: 1500000 },
  { id: "2m", label: "$2M+", avg: 3000000 },
];

const PRIORITIES = [
  { id: "energy", icon: "♻️", label: "Energy efficiency" },
  { id: "lowmaint", icon: "🛡️", label: "Low maintenance" },
  { id: "resale", icon: "📈", label: "Resale value" },
  { id: "unique", icon: "🎭", label: "Unique design" },
  { id: "fast", icon: "⚡", label: "Fast to build" },
  { id: "budget", icon: "💰", label: "Budget-friendly" },
];

function generateConcepts(answers: QuizAnswers): Concept[] {
  const vibeStyleMap: Record<string, string[]> = {
    warm: ["modern-farmhouse", "craftsman", "japandi", "scandinavian-cabin", "biophilic"],
    cool: ["contemporary", "minimalist", "mid-century-modern", "deconstructivist"],
    bold: ["industrial", "brutalist", "adaptive-reuse", "parametric"],
    classic: ["colonial", "mediterranean", "spanish-colonial", "art-deco", "prairie"],
    playful: ["tropical-modern", "tiny-home-adu", "container-home"],
    minimal: ["japandi", "minimalist", "passive-house", "scandinavian-cabin"],
  };
  const costMap: Record<string, string[]> = {
    "100k": ["affordable"], "250k": ["affordable", "moderate"], "500k": ["moderate", "premium"],
    "1m": ["premium", "ultra"], "2m": ["premium", "ultra"],
  };
  const priorityBoost: Record<string, string[]> = {
    energy: ["passive-house", "biophilic"], unique: ["parametric", "deconstructivist", "adaptive-reuse"],
    fast: ["tiny-home-adu", "container-home"], budget: ["tiny-home-adu", "modern-farmhouse"],
  };

  const candidates = ARCHITECTURE_STYLES.map(style => {
    let score = 50;
    answers.vibes.forEach(v => { if (vibeStyleMap[v]?.includes(style.id)) score += 20; });
    if (costMap[answers.budget]?.includes(style.costTier)) score += 15;
    answers.priorities.forEach(p => { if (priorityBoost[p]?.includes(style.id)) score += 10; });
    score = Math.min(score + Math.floor(Math.random() * 10), 99);
    return { style, score };
  }).sort((a, b) => b.score - a.score).slice(0, 8);

  const sizeOpt = SIZE_OPTIONS.find(s => s.id === answers.size);
  const budgetOpt = BUDGET_OPTIONS.find(b => b.id === answers.budget);
  const costPerSf = budgetOpt && sizeOpt ? Math.round(budgetOpt.avg / sizeOpt.sf) : 280;

  return candidates.map(({ style, score }) => ({
    id: style.id,
    name: `The ${style.name} ${answers.buildingType === "adu" ? "Retreat" : answers.buildingType === "commercial" ? "Space" : "Home"}`,
    style: style.name,
    materials: style.materials.slice(0, 4),
    costRange: `$${costPerSf - 40}–${costPerSf + 60}/sf`,
    description: `${style.tagline}. A ${sizeOpt?.label.toLowerCase() || "comfortable"} ${answers.buildingType} featuring ${style.materials.slice(0, 3).join(", ")}. ${style.characteristics.slice(0, 2).join(". ")}. Inspired by ${style.famous[0] || style.era} traditions.`,
    match: score,
    emoji: style.emoji,
    palette: style.palette,
  }));
}

export default function ExploreDreamPage() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("quiz");
  const [quizStep, setQuizStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({ buildingType: "", location: "", vibes: [], size: "", budget: "", priorities: [] });
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [revealCount, setRevealCount] = useState(0);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [plan, setPlan] = useState<DreamPlan | null>(null);
  const [saved, setSaved] = useState(false);
  const fmt = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;

  useEffect(() => { setMounted(true); }, []);

  const nextStep = useCallback(() => {
    if (quizStep < 5) { setQuizStep(quizStep + 1); return; }
    // Generate concepts
    setPhase("generating");
    const generated = generateConcepts(answers);
    setConcepts(generated);
    // Staggered reveal
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setRevealCount(count);
      if (count >= generated.length) { clearInterval(interval); setPhase("concepts"); }
    }, 400);
  }, [quizStep, answers]);

  const expandConcept = useCallback((concept: Concept) => {
    setSelectedConcept(concept);
    const sizeOpt = SIZE_OPTIONS.find(s => s.id === answers.size);
    const dreamText = `A ${concept.style.toLowerCase()} ${answers.buildingType} in ${answers.location || "my area"}, ${sizeOpt?.sf || 2500} sq ft, featuring ${concept.materials.join(", ")}`;
    const parsed = parseDream(dreamText);
    const dreamPlan = generateDreamPlan(parsed);
    setPlan(dreamPlan);
    setPhase("detail");
  }, [answers]);

  const saveDream = useCallback(() => {
    if (!selectedConcept || !plan) return;
    const dream = {
      id: crypto.randomUUID(), title: selectedConcept.name,
      createdAt: new Date().toISOString(), growthStage: "seed" as const,
      path: "explore", preview: selectedConcept.description, plan,
    };
    const existing = JSON.parse(localStorage.getItem("bkg-dreams") || "[]");
    existing.unshift(dream);
    localStorage.setItem("bkg-dreams", JSON.stringify(existing.slice(0, 20)));
    setSaved(true);
  }, [selectedConcept, plan]);

  const canProceed = quizStep === 0 ? !!answers.buildingType : quizStep === 1 ? !!answers.location : quizStep === 2 ? answers.vibes.length > 0 : quizStep === 3 ? !!answers.size : quizStep === 4 ? !!answers.budget : answers.priorities.length > 0;

  if (!mounted) return <div style={{ minHeight: "100vh", background: "#1a0f05" }} />;

  return (
    <>
      <style jsx global>{`
        @keyframes cardSlide { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes dealCard { 0% { opacity: 0; transform: scale(0.8) rotateY(10deg); } 100% { opacity: 1; transform: scale(1) rotateY(0); } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(224,123,58,0.3); } 50% { box-shadow: 0 0 20px 4px rgba(224,123,58,0.15); } }
        @keyframes sparkle { 0% { opacity: 0; transform: scale(0) rotate(0); } 50% { opacity: 1; transform: scale(1.2) rotate(180deg); } 100% { opacity: 0; transform: scale(0) rotate(360deg); } }
        .quiz-option { padding: 16px; border-radius: 14px; border: 1px solid #e2e2e2; background: #f8f8f8; cursor: pointer; transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); text-align: center; }
        .quiz-option:hover { border-color: rgba(224,123,58,0.3); transform: translateY(-2px); }
        .quiz-option.selected { border-color: #E07B3A; background: rgba(224,123,58,0.12); transform: scale(1.02); }
        .concept-card { border-radius: 18px; overflow: hidden; background: #f8f8f8; border: 1px solid #e8e8e8; cursor: pointer; transition: all 0.3s; }
        .concept-card:hover { border-color: rgba(224,123,58,0.25); transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#fff",
        padding: "clamp(32px, 6vh, 60px) 20px 80px",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Link href="/dream" className={outfit.className} style={{ color: "#c06830", textDecoration: "none", fontSize: "0.82rem", letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
            <span style={{ fontSize: "0.9em" }}>←</span> Dream Machine
          </Link>

          {/* ── QUIZ PHASE ──────────────────────────────────────── */}
          {phase === "quiz" && (
            <div style={{ animation: "cardSlide 0.5s ease" }}>
              {/* Progress bar */}
              <div style={{ display: "flex", gap: 4, marginBottom: 32 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= quizStep ? "linear-gradient(90deg, #E07B3A, #E8A83E)" : "rgba(255,255,255,0.06)", transition: "background 0.3s" }} />
                ))}
              </div>

              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ fontSize: "2.2rem", marginBottom: 10 }}>⬡</div>
                <h1 className={cinzel.className} style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", color: "#E07B3A", marginBottom: 8 }}>Surprise Me</h1>
                <p className={outfit.className} style={{ color: "#555", fontSize: "0.85rem", fontWeight: 300 }}>Question {quizStep + 1} of 6</p>
              </div>

              {/* Step 0: Building type */}
              {quizStep === 0 && (
                <div>
                  <h2 className={outfit.className} style={{ fontSize: "1.1rem", color: "#333", textAlign: "center", marginBottom: 20, fontWeight: 400 }}>What are you building?</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                    {BUILDING_TYPES.map(bt => (
                      <div key={bt.id} className={`quiz-option ${answers.buildingType === bt.id ? "selected" : ""}`}
                        onClick={() => setAnswers(a => ({ ...a, buildingType: bt.id }))}>
                        <div style={{ fontSize: "2rem", marginBottom: 6 }}>{bt.icon}</div>
                        <div className={outfit.className} style={{ fontSize: "0.82rem", color: answers.buildingType === bt.id ? "#E07B3A" : "rgba(255,255,255,0.6)", fontWeight: 500 }}>{bt.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 1: Location */}
              {quizStep === 1 && (
                <div style={{ textAlign: "center" }}>
                  <h2 className={outfit.className} style={{ fontSize: "1.1rem", color: "#333", marginBottom: 20, fontWeight: 400 }}>Where are you building?</h2>
                  <input type="text" value={answers.location} onChange={e => setAnswers(a => ({ ...a, location: e.target.value }))}
                    placeholder="City or state — e.g. Austin, TX" autoFocus className={outfit.className}
                    style={{ width: "100%", maxWidth: 400, padding: "14px 20px", borderRadius: 14, background: "#fafafa", border: "1px solid rgba(224,123,58,0.2)", color: "#222", fontSize: "1rem", outline: "none", textAlign: "center" }}
                    onKeyDown={e => e.key === "Enter" && answers.location && nextStep()} />
                </div>
              )}

              {/* Step 2: Vibes */}
              {quizStep === 2 && (
                <div>
                  <h2 className={outfit.className} style={{ fontSize: "1.1rem", color: "#333", textAlign: "center", marginBottom: 6, fontWeight: 400 }}>What is your vibe?</h2>
                  <p className={outfit.className} style={{ fontSize: "0.78rem", color: "#666", textAlign: "center", marginBottom: 20 }}>Select 1–3</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                    {VIBES.map(v => {
                      const sel = answers.vibes.includes(v.id);
                      return (
                        <div key={v.id} className={`quiz-option ${sel ? "selected" : ""}`}
                          onClick={() => setAnswers(a => ({ ...a, vibes: sel ? a.vibes.filter(x => x !== v.id) : [...a.vibes, v.id].slice(0, 3) }))}
                          style={sel ? { borderColor: v.color, background: `${v.color}18` } : {}}>
                          <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>{v.icon}</div>
                          <div className={outfit.className} style={{ fontSize: "0.8rem", color: sel ? v.color : "rgba(255,255,255,0.6)", fontWeight: 500 }}>{v.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Size */}
              {quizStep === 3 && (
                <div>
                  <h2 className={outfit.className} style={{ fontSize: "1.1rem", color: "#333", textAlign: "center", marginBottom: 20, fontWeight: 400 }}>How big?</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400, margin: "0 auto" }}>
                    {SIZE_OPTIONS.map(s => (
                      <div key={s.id} className={`quiz-option ${answers.size === s.id ? "selected" : ""}`}
                        onClick={() => setAnswers(a => ({ ...a, size: s.id }))} style={{ textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className={outfit.className} style={{ fontSize: "0.9rem", color: answers.size === s.id ? "#E07B3A" : "rgba(255,255,255,0.6)", fontWeight: 500 }}>{s.label}</span>
                        <span className={outfit.className} style={{ fontSize: "0.75rem", color: "#666" }}>{s.sub}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Budget */}
              {quizStep === 4 && (
                <div>
                  <h2 className={outfit.className} style={{ fontSize: "1.1rem", color: "#333", textAlign: "center", marginBottom: 20, fontWeight: 400 }}>Budget range?</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400, margin: "0 auto" }}>
                    {BUDGET_OPTIONS.map(b => (
                      <div key={b.id} className={`quiz-option ${answers.budget === b.id ? "selected" : ""}`}
                        onClick={() => setAnswers(a => ({ ...a, budget: b.id }))} style={{ textAlign: "center" }}>
                        <span className={outfit.className} style={{ fontSize: "0.95rem", color: answers.budget === b.id ? "#E07B3A" : "rgba(255,255,255,0.6)", fontWeight: 500 }}>{b.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Priorities */}
              {quizStep === 5 && (
                <div>
                  <h2 className={outfit.className} style={{ fontSize: "1.1rem", color: "#333", textAlign: "center", marginBottom: 6, fontWeight: 400 }}>What matters most?</h2>
                  <p className={outfit.className} style={{ fontSize: "0.78rem", color: "#666", textAlign: "center", marginBottom: 20 }}>Pick your top 3</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, maxWidth: 500, margin: "0 auto" }}>
                    {PRIORITIES.map(p => {
                      const sel = answers.priorities.includes(p.id);
                      return (
                        <div key={p.id} className={`quiz-option ${sel ? "selected" : ""}`}
                          onClick={() => setAnswers(a => ({ ...a, priorities: sel ? a.priorities.filter(x => x !== p.id) : [...a.priorities, p.id].slice(0, 3) }))}>
                          <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{p.icon}</div>
                          <div className={outfit.className} style={{ fontSize: "0.78rem", color: sel ? "#E07B3A" : "rgba(255,255,255,0.5)", fontWeight: 500 }}>{p.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Next / Generate button */}
              <div style={{ textAlign: "center", marginTop: 32 }}>
                {quizStep > 0 && (
                  <button onClick={() => setQuizStep(quizStep - 1)} className={outfit.className} style={{ padding: "10px 20px", borderRadius: 12, background: "#fafafa", border: "1px solid #e2e2e2", color: "#555", fontSize: "0.85rem", cursor: "pointer", marginRight: 10 }}>← Back</button>
                )}
                <button onClick={nextStep} disabled={!canProceed} className={outfit.className} data-sound="select" style={{
                  padding: "12px 32px", borderRadius: 14, border: "none",
                  background: canProceed ? "linear-gradient(135deg, #E07B3A, #E8A83E)" : "rgba(255,255,255,0.06)",
                  color: canProceed ? "#fff" : "rgba(255,255,255,0.3)", fontSize: "1rem", fontWeight: 600,
                  cursor: canProceed ? "pointer" : "not-allowed",
                  animation: canProceed ? "pulseGlow 3s ease-in-out infinite" : "none",
                }}>{quizStep < 5 ? "Next →" : "Generate Concepts ⬡"}</button>
              </div>
            </div>
          )}

          {/* ── GENERATING PHASE ────────────────────────────────── */}
          {phase === "generating" && (
            <div style={{ textAlign: "center", minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: 20, animation: "sparkle 2s ease-in-out infinite" }}>⬡</div>
              <p className={cinzel.className} style={{ color: "#E07B3A", fontSize: "1.1rem", marginBottom: 16 }}>Generating concepts...</p>
              <p className={outfit.className} style={{ color: "#555", fontSize: "0.82rem" }}>{revealCount} of {concepts.length} ready</p>
              <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
                {concepts.map((_, i) => (
                  <div key={i} style={{ width: 24, height: 4, borderRadius: 2, background: i < revealCount ? "linear-gradient(90deg, #E07B3A, #E8A83E)" : "rgba(255,255,255,0.06)", transition: "background 0.3s" }} />
                ))}
              </div>
            </div>
          )}

          {/* ── CONCEPTS PHASE ──────────────────────────────────── */}
          {phase === "concepts" && (
            <div style={{ animation: "cardSlide 0.5s ease" }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <h2 className={cinzel.className} style={{ fontSize: "clamp(1.3rem, 3.5vw, 1.7rem)", color: "#E07B3A", marginBottom: 6 }}>Your Concepts</h2>
                <p className={outfit.className} style={{ color: "#555", fontSize: "0.82rem" }}>{concepts.length} ideas tailored to your preferences. Tap to explore.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                {concepts.map((c, i) => (
                  <div key={c.id} className="concept-card" onClick={() => expandConcept(c)}
                    style={{ animation: `dealCard 0.5s ease ${i * 0.1}s backwards` }}>
                    <div style={{ display: "flex", height: 5 }}>{c.palette.map((col, j) => <div key={j} style={{ flex: 1, background: col }} />)}</div>
                    <div style={{ padding: "18px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: "1.6rem" }}>{c.emoji}</span>
                        <span className={outfit.className} style={{
                          padding: "3px 10px", borderRadius: 10, fontSize: "0.68rem", fontWeight: 600,
                          background: c.match >= 80 ? "rgba(29,158,117,0.15)" : "rgba(224,123,58,0.1)",
                          color: c.match >= 80 ? "#1D9E75" : "#E07B3A",
                          border: `1px solid ${c.match >= 80 ? "rgba(29,158,117,0.25)" : "rgba(224,123,58,0.15)"}`,
                        }}>{c.match}% match</span>
                      </div>
                      <h3 className={outfit.className} style={{ fontSize: "0.95rem", color: "#222", fontWeight: 600, marginBottom: 4 }}>{c.name}</h3>
                      <p className={outfit.className} style={{ fontSize: "0.75rem", color: "#555", lineHeight: 1.4, marginBottom: 10 }}>{c.description.slice(0, 120)}...</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                        {c.materials.map((m, j) => (
                          <span key={j} className={outfit.className} style={{ padding: "2px 7px", borderRadius: 6, background: "rgba(224,123,58,0.08)", fontSize: "0.6rem", color: "#555" }}>{m}</span>
                        ))}
                      </div>
                      <span className={outfit.className} style={{ fontSize: "0.72rem", color: "#E07B3A", fontWeight: 500 }}>{c.costRange}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <button onClick={() => { setPhase("quiz"); setQuizStep(0); setConcepts([]); setRevealCount(0); }} className={outfit.className} style={{ padding: "10px 20px", borderRadius: 12, background: "#fafafa", border: "1px solid #e2e2e2", color: "#555", fontSize: "0.82rem", cursor: "pointer" }}>← Retake Quiz</button>
              </div>
            </div>
          )}

          {/* ── DETAIL PHASE ────────────────────────────────────── */}
          {phase === "detail" && selectedConcept && plan && (
            <div style={{ animation: "cardSlide 0.5s ease" }}>
              <button onClick={() => setPhase("concepts")} className={outfit.className} style={{ padding: "6px 14px", borderRadius: 10, background: "#fafafa", border: "1px solid #e2e2e2", color: "#555", fontSize: "0.78rem", cursor: "pointer", marginBottom: 20 }}>← All Concepts</button>

              <div style={{ borderRadius: 20, padding: "28px 24px", background: "rgba(224,123,58,0.04)", border: "1px solid rgba(224,123,58,0.15)", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: "1.6rem" }}>{selectedConcept.emoji}</span>
                  <h2 className={cinzel.className} style={{ fontSize: "1.2rem", color: "#E07B3A" }}>{selectedConcept.name}</h2>
                  <span className={outfit.className} style={{ padding: "3px 10px", borderRadius: 10, fontSize: "0.68rem", fontWeight: 600, background: "rgba(29,158,117,0.15)", color: "#1D9E75", marginLeft: "auto" }}>{selectedConcept.match}% match</span>
                </div>
                <p className={outfit.className} style={{ color: "#555", fontSize: "0.9rem", lineHeight: 1.7, fontWeight: 300 }}>{selectedConcept.description}</p>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Est. Cost", value: fmt(plan.totalCost), sub: `${fmt(plan.costPerSf)}/sf` },
                  { label: "Timeline", value: plan.timeline, sub: `${plan.sqft.toLocaleString()} sf` },
                  { label: "Quality", value: plan.quality.charAt(0).toUpperCase() + plan.quality.slice(1), sub: `${plan.codes.length} codes` },
                  { label: "Team", value: `${plan.team.length} roles`, sub: plan.team.slice(0, 2).map(t => t.role).join(", ") },
                ].map((s, i) => (
                  <div key={i} style={{ borderRadius: 14, padding: "14px 12px", background: "#f8f8f8", border: "1px solid #e8e8e8", textAlign: "center" }}>
                    <div className={outfit.className} style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#666", marginBottom: 4 }}>{s.label}</div>
                    <div className={outfit.className} style={{ fontSize: "1.1rem", color: "#E07B3A", fontWeight: 700, marginBottom: 2 }}>{s.value}</div>
                    <div className={outfit.className} style={{ fontSize: "0.65rem", color: "#666" }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {plan.challenges.length > 0 && (
                <div style={{ borderRadius: 14, padding: "16px 14px", marginBottom: 20, background: "rgba(216,90,48,0.04)", border: "1px solid rgba(216,90,48,0.12)" }}>
                  <h3 className={outfit.className} style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(216,90,48,0.7)", marginBottom: 10, fontWeight: 600 }}>⚠️ Watch Out For</h3>
                  {plan.challenges.map((ch, i) => (
                    <p key={i} className={outfit.className} style={{ fontSize: "0.78rem", color: "#555", lineHeight: 1.4, margin: "0 0 4px" }}>• {ch}</p>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                <button onClick={saveDream} disabled={saved} className={outfit.className} style={{
                  padding: "12px 16px", borderRadius: 12, background: saved ? "rgba(29,158,117,0.15)" : "rgba(224,123,58,0.1)",
                  border: `1px solid ${saved ? "rgba(29,158,117,0.3)" : "rgba(224,123,58,0.2)"}`, color: saved ? "#1D9E75" : "#E07B3A",
                  fontSize: "0.82rem", fontWeight: 500, cursor: "pointer",
                }}>{saved ? "✓ Saved" : "🌱 Save Dream"}</button>
                <Link href={`/dream/describe?dream=${encodeURIComponent(selectedConcept.description)}`} className={outfit.className} style={{
                  padding: "12px 16px", borderRadius: 12, background: "rgba(232,168,62,0.1)", border: "1px solid rgba(232,168,62,0.2)",
                  color: "#E8A83E", fontSize: "0.82rem", fontWeight: 500, textDecoration: "none", textAlign: "center",
                }}>✦ Refine Further</Link>
                <Link href={`/launch?type=${answers.buildingType}&sqft=${SIZE_OPTIONS.find(s => s.id === answers.size)?.sf || 2500}`} className={outfit.className} style={{
                  padding: "12px 16px", borderRadius: 12, background: "linear-gradient(135deg, #E07B3A, #E8A83E)",
                  color: "#222", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none", textAlign: "center",
                }}>🚀 Start Project</Link>
              </div>
            </div>
          )}

        </div>
      </div>
      <CopilotPanel />
    </>
  );
}
