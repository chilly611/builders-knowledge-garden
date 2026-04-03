'use client';
import { useState, useEffect } from 'react';
import KillerAppNav from '@/components/KillerAppNav';

const FEATURES = [
  { icon: '🚁', title: 'Drone progress analysis', desc: 'Upload drone footage → AI identifies progress %, flags deviations from plan, generates photo report.' },
  { icon: '📸', title: 'Photo → punchlist', desc: 'Take a photo of any issue. AI identifies what it is, creates a punchlist item, assigns to the right trade.' },
  { icon: '🌐', title: 'Digital twin (live)', desc: 'Your project as a living 3D model. Updated from field photos, drone footage, and inspection records.' },
  { icon: '📏', title: 'LiDAR site scanning', desc: 'Scan your site with any LiDAR-capable phone. AI generates survey-grade measurements.' },
  { icon: '🔍', title: 'As-built vs. design', desc: 'Compare what was built to what was designed. Deviations flagged automatically with code impact.' },
  { icon: '📡', title: 'IoT sensor integration', desc: 'Concrete cure sensors, structural monitors, environmental conditions — all integrated into your project timeline.' },
];

const DEMO_PHOTOS = [
  { label: 'Framing - East elevation', date: 'Apr 1', progress: 62, flag: null },
  { label: 'Roof sheathing - North', date: 'Apr 1', progress: 78, flag: null },
  { label: 'Crawlspace access', date: 'Mar 30', progress: null, flag: '⚠️ Water intrusion detected' },
  { label: 'Electrical panel rough', date: 'Mar 29', progress: null, flag: null },
];

export default function SiteIntelPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #ffffff)', color: 'var(--fg, #111111)', fontFamily: 'var(--font-archivo), sans-serif' }}>
      <KillerAppNav />
      <div style={{ paddingTop: 48 }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(186,117,23,0.12) 0%, transparent 60%)', borderBottom: '1px solid rgba(186,117,23,0.15)', padding: '32px 32px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>🔭</span>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Site Intelligence</h1>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Drone · photos · digital twin · IoT</p>
                </div>
              </div>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 520, lineHeight: 1.6, margin: '12px 0 0' }}>
                OpenSpace captures reality. We capture reality AND tell you what to do about it. Every photo connected to your schedule, your codes, your punchlist.
              </p>
            </div>
            <div style={{ background: 'rgba(186,117,23,0.08)', border: '1px solid rgba(186,117,23,0.2)', borderRadius: 12, padding: '16px 20px', minWidth: 180, textAlign: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#BA7517', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>Coming</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>Q4 2026</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: 'calc(100vh - 200px)' }}>
          <div style={{ padding: '24px 28px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

            {/* Photo grid preview */}
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 14px' }}>Site Photo Log Preview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
              {DEMO_PHOTOS.map((p, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${p.flag ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, overflow: 'hidden' }}>
                  {/* Fake photo placeholder */}
                  <div style={{ height: 100, background: `linear-gradient(135deg, rgba(186,117,23,0.15), rgba(55,138,221,0.08))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                    {p.flag ? '⚠️' : i % 2 === 0 ? '🏗' : '📸'}
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#fff', margin: '0 0 2px' }}>{p.label}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '0 0 4px' }}>{p.date}</p>
                    {p.progress !== null && (
                      <div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${p.progress}%`, background: '#22C55E', borderRadius: 2 }} />
                        </div>
                        <p style={{ fontSize: 9, color: '#22C55E', margin: '2px 0 0' }}>{p.progress}% complete</p>
                      </div>
                    )}
                    {p.flag && <p style={{ fontSize: 10, color: '#F59E0B', margin: 0, fontWeight: 600 }}>{p.flag}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Digital twin placeholder */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(186,117,23,0.2)', borderRadius: 12, padding: '20px', marginBottom: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🌐</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Digital Twin</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5, maxWidth: 400, display: 'inline-block' }}>
                Your project as a living 3D model — updated daily from drone footage and field photos. Compare as-built to design in real time.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{f.icon}</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 3px', color: '#fff' }}>{f.title}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.4 }}>{f.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '24px 20px' }}>
            <div style={{ background: 'rgba(186,117,23,0.06)', border: '1px solid rgba(186,117,23,0.15)', borderRadius: 12, padding: '14px', marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#BA7517', margin: '0 0 6px' }}>vs. OpenSpace, Matterport</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>OpenSpace walks sites and captures 360° photos. Beautiful product. But it doesn't know your schedule, your codes, your punchlist, or what to do about what it finds. We do.</p>
            </div>
            <input placeholder="your@email.com" style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, marginBottom: 10, fontFamily: 'inherit', outline: 'none' }} />
            <button style={{ width: '100%', background: '#BA7517', border: 'none', borderRadius: 8, padding: '10px 0', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>🔭 Notify me</button>
          </div>
        </div>
      </div>
    </div>
  );
}
