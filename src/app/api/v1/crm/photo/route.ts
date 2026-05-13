// Builder's Knowledge Garden — CRM Photo / Video Capture Route
// POST /api/v1/crm/photo
//
// Brief 1: photo capture from the field.
// Brief 2 additions:
//   - Accepts video MIME types (mp4, quicktime, webm, x-m4v) in addition
//     to images. Video path skips Claude Vision (Claude doesn't process
//     video yet) and falls back to reverse-geocode + GPS match-or-create.
//   - Fixes a path-duplication bug: `storage.from('crm-photos')` already
//     scopes the bucket, so the upload path must NOT re-include
//     'crm-photos/'.
//   - Adds cleanupNarrative + calibrateConfidence helpers (Brief 1.1
//     route-side fallbacks) to keep stray markdown headers out of the
//     description field and to backfill confidence from extracted shape
//     when the LLM forgot to emit one.
//   - Inserts media_type / media_duration_seconds / media_size_bytes onto
//     crm_contact_activities when attaching to an existing contact.
//
// Same conventions as src/app/api/v1/specialists/[id]/route.ts: POST-only,
// 405s on other verbs, RSI instrumentation, no leaking internal errors.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { callSpecialist, type SpecialistContext } from '@/lib/specialists';
import {
  logSpecialistRunStart,
  logSpecialistRunComplete,
  logSpecialistRunError,
} from '@/lib/rsi-instrumentation';

// ─── Types ────────────────────────────────────────────────────────────────

interface PhotoRequestBody {
  photoBase64?: string;
  photoMimeType?: string;
  photoExif?: {
    gps?: [number, number]; // [lat, lon]
    timestamp?: string;
  };
  mediaDurationSeconds?: number;
  projectId?: string;
}

interface ExistingContactRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  jsonld: {
    address?: { streetAddress?: string };
    'bkg:geo'?: { lat?: number; lon?: number };
  } | null;
  source_photo_url: string | null;
  project_location: string | null;
}

interface ContactWithGeo {
  id: string;
  lat: number;
  lon: number;
  label: string;
}

const SUPPORTED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
]);

const SUPPORTED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
]);

function classifyMime(mime: string): 'photo' | 'video' | 'unsupported' {
  if (SUPPORTED_IMAGE_MIMES.has(mime)) return 'photo';
  if (SUPPORTED_VIDEO_MIMES.has(mime)) return 'video';
  if (mime.startsWith('image/')) return 'photo';
  if (mime.startsWith('video/')) return 'video';
  return 'unsupported';
}

// ─── Supabase admin client ────────────────────────────────────────────────

let adminClient: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (adminClient) return adminClient;
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

// ─── Brief 1.1 fallbacks (route-side) ─────────────────────────────────────

/**
 * cleanupNarrative — when the LLM forgets the "no headings" rule and
 * returns markdown like `## Summary` or `**Name:** ...`, the raw narrative
 * is unfit for the description field. Detect those patterns and prefer
 * the extracted description instead.
 */
function cleanupNarrative(
  narrative: string | undefined,
  extractedDescription: string | undefined
): string {
  const n = (narrative ?? '').trim();
  if (!n) return extractedDescription ?? '';
  const startsWithHeader = /^##/.test(n) || /^\*\*[A-Z]/.test(n);
  const containsBoldFieldLabel = /\*\*Name:\*\*/i.test(n);
  if (startsWithHeader || containsBoldFieldLabel) {
    return (extractedDescription ?? '').trim();
  }
  return n;
}

/**
 * calibrateConfidence — when the LLM emits 0 / null / missing, infer a
 * sensible value from how complete the extraction was. Three signals
 * present → 0.85; two → 0.65; one → 0.4; zero → 0.
 */
function calibrateConfidence(
  llmConfidence: number | undefined | null,
  extracted: Record<string, unknown>
): number {
  if (typeof llmConfidence === 'number' && llmConfidence > 0) {
    return llmConfidence;
  }
  let signals = 0;
  const name = typeof extracted.name === 'string' ? extracted.name.trim() : '';
  if (name.length > 0) signals++;
  const addr = extracted.address as { streetAddress?: string } | undefined;
  const streetOk = typeof addr?.streetAddress === 'string' && addr.streetAddress.trim().length > 0;
  if (streetOk) signals++;
  const intent =
    (typeof extracted.intent === 'string' && extracted.intent.trim().length > 0) ||
    (typeof extracted.description === 'string' && (extracted.description as string).trim().length > 0);
  if (intent) signals++;

  if (signals >= 3) return 0.85;
  if (signals === 2) return 0.65;
  if (signals === 1) return 0.4;
  return 0;
}

// ─── Geo helpers ──────────────────────────────────────────────────────────

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

interface NominatimResponse {
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country_code?: string;
  };
}

async function reverseGeocode(
  lat: number,
  lon: number
): Promise<NominatimResponse | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'BuildersKnowledgeGarden/1.0 (https://builders.theknowledgegardens.com)',
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as NominatimResponse;
  } catch {
    return null;
  }
}

// ─── Body validation ──────────────────────────────────────────────────────

function isBodyValid(body: unknown): body is PhotoRequestBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as PhotoRequestBody;
  if (typeof b.photoBase64 !== 'string' || b.photoBase64.length < 32) return false;
  return true;
}

// ─── Media storage ────────────────────────────────────────────────────────

interface UploadedMedia {
  publicUrl: string;
  sizeBytes: number;
}

async function uploadMedia(
  admin: SupabaseClient,
  dataUrlOrBase64: string,
  mimeType: string
): Promise<UploadedMedia | null> {
  try {
    const base64 = dataUrlOrBase64.includes(',')
      ? dataUrlOrBase64.split(',')[1]
      : dataUrlOrBase64;
    const buffer = Buffer.from(base64, 'base64');
    const ext =
      mimeType === 'video/quicktime'
        ? 'mov'
        : mimeType === 'video/x-m4v'
          ? 'm4v'
          : (mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin');
    // NOTE: storage.from('crm-photos') already scopes the bucket; the path
    // is the key WITHIN the bucket. Re-including 'crm-photos/' here used
    // to produce s3 keys like `crm-photos/crm-photos/<uuid>.jpg`.
    const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await admin.storage
      .from('crm-photos')
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      });
    if (error) {
      console.error('[crm/photo] storage upload error:', error.message);
      return null;
    }
    const { data } = admin.storage.from('crm-photos').getPublicUrl(path);
    if (!data.publicUrl) return null;
    return { publicUrl: data.publicUrl, sizeBytes: buffer.byteLength };
  } catch (err) {
    console.error('[crm/photo] upload exception:', err);
    return null;
  }
}

// ─── Existing-contact matching ────────────────────────────────────────────

function extractGeoFromContact(row: ExistingContactRow): ContactWithGeo | null {
  const j = row.jsonld;
  const geo = j?.['bkg:geo'];
  if (geo && typeof geo.lat === 'number' && typeof geo.lon === 'number') {
    return {
      id: row.id,
      lat: geo.lat,
      lon: geo.lon,
      label:
        [row.first_name, row.last_name].filter(Boolean).join(' ') ||
        row.project_location ||
        'Contact',
    };
  }
  return null;
}

async function findNearestContact(
  admin: SupabaseClient,
  gps: [number, number],
  orgId: string | null
): Promise<{ contactId: string; distanceM: number; label: string } | null> {
  const query = admin
    .from('crm_contacts')
    .select('id, first_name, last_name, jsonld, source_photo_url, project_location')
    .eq('archived', false)
    .not('jsonld', 'is', null)
    .limit(500);
  if (orgId) query.eq('org_id', orgId);

  const { data, error } = await query;
  if (error || !data) return null;

  let nearest: { id: string; distance: number; label: string } | null = null;
  for (const row of data as ExistingContactRow[]) {
    const geo = extractGeoFromContact(row);
    if (!geo) continue;
    const d = haversineMeters(gps, [geo.lat, geo.lon]);
    if (d <= 200 && (!nearest || d < nearest.distance)) {
      nearest = { id: geo.id, distance: d, label: geo.label };
    }
  }

  if (!nearest) return null;
  return { contactId: nearest.id, distanceM: nearest.distance, label: nearest.label };
}

// ─── POST ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isBodyValid(body)) {
    return NextResponse.json(
      { error: 'validation_failed', message: 'photoBase64 is required' },
      { status: 400 }
    );
  }

  const validBody: PhotoRequestBody = body;
  const mimeType = validBody.photoMimeType ?? 'image/jpeg';
  const kind = classifyMime(mimeType);
  if (kind === 'unsupported') {
    return NextResponse.json(
      {
        error: 'unsupported_media',
        message: `Media type ${mimeType} is not supported. Use image/* or video/*.`,
      },
      { status: 400 }
    );
  }
  const isVideo = kind === 'video';
  const mediaDurationSeconds = validBody.mediaDurationSeconds;

  // RSI instrumentation
  const workflowId = 'who-is-asking';
  const stepId = isVideo ? 'video' : 'photo';
  const runId = await logSpecialistRunStart({
    workflow_id: workflowId,
    step_id: stepId,
    specialist_id: 'contact-extract',
    prompt_version: 'v1',
    input_json: {
      hasPhoto: !isVideo,
      hasVideo: isVideo,
      mimeType,
      mediaDurationSeconds,
      gps: validBody.photoExif?.gps,
    } as unknown,
  });
  const startedAt = Date.now();

  try {
    const admin = getAdminClient();
    const timeMachineHandle = crypto.randomUUID();

    // 1. Upload media to Supabase Storage (best-effort).
    let mediaUrl: string | null = null;
    let mediaSizeBytes: number | null = null;
    if (admin && validBody.photoBase64) {
      const uploaded = await uploadMedia(admin, validBody.photoBase64, mimeType);
      if (!uploaded) {
        return NextResponse.json(
          {
            error: 'storage_upload_failed',
            message: 'Could not save media to storage',
            _run_id: runId,
          },
          { status: 500 }
        );
      }
      mediaUrl = uploaded.publicUrl;
      mediaSizeBytes = uploaded.sizeBytes;
    }

    // 2. Reverse-geocode GPS (if present).
    let address: NominatimResponse | null = null;
    if (validBody.photoExif?.gps) {
      const [lat, lon] = validBody.photoExif.gps;
      address = await reverseGeocode(lat, lon);
    }
    const addressStr = address?.display_name ?? '(no GPS)';
    const streetLabel =
      [address?.address?.house_number, address?.address?.road]
        .filter(Boolean)
        .join(' ')
        .trim() || address?.display_name || 'this location';

    // 3. Try to match an existing contact within 200m.
    let attached = false;
    let contactId: string | null = null;
    let jsonld: Record<string, unknown> | null = null;

    if (admin && validBody.photoExif?.gps) {
      const match = await findNearestContact(admin, validBody.photoExif.gps, null);
      if (match) {
        contactId = match.contactId;
        attached = true;
        await admin.from('crm_contact_activities').insert({
          contact_id: contactId,
          activity_type: isVideo ? 'video' : 'photo',
          title: isVideo ? 'Field video attached' : 'Field photo attached',
          body: address?.display_name
            ? `${isVideo ? 'Video' : 'Photo'} near ${address.display_name} (${match.distanceM.toFixed(0)}m from contact).`
            : `${isVideo ? 'Video' : 'Photo'} attached (${match.distanceM.toFixed(0)}m from contact).`,
          completed_at: new Date().toISOString(),
          time_machine_handle: timeMachineHandle,
          media_type: isVideo ? 'video' : 'photo',
          media_duration_seconds: mediaDurationSeconds ?? null,
          media_size_bytes: mediaSizeBytes,
        });
        await admin
          .from('crm_contacts')
          .update({
            source_photo_url: mediaUrl,
            last_contact_at: new Date().toISOString(),
          })
          .eq('id', contactId);

        const { data: refreshed } = await admin
          .from('crm_contacts')
          .select('jsonld')
          .eq('id', contactId)
          .single();
        jsonld = (refreshed?.jsonld as Record<string, unknown>) ?? null;
      }
    }

    // 4. No match → create new contact.
    if (!attached) {
      let narrative = '';
      let structured: Record<string, unknown> = {};

      if (isVideo) {
        // Video: skip Claude Vision entirely. Use GPS-derived defaults.
        narrative = address?.display_name
          ? `Video uploaded at ${address.display_name}.`
          : 'Video uploaded (no GPS).';
        structured = {
          '@type': 'Person',
          name: `Owner at ${streetLabel}`,
          description: address?.display_name
            ? `Video uploaded at ${address.display_name}`
            : 'Video uploaded at unknown location',
          'bkg:lane': 'homeowner',
          'bkg:lifecycle_stage': 'lead',
          'bkg:source': 'photo', // bkg_contact source enum doesn't include 'video' in v1; mark as photo for backwards-compat
          'bkg:confidence': 0.4, // video gives us address but no face/sign — modest signal
        };
      } else {
        // Photo: original Brief 1 behaviour (unchanged).
        const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
        if (hasApiKey) {
          const ctx: SpecialistContext = {
            scope_description: `Jobsite photo at ${addressStr}`,
            extra: {
              workflow_id: workflowId,
              step_id: stepId,
              photo_data_url: `data:${mimeType};base64,${validBody.photoBase64?.slice(0, 100)}...`,
              photo_geocoded_address: addressStr,
              project_id: validBody.projectId,
            },
          };
          const result = await callSpecialist('contact-extract', ctx, {
            mockIfNoKey: true,
            preferProductionPrompt: true,
          });
          narrative = result.narrative;
          structured = result.structured;
        } else {
          narrative = `Photo captured at ${addressStr}. ANTHROPIC_API_KEY missing — saved as draft.`;
          structured = {
            '@type': 'Person',
            name: address?.display_name ? `Owner at ${streetLabel}` : 'Unknown owner (photo)',
            description: `Field photo. ${addressStr}`,
            'bkg:lane': 'homeowner',
            'bkg:lifecycle_stage': 'lead',
            'bkg:source': 'photo',
            'bkg:confidence': 0,
          };
        }
      }

      // Brief 1.1 fallbacks
      const llmConfidence =
        typeof structured['bkg:confidence'] === 'number'
          ? (structured['bkg:confidence'] as number)
          : undefined;
      const confidence = calibrateConfidence(llmConfidence, structured);
      structured['bkg:confidence'] = confidence;
      const cleanedDescription = cleanupNarrative(
        narrative,
        typeof structured.description === 'string'
          ? (structured.description as string)
          : undefined
      );
      if (cleanedDescription) {
        structured.description = cleanedDescription;
      }

      if (admin) {
        const insertRow = {
          org_id: null,
          project_id: validBody.projectId ?? null,
          first_name:
            ((structured.givenName as string) ??
              (structured.name as string) ??
              'Owner')
              .split(' ')[0] || 'Owner',
          last_name: (structured.familyName as string) ?? null,
          company: null,
          email: null,
          phone: null,
          contact_type: 'lead',
          stage: 'new',
          temperature: 'warm',
          lane: (structured['bkg:lane'] as string) ?? 'homeowner',
          lifecycle_stage: 'lead',
          project_type: (structured.project_type as string) ?? null,
          project_location: address?.display_name ?? null,
          estimated_value: null,
          lead_score: 30,
          notes: (structured.description as string) ?? null,
          tags: (structured.tags as string[]) ?? (isVideo ? ['video-capture'] : ['photo-capture']),
          jsonld: null as unknown,
          source: 'photo',
          source_audio_url: null,
          source_photo_url: mediaUrl,
          source_transcript: null,
          confidence,
          time_machine_handle: timeMachineHandle,
          previous_state: null,
          last_contact_at: new Date().toISOString(),
        };

        const { data: inserted, error: insertErr } = await admin
          .from('crm_contacts')
          .insert(insertRow)
          .select('id')
          .single();
        if (insertErr || !inserted) {
          throw new Error(
            `crm_contacts insert failed: ${insertErr?.message ?? 'unknown'}`
          );
        }
        contactId = inserted.id as string;

        // Record the create as an activity too, with media metadata.
        await admin.from('crm_contact_activities').insert({
          contact_id: contactId,
          activity_type: isVideo ? 'video' : 'photo',
          title: isVideo ? 'Created from field video' : 'Created from field photo',
          body: cleanedDescription || narrative,
          completed_at: new Date().toISOString(),
          time_machine_handle: timeMachineHandle,
          media_type: isVideo ? 'video' : 'photo',
          media_duration_seconds: mediaDurationSeconds ?? null,
          media_size_bytes: mediaSizeBytes,
        });

        jsonld = {
          '@context': 'https://schema.org',
          '@type': structured['@type'] ?? 'Person',
          '@id': `bkg:contact:${contactId}`,
          name: structured.name ?? 'Owner',
          address: address?.address
            ? {
                '@type': 'PostalAddress',
                streetAddress:
                  `${address.address.house_number ?? ''} ${address.address.road ?? ''}`.trim() ||
                  undefined,
                addressLocality:
                  address.address.city ?? address.address.town ?? address.address.village,
                addressRegion: address.address.state,
                postalCode: address.address.postcode,
                addressCountry: address.address.country_code?.toUpperCase(),
              }
            : undefined,
          // Photo path keeps `image`; video path emits a `video` VideoObject.
          ...(isVideo
            ? {
                video: {
                  '@type': 'VideoObject',
                  contentUrl: mediaUrl ?? undefined,
                  duration:
                    mediaDurationSeconds && mediaDurationSeconds > 0
                      ? `PT${Math.round(mediaDurationSeconds)}S`
                      : undefined,
                },
              }
            : {
                image: mediaUrl ?? undefined,
              }),
          description: structured.description,
          additionalType: 'https://builders.theknowledgegardens.com/schemas/bkg_contact',
          'bkg:lane': structured['bkg:lane'] ?? 'homeowner',
          'bkg:lifecycle_stage': 'lead',
          'bkg:source': 'photo',
          'bkg:confidence': confidence,
          'bkg:geo': validBody.photoExif?.gps
            ? { lat: validBody.photoExif.gps[0], lon: validBody.photoExif.gps[1] }
            : undefined,
          'bkg:last_touch': new Date().toISOString(),
          'bkg:time_machine_handle': timeMachineHandle,
        };

        await admin.from('crm_contacts').update({ jsonld }).eq('id', contactId);
      } else {
        // No DB available — ephemeral response.
        contactId = crypto.randomUUID();
        jsonld = {
          '@context': 'https://schema.org',
          '@type': 'Person',
          '@id': `bkg:contact:${contactId}`,
          name: structured.name ?? 'Owner',
          ...(isVideo
            ? {
                video: {
                  '@type': 'VideoObject',
                  contentUrl: mediaUrl ?? undefined,
                  duration:
                    mediaDurationSeconds && mediaDurationSeconds > 0
                      ? `PT${Math.round(mediaDurationSeconds)}S`
                      : undefined,
                },
              }
            : {
                image: mediaUrl ?? undefined,
              }),
          additionalType: 'https://builders.theknowledgegardens.com/schemas/bkg_contact',
          'bkg:source': 'photo',
          'bkg:confidence': confidence,
          'bkg:time_machine_handle': timeMachineHandle,
        };
      }

      const latency = Date.now() - startedAt;
      if (runId) {
        await logSpecialistRunComplete(
          runId,
          {
            narrative: cleanedDescription || narrative,
            structured,
            citations: [],
            confidence:
              confidence > 0.7 ? 'high' : confidence > 0.3 ? 'medium' : 'low',
            raw_response: '',
            model: isVideo
              ? 'gps-only'
              : process.env.ANTHROPIC_API_KEY
                ? 'claude-sonnet-4-20250514'
                : 'mock',
            latency_ms: latency,
            promptVersion: 'v1',
          },
          latency
        );
      }
    } else {
      // Attached path also logs completion.
      const latency = Date.now() - startedAt;
      if (runId) {
        await logSpecialistRunComplete(
          runId,
          {
            narrative: `${isVideo ? 'Video' : 'Photo'} attached to existing contact (GPS match within 200m).`,
            structured: { attached: true },
            citations: [],
            confidence: 'high',
            raw_response: '',
            model: 'gps-match',
            latency_ms: latency,
            promptVersion: 'v1',
          },
          latency
        );
      }
    }

    return NextResponse.json(
      {
        ok: true,
        contactId,
        timeMachineHandle,
        attached,
        jsonld,
        mediaKind: isVideo ? 'video' : 'photo',
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
    console.error('[crm/photo] error:', err);
    return NextResponse.json(
      {
        error: 'photo_capture_failed',
        message: 'The media could not be processed',
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
