"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cinzel, Outfit } from "next/font/google";
import CopilotPanel from "@/components/CopilotPanel";
import { parseDream, generateDreamPlan, DreamPlan } from "@/lib/dream-parser";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "700", "900"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

type Phase = "input" | "processing" | "result";

interface ProcessingStep {
  label: string;
  done: boolean;
  active: boolean;
}

const EXAMPLES: Record<string, string[]> = {
  diy: [
    "I want to build a cozy 2-bedroom cabin on 5 acres in Vermont with a wraparound porch",
    "A modern ADU in my backyard in Portland — 600 sqft, 1 bed, passive house standards",
    "Renovate my 1960s ranch house in Austin — open concept kitchen, add a master suite",
  ],
  gc: [
    "50,000 sqft Class A office building in downtown Denver — LEED Gold, 12 stories",
    "A 200-unit multifamily complex in Miami with ground-floor retail and structured parking",
    "Design-build warehouse — 80,000 sqft tilt-up in Phoenix, 32-foot clear height",
  ],
  specialty: [
    "Commercial kitchen buildout in an existing restaurant space in Brooklyn",
    "Solar array installation on a 40,000 sqft flat commercial roof in LA",
    "Custom home theater and recording studio in a converted basement — Nashville",
  ],
  default: [
    "I want to build a modern farmhouse in Asheville with 3 bedrooms under $500K",
    "A 50MW data center campus in Austin with N+1 redundancy",
    "A cozy Scandinavian-style cabin on 2 acres in Vermont",
  ],
};

const PLACEHOLDERS = [
  "I want to build a modern farmhouse in Asheville...",
  "A 50MW data center in Austin with N+1 redundancy...",
  "A cozy cabin on 2 acres in Vermont...",
  "Renovate a 1920s brownstone in Brooklyn...",
  "A net-zero school for 500 students in Denver...",
  "A boutique hotel on the Oregon coast...",
];

export default function DescribeDreamPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [dreamText, setDreamText] = useState("");
  const [plan, setPlan] = useState<DreamPlan | null>(null);
  const [aiNarrative, setAiNarrative] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [lane, setLane] = useState<string>("default");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const [showRefinement, setShowRefinement] = useState(false);
  const [refinementInput, setRefinementInput] = useState("");
  const [knowledgeDrop, setKnowledgeDrop] = useState<string | null>(null);
  const [isFirstDream, setIsFirstDream] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { label: "Understanding your vision...", done: false, active: false },
    { label: "Finding relevant codes...", done: false, active: false },
    { label: "Estimating costs...", done: false, active: false },
    { label: "Generating your dream...", done: false, active: false },
  ]);

  useEffect(() => {
    setMounted(true);
    const storedLane = localStorage.getItem("bkg-lane");
    if (storedLane) setLane(storedLane);
    setVoiceSupported(typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition));
    const dreams = localStorage.getItem("bkg-dreams");
    if (!dreams || JSON.parse(dreams).length === 0) setIsFirstDream(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3500);
    return () => clearInterval(interval);
  }, []);

  const toggleVoice = useCallback(() => {
    if (!voiceSupported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) { setIsListening(false); return; }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    setIsListening(true);
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
      setDreamText(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
  }, [voiceSupported, isListening]);

  const generateDream = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setPhase("processing");
    const advanceStep = (idx: number) => {
      setProcessingSteps(prev => prev.map((s, i) => ({ ...s, active: i === idx, done: i < idx })));
    };
    advanceStep(0);
    await new Promise(r => setTimeout(r, 800));
    const parsed = parseDream(text);
    advanceStep(1);
    await new Promise(r => setTimeout(r, 700));
    const dreamPlan = generateDreamPlan(parsed);
    advanceStep(2);
    await new Promise(r => setTimeout(r, 600));
    setPlan(dreamPlan);
    advanceStep(3);
    await new Promise(r => setTimeout(r, 500));
    setProcessingSteps(prev => prev.map(s => ({ ...s, done: true, active: false })));
    await new Promise(r => setTimeout(r, 400));
    setPhase("result");
    const drops = [
      dreamPlan.input.location === "fl-mia" ? "Miami-Dade County requires all building products to have a Notice of Acceptance (NOA) — the strictest wind code in the US." : null,
      dreamPlan.input.buildingType === "datacenter" ? "A typical data center uses 10-50x more energy per square foot than a commercial office building." : null,
      dreamPlan.input.style?.includes("farmhouse") ? "The modern farmhouse style originated from the need for simple, functional spaces — today it's the most popular residential style in America." : null,
      "Every building in the US must comply with at least one of 19,000+ local building code jurisdictions.",
    ].filter(Boolean);
    setKnowledgeDrop(drops[0] || drops[drops.length - 1] || null);
    if (isFirstDream) {
      setTimeout(() => setShowCelebration(true), 800);
      setTimeout(() => setShowCelebration(false), 4000);
    }
    setIsStreaming(true);
    try {
      const resp = await fetch("/api/v1/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `You are the Dream Machine. A user wants to build: "${text}". Write a vivid 2-paragraph description of what this building would look and feel like. Be specific about materials, light, atmosphere. Then list the top 3 codes, 5 materials with costs, and the biggest challenge. Format with clear sections.`,
          lane,
        }),
      });
      if (resp.ok) {
        const reader = resp.body?.getReader();
        const decoder = new TextDecoder();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
            for (const line of lines) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "chunk") setAiNarrative(prev => prev + data.text);
              } catch { /* skip */ }
            }
          }
        }
      }
    } catch { /* AI enrichment is optional */ }
    setIsStreaming(false);
  }, [lane, isFirstDream]);

  const saveDream = useCallback(() => {
    if (!plan) return;
    const dream = {
      id: crypto.randomUUID(), title: plan.input.raw.slice(0, 60),
      createdAt: new Date().toISOString(), growthStage: "seed" as const,
      path: "describe", preview: plan.input.raw, plan,
    };
    const existing = JSON.parse(localStorage.getItem("bkg-dreams") || "[]");
    existing.unshift(dream);
    localStorage.setItem("bkg-dreams", JSON.stringify(existing.slice(0, 20)));
    setSaved(true);
  }, [plan]);

  const shareDream = useCallback(() => {
    const url = `${window.location.origin}/dream/describe?dream=${encodeURIComponent(dreamText)}`;
    navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 3000);
  }, [dreamText]);

  const handleRefinement = useCallback((newInput: string) => {
    const combined = `${dreamText}. Also: ${newInput}`;
    setDreamText(combined);
    setAiNarrative("");
    setPlan(null);
    setRefinementInput("");
    setShowRefinement(false);
    generateDream(combined);
  }, [dreamText, generateDream]);

  useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams(window.location.search);
    const sharedDream = params.get("dream");
    if (sharedDream) {
      const decoded = decodeURIComponent(sharedDream);
      setDreamText(decoded);
      generateDream(decoded);
    }
  }, [mounted, generateDream]);

  const examples = EXAMPLES[lane] || EXAMPLES.default;
  const fmt = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;

  if (!mounted) return <div style={{ minHeight: "100vh", background: "#1a0f05" }} />;

  return (
    <>
      <style jsx global>{`
        @keyframes seedSprout { 0% { transform: scale(0.5); opacity: 0.3; } 30% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1) translateY(-4px); } 100% { transform: scale(1) translateY(0); } }
        @keyframes stepReveal { 0% { opacity: 0; transform: translateX(-12px); } 100% { opacity: 1; transform: translateX(0); } }
        @keyframes stepCheck { 0% { transform: scale(0); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @keyframes cardSlide { 0% { opacity: 0; transform: translateY(24px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes celebrationBurst { 0% { opacity: 0; transform: scale(0.5); } 30% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0; transform: scale(1.5) translateY(-60px); } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(232,168,62,0.3); } 50% { box-shadow: 0 0 20px 4px rgba(232,168,62,0.15); } }
        @keyframes narrativeIn { 0% { opacity: 0; max-height: 0; } 100% { opacity: 1; max-height: 600px; } }
        @keyframes micPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(232,168,62,0.4); } 50% { box-shadow: 0 0 0 12px rgba(232,168,62,0); } }
        .dream-textarea { width: 100%; min-height: 140px; padding: 20px; border-radius: 16px; border: 1px solid #e2e4e8; background: #fafafa; color: #1a1a1a; font-size: 1.05rem; line-height: 1.6; resize: vertical; outline: none; transition: border-color 0.3s, box-shadow 0.3s; font-family: inherit; }
        .dream-textarea:focus { border-color: #E8A83E; box-shadow: 0 0 0 3px rgba(232,168,62,0.1); }
        .dream-textarea::placeholder { color: #bbb; }
        .entity-link { color: #D85A30; text-decoration: none; border-bottom: 1px dotted rgba(216,90,48,0.3); transition: border-color 0.2s; }
        .entity-link:hover { border-bottom-color: #D85A30; }
      `}</style>

      {showCelebration && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {["🎉", "🏗️", "✨", "🌱", "🎊"].map((e, i) => (
            <span key={i} style={{ fontSize: "3rem", position: "absolute", animation: `celebrationBurst 2s ease ${i * 0.2}s forwards`, left: `${20 + i * 15}%`, top: "40%" }}>{e}</span>
          ))}
          <div className={cinzel.className} style={{ fontSize: "1.5rem", color: "#E8A83E", animation: "celebrationBurst 3s ease 0.5s forwards" }}>Your first dream!</div>
        </div>
      )}

      <div style={{
        minHeight: "100vh", position: "relative",
        background: "#fff",
        padding: "clamp(32px, 6vh, 60px) 20px 80px",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Link href="/dream" className={outfit.className} style={{ color: "#D85A30", textDecoration: "none", fontSize: "0.82rem", letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
            <span style={{ fontSize: "0.9em" }}>←</span> Dream Machine
          </Link>

          {phase === "input" && (
            <div style={{ animation: "cardSlide 0.6s ease" }}>
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>✦</div>
                <h1 className={cinzel.className} style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", color: "#D85A30", marginBottom: 10 }}>Describe Your Dream</h1>
                <p className={outfit.className} style={{ color: "#888", fontSize: "0.95rem", fontWeight: 300, maxWidth: 440, margin: "0 auto" }}>Tell us what you want to build. Be as detailed or as vague as you like.</p>
              </div>
              <div style={{ position: "relative", marginBottom: 20 }}>
                <textarea ref={textareaRef} className={`dream-textarea ${outfit.className}`} placeholder={PLACEHOLDERS[placeholderIdx]} value={dreamText} onChange={e => setDreamText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && e.metaKey) generateDream(dreamText); }} autoFocus />
                {voiceSupported && (
                  <button onClick={toggleVoice} aria-label={isListening ? "Stop listening" : "Start voice input"} style={{
                    position: "absolute", bottom: 14, right: 14, width: 40, height: 40, borderRadius: "50%",
                    background: isListening ? "#E8A83E" : "rgba(232,168,62,0.15)", border: "1px solid rgba(232,168,62,0.3)",
                    color: isListening ? "#1a0f05" : "#E8A83E", fontSize: "1.1rem", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s",
                    animation: isListening ? "micPulse 1.5s ease-in-out infinite" : "none",
                  }}>{isListening ? "◉" : "🎤"}</button>
                )}
              </div>
              <button onClick={() => generateDream(dreamText)} disabled={!dreamText.trim()} className={outfit.className} data-sound="select" style={{
                width: "100%", padding: "14px 24px", borderRadius: 14, border: "none",
                background: dreamText.trim() ? "linear-gradient(135deg, #D85A30, #E8A83E)" : "rgba(255,255,255,0.06)",
                color: dreamText.trim() ? "#fff" : "rgba(255,255,255,0.3)", fontSize: "1rem", fontWeight: 600,
                cursor: dreamText.trim() ? "pointer" : "not-allowed", transition: "all 0.3s",
                animation: dreamText.trim() ? "pulseGlow 3s ease-in-out infinite" : "none", letterSpacing: "0.02em",
              }}>Dream It ✦</button>
              <div style={{ marginTop: 28 }}>
                <p className={outfit.className} style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", marginBottom: 10, letterSpacing: "0.08em" }}>Or try:</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {examples.map((ex, i) => (
                    <button key={i} onClick={() => { setDreamText(ex); textareaRef.current?.focus(); }} className={outfit.className} style={{
                      padding: "10px 14px", borderRadius: 10, background: "#f8f8f8", border: "1px solid #e8e8e8",
                      color: "rgba(255,255,255,0.45)", fontSize: "0.82rem", textAlign: "left", cursor: "pointer", transition: "all 0.2s", lineHeight: 1.4,
                    }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(232,168,62,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                       onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
                    >{ex}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {phase === "processing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", animation: "cardSlide 0.5s ease" }}>
              <div style={{ fontSize: "4rem", marginBottom: 32, animation: "seedSprout 2s ease-in-out infinite alternate" }}>🌱</div>
              <p className={cinzel.className} style={{ color: "#D85A30", fontSize: "1.1rem", marginBottom: 28, letterSpacing: "0.04em" }}>Growing your dream...</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 320 }}>
                {processingSteps.map((step, i) => (
                  <div key={i} className={outfit.className} style={{ display: "flex", alignItems: "center", gap: 12, animation: `stepReveal 0.4s ease ${i * 0.15}s backwards` }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: step.done ? "#1D9E75" : step.active ? "rgba(232,168,62,0.2)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${step.done ? "#1D9E75" : step.active ? "#E8A83E" : "rgba(255,255,255,0.1)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "#222", transition: "all 0.3s",
                    }}>
                      {step.done ? <span style={{ animation: "stepCheck 0.3s ease" }}>✓</span> : step.active ? <span style={{ animation: "micPulse 1s infinite" }}>●</span> : ""}
                    </div>
                    <span style={{ fontSize: "0.85rem", color: step.done ? "rgba(255,255,255,0.7)" : step.active ? "#E8A83E" : "rgba(255,255,255,0.3)", fontWeight: step.active ? 500 : 300, transition: "all 0.3s" }}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase === "result" && plan && (
            <div ref={resultRef} style={{ animation: "cardSlide 0.6s ease" }}>
              {/* Confidence bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div className={outfit.className} style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Dream Confidence</div>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#f2f2f2", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #D85A30, #E8A83E)", width: `${plan.confidence}%`, transition: "width 1s ease" }} />
                </div>
                <span className={outfit.className} style={{ fontSize: "0.85rem", color: "#E8A83E", fontWeight: 600 }}>{plan.confidence}%</span>
              </div>

              {/* Narrative section */}
              <div style={{ borderRadius: 20, padding: "28px 24px", background: "#f8f8f8", border: "1px solid rgba(232,168,62,0.12)", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: "1.6rem" }}>✦</span>
                  <h2 className={cinzel.className} style={{ fontSize: "1.3rem", color: "#E8A83E" }}>Your Dream</h2>
                </div>
                <p className={outfit.className} style={{ color: "rgba(255,255,255,0.7)", fontSize: "1rem", lineHeight: 1.7, fontWeight: 300, fontStyle: "italic", marginBottom: 20, paddingLeft: 16, borderLeft: "2px solid rgba(232,168,62,0.2)" }}>&ldquo;{plan.input.raw}&rdquo;</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                  {plan.input.buildingTypeMatch && (
                    <span className={outfit.className} style={{ padding: "5px 14px", borderRadius: 20, background: "rgba(232,168,62,0.1)", border: "1px solid rgba(232,168,62,0.2)", color: "#E8A83E", fontSize: "0.78rem", fontWeight: 500 }}>{plan.input.buildingTypeMatch.icon} {plan.input.buildingTypeMatch.name}</span>
                  )}
                  {plan.input.style && (
                    <span className={outfit.className} style={{ padding: "5px 14px", borderRadius: 20, background: "rgba(196,164,74,0.1)", border: "1px solid rgba(196,164,74,0.2)", color: "#C4A44A", fontSize: "0.78rem", fontWeight: 500 }}>🎨 {plan.input.style}</span>
                  )}
                  {plan.input.locationMatch && (
                    <Link href="/knowledge" className={outfit.className} style={{ padding: "5px 14px", borderRadius: 20, background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.2)", color: "#1D9E75", fontSize: "0.78rem", fontWeight: 500, textDecoration: "none" }}>📍 {plan.input.locationMatch.name}</Link>
                  )}
                </div>
                {aiNarrative ? (
                  <div className={outfit.className} style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.92rem", lineHeight: 1.75, fontWeight: 300, animation: "narrativeIn 0.8s ease", whiteSpace: "pre-wrap" }}>{aiNarrative}</div>
                ) : isStreaming ? (
                  <div className={outfit.className} style={{ color: "#b8873b", fontSize: "0.85rem", fontStyle: "italic", animation: "micPulse 2s infinite" }}>Writing your story...</div>
                ) : null}
              </div>

              {/* Intelligence grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
                <div style={{ borderRadius: 16, padding: "20px 18px", background: "#f8f8f8", border: "1px solid #e8e8e8" }}>
                  <h3 className={outfit.className} style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12, fontWeight: 600 }}>📋 Key Codes</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {plan.codes.slice(0, 5).map((code, i) => (
                      <Link key={i} href={`/knowledge/${code.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`} className="entity-link" style={{ fontSize: "0.82rem", lineHeight: 1.4 }}>
                        <span className={outfit.className}>
                          <strong style={{ color: "#E8A83E" }}>{code.title}</strong>
                          <span style={{ color: "rgba(255,255,255,0.4)", marginLeft: 6 }}>— {code.status}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
                <div style={{ borderRadius: 16, padding: "20px 18px", background: "#f8f8f8", border: "1px solid #e8e8e8" }}>
                  <h3 className={outfit.className} style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12, fontWeight: 600 }}>🧱 Cost Breakdown</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {plan.estimate.slice(0, 6).map((div, i) => (
                      <div key={i} className={outfit.className} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
                        <span style={{ color: "rgba(255,255,255,0.6)" }}>{div.division}</span>
                        <span style={{ color: "#E8A83E", fontWeight: 500 }}>{fmt(div.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Estimated Cost", value: fmt(plan.totalCost), sub: `${fmt(plan.costPerSf)}/sf` },
                  { label: "Timeline", value: plan.timeline, sub: `${plan.sqft.toLocaleString()} sf` },
                  { label: "Quality Tier", value: plan.quality.charAt(0).toUpperCase() + plan.quality.slice(1), sub: `${plan.codes.length} codes apply` },
                  { label: "Team Size", value: `${plan.team.length} roles`, sub: plan.team.slice(0, 2).map(t => t.role).join(", ") },
                ].map((stat, i) => (
                  <div key={i} style={{ borderRadius: 14, padding: "16px 14px", background: "#f8f8f8", border: "1px solid #e8e8e8", textAlign: "center" }}>
                    <div className={outfit.className} style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>{stat.label}</div>
                    <div className={outfit.className} style={{ fontSize: "1.15rem", color: "#E8A83E", fontWeight: 700, marginBottom: 3 }}>{stat.value}</div>
                    <div className={outfit.className} style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>{stat.sub}</div>
                  </div>
                ))}
              </div>

              {/* Challenges */}
              <div style={{ borderRadius: 16, padding: "20px 18px", marginBottom: 20, background: "rgba(216,90,48,0.04)", border: "1px solid rgba(216,90,48,0.12)" }}>
                <h3 className={outfit.className} style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(216,90,48,0.7)", marginBottom: 12, fontWeight: 600 }}>⚠️ Watch Out For</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {plan.challenges.map((ch, i) => (
                    <p key={i} className={outfit.className} style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5, fontWeight: 300, margin: 0 }}>• {ch}</p>
                  ))}
                </div>
              </div>

              {knowledgeDrop && (
                <div style={{ borderRadius: 14, padding: "14px 18px", marginBottom: 20, background: "rgba(29,158,117,0.06)", border: "1px solid rgba(29,158,117,0.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1.1rem" }}>💡</span>
                  <p className={outfit.className} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5, fontWeight: 300, margin: 0 }}>{knowledgeDrop}</p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
                <button onClick={saveDream} disabled={saved} className={outfit.className} data-sound="select" style={{
                  padding: "12px 16px", borderRadius: 12, background: saved ? "rgba(29,158,117,0.15)" : "rgba(232,168,62,0.1)",
                  border: `1px solid ${saved ? "rgba(29,158,117,0.3)" : "rgba(232,168,62,0.2)"}`, color: saved ? "#1D9E75" : "#E8A83E",
                  fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", transition: "all 0.3s",
                }}>{saved ? "✓ Saved" : "🌱 Save Dream"}</button>
                <button onClick={() => setShowRefinement(true)} className={outfit.className} style={{
                  padding: "12px 16px", borderRadius: 12, background: "rgba(196,164,74,0.1)", border: "1px solid rgba(196,164,74,0.2)",
                  color: "#C4A44A", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", transition: "all 0.3s",
                }}>🔄 Refine Dream</button>
                <Link href="/dream/inspire" className={outfit.className} style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(216,90,48,0.1)", border: "1px solid rgba(216,90,48,0.2)", color: "#D85A30", fontSize: "0.82rem", fontWeight: 500, textDecoration: "none", textAlign: "center", transition: "all 0.3s" }}>📷 Add Photos</Link>
                <Link href={`/launch?type=${plan.input.buildingType || "sfr"}&loc=${plan.input.location || ""}&sqft=${plan.sqft}`} className={outfit.className} style={{ padding: "12px 16px", borderRadius: 12, background: "linear-gradient(135deg, #D85A30, #E8A83E)", border: "none", color: "#222", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none", textAlign: "center", transition: "all 0.3s" }}>🚀 Start Project</Link>
                <button onClick={shareDream} className={outfit.className} style={{ padding: "12px 16px", borderRadius: 12, background: "#fafafa", border: "1px solid #e2e2e2", color: shared ? "#1D9E75" : "rgba(255,255,255,0.5)", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", transition: "all 0.3s" }}>{shared ? "✓ Link copied!" : "🔗 Share"}</button>
              </div>

              {/* Refinement */}
              {showRefinement && (
                <div style={{ borderRadius: 16, padding: "20px 18px", background: "rgba(196,164,74,0.04)", border: "1px solid rgba(196,164,74,0.15)", animation: "cardSlide 0.4s ease" }}>
                  <h3 className={outfit.className} style={{ fontSize: "0.85rem", color: "#C4A44A", marginBottom: 12, fontWeight: 600 }}>Refine your dream</h3>
                  <p className={outfit.className} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: 12, fontWeight: 300 }}>Add details, change materials, adjust the budget, specify features...</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="text" value={refinementInput} onChange={e => setRefinementInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && refinementInput.trim() && handleRefinement(refinementInput)}
                      placeholder="Make it passive house certified with a green roof..." className={outfit.className}
                      style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "#fafafa", border: "1px solid rgba(196,164,74,0.2)", color: "#222", fontSize: "0.85rem", outline: "none" }} />
                    <button onClick={() => refinementInput.trim() && handleRefinement(refinementInput)} disabled={!refinementInput.trim()} className={outfit.className} style={{
                      padding: "10px 18px", borderRadius: 10, background: refinementInput.trim() ? "rgba(196,164,74,0.2)" : "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(196,164,74,0.2)", color: refinementInput.trim() ? "#C4A44A" : "rgba(255,255,255,0.3)", fontSize: "0.85rem", fontWeight: 500,
                      cursor: refinementInput.trim() ? "pointer" : "not-allowed",
                    }}>Refine ✦</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {["Add a home office", "Make it net-zero energy", "Use CLT instead of wood frame", "Add an accessory dwelling unit", "Increase to 4 bedrooms", "Budget under $400K"].map((sug, i) => (
                      <button key={i} onClick={() => handleRefinement(sug)} className={outfit.className} style={{
                        padding: "5px 12px", borderRadius: 16, background: "#f8f8f8", border: "1px solid #e2e2e2",
                        color: "rgba(255,255,255,0.4)", fontSize: "0.72rem", cursor: "pointer", transition: "all 0.2s",
                      }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(196,164,74,0.3)"; e.currentTarget.style.color = "#C4A44A"; }}
                         onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
                      >{sug}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Team needs */}
              <div style={{ borderRadius: 16, padding: "20px 18px", marginTop: 20, background: "#f8f8f8", border: "1px solid #e8e8e8" }}>
                <h3 className={outfit.className} style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12, fontWeight: 600 }}>👷 Team Needs</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {plan.team.map((t, i) => (
                    <span key={i} className={outfit.className} style={{ padding: "4px 12px", borderRadius: 16, background: "#fafafa", border: "1px solid #e2e2e2", color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>{t.role}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      <CopilotPanel />
    </>
  );
}
