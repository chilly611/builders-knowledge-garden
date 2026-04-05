'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface ProgressiveProfilerProps {
  onComplete: (profile: { lane: string; intent: string; painPoint?: string }) => void;
  onSkip: () => void;
}

type Lane = 'dreamer' | 'builder' | 'specialist' | 'merchant' | 'ally' | 'crew' | 'fleet' | 'machine';
type IntentAnswer = 'build' | 'business' | 'services' | 'jobsites' | 'equipment' | 'api';
type BuilderAnswer = 'homeowner' | 'contractor';
type BusinessAnswer = 'general' | 'specialty' | 'materials';

interface ProfileData {
  lane: Lane;
  intent: IntentAnswer;
  buildType?: BuilderAnswer;
  businessType?: BusinessAnswer;
  painPoint?: string;
}

const laneConfig: Record<Lane, { color: string; surface: string; welcome: string }> = {
  dreamer: { color: '#D85A30', surface: '/dream', welcome: "Welcome, Dreamer. Let's bring your vision to life." },
  builder: { color: '#E8443A', surface: '/killerapp', welcome: 'Welcome, Builder. Your Command Center is ready.' },
  specialist: { color: '#378ADD', surface: '/killerapp', welcome: 'Welcome, Specialist. Your Command Center is ready.' },
  merchant: { color: '#BA7517', surface: '/marketplace', welcome: 'Welcome, Merchant. Your Marketplace awaits.' },
  ally: { color: '#7F77DD', surface: '/killerapp', welcome: 'Welcome, Ally. Your Command Center is ready.' },
  crew: { color: '#1D9E75', surface: '/field', welcome: 'Welcome, Crew. Your Field tools are ready.' },
  fleet: { color: '#BA7517', surface: '/marketplace', welcome: 'Welcome, Fleet Manager. Your Marketplace awaits.' },
  machine: { color: '#7F77DD', surface: '/api/docs', welcome: 'Welcome. Your API documentation is ready.' },
};

const determineLane = (profile: ProfileData): Lane => {
  if (profile.intent === 'build') {
    return profile.buildType === 'homeowner' ? 'dreamer' : 'builder';
  }
  if (profile.intent === 'business') {
    if (profile.businessType === 'general') return 'builder';
    if (profile.businessType === 'specialty') return 'specialist';
    if (profile.businessType === 'materials') return 'merchant';
  }
  if (profile.intent === 'services') return 'ally';
  if (profile.intent === 'jobsites') return 'crew';
  if (profile.intent === 'equipment') return 'fleet';
  if (profile.intent === 'api') return 'machine';
  return 'builder';
};

export default function ProgressiveProfiler({ onComplete, onSkip }: ProgressiveProfilerProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<ProfileData>({
    lane: 'builder',
    intent: 'build',
  });
  const [celebrating, setCelebrating] = useState(false);
  const [painPoint, setPainPoint] = useState('');

  const handleIntentSelect = useCallback((intent: IntentAnswer) => {
    const newProfile = { ...profile, intent };
    setProfile(newProfile);

    // Determine if we need additional questions
    if (intent === 'services' || intent === 'jobsites' || intent === 'equipment' || intent === 'api') {
      // These intents don't need Q2, can skip to Q3 or completion
      if (intent === 'services' || intent === 'jobsites' || intent === 'equipment' || intent === 'api') {
        // Skip Q3 for certain intents
        if (intent === 'jobsites' || intent === 'equipment' || intent === 'api') {
          completeOnboarding(newProfile);
        } else {
          setStep(3);
        }
      }
    } else {
      setStep(2);
    }
  }, [profile]);

  const handleBuildTypeSelect = useCallback((buildType: BuilderAnswer) => {
    const newProfile = { ...profile, buildType };
    setProfile(newProfile);
    setStep(3);
  }, [profile]);

  const handleBusinessTypeSelect = useCallback((businessType: BusinessAnswer) => {
    const newProfile = { ...profile, businessType };
    setProfile(newProfile);
    setStep(3);
  }, [profile]);

  const handlePainPointSubmit = useCallback(() => {
    const newProfile = { ...profile, painPoint };
    completeOnboarding(newProfile);
  }, [profile, painPoint]);

  const completeOnboarding = useCallback((finalProfile: ProfileData) => {
    const lane = determineLane(finalProfile);
    const completeProfile = { ...finalProfile, lane };

    // Save to localStorage
    localStorage.setItem('bkg-lane', lane);

    // Show celebration
    setCelebrating(true);

    // Wait for celebration animation, then route
    setTimeout(() => {
      onComplete(completeProfile);
      router.push(laneConfig[lane].surface);
    }, 2500);
  }, [onComplete, router]);

  const handleSkip = useCallback(() => {
    const defaultProfile: ProfileData = {
      lane: 'builder',
      intent: 'build',
      buildType: 'contractor',
    };
    localStorage.setItem('bkg-lane', 'builder');
    onSkip();
    router.push(laneConfig.builder.surface);
  }, [onSkip, router]);

  if (celebrating) {
    const lane = determineLane(profile);
    const config = laneConfig[lane];
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: '#FAFAF8' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="flex flex-col items-center gap-8">
          <motion.div
            className="w-24 h-24 rounded-full"
            style={{ backgroundColor: config.color }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.8, repeat: 2 }}
          />
          <motion.p
            className="text-2xl font-bold text-center max-w-md"
            style={{ fontFamily: 'var(--font-archivo)', color: '#1a1a1a' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {config.welcome}
          </motion.p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ backgroundColor: '#FAFAF8' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <AnimatePresence mode="wait">
          {step === 1 && <Question1 onSelect={handleIntentSelect} />}
          {step === 2 && profile.intent === 'build' && <Question2Build onSelect={handleBuildTypeSelect} />}
          {step === 2 && profile.intent === 'business' && <Question2Business onSelect={handleBusinessTypeSelect} />}
          {step === 3 && (
            <Question3
              lane={determineLane(profile)}
              painPoint={painPoint}
              setPainPoint={setPainPoint}
              onSubmit={handlePainPointSubmit}
            />
          )}
        </AnimatePresence>

        {/* Skip button */}
        <motion.button
          onClick={handleSkip}
          className="mt-12 text-sm underline transition-opacity hover:opacity-70"
          style={{ color: '#666', fontFamily: 'var(--font-archivo)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Skip for now
        </motion.button>
      </div>
    </motion.div>
  );
}

interface Question1Props {
  onSelect: (intent: IntentAnswer) => void;
}

function Question1({ onSelect }: Question1Props) {
  const options: { emoji: string; text: string; intent: IntentAnswer }[] = [
    { emoji: '🏗️', text: 'I want to build something', intent: 'build' },
    { emoji: '🏢', text: 'I run a construction business', intent: 'business' },
    { emoji: '👔', text: 'I provide professional services', intent: 'services' },
    { emoji: '🔧', text: 'I work on job sites', intent: 'jobsites' },
    { emoji: '🚜', text: 'I manage equipment/fleet', intent: 'equipment' },
    { emoji: '⚙️', text: "I'm integrating via API", intent: 'api' },
  ];

  return (
    <motion.div
      key="q1"
      className="w-full max-w-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <h1
        className="text-4xl font-bold text-center mb-12"
        style={{
          fontFamily: 'var(--font-archivo-black)',
          color: '#1a1a1a',
        }}
      >
        What brings you here?
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((option, index) => (
          <motion.button
            key={option.intent}
            onClick={() => onSelect(option.intent)}
            className="p-6 rounded-xl border-2 border-gray-200 hover:border-gray-400 transition-all hover:shadow-lg active:scale-95"
            style={{
              backgroundColor: '#fff',
              fontFamily: 'var(--font-archivo)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-4xl mb-3">{option.emoji}</div>
            <div className="text-left text-base font-medium text-gray-800">
              {option.text}
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

interface Question2BuildProps {
  onSelect: (buildType: BuilderAnswer) => void;
}

function Question2Build({ onSelect }: Question2BuildProps) {
  const options: { emoji: string; text: string; type: BuilderAnswer }[] = [
    { emoji: '🏠', text: 'Homeowner / DIY', type: 'homeowner' },
    { emoji: '🛠️', text: 'Licensed contractor', type: 'contractor' },
  ];

  return (
    <motion.div
      key="q2-build"
      className="w-full max-w-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <h1
        className="text-4xl font-bold text-center mb-12"
        style={{
          fontFamily: 'var(--font-archivo-black)',
          color: '#1a1a1a',
        }}
      >
        Are you a...
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((option, index) => (
          <motion.button
            key={option.type}
            onClick={() => onSelect(option.type)}
            className="p-6 rounded-xl border-2 border-gray-200 hover:border-gray-400 transition-all hover:shadow-lg active:scale-95"
            style={{
              backgroundColor: '#fff',
              fontFamily: 'var(--font-archivo)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-4xl mb-3">{option.emoji}</div>
            <div className="text-left text-base font-medium text-gray-800">
              {option.text}
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

interface Question2BusinessProps {
  onSelect: (businessType: BusinessAnswer) => void;
}

function Question2Business({ onSelect }: Question2BusinessProps) {
  const options: { emoji: string; text: string; type: BusinessAnswer }[] = [
    { emoji: '🏗️', text: 'General contracting', type: 'general' },
    { emoji: '⚡', text: 'Specialty trade', type: 'specialty' },
    { emoji: '📦', text: 'Materials / equipment sales', type: 'materials' },
  ];

  return (
    <motion.div
      key="q2-business"
      className="w-full max-w-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <h1
        className="text-4xl font-bold text-center mb-12"
        style={{
          fontFamily: 'var(--font-archivo-black)',
          color: '#1a1a1a',
        }}
      >
        What kind of business?
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((option, index) => (
          <motion.button
            key={option.type}
            onClick={() => onSelect(option.type)}
            className="p-6 rounded-xl border-2 border-gray-200 hover:border-gray-400 transition-all hover:shadow-lg active:scale-95"
            style={{
              backgroundColor: '#fff',
              fontFamily: 'var(--font-archivo)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-4xl mb-3">{option.emoji}</div>
            <div className="text-left text-base font-medium text-gray-800">
              {option.text}
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

interface Question3Props {
  lane: Lane;
  painPoint: string;
  setPainPoint: (value: string) => void;
  onSubmit: () => void;
}

function Question3({ lane, painPoint, setPainPoint, onSubmit }: Question3Props) {
  const laneColor = laneConfig[lane].color;

  return (
    <motion.div
      key="q3"
      className="w-full max-w-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <h1
        className="text-4xl font-bold text-center mb-12"
        style={{
          fontFamily: 'var(--font-archivo-black)',
          color: '#1a1a1a',
        }}
      >
        What's your most painful daily task?
      </h1>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="e.g., Managing project timelines, Tracking material costs, Communicating with crew..."
          value={painPoint}
          onChange={(e) => setPainPoint(e.target.value)}
          className="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-gray-400 transition-colors"
          style={{
            fontFamily: 'var(--font-archivo)',
            backgroundColor: '#fff',
          }}
        />

        <motion.button
          onClick={onSubmit}
          className="w-full py-4 rounded-xl font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
          style={{
            backgroundColor: laneColor,
            fontFamily: 'var(--font-archivo-black)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
        >
          Get Started
        </motion.button>

        <motion.button
          onClick={onSubmit}
          className="w-full py-2 text-sm underline transition-opacity hover:opacity-70"
          style={{ color: '#666', fontFamily: 'var(--font-archivo)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Skip this question
        </motion.button>
      </div>
    </motion.div>
  );
}
