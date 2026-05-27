// Orchids site demo — homepage + browse + signup.

const { useState } = React;

const FEATURED = [
  {
    sci: "Phalaenopsis schilleriana",
    common: "Schiller's Phalaenopsis",
    observations: 1842,
    price: 38,
    swatch: ["#E0B7B0", "#C28079", "#7A3F3A"],
    accent: "#FBF8F3",
  },
  {
    sci: "Cattleya labiata",
    common: "Crimson Cattleya",
    observations: 2412,
    price: 64,
    swatch: ["#C99DCB", "#9C5DA5", "#5D2F6A"],
    accent: "#FBF8F3",
  },
  {
    sci: "Vanda coerulea",
    common: "Blue Vanda",
    observations: 982,
    price: 89,
    swatch: ["#9CB7CC", "#6D8FB0", "#345066"],
    accent: "#FBF8F3",
  },
  {
    sci: "Dendrobium nobile",
    common: "Noble Dendrobium",
    observations: 1654,
    price: 28,
    swatch: ["#F0D2A4", "#D9A368", "#8A5A28"],
    accent: "#FBF8F3",
  },
  {
    sci: "Oncidium flexuosum",
    common: "Dancing Lady",
    observations: 765,
    price: 22,
    swatch: ["#F2DA86", "#D8B340", "#7E6018"],
    accent: "#FBF8F3",
  },
  {
    sci: "Masdevallia veitchiana",
    common: "King of Masdevallia",
    observations: 408,
    price: 54,
    swatch: ["#E6745B", "#B83C28", "#6E1F12"],
    accent: "#FBF8F3",
  },
  {
    sci: "Cymbidium tracyanum",
    common: "Tracy's Cymbidium",
    observations: 612,
    price: 46,
    swatch: ["#BFC9A2", "#8AA168", "#445230"],
    accent: "#FBF8F3",
  },
  {
    sci: "Paphiopedilum sukhakulii",
    common: "Sukhakul's Slipper",
    observations: 522,
    price: 72,
    swatch: ["#CDB987", "#9C8347", "#534224"],
    accent: "#FBF8F3",
  },
];

const GENERA = [
  ["Phalaenopsis", 64], ["Cattleya", 48], ["Dendrobium", 56], ["Oncidium", 42],
  ["Vanda", 28], ["Masdevallia", 35], ["Cymbidium", 38], ["Paphiopedilum", 31],
  ["Bulbophyllum", 53], ["Epidendrum", 24], ["Brassia", 18], ["Miltonia", 22],
];

function App() {
  const [query, setQuery] = useState("");

  const filteredFeatured = query
    ? FEATURED.filter(f => f.sci.toLowerCase().includes(query.toLowerCase()) || f.common.toLowerCase().includes(query.toLowerCase()))
    : FEATURED;
  const filteredGenera = query
    ? GENERA.filter(([n]) => n.toLowerCase().includes(query.toLowerCase()))
    : GENERA;

  return (
    <div className="orc-shell" data-screen-label="Orchids — homepage">
      <HeroBanner />

      <div className="orc-rule-faint" />

      <section className="orc-section" style={{ marginTop: 0 }}>
        <Search value={query} onChange={setQuery} />
      </section>

      <section className="orc-section">
        <h2 className="orc-section-title">Featured species</h2>
        {filteredFeatured.length === 0 ? (
          <div style={{ fontStyle: "italic", color: "#71797E", padding: "8px 0" }}>
            No featured species match "{query}". Try a genus name.
          </div>
        ) : (
          <div className="orc-features">
            {filteredFeatured.map((s) => (
              <SpeciesCard key={s.sci} {...s} />
            ))}
          </div>
        )}
      </section>

      <section className="orc-section">
        <h2 className="orc-section-title">Browse by genus</h2>
        <div className="orc-genera">
          {filteredGenera.map(([name, count]) => (
            <GenusTile key={name} name={name} count={count} />
          ))}
        </div>
      </section>

      <SignupBanner />

      <footer className="orc-foot">
        <div>Data · WCVP / Kew Gardens · iNaturalist · Ecuagenera</div>
        <div style={{ marginTop: 6 }}>The Knowledge Gardens · XRWorkers · 2026</div>
      </footer>

      <OrchidCompass />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
