'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

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
  resultIndex: number;
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

// ─────────────────────────────────────────────────────────────────────────────
// System-of-record wiring (2026-06-07)
// ─────────────────────────────────────────────────────────────────────────────
// Field Ops was a pure front-end mock. These helpers make TALK TO AI, LOG
// PHOTO, and DAILY LOG persist to the active project's record so they survive
// reload — reusing the existing routes (no new endpoints, no schema change):
//   - copilot       → /api/v1/copilot (persists Q&A to project_conversations)
//   - photo         → project-evidence bucket + /api/v1/projects/[id]/attachments
//   - daily log     → command_center_projects.daily_log_state (read-merge-write)
// Field Ops has no ?project= in its URL, so it rescues the active project id
// from localStorage (set by the killerapp project shell), same key everywhere.

const ACTIVE_PROJECT_KEY = 'bkg-active-project';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELD_OPS_LOG_KEY = 'field-ops-daily-log';

interface DailyLogData {
  safetyBriefing: boolean;
  ppeCheck: boolean;
  weather: string;
  crewCount: string;
  workCompleted: string;
  issues: string;
}

interface FieldPhoto {
  id: string;
  signed_url: string | null;
  caption: string | null;
  created_at: string;
}

function getActiveProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
    return v && UUID_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}

async function bearer(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

// TALK TO AI → the real construction copilot (stage 4 = Build). Streams the
// answer back via onText; the route persists the Q&A to project_conversations
// server-side when a real projectId is supplied, so it survives reload.
async function askCopilotStream(
  projectId: string | null,
  query: string,
  onText: (full: string) => void
): Promise<void> {
  const token = await bearer();
  const res = await fetch('/api/v1/copilot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, stage: 4, ...(projectId ? { projectId } : {}) }),
  });
  if (!res.ok || !res.body) {
    onText('Copilot is unavailable right now — try again in a moment.');
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let assembled = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith('data:')) continue;
      try {
        const p = JSON.parse(line.slice(5).trim()) as { type?: string; text?: string };
        if (p.type === 'chunk' && p.text) {
          assembled += p.text;
          onText(assembled);
        } else if (p.type === 'complete' && typeof p.text === 'string') {
          assembled = p.text;
          onText(assembled);
        }
      } catch {
        /* ignore partial frames */
      }
    }
  }
}

async function loadLastAiAnswer(projectId: string): Promise<string> {
  const token = await bearer();
  if (!token) return '';
  try {
    const res = await fetch(
      `/api/v1/projects/${encodeURIComponent(projectId)}/conversations`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return '';
    const json = (await res.json()) as {
      conversations?: Array<{ role: string; content: string }>;
    };
    return (
      (json.conversations ?? [])
        .filter((c) => c.role === 'assistant')
        .at(-1)?.content ?? ''
    );
  } catch {
    return '';
  }
}

// LOG PHOTO → upload the captured frame to project-evidence + record metadata
// (workflow_id 'field-ops'), mirroring AttachmentUploader's client-side path.
async function uploadFieldPhoto(
  projectId: string,
  blob: Blob,
  category: string
): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const userId = data.session?.user?.id;
  if (!token || !userId) return false;
  const filePath = `${userId}/${projectId}/${crypto.randomUUID()}-fieldops.jpg`;
  const { error: upErr } = await supabase.storage
    .from('project-evidence')
    .upload(filePath, blob, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
  if (upErr) {
    console.error('[FieldOps] photo upload failed:', upErr.message);
    return false;
  }
  const res = await fetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/attachments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        file_path: filePath,
        mime_type: 'image/jpeg',
        byte_size: blob.size,
        original_filename: `fieldops-${category}.jpg`,
        caption: category,
        workflow_id: 'field-ops',
        step_id: category,
      }),
    }
  );
  return res.ok;
}

async function loadFieldPhotos(projectId: string): Promise<FieldPhoto[]> {
  const token = await bearer();
  if (!token) return [];
  try {
    const res = await fetch(
      `/api/v1/projects/${encodeURIComponent(projectId)}/attachments`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      attachments?: Array<{
        id: string;
        workflow_id: string | null;
        signed_url: string | null;
        caption: string | null;
        created_at: string;
      }>;
    };
    return (json.attachments ?? [])
      .filter((a) => a.workflow_id === 'field-ops')
      .map((a) => ({
        id: a.id,
        signed_url: a.signed_url,
        caption: a.caption,
        created_at: a.created_at,
      }));
  } catch {
    return [];
  }
}

// DAILY LOG → one namespaced key inside daily_log_state, read-merge-write so we
// never clobber the Daily Log workflow's step payloads or VoiceFieldReport.
async function saveFieldOpsDailyLog(projectId: string, log: DailyLogData): Promise<boolean> {
  const token = await bearer();
  if (!token) return false;
  let merged: Record<string, unknown> = {};
  try {
    const getRes = await fetch(`/api/v1/projects?id=${encodeURIComponent(projectId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (getRes.ok) {
      const j = (await getRes.json()) as { daily_log_state?: Record<string, unknown> };
      if (j.daily_log_state && typeof j.daily_log_state === 'object') {
        merged = { ...j.daily_log_state };
      }
    }
  } catch {
    /* a partial write beats no write */
  }
  merged[FIELD_OPS_LOG_KEY] = { value: JSON.stringify(log) };
  const res = await fetch('/api/v1/projects', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id: projectId, daily_log_state: merged }),
  });
  return res.ok;
}

async function loadFieldOpsDailyLog(projectId: string): Promise<DailyLogData | null> {
  const token = await bearer();
  if (!token) return null;
  try {
    const res = await fetch(`/api/v1/projects?id=${encodeURIComponent(projectId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      daily_log_state?: Record<string, { value?: string }>;
    };
    const raw = j.daily_log_state?.[FIELD_OPS_LOG_KEY]?.value;
    if (!raw) return null;
    return JSON.parse(raw) as DailyLogData;
  } catch {
    return null;
  }
}

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
  const [dailyLogData, setDailyLogData] = useState<DailyLogData>({
    safetyBriefing: false,
    ppeCheck: false,
    weather: 'clear',
    crewCount: '0',
    workCompleted: '',
    issues: '',
  });

  // System-of-record state: active project + rehydrated/persisted artifacts.
  const [projectId, setProjectId] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(true); // optimistic; corrected on mount
  const [aiStreaming, setAiStreaming] = useState(false);
  const [photoCategory, setPhotoCategory] = useState('Foundation');
  const [fieldPhotos, setFieldPhotos] = useState<FieldPhoto[]>([]);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [logNote, setLogNote] = useState<string | null>(null);

  // Refs for Web Speech API
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        setTranscript(final || interim);
        if (final) {
          recognitionRef.current?.stop();
        }
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

  // Bootstrap project context + rehydrate persisted artifacts so Field Ops is a
  // true system-of-record surface. Runs once on mount; best-effort (signed-out
  // or no active project → screens still work, just don't persist).
  useEffect(() => {
    const pid = getActiveProjectId();
    setProjectId(pid);
    let cancelled = false;
    (async () => {
      const token = await bearer();
      if (!cancelled) setSignedIn(!!token);
      if (!pid || !token) return;
      const [answer, photos, log] = await Promise.all([
        loadLastAiAnswer(pid),
        loadFieldPhotos(pid),
        loadFieldOpsDailyLog(pid),
      ]);
      if (cancelled) return;
      if (answer) setAiResponse(answer);
      setFieldPhotos(photos);
      if (log) setDailyLogData(log);
    })();
    return () => {
      cancelled = true;
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

  // TALK TO AI → the real construction copilot (Build stage). Streams the
  // answer into the panel; the route persists the Q&A to the project record so
  // it survives reload. Speaks the answer once it lands.
  const handleAiInput = async (input: string) => {
    const q = input.trim();
    if (!q || aiStreaming) return;
    setAiStreaming(true);
    setAiResponse('');
    let finalText = '';
    try {
      await askCopilotStream(projectId, q, (full) => {
        finalText = full;
        setAiResponse(full);
      });
    } finally {
      setAiStreaming(false);
    }
    if (finalText) speak(finalText);
  };

  // Camera capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Capture the current frame, upload it to the project-evidence bucket, and
  // record it against the project (workflow_id 'field-ops') so it survives
  // reload. Falls back gracefully when signed out / no active project.
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      async (blob) => {
        stopCamera();
        if (!blob) {
          setScreen('home');
          return;
        }
        if (!projectId) {
          setPhotoNote('Pick a project up top to save photos.');
          setScreen('home');
          window.setTimeout(() => setPhotoNote(null), 3500);
          return;
        }
        const ok = await uploadFieldPhoto(projectId, blob, photoCategory);
        setPhotoNote(
          ok ? 'Photo saved to this project ✓' : 'Could not save — sign in to keep your photos.'
        );
        if (ok) setFieldPhotos(await loadFieldPhotos(projectId));
        setScreen('home');
        window.setTimeout(() => setPhotoNote(null), 3500);
      },
      'image/jpeg',
      0.9
    );
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

        {(photoNote || logNote) && (
          <div
            style={{
              textAlign: 'center',
              padding: '10px 16px',
              borderRadius: 10,
              background: COLORS.white,
              border: `2px solid ${COLORS.green}`,
              color: COLORS.darkText,
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {photoNote || logNote}
          </div>
        )}
        {!signedIn && (
          <div
            style={{
              textAlign: 'center',
              fontSize: 13,
              color: COLORS.darkText,
              opacity: 0.7,
            }}
          >
            Sign in and pick a project to save your work to the project record.
          </div>
        )}

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

        {/* Type or talk — typed input is equal to voice (mic denied / noisy
            jobsite). Also what makes the answer testable without a mic. */}
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Tap the mic and talk, or type your question…"
          rows={2}
          style={{
            width: '100%',
            marginBottom: '24px',
            padding: '16px',
            fontSize: '18px',
            borderRadius: '12px',
            border: `2px solid ${COLORS.border}`,
            backgroundColor: COLORS.white,
            color: COLORS.darkText,
            fontFamily: 'Archivo, sans-serif',
            resize: 'none',
          }}
        />

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
            value={photoCategory}
            onChange={(e) => setPhotoCategory(e.target.value)}
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
            onClick={() => {
              stopCamera();
              setScreen('home');
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
            CANCEL
          </motion.button>
        </div>

        {/* Saved photos — rehydrated from the project record, so they survive
            reload. Reads project_attachments filtered to workflow_id 'field-ops'. */}
        {!signedIn && (
          <p style={{ marginTop: 20, fontSize: 14, color: COLORS.darkText, opacity: 0.7 }}>
            Sign in and pick a project to save photos to the project record.
          </p>
        )}
        {fieldPhotos.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 'bold',
                color: COLORS.darkText,
                marginBottom: 10,
              }}
            >
              Saved to this project · {fieldPhotos.length}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {fieldPhotos.map((p) => (
                <div key={p.id} style={{ width: 96 }}>
                  {p.signed_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.signed_url}
                      alt={p.caption ?? 'Field photo'}
                      style={{
                        width: 96,
                        height: 96,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 8,
                        background: COLORS.border,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                      }}
                    >
                      📷
                    </div>
                  )}
                  {p.caption && (
                    <div
                      style={{
                        fontSize: 11,
                        color: COLORS.darkText,
                        opacity: 0.7,
                        marginTop: 4,
                        textAlign: 'center',
                      }}
                    >
                      {p.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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

        {logNote && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: 8,
              background: COLORS.white,
              border: `2px solid ${COLORS.green}`,
              color: COLORS.darkText,
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {logNote}
          </div>
        )}

        {/* Submit Button */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexDirection: 'column',
          }}
        >
          <motion.button
            onClick={async () => {
              if (!projectId) {
                setLogNote('Pick a project up top to save your log.');
                return;
              }
              const ok = await saveFieldOpsDailyLog(projectId, dailyLogData);
              setLogNote(
                ok
                  ? 'Daily log saved to this project ✓'
                  : 'Could not save — sign in to keep your log.'
              );
              if (ok) window.setTimeout(() => setScreen('home'), 800);
            }}
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
