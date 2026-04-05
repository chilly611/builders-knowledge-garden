"use client";

import { useState } from "react";
import Script from "next/script";

export default function PricingPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const pricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID || "prctbl_1TIhBFBi6fLCy4K9dipVUfSn";
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_51TBsfWBi6fLCy4K9pKPFJpf1guZCgNkvWKicNlKAzYagdpJ5abXJQQNQKdsvWHyFirXcaHh64VWQleT2MzgpzQzH00qEkSW64b";

  const faqItems = [
    {
      id: "switch",
      question: "Can I switch plans?",
      answer: "Yes, you can upgrade or downgrade your plan anytime. Changes take effect at the next billing cycle.",
    },
    {
      id: "trial",
      question: "Is there a free trial?",
      answer: "Explorer tier is always free forever — no credit card required. Start building with Dream Builder and upgrade when you're ready to scale.",
    },
    {
      id: "annual",
      question: "Do you offer annual pricing?",
      answer: "Yes! Pay annually and get 20% off. That's $39/mo for Pro, $159/mo for Team, and $399/mo for Enterprise.",
    },
    {
      id: "payment",
      question: "What payment methods do you accept?",
      answer: "All major credit cards (Visa, Mastercard, American Express) via Stripe. We also support ACH transfers for Enterprise plans.",
    },
  ];

  return (
    <div
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        paddingTop: "40px",
        paddingBottom: "80px",
      }}>
      {/* Stripe Pricing Table Script */}
      <Script src="https://js.stripe.com/v3/pricing-table.js" strategy="lazyOnload" />

      {/* Header */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          paddingLeft: "20px",
          paddingRight: "20px",
          textAlign: "center",
          marginBottom: "60px",
        }}>
        <h1
          style={{
            fontSize: "42px",
            fontWeight: 700,
            color: "var(--fg)",
            margin: "0 0 12px 0",
            fontFamily: "var(--font-archivo)",
          }}>
          Pricing
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "var(--fg-secondary)",
            margin: "0 0 24px 0",
            maxWidth: "600px",
            marginLeft: "auto",
            marginRight: "auto",
          }}>
          We publish our prices. They don&apos;t.
        </p>
        <p
          style={{
            fontSize: "13px",
            color: "var(--fg-tertiary)",
            margin: 0,
          }}>
          No surprise fees. No usage limits sneaking up on you. Everything is transparent, always.
        </p>
      </div>

      {/* Stripe Pricing Table */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          paddingLeft: "20px",
          paddingRight: "20px",
          marginBottom: "60px",
        }}
        dangerouslySetInnerHTML={{
          __html: `<stripe-pricing-table pricing-table-id="${pricingTableId}" publishable-key="${publishableKey}"></stripe-pricing-table>`,
        }}
      />

      {/* COMPARISON SECTION */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          paddingLeft: "20px",
          paddingRight: "20px",
          marginBottom: "60px",
          textAlign: "center",
        }}>
        <div
          style={{
            background: "#e6f7f0",
            border: "1px solid var(--accent)",
            borderRadius: "var(--radius-lg)",
            padding: "28px",
          }}>
          <p
            style={{
              fontSize: "15px",
              fontWeight: 500,
              color: "var(--fg)",
              margin: 0,
            }}>
            What Procore charges <strong>$10K+/year</strong> for, we deliver at{" "}
            <strong>$49/month</strong> — with intelligence they don't have.
          </p>
        </div>
      </div>

      {/* FAQ SECTION */}
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          paddingLeft: "20px",
          paddingRight: "20px",
        }}>
        <h2
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "var(--fg)",
            textAlign: "center",
            marginBottom: "24px",
          }}>
          Frequently Asked Questions
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {faqItems.map((item) => {
            const isOpen = expanded === item.id;

            return (
              <div
                key={item.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: "var(--bg-secondary)",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "background 0.2s ease",
                    fontFamily: "var(--font-archivo)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--bg-tertiary)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--bg-secondary)";
                  }}>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--fg)",
                    }}>
                    {item.question}
                  </span>
                  <span
                    style={{
                      fontSize: "16px",
                      color: "var(--fg-tertiary)",
                      transition: "transform 0.2s ease",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                    }}>
                    ▼
                  </span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: "16px",
                      background: "var(--bg)",
                      borderTop: "1px solid var(--border)",
                    }}>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--fg-secondary)",
                        margin: 0,
                        lineHeight: "1.6",
                      }}>
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA at bottom */}
        <div
          style={{
            textAlign: "center",
            marginTop: "40px",
          }}>
          <p
            style={{
              fontSize: "13px",
              color: "var(--fg-secondary)",
              marginBottom: "16px",
            }}>
            Still have questions?
          </p>
          <a
            href="mailto:hello@theknowledgegardens.com"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "var(--accent)",
              color: "white",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 600,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--accent)";
            }}>
            Get in Touch →
          </a>
        </div>
      </div>
    </div>
  );
}
