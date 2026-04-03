'use client';

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectProvider, useProject } from '../../dream-shared/ProjectContext';
import SaveLoadPanel from '../../dream-shared/SaveLoadPanel';
import ProjectPicker from '../../dream-shared/ProjectPicker';
import type { OracleState, DreamProject } from '../../dream-shared/types';

type Phase = 'intro' | 'questions' | 'processing' | 'profile' | 'renders';

interface DreamProfile {
  lightPreference: string;
  socialScale: number;
  natureRelationship: string;
  aestheticDNA: string;
  securityNeed: string;
  rechargeMethod: string;
  homeEssence: string;
  overallVibe: string;
}

interface RenderResult {
  url: string;
  prompt: string;
}

const QUESTIONS = [
  'What does your perfect morning look like?',
  'How do you entertain?',
  "What's your relationship with nature?",
  'Describe the most beautiful place you\'ve ever been.',
  'What makes you feel safe?',
  'How do you recharge?',
  'What would your home say about you to a stranger?',
];

const PROCESSING_STEPS = [
  'Reading your dreams...',
  'Mapping emotional architecture...',
  'Analyzing aesthetic wavelengths...',
  'Constructing your profile...',
  'Generating renders...',
];

function OraclePageInner() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(7).fill(''));
  const [profile, setProfile] = useState<DreamProfile | null>(null);
  const [renders, setRenders] = useState<RenderResult[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
    }
  }, []);

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('oracle_progress');
    if (saved) {
      try {
        const { phase: savedPhase, answers: savedAnswers } = JSON.parse(saved);
        setPhase(savedPhase);
        if (savedAnswers) setAnswers(savedAnswers);
        if (savedPhase === 'questions') {
          const filledCount = savedAnswers.filter((a: string) => a.trim()).length;
          setCurrentQuestion(filledCount);
        }
      } catch (e) {
        console.error('Failed to load saved progress:', e);
      }
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    if (phase === 'questions' || phase === 'intro') {
      localStorage.setItem('oracle_progress', JSON.stringify({ phase, answers }));
    }
  }, [phase, answers]);

  // Handle voice input
  const startVoiceInput = () => {
    if (!recognitionRef.current) {
      setError('Voice input not supported on this browser');
      return;
    }

    setIsRecording(true);
    let interimTranscript = '';

    recognitionRef.current.onstart = () => {
      setIsRecording(true);
    };

    recognitionRef.current.onresult = (event: any) => {
      interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          const newAnswers = [...answers];
          newAnswers[currentQuestion] = (newAnswers[currentQuestion] + ' ' + transcript).trim();
          setAnswers(newAnswers);
        } else {
          interimTranscript += transcript;
        }
      }

      if (textInputRef.current) {
        textInputRef.current.value = interimTranscript;
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      setError(`Voice input error: ${event.error}`);
      setIsRecording(false);
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
      if (textInputRef.current) {
        textInputRef.current.value = '';
      }
    };

    recognitionRef.current.start();
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      setIsRecording(false);
    }
  };

  // Handle text input change
  const handleAnswerChange = (text: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = text;
    setAnswers(newAnswers);
  };

  // Handle next question or move to processing
  const handleNext = () => {
    if (answers[currentQuestion].trim() === '') {
      setError('Please provide an answer before continuing');
      return;
    }

    setError(null);

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // All questions answered, move to processing
      beginProcessing();
    }
  };

  // Begin the analysis and rendering process
  const beginProcessing = async () => {
    setPhase('processing');
    setProcessingStep(0);
    setIsLoading(true);

    // Simulate processing steps
    for (let i = 0; i < PROCESSING_STEPS.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setProcessingStep(i + 1);
    }

    try {
      // Step 1: Analyze answers to create profile
      const profileResponse = await fetch('/api/v1/oracle/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to analyze answers');
      }

      const profileData = await profileResponse.json();
      setProfile(profileData.profile);

      // Step 2: Generate renders using profile data
      const renderPrompts = generateRenderPrompts(profileData.profile);
      const renderedImages: RenderResult[] = [];

      for (const prompt of renderPrompts) {
        try {
          const renderResponse = await fetch('/api/v1/render', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
          });

          if (renderResponse.ok) {
            const renderData = await renderResponse.json();
            renderedImages.push({ url: renderData.url, prompt });
          }
        } catch (e) {
          console.error('Failed to generate render:', e);
          // Fallback to placeholder
          renderedImages.push({
            url: `https://images.unsplash.com/photo-${1600000000000 + Math.random() * 1000000}?w=500&h=500`,
            prompt,
          });
        }
      }

      setRenders(renderedImages);

      // Step 3: Save to Supabase
      try {
        await fetch('/api/v1/dreams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers,
            profile: profileData.profile,
            renders: renderedImages,
          }),
        });
      } catch (e) {
        console.error('Failed to save dream profile:', e);
      }

      // Move to profile phase
      setPhase('profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate profile');
      setPhase('questions');
      setIsLoading(false);
    }
  };

  const generateRenderPrompts = (profile: DreamProfile): string[] => {
    return [
      `A dream home reflecting ${profile.aestheticDNA} aesthetic with ${profile.lightPreference} lighting, surrounded by ${profile.natureRelationship}`,
      `An interior space embodying ${profile.overallVibe} energy, designed for ${profile.rechargeMethod}, with ${profile.securityNeed} elements`,
      `An architectural sanctuary that says "${profile.homeEssence}" with social scale of ${profile.socialScale}, bathed in ${profile.lightPreference}`,
    ];
  };

  const handleProfileRevealed = () => {
    setTimeout(() => {
      setPhase('renders');
    }, 2000);
  };

  const handleStartOver = () => {
    localStorage.removeItem('oracle_progress');
    setPhase('intro');
    setCurrentQuestion(0);
    setAnswers(Array(7).fill(''));
    setProfile(null);
    setRenders([]);
    setError(null);
    setProcessingStep(0);
  };

  // ─── Save/Load Integration ───
  const [showPicker, setShowPicker] = useState(false);

  const handleSerialize = useCallback(() => {
    const interfaceData: OracleState = {
      phase,
      currentQuestion,
      answers,
      profile,
    };
    return {
      interfaceData,
      essence: {
        freeformNotes: answers.filter(a => a.trim()).join(' | '),
        profileSummary: profile?.overallVibe || '',
        styles: profile?.aestheticDNA ? [profile.aestheticDNA] : [],
      },
    };
  }, [phase, currentQuestion, answers, profile]);

  const handleDeserialize = useCallback((data: { interfaceData: unknown; essence: DreamProject['dreamEssence'] }) => {
    const state = data.interfaceData as OracleState | null;
    if (state) {
      setPhase(state.phase || 'intro');
      setCurrentQuestion(state.currentQuestion || 0);
      setAnswers(state.answers || Array(7).fill(''));
      setProfile(state.profile || null);
    } else if (data.essence) {
      // Seed from dream essence (cross-interface import)
      if (data.essence.freeformNotes) {
        const notes = data.essence.freeformNotes.split(' | ');
        setAnswers(prev => notes.map((n, i) => n || prev[i] || ''));
      }
      setPhase('questions');
    }
  }, []);

  return (
    <div style={{ ...styles.container, '--phase': '#D85A30' } as React.CSSProperties}>
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(216, 90, 48, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(216, 90, 48, 0.6);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <IntroPhase key="intro" onBegin={() => setPhase('questions')} />
        )}

        {phase === 'questions' && (
          <QuestionsPhase
            key="questions"
            questionIndex={currentQuestion}
            question={QUESTIONS[currentQuestion]}
            answer={answers[currentQuestion]}
            onAnswerChange={handleAnswerChange}
            onNext={handleNext}
            onVoiceStart={startVoiceInput}
            onVoiceStop={stopVoiceInput}
            isRecording={isRecording}
            inputRef={textInputRef}
            error={error}
            setError={setError}
            totalQuestions={QUESTIONS.length}
          />
        )}

        {phase === 'processing' && (
          <ProcessingPhase
            key="processing"
            step={processingStep}
            totalSteps={PROCESSING_STEPS.length}
            steps={PROCESSING_STEPS}
          />
        )}

        {phase === 'profile' && profile && (
          <ProfilePhase
            key="profile"
            profile={profile}
            onRevealed={handleProfileRevealed}
          />
        )}

        {phase === 'renders' && renders.length > 0 && (
          <RendersPhase
            key="renders"
            renders={renders}
            profile={profile}
            onStartOver={handleStartOver}
          />
        )}
      </AnimatePresence>

      {/* Save/Load System */}
      <SaveLoadPanel
        interfaceType="oracle"
        accentColor="#D85A30"
        onSerialize={handleSerialize}
        onDeserialize={handleDeserialize}
        onOpenPicker={() => setShowPicker(true)}
      />
      <ProjectPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelectProject={(project) => {
          const iData = project.interfaceData.oracle;
          handleDeserialize({ interfaceData: iData || null, essence: project.dreamEssence });
        }}
        currentInterfaceType="oracle"
        accentColor="#D85A30"
      />
    </div>
  );
}

// ============================================================================
// INTRO PHASE
// ============================================================================

function IntroPhase({ onBegin }: { onBegin: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        ...styles.fullScreen,
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0f05 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Atmospheric background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(216, 90, 48, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        style={{
          textAlign: 'center',
          zIndex: 1,
          maxWidth: '600px',
          padding: '40px',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-archivo)',
            fontSize: '56px',
            fontWeight: 700,
            color: '#D85A30',
            marginBottom: '20px',
            letterSpacing: '-1px',
          }}
        >
          The Oracle
        </h1>

        <p
          style={{
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '40px',
            lineHeight: 1.6,
            fontWeight: 300,
          }}
        >
          Discover your dream home through seven profound questions. The Oracle will read your answers and reveal the architectural essence of your ideal sanctuary.
        </p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBegin}
          style={{
            ...styles.accentButton,
            fontSize: '16px',
            padding: '16px 48px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-archivo)',
            fontWeight: 600,
            background: '#D85A30',
            color: 'white',
            boxShadow: '0 8px 24px rgba(216, 90, 48, 0.3)',
            transition: 'all 0.3s ease',
          }}
        >
          Begin Your Reading
        </motion.button>
      </motion.div>

      {/* Decorative elements */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
        style={{
          position: 'absolute',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(196, 164, 74, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }}
      />
    </motion.div>
  );
}

// ============================================================================
// QUESTIONS PHASE
// ============================================================================

function QuestionsPhase({
  questionIndex,
  question,
  answer,
  onAnswerChange,
  onNext,
  onVoiceStart,
  onVoiceStop,
  isRecording,
  inputRef,
  error,
  setError,
  totalQuestions,
}: {
  questionIndex: number;
  question: string;
  answer: string;
  onAnswerChange: (text: string) => void;
  onNext: () => void;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  isRecording: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  error: string | null;
  setError: (error: string | null) => void;
  totalQuestions: number;
}) {
  // Different background atmospheres for each question
  const backgroundGradients = [
    'linear-gradient(135deg, #0a0a0a 0%, #2d1810 100%)',
    'linear-gradient(135deg, #0a0a0a 0%, #1a1a3d 100%)',
    'linear-gradient(135deg, #0a0a0a 0%, #1d2b1a 100%)',
    'linear-gradient(135deg, #0a0a0a 0%, #2b1d1d 100%)',
    'linear-gradient(135deg, #0a0a0a 0%, #1a0f2e 100%)',
    'linear-gradient(135deg, #0a0a0a 0%, #2d2310 100%)',
    'linear-gradient(135deg, #0a0a0a 0%, #1a2a2d 100%)',
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        ...styles.fullScreen,
        background: backgroundGradients[questionIndex],
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '40px 20px',
      }}
    >
      {/* Ambient background effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 40%, rgba(216, 90, 48, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Progress indicator */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'absolute',
          top: '40px',
          left: '40px',
          color: 'rgba(255, 255, 255, 0.6)',
          fontFamily: 'var(--font-archivo)',
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '1px',
        }}
      >
        Question {questionIndex + 1} of {totalQuestions}
      </motion.div>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '3px',
          width: `${((questionIndex + 1) / totalQuestions) * 100}%`,
          background: '#D85A30',
          transition: 'width 0.5s ease',
        }}
      />

      {/* Main content */}
      <motion.div
        key={`question-${questionIndex}`}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          zIndex: 1,
          maxWidth: '700px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-archivo)',
            fontSize: '48px',
            fontWeight: 700,
            color: 'white',
            marginBottom: '60px',
            lineHeight: 1.3,
            letterSpacing: '-0.5px',
          }}
        >
          {question}
        </h2>

        {/* Input area */}
        <div style={{ marginBottom: '40px' }}>
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={(e) => {
              onAnswerChange(e.target.value);
              setError(null);
            }}
            placeholder="Share your thoughts..."
            style={{
              width: '100%',
              padding: '20px 24px',
              fontSize: '16px',
              fontFamily: 'var(--font-archivo)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(216, 90, 48, 0.3)',
              borderRadius: '12px',
              color: 'white',
              transition: 'all 0.3s ease',
              outline: 'none',
              boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)',
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') onNext();
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(216, 90, 48, 0.6)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(216, 90, 48, 0.3)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          />
        </div>

        {/* Voice and action buttons */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={isRecording ? onVoiceStop : onVoiceStart}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              border: 'none',
              background: isRecording
                ? 'linear-gradient(135deg, #D85A30 0%, #C4A44A 100%)'
                : 'rgba(216, 90, 48, 0.2)',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              transition: 'all 0.3s ease',
              boxShadow: isRecording ? '0 0 20px rgba(216, 90, 48, 0.6)' : 'none',
              animation: isRecording ? 'glow 1s ease-in-out infinite' : 'none',
            }}
            title="Voice input"
          >
            🎤
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNext}
            disabled={!answer.trim()}
            style={{
              padding: '14px 40px',
              fontSize: '16px',
              fontFamily: 'var(--font-archivo)',
              fontWeight: 600,
              background: answer.trim() ? '#D85A30' : 'rgba(216, 90, 48, 0.3)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: answer.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              opacity: answer.trim() ? 1 : 0.6,
            }}
          >
            Next
          </motion.button>
        </div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                color: '#ff6b6b',
                fontSize: '14px',
                marginTop: '16px',
                fontWeight: 500,
              }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// PROCESSING PHASE
// ============================================================================

function ProcessingPhase({
  step,
  totalSteps,
  steps,
}: {
  step: number;
  totalSteps: number;
  steps: string[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        ...styles.fullScreen,
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0f05 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(196, 164, 74, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        style={{
          textAlign: 'center',
          zIndex: 1,
          maxWidth: '500px',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-archivo)',
            fontSize: '36px',
            fontWeight: 700,
            color: '#C4A44A',
            marginBottom: '60px',
            letterSpacing: '-0.5px',
          }}
        >
          The Oracle is Reading...
        </h2>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            marginBottom: '60px',
          }}
        >
          {steps.map((stepText, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: index <= step ? 1 : 0.3,
                x: 0,
              }}
              transition={{ delay: index * 0.1 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background:
                    index <= step
                      ? '#D85A30'
                      : 'rgba(196, 164, 74, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  animation:
                    index === step
                      ? 'shimmer 1.5s ease-in-out infinite'
                      : 'none',
                }}
              >
                {index < step ? '✓' : index + 1}
              </div>
              <p
                style={{
                  fontSize: '16px',
                  color:
                    index <= step
                      ? 'rgba(255, 255, 255, 0.9)'
                      : 'rgba(255, 255, 255, 0.4)',
                  fontFamily: 'var(--font-archivo)',
                  fontWeight: 500,
                  margin: 0,
                  textAlign: 'left',
                }}
              >
                {stepText}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: '100%',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #D85A30 0%, #C4A44A 100%)',
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// PROFILE PHASE
// ============================================================================

function ProfilePhase({
  profile,
  onRevealed,
}: {
  profile: DreamProfile;
  onRevealed: () => void;
}) {
  useEffect(() => {
    onRevealed();
  }, [onRevealed]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        ...styles.fullScreen,
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0f05 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(216, 90, 48, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        style={{
          maxWidth: '600px',
          padding: '60px 40px',
          background: 'linear-gradient(135deg, rgba(26, 15, 5, 0.8) 0%, rgba(30, 20, 10, 0.6) 100%)',
          border: '1px solid rgba(216, 90, 48, 0.3)',
          borderRadius: '16px',
          zIndex: 1,
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-archivo)',
            fontSize: '32px',
            fontWeight: 700,
            color: '#D85A30',
            marginBottom: '40px',
            textAlign: 'center',
          }}
        >
          Your Dream Profile
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
          }}
        >
          {[
            { label: 'Light Preference', value: profile.lightPreference },
            { label: 'Social Scale', value: `${profile.socialScale}/10` },
            { label: 'Nature Connection', value: profile.natureRelationship },
            { label: 'Aesthetic DNA', value: profile.aestheticDNA },
            { label: 'Security Need', value: profile.securityNeed },
            { label: 'Recharge Method', value: profile.rechargeMethod },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.08 }}
              style={{
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(196, 164, 74, 0.2)',
                borderRadius: '8px',
              }}
            >
              <p
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  margin: '0 0 8px 0',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'var(--font-archivo)',
                }}
              >
                {item.label}
              </p>
              <p
                style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  margin: 0,
                  fontFamily: 'var(--font-archivo)',
                  fontWeight: 500,
                }}
              >
                {item.value}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            marginTop: '32px',
            padding: '24px',
            background: 'rgba(196, 164, 74, 0.08)',
            border: '1px solid rgba(196, 164, 74, 0.3)',
            borderRadius: '8px',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              color: '#C4A44A',
              margin: '0 0 8px 0',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontFamily: 'var(--font-archivo)',
            }}
          >
            Overall Essence
          </p>
          <p
            style={{
              fontSize: '15px',
              color: 'rgba(255, 255, 255, 0.9)',
              margin: 0,
              fontFamily: 'var(--font-archivo)',
              fontWeight: 500,
              lineHeight: 1.6,
            }}
          >
            {profile.overallVibe}
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// RENDERS PHASE
// ============================================================================

function RendersPhase({
  renders,
  profile,
  onStartOver,
}: {
  renders: RenderResult[];
  profile: DreamProfile | null;
  onStartOver: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        ...styles.fullScreen,
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0f05 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        position: 'relative',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(216, 90, 48, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          textAlign: 'center',
          marginBottom: '60px',
          zIndex: 1,
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-archivo)',
            fontSize: '40px',
            fontWeight: 700,
            color: 'white',
            margin: '0 0 12px 0',
          }}
        >
          Your Dream Rendered
        </h2>
        <p
          style={{
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.7)',
            margin: 0,
            fontFamily: 'var(--font-archivo)',
          }}
        >
          Three visions of your ideal sanctuary
        </p>
      </motion.div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          maxWidth: '1200px',
          marginBottom: '60px',
          zIndex: 1,
        }}
      >
        {renders.map((render, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1 + index * 0.15, duration: 0.6 }}
            whileHover={{ y: -6, scale: 1.02 }}
            style={{
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid rgba(216, 90, 48, 0.3)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
              background: 'linear-gradient(135deg, rgba(26, 15, 5, 0.8), rgba(30, 20, 10, 0.6))',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            <div
              style={{
                width: '100%',
                paddingBottom: '100%',
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.05)',
                overflow: 'hidden',
              }}
            >
              <img
                src={render.url || `https://images.unsplash.com/photo-${1600000000000 + index}?w=500&h=500&q=80`}
                alt={`Render ${index + 1}`}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
            <div style={{ padding: '16px' }}>
              <p
                style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  margin: 0,
                  fontFamily: 'var(--font-archivo)',
                  lineHeight: 1.5,
                  fontWeight: 400,
                }}
              >
                {render.prompt}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStartOver}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{
          padding: '14px 40px',
          fontSize: '16px',
          fontFamily: 'var(--font-archivo)',
          fontWeight: 600,
          background: '#D85A30',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          zIndex: 1,
          marginBottom: '40px',
        }}
      >
        Begin Another Reading
      </motion.button>
    </motion.div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    minHeight: '100vh',
    width: '100%',
    background: '#0a0a0a',
    color: 'white',
    fontFamily: 'var(--font-archivo)',
  },
  fullScreen: {
    minHeight: '100vh',
    width: '100%',
  },
  accentButton: {
    padding: '12px 32px',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(216, 90, 48, 0.2)',
    color: '#D85A30',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};

export default function OraclePage() {
  return (
    <ProjectProvider>
      <OraclePageInner />
    </ProjectProvider>
  );
}
