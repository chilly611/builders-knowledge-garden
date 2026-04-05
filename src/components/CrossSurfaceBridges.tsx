'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Color palette
const COLORS = {
  dream: '#D85A30',      // Gold
  knowledge: '#1D9E75',   // Green
  killerapp: '#E8443A',   // Red
  light: '#FAFAF8',
  white: '#FFFFFF',
  gray: '#999999',
  darkText: '#1A1A1A',
};

// ============================================================================
// 1. MakeThisRealButton
// ============================================================================
interface MakeThisRealButtonProps {
  dreamId?: string;
  dreamData?: any;
  onClick?: () => void;
  className?: string;
}

export const MakeThisRealButton = ({
  dreamId,
  dreamData,
  onClick,
  className = '',
}: MakeThisRealButtonProps) => {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    const params = new URLSearchParams();
    if (dreamId) params.append('dreamId', dreamId);
    if (dreamData) params.append('dream', JSON.stringify(dreamData));

    const href = `/projects/new${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(href);
  };

  return (
    <motion.button
      onClick={handleClick}
      className={`relative px-6 py-3 rounded-lg font-black text-white transition-all ${className}`}
      style={{
        backgroundColor: COLORS.killerapp,
        fontFamily: 'Archivo Black, sans-serif',
        fontSize: '14px',
        letterSpacing: '0.5px',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      animate={{
        boxShadow: [
          `0 0 0 0 rgba(232, 68, 58, 0.7)`,
          `0 0 0 10px rgba(232, 68, 58, 0)`,
        ],
      }}
      transition={{
        boxShadow: {
          duration: 2,
          repeat: Infinity,
        },
      }}
    >
      <span className="flex items-center justify-center gap-2">
        Make This Real
        <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          →
        </motion.span>
      </span>
    </motion.button>
  );
};

// ============================================================================
// 2. UseInDreamButton
// ============================================================================
interface UseInDreamButtonProps {
  entityId: string;
  entityType: string;
  entityName: string;
  onClick?: () => void;
  className?: string;
}

export const UseInDreamButton = ({
  entityId,
  entityType,
  entityName,
  onClick,
  className = '',
}: UseInDreamButtonProps) => {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    const params = new URLSearchParams();
    params.append('ingredient', entityId);
    params.append('type', entityType);
    params.append('name', entityName);

    router.push(`/dream?${params.toString()}`);
  };

  return (
    <motion.button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white font-semibold transition-all text-sm ${className}`}
      style={{
        backgroundColor: COLORS.dream,
        fontFamily: 'Archivo, sans-serif',
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      Use in My Dream
      <motion.span animate={{ x: [0, 2, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
        →
      </motion.span>
    </motion.button>
  );
};

// ============================================================================
// 3. WhatDoesCodeSayLink
// ============================================================================
interface WhatDoesCodeSayLinkProps {
  query: string;
  jurisdiction?: string;
  onClick?: () => void;
  className?: string;
}

export const WhatDoesCodeSayLink = ({
  query,
  jurisdiction,
  onClick,
  className = '',
}: WhatDoesCodeSayLinkProps) => {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    const params = new URLSearchParams();
    params.append('q', query);
    if (jurisdiction) params.append('jurisdiction', jurisdiction);

    router.push(`/knowledge?${params.toString()}`);
  };

  return (
    <motion.button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 text-sm font-semibold hover:underline transition-all ${className}`}
      style={{
        color: COLORS.knowledge,
        fontFamily: 'Archivo, sans-serif',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
      whileHover={{ x: 2 }}
      whileTap={{ x: 0 }}
    >
      What does the code say?
      <span>📚</span>
    </motion.button>
  );
};

// ============================================================================
// 4. ContinueYourDreamCard
// ============================================================================
interface ContinueYourDreamCardProps {
  dreamId: string;
  dreamTitle: string;
  stage: 'seed' | 'sprout' | 'bloom' | 'harvest';
  lastUpdated: string;
  thumbnailUrl?: string;
  onClick?: () => void;
  className?: string;
}

const STAGE_CONFIG = {
  seed: {
    emoji: '🌱',
    label: 'Seed',
    color: '#FFE4B5',
  },
  sprout: {
    emoji: '🌿',
    label: 'Sprout',
    color: '#C1E5D3',
  },
  bloom: {
    emoji: '🌸',
    label: 'Bloom',
    color: '#F0C6D7',
  },
  harvest: {
    emoji: '🌳',
    label: 'Harvest',
    color: '#D4AF8C',
  },
};

export const ContinueYourDreamCard = ({
  dreamId,
  dreamTitle,
  stage,
  lastUpdated,
  thumbnailUrl,
  onClick,
  className = '',
}: ContinueYourDreamCardProps) => {
  const router = useRouter();
  const stageConfig = STAGE_CONFIG[stage];

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    router.push(`/dream/${dreamId}`);
  };

  return (
    <motion.div
      onClick={handleClick}
      className={`relative overflow-hidden rounded-lg cursor-pointer ${className}`}
      style={{
        backgroundColor: COLORS.white,
        border: `2px solid ${COLORS.dream}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
      whileHover={{ y: -4, boxShadow: '0 8px 16px rgba(0,0,0,0.12)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3 }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background: `linear-gradient(135deg, ${COLORS.dream}40, ${stageConfig.color}40)`,
        }}
      />

      {/* Thumbnail */}
      {thumbnailUrl && (
        <div className="relative h-32 overflow-hidden bg-gray-200">
          <img
            src={thumbnailUrl}
            alt={dreamTitle}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundColor: COLORS.dream }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative p-4">
        {/* Stage Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{stageConfig.emoji}</span>
          <span
            className="text-xs font-bold px-2 py-1 rounded"
            style={{
              backgroundColor: stageConfig.color,
              color: COLORS.darkText,
              fontFamily: 'Archivo Black, sans-serif',
            }}
          >
            {stageConfig.label}
          </span>
        </div>

        {/* Title */}
        <h3
          className="font-black text-base mb-3 line-clamp-2"
          style={{
            fontFamily: 'Archivo Black, sans-serif',
            color: COLORS.darkText,
          }}
        >
          {dreamTitle}
        </h3>

        {/* Last updated */}
        <p
          className="text-xs mb-4"
          style={{
            color: COLORS.gray,
            fontFamily: 'Archivo, sans-serif',
          }}
        >
          Last touched {lastUpdated}
        </p>

        {/* CTA Button */}
        <motion.button
          className="w-full py-2 rounded-md text-white font-bold text-sm transition-all"
          style={{
            backgroundColor: COLORS.dream,
            fontFamily: 'Archivo Black, sans-serif',
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Continue Dreaming →
        </motion.button>
      </div>
    </motion.div>
  );
};

// ============================================================================
// 5. SurfaceTransitionBanner
// ============================================================================
interface SurfaceTransitionBannerSuggestion {
  surface: string;
  reason: string;
  cta: string;
  href: string;
}

interface SurfaceTransitionBannerProps {
  currentSurface: 'dream' | 'knowledge' | 'killerapp';
  suggestion: SurfaceTransitionBannerSuggestion;
  onDismiss?: () => void;
  className?: string;
}

const SURFACE_COLORS = {
  dream: COLORS.dream,
  knowledge: COLORS.knowledge,
  killerapp: COLORS.killerapp,
};

export const SurfaceTransitionBanner = ({
  currentSurface,
  suggestion,
  onDismiss,
  className = '',
}: SurfaceTransitionBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const router = useRouter();

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  const targetColor = SURFACE_COLORS[suggestion.surface as keyof typeof SURFACE_COLORS];

  const handleNavigate = () => {
    router.push(suggestion.href);
  };

  if (isDismissed) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`relative overflow-hidden px-4 py-3 sm:px-6 sm:py-4 ${className}`}
      style={{
        backgroundColor: targetColor,
        borderBottom: `2px solid ${targetColor}80`,
      }}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: 'mirror',
        }}
        style={{
          background: `linear-gradient(45deg, ${targetColor}40, ${COLORS.light}40)`,
        }}
      />

      {/* Content */}
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold text-white truncate sm:text-base"
            style={{
              fontFamily: 'Archivo, sans-serif',
            }}
          >
            {suggestion.reason}
            {' '}
            <motion.button
              onClick={handleNavigate}
              className="inline font-black underline hover:no-underline transition-all"
              style={{
                fontFamily: 'Archivo Black, sans-serif',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {suggestion.cta}
            </motion.button>
          </p>
        </div>

        {/* Dismiss button */}
        <motion.button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-md hover:bg-white/20 transition-all"
          style={{
            color: 'white',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          ✕
        </motion.button>
      </div>
    </motion.div>
  );
};

// ============================================================================
// 6. LifecycleProgressBar
// ============================================================================
interface LifecycleProgressBarProps {
  phase: 'dream' | 'design' | 'build';
  progress: number;
  className?: string;
}

const PHASE_LABELS = {
  dream: 'DREAM',
  design: 'DESIGN',
  build: 'BUILD',
};

const PHASE_COLORS = {
  dream: COLORS.dream,
  design: COLORS.knowledge,
  build: COLORS.killerapp,
};

const PHASE_ORDER = ['dream', 'design', 'build'] as const;

export const LifecycleProgressBar = ({
  phase,
  progress,
  className = '',
}: LifecycleProgressBarProps) => {
  const phaseIndex = PHASE_ORDER.indexOf(phase);
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div
      className={`w-full px-4 sm:px-6 py-3 ${className}`}
      style={{
        backgroundColor: COLORS.light,
      }}
    >
      <div className="flex items-center gap-1 sm:gap-2">
        {PHASE_ORDER.map((p, idx) => {
          const isActive = idx <= phaseIndex;
          const isCurrent = idx === phaseIndex;
          const phaseColor = PHASE_COLORS[p];
          const isCompleted = idx < phaseIndex;

          return (
            <div key={p} className="flex-1 flex items-center gap-1 sm:gap-2">
              {/* Segment */}
              <motion.div
                className="relative h-2 sm:h-3 flex-1 rounded-full overflow-hidden"
                style={{
                  backgroundColor: isActive ? phaseColor : '#E5E5E5',
                  opacity: isActive ? 1 : 0.5,
                }}
              >
                {isCurrent && (
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      backgroundColor: phaseColor,
                      width: `${clampedProgress}%`,
                    }}
                    animate={{
                      boxShadow: [
                        `0 0 0 0 ${phaseColor}40`,
                        `0 0 0 8px ${phaseColor}00`,
                      ],
                    }}
                    transition={{
                      boxShadow: {
                        duration: 1.5,
                        repeat: Infinity,
                      },
                    }}
                  />
                )}
                {isCompleted && (
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundColor: phaseColor,
                    }}
                  />
                )}
              </motion.div>

              {/* Label */}
              <span
                className="text-xs font-bold whitespace-nowrap sm:text-sm"
                style={{
                  color: isActive ? phaseColor : COLORS.gray,
                  fontFamily: 'Archivo Black, sans-serif',
                }}
              >
                {PHASE_LABELS[p]}
              </span>

              {/* Divider (not on last item) */}
              {idx < PHASE_ORDER.length - 1 && (
                <motion.div
                  className="w-1 h-1 rounded-full"
                  style={{
                    backgroundColor: isActive ? phaseColor : '#E5E5E5',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress percentage - shown only for current phase */}
      <div className="mt-2 text-right">
        <span
          className="text-xs"
          style={{
            color: COLORS.gray,
            fontFamily: 'Archivo, sans-serif',
          }}
        >
          {clampedProgress}% complete
        </span>
      </div>
    </div>
  );
};
