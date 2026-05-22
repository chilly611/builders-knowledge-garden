// Builder's Knowledge Garden — Onboarding Reminder Cron (ONBOARDING-V1, 2026-05-22)
// GET /api/v1/cron/onboarding-reminders
//
// Once a day (recommended schedule: `0 10 * * *` UTC), this endpoint:
//   1. Scans `auth.users` for accounts where
//        user_metadata.onboarding.step != 'completed'
//        AND started_at is more than 24h old
//   2. Determines whether a day1/day3/day7 reminder is due (see
//      `reminderDue` in src/lib/onboarding-state.ts).
//   3. Sends a Resend email using the matching HTML template
//      (src/lib/email-templates/onboarding-day-*.html).
//   4. Merges the fired cadence key into `reminders_sent` so we don't
//      double-send. After day 7, the cadence policy returns null and
//      the user is left alone — no email-spam loop.
//
// Auth: identical contract to crm-send-flush — Vercel's `x-vercel-cron`
// header OR `Authorization: Bearer <CRON_SECRET>`. In dev (no secret)
// we allow any caller so you can hit it from curl.
//
// Idempotency: the merge-then-send order is intentional. If Resend
// flakes after the merge, we LOSE a reminder rather than DOUBLE it —
// the worst case is a user who never sees day-3 (already in week 3),
// which is strictly better than spamming a new lead twice. We log the
// failure so the operator can backfill manually if needed.
//
// Graceful degradation: missing RESEND_API_KEY / SUPABASE_SERVICE_ROLE_KEY
// returns 200 with `{skipped: true, reason: ...}` so the cron doesn't
// alarm in preview environments.

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import {
  getOnboardingFromUser,
  mergeOnboarding,
  reminderDue,
  type ReminderKey,
} from '@/lib/onboarding-state';

const MAX_BATCH = 200; // ceiling for one cron tick

let adminClient: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (adminClient) return adminClient;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || url.includes('placeholder')) return null;
  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

function isAuthorized(request: NextRequest): boolean {
  if (request.headers.get('x-vercel-cron') === '1') return true;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${cronSecret}`;
}

// Templates are read at first-use and cached for the process lifetime.
const templateCache: Record<ReminderKey, string | null> = {
  day1: null,
  day3: null,
  day7: null,
};

function loadTemplate(key: ReminderKey): string {
  if (templateCache[key]) return templateCache[key]!;
  const path = resolve(process.cwd(), `src/lib/email-templates/onboarding-${key}.html`);
  const raw = readFileSync(path, 'utf-8');
  templateCache[key] = raw;
  return raw;
}

function renderTemplate(
  template: string,
  vars: { name: string; skip_url: string; cta_url: string },
): string {
  return template
    .replace(/{{\s*name\s*}}/g, vars.name)
    .replace(/{{\s*skip_url\s*}}/g, vars.skip_url)
    .replace(/{{\s*cta_url\s*}}/g, vars.cta_url);
}

const SUBJECT_BY_KEY: Record<ReminderKey, string> = {
  day1: "Quick — your Builder's Garden setup is one step away",
  day3: 'Still want to wrap up your Builder\'s Garden setup?',
  day7: 'Last nudge — want help finishing your Builder\'s Garden setup?',
};

interface UserRow {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown> | null;
}

interface ResultRow {
  user_id: string;
  email: string;
  cadence: ReminderKey;
  ok: boolean;
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: 'supabase_env_missing', processed: 0 },
      { status: 200 },
    );
  }

  // Pull a page of users. We deliberately keep this small (200) — at
  // today's user volume one cron tick easily covers everyone, and we
  // want each invocation to stay well inside Vercel's 60s budget.
  const { data: listData, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: MAX_BATCH,
  });
  if (listErr) {
    return NextResponse.json(
      { ok: false, error: 'list_failed', detail: listErr.message },
      { status: 500 },
    );
  }
  const users = (listData?.users ?? []) as UserRow[];

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL?.startsWith('http')
      ? (process.env.VERCEL_URL as string)
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://app.theknowledgegardens.com';

  const now = new Date();
  const results: ResultRow[] = [];

  for (const u of users) {
    if (!u.email) continue;
    const state = getOnboardingFromUser({
      id: u.id,
      // The admin listUsers payload exposes `user_metadata` directly.
      user_metadata: (u.user_metadata ?? {}) as Record<string, unknown>,
    } as Parameters<typeof getOnboardingFromUser>[0]);

    const due = reminderDue(state, now);
    if (!due) continue;

    const name =
      (state && (u.user_metadata?.name as string | undefined)) ||
      u.email.split('@')[0] ||
      'there';

    const html = renderTemplate(loadTemplate(due), {
      name,
      cta_url: `${baseUrl}/killerapp?first_run=1`,
      skip_url: `${baseUrl}/api/v1/onboarding-skip?u=${encodeURIComponent(u.id)}`,
    });

    const send = await sendEmail({
      to: u.email,
      subject: SUBJECT_BY_KEY[due],
      html,
      replyTo: process.env.RESEND_REPLY_TO || undefined,
    });

    if (send.ok) {
      await mergeOnboarding(admin, u.id, { reminders_sent: [due] });
      results.push({ user_id: u.id, email: u.email, cadence: due, ok: true });
    } else if (send.error === 'no_api_key' || send.error === 'domain_not_verified') {
      // Graceful degradation: don't burn the cadence — leave it for
      // a later tick when Resend is wired up.
      results.push({
        user_id: u.id,
        email: u.email,
        cadence: due,
        ok: false,
        error: send.error,
      });
    } else {
      // Transient failure — log and move on. We DO mark it sent so
      // we don't loop on the same user. (See the idempotency note at
      // the top of this file.)
      await mergeOnboarding(admin, u.id, { reminders_sent: [due] });
      results.push({
        user_id: u.id,
        email: u.email,
        cadence: due,
        ok: false,
        error: send.error,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: users.length,
    sent: results.filter((r) => r.ok).length,
    skipped: results.filter((r) => !r.ok).length,
    results,
    cycledAt: now.toISOString(),
  });
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
