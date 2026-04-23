'use client';

/**
 * WorkflowPickerSearchBox (W7.O redesign)
 * =======================================
 *
 * A quiet, single-line engraved field that lives under the hero subhead.
 * The TOC below is the real navigation — this box is a secondary nudge
 * for users who want to type what they're working on instead of scanning
 * the stage list.
 *
 * Pre-W7 this was a 3-row textarea with a loud "Pull the codes →" button
 * and a "What are you working on (optional)" label. That version read as
 * a disconnected form between the hero and the TOC, and its button label
 * was misleading now that 17 workflows are live (submit always routes to
 * code-compliance regardless of query).
 *
 * Intent routing is a post-W7 item (tracked on tasks.todo.md Week 3+);
 * until then every submission still lands on code-compliance, but the
 * field itself reads as an invitation, not a committed code-compliance CTA.
 *
 * Keep:
 *   - voice input (mic icon on the right)
 *   - Enter / Cmd-Enter submit
 *   - graceful empty-submit fallback (so it never feels stuck)
 */

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// Narrow typing for the Web Speech API — support is inconsistent across
// browsers and we only need start/stop/onresult/onerror/onend.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

export default function WorkflowPickerSearchBox() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<AnySpeechRecognition>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (Ctor) setVoiceSupported(true);
  }, []);

  const startVoice = () => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition: AnySpeechRecognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: AnySpeechRecognition) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i]?.[0]?.transcript ?? '';
        if (event.results[i]?.isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      const currentTranscript = final || interim;
      if (currentTranscript) {
        setValue((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const submit = () => {
    const q = value.trim();
    // Until intent routing ships, we always land on code-compliance.
    // Empty submit still routes so the field never feels stuck.
    const href = q
      ? `/killerapp/workflows/code-compliance?q=${encodeURIComponent(q)}`
      : '/killerapp/workflows/code-compliance';
    router.push(href);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--trace)',
        border: '0.5px solid var(--faded-rule)',
        borderRadius: 10,
        padding: '4px 6px 4px 14px',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      <input
        id="workflow-picker-search"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Or describe what you're working on…"
        aria-label="Describe what you're working on"
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontFamily: 'var(--font-archivo), sans-serif',
          fontSize: 14,
          lineHeight: 1.5,
          color: 'var(--graphite)',
          padding: '10px 0',
          minWidth: 0,
        }}
      />

      {voiceSupported && (
        <button
          type="button"
          onClick={listening ? stopVoice : startVoice}
          aria-pressed={listening}
          aria-label={listening ? 'Stop voice input' : 'Start voice input'}
          style={{
            background: listening ? 'rgba(182, 135, 58, 0.12)' : 'transparent',
            border: 'none',
            borderRadius: 6,
            padding: '6px 8px',
            color: listening ? 'var(--brass)' : 'var(--graphite)',
            fontSize: 14,
            cursor: 'pointer',
            opacity: listening ? 1 : 0.55,
            fontFamily: 'inherit',
            transition: 'opacity 0.15s ease',
          }}
        >
          {listening ? '⏺' : '🎤'}
        </button>
      )}

      <button
        type="button"
        onClick={submit}
        aria-label="Search workflows"
        style={{
          background: 'transparent',
          border: 'none',
          borderRadius: 6,
          padding: '6px 10px',
          color: 'var(--graphite)',
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          opacity: 0.6,
          fontFamily: 'inherit',
          transition: 'opacity 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.6';
        }}
      >
        →
      </button>
    </div>
  );
}
