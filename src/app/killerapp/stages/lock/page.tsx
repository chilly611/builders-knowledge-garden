'use client';

/**
 * Lock — lifecycle stage 2, inside the persistent StageShell chrome.
 * =================================================================
 * "Lock in the scope so the rest of the journey can run."
 *
 * Three Invitation Cards (materials / budget / client agreement). PATCH 1:
 * one sticky primary action — "Send the agreement" — which sends the client
 * agreement (Documenso, with a safe fallback), locks the scope, fills the
 * completion ring + check, and advances the journey to Plan. An insight card
 * sits directly above the action bar. Whispers are in-flow banners.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { recordMaterialCost } from '@/lib/budget-spine';
import { emitJourneyEvent } from '@/lib/journey-progress';
import { StageShell, useStageChrome } from '@/components/stage-shell';
import { MARIN_PROJECT, MARIN_PROJECT_ID, MARIN_BUDGET_BASE_TOTAL, ensureMarinActive, seedMarinBudget } from '@/lib/demo/marin-4000';
import { colors, fonts } from '@/design-system/tokens';
import { runLockReview, requestClientAgreement, emitLockWrite } from '@/lib/specialists/lock';
import type { LockReviewResult, AgreementResult } from '@/lib/specialists/lock';

const C = {
  navy: colors.navy,
  brass: colors.brass,
  robin: colors.robin,
  graphite: colors.graphite,
  rule: colors.fadedRule,
  redline: colors.redline,
  green: '#2E7D32',
  accent: '#3E3A6E', // stage-2 indigo
  paper: colors.paper.white,
};
const FONT = fonts.body;
const ACTIVE_PROJECT_KEY = 'bkg-active-project';

const MATERIAL_CHIPS = [
  'Standing seam metal roof',
  'Engineered hardwood',
  'Engineered quartz counters',
  'Spray foam insulation',
  'Black-frame windows',
  'Fiber cement siding',
  'Shiplap interior',
  'Slab-on-grade',
  'Heat pump HVAC',
  'Tankless water heater',
];

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
function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}
function btn(kind: 'primary' | 'ghost' | 'soft'): React.CSSProperties {
  const base: React.CSSProperties = { height: 46, padding: '0 20px', borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: 'pointer', border: '1px solid transparent' };
  if (kind === 'primary') return { ...base, background: C.navy, color: '#fff', borderColor: C.navy };
  if (kind === 'soft') return { ...base, background: 'rgba(182,135,58,0.12)', color: C.brass, borderColor: C.brass };
  return { ...base, background: C.paper, color: C.graphite, borderColor: C.rule };
}
const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, height: 44, padding: '0 12px', borderRadius: 10, border: `1px solid ${C.rule}`, fontSize: 15, fontFamily: FONT, color: C.graphite, background: '#fff', boxSizing: 'border-box' };

function WhisperBanner({ id, text }: { id: string; text: string }) {
  const key = `bkg:whisper:lock:${id}`;
  const [show, setShow] = useState(false);
  useEffect(() => {
    let raf = 0;
    try {
      if (!window.localStorage.getItem(key)) raf = requestAnimationFrame(() => setShow(true));
    } catch {
      /* ignore */
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [key]);
  if (!show) return null;
  const dismiss = () => {
    try {
      window.localStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
    setShow(false);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(127,207,203,0.14)', border: `1px solid ${C.robin}`, color: C.navy, fontSize: 12.5, marginBottom: 10 }}>
      <span aria-hidden>💡</span>
      <span style={{ flex: 1 }}>{text}</span>
      <button type="button" onClick={dismiss} aria-label="Dismiss tip" style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.navy, fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );
}

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
    <button type="button" onClick={toggle} disabled={!supported} aria-label={`Speak ${label}`} title={supported ? `Speak ${label}` : 'Voice input not supported here'} style={{ flex: '0 0 auto', width: 44, height: 44, borderRadius: 10, border: `1px solid ${listening ? C.redline : C.rule}`, background: listening ? 'rgba(161,71,58,0.10)' : C.paper, color: listening ? C.redline : C.graphite, cursor: supported ? 'pointer' : 'not-allowed', opacity: supported ? 1 : 0.45, fontSize: 16 }}>
      <span aria-hidden>{listening ? '🔴' : '🎤'}</span>
    </button>
  );
}

interface Handoff {
  buildingType?: string;
  sqft?: number;
  jurisdiction?: string;
  mid?: number;
  budget?: number;
  scopeText?: string;
  projectName?: string | null;
}

// ─── outer ────────────────────────────────────────────────────────────────────

export default function LockPage() {
  const [ctx, setCtx] = useState<{ projectId: string | null; name: string; meta: string; initialBudget: number; handoff: Handoff | null; clientName: string; scopeText: string }>(() => ({
    projectId: null,
    name: MARIN_PROJECT.name,
    meta: `${MARIN_PROJECT.sqft} sqft · ${MARIN_PROJECT.jurisdiction}`,
    initialBudget: MARIN_BUDGET_BASE_TOTAL,
    handoff: null,
    clientName: MARIN_PROJECT.client_name,
    scopeText: MARIN_PROJECT.project_type,
  }));

  useEffect(() => {
    ensureMarinActive();
    seedMarinBudget();
    let cancelled = false;
    (async () => {
      const id = readActiveProjectId() ?? MARIN_PROJECT_ID;
      let handoff: Handoff | null = null;
      try {
        const raw = window.localStorage.getItem(`bkg:sizeup:${id}`);
        if (raw) handoff = JSON.parse(raw) as Handoff;
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        setCtx((c) => ({ ...c, projectId: id, handoff, initialBudget: handoff?.budget ?? handoff?.mid ?? c.initialBudget, scopeText: handoff?.scopeText ?? c.scopeText }));
      }
      try {
        const res = await authedFetch(`/api/v1/projects?id=${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const j = (await res.json()) as Record<string, unknown>;
        if (cancelled || !j || !j.id) return;
        setCtx((c) => ({ ...c, name: (j.name as string) || c.name, clientName: (j.client_name as string) || c.clientName, scopeText: (j.notes as string) || (j.ai_summary as string) || c.scopeText }));
      } catch {
        /* offline / unauth */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StageShell stageId={2} stageTitle="Lock" projectId={ctx.projectId} projectName={ctx.name} projectMeta={ctx.meta} initialBudget={ctx.initialBudget}>
      <LockBody projectId={ctx.projectId} projectName={ctx.name} clientName={ctx.clientName} scopeText={ctx.scopeText} handoff={ctx.handoff} />
    </StageShell>
  );
}

// ─── body ───────────────────────────────────────────────────────────────────

function LockBody({ projectId, projectName, clientName, scopeText, handoff }: { projectId: string | null; projectName: string; clientName: string; scopeText: string; handoff: Handoff | null }) {
  const router = useRouter();
  const { proMode, setBudget } = useStageChrome();

  const [materials, setMaterials] = useState<string[]>([]);
  const initialBudget = handoff?.budget ?? handoff?.mid ?? MARIN_BUDGET_BASE_TOTAL;
  const [budget, setBudgetVal] = useState<number>(initialBudget);
  const [budgetText, setBudgetText] = useState(String(initialBudget));
  const [budgetConfirmed, setBudgetConfirmed] = useState(false);

  const [agreementOpen, setAgreementOpen] = useState(false);
  const [signerName, setSignerName] = useState(clientName !== MARIN_PROJECT.client_name ? clientName : '');
  const [signerEmail, setSignerEmail] = useState('');
  const [agreement, setAgreement] = useState<AgreementResult | null>(null);

  const [review, setReview] = useState<LockReviewResult | null>(null);
  const [locking, setLocking] = useState(false);
  const [locked, setLocked] = useState(false);
  const [ringFill, setRingFill] = useState(false);
  const advancedRef = useRef(false);

  const L = (human: string, pro: string) => (proMode ? pro : human);

  const lockInput = useMemo(
    () => ({ projectId: projectId ?? undefined, projectName, clientName: clientName || undefined, scopeText: scopeText || undefined, lockedBudget: budgetConfirmed ? budget : 0, materials, signerName: signerName || undefined, signerEmail: signerEmail || undefined }),
    [projectId, projectName, clientName, scopeText, budgetConfirmed, budget, materials, signerName, signerEmail]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await runLockReview(lockInput);
        if (!cancelled) setReview(r);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lockInput]);

  const materialsDone = materials.length > 0;
  const agreementCardDone = agreement?.status === 'sent' || agreement?.status === 'prepared' || (!!signerName.trim() && !!signerEmail.trim());
  const doneCount = [materialsDone, budgetConfirmed, agreementCardDone].filter(Boolean).length;
  const ready = materialsDone && budgetConfirmed; // hard gate to lock the scope

  const advanceToPlan = useCallback(() => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    router.push(projectId ? `/killerapp/stages/plan?project=${encodeURIComponent(projectId)}` : '/killerapp');
  }, [router, projectId]);

  // Single primary: "Send the agreement" — sends (best-effort), locks scope,
  // fills the ring + check, advances to Plan.
  const sendAndLock = async () => {
    if (!ready || locking) return;
    setLocking(true);

    let sent: AgreementResult | null = agreement;
    if (!sent && signerName.trim() && signerEmail.trim()) {
      try {
        sent = await requestClientAgreement({ projectId: projectId ?? undefined, projectName, clientName: clientName || signerName, signerName, signerEmail, scopeText, lockedBudget: budget, materials });
        setAgreement(sent);
      } catch {
        /* ignore — lock still proceeds */
      }
    }

    setBudget({ total: budget });
    if (projectId) {
      void (async () => {
        try {
          await authedFetch('/api/v1/projects', { method: 'PATCH', body: JSON.stringify({ id: projectId, phase: 'DESIGN', progress: 100, budget_amount: budget, notes: scopeText || undefined }) });
        } catch {
          /* best-effort */
        }
        try {
          await recordMaterialCost({ description: `Locked scope — ${materials.length} material picks`, amount: budget, lifecycleStageId: 2, isEstimate: true, projectId });
        } catch {
          /* ignore */
        }
        try {
          await emitLockWrite({ projectId, lockedBudget: budget, materials: materials.length, agreementStatus: sent?.status ?? 'none' });
        } catch {
          /* ignore */
        }
        try {
          emitJourneyEvent({ type: 'started', workflowId: 'q4', projectId });
          emitJourneyEvent({ type: 'completed', workflowId: 'q4', projectId });
        } catch {
          /* ignore */
        }
      })();
      try {
        window.localStorage.setItem(`bkg:lock:${projectId}`, JSON.stringify({ materials, budget, agreement: sent?.status ?? 'none', lockedAt: Date.now() }));
      } catch {
        /* ignore */
      }
    }

    setLocking(false);
    setLocked(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setRingFill(true)));
    window.setTimeout(advanceToPlan, 1900);
  };

  const agreementLine = agreement
    ? agreement.status === 'sent'
      ? `agreement sent to ${signerName}`
      : agreement.status === 'prepared'
        ? 'agreement drafted'
        : 'agreement needs a retry'
    : signerName.trim() && signerEmail.trim()
      ? 'agreement ready to send'
      : 'agreement optional';
  const insight = `${doneCount}/3 ready · ${money(budget)} budget · ${materials.length} material${materials.length === 1 ? '' : 's'} · ${agreementLine}`;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: '12px clamp(12px, 4vw, 40px) 0', position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: '0 0 auto' }}>
        <WhisperBanner id="intro" text="Three quick confirmations and the rest of the build can run. Nothing here is permanent." />
        <h1 style={{ fontSize: 'clamp(18px, 3.4vw, 26px)', fontWeight: 800, color: C.navy, margin: 0, fontFamily: fonts.display }}>{L('Lock in the scope', 'Lock scope baseline')}</h1>
      </div>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12, minHeight: 0, overflow: 'auto', justifyContent: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, alignItems: 'start' }}>
          {/* card 1 — materials */}
          <Card done={materialsDone} index={1}>
            <CardTitle done={materialsDone}>{L('Pick the materials you know you want', 'Material selections')}</CardTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {MATERIAL_CHIPS.map((m) => {
                const on = materials.includes(m);
                return (
                  <button key={m} type="button" onClick={() => setMaterials((cur) => (on ? cur.filter((x) => x !== m) : [...cur, m]))} style={{ padding: '5px 10px', borderRadius: 999, border: `1.5px solid ${on ? C.brass : C.rule}`, background: on ? 'rgba(182,135,58,0.12)' : C.paper, color: on ? C.brass : C.graphite, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{on ? '+ ' : ''}{m}</button>
                );
              })}
            </div>
            <CardFoot>{materialsDone ? `${materials.length} selected` : 'Tap a few from your knowledge garden'}</CardFoot>
          </Card>

          {/* card 2 — budget */}
          <Card done={budgetConfirmed} index={2}>
            <CardTitle done={budgetConfirmed}>{L('Lock the budget number', 'Budget baseline')}</CardTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.brass }}>$</span>
              <input value={budgetText} onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ''); setBudgetText(v); setBudgetVal(Number(v) || 0); setBudgetConfirmed(false); }} placeholder="0" style={{ ...inputStyle, height: 40, maxWidth: 150, fontWeight: 800, color: C.brass, fontSize: 18 }} />
              <MicButton onText={(t) => { const v = t.replace(/[^\d]/g, ''); if (v) { setBudgetText(v); setBudgetVal(Number(v)); setBudgetConfirmed(false); } }} label="the budget" />
            </div>
            <button type="button" onClick={() => { setBudgetConfirmed(true); setBudget({ total: budget }); }} disabled={budget <= 0} style={{ ...btn(budgetConfirmed ? 'soft' : 'primary'), height: 38, marginTop: 10, fontSize: 13, opacity: budget <= 0 ? 0.5 : 1 }}>{budgetConfirmed ? '✓ Locked' : 'Confirm this number'}</button>
            <CardFoot>{budget > 0 ? `From your Size Up ballpark: ${money(budget)}` : 'Carry over the Size Up estimate'}</CardFoot>
          </Card>

          {/* card 3 — agreement (signer details; the sticky bar sends it) */}
          <Card done={agreementCardDone} index={3}>
            <CardTitle done={agreementCardDone}>{L('Sign the client agreement', 'Client agreement (e-sign)')}</CardTitle>
            {!agreementOpen && !agreement && (
              <button type="button" onClick={() => setAgreementOpen(true)} style={{ ...btn('soft'), height: 38, marginTop: 10, fontSize: 13 }}>Add who signs</button>
            )}
            {agreementOpen && !agreement && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Client name" style={{ ...inputStyle, height: 40 }} />
                  <MicButton onText={(t) => setSignerName(t)} label="the client name" />
                </div>
                <input value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="Client email" inputMode="email" style={{ ...inputStyle, height: 40 }} />
              </div>
            )}
            {agreement && (
              <div style={{ marginTop: 8, fontSize: 12.5, color: agreement.status === 'error' ? C.redline : C.green }}>
                <strong>{agreement.status === 'sent' ? 'Sent' : agreement.status === 'prepared' ? 'Drafted' : 'Issue'}:</strong> {agreement.message}
                {agreement.signingUrl && (<div style={{ marginTop: 4 }}><a href={agreement.signingUrl} target="_blank" rel="noreferrer" style={{ color: C.navy, fontWeight: 700 }}>Open signing link</a></div>)}
              </div>
            )}
            <CardFoot>{agreementCardDone ? (agreement ? 'Handled at lock' : `Ready: ${signerName}`) : 'Optional — the button below sends it on lock'}</CardFoot>
          </Card>
        </div>

        {review?.agreementSummary && (
          <p style={{ fontSize: 12.5, color: C.graphite, opacity: 0.78, margin: '4px auto 0', maxWidth: 880, textAlign: 'center' }}>{review.agreementSummary}</p>
        )}
      </main>

      {/* insight card (above the action bar) */}
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', margin: '8px 0', borderRadius: 12, background: 'rgba(62,58,110,0.08)', border: `1px solid ${C.accent}44`, color: C.navy, fontSize: 12.5, fontWeight: 600 }}>
        <span aria-hidden>✨</span>
        <span style={{ flex: 1 }}>{insight}</span>
      </div>

      {/* sticky single-primary action bar */}
      <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderTop: `1px solid ${C.rule}`, flex: '0 0 auto', background: colors.paper.cream }}>
        <button type="button" onClick={() => router.push(projectId ? `/killerapp/stages/size-up?project=${encodeURIComponent(projectId)}` : '/killerapp/stages/size-up')} style={{ ...btn('ghost'), height: 44 }}>Back</button>
        <button type="button" onClick={sendAndLock} disabled={!ready || locking} title={ready ? 'Send the agreement and lock the scope' : 'Confirm materials and the budget first'} style={{ ...btn('primary'), background: ready ? C.accent : C.navy, borderColor: ready ? C.accent : C.navy, opacity: !ready || locking ? 0.5 : 1 }}>{locking ? 'Sending…' : 'Send the agreement →'}</button>
      </footer>

      {locked && (
        <div role="dialog" aria-label="Scope locked" style={{ position: 'absolute', inset: 0, zIndex: 900, background: 'rgba(253,248,240,0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <svg width="150" height="150" viewBox="0 0 160 160" aria-hidden>
            <circle cx="80" cy="80" r="70" fill="none" stroke={C.rule} strokeWidth="10" />
            <circle cx="80" cy="80" r="70" fill="none" stroke={C.green} strokeWidth="10" strokeLinecap="round" transform="rotate(-90 80 80)" strokeDasharray={2 * Math.PI * 70} strokeDashoffset={ringFill ? 0 : 2 * Math.PI * 70} style={{ transition: 'stroke-dashoffset 900ms ease' }} />
            <path d="M52 82 L72 102 L110 60" fill="none" stroke={C.green} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={120} strokeDashoffset={ringFill ? 0 : 120} style={{ transition: 'stroke-dashoffset 600ms ease 700ms' }} />
          </svg>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.navy, fontFamily: fonts.display }}>Scope locked</div>
          <p style={{ fontSize: 13.5, color: C.graphite, maxWidth: 420, textAlign: 'center', margin: 0 }}>{money(budget)} · {materials.length} materials{agreement ? ` · agreement ${agreement.status}` : ''}. Heading to Plan…</p>
          <button type="button" onClick={advanceToPlan} style={btn('primary')}>Continue to Plan →</button>
        </div>
      )}
    </div>
  );
}

function Card({ done, index, children }: { done: boolean; index: number; children: React.ReactNode }) {
  return (
    <div style={{ background: C.paper, border: `1.5px solid ${done ? C.green : C.rule}`, borderRadius: 16, padding: 14, position: 'relative' }}>
      <span style={{ position: 'absolute', top: -10, left: 14, width: 22, height: 22, borderRadius: 999, background: done ? C.green : C.navy, color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{done ? '✓' : index}</span>
      {children}
    </div>
  );
}
function CardTitle({ done, children }: { done: boolean; children: React.ReactNode }) {
  return <h2 style={{ fontSize: 15.5, fontWeight: 800, color: done ? C.green : C.navy, margin: '4px 0 0', lineHeight: 1.2 }}>{children}</h2>;
}
function CardFoot({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, color: C.graphite, opacity: 0.65, marginTop: 8 }}>{children}</div>;
}
