// Reusable BKG components — herbarium × engineering × OS chrome.
// Load AFTER React + Babel and BEFORE app.jsx. Exports to window.

const { useState, useEffect } = React;

// ── 1. BKG LOGO MARK (SVG approximation of "B" built from tools) ───────────
function BkgMark({ size = 28 }) {
  return (
    <img
      src="../../assets/logo/bkg-transparent.png"
      width={size}
      height={size}
      alt="Builder's Knowledge Garden"
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}

// ── 2. SIDEBAR ────────────────────────────────────────────────────────────
function Sidebar({ active, onSelect }) {
  const items = [
    { id: "killer", label: "Killer App", sub: "What gets done" },
    { id: "dream", label: "Dream Machine", sub: "What gets imagined" },
    { id: "garden", label: "Knowledge Garden", sub: "What gets remembered" },
    { id: "field", label: "Field log", sub: "Today" },
    { id: "team", label: "Team", sub: "Crew & clients" },
  ];
  return (
    <aside className="bkg-sidebar">
      <div className="bkg-sidebar-brand">
        <BkgMark size={36} />
        <div>
          <div className="bkg-sidebar-brand-title">Builder's</div>
          <div className="bkg-sidebar-brand-sub">Knowledge Garden</div>
        </div>
      </div>
      <nav className="bkg-sidebar-nav">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            className={`bkg-sidebar-item ${active === it.id ? "is-active" : ""}`}
            onClick={() => onSelect && onSelect(it.id)}
          >
            <div className="bkg-sidebar-item-marker" />
            <div className="bkg-sidebar-item-text">
              <div className="bkg-sidebar-item-label">{it.label}</div>
              <div className="bkg-sidebar-item-sub">{it.sub}</div>
            </div>
          </button>
        ))}
      </nav>
      <div className="bkg-sidebar-foot">
        <div className="eng-label">PROJECT</div>
        <div className="bkg-sidebar-project">Twin Peaks Residence</div>
        <div className="eng-label" style={{ marginTop: 6, color: "var(--specimen-brass-aged)" }}>BUDGET · $248,500</div>
      </div>
    </aside>
  );
}

// ── 3. JOURNEY STRIP — DREAM → DESIGN → PLAN → BUILD → DELIVER → GROW ─────
function JourneyStrip({ active = "build", onChange }) {
  const phases = [
    { id: "dream", label: "Dream", n: "01" },
    { id: "design", label: "Design", n: "02" },
    { id: "plan", label: "Plan", n: "03" },
    { id: "build", label: "Build", n: "04" },
    { id: "deliver", label: "Deliver", n: "05" },
    { id: "grow", label: "Grow", n: "06" },
  ];
  return (
    <div className="bkg-journey">
      {phases.map((p, i) => {
        const done = phases.findIndex((x) => x.id === active) > i;
        const cur = p.id === active;
        return (
          <React.Fragment key={p.id}>
            <button
              type="button"
              className={`bkg-journey-pill ${cur ? "is-current" : ""} ${done ? "is-done" : ""}`}
              onClick={() => onChange && onChange(p.id)}
            >
              <span className="bkg-journey-num">{p.n}</span>
              <span className="bkg-journey-label">{p.label}</span>
            </button>
            {i < phases.length - 1 && <span className="bkg-journey-rule" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── 4. INSTRUMENT GAUGE — for KPI tiles ───────────────────────────────────
function Gauge({ value = 0.5, label = "Gauge", accent = "#3C7A8A", display = "" }) {
  // value: 0..1 → needle rotation -130deg..+130deg
  const deg = -130 + value * 260;
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = ((-130 + i * 26) * Math.PI) / 180;
    const r1 = 60, r2 = i % 5 === 0 ? 52 : 56;
    ticks.push(
      <line
        key={i}
        x1={85 + Math.cos(a) * r1} y1={85 + Math.sin(a) * r1}
        x2={85 + Math.cos(a) * r2} y2={85 + Math.sin(a) * r2}
        stroke={i % 5 === 0 ? "#2A2620" : "#5A3B1F"}
        strokeWidth={i % 5 === 0 ? 1.4 : 0.8}
        strokeLinecap="round"
        opacity={i % 5 === 0 ? 0.9 : 0.55}
      />
    );
  }
  const id = `g${Math.random().toString(36).slice(2, 7)}`;
  return (
    <div className="bkg-gauge">
      <svg viewBox="0 0 170 170" width="100%">
        <defs>
          <radialGradient id={`brass-${id}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#E2CFA6" />
            <stop offset="55%" stopColor="#B08D5C" />
            <stop offset="100%" stopColor="#7C6235" />
          </radialGradient>
          <radialGradient id={`face-${id}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.5" />
          </radialGradient>
        </defs>
        <circle cx="85" cy="85" r="78" fill={`url(#brass-${id})`} stroke="#7C6235" strokeWidth="1.5" />
        <circle cx="85" cy="85" r="66" fill="#F2E9D2" stroke="#7C6235" strokeWidth="0.5" />
        <circle cx="85" cy="85" r="62" fill={`url(#face-${id})`} />
        {ticks}
        <text x="85" y="128" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" letterSpacing="1.6" fill="#2A2620">
          {label.toUpperCase()}
        </text>
        <g transform={`translate(85 85) rotate(${deg})`}>
          <line x1="0" y1="6" x2="0" y2="-50" stroke="#2A2620" strokeWidth="2" strokeLinecap="round" />
        </g>
        <circle cx="85" cy="85" r="6" fill="#7C6235" stroke="#2A2620" strokeWidth="0.6" />
        <circle cx="85" cy="85" r="2.5" fill="#2A2620" />
      </svg>
      <div className="bkg-gauge-display">{display}</div>
    </div>
  );
}

// ── 5. SPECIMEN CARD ──────────────────────────────────────────────────────
function SpecimenCard({ plate, phase = "BUILD", date, title, meta, quote, caption, tag, tagTone = "rust", children, onClick }) {
  return (
    <article className={`bkg-specimen ${onClick ? "is-clickable" : ""}`} onClick={onClick}>
      <header className="bkg-specimen-head">
        <span className="eng-label">PLATE NO. {plate} · {phase} · {date}</span>
        {tag && <span className={`bkg-specimen-tag tone-${tagTone}`}>{tag}</span>}
      </header>
      <h3 className="bkg-specimen-title">{title}</h3>
      {meta && <div className="bkg-specimen-meta">{meta}</div>}
      {quote && <p className="bkg-specimen-quote">"{quote}"</p>}
      {children}
      {caption && <div className="plate-caption bkg-specimen-caption">{caption}</div>}
    </article>
  );
}

// ── 6. WORKFLOW / NEXT-STEP CARD ──────────────────────────────────────────
function WorkflowCard({ title, blurb, verb = "Open", phase = "build", accent = "#3C7A8A" }) {
  return (
    <button type="button" className="bkg-workflow" style={{ "--workflow-accent": accent }}>
      <div className="bkg-workflow-marker" />
      <div className="bkg-workflow-body">
        <div className="eng-label" style={{ color: accent }}>PHASE · {phase.toUpperCase()}</div>
        <div className="bkg-workflow-title">{title}</div>
        <div className="bkg-workflow-blurb">{blurb}</div>
      </div>
      <div className="bkg-workflow-cta">
        <span>{verb}</span>
        <span className="bkg-workflow-arrow">→</span>
      </div>
    </button>
  );
}

// ── 7. SEARCH / COMPOSER FIELD ────────────────────────────────────────────
function Composer({ placeholder = "Say what you need…", value, onChange, onSubmit }) {
  return (
    <form
      className="bkg-composer"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit && onSubmit(value);
      }}
    >
      <div className="bkg-composer-leader">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
      </div>
      <input
        className="bkg-composer-input"
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange && onChange(e.target.value)}
      />
      <button type="submit" className="bkg-composer-submit">
        Ask
      </button>
    </form>
  );
}

// ── 8. COMPASS FAB (bottom-right) ─────────────────────────────────────────
function CompassFab({ onClick }) {
  return (
    <button type="button" className="bkg-compass" onClick={onClick} aria-label="Open compass">
      <svg width="32" height="32" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" stroke="#234C5A" strokeWidth=".7" opacity=".25" fill="none" />
        <path d="M24 4 L26.5 24 L21.5 24 Z" fill="#234C5A" opacity=".75" />
        <path d="M24 44 L21.5 24 L26.5 24 Z" fill="#A53A2D" opacity=".55" />
        <path d="M4 24 L24 21.5 L24 26.5 Z" fill="#B08D5C" opacity=".55" />
        <path d="M44 24 L24 26.5 L24 21.5 Z" fill="#B08D5C" opacity=".55" />
        <circle cx="24" cy="24" r="3" fill="none" stroke="#234C5A" strokeWidth=".9" />
        <circle cx="24" cy="24" r="1.2" fill="#A53A2D" />
      </svg>
    </button>
  );
}

// ── 9. BUDGET LATTICE — schedule across weeks ─────────────────────────────
function BudgetLattice({ weeks }) {
  return (
    <div className="bkg-lattice">
      {weeks.map((w, i) => (
        <div key={i} className={`bkg-lattice-cell ${w.flag ? "is-flag" : ""}`}>
          <div className="eng-label">W{i + 1}</div>
          <div className="bkg-lattice-amount">${w.committed.toLocaleString()}</div>
          <div className="bkg-lattice-meta">spent ${w.spent.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

// ── 10. SURFACE HEADER (chrome that swaps per surface) ────────────────────
function SurfaceHeader({ surface = "killer", title, subtitle }) {
  const map = {
    killer: { plate: "chrome-killer-app.png", accent: "var(--specimen-teal)", second: "var(--specimen-rust)" },
    dream: { plate: "chrome-dream-machine.png", accent: "var(--specimen-brass)", second: "var(--specimen-amber)" },
    garden: { plate: "chrome-knowledge-garden.png", accent: "var(--specimen-sage)", second: "var(--specimen-sage-deep)" },
  };
  const cfg = map[surface] || map.killer;
  return (
    <header className="bkg-surface-header" style={{ "--surface-accent": cfg.accent, "--surface-2": cfg.second }}>
      <div className="bkg-surface-header-art">
        <img src={`../../assets/plates/${cfg.plate}`} alt="" />
      </div>
      <div className="bkg-surface-header-text">
        <div className="eng-label" style={{ color: cfg.accent }}>SURFACE</div>
        <h1 className="bkg-surface-header-title">{title}</h1>
        <div className="bkg-surface-header-sub">{subtitle}</div>
      </div>
    </header>
  );
}

Object.assign(window, {
  BkgMark,
  Sidebar,
  JourneyStrip,
  Gauge,
  SpecimenCard,
  WorkflowCard,
  Composer,
  CompassFab,
  BudgetLattice,
  SurfaceHeader,
});
