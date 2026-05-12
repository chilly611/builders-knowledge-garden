// Builder's Knowledge Garden — CRM Capture Route (Brief 1)
// POST /api/v1/crm/capture
// Voice / manual contact capture. Calls contact-extract specialist, persists
// to crm_contacts, returns the bkg_contact JSON-LD record plus a
// time_machine_handle. Matches the route shape from
// src/app/api/v1/specialists/[id]/route.ts: 405 on non-POST, body validation,
// RSI instrumentation, { ...result, _run_id } response envelope.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { callSpecialist, type SpecialistContext } from '@/lib/specialists';
import {
  logSpecialistRunStart,
  logSpecialistRunComplete,
  logSpecialistRunError,
} from '@/lib/rsi-instrumentation';

// ─── Types ────────────────────────────────────────────────────────────────

interface CaptureRequestBody {
  source?: 'voice' | 'manual';
  transcript?: string;
  audioBase64?: string;
  audioDurationMs?: number;
  audioMimeType?: string;
  manualFields?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    company?: string;
  };
  projectId?: string;
}

interface ExtractedContactJson {
  '@type'?: 'Person' | 'Organization';
  name?: string;
  givenName?: string;
  familyName?: string;
  email?: string | null;
  telephone?: string | null;
  description?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  'bkg:lane'?: string;
  'bkg:lifecycle_stage'?: string;
  'bkg:source'?: 'voice' | 'photo' | 'manual';
  'bkg:confidence'?: number;
  confidence?: number;
  estimated_value?: number;
  project_type?: string;
  tags?: string[];
}

// ─── Supabase admin client (graceful fallback) ────────────────────────────

let adminClient: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (adminClient) return adminClient;
  // Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. If absent, returns null
  // and the route falls back to a non-persistent path. Mirrors the
  // mockIfNoKey philosophy in specialists.ts.
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || url.includes('placeholder')) {
    return null;
  }
  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function isBodyValid(body: unknown): body is CaptureRequestBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as CaptureRequestBody;
  if (b.source !== 'voice' && b.source !== 'manual') return false;
  if (b.source === 'voice') {
    const hasTranscript = typeof b.transcript === 'string' && b.transcript.trim().length > 0;
    const hasAudio = typeof b.audioBase64 === 'string' && b.audioBase64.length > 0;
    if (!hasTranscript && !hasAudio) return false;
  }
  if (b.source === 'manual') {
    const f = b.manualFields;
    if (!f || typeof f !== 'object') return false;
    const has =
      (typeof f.firstName === 'string' && f.firstName.trim().length > 0) ||
      (typeof f.lastName === 'string' && f.lastName.trim().length > 0) ||
      (typeof f.email === 'string' && f.email.trim().length > 0) ||
      (typeof f.phone === 'string' && f.phone.trim().length > 0) ||
      (typeof f.company === 'string' && f.company.trim().length > 0);
    if (!has) return false;
  }
  return true;
}

/**
 * Deterministic mock extraction when ANTHROPIC_API_KEY is absent. We still
 * persist to the DB with confidence: 0 and the raw transcript so the
 * contractor can edit later. Never fail silently.
 */
function mockExtraction(body: CaptureRequestBody): ExtractedContactJson {
  if (body.source === 'manual' && body.manualFields) {
    const f = body.manualFields;
    const fullName =
      [f.firstName, f.lastName].filter(Boolean).join(' ').trim() ||
      f.company ||
      'Unknown contact';
    return {
      '@type': f.company ? 'Organization' : 'Person',
      name: fullName,
      givenName: f.firstName ?? undefined,
      familyName: f.lastName ?? undefined,
      email: f.email ?? null,
      telephone: f.phone ?? null,
      description: f.company ? `Manual capture — ${f.company}` : 'Manual capture',
      'bkg:lane': 'homeowner',
      'bkg:lifecycle_stage': 'lead',
      'bkg:source': 'manual',
      'bkg:confidence': 0,
      confidence: 0,
      tags: ['manual-entry'],
    };
  }
  // voice: keep the transcript as description, name unknown
  return {
    '@type': 'Person',
    name: 'Unknown (voice — re-extract when API key available)',
    email: null,
    telephone: null,
    description: body.transcript ?? '',
    'bkg:lane': 'homeowner',
    'bkg:lifecycle_stage': 'lead',
    'bkg:source': 'voice',
    'bkg:confidence': 0,
    confidence: 0,
    tags: ['needs-extraction'],
  };
}

function buildJsonLD(extracted: ExtractedContactJson, contactId: string, timeMachineHandle: string) {
  return {
    '@context': 'https://schema.org',
    '@type': extracted['@type'] ?? 'Person',
    '@id': `bkg:contact:${contactId}`,
    name: extracted.name ?? 'Unknown',
    givenName: extracted.givenName,
    familyName: extracted.familyName,
    email: extracted.email ?? undefined,
    telephone: extracted.telephone ?? undefined,
    address: extracted.address,
    description: extracted.description,
    additionalType: 'https://builders.theknowledgegardens.com/schemas/bkg_contact',
    'bkg:lane': extracted['bkg:lane'] ?? 'homeowner',
    'bkg:lifecycle_stage': extracted['bkg:lifecycle_stage'] ?? 'lead',
    'bkg:source': extracted['bkg:source'] ?? 'voice',
    'bkg:confidence': extracted['bkg:confidence'] ?? extracted.confidence ?? 0,
    'bkg:last_touch': new Date().toISOString(),
    'bkg:time_machine_handle': timeMachineHandle,
  };
}

// ─── POST ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isBodyValid(body)) {
    return NextResponse.json(
      {
        error: 'validation_failed',
        message: "source must be 'voice'|'manual' with a transcript or manualFields",
      },
      { status: 400 }
    );
  }

  const validBody: CaptureRequestBody = body;

  // 2. RSI instrumentation (silent on failure — same pattern as specialists/[id]).
  const workflowId = 'who-is-asking';
  const stepId = validBody.source ?? 'voice';
  const runId = await logSpecialistRunStart({
    workflow_id: workflowId,
    step_id: stepId,
    specialist_id: 'contact-extract',
    prompt_version: 'v1',
    input_json: validBody as unknown,
  });
  const startedAt = Date.now();

  try {
    // 3. Run the specialist (or fall back to deterministic mock).
    const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
    let extracted: ExtractedContactJson;
    let narrative = '';
    let confidence = 0;

    if (validBody.source === 'manual') {
      // Manual path: skip the LLM, just normalize the fields.
      extracted = mockExtraction(validBody);
      narrative = 'Manual contact capture — fields stored verbatim.';
      confidence = 0; // user-typed = no inference confidence
    } else if (!hasApiKey) {
      extracted = mockExtraction(validBody);
      narrative = 'ANTHROPIC_API_KEY not configured — stored with confidence 0.';
      confidence = 0;
    } else {
      const ctx: SpecialistContext = {
        scope_description: validBody.transcript ?? '',
        extra: {
          workflow_id: workflowId,
          step_id: stepId,
          transcript: validBody.transcript,
          project_id: validBody.projectId,
        },
      };
      const result = await callSpecialist('contact-extract', ctx, {
        mockIfNoKey: true,
        preferProductionPrompt: true,
      });
      narrative = result.narrative;
      const structured = result.structured as ExtractedContactJson;
      extracted = structured ?? mockExtraction(validBody);
      confidence =
        typeof extracted['bkg:confidence'] === 'number'
          ? extracted['bkg:confidence']
          : typeof extracted.confidence === 'number'
            ? extracted.confidence
            : 0;
    }

    // 4. Persist to crm_contacts. If Supabase envs missing, return ephemeral row.
    const admin = getAdminClient();
    const timeMachineHandle = crypto.randomUUID();
    let contactId: string;

    if (admin) {
      const insertRow = {
        org_id: null,
        project_id: validBody.projectId ?? null,
        first_name:
          extracted.givenName ??
          validBody.manualFields?.firstName ??
          (extracted.name ?? '').split(' ')[0] ??
          'Unknown',
        last_name:
          extracted.familyName ??
          validBody.manualFields?.lastName ??
          (extracted.name ?? '').split(' ').slice(1).join(' ') ??
          null,
        company:
          validBody.manualFields?.company ??
          (extracted['@type'] === 'Organization' ? extracted.name : null),
        email: extracted.email ?? validBody.manualFields?.email ?? null,
        phone: extracted.telephone ?? validBody.manualFields?.phone ?? null,
        contact_type: 'lead',
        stage: 'new',
        temperature: 'warm',
        lane: extracted['bkg:lane'] ?? 'homeowner',
        lifecycle_stage: 'lead',
        project_type: extracted.project_type ?? null,
        project_location:
          [
            extracted.address?.streetAddress,
            extracted.address?.addressLocality,
            extracted.address?.addressRegion,
          ]
            .filter(Boolean)
            .join(', ') || null,
        estimated_value: extracted.estimated_value ?? null,
        lead_score: 30,
        notes: extracted.description ?? null,
        tags: extracted.tags ?? [],
        jsonld: null as unknown, // filled in below after we know the id
        source: validBody.source ?? 'voice',
        source_audio_url: null,
        source_photo_url: null,
        source_transcript: validBody.transcript ?? null,
        confidence,
        time_machine_handle: timeMachineHandle,
        previous_state: null,
        last_contact_at: new Date().toISOString(),
      };

      const { data, error } = await admin
        .from('crm_contacts')
        .insert(insertRow)
        .select('id')
        .single();

      if (error || !data) {
        throw new Error(`crm_contacts insert failed: ${error?.message ?? 'unknown'}`);
      }
      contactId = data.id as string;

      // Now backfill the jsonld with the real id.
      const jsonld = buildJsonLD(extracted, contactId, timeMachineHandle);
      await admin.from('crm_contacts').update({ jsonld }).eq('id', contactId);

      const latency = Date.now() - startedAt;
      if (runId) {
        await logSpecialistRunComplete(
          runId,
          {
            narrative,
            structured: extracted as unknown as Record<string, unknown>,
            citations: [],
            confidence: confidence > 0.7 ? 'high' : confidence > 0.3 ? 'medium' : 'low',
            raw_response: '',
            model: 'claude-sonnet-4-20250514',
            latency_ms: latency,
            promptVersion: 'v1',
          },
          latency
        );
      }

      return NextResponse.json(
        {
          ok: true,
          contactId,
          timeMachineHandle,
          jsonld,
          narrative,
          confidence,
          _run_id: runId,
        },
        { status: 200 }
      );
    }

    // No Supabase: ephemeral response. Still returns a valid contactId so the
    // client can render a "thanks" toast and emit journey events.
    contactId = crypto.randomUUID();
    const jsonld = buildJsonLD(extracted, contactId, timeMachineHandle);

    const latency = Date.now() - startedAt;
    if (runId) {
      await logSpecialistRunComplete(
        runId,
        {
          narrative,
          structured: extracted as unknown as Record<string, unknown>,
          citations: [],
          confidence: 'low',
          raw_response: '',
          model: 'mock',
          latency_ms: latency,
          promptVersion: 'v1',
        },
        latency
      );
    }

    return NextResponse.json(
      {
        ok: true,
        contactId,
        timeMachineHandle,
        jsonld,
        narrative,
        confidence,
        ephemeral: true,
        _run_id: runId,
      },
      { status: 200 }
    );
  } catch (err) {
    const latency = Date.now() - startedAt;
    const msg = err instanceof Error ? err.message : String(err);
    if (runId) {
      await logSpecialistRunError(runId, msg, latency);
    }
    console.error('[crm/capture] error:', err);
    return NextResponse.json(
      {
        error: 'capture_failed',
        message: 'The contact could not be saved',
        _run_id: runId,
      },
      { status: 500 }
    );
  }
}

// ─── 405s ─────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
export async function PUT(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
