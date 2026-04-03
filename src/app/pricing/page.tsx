"use client";

import { useState } from "react";
import Link from "next/link";
import { TIERS, Tier } from "@/lib/auth";

export default function PricingPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

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

  const handleCheckout = (tier: Tier) => {
    if (tier === "enterprise") {
      window.location.href = "mailto:hello@theknowledgegardens.com?subject=Enterprise%20Inquiry";
    } else if (tier === "explorer") {
      window.location.href = "/dream";
    } else {
      // Check if Stripe is configured, otherwise redirect to launch
      const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!stripeKey) {
        window.location.href = "/launch";
      } else {
        // When Stripe is configured, this would call the checkout endpoint
        window.location.href = `/api/v1/stripe/checkout?tier=${tier}`;
      }
    }
  };

  return (
    <div
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        paddingTop: "40px",
        paddingBottom: "80px",
      }}>
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
          We publish our prices. They don't.
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

      {/* Pricing Tiers */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          paddingLeft: "20px",
          paddingRight: "20px",
          marginBottom: "60px",
        }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "24px",
          }}>
          {/* EXPLORER */}
          <div
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              transition: "all 0.2s ease",
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}>
            <div style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--fg)",
                  margin: "0 0 8px 0",
                }}>
                Explorer
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--fg-tertiary)",
                  margin: 0,
                }}>
                Dream it first
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <p
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "var(--fg)",
                  margin: "0 0 4px 0",
                }}>
                Free
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--fg-tertiary)",
                  margin: 0,
                }}>
                Forever, no credit card needed
              </p>
            </div>

            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 24px 0",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                flex: 1,
              }}>
              {TIERS.explorer.features.map((feature, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: "13px",
                    color: "var(--fg-secondary)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout("explorer")}
              style={{
                width: "100%",
                padding: "12px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--fg)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
              }}>
              Start Free →
            </button>
          </div>

          {/* PRO — HIGHLIGHTED */}
          <div
            style={{
              background: "var(--bg)",
              border: "2px solid var(--accent)",
              borderRadius: "var(--radius-lg)",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              transition: "all 0.2s ease",
              boxShadow: "0 12px 40px rgba(29, 158, 117, 0.15)",
              position: "relative",
              transform: "scale(1.02)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 16px 50px rgba(29, 158, 117, 0.2)";
              (e.currentTarget as HTMLElement).style.transform = "scale(1.04) translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 12px 40px rgba(29, 158, 117, 0.15)";
              (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
            }}>
            <div
              style={{
                position: "absolute",
                top: "-12px",
                right: "20px",
                background: "var(--accent)",
                color: "white",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "10px",
                fontWeight: 700,
              }}>
              MOST POPULAR
            </div>

            <div style={{ marginBottom: "24px", marginTop: "8px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--fg)",
                  margin: "0 0 8px 0",
                }}>
                Pro
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--fg-tertiary)",
                  margin: 0,
                }}>
                Build it faster
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <p
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "var(--fg)",
                  margin: "0 0 4px 0",
                }}>
                $49<span style={{ fontSize: "16px", color: "var(--fg-tertiary)" }}>/mo</span>
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--fg-tertiary)",
                  margin: 0,
                }}>
                Save 20% with annual billing
              </p>
            </div>

            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 24px 0",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                flex: 1,
              }}>
              {TIERS.pro.features.map((feature, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: "13px",
                    color: "var(--fg-secondary)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout("pro")}
              style={{
                width: "100%",
                padding: "12px",
                background: "var(--accent)",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                fontWeight: 600,
                color: "white",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--accent)";
              }}>
              Start Building →
            </button>
          </div>

          {/* TEAM */}
          <div
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              transition: "all 0.2s ease",
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}>
            <div style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--fg)",
                  margin: "0 0 8px 0",
                }}>
                Team
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--fg-tertiary)",
                  margin: 0,
                }}>
                Scale it together
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <p
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "var(--fg)",
                  margin: "0 0 4px 0",
                }}>
                $199<span style={{ fontSize: "16px", color: "var(--fg-tertiary)" }}>/mo</span>
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--fg-tertiary)",
                  margin: 0,
                }}>
                Save 20% with annual billing
              </p>
            </div>

            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 24px 0",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                flex: 1,
              }}>
              {TIERS.team.features.map((feature, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: "13px",
                    color: "var(--fg-secondary)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout("team")}
              style={{
                width: "100%",
                padding: "12px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--fg)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
              }}>
              Start Team →
            </button>
          </div>

          {/* ENTERPRISE */}
          <div
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              transition: "all 0.2s ease",
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}>
            <div style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--fg)",
                  margin: "0 0 8px 0",
                }}>
                Enterprise
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--fg-tertiary)",
                  margin: 0,
                }}>
                Custom everything
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <p
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "var(--fg)",
                  margin: "0 0 4px 0",
                }}>
                $499+<span style={{ fontSize: "16px", color: "var(--fg-tertiary)" }}>/mo</span>
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--fg-tertiary)",
                  margin: 0,
                }}>
                Custom quotes available
              </p>
            </div>

            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 24px 0",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                flex: 1,
              }}>
              {TIERS.enterprise.features.map((feature, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: "13px",
                    color: "var(--fg-secondary)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout("enterprise")}
              style={{
                width: "100%",
                padding: "12px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--fg)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
              }}>
              Contact Us →
            </button>
          </div>
        </div>
      </div>

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
