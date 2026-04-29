/**
 * /rsi Route
 * RSI Loop Telemetry Visualization — Recursive Self-Improvement Moat Demo
 *
 * Narrates how BKG learns from every interaction through five feedback loops,
 * making the next specialist run better than the last.
 */

import { spacing, fontWeights, colors } from "@/design-system/tokens";
import RSIDashboard from "./RSIDashboard";
import { TELEMETRY_CALLOUTS } from "./loops";

const DRAFT_PAPER_BG = "#FDF8F0";
const NAVY_INK = "#1B3B5E";
const BRASS = "#B6873A";
const TRACE = "#F4F0E6";

export const metadata = {
  title: "RSI Loop Telemetry — The Knowledge Garden",
  description:
    "Five recursive self-improvement loops that make BKG smarter with every interaction.",
};

export default function RSIPage() {
  return (
    <main
      style={{
        backgroundColor: DRAFT_PAPER_BG,
        color: NAVY_INK,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        paddingTop: spacing[12],
        paddingBottom: spacing[20],
      }}
    >
      {/* Hero Section */}
      <section
        style={{
          maxWidth: "1200px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: spacing[4],
          paddingRight: spacing[4],
          marginBottom: spacing[16],
        }}
      >
        <h1
          style={{
            fontSize: "clamp(2.5rem, 7vw, 4rem)",
            fontWeight: fontWeights.bold,
            lineHeight: 1.1,
            marginBottom: spacing[3],
            marginTop: 0,
            color: NAVY_INK,
          }}
        >
          How the Garden gets smarter.
        </h1>

        <p
          style={{
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
            fontWeight: fontWeights.regular,
            lineHeight: 1.6,
            color: "#2E2E30",
            maxWidth: "800px",
            marginBottom: spacing[4],
            marginTop: 0,
          }}
        >
          Five recursive loops, every interaction makes the next one better. The moat
          isn't the features — it's the pace of improvement.
        </p>
      </section>

      {/* Loop Cards Grid */}
      <section
        style={{
          maxWidth: "1200px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: spacing[4],
          paddingRight: spacing[4],
          marginBottom: spacing[20],
        }}
      >
        <RSIDashboard />
      </section>

      {/* Why This Matters Section */}
      <section
        style={{
          backgroundColor: TRACE,
          paddingTop: spacing[16],
          paddingBottom: spacing[16],
          paddingLeft: spacing[4],
          paddingRight: spacing[4],
          marginBottom: spacing[20],
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            marginLeft: "auto",
            marginRight: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
            gap: spacing[12],
          }}
        >
          {/* Left Column */}
          <div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: fontWeights.semibold,
                marginBottom: spacing[3],
                marginTop: 0,
                color: NAVY_INK,
              }}
            >
              Why this matters
            </h2>
            <p
              style={{
                fontSize: "0.95rem",
                lineHeight: 1.7,
                color: "#2E2E30",
                marginBottom: spacing[3],
                marginTop: 0,
              }}
            >
              Today's specialists already cite 3 sources. Tomorrow's will cite 5 — because
              every contractor query teaches us a new edge case. Each failed step, each
              vendor price mismatch, each latency spike becomes a signal for improvement.
            </p>
            <p
              style={{
                fontSize: "0.95rem",
                lineHeight: 1.7,
                color: "#2E2E30",
                marginBottom: 0,
              }}
            >
              The five loops run in parallel. None blocks the other. When a contractor
              provides feedback, all five systems listen. Within hours, the next specialist
              run benefits from every correction made in the past.
            </p>
          </div>

          {/* Right Column — Flowchart */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="0 0 280 320"
              style={{ width: "100%", maxWidth: "280px", height: "auto" }}
            >
              {/* Boxes and labels */}
              <defs>
                <style>{`
                  .flowchart-box { fill: white; stroke: ${BRASS}; stroke-width: 1.5; }
                  .flowchart-text { font-size: 11px; font-weight: 500; text-anchor: middle; fill: ${NAVY_INK}; }
                  .flowchart-arrow { fill: none; stroke: ${NAVY_INK}; stroke-width: 1.5; marker-end: url(#arrowhead); }
                `}</style>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill={NAVY_INK} />
                </marker>
              </defs>

              {/* Query */}
              <rect x="90" y="10" width="100" height="40" className="flowchart-box" />
              <text x="140" y="35" className="flowchart-text">
                Query
              </text>

              {/* Answer */}
              <rect x="90" y="80" width="100" height="40" className="flowchart-box" />
              <text x="140" y="105" className="flowchart-text">
                Answer
              </text>
              <path className="flowchart-arrow" d="M 140 50 L 140 80" />

              {/* Outcome */}
              <rect x="90" y="150" width="100" height="40" className="flowchart-box" />
              <text x="140" y="175" className="flowchart-text">
                Outcome
              </text>
              <path className="flowchart-arrow" d="M 140 120 L 140 150" />

              {/* Telemetry */}
              <rect x="90" y="220" width="100" height="40" className="flowchart-box" />
              <text x="140" y="245" className="flowchart-text">
                Telemetry
              </text>
              <path className="flowchart-arrow" d="M 140 190 L 140 220" />

              {/* Feedback Loop Back */}
              <path
                className="flowchart-arrow"
                d="M 190 240 Q 240 140 190 40"
              />
              <text
                x="230"
                y="140"
                style={{
                  fontSize: "10px",
                  fill: BRASS,
                  fontWeight: 600,
                  textAnchor: "middle",
                }}
              >
                Improve
              </text>
            </svg>
          </div>
        </div>
      </section>

      {/* Volume Callout Strip */}
      <section
        style={{
          backgroundColor: NAVY_INK,
          color: TRACE,
          paddingTop: spacing[8],
          paddingBottom: spacing[8],
          paddingLeft: spacing[4],
          paddingRight: spacing[4],
          marginBottom: spacing[20],
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            marginLeft: "auto",
            marginRight: "auto",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: spacing[3],
            textAlign: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: fontWeights.bold,
                color: BRASS,
                marginBottom: spacing[2],
                marginTop: 0,
              }}
            >
              {TELEMETRY_CALLOUTS.specialistRuns.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: TRACE,
                opacity: 0.9,
                marginBottom: 0,
              }}
            >
              Specialist Runs to Date
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: fontWeights.bold,
                color: BRASS,
                marginBottom: spacing[2],
                marginTop: 0,
              }}
            >
              {TELEMETRY_CALLOUTS.telemetryEvents.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: TRACE,
                opacity: 0.9,
                marginBottom: 0,
              }}
            >
              Telemetry Events Captured
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: fontWeights.bold,
                color: BRASS,
                marginBottom: spacing[2],
                marginTop: 0,
              }}
            >
              {TELEMETRY_CALLOUTS.promptsAutoImproved}
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: TRACE,
                opacity: 0.9,
                marginBottom: 0,
              }}
            >
              Prompts Auto-Improved
            </div>
          </div>
        </div>
        <p
          style={{
            fontSize: "0.75rem",
            color: TRACE,
            opacity: 0.6,
            textAlign: "center",
            marginTop: spacing[3],
            marginBottom: 0,
          }}
        >
          Demo data for illustration. Actual metrics are logged in real-time.
        </p>
      </section>

      {/* CTA Section */}
      <section
        style={{
          maxWidth: "1200px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: spacing[4],
          paddingRight: spacing[4],
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: fontWeights.semibold,
            marginBottom: spacing[3],
            marginTop: 0,
            color: NAVY_INK,
          }}
        >
          See it in action
        </h2>

        <p
          style={{
            fontSize: "1rem",
            marginBottom: spacing[4],
            marginTop: 0,
            color: "#2E2E30",
          }}
        >
          Try a specialist that's been through multiple improvement cycles.
        </p>

        <a
          href="/killerapp/workflows/code-compliance"
          style={{
            display: "inline-block",
            paddingTop: spacing[3],
            paddingBottom: spacing[3],
            paddingLeft: spacing[4],
            paddingRight: spacing[4],
            backgroundColor: BRASS,
            color: "#FEFEFE",
            textDecoration: "none",
            fontSize: "1rem",
            fontWeight: fontWeights.semibold,
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          Try Code Compliance Specialist →
        </a>
      </section>
    </main>
  );
}
