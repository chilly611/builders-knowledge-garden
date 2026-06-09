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

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { KAC_STAGES } from '@/components/killerapp-chrome/types';
import './app-shell.css';
import { Seal } from './Seal';
import { StageIco } from './icons';
import { STAGE_PLAIN } from './config';
import { useShellConfig } from './ShellConfigContext';
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

  // Stagger the strip cells/glyphs in on mount via the `is-lit` class (the CSS
  // bkgshell-fadeUp keyframe is stripped under prefers-reduced-motion).
  const [lit, setLit] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLit(true), 30); return () => clearTimeout(t); }, []);

  const ai = KAC_STAGES.findIndex((s) => s.slug === journey.activeStage);
  const segW = 100 / KAC_STAGES.length;
  const cur = (ai < 0 ? 0 : ai) * segW + segW * (journey.pct / 100);

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
                return (
                  <div key={c.stage} className={`bcell st-${c.state} ${c.stage === budget.activeStage ? 'is-cur' : ''}`} title={c.stage}>
                    <span className="bcell-ico">{Icon && <Icon />}</span>
                    <span className="bcell-amt">{c.amountLabel}</span>
                    {c.tick && <span className="bcell-tick" />}
                  </div>
                );
              })}
            </div>
            <div className="gstrip-end">
              <div className="gstrip-end-big">{budget.endBig}</div>
              <div className="gstrip-end-sub">{budget.endSub}</div>
            </div>
          </>
        ) : (
          <div className="gstrip-track"><Redacted label="Budget" /></div>
        )}
      </div>

      {/* Journey / time-machine strip */}
      <div className="gstrip gstrip-j">
        <div className="gstrip-lead gstrip-lead-j">
          <span className="eng-label">Journey · time machine</span>
        </div>
        {journey.show ? (
          <>
            <div className="gstrip-track jtrack">
              <div className="jline"><motion.div className="jline-fill" initial={reduce ? false : { width: 0 }} animate={{ width: cur + '%' }} transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }} /></div>
              {KAC_STAGES.map((s, i) => {
                const Icon = StageIco[s.slug];
                return (
                  <div key={s.slug} className={`jnode ${ai > i ? 'is-done' : ''} ${s.slug === journey.activeStage ? 'is-cur' : ''}`}>
                    <span className="jdot" />
                    <span className="jico">{Icon && <Icon />}</span>
                    <span className="jname">{s.short}</span>
                    <span className="jplain">{STAGE_PLAIN[s.slug]}</span>
                  </div>
                );
              })}
              {journey.weeksTotal > 0 && (
                <div className="jscrub" style={{ left: cur + '%' }}><span className="jscrub-flag">wk {journey.weekOf}</span></div>
              )}
            </div>
            <div className="gstrip-end">
              <div className="gstrip-end-big">{journey.pct}%</div>
              <div className="gstrip-end-sub">{journey.weeksTotal > 0 ? `wk ${journey.weekOf} / ${journey.weeksTotal}` : 'in progress'}</div>
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
