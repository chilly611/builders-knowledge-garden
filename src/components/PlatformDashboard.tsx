'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface MorningBriefing {
  greeting: string;
  userLane: string;
  topPriority: string;
  weatherImpact: string;
}

interface HeroCard {
  title: string;
  subtitle: string;
  action: string;
  icon: string;
  metrics?: {
    label: string;
    value: string | number;
  }[];
}

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface CrossSurfaceBridge {
  id: string;
  from_surface: string;
  to_surface: string;
  action: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface Activity {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  icon: string;
}

interface SurfaceCard {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  badge?: string;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  reward: string;
  icon: string;
}

interface NewsItem {
  id: string;
  title: string;
  category: string;
  timestamp: string;
}

// Brand colors
const COLORS = {
  green: '#1D9E75',
  gold: '#D85A30',
  red: '#E8443A',
  purple: '#7F77DD',
  blue: '#378ADD',
  orange: '#BA7517',
  light_bg: '#FAFAF8',
  border: '#E8E8E6',
  text_dark: '#1A1A1A',
  text_light: '#666666',
};

const LANE_COLORS: Record<string, string> = {
  dreamer: '#FF6B9D',
  builder: COLORS.green,
  specialist: COLORS.purple,
  merchant: COLORS.gold,
  ally: COLORS.blue,
  crew: COLORS.orange,
  fleet: '#2DD4BF',
  machine: '#A78BFA',
};

// XP Widget Component
const XPWidget: React.FC<{
  level: number;
  xp: number;
  maxXp: number;
  streak: number;
  questProgress: number;
}> = ({ level, xp, maxXp, streak, questProgress }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    style={{
      background: COLORS.light_bg,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
    }}
  >
    <div style={{ marginBottom: '20px' }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: `conic-gradient(${COLORS.purple} 0deg ${(xp / maxXp) * 360}deg, ${COLORS.border} ${(xp / maxXp) * 360}deg 360deg)`,
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          fontWeight: '700',
          color: COLORS.purple,
        }}
      >
        {level}
      </motion.div>
      <div style={{ fontSize: '12px', color: COLORS.text_light, marginBottom: '8px' }}>
        Level Progress
      </div>
      <div
        style={{
          width: '100%',
          height: '4px',
          background: COLORS.border,
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(xp / maxXp) * 100}%` }}
          transition={{ duration: 1 }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${COLORS.purple}, ${COLORS.blue})`,
          }}
        />
      </div>
      <div style={{ fontSize: '11px', color: COLORS.text_light, marginTop: '4px' }}>
        {xp} / {maxXp} XP
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      <div style={{ background: 'white', borderRadius: '8px', padding: '12px' }}>
        <div style={{ fontSize: '20px', marginBottom: '4px' }}>🔥</div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.gold }}>
          {streak}
        </div>
        <div style={{ fontSize: '10px', color: COLORS.text_light }}>Day Streak</div>
      </div>
      <div style={{ background: 'white', borderRadius: '8px', padding: '12px' }}>
        <div style={{ fontSize: '20px', marginBottom: '4px' }}>⭐</div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.blue }}>
          {questProgress}%
        </div>
        <div style={{ fontSize: '10px', color: COLORS.text_light }}>Quest Done</div>
      </div>
    </div>
  </motion.div>
);

// Notifications Widget Component
const NotificationsWidget: React.FC<{ notifications: Notification[] }> = ({ notifications }) => {
  const notifColors: Record<string, { bg: string; text: string }> = {
    success: { bg: '#E8F5E9', text: COLORS.green },
    warning: { bg: '#FFF3E0', text: COLORS.orange },
    info: { bg: '#E3F2FD', text: COLORS.blue },
    error: { bg: '#FFEBEE', text: COLORS.red },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      style={{
        background: COLORS.light_bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '16px' }}>
        🔔 Recent Notifications
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {notifications.slice(0, 5).map((notif, idx) => {
          const colors = notifColors[notif.type];
          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{
                background: colors.bg,
                border: `1px solid ${colors.text}`,
                borderRadius: '8px',
                padding: '10px 12px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '600', color: colors.text }}>
                {notif.title}
              </div>
              <div style={{ fontSize: '11px', color: COLORS.text_light, marginTop: '2px' }}>
                {notif.message}
              </div>
              <div style={{ fontSize: '10px', color: COLORS.text_light, marginTop: '4px' }}>
                {notif.timestamp}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Cross-Surface Bridges Component
const BridgesWidget: React.FC<{ bridges: CrossSurfaceBridge[] }> = ({ bridges }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.2 }}
    style={{
      background: COLORS.light_bg,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '12px',
      padding: '20px',
    }}
  >
    <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '16px' }}>
      🌉 Suggested Next Steps
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {bridges.slice(0, 3).map((bridge, idx) => (
        <motion.div
          key={bridge.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          style={{
            background: 'white',
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: '600', color: COLORS.text_dark, marginBottom: '4px' }}>
            {bridge.action}
          </div>
          <div style={{ fontSize: '11px', color: COLORS.text_light }}>
            {bridge.from_surface} → {bridge.to_surface}
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

// Activity Feed Component
const ActivityFeed: React.FC<{ activities: Activity[] }> = ({ activities }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.3 }}
    style={{
      background: COLORS.light_bg,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
    }}
  >
    <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '16px' }}>
      📊 Platform Activity
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {activities.slice(0, 10).map((activity, idx) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          style={{
            display: 'flex',
            gap: '12px',
            paddingBottom: '12px',
            borderBottom: idx < 9 ? `1px solid ${COLORS.border}` : 'none',
          }}
        >
          <div style={{ fontSize: '20px', minWidth: '24px' }}>
            {activity.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: COLORS.text_dark }}>
              <span style={{ fontWeight: '600' }}>{activity.actor}</span>
              {' '}
              {activity.action}
              {' '}
              <span style={{ fontWeight: '600' }}>{activity.target}</span>
            </div>
            <div style={{ fontSize: '11px', color: COLORS.text_light, marginTop: '2px' }}>
              {activity.timestamp}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

// Achievement Showcase Component
const AchievementShowcase: React.FC<{ achievements: Achievement[] }> = ({ achievements }) => {
  const rarityColors: Record<string, string> = {
    common: COLORS.blue,
    rare: COLORS.purple,
    epic: COLORS.gold,
    legendary: COLORS.red,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      style={{
        background: COLORS.light_bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '16px' }}>
        🏆 Latest Achievements
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
        {achievements.slice(0, 6).map((achievement, idx) => {
          const rarityColor = rarityColors[achievement.rarity];
          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.08 }}
              whileHover={{ scale: 1.05 }}
              style={{
                background: 'white',
                border: `2px solid ${rarityColor}`,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>
                {achievement.icon}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: COLORS.text_dark }}>
                {achievement.name}
              </div>
              <div
                style={{
                  fontSize: '9px',
                  color: rarityColor,
                  fontWeight: '700',
                  marginTop: '4px',
                  textTransform: 'uppercase',
                }}
              >
                {achievement.rarity}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Surface Navigation Card Component
const SurfaceCard: React.FC<{ surface: SurfaceCard; onClick: () => void }> = ({ surface, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -8, boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }}
    onClick={onClick}
    style={{
      background: COLORS.light_bg,
      border: `2px solid ${surface.color}`,
      borderRadius: '12px',
      padding: '24px',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: surface.color, opacity: 0.04 }} />
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>
        {surface.icon}
      </div>
      <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '6px' }}>
        {surface.name}
      </div>
      <div style={{ fontSize: '12px', color: COLORS.text_light, lineHeight: '1.4', marginBottom: '12px' }}>
        {surface.description}
      </div>
      {surface.badge && (
        <div
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            background: surface.color,
            color: 'white',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: '700',
          }}
        >
          {surface.badge}
        </div>
      )}
    </div>
  </motion.div>
);

// Seasonal Challenge Component
const SeasonalChallenge: React.FC<{ challenge: Challenge }> = ({ challenge }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.5 }}
    style={{
      background: COLORS.light_bg,
      border: `2px solid ${COLORS.gold}`,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
    }}
  >
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div style={{ fontSize: '40px' }}>
        {challenge.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '4px' }}>
          {challenge.name}
        </div>
        <div style={{ fontSize: '12px', color: COLORS.text_light, marginBottom: '8px' }}>
          {challenge.description}
        </div>
        <div
          style={{
            width: '100%',
            height: '6px',
            background: COLORS.border,
            borderRadius: '3px',
            overflow: 'hidden',
            marginBottom: '6px',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
            transition={{ duration: 1 }}
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.red})`,
            }}
          />
        </div>
        <div style={{ fontSize: '11px', color: COLORS.text_light }}>
          {challenge.progress} / {challenge.target} — Reward: {challenge.reward}
        </div>
      </div>
    </div>
  </motion.div>
);

// Industry News Component
const IndustryNews: React.FC<{ news: NewsItem[] }> = ({ news }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.6 }}
    style={{
      background: COLORS.light_bg,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
    }}
  >
    <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '16px' }}>
      📰 Industry News
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {news.slice(0, 3).map((item, idx) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          style={{
            paddingBottom: '12px',
            borderBottom: idx < 2 ? `1px solid ${COLORS.border}` : 'none',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: '600', color: COLORS.text_dark, marginBottom: '4px' }}>
            {item.title}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 6px',
                background: COLORS.blue,
                color: 'white',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: '600',
              }}
            >
              {item.category}
            </span>
            <span style={{ fontSize: '11px', color: COLORS.text_light }}>
              {item.timestamp}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

// Platform Stats Footer
const PlatformStats: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.7 }}
    style={{
      background: `linear-gradient(135deg, ${COLORS.green} 0%, ${COLORS.blue} 100%)`,
      color: 'white',
      padding: '24px',
      borderRadius: '12px',
      textAlign: 'center',
    }}
  >
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
      <div>
        <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
          8,247
        </div>
        <div style={{ fontSize: '12px', opacity: 0.9 }}>
          Active Users
        </div>
      </div>
      <div>
        <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
          1,142
        </div>
        <div style={{ fontSize: '12px', opacity: 0.9 }}>
          Active Projects
        </div>
      </div>
      <div>
        <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
          42,891
        </div>
        <div style={{ fontSize: '12px', opacity: 0.9 }}>
          Knowledge Entities
        </div>
      </div>
    </div>
  </motion.div>
);

// Demo Mode Banner Component
const DemoModeBanner: React.FC<{ onExit: () => void }> = ({ onExit }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    style={{
      background: COLORS.purple,
      color: 'white',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: '6px',
      marginBottom: '24px',
    }}
  >
    <div style={{ fontSize: '13px', fontWeight: '600' }}>
      🎭 You're exploring BKG in demo mode with sample data
    </div>
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onExit}
      style={{
        padding: '6px 12px',
        background: 'rgba(255,255,255,0.2)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        fontFamily: 'Archivo, sans-serif',
      }}
    >
      Exit Demo
    </motion.button>
  </motion.div>
);

// Main PlatformDashboard Component
export const PlatformDashboard: React.FC = () => {
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [userLane, setUserLane] = useState<string>('builder');
  const [userName, setUserName] = useState<string>('Alex');

  // Mock data
  const briefing: MorningBriefing = {
    greeting: 'Good morning, Alex',
    userLane: 'builder',
    topPriority: 'Review RFI submissions for Downtown Plaza',
    weatherImpact: 'Clear skies — ideal for site inspections today',
  };

  const heroCards: Record<string, HeroCard> = {
    dreamer: {
      title: 'Continue Your Dream',
      subtitle: 'Pick up where you left off',
      action: 'View Dreams',
      icon: '✨',
      metrics: [
        { label: 'Active Dreams', value: 7 },
        { label: 'This Week', value: 2 },
      ],
    },
    builder: {
      title: 'Your Active Projects',
      subtitle: 'Manage your portfolio',
      action: 'View Projects',
      icon: '🏗️',
      metrics: [
        { label: 'Active', value: 3 },
        { label: 'On Track', value: '87%' },
      ],
    },
    specialist: {
      title: 'Knowledge Requests',
      subtitle: 'Answer and earn XP',
      action: 'View Queue',
      icon: '🧠',
      metrics: [
        { label: 'Pending', value: 5 },
        { label: 'Waiting', value: 2 },
      ],
    },
    merchant: {
      title: 'Business Pulse',
      subtitle: 'Revenue & insights',
      action: 'View Metrics',
      icon: '💰',
      metrics: [
        { label: 'This Month', value: '$124K' },
        { label: 'Growth', value: '+12%' },
      ],
    },
    ally: {
      title: 'Your Network',
      subtitle: 'Connections & collaborations',
      action: 'View Network',
      icon: '🤝',
      metrics: [
        { label: 'Connections', value: 48 },
        { label: 'New', value: 3 },
      ],
    },
    crew: {
      title: "Today's Tasks",
      subtitle: 'Get things done',
      action: 'View Tasks',
      icon: '✅',
      metrics: [
        { label: 'Due Today', value: 8 },
        { label: 'Completed', value: '62%' },
      ],
    },
    fleet: {
      title: 'Fleet Status',
      subtitle: 'Equipment & resources',
      action: 'View Fleet',
      icon: '🚚',
      metrics: [
        { label: 'Active', value: 12 },
        { label: 'Available', value: 11 },
      ],
    },
    machine: {
      title: 'API Activity',
      subtitle: 'Agent dashboard',
      action: 'View Dashboard',
      icon: '⚙️',
      metrics: [
        { label: 'Requests', value: '2.4K' },
        { label: 'Health', value: '99.8%' },
      ],
    },
  };

  const notifications: Notification[] = [
    {
      id: '1',
      type: 'success',
      title: 'Project Approved',
      message: 'Downtown Plaza Phase 2 approved by stakeholders',
      timestamp: '2 hours ago',
      read: true,
    },
    {
      id: '2',
      type: 'warning',
      title: 'Budget Alert',
      message: 'Riverside Residences budget utilization at 85%',
      timestamp: '4 hours ago',
      read: false,
    },
    {
      id: '3',
      type: 'info',
      title: 'New Collaboration',
      message: 'Jessica invited you to Tech Hub Office project',
      timestamp: '1 day ago',
      read: true,
    },
    {
      id: '4',
      type: 'error',
      title: 'RFI Overdue',
      message: '2 RFIs require your response',
      timestamp: '2 days ago',
      read: false,
    },
    {
      id: '5',
      type: 'info',
      title: 'Team Update',
      message: 'Sarah joined your Builder team',
      timestamp: '3 days ago',
      read: true,
    },
  ];

  const bridges: CrossSurfaceBridge[] = [
    {
      id: '1',
      from_surface: 'Build',
      to_surface: 'Knowledge',
      action: 'Document construction patterns',
      reason: 'From your latest project learnings',
      priority: 'high',
    },
    {
      id: '2',
      from_surface: 'Build',
      to_surface: 'Marketplace',
      action: 'Share vendor recommendations',
      reason: 'Help others find quality suppliers',
      priority: 'medium',
    },
    {
      id: '3',
      from_surface: 'Dream',
      to_surface: 'Build',
      action: 'Start project from sketch',
      reason: 'Your "Modern Office Complex" concept',
      priority: 'high',
    },
  ];

  const achievements: Achievement[] = [
    {
      id: '1',
      name: 'First Project',
      description: 'Completed your first project',
      icon: '🏅',
      unlockedAt: '3 months ago',
      rarity: 'common',
    },
    {
      id: '2',
      name: 'Team Builder',
      description: 'Assembled a team of 10+ members',
      icon: '👥',
      unlockedAt: '1 month ago',
      rarity: 'rare',
    },
    {
      id: '3',
      name: 'Budget Wizard',
      description: 'Completed 3 projects under budget',
      icon: '💎',
      unlockedAt: '2 weeks ago',
      rarity: 'epic',
    },
    {
      id: '4',
      name: 'Quick Thinker',
      description: 'Resolved 10 RFIs in record time',
      icon: '⚡',
      unlockedAt: '1 week ago',
      rarity: 'rare',
    },
    {
      id: '5',
      name: 'Knowledge Sage',
      description: 'Answered 50 knowledge questions',
      icon: '🎓',
      unlockedAt: '5 days ago',
      rarity: 'epic',
    },
    {
      id: '6',
      name: 'Network Master',
      description: 'Built network of 50+ connections',
      icon: '🌐',
      unlockedAt: '2 days ago',
      rarity: 'legendary',
    },
  ];

  const activities: Activity[] = [
    {
      id: '1',
      actor: 'You',
      action: 'completed',
      target: 'Foundation Phase - Downtown Plaza',
      timestamp: '2 hours ago',
      icon: '✅',
    },
    {
      id: '2',
      actor: 'Mike Chen',
      action: 'approved',
      target: 'Change Order #CC-042',
      timestamp: '4 hours ago',
      icon: '👍',
    },
    {
      id: '3',
      actor: 'Sarah Park',
      action: 'submitted',
      target: '3 RFIs for Riverside Residences',
      timestamp: 'Today',
      icon: '📋',
    },
    {
      id: '4',
      actor: 'Design Team',
      action: 'shared',
      target: 'Updated architectural drawings',
      timestamp: 'Today',
      icon: '📐',
    },
    {
      id: '5',
      actor: 'You',
      action: 'scheduled',
      target: 'Safety Inspection - Apr 12',
      timestamp: 'Yesterday',
      icon: '📅',
    },
    {
      id: '6',
      actor: 'Procurement',
      action: 'ordered',
      target: 'Steel reinforcement materials',
      timestamp: 'Yesterday',
      icon: '📦',
    },
    {
      id: '7',
      actor: 'Alex Rodriguez',
      action: 'joined',
      target: 'Tech Hub Office project',
      timestamp: '2 days ago',
      icon: '🚀',
    },
    {
      id: '8',
      actor: 'You',
      action: 'created',
      target: 'Tech Hub Office project',
      timestamp: '2 days ago',
      icon: '🎯',
    },
    {
      id: '9',
      actor: 'Quality Assurance',
      action: 'flagged',
      target: 'Framing inspection issues',
      timestamp: '3 days ago',
      icon: '⚠️',
    },
    {
      id: '10',
      actor: 'Finance',
      action: 'processed',
      target: '$250K project payment',
      timestamp: '3 days ago',
      icon: '💳',
    },
  ];

  const surfaces: SurfaceCard[] = [
    {
      id: 'dream',
      name: 'Dream',
      description: 'Capture ideas and visualize visions',
      icon: '✨',
      color: '#FF6B9D',
    },
    {
      id: 'knowledge',
      name: 'Knowledge',
      description: 'Learn, share & collaborate',
      icon: '🧠',
      color: COLORS.purple,
    },
    {
      id: 'build',
      name: 'Build',
      description: 'Plan, execute & deliver projects',
      icon: '🏗️',
      color: COLORS.green,
      badge: '3 active',
    },
    {
      id: 'killerapp',
      name: 'KillerApp',
      description: 'Execute custom business logic',
      icon: '⚡',
      color: COLORS.blue,
    },
    {
      id: 'marketplace',
      name: 'Marketplace',
      description: 'Buy, sell & trade resources',
      icon: '💰',
      color: COLORS.gold,
    },
    {
      id: 'field',
      name: 'Field',
      description: 'Coordinate on-site operations',
      icon: '📍',
      color: COLORS.orange,
    },
  ];

  const challenge: Challenge = {
    id: '1',
    name: 'April Challenge: Budget Master',
    description: 'Keep all projects within 5% of budget',
    progress: 2,
    target: 3,
    reward: '500 XP + Gold Badge',
    icon: '🎯',
  };

  const news: NewsItem[] = [
    {
      id: '1',
      title: 'New Building Code Updates for 2026',
      category: 'Compliance',
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      title: 'Steel Prices Decline 3% This Quarter',
      category: 'Market',
      timestamp: '4 hours ago',
    },
    {
      id: '3',
      title: 'Labor Shortage Impacts Project Timelines',
      category: 'Industry',
      timestamp: '1 day ago',
    },
  ];

  const heroCard = heroCards[userLane];

  return (
    <div
      style={{
        background: 'white',
        minHeight: '100vh',
        fontFamily: 'Archivo, sans-serif',
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: `linear-gradient(135deg, ${LANE_COLORS[userLane]} 0%, ${COLORS.blue} 100%)`,
          color: 'white',
          padding: '24px',
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 4px 0' }}>
            {briefing.greeting}
          </h1>
          <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
            {briefing.topPriority}
          </p>
        </div>
      </motion.div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Demo Mode Banner */}
        {demoMode && (
          <DemoModeBanner onExit={() => setDemoMode(false)} />
        )}

        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            background: `linear-gradient(135deg, ${LANE_COLORS[userLane]} 0%, ${LANE_COLORS[userLane]}dd 100%)`,
            color: 'white',
            borderRadius: '12px',
            padding: '32px',
            marginBottom: '32px',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 8px 0' }}>
              {heroCard.icon} {heroCard.title}
            </h2>
            <p style={{ fontSize: '14px', opacity: 0.9, margin: '0 0 16px 0' }}>
              {heroCard.subtitle}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '12px 24px',
                background: 'white',
                color: LANE_COLORS[userLane],
                border: 'none',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                fontFamily: 'Archivo, sans-serif',
              }}
            >
              {heroCard.action}
            </motion.button>
          </div>
          {heroCard.metrics && (
            <div style={{ display: 'flex', gap: '24px' }}>
              {heroCard.metrics.map((metric, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  style={{ textAlign: 'center' }}
                >
                  <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                    {metric.value}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>
                    {metric.label}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* 3-Column Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            marginBottom: '32px',
          }}
        >
          <XPWidget level={7} xp={2840} maxXp={5000} streak={12} questProgress={68} />
          <NotificationsWidget notifications={notifications} />
          <BridgesWidget bridges={bridges} />
        </motion.div>

        {/* Activity Feed */}
        <ActivityFeed activities={activities} />

        {/* Achievement Showcase */}
        <AchievementShowcase achievements={achievements} />

        {/* Seasonal Challenge */}
        <SeasonalChallenge challenge={challenge} />

        {/* Industry News */}
        <IndustryNews news={news} />

        {/* Surface Navigation Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          style={{
            marginBottom: '32px',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '16px' }}>
            🗺️ Explore All Surfaces
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {surfaces.map((surface, idx) => (
              <motion.div
                key={surface.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 + idx * 0.05 }}
              >
                <SurfaceCard
                  surface={surface}
                  onClick={() => console.log(`Navigate to ${surface.name}`)}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Platform Stats Footer */}
        <PlatformStats />
      </div>
    </div>
  );
};

export default PlatformDashboard;
