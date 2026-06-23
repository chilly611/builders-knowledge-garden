// Capture endpoint — voice field reports + jobsite photos → structured records that
// land in the right category and (when they're expenses) move the ledger. Bulk-first:
// the body is an ARRAY; many captures (an offline-queue flush, a day's photos) are the
// normal case, not the exception.
//
// Two phases on purpose:
//   1. STRUCTURE — parallel + bounded (transcription/vision are the slow part).
//   2. PERSIST   — sequential per project (the ledger cache recompute would race under
//      concurrent posts to one project). Each item's outcome is independent: one bad
//      capture is marked 'failed' and the rest still land.
// The AI lives behind getStructurer() (src/lib/capture/structurer.ts) — swap models there.
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';
import { assertProjectWriteAccess } from '@/lib/auth/projectOwnership';
import {
  getStructurer, isSupportedKind, isRoadmapKind, CaptureError, type StructuredRecord,
} from '@/lib/capture/structurer';

const MAX_BATCH = 100;
const STRUCTURE_CONCURRENCY = 6;

interface CaptureDescriptor {
  kind: string;
  storage_url?: string;
  transcript?: string;
  image_base64?: string;
  mime_type?: string;
  client_ref?: string;
}

async function mapBounded<T, R>(items: T[], n: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id: projectId } = await params;
  const access = await assertProjectWriteAccess(request, projectId, user.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: { captures?: CaptureDescriptor[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const captures = body?.captures;
  if (!Array.isArray(captures) || captures.length === 0) {
    return NextResponse.json({ error: 'captures[] required (bulk array)' }, { status: 400 });
  }
  if (captures.length > MAX_BATCH) {
    return NextResponse.json({ error: `batch too large (max ${MAX_BATCH})` }, { status: 413 });
  }

  const nowISO = new Date().toISOString();
  const structurer = await getStructurer();

  // ── Phase 1: structure (parallel, bounded) — failures captured per item, never thrown.
  type Mid = {
    d: CaptureDescriptor; kind: string;
    structured?: StructuredRecord; transcript?: string; error?: string; unsupported?: boolean;
  };
  const mids = await mapBounded<CaptureDescriptor, Mid>(captures, STRUCTURE_CONCURRENCY, async (d) => {
    const kind = String(d.kind ?? '');
    if (isRoadmapKind(kind)) return { d, kind, unsupported: true };
    if (!isSupportedKind(kind)) return { d, kind, error: `unknown capture kind "${kind}"` };
    try {
      let transcript = d.transcript;
      if (kind === 'voice' && !transcript) {
        transcript = (await structurer.transcribe({ storageUrl: d.storage_url, mimeType: d.mime_type })).transcript;
      }
      const structured = await structurer.structure({
        kind,
        transcript,
        imageUrl: kind === 'photo' ? d.storage_url : undefined,
        imageBase64: kind === 'photo' ? d.image_base64 : undefined,
        mimeType: d.mime_type,
        nowISO,
      });
      return { d, kind, structured, transcript };
    } catch (e) {
      return { d, kind, error: e instanceof CaptureError ? e.message : 'structuring failed' };
    }
  });

  // ── Phase 2: persist (sequential) — one capture's failure does not abort the batch.
  const sb = getServiceClient();
  const results: Array<Record<string, unknown>> = [];
  for (const m of mids) {
    const base = { client_ref: m.d.client_ref ?? null, kind: m.kind };
    if (m.error) {
      results.push({ ...base, status: 'failed', error: m.error });
      continue;
    }
    const isRoadmap = m.unsupported === true;
    const s = m.structured;
    const { data, error } = await sb.rpc('oneloop_ingest_capture', {
      p_project: projectId,
      p_kind: m.kind,
      p_storage_url: m.d.storage_url ?? null,
      p_transcript: m.transcript ?? null,
      p_category: isRoadmap ? 'note' : s!.category,
      p_cost_code: isRoadmap ? null : s!.cost_code,
      p_amount: isRoadmap ? null : s!.amount,
      p_vendor: isRoadmap ? null : s!.vendor,
      p_summary: isRoadmap ? `${m.kind} capture (auto-structuring not yet supported)` : s!.summary,
      p_occurred_on: isRoadmap ? null : s!.occurred_on,
      p_confidence: isRoadmap ? 0 : s!.confidence,
      p_actor: user.id,
      p_client_ref: m.d.client_ref ?? null,
      p_model: isRoadmap ? 'none' : s!.model,
      p_mime_type: m.d.mime_type ?? null,
    });
    if (error) {
      results.push({ ...base, status: 'failed', error: error.message });
      continue;
    }
    results.push({
      ...base,
      status: data.status,
      capture_id: data.capture_id,
      category: isRoadmap ? null : s!.category,
      structured: isRoadmap ? null : s,
      financials: data.financials ?? null,
      idempotent: data.idempotent ?? false,
    });
  }

  const count = (st: string) => results.filter((r) => r.status === st).length;
  return NextResponse.json({
    ok: true,
    summary: {
      total: results.length,
      posted: count('posted'),
      structured: count('structured'),
      unsupported: count('unsupported'),
      failed: count('failed'),
    },
    results,
  });
}
