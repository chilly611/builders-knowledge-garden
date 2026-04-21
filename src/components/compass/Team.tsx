'use client';

/**
 * Team
 * ====
 * 4-row treatment with name (graphite), role (brass small-caps), trade label,
 * and verified glyph (Robin's Egg checkmark) if verified: true.
 */

import type { CSSProperties } from 'react';

interface TeamMember {
  name: string;
  role: string;
  trade: string;
  verified: boolean;
}

interface TeamProps {
  members: TeamMember[];
}

const TRADE_LABELS: Record<string, string> = {
  gc: 'General Contractor',
  framing: 'Framing',
  hvac: 'HVAC',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  concrete: 'Concrete',
  roofing: 'Roofing',
};

export default function Team({ members }: TeamProps) {
  if (!members || members.length === 0) return null;

  const display = members.slice(0, 4);

  const containerStyle: CSSProperties = {
    padding: '0 24px 32px',
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const titleStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--brass)',
    fontFamily: 'var(--font-archivo)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '16px',
  };

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
  };

  const getTradeName = (trade: string): string => {
    return TRADE_LABELS[trade] || trade;
  };

  return (
    <div style={containerStyle} className="bkg-fade-up bkg-stagger-5">
      <div style={titleStyle}>Team</div>
      <div style={gridStyle}>
        {display.map((member) => {
          const itemStyle: CSSProperties = {
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '12px',
            borderRadius: '4px',
            border: '1px solid var(--faded-rule)',
            backgroundColor: 'transparent',
          };

          const nameStyle: CSSProperties = {
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--graphite)',
            fontFamily: 'var(--font-archivo)',
            lineHeight: 1.2,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          };

          const roleStyle: CSSProperties = {
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--brass)',
            fontFamily: 'var(--font-archivo)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            opacity: 0.8,
          };

          const tradeStyle: CSSProperties = {
            fontSize: '12px',
            color: 'var(--graphite)',
            fontFamily: 'var(--font-archivo)',
            opacity: 0.7,
            fontWeight: 500,
          };

          const checkmarkStyle: CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            backgroundColor: 'var(--robin)',
            borderRadius: '3px',
            color: 'white',
            fontSize: '10px',
            fontWeight: 700,
            flexShrink: 0,
          };

          return (
            <div key={`${member.name}-${member.trade}`} style={itemStyle}>
              <div style={nameStyle}>
                {member.name}
                {member.verified && <div style={checkmarkStyle}>✓</div>}
              </div>
              <div style={roleStyle}>{member.role}</div>
              <div style={tradeStyle}>{getTradeName(member.trade)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
