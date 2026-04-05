'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface XPEngineProps {
  compact?: boolean;
}

interface XPData {
  total_xp: number;
  level: string;
  xp_to_next_level: number;
  streak_days: number;
  longest_streak: number;
  recent_events: Array<{ action: string; metadata?: any; created_at: string }>;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  xp_reward: number;
  action_type: string;
  completed: boolean;
}

const LEVEL_COLORS: Record<string, string> = {
  Apprentice: '#666666',
  Builder: '#1D9E75',
  Craftsman: '#D85A30',
  Master: '#7F77DD',
  Architect: '#E8443A',
};

const LEVEL_NAMES: Record<string, string> = {
  Apprentice: 'Apprentice',
  Builder: 'Builder',
  Craftsman: 'Craftsman',
  Master: 'Master',
  Architect: 'Architect',
};

const LEVEL_THRESHOLDS = {
  Apprentice: { min: 0, max: 499 },
  Builder: { min: 500, max: 1999 },
  Craftsman: { min: 2000, max: 4999 },
  Master: { min: 5000, max: 14999 },
  Architect: { min: 15000, max: Infinity },
};

function XPEngineBar({ xpData, quests, onXPEarned }: { xpData: XPData; quests: Quest[]; onXPEarned: (xp: number, level: string) => void }) {
  const completedQuests = quests.filter((q) => q.completed).length;
  const currentLevelRange = Object.values(LEVEL_THRESHOLDS).find(
    (range) => xpData.total_xp >= range.min && xpData.total_xp <= range.max
  ) || { min: 0, max: 500 };

  const xpInLevel = xpData.total_xp - currentLevelRange.min;
  const xpLevelSize = currentLevelRange.max - currentLevelRange.min;
  const percentToNextLevel = Math.min((xpInLevel / xpLevelSize) * 100, 100);

  const levelColor = LEVEL_COLORS[xpData.level] || '#666666';

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200">
      {/* Level Badge with Progress Ring */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        <svg className="w-12 h-12" viewBox="0 0 48 48">
          {/* Background circle */}
          <circle cx="24" cy="24" r="22" fill="none" stroke="#e5e7eb" strokeWidth="2" />
          {/* Progress circle */}
          <motion.circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            stroke={levelColor}
            strokeWidth="2"
            strokeDasharray={`${(percentToNextLevel / 100) * (22 * 2 * Math.PI)} ${22 * 2 * Math.PI}`}
            strokeLinecap="round"
            transform="rotate(-90 24 24)"
          />
        </svg>
        <span
          className="absolute text-xs font-bold text-white"
          style={{ color: levelColor }}
        >
          {xpData.level[0]}
        </span>
      </div>

      {/* XP Counter */}
      <div className="flex flex-col gap-1">
        <motion.div className="text-lg font-bold text-gray-900">
          {xpData.total_xp.toLocaleString()} XP
        </motion.div>
        <div className="text-xs text-gray-500">
          {xpData.xp_to_next_level.toLocaleString()} to next level
        </div>
      </div>

      {/* Streak Flame */}
      <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 rounded">
        <span className="text-lg">🔥</span>
        <span className="text-sm font-semibold text-orange-600">{xpData.streak_days}</span>
      </div>

      {/* Quest Progress */}
      <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded">
        <span className="text-xs font-semibold text-blue-700">
          {completedQuests}/3 quests
        </span>
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              animate={{
                backgroundColor:
                  i < completedQuests ? '#3b82f6' : '#e5e7eb',
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ExpandedView({
  xpData,
  quests,
  onClose,
}: {
  xpData: XPData;
  quests: Quest[];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleQuestComplete = async (questId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/quests/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ quest_id: questId }),
      });

      if (response.ok) {
        // Refresh data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error completing quest:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-96 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{xpData.level}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {xpData.total_xp.toLocaleString()} total XP
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Streak Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Current Streak
              </p>
              <p className="text-2xl font-bold mt-1 flex items-center gap-1">
                <span>🔥</span> {xpData.streak_days}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Longest Streak
              </p>
              <p className="text-2xl font-bold mt-1">{xpData.longest_streak}</p>
            </div>
          </div>

          {/* Quests */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Today's Quests
            </h3>
            <div className="space-y-2">
              {quests.map((quest) => (
                <motion.div
                  key={quest.id}
                  className={`p-3 rounded-lg border ${
                    quest.completed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  layout
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {quest.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {quest.description}
                      </p>
                      <p className="text-xs font-semibold text-blue-600 mt-2">
                        +{quest.xp_reward} XP
                      </p>
                    </div>
                    {!quest.completed && (
                      <motion.button
                        onClick={() => handleQuestComplete(quest.id)}
                        disabled={loading}
                        className="px-3 py-1 text-xs font-semibold bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Complete
                      </motion.button>
                    )}
                    {quest.completed && (
                      <span className="text-lg">✓</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recent Events */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Recent Activity
            </h3>
            <div className="space-y-2 text-xs text-gray-600">
              {xpData.recent_events.slice(0, 5).map((event, i) => (
                <p key={i}>
                  {event.action
                    .split('_')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')}{' '}
                  <span className="text-gray-400">
                    {new Date(event.created_at).toLocaleDateString()}
                  </span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LevelUpCelebration({ level, onComplete }: { level: string; onComplete: () => void }) {
  const levelColor = LEVEL_COLORS[level] || '#666666';

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {/* Burst effect */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-4 h-4 rounded-full"
          style={{ backgroundColor: levelColor }}
          initial={{
            x: 0,
            y: 0,
            opacity: 1,
          }}
          animate={{
            x: Math.cos((i / 12) * Math.PI * 2) * 200,
            y: Math.sin((i / 12) * Math.PI * 2) * 200,
            opacity: 0,
          }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      ))}

      {/* Level up text */}
      <motion.div
        className="text-center"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <motion.p
          className="text-6xl font-bold mb-2"
          style={{ color: levelColor }}
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 1, repeat: 2 }}
        >
          Level Up!
        </motion.p>
        <p className="text-3xl font-bold text-gray-900">{LEVEL_NAMES[level]}</p>
      </motion.div>
    </motion.div>
  );
}

function XPToast({ xp, onComplete }: { xp: number; onComplete: () => void }) {
  return (
    <motion.div
      className="fixed bottom-8 right-8 px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold text-sm"
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: -100, opacity: 0 }}
      exit={{ y: 0, opacity: 1 }}
      transition={{ duration: 2, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
    >
      +{xp} XP
    </motion.div>
  );
}

export default function XPEngine({ compact = true }: XPEngineProps) {
  const [xpData, setXpData] = useState<XPData | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState<string | null>(null);
  const [pendingXP, setPendingXP] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session?.access_token) return;

        const token = session.data.session.access_token;

        // Fetch XP data
        const xpResponse = await fetch('/api/v1/xp', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (xpResponse.ok) {
          const data = await xpResponse.json();
          setXpData(data);
        }

        // Fetch quests
        const questResponse = await fetch('/api/v1/quests/daily', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (questResponse.ok) {
          const data = await questResponse.json();
          setQuests(data);
        }
      } catch (error) {
        console.error('Error fetching XP data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  // Listen for XP earned events
  useEffect(() => {
    const handleXPEarned = (event: CustomEvent) => {
      const { xp, level } = event.detail;
      setPendingXP(xp);

      if (level) {
        setShowLevelUp(level);
      }

      // Refresh data after short delay
      setTimeout(async () => {
        const session = await supabase.auth.getSession();
        if (session.data.session?.access_token) {
          const response = await fetch('/api/v1/xp', {
            headers: {
              Authorization: `Bearer ${session.data.session.access_token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setXpData(data);
          }
        }
      }, 500);
    };

    window.addEventListener('xp-earned', handleXPEarned as EventListener);
    return () =>
      window.removeEventListener('xp-earned', handleXPEarned as EventListener);
  }, []);

  if (loading || !xpData) {
    return (
      <div className="px-4 py-3 bg-white rounded-lg border border-gray-200">
        <div className="h-6 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <motion.button
        onClick={() => !compact && setExpanded(true)}
        className="w-full"
        whileHover={{ scale: compact ? 1.02 : 1 }}
      >
        <XPEngineBar
          xpData={xpData}
          quests={quests}
          onXPEarned={(xp, level) => {
            setPendingXP(xp);
            if (level) setShowLevelUp(level);
          }}
        />
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <ExpandedView
            xpData={xpData}
            quests={quests}
            onClose={() => setExpanded(false)}
          />
        )}

        {showLevelUp && (
          <LevelUpCelebration
            level={showLevelUp}
            onComplete={() => setShowLevelUp(null)}
          />
        )}

        {pendingXP !== null && (
          <XPToast
            xp={pendingXP}
            onComplete={() => setPendingXP(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
