// Builder's Knowledge Garden — RSI OUTBOUND heartbeat (Stage 4a) · CRON ENTRY
// GET /api/v1/cron/rsi-heartbeat        — invoked daily by Vercel Cron (vercel.json)
// POST /api/v1/cron/rsi-heartbeat       — manual trigger ({ "dryRun": true } supported)
//
// Loop 1 "Code & Data Drift Detection": polls the external source registry
// (src/lib/rsi-outbound/sources.ts), writes a run summary to heartbeat_reports,
// and ENQUEUES candidate knowledge-graph updates into improvement_ledger for
// founder review. It never auto-applies a change (Manual RSI Protocol).
//
// Auth: identical contract to the other crons (onboarding-reminders / crm-send
// -flush) — Vercel's `x-vercel-cron: 1` header OR `Authorization: Bearer
// <CRON_SECRET>`. With no CRON_SECRET set (local/dev/preview) any caller is
// allowed so it is curl-able. Missing Supabase config degrades to a 200 skip.
//
// `?dryRun=1` runs the offline, deterministic, no-network path.

import { NextRequest, NextResponse } from 'next/server';
import { runOutboundHeartbeat } from '@/lib/rsi-outbound/heartbeat';
import { isSupabaseConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get('x-vercel-cron') === '1') return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev/preview without a secret — allow curl
  return (req.headers.get('authorization') ?? '') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const dryRun =
    req.nextUrl.searchParams.get('dryRun') === '1' || req.nextUrl.searchParams.get('dry') === '1';

  if (!dryRun && !isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'supabase_not_configured' });
  }
  try {
    const result = await runOutboundHeartbeat({ dryRun, trigger: dryRun ? 'dryrun' : 'cron' });
    return NextResponse.json(result);
  } catch (e) {
    console.error('[rsi-outbound-heartbeat] run failed:', e);
    return NextResponse.json(
      { ok: false, error: 'heartbeat_failed', details: String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  const dryRun = body?.dryRun === true;

  if (!dryRun && !isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'supabase_not_configured' });
  }
  try {
    const result = await runOutboundHeartbeat({ dryRun, trigger: dryRun ? 'dryrun' : 'manual' });
    return NextResponse.json(result);
  } catch (e) {
    console.error('[rsi-outbound-heartbeat] run failed:', e);
    return NextResponse.json(
      { ok: false, error: 'heartbeat_failed', details: String(e) },
      { status: 500 },
    );
  }
}
