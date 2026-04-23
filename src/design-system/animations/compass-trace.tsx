'use client';

import React from 'react';
import { motion } from 'framer-motion';
import './blueprint-keyframes.css';

export interface CompassTraceProps {
  size?: number;
  duration?: number;
  color?: string;
  className?: string;
}

export function CompassTrace({
  size = 120,
  duration = 3,
  color = '#B6873A',
  className = '',
}: CompassTraceProps) {
  const center = 50;
  const radius = 35;

  const points = [
    { angle: 0, label: 'N' },
    { angle: 45, label: 'NE' },
    { angle: 90, label: 'E' },
    { angle: 135, label: 'SE' },
    { angle: 180, label: 'S' },
    { angle: 225, label: 'SW' },
    { angle: 270, label: 'W' },
  ];

  const getCoords = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad - Math.PI / 2),
      y: center + radius * Math.sin(rad - Math.PI / 2),
    };
  };

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#F4F0E6" strokeWidth="0.5" />

      {points.map((point) => {
        const coords = getCoords(point.angle);
        return (
          <g key={point.label}>
            <circle cx={coords.x} cy={coords.y} r="1.5" fill={color} />
            <line
              x1={center}
              y1={center}
              x2={coords.x}
              y2={coords.y}
              stroke="#C9C3B3"
              strokeWidth="0.5"
            />
          </g>
        );
      })}

      <motion.g
        animate={{ rotate: 360 }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ transformOrigin: '50px 50px' }}
      >
        <line
          x1={center}
          y1={center}
          x2={center}
          y2={center - radius}
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </motion.g>

      <circle cx={center} cy={center} r="2.5" fill="#1B3B5E" />
    </svg>
  );
}
