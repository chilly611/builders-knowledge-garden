/**
 * icons — hand-drawn line glyphs for the Dream Machine, in the brass/sepia
 * register the design system calls for. Stroke + size come from the `.ds-ico`
 * CSS class (stroke: currentColor; 1.5px; round caps) so they inherit the
 * surrounding ink color. No emoji in chrome — these replace ✦ ⤢ ↻ ↓ ✕.
 */

type IcoProps = { className?: string };

export function IconExpand({ className = 'ds-ico' }: IcoProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6 3H3v3M13 6V3h-3M10 13h3v-3M3 10v3h3" />
    </svg>
  );
}

export function IconRefresh({ className = 'ds-ico' }: IcoProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M13.2 8a5.2 5.2 0 1 1-1.5-3.7" />
      <path d="M13.5 3v2.6H11" />
    </svg>
  );
}

export function IconDownload({ className = 'ds-ico' }: IcoProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.5v7M5 7l3 3 3-3M3.5 13h9" />
    </svg>
  );
}

export function IconClose({ className = 'ds-ico' }: IcoProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function IconCheck({ className = 'ds-ico' }: IcoProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function IconChevronLeft({ className = 'ds-ico' }: IcoProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10 3L5 8l5 5" />
    </svg>
  );
}

export function IconChevronRight({ className = 'ds-ico' }: IcoProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

/** Small spinning ring shown while photoreal renders are in flight. */
export function StatusRing({ className = 'dstudio-status-ring' }: IcoProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" strokeWidth={2} aria-hidden="true">
      <circle className="r-track" cx="8" cy="8" r="6" />
      <path className="r-arc" d="M8 2a6 6 0 0 1 6 6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * DreamOrrery — the Dream Machine's signature emblem: a brass armature with a
 * warm amber core, echoing `chrome-dream-machine.png`. Decorative; the slow
 * orbit is disabled under prefers-reduced-motion (scoped rule in the CSS).
 */
export function DreamOrrery({ className = 'dstudio-orrery' }: IcoProps) {
  return (
    <svg className={className} viewBox="0 0 60 60" aria-hidden="true">
      <g className="o-spin">
        <circle className="o-ring" cx="30" cy="30" r="26" />
        <ellipse className="o-ring o-ring-2" cx="30" cy="30" rx="26" ry="9" />
        <ellipse className="o-ring o-ring-2" cx="30" cy="30" rx="9" ry="26" />
        <circle className="o-node" cx="56" cy="30" r="1.7" />
        <circle className="o-node" cx="30" cy="4" r="1.7" />
      </g>
      <circle className="o-core" cx="30" cy="30" r="5" />
      <line className="o-tick" x1="30" y1="1.5" x2="30" y2="6" />
      <line className="o-tick" x1="30" y1="54" x2="30" y2="58.5" />
      <line className="o-tick" x1="1.5" y1="30" x2="6" y2="30" />
      <line className="o-tick" x1="54" y1="30" x2="58.5" y2="30" />
    </svg>
  );
}
