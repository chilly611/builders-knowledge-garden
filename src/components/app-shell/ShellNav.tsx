'use client';

/**
 * ShellNav — the persistent bottom-right cluster every Killer App surface
 * shares: the "Ask or tell the garden" magic button + the navigation compass
 * that blooms into a rectangle. Generalized from the Owner Lane PersistentNav;
 * reads the active ShellConfig (lane label, nav items) from context.
 *
 *   [ ● Ask or tell the garden ]   ( ✦ compass )
 *
 * The compass blooms into a navigation panel (config.nav, grouped); the magic
 * button blooms into the multimodal AskTheGarden capture panel.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useShellConfig } from './ShellConfigContext';
import './app-shell.css';
import { AskTheGarden } from './AskTheGarden';
import type { ShellNavItem } from './types';

function CompassRose({ open }: { open: boolean }) {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" style={{ transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 220ms var(--ease-out-paper)' }} aria-hidden="true">
      <circle cx="24" cy="24" r="20" stroke="#234C5A" strokeWidth=".7" opacity=".25" fill="none" />
      <path d="M24 5 L26.5 24 L21.5 24 Z" fill="#234C5A" opacity=".8" />
      <path d="M24 43 L21.5 24 L26.5 24 Z" fill="#A53A2D" opacity=".6" />
      <path d="M5 24 L24 21.5 L24 26.5 Z" fill="#B08D5C" opacity=".6" />
      <path d="M43 24 L24 26.5 L24 21.5 Z" fill="#B08D5C" opacity=".6" />
      <circle cx="24" cy="24" r="3" fill="none" stroke="#234C5A" strokeWidth=".9" />
      <circle cx="24" cy="24" r="1.3" fill="#A53A2D" />
    </svg>
  );
}

export function ShellNav() {
  const config = useShellConfig();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [nav, setNav] = useState(false);
  const [ask, setAsk] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close panels on route change.
  useEffect(() => { setNav(false); setAsk(false); }, [pathname]);

  // Escape + outside-click close whichever panel is open.
  useEffect(() => {
    if (!nav && !ask) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setNav(false); setAsk(false); } };
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) { setNav(false); setAsk(false); }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [nav, ask]);

  const go = useCallback((item: ShellNavItem) => {
    if (!item.href) return;
    const pid = searchParams?.get('project') ?? config.projectId;
    const href = pid ? `${item.href}${item.href.includes('?') ? '&' : '?'}project=${encodeURIComponent(pid)}` : item.href;
    setNav(false);
    router.push(href);
  }, [router, searchParams, config.projectId]);

  // Group nav items in declared order.
  const groups: { title: string | null; items: ShellNavItem[] }[] = [];
  for (const item of config.nav) {
    const title = item.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.title === title) last.items.push(item);
    else groups.push({ title, items: [item] });
  }

  return (
    <div className="bkg-shell" data-shell-mount="nav">
      <div className="pnav" ref={rootRef}>
        {ask && (
          <div className="pnav-panel pnav-ask-panel" role="dialog" aria-label="Ask or tell the garden">
            <div className="pnav-panel-head">
              <span className="eng-label">Ask or tell the garden</span>
              <span className="pnav-lane">{config.laneLabel}</span>
              <button className="pnav-x" aria-label="Close" onClick={() => setAsk(false)}>✕</button>
            </div>
            <AskTheGarden config={config} />
          </div>
        )}

        {nav && (
          <div className="pnav-panel pnav-menu" role="dialog" aria-label="Navigate">
            <div className="pnav-panel-head">
              <span className="eng-label">Navigate</span>
              <span className="pnav-lane">{config.laneLabel} lane</span>
              <button className="pnav-x" aria-label="Close" onClick={() => setNav(false)}>✕</button>
            </div>
            {groups.map((g, gi) => (
              <div key={g.title ?? `g${gi}`}>
                {g.title && <div className="pnav-group">{g.title}</div>}
                {g.items.map((item) => {
                  const here = !!item.href && (pathname === item.href || (pathname?.startsWith(item.href + '/') ?? false));
                  return (
                    <button
                      key={item.id}
                      className="pnav-item"
                      type="button"
                      disabled={!item.href || here}
                      aria-current={here ? 'page' : undefined}
                      onClick={() => go(item)}
                    >
                      <span className="pnav-item-marker" style={item.flag ? { background: 'var(--specimen-rust)' } : undefined} />
                      <span className="pnav-item-txt">
                        <span className="pnav-item-l">{item.label}</span>
                        {item.sub && <span className="pnav-item-s">{item.sub}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div className="pnav-cluster">
          <button className="pnav-ask" type="button" onClick={() => { setAsk((v) => !v); setNav(false); }}>
            <span className="pnav-ask-dot" /> <span className="pnav-ask-label">Ask or tell the garden</span>
          </button>
          <button className="pnav-compass" type="button" aria-label="Navigate" aria-expanded={nav} onClick={() => { setNav((v) => !v); setAsk(false); }}>
            <CompassRose open={nav} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShellNav;
