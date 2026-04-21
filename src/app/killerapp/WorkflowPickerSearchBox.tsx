'use client';

// Builder's Knowledge Garden — Natural-language entry on the workflow picker.
// Decision #1 (fluid paths) + Decision #3 (workflow picker as primary nav):
// The picker's hero needs a way for non-savvy users to type or speak what
// they're working on. We don't yet have an intent-routing backend, so on
// submit we forward to the one live workflow (Code Compliance) with the
// query pre-filled. In Week 3 this becomes a real intent router across all
// 27 workflows.

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// Narrow typing for the Web Speech API. The DOM lib defines
// `SpeechRecognition` on webkit-prefixed browsers; we treat it loosely
// since support is inconsistent.
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
      const transcript = event?.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) setValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
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
    if (!q) {
      // Empty submit still routes to Code Compliance so it never feels stuck.
      router.push('/killerapp/workflows/code-compliance');
      return;
    }
    router.push(`/killerapp/workflows/code-compliance?q=${encodeURIComponent(q)}`);
  };

  return (
    <div
      style={{
        background: '#fff',
        border: '0.5px solid var(--faded-rule)',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <label
        htmlFor="workflow-picker-search"
        style={{
          display: 'block',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--graphite)',
          opacity: 0.6,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          marginBottom: 8,
        }}
      >
        What are you working on (optional)
      </label>
      <textarea
        id="workflow-picker-search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={3}
        placeholder="e.g., ADU in Temecula, 800 sqft, single-story. Which codes matter? Or just describe the job."
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          resize: 'vertical',
          fontFamily: 'var(--font-archivo), sans-serif',
          fontSize: 14,
          lineHeight: 1.5,
          color: 'var(--graphite)',
          background: 'transparent',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        {voiceSupported ? (
          <button
            type="button"
            onClick={listening ? stopVoice : startVoice}
            style={{
              background: listening ? 'rgba(182, 135, 58, 0.12)' : 'var(--trace)',
              border: `0.5px solid ${listening ? 'var(--brass)' : 'var(--faded-rule)'}`,
              borderRadius: 8,
              padding: '8px 12px',
              color: listening ? 'var(--brass)' : 'var(--graphite)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
            aria-pressed={listening}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
          >
            <span>{listening ? '⏺' : '🎤'}</span>
            <span>{listening ? 'Listening…' : 'speak'}</span>
          </button>
        ) : (
          <span
            style={{
              fontSize: 10,
              color: 'var(--graphite)',
              opacity: 0.5,
              fontFamily: 'inherit',
            }}
          >
            Voice unavailable in this browser.
          </span>
        )}

        <span style={{ flex: 1 }} />

        <span
          style={{
            fontSize: 10,
            color: 'var(--graphite)',
            opacity: 0.5,
          }}
        >
          ⌘↵ to submit
        </span>
        <button
          type="button"
          onClick={submit}
          style={{
            background: 'var(--brass)',
            border: 'none',
            borderRadius: 8,
            padding: '9px 18px',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}
        >
          Pull the codes →
        </button>
      </div>
    </div>
  );
}
