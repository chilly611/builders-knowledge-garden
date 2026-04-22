'use client';

/**
 * LegalFooter Component
 *
 * Thin footer with links to legal documents and a disclaimer.
 * Use to mount in src/app/killerapp/layout.tsx or other page layouts.
 *
 * Styling:
 * - Border: uses CSS variable --faded-rule (or --ink as fallback)
 * - Text: uses CSS variable --graphite (or --ink as fallback)
 */

export default function LegalFooter() {
  return (
    <footer
      style={{
        borderTop: `1px solid var(--faded-rule, var(--ink))`,
        padding: '16px 24px',
        marginTop: '48px',
        fontSize: '14px',
        color: 'var(--graphite, var(--ink))',
        backgroundColor: 'var(--paper-white, #fefefe)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <p style={{ margin: 0, flex: 1, minWidth: '300px' }}>
          Builder's Knowledge Garden provides advisory content, not legal or engineering counsel. Always review with licensed professionals in your jurisdiction.
        </p>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <a
            href="/legal/terms"
            style={{
              color: 'var(--graphite, var(--ink))',
              textDecoration: 'none',
              borderBottom: '1px solid transparent',
              transition: 'border-bottom 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLAnchorElement).style.borderBottomColor =
                'var(--graphite, var(--ink))';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLAnchorElement).style.borderBottomColor =
                'transparent';
            }}
          >
            Terms
          </a>
          <a
            href="/legal/privacy"
            style={{
              color: 'var(--graphite, var(--ink))',
              textDecoration: 'none',
              borderBottom: '1px solid transparent',
              transition: 'border-bottom 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLAnchorElement).style.borderBottomColor =
                'var(--graphite, var(--ink))';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLAnchorElement).style.borderBottomColor =
                'transparent';
            }}
          >
            Privacy
          </a>
          <a
            href="/legal/disclaimer"
            style={{
              color: 'var(--graphite, var(--ink))',
              textDecoration: 'none',
              borderBottom: '1px solid transparent',
              transition: 'border-bottom 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLAnchorElement).style.borderBottomColor =
                'var(--graphite, var(--ink))';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLAnchorElement).style.borderBottomColor =
                'transparent';
            }}
          >
            Disclaimer
          </a>
        </div>
      </div>
    </footer>
  );
}
