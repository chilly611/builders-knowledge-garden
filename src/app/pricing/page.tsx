'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/* ─── Supabase Browser Setup ─── */
let browserClient: SupabaseClient | null = null;
function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url.includes('placeholder')) {
    return createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
  }
  browserClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return browserClient;
}

/* ─── Tier Data (inline, self-contained) ─── */
interface TierInfo {
  name: string;
  slug: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
  highlighted?: boolean;
}

const TIERS: TierInfo[] = [
  {
    name: 'Explorer',
    slug: 'explorer',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Explore the knowledge garden and dream freely',
    features: [
      'Browse 40,000+ knowledge entities',
      '5 AI Copilot queries per day',
      'Dream Builder (all interfaces)',
      '1 saved project',
      'Community access',
    ],
  },
  {
    name: 'Pro',
    slug: 'pro',
    monthlyPrice: 49,
    yearlyPrice: 470,
    description: 'Everything you need to build professionally',
    features: [
      'Unlimited AI Copilot queries',
      '5 active projects',
      'Smart Project Launcher (The COO)',
      'AI estimating & scheduling',
      'Compliance checker (all jurisdictions)',
      'Budget tracking & burn rate',
      'Full CRM pipeline',
      'Marketplace access',
      'Voice field reporting',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    name: 'Team',
    slug: 'team',
    monthlyPrice: 199,
    yearlyPrice: 1910,
    description: 'Scale your construction business',
    features: [
      'Everything in Pro',
      'Unlimited projects',
      'Team management (up to 50 members)',
      'Financial tools & invoicing',
      'Voice field ops (offline + multi-language)',
      'Integrations (QuickBooks, Procore, etc.)',
      'XR-ready work instructions',
      'Advanced analytics',
      'Dedicated onboarding',
    ],
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    monthlyPrice: 499,
    yearlyPrice: 4790,
    description: 'Full platform power for large operations',
    features: [
      'Everything in Team',
      'Unlimited team members',
      'White-label & custom domains',
      'Dedicated API & MCP server',
      'Robot integration layer',
      'Advanced analytics & BI',
      'SSO / SAML',
      'Custom SLA',
      'Co-development partnership',
    ],
  },
];

/* ─── FAQ Data ─── */
interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Can I change my plan anytime?',
    answer:
      "Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle, and we'll prorate any charges accordingly.",
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, Mastercard, American Express) and Apple Pay. All payments are processed securely through Stripe.',
  },
  {
    question: 'Is there a contract or long-term commitment?',
    answer:
      'No contracts. Monthly plans renew each month and yearly plans renew each year. You can cancel anytime before your renewal date with no penalties.',
  },
  {
    question: 'What does the free Explorer tier include?',
    answer:
      'The Explorer tier gives you free access to browse 40,000+ knowledge entities, 5 daily AI queries, the Dream Builder, 1 saved project, and community access. Perfect for getting started.',
  },
  {
    question: 'Do you offer discounts for annual billing?',
    answer:
      'Yes! Our yearly plans offer significant savings—approximately 4 months free compared to monthly billing. You can see exact savings by toggling to yearly pricing above.',
  },
];

/* ─── Feature Comparison Grid ─── */
interface FeatureCategory {
  name: string;
  features: {
    name: string;
    explorer: string | boolean;
    pro: string | boolean;
    team: string | boolean;
    enterprise: string | boolean;
  }[];
}

const FEATURE_COMPARISON: FeatureCategory[] = [
  {
    name: 'Core Features',
    features: [
      {
        name: 'Knowledge Entity Browser',
        explorer: '40,000+',
        pro: '40,000+',
        team: '40,000+',
        enterprise: '40,000+',
      },
      {
        name: 'Dream Builder',
        explorer: true,
        pro: true,
        team: true,
        enterprise: true,
      },
      {
        name: 'AI Copilot Queries/Day',
        explorer: '5',
        pro: 'Unlimited',
        team: 'Unlimited',
        enterprise: 'Unlimited',
      },
      {
        name: 'Projects',
        explorer: '1',
        pro: '5',
        team: 'Unlimited',
        enterprise: 'Unlimited',
      },
    ],
  },
  {
    name: 'Professional Tools',
    features: [
      {
        name: 'Smart Project Launcher (COO)',
        explorer: false,
        pro: true,
        team: true,
        enterprise: true,
      },
      {
        name: 'AI Estimating & Scheduling',
        explorer: false,
        pro: true,
        team: true,
        enterprise: true,
      },
      {
        name: 'Budget Tracking',
        explorer: false,
        pro: true,
        team: true,
        enterprise: true,
      },
      {
        name: 'Full CRM Pipeline',
        explorer: false,
        pro: true,
        team: true,
        enterprise: true,
      },
      {
        name: 'Marketplace Access',
        explorer: false,
        pro: true,
        team: true,
        enterprise: true,
      },
    ],
  },
  {
    name: 'Team & Collaboration',
    features: [
      {
        name: 'Team Members',
        explorer: '1',
        pro: '1',
        team: '50',
        enterprise: 'Unlimited',
      },
      {
        name: 'Voice Field Reporting',
        explorer: false,
        pro: true,
        team: true,
        enterprise: true,
      },
      {
        name: 'Voice Field Ops (Offline)',
        explorer: false,
        pro: false,
        team: true,
        enterprise: true,
      },
      {
        name: 'Advanced Analytics',
        explorer: false,
        pro: false,
        team: true,
        enterprise: true,
      },
      {
        name: 'Dedicated Onboarding',
        explorer: false,
        pro: false,
        team: true,
        enterprise: true,
      },
    ],
  },
  {
    name: 'Enterprise Features',
    features: [
      {
        name: 'White-Label & Custom Domains',
        explorer: false,
        pro: false,
        team: false,
        enterprise: true,
      },
      {
        name: 'Dedicated API & MCP Server',
        explorer: false,
        pro: false,
        team: false,
        enterprise: true,
      },
      {
        name: 'Robot Integration',
        explorer: false,
        pro: false,
        team: false,
        enterprise: true,
      },
      {
        name: 'SSO / SAML',
        explorer: false,
        pro: false,
        team: false,
        enterprise: true,
      },
      {
        name: 'Custom SLA',
        explorer: false,
        pro: false,
        team: false,
        enterprise: true,
      },
    ],
  },
];

/* ─── Color Palette ─── */
const COLORS = {
  bg_dark: '#0A0F1C',
  bg_medium: '#141B2D',
  accent_green: '#1D9E75',
  accent_orange: '#D85A30',
  accent_purple: '#7F77DD',
  accent_blue: '#378ADD',
  text_primary: '#FFFFFF',
  text_secondary: '#B8C1D4',
  text_muted: '#7A8499',
  border_light: 'rgba(255, 255, 255, 0.08)',
  success: '#10B981',
};

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleCheckout = async (tierSlug: string, interval: 'monthly' | 'yearly') => {
    if (tierSlug === 'explorer') {
      window.location.href = '/dream';
      return;
    }

    if (tierSlug === 'enterprise') {
      window.location.href = 'mailto:hello@theknowledgegardens.com?subject=Enterprise%20Inquiry';
      return;
    }

    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please sign in to subscribe');
        return;
      }
      const res = await fetch('/api/v1/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tier: tierSlug, interval }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
      alert('An error occurred. Please try again.');
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${COLORS.bg_dark} 0%, ${COLORS.bg_medium} 100%)`,
    padding: '60px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  };

  const sectionStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '80px',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
    fontWeight: 700,
    color: COLORS.text_primary,
    margin: '0 0 20px 0',
    letterSpacing: '-1.5px',
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: '1.25rem',
    color: COLORS.text_secondary,
    margin: '0 0 40px 0',
    maxWidth: '600px',
    marginLeft: 'auto',
    marginRight: 'auto',
  };

  const toggleContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    marginBottom: '60px',
  };

  const toggleLabelStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 500,
    color: COLORS.text_secondary,
    cursor: 'pointer',
    transition: 'color 0.3s ease',
  };

  const toggleButtonStyle: React.CSSProperties = {
    position: 'relative',
    width: '64px',
    height: '32px',
    background: isYearly ? COLORS.accent_green : COLORS.bg_medium,
    border: `2px solid ${COLORS.border_light}`,
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    padding: '2px',
  };

  const toggleDotStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    background: COLORS.text_primary,
    borderRadius: '12px',
    transition: 'transform 0.3s ease',
    transform: isYearly ? 'translateX(32px)' : 'translateX(0)',
  };

  const savingsBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    background: `linear-gradient(135deg, ${COLORS.accent_orange}, ${COLORS.accent_green})`,
    color: COLORS.text_primary,
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginLeft: '8px',
  };

  const cardsContainerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '100px',
  };

  const getTierCardStyle = (highlighted: boolean): React.CSSProperties => ({
    position: 'relative',
    background: `linear-gradient(135deg, ${COLORS.bg_medium}, ${COLORS.bg_dark})`,
    border: `2px solid ${highlighted ? COLORS.accent_green : COLORS.border_light}`,
    borderRadius: '16px',
    padding: '40px 32px',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  });

  const tierBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: `linear-gradient(135deg, ${COLORS.accent_green}, ${COLORS.accent_blue})`,
    color: COLORS.text_primary,
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const tierNameStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: COLORS.text_primary,
    margin: '0 0 12px 0',
    marginTop: '8px',
  };

  const tierDescStyle: React.CSSProperties = {
    fontSize: '0.95rem',
    color: COLORS.text_secondary,
    margin: '0 0 24px 0',
    lineHeight: '1.5',
  };

  const priceStyle: React.CSSProperties = {
    marginBottom: '8px',
  };

  const priceNumberStyle: React.CSSProperties = {
    fontSize: '3.5rem',
    fontWeight: 700,
    color: COLORS.text_primary,
    margin: '0',
    lineHeight: 1,
  };

  const priceIntervalStyle: React.CSSProperties = {
    fontSize: '1rem',
    color: COLORS.text_secondary,
    margin: '8px 0 0 0',
  };

  const yearlyPriceStyle: React.CSSProperties = {
    fontSize: '1rem',
    color: COLORS.text_muted,
    textDecoration: 'line-through',
  };

  const featureListStyle: React.CSSProperties = {
    listStyle: 'none',
    padding: '0',
    margin: '24px 0',
    flex: 1,
  };

  const featureItemStyle: React.CSSProperties = {
    padding: '12px 0',
    paddingLeft: '28px',
    position: 'relative',
    fontSize: '0.95rem',
    color: COLORS.text_secondary,
    lineHeight: '1.6',
  };

  const featureCheckStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0',
    top: '14px',
    width: '18px',
    height: '18px',
    background: COLORS.accent_green,
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: COLORS.bg_dark,
  };

  const ctaButtonStyle = (highlighted: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '14px 24px',
    fontSize: '1rem',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: highlighted
      ? `linear-gradient(135deg, ${COLORS.accent_green}, ${COLORS.accent_blue})`
      : `rgba(255, 255, 255, 0.08)`,
    color: COLORS.text_primary,
    marginTop: 'auto',
  });

  const comparisonContainerStyle: React.CSSProperties = {
    marginBottom: '100px',
  };

  const comparisonHeadingStyle: React.CSSProperties = {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: COLORS.text_primary,
    textAlign: 'center',
    marginBottom: '60px',
  };

  const comparisonTableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    background: COLORS.bg_medium,
    borderRadius: '12px',
    overflow: 'hidden',
    border: `1px solid ${COLORS.border_light}`,
  };

  const tableCategoryStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: COLORS.accent_green,
    padding: '16px 24px',
    background: `rgba(29, 158, 117, 0.08)`,
    borderBottom: `1px solid ${COLORS.border_light}`,
  };

  const tableRowStyle: React.CSSProperties = {
    borderBottom: `1px solid ${COLORS.border_light}`,
  };

  const tableFeatureNameStyle: React.CSSProperties = {
    padding: '16px 24px',
    fontSize: '0.95rem',
    color: COLORS.text_secondary,
    fontWeight: 500,
    minWidth: '200px',
  };

  const tableCellStyle: React.CSSProperties = {
    padding: '16px 24px',
    textAlign: 'center',
    fontSize: '0.95rem',
    color: COLORS.text_secondary,
    borderLeft: `1px solid ${COLORS.border_light}`,
  };

  const faqContainerStyle: React.CSSProperties = {
    maxWidth: '700px',
    margin: '0 auto',
  };

  const faqHeadingStyle: React.CSSProperties = {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: COLORS.text_primary,
    textAlign: 'center',
    marginBottom: '60px',
  };

  const faqItemStyle: React.CSSProperties = {
    marginBottom: '16px',
    border: `1px solid ${COLORS.border_light}`,
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  };

  const faqButtonStyle = (isExpanded: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '20px 24px',
    background: isExpanded ? `rgba(29, 158, 117, 0.08)` : 'transparent',
    border: 'none',
    borderBottom: isExpanded ? `1px solid ${COLORS.border_light}` : 'none',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.3s ease',
  });

  const faqQuestionStyle: React.CSSProperties = {
    fontSize: '1.05rem',
    fontWeight: 600,
    color: COLORS.text_primary,
    textAlign: 'left',
  };

  const faqChevronStyle = (isExpanded: boolean): React.CSSProperties => ({
    fontSize: '1.5rem',
    color: COLORS.accent_green,
    transition: 'transform 0.3s ease',
    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
  });

  const faqAnswerStyle: React.CSSProperties = {
    padding: '0 24px 20px 24px',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    color: COLORS.text_secondary,
  };

  const ctaContainerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginTop: '80px',
    paddingTop: '40px',
    borderTop: `1px solid ${COLORS.border_light}`,
  };

  const ctaSectionHeadingStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: COLORS.text_primary,
    marginBottom: '12px',
  };

  const ctaSectionDescStyle: React.CSSProperties = {
    fontSize: '1rem',
    color: COLORS.text_secondary,
    marginBottom: '24px',
  };

  const ctaLinkStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '14px 32px',
    background: `linear-gradient(135deg, ${COLORS.accent_orange}, ${COLORS.accent_green})`,
    color: COLORS.text_primary,
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '1rem',
    transition: 'all 0.3s ease',
  };

  return (
    <div style={containerStyle}>
      <motion.div
        style={sectionStyle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={headingStyle}>Simple, Transparent Pricing</h1>
          <p style={subheadingStyle}>
            Choose the perfect plan to build with confidence. Start free and scale as you grow.
          </p>
        </div>

        {/* Billing Toggle */}
        <div style={toggleContainerStyle}>
          <label
            style={{
              ...toggleLabelStyle,
              color: !isYearly ? COLORS.accent_green : COLORS.text_secondary,
            }}
          >
            Monthly
          </label>
          <button
            style={toggleButtonStyle}
            onClick={() => setIsYearly(!isYearly)}
            aria-label="Toggle billing frequency"
          >
            <div style={toggleDotStyle} />
          </button>
          <label
            style={{
              ...toggleLabelStyle,
              color: isYearly ? COLORS.accent_green : COLORS.text_secondary,
            }}
          >
            Yearly
            {isYearly && (
              <span style={savingsBadgeStyle}>
                Save 4 months
              </span>
            )}
          </label>
        </div>

        {/* Pricing Cards */}
        <motion.div
          style={cardsContainerStyle}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
              },
            },
          }}
        >
          {TIERS.map((tier, index) => {
            const currentPrice = isYearly ? tier.yearlyPrice : tier.monthlyPrice;
            const oldPrice = isYearly ? (tier.monthlyPrice * 12) : tier.monthlyPrice;
            const interval = isYearly ? 'yearly' : 'monthly';

            return (
              <motion.div
                key={tier.slug}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileHover={{ y: -8 }}
                style={getTierCardStyle(tier.highlighted || false)}
              >
                {tier.highlighted && <div style={tierBadgeStyle}>BEST VALUE</div>}
                <h3 style={tierNameStyle}>{tier.name}</h3>
                <p style={tierDescStyle}>{tier.description}</p>

                <div style={priceStyle}>
                  <div style={priceNumberStyle}>
                    {currentPrice === 0 ? 'Free' : `$${currentPrice}`}
                  </div>
                  <p style={priceIntervalStyle}>
                    {currentPrice === 0 ? 'Forever' : `per ${interval.slice(0, -2)}`}
                  </p>
                  {isYearly && tier.monthlyPrice > 0 && (
                    <p style={yearlyPriceStyle}>
                      ${oldPrice}/year
                    </p>
                  )}
                </div>

                <ul style={featureListStyle}>
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} style={featureItemStyle}>
                      <div style={featureCheckStyle}>✓</div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  style={ctaButtonStyle(tier.highlighted || false)}
                  onClick={() => handleCheckout(tier.slug, interval)}
                  onMouseEnter={(e) => {
                    const button = e.currentTarget;
                    if (tier.highlighted) {
                      button.style.transform = 'scale(1.02)';
                      button.style.boxShadow = `0 12px 24px rgba(29, 158, 117, 0.3)`;
                    } else {
                      button.style.opacity = '1';
                      button.style.background = `rgba(255, 255, 255, 0.12)`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    const button = e.currentTarget;
                    button.style.transform = 'scale(1)';
                    button.style.boxShadow = 'none';
                    button.style.opacity = '1';
                    if (!tier.highlighted) {
                      button.style.background = `rgba(255, 255, 255, 0.08)`;
                    }
                  }}
                >
                  {tier.slug === 'explorer'
                    ? 'Get Started Free'
                    : tier.slug === 'enterprise'
                    ? 'Contact Sales'
                    : `Start ${tier.name} Trial`}
                </button>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Feature Comparison */}
        <motion.div
          style={comparisonContainerStyle}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 style={comparisonHeadingStyle}>Feature Comparison</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={comparisonTableStyle}>
              <thead>
                <tr style={{ background: COLORS.bg_dark }}>
                  <th style={{ ...tableCategoryStyle, textAlign: 'left' }}>Feature</th>
                  <th style={tableCategoryStyle}>Explorer</th>
                  <th style={tableCategoryStyle}>Pro</th>
                  <th style={tableCategoryStyle}>Team</th>
                  <th style={tableCategoryStyle}>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMPARISON.map((category, categoryIndex) => (
                  <React.Fragment key={categoryIndex}>
                    <tr>
                      <td colSpan={5} style={tableCategoryStyle}>
                        {category.name}
                      </td>
                    </tr>
                    {category.features.map((featureRow, featureIndex) => (
                      <tr key={featureIndex} style={tableRowStyle}>
                        <td style={tableFeatureNameStyle}>{featureRow.name}</td>
                        <td style={tableCellStyle}>
                          {typeof featureRow.explorer === 'boolean' ? (
                            featureRow.explorer ? (
                              <span style={{ color: COLORS.accent_green }}>✓</span>
                            ) : (
                              <span style={{ color: COLORS.text_muted }}>—</span>
                            )
                          ) : (
                            featureRow.explorer
                          )}
                        </td>
                        <td style={tableCellStyle}>
                          {typeof featureRow.pro === 'boolean' ? (
                            featureRow.pro ? (
                              <span style={{ color: COLORS.accent_green }}>✓</span>
                            ) : (
                              <span style={{ color: COLORS.text_muted }}>—</span>
                            )
                          ) : (
                            featureRow.pro
                          )}
                        </td>
                        <td style={tableCellStyle}>
                          {typeof featureRow.team === 'boolean' ? (
                            featureRow.team ? (
                              <span style={{ color: COLORS.accent_green }}>✓</span>
                            ) : (
                              <span style={{ color: COLORS.text_muted }}>—</span>
                            )
                          ) : (
                            featureRow.team
                          )}
                        </td>
                        <td style={tableCellStyle}>
                          {typeof featureRow.enterprise === 'boolean' ? (
                            featureRow.enterprise ? (
                              <span style={{ color: COLORS.accent_green }}>✓</span>
                            ) : (
                              <span style={{ color: COLORS.text_muted }}>—</span>
                            )
                          ) : (
                            featureRow.enterprise
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          style={faqContainerStyle}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 style={faqHeadingStyle}>Frequently Asked Questions</h2>
          {FAQ_ITEMS.map((item, index) => (
            <div key={index} style={faqItemStyle}>
              <button
                style={faqButtonStyle(expandedFaq === index)}
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              >
                <span style={faqQuestionStyle}>{item.question}</span>
                <span style={faqChevronStyle(expandedFaq === index)}>▼</span>
              </button>
              {expandedFaq === index && <div style={faqAnswerStyle}>{item.answer}</div>}
            </div>
          ))}
        </motion.div>

        {/* CTA for Enterprise */}
        <motion.div
          style={ctaContainerStyle}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <p style={ctaSectionHeadingStyle}>Still deciding?</p>
          <p style={ctaSectionDescStyle}>
            Talk to our team about what works best for your construction business.
          </p>
          <a
            href="mailto:hello@theknowledgegardens.com?subject=Pricing%20Inquiry"
            style={ctaLinkStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(216, 90, 48, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Schedule a Demo
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
