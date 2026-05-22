/**
 * /api/v1/sub-bids/expand-scope (POST)
 * =====================================
 * Helper endpoint behind the sub-bid-submit form's "Use AI to expand"
 * button. Takes a short scope blurb + the trade label and returns a
 * single fleshed-out scope paragraph suitable for pasting back into
 * the textarea.
 *
 * Non-streaming on purpose — the UI just needs the final text. Falls
 * back to a deterministic template if ANTHROPIC_API_KEY is missing so
 * preview deploys and local dev still demo.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-server';

const MODEL = 'claude-sonnet-4-20250514';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const draft = typeof body.draft === 'string' ? body.draft.slice(0, 4000) : '';
    const trade = typeof body.trade_label === 'string' ? body.trade_label.slice(0, 80) : '';
    const projectContext = typeof body.project_context === 'string' ? body.project_context.slice(0, 4000) : '';

    if (!draft.trim()) {
      return NextResponse.json({ error: 'draft is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Deterministic fallback so the UI button always works.
      return NextResponse.json({
        scope: stubScope(draft, trade),
      });
    }

    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system:
        `You are a subcontractor estimator writing scope-of-work paragraphs ` +
        `for a bid being submitted to a general contractor. The trade is ${trade || 'unspecified'}. ` +
        `Take the user's short draft and rewrite it as ONE professional paragraph ` +
        `(80–160 words) that clearly states what is INCLUDED in this bid. ` +
        `Use industry-standard terms. Do NOT add disclaimers, exclusions, or pricing. ` +
        `Do NOT introduce yourself. Output only the paragraph — no headers, no quotes.`,
      messages: [
        {
          role: 'user',
          content:
            (projectContext ? `Project context: ${projectContext}\n\n` : '') +
            `Draft scope: ${draft}\n\nRewrite as a full scope paragraph.`,
        },
      ],
    });
    const piece = msg.content[0];
    const text = piece && piece.type === 'text' ? piece.text.trim() : '';
    return NextResponse.json({ scope: text || stubScope(draft, trade) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

function stubScope(draft: string, trade: string): string {
  const tradeBit = trade ? ` ${trade.toLowerCase()}` : '';
  return (
    `Furnish all labor, materials, equipment, and supervision necessary to perform the${tradeBit} work described as follows: ` +
    `${draft.trim()} ` +
    `Work includes layout, rough-in, finish installation, system testing, and clean-up of the work area at substantial completion. ` +
    `All work performed in accordance with applicable California Building Code, manufacturer specifications, and the approved permit set. ` +
    `Coordination with adjacent trades is included; final connections and trim-out are performed after substrates are in place and accessible.`
  );
}
