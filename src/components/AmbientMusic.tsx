'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Mood = 'Dream' | 'Build' | 'Knowledge';

interface AmbientMusicContextType {
  isPlaying: boolean;
  currentMood: Mood;
  masterVolume: number;
  togglePlayback: () => void;
  setMood: (mood: Mood) => void;
  setMasterVolume: (volume: number) => void;
}

const AmbientMusicContext = createContext<AmbientMusicContextType | null>(null);

export const useAmbientMusic = () => {
  const context = useContext(AmbientMusicContext);
  if (!context) {
    throw new Error('useAmbientMusic must be used within AmbientMusicProvider');
  }
  return context;
};

interface OscillatorLayer {
  oscillator: OscillatorNode;
  gain: GainNode;
}

interface SynthesisState {
  baseFreq: number;
  masterGain: GainNode;
  oscillators: OscillatorLayer[];
  noiseNode: AudioBufferSourceNode | null;
  convolver: ConvolverNode;
  bassGain: GainNode;
  padGain: GainNode;
  melodyGain: GainNode;
  rhythmGain: GainNode;
  dryWet: GainNode;
  drySignal: GainNode;
  analyser: AnalyserNode;
}

const createWhiteNoise = (audioContext: AudioContext, duration: number): AudioBuffer => {
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

const createImpulseResponse = (audioContext: AudioContext): AudioBuffer => {
  const rate = audioContext.sampleRate;
  const length = rate * 2;
  const impulse = audioContext.createBuffer(1, length, rate);
  const impulseData = impulse.getChannelData(0);
  for (let i = 0; i < length; i++) {
    impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
  }
  return impulse;
};

interface SynthProfile {
  bassFreq: number;
  bassWaveform: OscillatorType;
  padFreq: number;
  padQ: number;
  melodyScale: number[];
  rhythmRate: number;
  reverbWet: number;
}

const MOOD_PROFILES: Record<Mood, SynthProfile> = {
  Dream: {
    bassFreq: 55,
    bassWaveform: 'sine',
    padFreq: 440,
    padQ: 2,
    melodyScale: [0, 2, 4, 7, 9, 11, 12, 14],
    rhythmRate: 0.5,
    reverbWet: 0.7,
  },
  Build: {
    bassFreq: 110,
    bassWaveform: 'triangle',
    padFreq: 220,
    padQ: 8,
    melodyScale: [0, 2, 3, 5, 7, 8, 10, 12],
    rhythmRate: 2,
    reverbWet: 0.2,
  },
  Knowledge: {
    bassFreq: 27.5,
    bassWaveform: 'sine',
    padFreq: 330,
    padQ: 3,
    melodyScale: [0, 3, 5, 7, 10, 12, 15],
    rhythmRate: 1,
    reverbWet: 0.5,
  },
};

const AmbientMusicPlayer: React.FC = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const synthesisRef = useRef<SynthesisState | null>(null);
  const generativeLoopRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMood, setCurrentMood] = useState<Mood>('Dream');
  const [masterVolume, setMasterVolume] = useState(0.3);
  const [isMinimized, setIsMinimized] = useState(true);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(32));

  const initializeAudioContext = useCallback(async () => {
    if (audioContextRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    // Master gain
    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = masterVolume;

    // Reverb chain
    const convolver = audioContext.createConvolver();
    const impulse = createImpulseResponse(audioContext);
    convolver.buffer = impulse;

    const dryWet = audioContext.createGain();
    const drySignal = audioContext.createGain();

    drySignal.connect(masterGain);
    dryWet.connect(convolver);
    convolver.connect(masterGain);

    dryWet.gain.value = 0.5;
    drySignal.gain.value = 0.5;

    // Layer gain nodes
    const bassGain = audioContext.createGain();
    const padGain = audioContext.createGain();
    const melodyGain = audioContext.createGain();
    const rhythmGain = audioContext.createGain();

    bassGain.connect(drySignal);
    padGain.connect(dryWet);
    melodyGain.connect(dryWet);
    rhythmGain.connect(drySignal);

    bassGain.gain.value = 0.4;
    padGain.gain.value = 0.3;
    melodyGain.gain.value = 0.25;
    rhythmGain.gain.value = 0.15;

    // Analyser for visualization
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    masterGain.connect(analyser);

    const synthesis: SynthesisState = {
      baseFreq: 440,
      masterGain,
      oscillators: [],
      noiseNode: null,
      convolver,
      bassGain,
      padGain,
      melodyGain,
      rhythmGain,
      dryWet,
      drySignal,
      analyser,
    };

    synthesisRef.current = synthesis;
    await startSynthesis(audioContext, synthesis, currentMood);
  }, [currentMood]);

  const startSynthesis = async (audioContext: AudioContext, synthesis: SynthesisState, mood: Mood) => {
    const profile = MOOD_PROFILES[mood];

    // Bass layer: low frequency pad
    const bassOsc = audioContext.createOscillator();
    bassOsc.frequency.value = profile.bassFreq;
    bassOsc.type = profile.bassWaveform;
    const bassGainNode = audioContext.createGain();
    bassGainNode.gain.value = 0.8;
    bassOsc.connect(bassGainNode);
    bassGainNode.connect(synthesis.bassGain);
    bassOsc.start();

    // Pad layer: filtered noise with detuned oscillators
    const padOsc1 = audioContext.createOscillator();
    padOsc1.frequency.value = profile.padFreq;
    padOsc1.type = 'sine';
    const padOsc2 = audioContext.createOscillator();
    padOsc2.frequency.value = profile.padFreq + 2;
    padOsc2.type = 'sine';

    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    filter.Q.value = profile.padQ;

    const padGainNode = audioContext.createGain();
    padGainNode.gain.value = 0.5;

    padOsc1.connect(filter);
    padOsc2.connect(filter);
    filter.connect(padGainNode);
    padGainNode.connect(synthesis.padGain);

    padOsc1.start();
    padOsc2.start();

    // Melody layer: generative melodic voices
    const melodyOsc = audioContext.createOscillator();
    melodyOsc.type = 'triangle';
    const melodyGainNode = audioContext.createGain();
    melodyGainNode.gain.value = 0.6;
    melodyOsc.connect(melodyGainNode);
    melodyGainNode.connect(synthesis.melodyGain);
    melodyOsc.start();

    // Rhythm layer: noise clicks/pulses
    const noiseBuffer = createWhiteNoise(audioContext, 0.5);
    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const rhythmGainNode = audioContext.createGain();
    rhythmGainNode.gain.value = 0.4;
    noiseSource.connect(rhythmGainNode);
    rhythmGainNode.connect(synthesis.rhythmGain);

    synthesis.oscillators = [
      { oscillator: bassOsc, gain: bassGainNode },
      { oscillator: padOsc1, gain: padGainNode },
      { oscillator: padOsc2, gain: padGainNode },
      { oscillator: melodyOsc, gain: melodyGainNode },
    ];
    synthesis.noiseNode = noiseSource;

    startGenerativeEvolution(audioContext, synthesis, mood);
  };

  const startGenerativeEvolution = (audioContext: AudioContext, synthesis: SynthesisState, mood: Mood) => {
    if (generativeLoopRef.current) clearInterval(generativeLoopRef.current);

    const profile = MOOD_PROFILES[mood];
    let noteIndex = 0;

    generativeLoopRef.current = setInterval(() => {
      if (!synthesis.oscillators[3]) return;

      const melodyOsc = synthesis.oscillators[3].oscillator;
      const scale = profile.melodyScale;
      const octave = Math.floor(Math.random() * 3);

      const noteOffset = scale[noteIndex % scale.length];
      const noteFreq = 220 * Math.pow(2, (octave + noteOffset / 12) / 12);

      melodyOsc.frequency.exponentialRampToValueAtTime(noteFreq, audioContext.currentTime + 0.5);

      // Rhythm pulses
      if (Math.random() < 0.3 && synthesis.noiseNode) {
        const noiseBuffer = createWhiteNoise(audioContext, 0.1);
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        const rhythmGain = audioContext.createGain();
        rhythmGain.gain.setValueAtTime(0.3, audioContext.currentTime);
        rhythmGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        noiseSource.connect(rhythmGain);
        rhythmGain.connect(synthesis.rhythmGain);
        noiseSource.start();
        noiseSource.stop(audioContext.currentTime + 0.1);
      }

      noteIndex++;
    }, (1000 / profile.rhythmRate) * 1500);
  };

  const togglePlayback = useCallback(async () => {
    if (!isPlaying) {
      if (!audioContextRef.current) {
        await initializeAudioContext();
      }
      setIsPlaying(true);
    } else {
      if (audioContextRef.current) {
        audioContextRef.current.suspend();
      }
      setIsPlaying(false);
    }
  }, [isPlaying, initializeAudioContext]);

  const handleMoodChange = useCallback(
    (newMood: Mood) => {
      setCurrentMood(newMood);

      if (isPlaying && audioContextRef.current && synthesisRef.current) {
        const fadeTime = 0.5;
        const now = audioContextRef.current.currentTime;

        // Fade out current layers
        synthesisRef.current.bassGain.gain.linearRampToValueAtTime(0, now + fadeTime);
        synthesisRef.current.padGain.gain.linearRampToValueAtTime(0, now + fadeTime);
        synthesisRef.current.melodyGain.gain.linearRampToValueAtTime(0, now + fadeTime);

        // Stop oscillators
        synthesisRef.current.oscillators.forEach(({ oscillator }) => {
          oscillator.stop(now + fadeTime);
        });

        setTimeout(() => {
          if (synthesisRef.current && audioContextRef.current) {
            synthesisRef.current.bassGain.gain.value = 0.4;
            synthesisRef.current.padGain.gain.value = 0.3;
            synthesisRef.current.melodyGain.gain.value = 0.25;
            startSynthesis(audioContextRef.current, synthesisRef.current, newMood);
          }
        }, fadeTime * 1000);
      }
    },
    [isPlaying]
  );

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      setMasterVolume(newVolume);
      if (audioContextRef.current && synthesisRef.current) {
        synthesisRef.current.masterGain.gain.setTargetAtTime(newVolume, audioContextRef.current.currentTime, 0.1);
      }
    },
    []
  );

  // Visualization loop
  useEffect(() => {
    if (!isPlaying || !synthesisRef.current) return;

    const analyser = synthesisRef.current.analyser;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateViz = () => {
      analyser.getByteFrequencyData(dataArray);
      setFrequencyData(new Uint8Array(dataArray.slice(0, 32)));
      requestAnimationFrame(updateViz);
    };

    updateViz();
  }, [isPlaying]);

  // Resume audio context on user interaction
  useEffect(() => {
    const resume = async () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    };

    document.addEventListener('click', resume);
    document.addEventListener('keydown', resume);

    return () => {
      document.removeEventListener('click', resume);
      document.removeEventListener('keydown', resume);
    };
  }, []);

  return (
    <AmbientMusicContext.Provider
      value={{
        isPlaying,
        currentMood,
        masterVolume,
        togglePlayback,
        setMood: handleMoodChange,
        setMasterVolume: handleVolumeChange,
      }}
    >
      <motion.div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          fontFamily: 'Archivo',
        }}
      >
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                padding: '20px',
                marginBottom: '12px',
                width: '280px',
              }}
            >
              {/* Header */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#1D9E75', fontSize: '14px' }}>
                    Ambient Synthesis
                  </div>
                  <button
                    onClick={() => setIsMinimized(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '18px',
                      color: '#999',
                    }}
                  >
                    _
                  </button>
                </div>

                {/* Play button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={togglePlayback}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isPlaying ? '#E8443A' : '#1D9E75',
                    color: 'white',
                    fontFamily: 'Archivo',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginBottom: '12px',
                    transition: 'background-color 0.3s ease',
                  }}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </motion.button>
              </div>

              {/* Mood selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#666' }}>
                  Mood
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['Dream', 'Build', 'Knowledge'] as const).map((mood) => (
                    <motion.button
                      key={mood}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleMoodChange(mood)}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        borderRadius: '6px',
                        border: currentMood === mood ? '2px solid #1D9E75' : '1px solid #ddd',
                        backgroundColor: currentMood === mood ? '#f0fdf9' : '#f9f9f9',
                        color: currentMood === mood ? '#1D9E75' : '#666',
                        fontFamily: 'Archivo',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {mood}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Volume control */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#666' }}>
                  Volume: {Math.round(masterVolume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    background: '#ddd',
                    outline: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                  }}
                />
                <style>{`
                  input[type='range']::-webkit-slider-thumb {
                    WebkitAppearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    borderRadius: 50%;
                    background: #1D9E75;
                    cursor: pointer;
                    boxShadow: 0 2px 6px rgba(0, 0, 0, 0.2);
                  }
                  input[type='range']::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    borderRadius: 50%;
                    background: #1D9E75;
                    cursor: pointer;
                    boxShadow: 0 2px 6px rgba(0, 0, 0, 0.2);
                    border: none;
                  }
                `}</style>
              </div>

              {/* Equalizer visualization */}
              {isPlaying && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', color: '#666' }}>
                    Spectrum
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '3px',
                      height: '60px',
                      backgroundColor: '#f9f9f9',
                      padding: '8px',
                      borderRadius: '6px',
                    }}
                  >
                    {Array.from(frequencyData).map((value, idx) => (
                      <motion.div
                        key={idx}
                        style={{
                          flex: 1,
                          backgroundColor: `hsl(${120 - (idx / frequencyData.length) * 120}, 70%, 50%)`,
                          borderRadius: '2px',
                          minHeight: '2px',
                        }}
                        animate={{ height: `${(value / 255) * 100}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Info text */}
              <div
                style={{
                  fontSize: '11px',
                  color: '#999',
                  padding: '8px',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '6px',
                  lineHeight: '1.4',
                }}
              >
                {currentMood === 'Dream' && 'Slow pads with gentle arpeggios and deep reverb'}
                {currentMood === 'Build' && 'Steady pulse with warm bass and crisp rhythms'}
                {currentMood === 'Knowledge' && 'Evolving drones with bell-like tones'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimized button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsMinimized(!isMinimized)}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isPlaying ? '#E8443A' : '#1D9E75',
            color: 'white',
            cursor: 'pointer',
            fontSize: '24px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.3s ease',
          }}
        >
          {isPlaying ? '♫' : '♪'}
        </motion.button>
      </motion.div>
    </AmbientMusicContext.Provider>
  );
};

export default AmbientMusicPlayer;
