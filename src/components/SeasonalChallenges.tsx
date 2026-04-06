'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface Challenge {
  id: string;
  month: number;
  name: string;
  description: string;
  theme: string;
  reward: number;
  startDate: Date;
  endDate: Date;
  objectives: Objective[];
  laneBonus?: { lane: string; objectives: Objective[] };
}

interface Objective {
  id: string;
  title: string;
  description: string;
  xp: number;
  completed: boolean;
  progress: number;
  icon: string;
}

interface LeaderboardEntry {
  id: string;
  rank: number;
  userId: string;
  userName: string;
  avatar: string;
  lane: string;
  xp: number;
  objectivesCompleted: number;
  totalObjectives: number;
}

interface PersonalStats {
  rank: number;
  xpEarned: number;
  objectivesCompleted: number;
  totalObjectives: number;
  achievements: string[];
}

interface HistoricalChallenge {
  month: number;
  name: string;
  year: number;
  userRank: number;
  userXp: number;
  achievement?: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: 'jan-safety',
    month: 1,
    name: 'Safety Sprint',
    description: 'Focus on safety protocols and best practices',
    theme: 'Safety',
    reward: 500,
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 0, 31),
    objectives: [
      { id: 'obj-1', title: 'Complete Safety Audit', description: 'Review all safety protocols', xp: 100, completed: false, progress: 65, icon: '🛡️' },
      { id: 'obj-2', title: 'Submit 5 Safety Reports', description: 'Document safety observations', xp: 150, completed: false, progress: 40, icon: '📋' },
      { id: 'obj-3', title: 'Lead Safety Training', description: 'Conduct team safety session', xp: 200, completed: false, progress: 0, icon: '👥' },
      { id: 'obj-4', title: 'Zero Incident Week', description: 'Maintain safety for 7 days', xp: 250, completed: false, progress: 30, icon: '📅' },
      { id: 'obj-5', title: 'Safety Innovation', description: 'Propose a new safety improvement', xp: 300, completed: false, progress: 0, icon: '💡' },
      { id: 'obj-6', title: 'Mentor on Safety', description: 'Help 3 team members improve safety', xp: 180, completed: false, progress: 33, icon: '🎓' },
    ],
  },
  {
    id: 'feb-efficiency',
    month: 2,
    name: 'Efficiency Expert',
    description: 'Optimize workflows and maximize productivity',
    theme: 'Efficiency',
    reward: 500,
    startDate: new Date(2026, 1, 1),
    endDate: new Date(2026, 1, 28),
    objectives: [
      { id: 'obj-1', title: 'Process Optimization', description: 'Streamline one workflow', xp: 150, completed: false, progress: 50, icon: '⚙️' },
      { id: 'obj-2', title: 'Reduce Cycle Time', description: 'Complete 10 tasks 20% faster', xp: 200, completed: false, progress: 70, icon: '⏱️' },
      { id: 'obj-3', title: 'Automation Challenge', description: 'Automate a repetitive task', xp: 250, completed: false, progress: 0, icon: '🤖' },
      { id: 'obj-4', title: 'Efficiency Report', description: 'Document time savings', xp: 100, completed: false, progress: 80, icon: '📊' },
      { id: 'obj-5', title: 'Team Speed Record', description: 'Help team beat performance goal', xp: 180, completed: false, progress: 45, icon: '🏃' },
    ],
  },
  {
    id: 'mar-green',
    month: 3,
    name: 'Green Builder',
    description: 'Embrace sustainable and eco-friendly practices',
    theme: 'Sustainability',
    reward: 500,
    startDate: new Date(2026, 2, 1),
    endDate: new Date(2026, 2, 31),
    objectives: [
      { id: 'obj-1', title: 'Green Certification', description: 'Complete sustainability training', xp: 150, completed: false, progress: 0, icon: '🌱' },
      { id: 'obj-2', title: 'Carbon Audit', description: 'Calculate project carbon footprint', xp: 200, completed: false, progress: 25, icon: '🌍' },
      { id: 'obj-3', title: 'Waste Reduction', description: 'Implement waste reduction plan', xp: 180, completed: false, progress: 60, icon: '♻️' },
      { id: 'obj-4', title: 'Green Materials', description: 'Use sustainable materials in 3 projects', xp: 220, completed: false, progress: 33, icon: '🌿' },
      { id: 'obj-5', title: 'Community Green Pledge', description: 'Lead sustainability initiative', xp: 250, completed: false, progress: 0, icon: '🤝' },
      { id: 'obj-6', title: 'Zero Waste Week', description: 'Achieve zero waste for 7 days', xp: 200, completed: false, progress: 14, icon: '🎯' },
      { id: 'obj-7', title: 'Green Mentor', description: 'Teach 2 team members eco practices', xp: 150, completed: false, progress: 50, icon: '👨‍🏫' },
    ],
  },
  {
    id: 'apr-innovation',
    month: 4,
    name: 'Innovation Month',
    description: 'Drive creative solutions and breakthrough ideas',
    theme: 'Innovation',
    reward: 500,
    startDate: new Date(2026, 3, 1),
    endDate: new Date(2026, 3, 30),
    objectives: [
      { id: 'obj-1', title: 'Ideation Sprint', description: 'Brainstorm 10+ new ideas', xp: 150, completed: true, progress: 100, icon: '🧠' },
      { id: 'obj-2', title: 'Prototype Build', description: 'Create a working prototype', xp: 250, completed: false, progress: 75, icon: '🔨' },
      { id: 'obj-3', title: 'Innovation Pitch', description: 'Present idea to leadership', xp: 200, completed: false, progress: 0, icon: '🎤' },
      { id: 'obj-4', title: 'Collaboration', description: 'Work cross-functionally on innovation', xp: 180, completed: false, progress: 50, icon: '🔗' },
      { id: 'obj-5', title: 'Patent/Publication', description: 'Document or publish innovation', xp: 300, completed: false, progress: 0, icon: '📝' },
    ],
  },
];

const LANES = ['dreamer', 'builder', 'specialist', 'merchant', 'ally', 'crew', 'fleet', 'machine'];

const LANE_BONUS_OBJECTIVES: Record<string, Objective[]> = {
  crew: [
    { id: 'bonus-crew-1', title: 'Safety Team Training', description: 'Lead full team safety training', xp: 100, completed: false, progress: 0, icon: '👨‍💼' },
  ],
  builder: [
    { id: 'bonus-builder-1', title: 'Safe Construction', description: 'Complete build with zero incidents', xp: 120, completed: false, progress: 40, icon: '🏗️' },
  ],
  specialist: [
    { id: 'bonus-spec-1', title: 'Safety Consultation', description: 'Consult on 3 safety matters', xp: 110, completed: false, progress: 67, icon: '🔍' },
  ],
};

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', rank: 1, userId: 'user-1', userName: 'Alex Chen', avatar: '👤', lane: 'specialist', xp: 1250, objectivesCompleted: 4, totalObjectives: 6 },
  { id: '2', rank: 2, userId: 'user-2', userName: 'Jordan Smith', avatar: '👥', lane: 'builder', xp: 1180, objectivesCompleted: 3, totalObjectives: 6 },
  { id: '3', rank: 3, userId: 'user-3', userName: 'Morgan Lee', avatar: '🎯', lane: 'crew', xp: 1050, objectivesCompleted: 3, totalObjectives: 6 },
  { id: '4', rank: 4, userId: 'user-4', userName: 'Casey Johnson', avatar: '💼', lane: 'merchant', xp: 950, objectivesCompleted: 2, totalObjectives: 6 },
  { id: '5', rank: 5, userId: 'user-5', userName: 'Riley Garcia', avatar: '🚀', lane: 'machine', xp: 920, objectivesCompleted: 2, totalObjectives: 6 },
  { id: '6', rank: 6, userId: 'user-6', userName: 'Taylor Brown', avatar: '⭐', lane: 'ally', xp: 880, objectivesCompleted: 2, totalObjectives: 6 },
  { id: '7', rank: 7, userId: 'user-7', userName: 'Sam Wilson', avatar: '🎓', lane: 'dreamer', xp: 820, objectivesCompleted: 2, totalObjectives: 6 },
  { id: '8', rank: 8, userId: 'user-8', userName: 'Dana Martinez', avatar: '🔥', lane: 'fleet', xp: 750, objectivesCompleted: 1, totalObjectives: 6 },
  { id: '9', rank: 9, userId: 'user-9', userName: 'Jordan Davis', avatar: '✨', lane: 'specialist', xp: 680, objectivesCompleted: 1, totalObjectives: 6 },
  { id: '10', rank: 10, userId: 'user-10', userName: 'Morgan Zhang', avatar: '🏆', lane: 'builder', xp: 620, objectivesCompleted: 1, totalObjectives: 6 },
  { id: '11', rank: 11, userId: 'user-11', userName: 'Casey Anderson', avatar: '⚡', lane: 'merchant', xp: 580, objectivesCompleted: 1, totalObjectives: 6 },
  { id: '12', rank: 12, userId: 'user-12', userName: 'Riley Thompson', avatar: '🎯', lane: 'crew', xp: 520, objectivesCompleted: 0, totalObjectives: 6 },
];

const HISTORICAL_CHALLENGES: HistoricalChallenge[] = [
  { month: 1, name: 'Safety Sprint 2025', year: 2025, userRank: 45, userXp: 2100, achievement: 'Safety Sprint Champion' },
  { month: 2, name: 'Efficiency Expert 2025', year: 2025, userRank: 28, userXp: 1850, achievement: undefined },
  { month: 3, name: 'Green Builder 2025', year: 2025, userRank: 12, userXp: 2450, achievement: undefined },
];

const getMedalIcon = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

const getTimeRemaining = (endDate: Date) => {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
};

const getLaneColor = (lane: string): string => {
  const colors: Record<string, string> = {
    dreamer: '#7F77DD',
    builder: '#1D9E75',
    specialist: '#378ADD',
    merchant: '#D85A30',
    ally: '#D85A30',
    crew: '#1D9E75',
    fleet: '#378ADD',
    machine: '#D85A30',
  };
  return colors[lane] || '#378ADD';
};

export default function SeasonalChallenges() {
  const [activeTab, setActiveTab] = useState<'current' | 'leaderboard' | 'history'>('current');
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [personalStats, setPersonalStats] = useState<PersonalStats>({
    rank: 12,
    xpEarned: 480,
    objectivesCompleted: 1,
    totalObjectives: 6,
    achievements: ['Safety Sprint Champion'],
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD);
  const [completedObjectives, setCompletedObjectives] = useState<Set<string>>(new Set(['obj-1']));
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const challenge = CHALLENGES.find((c) => c.month === month) || CHALLENGES[3];
    setCurrentChallenge(challenge);
  }, []);

  const handleObjectiveComplete = (objectiveId: string) => {
    const newCompleted = new Set(completedObjectives);
    if (!newCompleted.has(objectiveId)) {
      newCompleted.add(objectiveId);
      setCompletedObjectives(newCompleted);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);

      if (currentChallenge) {
        setCurrentChallenge((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            objectives: prev.objectives.map((obj) =>
              obj.id === objectiveId ? { ...obj, completed: true, progress: 100 } : obj
            ),
          };
        });
      }

      setPersonalStats((prev) => ({
        ...prev,
        objectivesCompleted: prev.objectivesCompleted + 1,
        xpEarned: prev.xpEarned + (currentChallenge?.objectives.find((o) => o.id === objectiveId)?.xp || 0),
      }));
    }
  };

  const confettiPieces = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.1,
    duration: 2 + Math.random() * 1,
  }));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAF8', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '2rem' }}
        >
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1a1a1a', fontFamily: 'Archivo Black', margin: '0 0 0.5rem 0' }}>
            Seasonal Challenges
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#666', margin: 0, fontFamily: 'Archivo' }}>
            Test your skills, climb the leaderboard, and earn exclusive rewards
          </p>
        </motion.div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e0e0e0' }}>
          {(['current', 'leaderboard', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '1rem 1.5rem',
                fontSize: '1rem',
                fontFamily: 'Archivo',
                fontWeight: 600,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: activeTab === tab ? '#1D9E75' : '#999',
                borderBottom: activeTab === tab ? '3px solid #1D9E75' : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              {tab === 'current' && 'Current Challenge'}
              {tab === 'leaderboard' && 'Leaderboard'}
              {tab === 'history' && 'History'}
            </button>
          ))}
        </div>

        {/* Current Challenge Tab */}
        {activeTab === 'current' && currentChallenge && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            {/* Challenge Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: `linear-gradient(135deg, ${getLaneColor('builder')} 0%, #1D9E75 100%)`,
                borderRadius: '1rem',
                padding: '2rem',
                color: 'white',
                marginBottom: '2rem',
                boxShadow: '0 10px 30px rgba(29, 158, 117, 0.2)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, fontFamily: 'Archivo Black' }}>
                    {currentChallenge.name}
                  </h2>
                  <p style={{ fontSize: '1.1rem', margin: '0.5rem 0 0 0', opacity: 0.95, fontFamily: 'Archivo' }}>
                    {currentChallenge.description}
                  </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⏱️</div>
                  <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, fontFamily: 'Archivo' }}>
                    {getTimeRemaining(currentChallenge.endDate)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆</div>
                  <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, fontFamily: 'Archivo' }}>
                    {currentChallenge.reward} XP Reward
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Personal Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                background: 'white',
                borderRadius: '1rem',
                padding: '2rem',
                marginBottom: '2rem',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
                border: '1px solid #f0f0f0',
              }}
            >
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 1.5rem 0', fontFamily: 'Archivo Black', color: '#1a1a1a' }}>
                Your Progress
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '0.5rem', border: '1px solid #f0f0f0' }}>
                  <p style={{ fontSize: '0.9rem', color: '#999', margin: '0 0 0.5rem 0', fontFamily: 'Archivo', fontWeight: 600 }}>
                    Current Rank
                  </p>
                  <p style={{ fontSize: '2rem', fontWeight: 900, margin: 0, color: '#1D9E75', fontFamily: 'Archivo Black' }}>
                    #{personalStats.rank}
                  </p>
                </div>
                <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '0.5rem', border: '1px solid #f0f0f0' }}>
                  <p style={{ fontSize: '0.9rem', color: '#999', margin: '0 0 0.5rem 0', fontFamily: 'Archivo', fontWeight: 600 }}>
                    XP This Month
                  </p>
                  <p style={{ fontSize: '2rem', fontWeight: 900, margin: 0, color: '#D85A30', fontFamily: 'Archivo Black' }}>
                    {personalStats.xpEarned}
                  </p>
                </div>
                <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '0.5rem', border: '1px solid #f0f0f0' }}>
                  <p style={{ fontSize: '0.9rem', color: '#999', margin: '0 0 0.5rem 0', fontFamily: 'Archivo', fontWeight: 600 }}>
                    Objectives Completed
                  </p>
                  <p style={{ fontSize: '2rem', fontWeight: 900, margin: 0, color: '#378ADD', fontFamily: 'Archivo Black' }}>
                    {personalStats.objectivesCompleted}/{personalStats.totalObjectives}
                  </p>
                </div>
              </div>
              {personalStats.achievements.length > 0 && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f0f0f0' }}>
                  <p style={{ fontSize: '0.9rem', color: '#999', margin: '0 0 0.75rem 0', fontFamily: 'Archivo', fontWeight: 600 }}>
                    Achievements Earned
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {personalStats.achievements.map((achievement, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                          borderRadius: '2rem',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: '#333',
                          fontFamily: 'Archivo',
                        }}
                      >
                        🏆 {achievement}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Objectives Grid */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 1.5rem 0', fontFamily: 'Archivo Black', color: '#1a1a1a' }}>
                Challenge Objectives
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {currentChallenge.objectives.map((objective, idx) => (
                  <motion.div
                    key={objective.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{
                      background: 'white',
                      borderRadius: '1rem',
                      padding: '1.5rem',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
                      border: completedObjectives.has(objective.id) ? '2px solid #1D9E75' : '1px solid #f0f0f0',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ fontSize: '2rem' }}>{objective.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, fontFamily: 'Archivo Black', color: '#1a1a1a' }}>
                            {objective.title}
                          </h4>
                          {completedObjectives.has(objective.id) && (
                            <span style={{ fontSize: '1.2rem' }}>✅</span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 0.75rem 0', fontFamily: 'Archivo' }}>
                          {objective.description}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                          <div style={{ flex: 1, height: '8px', background: '#f0f0f0', borderRadius: '4px', marginRight: '0.75rem', overflow: 'hidden' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${objective.progress}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              style={{
                                height: '100%',
                                background: completedObjectives.has(objective.id)
                                  ? 'linear-gradient(90deg, #1D9E75 0%, #2ab894 100%)'
                                  : 'linear-gradient(90deg, #D85A30 0%, #ff7a52 100%)',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#999', fontFamily: 'Archivo', whiteSpace: 'nowrap' }}>
                            {objective.progress}%
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#D85A30', fontFamily: 'Archivo' }}>
                            +{objective.xp} XP
                          </span>
                          {!completedObjectives.has(objective.id) && (
                            <button
                              onClick={() => handleObjectiveComplete(objective.id)}
                              style={{
                                padding: '0.5rem 1rem',
                                fontSize: '0.85rem',
                                fontFamily: 'Archivo',
                                fontWeight: 600,
                                border: 'none',
                                background: '#1D9E75',
                                color: 'white',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#15805f')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = '#1D9E75')}
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Lane-Specific Bonus */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                background: 'white',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
                border: '1px solid #f0f0f0',
              }}
            >
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 1.5rem 0', fontFamily: 'Archivo Black', color: '#1a1a1a' }}>
                🎁 Crew Lane Bonus Objectives
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {LANE_BONUS_OBJECTIVES.crew?.map((objective, idx) => (
                  <div
                    key={objective.id}
                    style={{
                      background: 'linear-gradient(135deg, #1D9E75 0%, #2ab894 100%)',
                      borderRadius: '1rem',
                      padding: '1.5rem',
                      color: 'white',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ fontSize: '2rem' }}>{objective.icon}</div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, fontFamily: 'Archivo Black' }}>
                          {objective.title}
                        </h4>
                        <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0 0', opacity: 0.95, fontFamily: 'Archivo' }}>
                          {objective.description}
                        </p>
                        <div style={{ marginTop: '1rem', fontSize: '1.2rem', fontWeight: 700, fontFamily: 'Archivo' }}>
                          +{objective.xp} XP
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <div style={{ background: 'white', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)' }}>
              {/* Top 3 Podium */}
              <div style={{ background: 'linear-gradient(135deg, #D85A30 0%, #ff7a52 100%)', padding: '2rem', color: 'white' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 2rem 0', fontFamily: 'Archivo Black', textAlign: 'center' }}>
                  🏆 Top Performers This Month
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  {leaderboard.slice(0, 3).map((entry, idx) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '1rem',
                        padding: '1.5rem',
                        textAlign: 'center',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                        {getMedalIcon(entry.rank)}
                      </div>
                      <p style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0.5rem 0', fontFamily: 'Archivo Black' }}>
                        {entry.userName}
                      </p>
                      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0', opacity: 0.95, fontFamily: 'Archivo' }}>
                        {entry.lane.charAt(0).toUpperCase() + entry.lane.slice(1)} Lane
                      </p>
                      <p style={{ fontSize: '1.8rem', fontWeight: 700, margin: '1rem 0 0 0', fontFamily: 'Archivo Black' }}>
                        {entry.xp} XP
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Full Leaderboard Table */}
              <div style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1.5rem 0', fontFamily: 'Archivo Black', color: '#1a1a1a' }}>
                  Full Ranking (Top 20)
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', fontFamily: 'Archivo', fontWeight: 700, color: '#999', fontSize: '0.9rem' }}>
                          Rank
                        </th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontFamily: 'Archivo', fontWeight: 700, color: '#999', fontSize: '0.9rem' }}>
                          Player
                        </th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontFamily: 'Archivo', fontWeight: 700, color: '#999', fontSize: '0.9rem' }}>
                          Lane
                        </th>
                        <th style={{ padding: '1rem', textAlign: 'right', fontFamily: 'Archivo', fontWeight: 700, color: '#999', fontSize: '0.9rem' }}>
                          XP
                        </th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontFamily: 'Archivo', fontWeight: 700, color: '#999', fontSize: '0.9rem' }}>
                          Progress
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry, idx) => (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          style={{
                            borderBottom: '1px solid #f0f0f0',
                            background: entry.rank <= 3 ? 'rgba(29, 158, 117, 0.05)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '1rem', fontFamily: 'Archivo', fontWeight: 700, color: entry.rank <= 3 ? '#1D9E75' : '#1a1a1a' }}>
                            {getMedalIcon(entry.rank)}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ fontSize: '1.5rem' }}>{entry.avatar}</div>
                              <p style={{ margin: 0, fontFamily: 'Archivo', fontWeight: 600, color: '#1a1a1a' }}>
                                {entry.userName}
                              </p>
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.4rem 0.8rem',
                                background: `${getLaneColor(entry.lane)}20`,
                                color: getLaneColor(entry.lane),
                                borderRadius: '0.4rem',
                                fontSize: '0.85rem',
                                fontFamily: 'Archivo',
                                fontWeight: 600,
                              }}
                            >
                              {entry.lane}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <p style={{ margin: 0, fontFamily: 'Archivo Black', fontWeight: 700, fontSize: '1.1rem', color: '#D85A30' }}>
                              {entry.xp}
                            </p>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontFamily: 'Archivo', fontWeight: 600, color: '#999', fontSize: '0.9rem' }}>
                              {entry.objectivesCompleted}/{entry.totalObjectives}
                            </p>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {HISTORICAL_CHALLENGES.map((challenge, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  style={{
                    background: 'white',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #f0f0f0',
                  }}
                >
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem 0', fontFamily: 'Archivo Black', color: '#1a1a1a' }}>
                      {challenge.name}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: '#999', margin: 0, fontFamily: 'Archivo' }}>
                      {challenge.year}
                    </p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #f0f0f0' }}>
                    <div>
                      <p style={{ fontSize: '0.8rem', color: '#999', margin: '0 0 0.25rem 0', fontFamily: 'Archivo', fontWeight: 600 }}>
                        Your Rank
                      </p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: '#D85A30', fontFamily: 'Archivo Black' }}>
                        #{challenge.userRank}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.8rem', color: '#999', margin: '0 0 0.25rem 0', fontFamily: 'Archivo', fontWeight: 600 }}>
                        XP Earned
                      </p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: '#378ADD', fontFamily: 'Archivo Black' }}>
                        {challenge.userXp}
                      </p>
                    </div>
                  </div>
                  {challenge.achievement && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '1rem',
                        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                        borderRadius: '0.5rem',
                        color: '#333',
                      }}
                    >
                      <span style={{ fontSize: '1.5rem' }}>🏆</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'Archivo' }}>
                        {challenge.achievement}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Confetti Animation */}
      <AnimatePresence>
        {showConfetti && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 9999 }}>
            {confettiPieces.map((piece) => (
              <motion.div
                key={piece.id}
                initial={{ opacity: 1, y: 0, x: `${piece.x}%` }}
                animate={{ opacity: 0, y: window.innerHeight + 100 }}
                transition={{ duration: piece.duration, delay: piece.delay, ease: 'easeIn' }}
                style={{
                  position: 'fixed',
                  fontSize: '1.5rem',
                  left: `${piece.x}%`,
                  top: 0,
                }}
              >
                🎉
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
