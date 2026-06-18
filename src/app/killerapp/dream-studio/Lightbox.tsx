'use client';

/**
 * Lightbox — full-frame, navigable image viewer for the Dream Machine.
 * ====================================================================
 *
 * Shared by the CONCEPTS grid and the BLUEPRINT gallery: click any image →
 * full screen; ‹ › / ←→ keys / swipe-friendly buttons navigate the set; Esc or
 * a backdrop click closes. The scrim is a deep ink wash (a scrim over imagery
 * for legibility — explicitly allowed by the herbarium lock, like the Dream
 * Studio OVERLAY — NOT a page background), so it reads on-brand, never pure
 * black. Reduced-motion honored in dream-studio.css.
 *
 * `action` (optional) renders a CTA on the caption — used by CONCEPTS for
 * "Choose this concept →".
 */

import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconClose, IconChevronLeft, IconChevronRight } from './icons';

export interface LightboxItem {
  src: string;
  label: string;
}

interface LightboxProps {
  items: LightboxItem[];
  /** Active index, or null when closed. */
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
  action?: { label: string; onActivate: (i: number) => void };
}

export function Lightbox({ items, index, onIndex, onClose, action }: LightboxProps) {
  const open = index !== null && index >= 0 && index < items.length;

  const go = useCallback(
    (delta: number) => {
      if (index === null || items.length === 0) return;
      onIndex((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndex],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    // lock background scroll while open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, go, onClose]);

  if (!open || typeof document === 'undefined') return null;
  const item = items[index!];
  const many = items.length > 1;

  // Portal to <body> so `position: fixed` anchors to the viewport, not to any
  // transformed shell ancestor (which would capture a fixed child).
  return createPortal(
    <div className="dstudio-lb" role="dialog" aria-modal="true" aria-label={`${item.label} — full frame`} onClick={onClose}>
      <button className="dstudio-lb-x" type="button" aria-label="Close" onClick={onClose}><IconClose /></button>
      {many && (
        <button
          className="dstudio-lb-nav dstudio-lb-prev"
          type="button"
          aria-label="Previous"
          onClick={(e) => { e.stopPropagation(); go(-1); }}
        ><IconChevronLeft /></button>
      )}
      <figure className="dstudio-lb-fig" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element -- render URL or SVG data-URI */}
        <img src={item.src} alt={item.label} />
        <figcaption className="dstudio-lb-cap">
          <span className="eng-label">{item.label}{many ? ` · ${index! + 1} / ${items.length}` : ''}</span>
          {action && (
            <button className="dstudio-btn dstudio-btn-go" type="button" onClick={() => action.onActivate(index!)}>
              {action.label}
            </button>
          )}
        </figcaption>
      </figure>
      {many && (
        <button
          className="dstudio-lb-nav dstudio-lb-next"
          type="button"
          aria-label="Next"
          onClick={(e) => { e.stopPropagation(); go(1); }}
        ><IconChevronRight /></button>
      )}
    </div>,
    document.body,
  );
}

export default Lightbox;
