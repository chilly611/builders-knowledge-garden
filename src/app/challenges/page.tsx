'use client';

import dynamic from 'next/dynamic';
import KillerAppNav from '@/components/KillerAppNav';

const SeasonalChallenges = dynamic(() => import('@/components/SeasonalChallenges'), { ssr: false });

export default function ChallengesPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #ffffff)', color: 'var(--fg, #111111)', fontFamily: 'var(--font-archivo), sans-serif' }}>
      <KillerAppNav />
      <div style={{ paddingTop: 48 }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(232,68,58,0.12) 0%, rgba(232,68,58,0.03) 60%, transparent)',
          borderBottom: '1px solid rgba(232,68,58,0.15)',
          padding: '32px 32px 28px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, maxWidth: 960, margin: '0 auto' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>🎯</span>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Monthly Challenges</h1>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>Master new skills · Earn rewards · Level up</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
          <SeasonalChallenges />
        </div>
      </div>
    </div>
  );
}
