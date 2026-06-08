"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════════
   BUILDER'S KNOWLEDGE GARDEN — HOMEPAGE (client)
   Herbarium design system. Light cream surfaces, specimen-plate mark,
   GC-clarity messaging, the canonical 7-stage lifecycle and 9 lanes.

   Color: herbarium tokens used DIRECTLY (--paper-*, --ink-*, --specimen-*)
   because globals.css overrides the semantic --bg/--accent tokens back to
   the legacy white/green palette. These specimen tokens are NOT overridden.

   Type: Archivo Black (display) + Cormorant Garamond (editorial) + Space
   Mono (engineering labels). The font CSS vars are set on the server
   wrapper in page.tsx; the scoped !important rules below beat the global
   `* { font-family: var(--font-archivo) }` reset in globals.css.
   ═══════════════════════════════════════════════════════════════════ */

// Herbarium palette as CSS-var strings (resolve from src/styles/tokens.css)
const C = {
  cream: "var(--paper-cream)",
  vellum: "var(--paper-vellum)",
  raised: "var(--bg-raised)",
  fold: "var(--paper-fold)",
  edge: "var(--paper-edge)",
  ink: "var(--ink-graphite)",
  sepia: "var(--ink-sepia)",
  faded: "var(--ink-faded)",
  script: "var(--ink-script)",
  teal: "var(--specimen-teal)",
  tealDeep: "var(--specimen-teal-deep)",
  tealPale: "var(--specimen-teal-pale)",
  brass: "var(--specimen-brass)",
  brassAged: "var(--specimen-brass-aged)",
  brassPale: "var(--specimen-brass-pale)",
  sage: "var(--specimen-sage)",
  amber: "var(--specimen-amber)",
};

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const },
};

// ── Canonical 7-stage product lifecycle (src/lib/lifecycle-stages.ts) ──
const STAGES = [
  { n: "01", name: "Size up", desc: "Is this job worth it? Scope, a ballpark cost, and the risk — before you commit." },
  { n: "02", name: "Lock it in", desc: "Turn a yes into a signed scope, a real budget, and a contract." },
  { n: "03", name: "Plan it out", desc: "Schedule, sequencing, permits, and the codes that apply — put in order." },
  { n: "04", name: "Build", desc: "Run the day. Field reports, change orders, and crews — hands-free if you want." },
  { n: "05", name: "Adapt", desc: "When one thing moves, the budget and schedule move with it." },
  { n: "06", name: "Collect", desc: "Draws, invoices, and the money side — tracked against the work." },
  { n: "07", name: "Reflect", desc: "Close out, capture what you learned, and carry it into the next job." },
];

// ── Canonical 9 lanes (src/lib/lens/types.ts · LANE_SLUGS). GC leads — it
//    carries the plan; everyone they invite works free. ──
const LANES = [
  { name: "GC", role: "Runs the job — command center, margin, pipeline, risk", lead: true },
  { name: "Owner", role: "Sees the build clearly — progress, decisions, and spend" },
  { name: "Sub", role: "Scope, schedule, and change orders in one thread" },
  { name: "Supplier", role: "Quotes, submittals, and deliveries tied to the work" },
  { name: "Worker", role: "What to do today — plain language, by voice, any language" },
  { name: "DIY builder", role: "A first project, guided from idea to permit" },
  { name: "Equipment provider", role: "Availability, logistics, and utilization" },
  { name: "Service provider", role: "Architect, engineer, inspector, lender, lawyer, future buyer" },
  { name: "Robot / AI", role: "Agents and drones query the same knowledge over MCP" },
];

// ── Count-up that NEVER rests at 0 ──
// SSR + no-JS renders the real value. On scroll-in it does a brief ramp,
// then settles back on the real value. This is the fix for the old
// SSR-0-that-never-animates counter.
function CountUp({ value, prefix = "", suffix = "", durationMs = 1100 }:
  { value: number; prefix?: string; suffix?: string; durationMs?: number }) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const ran = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !ran.current) {
          ran.current = true;
          let t0: number | null = null;
          const tick = (ts: number) => {
            if (t0 === null) t0 = ts;
            const p = Math.min((ts - t0) / durationMs, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(value * eased);
            if (p < 1) requestAnimationFrame(tick);
            else setDisplay(value);
          };
          requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, durationMs]);
  return (
    <span ref={ref}>
      {prefix}
      {Math.round(display).toLocaleString()}
      {suffix}
    </span>
  );
}

// Engineering label — Space Mono, uppercase, loose tracking
function Eng({ children, color = C.faded, style }:
  { children: React.ReactNode; color?: string; style?: React.CSSProperties }) {
  return (
    <span className="mono" style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color, fontWeight: 700, ...style }}>
      {children}
    </span>
  );
}

export default function HomeClient({ entities, jurisdictions }:
  { entities: number; jurisdictions: number }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const STATS = [
    { value: 17, prefix: "$", suffix: "T", label: "Global construction economy" },
    { value: entities, prefix: "", suffix: "", label: "Cited knowledge entities" },
    { value: jurisdictions, prefix: "", suffix: "", label: "Jurisdictions, California-first" },
    { value: 7, prefix: "", suffix: "", label: "Lifecycle stages, end to end" },
  ];

  const CAPABILITIES = [
    { tag: "ONE PLACE", title: "An adaptive command center", desc: "Budget, schedule, sequencing, codes, and contracts in one place that reshapes itself around the job in front of you." },
    { tag: "MONEY", title: "Budget and margin, live", desc: "Estimates, change orders, and draw requests stay tied to the work — so you always know where the margin is." },
    { tag: "TIME", title: "Schedule and sequencing", desc: "What happens next, in what order, and who is on it. Move one thing and everything downstream updates." },
    { tag: "COMPLIANCE", title: "The codes that apply here", desc: "California-first code coverage, jurisdiction-aware and cited to the source — not a search box, an answer." },
    { tag: "PAPER", title: "Contracts and change orders", desc: "Drafted, tracked, and attached to the work they govern. Nothing lives in a separate inbox." },
    { tag: "MEMORY", title: "A knowledge engine underneath", desc: `${entities.toLocaleString()} cited entities across codes, materials, methods, and safety — the memory beneath every answer.` },
  ];

  function askKnowledge(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/knowledge?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="bkg-mkt" style={{ background: C.cream, color: C.sepia, minHeight: "100vh", overflowX: "hidden" }}>
      {/* ═══ NAV ═══ */}
      <nav className="mkt-nav" style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px", background: C.cream,
        borderBottom: `1px solid ${C.edge}`,
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
          <span style={{
            width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: C.raised, border: `1px solid ${C.brassAged}`, boxShadow: "var(--shadow-page-1)", overflow: "hidden", flexShrink: 0,
          }}>
            <Image src="/plates/builders-hammer.png" alt="Builder's Knowledge Garden" width={40} height={40} priority style={{ objectFit: "contain", mixBlendMode: "multiply" }} />
          </span>
          <span className="display mkt-wordmark" style={{ color: C.ink, fontSize: 16, letterSpacing: "-0.01em" }}>
            Builder&rsquo;s Knowledge Garden
          </span>
        </Link>
        <div className="mkt-links" style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/knowledge" className="mkt-navlink" style={{ color: C.sepia, fontSize: 14, textDecoration: "none" }}>Knowledge</Link>
          <Link href="#lifecycle" className="mkt-navlink" style={{ color: C.sepia, fontSize: 14, textDecoration: "none" }}>How it works</Link>
          <Link href="#lanes" className="mkt-navlink" style={{ color: C.sepia, fontSize: 14, textDecoration: "none" }}>Who it&rsquo;s for</Link>
          <Link href="/pricing" className="mkt-navlink" style={{ color: C.sepia, fontSize: 14, textDecoration: "none" }}>Pricing</Link>
          <Link href="/login" className="mkt-navlink mkt-login" style={{ color: C.sepia, fontSize: 14, textDecoration: "none" }}>Log in</Link>
          <Link href="/killerapp" style={{
            padding: "9px 18px", borderRadius: "var(--radius-pill)", background: C.teal, color: C.cream,
            fontSize: 14, fontWeight: 600, textDecoration: "none", border: `1px solid ${C.tealDeep}`,
            boxShadow: "var(--shadow-page-2)",
          }}>Start building</Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{ position: "relative", overflow: "hidden", borderBottom: `1px solid ${C.edge}` }}>
        {/* faint engineering grid — behind the hero only */}
        <div aria-hidden style={{
          position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 80% 70% at 60% 35%, rgba(0,0,0,0.9), transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 60% 35%, rgba(0,0,0,0.9), transparent 75%)",
        }} />
        <div className="mkt-hero" style={{
          position: "relative", zIndex: 1, maxWidth: 1140, margin: "0 auto",
          display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 48, alignItems: "center",
          padding: "84px 28px 88px",
        }}>
          {/* left — copy */}
          <motion.div {...fadeUp}>
            <Eng color={C.brassAged} style={{ display: "block", marginBottom: 18 }}>
              For general contractors · California-first
            </Eng>
            <h1 className="display mkt-h1" style={{ color: C.ink, fontSize: "clamp(40px, 5.6vw, 66px)", lineHeight: 1.04, letterSpacing: "-0.02em", margin: "0 0 22px" }}>
              Run the whole build from one place.
            </h1>
            <p className="ed mkt-sub" style={{ color: C.script, fontSize: "clamp(19px, 2.2vw, 25px)", fontStyle: "italic", lineHeight: 1.5, margin: "0 0 18px", maxWidth: 560 }}>
              Budget, schedule, sequencing, codes, and contracts — in one adaptive place that remembers every decision you make.
            </p>
            <p style={{ color: C.sepia, fontSize: 16, lineHeight: 1.65, margin: "0 0 32px", maxWidth: 520 }}>
              {"You run the job. Everyone on it — owners, subs, suppliers, inspectors — joins for free, working from the same source of truth."}
            </p>
            <div className="mkt-cta-row" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
              <Link href="/killerapp" style={{
                padding: "15px 32px", borderRadius: "var(--radius-pill)", background: C.teal, color: C.cream,
                fontSize: 15, fontWeight: 600, textDecoration: "none", border: `1px solid ${C.tealDeep}`, boxShadow: "var(--shadow-page-3)",
              }}>Start building</Link>
              <Link href="/knowledge" style={{
                padding: "15px 32px", borderRadius: "var(--radius-pill)", background: "transparent", color: C.tealDeep,
                fontSize: 15, fontWeight: 600, textDecoration: "none", border: `1px solid ${C.brassAged}`,
              }}>Browse the knowledge</Link>
            </div>
            <form onSubmit={askKnowledge} style={{ display: "flex", gap: 8, maxWidth: 460 }}>
              <input
                type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about a code, a permit, a material…"
                aria-label="Ask the knowledge engine"
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: "var(--radius-md)",
                  border: `1px solid ${C.edge}`, background: C.raised, color: C.ink, fontSize: 14, outline: "none",
                }}
              />
              <button type="submit" className="mono" style={{
                padding: "12px 18px", borderRadius: "var(--radius-md)", background: C.brass, color: C.ink,
                border: `1px solid ${C.brassAged}`, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
              }}>Ask</button>
            </form>
          </motion.div>

          {/* right — specimen plate mark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
            className="mkt-plate-wrap" style={{ display: "flex", justifyContent: "center" }}
          >
            <figure style={{
              margin: 0, padding: 18, background: C.raised, border: `1px solid ${C.brassAged}`,
              borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-plate)", maxWidth: 420, width: "100%",
            }}>
              <div style={{ border: `1px solid ${C.edge}`, padding: 8, background: C.cream }}>
                <Image src="/plates/builders-hammer.png" alt="The builder's hammer — roots into tools" width={800} height={800} priority
                  style={{ width: "100%", height: "auto", display: "block", mixBlendMode: "multiply" }} />
              </div>
              <figcaption style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <span className="ed" style={{ color: C.script, fontSize: 17, fontStyle: "italic" }}>The builder&rsquo;s hammer</span>
                <Eng color={C.brassAged}>Specimen · KG</Eng>
              </figcaption>
            </figure>
          </motion.div>
        </div>
      </section>

      {/* ═══ STAT BAND — real, server-rendered numbers ═══ */}
      <section style={{ background: C.vellum, borderBottom: `1px solid ${C.edge}` }}>
        <div className="mkt-stats" style={{
          maxWidth: 1040, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: 24, padding: "44px 28px",
        }}>
          {STATS.map((s, i) => (
            <motion.div key={s.label} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              style={{ textAlign: "center", borderLeft: i === 0 ? "none" : `1px solid ${C.edge}` }}>
              <div className="display" style={{ color: C.tealDeep, fontSize: "clamp(30px, 4vw, 46px)", lineHeight: 1, letterSpacing: "-0.02em" }}>
                <CountUp value={s.value} prefix={s.prefix} suffix={s.suffix} />
              </div>
              <div className="mono" style={{ marginTop: 10, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.faded }}>
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ GC CLARITY + CAPABILITIES ═══ */}
      <section style={{ background: C.cream, padding: "92px 28px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <motion.div {...fadeUp} style={{ maxWidth: 760, marginBottom: 56 }}>
            <Eng color={C.brassAged} style={{ display: "block", marginBottom: 16 }}>The clarity to run the job</Eng>
            <h2 className="display" style={{ color: C.ink, fontSize: "clamp(28px, 3.6vw, 42px)", lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 20px" }}>
              The job lives in ten places at once. We put it in one.
            </h2>
            <p className="ed" style={{ color: C.script, fontSize: "clamp(18px, 2vw, 22px)", fontStyle: "italic", lineHeight: 1.55, margin: 0 }}>
              {"The estimate, the schedule, the code book, the contract, the group text. Builder's Knowledge Garden gathers them into one adaptive place that remembers every decision — and grows into the system of record for everyone on the build."}
            </p>
          </motion.div>

          <div className="mkt-cap-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: C.edge, border: `1px solid ${C.edge}`, borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
            {CAPABILITIES.map((cap, i) => (
              <motion.div key={cap.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: (i % 3) * 0.07 }}
                style={{ background: C.raised, padding: "30px 26px" }}>
                <Eng color={C.brass} style={{ display: "block", marginBottom: 14 }}>{cap.tag}</Eng>
                <h3 className="display" style={{ color: C.ink, fontSize: 20, lineHeight: 1.2, letterSpacing: "-0.01em", margin: "0 0 10px" }}>{cap.title}</h3>
                <p style={{ color: C.sepia, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{cap.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LIFECYCLE — canonical 7 stages, no emoji ═══ */}
      <section id="lifecycle" style={{ background: C.vellum, padding: "92px 28px", borderTop: `1px solid ${C.edge}`, borderBottom: `1px solid ${C.edge}` }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <motion.div {...fadeUp} style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 56px" }}>
            <Eng color={C.brassAged} style={{ display: "block", marginBottom: 16 }}>One job, seven stages</Eng>
            <h2 className="display" style={{ color: C.ink, fontSize: "clamp(28px, 3.6vw, 42px)", lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
              From sizing it up to closing it out.
            </h2>
            <p style={{ color: C.sepia, fontSize: 16, lineHeight: 1.65, margin: 0 }}>
              {"The same seven stages every job moves through — and the platform moves with it. No phase lives in a separate tool."}
            </p>
          </motion.div>

          <div className="mkt-stages" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12 }}>
            {STAGES.map((st, i) => (
              <motion.div key={st.name} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }}
                style={{ background: C.raised, border: `1px solid ${C.edge}`, borderTop: `3px solid ${C.brass}`, borderRadius: "var(--radius-sm)", padding: "20px 16px" }}>
                <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: C.brassAged, letterSpacing: "0.1em", marginBottom: 10 }}>{st.n}</div>
                <h3 className="display" style={{ color: C.ink, fontSize: 16, lineHeight: 1.15, margin: "0 0 8px" }}>{st.name}</h3>
                <p style={{ color: C.faded, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{st.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LANES — canonical 9, GC leads ═══ */}
      <section id="lanes" style={{ background: C.cream, padding: "92px 28px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <motion.div {...fadeUp} style={{ maxWidth: 680, marginBottom: 48 }}>
            <Eng color={C.brassAged} style={{ display: "block", marginBottom: 16 }}>Built for everyone on the job</Eng>
            <h2 className="display" style={{ color: C.ink, fontSize: "clamp(28px, 3.6vw, 42px)", lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
              Nine lanes. One source of truth.
            </h2>
            <p style={{ color: C.sepia, fontSize: 16, lineHeight: 1.65, margin: 0 }}>
              {"The general contractor carries the plan; everyone they bring on works free. Each lane sees the same project through the view that fits how they work."}
            </p>
          </motion.div>

          <div className="mkt-lanes" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {LANES.map((lane, i) => (
              <motion.div key={lane.name} {...fadeUp} transition={{ ...fadeUp.transition, delay: (i % 3) * 0.06 }}
                style={{
                  background: lane.lead ? C.tealDeep : C.raised,
                  border: `1px solid ${lane.lead ? C.tealDeep : C.edge}`,
                  borderRadius: "var(--radius-sm)", padding: "22px 22px",
                  boxShadow: lane.lead ? "var(--shadow-page-3)" : "var(--shadow-page-1)",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <h3 className="display" style={{ color: lane.lead ? C.cream : C.ink, fontSize: 19, margin: 0, letterSpacing: "-0.01em" }}>{lane.name}</h3>
                  {lane.lead && <Eng color={C.brassPale} style={{ fontSize: 9 }}>Carries the plan</Eng>}
                </div>
                <p style={{ color: lane.lead ? C.tealPale : C.faded, fontSize: 13, lineHeight: 1.55, margin: 0 }}>{lane.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ASK THE GARDEN — knowledge engine ═══ */}
      <section style={{ background: C.vellum, padding: "92px 28px", borderTop: `1px solid ${C.edge}`, borderBottom: `1px solid ${C.edge}` }}>
        <div className="mkt-ask" style={{ maxWidth: 1040, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
          <motion.div {...fadeUp}>
            <Eng color={C.brassAged} style={{ display: "block", marginBottom: 16 }}>Ask the garden</Eng>
            <h2 className="display" style={{ color: C.ink, fontSize: "clamp(26px, 3.2vw, 38px)", lineHeight: 1.12, letterSpacing: "-0.02em", margin: "0 0 18px" }}>
              A plain-language answer, cited to the code.
            </h2>
            <p style={{ color: C.sepia, fontSize: 16, lineHeight: 1.65, margin: "0 0 14px" }}>
              {`Ask anything about codes, materials, methods, or safety. Every answer is jurisdiction-aware and cited to its source, drawn from ${entities.toLocaleString()} entities across ${jurisdictions} jurisdictions.`}
            </p>
            <p style={{ color: C.faded, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {"By voice or text, in 30+ languages — for the veteran GC and the first-day laborer alike."}
            </p>
          </motion.div>

          {/* illustrative cited answer */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}
            style={{ background: C.raised, border: `1px solid ${C.edge}`, borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-plate)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${C.edge}`, background: C.fold }}>
              <Eng color={C.brassAged}>Copilot</Eng>
              <Eng color={C.faded} style={{ fontSize: 9 }}>Example</Eng>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginLeft: "auto", maxWidth: "85%", background: C.tealPale, color: C.tealDeep, padding: "10px 14px", borderRadius: "10px 10px 4px 10px", fontSize: 14, marginBottom: 14 }}>
                {"Do I need a vapor barrier under a slab in California?"}
              </div>
              <div style={{ maxWidth: "92%", background: C.cream, border: `1px solid ${C.edge}`, padding: "12px 14px", borderRadius: "10px 10px 10px 4px", fontSize: 14, lineHeight: 1.55, color: C.sepia }}>
                {"Yes. Under California Residential Code R506.2.3, a Class I vapor retarder — typically 6-mil polyethylene — goes between the base course or prepared subgrade and the concrete slab, with limited exceptions."}
                <div className="mono" style={{ marginTop: 10, fontSize: 10, letterSpacing: "0.08em", color: C.teal, fontWeight: 700 }}>
                  Cited · California Residential Code R506.2.3
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ PRICING TEASER — number-free (pricing flagged, see session log) ═══ */}
      <section id="pricing" style={{ background: C.cream, padding: "92px 28px" }}>
        <motion.div {...fadeUp} style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <Eng color={C.brassAged} style={{ display: "block", marginBottom: 16 }}>Pricing</Eng>
          <h2 className="display" style={{ color: C.ink, fontSize: "clamp(28px, 3.6vw, 42px)", lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 18px" }}>
            Start free. The GC carries the plan.
          </h2>
          <p style={{ color: C.sepia, fontSize: 16, lineHeight: 1.65, margin: "0 0 28px" }}>
            {"Browse the whole knowledge engine for free. Paid plans add projects, field operations, and team tools — and everyone the GC invites works free. No demo gates."}
          </p>
          <Link href="/pricing" style={{
            display: "inline-block", padding: "14px 30px", borderRadius: "var(--radius-pill)", background: C.brass, color: C.ink,
            fontSize: 15, fontWeight: 700, textDecoration: "none", border: `1px solid ${C.brassAged}`, boxShadow: "var(--shadow-page-2)",
          }}>See plans</Link>
        </motion.div>
      </section>

      {/* ═══ FINAL CTA — light, herbarium ═══ */}
      <section style={{ background: C.tealDeep, padding: "96px 28px", borderTop: `1px solid ${C.brassAged}` }}>
        <motion.div {...fadeUp} style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <h2 className="display" style={{ color: C.cream, fontSize: "clamp(30px, 4.4vw, 50px)", lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 18px" }}>
            Run your next job in one place.
          </h2>
          <p className="ed" style={{ color: C.tealPale, fontSize: "clamp(18px, 2vw, 22px)", fontStyle: "italic", lineHeight: 1.5, margin: "0 0 34px" }}>
            {"Start with a project, or ask the garden a question. The whole build — from size-up to close-out — on one source of truth."}
          </p>
          <div className="mkt-cta-row" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/killerapp" style={{
              padding: "16px 38px", borderRadius: "var(--radius-pill)", background: C.brass, color: C.ink,
              fontSize: 16, fontWeight: 700, textDecoration: "none", border: `1px solid ${C.brassAged}`,
            }}>Start building</Link>
            <Link href="/knowledge" style={{
              padding: "16px 38px", borderRadius: "var(--radius-pill)", background: "transparent", color: C.cream,
              fontSize: 16, fontWeight: 600, textDecoration: "none", border: `1px solid ${C.brassPale}`,
            }}>Browse the knowledge</Link>
          </div>
        </motion.div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: C.cream, padding: "56px 28px 40px", borderTop: `1px solid ${C.edge}` }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div className="mkt-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: C.raised, border: `1px solid ${C.brassAged}`, overflow: "hidden" }}>
                  <Image src="/plates/builders-hammer.png" alt="" width={32} height={32} priority={false} style={{ objectFit: "contain", mixBlendMode: "multiply" }} />
                </span>
                <span className="display" style={{ color: C.ink, fontSize: 15 }}>Builder&rsquo;s Knowledge Garden</span>
              </div>
              <p style={{ color: C.faded, fontSize: 13, lineHeight: 1.6, maxWidth: 280, margin: 0 }}>
                {"One adaptive place to run the whole build — budget, schedule, sequencing, codes, and contracts."}
              </p>
            </div>
            {[
              { title: "Product", links: [["Command center", "/killerapp"], ["Knowledge", "/knowledge"], ["Dream Machine", "/dream"], ["Pricing", "/pricing"]] },
              { title: "Platform", links: [["For agents (MCP)", "/mcp"], ["Documentation", "/documents"], ["Knowledge index", "/knowledge"]] },
              { title: "Company", links: [["About", "/site/about"], ["Contact", "/site/contact"], ["Log in", "/login"]] },
            ].map((col) => (
              <div key={col.title}>
                <div className="mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.brassAged, marginBottom: 14 }}>{col.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(([label, href]) => (
                    <Link key={href + label} href={href} style={{ fontSize: 13, color: C.sepia, textDecoration: "none" }}>{label}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ paddingTop: 22, borderTop: `1px solid ${C.edge}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", color: C.faded, textTransform: "uppercase" }}>
              Size up → Lock it in → Plan it out → Build → Adapt → Collect → Reflect
            </span>
            <span style={{ fontSize: 12, color: C.faded }}>© 2026 Builder&rsquo;s Knowledge Garden</span>
          </div>
        </div>
      </footer>

      {/* ═══ SCOPED STYLES — fonts (beat the global * reset) + responsive ═══ */}
      <style>{`
        .bkg-mkt .display, .bkg-mkt .display * { font-family: var(--font-archivo-black), 'Archivo', 'Helvetica Neue', sans-serif !important; font-weight: 400 !important; }
        .bkg-mkt .ed, .bkg-mkt .ed * { font-family: var(--font-cormorant), Georgia, 'Times New Roman', serif !important; }
        .bkg-mkt .mono, .bkg-mkt .mono * { font-family: var(--font-space-mono), ui-monospace, 'SFMono-Regular', monospace !important; }
        .bkg-mkt .mkt-navlink:hover { color: ${C.tealDeep} !important; }
        @media (max-width: 900px) {
          .bkg-mkt .mkt-hero { grid-template-columns: 1fr !important; gap: 36px !important; }
          .bkg-mkt .mkt-plate-wrap { order: -1; }
          .bkg-mkt .mkt-ask { grid-template-columns: 1fr !important; }
          .bkg-mkt .mkt-cap-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .bkg-mkt .mkt-lanes { grid-template-columns: repeat(2, 1fr) !important; }
          .bkg-mkt .mkt-stages { grid-template-columns: repeat(4, 1fr) !important; }
          .bkg-mkt .mkt-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .bkg-mkt .mkt-links { gap: 14px !important; }
          .bkg-mkt .mkt-navlink:not(.mkt-login) { display: none !important; }
          .bkg-mkt .mkt-wordmark { display: none !important; }
          .bkg-mkt .mkt-stats { grid-template-columns: repeat(2, 1fr) !important; gap: 28px 16px !important; }
          .bkg-mkt .mkt-stats > div { border-left: none !important; }
          .bkg-mkt .mkt-cap-grid { grid-template-columns: 1fr !important; }
          .bkg-mkt .mkt-lanes { grid-template-columns: 1fr !important; }
          .bkg-mkt .mkt-stages { grid-template-columns: repeat(2, 1fr) !important; }
          .bkg-mkt .mkt-footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bkg-mkt * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
