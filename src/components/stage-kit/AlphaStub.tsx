'use client';

/**
 * AlphaStub — a "WordPress'd" feature: visible and present in the chrome, but
 * honestly labeled "alpha — coming soon" and NOT interactive. The alpha
 * caveat is the point: we never pretend a stub works.
 *
 * `preview` renders a static mockup (a calendar, a canvas, a drone frame)
 * dimmed and pointer-events:none behind the badge, so the shape of the
 * feature reads without implying it's live.
 */

import { type ReactNode } from 'react';
import { colors, fonts } from '@/design-system/tokens';

export default function AlphaStub({
  title,
  description,
  icon,
  preview,
  compact = false,
}: {
  title: string;
  description: string;
  icon?: string;
  preview?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      aria-label={`${title} (alpha, coming soon)`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        borderRadius: 12,
        border: `1.5px dashed ${colors.paper.border}`,
        background:
          'repeating-linear-gradient(45deg, #FBF7EF, #FBF7EF 11px, #F6F0E4 11px, #F6F0E4 22px)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 3,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 9px',
          borderRadius: 999,
          background: colors.amber.main,
          color: colors.navyDeep,
          fontFamily: fonts.body,
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        }}
      >
        <span aria-hidden>✦</span> alpha — coming soon
      </div>

      {preview && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.5,
            pointerEvents: 'none',
            filter: 'grayscale(0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          {preview}
        </div>
      )}

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          marginTop: 'auto',
          padding: compact ? '12px 14px' : '16px 18px',
          background: 'linear-gradient(transparent, rgba(253,248,240,0.85) 28%, rgba(253,248,240,0.96))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <span aria-hidden style={{ fontSize: 18 }}>{icon}</span>}
          <h3 style={{ margin: 0, fontFamily: fonts.display, fontSize: 16, fontWeight: 700, color: colors.navy }}>
            {title}
          </h3>
        </div>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, lineHeight: 1.4, color: colors.graphite, maxWidth: 460 }}>
          {description}
        </p>
      </div>
    </section>
  );
}
