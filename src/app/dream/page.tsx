"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mic, MicOff, Link2, Check } from "lucide-react";
import { parseDream, generateDreamPlan, DreamPlan } from "@/lib/dream-parser";
import { AnimCounter, CompletionRing, GamificationStyles } from "@/components/Gamification";
import CopilotPanel from "@/components/CopilotPanel";

const EXAMPLES = [
  "I want to build a modern farmhouse in Asheville with 4 bedrooms and a wraparound porch, budget $450K",
  "Build a 50,000 sf data center in Phoenix with liquid cooling",
  "Convert my warehouse into a food hall in Brooklyn, 8000 sf",
  "3-bedroom ADU in my backyard in Los Angeles under $200K",
  "2-story commercial office in Denver, 15,000 sf, energy-efficient",
  "Beachfront hotel in Miami, 40 rooms, contemporary design",
];

export default function DreamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}><div className="text-sm" style={{ color: "var(--fg-tertiary)" }}>Loading Dream Builder...</div></div>}>
      <DreamPageInner />
    </Suspense>
  );
}

function DreamPageInner() {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"input" | "generating" | "plan">("input");
  const [plan, setPlan] = useState<DreamPlan | null>(null);
  const [planTab, setPlanTab] = useState("overview");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [dots, setDots] = useState("");
  const [copied, setCopied] = useState(false);
  const searchParams = useSearchParams();

  // Auto-generate from shared dream link (?dream=encoded_text)
  useEffect(() => {
    const sharedDream = searchParams.get("dream");
    if (sharedDream && phase === "input") {
      const decoded = decodeURIComponent(sharedDream);
      setInput(decoded);
      // Auto-generate after short delay
      setTimeout(() => {
        const parsed = parseDream(decoded);
        const dreamPlan = generateDreamPlan(parsed);
        setPlan(dreamPlan);
        setPhase("plan");
      }, 500);
    }
  }, [searchParams, phase]);

  const shareDream = useCallback(() => {
    if (!plan) return;
    const encoded = encodeURIComponent(plan.input.raw);
    const url = `${window.location.origin}/dream?dream=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [plan]);

  // Voice input
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  const toggleVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        setIsListening(false);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  useEffect(() => {
    if (phase !== "generating") return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 400);
    return () => clearInterval(t);
  }, [phase]);

  const generate = () => {
    const text = input.trim();
    if (!text) return;
    setPhase("generating");
    setTimeout(() => {
      const parsed = parseDream(text);
      const dreamPlan = generateDreamPlan(parsed);
      setPlan(dreamPlan);
      setPhase("plan");
    }, 2000);
  };

  const reset = () => {
    setPhase("input");
    setPlan(null);
    setInput("");
    setPlanTab("overview");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const card = "rounded-xl border p-5";
  const cardS = { borderColor: "var(--border)", background: "var(--bg-secondary)" };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <GamificationStyles />

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs"
            style={{ background: "linear-gradient(135deg, #D85A30, #B84A25)" }}>💭</div>
          <span className="font-semibold text-sm">Dream Builder</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
            style={{ background: "#D85A30", color: "#fff" }}>FREE</span>
        </Link>
        <Link href="/launch" className="px-4 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105"
          style={{ borderColor: "var(--border)", color: "var(--fg-secondary)" }}>
          Smart Project Launcher →
        </Link>
      </nav>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">

        {/* ═══ INPUT PHASE ═══ */}
        {phase === "input" && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            <div className="text-center mb-8 pt-8">
              <div className="text-4xl mb-4">💭</div>
              <h1 className="text-2xl sm:text-3xl font-semibold mb-3">
                What do you want to <span style={{ color: "#D85A30" }}>build</span>?
              </h1>
              <p className="text-sm max-w-md mx-auto" style={{ color: "var(--fg-secondary)" }}>
                Describe your dream in plain language — type or use the mic.
                Building type, location, size, budget, style — whatever you know.
                We&apos;ll figure out the rest in 60 seconds.
              </p>
            </div>

            <div className="relative mb-6">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); } }}
                placeholder={isListening ? "Listening... speak your dream" : "I want to build a modern farmhouse in Asheville with 4 bedrooms..."}
                rows={4}
                className="w-full px-5 py-4 rounded-2xl border text-sm outline-none resize-none leading-relaxed"
                style={{
                  borderColor: input ? "#D85A30" : "var(--border)",
                  background: "var(--bg-secondary)", color: "var(--fg)",
                  boxShadow: input ? "0 0 0 3px #D85A3020" : "none",
                  transition: "all 0.2s ease",
                }}
                autoFocus
              />
              {input.trim() && (
                <button onClick={generate}
                  className="absolute bottom-4 right-4 px-5 py-2 rounded-full text-white text-xs font-medium transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg, #D85A30, #B84A25)", boxShadow: "0 2px 12px rgba(216,90,48,0.3)" }}>
                  Dream It →
                </button>
              )}
              {voiceSupported && (
                <button onClick={toggleVoice}
                  className="absolute bottom-4 left-4 w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: isListening ? "#dc3545" : "var(--bg-tertiary)",
                    color: isListening ? "#fff" : "var(--fg-tertiary)",
                    border: isListening ? "2px solid #dc3545" : "1px solid var(--border)",
                    animation: isListening ? "pulse 1.5s infinite" : "none",
                  }}
                  title={isListening ? "Stop listening" : "Speak your dream"}>
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
            </div>

            {/* Example prompts */}
            <div className="space-y-2">
              <div className="text-[10px] font-medium tracking-wider uppercase text-center mb-3"
                style={{ color: "var(--fg-tertiary)" }}>
                Try an example
              </div>
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => setInput(ex)}
                  className="w-full text-left px-4 py-3 rounded-xl text-[12px] leading-relaxed transition-all hover:scale-[1.01]"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--fg-secondary)" }}>
                  <span style={{ color: "#D85A30" }}>→</span> {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ GENERATING PHASE ═══ */}
        {phase === "generating" && (
          <div className="flex flex-col items-center justify-center py-24 text-center" style={{ animation: "fadeIn 0.5s ease" }}>
            <div className="text-5xl mb-6" style={{ animation: "celebrationSpin 2s ease infinite" }}>🏗️</div>
            <h2 className="text-xl font-semibold mb-2">Building your dream{dots}</h2>
            <p className="text-sm" style={{ color: "var(--fg-secondary)" }}>
              Analyzing codes, estimating costs, identifying permits, assembling your team
            </p>
            <div className="flex gap-2 mt-6">
              {["Parsing", "Codes", "Estimate", "Permits", "Team"].map((s, i) => (
                <span key={s} className="text-[9px] px-2 py-1 rounded-full"
                  style={{
                    background: "var(--bg-secondary)", border: "1px solid var(--border)",
                    color: "var(--fg-tertiary)",
                    animation: `fadeIn 0.3s ${i * 0.3}s ease both`,
                  }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ═══ PLAN PHASE ═══ */}
        {phase === "plan" && plan && (
          <div style={{ animation: "slideUp 0.4s ease" }}>
            {/* Plan header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{plan.input.buildingTypeMatch?.icon || "🏗️"}</span>
                  <h1 className="text-xl font-semibold">Your Dream Plan</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--fg-secondary)" }}>
                  {plan.input.buildingTypeMatch && <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>{plan.input.buildingTypeMatch.name}</span>}
                  {plan.input.locationMatch && <span className="px-2 py-0.5 rounded-full" style={{ background: "#7F77DD15", color: "#7F77DD" }}>📍 {plan.input.locationMatch.name}</span>}
                  {plan.input.style && <span className="px-2 py-0.5 rounded-full" style={{ background: "#BA751715", color: "#BA7517" }}>{plan.input.style}</span>}
                  {plan.input.features.slice(0, 3).map((f, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full" style={{ background: "var(--bg-tertiary)", color: "var(--fg-tertiary)" }}>{f}</span>
                  ))}
                </div>
              </div>
              <CompletionRing percent={plan.confidence} size={52} strokeWidth={4} color="#D85A30">
                <span style={{ fontSize: 12, fontWeight: 600, color: "#D85A30" }}>{plan.confidence}%</span>
              </CompletionRing>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className={card} style={cardS}>
                <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>Estimated Cost</div>
                <div className="text-lg font-semibold" style={{ color: "var(--accent)" }}><AnimCounter value={plan.totalCost} prefix="$" /></div>
                <div className="text-[9px]" style={{ color: "var(--fg-tertiary)" }}><AnimCounter value={plan.costPerSf} prefix="$" suffix="/sf" /></div>
              </div>
              <div className={card} style={cardS}>
                <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>Size</div>
                <div className="text-lg font-semibold"><AnimCounter value={plan.sqft} suffix=" sf" /></div>
                <div className="text-[9px] capitalize" style={{ color: "var(--fg-tertiary)" }}>{plan.quality} quality</div>
              </div>
              <div className={card} style={cardS}>
                <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>Timeline</div>
                <div className="text-lg font-semibold">{plan.timeline}</div>
                <div className="text-[9px]" style={{ color: "var(--fg-tertiary)" }}>estimated</div>
              </div>
              <div className={card} style={cardS}>
                <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>Permits</div>
                <div className="text-lg font-semibold"><AnimCounter value={plan.permits.length} /></div>
                <div className="text-[9px]" style={{ color: "var(--fg-tertiary)" }}>required</div>
              </div>
            </div>

            {/* Plan tabs */}
            <div className="flex gap-1 mb-5 border-b pb-0 overflow-x-auto" style={{ borderColor: "var(--border)" }}>
              {[
                { id: "overview", label: "Overview" },
                { id: "estimate", label: "Cost Breakdown" },
                { id: "challenges", label: "Challenges" },
                { id: "next", label: "Next Steps" },
              ].map(t => (
                <button key={t.id} onClick={() => setPlanTab(t.id)}
                  className="px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap"
                  style={{
                    color: planTab === t.id ? "#D85A30" : "var(--fg-tertiary)",
                    borderBottom: planTab === t.id ? "2px solid #D85A30" : "2px solid transparent",
                    marginBottom: -1,
                  }}>{t.label}</button>
              ))}
            </div>

            {/* OVERVIEW TAB */}
            {planTab === "overview" && (
              <div className="space-y-4">
                {/* Codes */}
                <div className={card} style={cardS}>
                  <div className="text-xs font-semibold mb-3">📋 Applicable Codes ({plan.codes.length})</div>
                  <div className="space-y-2">
                    {plan.codes.slice(0, 5).map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.priority === "critical" ? "#dc3545" : c.priority === "high" ? "#f0a500" : "#1D9E75" }} />
                          <span className="font-medium">{c.code}</span>
                          <span style={{ color: "var(--fg-tertiary)" }}>{c.title}</span>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded-full capitalize"
                          style={{ background: c.priority === "critical" ? "#fecaca" : c.priority === "high" ? "#fef3c7" : "#d1fae5", color: c.priority === "critical" ? "#991b1b" : c.priority === "high" ? "#92400e" : "#065f46" }}>
                          {c.priority}
                        </span>
                      </div>
                    ))}
                    {plan.codes.length > 5 && (
                      <div className="text-[10px] text-center pt-1" style={{ color: "var(--fg-tertiary)" }}>
                        +{plan.codes.length - 5} more codes — see full list in Smart Project Launcher
                      </div>
                    )}
                  </div>
                </div>

                {/* Team */}
                <div className={card} style={cardS}>
                  <div className="text-xs font-semibold mb-3">👥 Recommended Team ({plan.team.length})</div>
                  <div className="grid grid-cols-2 gap-2">
                    {plan.team.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.required ? "#1D9E75" : "var(--border)" }} />
                        <span className={t.required ? "font-medium" : ""} style={{ color: t.required ? "var(--fg)" : "var(--fg-tertiary)" }}>{t.role}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Permits */}
                <div className={card} style={cardS}>
                  <div className="text-xs font-semibold mb-3">📄 Permits Required ({plan.permits.length})</div>
                  <div className="space-y-2">
                    {plan.permits.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="font-medium">{p.type}</span>
                        <div className="flex items-center gap-2">
                          <span style={{ color: "var(--fg-tertiary)" }}>{p.timeline}</span>
                          <span style={{ color: "var(--fg-tertiary)" }}>{p.fee}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ESTIMATE TAB */}
            {planTab === "estimate" && (
              <div>
                <div className="mb-4 p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>Total estimated cost</div>
                      <div className="text-3xl font-semibold" style={{ color: "var(--accent)" }}><AnimCounter value={plan.totalCost} prefix="$" /></div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>Cost per sf</div>
                      <div className="text-lg font-medium"><AnimCounter value={plan.costPerSf} prefix="$" suffix="/sf" /></div>
                    </div>
                  </div>
                  {plan.input.budget && (
                    <div className="mt-3 pt-3 border-t text-[11px]" style={{ borderColor: "var(--border)" }}>
                      {plan.totalCost <= plan.input.budget ? (
                        <span style={{ color: "#1D9E75" }}>✅ Within your ${plan.input.budget.toLocaleString()} budget — ${(plan.input.budget - plan.totalCost).toLocaleString()} cushion</span>
                      ) : (
                        <span style={{ color: "#dc3545" }}>⚠️ ${(plan.totalCost - plan.input.budget).toLocaleString()} over your ${plan.input.budget.toLocaleString()} budget — consider economy quality or reducing scope</span>
                      )}
                    </div>
                  )}
                </div>
                {plan.estimate.map((e, i) => {
                  const maxAmt = Math.max(...plan.estimate.map(x => x.amount));
                  const pct = (e.amount / maxAmt) * 100;
                  return (
                    <div key={i} className="py-2 border-b" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{e.division}</span>
                        <span className="text-xs font-medium"><AnimCounter value={e.amount} prefix="$" /></span>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ background: "var(--bg-tertiary)" }}>
                        <div className="h-full rounded-full" style={{ background: "#D85A30", width: `${pct}%`, animation: "progressFill 0.8s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CHALLENGES TAB */}
            {planTab === "challenges" && (
              <div className="space-y-3">
                {plan.challenges.map((c, i) => (
                  <div key={i} className={card} style={{ ...cardS, borderLeft: "3px solid #BA7517" }}>
                    <div className="flex items-start gap-3">
                      <span className="text-lg">⚠️</span>
                      <div className="text-[12px] leading-relaxed" style={{ color: "var(--fg-secondary)" }}>{c}</div>
                    </div>
                  </div>
                ))}
                <div className={card} style={{ ...cardS, borderLeft: "3px solid var(--accent)" }}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg">💡</span>
                    <div className="text-[12px] leading-relaxed" style={{ color: "var(--fg-secondary)" }}>
                      The AI Copilot can answer specific questions about any of these challenges. Ask about codes, costs, or local requirements.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NEXT STEPS TAB */}
            {planTab === "next" && (
              <div className="space-y-3">
                {plan.nextSteps.map((s, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: "#1D9E75" }}>{i + 1}</div>
                    <div className="text-[12px] leading-relaxed pt-1" style={{ color: "var(--fg-secondary)" }}>{s}</div>
                  </div>
                ))}
              </div>
            )}

            {/* CTA: Start this project */}
            <div className="mt-8 p-6 rounded-2xl text-center"
              style={{ background: "linear-gradient(135deg, #1D9E7510, #0F6E5610)", border: "2px solid var(--accent)" }}>
              <h3 className="text-lg font-semibold mb-2">Ready to make this real?</h3>
              <p className="text-[12px] mb-4" style={{ color: "var(--fg-secondary)" }}>
                Convert this dream into a full project with detailed scheduling, compliance tracking, team assembly, and AI-powered management.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={`/launch?type=${plan.input.buildingType || ""}&jurisdiction=${plan.input.location || ""}&sqft=${plan.sqft}`}
                  className="px-6 py-3 rounded-full text-white text-sm font-medium transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg, #1D9E75, #0F6E56)", boxShadow: "0 4px 20px rgba(29,158,117,0.3)" }}>
                  🚀 Start This Project — Pro ($49/mo)
                </Link>
                <button onClick={reset}
                  className="px-6 py-3 rounded-full text-sm font-medium border transition-all hover:scale-105"
                  style={{ borderColor: "var(--border)", color: "var(--fg-secondary)" }}>
                  💭 Dream Again
                </button>
              </div>
              <p className="text-[9px] mt-3" style={{ color: "var(--fg-tertiary)" }}>
                Dream Builder is free forever · Pro unlocks full project management
              </p>
            </div>

            {/* Share link */}
            <div className="mt-4 text-center">
              <button onClick={shareDream}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium transition-all px-4 py-2 rounded-full border"
                style={{
                  color: copied ? "var(--accent)" : "#7F77DD",
                  borderColor: copied ? "var(--accent)" : "#7F77DD40",
                  background: copied ? "var(--accent-bg)" : "transparent",
                }}>
                {copied ? <><Check size={12} /> Link copied!</> : <><Link2 size={12} /> Share this dream plan</>}
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-[10px] border-t"
        style={{ borderColor: "var(--border)", color: "var(--fg-tertiary)" }}>
        The Builder&apos;s Knowledge Garden · Dream it. Plan it. Build it.
        <br />DREAM → DESIGN → PLAN → BUILD → DELIVER → GROW
      </footer>

      <CopilotPanel
        buildingType={plan?.input.buildingTypeMatch?.name}
        jurisdiction={plan?.input.locationMatch?.name}
      />
    </div>
  );
}
