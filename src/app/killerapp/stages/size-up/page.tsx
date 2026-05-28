'use client';

/**
 * Size Up — lifecycle stage 1, inside the persistent StageShell chrome.
 * ====================================================================
 * "What are you building, where, and how big?"
 *
 * PATCH 1 (2026-05-27, post live-review): every stage ends with an insight
 * card sitting directly above a sticky one-primary-action bar; the primary's
 * verb is the stage's forward act ("Lock the scope"); on tap the completion
 * ring fills + a check overlays, then the journey advances to Lock. Whispers
 * render as in-flow banners (never floating overlays), one at a time.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { recordMaterialCost } from '@/lib/budget-spine';
import { emitJourneyEvent } from '@/lib/journey-progress';
import { StageShell, useStageChrome } from '@/components/stage-shell';
import { AutoFillButton } from '@/components/stage-kit';
import {
  MARIN_PROJECT,
  MARIN_PROJECT_ID,
  MARIN_BUDGET_TOTAL,
  MARIN_BUDGET_SPENT,
  ensureMarinActive,
  seedMarinBudget,
} from '@/lib/demo/marin-4000';
import { colors, fonts } from '@/design-system/tokens';
import { runSizeUpEstimate, emitSizeUpWrite } from '@/lib/specialists/size-up';
import type { BuildingType, SizeUpResult } from '@/lib/specialists/size-up';

const C = {
  navy: colors.navy,
  brass: colors.brass,
  robin: colors.robin,
  green: '#2E7D32',
  graphite: colors.graphite,
  rule: colors.fadedRule,
  redline: colors.redline,
  paper: colors.paper.white,
  accent: '#C9913F', // stage-1 ochre
};
const FONT = fonts.body;
const ACTIVE_PROJECT_KEY = 'bkg-active-project';

// ─── utilities ──────────────────────────────────────────────────────────────

function readActiveProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromUrl = new URL(window.location.href).searchParams.get('project');
    if (fromUrl) return fromUrl;
    return window.localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}
async function authedFetch(input: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  return fetch(input, { ...init, headers });
}
const SQFT_RE = /([\d,]+)\s*(?:sf|sqft|sq\s?ft|square\s?(?:feet|foot|ft))/i;
function parseSqft(text: string): string | null {
  const m = text.match(SQFT_RE);
  return m ? m[1].replace(/,/g, '') : null;
}
function inferBuildingType(s: string): BuildingType | null {
  const l = s.toLowerCase();
  if (/(office|retail|warehouse|commercial|\bti\b|tenant improvement|restaurant|shop)/.test(l)) return 'commercial';
  if (/(mixed[- ]?use|live[- ]?work)/.test(l)) return 'mixed';
  if (/(home|house|farmhouse|adu|residence|residential|dwelling|cabin|bedroom|bath)/.test(l)) return 'residential';
  return null;
}
function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

// ─── in-flow whisper banner (never occludes; one-time per id) ─────────────────

// WHISPER REMOVED 2026-05-27 per Charlie (PATCH 1 #5) — demo clarity. Restore
// post-demo by reinstating the banner body below. Render sites left in place
// but now render nothing.
function WhisperBanner({ id, text }: { id: string; text: string }) {
  return id && text ? null : null;
}

// ─── completion ring overlay ──────────────────────────────────────────────────

function CompletionOverlay({ fill, title, detail, onContinue, continueLabel }: { fill: boolean; title: string; detail: string; onContinue: () => void; continueLabel: string }) {
  return (
    <div role="dialog" aria-label={title} style={{ position: 'absolute', inset: 0, zIndex: 900, background: 'rgba(253,248,240,0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <svg width="150" height="150" viewBox="0 0 160 160" aria-hidden>
        <circle cx="80" cy="80" r="70" fill="none" stroke={C.rule} strokeWidth="10" />
        <circle cx="80" cy="80" r="70" fill="none" stroke={C.green} strokeWidth="10" strokeLinecap="round" transform="rotate(-90 80 80)" strokeDasharray={2 * Math.PI * 70} strokeDashoffset={fill ? 0 : 2 * Math.PI * 70} style={{ transition: 'stroke-dashoffset 900ms ease' }} />
        <path d="M52 82 L72 102 L110 60" fill="none" stroke={C.green} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={120} strokeDashoffset={fill ? 0 : 120} style={{ transition: 'stroke-dashoffset 600ms ease 700ms' }} />
      </svg>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.navy, fontFamily: fonts.display }}>{title}</div>
      <p style={{ fontSize: 13.5, color: C.graphite, maxWidth: 420, textAlign: 'center', margin: 0 }}>{detail}</p>
      <button type="button" onClick={onContinue} style={btn('primary')}>{continueLabel}</button>
    </div>
  );
}

// ─── voice mic ──────────────────────────────────────────────────────────────

function MicButton({ onText, label }: { onText: (t: string) => void; label: string }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);
  const supported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const toggle = () => {
    if (!supported) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = (window.SpeechRecognition || window.webkitSpeechRecognition) as SpeechRecognitionConstructor;
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0]?.[0]?.transcript ?? '';
      if (t) onText(t.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };
  return (
    <button type="button" onClick={toggle} disabled={!supported} aria-label={`Speak ${label}`} title={supported ? `Speak ${label}` : 'Voice input not supported in this browser'} style={{ flex: '0 0 auto', width: 44, height: 44, borderRadius: 12, border: `1px solid ${listening ? C.redline : C.rule}`, background: listening ? 'rgba(161,71,58,0.10)' : C.paper, color: listening ? C.redline : C.graphite, cursor: supported ? 'pointer' : 'not-allowed', opacity: supported ? 1 : 0.45, fontSize: 18, lineHeight: 1 }}>
      <span aria-hidden>{listening ? '🔴' : '🎤'}</span>
    </button>
  );
}

// ─── sketch pad ───────────────────────────────────────────────────────────────

function SketchPad({ initial, onClose, onSave }: { initial: string | null; onClose: () => void; onSave: (d: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.strokeStyle = C.navy;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (initial) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
      img.src = initial;
    }
  }, [initial]);
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current!;
    const r = cvs.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * cvs.width, y: ((e.clientY - r.top) / r.height) * cvs.height };
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const up = () => {
    drawing.current = false;
  };
  const clear = () => {
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
  };
  return (
    <div role="dialog" aria-label="Sketch" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(14,42,71,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: C.paper, borderRadius: 16, padding: 16, width: 'min(560px, 96vw)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <strong style={{ color: C.navy }}>Sketch your idea</strong>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: C.graphite }} aria-label="Close sketch">×</button>
        </div>
        <canvas ref={canvasRef} width={520} height={320} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} style={{ width: '100%', height: 'auto', touchAction: 'none', borderRadius: 10, border: `1px solid ${C.rule}`, display: 'block', cursor: 'crosshair' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" onClick={clear} style={btn('ghost')}>Clear</button>
          <button type="button" onClick={() => { const u = canvasRef.current?.toDataURL('image/png'); if (u) onSave(u); onClose(); }} style={btn('primary')}>Save sketch</button>
        </div>
      </div>
    </div>
  );
}

function btn(kind: 'primary' | 'ghost' | 'soft'): React.CSSProperties {
  const base: React.CSSProperties = { height: 46, padding: '0 20px', borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: 'pointer', border: '1px solid transparent' };
  if (kind === 'primary') return { ...base, background: C.navy, color: '#fff', borderColor: C.navy };
  if (kind === 'soft') return { ...base, background: 'rgba(182,135,58,0.12)', color: C.brass, borderColor: C.brass };
  return { ...base, background: C.paper, color: C.graphite, borderColor: C.rule };
}
const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, height: 48, padding: '0 14px', borderRadius: 12, border: `1px solid ${C.rule}`, fontSize: 16, fontFamily: FONT, color: C.graphite, background: '#fff', boxSizing: 'border-box' };

function ConfidencePill({ level }: { level: 'low' | 'medium' | 'high' }) {
  const map = {
    high: { bg: 'rgba(46,125,50,0.12)', fg: '#2E7D32', label: 'High confidence' },
    medium: { bg: 'rgba(182,135,58,0.14)', fg: C.brass, label: 'Medium confidence' },
    low: { bg: 'rgba(161,71,58,0.12)', fg: C.redline, label: 'Low confidence' },
  }[level];
  return <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: map.fg, background: map.bg }}>{map.label}</span>;
}

function MapPanel({ address }: { address: string }) {
  const [satellite, setSatellite] = useState(false);
  const src = 'https://www.openstreetmap.org/export/embed.html?bbox=-122.55,37.70,-122.35,37.90&layer=mapnik';
  return (
    <div style={{ marginTop: 12, borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.rule}`, position: 'relative', height: 120 }}>
      <iframe title="Site map" src={src} loading="lazy" style={{ width: '100%', height: '100%', border: 0, filter: satellite ? 'saturate(1.4) hue-rotate(8deg) brightness(0.92)' : 'none' }} />
      <div style={{ position: 'absolute', left: 10, bottom: 10, background: 'rgba(27,59,94,0.9)', color: '#fff', fontSize: 12, padding: '4px 10px', borderRadius: 8, maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>pin: {address}</div>
      <button type="button" onClick={() => setSatellite((s) => !s)} style={{ position: 'absolute', right: 10, top: 10, height: 28, padding: '0 10px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.92)', color: C.navy, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{satellite ? 'Map' : 'Satellite'}</button>
    </div>
  );
}

const TRADE_OPTIONS = ['Framing', 'Electrical', 'Plumbing', 'HVAC', 'Concrete', 'Roofing', 'Drywall', 'Finish carpentry', 'Tile', 'Painting'];
const TYPE_TILES: Array<{ id: BuildingType; human: string; pro: string; glyph: string }> = [
  { id: 'residential', human: 'A place to live', pro: 'Residential', glyph: 'home' },
  { id: 'commercial', human: 'A place to work', pro: 'Commercial', glyph: 'shop' },
  { id: 'mixed', human: 'A bit of both', pro: 'Mixed-use', glyph: 'mix' },
];
const STEPS = ['type', 'place', 'size', 'trades', 'review'] as const;
type StepId = (typeof STEPS)[number];

interface Prefill {
  buildingType: BuildingType | null;
  address: string;
  jurisdiction: string;
  sqft: number;
  scopeText: string;
}

// ─── outer ────────────────────────────────────────────────────────────────────

export default function SizeUpPage() {
  const [ctx, setCtx] = useState<{ projectId: string | null; name: string; meta: string; initialBudget: number; prefill: Prefill }>(() => ({
    projectId: null,
    name: MARIN_PROJECT.name,
    meta: `${MARIN_PROJECT.sqft} sqft · ${MARIN_PROJECT.jurisdiction}`,
    initialBudget: MARIN_BUDGET_TOTAL,
    prefill: { buildingType: 'residential', address: MARIN_PROJECT.jurisdiction, jurisdiction: MARIN_PROJECT.jurisdiction, sqft: 4000, scopeText: MARIN_PROJECT.project_type },
  }));

  useEffect(() => {
    ensureMarinActive();
    seedMarinBudget();
    let cancelled = false;
    (async () => {
      const id = readActiveProjectId() ?? MARIN_PROJECT_ID;
      if (!cancelled) setCtx((c) => ({ ...c, projectId: id }));
      try {
        const res = await authedFetch(`/api/v1/projects?id=${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const j = (await res.json()) as Record<string, unknown>;
        if (cancelled || !j || !j.id) return;
        const sqftNum = parseInt(String(j.sqft ?? '').replace(/[^\d]/g, ''), 10);
        const scope = [j.notes, j.ai_summary, j.raw_input].filter(Boolean).join(' ') || MARIN_PROJECT.project_type;
        setCtx((c) => ({
          ...c,
          name: (j.name as string) || c.name,
          meta: `${j.sqft ?? MARIN_PROJECT.sqft} sqft · ${(j.jurisdiction as string) || MARIN_PROJECT.jurisdiction}`,
          prefill: {
            buildingType: inferBuildingType(String(j.project_type ?? '')) ?? c.prefill.buildingType,
            address: (j.location as string) || (j.jurisdiction as string) || c.prefill.address,
            jurisdiction: (j.jurisdiction as string) || c.prefill.jurisdiction,
            sqft: Number.isFinite(sqftNum) && sqftNum > 0 ? sqftNum : c.prefill.sqft,
            scopeText: scope,
          },
        }));
      } catch {
        /* offline / unauth — fixture serves the demo */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StageShell stageId={1} stageTitle="Size Up" projectId={ctx.projectId} projectName={ctx.name} projectMeta={ctx.meta} initialBudget={ctx.initialBudget} budgetSpent={MARIN_BUDGET_SPENT}>
      <SizeUpBody projectId={ctx.projectId} prefill={ctx.prefill} />
    </StageShell>
  );
}

// ─── body ───────────────────────────────────────────────────────────────────

function SizeUpBody({ projectId, prefill }: { projectId: string | null; prefill: Prefill }) {
  const router = useRouter();
  // #6: read proMode only — the budget chip stays pinned to the Marin seed
  // ($312K / $1.65M) for zero cross-screen mismatches; the estimate shows in
  // the body, not the chrome ribbon.
  const { proMode } = useStageChrome();

  const [stepIdx, setStepIdx] = useState(0);
  const step: StepId = STEPS[stepIdx];

  const [buildingType, setBuildingType] = useState<BuildingType | null>(prefill.buildingType);
  const [address, setAddress] = useState(prefill.address);
  const [sqft, setSqft] = useState<number>(prefill.sqft);
  const [sqftText, setSqftText] = useState(prefill.sqft ? String(prefill.sqft) : '');
  const [trades, setTrades] = useState<string[]>([]);
  const [perSqftOverride, setPerSqftOverride] = useState('');

  const [sketch, setSketch] = useState<string | null>(null);
  const [sketchOpen, setSketchOpen] = useState(false);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SizeUpResult | null>(null);
  const [budgetEdit, setBudgetEdit] = useState('');
  const [saveNote, setSaveNote] = useState<string | null>(null);

  // completion → advance
  const [completing, setCompleting] = useState(false);
  const [ringFill, setRingFill] = useState(false);
  const advancedRef = useRef(false);

  const jurisdiction = prefill.jurisdiction;
  const scopeText = prefill.scopeText;
  const L = (human: string, pro: string) => (proMode ? pro : human);

  const autofillType = () => {
    const guess = inferBuildingType(`${scopeText}`);
    if (guess) setBuildingType(guess);
  };
  const autofillPlace = () => setAddress(prefill.address || jurisdiction);
  const autofillSqft = () => {
    const n = parseSqft(scopeText) || (prefill.sqft ? String(prefill.sqft) : null);
    if (n) {
      setSqft(Number(n));
      setSqftText(String(Number(n)));
    }
  };

  const canRun = !!buildingType && sqft > 0;

  const runSpecialist = useCallback(async () => {
    if (!buildingType) return;
    setRunning(true);
    try {
      const r = await runSizeUpEstimate({ projectId: projectId ?? undefined, buildingType, address: address || jurisdiction, jurisdiction, squareFootage: sqft, trades, scopeText, costPerSqftOverride: perSqftOverride ? Number(perSqftOverride) : undefined });
      setResult(r);
      setBudgetEdit(String(r.mid));
    } catch {
      setSaveNote('Could not run the estimate. Check your inputs and try again.');
    } finally {
      setRunning(false);
    }
  }, [buildingType, projectId, address, jurisdiction, sqft, trades, scopeText, perSqftOverride]);

  const advance = useCallback(() => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    router.push(projectId ? `/killerapp/stages/lock?project=${encodeURIComponent(projectId)}` : '/killerapp/stages/lock');
  }, [router, projectId]);

  // Primary action: "Lock the scope" — persist, fill the ring, advance to Lock.
  const lockTheScope = async () => {
    if (!result) return;
    const budget = Number(budgetEdit) || result.mid;
    // fire-and-forget persistence; the completion moment shouldn't wait on the network
    if (projectId) {
      void (async () => {
        try {
          await authedFetch('/api/v1/projects', { method: 'PATCH', body: JSON.stringify({ id: projectId, project_type: buildingType, location: address || null, jurisdiction: result.jurisdiction.name, sqft: String(sqft), budget_amount: budget, budget_status: 'on-track' }) });
          await emitSizeUpWrite({ projectId, buildingType: buildingType!, sqft, budgetAmount: budget, jurisdiction: result.jurisdiction.name });
        } catch {
          /* best-effort */
        }
        try {
          await recordMaterialCost({ description: `Size Up ballpark — ${buildingType} (${sqft.toLocaleString()} sqft)`, amount: budget, lifecycleStageId: 1, isEstimate: true, projectId });
        } catch {
          /* ignore */
        }
        try {
          emitJourneyEvent({ type: 'started', workflowId: 'q1', projectId });
          emitJourneyEvent({ type: 'completed', workflowId: 'q1', projectId });
        } catch {
          /* ignore */
        }
      })();
      try {
        const handoff = { buildingType, address: address || jurisdiction, sqft, trades, jurisdiction: result.jurisdiction.name, low: result.low, mid: result.mid, high: result.high, budget, sketch, scopeText, projectName: MARIN_PROJECT.name };
        window.localStorage.setItem(`bkg:sizeup:${projectId}`, JSON.stringify(handoff));
      } catch {
        /* ignore */
      }
    }
    setCompleting(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setRingFill(true)));
    window.setTimeout(advance, 1800); // auto-advance after the ring fills
  };

  const goNext = () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  const goBack = () => setStepIdx((i) => Math.max(0, i - 1));

  // sticky action-bar config per step
  const stepBlocksNext = (step === 'type' && !buildingType) || (step === 'size' && sqft <= 0);
  const insight = result
    ? `${money(Number(budgetEdit) || result.mid)} ballpark · ${money(result.perSqftUsed)}/sqft × ${sqft.toLocaleString()} sqft · ${result.confidence} confidence · ${result.jurisdiction.name}`
    : null;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: '12px clamp(12px, 4vw, 40px) 0', position: 'relative', overflow: 'hidden' }}>
      {/* body header: sketch + progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flex: '0 0 auto' }}>
        <button type="button" onClick={() => setSketchOpen(true)} style={{ ...btn('soft'), height: 34, padding: '0 12px', fontSize: 13 }} title="Open the sketch pad">{sketch ? '✓ Sketch saved' : 'Sketch it'}</button>
        <div style={{ display: 'flex', gap: 6, flex: 1, maxWidth: 320 }}>
          {STEPS.map((s, i) => (
            <span key={s} style={{ height: 4, flex: 1, borderRadius: 999, background: i <= stepIdx ? C.accent : C.rule, opacity: i <= stepIdx ? 1 : 0.5 }} />
          ))}
        </div>
      </div>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0, overflow: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>
          {step === 'type' && (
            <section>
              <WhisperBanner id="type" text="Tap a tile. You can always change it later." />
              <h1 style={h1Style}>{L('What are you building?', 'Occupancy / use type')}</h1>
              <div style={{ marginTop: 10 }}><AutoFillButton onFill={autofillType} label="Auto-fill" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 14 }}>
                {TYPE_TILES.map((t) => {
                  const active = buildingType === t.id;
                  return (
                    <button key={t.id} type="button" onClick={() => setBuildingType(t.id)} style={{ textAlign: 'left', padding: 16, borderRadius: 16, border: `2px solid ${active ? C.accent : C.rule}`, background: active ? 'rgba(201,145,63,0.08)' : C.paper, cursor: 'pointer', minHeight: 92 }}>
                      <div style={{ fontSize: 12, color: C.brass, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t.glyph}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginTop: 6 }}>{proMode ? t.pro : t.human}</div>
                      <div style={{ fontSize: 12.5, color: C.graphite, opacity: 0.7, marginTop: 4 }}>{proMode ? t.human : t.pro}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 'place' && (
            <section>
              <WhisperBanner id="place" text="Type or speak the address — we read the jurisdiction from it." />
              <h1 style={h1Style}>{L('Where is it?', 'Site / parcel')}</h1>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={proMode ? 'Street address or APN' : 'Address or where the job is'} style={inputStyle} />
                <MicButton onText={(t) => setAddress(t)} label="the address" />
                <AutoFillButton onFill={autofillPlace} label="Auto-fill" />
              </div>
              <MapPanel address={address || jurisdiction || 'San Francisco, CA'} />
              {address && (
                <p style={{ fontSize: 12.5, color: C.navy, marginTop: 8 }}>Jurisdiction read: <strong>{jurisdiction || (/(san francisco|soma|\bsf\b)/i.test(address) ? 'San Francisco, CA' : address)}</strong></p>
              )}
            </section>
          )}

          {step === 'size' && (
            <section>
              <WhisperBanner id="size" text="Drag the slider, type it, or speak it." />
              <h1 style={h1Style}>{L('How big is it?', 'Gross floor area (GSF)')}</h1>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                <input inputMode="numeric" value={sqftText} onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ''); setSqftText(v); setSqft(Number(v) || 0); }} placeholder={proMode ? 'GSF' : 'Square feet'} style={{ ...inputStyle, maxWidth: 180 }} />
                <span style={{ fontWeight: 700, color: C.navy }}>{proMode ? 'GSF' : 'sq ft'}</span>
                <MicButton onText={(t) => { const n = parseSqft(t) || t.replace(/[^\d]/g, ''); if (n) { setSqft(Number(n)); setSqftText(String(Number(n))); } }} label="the square footage" />
                <AutoFillButton onFill={autofillSqft} label="Auto-fill" />
              </div>
              <input type="range" min={0} max={10000} step={50} value={Math.min(sqft, 10000)} onChange={(e) => { const n = Number(e.target.value); setSqft(n); setSqftText(String(n)); }} style={{ width: '100%', marginTop: 18, accentColor: C.accent }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: C.graphite, opacity: 0.6 }}><span>0</span><span>5,000</span><span>10,000+</span></div>
            </section>
          )}

          {step === 'trades' && (
            <section>
              <WhisperBanner id="trades" text="Only if you are a sub. Skip if not — the button moves on." />
              <h1 style={h1Style}>{L('Any specialty trades?', 'CSI trade scope')}</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {TRADE_OPTIONS.map((t) => {
                  const on = trades.includes(t);
                  return (
                    <button key={t} type="button" onClick={() => setTrades((cur) => (on ? cur.filter((x) => x !== t) : [...cur, t]))} style={{ padding: '8px 14px', borderRadius: 999, border: `1.5px solid ${on ? C.brass : C.rule}`, background: on ? 'rgba(182,135,58,0.12)' : C.paper, color: on ? C.brass : C.graphite, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>{t}</button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 'review' && (
            <section>
              <h1 style={h1Style}>{L('Your ballpark', 'Rough order-of-magnitude (ROM)')}</h1>
              {proMode && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0' }}>
                  <label style={{ fontSize: 12.5, color: C.graphite }}>$/sqft override</label>
                  <input value={perSqftOverride} onChange={(e) => setPerSqftOverride(e.target.value.replace(/[^\d.]/g, ''))} placeholder="auto" style={{ ...inputStyle, height: 38, maxWidth: 110 }} />
                  <span style={{ fontSize: 11.5, color: C.graphite, opacity: 0.6 }}>CSI-level detail unlocks in Plan</span>
                </div>
              )}
              {!result ? (
                <div style={{ marginTop: 12 }}>
                  <WhisperBanner id="review" text="One tap runs the estimate specialist; the number comes back editable." />
                  <p style={{ fontSize: 14, color: C.graphite, opacity: 0.8, marginTop: 4 }}>{buildingType ? <>A <strong>{buildingType}</strong> build of <strong>{sqft.toLocaleString()} sqft</strong>{address ? <> at <strong>{address}</strong></> : null}.</> : 'Pick a building type and size first.'}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                    <button type="button" disabled={!canRun || running} onClick={runSpecialist} style={{ ...btn('primary'), opacity: !canRun || running ? 0.5 : 1 }}>{running ? 'Running estimate…' : 'Get my ballpark'}</button>
                    <AutoFillButton onFill={runSpecialist} label="Auto-fill from specialist" title="Run the Size Up specialist and fill the number" />
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <div style={{ background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 16, padding: 16 }}>
                    <div style={{ fontSize: 12.5, color: C.graphite, opacity: 0.7 }}>Most likely (editable)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: C.brass }}>$</span>
                      <input value={budgetEdit} onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ''); setBudgetEdit(v); }} style={{ fontSize: 30, fontWeight: 800, color: C.brass, border: 'none', borderBottom: `2px dashed ${C.rule}`, width: 200, fontFamily: FONT, background: 'transparent' }} />
                      <AutoFillButton onFill={runSpecialist} label="Re-run" title="Re-run the specialist" />
                    </div>
                    <div style={{ fontSize: 13, color: C.graphite, marginTop: 6 }}>Range {money(result.low)} – {money(result.high)} · {money(result.perSqftUsed)}/sqft × {sqft.toLocaleString()} × {result.localeModifier.toFixed(2)} ({result.localeLabel})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
                      <ConfidencePill level={result.confidence} />
                      <span title={result.jurisdiction.note} style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: result.jurisdiction.codeCoverage === 'full' ? '#0E2A47' : C.graphite, background: result.jurisdiction.codeCoverage === 'full' ? C.robin : 'rgba(201,195,179,0.4)' }}>{result.jurisdiction.name} · {result.jurisdiction.codeCoverage === 'full' ? 'code-aware' : 'preliminary'}</span>
                    </div>
                  </div>
                </div>
              )}
              {saveNote && <p style={{ color: C.redline, fontSize: 12.5, marginTop: 8 }}>{saveNote}</p>}
            </section>
          )}
        </div>
      </main>

      {/* insight card (above the action bar) */}
      {insight && (
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', margin: '0 0 8px', borderRadius: 12, background: 'rgba(182,135,58,0.10)', border: `1px solid ${C.brass}55`, color: C.navy, fontSize: 12.5, fontWeight: 600 }}>
          <span aria-hidden>✨</span>
          <span style={{ flex: 1 }}>{insight}</span>
        </div>
      )}

      {/* sticky single-primary action bar */}
      <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderTop: `1px solid ${C.rule}`, flex: '0 0 auto', background: colors.paper.cream }}>
        <button type="button" onClick={goBack} disabled={stepIdx === 0} style={{ ...btn('ghost'), height: 44, opacity: stepIdx === 0 ? 0.4 : 1 }}>Back</button>
        {step !== 'review' ? (
          <button type="button" onClick={goNext} disabled={stepBlocksNext} style={{ ...btn('primary'), opacity: stepBlocksNext ? 0.5 : 1 }}>{step === 'trades' ? (trades.length ? 'Next' : 'Skip — none') : 'Next'}</button>
        ) : (
          <button type="button" onClick={lockTheScope} disabled={!result || completing} style={{ ...btn('primary'), background: C.accent, borderColor: C.accent, opacity: !result || completing ? 0.5 : 1 }}>{completing ? 'Locking…' : 'Lock the scope →'}</button>
        )}
      </footer>

      {sketchOpen && <SketchPad initial={sketch} onClose={() => setSketchOpen(false)} onSave={setSketch} />}
      {completing && (
        <CompletionOverlay fill={ringFill} title="Scope sized" detail={`${money(Number(budgetEdit) || result?.mid || 0)} ballpark locked. Next: lock the scope with your client.`} onContinue={advance} continueLabel="Continue to Lock →" />
      )}
    </div>
  );
}

const h1Style: React.CSSProperties = { fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, color: C.navy, margin: 0, lineHeight: 1.15, fontFamily: fonts.display };
