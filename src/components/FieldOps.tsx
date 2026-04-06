'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Brand colors
const COLORS = {
  green: '#1D9E75',
  gold: '#D85A30',
  red: '#E8443A',
  purple: '#7F77DD',
  blue: '#378ADD',
  orange: '#BA7517',
  light: '#F5F5F5',
  white: '#FFFFFF',
  darkText: '#1A1A1A',
  border: '#CCCCCC',
};

// Types for voice recognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  isFinal: boolean;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface PunchItem {
  id: string;
  text: string;
  priority: 'urgent' | 'normal' | 'minor';
  completed: boolean;
}

type ScreenMode =
  | 'home'
  | 'voice-copilot'
  | 'photo-logger'
  | 'daily-log'
  | 'punch-list'
  | 'safety-alert';

export default function FieldOps() {
  // State management
  const [screen, setScreen] = useState<ScreenMode>('home');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [punchItems, setPunchItems] = useState<PunchItem[]>([
    {
      id: '1',
      text: 'Foundation inspection complete',
      priority: 'urgent',
      completed: false,
    },
    {
      id: '2',
      text: 'Framing north wall',
      priority: 'normal',
      completed: false,
    },
  ]);
  const [dailyLogData, setDailyLogData] = useState({
    safetyBriefing: false,
    ppeCheck: false,
    weather: 'clear',
    crewCount: '0',
    workCompleted: '',
    issues: '',
  });

  // Refs for Web Speech API
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.language = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        for (let i = event.results.length - 1; i >= 0; --i) {
          if (event.results[i].isFinal) {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript(interim);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Start voice input
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      recognitionRef.current.start();
    }
  };

  // Stop voice input
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Speak AI response
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  // Mock AI response handler
  const handleAiInput = async (input: string) => {
    const mockResponses: { [key: string]: string } = {
      safety: 'Safety alert logged. Project manager notified immediately.',
      schedule:
        'Next crew arrives at 7 AM. Weather forecast shows clear skies.',
      electrical: 'Electrical panel is in the east corner of the main building.',
      weather: 'Current conditions: clear, 72 degrees, light wind.',
      default: 'I understand. What would you like to do next?',
    };

    const response = Object.entries(mockResponses).find(([key]) =>
      input.toLowerCase().includes(key)
    )?.[1] || mockResponses.default;

    setAiResponse(response);
    speak(response);
  };

  // Camera capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          videoRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
        // Photo captured - in real app, would send to backend
        setScreen('home');
      }
    }
  };

  // Add punch item
  const addPunchItem = (text: string) => {
    const newItem: PunchItem = {
      id: Date.now().toString(),
      text,
      priority: 'normal',
      completed: false,
    };
    setPunchItems([...punchItems, newItem]);
  };

  // Toggle punch item completion
  const togglePunchItem = (id: string) => {
    setPunchItems(
      punchItems.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  // Home Screen - Main Action Buttons
  if (screen === 'home') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: COLORS.light,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          fontFamily: 'Archivo, sans-serif',
          color: COLORS.darkText,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: COLORS.green,
              margin: '0 0 8px 0',
            }}
          >
            Field Ops
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: COLORS.darkText,
              margin: 0,
            }}
          >
            Works With Dirty Hands
          </p>
        </div>

        {/* Talk to AI - Full Width Top Button */}
        <motion.button
          onClick={() => setScreen('voice-copilot')}
          whileTap={{ scale: 0.95 }}
          style={{
            width: '100%',
            padding: '30px',
            backgroundColor: COLORS.green,
            color: COLORS.white,
            border: 'none',
            borderRadius: '12px',
            fontSize: '28px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            minHeight: '120px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <span style={{ fontSize: '40px' }}>🎤</span>
          TALK TO AI
        </motion.button>

        {/* 2x2 Grid - Log Photo, Daily Log, Punch List, Safety Alert */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
          }}
        >
          {/* Log Photo */}
          <motion.button
            onClick={() => {
              setScreen('photo-logger');
              startCamera();
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '24px',
              backgroundColor: COLORS.blue,
              color: COLORS.white,
              border: 'none',
              borderRadius: '12px',
              fontSize: '22px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              minHeight: '140px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <span style={{ fontSize: '36px' }}>📸</span>
            LOG PHOTO
          </motion.button>

          {/* Daily Log */}
          <motion.button
            onClick={() => setScreen('daily-log')}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '24px',
              backgroundColor: COLORS.purple,
              color: COLORS.white,
              border: 'none',
              borderRadius: '12px',
              fontSize: '22px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              minHeight: '140px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <span style={{ fontSize: '36px' }}>✅</span>
            DAILY LOG
          </motion.button>

          {/* Punch List */}
          <motion.button
            onClick={() => setScreen('punch-list')}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '24px',
              backgroundColor: COLORS.gold,
              color: COLORS.white,
              border: 'none',
              borderRadius: '12px',
              fontSize: '22px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              minHeight: '140px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <span style={{ fontSize: '36px' }}>📋</span>
            PUNCH LIST
          </motion.button>

          {/* Safety Alert */}
          <motion.button
            onClick={() => setScreen('safety-alert')}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '24px',
              backgroundColor: COLORS.red,
              color: COLORS.white,
              border: 'none',
              borderRadius: '12px',
              fontSize: '22px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              minHeight: '140px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <span style={{ fontSize: '36px' }}>⚠️</span>
            SAFETY ALERT
          </motion.button>
        </div>

        {/* Call Office */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          style={{
            width: '100%',
            padding: '20px',
            backgroundColor: COLORS.orange,
            color: COLORS.white,
            border: 'none',
            borderRadius: '12px',
            fontSize: '22px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            minHeight: '100px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <span style={{ fontSize: '32px' }}>📞</span>
          CALL OFFICE
        </motion.button>
      </div>
    );
  }

  // Voice Copilot Screen
  if (screen === 'voice-copilot') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: COLORS.light,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'Archivo, sans-serif',
          color: COLORS.darkText,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: COLORS.green,
              margin: '0 0 8px 0',
            }}
          >
            AI Copilot
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: COLORS.darkText,
              margin: 0,
            }}
          >
            {isListening ? 'Listening...' : 'Ready to listen'}
          </p>
        </div>

        {/* Animated Microphone */}
        <motion.div
          animate={isListening ? { scale: 1.1 } : { scale: 1 }}
          transition={{ duration: 0.3, repeat: isListening ? Infinity : 0 }}
          style={{
            fontSize: '100px',
            marginBottom: '40px',
            cursor: 'pointer',
          }}
          onClick={startListening}
        >
          🎤
        </motion.div>

        {/* Transcript Display */}
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: COLORS.white,
              border: `2px solid ${COLORS.green}`,
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '30px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: COLORS.green,
                margin: 0,
              }}
            >
              {transcript}
            </p>
          </motion.div>
        )}

        {/* AI Response Display */}
        {aiResponse && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: COLORS.green,
              color: COLORS.white,
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '30px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '22px',
                lineHeight: '1.4',
                margin: 0,
              }}
            >
              {aiResponse}
            </p>
          </motion.div>
        )}

        {/* Control Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            width: '100%',
            flexDirection: 'column',
          }}
        >
          {isListening && (
            <motion.button
              onClick={stopListening}
              whileTap={{ scale: 0.95 }}
              style={{
                width: '100%',
                padding: '24px',
                backgroundColor: COLORS.red,
                color: COLORS.white,
                border: 'none',
                borderRadius: '12px',
                fontSize: '26px',
                fontWeight: 'bold',
                cursor: 'pointer',
                minHeight: '100px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              STOP
            </motion.button>
          )}

          {!isListening && transcript && (
            <motion.button
              onClick={() => handleAiInput(transcript)}
              whileTap={{ scale: 0.95 }}
              style={{
                width: '100%',
                padding: '24px',
                backgroundColor: COLORS.green,
                color: COLORS.white,
                border: 'none',
                borderRadius: '12px',
                fontSize: '24px',
                fontWeight: 'bold',
                cursor: 'pointer',
                minHeight: '100px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              GET ANSWER
            </motion.button>
          )}

          <motion.button
            onClick={() => {
              setScreen('home');
              setTranscript('');
              setAiResponse('');
              stopListening();
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '100%',
              padding: '20px',
              backgroundColor: COLORS.border,
              color: COLORS.darkText,
              border: 'none',
              borderRadius: '12px',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '80px',
            }}
          >
            BACK HOME
          </motion.button>
        </div>
      </div>
    );
  }

  // Photo Logger Screen
  if (screen === 'photo-logger') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: COLORS.light,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Archivo, sans-serif',
          color: COLORS.darkText,
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: COLORS.blue,
            margin: '0 0 24px 0',
          }}
        >
          Log Photo
        </h1>

        {/* Camera Preview */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            borderRadius: '12px',
            marginBottom: '24px',
            maxHeight: '400px',
            backgroundColor: COLORS.darkText,
          }}
        />

        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{ display: 'none' }}
        />

        {/* Tag Selection */}
        <div
          style={{
            marginBottom: '24px',
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '20px',
              fontWeight: 'bold',
              marginBottom: '12px',
            }}
          >
            Category:
          </label>
          <select
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '18px',
              borderRadius: '8px',
              border: `2px solid ${COLORS.border}`,
              backgroundColor: COLORS.white,
              color: COLORS.darkText,
              cursor: 'pointer',
            }}
          >
            <option>Foundation</option>
            <option>Framing</option>
            <option>Electrical</option>
            <option>Plumbing</option>
            <option>Roofing</option>
            <option>Finish</option>
          </select>
        </div>

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexDirection: 'column',
          }}
        >
          <motion.button
            onClick={capturePhoto}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '100%',
              padding: '24px',
              backgroundColor: COLORS.blue,
              color: COLORS.white,
              border: 'none',
              borderRadius: '12px',
              fontSize: '24px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '100px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            📸 CAPTURE PHOTO
          </motion.button>

          <motion.button
            onClick={() => setScreen('home')}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '100%',
              padding: '20px',
              backgroundColor: COLORS.border,
              color: COLORS.darkText,
              border: 'none',
              borderRadius: '12px',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '80px',
            }}
          >
            CANCEL
          </motion.button>
        </div>
      </div>
    );
  }

  // Daily Log Screen
  if (screen === 'daily-log') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: COLORS.light,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Archivo, sans-serif',
          color: COLORS.darkText,
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: COLORS.purple,
            margin: '0 0 24px 0',
          }}
        >
          Daily Log
        </h1>

        {/* Checklist Items */}
        <div
          style={{
            marginBottom: '24px',
          }}
        >
          {/* Safety Briefing */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px',
              backgroundColor: COLORS.white,
              borderRadius: '8px',
              marginBottom: '12px',
              cursor: 'pointer',
              border: `2px solid ${COLORS.border}`,
              gap: '16px',
            }}
          >
            <input
              type="checkbox"
              checked={dailyLogData.safetyBriefing}
              onChange={(e) =>
                setDailyLogData({
                  ...dailyLogData,
                  safetyBriefing: e.target.checked,
                })
              }
              style={{
                width: '28px',
                height: '28px',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
              Safety briefing conducted
            </span>
          </label>

          {/* PPE Check */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px',
              backgroundColor: COLORS.white,
              borderRadius: '8px',
              marginBottom: '12px',
              cursor: 'pointer',
              border: `2px solid ${COLORS.border}`,
              gap: '16px',
            }}
          >
            <input
              type="checkbox"
              checked={dailyLogData.ppeCheck}
              onChange={(e) =>
                setDailyLogData({
                  ...dailyLogData,
                  ppeCheck: e.target.checked,
                })
              }
              style={{
                width: '28px',
                height: '28px',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
              PPE check complete
            </span>
          </label>

          {/* Weather */}
          <div
            style={{
              marginBottom: '12px',
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '20px',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            >
              Weather:
            </label>
            <select
              value={dailyLogData.weather}
              onChange={(e) =>
                setDailyLogData({
                  ...dailyLogData,
                  weather: e.target.value,
                })
              }
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '18px',
                borderRadius: '8px',
                border: `2px solid ${COLORS.border}`,
                backgroundColor: COLORS.white,
                color: COLORS.darkText,
                cursor: 'pointer',
              }}
            >
              <option value="clear">Clear</option>
              <option value="hot">Hot</option>
              <option value="cold">Cold</option>
              <option value="rain">Rain</option>
              <option value="wind">Wind</option>
            </select>
          </div>

          {/* Crew Count */}
          <div
            style={{
              marginBottom: '12px',
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '20px',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            >
              Crew count:
            </label>
            <input
              type="number"
              value={dailyLogData.crewCount}
              onChange={(e) =>
                setDailyLogData({
                  ...dailyLogData,
                  crewCount: e.target.value,
                })
              }
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '18px',
                borderRadius: '8px',
                border: `2px solid ${COLORS.border}`,
                backgroundColor: COLORS.white,
                color: COLORS.darkText,
              }}
            />
          </div>

          {/* Work Completed */}
          <div
            style={{
              marginBottom: '12px',
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '20px',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            >
              Work completed today:
            </label>
            <textarea
              value={dailyLogData.workCompleted}
              onChange={(e) =>
                setDailyLogData({
                  ...dailyLogData,
                  workCompleted: e.target.value,
                })
              }
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '18px',
                borderRadius: '8px',
                border: `2px solid ${COLORS.border}`,
                backgroundColor: COLORS.white,
                color: COLORS.darkText,
                minHeight: '100px',
                fontFamily: 'Archivo, sans-serif',
              }}
              placeholder="Describe work completed..."
            />
          </div>

          {/* Issues */}
          <div
            style={{
              marginBottom: '24px',
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '20px',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            >
              Issues/delays:
            </label>
            <textarea
              value={dailyLogData.issues}
              onChange={(e) =>
                setDailyLogData({
                  ...dailyLogData,
                  issues: e.target.value,
                })
              }
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '18px',
                borderRadius: '8px',
                border: `2px solid ${COLORS.border}`,
                backgroundColor: COLORS.white,
                color: COLORS.darkText,
                minHeight: '100px',
                fontFamily: 'Archivo, sans-serif',
              }}
              placeholder="Any issues or delays..."
            />
          </div>
        </div>

        {/* Submit Button */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexDirection: 'column',
          }}
        >
          <motion.button
            onClick={() => setScreen('home')}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '100%',
              padding: '24px',
              backgroundColor: COLORS.purple,
              color: COLORS.white,
              border: 'none',
              borderRadius: '12px',
              fontSize: '24px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '100px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            ✓ SUBMIT LOG
          </motion.button>

          <motion.button
            onClick={() => setScreen('home')}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '100%',
              padding: '20px',
              backgroundColor: COLORS.border,
              color: COLORS.darkText,
              border: 'none',
              borderRadius: '12px',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '80px',
            }}
          >
            CANCEL
          </motion.button>
        </div>
      </div>
    );
  }

  // Punch List Screen
  if (screen === 'punch-list') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: COLORS.light,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Archivo, sans-serif',
          color: COLORS.darkText,
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: COLORS.gold,
            margin: '0 0 24px 0',
          }}
        >
          Punch List
        </h1>

        {/* Items List */}
        <div
          style={{
            flex: 1,
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {punchItems.map((item) => {
            const priorityColor =
              item.priority === 'urgent'
                ? COLORS.red
                : item.priority === 'normal'
                  ? COLORS.gold
                  : COLORS.green;

            return (
              <motion.div
                key={item.id}
                onClick={() => togglePunchItem(item.id)}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '20px',
                  backgroundColor: COLORS.white,
                  borderRadius: '8px',
                  border: `4px solid ${priorityColor}`,
                  cursor: 'pointer',
                  gap: '16px',
                  opacity: item.completed ? 0.5 : 1,
                  textDecoration: item.completed ? 'line-through' : 'none',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    border: `2px solid ${priorityColor}`,
                    backgroundColor: item.completed ? priorityColor : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.completed && (
                    <span style={{ color: 'white', fontSize: '18px' }}>✓</span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                  }}
                >
                  {item.text}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Add Item Button */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexDirection: 'column',
          }}
        >
          <motion.button
            onClick={() => {
              const text = prompt('Enter new punch item:');
              if (text) addPunchItem(text);
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '100%',
              padding: '24px',
              backgroundColor: COLORS.gold,
              color: COLORS.white,
              border: 'none',
              borderRadius: '12px',
              fontSize: '24px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '100px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            + ADD ITEM
          </motion.button>

          <motion.button
            onClick={() => setScreen('home')}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '100%',
              padding: '20px',
              backgroundColor: COLORS.border,
              color: COLORS.darkText,
              border: 'none',
              borderRadius: '12px',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '80px',
            }}
          >
            BACK HOME
          </motion.button>
        </div>
      </div>
    );
  }

  // Safety Alert Screen
  if (screen === 'safety-alert') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: COLORS.light,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Archivo, sans-serif',
          color: COLORS.darkText,
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: COLORS.red,
            margin: '0 0 24px 0',
          }}
        >
          Safety Alert
        </h1>

        {/* Report Hazard Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          style={{
            width: '100%',
            padding: '32px',
            backgroundColor: COLORS.red,
            color: COLORS.white,
            border: 'none',
            borderRadius: '12px',
            fontSize: '28px',
            fontWeight: 'bold',
            cursor: 'pointer',
            minHeight: '160px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <span style={{ fontSize: '48px' }}>⚠️</span>
          REPORT HAZARD
        </motion.button>

        {/* Category Selection */}
        <div
          style={{
            marginBottom: '24px',
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '20px',
              fontWeight: 'bold',
              marginBottom: '12px',
            }}
          >
            Hazard Type:
          </label>
          <select
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '18px',
              borderRadius: '8px',
              border: `2px solid ${COLORS.border}`,
              backgroundColor: COLORS.white,
              color: COLORS.darkText,
              cursor: 'pointer',
            }}
          >
            <option>Fall hazard</option>
            <option>Electrical</option>
            <option>Confined space</option>
            <option>Chemical</option>
            <option>Equipment</option>
            <option>Other</option>
          </select>
        </div>

        {/* Description */}
        <div
          style={{
            marginBottom: '24px',
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '20px',
              fontWeight: 'bold',
              marginBottom: '8px',
            }}
          >
            Description:
          </label>
          <textarea
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '18px',
              borderRadius: '8px',
              border: `2px solid ${COLORS.border}`,
              backgroundColor: COLORS.white,
              color: COLORS.darkText,
              minHeight: '120px',
              fontFamily: 'Archivo, sans-serif',
            }}
            placeholder="Describe the hazard..."
          />
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexDirection: 'column',
          }}
        >
          <motion.button
            onClick={() => {
              setScreen('home');
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '100%',
              padding: '24px',
              backgroundColor: COLORS.red,
              color: COLORS.white,
              border: 'none',
              borderRadius: '12px',
              fontSize: '24px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '100px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            SUBMIT ALERT
          </motion.button>

          <motion.button
            onClick={() => setScreen('home')}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '100%',
              padding: '20px',
              backgroundColor: COLORS.border,
              color: COLORS.darkText,
              border: 'none',
              borderRadius: '12px',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '80px',
            }}
          >
            CANCEL
          </motion.button>
        </div>
      </div>
    );
  }

  return null;
}
