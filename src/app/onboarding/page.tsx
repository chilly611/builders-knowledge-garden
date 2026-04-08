'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Trade = {
  id: string;
  label: string;
  emoji: string;
};

type Goal = {
  id: string;
  label: string;
  icon: string;
  description: string;
};

type FeatureCard = {
  icon: string;
  title: string;
  description: string;
  status: 'LIVE' | 'BETA';
  color: string;
};

// ─── DATA ─────────────────────────────────────────────────────────────────────

const TRADES: Trade[] = [
  { id: 'gc', label: 'General Contractor', emoji: '🏗️' },
  { id: 'roofer', label: 'Roofer', emoji: '🏠' },
  { id: 'hvac', label: 'HVAC Tech', emoji: '❄️' },
  { id: 'electrician', label: 'Electrician', emoji: '⚡' },
  { id: 'plumber', label: 'Plumber', emoji: '🔧' },
  { id: 'solar', label: 'Solar Installer', emoji: '☀️' },
  { id: 'cabinetmaker', label: 'Cabinetmaker', emoji: '🪚' },
  { id: 'remodeler', label: 'Remodeler', emoji: '🔨' },
  { id: 'adu', label: 'ADU Builder', emoji: '🏘️' },
  { id: 'supplier', label: 'Supplier / Distributor', emoji: '📦' },
];

const GOALS: Goal[] = [
  { id: 'bids', label: 'Win more bids', icon: '🏆', description: 'Better estimates, faster turnaround' },
  { id: 'organize', label: 'Stay organized', icon: '📋', description: 'One place for everything' },
  { id: 'time', label: 'Track my time', icon: '⏱️', description: 'Log hours by job effortlessly' },
  { id: 'crew', label: 'Manage my crew', icon: '👷', description: 'Schedule, assign, and communicate' },
  { id: 'invoices', label: 'Handle invoices', icon: '💰', description: 'Get paid faster' },
  { id: 'skills', label: 'Learn new skills', icon: '📚', description: 'Grow your expertise' },
  { id: 'subs', label: 'Find subcontractors', icon: '🤝', description: 'Trusted trade network' },
  { id: 'permits', label: 'Get permits faster', icon: '📄', description: 'Navigate the red tape' },
  { id: 'estimate', label: 'Estimate smarter', icon: '📐', description: 'AI-powered takeoffs' },
  { id: 'grow', label: 'Grow my business', icon: '📈', description: 'More revenue, less chaos' },
];

const TEAM_SIZES = ['Just me', '2–5', '6–15', '16–50', '50+'];

const VOICE_COMMANDS = [
  '"Add 4 hours labor for framing today"',
  '"What permits do I need for a kitchen remodel in Oakland?"',
  '"Create an invoice for $4,200 for the Hendersons"',
];

const FEATURES: FeatureCard[] = [
  {
    icon: '🌱',
    title: 'Dream Builder',
    description: 'Turn photos and sketches into full project specs',
    status: 'LIVE',
    color: '#D85A30',
  },
  {
    icon: '📚',
    title: 'Knowledge Garden',
    description: '10,000+ construction guides at your fingertips',
    status: 'LIVE',
    color: '#1D9E75',
  },
  {
    icon: '⚡',
    title: 'Killer App',
    description: 'Manage bids, permits, invoices, crew — all in one place',
    status: 'BETA',
    color: '#378ADD',
  },
];

// ─── TRADE-SPECIFIC QUICK WIN DATA ───────────────────────────────────────────

const QUICK_WIN_BY_TRADE: Record<string, { headline: string; snippet: string }> = {
  gc: {
    headline: 'We turned this job description into a full estimate in 8 seconds',
    snippet: `ESTIMATE #2041 — KITCHEN REMODEL
─────────────────────────────────
Demo & Haul-Away .............. $1,200
Framing (24 LF @ $38) ......... $  912
Drywall (320 SF) .............. $1,920
Tile Install (180 SF) ......... $2,160
Cabinet Set & Trim ............ $3,400
Plumbing Rough-In ............. $2,800
Electrical (permits incl.) .... $3,100
Paint & Finish ................ $1,400
─────────────────────────────────
SUBTOTAL ...................... $16,892
Contingency (10%) .............  $1,689
─────────────────────────────────
TOTAL ......................... $18,581`,
  },
  roofer: {
    headline: 'Generated a complete material list + permit checklist in seconds',
    snippet: `ROOF REPLACEMENT — 28 SQ PITCH 6:12
─────────────────────────────────
Tear-off & Disposal ........... $1,680
Ice & Water Shield (2 rows) ...   $420
30# Felt Underlayment .........   $280
Architectural Shingles (30 sq)  $4,800
Ridge Cap ..................... $  380
Drip Edge (aluminum) ..........   $210
Flashing (chimney + valleys) ..   $650
Labor (3-man crew, 1.5 days) .. $2,700
─────────────────────────────────
TOTAL ......................... $11,120`,
  },
  hvac: {
    headline: 'Pulled load calcs and equipment specs from one sentence',
    snippet: `HVAC PROPOSAL — 2,400 SF RESIDENCE
─────────────────────────────────
Manual J Load Calc: 36,000 BTU
Equipment: Carrier 3-Ton 16 SEER
─────────────────────────────────
Air Handler ................... $1,850
Condenser ..................... $2,400
Refrigerant Line Set (25 ft) ..   $380
Disconnect + Wiring ...........   $520
Ductwork Mods (4 zones) ....... $1,200
Permit + Inspection ...........   $280
Labor (2-man, 2 days) ......... $1,800
─────────────────────────────────
TOTAL ......................... $8,430`,
  },
  electrician: {
    headline: 'Pulled panel schedule and permit checklist from one job note',
    snippet: `ELECTRICAL PROPOSAL — PANEL UPGRADE
─────────────────────────────────
Remove 100A Panel (Zinsco) ....   $320
Install 200A Main Breaker ..... $1,100
New Sub-feed (2-2-2-4 AL, 50ft)   $480
20 Circuit Breakers @ $18 ea ..   $360
Wire Nut & Termination Kit ....    $85
Permit (City of Oakland) ......   $420
Inspection Fee ................   $175
Labor (master + apprentice) ... $1,600
─────────────────────────────────
TOTAL ......................... $4,540`,
  },
  default: {
    headline: 'We turned this job description into a full proposal in seconds',
    snippet: `PROJECT PROPOSAL — AUTO-GENERATED
─────────────────────────────────
Scope Review & Site Visit .....   $250
Materials (itemized list) ..... $4,820
Labor (est. 3.5 days) ......... $3,200
Subcontractors (specialty) .... $1,400
Permits & Inspections .........   $480
Contingency (8%) ..............   $813
─────────────────────────────────
TOTAL ......................... $10,963
─────────────────────────────────
GENERATED IN: 6 seconds ✓`,
  },
};

function getQuickWin(tradeId: string) {
  return QUICK_WIN_BY_TRADE[tradeId] ?? QUICK_WIN_BY_TRADE.default;
}

function getTradeSuggestions(tradeId: string): string[] {
  const map: Record<string, string[]> = {
    gc: ['Create your first estimate', 'Import a past project', 'Invite a crew member'],
    roofer: ['Build a roofing estimate template', 'Upload your license info', 'Set your service area'],
    hvac: ['Create a maintenance agreement template', 'Log your first service call', 'Add your equipment list'],
    electrician: ['Set up your permit tracker', 'Create a panel upgrade estimate', 'Add your license number'],
    plumber: ['Create a service call template', 'Log your first job', 'Set up your invoice template'],
    solar: ['Add your equipment catalog', 'Create a solar proposal template', 'Set up your rebate tracker'],
    cabinetmaker: ['Upload project photos', 'Create a custom millwork estimate', 'Add your shop rate'],
    remodeler: ['Create a remodel checklist', 'Upload a before photo', 'Set your hourly rate'],
    adu: ['Explore permit requirements', 'Create an ADU proposal', 'Browse ADU guides'],
    supplier: ['Add your product catalog', 'Set up contractor pricing', 'Create a quote template'],
  };
  return map[tradeId] ?? ['Create your first project', 'Explore the Knowledge Garden', 'Set up your profile'];
}

function getTradeName(tradeId: string): string {
  return TRADES.find((t) => t.id === tradeId)?.label ?? 'Pro';
}

// ─── CONFETTI PIECES ─────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#FFA726', '#FFCA28', '#00B8D4', '#1D9E75', '#D85A30', '#7F77DD', '#0B1D33'];

function ConfettiPiece({ index }: { index: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = `${(index * 7.3 + 3) % 100}%`;
  const delay = `${(index * 0.13) % 1.8}s`;
  const duration = `${2.4 + (index % 5) * 0.3}s`;
  const size = 6 + (index % 4) * 3;
  const isRect = index % 3 !== 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: '-20px',
        left,
        width: isRect ? size : size * 0.6,
        height: isRect ? size * 0.4 : size * 0.6,
        backgroundColor: color,
        borderRadius: isRect ? '2px' : '50%',
        animation: `confettiFall ${duration} ${delay} ease-in forwards`,
        opacity: 0,
      }}
    />
  );
}

// ─── STEP PROGRESS BAR ───────────────────────────────────────────────────────

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
      {Array.from({ length: total }).map((_, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < current;
        const isActive = stepNum === current;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < total - 1 ? 1 : 'none' }}>
            {/* Circle */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
                border: '2px solid',
                borderColor: isDone ? '#4A6FA5' : isActive ? '#0B1D33' : '#C9BFAA',
                backgroundColor: isDone ? '#4A6FA5' : isActive ? '#0B1D33' : '#FDF8F0',
                color: isDone || isActive ? '#FDF8F0' : '#C9BFAA',
                transition: 'all 0.3s ease',
                fontFamily: "'Courier Prime', monospace",
              }}
            >
              {isDone ? '✓' : stepNum}
            </div>
            {/* Connector line */}
            {i < total - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: isDone ? '#4A6FA5' : '#C9BFAA',
                  transition: 'background-color 0.3s ease',
                  minWidth: 8,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [selectedTrade, setSelectedTrade] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [yearsInBusiness, setYearsInBusiness] = useState(5);
  const [teamSize, setTeamSize] = useState('Just me');
  const [serviceArea, setServiceArea] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confettiPieces] = useState(() => Array.from({ length: 55 }, (_, i) => i));

  const TOTAL_STEPS = 7;

  // Scroll to top on step change
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  function toggleGoal(id: string) {
    setSelectedGoals((prev) => {
      if (prev.includes(id)) return prev.filter((g) => g !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function handleComplete() {
    setSaving(true);
    try {
      if (user?.id) {
        await supabase.from('user_profiles').upsert(
          {
            user_id: user.id,
            trade: selectedTrade,
            goals: selectedGoals,
            company_name: companyName,
            team_size: teamSize,
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      }
    } catch (err) {
      console.error('Onboarding save error:', err);
    } finally {
      setSaving(false);
      router.push('/dashboard');
    }
  }

  function next() {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  }

  function back() {
    if (step > 1) setStep((s) => s - 1);
  }

  const userName = user?.email?.split('@')[0] ?? 'Builder';
  const tradeName = getTradeName(selectedTrade);
  const quickWin = getQuickWin(selectedTrade);
  const suggestions = getTradeSuggestions(selectedTrade);

  // ─── SHARED STYLES ──────────────────────────────────────────────────────────

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#FDF8F0',
    backgroundImage: `
      linear-gradient(rgba(201,191,170,0.18) 1px, transparent 1px),
      linear-gradient(90deg, rgba(201,191,170,0.18) 1px, transparent 1px)
    `,
    backgroundSize: '32px 32px',
    fontFamily: "'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  };

  const wrapperStyle: React.CSSProperties = {
    maxWidth: 720,
    margin: '0 auto',
    padding: '48px 24px 80px',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: 32,
    fontWeight: 900,
    color: '#0B1D33',
    lineHeight: 1.2,
    marginBottom: 8,
    letterSpacing: '-0.02em',
    fontFamily: "'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  };

  const subheadStyle: React.CSSProperties = {
    fontSize: 17,
    color: '#4A6FA5',
    marginBottom: 36,
    lineHeight: 1.5,
  };

  const btnPrimary: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 32px',
    backgroundColor: '#0B1D33',
    color: '#FDF8F0',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 16,
    border: 'none',
    cursor: 'pointer',
    letterSpacing: '0.02em',
    transition: 'background-color 0.2s',
  };

  const btnSecondary: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '13px 28px',
    backgroundColor: 'transparent',
    color: '#0B1D33',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15,
    border: '2px solid #C9BFAA',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#7A8FA8',
    fontFamily: "'Courier Prime', monospace",
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    border: '2px solid #C9BFAA',
    borderRadius: 8,
    backgroundColor: '#FAF3E8',
    fontSize: 15,
    color: '#0B1D33',
    outline: 'none',
    fontFamily: "'Archivo', sans-serif",
  };

  // ─── STEP RENDERS ────────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <>
        <div style={headingStyle}>What&rsquo;s your trade?</div>
        <div style={subheadStyle}>We&rsquo;ll customize everything for how you work</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 14,
            marginBottom: 40,
          }}
        >
          {TRADES.map((trade) => {
            const selected = selectedTrade === trade.id;
            return (
              <button
                key={trade.id}
                onClick={() => setSelectedTrade(trade.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  padding: '22px 16px',
                  border: `2px solid ${selected ? '#0B1D33' : '#C9BFAA'}`,
                  borderRadius: 12,
                  backgroundColor: selected ? '#0B1D33' : '#FAF3E8',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: selected ? '0 4px 16px rgba(11,29,51,0.18)' : '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <span style={{ fontSize: 36 }}>{trade.emoji}</span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: selected ? '#FDF8F0' : '#0B1D33',
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}
                >
                  {trade.label}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            style={{ ...btnPrimary, opacity: selectedTrade ? 1 : 0.45, cursor: selectedTrade ? 'pointer' : 'not-allowed' }}
            onClick={() => selectedTrade && next()}
            disabled={!selectedTrade}
          >
            Continue →
          </button>
        </div>
      </>
    );
  }

  function renderStep2() {
    return (
      <>
        <div style={headingStyle}>What are you here to do?</div>
        <div style={subheadStyle}>Pick up to 3 goals — we&rsquo;ll point you toward the right tools</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
            marginBottom: 40,
          }}
        >
          {GOALS.map((goal) => {
            const selected = selectedGoals.includes(goal.id);
            const maxed = selectedGoals.length >= 3 && !selected;
            return (
              <button
                key={goal.id}
                onClick={() => toggleGoal(goal.id)}
                disabled={maxed}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '16px',
                  border: `2px solid ${selected ? '#0B1D33' : '#C9BFAA'}`,
                  borderRadius: 10,
                  backgroundColor: selected ? '#0B1D33' : maxed ? '#F5EDDF' : '#FAF3E8',
                  cursor: maxed ? 'not-allowed' : 'pointer',
                  opacity: maxed ? 0.5 : 1,
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{goal.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: selected ? '#FDF8F0' : '#0B1D33', marginBottom: 2 }}>
                    {goal.label}
                  </div>
                  <div style={{ fontSize: 12, color: selected ? '#B8D0EE' : '#7A8FA8', lineHeight: 1.4 }}>
                    {goal.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ marginBottom: 12, fontSize: 13, color: '#7A8FA8' }}>
          {selectedGoals.length}/3 selected
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button style={btnSecondary} onClick={back}>← Back</button>
          <button
            style={{ ...btnPrimary, opacity: selectedGoals.length > 0 ? 1 : 0.45, cursor: selectedGoals.length > 0 ? 'pointer' : 'not-allowed' }}
            onClick={() => selectedGoals.length > 0 && next()}
          >
            Continue →
          </button>
        </div>
      </>
    );
  }

  function renderStep3() {
    return (
      <>
        <div style={headingStyle}>Tell us about your business</div>
        <div style={subheadStyle}>Optional — skip anytime if you&rsquo;d rather jump straight in</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 40 }}>
          {/* Company Name */}
          <div>
            <div style={labelStyle}>Company Name</div>
            <input
              style={inputStyle}
              type="text"
              placeholder="e.g. Smith Roofing Co."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          {/* Years in Business */}
          <div>
            <div style={labelStyle}>Years in Business</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input
                type="range"
                min={1}
                max={30}
                value={yearsInBusiness}
                onChange={(e) => setYearsInBusiness(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#0B1D33' }}
              />
              <div
                style={{
                  minWidth: 52,
                  padding: '6px 12px',
                  backgroundColor: '#0B1D33',
                  color: '#FDF8F0',
                  borderRadius: 6,
                  fontSize: 15,
                  fontWeight: 700,
                  textAlign: 'center',
                  fontFamily: "'Courier Prime', monospace",
                }}
              >
                {yearsInBusiness === 30 ? '30+' : `${yearsInBusiness}yr`}
              </div>
            </div>
          </div>

          {/* Team Size */}
          <div>
            <div style={labelStyle}>Team Size</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {TEAM_SIZES.map((size) => {
                const selected = teamSize === size;
                return (
                  <button
                    key={size}
                    onClick={() => setTeamSize(size)}
                    style={{
                      padding: '9px 18px',
                      border: `2px solid ${selected ? '#0B1D33' : '#C9BFAA'}`,
                      borderRadius: 8,
                      backgroundColor: selected ? '#0B1D33' : '#FAF3E8',
                      color: selected ? '#FDF8F0' : '#0B1D33',
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Service Area */}
          <div>
            <div style={labelStyle}>Service Area</div>
            <input
              style={inputStyle}
              type="text"
              placeholder="e.g. Bay Area, CA or Portland, OR"
              value={serviceArea}
              onChange={(e) => setServiceArea(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button style={btnSecondary} onClick={back}>← Back</button>
          <button style={btnPrimary} onClick={next}>Continue →</button>
          <button
            onClick={next}
            style={{
              background: 'none',
              border: 'none',
              color: '#7A8FA8',
              fontSize: 14,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '0 8px',
            }}
          >
            Skip for now →
          </button>
        </div>
      </>
    );
  }

  function renderStep4() {
    return (
      <>
        <div style={{ marginBottom: 8 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              backgroundColor: '#FFA726',
              color: '#0B1D33',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: "'Courier Prime', monospace",
            }}
          >
            Quick Win Demo
          </span>
        </div>
        <div style={headingStyle}>Here&rsquo;s what BKG just did for a {tradeName} like you:</div>
        <div style={{ ...subheadStyle, marginBottom: 28 }}>{quickWin.headline}</div>

        {/* Blueprint snippet */}
        <div
          style={{
            backgroundColor: '#0B1D33',
            borderRadius: 12,
            padding: '28px 32px',
            marginBottom: 36,
            border: '1px solid #1E3555',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Blueprint grid overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `linear-gradient(rgba(0,184,212,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,184,212,0.06) 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'relative',
              fontFamily: "'Courier Prime', monospace",
              fontSize: 13,
              lineHeight: 1.8,
              color: '#00B8D4',
              whiteSpace: 'pre',
              overflowX: 'auto',
            }}
          >
            {quickWin.snippet}
          </div>
          <div
            style={{
              position: 'relative',
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#1D9E75',
                animation: 'pulse 2s infinite',
              }}
            />
            <span
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: 12,
                color: '#1D9E75',
              }}
            >
              AI-generated in &lt;10 seconds
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button style={btnSecondary} onClick={back}>← Back</button>
          <button
            style={{ ...btnPrimary, backgroundColor: '#FFA726', color: '#0B1D33' }}
            onClick={next}
          >
            I want this →
          </button>
        </div>
      </>
    );
  }

  function renderStep5() {
    return (
      <>
        <div style={headingStyle}>BKG works with your voice</div>
        <div style={subheadStyle}>Just talk to it like you&rsquo;d talk to your best subcontractor</div>

        {/* Mic icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                inset: -12,
                borderRadius: '50%',
                border: '2px solid #00B8D4',
                animation: 'micPulse 2s ease-in-out infinite',
                opacity: 0.4,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: -24,
                borderRadius: '50%',
                border: '2px solid #00B8D4',
                animation: 'micPulse 2s ease-in-out infinite 0.5s',
                opacity: 0.2,
              }}
            />
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: '#0B1D33',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                border: '3px solid #00B8D4',
                position: 'relative',
              }}
            >
              🎙️
            </div>
          </div>
        </div>

        {/* Voice command examples */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
          {VOICE_COMMANDS.map((cmd, i) => (
            <div
              key={i}
              style={{
                padding: '16px 20px',
                backgroundColor: '#0B1D33',
                borderRadius: 10,
                border: '1px solid #1E3555',
                borderLeft: '4px solid #00B8D4',
                fontFamily: "'Courier Prime', monospace",
                fontSize: 15,
                color: '#EBF2FA',
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: '#00B8D4', marginRight: 8 }}>▶</span>
              {cmd}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button style={btnSecondary} onClick={back}>← Back</button>
          <button
            style={{ ...btnPrimary, backgroundColor: '#00B8D4', color: '#0B1D33' }}
            onClick={() => { setVoiceEnabled(true); next(); }}
          >
            🎙️ Enable Voice
          </button>
          <button
            onClick={() => { setVoiceEnabled(false); next(); }}
            style={{
              background: 'none',
              border: 'none',
              color: '#7A8FA8',
              fontSize: 14,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '0 8px',
            }}
          >
            Maybe later
          </button>
        </div>
      </>
    );
  }

  function renderStep6() {
    return (
      <>
        <div style={headingStyle}>Here&rsquo;s what&rsquo;s waiting for you</div>
        <div style={subheadStyle}>Built for the way you actually work on a job site</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 20,
                padding: '24px',
                backgroundColor: '#FAF3E8',
                border: '2px solid #C9BFAA',
                borderRadius: 12,
                borderLeft: `5px solid ${feature.color}`,
              }}
            >
              <div style={{ fontSize: 40, flexShrink: 0 }}>{feature.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0B1D33' }}>
                    {feature.title}
                  </div>
                  <span
                    style={{
                      padding: '2px 8px',
                      backgroundColor: feature.status === 'LIVE' ? '#1D9E75' : '#FFA726',
                      color: feature.status === 'LIVE' ? '#FDF8F0' : '#0B1D33',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      fontFamily: "'Courier Prime', monospace",
                    }}
                  >
                    {feature.status}
                  </span>
                </div>
                <div style={{ fontSize: 15, color: '#4A6FA5', lineHeight: 1.5 }}>
                  {feature.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button style={btnSecondary} onClick={back}>← Back</button>
          <button style={btnPrimary} onClick={next}>
            Let&rsquo;s go →
          </button>
        </div>
      </>
    );
  }

  function renderStep7() {
    return (
      <>
        {/* Confetti layer */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 50,
          }}
        >
          {confettiPieces.map((i) => (
            <ConfettiPiece key={i} index={i} />
          ))}
        </div>

        {/* XP Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div
            style={{
              padding: '12px 28px',
              backgroundColor: '#FFCA28',
              color: '#0B1D33',
              borderRadius: 40,
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: '0.04em',
              fontFamily: "'Courier Prime', monospace",
              boxShadow: '0 4px 20px rgba(255,202,40,0.5)',
              animation: 'xpBounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97)',
            }}
          >
            +500 XP EARNED 🏆
          </div>
        </div>

        <div style={{ ...headingStyle, textAlign: 'center', marginBottom: 12 }}>
          Welcome to the Builders&rsquo; Club, {userName}!
        </div>
        <div style={{ ...subheadStyle, textAlign: 'center', marginBottom: 40 }}>
          You&rsquo;re set up as a{' '}
          <strong style={{ color: '#0B1D33' }}>{tradeName}</strong>.
          {voiceEnabled && ' Voice control is on. '}
          {' '}Here&rsquo;s where to start:
        </div>

        {/* Suggested first actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 48 }}>
          {suggestions.map((action, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                backgroundColor: '#FAF3E8',
                border: '2px solid #C9BFAA',
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#0B1D33',
                  color: '#FDF8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  flexShrink: 0,
                  fontFamily: "'Courier Prime', monospace",
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#0B1D33' }}>{action}</div>
              <div style={{ marginLeft: 'auto', color: '#C9BFAA', fontSize: 18 }}>→</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            style={{ ...btnPrimary, fontSize: 18, padding: '18px 48px', opacity: saving ? 0.7 : 1 }}
            onClick={handleComplete}
            disabled={saving}
          >
            {saving ? 'Setting up your account…' : 'Start Building →'}
          </button>
        </div>
      </>
    );
  }

  function renderCurrentStep() {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      default: return null;
    }
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Keyframe animations injected via style tag */}
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-20px) rotate(0deg) scale(1);
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(720deg) scale(0.6);
            opacity: 0;
          }
        }

        @keyframes micPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.1;
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        @keyframes xpBounce {
          0% { transform: scale(0.5) translateY(20px); opacity: 0; }
          60% { transform: scale(1.12) translateY(-4px); opacity: 1; }
          80% { transform: scale(0.96) translateY(2px); }
          100% { transform: scale(1) translateY(0); }
        }

        .onboarding-btn-primary:hover {
          background-color: #1E3555 !important;
        }

        .onboarding-btn-secondary:hover {
          border-color: #0B1D33 !important;
        }
      `}</style>

      <div style={pageStyle} ref={containerRef}>
        <div style={wrapperStyle}>

          {/* Header mark */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 40,
            }}
          >
            <div
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: 13,
                color: '#7A8FA8',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              BKG // Pro Setup
            </div>
            <div
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: 12,
                color: '#C9BFAA',
              }}
            >
              Step {step} of {TOTAL_STEPS}
            </div>
          </div>

          {/* Progress indicator */}
          <StepProgress current={step} total={TOTAL_STEPS} />

          {/* Step content */}
          <div>
            {renderCurrentStep()}
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 64,
              paddingTop: 24,
              borderTop: '1px solid #C9BFAA',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: 11,
                color: '#C9BFAA',
                letterSpacing: '0.06em',
              }}
            >
              BUILDERS&rsquo; KNOWLEDGE GARDEN
            </div>
            {step < TOTAL_STEPS && (
              <button
                onClick={() => setStep(TOTAL_STEPS)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#C9BFAA',
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontFamily: "'Courier Prime', monospace",
                }}
              >
                Skip all →
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
