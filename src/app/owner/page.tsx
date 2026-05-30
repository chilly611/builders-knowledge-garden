/**
 * /owner — the homeowner's lane of the Killer App (server entry).
 *
 * Resolves the fully-serializable `OwnerLaneData` contract from canonical
 * Marin data and hands it to the `OwnerLaneClient` interactive surface. No
 * numbers live in the client — this page is the single wiring point.
 *
 * Sources of truth, and how they reconcile with the design bundle
 * (project/owner-lane/{app,components}.jsx):
 *
 *   • getCanonicalProject() — 7 LOCKED lifecycle stages (Size Up → Reflect),
 *     budget roll-up, build-stage completion. The design prototype's 6
 *     phases (Dream → Grow) are mapped ONTO these 7 (founder-locked
 *     decision #2 — production wins).
 *   • MARIN_OWNER_LENS.pending_approvals[0] — the framing pay-app that drives
 *     "Needs you". PRODUCTION WINS for shared records: amount $48,000 (design
 *     said $48,200) and framer "Ridgeline Framing" (design said "Tahoe
 *     Carpentry Co.").
 *   • MARIN_* constants — name "Modern Farmhouse in Marin" (design "· Marin"),
 *     geometry for the detail line.
 *
 * Owner-facing PRESENTATION values stay design-locked: the three readings
 * (Progress / Schedule / Budget), the "short version" summary, and the
 * journey position (wk 17 of 37). These are the curated owner story.
 *
 *   ⚠ HUMAN-CALL FLAG (schedule): the owner-facing "wk 17 of 37 · ~20 wks to
 *   move-in · a few days ahead" is the design-locked reading. The production
 *   GC schedule (start 2026-03-18, substantial completion 2026-12-04) computes
 *   to a different calendar week. The two have not been reconciled to one
 *   formula; the owner reading is presented as-designed. Flag for founder.
 */

import type { Metadata } from 'next';
import { getCanonicalProject } from '@/lib/projects/getCanonicalProject';
import { KAC_STAGES } from '@/components/killerapp-chrome/types';
import {
  MARIN_PROJECT_NAME,
  MARIN_LOCATION,
  MARIN_BEDROOMS,
  MARIN_BATHROOMS,
  MARIN_SQFT_DISPLAY,
  MARIN_OWNER_LENS,
  MARIN_TEAM,
} from '@/lib/seed-data/marin-farmhouse';
import OwnerLaneClient, {
  type OwnerLaneData,
  type OwnerStage,
} from './OwnerLaneClient';

export const metadata: Metadata = {
  title: 'Owner · Modern Farmhouse in Marin',
  description:
    'Where your build stands — the same gauges your builder reads, in plain words, just for you.',
};

// Owner-facing compact money labels. These match the app-wide canonical
// rounding ($1.15M remaining of the $1.65M contract) used by the budget
// ribbon and attention items — NOT Intl compact, which would round
// 1,151,400 up to "$1.2M" and disagree with the rest of the app.
const BUDGET_LEFT_LABEL = '$1.15M';
const BUDGET_TOTAL_LABEL = '$1.65M';

// Per-stage owner presentation, keyed by the production lifecycle slug.
// `icon` selects a botanical-instrument mark in OwnerLaneClient's STAGE_ICO;
// `plain` is the plain-language journey sublabel (the design's `.jplain`).
// Both are design-locked owner copy, mapped onto the 7 LOCKED slugs.
const STAGE_PRESENTATION: Record<string, { icon: string; plain: string }> = {
  'size-up': { icon: 'calipers', plain: 'Scoping' },
  lock: { icon: 'seal', plain: 'Scope & budget set' },
  plan: { icon: 'blueprint', plain: 'Planning' },
  build: { icon: 'square', plain: 'Building' },
  adapt: { icon: 'wrench', plain: 'Changes' },
  collect: { icon: 'ledger', plain: 'Payments & closeout' },
  reflect: { icon: 'leaf', plain: 'Wrap-up' },
};

function buildOwnerLaneData(): OwnerLaneData {
  const project = getCanonicalProject();

  // The design's active phase is Build; map money + journey state by
  // position relative to it across the 7 locked stages.
  const currentIndex = project.stages.findIndex((s) => s.slug === 'build');
  const buildPct = project.stages[currentIndex]?.completion ?? 42;
  const shortBySlug = new Map(KAC_STAGES.map((s) => [s.slug, s.short]));

  // Framing pay-app — production canon ($48,000 → Ridgeline Framing).
  const payApproval = MARIN_OWNER_LENS.pending_approvals[0];
  const payAmount = payApproval.amount ?? 48_000;
  const payLabel = `$${(payAmount / 1000).toFixed(1).replace(/\.0$/, '')}K`; // $48K
  const usd0 = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  const amountLabel = usd0.format(payAmount); // $48,000
  const framer =
    MARIN_TEAM.find((m) => m.id === payApproval.routes_to)?.name ?? 'Ridgeline Framing';
  const pctOfRemaining = Math.round((payAmount / project.budget.remaining) * 100); // 4

  const stages: OwnerStage[] = project.stages.map((s, i) => {
    const money: OwnerStage['money'] =
      i < currentIndex ? 'paid' : i === currentIndex ? 'now' : 'soon';
    const status: OwnerStage['status'] =
      i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming';
    const present = STAGE_PRESENTATION[s.slug] ?? { icon: 'square', plain: '' };
    return {
      slug: s.slug,
      label: shortBySlug.get(s.slug) ?? s.slug,
      n: String(s.id).padStart(2, '0'),
      icon: present.icon,
      plain: present.plain,
      money,
      status,
      ...(money === 'now' ? { payLabel } : {}),
    };
  });

  return {
    projectName: MARIN_PROJECT_NAME,
    ownerGreeting: 'Cody & Sara',
    detailMono: `${MARIN_LOCATION} · ${MARIN_BEDROOMS} BR · ${MARIN_BATHROOMS} BA · ${MARIN_SQFT_DISPLAY} sqft custom modern farmhouse`,
    logoSrc: '/owner-lane/bkg-logo.mp4',
    heroImg: '/owner-lane/structural-journey.jpeg',

    stages,
    buildPct,
    weekOf: 17,
    weeksTotal: 37,
    budgetLeftLabel: BUDGET_LEFT_LABEL,
    budgetTotalLabel: BUDGET_TOTAL_LABEL,
    // Numeric remaining ($1,151,400) drives the strip's count-up; it formats
    // to the same "$1.15M" as BUDGET_LEFT_LABEL at two decimals.
    budgetLeftValue: project.budget.remaining,
    jscrubLabel: 'wk 17',

    // Design-locked owner readings. Accents are the resolved hex of the
    // herbarium tokens (sage / teal / brass) — the SVG gauge needs a literal.
    readings: [
      {
        key: 'progress',
        label: 'PROGRESS',
        question: 'How far along?',
        value: 0.42,
        accent: '#5E7A56', // --specimen-sage
        read: '42%',
        big: '42%',
        caption: 'through the build',
        note: 'On track',
        noteTone: 'good',
      },
      {
        key: 'schedule',
        label: 'SCHEDULE',
        question: 'On time?',
        value: 0.72,
        accent: '#3C7A8A', // --specimen-teal
        read: '~20 wks',
        big: '~20 wks',
        caption: 'to move-in',
        note: 'A few days ahead',
        noteTone: 'good',
      },
      {
        key: 'budget',
        label: 'BUDGET',
        question: "How's the money?",
        value: 0.697,
        accent: '#B08D5C', // --specimen-brass
        read: '$1.15M',
        big: '$1.15M',
        caption: 'of $1.65M left',
        note: 'Within budget',
        noteTone: 'good',
      },
    ],

    summaryLeadBefore: 'Your home is in the ',
    summaryStageLabel: 'Build',
    summaryLeadAfter:
      " stage — both floors are framed and the framing inspection just passed. You're 42% through the build and tracking a few days ahead, with $1.15M of your $1.65M budget left. The one thing waiting on you is the framing payment above.",
    summaryStats: [
      { num: '42%', lab: 'through the build' },
      { num: '~20 wks', lab: 'to move-in' },
      { num: '$1.15M', lab: 'of $1.65M left' },
    ],

    needsYou: {
      // Production pay app #4 (design prototype showed #3).
      plate: 'PLATE NO. 0042 · BUILD · PAY APPLICATION 04',
      amountLabel,
      sub: `Framing labor — ${framer}`,
      framer,
      budgetLeftLabel: BUDGET_LEFT_LABEL,
      pctOfRemaining,
    },

    // Recent field-log entries. Production framer name in the quote.
    entries: [
      {
        plate: '0041',
        date: '2026·05·26',
        title: 'Framing passed inspection',
        meta: 'From your builder · both floors',
        quote: `Inspector signed off Tuesday. ${framer} wrapped both floors — roof and sheathing are next.`,
        tag: 'From your builder',
        tagTone: 'teal',
        thumb: '/owner-lane/structural-journey.jpeg',
      },
      {
        plate: '0040',
        date: '2026·05·22',
        title: 'You asked about the kitchen window',
        meta: 'Your note · answered same day',
        quote:
          'Builder confirmed the wider window still clears the framing — no change to the budget.',
        tag: 'Answered',
        tagTone: 'sage',
        thumb: '/owner-lane/sketch-journey.jpg',
      },
    ],
  };
}

export default function OwnerLanePage() {
  return <OwnerLaneClient data={buildOwnerLaneData()} />;
}
