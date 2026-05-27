// Orchids UI Kit — botanical intelligence platform.
// Load AFTER React + Babel.

const { useState } = React;

// ── HERO BANNER ───────────────────────────────────────────────────────────
function HeroBanner({ onBrowse, onSpecies, onAcquire }) {
  return (
    <header className="orc-hero">
      <div className="orc-hero-sources">WCVP / Kew Gardens · iNaturalist · Ecuagenera</div>
      <h1 className="orc-hero-title">The Orchid Intelligence Garden</h1>
      <div className="orc-hero-sub">Where botanical science meets engineering precision</div>
      <div className="orc-rule" />
      <Stats />
      <div className="orc-cta-row">
        <button type="button" className="orc-cta orc-cta-primary" onClick={onBrowse}>Browse genera</button>
        <button type="button" className="orc-cta orc-cta-secondary" onClick={onSpecies}>Species experience</button>
        <button type="button" className="orc-cta orc-cta-accent" onClick={onAcquire}>Acquire @ Ecuagenera</button>
      </div>
    </header>
  );
}

// ── STATS BAR ─────────────────────────────────────────────────────────────
function Stats() {
  const items = [
    ["400", "Species"],
    ["69", "Genera"],
    ["3", "Sources"],
    ["475", "Pages"],
  ];
  return (
    <div className="orc-stats">
      {items.map(([n, l]) => (
        <div key={l} style={{ textAlign: "center" }}>
          <div className="orc-stat-num">{n}</div>
          <div className="orc-stat-label">{l}</div>
        </div>
      ))}
    </div>
  );
}

// ── SEARCH ────────────────────────────────────────────────────────────────
function Search({ value, onChange, placeholder = "Search 400 species — Phalaenopsis, Cattleya, Vanda…" }) {
  return (
    <div className="orc-search">
      <span className="orc-search-leader">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
      </span>
      <input
        className="orc-search-input"
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange && onChange(e.target.value)}
      />
      <span className="orc-search-shortcut">⌘K</span>
    </div>
  );
}

// ── SPECIES CARD ──────────────────────────────────────────────────────────
function SpeciesCard({ sci, common, observations, price, swatch, accent, onClick }) {
  return (
    <a className="orc-species" onClick={onClick}>
      <div
        className="orc-species-photo"
        style={{
          background: `linear-gradient(135deg, ${swatch[0]}, ${swatch[1]} 55%, ${swatch[2]})`,
        }}
      >
        <OrchidGlyph accent={accent} />
      </div>
      <div className="orc-species-info">
        <div className="orc-species-sci">{sci}</div>
        {common && <div className="orc-species-common">{common}</div>}
        <div className="orc-species-stat-row">
          <div className="orc-species-obs">{observations.toLocaleString()} observations</div>
          {price && <div className="orc-species-price">${price}</div>}
        </div>
        <div className="orc-species-sources">
          <span>WCVP</span><span>·</span><span>iNaturalist</span><span>·</span><span>Ecuagenera</span>
        </div>
      </div>
    </a>
  );
}

// ── BOTANICAL GLYPH (placeholder line illustration of an orchid) ─────────
function OrchidGlyph({ accent = "#FBF8F3" }) {
  return (
    <svg
      viewBox="0 0 220 200"
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0, mixBlendMode: "soft-light" }}
    >
      <g stroke={accent} strokeWidth="1.2" fill="none" opacity="0.85" strokeLinecap="round">
        {/* stem */}
        <path d="M110 200 C 108 160, 112 130, 110 100" />
        {/* leaves */}
        <path d="M110 190 C 70 175, 50 150, 38 132 C 60 138, 88 155, 110 175" fill={accent} opacity="0.18" />
        <path d="M110 188 C 150 174, 174 152, 188 135 C 165 140, 138 158, 110 175" fill={accent} opacity="0.16" />
        {/* outer petals */}
        <path d="M110 100 C 70 70, 55 50, 50 30 C 70 38, 92 60, 110 78" fill={accent} opacity="0.28" />
        <path d="M110 100 C 150 70, 165 50, 170 30 C 150 38, 128 60, 110 78" fill={accent} opacity="0.28" />
        {/* side petals */}
        <path d="M110 92 C 84 88, 64 72, 56 56 C 76 66, 96 80, 110 90" fill={accent} opacity="0.25" />
        <path d="M110 92 C 136 88, 156 72, 164 56 C 144 66, 124 80, 110 90" fill={accent} opacity="0.25" />
        {/* lip */}
        <path d="M110 90 C 92 102, 90 122, 110 134 C 130 122, 128 102, 110 90 Z" fill={accent} opacity="0.5" />
        {/* center */}
        <circle cx="110" cy="106" r="3.2" fill={accent} opacity="0.9" />
        {/* dashed bounding marks (engineering schematic feel) */}
        <line x1="14" y1="20" x2="206" y2="20" strokeDasharray="2 4" opacity="0.35" />
        <line x1="14" y1="20" x2="14" y2="40" strokeDasharray="2 4" opacity="0.35" />
        <line x1="206" y1="20" x2="206" y2="40" strokeDasharray="2 4" opacity="0.35" />
      </g>
      <g fill={accent} opacity="0.6" fontFamily="Space Mono, monospace" fontSize="7" letterSpacing="1.6">
        <text x="14" y="14">FIG. I — SPEC.</text>
        <text x="14" y="192">PLATE NO. 14</text>
      </g>
    </svg>
  );
}

// ── GENUS TILE ────────────────────────────────────────────────────────────
function GenusTile({ name, count, onClick }) {
  return (
    <a className="orc-genus" onClick={onClick}>
      <div className="orc-genus-name">{name}</div>
      <div className="orc-genus-count">{count} species</div>
    </a>
  );
}

// ── SIGNUP BANNER ─────────────────────────────────────────────────────────
function SignupBanner() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <section className="orc-signup">
      <div>
        <div className="orc-signup-title">A new species, in your inbox.</div>
        <div className="orc-signup-sub">
          Every other week — one rare orchid, three sources, and the lineage of how we identified it.
        </div>
      </div>
      <form
        className="orc-signup-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (email) setSent(true);
        }}
      >
        <input
          type="email"
          className="orc-signup-input"
          placeholder="botanist@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="orc-signup-btn">{sent ? "Sent · check inbox" : "Subscribe"}</button>
      </form>
    </section>
  );
}

// ── ORCHID COMPASS FAB (with expandable panel) ────────────────────────────
function OrchidCompass() {
  const [open, setOpen] = useState(false);
  const items = [
    { id: "home", title: "Home", sub: "400 species · 69 genera · search" },
    { id: "orrery", title: "Browse genera", sub: "The orrery · 3D genus browser" },
    { id: "species", title: "Species experience", sub: "Photo · blueprint · intelligence" },
    { id: "present", title: "Presentation", sub: "Platform demo" },
  ];
  const [active, setActive] = useState("home");
  return (
    <>
      {open && (
        <div className="orc-compass-panel">
          <div className="orc-compass-head">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B87333" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              <circle cx="12" cy="12" r="3" fill="#B87333" opacity="0.3" />
            </svg>
            <span className="orc-compass-head-text">Navigate the gardens</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {items.map((it) => (
              <a
                key={it.id}
                className={`orc-compass-item ${active === it.id ? "is-active" : ""}`}
                onClick={() => setActive(it.id)}
              >
                <div className="orc-compass-icon">
                  <CompassIcon id={it.id} />
                </div>
                <div>
                  <div className="orc-compass-text-title">{it.title}</div>
                  <div className="orc-compass-text-sub">{it.sub}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        className={`orc-compass ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open compass"
      >
        <svg width="28" height="28" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" stroke="#1A5C5C" strokeWidth=".5" opacity=".15" fill="none" />
          <path d="M24 4 L26 14 L22 14 Z" fill="#1A5C5C" opacity=".55" />
          <path d="M24 44 L22 34 L26 34 Z" fill="#B87333" opacity=".35" />
          <path d="M4 24 L14 22 L14 26 Z" fill="#B87333" opacity=".35" />
          <path d="M44 24 L34 26 L34 22 Z" fill="#B87333" opacity=".35" />
          <circle cx="24" cy="24" r="2.5" fill="none" stroke="#1A5C5C" strokeWidth=".7" />
          <circle cx="24" cy="24" r="1" fill="#B87333" />
        </svg>
      </button>
    </>
  );
}

function CompassIcon({ id }) {
  const s = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" };
  if (id === "home") return <svg {...s}><path d="M12 4 C 9 8, 7 12, 7 16 a 5 5 0 0 0 10 0 C 17 12, 15 8, 12 4 Z" /></svg>;
  if (id === "orrery") return <svg {...s}><circle cx="12" cy="12" r="3" /><ellipse cx="12" cy="12" rx="9" ry="3.5" /><ellipse cx="12" cy="12" rx="3.5" ry="9" /></svg>;
  if (id === "species") return <svg {...s}><circle cx="12" cy="12" r="3" /><path d="M12 4 v4 M12 16 v4 M4 12 h4 M16 12 h4" /></svg>;
  return <svg {...s}><rect x="4" y="6" width="16" height="12" rx="1" /><path d="M4 10 h16 M8 6 v12" /></svg>;
}

Object.assign(window, {
  HeroBanner,
  Stats,
  Search,
  SpeciesCard,
  GenusTile,
  SignupBanner,
  OrchidCompass,
  OrchidGlyph,
});
