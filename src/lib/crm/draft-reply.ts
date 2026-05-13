// Builder's Knowledge Garden — Draft Reply (Brief 2)
//
// Server-side wrapper around the `draft-reply` specialist (Anthropic
// claude-sonnet-4 via src/lib/specialists.ts). Inputs are the inbound
// message + contact history + the contractor's voice fingerprint; the
// output is a thumb-ready SMS draft plus the reasoning trace.
//
// Failure modes:
//   - Missing ANTHROPIC_API_KEY → returns a generic mocked draft so the
//     route always succeeds (the UI can demonstrate the flow without an
//     LLM bill).
//   - LLM returns malformed JSON → falls back to defaults (warm tone,
//     low voiceMatchScore, no commitments / prices flagged).

import { callSpecialist, type SpecialistContext } from '@/lib/specialists';
import type { VoiceFingerprint } from './voice-fingerprint';

export type MessageTone = 'warm' | 'professional' | 'brief' | 'custom';

export interface DraftReplyContext {
  contactId: string;
  inboundMessageId: string;
  inboundBody: string;
  contactName?: string;
  contactLifecycleStage?: string;
  contactHistory: Array<{
    direction: 'inbound' | 'outbound';
    body: string;
    createdAt: string;
  }>;
  voiceFingerprint: VoiceFingerprint;
  tone?: MessageTone;
  projectId?: string;
}

export interface DraftReplyResult {
  body: string;
  reasoning: string;
  toneUsed: MessageTone;
  voiceMatchScore: number;
  containsCommitment: boolean;
  containsPrice: boolean;
  suggestedSendDelayMs: number;
  intentTags: string[];
  rawResponse: string;
}

// ─── Mocked fallback ──────────────────────────────────────────────────────

function mockDraft(ctx: DraftReplyContext): DraftReplyResult {
  const signoff = ctx.voiceFingerprint.signoff
    ? ` ${ctx.voiceFingerprint.signoff}`
    : '';
  return {
    body: `Got your message, will follow up soon.${signoff}`,
    reasoning: 'API key missing — generic acknowledgement so the contractor can still send.',
    toneUsed: ctx.tone ?? 'warm',
    voiceMatchScore: 0.4,
    containsCommitment: false,
    containsPrice: false,
    suggestedSendDelayMs: 0,
    intentTags: [],
    rawResponse: '',
  };
}

// ─── Parse the specialist response ────────────────────────────────────────

interface StructuredDraftJson {
  reasoning?: unknown;
  tone_used?: unknown;
  voice_match_score?: unknown;
  contains_commitment?: unknown;
  contains_price?: unknown;
  suggested_send_delay_ms?: unknown;
  intent_tags?: unknown;
}

function coerceTone(v: unknown, fallback: MessageTone): MessageTone {
  if (v === 'warm' || v === 'professional' || v === 'brief' || v === 'custom') {
    return v;
  }
  return fallback;
}

function coerceNumber(v: unknown, fallback: number, min = 0, max = 1): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

function coerceBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  return fallback;
}

function coerceStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
}

// ─── Body cleanup ─────────────────────────────────────────────────────────

/**
 * Strip any stray markdown labels the LLM might emit even though the prompt
 * says not to. Same spirit as the route-side cleanupNarrative fallbacks.
 */
function cleanDraftBody(raw: string): string {
  let body = raw.trim();
  body = body.replace(/^\*\*Draft( Reply)?:\*\*\s*/i, '');
  body = body.replace(/^Draft( Reply)?:\s*/i, '');
  body = body.replace(/^Here(?:'s| is)?( the| your)? (draft|reply):?\s*/i, '');
  return body.trim();
}

// ─── Build specialist context ─────────────────────────────────────────────

function buildSpecialistContext(ctx: DraftReplyContext): SpecialistContext {
  // The prompt expects `scope_description` = the inbound message body.
  // Everything else lives in `extra`.
  return {
    scope_description: ctx.inboundBody,
    extra: {
      workflow_id: 'quick-reply',
      step_id: 'draft',
      inbound_message_id: ctx.inboundMessageId,
      contact_id: ctx.contactId,
      contact_name: ctx.contactName,
      contact_lifecycle_stage: ctx.contactLifecycleStage,
      contact_history: ctx.contactHistory.slice(-10), // last 10 messages
      voice_fingerprint: {
        tone_vector: ctx.voiceFingerprint.toneVector,
        example_phrases: ctx.voiceFingerprint.examplePhrases,
        signoff: ctx.voiceFingerprint.signoff,
        sample_size: ctx.voiceFingerprint.sampleSize,
      },
      tone: ctx.tone ?? 'warm',
      project_id: ctx.projectId,
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function generateDraftReply(
  ctx: DraftReplyContext
): Promise<DraftReplyResult> {
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
  if (!hasApiKey) {
    return mockDraft(ctx);
  }

  try {
    const result = await callSpecialist(
      'draft-reply',
      buildSpecialistContext(ctx),
      { mockIfNoKey: true, preferProductionPrompt: true }
    );

    const body = cleanDraftBody(result.narrative ?? '');
    const structured = (result.structured ?? {}) as StructuredDraftJson;

    if (!body) {
      // narrative was empty — fall back to mock
      return mockDraft(ctx);
    }

    return {
      body,
      reasoning:
        typeof structured.reasoning === 'string' && structured.reasoning.length > 0
          ? structured.reasoning
          : 'Drafted from the inbound + your voice fingerprint.',
      toneUsed: coerceTone(structured.tone_used, ctx.tone ?? 'warm'),
      voiceMatchScore: coerceNumber(structured.voice_match_score, 0.5, 0, 1),
      containsCommitment: coerceBool(structured.contains_commitment, false),
      containsPrice: coerceBool(structured.contains_price, false),
      suggestedSendDelayMs: Math.max(
        0,
        coerceNumber(structured.suggested_send_delay_ms, 0, 0, 10 * 60 * 1000)
      ),
      intentTags: coerceStringArray(structured.intent_tags),
      rawResponse: result.raw_response ?? '',
    };
  } catch (err) {
    console.warn('[draft-reply] specialist call failed, falling back to mock:', err);
    return mockDraft(ctx);
  }
}
