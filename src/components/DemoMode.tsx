'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEMO_USERS, getDemoDataForLane, Lane, DEMO_PROJECTS, DEMO_KNOWLEDGE_ENTITIES } from './demo-seed-data';

// ─────────────────────────────────────────────────────────────
// COLOR PALETTE & CONSTANTS
// ─────────────────────────────────────────────────────────────

const BRAND_COLORS = {
  Green: '#1D9E75',
  Gold: '#D85A30',
  Red: '#E8443A',
  Purple: '#7F77DD',
  Blue: '#378ADD',
  Orange: '#BA7517',
};

const LANE_COLORS: Record<Lane, string> = {
  dreamer: '#1D9E75',
  builder: '#E8443A',
  specialist: '#D85A30',
  merchant: '#BA7517',
  ally: '#378ADD',
  crew: '#6B7280',
  fleet: '#7F77DD',
  machine: '#6366F1',
};

const LANE_ICONS: Record<Lane, string> = {
  dreamer: '🏠',
  builder: '🏗️',
  specialist: '⚡',
  merchant: '🚛',
  ally: '📊',
  crew: '👷',
  fleet: '🛠️',
  machine: '🤖',
};

const LANE_NAMES: Record<Lane, string> = {
  dreamer: 'Dreamer',
  builder: 'Builder',
  specialist: 'Specialist',
  merchant: 'Merchant',
  ally: 'Ally',
  crew: 'Crew',
  fleet: 'Fleet Manager',
  machine: 'Machine',
};

// ─────────────────────────────────────────────────────────────
// WALKTHROUGH STEPS CONTENT
// ─────────────────────────────────────────────────────────────

type WalkthroughStep = 'intro' | 'lane-select' | 'welcome' | 'your-lane' | 'dream-machine' | 'knowledge-garden' | 'killer-app' | 'ai-copilot' | 'dashboard' | 'cta';

interface StepConfig {
  id: WalkthroughStep;
  number: number;
  title: string;
  description: string;
  getContent: (lane: Lane) => string;
  spotlightElement?: string;
  allowSkip: boolean;
}

const getStepConfigs = (lane: Lane): StepConfig[] => {
  const laneLabel = LANE_NAMES[lane];

  return [
    {
      id: 'welcome',
      number: 1,
      title: "Welcome to Builder's Knowledge Garden",
      description: 'Platform overview',
      getContent: () =>
        'Builder\'s Knowledge Garden is the all-in-one platform for construction professionals. Collaborate, innovate, and scale your business—from dreamers to enterprise operators.',
      allowSkip: true,
    },
    {
      id: 'your-lane',
      number: 2,
      title: `Your Lane: ${laneLabel}`,
      description: 'Lane-specific features',
      getContent: (selectedLane: Lane) => {
        const user = DEMO_USERS[selectedLane];
        return `As a ${laneLabel}, you access specialized tools designed for your role. ${user.bio} Let's explore what makes your workflow unique.`;
      },
      allowSkip: true,
    },
    {
      id: 'dream-machine',
      number: 3,
      title: 'Dream Machine Surface',
      description: 'Creative & conceptual work',
      getContent: () =>
        'The Dream Machine is where projects begin. Dreamers conceptualize, builders estimate, specialists quote. Create your first dream project here—our AI helps with materials, budgets, and design.',
      spotlightElement: 'dream-machine-card',
      allowSkip: false,
    },
    {
      id: 'knowledge-garden',
      number: 4,
      title: 'Knowledge Garden Surface',
      description: 'Search & explore knowledge',
      getContent: () => {
        const sampleEntities = DEMO_KNOWLEDGE_ENTITIES.slice(0, 3);
        const names = sampleEntities.map((e) => e.title).join(', ');
        return `The Knowledge Garden is a living library of construction intelligence. Search thousands of materials, techniques, regulations, and suppliers. Example: ${names}. Knowledge is filterable by lane, project type, and compliance.`;
      },
      spotlightElement: 'knowledge-garden-card',
      allowSkip: false,
    },
    {
      id: 'killer-app',
      number: 5,
      title: 'Killer App Surface',
      description: 'Execution & operations',
      getContent: () =>
        'The Killer App is where work gets done. Project management, CRM, financial tools, crew coordination. See real-time progress, budgets, and team performance across your portfolio.',
      spotlightElement: 'killer-app-card',
      allowSkip: false,
    },
    {
      id: 'ai-copilot',
      number: 6,
      title: 'AI Copilot',
      description: 'AI-powered assistance',
      getContent: () =>
        'Your AI copilot powers everything: morning briefings, quest generation, proposal writing, compliance checking, cost estimation. Ask questions, get answers grounded in your data.',
      spotlightElement: 'ai-copilot-card',
      allowSkip: true,
    },
    {
      id: 'dashboard',
      number: 7,
      title: 'Your Dashboard',
      description: 'XP, achievements, progress',
      getContent: () =>
        'Gamification keeps you motivated. Earn XP for actions. Unlock achievements. Build streaks. Level up from Apprentice to Architect. Your dashboard shows real-time stats and upcoming quests.',
      spotlightElement: 'dashboard-card',
      allowSkip: true,
    },
    {
      id: 'cta',
      number: 8,
      title: 'Get Started',
      description: 'Join now',
      getContent: () =>
        `Ready to transform your construction workflow? Sign up now and join thousands of ${laneLabel}s already building smarter. Your first 30 days are free.`,
      allowSkip: false,
    },
  ];
};

// ─────────────────────────────────────────────────────────────
// COMPONENT: LANE SELECTOR
// ─────────────────────────────────────────────────────────────

interface LaneSelectorProps {
  onSelectLane: (lane: Lane) => void;
  onDismiss: () => void;
}

function LaneSelector({ onSelectLane, onDismiss }: LaneSelectorProps) {
  const lanes: Lane[] = ['dreamer', 'builder', 'specialist', 'merchant', 'ally', 'crew', 'fleet', 'machine'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Take a Tour</h1>
          <p className="text-gray-600">Choose your lane to see personalized features</p>
          <p className="text-sm text-gray-500 mt-2">Estimated time: 5 minutes</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {lanes.map((lane) => {
            const user = DEMO_USERS[lane];
            return (
              <motion.button
                key={lane}
                onClick={() => onSelectLane(lane)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-4 rounded-xl border-2 hover:border-current transition-all"
                style={{ borderColor: LANE_COLORS[lane] }}
              >
                <div
                  className="text-3xl mb-2"
                  style={{ filter: `drop-shadow(0 0 2px ${LANE_COLORS[lane]})` }}
                >
                  {LANE_ICONS[lane]}
                </div>
                <p className="text-xs font-semibold text-gray-700">{LANE_NAMES[lane]}</p>
              </motion.button>
            );
          })}
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: SPOTLIGHT EFFECT (overlay dimming)
// ─────────────────────────────────────────────────────────────

interface SpotlightProps {
  elementId?: string;
  isActive: boolean;
}

function Spotlight({ elementId, isActive }: SpotlightProps) {
  const [position, setPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!isActive || !elementId) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const element = document.getElementById(elementId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setPosition({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [elementId, isActive]);

  if (!isActive || !position) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 pointer-events-none z-40"
    >
      {/* Darkened background */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Spotlight cutout */}
      <div
        className="absolute bg-transparent border-2 border-blue-400 rounded-xl"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${position.width}px`,
          height: `${position.height}px`,
          boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.4)`,
        }}
      />

      {/* Animated pulse ring */}
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute border-2 border-blue-400 rounded-xl pointer-events-none"
        style={{
          left: `${position.x - 4}px`,
          top: `${position.y - 4}px`,
          width: `${position.width + 8}px`,
          height: `${position.height + 8}px`,
        }}
      />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: TOOLTIP WITH POINTER
// ─────────────────────────────────────────────────────────────

interface TooltipProps {
  title: string;
  content: string;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious?: () => void;
  onSkip: () => void;
  canGoBack: boolean;
  isLastStep: boolean;
}

function Tooltip({
  title,
  content,
  stepNumber,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  canGoBack,
  isLastStep,
}: TooltipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4"
    >
      <div className="bg-white rounded-xl shadow-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {stepNumber} of {totalSteps}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-200 rounded-full mb-4 overflow-hidden">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${(stepNumber / totalSteps) * 100}%` }}
            className="h-full rounded-full"
            style={{ backgroundColor: BRAND_COLORS.Gold }}
          />
        </div>

        <p className="text-gray-700 text-sm mb-6 leading-relaxed">{content}</p>

        {/* Action buttons */}
        <div className="flex gap-3 mb-3">
          {canGoBack && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onPrevious}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Previous
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNext}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ backgroundColor: BRAND_COLORS.Gold }}
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </motion.button>
        </div>

        <button
          onClick={onSkip}
          className="w-full text-xs text-gray-500 hover:text-gray-700 font-medium py-2 transition-colors"
        >
          Skip Tour
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: DEMO BADGE
// ─────────────────────────────────────────────────────────────

function DemoBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg text-xs font-bold"
    >
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
      </span>
      DEMO MODE
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: DEMO CONTENT CARDS
// ─────────────────────────────────────────────────────────────

interface CardProps {
  id: string;
  title: string;
  icon: string;
  description: string;
  color: string;
}

function Card({ id, title, icon, description, color }: CardProps) {
  return (
    <div
      id={id}
      className="p-6 rounded-xl border-2 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-shadow"
      style={{ borderColor: color }}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: MAIN DEMO MODE
// ─────────────────────────────────────────────────────────────

interface DemoModeProps {
  isOpen: boolean;
  onClose: () => void;
  onDemoComplete: () => void;
}

export function DemoMode({ isOpen, onClose, onDemoComplete }: DemoModeProps) {
  const [phase, setPhase] = useState<'intro' | 'active'>('intro');
  const [selectedLane, setSelectedLane] = useState<Lane | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const handleSelectLane = (lane: Lane) => {
    setSelectedLane(lane);
    setPhase('active');
    setCurrentStepIndex(0);
  };

  const handleDismiss = () => {
    setPhase('intro');
    setSelectedLane(null);
    setCurrentStepIndex(0);
    onClose();
  };

  const handleNext = () => {
    if (!selectedLane) return;

    const steps = getStepConfigs(selectedLane);
    if (currentStepIndex === steps.length - 1) {
      // Last step completed
      onDemoComplete();
    } else {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSkipTour = () => {
    handleDismiss();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {phase === 'intro' ? (
        <LaneSelector onSelectLane={handleSelectLane} onDismiss={handleDismiss} />
      ) : selectedLane ? (
        <WalkthroughPhase
          lane={selectedLane}
          currentStepIndex={currentStepIndex}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSkip={handleSkipTour}
          onClose={handleDismiss}
        />
      ) : null}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: WALKTHROUGH PHASE
// ─────────────────────────────────────────────────────────────

interface WalkthroughPhaseProps {
  lane: Lane;
  currentStepIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onClose: () => void;
}

function WalkthroughPhase({
  lane,
  currentStepIndex,
  onNext,
  onPrevious,
  onSkip,
  onClose,
}: WalkthroughPhaseProps) {
  const steps = getStepConfigs(lane);
  const currentStep = steps[currentStepIndex];
  const user = DEMO_USERS[lane];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft' && currentStepIndex > 0) onPrevious();
      if (e.key === 'Escape') onSkip();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentStepIndex, onNext, onPrevious, onSkip]);

  return (
    <>
      <DemoBadge />
      <Spotlight elementId={currentStep.spotlightElement} isActive={!!currentStep.spotlightElement} />

      {/* Demo content background */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-white z-10">
        {/* Header with user info */}
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white"
                style={{ backgroundColor: LANE_COLORS[lane] }}
              >
                {LANE_ICONS[lane]}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
                <p className="text-xs text-gray-500">{LANE_NAMES[lane]} Lane</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 font-semibold text-sm"
            >
              Exit Demo ✕
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          {currentStepIndex === 0 && <WelcomeStep lane={lane} />}
          {currentStepIndex === 1 && <YourLaneStep lane={lane} />}
          {currentStepIndex === 2 && <DreamMachineStep />}
          {currentStepIndex === 3 && <KnowledgeGardenStep />}
          {currentStepIndex === 4 && <KillerAppStep />}
          {currentStepIndex === 5 && <AICopilotStep />}
          {currentStepIndex === 6 && <DashboardStep lane={lane} />}
          {currentStepIndex === 7 && <GetStartedStep lane={lane} />}
        </div>
      </div>

      {/* Tooltip */}
      <Tooltip
        title={currentStep.title}
        content={currentStep.getContent(lane)}
        stepNumber={currentStepIndex + 1}
        totalSteps={steps.length}
        onNext={onNext}
        onPrevious={onPrevious}
        onSkip={onSkip}
        canGoBack={currentStepIndex > 0}
        isLastStep={currentStepIndex === steps.length - 1}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// WALKTHROUGH STEP COMPONENTS
// ─────────────────────────────────────────────────────────────

function WelcomeStep({ lane }: { lane: Lane }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Welcome to Builder's Knowledge Garden</h1>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Three surfaces work together: <span className="font-semibold">Dream Machine</span> for creativity,{' '}
        <span className="font-semibold">Knowledge Garden</span> for intelligence, and{' '}
        <span className="font-semibold">Killer App</span> for execution.
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        <Card
          id="dream-surface"
          icon="💭"
          title="Dream Machine"
          color={BRAND_COLORS.Gold}
          description="Conceptualize projects with AI guidance. Create mood boards, budgets, and material lists."
        />
        <Card
          id="knowledge-surface"
          icon="📚"
          title="Knowledge Garden"
          color={BRAND_COLORS.Green}
          description="Search thousands of materials, techniques, regulations. Filter by lane, project type, compliance."
        />
        <Card
          id="killer-surface"
          icon="⚙️"
          title="Killer App"
          color={BRAND_COLORS.Red}
          description="Project management, CRM, financials. Real-time tracking across your entire portfolio."
        />
      </div>
    </motion.div>
  );
}

function YourLaneStep({ lane }: { lane: Lane }) {
  const user = DEMO_USERS[lane];
  const demoData = getDemoDataForLane(lane);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Lane: {LANE_NAMES[lane]}</h1>
      <p className="text-gray-600 mb-8">{user.bio}</p>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-6 border-2" style={{ borderColor: LANE_COLORS[lane] }}>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Your Profile</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600">Level:</span>{' '}
              <span className="font-semibold text-gray-900">{user.level}</span>
            </div>
            <div>
              <span className="text-gray-600">Total XP:</span>{' '}
              <span className="font-semibold text-gray-900">{user.xp.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600">Streak:</span>{' '}
              <span className="font-semibold text-gray-900">{user.streak} days 🔥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-blue-300">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Focus Quest This Week</h3>
          <p className="text-sm text-gray-700 mb-3">{demoData.quests[0].title}</p>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${demoData.quests[0].progress}%` }}
              className="h-full bg-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{demoData.quests[0].progress}% complete</p>
        </div>
      </div>
    </motion.div>
  );
}

function DreamMachineStep() {
  const projects = DEMO_PROJECTS.filter((p) => p.phase === 'dream' || p.phase === 'plan');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Dream Machine Surface</h1>
      <p className="text-lg text-gray-700 mb-8">
        Start a new project. Our AI guides you through conceptualization, material selection, budgeting, and timeline planning.
      </p>

      <div id="dream-machine-card" className="bg-white rounded-xl border-2 border-yellow-300 p-8 mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Featured Project: {projects[0]?.title}</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">Description:</p>
            <p className="text-gray-900 font-medium">{projects[0]?.description}</p>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600">Budget:</span>{' '}
              <span className="font-semibold text-gray-900">${projects[0]?.budget.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600">Timeline:</span>{' '}
              <span className="font-semibold text-gray-900">{projects[0]?.timeline}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-gray-700">
        AI features: Material lists, cost estimation, aesthetic inspiration, contractor matching, compliance checks, and timeline optimization.
      </p>
    </motion.div>
  );
}

function KnowledgeGardenStep() {
  const sampleEntities = DEMO_KNOWLEDGE_ENTITIES.slice(0, 4);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Knowledge Garden Surface</h1>
      <p className="text-lg text-gray-700 mb-8">
        Search thousands of materials, techniques, regulations, standards, and suppliers. Filter by lane, industry, compliance, and budget.
      </p>

      <div id="knowledge-garden-card" className="grid md:grid-cols-2 gap-4 mb-6">
        {sampleEntities.slice(0, 2).map((entity) => (
          <div key={entity.id} className="bg-white rounded-xl border-2 border-green-300 p-4">
            <h3 className="font-bold text-gray-900 mb-2">{entity.title}</h3>
            <p className="text-sm text-gray-700 mb-3">{entity.description.substring(0, 100)}...</p>
            <div className="flex flex-wrap gap-2">
              {entity.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-gray-700 mb-4">
        Every entity is tagged, searchable, and linked to projects and compliance requirements. Rate and annotate with your own insights.
      </p>
    </motion.div>
  );
}

function KillerAppStep() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Killer App Surface</h1>
      <p className="text-lg text-gray-700 mb-8">
        Where execution happens. Manage projects, track budgets, coordinate teams, manage finances, and monitor compliance in real-time.
      </p>

      <div id="killer-app-card" className="grid md:grid-cols-3 gap-4 mb-8">
        <Card
          id="pm-card"
          icon="📋"
          title="Project Management"
          color={BRAND_COLORS.Red}
          description="Tasks, timelines, dependencies, milestones, and resource allocation."
        />
        <Card
          id="crm-card"
          icon="👥"
          title="CRM"
          color={BRAND_COLORS.Red}
          description="Contractors, suppliers, customers. Track interactions and relationships."
        />
        <Card
          id="financial-card"
          icon="💰"
          title="Financials"
          color={BRAND_COLORS.Red}
          description="Budgets, invoices, payments, forecasting, and ROI tracking."
        />
      </div>

      <p className="text-gray-700">
        All integrated. One source of truth. Real-time dashboards. Automated reporting. Export to accounting software.
      </p>
    </motion.div>
  );
}

function AICopilotStep() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">AI Copilot</h1>
      <p className="text-lg text-gray-700 mb-8">
        Your AI assistant powers daily workflows. Morning briefings, quest generation, proposal writing, compliance checking, and cost estimation.
      </p>

      <div id="ai-copilot-card" className="bg-white rounded-xl border-2 border-purple-300 p-6 mb-6">
        <h3 className="font-bold text-gray-900 mb-4">AI Capabilities</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold text-gray-900">Morning Briefing</span>
            <p className="text-gray-600 text-xs">Lane-specific insights and actionable priorities</p>
          </div>
          <div>
            <span className="font-semibold text-gray-900">Quest Generation</span>
            <p className="text-gray-600 text-xs">Personalized learning and growth opportunities</p>
          </div>
          <div>
            <span className="font-semibold text-gray-900">Proposal Writing</span>
            <p className="text-gray-600 text-xs">Auto-generate professional proposals from templates</p>
          </div>
          <div>
            <span className="font-semibold text-gray-900">Compliance Check</span>
            <p className="text-gray-600 text-xs">Ensure projects meet all regulations</p>
          </div>
        </div>
      </div>

      <p className="text-gray-700">
        All AI is grounded in your data. Privacy-first. No external training. SOC 2 compliant. Enterprise-ready.
      </p>
    </motion.div>
  );
}

function DashboardStep({ lane }: { lane: Lane }) {
  const demoData = getDemoDataForLane(lane);
  const achievements = demoData.achievements.slice(0, 3);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Your Dashboard</h1>
      <p className="text-lg text-gray-700 mb-8">
        Gamification keeps you motivated. Earn XP, unlock achievements, build streaks, and level up from Apprentice to Architect.
      </p>

      <div id="dashboard-card" className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border-2 border-blue-300 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Level Progress</h3>
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
              style={{ backgroundColor: LANE_COLORS[lane] }}
            >
              {demoData.user.level[0]}
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Level</p>
              <p className="font-bold text-gray-900">{demoData.user.level}</p>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '65%' }}
              className="h-full"
              style={{ backgroundColor: LANE_COLORS[lane] }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">3,200 / 5,000 XP to Master</p>
        </div>

        <div className="bg-white rounded-xl border-2 border-orange-300 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Stats</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total XP</span>
              <span className="font-semibold text-gray-900">{demoData.user.xp.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Streak</span>
              <span className="font-semibold text-gray-900">{demoData.user.streak} days 🔥</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Achievements</span>
              <span className="font-semibold text-gray-900">{achievements.length} unlocked</span>
            </div>
          </div>
        </div>
      </div>

      <h3 className="font-bold text-gray-900 mb-3">Recent Achievements</h3>
      <div className="grid md:grid-cols-3 gap-3">
        {achievements.map((ach) => (
          <div key={ach.id} className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-2xl mb-2">{ach.icon}</p>
            <p className="text-xs font-bold text-gray-900">{ach.title}</p>
            <p className="text-xs text-gray-500 mt-1">+{ach.xpReward} XP</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function GetStartedStep({ lane }: { lane: Lane }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto text-center"
    >
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Ready to Get Started?</h1>
      <p className="text-lg text-gray-700 mb-8">
        You've seen what {LANE_NAMES[lane]}s can accomplish in Builder's Knowledge Garden. Join thousands of construction professionals already building smarter.
      </p>

      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-8 border-2 border-yellow-300 mb-8">
        <p className="text-gray-700 mb-4">First 30 days free. No credit card required. Full access to all features.</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-lg"
        >
          Sign Up as {LANE_NAMES[lane]}
        </motion.button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="text-center">
          <p className="text-2xl mb-2">⚡</p>
          <p className="font-semibold text-gray-900 text-sm">Quick Onboarding</p>
        </div>
        <div className="text-center">
          <p className="text-2xl mb-2">🤖</p>
          <p className="font-semibold text-gray-900 text-sm">AI-Powered Guidance</p>
        </div>
        <div className="text-center">
          <p className="text-2xl mb-2">🎁</p>
          <p className="font-semibold text-gray-900 text-sm">Exclusive Benefits</p>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        Questions? Check out our{' '}
        <span className="underline cursor-pointer font-semibold">knowledge base</span> or{' '}
        <span className="underline cursor-pointer font-semibold">chat with support</span>.
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXPORT: DEMO LAUNCHER BUTTON
// ─────────────────────────────────────────────────────────────

interface DemoLauncherProps {
  onDemoComplete?: () => void;
}

export function DemoLauncher({ onDemoComplete }: DemoLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="px-6 py-2 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-900 hover:border-gray-400 transition-colors"
      >
        Take a Tour
      </motion.button>

      <DemoMode
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onDemoComplete={() => {
          setIsOpen(false);
          onDemoComplete?.();
        }}
      />
    </>
  );
}
