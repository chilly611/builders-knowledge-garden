// BKG UI Kit demo — Killer App / Dream Machine / Knowledge Garden surfaces.

const { useState } = React;

function App() {
  const [active, setActive] = useState("killer");
  const [phase, setPhase] = useState("build");
  const [composer, setComposer] = useState("");

  const surfaceConfig = {
    killer: {
      title: "Killer App",
      subtitle: "What gets done today — instrumentation, dashboards, measurement.",
    },
    dream: {
      title: "Dream Machine",
      subtitle: "What gets imagined — generative, exploratory, what-if.",
    },
    garden: {
      title: "Knowledge Garden",
      subtitle: "What gets remembered — knowledge base, lineage, lessons.",
    },
    field: { title: "Field log", subtitle: "Today on Twin Peaks Residence." },
    team: { title: "Team", subtitle: "Crew, clients, and lanes." },
  };

  return (
    <div className="bkg-app" data-screen-label="BKG Killer App">
      <Sidebar active={active} onSelect={setActive} />

      <main className="bkg-main">
        <div className="bkg-topbar">
          <div className="bkg-topbar-search">
            <Composer
              placeholder="Say what you need — joint 4B, hairline crack, RFI 014…"
              value={composer}
              onChange={setComposer}
              onSubmit={() => setComposer("")}
            />
          </div>
          <div className="bkg-topbar-right">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--specimen-brass-aged)",
                padding: "5px 12px",
                border: "1px solid var(--specimen-brass-aged)",
                borderRadius: "var(--radius-xs)",
              }}
            >
              Budget · $248,500 · 82%
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--paper-cream)",
                padding: "5px 12px",
                background: "var(--specimen-rust)",
                borderRadius: "var(--radius-xs)",
              }}
            >
              +4d
            </span>
          </div>
        </div>

        <JourneyStrip active={phase} onChange={setPhase} />

        <SurfaceHeader
          surface={active === "field" || active === "team" ? "killer" : active}
          title={surfaceConfig[active]?.title || "Killer App"}
          subtitle={surfaceConfig[active]?.subtitle || ""}
        />

        {/* KPI gauges */}
        <section className="bkg-section">
          <div className="bkg-section-head">
            <h2>This week's instruments</h2>
            <span className="eng-label">YARD 03 · CREW 04 · WK 06 OF 14</span>
          </div>
          <div className="bkg-kpis">
            <Gauge value={0.72} label="Schedule" accent="#3C7A8A" display="+4d" />
            <Gauge value={0.82} label="Budget burn" accent="#A53A2D" display="82%" />
            <Gauge value={0.94} label="Quality" accent="#5E7A56" display="9.4/10" />
          </div>
        </section>

        {/* Workflow recommendations */}
        <section className="bkg-section">
          <div className="bkg-section-head">
            <h2>Next, in this phase</h2>
            <span className="eng-label">RECOMMENDED · 4 OF 11</span>
          </div>
          <div className="bkg-workflows">
            <WorkflowCard
              title="Sign off on rebar inspection"
              blurb="The grid was poured Thursday. Verify section detail at joints 3B and 4B before Monday's concrete."
              verb="Open"
              phase="build"
              accent="#3C7A8A"
            />
            <WorkflowCard
              title="Owner change order — kitchen island"
              blurb="Owner requested a 4 ft extension. We've drafted the variance. Send for signature when you've reviewed."
              verb="Review"
              phase="build"
              accent="#A53A2D"
            />
            <WorkflowCard
              title="Imagine — second-storey balcony"
              blurb="Roof framing is locked. Want to explore a balcony off the primary bedroom? The Dream Machine can sketch options."
              verb="Sketch"
              phase="design"
              accent="#B08D5C"
            />
            <WorkflowCard
              title="Remember — last project's flashing"
              blurb="On Cedar Ridge you swapped to a butyl peel-and-stick at this stage. The Knowledge Garden has the lesson saved."
              verb="Recall"
              phase="grow"
              accent="#5E7A56"
            />
          </div>
        </section>

        {/* Field log */}
        <section className="bkg-section">
          <div className="bkg-section-head">
            <h2>Field log — today</h2>
            <span className="eng-label">2026 · 05 · 27 · 3 ENTRIES</span>
          </div>
          <div className="bkg-specimens">
            <SpecimenCard
              plate="0014"
              date="2026·05·27"
              title="Hairline crack at joint 4B"
              meta="Flagged 09:14 by Field · Yard 03 · North column tie-in"
              quote="Returned within tolerance at 14:02 after re-tension. Recommending recheck at the next pour cycle."
              caption="Viver"
              tag="Flagged"
              tagTone="rust"
            />
            <SpecimenCard
              plate="0015"
              date="2026·05·27"
              title="Rebar grid passes — sec. 3B"
              meta="Field crew · checkpoint 04 of 06"
              quote="All ø 12.5 mm at 200 mm centres; no skew at the column tie-in. Photographs filed."
              caption="Verum"
              tag="Verified"
              tagTone="sage"
            />
          </div>
        </section>

        {/* Budget lattice */}
        <section className="bkg-section">
          <div className="bkg-section-head">
            <h2>Schedule lattice</h2>
            <span className="eng-label">WEEKS 01 — 07 · $248,500 COMMITTED</span>
          </div>
          <BudgetLattice
            weeks={[
              { committed: 22000, spent: 21800 },
              { committed: 28000, spent: 27500 },
              { committed: 34500, spent: 34100 },
              { committed: 41000, spent: 39400, flag: true },
              { committed: 38500, spent: 27200 },
              { committed: 44000, spent: 0 },
              { committed: 40500, spent: 0 },
            ]}
          />
        </section>

        <div className="bkg-foot-rule" />
        <div className="bkg-foot">
          <span>Builder's Knowledge Garden · Killer App</span>
          <span>XRWorkers · Knowledge Gardens · 2026</span>
        </div>
      </main>

      <CompassFab />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
