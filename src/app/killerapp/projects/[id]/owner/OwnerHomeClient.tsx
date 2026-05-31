'use client';

/**
 * Owner Lane home — composition layer.
 *
 * Faithful port of the design export's desktop `OwnerView`
 * (owner-lane/app.jsx), re-voiced for the live app:
 *   - All data comes from /api/owner-home, which gates every cell through the
 *     Lens. A denied cell arrives as `null` and renders a redacted state here.
 *   - The demo-wall scaffolding (pinned plate + phone frame + tweak panel) is
 *     dropped; this is the real in-app screen.
 *
 * The GC home (ProjectDashboardClient) is untouched — lane routing happens one
 * level up in LaneRouter.
 */

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import './owner-lane.css';
import {
  OwnerGauge, NeedsYouCard, FieldLog, OwnerEntry, Reveal,
  type Reading, type EntryData,
} from './parts';
import { ShellStrips, Seal, useSetShellConfig, SEAL_SRC, type ShellConfig } from '@/components/app-shell';
import { KAC_STAGES } from '@/components/killerapp-chrome/types';

interface OwnerHomeData {
  preview: boolean;
  overview: { name: string; owners: string; detail: string; location: string; greeting: string; progressReading: Reading; summary: string } | null;
  budget: { budgetLeftLabel: string; budgetTotalLabel: string; payApp: number; reading: Reading } | null;
  schedule: { buildPct: number; weekOf: number; weeksTotal: number; active: string; reading: Reading } | null;
  needsYou: { amount: number; framer: string; budgetLeft: number; budgetLeftLabel: string; canApprove: boolean; approved: boolean } | null;
  entries: EntryData[] | null;
  canContribute: boolean;
}

function Redacted({ what }: { what: string }) {
  return (
    <div className="ov-redacted">
      <span className="ov-redacted-mark">Restricted</span>
      <span className="ov-redacted-txt">{what} isn&apos;t shared with your Lens. Ask your builder if you need access.</span>
    </div>
  );
}

function RedactedGauge({ label }: { label: string }) {
  return (
    <div className="ovg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <span className="ov-redacted-mark">Restricted</span>
      <div className="ovg-q" style={{ marginTop: 8 }}>{label} isn&apos;t shared with you</div>
    </div>
  );
}

// Map the owner's lens-gated /api/owner-home data into a shared-shell config.
// The owner budget cells keep the proven money-state map (Paid · pay-app · Soon)
// and the journey reflects the schedule. Identical numbers to the old GlobalStrips.
function buildOwnerConfig(data: OwnerHomeData | null, projectId: string): ShellConfig {
  const overview = data?.overview ?? null;
  const budget = data?.budget ?? null;
  const schedule = data?.schedule ?? null;
  const active = schedule?.active ?? 'build';
  const MONEY: Record<string, 'paid' | 'now' | 'soon'> = {
    'size-up': 'paid', lock: 'paid', plan: 'paid', build: 'now', adapt: 'soon', collect: 'soon', reflect: 'soon',
  };
  const fmtK = (n: number) => '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  const cells = KAC_STAGES.map((s) => {
    const st = MONEY[s.slug] ?? 'soon';
    return {
      stage: s.slug,
      state: st,
      amountLabel: st === 'paid' ? 'Paid' : st === 'now' ? fmtK(budget?.payApp ?? 0) : 'Soon',
      tick: s.slug === active,
    };
  });
  return {
    laneSlug: 'owner',
    laneLabel: 'Owner',
    kicker: "Builder's Knowledge Garden · Owner",
    projectId,
    projectName: overview?.name ?? 'Your build',
    sealSrc: SEAL_SRC,
    budget: {
      show: !!budget,
      cells,
      activeStage: active,
      endBig: budget?.budgetLeftLabel ?? '—',
      endSub: budget ? `left of ${budget.budgetTotalLabel}` : '',
    },
    journey: {
      show: !!schedule,
      activeStage: active,
      pct: schedule?.buildPct ?? 0,
      weekOf: schedule?.weekOf ?? 0,
      weeksTotal: schedule?.weeksTotal ?? 0,
    },
    nav: [
      { id: 'home', label: 'Your build', sub: 'Where things stand' },
      { id: 'needs', label: 'Needs you', sub: '1 waiting', flag: true },
      { id: 'files', label: 'Photos & files', sub: 'Your field log' },
      { id: 'money', label: 'Money', sub: 'Budget & payments' },
      { id: 'people', label: 'People', sub: 'Builder & crew' },
    ],
    ready: !!data,
  };
}

export default function OwnerHomeClient({ projectId, preview = false }: { projectId: string; preview?: boolean }) {
  const [data, setData] = useState<OwnerHomeData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        const res = await fetch(
          `/api/owner-home?projectId=${encodeURIComponent(projectId)}${preview ? '&preview=1' : ''}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (!res.ok) throw new Error(`owner-home ${res.status}`);
        const json = (await res.json()) as OwnerHomeData;
        if (!cancelled) { setData(json); setStatus('ready'); }
      } catch (err) {
        console.error('[OwnerHome] load failed:', err);
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, preview]);

  // Owner lane owns its chrome: suppress the generic KillerAppChrome (budget +
  // journey ribbon) and the workflow compass FAB that the shared killerapp
  // layout renders, so the herbarium GlobalStrips are the only chrome — faithful
  // to the standalone. Scoped to the owner surface via a body class; the
  // GC/Builder lane is untouched. See owner-lane.css [body.bkg-lane-owner].
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.add('bkg-lane-owner');
    return () => document.body.classList.remove('bkg-lane-owner');
  }, []);

  // Promote the owner's lens-gated data into the shared App Shell so the
  // persistent ShellNav (compass + "Ask or tell the garden") reflects the
  // Owner lane and tags captures to project + lane. The owner renders its OWN
  // ShellStrips below (lens-gated); the layout-level strips are suppressed on
  // this surface via body.bkg-lane-owner.
  const setShell = useSetShellConfig();
  const ownerConfig = useMemo<ShellConfig>(() => buildOwnerConfig(data, projectId), [data, projectId]);
  useEffect(() => {
    if (data) setShell(ownerConfig);
    return () => setShell(null);
  }, [data, ownerConfig, setShell]);

  if (status === 'loading') {
    return <div className="ov-root" style={{ padding: 48, fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--ink-faded)' }}>Loading your build…</div>;
  }
  if (status === 'error' || !data) {
    return <div className="ov-root" style={{ padding: 48, color: 'var(--ink-graphite)' }}>We couldn&apos;t load your build right now. Please try again.</div>;
  }

  const { overview, budget, schedule, needsYou, entries } = data;
  const projectName = overview?.name ?? 'Your build';

  return (
    <div className="ov-root">
      <div className="ov ov-desktop">
        <div className="bkg-shell" data-shell-mount="page">
          <ShellStrips config={ownerConfig} />
        </div>

        <div className="ov-content">
          {/* Greeting */}
          <div className="ov-greetrow">
            {overview ? (
              <>
                <div className="ov-greet">{overview.greeting}</div>
                <div className="ov-greet-mono">{overview.location.toUpperCase()} · {overview.detail.toUpperCase()}</div>
              </>
            ) : (
              <div className="ov-greet">Good morning — here&apos;s your build today.</div>
            )}
          </div>

          {/* Hero */}
          {overview ? (
            <Reveal>
              <header className="ov-hero">
                <div className="ov-hero-img" style={{ backgroundImage: 'url(/owner-lane/structural-journey.jpeg)' }} />
                <div className="ov-hero-tint" />
                <div className="ov-hero-grid" />
                <div className="ov-hero-scrim" />
                <div className="ov-hero-text">
                  <div className="ov-hero-eyebrow">Your build · by the instruments</div>
                  <h1 className="ov-hero-title">Where your build stands</h1>
                  <div className="ov-hero-sub">The same gauges your builder reads — in plain words, just for you.</div>
                </div>
                <div className="ov-hero-seal"><Seal size={76} /></div>
                <div className="ov-hero-cap"><span className="plate-caption">Modern Farmhouse</span></div>
              </header>
            </Reveal>
          ) : (
            <div className="bkg-section"><Redacted what="The project overview" /></div>
          )}

          {/* Needs you */}
          <Reveal delay={0.06}>
            <section className="bkg-section">
              <div className="bkg-section-head"><h2>Needs you</h2><span className="eng-label">1 WAITING · APPROVALS</span></div>
              {needsYou ? (
                <NeedsYouCard amount={needsYou.amount} budgetLeft={needsYou.budgetLeft} budgetLeftLabel={needsYou.budgetLeftLabel} framer={needsYou.framer} canApprove={needsYou.canApprove} approved={needsYou.approved} projectId={projectId} preview={data.preview} />
              ) : (
                <Redacted what="Approvals" />
              )}
            </section>
          </Reveal>

          {/* The big three */}
          <Reveal delay={0.12}>
          <section className="bkg-section">
            <div className="bkg-section-head"><h2>The big three, at a glance</h2><span className="eng-label">MARIN · WK {schedule?.weekOf ?? '—'} OF {schedule?.weeksTotal ?? '—'} · STAGE 04</span></div>
            <div className="ov-gauges">
              {overview ? <OwnerGauge question={overview.progressReading.question} value={overview.progressReading.value} accent={overview.progressReading.accent} read={overview.progressReading.gaugeRead} note={overview.progressReading.note} noteTone={overview.progressReading.noteTone} /> : <RedactedGauge label="Progress" />}
              {schedule ? <OwnerGauge question={schedule.reading.question} value={schedule.reading.value} accent={schedule.reading.accent} read={schedule.reading.gaugeRead} note={schedule.reading.note} noteTone={schedule.reading.noteTone} /> : <RedactedGauge label="Schedule" />}
              {budget ? <OwnerGauge question={budget.reading.question} value={budget.reading.value} accent={budget.reading.accent} read={budget.reading.gaugeRead} note={budget.reading.note} noteTone={budget.reading.noteTone} /> : <RedactedGauge label="Budget" />}
            </div>
          </section>
          </Reveal>

          {/* Plain-language summary */}
          {overview && (
            <section className="bkg-section">
              <div className="ov-summary">
                <div className="ov-summary-lead">
                  <div className="eng-label">THE SHORT VERSION</div>
                  <p>{overview.summary}</p>
                </div>
                <div className="ov-summary-rule" />
                <div className="ov-stat"><div className="ov-stat-num">{overview.progressReading.big}</div><div className="ov-stat-lab">through the build</div></div>
                <div className="ov-stat"><div className="ov-stat-num">{schedule?.reading.big ?? '—'}</div><div className="ov-stat-lab">to move-in</div></div>
                <div className="ov-stat"><div className="ov-stat-num">{budget?.budgetLeftLabel ?? '—'}</div><div className="ov-stat-lab">of {budget?.budgetTotalLabel ?? '—'} left</div></div>
              </div>
            </section>
          )}

          {/* Add to your file */}
          <section className="bkg-section">
            <div className="bkg-section-head"><h2>Add to your file</h2><span className="eng-label">FIELD LOG · GOES TO YOUR BUILDER</span></div>
            <FieldLog projectId={projectId} canCreate={data.canContribute} preview={data.preview} />
          </section>

          {/* Lately on site */}
          <section className="bkg-section">
            <div className="bkg-section-head"><h2>Lately on site</h2><span className="eng-label">2026 · 05 · RECENT</span></div>
            {entries ? (
              <div className="bkg-specimens">{entries.map((e, i) => <OwnerEntry key={i} {...e} />)}</div>
            ) : (
              <Redacted what="Photos & field logs" />
            )}
          </section>

          <div className="bkg-foot-rule" />
          <div className="bkg-foot">
            <span>Builder&apos;s Knowledge Garden · Killer App · Owner lane</span>
            <span>XRWorkers · Knowledge Gardens · 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
