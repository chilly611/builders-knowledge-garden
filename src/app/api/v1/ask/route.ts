/**
 * /api/v1/ask — WS6 Ask Anything route.
 *
 * The RSI Heartbeat is the moat. Every answer this endpoint returns is gated
 * by the Three-Source Rule: if fewer than three corroborating sources are
 * available, the verdict is rendered as 'corroborated' or 'single', never
 * 'authoritative'. Callers (human chat boxes, agent integrations, MCP
 * servers) all see the same verdict tier so the trust model is identical
 * across surfaces.
 *
 * This stub returns a mock answer plus the verdict shape. Wiring to the real
 * retrieval pipeline (Supabase entity store + RSI heartbeat sources) is a
 * follow-up — the contract is what matters for the WS sub-branches that
 * depend on it.
 */

import { NextResponse } from 'next/server';
import {
  verifyThreeSource,
  type SourceCitation,
} from '@/components/primitives/ThreeSourceRule';

interface AskRequestBody {
  question?: string;
  context?: string;
  stance?: Record<string, unknown>;
}

const MOCK_SOURCES: SourceCitation[] = [
  {
    name: 'CSLB License Database',
    url: 'https://www.cslb.ca.gov',
    jurisdiction: 'US-CA',
    lastVerified: new Date().toISOString(),
  },
  {
    name: 'BKG primary record',
    jurisdiction: 'BKG',
    lastVerified: new Date().toISOString(),
  },
  {
    name: 'City of San Diego building portal',
    jurisdiction: 'US-CA-SD',
    lastVerified: new Date().toISOString(),
  },
];

export async function POST(request: Request) {
  let body: AskRequestBody = {};
  try {
    body = (await request.json()) as AskRequestBody;
  } catch {
    return NextResponse.json(
      { error: 'Body must be JSON with at least a `question` field.' },
      { status: 400 },
    );
  }

  const { question, context, stance } = body;
  if (!question || typeof question !== 'string') {
    return NextResponse.json(
      { error: '`question` is required.' },
      { status: 400 },
    );
  }

  const verdict = verifyThreeSource(MOCK_SOURCES);

  const lane = (stance && (stance.lane as string)) ?? 'public';
  const language = (stance && ((stance.locale as Record<string, unknown>)?.language as string)) ?? 'en-US';

  const answer =
    lane === 'machine'
      ? `mock:answer:${question}`
      : lane === 'professional' || lane === 'administrator'
        ? `Based on ${MOCK_SOURCES.length} corroborating sources (${verdict.tier}): "${question}" — production pipeline pending.`
        : `Here's what we know about "${question}" — re-checked today across ${MOCK_SOURCES.length} sources.`;

  return NextResponse.json({
    question,
    context: context ?? null,
    locale: { language },
    answer,
    verdict: { tier: verdict.tier, sourceCount: MOCK_SOURCES.length },
    sources: MOCK_SOURCES,
    heartbeat: {
      moat: 'RSI Heartbeat — every source re-verified on a cadence.',
      lastRun: new Date().toISOString(),
    },
    machineLegible: {
      llmsTxt: '/llms.txt',
      mcp: '/api/v1/mcp/ask',
    },
  });
}
