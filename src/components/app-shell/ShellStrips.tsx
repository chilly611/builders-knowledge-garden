'use client';

/**
 * ShellStrips — the persistent top chrome: a budget strip and a journey /
 * time-machine strip, generalized from the proven Owner Lane `GlobalStrips`.
 *
 *   Row 1 — Seal · {project name + lane kicker} · 7 budget cells · end figure
 *   Row 2 — "Journey · time machine" · 7 locked stage nodes · % + week-of
 *
 * Reads a ShellConfig (lane/project/budget/journey). The Owner surface passes
 * a lens-gated config via the `config` prop; every other surface reads the
 * default from ShellConfigContext. The 7 stages are the LOCKED canon
 * (KAC_STAGES): Size Up → Lock → Plan → Build → Adapt → Collect → Reflect.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { KAC_STAGES } from '@/components/killerapp-chrome/types';
import { useBudgetDna } from '@/lib/budget-dna';
import './app-shell.css';
import { Seal } from './Seal';
import { StageIco } from './icons';
import { STAGE_PLAIN } from './config';
import { useShellConfig } from './ShellConfigContext';
import { BudgetDnaRibbon } from './BudgetDnaRibbon';
import { useTimeMachine } from './useTimeMachine';
import type { ShellConfig } from './types';

function Redacted({ label }: { label: string }) {
  return (
    <span className="gstrip-redacted">
      <span className="gstrip-redacted-mark">Restricted</span>
      <span className="gstrip-redacted-txt">{label} isn&apos;t shared with your Lens.</span>
    </span>
  );
}

export function ShellStrips({ config }: { config?: ShellConfig }) {
  const ctx = useShellConfig();
  const cfg = config ?? ctx;
  const { budget, journey } = cfg;
  const reduce = useReducedMotion();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Chrome is navigation (2026-06-10): budget cells + end figure go to the
  // budget view; each journey stage goes to its stage page. Only on the
  // context-driven mount (the killerapp layout) — a surface that passes an
  // explicit lens-gated `config` (the Owner home) keeps its static strips,
  // unchanged.
  const interactive = !config;
  const go = useCallback((href: string) => {
    const pid = searchParams?.get('project') ?? cfg.projectId;
    router.push(pid ? `${href}?project=${encodeURIComponent(pid)}` : href);
  }, [router, searchParams, cfg.projectId]);

  // Stagger the strip cells/glyphs in on mount via the `is-lit` class (the CSS
  // bkgshell-fadeUp keyframe is stripped under prefers-reduced-motion).
  const [lit, setLit] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLit(true), 30); return () => clearTimeout(t); }, []);

  const ai = KAC_STAGES.findIndex((s) => s.slug === journey.activeStage);
  const segW = 100 / KAC_STAGES.length;
  const cur = (ai < 0 ? 0 : ai) * segW + segW * (journey.pct / 100);

  // Budget-DNA + the shared time playhead. The ribbon and the journey row share
  // ONE x-axis (project start → substantial completion) and ONE playhead at the
  // cumulative-spend week; scrubbing either strip moves both. Falls back to the
  // stage-progress fill when the ledger has no schedule to time-scale against.
  const dna = useBudgetDna();
  // URL-backed time machine (shared with StageShell via useTimeMachine):
  // Back/Forward rewind & replay the playhead, deep-links/refresh restore it,
  // each deliberate scrub is its own undo/redo step. `dragWeek` is the smooth
  // transient value during a drag; `commitWeek` writes it to `?week` on release.
  const { hasTime, scrubWeek, playWeek, dragWeek, setDragWeek, commitWeek, weekFromClientX } = useTimeMachine(dna);
  const draggedRef = useRef(false);
  const playPct = hasTime ? (playWeek / dna.totalWeeks) * 100 : cur;

  return (
    <div className={`gstrips ${lit ? 'is-lit' : ''}`}>
      {/* Budget strip — seal · identity · project · 7 cells · end figure */}
      <div className="gstrip">
        <div className="gstrip-lead">
          <Seal size={52} />
          <div className="gstrip-lead-txt">
            <div className="gstrip-brand">{cfg.projectName}</div>
            <div className="gstrip-kicker">{cfg.kicker}</div>
          </div>
        </div>
        {budget.show ? (
          <>
            <div className="gstrip-track btrack">
              {budget.cells.map((c) => {
                const Icon = StageIco[c.stage];
                const cls = `bcell st-${c.state} ${c.stage === budget.activeStage ? 'is-cur' : ''}`;
                const body = (
                  <>
                    <span className="bcell-ico">{Icon && <Icon />}</span>
                    <span className="bcell-amt">{c.amountLabel}</span>
                    {c.tick && <span className="bcell-tick" />}
                  </>
                );
                return interactive ? (
                  <button
                    key={c.stage}
                    type="button"
                    className={`${cls} is-nav`}
                    title={c.stage}
                    aria-label={`${c.stage} — open the budget`}
                    onClick={() => go('/killerapp/budget')}
                  >
                    {body}
                  </button>
                ) : (
                  <div key={c.stage} className={cls} title={c.stage}>{body}</div>
                );
              })}
            </div>
            {interactive ? (
              <button
                type="button"
                className="gstrip-end is-nav"
                aria-label={`${budget.endBig} ${budget.endSub} — open the budget`}
                onClick={() => go('/killerapp/budget')}
              >
                <div className="gstrip-end-big">{budget.endBig}</div>
                <div className="gstrip-end-sub">{budget.endSub}</div>
              </button>
            ) : (
              <div className="gstrip-end">
                <div className="gstrip-end-big">{budget.endBig}</div>
                <div className="gstrip-end-sub">{budget.endSub}</div>
              </div>
            )}
          </>
        ) : (
          <div className="gstrip-track"><Redacted label="Budget" /></div>
        )}
      </div>

      {/* Budget-DNA ribbon — stacked cost streamgraph sharing the journey x-axis */}
      {budget.show && (
        <BudgetDnaRibbon dna={dna} scrubWeek={scrubWeek} onScrubMove={setDragWeek} onScrubCommit={commitWeek} interactive={interactive} />
      )}

      {/* Journey / time-machine strip */}
      <div className="gstrip gstrip-j">
        <div className="gstrip-lead gstrip-lead-j">
          <span className="eng-label">Journey · time machine</span>
        </div>
        {journey.show ? (
          <>
            <div className="gstrip-track jtrack">
              <div className="jline"><motion.div className="jline-fill" initial={reduce ? false : { width: 0 }} animate={{ width: cur + '%' }} transition={reduce ? { duration: 0 } : { duration: 0.9, delay: 0.15, ease: 'easeOut' }} /></div>
              {KAC_STAGES.map((s, i) => {
                const Icon = StageIco[s.slug];
                const cls = `jnode ${ai > i ? 'is-done' : ''} ${s.slug === journey.activeStage ? 'is-cur' : ''}`;
                const body = (
                  <>
                    <span className="jdot" />
                    <span className="jico">{Icon && <Icon />}</span>
                    <span className="jname">{s.short}</span>
                    <span className="jplain">{STAGE_PLAIN[s.slug]}</span>
                  </>
                );
                return interactive ? (
                  <button
                    key={s.slug}
                    type="button"
                    className={`${cls} is-nav`}
                    aria-label={`${s.short} — go to this stage`}
                    aria-current={s.slug === journey.activeStage ? 'page' : undefined}
                    onClick={() => go(`/killerapp/stages/${s.slug}`)}
                  >
                    {body}
                  </button>
                ) : (
                  <div key={s.slug} className={cls}>{body}</div>
                );
              })}
              {hasTime && (
                <div
                  className="jscrub"
                  style={{ left: playPct + '%' }}
                  onPointerDown={interactive ? (e) => { draggedRef.current = false; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } : undefined}
                  onPointerMove={interactive ? (e) => { if (e.buttons === 1) { draggedRef.current = true; const tr = (e.currentTarget as HTMLElement).closest('.jtrack'); if (tr) setDragWeek(weekFromClientX(e.clientX, (tr as HTMLElement).getBoundingClientRect())); } } : undefined}
                  onPointerUp={interactive ? () => { if (draggedRef.current) { draggedRef.current = false; commitWeek(dragWeek); } } : undefined}
                >
                  <button
                    type="button"
                    className={`jscrub-flag${scrubWeek != null ? ' is-scrubbed' : ''}`}
                    onClick={interactive ? () => { if (draggedRef.current) { draggedRef.current = false; return; } commitWeek(null); } : undefined}
                    title={scrubWeek != null ? 'Return to live' : 'Schedule week — drag to time-travel'}
                  >wk {playWeek}</button>
                </div>
              )}
            </div>
            <div className="gstrip-end">
              <div className="gstrip-end-big">{journey.pct}%</div>
              <div className="gstrip-end-sub">{hasTime ? `wk ${playWeek} / ${dna.totalWeeks}` : (journey.weeksTotal > 0 ? `wk ${journey.weekOf} / ${journey.weeksTotal}` : 'in progress')}</div>
            </div>
          </>
        ) : (
          <div className="gstrip-track"><Redacted label="Schedule" /></div>
        )}
      </div>
    </div>
  );
}

export default ShellStrips;
