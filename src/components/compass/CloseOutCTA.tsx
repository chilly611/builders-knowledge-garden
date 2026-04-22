'use client';

/**
 * CloseOutCTA
 * ===========
 * Deep Orange button that only renders when stageProgress[7] === 100.
 * Full-width on mobile.
 */

import type { CSSProperties } from 'react';

interface CloseOutCTAProps {
  projectId: string;
  stage7Progress: number; // 0-100
  onCloseOutClick?: (projectId: string) => void;
}

export default function CloseOutCTA({
  projectId,
  stage7Progress,
  onCloseOutClick,
}: CloseOutCTAProps) {
  // Only render if stage 7 is 100% complete
  if (stage7Progress !== 100) {
    return null;
  }

  const containerStyle: CSSProperties = {
    padding: '24px 24px 32px',
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'center',
  };

  const buttonStyle: CSSProperties = {
    padding: '16px 32px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-archivo)',
    color: 'white',
    backgroundColor: 'var(--orange)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    transition: 'all 200ms ease',
    minWidth: '200px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(217, 100, 46, 0.2)',
  };

  const handleClick = () => {
    onCloseOutClick?.(projectId);
  };

  return (
    <div
      style={containerStyle}
      className="bkg-fade-up bkg-stagger-6"
    >
      <button
        type="button"
        style={buttonStyle}
        onClick={handleClick}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(217, 100, 46, 0.85)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 6px 20px rgba(217, 100, 46, 0.3)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--orange)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 4px 12px rgba(217, 100, 46, 0.2)';
        }}
        aria-label="Close out project and celebrate"
      >
        Celebrate — Close Out Project
      </button>
    </div>
  );
}
