"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Toast {
  id: string;
  message: string;
  type: "xp" | "achievement" | "knowledge" | "celebration";
  icon?: string;
  duration?: number;
}

interface GamificationContextType {
  // XP System
  xp: number;
  level: string;
  xpToNextLevel: number;

  // Streak System
  streak: number;

  // Achievements
  achievements: string[];

  // Actions
  addXP: (amount: number, reason: string) => void;
  unlockAchievement: (id: string) => void;
  showToast: (toast: Omit<Toast, "id">) => void;

  // Sound
  soundEnabled: boolean;
  toggleSound: () => void;
}

// Level definitions: [levelName, maxXP, colorClass]
const LEVEL_TIERS = [
  { name: "Apprentice", maxXp: 500, color: "#666666" },
  { name: "Builder", maxXp: 2000, color: "#1D9E75" },
  { name: "Craftsman", maxXp: 5000, color: "#D85A30" },
  { name: "Master", maxXp: 15000, color: "#7F77DD" },
  { name: "Architect", maxXp: Infinity, color: "#E8443A" },
];

const ACHIEVEMENTS = {
  "first-dream": {
    id: "first-dream",
    name: "First Dream",
    description: "Use any dream builder",
    icon: "✨",
  },
  explorer: {
    id: "explorer",
    name: "Explorer",
    description: "Visit 5 different dream builders",
    icon: "🗺️",
  },
  architect: {
    id: "architect",
    name: "Architect",
    description: "Complete 3 dreams",
    icon: "🏗️",
  },
  "knowledge-seeker": {
    id: "knowledge-seeker",
    name: "Knowledge Seeker",
    description: "Browse 10 knowledge entities",
    icon: "📚",
  },
  "code-cracker": {
    id: "code-cracker",
    name: "Code Cracker",
    description: "Review building codes",
    icon: "📋",
  },
  "speed-builder": {
    id: "speed-builder",
    name: "Speed Builder",
    description: "Complete dream in under 2 minutes",
    icon: "⚡",
  },
  "social-builder": {
    id: "social-builder",
    name: "Social Builder",
    description: "Use the Collider feature",
    icon: "👥",
  },
  "night-owl": {
    id: "night-owl",
    name: "Night Owl",
    description: "Use app after 10pm",
    icon: "🌙",
  },
  "early-bird": {
    id: "early-bird",
    name: "Early Bird",
    description: "Use app before 7am",
    icon: "🌅",
  },
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

interface GamificationState {
  xp: number;
  achievements: string[];
  streak: number;
  toasts: Toast[];
  soundEnabled: boolean;
}

type GamificationAction =
  | { type: "ADD_XP"; payload: number }
  | { type: "UNLOCK_ACHIEVEMENT"; payload: string }
  | { type: "ADD_TOAST"; payload: Toast }
  | { type: "REMOVE_TOAST"; payload: string }
  | { type: "UPDATE_STREAK"; payload: number }
  | { type: "TOGGLE_SOUND" }
  | {
      type: "HYDRATE";
      payload: {
        xp: number;
        achievements: string[];
        streak: number;
        soundEnabled: boolean;
      };
    };

const initialState: GamificationState = {
  xp: 0,
  achievements: [],
  streak: 0,
  toasts: [],
  soundEnabled: true,
};

function gamificationReducer(
  state: GamificationState,
  action: GamificationAction
): GamificationState {
  switch (action.type) {
    case "ADD_XP":
      return { ...state, xp: state.xp + action.payload };

    case "UNLOCK_ACHIEVEMENT":
      if (state.achievements.includes(action.payload)) {
        return state; // Already unlocked
      }
      return {
        ...state,
        achievements: [...state.achievements, action.payload],
      };

    case "ADD_TOAST":
      // Keep only the last 3 toasts
      const newToasts = [...state.toasts, action.payload];
      if (newToasts.length > 3) {
        newToasts.shift();
      }
      return { ...state, toasts: newToasts };

    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      };

    case "UPDATE_STREAK":
      return { ...state, streak: action.payload };

    case "TOGGLE_SOUND":
      return { ...state, soundEnabled: !state.soundEnabled };

    case "HYDRATE":
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const GamificationContext = createContext<GamificationContextType | undefined>(
  undefined
);

// Safe default for SSG / pages rendered outside the provider
const GAMIFICATION_DEFAULTS: GamificationContextType = {
  xp: 0,
  level: "Apprentice",
  xpToNextLevel: 500,
  streak: 0,
  achievements: [],
  addXP: () => {},
  unlockAchievement: () => {},
  showToast: () => {},
  soundEnabled: false,
  toggleSound: () => {},
};

export function useGamification() {
  const context = useContext(GamificationContext);
  // Return safe defaults during SSG or when rendered outside provider
  if (!context) return GAMIFICATION_DEFAULTS;
  return context;
}

// ============================================================================
// HELPER: Calculate current level from XP
// ============================================================================

function getLevelFromXp(xp: number): {
  level: string;
  levelIndex: number;
  xpToNextLevel: number;
} {
  let currentXp = 0;

  for (let i = 0; i < LEVEL_TIERS.length; i++) {
    const tier = LEVEL_TIERS[i];
    const tierXpRange = tier.maxXp - currentXp;

    if (xp < tier.maxXp) {
      return {
        level: tier.name,
        levelIndex: i,
        xpToNextLevel: Math.max(0, tier.maxXp - xp),
      };
    }

    currentXp = tier.maxXp;
  }

  // Max level (Architect)
  return {
    level: "Architect",
    levelIndex: LEVEL_TIERS.length - 1,
    xpToNextLevel: 0,
  };
}

// ============================================================================
// AUDIO: Web Audio API Sound Generator
// ============================================================================

class GameSoundGenerator {
  private audioContext: AudioContext | null = null;

  private ensureAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Play a simple oscillator-based sound
   * frequencies: array of frequencies to play
   * duration: duration in seconds
   */
  private playTone(frequencies: number[], duration: number = 0.3) {
    try {
      const ctx = this.ensureAudioContext();
      const now = ctx.currentTime;
      const endTime = now + duration;

      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, endTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * (duration / frequencies.length));
        osc.stop(endTime);
      });
    } catch (error) {
      console.log("Audio context error (expected in some browsers):", error);
    }
  }

  xpGain() {
    // Ascending two-note chime
    this.playTone([523, 659], 0.3); // C5, E5
  }

  achievement() {
    // Triumphant chord (major triad)
    this.playTone([262, 330, 392], 0.5); // C4, E4, G4
  }

  click() {
    // Soft tick
    this.playTone([800], 0.1);
  }

  error() {
    // Low buzz
    this.playTone([110], 0.3); // A2
  }

  levelUp() {
    // Ascending scale
    this.playTone([262, 330, 392, 523], 0.6); // C4, E4, G4, C5
  }
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function GamificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(gamificationReducer, initialState);
  const [mounted, setMounted] = useState(false);
  const soundGenerator = React.useRef(new GameSoundGenerator());

  // ===== Hydrate from localStorage on mount =====
  useEffect(() => {
    try {
      const savedXp = localStorage.getItem("bkg_xp");
      const savedAchievements = localStorage.getItem("bkg_achievements");
      const savedStreakCount = localStorage.getItem("bkg_streak_count");
      const savedStreakDate = localStorage.getItem("bkg_streak_last_date");
      const savedSoundMuted = localStorage.getItem("bkg_sound_muted");

      const xp = savedXp ? parseInt(savedXp, 10) : 0;
      const achievements = savedAchievements ? JSON.parse(savedAchievements) : [];
      const soundEnabled = savedSoundMuted ? !JSON.parse(savedSoundMuted) : true;

      // Calculate streak: check if last visit was yesterday, today, or older
      const today = new Date().toDateString();
      const lastDate = savedStreakDate ? new Date(savedStreakDate).toDateString() : null;
      let streak = savedStreakCount ? parseInt(savedStreakCount, 10) : 1;

      if (lastDate && lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastDate === yesterday.toDateString()) {
          streak = streak + 1;
        } else {
          streak = 1; // Reset if gap > 1 day
        }
      }

      dispatch({
        type: "HYDRATE",
        payload: { xp, achievements, streak, soundEnabled },
      });

      // Update streak date to today
      localStorage.setItem("bkg_streak_last_date", today);
      localStorage.setItem("bkg_streak_count", streak.toString());
    } catch (error) {
      console.error("Failed to hydrate gamification state:", error);
    }

    setMounted(true);
  }, []);

  // ===== Persist XP to localStorage =====
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem("bkg_xp", state.xp.toString());
      } catch (error) {
        console.error("Failed to save XP:", error);
      }
    }
  }, [state.xp, mounted]);

  // ===== Persist achievements to localStorage =====
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem("bkg_achievements", JSON.stringify(state.achievements));
      } catch (error) {
        console.error("Failed to save achievements:", error);
      }
    }
  }, [state.achievements, mounted]);

  // ===== Persist sound preference to localStorage =====
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem("bkg_sound_muted", (!state.soundEnabled).toString());
      } catch (error) {
        console.error("Failed to save sound preference:", error);
      }
    }
  }, [state.soundEnabled, mounted]);

  // ===== Get computed level info =====
  const levelInfo = getLevelFromXp(state.xp);

  // ===== Add XP and show toast =====
  const addXP = useCallback(
    (amount: number, reason: string) => {
      dispatch({ type: "ADD_XP", payload: amount });

      const toastId = `xp-${Date.now()}`;
      const oldLevel = levelInfo.level;
      const newLevelInfo = getLevelFromXp(state.xp + amount);

      // Show XP gained toast
      dispatch({
        type: "ADD_TOAST",
        payload: {
          id: toastId,
          message: `+${amount} XP${reason ? ` (${reason})` : ""}`,
          type: "xp",
          icon: "⭐",
          duration: 3000,
        },
      });

      // Play sound
      if (state.soundEnabled) {
        soundGenerator.current.xpGain();
      }

      // Check for level up
      if (newLevelInfo.level !== oldLevel) {
        setTimeout(() => {
          const levelUpId = `levelup-${Date.now()}`;
          dispatch({
            type: "ADD_TOAST",
            payload: {
              id: levelUpId,
              message: `Level Up! You are now a ${newLevelInfo.level}`,
              type: "celebration",
              icon: "🎉",
              duration: 4000,
            },
          });

          if (state.soundEnabled) {
            soundGenerator.current.levelUp();
          }
        }, 300);
      }
    },
    [state.xp, state.soundEnabled, levelInfo.level]
  );

  // ===== Unlock achievement =====
  const unlockAchievement = useCallback((achievementId: string) => {
    if (state.achievements.includes(achievementId)) {
      return; // Already unlocked
    }

    dispatch({ type: "UNLOCK_ACHIEVEMENT", payload: achievementId });

    const achievement = ACHIEVEMENTS[achievementId as keyof typeof ACHIEVEMENTS];
    if (achievement) {
      const achievementId = `ach-${Date.now()}`;
      dispatch({
        type: "ADD_TOAST",
        payload: {
          id: achievementId,
          message: `${achievement.icon} ${achievement.name}: ${achievement.description}`,
          type: "achievement",
          duration: 4000,
        },
      });

      if (state.soundEnabled) {
        soundGenerator.current.achievement();
      }
    }
  }, [state.achievements, state.soundEnabled]);

  // ===== Show custom toast =====
  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const toastId = `toast-${Date.now()}-${Math.random()}`;
    dispatch({
      type: "ADD_TOAST",
      payload: {
        ...toast,
        id: toastId,
        duration: toast.duration || 3000,
      },
    });

    // Auto-dismiss toast after duration
    if (toast.duration !== undefined) {
      setTimeout(() => {
        dispatch({ type: "REMOVE_TOAST", payload: toastId });
      }, toast.duration);
    }
  }, []);

  // ===== Toggle sound =====
  const toggleSound = useCallback(() => {
    dispatch({ type: "TOGGLE_SOUND" });
    if (state.soundEnabled) {
      soundGenerator.current.click();
    }
  }, [state.soundEnabled]);

  // ===== Auto-dismiss toasts =====
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    state.toasts.forEach((toast) => {
      const duration = toast.duration || 3000;
      const timer = setTimeout(() => {
        dispatch({ type: "REMOVE_TOAST", payload: toast.id });
      }, duration);
      timers.push(timer);
    });

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [state.toasts]);

  const value: GamificationContextType = {
    xp: state.xp,
    level: levelInfo.level,
    xpToNextLevel: levelInfo.xpToNextLevel,
    streak: state.streak,
    achievements: state.achievements,
    addXP,
    unlockAchievement,
    showToast,
    soundEnabled: state.soundEnabled,
    toggleSound,
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <GamificationContext.Provider value={value}>
      {children}
      <ToastContainer toasts={state.toasts} />
    </GamificationContext.Provider>
  );
}

// ============================================================================
// TOAST CONTAINER COMPONENT
// ============================================================================

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-6 right-6 z-50 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast, index) => (
          <Toast key={toast.id} toast={toast} index={index} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// INDIVIDUAL TOAST COMPONENT
// ============================================================================

function Toast({
  toast,
  index,
}: {
  toast: Toast;
  index: number;
}) {
  const getToastStyle = () => {
    switch (toast.type) {
      case "xp":
        return {
          bg: "bg-white",
          border: "border-l-4 border-[#D85A30]",
          text: "text-gray-800",
        };
      case "achievement":
        return {
          bg: "bg-white",
          border: "border-l-4 border-[#7F77DD]",
          text: "text-gray-800",
        };
      case "knowledge":
        return {
          bg: "bg-white",
          border: "border-l-4 border-[#1D9E75]",
          text: "text-gray-800",
        };
      case "celebration":
        return {
          bg: "bg-gradient-to-r from-[#D85A30] to-[#7F77DD]",
          border: "",
          text: "text-white",
        };
      default:
        return {
          bg: "bg-white",
          border: "border-l-4 border-gray-300",
          text: "text-gray-800",
        };
    }
  };

  const style = getToastStyle();

  return (
    <motion.div
      initial={{ opacity: 0, x: 400, y: 0 }}
      animate={{
        opacity: 1,
        x: 0,
        y: index * 90,
      }}
      exit={{ opacity: 0, x: 400 }}
      transition={{
        type: "spring",
        damping: 20,
        stiffness: 300,
        mass: 0.5,
      }}
      className={`${style.bg} ${style.border} ${style.text} rounded-lg shadow-lg p-4 max-w-[320px] pointer-events-auto mb-3`}
    >
      <div className="flex items-center gap-3">
        {toast.icon && <span className="text-xl">{toast.icon}</span>}
        <p className="text-sm font-medium line-clamp-2">{toast.message}</p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// XP BAR COMPONENT (Floating display)
// ============================================================================

export function XPBar() {
  const { xp, level, xpToNextLevel, streak, soundEnabled, toggleSound } =
    useGamification();
  const [expanded, setExpanded] = useState(true);

  const levelInfo = getLevelFromXp(xp);
  const xpForCurrentLevel = LEVEL_TIERS
    .slice(0, levelInfo.levelIndex)
    .reduce((sum, tier) => sum + tier.maxXp, 0);
  const xpInCurrentLevel = xp - xpForCurrentLevel;
  const xpForTier = LEVEL_TIERS[levelInfo.levelIndex].maxXp;
  const xpRangeInTier = xpForTier - xpForCurrentLevel;
  const progressPercentage = (xpInCurrentLevel / xpRangeInTier) * 100;

  return (
    <motion.div
      className="fixed bottom-20 right-6 z-40"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-white/20 p-4 min-w-[280px]">
        {/* Header: Level & Collapse Button */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {level}
            </p>
            <p className="text-sm font-bold text-gray-900">{xp} Total XP</p>
          </div>
          <motion.button
            onClick={() => setExpanded(!expanded)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            {expanded ? "−" : "+"}
          </motion.button>
        </div>

        {/* Expandable Content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* XP Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-600">
                    {xpInCurrentLevel} / {xpRangeInTier} XP
                  </span>
                  <span className="text-xs text-gray-600">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#D85A30] to-[#1D9E75]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{
                      type: "spring",
                      damping: 30,
                      stiffness: 100,
                      mass: 1,
                    }}
                  />
                </div>
              </div>

              {/* Streak Counter */}
              <div className="flex items-center justify-between text-sm mb-3 p-2 bg-orange-50 rounded-lg">
                <span className="text-gray-700">Streak</span>
                <span className="font-bold text-orange-600">
                  {streak}d 🔥
                </span>
              </div>

              {/* Sound Toggle */}
              <button
                onClick={toggleSound}
                className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                  soundEnabled
                    ? "bg-[#7F77DD] text-white hover:bg-[#6f67cd]"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              >
                {soundEnabled ? "🔊 Sound On" : "🔇 Sound Off"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================================================
// PAGE TRANSITION WRAPPER
// ============================================================================

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// SOUND HOOK
// ============================================================================

export function useGameSound() {
  const { soundEnabled } = useGamification();
  const soundGenerator = React.useRef(new GameSoundGenerator());

  return {
    play: {
      xpGain: () => soundEnabled && soundGenerator.current.xpGain(),
      achievement: () => soundEnabled && soundGenerator.current.achievement(),
      click: () => soundEnabled && soundGenerator.current.click(),
      error: () => soundEnabled && soundGenerator.current.error(),
      levelUp: () => soundEnabled && soundGenerator.current.levelUp(),
    },
    soundEnabled,
  };
}
