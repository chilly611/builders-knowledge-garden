'use client';
import { useState, useEffect } from 'react';
import KillerAppNav from '@/components/KillerAppNav';

const DEMO_LOGS = [
  { time: '7:42 AM', worker: 'Miguel R.', log: 'Site safe. Framing crew of 8 on site. Progress 45%. Weather clear, no issues.', tag: 'Daily Log' },
  { time: '9:15 AM', worker: 'Dana K.', log: 'Lumber delivery arrived — 3 bundles short on 2x10s. Flagged to PM.', tag: 'Supply Issue' },
  { time: '10:30 AM', worker: 'James T.', log: 'Framing inspection passed. Moving to roof sheathing this afternoon.', tag: '✅ Inspection' },
  { time: '12:00 PM', worker: 'AI Briefing', log: 'Rain forecast Thursday 80%. Recommend scheduling roof work Wed or delay to Friday.', tag: '🌧 Weather Alert' },
];

const FEATURES = [
  { icon: '🎤', title: 'Voice-first field logs', desc: 'Speak naturally. AI structures it — hours, headcount, progress, issues. Works offline.' },
  { icon: '🦺', title: 'AI safety briefings', desc: 'Every morning: today\'s tasks + jurisdiction requirements + weather hazards = auto-generated safety briefing.' },
  { icon: '📸', title: 'Photo + voice annotation', desc: 'Snap a photo, speak your note. GPS-tagged, AI-indexed, auto-attached to the right project and inspection.' },
  { icon: '🌡', title: 'Weather-aware scheduling', desc: 'Real-time weather + your schedule = proactive alerts. "Don\'t pour Friday — 80% rain."' },
  { icon: '📊', title: 'Daily progress tracking', desc: 'Voice logs → automatic progress % updates → PM notified → schedule stays current. Zero manual entry.' },
  { icon: '⚡', title: 'Code-aware field checks', desc: 'Our knowledge engine powers field compliance. Workers get jurisdiction-specific safety requirements for every task.' },
];

const COMPETITORS = [
  { name: 'Benetics AI', coverage: 'Voice logs only', missing: 'No safety briefings, no code awareness, no PM sync, US/Michigan only', color: '#F59E0B' },
  { name: 'Fieldwire (Hilti)', coverage: 'Basic checklists + tasks', missing: 'No voice, no AI, no weather integration, no knowledge engine', color: '#E8B931' },
  { name: 'Procore Field', coverage: 'Daily reports + photos', missing: '$60K/yr, 6-month onboarding, no AI generation, no voice', color: '#4A90D9' },
];

export default function FieldOpsPage() {
  const [mounted, setMounted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [progress] = useState(78);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #ffffff)', color: 'var(--fg, #111111)', fontFamily: 'var(--font-archivo), sans-serif' }}>
      <KillerAppNav />
      <div style={{ paddingTop: 48 }}>

        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.03) 60%, transparent)',
          borderBottom: '1px solid rgba(245,158,11,0.15)',
          padding: '32px 32px 28px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>🦺</span>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Field Ops</h1>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Voice-first. Weather-aware. Code-connected.</p>
                </div>
              </div>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 520, lineHeight: 1.6, margin: '12px 0 0' }}>
                Every field worker with a phone becomes a real-time data source. Voice logs, AI safety briefings, photo documentation — all connected to your projects, your codes, your schedule.
              </p>
            </div>
            {/* Beta progress */}
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '16px 20px', minWidth: 200 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>Beta Progress</p>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #F59E0B, #FBBF24)', borderRadius: 3 }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>{progress}% complete</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Launching Q2 2026</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 0, minHeight: 'calc(100vh - 200px)' }}>

          {/* Main content */}
          <div style={{ padding: '24px 28px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

            {/* Voice log demo */}
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px' }}>
              Voice Log Preview
            </h2>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px', marginBottom: 24 }}>
              {/* Mic button */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <button
                  onClick={() => setRecording(!recording)}
                  style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: recording ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28,
                    boxShadow: recording ? '0 0 0 12px rgba(239,68,68,0.15), 0 0 0 24px rgba(239,68,68,0.05)' : '0 0 0 8px rgba(245,158,11,0.1)',
                    transition: 'all 0.3s ease',
                    animation: recording ? 'pulse 1.5s infinite' : 'none',
                  }}
                >
                  {recording ? '⏹' : '🎤'}
                </button>
              </div>
              <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 20px' }}>
                {recording ? 'Recording… speak your site update' : 'Tap to start voice log'}
              </p>
              {/* Log feed */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DEMO_LOGS.map((log, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: log.worker === 'AI Briefing' ? '#F59E0B' : 'rgba(255,255,255,0.6)' }}>{log.worker}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{log.time}</span>
                        <span style={{ fontSize: 9, fontWeight: 600, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 4, padding: '1px 5px' }}>{log.tag}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.5 }}>{log.log}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Features grid */}
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 14px' }}>What's included</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>{f.title}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right sidebar: competition + CTA */}
          <div style={{ padding: '24px 20px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 14px' }}>
              Who this replaces
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {COMPETITORS.map((c, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{c.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: c.color, background: `${c.color}15`, border: `1px solid ${c.color}30`, borderRadius: 4, padding: '2px 6px' }}>REPLACED</span>
                  </div>
                  <p style={{ fontSize: 10, color: '#22C55E', margin: '0 0 3px', fontWeight: 600 }}>Covers: {c.coverage}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.4 }}>Missing: {c.missing}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, padding: '20px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Get early access</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 14px', lineHeight: 1.5 }}>
                Be first to use Field Ops when it launches. Early users get 3 months free.
              </p>
              <input placeholder="your@email.com" style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, padding: '8px 12px',
                color: '#fff', fontSize: 12, marginBottom: 10,
                fontFamily: 'inherit', outline: 'none',
              }} />
              <button style={{
                width: '100%', background: '#F59E0B', border: 'none', borderRadius: 8,
                padding: '10px 0', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
                🦺 Notify me when it launches
              </button>
            </div>

            {/* XP unlock */}
            <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>🎮 Unlock Condition</p>
              <p style={{ fontSize: 12, color: '#fff', margin: '0 0 8px' }}>Reach Level 3 Builder to unlock Field Ops Beta</p>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '56%', background: 'linear-gradient(90deg, #F59E0B, #FBBF24)', borderRadius: 3 }} />
              </div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>2,840 / 5,000 XP</p>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 8px rgba(239,68,68,0.2)}50%{box-shadow:0 0 0 20px rgba(239,68,68,0.05)} }`}</style>
    </div>
  );
}
