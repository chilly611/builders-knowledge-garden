/**
 * RSI Loop Definitions and Synthetic Data
 * Each loop describes a recursive self-improvement cycle with demo sparkline data
 */

export interface RSILoop {
  id: number;
  title: string;
  description: string;
  detailPoints: string[];
  sparklineData: number[]; // 0-100 scale, synthetic improvement over time
}

export const RSI_LOOPS: RSILoop[] = [
  {
    id: 1,
    title: "Code & Data Drift Detection",
    description:
      "Heartbeat telemetry monitors divergence between live prompts and specialist behavior. When outputs drift, the system flags it for review and proposes a corrected version.",
    detailPoints: [
      "Continuous heartbeat monitoring of specialist runs",
      "Automated drift detection against baseline prompts",
      "Feedback synthesis triggers prompt updates",
    ],
    sparklineData: [35, 42, 51, 58, 67, 74, 81, 88, 92, 96],
  },
  {
    id: 2,
    title: "Specialist Prompt Improvement",
    description:
      "When contractors report incorrect answers, the system captures that failure, rewrites the specialist's prompt, and routes the next similar query to the improved version.",
    detailPoints: [
      "Failure clustering by specialist and query type",
      "LLM-powered prompt rewriting based on corrections",
      "A/B evaluation of improved prompts",
    ],
    sparklineData: [28, 38, 48, 59, 68, 76, 83, 88, 91, 95],
  },
  {
    id: 3,
    title: "Workflow Shape Evolution",
    description:
      "Step drop-off rates reveal friction in the workflow. When contractors abandon a step, the system adjusts its position, wording, or dependencies to reduce abandonment.",
    detailPoints: [
      "Real-time tracking of step completion rates",
      "Automatic reordering to minimize drop-off",
      "Copy refresh based on user behavior signals",
    ],
    sparklineData: [40, 48, 56, 63, 71, 78, 84, 89, 93, 97],
  },
  {
    id: 4,
    title: "Vendor Accuracy Learning",
    description:
      "Price quotations from vendors are validated against market comps. When a price significantly diverges, the adapter logic is rewritten to correct the pattern before next query.",
    detailPoints: [
      "Continuous price validation against data sources",
      "Pattern matching in vendor response anomalies",
      "Automated adapter recalibration per vendor",
    ],
    sparklineData: [45, 53, 61, 68, 75, 82, 87, 91, 94, 98],
  },
  {
    id: 5,
    title: "Copilot Quality Acceleration",
    description:
      "Citation accuracy and response latency are tracked for each copilot run. The system learns which sources are reliable and which questions benefit from deeper synthesis.",
    detailPoints: [
      "Per-citation accuracy scoring and feedback",
      "Latency-aware routing of complex queries",
      "Knowledge base refresh priorities driven by misses",
    ],
    sparklineData: [32, 41, 50, 59, 68, 76, 83, 89, 93, 96],
  },
];

/**
 * Telemetry Callout Numbers (synthetic, labeled as demo data)
 */
export const TELEMETRY_CALLOUTS = {
  specialistRuns: 1247,
  telemetryEvents: 8432,
  promptsAutoImproved: 12,
};

/**
 * Helper to generate SVG sparkline from data array
 */
export function generateSparklinePoints(data: number[]): string {
  const width = 120;
  const height = 30;
  const padding = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = padding + (i / (data.length - 1)) * innerWidth;
      const normalized = (val - min) / range;
      const y = padding + (1 - normalized) * innerHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return points;
}
