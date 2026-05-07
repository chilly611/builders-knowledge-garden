/**
 * Receipt OCR endpoint (Phase 3, 2026-05-07)
 *
 * POST /api/v1/projects/[id]/attachments/[attachmentId]/extract-receipt
 *
 * Calls Anthropic Claude Haiku 4.5 with vision on the attachment's signed
 * URL and extracts structured receipt data (vendor, total, line items).
 * Returns the extraction; does NOT auto-write to the budget — that's the
 * client's job after user confirmation. Receipt OCR is fast but fallible;
 * we never spend the user's money without an explicit click.
 *
 * Auth: same project + attachment ownership pattern as the parent
 * attachments route. Mime type must start with `image/` (videos and PDFs
 * are out of scope for v1).
 *
 * Cost: ~$0.008 per image at Haiku rates. Acceptable for the typical
 * 5-10 receipts per project demo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

interface ReceiptExtraction {
  vendor: string | null;
  total: number | null;
  currency: string;
  lineItems?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  confidence: number;
  notes?: string | null;
}

const SYSTEM_PROMPT = `You are a receipt-reading assistant for a construction project budgeting tool.
Your job is to extract structured financial data from a receipt or invoice image.
Focus on: vendor name, grand total amount, currency, optionally a few line items.

Rules:
- Always return ONLY valid JSON. No markdown fences, no explanation, no commentary.
- If a field is unclear or missing, set it to null. Do not invent or guess.
- Confidence: 0.9+ if clear and unambiguous, 0.7-0.89 if partial/blurry/handwritten, <0.7 if barely readable.
- Currency: 3-letter ISO 4217 code (USD, CAD, GBP, EUR, etc.). Default to USD if unclear.
- Total: numeric only, no currency symbol. Includes tax. Strip commas.
- Line items: optional. Only include if clearly visible — don't guess at totals from line-by-line additions.
- If the image is NOT a receipt or invoice (e.g. a jobsite photo), set vendor: null, total: null, confidence: 0, notes: "not a receipt".`;

const USER_PROMPT = `Extract structured data from this receipt image. Return ONLY this JSON object:

{
  "vendor": <string or null>,
  "total": <number or null>,
  "currency": "USD" | "CAD" | "GBP" | "EUR" | other 3-letter ISO,
  "lineItems": [
    { "description": <string>, "quantity": <number or null>, "unitPrice": <number or null>, "amount": <number> }
  ],
  "confidence": <number 0-1>,
  "notes": <optional short note about anything ambiguous, or null>
}

If this isn't a receipt, return: { "vendor": null, "total": null, "currency": "USD", "confidence": 0, "notes": "not a receipt" }`;


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
): Promise<NextResponse> {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const { id: projectId, attachmentId } = await params;

    // Verify project + attachment ownership.
    const service = getServiceClient();
    const { data: project } = await service
      .from('command_center_projects')
      .select('user_id')
      .eq('id', projectId)
      .single();
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data: attachment, error: attachErr } = await service
      .from('project_attachments')
      .select('id, file_path, mime_type, user_id, project_id')
      .eq('id', attachmentId)
      .eq('project_id', projectId)
      .single();
    if (attachErr || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }
    if (attachment.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!attachment.mime_type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Receipt OCR is only supported for image attachments' },
        { status: 400 }
      );
    }

    // Generate a fresh signed URL for the image so Claude can fetch it.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Storage config missing' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: signed, error: signErr } = await supabase.storage
      .from('project-evidence')
      .createSignedUrl(attachment.file_path, 3600);
    if (signErr || !signed) {
      return NextResponse.json(
        { error: `Failed to generate signed URL: ${signErr?.message ?? 'unknown'}` },
        { status: 500 }
      );
    }

    // Call Anthropic vision.
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    // Anthropic's vision API accepts type: "url" — pass the signed URL
    // directly so we don't have to base64-encode the entire image.
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'url', url: signed.signedUrl } },
              { type: 'text', text: USER_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const detail = await claudeRes.text();
      console.error('Receipt OCR Anthropic error:', detail);
      return NextResponse.json(
        { error: 'Vision API error', detail },
        { status: 502 }
      );
    }

    const result = await claudeRes.json();
    const rawText: string = result.content?.[0]?.text ?? '';
    // Strip any markdown fences the model might still emit.
    const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let extraction: ReceiptExtraction;
    try {
      extraction = JSON.parse(cleaned) as ReceiptExtraction;
    } catch (e) {
      console.error('Receipt OCR parse error:', e, 'raw:', cleaned);
      return NextResponse.json(
        {
          error: 'Could not parse OCR response',
          extraction: {
            vendor: null,
            total: null,
            currency: 'USD',
            confidence: 0,
            notes: 'parse_error',
          } as ReceiptExtraction,
        },
        { status: 200 } // soft-fail — let client surface the message
      );
    }

    return NextResponse.json({
      extraction,
      attachmentId,
      modelUsed: 'claude-haiku-4-5',
      extractionAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Receipt OCR route error:', e);
    return NextResponse.json({ error: 'Receipt OCR failed' }, { status: 500 });
  }
}
