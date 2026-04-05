'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Volume2, VolumeX } from 'lucide-react';

type UrgencyTier = 'celebration' | 'good_news' | 'heads_up' | 'needs_you';

interface Notification {
  id: string;
  user_id: string;
  urgency_tier: UrgencyTier;
  title: string;
  body: string;
  action_label?: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationOrchestraProps {
  userId: string;
}

const TIER_CONFIG: Record<UrgencyTier, {
  color: string;
  borderColor: string;
  bgColor: string;
  icon: string;
  order: number;
  animationClass?: string;
}> = {
  celebration: {
    color: '#D4AF37',
    borderColor: '#D4AF37',
    bgColor: '#FFFBF0',
    icon: '🎉',
    order: 3,
    animationClass: 'shimmer',
  },
  good_news: {
    color: '#10B981',
    borderColor: '#10B981',
    bgColor: '#F0FDF4',
    icon: '✅',
    order: 2,
  },
  heads_up: {
    color: '#F59E0B',
    borderColor: '#F59E0B',
    bgColor: '#FFFBF0',
    icon: '⚡',
    order: 1,
  },
  needs_you: {
    color: '#EF4444',
    borderColor: '#EF4444',
    bgColor: '#FEF2F2',
    icon: '🔴',
    order: 0,
  },
};

const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export function NotificationOrchestra({ userId }: NotificationOrchestraProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize sound preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('notification-sound-enabled');
    if (stored !== null) {
      setSoundEnabled(stored === 'true');
    }
  }, []);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/v1/notifications?limit=50');
        if (response.ok) {
          const { notifications: data } = await response.json();
          setNotifications(data);
          setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const dismissNotification = (id: string) => {
    markAsRead(id);
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('notification-sound-enabled', String(newState));
  };

  // Group and sort notifications
  const groupedNotifications = notifications.reduce(
    (acc, notif) => {
      const tier = notif.urgency_tier;
      if (!acc[tier]) acc[tier] = [];
      acc[tier].push(notif);
      return acc;
    },
    {} as Record<UrgencyTier, Notification[]>
  );

  const sortedTiers = (
    Object.keys(TIER_CONFIG) as UrgencyTier[]
  ).sort((a, b) => TIER_CONFIG[a].order - TIER_CONFIG[b].order);

  const hasNotifications = notifications.length > 0;

  return (
    <>
      {/* Bell Icon Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell className="w-6 h-6 text-gray-700" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </motion.button>

      {/* Slide-out Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[400px] bg-white shadow-lg z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Notifications
                  </h2>
                  <p className="text-sm text-gray-600">
                    {hasNotifications
                      ? `${unreadCount} new message${unreadCount !== 1 ? 's' : ''}`
                      : 'All clear'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={toggleSound}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-5 h-5 text-gray-700" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-gray-400" />
                    )}
                  </motion.button>

                  <motion.button
                    onClick={() => setIsOpen(false)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-700" />
                  </motion.button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!hasNotifications ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full text-center py-12"
                  >
                    <div className="text-4xl mb-4">🌿</div>
                    <p className="text-gray-600 font-medium">
                      All clear! Your projects are running smoothly.
                    </p>
                  </motion.div>
                ) : (
                  sortedTiers.map((tier) =>
                    groupedNotifications[tier]?.map((notification, index) => {
                      const config = TIER_CONFIG[tier];
                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 400 }}
                          transition={{ delay: index * 0.1 }}
                          className={`p-4 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow ${
                            config.animationClass === 'shimmer'
                              ? 'shimmer-animation'
                              : ''
                          }`}
                          style={{
                            borderLeftColor: config.borderColor,
                            backgroundColor: config.bgColor,
                          }}
                          onClick={() => {
                            if (!notification.is_read) {
                              markAsRead(notification.id);
                            }
                          }}
                        >
                          {/* Top Row: Icon + Title + Close */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-start gap-2 flex-1">
                              <span className="text-xl flex-shrink-0">
                                {config.icon}
                              </span>
                              <h3 className="font-semibold text-gray-900 text-sm">
                                {notification.title}
                              </h3>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissNotification(notification.id);
                              }}
                              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                            >
                              <X className="w-4 h-4 text-gray-500" />
                            </motion.button>
                          </div>

                          {/* Body Text */}
                          <p className="text-sm text-gray-700 mb-3 pl-7">
                            {notification.body}
                          </p>

                          {/* Action Button (for needs_you) */}
                          {tier === 'needs_you' && notification.action_url && (
                            <motion.a
                              href={notification.action_url}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="block pl-7 mb-2 px-3 py-2 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600 transition-colors text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {notification.action_label || 'Review Solutions'}
                            </motion.a>
                          )}

                          {/* Timestamp */}
                          <p className="text-xs text-gray-500 pl-7">
                            {getRelativeTime(notification.created_at)}
                          </p>
                        </motion.div>
                      );
                    })
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Shimmer Animation Styles */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background: linear-gradient(
              90deg,
              #FFFBF0 0%,
              #D4AF37 50%,
              #FFFBF0 100%
            );
            background-size: 200% 100%;
          }
          100% {
            background: linear-gradient(
              90deg,
              #FFFBF0 0%,
              #D4AF37 50%,
              #FFFBF0 100%
            );
            background-size: 200% 100%;
            background-position: 200% 0;
          }
        }

        .shimmer-animation {
          animation: shimmer 2s ease-in-out;
        }
      `}</style>
    </>
  );
}
