'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// ─── BpButton ───────────────────────────────────────────────────────────────

interface BpButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'cyan' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  size?: 'sm' | 'md' | 'lg';
}

export function BpButton({
  children,
  variant = 'secondary',
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  size = 'md',
}: BpButtonProps) {
  const sizeStyles: React.CSSProperties = {
    sm: { padding: '6px 14px', fontSize: '11px' },
    md: { padding: '10px 20px', fontSize: '12px' },
    lg: { padding: '14px 28px', fontSize: '13px' },
  }[size];

  const variantStyles: React.CSSProperties = (() => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--bp-ink-700)',
          color: 'var(--bp-paper-cream)',
          borderColor: 'var(--bp-ink-700)',
        };
      case 'cyan':
        return {
          background: 'var(--bp-cyan-main)',
          color: 'white',
          borderColor: 'var(--bp-cyan-main)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--bp-ink-500)',
          borderColor: 'transparent',
        };
      case 'secondary':
      default:
        return {
          background: 'transparent',
          color: 'var(--bp-ink-700)',
          borderColor: 'var(--bp-ink-500)',
        };
    }
  })();

  const baseStyle: React.CSSProperties = {
    fontFamily: 'var(--bp-font-mono)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    border: '1.5px solid',
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: '2px',
    transition: 'all 0.2s ease',
    fontWeight: 600,
    opacity: disabled ? 0.5 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    ...sizeStyles,
    ...variantStyles,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`bp-btn ${className}`}
      style={baseStyle}
    >
      {children}
    </button>
  );
}

// ─── BpCard ─────────────────────────────────────────────────────────────────

interface BpCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  hoverable?: boolean;
}

export function BpCard({
  children,
  className = '',
  onClick,
  style,
  hoverable = true,
}: BpCardProps) {
  const baseStyle: React.CSSProperties = {
    background: 'var(--bp-paper-white)',
    border: '1.5px solid var(--bp-ink-200)',
    borderRadius: '2px',
    padding: '16px',
    position: 'relative',
    transition: hoverable ? 'box-shadow 0.2s ease, border-color 0.2s ease' : undefined,
    cursor: onClick ? 'pointer' : undefined,
    ...style,
  };

  return (
    <div
      className={`bp-card ${className}`}
      style={baseStyle}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─── BpBadge ────────────────────────────────────────────────────────────────

interface BpBadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: 'outline' | 'fill';
}

export function BpBadge({
  children,
  color = 'var(--bp-ink-500)',
  variant = 'outline',
}: BpBadgeProps) {
  const baseStyle: React.CSSProperties = {
    fontFamily: 'var(--bp-font-mono)',
    fontSize: '10px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '3px 8px',
    border: `1px solid ${color}`,
    borderRadius: '2px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    color: variant === 'fill' ? 'white' : color,
    background: variant === 'fill' ? color : 'transparent',
    fontWeight: 600,
  };

  return (
    <span className="bp-badge" style={baseStyle}>
      {children}
    </span>
  );
}

// ─── BpInput ────────────────────────────────────────────────────────────────

interface BpInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  label?: string;
  type?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function BpInput({
  value,
  onChange,
  placeholder,
  label,
  type = 'text',
  className = '',
  onKeyDown,
}: BpInputProps) {
  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--bp-font-mono)',
    fontSize: '13px',
    background: 'var(--bp-paper-white)',
    border: '1.5px solid var(--bp-ink-200)',
    borderRadius: '2px',
    padding: '10px 14px',
    color: 'var(--bp-ink-800)',
    width: '100%',
    transition: 'border-color 0.2s ease',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--bp-font-mono)',
    fontSize: '10px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--bp-ink-500)',
    fontWeight: 600,
    display: 'block',
    marginBottom: '6px',
  };

  return (
    <div style={{ width: '100%' }}>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        className={`bp-input ${className}`}
        style={inputStyle}
      />
    </div>
  );
}

// ─── BpModal ────────────────────────────────────────────────────────────────

interface BpModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: number | string;
}

export function BpModal({
  open,
  onClose,
  title,
  children,
  width = 520,
}: BpModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(18, 40, 64, 0.6)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  };

  const modalStyle: React.CSSProperties = {
    background: 'var(--bp-paper-cream)',
    border: '1.5px solid var(--bp-ink-300)',
    borderRadius: '2px',
    width: typeof width === 'number' ? `${width}px` : width,
    maxWidth: '90vw',
    maxHeight: '85vh',
    overflow: 'auto',
    position: 'relative',
    boxShadow: '0 8px 40px rgba(11,29,51,0.3)',
    outline: '1px solid var(--bp-ink-100)',
    outlineOffset: '3px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--bp-ink-100)',
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: 'var(--bp-font-mono)',
    fontSize: '11px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--bp-ink-700)',
    fontWeight: 700,
    margin: 0,
  };

  const closeStyle: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid var(--bp-ink-200)',
    borderRadius: '2px',
    cursor: 'pointer',
    color: 'var(--bp-ink-400)',
    fontFamily: 'var(--bp-font-mono)',
    fontSize: '12px',
    padding: '2px 8px',
    lineHeight: 1,
    transition: 'all 0.15s ease',
  };

  const bodyStyle: React.CSSProperties = {
    padding: '20px',
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  const content = (
    <div style={overlayStyle} ref={overlayRef} onClick={handleOverlayClick}>
      <div style={modalStyle}>
        {/* Corner marks */}
        <div style={{ position: 'absolute', top: 6, left: 6, width: 12, height: 12, borderTop: '1.5px solid var(--bp-ink-300)', borderLeft: '1.5px solid var(--bp-ink-300)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 6, right: 6, width: 12, height: 12, borderTop: '1.5px solid var(--bp-ink-300)', borderRight: '1.5px solid var(--bp-ink-300)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 6, left: 6, width: 12, height: 12, borderBottom: '1.5px solid var(--bp-ink-300)', borderLeft: '1.5px solid var(--bp-ink-300)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 6, right: 6, width: 12, height: 12, borderBottom: '1.5px solid var(--bp-ink-300)', borderRight: '1.5px solid var(--bp-ink-300)', pointerEvents: 'none' }} />

        {(title !== undefined) && (
          <div style={headerStyle}>
            <p style={titleStyle}>{title}</p>
            <button style={closeStyle} onClick={onClose} aria-label="Close modal">✕</button>
          </div>
        )}
        {title === undefined && (
          <button
            style={{ ...closeStyle, position: 'absolute', top: 12, right: 12 }}
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        )}
        <div style={bodyStyle}>{children}</div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

// ─── BpPanel ────────────────────────────────────────────────────────────────

interface BpPanelProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  actions?: React.ReactNode;
}

export function BpPanel({
  children,
  title,
  className = '',
  style,
  actions,
}: BpPanelProps) {
  const panelStyle: React.CSSProperties = {
    background: 'var(--bp-paper-cream)',
    border: '1.5px solid var(--bp-ink-200)',
    borderRadius: '2px',
    position: 'relative',
    ...style,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderBottom: '1px solid var(--bp-ink-100)',
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: 'var(--bp-font-mono)',
    fontSize: '10px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--bp-ink-500)',
    fontWeight: 600,
    margin: 0,
  };

  const bodyStyle: React.CSSProperties = {
    padding: '20px',
  };

  return (
    <div className={`bp-panel ${className}`} style={panelStyle}>
      {(title || actions) && (
        <div style={headerStyle}>
          {title && <p style={titleStyle}>{title}</p>}
          {actions && <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>{actions}</div>}
        </div>
      )}
      <div style={bodyStyle}>{children}</div>
    </div>
  );
}
