"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  BUILDING_TYPES,
} from "@/lib/knowledge-data";
import { parseDream, generateDreamPlan, DreamPlan } from "@/lib/dream-parser";
import { VisionAnalysis } from "@/app/api/v1/dream-vision/route";
import { NarrateResponse } from "@/app/api/v1/dream-narrate/route";
import {
  ARCHITECTURE_STYLES,
  SURPRISE_CONCEPTS_EXPANDED,
} from "@/lib/architecture-styles";
import Link from "next/link";
import CopilotPanel from "@/components/CopilotPanel";
import { GamificationStyles } from "@/components/Gamification";

// ═══════════════════════════════════════════════════════════════
// FAMOUS REFERENCES — iconic homes people know by feel or name
// ═══════════════════════════════════════════════════════════════
const FAMOUS_REFS = [
  { label: "Fallingwater vibes", icon: "🌊", desc: "A cantilevered home over a waterfall. Organic architecture merging stone, concrete, and nature. Frank Lloyd Wright's masterpiece — horizontal lines, natural materials, total integration with the landscape." },
  { label: "Glass House minimalism", icon: "🪟", desc: "An all-glass pavilion floating in the landscape. Steel frame, floor-to-ceiling glass on all sides, no internal walls. Mies van der Rohe purity — light, openness, and the outdoors as the interior." },
  { label: "Malibu beach house", icon: "🌊", desc: "A California coastal modern home. Warm timber, white plaster, massive sliding glass walls opening to the ocean. Outdoor shower, rooftop deck, infinity pool merging with the Pacific horizon." },
  { label: "Cribs-style mansion", icon: "🎤", desc: "A luxury estate with a grand entrance, 8+ bedrooms, home theater, recording studio, indoor basketball court, infinity pool, and a 10-car garage. Maximum impact, maximum amenity." },
  { label: "Tuscan villa", icon: "🍷", desc: "A stone farmhouse in the Italian countryside. Clay tile roof, exposed timber beams, terracotta floors, arched doorways. Courtyard with olive trees, outdoor pizza oven, wine cellar underground." },
  { label: "Tokyo apartment", icon: "🏙️", desc: "A compact modern apartment with Japanese spatial efficiency. Sliding shoji screens, built-in everything, soaking tub in a zen bathroom, a small engawa terrace overlooking the city." },
  { label: "Scandinavian forest cabin", icon: "🌲", desc: "A Nordic black-stained timber cabin in a pine forest. Pitched roof with overhang, wood-burning sauna, triple-glazed panoramic windows, radiant floor heating, and simple white interiors." },
  { label: "Succession penthouse", icon: "🏢", desc: "A Manhattan penthouse for a billionaire dynasty. Dark walnut paneling, leather, brass fixtures, library with rolling ladder, corner office with 270-degree city views, private rooftop terrace." },
];

type Phase = "welcome" | "mode" | "adventure" | "tell" | "show" | "browse" | "surprise" | "generating" | "result";
type DreamMode = "macro" | "micro" | null;

// Browse & Pick style categories — exterior uses style guide data, others are freeform
const BROWSE_CATEGORIES = [
  { id: "style", icon: "🏠", label: "Architectural style", useStyleGuide: true },
  { id: "roofing", icon: "🛖", label: "Roofing", examples: ["Flat", "Gable", "Hip", "Metal standing seam", "Clay tile", "Green roof", "Butterfly", "Shed"] },
  { id: "windows", icon: "🪟", label: "Windows & light", examples: ["Floor-to-ceiling", "Skylights", "Clerestory", "Bay windows", "Minimal slits", "Stained glass", "Corner windows"] },
  { id: "kitchen", icon: "🍳", label: "Kitchen", examples: ["Chef's kitchen", "Open concept", "Galley", "Island-centric", "Butler's pantry", "Outdoor kitchen", "Scullery"] },
  { id: "bathroom", icon: "🛁", label: "Bathroom", examples: ["Spa-like", "Walk-in shower", "Freestanding tub", "Double vanity", "Japanese soaking", "Outdoor shower", "Steam room"] },
  { id: "outdoor", icon: "🌳", label: "Outdoor living", examples: ["Wraparound porch", "Rooftop deck", "Courtyard", "Fire pit", "Pergola", "Outdoor kitchen", "Cabana"] },
  { id: "pool", icon: "🏊", label: "Pool & water", examples: ["Infinity pool", "Natural pool", "Lap pool", "Hot tub", "Plunge pool", "Koi pond", "Reflecting pool"] },
  { id: "special", icon: "🎬", label: "Special rooms", examples: ["Home theater", "Wine cellar", "Gym", "Library", "Glam room", "Recording studio", "Workshop", "Sauna"] },
];

function DreamPageInner() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("welcome");
  const [mode, setMode] = useState<DreamMode>(null);
  const [dreamText, setDreamText] = useState("");
  const [result, setResult] = useState<DreamPlan | null>(null);
  const [browseSelections, setBrowseSelections] = useState<Record<string, string[]>>({});
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  // Vision / Show Me state
  const [visionAnalysis, setVisionAnalysis] = useState<VisionAnalysis | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [modifier, setModifier] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showSubPath, setShowSubPath] = useState<"menu" | "upload" | "url" | "famous" | "analyzed">("menu");
  // Narration state
  const [narration, setNarration] = useState<NarrateResponse | null>(null);
  const [isNarrating, setIsNarrating] = useState(false);
  // Browse style guide selection
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);

  useEffect(() => {
    setVoiceSupported(typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  // Auto-generate from shared dream link
  useEffect(() => {
    const shared = searchParams.get("dream");
    if (shared) { setDreamText(decodeURIComponent(shared)); setPhase("tell"); }
  }, [searchParams]);

  const generateDream = useCallback((input: string) => {
    setPhase("generating");
    setGenProgress(0);
    setNarration(null);
    const parsed = generateDreamPlan(parseDream(input));
    const intervals = [
      setTimeout(() => setGenProgress(20), 300),
      setTimeout(() => setGenProgress(45), 800),
      setTimeout(() => setGenProgress(70), 1500),
      setTimeout(() => setGenProgress(90), 2200),
      setTimeout(() => {
        setGenProgress(100);
        setResult(parsed);
        setPhase("result");
        // Fire narration async — doesn't block result display
        setIsNarrating(true);
        fetch("/api/v1/dream-narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dreamText: input,
            style: parsed.input.style || undefined,
            location: parsed.input.location || undefined,
            sqft: parsed.sqft,
            totalCost: parsed.totalCost,
          }),
        })
          .then(r => r.ok ? r.json() : null)
          .then(data => { if (data) setNarration(data); })
          .catch(() => null)
          .finally(() => setIsNarrating(false));
      }, 2800),
    ];
    return () => intervals.forEach(clearTimeout);
  }, []);

  const generateFromBrowse = useCallback(() => {
    const parts: string[] = [];
    // If a style from the guide was selected, use its dreamSeed
    if (selectedStyleId) {
      const style = ARCHITECTURE_STYLES.find(s => s.id === selectedStyleId);
      if (style) parts.push(style.dreamSeed);
    }
    Object.entries(browseSelections).forEach(([cat, items]) => {
      if (items.length > 0 && cat !== "style") parts.push(`${cat}: ${items.join(", ")}`);
    });
    const desc = parts.join(". ");
    setDreamText(desc);
    generateDream(desc);
  }, [browseSelections, selectedStyleId, generateDream]);

  const startVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = false; recognition.interimResults = true; recognition.lang = "en-US";
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
      setDreamText(transcript);
      if (e.results[e.results.length - 1].isFinal) setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  }, []);

  // ─── VISION ANALYSIS ────────────────────────────────────────────
  const analyzeReference = useCallback(async (type: "base64" | "url" | "text", data: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch("/api/v1/dream-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data, modifier }),
      });
      if (!res.ok) throw new Error("Vision API failed");
      const json = await res.json();
      setVisionAnalysis(json.analysis);
      setShowSubPath("analyzed");
    } catch {
      setAnalysisError("Couldn't analyze that reference. Try describing it in words instead.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [modifier]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      analyzeReference("base64", dataUrl);
    };
    reader.readAsDataURL(file);
  }, [analyzeReference]);

  const generateFromVision = useCallback(() => {
    if (!visionAnalysis) return;
    const fullText = modifier
      ? `${visionAnalysis.dreamText} Additionally: ${modifier}`
      : visionAnalysis.dreamText;
    setDreamText(fullText);
    generateDream(fullText);
  }, [visionAnalysis, modifier, generateDream]);

  const toggleBrowseItem = (categoryId: string, item: string) => {
    setBrowseSelections(prev => {
      const current = prev[categoryId] || [];
      return { ...prev, [categoryId]: current.includes(item) ? current.filter(i => i !== item) : [...current, item] };
    });
  };

  const totalSelections = Object.values(browseSelections).flat().length + (selectedStyleId ? 1 : 0);

  // Derived data for results — DreamPlan already has codes/permits/team/estimate computed
  const bt = result ? BUILDING_TYPES.find(b => b.id === result.input.buildingType) || BUILDING_TYPES[0] : null;
  const codes = result ? result.codes : [];
  const permits = result ? result.permits : [];
  const team = result ? result.team : [];
  const estimate = result ? result.estimate.map(e => ({ name: e.division, amount: e.amount })) : [];
  const totalCost = result ? result.totalCost : 0;

  const goBack = () => {
    if (phase === "show" && showSubPath !== "menu") {
      setShowSubPath("menu"); setVisionAnalysis(null); setImagePreview(null); setAnalysisError(null);
    } else if (phase === "tell" || phase === "show" || phase === "browse" || phase === "surprise") setPhase("adventure");
    else if (phase === "adventure") setPhase("mode");
    else if (phase === "mode") setPhase("welcome");
    else if (phase === "result") setPhase("adventure");
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <GamificationStyles />

      {/* Top Bar */}
      <nav className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs" style={{ background: "linear-gradient(135deg, #D85A30, #BA7517)" }}>💭</div>
          <span className="font-semibold text-sm">Dream Builder</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#1D9E7520", color: "#1D9E75" }}>Free</span>
        </Link>
        {phase !== "welcome" && phase !== "generating" && (
          <button onClick={goBack} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all hover:bg-[var(--bg-secondary)]" style={{ borderColor: "var(--border)", color: "var(--fg-secondary)" }}>
            ← Back
          </button>
        )}
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">

        {/* ═══════════════════════════════════════════════════════ */}
        {/* WELCOME — The superhero moment                        */}
        {/* ═══════════════════════════════════════════════════════ */}
        {phase === "welcome" && (
          <div className="text-center" style={{ animation: "slideUp 0.4s ease" }}>
            <div className="text-5xl mb-6">🏗️</div>
            <h1 className="text-3xl font-semibold mb-3">You've been invited to dream</h1>
            <p className="text-base mb-2" style={{ color: "var(--fg-secondary)", maxWidth: 480, margin: "0 auto 8px" }}>
              with the force-multiplier powers of AI.
            </p>
            <p className="text-sm mb-8" style={{ color: "var(--fg-tertiary)", maxWidth: 440, margin: "0 auto" }}>
              Your dream becomes the dream of a superhero — one who knows every building code, every material, every cost, in every jurisdiction on earth. Dream big. We&apos;ll get realistic later.
            </p>

            <div className="flex gap-3 justify-center mb-8">
              {["🏡", "🏢", "🏰", "🌿", "🏖️"].map((e, i) => (
                <div key={i} className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", animation: `slideUp ${0.3 + i * 0.1}s ease` }}>{e}</div>
              ))}
            </div>

            <button onClick={() => setPhase("mode")} className="px-8 py-3.5 rounded-full text-white text-sm font-medium transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #D85A30, #BA7517)" }}>
              Start dreaming →
            </button>

            <p className="text-[10px] mt-6" style={{ color: "var(--fg-tertiary)" }}>
              No signup required · Free · Takes 60 seconds · Shareable
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* MODE — Macro vs Micro manager                         */}
        {/* ═══════════════════════════════════════════════════════ */}
        {phase === "mode" && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold mb-2">How much control do you want?</h2>
              <p className="text-sm" style={{ color: "var(--fg-secondary)" }}>You can always switch later. This just sets the starting vibe.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              <button onClick={() => { setMode("macro"); setPhase("adventure"); }}
                className="p-6 rounded-2xl border-2 text-left transition-all hover:scale-[1.02]"
                style={{ borderColor: mode === "macro" ? "#7F77DD" : "var(--border)", background: mode === "macro" ? "#7F77DD08" : "var(--bg-secondary)" }}>
                <div className="text-3xl mb-3">🎯</div>
                <div className="text-lg font-semibold mb-1">Macro manager</div>
                <div className="text-xs" style={{ color: "var(--fg-secondary)", lineHeight: 1.6 }}>
                  Describe the vibe. I&apos;ll fill in best-in-class details for every category. You review and adjust.
                </div>
                <div className="mt-3 text-[10px] px-3 py-1 rounded-full inline-block" style={{ background: "#7F77DD15", color: "#7F77DD" }}>Recommended for first-timers</div>
              </button>
              <button onClick={() => { setMode("micro"); setPhase("adventure"); }}
                className="p-6 rounded-2xl border-2 text-left transition-all hover:scale-[1.02]"
                style={{ borderColor: mode === "micro" ? "#D85A30" : "var(--border)", background: mode === "micro" ? "#D85A3008" : "var(--bg-secondary)" }}>
                <div className="text-3xl mb-3">🔧</div>
                <div className="text-lg font-semibold mb-1">Micro manager</div>
                <div className="text-xs" style={{ color: "var(--fg-secondary)", lineHeight: 1.6 }}>
                  I know what I want. Let me pick every detail — style, materials, layout, features. Full creative control.
                </div>
                <div className="mt-3 text-[10px] px-3 py-1 rounded-full inline-block" style={{ background: "#D85A3015", color: "#D85A30" }}>For design-savvy dreamers</div>
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ADVENTURE — Choose your entry path                    */}
        {/* ═══════════════════════════════════════════════════════ */}
        {phase === "adventure" && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold mb-2">How do you want to dream?</h2>
              <p className="text-sm" style={{ color: "var(--fg-secondary)" }}>Pick your adventure. You can combine paths — there are no wrong answers.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
              {[
                { id: "tell" as Phase, icon: "🗣️", title: "Tell me", sub: "Speak or type what you want. \"I want a modern farmhouse with tall ceilings in Asheville.\"", color: "#BA7517", tag: "Voice + text" },
                { id: "show" as Phase, icon: "📷", title: "Show me", sub: "Upload a photo, paste a URL, or describe something you saw. \"Like that house from Architectural Digest.\"", color: "#D85A30", tag: "Photo + reference" },
                { id: "browse" as Phase, icon: "🎨", title: "Browse & pick", sub: "Visual moodboard builder. Explore styles for every category. Pinterest meets Architectural Digest.", color: "#7F77DD", tag: "Visual explorer" },
                { id: "surprise" as Phase, icon: "✨", title: "Surprise me", sub: "AI generates 3 dream concepts for you to react to. Like a movie trailer for your future home.", color: "#1D9E75", tag: "AI-generated" },
              ].map(path => (
                <button key={path.id} onClick={() => setPhase(path.id)}
                  className="p-5 rounded-2xl border text-left transition-all hover:scale-[1.02] hover:shadow-sm"
                  style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                  <div className="text-3xl mb-3">{path.icon}</div>
                  <div className="text-base font-semibold mb-1">{path.title}</div>
                  <div className="text-[11px] mb-3" style={{ color: "var(--fg-secondary)", lineHeight: 1.6 }}>{path.sub}</div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: path.color + "12", color: path.color }}>{path.tag}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-[10px] mt-6" style={{ color: "var(--fg-tertiary)" }}>
              💡 Blue sky mode: Dream big first. We&apos;ll help you get realistic about costs and compromises later.
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TELL — Voice + text input                             */}
        {/* ═══════════════════════════════════════════════════════ */}
        {phase === "tell" && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold mb-2">Tell me your dream</h2>
              <p className="text-sm" style={{ color: "var(--fg-secondary)" }}>Describe it in your own words. Use a famous reference, a vibe, a place. Nothing is too vague.</p>
            </div>
            <div className="relative max-w-xl mx-auto">
              <textarea
                value={dreamText}
                onChange={e => setDreamText(e.target.value)}
                placeholder="I want a modern farmhouse in Asheville with tall ceilings, a wraparound porch, and a chef's kitchen..."
                className="w-full rounded-2xl border p-4 text-sm resize-none"
                style={{ borderColor: "var(--border)", background: "var(--bg-secondary)", color: "var(--fg)", minHeight: 140, outline: "none" }}
                autoFocus
              />
              {voiceSupported && (
                <button onClick={startVoice}
                  className="absolute bottom-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: isListening ? "#D85A30" : "var(--bg)", border: "1px solid var(--border)" }}
                  title="Voice input">
                  <span className="text-base">{isListening ? "🔴" : "🎙️"}</span>
                </button>
              )}
            </div>
            {isListening && (
              <p className="text-center text-xs mt-2" style={{ color: "#D85A30", animation: "pulse 1s infinite" }}>Listening... speak naturally</p>
            )}
            <div className="mt-4 max-w-xl mx-auto">
              <p className="text-xs mb-2" style={{ color: "var(--fg-tertiary)" }}>Try one of these:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "A Japanese-inspired house in the Pacific Northwest with floor-to-ceiling glass and an indoor garden",
                  "Something like the house from Architectural Digest with the massive windows — modern but warm",
                  "A rapper's dream home in Miami — pool, outdoor kitchen, recording studio, 6 bedrooms",
                  "Scandinavian minimalist cabin. Off-grid. Solar. Sauna. Forest setting.",
                  "I want to build what I saw on a trip to Tuscany — stone walls, terracotta, olive trees",
                ].map((ex, i) => (
                  <button key={i} onClick={() => setDreamText(ex)}
                    className="text-[10px] px-3 py-1.5 rounded-full border transition-all hover:bg-[var(--bg-secondary)]"
                    style={{ borderColor: "var(--border)", color: "var(--fg-secondary)" }}>
                    {ex.substring(0, 50)}...
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-center mt-6">
              <button onClick={() => dreamText.trim() && generateDream(dreamText)}
                disabled={!dreamText.trim()}
                className="px-8 py-3 rounded-full text-white text-sm font-medium transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #D85A30, #BA7517)" }}>
                Generate my dream plan →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* SHOW — Photo / URL / Famous reference + Vision AI    */}
        {/* ═══════════════════════════════════════════════════════ */}
        {phase === "show" && (
          <div style={{ animation: "slideUp 0.3s ease" }}>

            {/* ── MENU ── */}
            {showSubPath === "menu" && (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-semibold mb-2">Show me what you love</h2>
                  <p className="text-sm" style={{ color: "var(--fg-secondary)" }}>Upload a photo, paste a URL, or pick a famous reference. Claude analyzes the style and builds your plan from it.</p>
                </div>
                <div className="max-w-xl mx-auto space-y-3">
                  {/* Upload */}
                  <label className="block p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-sm"
                    style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">📸</span>
                      <div>
                        <div className="text-sm font-semibold mb-0.5">Upload a photo</div>
                        <div className="text-xs" style={{ color: "var(--fg-secondary)" }}>A screenshot, magazine photo, or anything you love. Claude Vision reads the style, materials, and layout.</div>
                      </div>
                      <span className="ml-auto text-[10px] px-2.5 py-1 rounded-full shrink-0" style={{ background: "#D85A3012", color: "#D85A30" }}>AI Vision ✦</span>
                    </div>
                  </label>
                  {/* URL */}
                  <button onClick={() => setShowSubPath("url")}
                    className="w-full p-5 rounded-2xl border text-left transition-all hover:scale-[1.01] hover:shadow-sm"
                    style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">🔗</span>
                      <div>
                        <div className="text-sm font-semibold mb-0.5">Paste an image URL</div>
                        <div className="text-xs" style={{ color: "var(--fg-secondary)" }}>A direct link to any publicly accessible image. Architectural Digest, Dezeen, Pinterest, Zillow listing photo.</div>
                      </div>
                      <span className="ml-auto text-[10px] px-2.5 py-1 rounded-full shrink-0" style={{ background: "#7F77DD12", color: "#7F77DD" }}>AI Vision ✦</span>
                    </div>
                  </button>
                  {/* Famous */}
                  <button onClick={() => setShowSubPath("famous")}
                    className="w-full p-5 rounded-2xl border text-left transition-all hover:scale-[1.01] hover:shadow-sm"
                    style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">🏆</span>
                      <div>
                        <div className="text-sm font-semibold mb-0.5">Famous references</div>
                        <div className="text-xs" style={{ color: "var(--fg-secondary)" }}>Fallingwater, the Succession penthouse, a Cribs mansion, a Tuscan villa. Pick one and we build from its DNA.</div>
                      </div>
                      <span className="ml-auto text-[10px] px-2.5 py-1 rounded-full shrink-0" style={{ background: "#1D9E7512", color: "#1D9E75" }}>8 references</span>
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* ── ANALYZING OVERLAY ── */}
            {isAnalyzing && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4" style={{ animation: "pulse 1.2s infinite" }}>🧠</div>
                <div className="text-base font-semibold mb-2">Claude is reading the image...</div>
                <p className="text-xs" style={{ color: "var(--fg-secondary)" }}>Detecting style · materials · layout · spatial features</p>
              </div>
            )}

            {/* ── URL INPUT ── */}
            {showSubPath === "url" && !isAnalyzing && (
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold mb-2">Paste an image URL</h2>
                  <p className="text-xs" style={{ color: "var(--fg-secondary)" }}>Any direct link to a publicly accessible image. Dezeen, Architectural Digest, Houzz, Zillow, etc.</p>
                </div>
                <input type="url" value={referenceUrl} onChange={e => setReferenceUrl(e.target.value)}
                  placeholder="https://example.com/amazing-house.jpg"
                  className="w-full p-4 rounded-2xl border text-sm mb-4"
                  style={{ borderColor: "var(--border)", background: "var(--bg-secondary)", color: "var(--fg)", outline: "none" }}
                  autoFocus
                />
                {analysisError && <p className="text-xs text-center mb-3" style={{ color: "#D85A30" }}>{analysisError}</p>}
                <div className="flex justify-center">
                  <button onClick={() => referenceUrl.trim() && analyzeReference("url", referenceUrl.trim())}
                    disabled={!referenceUrl.trim()}
                    className="px-8 py-3 rounded-full text-white text-sm font-medium transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #7F77DD, #5B54CC)" }}>
                    Analyze with Claude Vision →
                  </button>
                </div>
              </div>
            )}

            {/* ── FAMOUS REFERENCES ── */}
            {showSubPath === "famous" && !isAnalyzing && (
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-5">
                  <h2 className="text-xl font-semibold mb-2">Famous references</h2>
                  <p className="text-xs" style={{ color: "var(--fg-secondary)" }}>Pick the one that speaks to you — or the one closest to your dream.</p>
                </div>
                <div className="space-y-3">
                  {ARCHITECTURE_STYLES.slice(0, 8).map((style, i) => (
                    <button key={i} onClick={() => analyzeReference("text", style.dreamSeed)}
                      className="w-full p-4 rounded-2xl border text-left transition-all hover:scale-[1.01] hover:shadow-sm"
                      style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="flex gap-0.5">
                          {style.palette.slice(0,3).map((c,j) => <div key={j} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
                        </div>
                        <span className="text-sm font-semibold">{style.emoji} {style.name}</span>
                        <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg-tertiary)" }}>{style.era}</span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--fg-secondary)" }}>{style.tagline}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── ANALYSIS RESULT ── */}
            {showSubPath === "analyzed" && visionAnalysis && !isAnalyzing && (
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-5">
                  <div className="text-xs font-medium mb-1" style={{ color: "#D85A30" }}>✦ Claude&apos;s reading</div>
                  <h2 className="text-xl font-semibold">Here&apos;s what I see</h2>
                </div>

                {/* Image preview if uploaded */}
                {imagePreview && (
                  <div className="mb-4 rounded-2xl overflow-hidden" style={{ maxHeight: 200 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Your reference" className="w-full object-cover" style={{ maxHeight: 200 }} />
                  </div>
                )}

                {/* Analysis card */}
                <div className="p-5 rounded-2xl border mb-4" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="text-base font-semibold">{visionAnalysis.style}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>{visionAnalysis.era} · {visionAnalysis.region}</div>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full shrink-0" style={{ background: visionAnalysis.confidence === "high" ? "#1D9E7515" : "#BA751715", color: visionAnalysis.confidence === "high" ? "#1D9E75" : "#BA7517" }}>
                      {visionAnalysis.confidence} confidence
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--fg-secondary)" }}>{visionAnalysis.vibe}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] font-semibold mb-1.5" style={{ color: "var(--fg-tertiary)" }}>MATERIALS</div>
                      <div className="flex flex-wrap gap-1">
                        {visionAnalysis.materials.map((m, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>{m}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold mb-1.5" style={{ color: "var(--fg-tertiary)" }}>KEY FEATURES</div>
                      <div className="flex flex-wrap gap-1">
                        {visionAnalysis.features.slice(0, 4).map((f, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Like this but... */}
                <div className="mb-4">
                  <div className="text-xs font-medium mb-2" style={{ color: "var(--fg-secondary)" }}>Like this but... <span style={{ color: "var(--fg-tertiary)", fontWeight: 400 }}>(optional)</span></div>
                  <textarea value={modifier} onChange={e => setModifier(e.target.value)}
                    placeholder="...with a pool. ...but smaller. ...modern interior. ...in Austin, TX. ...add a home office."
                    className="w-full p-3 rounded-xl border text-xs resize-none"
                    style={{ borderColor: "var(--border)", background: "var(--bg-secondary)", color: "var(--fg)", outline: "none", minHeight: 64 }}
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setShowSubPath("menu"); setVisionAnalysis(null); setImagePreview(null); }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-medium border"
                    style={{ borderColor: "var(--border)", color: "var(--fg-secondary)" }}>
                    ← Try another
                  </button>
                  <button onClick={generateFromVision}
                    className="flex-1 py-2.5 rounded-xl text-xs font-medium text-white transition-all hover:scale-105"
                    style={{ background: "linear-gradient(135deg, #D85A30, #BA7517)" }}>
                    Generate my dream plan →
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* BROWSE — Style guide cards + feature chips           */}
        {/* ═══════════════════════════════════════════════════════ */}
        {phase === "browse" && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold mb-2">Build your moodboard</h2>
              <p className="text-sm" style={{ color: "var(--fg-secondary)" }}>Start with a style, then add what you love. No wrong answers.</p>
            </div>

            {/* ── Architectural Style — visual style cards ── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🏛️</span>
                <span className="text-sm font-semibold">Pick an architectural style</span>
                {selectedStyleId && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#1D9E7520", color: "#1D9E75" }}>1 picked</span>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ARCHITECTURE_STYLES.map(style => {
                  const sel = selectedStyleId === style.id;
                  return (
                    <button key={style.id} onClick={() => setSelectedStyleId(sel ? null : style.id)}
                      className="p-3 rounded-xl border text-left transition-all hover:scale-[1.01]"
                      style={{ borderColor: sel ? "#7F77DD" : "var(--border)", background: sel ? "#7F77DD08" : "var(--bg-secondary)" }}>
                      {/* Palette strip */}
                      <div className="flex gap-0.5 mb-2">
                        {style.palette.map((c, j) => <div key={j} className="h-1.5 rounded-full flex-1" style={{ background: c }} />)}
                      </div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">{style.emoji}</span>
                        <span className="text-xs font-semibold">{style.name}</span>
                        {sel && <span className="ml-auto text-[10px]" style={{ color: "#7F77DD" }}>✓</span>}
                      </div>
                      <p className="text-[10px] leading-relaxed" style={{ color: "var(--fg-tertiary)" }}>{style.tagline}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Feature categories — chips ── */}
            <div className="space-y-4">
              {BROWSE_CATEGORIES.filter(c => !c.useStyleGuide).map(cat => (
                <div key={cat.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{cat.icon}</span>
                    <span className="text-xs font-semibold">{cat.label}</span>
                    {(browseSelections[cat.id] || []).length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#1D9E7520", color: "#1D9E75" }}>
                        {(browseSelections[cat.id] || []).length}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(cat.examples || []).map(item => {
                      const sel = (browseSelections[cat.id] || []).includes(item);
                      return (
                        <button key={item} onClick={() => toggleBrowseItem(cat.id, item)}
                          className="px-2.5 py-1 rounded-full text-[11px] border transition-all"
                          style={{ borderColor: sel ? "#7F77DD" : "var(--border)", background: sel ? "#7F77DD15" : "transparent", color: sel ? "#7F77DD" : "var(--fg-secondary)", fontWeight: sel ? 600 : 400 }}>
                          {sel ? "✓ " : ""}{item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-6 flex justify-center mt-8">
              <button onClick={generateFromBrowse} disabled={totalSelections < 1}
                className="px-8 py-3.5 rounded-full text-white text-sm font-medium transition-all hover:scale-105 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: totalSelections >= 1 ? "linear-gradient(135deg, #7F77DD, #5B54CC)" : "var(--fg-tertiary)" }}>
                {totalSelections < 1 ? "Pick at least one thing" : `Generate plan from ${totalSelections} selection${totalSelections !== 1 ? "s" : ""} →`}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* SURPRISE — 9 concepts in a 3×3 grid                  */}
        {/* ═══════════════════════════════════════════════════════ */}
        {phase === "surprise" && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold mb-2">Your AI dream trailers</h2>
              <p className="text-sm" style={{ color: "var(--fg-secondary)" }}>Nine concepts. Pick the one that makes your heart beat faster.</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {SURPRISE_CONCEPTS_EXPANDED.map((concept, i) => {
                const styleData = ARCHITECTURE_STYLES.find(s => s.id === concept.style);
                return (
                  <button key={i}
                    onClick={() => { setDreamText(concept.vibe); generateDream(concept.vibe); }}
                    className="p-4 rounded-2xl border text-left transition-all hover:scale-[1.01] hover:shadow-sm"
                    style={{ borderColor: "var(--border)", background: "var(--bg-secondary)", borderLeft: `3px solid ${concept.color}` }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          {styleData && <span className="text-sm">{styleData.emoji}</span>}
                          <span className="text-sm font-semibold">{concept.title}</span>
                        </div>
                        {styleData && (
                          <div className="flex gap-0.5 mt-1">
                            {styleData.palette.slice(0,4).map((c,j) => <div key={j} className="w-3 h-1.5 rounded-full" style={{ background: c }} />)}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full shrink-0" style={{ background: concept.color + "15", color: concept.color }}>~{concept.sqft.toLocaleString()} sf</span>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--fg-secondary)" }}>{concept.vibe}</p>
                  </button>
                );
              })}
            </div>
            <div className="text-center mt-6">
              <button onClick={() => setPhase("tell")} className="text-xs underline" style={{ color: "var(--fg-tertiary)" }}>
                None of these? Describe your own →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* GENERATING — Animated progress screen                 */}
        {/* ═══════════════════════════════════════════════════════ */}
        {phase === "generating" && (
          <div className="text-center py-16" style={{ animation: "slideUp 0.3s ease" }}>
            <div className="text-5xl mb-6" style={{ animation: "pulse 1.5s infinite" }}>🧠</div>
            <h2 className="text-xl font-semibold mb-2">Building your dream plan...</h2>
            <p className="text-sm mb-8" style={{ color: "var(--fg-secondary)" }}>Checking codes · estimating costs · mapping the journey</p>
            <div className="max-w-xs mx-auto rounded-full overflow-hidden h-2 mb-3" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${genProgress}%`, background: "linear-gradient(90deg, #D85A30, #BA7517, #1D9E75)" }} />
            </div>
            <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
              {genProgress < 25 ? "Parsing your dream..." : genProgress < 50 ? "Matching building codes..." : genProgress < 75 ? "Generating cost estimates..." : genProgress < 95 ? "Assembling your plan..." : "Almost ready..."}
            </p>
            <div className="mt-8 flex justify-center gap-6 opacity-30">
              {["📐","🏗️","💰","📋","🔑"].map((e, i) => (
                <span key={i} className="text-2xl" style={{ animation: `slideUp ${0.3 + i * 0.15}s ease` }}>{e}</span>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* RESULT — Full dream plan output                       */}
        {/* ═══════════════════════════════════════════════════════ */}
        {phase === "result" && result && bt && (
          <div style={{ animation: "slideUp 0.4s ease" }}>
            {/* Header */}
            <div className="mb-6 p-5 rounded-2xl" style={{ background: "linear-gradient(135deg, #D85A3010, #BA751706)", border: "1.5px solid #D85A3025" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium mb-1" style={{ color: "#D85A30" }}>Your Dream Plan</div>
                  <h2 className="text-xl font-semibold leading-tight">{bt.name} in {result.input.location || "your location"}</h2>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {result.sqft && <span className="text-xs px-3 py-1 rounded-full" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>{result.sqft.toLocaleString()} sqft</span>}
                    {result.input.style && <span className="text-xs px-3 py-1 rounded-full" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>{result.input.style} style</span>}
                    {result.input.budget && <span className="text-xs px-3 py-1 rounded-full" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>${result.input.budget.toLocaleString()} budget</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold" style={{ color: "#1D9E75" }}>${Math.round(totalCost / 1000)}K</div>
                  <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>est. total</div>
                </div>
              </div>
            </div>

            {/* AI Narration — streams in async after result renders */}
            {(isNarrating || narration) && (
              <div className="mb-6 p-5 rounded-2xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                {isNarrating && !narration && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--fg-tertiary)" }}>
                    <span style={{ animation: "pulse 1.2s infinite" }}>✦</span> Writing your story...
                  </div>
                )}
                {narration && (
                  <>
                    <div className="text-[10px] font-semibold mb-3 tracking-widest uppercase" style={{ color: "#D85A30" }}>✦ Your Dream</div>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--fg)" }}>{narration.arrival}</p>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--fg-secondary)" }}>{narration.living}</p>
                    <div className="pt-3 border-t text-xs font-semibold italic" style={{ borderColor: "var(--border)", color: "#D85A30" }}>
                      &ldquo;{narration.tagline}&rdquo;
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Plan Tabs */}
            {(() => {
              const tabs = ["Overview", "Cost Breakdown", "Challenges", "Next Steps"];
              return (
                <>
                  <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
                    {tabs.map((tab, i) => (
                      <button key={tab} onClick={() => setActiveTab(i)}
                        className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all"
                        style={{ background: activeTab === i ? "var(--bg)" : "transparent", color: activeTab === i ? "var(--fg)" : "var(--fg-tertiary)", boxShadow: activeTab === i ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* OVERVIEW TAB */}
                  {activeTab === 0 && (
                    <div className="space-y-4" style={{ animation: "slideUp 0.25s ease" }}>
                      {codes.length > 0 && (
                        <div className="p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                          <div className="text-xs font-semibold mb-3" style={{ color: "#D85A30" }}>📋 Key Code Requirements</div>
                          {codes.slice(0, 4).map((c, i) => (
                            <div key={i} className="flex items-start gap-2 py-1.5 border-b last:border-0 text-xs" style={{ borderColor: "var(--border)" }}>
                              <span style={{ color: "#1D9E75" }}>✓</span>
                              <span style={{ color: "var(--fg-secondary)" }}>{(c as {title: string}).title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {team.length > 0 && (
                        <div className="p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                          <div className="text-xs font-semibold mb-3" style={{ color: "#378ADD" }}>👷 Team You'll Need</div>
                          <div className="flex flex-wrap gap-2">
                            {team.map((t, i) => (
                              <span key={i} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "#378ADD12", color: "#378ADD", border: "1px solid #378ADD25" }}>{(t as {role: string}).role}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {permits.length > 0 && (
                        <div className="p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                          <div className="text-xs font-semibold mb-3" style={{ color: "#BA7517" }}>🏛️ Permits Required</div>
                          {permits.map((p, i) => (
                            <div key={i} className="flex items-start gap-2 py-1.5 border-b last:border-0 text-xs" style={{ borderColor: "var(--border)" }}>
                              <span style={{ color: "#BA7517" }}>→</span>
                              <span style={{ color: "var(--fg-secondary)" }}>{(p as {type: string}).type}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* COST BREAKDOWN TAB */}
                  {activeTab === 1 && (
                    <div className="space-y-3" style={{ animation: "slideUp 0.25s ease" }}>
                      {estimate.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="text-xs w-36 shrink-0" style={{ color: "var(--fg-secondary)" }}>{item.name}</div>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                            <div className="h-full rounded-full" style={{ width: `${(item.amount / totalCost) * 100}%`, background: "linear-gradient(90deg, #1D9E75, #378ADD)" }} />
                          </div>
                          <div className="text-xs font-medium w-16 text-right shrink-0">${Math.round(item.amount / 1000)}K</div>
                        </div>
                      ))}
                      <div className="pt-3 border-t flex justify-between text-sm font-semibold" style={{ borderColor: "var(--border)" }}>
                        <span>Total estimated</span>
                        <span style={{ color: "#1D9E75" }}>${Math.round(totalCost / 1000)}K</span>
                      </div>
                      {result.input.budget && (
                        <div className="p-3 rounded-xl text-xs" style={{ background: "#BA751710", border: "1px solid #BA751730" }}>
                          <span className="font-medium" style={{ color: "#BA7517" }}>Budget note: </span>
                          <span style={{ color: "var(--fg-secondary)" }}>Your stated budget is ${result.input.budget.toLocaleString()}. These are preliminary estimates — a detailed quote will refine this.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CHALLENGES TAB */}
                  {activeTab === 2 && (
                    <div className="space-y-3" style={{ animation: "slideUp 0.25s ease" }}>
                      {[
                        { icon: "⚠️", t: "Permitting timeline", d: `Most jurisdictions take 4–12 weeks for ${bt.name.toLowerCase()} permits. ${result.input.location ? `In ${result.input.location}, ` : ""}factor this into your start date.`, c: "#BA7517" },
                        { icon: "💰", t: "Cost overruns", d: "Construction typically runs 10–20% over initial estimates. Include contingency in your budget from day one.", c: "#D85A30" },
                        { icon: "🔨", t: "Contractor availability", d: "Skilled trades are in high demand. Secure your general contractor and key subs early — before you break ground.", c: "#7F77DD" },
                        { icon: "📐", t: "Design coordination", d: "Coordinating architect, structural engineer, and MEP consultants is critical. A design-build firm can simplify this.", c: "#378ADD" },
                      ].map((ch, i) => (
                        <div key={i} className="p-4 rounded-xl border" style={{ borderColor: "var(--border)", borderLeft: `3px solid ${ch.c}`, background: "var(--bg-secondary)" }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span>{ch.icon}</span>
                            <span className="text-sm font-medium">{ch.t}</span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: "var(--fg-secondary)" }}>{ch.d}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* NEXT STEPS TAB */}
                  {activeTab === 3 && (
                    <div className="space-y-3" style={{ animation: "slideUp 0.25s ease" }}>
                      {[
                        { n: "01", t: "Find your land", d: "Site selection is the first real decision. Location determines codes, costs, and constraints.", c: "#D85A30" },
                        { n: "02", t: "Hire an architect", d: "For a project of this scope, a good architect pays for themselves in value and avoided mistakes.", c: "#7F77DD" },
                        { n: "03", t: "Get a site survey", d: "Topography, setbacks, easements, and utilities must be understood before design begins.", c: "#1D9E75" },
                        { n: "04", t: "Check zoning", d: "Verify your building type and size are allowed. Some features (ADUs, home businesses) need special use permits.", c: "#378ADD" },
                        { n: "05", t: "Start this project →", d: "Turn this dream into a real project with AI-powered codes, scheduling, estimating, and team matching.", c: "#1D9E75", cta: true },
                      ].map((step, i) => (
                        <div key={i} className={`p-4 rounded-xl border ${step.cta ? "cursor-pointer hover:scale-[1.01]" : ""} transition-all`}
                          style={{ borderColor: step.cta ? step.c : "var(--border)", borderLeft: `3px solid ${step.c}`, background: step.cta ? `${step.c}08` : "var(--bg-secondary)" }}
                          onClick={step.cta ? () => window.location.href = `/launch?type=${result.input.buildingType}&location=${encodeURIComponent(result.input.location || "")}` : undefined}>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: step.c, color: "#222" }}>{step.n}</span>
                            <span className="text-sm font-medium" style={{ color: step.cta ? step.c : "var(--fg)" }}>{step.t}</span>
                          </div>
                          <p className="text-xs leading-relaxed ml-8" style={{ color: "var(--fg-secondary)" }}>{step.d}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

            {/* Share + CTA row */}
            <div className="flex gap-3 mt-6 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => { const url = `${window.location.origin}/dream?dream=${encodeURIComponent(dreamText)}`; navigator.clipboard.writeText(url); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all hover:bg-[var(--bg-secondary)]"
                style={{ borderColor: "var(--border)", color: "var(--fg-secondary)" }}>
                📎 Share this dream
              </button>
              <a href={`/launch?type=${result.input.buildingType}&location=${encodeURIComponent(result.input.location || "")}`}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-white text-center transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #1D9E75, #0F6E56)" }}>
                ⚡ Start building →
              </a>
            </div>
          </div>
        )}

      </main>

      <CopilotPanel />
    </div>
  );
}

export default function DreamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-2xl" style={{ animation: "pulse 1.5s infinite" }}>🏗️</div>
      </div>
    }>
      <DreamPageInner />
    </Suspense>
  );
}
