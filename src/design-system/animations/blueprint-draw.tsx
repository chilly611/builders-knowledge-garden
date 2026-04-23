'use client';

import React from 'react';
import { motion } from 'framer-motion';
import './blueprint-keyframes.css';

export interface BlueprintDrawProps {
  width?: number;
  height?: number;
  duration?: number;
  loop?: boolean;
  color?: string;
  className?: string;
}

export function BlueprintDraw({
  width = 240,
  height = 180,
  duration = 1.2,
  loop = false,
  color = '#1B3B5E',
  className = '',
}: BlueprintDrawProps) {
  const pathData = 'M 20 120 L 160 120 L 160 40 L 80 40';
  const pathLength = 340; // Approximate total path length for stroke-dasharray

  return (
    <svg
      viewBox="0 0 200 160"
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <motion.path
        d={pathData}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="miter"
        strokeDasharray={pathLength}
        initial={{ strokeDashoffset: pathLength }}
        animate={{ strokeDashoffset: 0 }}
        transition={{
          duration,
          repeat: loop ? Infinity : 0,
          ease: 'easeInOut',
        }}
      />
    </svg>
  );
}
