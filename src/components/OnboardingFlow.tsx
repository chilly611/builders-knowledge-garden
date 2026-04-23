'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface OnboardingFlowProps {
  lane: string;
  onComplete: () => void;
  onSkip: () => void;
}

// Celebration confetti animation
const Confetti: React.FC = () => {
  const confetti = Array.from({ length: 30 }, (_, i) => i);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {confetti.map((i) => (
        <motion.div
          key={i}
          className="fixed w-2 h-2 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            backgroundColor: [
              '#1D9E75',
              '#D85A30',
              '#E8443A',
              '#FFD700',
            ][Math.floor(Math.random() * 4)],
          }}
          animate={{
            y: window.innerHeight + 20,
            x: (Math.random() - 0.5) * 200,
            rotate: Math.random() * 360,
            opacity: [1, 0],
          }}
          transition={{
            duration: 2,
            ease: 'easeIn',
            delay: Math.random() * 0.3,
          }}
        />
      ))}
    </div>
  );
};

// Step 1: See What You'll Save
const Step1: React.FC<{
  onComplete: (savings: string) => void;
}> = ({ onComplete }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [animated, setAnimated] = useState(false);

  const options = [
    { label: '$50K - $500K', savings: '$24,000/year in recovered time' },
    { label: '$500K - $5M', savings: '$85,000/year in efficiency gains' },
    { label: '$5M+', savings: '$250,000+/year in waste prevention' },
  ];

  const handleSelect = (option: typeof options[0]) => {
    setSelected(option.label);
    setAnimated(true);
    setTimeout(() => {
      onComplete(option.savings);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">💰</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-archivo)' }}>
          See What You'll Save
        </h2>
        <p className="text-lg text-gray-600">What's your average project value?</p>
      </div>

      <div className="space-y-3 mb-8">
        {options.map((option) => (
          <motion.button
            key={option.label}
            onClick={() => handleSelect(option)}
            className="w-full p-4 rounded-lg font-semibold text-lg transition-all"
            style={{
              backgroundColor: selected === option.label ? '#1D9E75' : '#FAFAF8',
              color: selected === option.label ? '#FFFFFF' : '#1F2937',
              fontFamily: 'var(--font-archivo)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={animated && selected !== option.label}
          >
            {option.label}
          </motion.button>
        ))}
      </div>

      {selected && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center p-4 rounded-lg bg-green-50"
          >
            <motion.div
              className="text-3xl font-bold text-green-700"
              style={{ fontFamily: 'var(--font-archivo)' }}
              animate={animated ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              ✨ Estimated annual savings:
            </motion.div>
            <motion.div
              className="text-4xl font-bold text-green-600 mt-2"
              style={{ fontFamily: 'var(--font-archivo)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 1 }}
            >
              {options.find(o => o.label === selected)?.savings}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
};

// Step 2: Your AI COO Never Sleeps
const Step2: React.FC<{
  onComplete: () => void;
}> = ({ onComplete }) => {
  const [revealed, setRevealed] = useState(false);

  const briefings = [
    { emoji: '🔴', text: 'Rain Thursday — reschedule concrete pour', color: '#E8443A' },
    { emoji: '🟡', text: 'Lumber prices dropped 8% — time to order', color: '#D85A30' },
    { emoji: '🟢', text: 'Framing inspection passed — roof crew cleared', color: '#1D9E75' },
  ];

  const handleGotIt = () => {
    setRevealed(true);
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🤖</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-archivo)' }}>
          Your AI COO Never Sleeps
        </h2>
        <p className="text-lg text-gray-600">Your morning briefing awaits</p>
      </div>

      <div className="mb-8 p-5 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
        <p className="text-sm font-semibold text-blue-900 mb-4" style={{ fontFamily: 'var(--font-archivo)' }}>
          MORNING BRIEFING
        </p>

        <div className="space-y-3">
          {briefings.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={revealed ? { opacity: 1, x: 0 } : { opacity: 0.5, x: 0 }}
              transition={{ delay: revealed ? idx * 0.15 : 0, duration: 0.4 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-white"
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-sm font-medium text-gray-700">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.button
        onClick={handleGotIt}
        className="w-full p-4 rounded-lg font-bold text-lg text-white transition-all"
        style={{ backgroundColor: '#1D9E75', fontFamily: 'var(--font-archivo)' }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={revealed}
      >
        Got it
      </motion.button>

      {revealed && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-gray-600 mt-4"
        >
          Every morning, your AI COO briefs you on what matters. No logging in to check.
        </motion.p>
      )}
    </motion.div>
  );
};

// Step 3: Codes Updated While You Sleep
const Step3: React.FC<{
  onComplete: () => void;
}> = ({ onComplete }) => {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | null>(null);

  const jurisdictions = [
    { name: 'California', code: 'Title 24 - Energy Standards' },
    { name: 'Texas', code: 'IBC 2021 - International Building Code' },
    { name: 'Florida', code: 'Florida Building Code + Hurricane Updates' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">📋</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-archivo)' }}>
          Codes Updated While You Sleep
        </h2>
      </div>

      <div className="mb-8 text-center">
        <motion.div
          className="text-5xl font-bold text-gray-900 mb-2"
          style={{ fontFamily: 'var(--font-archivo)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          2,204
        </motion.div>
        <p className="text-lg font-semibold text-gray-700" style={{ fontFamily: 'var(--font-archivo)' }}>
          building codes
        </p>
        <p className="text-md text-gray-600 mt-1">142+ jurisdictions</p>
      </div>

      <p className="text-center text-gray-700 mb-6">Updated nightly. You'll never build to an outdated code.</p>

      <div className="space-y-2 mb-8">
        {jurisdictions.map((j) => (
          <motion.button
            key={j.name}
            onClick={() => setSelectedJurisdiction(selectedJurisdiction === j.name ? null : j.name)}
            className="w-full p-3 rounded-lg text-left transition-all"
            style={{
              backgroundColor: selectedJurisdiction === j.name ? '#1D9E75' : '#FAFAF8',
              color: selectedJurisdiction === j.name ? '#FFFFFF' : '#1F2937',
              fontFamily: 'var(--font-archivo)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="font-semibold">{j.name}</div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selectedJurisdiction && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-blue-50 border border-blue-200 mb-6"
          >
            <p className="text-sm font-semibold text-blue-900 mb-2" style={{ fontFamily: 'var(--font-archivo)' }}>
              Current Standard:
            </p>
            <p className="text-sm text-blue-800">
              {jurisdictions.find(j => j.name === selectedJurisdiction)?.code}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={onComplete}
        className="w-full p-4 rounded-lg font-bold text-lg text-white transition-all"
        style={{ backgroundColor: '#1D9E75', fontFamily: 'var(--font-archivo)' }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Next
      </motion.button>
    </motion.div>
  );
};

// Step 4: Works With Dirty Hands
const Step4: React.FC<{
  onComplete: () => void;
}> = ({ onComplete }) => {
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const actions = [
    { icon: '🎤', label: 'Log Progress', color: '#1D9E75' },
    { icon: '📸', label: 'Photo Issue', color: '#D85A30' },
    { icon: '🔍', label: 'Check Code', color: '#E8443A' },
  ];

  const handleAction = (label: string) => {
    setActiveAction(label);
    setTimeout(() => setActiveAction(null), 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">📱</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-archivo)' }}>
          Works With Dirty Hands
        </h2>
        <p className="text-lg text-gray-600">Voice-first. Tap or speak. No typing required.</p>
      </div>

      {/* Phone frame mockup */}
      <div className="mx-auto w-full max-w-xs mb-8 p-4 rounded-3xl border-8 border-gray-900 bg-gray-900">
        <div className="bg-white rounded-2xl p-4 space-y-3">
          {actions.map((action) => (
            <motion.button
              key={action.label}
              onClick={() => handleAction(action.label)}
              className="w-full p-4 rounded-lg font-bold text-white flex items-center justify-center gap-3 transition-all"
              style={{ backgroundColor: action.color, fontFamily: 'var(--font-archivo)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-2xl">{action.icon}</span>
              <span>{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {activeAction && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="text-center p-4 rounded-lg bg-green-50 mb-6"
        >
          <p className="text-2xl mb-2">✅</p>
          <p className="font-semibold text-green-700">{activeAction} recorded</p>
        </motion.div>
      )}

      <p className="text-center text-gray-700 mb-6">
        Your phone is your office. Built for the job site, not the desk.
      </p>

      <motion.button
        onClick={onComplete}
        className="w-full p-4 rounded-lg font-bold text-lg text-white transition-all"
        style={{ backgroundColor: '#1D9E75', fontFamily: 'var(--font-archivo)' }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Next
      </motion.button>
    </motion.div>
  );
};

// Step 5: You're Ready
const Step5: React.FC<{
  onComplete: () => void;
}> = ({ onComplete }) => {
  const [showCelebration, setShowCelebration] = useState(true);

  const features = [
    'AI estimates in seconds',
    'Smart scheduling',
    'Live code compliance',
    'Your AI COO',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      {showCelebration && <Confetti />}

      <div className="text-center mb-8">
        <motion.div
          className="text-6xl mb-4 inline-block"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          🎉
        </motion.div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-archivo)' }}>
          You're Ready
        </h2>
        <p className="text-lg font-semibold text-gray-700">Your command center is set up.</p>
      </div>

      <div className="mb-8 p-6 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
        <p className="text-sm font-semibold text-green-900 mb-4" style={{ fontFamily: 'var(--font-archivo)' }}>
          HERE'S WHAT'S WAITING FOR YOU:
        </p>
        <ul className="space-y-3">
          {features.map((feature, idx) => (
            <motion.li
              key={feature}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-green-600" />
              <span className="text-gray-800">{feature}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      <motion.button
        onClick={() => {
          setShowCelebration(false);
          onComplete();
        }}
        className="w-full p-4 rounded-lg font-bold text-lg text-white transition-all"
        style={{ backgroundColor: '#1D9E75', fontFamily: 'var(--font-archivo)' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Get Started
      </motion.button>
    </motion.div>
  );
};

// Main Component
export default function OnboardingFlow({
  lane,
  onComplete,
  onSkip,
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<Record<number, any>>({});

  const steps: Array<{ component: React.FC<{ onComplete: (...args: any[]) => void }>; onComplete: (...args: any[]) => void }> = [
    {
      component: Step1 as any,
      onComplete: (savings: string) => {
        setStepData(prev => ({ ...prev, 0: savings }));
        setCurrentStep(1);
      },
    },
    {
      component: Step2,
      onComplete: () => {
        setCurrentStep(2);
      },
    },
    {
      component: Step3,
      onComplete: () => {
        setCurrentStep(3);
      },
    },
    {
      component: Step4,
      onComplete: () => {
        setCurrentStep(4);
      },
    },
    {
      component: Step5,
      onComplete: () => {
        onComplete();
      },
    },
  ];

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen w-full bg-white flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Progress Bar */}
      <motion.div
        className="h-1 bg-gray-200"
        style={{ backgroundColor: '#FAFAF8' }}
      >
        <motion.div
          className="h-full"
          style={{ backgroundColor: '#1D9E75' }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Header with prominent skip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#888', fontFamily: 'var(--font-archivo)' }}>
          {currentStep + 1} of {steps.length}
        </div>
        <motion.button
          onClick={onSkip}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: '#f5f5f0',
            border: '1px solid #e5e5e0',
            borderRadius: 10,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 700,
            color: '#666',
            cursor: 'pointer',
            fontFamily: 'var(--font-archivo)',
          }}
        >
          Skip Intro →
        </motion.button>
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-2 px-4 mb-6">
        {steps.map((_, idx) => (
          <motion.div
            key={idx}
            className="h-2 rounded-full"
            initial={{ opacity: 0.3 }}
            animate={{
              opacity: idx === currentStep ? 1 : 0.3,
              scale: idx === currentStep ? 1.2 : 1,
            }}
            style={{
              width: idx === currentStep ? '24px' : '8px',
              backgroundColor: idx <= currentStep ? '#1D9E75' : '#E5E7EB',
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <AnimatePresence mode="wait">
          <CurrentStepComponent
            key={currentStep}
            onComplete={steps[currentStep].onComplete}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}
