'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './MorningBriefing.module.css';

interface Quest {
  id: string;
  title: string;
  description: string;
  xp_reward: number;
  action_type: string;
}

interface MorningBriefingProps {
  lane: string;
  onDismiss: () => void;
  streakDays: number;
}

const LANE_COLORS: Record<string, string> = {
  dreamer: '#1D9E75',
  builder: '#E8443A',
  specialist: '#D85A30',
  merchant: '#BA7517',
  ally: '#378ADD',
  crew: '#666666',
  fleet: '#BA7517',
  machine: '#7F77DD',
};

const QUEST_ICONS: Record<string, string> = {
  vision: '🎨',
  research: '🔍',
  share: '🤝',
  inspection: '🔍',
  inventory: '📦',
  briefing: '📢',
  bid: '📝',
  review: '✓',
  sync: '🔄',
  pricing: '💰',
  leads: '📞',
  forecast: '📈',
  approval: '✓',
  feedback: '💬',
  safety: '🛡️',
  work: '💼',
  report: '📋',
  dispatch: '🚗',
  maintenance: '🔧',
  analytics: '📊',
  optimize: '⚙️',
  validate: '✓',
};

const TypewriterText: React.FC<{ text: string; delay?: number }> = ({
  text,
  delay = 0,
}) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const charIndex = Math.floor(elapsed / 20);

      if (charIndex >= text.length) {
        setDisplayedText(text);
        clearInterval(interval);
      } else {
        setDisplayedText(text.slice(0, charIndex));
      }
    }, 20);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <div className={styles.typewriterText}>
      {displayedText}
      {displayedText.length < text.length && (
        <span className={styles.cursor}>▌</span>
      )}
    </div>
  );
};

const QuestCard: React.FC<{
  quest: Quest;
  onStart: (questId: string) => void;
  completed: boolean;
  laneColor: string;
}> = ({ quest, onStart, completed, laneColor }) => {
  return (
    <motion.div
      className={styles.questCard}
      whileHover={{ y: -4 }}
      onClick={() => onStart(quest.id)}
      style={{
        borderLeft: `4px solid ${laneColor}`,
      }}
    >
      <div className={styles.questHeader}>
        <span className={styles.questIcon}>
          {QUEST_ICONS[quest.action_type] || '⭐'}
        </span>
        {completed && <span className={styles.checkmark}>✓</span>}
      </div>
      <h4 className={styles.questTitle}>{quest.title}</h4>
      <p className={styles.questDescription}>{quest.description}</p>
      <div className={styles.questFooter}>
        <span className={styles.xpReward}>+{quest.xp_reward} XP</span>
      </div>
    </motion.div>
  );
};

export const MorningBriefing: React.FC<MorningBriefingProps> = ({
  lane,
  onDismiss,
  streakDays,
}) => {
  const [briefing, setBriefing] = useState<string>('');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(
    new Set()
  );

  const laneColor = LANE_COLORS[lane.toLowerCase()] || LANE_COLORS.builder;

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        const response = await fetch('/api/v1/briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lane }),
        });

        if (response.ok) {
          const data = await response.json();
          setBriefing(data.briefing);
          setQuests(data.quests);
        }
      } catch (error) {
        console.error('Failed to fetch briefing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBriefing();
  }, [lane]);

  const handleQuestStart = (questId: string) => {
    setCompletedQuests((prev) => new Set([...prev, questId]));
  };

  const allQuestsCompleted = completedQuests.size === quests.length;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={styles.modal}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header with streak */}
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>Good Morning</h1>
              <p className={styles.subtitle}>Your {lane} briefing for today</p>
            </div>
            <div className={styles.streak}>
              <span className={styles.streakEmoji}>🔥</span>
              <span className={styles.streakText}>{streakDays} day streak</span>
            </div>
          </div>

          {/* Accent border */}
          <div
            className={styles.accentBorder}
            style={{ backgroundColor: laneColor }}
          />

          {/* Briefing content */}
          <div className={styles.briefingContent}>
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>Generating your briefing...</p>
              </div>
            ) : (
              <TypewriterText text={briefing} />
            )}
          </div>

          {/* Quests section */}
          {quests.length > 0 && (
            <div className={styles.questsSection}>
              <h2 className={styles.questsTitle}>Daily Quests</h2>
              <div className={styles.questsGrid}>
                {quests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onStart={handleQuestStart}
                    completed={completedQuests.has(quest.id)}
                    laneColor={laneColor}
                  />
                ))}
              </div>

              {/* Bonus banner */}
              {allQuestsCompleted && (
                <motion.div
                  className={styles.bonusBanner}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ borderLeft: `4px solid ${laneColor}` }}
                >
                  <span className={styles.bonusIcon}>⭐</span>
                  <span className={styles.bonusText}>
                    Complete all 3 quests for 2x XP bonus!
                  </span>
                </motion.div>
              )}
              {!allQuestsCompleted && (
                <div className={styles.bonusBannerPlaceholder}>
                  <span className={styles.bonusText}>
                    Complete all 3 quests for 2x XP bonus!
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Dismiss button */}
          <motion.button
            className={styles.dismissButton}
            onClick={onDismiss}
            whileHover={{ backgroundColor: laneColor }}
            style={{
              color: 'white',
              backgroundColor: laneColor,
            }}
          >
            Got it, let's go
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MorningBriefing;
