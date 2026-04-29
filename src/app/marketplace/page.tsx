'use client';

import Link from 'next/link';
import styles from './page.module.css';

/* ═══════════════════════════════════════════════════════════════════
   /marketplace — Integrated Marketplace Landing
   Six pillars: Supplies, Equipment, Talent, Capital, Legal, Robots
   Drafting-paper aesthetic. Nav landing showing breadth.
   ═══════════════════════════════════════════════════════════════════ */

const PILLARS = [
  {
    id: 'supplies',
    emoji: '📦',
    title: 'Supplies & Materials',
    status: 'Live',
    statusType: 'live',
    meta: '3 vendor adapters',
    description: 'Real-time prices from Home Depot Pro, 84 Lumber, White Cap. Lead times, branch distance, confidence scores.',
    href: '/killerapp/workflows/supply-ordering',
    isLive: true,
  },
  {
    id: 'equipment',
    emoji: '🏗️',
    title: 'Equipment',
    status: 'Live',
    statusType: 'live',
    meta: undefined,
    description: 'Rent vs buy decisioning. National + regional fleet partners. Reservation handoff.',
    href: '/killerapp/workflows/equipment',
    isLive: true,
  },
  {
    id: 'talent',
    emoji: '👥',
    title: 'Talent network',
    status: 'In design',
    statusType: 'design',
    meta: undefined,
    description: 'Verified contractors, specialty trades, crew leasing. RSI-rated track record.',
    href: null,
    isLive: false,
  },
  {
    id: 'capital',
    emoji: '💰',
    title: 'Capital & Financing',
    status: 'Q3',
    statusType: 'q3',
    meta: undefined,
    description: 'Project lending, draw schedules tied to journey progress, retainage chase, factoring.',
    href: null,
    isLive: false,
  },
  {
    id: 'legal',
    emoji: '⚖️',
    title: 'Legal & Compliance',
    status: 'Live',
    statusType: 'live',
    meta: '6 contract templates',
    description: 'Drafted contracts, lien-waiver tracking, attorney review network.',
    href: '/killerapp/workflows/contract-templates',
    isLive: true,
  },
  {
    id: 'robots',
    emoji: '🤖',
    title: 'Robots & AI agents',
    status: 'Q4',
    statusType: 'q4',
    meta: undefined,
    description: 'Autonomous scopers, layout robots, AI subcontractors. Specialist library is the seed.',
    href: null,
    isLive: false,
  },
];

/* ─── PillarCard Component ─── */
function PillarCard({ pillar }: { pillar: typeof PILLARS[number] }) {
  const content = (
    <div className={styles.pillarCard}>
      <div className={styles.pillarHeader}>
        <span className={styles.pillarEmoji}>{pillar.emoji}</span>
        <div className={styles.pillarTitleGroup}>
          <h3 className={styles.pillarTitle}>{pillar.title}</h3>
          <div className={styles.pillarStatus}>
            <span className={`${styles.statusPill} ${styles[`status${pillar.statusType}`]}`}>
              {pillar.status} {pillar.meta && <span className={styles.statusMeta}>· {pillar.meta}</span>}
            </span>
          </div>
        </div>
      </div>
      <p className={styles.pillarDescription}>{pillar.description}</p>
      <div className={styles.pillarFooter}>
        {pillar.isLive ? (
          <span className={styles.cta}>{pillar.href ? 'Explore →' : 'View'}</span>
        ) : (
          <span className={styles.ctaDisabled}>Notify me</span>
        )}
      </div>
    </div>
  );

  if (pillar.isLive && pillar.href) {
    return (
      <Link href={pillar.href} className={styles.pillarCardLink}>
        {content}
      </Link>
    );
  }

  return content;
}

/* ─── Integration Flow Tile ─── */
function IntegrationFlow() {
  return (
    <div className={styles.integrationTile}>
      <div className={styles.flowSteps}>
        <div className={styles.flowStep}>
          <div className={styles.flowLabel}>Estimate</div>
          <div className={styles.flowPhase}>q2</div>
        </div>
        <div className={styles.flowArrow}>→</div>
        <div className={styles.flowStep}>
          <div className={styles.flowLabel}>Order supplies</div>
          <div className={styles.flowPhase}>q11</div>
        </div>
        <div className={styles.flowArrow}>→</div>
        <div className={styles.flowStep}>
          <div className={styles.flowLabel}>Update budget</div>
          <div className={styles.flowPhase}>cockpit</div>
        </div>
      </div>
      <p className={styles.flowCaption}>One thread. Three pillars. No re-typing.</p>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <div className={styles.pageContainer}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.blueprintGrid} />

        <div className={styles.hairlineRule} />

        <div className={styles.heroContent}>
          <div className={styles.heroTextStack}>
            <h1 className={styles.heroHeading}>The Marketplace</h1>
            <p className={styles.heroSubhead}>
              Everything a builder needs to run a job — supplies, crew, capital, code, AI — in one negotiated layer.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Pillars Grid */}
        <section className={styles.pillarsSection}>
          <div className={styles.pillarsGrid}>
            {PILLARS.map(pillar => (
              <PillarCard key={pillar.id} pillar={pillar} />
            ))}
          </div>
        </section>

        {/* Integration Thesis */}
        <section className={styles.thesisSection}>
          <p className={styles.thesisParagraph}>
            Every marketplace pillar plugs into the same project lifecycle. A supply order updates the budget. A new sub-bid updates the schedule. A code-compliance flag triggers a permit application. The pillars don't compete — they coordinate.
          </p>
        </section>

        {/* Cross-pillar Example */}
        <section className={styles.exampleSection}>
          <h2 className={styles.exampleHeading}>The integration thesis in action</h2>
          <IntegrationFlow />
        </section>

        {/* Final CTA */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaSpacer} />
          <p className={styles.ctaPrompt}>Ready to see it work?</p>
          <Link href="/killerapp/workflows/supply-ordering" className={styles.ctaButton}>
            Explore supply ordering →
          </Link>
        </section>
      </main>
    </div>
  );
}
