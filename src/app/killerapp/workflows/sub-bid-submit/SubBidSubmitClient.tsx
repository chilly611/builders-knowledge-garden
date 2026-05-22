'use client';

/**
 * SubBidSubmitClient (SUBBID-FLOW, 2026-05-22)
 * =============================================
 *
 * Form for a specialty sub (Diego the plumber, etc.) to push a bid back
 * to the GC. Wraps the entire form in <LaneGate allow={['specialist',
 * 'contractor']}> so a GC who lands here gets a polite redirect to the
 * inbox instead of seeing the wrong tool.
 *
 * UX flow:
 *   1) Pick a project (default = caller's pinned demo_project_id).
 *   2) Pick trade + CSI division (auto-suggested from trade).
 *   3) Type a short scope, optionally tap "Use AI to expand" → calls
 *      /api/v1/sub-bids/expand-scope and replaces the textarea content.
 *   4) Build the line-items table (add row, computed amounts, running
 *      subtotal + editable tax → total).
 *   5) CSLB number (required for CA) + insurance cert toggles.
 *   6) Submit → POST /api/v1/sub-bids → green confirmation card.
 *
 * Styling mirrors ArchitectOfRecordClient (paper/ink palette) so the
 * sub-side surfaces feel like one product, not a bolt-on.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import LaneGate from '@/components/LaneGate';

type Trade =
  | 'Electrical'
  | 'Plumbing'
  | 'HVAC'
  | 'Framing'
  | 'Concrete'
  | 'Drywall'
  | 'Paint'
  | 'Roofing'
  | 'Tile'
  | 'Other';

interface TradeMeta {
  label: Trade;
  csi: string;
  hint: string;
}

const TRADES: TradeMeta[] = [
  { label: 'Electrical', csi: '26', hint: 'CSI Div 26 — Electrical' },
  { label: 'Plumbing',   csi: '22', hint: 'CSI Div 22 — Plumbing' },
  { label: 'HVAC',       csi: '23', hint: 'CSI Div 23 — HVAC' },
  { label: 'Framing',    csi: '06', hint: 'CSI Div 06 — Wood & Plastics' },
  { label: 'Concrete',   csi: '03', hint: 'CSI Div 03 — Concrete' },
  { label: 'Drywall',    csi: '09', hint: 'CSI Div 09 — Finishes (drywall)' },
  { label: 'Paint',      csi: '09', hint: 'CSI Div 09 — Finishes (paint)' },
  { label: 'Roofing',    csi: '07', hint: 'CSI Div 07 — Thermal & Moisture' },
  { label: 'Tile',       csi: '09', hint: 'CSI Div 09 — Finishes (tile)' },
  { label: 'Other',      csi: '',   hint: 'Specify CSI division manually' },
];

interface LineItem {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unit_price: number;
}

interface ProjectOption {
  id: string;
  name: string;
}

const COLORS = {
  paper:    '#FAF8F2',
  ink:      '#1A1A1A',
  graphite: '#3D3D3D',
  faded:    '#B8B5AC',
  rule:     '#D8D2C2',
  green:    '#1D9E75',
  red:      '#E8443A',
  amber:    '#C4A44A',
  // Plan-stage accent — bids live in the planning phase.
  teal:     '#0E7F8C',
};

function makeRow(): LineItem {
  return {
    id: `li-${Math.random().toString(36).slice(2, 9)}`,
    description: '',
    qty: 1,
    unit: 'ea',
    unit_price: 0,
  };
}

function NotForYourRole() {
  return (
    <main style={pageWrap}>
      <div style={card}>
        <p style={eyebrow}>WRONG DESK</p>
        <h1 style={h1Style}>This is the sub-side bid desk.</h1>
        <p style={{ ...bodyText, marginTop: 12 }}>
          You&apos;re signed in as a GC or owner. Bids land in your <strong>inbox</strong>,
          not this form. Hop over there to review submissions.
        </p>
        <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/killerapp/workflows/sub-bid-inbox" style={ctaPrimary}>
            Open sub-bid inbox →
          </Link>
          <Link href="/killerapp" style={ctaSecondary}>Back to your project</Link>
        </div>
      </div>
    </main>
  );
}

export default function SubBidSubmitClient() {
  return (
    <LaneGate
      allow={['specialist', 'contractor']}
      fallback={<NotForYourRole />}
      loadingFallback={<main style={pageWrap} />}
    >
      <SubBidSubmitForm />
    </LaneGate>
  );
}

function SubBidSubmitForm() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [trade, setTrade] = useState<Trade | ''>('');
  const [csi, setCsi] = useState<string>('');
  const [scope, setScope] = useState<string>('');
  const [expanding, setExpanding] = useState<boolean>(false);
  const [items, setItems] = useState<LineItem[]>([makeRow()]);
  const [tax, setTax] = useState<number>(0);
  const [validityDays, setValidityDays] = useState<number>(30);
  const [cslb, setCslb] = useState<string>('');
  const [cslbLookupNote, setCslbLookupNote] = useState<string | null>(null);
  const [insGl, setInsGl] = useState<boolean>(false);
  const [insWc, setInsWc] = useState<boolean>(false);
  const [insAuto, setInsAuto] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<null | { id: string; total: number; projectName: string }>(null);
  const [error, setError] = useState<string | null>(null);

  // Load project picker options on mount.
  useEffect(() => {
    void (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const user = u.user;
        if (!user) return;

        const pinned =
          (user.user_metadata as Record<string, unknown> | undefined)
            ?.demo_project_id;
        const accessible: ProjectOption[] = [];

        // Pinned demo project for trial subs.
        if (typeof pinned === 'string' && pinned.length > 0) {
          const { data: p } = await supabase
            .from('command_center_projects')
            .select('id, name')
            .eq('id', pinned)
            .maybeSingle();
          if (p) accessible.push({ id: String(p.id), name: String(p.name) });
        }

        // Anything we're rostered onto.
        const { data: members } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id);
        const memberIds = (members ?? [])
          .map((m) => (m as { project_id: string }).project_id)
          .filter((x): x is string => !!x);
        if (memberIds.length > 0) {
          const { data: rows } = await supabase
            .from('command_center_projects')
            .select('id, name')
            .in('id', memberIds);
          for (const r of rows ?? []) {
            const entry = { id: String(r.id), name: String(r.name) };
            if (!accessible.some((a) => a.id === entry.id)) accessible.push(entry);
          }
        }

        setProjects(accessible);
        if (accessible.length === 1) setProjectId(accessible[0].id);
        else if (accessible[0]) setProjectId(accessible[0].id);
      } catch {
        // Best-effort. The user can still submit (the API will 403 if
        // they pick something they don't have access to).
      }
    })();
  }, []);

  const subtotal = useMemo(
    () => items.reduce((acc, li) => acc + (Number(li.qty) || 0) * (Number(li.unit_price) || 0), 0),
    [items],
  );
  const total = useMemo(() => subtotal + (Number(tax) || 0), [subtotal, tax]);

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((li) => (li.id === id ? { ...li, ...patch } : li)));
  }
  function addRow() {
    setItems((prev) => [...prev, makeRow()]);
  }
  function removeRow(id: string) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((li) => li.id !== id)));
  }

  function pickTrade(label: Trade) {
    setTrade(label);
    const meta = TRADES.find((t) => t.label === label);
    if (meta && !csi) setCsi(meta.csi);
  }

  async function expandScope() {
    if (!scope.trim()) {
      setError('Type a couple lines of scope first, then I can expand it.');
      return;
    }
    setExpanding(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch('/api/v1/sub-bids/expand-scope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          draft: scope,
          trade_label: trade || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Could not expand the scope. Try again?');
      } else if (typeof json.scope === 'string' && json.scope.trim()) {
        setScope(json.scope.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setExpanding(false);
    }
  }

  async function lookupCslb() {
    if (!cslb.trim()) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch(
        `/api/v1/sub-bids/cslb-lookup?license=${encodeURIComponent(cslb)}`,
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      );
      const json = await res.json().catch(() => ({}));
      if (json?.ok && json.lookup_url) {
        setCslbLookupNote(`Open verification: ${json.lookup_url}`);
        if (typeof window !== 'undefined') {
          window.open(String(json.lookup_url), '_blank', 'noopener,noreferrer');
        }
      } else {
        setCslbLookupNote('License number looks malformed. CA CSLB licenses are 4–8 digits.');
      }
    } catch {
      setCslbLookupNote('Could not reach the CSLB lookup helper. Verify on cslb.ca.gov.');
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!projectId) {
      setError('Pick a project first.');
      return;
    }
    if (!trade) {
      setError('Pick the trade you\'re bidding.');
      return;
    }
    if (!cslb.trim()) {
      setError('CSLB number is required for CA work.');
      return;
    }
    if (subtotal <= 0) {
      setError('Add at least one line item with an amount.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const payload = {
        project_id: projectId,
        trade_label: trade,
        csi_division: csi || null,
        scope_of_work: scope || null,
        line_items: items.map((li) => ({
          description: li.description,
          qty: Number(li.qty) || 0,
          unit: li.unit,
          unit_price: Number(li.unit_price) || 0,
          amount: (Number(li.qty) || 0) * (Number(li.unit_price) || 0),
        })),
        subtotal,
        tax: Number(tax) || 0,
        total,
        validity_days: validityDays,
        cslb_number: cslb,
        insurance_certs_attached: {
          gl: insGl,
          wc: insWc,
          auto: insAuto,
        },
      };
      const res = await fetch('/api/v1/sub-bids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Could not submit the bid. Try again?');
      } else {
        const projectName =
          projects.find((p) => p.id === projectId)?.name || 'the project';
        setSubmitted({
          id: String(json.id),
          total,
          projectName,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main style={pageWrap}>
        <div style={card}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 28,
              background: 'rgba(29,158,117,0.12)',
              color: COLORS.green,
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 16,
            }}
            aria-hidden
          >
            ✓
          </div>
          <h1 style={h1Style}>Bid submitted.</h1>
          <p style={{ ...bodyText, marginTop: 12 }}>
            Your <strong>${submitted.total.toLocaleString()}</strong> bid is on the GC&apos;s desk
            for <strong>{submitted.projectName}</strong>. They&apos;ll review and respond — you&apos;ll
            see the status flip to <em>reviewed</em>, then <em>accepted</em> or <em>rejected</em>.
          </p>
          <p style={{ ...bodyText, marginTop: 12, color: COLORS.faded, fontSize: 14 }}>
            Bid is valid for {validityDays} days. After that you may want to refresh pricing.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/killerapp/workflows/sub-bid-submit" style={ctaPrimary}>
              Submit another bid
            </Link>
            <Link href="/killerapp" style={ctaSecondary}>Back to your project</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageWrap}>
      <form onSubmit={onSubmit} style={card}>
        <p style={eyebrow}>STAGE 3 · PLAN · SUB-BID</p>
        <h1 style={h1Style}>Push a bid to the GC.</h1>
        <p style={{ ...bodyText, marginTop: 12 }}>
          Tell them what you&apos;ll do, what it costs, and how long the number is good for.
          They&apos;ll see it in their inbox the second you hit submit.
        </p>

        {/* Project picker */}
        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="projectId">
            Which project? <span style={requiredMark}>*</span>
          </label>
          {projects.length === 0 ? (
            <p style={{ ...bodyText, fontSize: 14, color: COLORS.faded }}>
              No projects available. Ask the GC to invite you, or contact support.
            </p>
          ) : (
            <select
              id="projectId"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={inputStyle}
              required
            >
              <option value="">— pick a project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Trade picker */}
        <fieldset style={{ ...fieldGroup, border: 'none', padding: 0, margin: '24px 0 0' }}>
          <legend style={{ ...labelStyle, padding: 0 }}>
            Trade <span style={requiredMark}>*</span>
          </legend>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 8,
          }}>
            {TRADES.map((t) => {
              const active = trade === t.label;
              return (
                <button
                  type="button"
                  key={t.label}
                  onClick={() => pickTrade(t.label)}
                  style={{
                    padding: '10px 12px',
                    background: active ? 'rgba(14,127,140,0.08)' : '#FFFFFF',
                    border: `1px solid ${active ? COLORS.teal : COLORS.rule}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    color: active ? COLORS.teal : COLORS.ink,
                    fontFamily: 'inherit',
                    textAlign: 'left',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="csi">CSI division</label>
          <input
            id="csi"
            type="text"
            value={csi}
            onChange={(e) => setCsi(e.target.value)}
            placeholder="e.g. 22 for plumbing"
            style={inputStyle}
            maxLength={16}
          />
          {trade && (
            <p style={{ marginTop: 6, fontSize: 12, color: COLORS.faded }}>
              {TRADES.find((t) => t.label === trade)?.hint}
            </p>
          )}
        </div>

        {/* Scope */}
        <div style={fieldGroup}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }} htmlFor="scope">Scope of work</label>
            <button
              type="button"
              onClick={expandScope}
              disabled={expanding}
              style={{
                padding: '6px 10px',
                background: 'transparent',
                color: COLORS.teal,
                border: `1px solid ${COLORS.teal}`,
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: expanding ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {expanding ? 'Expanding…' : 'Use AI to expand →'}
            </button>
          </div>
          <textarea
            id="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            rows={5}
            placeholder="e.g. Rough + finish plumbing for ADU. PEX domestic, ABS waste, gas line to range."
            style={{ ...textareaStyle, marginTop: 8 }}
          />
        </div>

        {/* Line items */}
        <div style={fieldGroup}>
          <label style={labelStyle}>Line items</label>
          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.rule}`, borderRadius: 6 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: COLORS.paper }}>
                  <th style={th}>Description</th>
                  <th style={{ ...th, width: 70 }}>Qty</th>
                  <th style={{ ...th, width: 80 }}>Unit</th>
                  <th style={{ ...th, width: 110 }}>Unit price</th>
                  <th style={{ ...th, width: 110 }}>Amount</th>
                  <th style={{ ...th, width: 30 }} />
                </tr>
              </thead>
              <tbody>
                {items.map((li) => {
                  const amount = (Number(li.qty) || 0) * (Number(li.unit_price) || 0);
                  return (
                    <tr key={li.id}>
                      <td style={td}>
                        <input
                          type="text"
                          value={li.description}
                          onChange={(e) => updateItem(li.id, { description: e.target.value })}
                          placeholder="e.g. Rough plumbing"
                          style={cellInput}
                        />
                      </td>
                      <td style={td}>
                        <input
                          type="number"
                          value={li.qty}
                          min={0}
                          step="0.5"
                          onChange={(e) => updateItem(li.id, { qty: Number(e.target.value) })}
                          style={cellInput}
                        />
                      </td>
                      <td style={td}>
                        <input
                          type="text"
                          value={li.unit}
                          onChange={(e) => updateItem(li.id, { unit: e.target.value })}
                          style={cellInput}
                        />
                      </td>
                      <td style={td}>
                        <input
                          type="number"
                          value={li.unit_price}
                          min={0}
                          step="0.01"
                          onChange={(e) => updateItem(li.id, { unit_price: Number(e.target.value) })}
                          style={cellInput}
                        />
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td style={td}>
                        {items.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeRow(li.id)}
                            aria-label="Remove line"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: COLORS.faded,
                              cursor: 'pointer',
                              fontSize: 16,
                            }}
                          >
                            ×
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ padding: 8 }}>
                    <button
                      type="button"
                      onClick={addRow}
                      style={{
                        padding: '6px 10px',
                        border: `1px dashed ${COLORS.teal}`,
                        background: 'transparent',
                        borderRadius: 4,
                        color: COLORS.teal,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      + Add line item
                    </button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, fontSize: 14 }}>
            <div>
              Subtotal: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                ${subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Tax: $</span>
              <input
                type="number"
                value={tax}
                min={0}
                step="0.01"
                onChange={(e) => setTax(Number(e.target.value))}
                style={{ ...inputStyle, width: 120, padding: '4px 8px' }}
              />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.ink }}>
              Total: <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* CSLB */}
        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="cslb">
            CSLB number <span style={requiredMark}>*</span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="cslb"
              type="text"
              value={cslb}
              onChange={(e) => setCslb(e.target.value)}
              placeholder="e.g. 1029384"
              style={{ ...inputStyle, flex: 1 }}
              required
            />
            <button
              type="button"
              onClick={lookupCslb}
              style={{
                padding: '0 14px',
                background: COLORS.paper,
                border: `1px solid ${COLORS.rule}`,
                borderRadius: 6,
                color: COLORS.ink,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              Look up
            </button>
          </div>
          {cslbLookupNote && (
            <p style={{ marginTop: 6, fontSize: 12, color: COLORS.graphite }}>{cslbLookupNote}</p>
          )}
        </div>

        {/* Insurance */}
        <div style={fieldGroup}>
          <label style={labelStyle}>Insurance certs on file</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {[
              { key: 'gl', label: 'General Liability', value: insGl, set: setInsGl },
              { key: 'wc', label: 'Workers Comp', value: insWc, set: setInsWc },
              { key: 'auto', label: 'Commercial Auto', value: insAuto, set: setInsAuto },
            ].map((c) => (
              <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={c.value}
                  onChange={(e) => c.set(e.target.checked)}
                  style={{ accentColor: COLORS.teal }}
                />
                {c.label}
              </label>
            ))}
          </div>
          <p style={{ marginTop: 6, fontSize: 12, color: COLORS.faded }}>
            (File upload coming soon — for now just confirm you have coverage on hand.)
          </p>
        </div>

        {/* Validity */}
        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="validity">Bid valid for</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              id="validity"
              type="number"
              value={validityDays}
              min={1}
              max={365}
              onChange={(e) => setValidityDays(Math.max(1, Number(e.target.value) || 30))}
              style={{ ...inputStyle, width: 100 }}
            />
            <span>days</span>
          </div>
        </div>

        {error && <div role="alert" style={errorCard}>{error}</div>}

        <button type="submit" disabled={submitting} style={submitButton(submitting)}>
          {submitting ? 'Sending…' : 'Submit bid →'}
        </button>

        <p style={{ ...bodyText, fontSize: 13, color: COLORS.faded, marginTop: 16 }}>
          The GC will be emailed (best-effort) and the bid will appear in their inbox immediately.
        </p>
      </form>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Styles — paper/ink palette, mirroring ArchitectOfRecordClient.
// ---------------------------------------------------------------------------

const pageWrap: React.CSSProperties = {
  minHeight: '100vh',
  background: COLORS.paper,
  padding: '64px 24px',
  fontFamily: "var(--font-archivo, 'Archivo', sans-serif)",
  color: COLORS.ink,
};

const card: React.CSSProperties = {
  maxWidth: 820,
  margin: '0 auto',
  background: '#FFFFFF',
  borderRadius: 12,
  padding: '40px 32px',
  border: `1px solid ${COLORS.rule}`,
  boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.04)',
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.14em',
  color: COLORS.teal,
  textTransform: 'uppercase',
};

const h1Style: React.CSSProperties = {
  margin: '8px 0 0',
  fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)",
  fontSize: 32,
  lineHeight: 1.2,
  color: COLORS.ink,
};

const bodyText: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  lineHeight: 1.55,
  color: COLORS.graphite,
};

const fieldGroup: React.CSSProperties = { marginTop: 24 };

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  color: COLORS.ink,
  marginBottom: 8,
};

const requiredMark: React.CSSProperties = { color: COLORS.red, fontWeight: 700 };

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 15,
  fontFamily: 'inherit',
  background: '#FFFFFF',
  border: `1px solid ${COLORS.rule}`,
  borderRadius: 6,
  color: COLORS.ink,
  outline: 'none',
  boxSizing: 'border-box',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 100,
  lineHeight: 1.5,
};

const errorCard: React.CSSProperties = {
  padding: 12,
  marginTop: 16,
  borderRadius: 6,
  background: 'rgba(232, 68, 58, 0.08)',
  border: `1px solid rgba(232, 68, 58, 0.35)`,
  color: COLORS.red,
  fontSize: 14,
  fontWeight: 600,
};

const submitButton = (disabled: boolean): React.CSSProperties => ({
  marginTop: 28,
  width: '100%',
  padding: '14px 20px',
  fontSize: 16,
  fontWeight: 700,
  fontFamily: 'inherit',
  background: disabled ? COLORS.faded : COLORS.teal,
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 6,
  cursor: disabled ? 'not-allowed' : 'pointer',
  letterSpacing: '0.01em',
  opacity: disabled ? 0.7 : 1,
});

const ctaPrimary: React.CSSProperties = {
  padding: '12px 20px',
  background: COLORS.teal,
  color: '#FFFFFF',
  borderRadius: 6,
  fontSize: 15,
  fontWeight: 700,
  textDecoration: 'none',
};

const ctaSecondary: React.CSSProperties = {
  padding: '12px 20px',
  background: 'transparent',
  color: COLORS.ink,
  border: `1px solid ${COLORS.rule}`,
  borderRadius: 6,
  fontSize: 15,
  fontWeight: 600,
  textDecoration: 'none',
};

const th: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: COLORS.graphite,
  textAlign: 'left',
  borderBottom: `1px solid ${COLORS.rule}`,
};

const td: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: `1px solid ${COLORS.rule}`,
  verticalAlign: 'middle',
};

const cellInput: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  fontSize: 14,
  fontFamily: 'inherit',
  background: 'transparent',
  border: `1px solid transparent`,
  borderRadius: 4,
  color: COLORS.ink,
  outline: 'none',
  boxSizing: 'border-box',
};
