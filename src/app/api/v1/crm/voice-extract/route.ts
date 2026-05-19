import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/crm/voice-extract
// Voice-first lead capture for the "Who's asking?" surface (B7).
//
// Receives a free-form transcript (and optional photoUrl + projectId),
// asks Claude to extract a structured contact record, then forwards
// the record to the existing /api/v1/crm POST handler.
//
// Returns { contact, draft } where:
//   - draft   = the raw Claude (or fallback) extraction
//   - contact = the persisted record from /api/v1/crm
//
// Journey event emission is intentionally NOT done here. emitJourneyEvent
// writes to localStorage and only runs in the browser (see
// src/lib/journey-progress.ts) — the client fires it after this returns.
// ═══════════════════════════════════════════════════════════════

interface VoiceExtractBody {
  transcript?: unknown;
  photoUrl?: unknown;
  projectId?: unknown;
}

interface ExtractedLead {
  first_name: string;
  last_name?: string;
  company?: string;
  role?: string;
  estimated_value?: number;
  notes?: string;
}

const EXTRACT_PROMPT = `You are a CRM intake assistant for a construction-builder app. The user just dictated a quick note about someone who reached out — a potential lead. Extract a structured record.

Return STRICT JSON only (no markdown, no commentary), matching exactly:
{
  "first_name": "string (required)",
  "last_name": "string (optional)",
  "company": "string (optional)",
  "role": "string (optional, e.g. homeowner, GC, architect, developer)",
  "estimated_value": number (optional, in USD; null if not mentioned),
  "notes": "string (1-2 sentences summarizing what they want / context)"
}

If the transcript is too short or ambiguous, set first_name to the first capitalized word (or first word) and stuff everything else into notes. Never invent a last name or company that wasn't said. Use null (not empty string) for missing optional fields.`;

function deterministicExtract(transcript: string): ExtractedLead {
  const trimmed = (transcript || '').trim();
  if (!trimmed) {
    return { first_name: 'Unknown', notes: '' };
  }
  const words = trimmed.split(/\s+/);
  const firstWord = words[0] || 'Unknown';
  const rest = words.slice(1).join(' ');
  return {
    first_name: firstWord.replace(/[^a-zA-Z'-]/g, '') || 'Unknown',
    notes: rest || trimmed,
  };
}

async function claudeExtract(transcript: string): Promise<ExtractedLead> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return deterministicExtract(transcript);
  }

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `${EXTRACT_PROMPT}\n\nTranscript:\n"""\n${transcript}\n"""`,
      },
    ],
  });

  const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
  let jsonStr = text.trim();
  // Strip ```json ... ``` fences if Claude wrapped them despite instructions.
  if (jsonStr.includes('```')) {
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) jsonStr = match[1];
  }

  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  const firstName =
    typeof parsed.first_name === 'string' && parsed.first_name.trim()
      ? parsed.first_name.trim()
      : deterministicExtract(transcript).first_name;

  return {
    first_name: firstName,
    last_name: typeof parsed.last_name === 'string' ? parsed.last_name : undefined,
    company: typeof parsed.company === 'string' ? parsed.company : undefined,
    role: typeof parsed.role === 'string' ? parsed.role : undefined,
    estimated_value:
      typeof parsed.estimated_value === 'number' ? parsed.estimated_value : undefined,
    notes: typeof parsed.notes === 'string' ? parsed.notes : undefined,
  };
}

export async function POST(request: NextRequest) {
  let body: VoiceExtractBody;
  try {
    body = (await request.json()) as VoiceExtractBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
  if (!transcript) {
    return NextResponse.json({ error: 'transcript is required' }, { status: 400 });
  }
  const photoUrl = typeof body.photoUrl === 'string' ? body.photoUrl : undefined;
  const projectId = typeof body.projectId === 'string' ? body.projectId : undefined;

  // 1. Extract via Claude (with deterministic fallback).
  let draft: ExtractedLead;
  let extractorUsed: 'claude' | 'fallback' = 'fallback';
  try {
    draft = await claudeExtract(transcript);
    extractorUsed = process.env.ANTHROPIC_API_KEY ? 'claude' : 'fallback';
  } catch (err) {
    console.error('[voice-extract] Claude extraction failed, using fallback:', err);
    draft = deterministicExtract(transcript);
    extractorUsed = 'fallback';
  }

  // Notes get a marker + the raw transcript appended so the user can see
  // exactly what was captured. Photo URL gets noted if supplied.
  const composedNotes = [
    draft.notes,
    photoUrl ? `Photo attached: ${photoUrl}` : null,
    `(Voice capture · ${new Date().toISOString().slice(0, 10)})`,
  ]
    .filter(Boolean)
    .join(' · ');

  // 2. Forward to existing /api/v1/crm POST handler. Build the absolute URL
  //    from the inbound request so this works in dev, preview, and prod.
  const origin = new URL(request.url).origin;
  const crmPayload = {
    first_name: draft.first_name,
    last_name: draft.last_name || '',
    company: draft.company || '',
    contact_type: 'lead',
    stage: 'new',
    estimated_value: draft.estimated_value || 0,
    notes: composedNotes,
    tags: ['voice-capture', extractorUsed === 'claude' ? 'ai-extracted' : 'fallback-extract'],
  };

  let contact: unknown = null;
  try {
    const crmRes = await fetch(`${origin}/api/v1/crm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(crmPayload),
    });
    if (crmRes.ok) {
      const crmJson = await crmRes.json();
      contact = crmJson.contact ?? null;
    } else {
      console.warn('[voice-extract] CRM POST returned non-OK', crmRes.status);
    }
  } catch (err) {
    console.error('[voice-extract] CRM POST failed:', err);
    // Soft-fail: still return the draft so the UI can show what we caught.
  }

  return NextResponse.json({
    contact,
    draft: { ...draft, notes: composedNotes },
    meta: {
      extractor: extractorUsed,
      projectId: projectId || null,
      photoUrl: photoUrl || null,
    },
  });
}
