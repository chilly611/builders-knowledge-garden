/**
 * RSI Loop Card Grid Component
 * Displays five recursive self-improvement loops in a responsive 2-col grid
 */

"use client";

import { RSI_LOOPS, generateSparklinePoints } from "./loops";
import { spacing, fontWeights } from "@/design-system/tokens";
import { STAGE_ACCENTS } from "@/design-system/tokens/stage-accents";

export default function RSIDashboard() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: spacing[4],
      }}
    >
      {RSI_LOOPS.map((loop) => {
        const accent = STAGE_ACCENTS[loop.id as 1 | 2 | 3 | 4 | 5];
        const sparklinePoints = generateSparklinePoints(loop.sparklineData);

        return (
          <div
            key={loop.id}
            style={{
              padding: spacing[4],
              border: "1px solid #C9C3B3",
              backgroundColor: "#FEFEFE",
              display: "flex",
              flexDirection: "column",
              gap: spacing[3],
            }}
          >
            {/* Loop Number Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 4,
                backgroundColor: accent.hex,
                color: "#FEFEFE",
                fontSize: "1rem",
                fontWeight: fontWeights.bold,
              }}
            >
              {loop.id}
            </div>

            {/* Title */}
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: fontWeights.semibold,
                color: "#1B3B5E",
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {loop.title}
            </h3>

            {/* Description */}
            <p
              style={{
                fontSize: "0.85rem",
                lineHeight: 1.5,
                color: "#2E2E30",
                margin: 0,
              }}
            >
              {loop.description}
            </p>

            {/* Sparkline */}
            <div style={{ height: 40, width: "100%" }}>
              <svg
                viewBox="0 0 120 30"
                style={{ width: "100%", height: "100%" }}
              >
                {/* Background grid */}
                <line
                  x1="0"
                  y1="15"
                  x2="120"
                  y2="15"
                  stroke="#E5DCC9"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Filled area under curve */}
                <polyline
                  points={`0,30 ${sparklinePoints} 120,30`}
                  fill={accent.hex}
                  opacity="0.12"
                />

                {/* Line */}
                <polyline
                  points={sparklinePoints}
                  fill="none"
                  stroke={accent.hex}
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Data points */}
                {loop.sparklineData.map((val, i) => {
                  const max = Math.max(...loop.sparklineData);
                  const min = Math.min(...loop.sparklineData);
                  const range = max - min || 1;
                  const normalized = (val - min) / range;
                  const x = (i / (loop.sparklineData.length - 1)) * 120;
                  const y = (1 - normalized) * 28 + 2;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="1.5"
                      fill={accent.hex}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>
            </div>

            {/* Demo Label */}
            <p
              style={{
                fontSize: "0.7rem",
                color: "#C9C3B3",
                margin: 0,
                marginTop: spacing[2],
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Demo Data
            </p>
          </div>
        );
      })}
    </div>
  );
}
