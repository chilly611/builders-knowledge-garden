'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ============================================================================
// THE VOICE ARCHITECT — Talk Your Dream Into Existence
// Pure conversation. No UI. Just talk. The building appears and evolves.
// ============================================================================

interface Message {
  role: 'user' | 'architect';
  text: string;
  timestamp: number;
}

const WARM = '#D85A30';
const GOLD = '#C4A44A';

const SUGGESTIONS = [
  '"I want a house where I can hear the ocean from every room"',
  '"A modern farmhouse with a huge wraparound porch"',
  '"Something like a treehouse but for adults, in the mountains"',
  '"A Mediterranean villa with a courtyard and fountain"',
  '"Tiny house, off-grid, with huge windows overlooking a lake"',
  '"Industrial loft converted from an old warehouse"',
];

function generateArchitectResponse(input: string, history: Message[]): string {
  const lower = input.toLowerCase();
  const msgCount = history.filter(m => m.role === 'user').length;

  // First message — expansive and exciting
  if (msgCount === 0) {
    if (lower.includes('ocean') || lower.includes('beach') || lower.includes('coast')) {
      return `I can already see it — glass walls facing the water, the sound of waves as your morning alarm. I'm thinking an open floor plan that flows from the living space straight to a covered terrace. The master suite on the upper level with a private balcony. Materials: weathered wood, salt-resistant steel, floor-to-ceiling glass.\n\nWhat kind of mood do you want? Sleek and modern, or warm and beachy?`;
    }
    if (lower.includes('mountain') || lower.includes('forest') || lower.includes('tree')) {
      return `Mountains change everything about a design — you want to frame those views like art. I'm envisioning steep roof pitches to shed snow, massive stone fireplaces, timber frame construction. Floor-to-ceiling windows on the valley side, sheltered entry on the mountain side.\n\nAre you thinking rustic lodge or contemporary mountain modern?`;
    }
    if (lower.includes('modern') || lower.includes('minimal') || lower.includes('clean')) {
      return `Clean lines, dramatic volumes, materials doing the talking. I see concrete, steel, and glass in honest proportions. Open plan living with double-height ceilings. A floating staircase. Landscape integrated so tightly it feels like the house grew from the ground.\n\nHow many people are living in this space? And do you entertain a lot?`;
    }
    if (lower.includes('farm') || lower.includes('ranch') || lower.includes('country')) {
      return `There's nothing like a farmhouse done right — the porch, the pitched roof, the sense of permanence. Modern farmhouse gives you that warmth with contemporary openness. Shiplap accent walls, black steel windows, a kitchen island that's the center of everything.\n\nI'm thinking covered porch, gable roof, board-and-batten siding. What's the land like? Flat? Rolling hills?`;
    }
    return `That's a fascinating starting point. Let me paint a picture: ${lower.includes('loft') || lower.includes('warehouse') ? 'exposed brick, soaring ceilings, steel trusses — industrial bones with refined living' : lower.includes('tiny') || lower.includes('small') ? 'every inch intentional, transforming furniture, clever storage, and one breathtaking view that makes 400 square feet feel infinite' : 'a home that tells your story through materials, light, and space — not just walls and a roof'}.\n\nTell me more — what's the one room or space that matters most to you?`;
  }

  // Subsequent messages — iterative refinement
  if (lower.includes('cost') || lower.includes('price') || lower.includes('budget') || lower.includes('how much')) {
    return `For what we're describing, you're looking at roughly $250-400 per square foot depending on your market. A 2,500 sf version would run $625K-$1M for construction, plus land. High-end finishes push that up. I can get more specific once we lock down the size and materials.\n\nWant me to sketch out a rough program — rooms, sizes, and priority features?`;
  }
  if (lower.includes('bedroom') || lower.includes('room') || lower.includes('space')) {
    return `Smart thinking — let's talk program. Based on what you've described, I'd suggest:\n\n• Primary suite with ensuite bath and walk-in closet\n• 2-3 secondary bedrooms (one could flex as office)\n• Open living/dining/kitchen as the heart\n• Mudroom or utility entry\n• At least one outdoor living space\n\nDoes that feel right? What would you add or change?`;
  }
  if (lower.includes('material') || lower.includes('wood') || lower.includes('stone') || lower.includes('concrete') || lower.includes('glass')) {
    return `Materials are where personality lives. Based on your vision, I'd layer:\n\n• Primary: ${lower.includes('wood') ? 'warm timber — cedar or reclaimed oak' : lower.includes('stone') ? 'natural stone — locally sourced if possible' : lower.includes('concrete') ? 'board-formed concrete with wood grain texture' : 'a combination that creates contrast'}\n• Secondary: steel accents for structure and detail\n• Interior: wide-plank floors, natural plaster walls\n• Exterior: the material should weather beautifully over decades\n\nThe key is restraint — two or three materials, used honestly. What draws you in?`;
  }

  // Generic continuation
  const responses = [
    `That's an interesting direction. It shifts the whole composition — I'm now seeing a more ${lower.includes('open') ? 'flowing, connected' : 'defined, intentional'} layout. The character of the home is evolving.\n\nWhat about the entrance? First impressions matter — do you want a dramatic reveal or a gentle transition from outside to in?`,
    `I love that. It adds a layer of personality that will make this home feel uniquely yours. Let me refine the concept:\n\nThe exterior reads as confident but not showy. Inside, the volumes surprise you — ceiling heights change to create intimate moments and grand ones. Natural light does the heavy lifting.\n\nShall we talk about the outdoor spaces? That's where the magic often lives.`,
    `Now we're getting somewhere. This is starting to feel like a real building, not just an idea. Here's what I'm carrying in my mind:\n\nA home that balances your desire for ${history.length > 4 ? 'connection and privacy' : 'beauty and function'}, built with materials that will age gracefully. Spaces that work for everyday life AND for the moments that matter.\n\nAnything I'm missing? What haven't we talked about that you care about?`,
  ];
  return responses[msgCount % responses.length];
}

export default function VoiceArchitectPage() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = false;
      r.interimResults = true;
      r.lang = 'en-US';
      r.onresult = (e: any) => {
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
          else setInput(e.results[i][0].transcript);
        }
        if (final) { setInput(final); }
      };
      r.onend = () => setIsListening(false);
      r.onerror = () => setIsListening(false);
      recognitionRef.current = r;
    }
  }, []);

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', text: input.trim(), timestamp: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setIsTyping(true);

    // Simulate thinking time
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

    const response = generateArchitectResponse(userMsg.text, newMsgs);
    setMessages(prev => [...prev, { role: 'architect', text: response, timestamp: Date.now() }]);
    setIsTyping(false);
  }, [input, messages]);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'var(--font-archivo)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/dream" style={{ color: WARM, textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 16px', borderRadius: 20, border: `1px solid ${WARM}40` }}>
          ← Dream Machine
        </Link>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: WARM }}>The Voice Architect</h1>
        <div style={{ width: 120 }} />
      </div>

      {!started ? (
        /* INTRO */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
            style={{ width: 100, height: 100, borderRadius: '50%', background: `radial-gradient(circle, ${WARM}40, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
            <span style={{ fontSize: 48 }}>🎙️</span>
          </motion.div>
          <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            style={{ fontSize: 42, fontWeight: 700, color: WARM, marginBottom: 16 }}>Talk It Into Existence</motion.h1>
          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
            style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', maxWidth: 480, lineHeight: 1.7, marginBottom: 32 }}>
            No forms. No dropdowns. No floor plans. Just describe what you want — and watch an architect bring it to life through conversation.
          </motion.p>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 500, marginBottom: 40 }}>
            {SUGGESTIONS.slice(0, 4).map((s, i) => (
              <button key={i} onClick={() => { setInput(s.replace(/"/g, '')); setStarted(true); }}
                style={{ padding: '10px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', maxWidth: 240 }}>
                {s}
              </button>
            ))}
          </motion.div>
          <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}
            onClick={() => setStarted(true)}
            style={{ padding: '16px 48px', fontSize: 16, fontWeight: 600, borderRadius: 12, border: 'none', background: WARM, color: 'white', cursor: 'pointer' }}>
            Start Talking
          </motion.button>
        </motion.div>
      ) : (
        /* CONVERSATION */
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 120px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 40px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>🎙️</div>
                <div style={{ fontSize: 14 }}>Describe your dream home — by voice or text</div>
              </div>
            )}
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  maxWidth: 600, marginBottom: 20,
                  marginLeft: msg.role === 'user' ? 'auto' : 0,
                  marginRight: msg.role === 'user' ? 0 : 'auto',
                }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                  {msg.role === 'user' ? 'You' : '🏛️ The Architect'}
                </div>
                <div style={{
                  padding: '16px 20px', borderRadius: 16,
                  background: msg.role === 'user' ? `${WARM}20` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${msg.role === 'user' ? `${WARM}30` : 'rgba(255,255,255,0.08)'}`,
                  fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-line',
                }}>
                  {msg.text}
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 600, marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>🏛️ The Architect</div>
                <div style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}
                    style={{ display: 'flex', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: WARM }} />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: WARM, opacity: 0.6 }} />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: WARM, opacity: 0.3 }} />
                  </motion.div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px', background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', gap: 8 }}>
              <button onClick={toggleVoice}
                style={{
                  width: 48, height: 48, borderRadius: 12,
                  border: isListening ? `2px solid ${WARM}` : '1px solid rgba(255,255,255,0.15)',
                  background: isListening ? `${WARM}20` : 'rgba(255,255,255,0.05)',
                  color: isListening ? WARM : 'rgba(255,255,255,0.5)',
                  fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                {isListening ? '⏹' : '🎙️'}
              </button>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Describe your dream..."
                style={{ flex: 1, padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 15, outline: 'none' }} />
              <button onClick={sendMessage}
                style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: input.trim() ? WARM : 'rgba(255,255,255,0.1)', color: input.trim() ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 600, cursor: input.trim() ? 'pointer' : 'default' }}>
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
