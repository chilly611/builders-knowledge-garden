"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

/**
 * Sound Engine for Builder's Knowledge Garden
 *
 * Provides comprehensive audio feedback for:
 * - Notification Orchestra (4 tiers: celebration, good_news, heads_up, needs_you)
 * - XP & Achievement Events
 * - Ambient Surface Music (per route)
 *
 * All audio synthesized with pure Web Audio API — zero dependencies, instant loading.
 * Muted by default. Respects prefers-reduced-motion and system mute.
 */

// ============================================================================
// Types
// ============================================================================

type NotificationSound = "celebration" | "good_news" | "heads_up" | "needs_you";
type XPSound =
  | "xp_earn"
  | "level_up"
  | "achievement_unlock"
  | "quest_complete"
  | "streak_milestone";
type AmbientSurface = "dream" | "knowledge" | "killer_app";
type SoundName = NotificationSound | XPSound;

interface PlayOptions {
  pitch?: number; // Multiplier for base frequency (e.g., 1.2 = 20% higher)
  volume?: number; // dB offset from default (-30 to 0)
}

interface SoundContextType {
  play: (sound: SoundName, options?: PlayOptions) => void;
  setVolume: (volume: number) => void; // 0-100
  toggleMute: () => void;
  isMuted: boolean;
  volume: number;
  setAmbient: (surface: AmbientSurface | null) => void;
  ambientEnabled: boolean;
  toggleAmbient: () => void;
}

// ============================================================================
// Web Audio Context Singleton
// ============================================================================

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume on user interaction (required by modern browsers)
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

// ============================================================================
// Sound Synthesis Functions (Pure Web Audio API)
// ============================================================================

/**
 * Notification Sounds - Matching the Notification Orchestra
 */

function playCelebration(ctx: AudioContext, volumeDb: number, pitch: number) {
  // Triumphant rising major chord (C-E-G-C) with sparkle
  const now = ctx.currentTime;
  const notes = [
    { freq: 262 * pitch, time: 0, duration: 0.4 }, // C5
    { freq: 330 * pitch, time: 0.08, duration: 0.4 }, // E5
    { freq: 392 * pitch, time: 0.16, duration: 0.4 }, // G5
    { freq: 523 * pitch, time: 0.24, duration: 0.5 }, // C6 - higher octave
  ];

  notes.forEach(({ freq, time, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(dbToLinear(volumeDb), now);
    gain.gain.exponentialRampToValueAtTime(dbToLinear(volumeDb - 20), now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + duration);
  });
}

function playGoodNews(ctx: AudioContext, volumeDb: number, pitch: number) {
  // Gentle pleasant ding - single soft bell tone
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "sine";
  osc.frequency.setValueAtTime(440 * pitch, now); // A5
  osc.frequency.exponentialRampToValueAtTime(440 * pitch * 0.95, now + 0.3);

  filter.type = "lowpass";
  filter.frequency.value = 2000;

  gain.gain.setValueAtTime(dbToLinear(volumeDb), now);
  gain.gain.exponentialRampToValueAtTime(dbToLinear(volumeDb - 25), now + 0.8);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.8);
}

function playHeadsUp(ctx: AudioContext, volumeDb: number, pitch: number) {
  // Two-tone alert - attention-grabbing but not alarming
  const now = ctx.currentTime;
  const tones = [
    { freq: 600 * pitch, time: 0, duration: 0.15 },
    { freq: 750 * pitch, time: 0.15, duration: 0.15 },
  ];

  tones.forEach(({ freq, time, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(dbToLinear(volumeDb), now + time);
    gain.gain.exponentialRampToValueAtTime(dbToLinear(volumeDb - 18), now + time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + duration);
  });
}

function playNeedsYou(ctx: AudioContext, volumeDb: number, pitch: number) {
  // Urgent three-note sequence - clear call to action
  const now = ctx.currentTime;
  const notes = [
    { freq: 880 * pitch, time: 0, duration: 0.1 }, // A6
    { freq: 660 * pitch, time: 0.12, duration: 0.1 }, // E6
    { freq: 880 * pitch, time: 0.24, duration: 0.2 }, // A6 again, held
  ];

  notes.forEach(({ freq, time, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(dbToLinear(volumeDb), now + time);
    gain.gain.exponentialRampToValueAtTime(dbToLinear(volumeDb - 22), now + time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + duration);
  });
}

/**
 * XP & Achievement Sounds
 */

function playXPEarn(ctx: AudioContext, volumeDb: number, pitch: number) {
  // Quick satisfying "pop" with rising pitch
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(400 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(600 * pitch, now + 0.15);

  gain.gain.setValueAtTime(dbToLinear(volumeDb), now);
  gain.gain.exponentialRampToValueAtTime(dbToLinear(volumeDb - 20), now + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.15);
}

function playLevelUp(ctx: AudioContext, volumeDb: number, pitch: number) {
  // Fanfare sequence - ascending scale + chord
  const now = ctx.currentTime;
  const scale = [
    { freq: 523 * pitch, time: 0, duration: 0.1 }, // C6
    { freq: 587 * pitch, time: 0.1, duration: 0.1 }, // D6
    { freq: 659 * pitch, time: 0.2, duration: 0.1 }, // E6
    { freq: 784 * pitch, time: 0.3, duration: 0.2 }, // G6
  ];

  scale.forEach(({ freq, time, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(dbToLinear(volumeDb - 3), now + time);
    gain.gain.exponentialRampToValueAtTime(dbToLinear(volumeDb - 22), now + time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + duration);
  });

  // Chord underneath
  const baseFreq = 262 * pitch; // C5
  [0, 2, 4].forEach((interval) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.value = baseFreq * Math.pow(2, interval / 12);

    gain.gain.setValueAtTime(dbToLinear(volumeDb - 8), now + 0.25);
    gain.gain.exponentialRampToValueAtTime(dbToLinear(volumeDb - 25), now + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + 0.25);
    osc.stop(now + 0.8);
  });
}

function playAchievementUnlock(ctx: AudioContext, volumeDb: number, pitch: number) {
  // Special memorable jingle - bright and celebratory
  const now = ctx.currentTime;
  const jingle = [
    { freq: 659 * pitch, time: 0, duration: 0.15 }, // E6
    { freq: 784 * pitch, time: 0.15, duration: 0.15 }, // G6
    { freq: 987 * pitch, time: 0.3, duration: 0.2 }, // B6
    { freq: 1048 * pitch, time: 0.5, duration: 0.3 }, // C7
  ];

  jingle.forEach(({ freq, time, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(dbToLinear(volumeDb), now + time);
    gain.gain.exponentialRampToValueAtTime(dbToLinear(volumeDb - 20), now + time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + duration);
  });
}

function playQuestComplete(ctx: AudioContext, volumeDb: number, pitch: number) {
  // Completion chime - warm and resolving
  const now = ctx.currentTime;
  const chord = [
    { freq: 440 * pitch, duration: 0.5 }, // A5
    { freq: 554 * pitch, duration: 0.5 }, // C#6
    { freq: 659 * pitch, duration: 0.5 }, // E6
  ];

  chord.forEach(({ freq, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(dbToLinear(volumeDb - 5), now);
    gain.gain.exponentialRampToValueAtTime(dbToLinear(volumeDb - 25), now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  });
}

function playStreakMilestone(ctx: AudioContext, volumeDb: number, pitch: number) {
  // Power-up sound - energetic and triumphant
  const now = ctx.currentTime;
  const powerUp = [
    { freq: 800 * pitch, time: 0, duration: 0.08 },
    { freq: 1000 * pitch, time: 0.08, duration: 0.08 },
    { freq: 1200 * pitch, time: 0.16, duration: 0.12 },
  ];

  powerUp.forEach(({ freq, time, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(dbToLinear(volumeDb), now + time);
    gain.gain.exponentialRampToValueAtTime(dbToLinear(volumeDb - 18), now + time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + duration);
  });
}

/**
 * Ambient Surface Music (looping, very subtle)
 */

function playAmbientDream(ctx: AudioContext, volumeDb: number) {
  // Dreamy ambient pad - gentle oscillator with filter sweep
  const now = ctx.currentTime;
  const baseFreq = 110; // A2

  // Create multiple detuned oscillators for richness
  [0, 0.05, -0.05].forEach((detune) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.value = baseFreq * (1 + detune);
    osc.detune.value = detune * 50;

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(1200, now + 8);
    filter.frequency.linearRampToValueAtTime(800, now + 16);

    gain.gain.setValueAtTime(dbToLinear(volumeDb - 15), now); // Subtle

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 16);
  });
}

function playAmbientKnowledge(ctx: AudioContext, volumeDb: number) {
  // Subtle thinking music - soft plucks (quick decay)
  const now = ctx.currentTime;
  const notes = [392, 440, 494, 523]; // G, A, B, C (pentatonic feel)

  // Play notes in pattern, repeating
  for (let i = 0; i < 4; i++) {
    const note = notes[i % notes.length];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.value = note;

    gain.gain.setValueAtTime(dbToLinear(volumeDb - 12), now + i * 0.5);
    gain.gain.exponentialRampToValueAtTime(dbToLinear(volumeDb - 30), now + i * 0.5 + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + i * 0.5);
    osc.stop(now + i * 0.5 + 0.4);
  }
}

function playAmbientKillerApp(ctx: AudioContext, volumeDb: number) {
  // Focused work energy - minimal beat with bass
  const now = ctx.currentTime;

  // Kick drum pattern (very subtle)
  const kickFreqs = [150, 150, 150, 150];
  kickFreqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + i * 0.5);
    osc.frequency.exponentialRampToValueAtTime(50, now + i * 0.5 + 0.1);

    gain.gain.setValueAtTime(dbToLinear(volumeDb - 8), now + i * 0.5);
    gain.gain.exponentialRampToValueAtTime(dbToLinear(volumeDb - 25), now + i * 0.5 + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + i * 0.5);
    osc.stop(now + i * 0.5 + 0.25);
  });

  // Minimal synth pad underneath
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "square";
  osc.frequency.value = 220; // A3

  filter.type = "lowpass";
  filter.frequency.value = 600;

  gain.gain.setValueAtTime(dbToLinear(volumeDb - 14), now);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 2);
}

// ============================================================================
// Utility Functions
// ============================================================================

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

function normalizeVolume(value: number): number {
  return Math.max(0, Math.min(100, value));
}

// ============================================================================
// Sound Context & Provider
// ============================================================================

const SoundContext = createContext<SoundContextType | null>(null);

const STORAGE_KEY = "bkg-sound-volume";
const STORAGE_KEY_MUTED = "bkg-sound-muted";
const STORAGE_KEY_AMBIENT = "bkg-sound-ambient";

export function SoundProvider({ children }: { children: ReactNode }) {
  const [volume, setVolumeState] = useState(70);
  const [isMuted, setIsMutedState] = useState(true); // Muted by default
  const [ambientEnabled, setAmbientEnabledState] = useState(false);
  const [currentAmbient, setCurrentAmbientState] = useState<AmbientSurface | null>(null);
  const prefersReducedMotion = useRef(false);
  const ambientOscillators = useRef<OscillatorNode[]>([]);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const savedVolume = localStorage.getItem(STORAGE_KEY);
      if (savedVolume) setVolumeState(normalizeVolume(parseInt(savedVolume, 10)));

      const savedMuted = localStorage.getItem(STORAGE_KEY_MUTED);
      if (savedMuted !== null) setIsMutedState(savedMuted === "true");

      const savedAmbient = localStorage.getItem(STORAGE_KEY_AMBIENT);
      if (savedAmbient !== null) setAmbientEnabledState(savedAmbient === "true");
    } catch {}

    // Check prefers-reduced-motion
    if (typeof window !== "undefined") {
      prefersReducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  }, []);

  const setVolume = useCallback((val: number) => {
    const normalized = normalizeVolume(val);
    setVolumeState(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, String(normalized));
    } catch {}
  }, []);

  const toggleMute = useCallback(() => {
    setIsMutedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_MUTED, String(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleAmbient = useCallback(() => {
    setAmbientEnabledState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_AMBIENT, String(next));
      } catch {}
      // Stop ambient music if disabling
      if (!next) {
        ambientOscillators.current.forEach((osc) => {
          try {
            osc.stop();
          } catch {}
        });
        ambientOscillators.current = [];
      }
      return next;
    });
  }, []);

  const setAmbient = useCallback(
    (surface: AmbientSurface | null) => {
      // Stop current ambient playback
      ambientOscillators.current.forEach((osc) => {
        try {
          osc.stop();
        } catch {}
      });
      ambientOscillators.current = [];

      setCurrentAmbientState(surface);

      // Start new ambient if enabled
      if (ambientEnabled && surface) {
        const ctx = getAudioContext();
        const volumeDb = isMuted ? -80 : -20 + (volume - 70) * 0.2;

        if (surface === "dream") playAmbientDream(ctx, volumeDb);
        else if (surface === "knowledge") playAmbientKnowledge(ctx, volumeDb);
        else if (surface === "killer_app") playAmbientKillerApp(ctx, volumeDb);
      }
    },
    [ambientEnabled, isMuted, volume]
  );

  const play = useCallback(
    (sound: SoundName, options: PlayOptions = {}) => {
      if (isMuted || prefersReducedMotion.current) return;

      const pitch = options.pitch || 1;
      const volumeDb = -18 + (volume - 70) * 0.2 + (options.volume || 0);

      try {
        const ctx = getAudioContext();

        if (sound === "celebration") playCelebration(ctx, volumeDb, pitch);
        else if (sound === "good_news") playGoodNews(ctx, volumeDb, pitch);
        else if (sound === "heads_up") playHeadsUp(ctx, volumeDb, pitch);
        else if (sound === "needs_you") playNeedsYou(ctx, volumeDb, pitch);
        else if (sound === "xp_earn") playXPEarn(ctx, volumeDb, pitch);
        else if (sound === "level_up") playLevelUp(ctx, volumeDb, pitch);
        else if (sound === "achievement_unlock") playAchievementUnlock(ctx, volumeDb, pitch);
        else if (sound === "quest_complete") playQuestComplete(ctx, volumeDb, pitch);
        else if (sound === "streak_milestone") playStreakMilestone(ctx, volumeDb, pitch);
      } catch (err) {
        console.debug("[SoundEngine] Audio playback error:", err);
      }
    },
    [isMuted, volume]
  );

  const value: SoundContextType = {
    play,
    setVolume,
    toggleMute,
    isMuted,
    volume,
    setAmbient,
    ambientEnabled,
    toggleAmbient,
  };

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

// ============================================================================
// Hook for consumers
// ============================================================================

export function useSounds(): SoundContextType {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSounds() must be called within <SoundProvider>");
  }
  return context;
}

// ============================================================================
// Sound Settings Panel Component
// ============================================================================

export function SoundSettings() {
  const { play, volume, setVolume, isMuted, toggleMute, ambientEnabled, toggleAmbient } =
    useSounds();

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4 max-w-sm">
      <h3 className="font-semibold text-slate-900 dark:text-white">Sound Settings</h3>

      {/* Master Volume Slider */}
      <div className="space-y-2">
        <label htmlFor="volume" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Volume: {volume}%
        </label>
        <input
          id="volume"
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg accent-blue-500"
          disabled={isMuted}
        />
      </div>

      {/* Mute Toggle */}
      <button
        onClick={toggleMute}
        className={`w-full px-3 py-2 rounded text-sm font-medium transition ${
          isMuted
            ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            : "bg-blue-500 text-white hover:bg-blue-600"
        }`}
      >
        {isMuted ? "🔇 Sounds Off" : "🔊 Sounds On"}
      </button>

      {/* Notification Sounds Preview */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
          Notifications
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => play("celebration")}
            disabled={isMuted}
            className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
          >
            Celebration
          </button>
          <button
            onClick={() => play("good_news")}
            disabled={isMuted}
            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50"
          >
            Good News
          </button>
          <button
            onClick={() => play("heads_up")}
            disabled={isMuted}
            className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-50"
          >
            Heads Up
          </button>
          <button
            onClick={() => play("needs_you")}
            disabled={isMuted}
            className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
          >
            Needs You
          </button>
        </div>
      </div>

      {/* XP Sounds Preview */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
          XP & Achievements
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => play("xp_earn")}
            disabled={isMuted}
            className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50"
          >
            XP Earn
          </button>
          <button
            onClick={() => play("level_up")}
            disabled={isMuted}
            className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50 disabled:opacity-50"
          >
            Level Up
          </button>
          <button
            onClick={() => play("achievement_unlock")}
            disabled={isMuted}
            className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50"
          >
            Achievement
          </button>
          <button
            onClick={() => play("quest_complete")}
            disabled={isMuted}
            className="px-2 py-1 text-xs bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded hover:bg-cyan-200 dark:hover:bg-cyan-900/50 disabled:opacity-50"
          >
            Quest Done
          </button>
        </div>
      </div>

      {/* Ambient Music Toggle */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
        <button
          onClick={toggleAmbient}
          disabled={isMuted}
          className={`w-full px-3 py-2 rounded text-sm font-medium transition ${
            ambientEnabled && !isMuted
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
          }`}
        >
          {ambientEnabled && !isMuted ? "🎵 Ambient On" : "🎵 Ambient Off"}
        </button>
      </div>

      {/* Footer */}
      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
        Respects your system sound preferences. Muted by default.
      </p>
    </div>
  );
}
