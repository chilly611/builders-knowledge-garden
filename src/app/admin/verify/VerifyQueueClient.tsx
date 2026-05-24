'use client';

/**
 * VerifyQueueClient (ATTEST-WIRE + AUTO-VERIFY, 2026-05-25)
 * =========================================================
 * Reviewer-facing queue. Three tabs:
 *
 *   1) Flagged for review — rows the AI cross-check ran on AND found a
 *      discrepancy OR was low-confidence (auto_verification_flagged=true).
 *      Each card surfaces the model's discrepancies + rationale inline so
 *      the reviewer can decide fast: green-tick (Verify ✓) or red-tick
 *      (clear the auto stamp and re-investigate). DEFAULT TAB.
 *
 *   2) Auto-verified — rows the AI cleared (auto_verified_at IS NOT NULL
 *      AND flagged=false). Spot-check 5-10% of these to confirm the
 *      cross-checker is calibrated. Verify ✓ here is a human up-grade
 *      from yellow tick to green tick.
 *
 *   3) All unverified — every published row without a human attestation,
 *      regardless of auto status. The pre-AUTO-VERIFY workflow lives here.
 *
 * Keyboard shortcuts (when no input is focused):
 *   V  — Verify (stamp manual attestation on the focused row)
 *   R  — Reject auto (DELETE /auto-verify so it cycles into next batch)
 *   S  — Skip (parks until tomorrow, localStorage only)
 *   U  — open UpCodes search in new tab
 *   C  — open UpCodes Copilot + copy prompt to clipboard
 *   J / ↓ / →  — focus next row
 *   K / ↑ / ←  — focus previous row
 *
 * "Skip" parks the row in localStorage so it doesn't show again today —
 * purely client-side, no DB write, so a fresh browser sees the full queue.
 *
 * Email-allowlist guards the UI; the API enforces the server-side allowlist
 * regardless of whether the UI is rendered.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Admin allowlist — mirrors the server-side check in
// /api/v1/knowledge-entities/[id]/attest/route.ts. Note: LaneGate(['owner'])
// doesn't work here because /admin/verify has no project context, so the
// per-project role resolution falls through. Email-based check matches
// the server-side ground-truth.
const ADMIN_EMAILS = new Set([
  'chillyd@gmail.com',
  'charlie@theknowledgegardens.com',
  'bou@theknowledgegardens.com',
]);

const COLORS = {
  paper: '#FAF8F2',
  ink: '#1A1A1A',
  graphite: '#3D3D3D',
  faded: '#B8B5AC',
  rule: '#D8D2C2',
  green: '#1D9E75',
  red: '#E8443A',
  amber: '#C4A44A',
  teal: '#0E7F8C',
  robin: '#0F6B65',
};

const PAGE_SIZE = 25;
const SECONDS_PER_ROW = 30;
const SKIP_STORAGE_KEY = 'bkg.verify.skipped';
const SKIP_TTL_HOURS = 24;

const ENTITY_TYPES: Array<{ value: string; label: string }> = [
  { value: '', label: 'All entity types' },
  { value: 'building_code', label: 'Building code' },
  { value: 'code_section', label: 'Code section' },
  { value: 'safety_regulation', label: 'Safety regulation' },
  { value: 'standard', label: 'Standard' },
  { value: 'material', label: 'Material' },
  { value: 'safety_rule', label: 'Safety rule' },
];

// Common jurisdictions in the corpus. Anything outside this list still
// works — the dropdown is a hint, not a hard constraint. Detected
// jurisdictions are added dynamically once the first page loads.
const KNOWN_JURISDICTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All jurisdictions' },
  { value: 'us', label: 'US (federal / model code)' },
  { value: 'us-ca', label: 'California' },
  { value: 'us-tx', label: 'Texas' },
  { value: 'us-fl', label: 'Florida' },
  { value: 'us-ny', label: 'New York' },
];

interface AutoVerificationNotes {
  discrepancies?: string[];
  rationale?: string;
  model_response?: string;
  checkable?: boolean;
  prompt_version?: string;
  ran_at?: string;
}

interface KnowledgeRow {
  id: string;
  slug: string | null;
  entity_type: string | null;
  title: unknown;
  summary: unknown;
  jurisdiction_ids: string[] | null;
  source_urls: string[] | null;
  metadata: Record<string, unknown> | null;
  manually_verified_at: string | null;
  // AUTO-VERIFY columns (may be null if pre-pass hasn't run yet)
  auto_verified_at: string | null;
  auto_verified_by: string | null;
  auto_verification_confidence: number | null;
  auto_verification_notes: AutoVerificationNotes | null;
  auto_verification_flagged: boolean;
}

type Tab = 'flagged' | 'auto_clean' | 'all_unverified';

interface SkipMap {
  [id: string]: number; // timestamp ms when skipped
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function unwrap(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.en === 'string') return o.en;
    return JSON.stringify(o);
  }
  return String(value);
}

function loadSkips(): SkipMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SKIP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SkipMap;
    const cutoff = Date.now() - SKIP_TTL_HOURS * 3600_000;
    const fresh: SkipMap = {};
    for (const [id, ts] of Object.entries(parsed)) {
      if (typeof ts === 'number' && ts >= cutoff) fresh[id] = ts;
    }
    return fresh;
  } catch {
    return {};
  }
}

function saveSkips(map: SkipMap) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SKIP_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota or private mode — silent */
  }
}

/**
 * Build a UpCodes SEARCH URL for a row. Earlier we used /s/<term> but
 * that path expects exact publication slugs and 404s on free text
 * like "ASHRAE 90.1 — Energy Standard for...". Switching to /search?q=…
 * which is the reliable text-search endpoint.
 */
function upCodesSearchUrl(row: KnowledgeRow): string {
  const title = unwrap(row.title);
  const slug = row.slug || '';
  const sectionMatch = slug.match(/^([a-z]+)-(\d[\d-]*[a-z\d-]*)$/i);
  let term: string;
  if (sectionMatch) {
    const code = sectionMatch[1];
    const section = sectionMatch[2].replace(/-/g, '.');
    term = `${code.toUpperCase()} ${section}`;
  } else {
    term = title || slug;
  }
  return `https://up.codes/search?q=${encodeURIComponent(term)}`;
}

/**
 * Build a Copilot prompt for a row. The reviewer copies this and
 * pastes into UpCodes Copilot. We open Copilot in a new tab and
 * write this prompt to the clipboard at the same time so it's
 * a one-keystroke paste.
 */
function copilotPromptForRow(row: KnowledgeRow): string {
  const title = unwrap(row.title);
  const slug = row.slug || '';
  const target = title || slug;
  return `Summarize ${target} in 3 bullet points and flag any common gotchas. Cite the relevant California / San Francisco code adoption.`;
}

// ------------------------------------------------------------
// Layout pieces
// ------------------------------------------------------------

const pageWrap: React.CSSProperties = {
  minHeight: '100vh',
  background: COLORS.paper,
  padding: '40px 24px 80px',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  color: COLORS.ink,
};

const container: React.CSSProperties = {
  maxWidth: 980,
  margin: '0 auto',
};

const card: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 12,
  padding: '24px 28px',
  border: `1px solid ${COLORS.rule}`,
  marginBottom: 18,
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  letterSpacing: '0.14em',
  fontWeight: 700,
  color: COLORS.amber,
  textTransform: 'uppercase',
};

const h1Style: React.CSSProperties = {
  margin: '6px 0 14px',
  fontSize: 28,
  lineHeight: 1.2,
};

const buttonBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  border: `1px solid ${COLORS.rule}`,
  background: '#FFFFFF',
  color: COLORS.ink,
  textDecoration: 'none',
};

const buttonPrimary: React.CSSProperties = {
  ...buttonBase,
  background: COLORS.robin,
  borderColor: COLORS.robin,
  color: '#FFFFFF',
};

const buttonDanger: React.CSSProperties = {
  ...buttonBase,
  background: '#FFFFFF',
  borderColor: COLORS.rule,
  color: COLORS.graphite,
};

const inputStyle: React.CSSProperties = {
  ...buttonBase,
  cursor: 'text',
  padding: '8px 12px',
  minWidth: 220,
  fontWeight: 400,
};

// ------------------------------------------------------------
// LaneGate wrapper
// ------------------------------------------------------------

function NotForYourRole() {
  return (
    <main style={pageWrap}>
      <div style={{ ...container, ...card }}>
        <p style={eyebrow}>OWNERS ONLY</p>
        <h1 style={h1Style}>Verification queue is for org owners.</h1>
        <p style={{ color: COLORS.graphite, lineHeight: 1.55 }}>
          Manual attestation requires a seat at a licensed external source
          (e.g. UpCodes Essentials) and authority to stamp knowledge
          entities as verified. Ask the org owner to grant access.
        </p>
      </div>
    </main>
  );
}

export default function VerifyQueueClient() {
  const [authState, setAuthState] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const email = data?.user?.email?.toLowerCase() ?? '';
        const role = (data?.user?.app_metadata as Record<string, unknown> | undefined)?.role;
        const allowed = ADMIN_EMAILS.has(email) || role === 'admin';
        if (!cancelled) setAuthState(allowed ? 'allowed' : 'denied');
      } catch {
        if (!cancelled) setAuthState('denied');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (authState === 'loading') return <main style={pageWrap} />;
  if (authState === 'denied') return <NotForYourRole />;
  return <VerifyQueuePanel />;
}

// ------------------------------------------------------------
// Main panel
// ------------------------------------------------------------

function VerifyQueuePanel() {
  const [rows, setRows] = useState<KnowledgeRow[]>([]);
  const [totalUnverified, setTotalUnverified] = useState<number | null>(null);
  const [totalVerified, setTotalVerified] = useState<number | null>(null);
  const [totalFlagged, setTotalFlagged] = useState<number | null>(null);
  const [totalAutoClean, setTotalAutoClean] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('flagged');
  const [page, setPage] = useState(0);
  const [entityType, setEntityType] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<SkipMap>({});
  const [focusIdx, setFocusIdx] = useState(0);

  useEffect(() => {
    setSkipped(loadSkips());
  }, []);

  // Debounce search input so we don't fire a query per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const SELECT_COLS =
    'id, slug, entity_type, title, summary, jurisdiction_ids, source_urls, metadata, manually_verified_at, auto_verified_at, auto_verified_by, auto_verification_confidence, auto_verification_notes, auto_verification_flagged';

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let qb = supabase
        .from('knowledge_entities')
        .select(SELECT_COLS, { count: 'exact' })
        .is('manually_verified_at', null) // never show already-attested rows
        .eq('status', 'published')
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      // Per-tab predicate. Flagged sorts by confidence ASC (lowest first
      // — the ones most likely to be wrong). The other tabs use updated_at
      // DESC so recent changes float to the top.
      if (tab === 'flagged') {
        qb = qb.eq('auto_verification_flagged', true).order(
          'auto_verification_confidence',
          { ascending: true, nullsFirst: false }
        );
      } else if (tab === 'auto_clean') {
        qb = qb
          .not('auto_verified_at', 'is', null)
          .eq('auto_verification_flagged', false)
          .order('auto_verification_confidence', { ascending: false, nullsFirst: false });
      } else {
        qb = qb.order('updated_at', { ascending: false });
      }

      if (entityType) qb = qb.eq('entity_type', entityType);
      if (jurisdiction) qb = qb.contains('jurisdiction_ids', [jurisdiction]);
      if (debouncedSearch) {
        const term = debouncedSearch.replace(/[%,]/g, '');
        qb = qb.or(`slug.ilike.%${term}%,search_text.ilike.%${term}%`);
      }

      const { data, error: err, count } = await qb;
      if (err) {
        setError(err.message);
        return;
      }
      setRows((data ?? []) as KnowledgeRow[]);
      setFocusIdx(0);

      // Set the per-tab count.
      if (tab === 'flagged') setTotalFlagged(count ?? null);
      else if (tab === 'auto_clean') setTotalAutoClean(count ?? null);
      else setTotalUnverified(count ?? null);

      // Cheap HEAD counts for the OTHER tabs + the verified-overall counter
      // so the tab labels stay accurate. Done in parallel.
      const [vRes, fRes, aRes, uRes] = await Promise.all([
        supabase
          .from('knowledge_entities')
          .select('id', { count: 'exact', head: true })
          .not('manually_verified_at', 'is', null)
          .eq('status', 'published'),
        supabase
          .from('knowledge_entities')
          .select('id', { count: 'exact', head: true })
          .is('manually_verified_at', null)
          .eq('status', 'published')
          .eq('auto_verification_flagged', true),
        supabase
          .from('knowledge_entities')
          .select('id', { count: 'exact', head: true })
          .is('manually_verified_at', null)
          .eq('status', 'published')
          .not('auto_verified_at', 'is', null)
          .eq('auto_verification_flagged', false),
        supabase
          .from('knowledge_entities')
          .select('id', { count: 'exact', head: true })
          .is('manually_verified_at', null)
          .eq('status', 'published'),
      ]);
      setTotalVerified(vRes.count ?? null);
      setTotalFlagged(fRes.count ?? null);
      setTotalAutoClean(aRes.count ?? null);
      setTotalUnverified(uRes.count ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [page, entityType, jurisdiction, debouncedSearch, tab]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  const visibleRows = useMemo(() => {
    return rows.filter((r) => !skipped[r.id]);
  }, [rows, skipped]);

  // Clamp focusIdx as the visible set shrinks.
  useEffect(() => {
    if (focusIdx >= visibleRows.length && visibleRows.length > 0) {
      setFocusIdx(visibleRows.length - 1);
    } else if (visibleRows.length === 0) {
      setFocusIdx(0);
    }
  }, [visibleRows.length, focusIdx]);

  const attest = useCallback(
    async (row: KnowledgeRow) => {
      setBusyIds((s) => new Set(s).add(row.id));
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) {
          setError('Not signed in.');
          return;
        }
        const res = await fetch(
          `/api/v1/knowledge-entities/${row.id}/attest`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ source: 'upcodes-essentials' }),
          }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            (json as { error?: string })?.error || `Attest failed (${res.status})`
          );
          return;
        }
        // Optimistic: remove from current page and bump counters.
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        setTotalUnverified((n) => (n != null ? Math.max(0, n - 1) : n));
        setTotalVerified((n) => (n != null ? n + 1 : n));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
      } finally {
        setBusyIds((s) => {
          const next = new Set(s);
          next.delete(row.id);
          return next;
        });
      }
    },
    []
  );

  const skip = useCallback((row: KnowledgeRow) => {
    setSkipped((prev) => {
      const next = { ...prev, [row.id]: Date.now() };
      saveSkips(next);
      return next;
    });
  }, []);

  // AUTO-VERIFY: clear the auto stamp on a row so the next batch run will
  // re-evaluate it. Used when the reviewer thinks the AI got the rationale
  // wrong (e.g. the AI said "flagged: missing edition" but the row is
  // explicitly current-edition).
  const rejectAuto = useCallback(async (row: KnowledgeRow) => {
    setBusyIds((s) => new Set(s).add(row.id));
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        setError('Not signed in.');
        return;
      }
      const res = await fetch(
        `/api/v1/knowledge-entities/${row.id}/auto-verify`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string })?.error || `Reject auto failed (${res.status})`);
        return;
      }
      // Remove from the current view — if it gets re-stamped later it'll
      // appear in the appropriate tab.
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(row.id);
        return next;
      });
    }
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ────────────────────────────────────────────────────────────
  // Keyboard shortcuts
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore when an input/select/textarea is focused.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const focused = visibleRows[focusIdx];
      const key = e.key.toLowerCase();
      if (key === 'j' || key === 'arrowdown' || key === 'arrowright') {
        e.preventDefault();
        setFocusIdx((i) => Math.min(visibleRows.length - 1, i + 1));
        return;
      }
      if (key === 'k' || key === 'arrowup' || key === 'arrowleft') {
        e.preventDefault();
        setFocusIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (!focused) return;
      if (key === 'v') {
        e.preventDefault();
        void attest(focused);
        return;
      }
      if (key === 'r') {
        e.preventDefault();
        void rejectAuto(focused);
        return;
      }
      if (key === 's') {
        e.preventDefault();
        skip(focused);
        return;
      }
      if (key === 'u') {
        e.preventDefault();
        window.open(upCodesSearchUrl(focused), '_blank', 'noopener,noreferrer');
        return;
      }
      if (key === 'c') {
        e.preventDefault();
        const prompt = copilotPromptForRow(focused);
        void navigator.clipboard?.writeText(prompt).catch(() => {});
        window.open('https://up.codes/copilot', '_blank', 'noopener,noreferrer');
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visibleRows, focusIdx, attest, rejectAuto, skip]);

  // Auto-scroll focused row into view.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.querySelector(`[data-row-idx="${focusIdx}"]`) as HTMLElement | null;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusIdx]);

  const totalRows = (totalUnverified ?? 0) + (totalVerified ?? 0);
  const verifiedPct =
    totalRows > 0 ? Math.round(((totalVerified ?? 0) / totalRows) * 1000) / 10 : 0;
  const etaSec = (totalUnverified ?? 0) * SECONDS_PER_ROW;
  const etaLabel =
    etaSec === 0
      ? 'queue empty'
      : etaSec < 60
      ? `${etaSec}s`
      : etaSec < 3600
      ? `~${Math.round(etaSec / 60)} min`
      : `~${(etaSec / 3600).toFixed(1)} h`;

  return (
    <main style={pageWrap}>
      <div style={container}>
        <header style={card}>
          <p style={eyebrow}>ATTEST-WIRE · OWNERS ONLY</p>
          <h1 style={h1Style}>Verify knowledge entities</h1>
          <p style={{ margin: 0, color: COLORS.graphite, lineHeight: 1.55 }}>
            Open each row in UpCodes (or the licensed source of your
            choice), confirm the title and summary match, and click
            Verify ✓. Each attestation stamps the row, fires the audit
            log, and lifts the verified-source count.
          </p>

          {/* Progress widget */}
          <div
            style={{
              marginTop: 18,
              padding: '14px 16px',
              background: '#FAF8F2',
              borderRadius: 8,
              border: `1px solid ${COLORS.rule}`,
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'baseline',
            }}
          >
            <strong style={{ fontSize: 22, color: COLORS.robin }}>
              {totalVerified ?? '—'}
            </strong>
            <span style={{ color: COLORS.graphite }}>
              of {totalRows || '—'} verified ({verifiedPct}%)
            </span>
            <span style={{ color: COLORS.faded }}>·</span>
            <span style={{ color: COLORS.graphite }}>
              {totalUnverified ?? '—'} remaining · est {etaLabel} at
              {' '}~{SECONDS_PER_ROW}s/row
            </span>
          </div>

          {/* Keyboard shortcut hint */}
          <p
            style={{
              marginTop: 10,
              marginBottom: 0,
              color: COLORS.faded,
              fontSize: 12,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            }}
          >
            Keys: <strong>V</strong> verify · <strong>R</strong> reject auto ·
            {' '}<strong>S</strong> skip · <strong>U</strong> UpCodes search ·
            {' '}<strong>C</strong> Copilot · <strong>J/K</strong> next/prev
          </p>
        </header>

        {/* Tab bar (Flagged / Auto-verified / All unverified) */}
        <div
          style={{
            ...card,
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            padding: 6,
          }}
        >
          {([
            { id: 'flagged', label: 'Flagged for review', count: totalFlagged, tone: COLORS.red },
            { id: 'auto_clean', label: 'Auto-verified (spot-check)', count: totalAutoClean, tone: COLORS.amber },
            { id: 'all_unverified', label: 'All unverified', count: totalUnverified, tone: COLORS.graphite },
          ] as Array<{ id: Tab; label: string; count: number | null; tone: string }>).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setPage(0);
                }}
                style={{
                  ...buttonBase,
                  background: active ? COLORS.ink : '#FFFFFF',
                  color: active ? '#FFFFFF' : COLORS.ink,
                  borderColor: active ? COLORS.ink : COLORS.rule,
                }}
                aria-pressed={active}
              >
                <span>{t.label}</span>
                <span
                  style={{
                    marginLeft: 6,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: active ? '#FFFFFF1F' : `${t.tone}1A`,
                    color: active ? '#FFFFFF' : t.tone,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {t.count ?? '—'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div
          style={{
            ...card,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(0);
            }}
            style={inputStyle}
            aria-label="Filter by entity type"
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={jurisdiction}
            onChange={(e) => {
              setJurisdiction(e.target.value);
              setPage(0);
            }}
            style={inputStyle}
            aria-label="Filter by jurisdiction"
          >
            {KNOWN_JURISDICTIONS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Search slug or text…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            style={inputStyle}
            aria-label="Search by slug or title"
          />
          <button
            type="button"
            style={buttonBase}
            onClick={() => {
              setSkipped({});
              saveSkips({});
            }}
            title="Clear today's skipped list"
          >
            Reset skipped ({Object.keys(skipped).length})
          </button>
        </div>

        {error && (
          <div
            style={{
              ...card,
              borderColor: COLORS.red,
              color: COLORS.red,
            }}
          >
            {error}
          </div>
        )}

        {loading && !rows.length && (
          <div style={{ ...card, color: COLORS.faded }}>Loading queue…</div>
        )}

        {!loading && visibleRows.length === 0 && (
          <div style={{ ...card, color: COLORS.graphite }}>
            <strong>Nothing to verify on this page.</strong> Try clearing
            filters or paging forward.
          </div>
        )}

        {visibleRows.map((row, idx) => {
          const title = unwrap(row.title) || row.slug || row.id;
          const summary = unwrap(row.summary);
          const isOpen = expanded.has(row.id);
          const busy = busyIds.has(row.id);
          const isFocused = idx === focusIdx;
          const notes = row.auto_verification_notes;
          const discrepancies = notes?.discrepancies ?? [];
          const rationale = notes?.rationale ?? '';
          const conf = row.auto_verification_confidence;
          return (
            <article
              key={row.id}
              data-row-idx={idx}
              onClick={() => setFocusIdx(idx)}
              style={{
                ...card,
                borderColor: isFocused ? COLORS.ink : COLORS.rule,
                boxShadow: isFocused ? `0 0 0 2px ${COLORS.ink}33` : 'none',
              }}
              data-testid="verify-row"
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Badge>{row.entity_type || 'unknown'}</Badge>
                {(row.jurisdiction_ids || []).map((j) => (
                  <Badge key={j} tone="teal">{j}</Badge>
                ))}
                {row.auto_verified_at && !row.auto_verification_flagged && (
                  <Badge tone="amber-strong">AI-checked · {conf != null ? `${Math.round(conf * 100)}%` : '—'}</Badge>
                )}
                {row.auto_verification_flagged && (
                  <Badge tone="red">AI flagged · {conf != null ? `${Math.round(conf * 100)}%` : '—'}</Badge>
                )}
                <span
                  style={{
                    color: COLORS.faded,
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    fontSize: 12,
                  }}
                >
                  {row.slug}
                </span>
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>{title}</h2>
              {summary && (
                <div style={{ marginBottom: 12 }}>
                  <p
                    style={{
                      margin: 0,
                      color: COLORS.graphite,
                      lineHeight: 1.55,
                      maxHeight: isOpen ? 'none' : 64,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {summary}
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleExpand(row.id)}
                    style={{
                      marginTop: 6,
                      background: 'transparent',
                      border: 'none',
                      color: COLORS.teal,
                      cursor: 'pointer',
                      fontSize: 13,
                      padding: 0,
                    }}
                  >
                    {isOpen ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              )}
              {/* AUTO-VERIFY: show discrepancies + rationale for flagged rows,
                  or rationale-only for clean auto-verified rows. */}
              {row.auto_verified_at && (rationale || discrepancies.length > 0) && (
                <div
                  style={{
                    marginBottom: 12,
                    padding: '10px 12px',
                    background: row.auto_verification_flagged ? '#FEEAE8' : '#FFF8E5',
                    borderLeft: `3px solid ${row.auto_verification_flagged ? COLORS.red : COLORS.amber}`,
                    borderRadius: 6,
                    fontSize: 13,
                    color: COLORS.graphite,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {row.auto_verification_flagged ? 'AI flagged this row' : 'AI cleared this row'}
                    {conf != null && (
                      <span style={{ fontWeight: 400, color: COLORS.faded, marginLeft: 6 }}>
                        · confidence {Math.round(conf * 100)}%
                      </span>
                    )}
                  </div>
                  {discrepancies.length > 0 && (
                    <ul style={{ margin: '4px 0 6px 18px', padding: 0 }}>
                      {discrepancies.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                  {rationale && (
                    <p style={{ margin: 0, lineHeight: 1.5 }}>{rationale}</p>
                  )}
                </div>
              )}

              {(row.source_urls || []).length > 0 && (
                <ul
                  style={{
                    margin: '0 0 14px',
                    padding: 0,
                    listStyle: 'none',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {(row.source_urls || []).map((u) => (
                    <li key={u}>
                      <a
                        href={u}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: COLORS.teal,
                          fontSize: 13,
                          textDecoration: 'underline',
                        }}
                      >
                        {u.replace(/^https?:\/\//, '').slice(0, 60)}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href={upCodesSearchUrl(row)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={buttonBase}
                >
                  Search in UpCodes 🔍
                </a>
                <button
                  type="button"
                  style={buttonBase}
                  onClick={async () => {
                    const prompt = copilotPromptForRow(row);
                    try {
                      await navigator.clipboard.writeText(prompt);
                    } catch {
                      /* clipboard blocked — user pastes from below */
                    }
                    window.open('https://up.codes/copilot', '_blank', 'noopener,noreferrer');
                  }}
                  title={`Opens UpCodes Copilot in a new tab. Prompt copied to clipboard: "${copilotPromptForRow(row)}"`}
                >
                  Ask Copilot ✨
                </button>
                <button
                  type="button"
                  style={{
                    ...buttonPrimary,
                    opacity: busy ? 0.5 : 1,
                    cursor: busy ? 'wait' : 'pointer',
                  }}
                  disabled={busy}
                  onClick={() => void attest(row)}
                >
                  {busy ? 'Verifying…' : 'Verify ✓'}
                </button>
                {row.auto_verified_at && (
                  <button
                    type="button"
                    style={buttonDanger}
                    onClick={() => void rejectAuto(row)}
                    disabled={busy}
                    title="Clear the AI stamp so the next batch re-evaluates this row."
                  >
                    Reject auto
                  </button>
                )}
                <button
                  type="button"
                  style={buttonDanger}
                  onClick={() => skip(row)}
                  disabled={busy}
                >
                  Skip
                </button>
              </div>
            </article>
          );
        })}

        {/* Pagination */}
        <div
          style={{
            ...card,
            display: 'flex',
            gap: 8,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            style={buttonBase}
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← Previous
          </button>
          <span style={{ color: COLORS.faded }}>
            Page {page + 1}
            {totalUnverified != null
              ? ` of ~${Math.max(1, Math.ceil(totalUnverified / PAGE_SIZE))}`
              : ''}
          </span>
          <button
            type="button"
            style={buttonBase}
            disabled={loading || rows.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </main>
  );
}

function Badge({
  children,
  tone = 'amber',
}: {
  children: React.ReactNode;
  tone?: 'amber' | 'amber-strong' | 'teal' | 'red';
}) {
  let bg = `${COLORS.amber}26`;
  let color = '#7A5C1A';
  if (tone === 'teal') {
    bg = `${COLORS.teal}1A`;
    color = COLORS.teal;
  } else if (tone === 'red') {
    bg = `${COLORS.red}1A`;
    color = COLORS.red;
  } else if (tone === 'amber-strong') {
    bg = `${COLORS.amber}40`;
    color = '#5A4310';
  }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        borderRadius: 4,
      }}
    >
      {children}
    </span>
  );
}
