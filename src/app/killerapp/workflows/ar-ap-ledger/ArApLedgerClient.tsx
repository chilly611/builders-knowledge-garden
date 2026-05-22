'use client';

/**
 * ArApLedgerClient
 * ================
 * Two-tab ledger view: AR (billed to clients) and AP (paid to subs).
 *
 * Invoices come from the union-schema invoices table — direction='AR' or 'AP'
 * distinguishes the two. AR groups by project_id, AP groups by vendor_id.
 *
 * - Row click → invoice detail with line items + payment history.
 * - "+ New invoice" → modal with G702/G703-style SOV builder.
 * - "Record payment" on each invoice → writes invoice_payments via the
 *   existing /api/v1/invoices?action=payment endpoint.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Invoice {
  id: string;
  project_id?: string | null;
  vendor_id?: string | null;
  invoice_number?: string | null;
  application_number?: string | null;
  direction?: 'AR' | 'AP' | null;
  status?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  total_amount?: number | null;
  amount_paid?: number | null;
  project_name?: string | null;
  notes?: string | null;
  line_items?: LineItem[];
}

interface LineItem {
  id?: string;
  item_number?: number;
  description?: string;
  csi_division?: string | null;
  scheduled_value?: number | null;
  total_completed?: number | null;
  amount?: number | null;
}

interface Payment {
  id: string;
  invoice_id: string;
  amount_paid?: number | null;
  amount?: number | null;
  payment_date: string;
  payment_method?: string | null;
  method?: string | null;
  notes?: string | null;
}

interface Vendor { id: string; legal_name: string; }

const COLORS = {
  paper: '#FAF8F2', ink: '#1A1A1A', graphite: '#3D3D3D', faded: '#B8B5AC',
  rule: '#D8D2C2', green: '#1D9E75', red: '#E8443A', amber: '#C4A44A', brass: '#B6873A',
};

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

function money(n: number | null | undefined): string {
  const v = typeof n === 'number' ? n : 0;
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function statusColor(s?: string | null): string {
  switch ((s || '').toLowerCase()) {
    case 'paid': return COLORS.green;
    case 'overdue': case 'disputed': return COLORS.red;
    case 'submitted': case 'approved': return COLORS.brass;
    default: return COLORS.faded;
  }
}

export default function ArApLedgerClient() {
  const search = useSearchParams();
  const projectId = search.get('project');
  const [tab, setTab] = useState<'AR' | 'AP'>('AR');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [openInvoice, setOpenInvoice] = useState<Invoice | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const [iRes, vRes] = await Promise.all([
        fetch('/api/v1/invoices', { headers }),
        fetch('/api/v1/vendors', { headers }),
      ]);
      const iJson = await iRes.json();
      const vJson = await vRes.json();
      setInvoices(iJson.invoices || []);
      setPayments(iJson.payments || []);
      setVendors(vJson.vendors || []);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const tabInvoices = useMemo(
    () => invoices.filter((i) => (i.direction || 'AR') === tab),
    [invoices, tab]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Invoice[]>();
    for (const inv of tabInvoices) {
      const key = tab === 'AR' ? (inv.project_id || inv.project_name || '—') : (inv.vendor_id || '—');
      const list = map.get(key) || [];
      list.push(inv);
      map.set(key, list);
    }
    return map;
  }, [tabInvoices, tab]);

  function vendorName(id?: string | null): string {
    if (!id) return '—';
    return vendors.find((v) => v.id === id)?.legal_name || id;
  }

  function paymentsFor(invoiceId: string): Payment[] {
    return payments.filter((p) => p.invoice_id === invoiceId);
  }

  function paidTotal(invoiceId: string): number {
    return paymentsFor(invoiceId).reduce((s, p) => s + (p.amount_paid ?? p.amount ?? 0), 0);
  }

  return (
    <div style={{ padding: 24, background: COLORS.paper, minHeight: '100vh', color: COLORS.ink, fontFamily: 'Georgia, serif' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <header style={{ marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>AR / AP ledger</h1>
          <p style={{ color: COLORS.graphite, marginTop: 4 }}>
            Money in (billed to clients) and money out (paid to subs). Grouped by {tab === 'AR' ? 'project' : 'vendor'}.
          </p>
        </header>

        <div style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
          {(['AR', 'AP'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 20px',
                border: `1px solid ${COLORS.rule}`,
                background: tab === t ? COLORS.ink : '#fff',
                color: tab === t ? COLORS.paper : COLORS.ink,
                borderRadius: 0,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {t === 'AR' ? 'AR — billed to clients' : 'AP — paid to subs'}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setShowNew(true)}
            style={{ padding: '8px 16px', background: COLORS.green, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 4, fontWeight: 600 }}
          >
            + New invoice
          </button>
        </div>

        {err && <div style={{ padding: 12, background: '#FCE9E7', border: `1px solid ${COLORS.red}`, color: COLORS.red, borderRadius: 4, marginBottom: 12 }}>{err}</div>}

        {loading && <div style={{ padding: 20, textAlign: 'center', color: COLORS.faded }}>Loading…</div>}

        {!loading && tabInvoices.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: COLORS.faded, background: '#fff', border: `1px solid ${COLORS.rule}`, borderRadius: 4 }}>
            No {tab} invoices yet. Click "+ New invoice" to create one.
          </div>
        )}

        {[...grouped.entries()].map(([groupKey, list]) => {
          const groupTotal = list.reduce((s, i) => s + (i.total_amount ?? 0), 0);
          const groupPaid = list.reduce((s, i) => s + paidTotal(i.id), 0);
          const groupLabel = tab === 'AR'
            ? (list[0]?.project_name || groupKey)
            : vendorName(groupKey);
          return (
            <div key={groupKey} style={{ marginBottom: 16, border: `1px solid ${COLORS.rule}`, borderRadius: 4, background: '#fff' }}>
              <div style={{ padding: '10px 14px', background: '#F5F0E4', borderBottom: `1px solid ${COLORS.rule}`, display: 'flex', alignItems: 'center' }}>
                <strong>{groupLabel}</strong>
                <div style={{ flex: 1 }} />
                <span style={{ color: COLORS.graphite, fontSize: 13 }}>
                  {money(groupPaid)} paid / {money(groupTotal)} billed · remaining {money(groupTotal - groupPaid)}
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: COLORS.graphite }}>
                    <th style={{ padding: 8 }}>Invoice #</th>
                    <th style={{ padding: 8 }}>Date</th>
                    <th style={{ padding: 8 }}>{tab === 'AR' ? 'Customer' : 'Vendor'}</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>Total</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>Paid</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>Remaining</th>
                    <th style={{ padding: 8 }}>Status</th>
                    <th style={{ padding: 8 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((i) => {
                    const paid = paidTotal(i.id);
                    const total = i.total_amount ?? 0;
                    return (
                      <tr key={i.id} style={{ borderTop: `1px solid ${COLORS.rule}`, cursor: 'pointer' }} onClick={() => setOpenInvoice(i)}>
                        <td style={{ padding: 8, fontWeight: 600 }}>{i.invoice_number || i.application_number || i.id.slice(0, 8)}</td>
                        <td style={{ padding: 8 }}>{i.invoice_date || '—'}</td>
                        <td style={{ padding: 8 }}>{tab === 'AR' ? (i.project_name || '—') : vendorName(i.vendor_id)}</td>
                        <td style={{ padding: 8, textAlign: 'right' }}>{money(total)}</td>
                        <td style={{ padding: 8, textAlign: 'right', color: COLORS.green }}>{money(paid)}</td>
                        <td style={{ padding: 8, textAlign: 'right' }}>{money(total - paid)}</td>
                        <td style={{ padding: 8 }}>
                          <span style={{ padding: '2px 8px', borderRadius: 999, background: statusColor(i.status) + '22', color: statusColor(i.status), fontSize: 12, fontWeight: 600 }}>
                            {i.status || 'Draft'}
                          </span>
                        </td>
                        <td style={{ padding: 8, textAlign: 'right' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenInvoice({ ...i, _showPayment: true } as Invoice & { _showPayment: boolean }); }}
                            style={{ fontSize: 12, padding: '4px 8px', border: `1px solid ${COLORS.rule}`, background: '#fff', cursor: 'pointer', borderRadius: 3 }}
                          >
                            Record payment
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {showNew && (
          <NewInvoiceModal
            direction={tab}
            projectId={projectId}
            vendors={vendors}
            onClose={() => setShowNew(false)}
            onSaved={() => { setShowNew(false); void refresh(); }}
          />
        )}

        {openInvoice && (
          <InvoiceDetailModal
            invoice={openInvoice}
            payments={paymentsFor(openInvoice.id)}
            vendorName={vendorName(openInvoice.vendor_id)}
            onClose={() => setOpenInvoice(null)}
            onPaymentRecorded={() => { void refresh(); setOpenInvoice(null); }}
            openPaymentForm={(openInvoice as Invoice & { _showPayment?: boolean })._showPayment}
          />
        )}
      </div>
    </div>
  );
}

function NewInvoiceModal({
  direction, projectId, vendors, onClose, onSaved,
}: {
  direction: 'AR' | 'AP';
  projectId: string | null;
  vendors: Vendor[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [projectName, setProjectName] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([
    { item_number: 1, description: '', scheduled_value: 0, total_completed: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function updateLine(idx: number, key: keyof LineItem, value: string | number) {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));
  }
  function addLine() {
    setLines((ls) => [...ls, { item_number: ls.length + 1, description: '', scheduled_value: 0, total_completed: 0 }]);
  }
  function removeLine(idx: number) {
    setLines((ls) => ls.filter((_, i) => i !== idx));
  }

  const total = lines.reduce((s, l) => s + (Number(l.total_completed) || Number(l.scheduled_value) || 0), 0);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const headers = await authHeaders();
      const body = {
        project_id: projectId,
        project_name: projectName || (direction === 'AR' ? 'AR invoice' : 'AP invoice'),
        invoice_number: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        application_number: invoiceNumber || '',
        direction,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        vendor_id: direction === 'AP' ? (vendorId || null) : null,
        total_amount: total,
        subtotal: total,
        amount_paid: 0,
        status: 'Draft',
        notes,
        original_contract_sum: total,
        net_change_by_orders: 0,
        total_completed_and_stored: total,
        retainage_percent: 0.1,
        retainage_amount: 0,
        total_earned_less_retainage: total,
        previous_certificates: 0,
        current_payment_due: total,
        balance_to_finish: 0,
        contractor_info: { name: '', address: '', contact: '' },
        line_items: lines.map((l, i) => ({
          item_number: l.item_number ?? i + 1,
          description: l.description || '',
          scheduled_value: Number(l.scheduled_value) || 0,
          completed_previous: 0,
          completed_this_period: Number(l.total_completed) || 0,
          materials_stored: 0,
          total_completed: Number(l.total_completed) || 0,
          percent_complete: l.scheduled_value ? (Number(l.total_completed) || 0) / Number(l.scheduled_value) : 0,
          balance_to_finish: (Number(l.scheduled_value) || 0) - (Number(l.total_completed) || 0),
          retainage_amount: 0,
          csi_division: l.csi_division || null,
          amount: Number(l.total_completed) || Number(l.scheduled_value) || 0,
        })),
      };
      const res = await fetch('/api/v1/invoices', { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.paper, borderRadius: 8, padding: 24, maxWidth: 900, width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>New {direction} invoice</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            Invoice #
            <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            Invoice date
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            Due date
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, gridColumn: 'span 2' }}>
            {direction === 'AR' ? 'Customer / project name' : 'Project name'}
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }} />
          </label>
          {direction === 'AP' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              Vendor
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }}>
                <option value="">— select vendor —</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.legal_name}</option>)}
              </select>
            </label>
          )}
        </div>

        <h3 style={{ fontSize: 16, marginTop: 16, marginBottom: 8 }}>Schedule of values (G703)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F5F0E4', textAlign: 'left' }}>
              <th style={{ padding: 6, width: 40 }}>#</th>
              <th style={{ padding: 6 }}>Description</th>
              <th style={{ padding: 6, width: 80 }}>CSI</th>
              <th style={{ padding: 6, width: 120 }}>Scheduled</th>
              <th style={{ padding: 6, width: 120 }}>Completed</th>
              <th style={{ padding: 6, width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => (
              <tr key={idx}>
                <td style={{ padding: 4 }}>{idx + 1}</td>
                <td style={{ padding: 4 }}>
                  <input value={l.description} onChange={(e) => updateLine(idx, 'description', e.target.value)} style={{ width: '100%', padding: 4, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }} />
                </td>
                <td style={{ padding: 4 }}>
                  <input value={l.csi_division || ''} onChange={(e) => updateLine(idx, 'csi_division', e.target.value)} placeholder="03" style={{ width: '100%', padding: 4, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }} />
                </td>
                <td style={{ padding: 4 }}>
                  <input type="number" value={l.scheduled_value ?? 0} onChange={(e) => updateLine(idx, 'scheduled_value', Number(e.target.value))} style={{ width: '100%', padding: 4, border: `1px solid ${COLORS.rule}`, borderRadius: 3, textAlign: 'right' }} />
                </td>
                <td style={{ padding: 4 }}>
                  <input type="number" value={l.total_completed ?? 0} onChange={(e) => updateLine(idx, 'total_completed', Number(e.target.value))} style={{ width: '100%', padding: 4, border: `1px solid ${COLORS.rule}`, borderRadius: 3, textAlign: 'right' }} />
                </td>
                <td style={{ padding: 4 }}>
                  <button onClick={() => removeLine(idx)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: COLORS.red }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ padding: 6, textAlign: 'right' }}><strong>Total</strong></td>
              <td style={{ padding: 6, textAlign: 'right' }}><strong>{money(total)}</strong></td>
              <td />
            </tr>
          </tfoot>
        </table>
        <button onClick={addLine} style={{ marginTop: 8, padding: '4px 10px', border: `1px solid ${COLORS.rule}`, background: '#fff', cursor: 'pointer', borderRadius: 3, fontSize: 12 }}>+ Add line</button>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, marginTop: 12 }}>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }} />
        </label>

        {err && <div style={{ marginTop: 12, color: COLORS.red }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '8px 16px', border: `1px solid ${COLORS.rule}`, background: '#fff', cursor: 'pointer', borderRadius: 4 }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: '8px 16px', background: COLORS.green, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 4, fontWeight: 600 }}>
            {saving ? 'Saving…' : 'Save invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoiceDetailModal({
  invoice, payments, vendorName, onClose, onPaymentRecorded, openPaymentForm,
}: {
  invoice: Invoice;
  payments: Payment[];
  vendorName: string;
  onClose: () => void;
  onPaymentRecorded: () => void;
  openPaymentForm?: boolean;
}) {
  const [showPay, setShowPay] = useState(!!openPaymentForm);
  const [amount, setAmount] = useState<string>(String(invoice.total_amount ?? 0));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('check');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function recordPayment() {
    setSaving(true); setErr(null);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/v1/invoices?action=payment', {
        method: 'POST', headers,
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount_paid: Number(amount),
          payment_date: date,
          payment_method: method,
          notes,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      onPaymentRecorded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.paper, borderRadius: 8, padding: 24, maxWidth: 720, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Invoice {invoice.invoice_number || invoice.application_number || invoice.id.slice(0, 8)}</h2>
          <span style={{ color: COLORS.graphite }}>{invoice.direction || 'AR'} · {invoice.status || 'Draft'}</span>
        </div>
        <p style={{ color: COLORS.graphite, marginTop: 4 }}>
          {invoice.direction === 'AP' ? `Vendor: ${vendorName}` : `Project: ${invoice.project_name || '—'}`} · Total {money(invoice.total_amount)}
        </p>

        <h3 style={{ fontSize: 14, marginTop: 16, marginBottom: 6 }}>Line items</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff', border: `1px solid ${COLORS.rule}` }}>
          <thead><tr style={{ background: '#F5F0E4', textAlign: 'left' }}>
            <th style={{ padding: 6 }}>#</th><th style={{ padding: 6 }}>Description</th>
            <th style={{ padding: 6 }}>CSI</th><th style={{ padding: 6, textAlign: 'right' }}>Amount</th>
          </tr></thead>
          <tbody>
            {(invoice.line_items || []).map((li, i) => (
              <tr key={li.id || i} style={{ borderTop: `1px solid ${COLORS.rule}` }}>
                <td style={{ padding: 6 }}>{li.item_number ?? i + 1}</td>
                <td style={{ padding: 6 }}>{li.description}</td>
                <td style={{ padding: 6 }}>{li.csi_division || '—'}</td>
                <td style={{ padding: 6, textAlign: 'right' }}>{money(li.total_completed ?? li.amount ?? li.scheduled_value)}</td>
              </tr>
            ))}
            {(!invoice.line_items || invoice.line_items.length === 0) && (
              <tr><td colSpan={4} style={{ padding: 12, textAlign: 'center', color: COLORS.faded }}>No line items.</td></tr>
            )}
          </tbody>
        </table>

        <h3 style={{ fontSize: 14, marginTop: 16, marginBottom: 6, display: 'flex', alignItems: 'center' }}>
          Payment history
          <div style={{ flex: 1 }} />
          {!showPay && (
            <button onClick={() => setShowPay(true)} style={{ padding: '4px 10px', background: COLORS.green, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 3, fontSize: 12, fontWeight: 600 }}>
              + Record payment
            </button>
          )}
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff', border: `1px solid ${COLORS.rule}` }}>
          <thead><tr style={{ background: '#F5F0E4', textAlign: 'left' }}>
            <th style={{ padding: 6 }}>Date</th><th style={{ padding: 6 }}>Method</th>
            <th style={{ padding: 6, textAlign: 'right' }}>Amount</th><th style={{ padding: 6 }}>Notes</th>
          </tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} style={{ borderTop: `1px solid ${COLORS.rule}` }}>
                <td style={{ padding: 6 }}>{p.payment_date}</td>
                <td style={{ padding: 6 }}>{p.payment_method || p.method || '—'}</td>
                <td style={{ padding: 6, textAlign: 'right' }}>{money(p.amount_paid ?? p.amount)}</td>
                <td style={{ padding: 6, color: COLORS.graphite }}>{p.notes || ''}</td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={4} style={{ padding: 12, textAlign: 'center', color: COLORS.faded }}>No payments recorded.</td></tr>}
          </tbody>
        </table>

        {showPay && (
          <div style={{ marginTop: 16, padding: 12, background: '#fff', border: `1px solid ${COLORS.rule}`, borderRadius: 4 }}>
            <h4 style={{ margin: 0, marginBottom: 8 }}>Record payment</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
                Amount
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
                Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
                Method
                <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }}>
                  <option value="check">Check</option>
                  <option value="ach">ACH</option>
                  <option value="wire">Wire</option>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                </select>
              </label>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, marginTop: 8 }}>
              Notes
              <input value={notes} onChange={(e) => setNotes(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }} />
            </label>
            {err && <div style={{ color: COLORS.red, marginTop: 6 }}>{err}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
              <button onClick={() => setShowPay(false)} disabled={saving} style={{ padding: '6px 12px', border: `1px solid ${COLORS.rule}`, background: '#fff', cursor: 'pointer', borderRadius: 3, fontSize: 12 }}>Cancel</button>
              <button onClick={recordPayment} disabled={saving} style={{ padding: '6px 12px', background: COLORS.green, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 3, fontSize: 12, fontWeight: 600 }}>
                {saving ? 'Saving…' : 'Save payment'}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: `1px solid ${COLORS.rule}`, background: '#fff', cursor: 'pointer', borderRadius: 4 }}>Close</button>
        </div>
      </div>
    </div>
  );
}
