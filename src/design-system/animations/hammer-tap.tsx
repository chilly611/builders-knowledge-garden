'use client';

import React from 'react';
import { motion } from 'framer-motion';
import './blueprint-keyframes.css';

export interface HammerTapProps {
  size?: number;
  taps?: number;
  onComplete?: () => void;
  className?: string;
}

export function HammerTap({
  size = 48,
  taps = 1,
  onComplete,
  className = '',
}: HammerTapProps) {
  const variants = {
    idle: {
      rotateZ: 0,
      translateY: 0,
      transition: { duration: 0.2 },
    },
    tap: {
      rotateZ: -25,
      translateY: 8,
      transition: { duration: 0.1 },
    },
  };

  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ display: 'block', transformOrigin: 'center center' }}
      initial="idle"
      animate="idle"
      onAnimationComplete={onComplete}
    >
      <rect x="30" y="15" width="40" height="15" fill="#2E2E30" rx="2" />
      <rect x="42" y="35" width="16" height="45" fill="#B6873A" rx="2" />
      <line x1="42" y1="50" x2="58" y2="50" stroke="#C9C3B3" strokeWidth="1" />
      <line x1="42" y1="60" x2="58" y2="60" stroke="#C9C3B3" strokeWidth="1" />
      <circle cx="50" cy="85" r="3" fill="#1B3B5E" />
    </motion.svg>
  );
}
