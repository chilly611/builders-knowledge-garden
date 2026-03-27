/**
 * Sound Engine — Subtle, opt-in audio layer for the Builder's Knowledge Garden
 * 
 * Uses Tone.js for Web Audio synthesis — zero audio file downloads.
 * Muted by default. User enables in settings.
 * Respects prefers-reduced-motion.
 * 
 * Usage:
 *   import { useSound } from "@/lib/sound-engine";
 *   const { play } = useSound();
 *   play("select");    // soft click
 *   play("complete");  // warm chime
 *   play("celebrate"); // ascending arpeggio
 */

"use client";

import { useCallback, useEffect, useState, useRef } from "react";

type SoundName = "select" | "complete" | "celebrate" | "notify" | "error" | "hover" | "navigate";

interface SoundEngine {
  play: (name: SoundName) => void;
  setEnabled: (enabled: boolean) => void;
  enabled: boolean;
}

// Lazy-load Tone.js to avoid SSR issues
let ToneModule: typeof import("tone") | null = null;

async function getTone() {
  if (ToneModule) return ToneModule;
  ToneModule = await import("tone");
  return ToneModule;
}

// Sound definitions using Web Audio synthesis
async function playSelect() {
  const Tone = await getTone();
  await Tone.start();
  const synth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
    volume: -20,
  }).toDestination();
  synth.triggerAttackRelease("C5", "32n");
  setTimeout(() => synth.dispose(), 500);
}

async function playComplete() {
  const Tone = await getTone();
  await Tone.start();
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, decay: 0.3, sustain: 0.1, release: 0.5 },
    volume: -18,
  }).toDestination();
  const now = Tone.now();
  synth.triggerAttackRelease("C5", "8n", now);
  synth.triggerAttackRelease("E5", "8n", now + 0.08);
  synth.triggerAttackRelease("G5", "8n", now + 0.16);
  setTimeout(() => synth.dispose(), 2000);
}

async function playCelebrate() {
  const Tone = await getTone();
  await Tone.start();
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.8 },
    volume: -16,
  }).toDestination();
  const now = Tone.now();
  const notes = ["C5", "E5", "G5", "C6", "E6"];
  notes.forEach((n, i) => synth.triggerAttackRelease(n, "16n", now + i * 0.1));
  setTimeout(() => synth.dispose(), 3000);
}

async function playNotify() {
  const Tone = await getTone();
  await Tone.start();
  const synth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.3 },
    volume: -22,
  }).toDestination();
  const now = Tone.now();
  synth.triggerAttackRelease("A5", "16n", now);
  synth.triggerAttackRelease("E5", "16n", now + 0.12);
  setTimeout(() => synth.dispose(), 1000);
}

async function playError() {
  const Tone = await getTone();
  await Tone.start();
  const synth = new Tone.Synth({
    oscillator: { type: "square" },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.15 },
    volume: -24,
  }).toDestination();
  const now = Tone.now();
  synth.triggerAttackRelease("E3", "16n", now);
  synth.triggerAttackRelease("C3", "16n", now + 0.1);
  setTimeout(() => synth.dispose(), 800);
}

async function playHover() {
  const Tone = await getTone();
  await Tone.start();
  const synth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.005, decay: 0.05, sustain: 0, release: 0.05 },
    volume: -30,
  }).toDestination();
  synth.triggerAttackRelease("G5", "64n");
  setTimeout(() => synth.dispose(), 300);
}

async function playNavigate() {
  const Tone = await getTone();
  await Tone.start();
  const synth = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.01, decay: 0.12, sustain: 0, release: 0.2 },
    volume: -22,
  }).toDestination();
  synth.triggerAttackRelease("E5", "32n");
  setTimeout(() => synth.dispose(), 500);
}

const SOUND_MAP: Record<SoundName, () => Promise<void>> = {
  select: playSelect,
  complete: playComplete,
  celebrate: playCelebrate,
  notify: playNotify,
  error: playError,
  hover: playHover,
  navigate: playNavigate,
};

const STORAGE_KEY = "bkg-sound-enabled";

/**
 * React hook for sound effects.
 * Sound is OFF by default. User enables via settings.
 * Respects prefers-reduced-motion.
 */
export function useSound(): SoundEngine {
  const [enabled, setEnabledState] = useState(false);
  const prefersReduced = useRef(false);

  useEffect(() => {
    // Check localStorage for user preference
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setEnabledState(true);
    } catch {}
    // Check prefers-reduced-motion
    if (typeof window !== "undefined") {
      prefersReduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  }, []);

  const setEnabled = useCallback((val: boolean) => {
    setEnabledState(val);
    try { localStorage.setItem(STORAGE_KEY, String(val)); } catch {}
  }, []);

  const play = useCallback((name: SoundName) => {
    if (!enabled || prefersReduced.current) return;
    const fn = SOUND_MAP[name];
    if (fn) fn().catch(() => {}); // Silently ignore audio errors
  }, [enabled]);

  return { play, setEnabled, enabled };
}
