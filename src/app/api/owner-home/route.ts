/**
 * GET /api/owner-home?projectId=…[&preview=1]
 *
 * The single read path for the Owner Lane home. EVERY field returned here is
 * gated by the Lanes × Lenses matrix via `checkLensPermission` — a denied cell
 * is OMITTED from the payload (fail-closed), and the client renders a redacted
 * state in its place. The client never receives data it isn't permitted to see.
 *
 * Data values are read from the Marin seed (src/lib/seed-data/marin-farmhouse.ts)
 * per the MLP brief — this route decides *whether* each cell is visible, not
 * what the numbers are.
 *
 * Dev preview: in non-production builds, `?preview=1` bypasses auth + the Lens
 * and returns everything permitted, so the design can be verified without a
 * seeded membership row. The bypass is compiled out of meaning in production
 * (guarded by NODE_ENV) and never grants access against a real deployment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { checkLensPermission } from '@/lib/lens/check-permission';
import type { DataCategory, LensAction } from '@/lib/lens/types';
import {
  MARIN_PROJECT_NAME,
  MARIN_LOCATION,
  MARIN_BEDROOMS,
  MARIN_BATHROOMS,
  MARIN_SQFT_DISPLAY,
  MARIN_BUDGET_TOTAL,
  MARIN_BUDGET_REMAINING,
  MARIN_OWNER_LENS,
} from '@/lib/seed-data/marin-farmhouse';

// ── Locked display canon (Modern Farmhouse · Marin) ──────────────────────────
const OWNERS = 'Cody & Sara Harwell';
const FRAMER = 'Tahoe Carpentry Co.';
const BUILD_PCT = 42;
const WEEK_OF = 17;
const WEEKS_TOTAL = 37;
const ACTIVE_PHASE = 'build';

const fmtM = (n: number) => '$' + (n / 1_000_000).toFixed(2).replace(/0$/, '') + 'M';

function check(
  userId: string,
  projectId: string,
  dataCategory: DataCategory,
  action: LensAction,
  preview: boolean,
): Promise<boolean> {
  if (preview) return Promise.resolve(true);
  return checkLensPermission({ userId, projectId, dataCategory, action }).then((d) => d === 'permitted');
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const preview = process.env.NODE_ENV !== 'production' && url.searchParams.get('preview') === '1';

  let userId = 'preview-user';
  if (!preview) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    userId = user.id;
  }

  // Resolve every Lens cell the Owner home reads from, in parallel.
  const [ovView, budView, schView, pflView, pflCreate, coView, coApprove] = await Promise.all([
    check(userId, projectId, 'project_overview', 'view', preview),
    check(userId, projectId, 'budget_total', 'view', preview),
    check(userId, projectId, 'schedule', 'view', preview),
    check(userId, projectId, 'photos_field_logs', 'view', preview),
    check(userId, projectId, 'photos_field_logs', 'create', preview),
    check(userId, projectId, 'change_orders', 'view', preview),
    check(userId, projectId, 'change_orders', 'approve', preview),
  ]);

  const budgetLeftLabel = fmtM(MARIN_BUDGET_REMAINING);
  const budgetTotalLabel = fmtM(MARIN_BUDGET_TOTAL);
  const payApp = MARIN_OWNER_LENS.pending_approvals[0]?.amount ?? 48_000;

  // ── Build the payload, omitting any cell the Lens denies ───────────────────
  const overview = ovView
    ? {
        name: MARIN_PROJECT_NAME,
        owners: OWNERS,
        detail: `${MARIN_BEDROOMS} BR · ${MARIN_BATHROOMS} BA · ${MARIN_SQFT_DISPLAY} sqft custom modern farmhouse`,
        location: MARIN_LOCATION,
        greeting: `Good morning, ${OWNERS} — here's your build today.`,
        progressReading: {
          label: 'PROGRESS', question: 'How far along?', value: 0.42, accent: '#5E7A56',
          gaugeRead: `${BUILD_PCT}%`, big: `${BUILD_PCT}%`, caption: 'through the build', note: 'On track', noteTone: 'good' as const,
        },
        summary:
          `Your home is in the Build stage — both floors are framed and the framing inspection just passed. You're ${BUILD_PCT}% through the build and tracking a few days ahead, with ${budgetLeftLabel} of your ${budgetTotalLabel} budget left. The one thing waiting on you is the framing payment above.`,
      }
    : null;

  const budget = budView
    ? {
        budgetLeftLabel,
        budgetTotalLabel,
        payApp,
        reading: {
          label: 'BUDGET', question: "How's the money?", value: MARIN_BUDGET_REMAINING / MARIN_BUDGET_TOTAL, accent: '#B08D5C',
          gaugeRead: budgetLeftLabel, big: budgetLeftLabel, caption: `of ${budgetTotalLabel} left`, note: 'Within budget', noteTone: 'good' as const,
        },
      }
    : null;

  const schedule = schView
    ? {
        buildPct: BUILD_PCT,
        weekOf: WEEK_OF,
        weeksTotal: WEEKS_TOTAL,
        active: ACTIVE_PHASE,
        reading: {
          label: 'SCHEDULE', question: 'On time?', value: 0.72, accent: '#3C7A8A',
          gaugeRead: '~20 wks', big: '~20 wks', caption: 'to move-in', note: 'A few days ahead', noteTone: 'good' as const,
        },
      }
    : null;

  const needsYou = coView
    ? {
        amount: payApp,
        framer: FRAMER,
        budgetLeft: MARIN_BUDGET_REMAINING,
        budgetLeftLabel,
        canApprove: coApprove,
      }
    : null;

  const entries = pflView
    ? [
        {
          plate: '0041', date: '2026·05·26', title: 'Framing passed inspection', meta: 'From your builder · both floors',
          quote: 'Inspector signed off Tuesday. Tahoe Carpentry wrapped both floors — roof and sheathing are next.',
          tag: 'From your builder', tagTone: 'teal', thumb: '/owner-lane/structural-journey.jpeg',
        },
        {
          plate: '0040', date: '2026·05·22', title: 'You asked about the kitchen window', meta: 'Your note · answered same day',
          quote: 'Builder confirmed the wider window still clears the framing — no change to the budget.',
          tag: 'Answered', tagTone: 'sage', thumb: '/owner-lane/sketch-journey.jpg',
        },
      ]
    : null;

  return NextResponse.json({
    preview,
    permissions: {
      project_overview: ovView,
      budget_total: budView,
      schedule: schView,
      photos_field_logs_view: pflView,
      photos_field_logs_create: pflCreate,
      change_orders_view: coView,
      change_orders_approve: coApprove,
    },
    overview,
    budget,
    schedule,
    needsYou,
    entries,
    canContribute: pflCreate,
  });
}
