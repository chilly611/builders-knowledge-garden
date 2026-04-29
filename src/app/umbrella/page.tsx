/**
 * /umbrella Route
 * The Knowledge Gardens — Multi-Vertical Platform Landing
 *
 * The founder's vision: a constellation of vertical gardens (Builder's, Health,
 * Orchid, NatureMark) under one platform thesis. Right now Builder's Knowledge
 * Garden is the only vertical with a real product. This page tells the multi-
 * garden story.
 */

import styles from "./page.module.css";

export const metadata = {
  title: "The Knowledge Gardens — The Umbrella Platform",
  description:
    "Vertical platforms where humans and machines find the recursively improving information, supplies, contractors, and intelligence to build, heal, grow, and care.",
};

export default function UmbrellaPage() {
  return (
    <main className={styles.pageContainer}>
      {/* ═══ HERO SECTION ═══ */}
      <section className={styles.heroSection}>
        <div className={styles.blueprintGrid} />
        <div className={styles.hairlineRule} />

        <div className={styles.heroContent}>
          <div className={styles.heroTextStack}>
            <h1 className={styles.heroHeading}>The Knowledge Gardens</h1>
            <p className={styles.heroSubhead}>
              Vertical platforms where humans and machines find the recursively
              improving information, supplies, contractors, and intelligence to
              build, heal, grow, and care.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className={styles.mainContent}>
        {/* Thesis Section */}
        <section className={styles.thesisSection}>
          <p className={styles.thesisParagraph}>
            Every domain — construction, health, agriculture, conservation — has
            the same problem: the people doing the work are drowning in
            fragmented information while the marketplace gets smarter every
            quarter. The Knowledge Gardens are the antidote: domain-specific
            operating systems where every interaction makes the next one
            sharper. One pattern, many gardens.
          </p>
        </section>

        {/* The Gardens Grid */}
        <section className={styles.gardensSection}>
          <h2 className={styles.sectionHeading}>The Gardens</h2>
          <div className={styles.gardensGrid}>
            {/* Builder's Knowledge Garden */}
            <div className={`${styles.gardenCard} ${styles.builderCard}`}>
              <div className={styles.gardenAccent} />
              <div className={styles.gardenContent}>
                <h3 className={styles.gardenTitle}>
                  Builder's Knowledge Garden
                </h3>
                <p className={styles.gardenStatus}>
                  <span className={styles.statusLive}>Live</span>
                  <span className={styles.statusMeta}>17 workflows · 22 AI specialists</span>
                </p>
                <p className={styles.gardenDescription}>
                  Construction operations OS for small GCs.
                </p>
              </div>
              <a href="/killerapp" className={styles.gardenCTA}>
                Visit →
              </a>
            </div>

            {/* Health Knowledge Garden */}
            <div className={`${styles.gardenCard} ${styles.healthCard}`}>
              <div className={styles.gardenAccent} />
              <div className={styles.gardenContent}>
                <h3 className={styles.gardenTitle}>Health Knowledge Garden</h3>
                <p className={styles.gardenStatus}>
                  <span className={styles.statusComing}>In design</span>
                </p>
                <p className={styles.gardenDescription}>
                  Clinician + patient operating system.
                </p>
              </div>
              <button className={styles.gardenCTADisabled}>Coming</button>
            </div>

            {/* Orchid Knowledge Garden */}
            <div className={`${styles.gardenCard} ${styles.orchidCard}`}>
              <div className={styles.gardenAccent} />
              <div className={styles.gardenContent}>
                <h3 className={styles.gardenTitle}>Orchid Knowledge Garden</h3>
                <p className={styles.gardenStatus}>
                  <span className={styles.statusComing}>In design</span>
                </p>
                <p className={styles.gardenDescription}>
                  Orchid cultivation knowledge + supplies network.
                </p>
              </div>
              <button className={styles.gardenCTADisabled}>Coming</button>
            </div>

            {/* NatureMark */}
            <div className={`${styles.gardenCard} ${styles.naturemarkeCard}`}>
              <div className={styles.gardenAccent} />
              <div className={styles.gardenContent}>
                <h3 className={styles.gardenTitle}>NatureMark</h3>
                <p className={styles.gardenStatus}>
                  <span className={styles.statusComing}>In design</span>
                </p>
                <p className={styles.gardenDescription}>
                  Conservation + ecological data layer.
                </p>
              </div>
              <button className={styles.gardenCTADisabled}>Coming</button>
            </div>
          </div>
        </section>

        {/* The Shared Engine Section */}
        <section className={styles.engineSection}>
          <h2 className={styles.sectionHeading}>What every Garden inherits</h2>
          <ul className={styles.engineList}>
            <li className={styles.engineItem}>
              <span className={styles.bulletCircle} />
              Specialist library — domain AI agents grounded in real data, not
              hallucinations
            </li>
            <li className={styles.engineItem}>
              <span className={styles.bulletCircle} />
              3-source verification — every claim cross-checked against primary,
              secondary, local sources
            </li>
            <li className={styles.engineItem}>
              <span className={styles.bulletCircle} />
              Recursive self-improvement — the five loops that compound from
              every interaction
            </li>
            <li className={styles.engineItem}>
              <span className={styles.bulletCircle} />
              Marketplace surface — supplies, equipment, contractors, capital —
              domain-specific
            </li>
            <li className={styles.engineItem}>
              <span className={styles.bulletCircle} />
              Voice-first input — because experts work with their hands, not at
              desks
            </li>
            <li className={styles.engineItem}>
              <span className={styles.bulletCircle} />
              Lifecycle navigation — every domain has stages — we name them
            </li>
          </ul>
        </section>

        {/* The Compounding Moat Section */}
        <section className={styles.moatSection}>
          <h2 className={styles.sectionHeading}>The compounding moat</h2>
          <p className={styles.moatParagraph}>
            Five RSI loops × N gardens = the rate of improvement compounds
            across domains. A code-compliance signal in the Builder's Garden
            teaches the synthesis engine that powers Loop 2 in the Health
            Garden. The umbrella is the engine; the gardens are the inputs.
          </p>
          <a href="/rsi" className={styles.moatLink}>
            Read the moat narrative →
          </a>
        </section>
      </div>

      {/* ═══ CTA STRIP ═══ */}
      <section className={styles.ctaStrip}>
        <div className={styles.ctaContent}>
          <div className={styles.ctaLeft}>
            <p className={styles.ctaText}>
              Want to seed a Garden?{" "}
              <a href="mailto:founders@theknowledgegardens.com" className={styles.ctaLink}>
                Email founders@theknowledgegardens.com
              </a>
            </p>
          </div>
          <div className={styles.ctaRight}>
            <a href="/killerapp" className={styles.ctaSecondary}>
              See Builder's Garden in action → /killerapp
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
