'use client';

/**
 * SpecimenPlate — the herbarium content card.
 * ============================================
 *
 * SHARED Section-A primitive. The Builder lane uses it for B4 field-log plates;
 * any surface can use it for a titled, dated specimen with an optional engraved
 * quote + script caption. Ported from the design-system kit's `SpecimenCard`,
 * tokens-only (no hard-coded hex, no #E8443A).
 *
 * `tag` renders a small engraved chip; `tagTone` follows the flag palette
 * (rust / sage / amber / teal). The italic `quote` uses the editorial serif
 * (Cormorant Garamond when the surface scopes it); the `caption` uses the
 * script face.
 */

import type { ReactNode } from 'react';
import './specimen.css';

export type SpecimenTone = 'rust' | 'sage' | 'amber' | 'teal';

export interface SpecimenPlateProps {
  /** Plate number, e.g. "014" — the engraved catalog index. */
  plate?: string;
  /** Stage / phase label, e.g. "BUILD". */
  phase?: string;
  /** Date string for the plate header. */
  date?: string;
  title: string;
  /** Secondary line under the title (author, location, …). */
  meta?: string;
  /** Engraved italic pull-quote (rendered in serif, wrapped in quotes). */
  quote?: string;
  /** Script-face caption beneath the body. */
  caption?: string;
  /** Engraved chip text, e.g. "FLAGGED". */
  tag?: string;
  tagTone?: SpecimenTone;
  children?: ReactNode;
  onClick?: () => void;
}

export default function SpecimenPlate({
  plate,
  phase,
  date,
  title,
  meta,
  quote,
  caption,
  tag,
  tagTone = 'rust',
  children,
  onClick,
}: SpecimenPlateProps) {
  const head = [plate ? `PLATE NO. ${plate}` : null, phase, date].filter(Boolean).join(' · ');
  const clickable = !!onClick;
  return (
    <article
      className={`specimen${clickable ? ' is-clickable' : ''}`}
      onClick={onClick}
      {...(clickable
        ? {
            role: 'button',
            tabIndex: 0,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            },
          }
        : {})}
    >
      <header className="specimen-head">
        <span className="eng-label">{head || ' '}</span>
        {tag && <span className={`specimen-tag tone-${tagTone}`}>{tag}</span>}
      </header>
      <h3 className="specimen-title">{title}</h3>
      {meta && <div className="specimen-meta">{meta}</div>}
      {quote && <p className="specimen-quote">&ldquo;{quote}&rdquo;</p>}
      {children}
      {caption && <div className="plate-caption specimen-caption">{caption}</div>}
    </article>
  );
}
