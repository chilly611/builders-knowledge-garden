"use client";

import { useEffect, useState } from "react";

/**
 * Where We Stand — April 17, 2026
 *
 * Cinematic presentation for John Bou, the trusted contractor, and the team.
 * Lives at /manifesto on builders.theknowledgegardens.com.
 *
 * Tells the story of one long night: the prototype read, the content-vs-container
 * reframe, the eighteen decisions, the seven-stage lifecycle, the 6-week path
 * to post-revenue, Building Intelligence as a product.
 */

export default function ManifestoPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,400&display=swap");

        :root {
          --cream: #fdf8f0;
          --cream-deep: #f5ebd8;
          --ink: #2c1810;
          --ink-soft: #5a4a3f;
          --green: #1d9e75;
          --warm: #d85a30;
          --gold: #c4a44a;
          --red: #e8443a;
          --teal: #14b8a6;
        }

        html { scroll-behavior: smooth; }

        body {
          background: var(--cream);
          color: var(--ink);
          font-family: "Fraunces", Georgia, serif;
          font-feature-settings: "ss01", "ss02";
          -webkit-font-smoothing: antialiased;
        }

        .display {
          font-family: "Archivo Black", sans-serif;
          letter-spacing: -0.02em;
        }

        .mono {
          font-family: "Archivo", sans-serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 600;
        }

        .grain::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          mix-blend-mode: multiply;
        }

        .reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.9s cubic-bezier(0.2, 0.7, 0.2, 1),
            transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        .reveal.in {
          opacity: 1;
          transform: translateY(0);
        }

        .hero-title {
          font-family: "Archivo Black", sans-serif;
          font-size: clamp(3rem, 9vw, 9rem);
          line-height: 0.9;
          letter-spacing: -0.035em;
        }

        .section-title {
          font-family: "Archivo Black", sans-serif;
          font-size: clamp(2.5rem, 6vw, 5rem);
          line-height: 0.95;
          letter-spacing: -0.03em;
        }

        .pull {
          font-family: "Fraunces", serif;
          font-style: italic;
          font-weight: 400;
          font-size: clamp(1.5rem, 3vw, 2.5rem);
          line-height: 1.25;
        }

        .rule {
          height: 1px;
          background: var(--ink);
          opacity: 0.15;
        }

        .big-num {
          font-family: "Archivo Black", sans-serif;
          font-size: clamp(4rem, 10vw, 9rem);
          line-height: 0.85;
          letter-spacing: -0.05em;
        }

        @keyframes firstFade {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .first-1 { animation: firstFade 1.1s 0.1s both cubic-bezier(0.2,0.7,0.2,1); }
        .first-2 { animation: firstFade 1.1s 0.35s both cubic-bezier(0.2,0.7,0.2,1); }
        .first-3 { animation: firstFade 1.1s 0.6s both cubic-bezier(0.2,0.7,0.2,1); }
        .first-4 { animation: firstFade 1.1s 0.85s both cubic-bezier(0.2,0.7,0.2,1); }

        .stage-arrow { color: var(--ink-soft); opacity: 0.4; }

        .decision-card {
          padding: 1.5rem;
          border: 1px solid rgba(44,24,16,0.08);
          border-radius: 8px;
          background: var(--cream);
          transition: all 0.3s ease;
        }

        .decision-card:hover {
          border-color: var(--warm);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(44,24,16,0.08);
        }

        .weekcard {
          padding: 2rem;
          border-left: 3px solid;
          background: rgba(253,248,240,0.6);
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.3rem 0.8rem;
          border-radius: 999px;
          font-family: "Archivo", sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .prototype-link {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.25rem 2rem;
          background: var(--ink);
          color: var(--cream);
          border-radius: 8px;
          font-family: "Archivo", sans-serif;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-size: 0.85rem;
          transition: all 0.3s ease;
        }

        .prototype-link:hover {
          background: var(--warm);
          transform: translateY(-2px);
        }
      `}</style>

      <div className="grain min-h-screen">
        <RevealObserver />

        {/* ─── NAV ─── */}
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-5 flex items-center justify-between"
             style={{
               background: `linear-gradient(180deg, var(--cream) 0%, rgba(253,248,240,0.7) 70%, rgba(253,248,240,0) 100%)`,
               backdropFilter: scrollY > 50 ? "blur(8px)" : "none",
             }}>
          <a href="https://builders.theknowledgegardens.com" className="mono text-xs" style={{ color: "var(--ink-soft)" }}>
            ← Knowledge Gardens
          </a>
          <div className="mono text-[10px]" style={{ color: "var(--ink-soft)" }}>
            Where we stand · April 17, 2026
          </div>
        </nav>

        {/* ─── HERO ─── */}
        <section className="min-h-screen flex flex-col justify-center px-6 md:px-16 pt-32 pb-20 relative">
          <div className="max-w-6xl">
            <div className="mono text-xs first-1" style={{ color: "var(--warm)" }}>
              Builder's Knowledge Garden
            </div>
            <h1 className="hero-title mt-8 first-2">
              The game part
              <span style={{ display: "block" }}>was <span style={{ color: "var(--warm)" }}>wrong</span>.</span>
              <span style={{ display: "block" }}>The content underneath</span>
              <span style={{ display: "block", fontStyle: "italic", fontFamily: "Fraunces", fontWeight: 400 }}>is gold.</span>
            </h1>
            <div className="pull mt-12 max-w-3xl first-3" style={{ color: "var(--ink-soft)" }}>
              One long night reading the prototype. Eighteen decisions locked.
              A renamed lifecycle. A new product named Building Intelligence.
              A six-week path to paying customers before we raise.
            </div>
            <div className="mt-16 flex flex-col md:flex-row items-start md:items-center gap-6 first-4">
              <a href="https://chilly611.github.io/bkg-killer-app/" target="_blank" rel="noreferrer" className="prototype-link">
                Play with the prototype →
              </a>
              <span className="mono text-[10px]" style={{ color: "var(--ink-soft)" }}>
                Chilly · John Bou · team discussion pending
              </span>
            </div>
          </div>
        </section>

        {/* ─── THE PROBLEM ─── */}
        <section className="px-6 md:px-16 py-24">
          <div className="max-w-4xl mx-auto reveal">
            <div className="mono text-xs mb-6" style={{ color: "var(--ink-soft)" }}>
              The moment that started this
            </div>
            <div className="text-xl md:text-2xl leading-relaxed" style={{ fontFamily: "Fraunces" }}>
              <p className="mb-6">
                The Killer App prototype opens with three gates named like they belong on a lawyer's desk:
                <span className="mono text-base mx-2" style={{ color: "var(--red)" }}>Pre-Bid Risk Score.</span>
                <span className="mono text-base mx-2" style={{ color: "var(--red)" }}>AI Estimating Gate.</span>
                <span className="mono text-base mx-2" style={{ color: "var(--red)" }}>CRM Client Lookup.</span>
              </p>
              <p className="mb-6">
                Builders don't open with risk. That's what lawyers do.
                A builder sizes up an opportunity, figures out what it'll cost, finds good materials nearby,
                and decides whether to go after the job. Risk lives inside that assessment — but it isn't the frame.
              </p>
              <p className="mb-6">
                So I read the entire prototype line by line. Three thousand three hundred and twenty-two lines of a single HTML file.
              </p>
              <p className="mt-10 pull" style={{ color: "var(--warm)" }}>
                What I found wasn't a prototype that needed fixing. It was a prototype with the wrong wrapper on the right content.
              </p>
            </div>
          </div>
        </section>

        <div className="rule mx-6 md:mx-16" />

        {/* ─── CONTENT VS CONTAINER ─── */}
        <section className="px-6 md:px-16 py-24">
          <div className="max-w-6xl mx-auto">
            <div className="reveal max-w-4xl">
              <div className="mono text-xs mb-4" style={{ color: "var(--ink-soft)" }}>
                The reframe
              </div>
              <h2 className="section-title mb-12">
                Content vs. Container.
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-12 mt-8">
              <div className="reveal">
                <div className="mono text-xs mb-4" style={{ color: "var(--teal)" }}>
                  ✓ Content · Keep
                </div>
                <ul className="space-y-4 text-lg" style={{ fontFamily: "Fraunces" }}>
                  <li>— <strong>11+ real contractor workflows</strong>: Code Compliance, Contract Templates, Estimating, Sub Management, Supply Chain, Crew Sizing, Bid Analysis</li>
                  <li>— <strong>15+ AI specialist prompts</strong>: structural IBC/IRC, electrical NEC, plumbing IPC, bid analysis, crew optimization, supply sourcing</li>
                  <li>— <strong>Step-card primitive</strong>: expandable, status-coded, voice-enabled, AI-ready</li>
                  <li>— <strong>Journey map</strong>: visual overview of where you are, what's done, what's skipped</li>
                </ul>
              </div>
              <div className="reveal">
                <div className="mono text-xs mb-4" style={{ color: "var(--red)" }}>
                  ✗ Container · Replace
                </div>
                <ul className="space-y-4 text-lg" style={{ fontFamily: "Fraunces" }}>
                  <li>— <strong>Quest-list left column</strong> forcing a linear sequence</li>
                  <li>— <strong>Level gates</strong> blocking users from exploring</li>
                  <li>— <strong>"Earn XP to unlock"</strong> game-campaign framing</li>
                  <li>— <strong>Navy+blue palette</strong> that clashes with our brand</li>
                  <li>— <strong>Risk-first opening</strong> that feels like a defensive crouch</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ─── THE LIFECYCLE ─── */}
        <section className="px-6 md:px-16 py-32" style={{ background: "var(--ink)", color: "var(--cream)" }}>
          <div className="max-w-6xl mx-auto">
            <div className="reveal max-w-4xl">
              <div className="mono text-xs mb-4" style={{ color: "var(--gold)" }}>
                The renamed lifecycle
              </div>
              <h2 className="section-title mb-6" style={{ color: "var(--cream)" }}>
                Size Up.<br/>Lock.<br/>Plan.<br/>Build.<br/>Adapt.<br/>Collect.<br/>Reflect.
              </h2>
              <p className="pull mt-8 max-w-3xl" style={{ color: "var(--cream-deep)", opacity: 0.85 }}>
                The prototype called the first stage "Scout." Scout led with risk assessment.
                Builders don't scout — they <em>size up</em>. Let me go size this up.
                Let me figure out if I can win this job and build it well.
                Risk is folded in. It's not the frame.
              </p>
            </div>

            <div className="mt-20 reveal">
              <LifecycleVisual />
            </div>
          </div>
        </section>

        {/* ─── EIGHTEEN DECISIONS ─── */}
        <section className="px-6 md:px-16 py-32">
          <div className="max-w-6xl mx-auto">
            <div className="reveal max-w-4xl">
              <div className="mono text-xs mb-4" style={{ color: "var(--ink-soft)" }}>
                What we decided tonight
              </div>
              <h2 className="section-title mb-6">Eighteen Decisions.</h2>
              <p className="pull max-w-3xl mb-16" style={{ color: "var(--ink-soft)" }}>
                Grouped by domain. Each is locked from my end but open to team pushback.
                Disagree with any of these and we'll rework them together.
              </p>
            </div>

            <DecisionGroup
              title="Navigation & UX"
              chrome="warm"
              items={[
                { n: "01", text: "Fluid workflow paths, not quest ladders" },
                { n: "02", text: "Journey map stays (with skip/done/pending + team visibility)" },
                { n: "03", text: "Searchable workflow picker replaces the quest list" },
                { n: "04", text: "Step-card primitive ports cleanly (status, voice, AI slot)" },
                { n: "05", text: "Voice input on every textarea" },
                { n: "06", text: "Inline AI results in the step that asked for them" },
                { n: "07", text: "Template cards for contracts, lien waivers, NDAs, COs" },
              ]}
            />

            <DecisionGroup
              title="Gamification Reframe"
              chrome="gold"
              items={[
                { n: "08", text: "XP as lifetime tally, not progress-to-next-level" },
                { n: "09", text: "XP converts to real BKG certifications + verified credentials" },
                { n: "10", text: "Ranks become badge-of-honor titles tied to real contribution" },
                { n: "11", text: "Discard: quest lists, level groups, unlock gates, blue-ink palette" },
              ]}
            />

            <DecisionGroup
              title="Visual Language"
              chrome="teal"
              items={[
                { n: "12", text: "Muted gray / warm orange (#D85A30) / teal (#14B8A6) for task status" },
                { n: "13", text: "Knowledge Garden green (#1D9E75) stays as brand chrome, separate from status" },
                { n: "14", text: "Drop the prototype's navy+blue; three-chrome brand stays canonical" },
              ]}
            />

            <DecisionGroup
              title="AI Integration"
              chrome="green"
              items={[
                { n: "15", text: "Wire all 15+ specialist prompts to Claude API" },
                { n: "16", text: "Every AI citation links to real BKG entity IDs with timestamps" },
                { n: "17", text: "Permanent prompt library at docs/ai-prompts/" },
                { n: "18", text: "Package the library as a product: Building Intelligence" },
              ]}
            />
          </div>
        </section>

        {/* ─── BUILDING INTELLIGENCE ─── */}
        <section className="px-6 md:px-16 py-32 relative" style={{ background: "var(--cream-deep)" }}>
          <div className="max-w-6xl mx-auto">
            <div className="reveal max-w-4xl">
              <div className="mono text-xs mb-4" style={{ color: "var(--warm)" }}>
                The new product
              </div>
              <h2 className="section-title mb-8">Building Intelligence.</h2>
              <div className="text-xl md:text-2xl leading-relaxed space-y-6" style={{ fontFamily: "Fraunces" }}>
                <p>
                  Our library of AI specialists — code compliance, estimating, bid analysis, crew sizing,
                  supply sourcing, and more — packaged as a product for developers.
                </p>
                <p>
                  Exposed through our MCP server and a REST API.
                  Any AI agent, any design firm, any contech startup can call a BKG specialist
                  and get a cited, jurisdiction-aware answer pulled from our structured database.
                </p>
                <p className="pull mt-10" style={{ color: "var(--warm)" }}>
                  Every other contech AI hallucinates code sections.
                  Ours cite the real thing.
                </p>
              </div>

              <div className="mt-12 grid md:grid-cols-3 gap-4 text-sm">
                <div className="p-6 border rounded" style={{ borderColor: "rgba(44,24,16,0.15)" }}>
                  <div className="mono text-xs mb-2" style={{ color: "var(--ink-soft)" }}>Free</div>
                  <div className="display text-2xl mb-2">50 / mo</div>
                  <div style={{ fontFamily: "Fraunces", color: "var(--ink-soft)" }}>For developers exploring</div>
                </div>
                <div className="p-6 border rounded" style={{ borderColor: "rgba(44,24,16,0.15)" }}>
                  <div className="mono text-xs mb-2" style={{ color: "var(--ink-soft)" }}>Metered</div>
                  <div className="display text-2xl mb-2">$0.50 / call</div>
                  <div style={{ fontFamily: "Fraunces", color: "var(--ink-soft)" }}>Pay as you go</div>
                </div>
                <div className="p-6 border rounded" style={{ borderColor: "var(--warm)", background: "rgba(216,90,48,0.05)" }}>
                  <div className="mono text-xs mb-2" style={{ color: "var(--warm)" }}>Enterprise</div>
                  <div className="display text-2xl mb-2">$500 / mo</div>
                  <div style={{ fontFamily: "Fraunces", color: "var(--ink-soft)" }}>2,000 calls + volume</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SIX WEEKS TO POST-REVENUE ─── */}
        <section className="px-6 md:px-16 py-32">
          <div className="max-w-6xl mx-auto">
            <div className="reveal max-w-4xl">
              <div className="mono text-xs mb-4" style={{ color: "var(--ink-soft)" }}>
                The plan
              </div>
              <h2 className="section-title mb-6">Six weeks to post-revenue.</h2>
              <p className="pull max-w-3xl mb-16" style={{ color: "var(--ink-soft)" }}>
                We raise as "post-revenue with paying customers in two markets," not as "pre-revenue with vision."
                That's a different conversation. Better terms. Better valuation. Same ambition.
              </p>
            </div>

            <div className="space-y-6 mt-12">
              <WeekCard week="Week 1" dates="Apr 17–23" chrome="green" title="Ship Code Compliance Lookup"
                body="Live workflow. Claude wired. Real jurisdiction data. The $55K pain becomes the first feature someone pays for." />
              <WeekCard week="Week 2" dates="Apr 24–30" chrome="warm" title="First paying customer"
                body="Contract Templates ship. Stripe wired. Trusted contractor becomes customer #1 at $99/mo, locked in for a year." />
              <WeekCard week="Week 3" dates="May 1–7" chrome="gold" title="Ship Size Up + grow to 3 customers"
                body="Rebuilt estimating and sourcing flow. Contractor refers two more at $149/mo Pro+ tier." />
              <WeekCard week="Week 4" dates="May 8–14" chrome="teal" title="Journey map + multi-project"
                body="Visual lifecycle across projects. Team collaboration surfaces. Weekly customer success check-ins." />
              <WeekCard week="Week 5" dates="May 15–21" chrome="warm" title="Launch Building Intelligence"
                body="MCP server goes public. REST API live. Announce to Claude + OpenAI developer communities. First API customer." />
              <WeekCard week="Week 6" dates="May 22–28" chrome="green" title="Polish, case studies, pitch"
                body="ARR run rate: $10–20k across consumer and developer markets. Fundraising deck gets its revenue slide." />
            </div>
          </div>
        </section>

        {/* ─── WHAT I WANT FROM THE TEAM ─── */}
        <section className="px-6 md:px-16 py-32" style={{ background: "var(--ink)", color: "var(--cream)" }}>
          <div className="max-w-4xl mx-auto">
            <div className="reveal">
              <div className="mono text-xs mb-4" style={{ color: "var(--gold)" }}>
                What I want from you
              </div>
              <h2 className="section-title mb-12" style={{ color: "var(--cream)" }}>Six questions.</h2>

              <div className="space-y-10 text-lg md:text-xl leading-relaxed" style={{ fontFamily: "Fraunces" }}>
                <Question n="1" q="Does 'Size Up' sound right in a contractor's ear?"
                  note="My gut says yes. You know these people better than I do." />
                <Question n="2" q="Is the XP-to-certification path believable?"
                  note="Does BKG self-issue? Partner with AGC, NAHB, a state board? This changes product scope." />
                <Question n="3" q="Is 6 weeks to first paying customer too fast, right, or too slow?"
                  note="Post-revenue before fundraising = better valuation and terms. But it costs focus. Your read?" />
                <Question n="4" q="Does 'Building Intelligence' land as a product name?"
                  note="Triple meaning: the intelligence of building, AI intelligence, building intelligence as a verb." />
                <Question n="5" q="Who reviews our contract templates before we sell them?"
                  note="The moment we charge money for a template, flawed output becomes real liability. Not optional." />
                <Question n="6" q="Should we port all 11+ workflows, or trim?"
                  note="Some probably aren't precious. Which do you cut? Which are missing from the prototype?" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── CALL TO ACTION ─── */}
        <section className="px-6 md:px-16 py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="reveal">
              <div className="display text-3xl md:text-5xl leading-tight mb-12">
                Play with the prototype. Read the docs.
                <br/>
                Tell me where I'm wrong.
              </div>

              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <a href="https://chilly611.github.io/bkg-killer-app/" target="_blank" rel="noreferrer" className="prototype-link">
                  Open the prototype →
                </a>
                <a href="https://github.com/chilly611/builders-knowledge-garden/blob/main/docs/killer-app-direction.md" target="_blank" rel="noreferrer" className="mono text-sm border-b-2 pb-1 transition-opacity hover:opacity-60"
                   style={{ color: "var(--ink)", borderColor: "var(--warm)" }}>
                  Full engineering doc
                </a>
              </div>

              <div className="mt-16">
                <a href="mailto:chilly@theknowledgegardens.com?subject=Re: Killer App Direction"
                   className="mono text-sm border-b-2 pb-1 transition-opacity hover:opacity-60"
                   style={{ color: "var(--ink)", borderColor: "var(--warm)" }}>
                  chilly@theknowledgegardens.com
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="px-6 md:px-16 py-12 border-t" style={{ borderColor: "rgba(44,24,16,0.12)" }}>
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="display text-2xl">Knowledge Gardens</div>
              <div className="mono text-[10px] mt-1" style={{ color: "var(--ink-soft)" }}>
                The operating system for the builders of the world.
              </div>
            </div>
            <div className="mono text-[10px]" style={{ color: "var(--ink-soft)" }}>
              Killer App direction · April 17, 2026
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

/* ─── COMPONENTS ─── */

function DecisionGroup({ title, chrome, items }: { title: string; chrome: "green" | "warm" | "gold" | "teal" | "red"; items: { n: string; text: string }[] }) {
  const colors: Record<string, string> = {
    green: "var(--green)",
    warm: "var(--warm)",
    gold: "var(--gold)",
    teal: "var(--teal)",
    red: "var(--red)",
  };
  const c = colors[chrome];

  return (
    <div className="reveal mb-20">
      <div className="flex items-baseline gap-4 mb-8">
        <div className="mono text-xs" style={{ color: c }}>■</div>
        <h3 className="display text-2xl md:text-3xl">{title}</h3>
      </div>
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {items.map((item) => (
          <div key={item.n} className="decision-card flex gap-4 items-start">
            <span className="mono text-xs flex-shrink-0 mt-1" style={{ color: c }}>{item.n}</span>
            <span className="text-base md:text-lg leading-snug" style={{ fontFamily: "Fraunces" }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekCard({ week, dates, chrome, title, body }: { week: string; dates: string; chrome: "green" | "warm" | "gold" | "teal"; title: string; body: string }) {
  const colors: Record<string, string> = {
    green: "var(--green)",
    warm: "var(--warm)",
    gold: "var(--gold)",
    teal: "var(--teal)",
  };
  const c = colors[chrome];

  return (
    <div className="reveal weekcard" style={{ borderLeftColor: c }}>
      <div className="flex items-baseline gap-4 mb-3">
        <span className="display text-xl" style={{ color: c }}>{week}</span>
        <span className="mono text-[10px]" style={{ color: "var(--ink-soft)" }}>{dates}</span>
      </div>
      <h4 className="display text-xl md:text-2xl mb-3">{title}</h4>
      <p className="text-base md:text-lg leading-relaxed" style={{ fontFamily: "Fraunces", color: "var(--ink-soft)" }}>{body}</p>
    </div>
  );
}

function Question({ n, q, note }: { n: string; q: string; note: string }) {
  return (
    <div className="reveal grid grid-cols-12 gap-4 items-start">
      <div className="col-span-2 md:col-span-1">
        <span className="display text-3xl md:text-4xl" style={{ color: "var(--gold)" }}>{n}</span>
      </div>
      <div className="col-span-10 md:col-span-11">
        <div className="font-medium mb-2" style={{ color: "var(--cream)" }}>{q}</div>
        <div className="italic text-base" style={{ color: "var(--cream-deep)", opacity: 0.75 }}>{note}</div>
      </div>
    </div>
  );
}

function LifecycleVisual() {
  const stages = [
    { name: "Size Up", color: "var(--warm)", desc: "Can we win this? What will it cost?" },
    { name: "Lock", color: "var(--gold)", desc: "Contracts, codes, commitments." },
    { name: "Plan", color: "var(--green)", desc: "Sequence, crew, permits, supply." },
    { name: "Build", color: "var(--teal)", desc: "Construction. Field ops. Safety." },
    { name: "Adapt", color: "var(--warm)", desc: "Change orders. RFIs. Reality." },
    { name: "Collect", color: "var(--gold)", desc: "Pay apps. Draws. Lien waivers." },
    { name: "Reflect", color: "var(--green)", desc: "Warranty. Lessons. Referrals." },
  ];

  return (
    <div className="flex flex-col md:flex-row flex-wrap gap-4 md:items-stretch">
      {stages.map((s, i) => (
        <div key={s.name} className="flex-1 min-w-[140px]" style={{ flexBasis: "calc(14% - 1rem)" }}>
          <div className="p-4 rounded" style={{ background: "rgba(253,248,240,0.06)", borderTop: `3px solid ${s.color}` }}>
            <div className="mono text-[10px] mb-2" style={{ color: s.color }}>{String(i+1).padStart(2,'0')}</div>
            <div className="display text-xl mb-2" style={{ color: "var(--cream)" }}>{s.name}</div>
            <div className="text-xs leading-relaxed" style={{ color: "var(--cream-deep)", opacity: 0.7, fontFamily: "Fraunces" }}>{s.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RevealObserver() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return null;
}
