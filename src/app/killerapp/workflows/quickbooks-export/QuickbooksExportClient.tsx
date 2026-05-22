'use client';

/**
 * QuickbooksExportClient
 * ======================
 * Generates QuickBooks-compatible exports:
 *   - IIF (Intuit Interchange Format) — tab-delimited, !HDR / !TRNS / !SPL.
 *   - CSV alternative with GL Account column (safer if the GC's QB instance
 *     refuses IIF imports — Intuit deprecated IIF in QB Online).
 *
 * IIF spec reference (cached):
 *   !HDR  PROD VER REL IIFVER DATE TIME ACCNTNT ACCNTNTSPLITTIME
 *   !TRNS TRNSID  TRNSTYPE  DATE  ACCNT  NAME  CLASS  AMOUNT  DOCNUM  MEMO  CLEAR
 *   !SPL  SPLID   TRNSTYPE  DATE  ACCNT  NAME  CLASS  AMOUNT  DOCNUM  MEMO  CLEAR
 *   !ENDTRNS
 *
 * Type selector controls which rows are emitted (Invoices / Payments / Vendors).
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import glMap from '@/lib/quickbooks-gl-map.json';

type ExportType = 'invoices' | 'payments' | 'vendors';
type Format = 'iif' | 'csv';

interface Invoice {
  id: string;
  invoice_number?: string | null;
  application_number?: string | null;
  invoice_date?: string | null;
  total_amount?: number | null;
  direction?: string | null;
  project_name?: string | null;
  vendor_id?: string | null;
  notes?: string | null;
  line_items?: { description?: string | null; csi_division?: string | null; total_completed?: number | null; amount?: number | null }[];
}

interface Payment {
  id: string; invoice_id: string;
  payment_date: string; amount_paid?: number | null; amount?: number | null;
  payment_method?: string | null; method?: string | null; notes?: string | null;
}

interface Vendor {
  id: string; legal_name: string; dba?: string | null; ein?: string | null;
  address_street?: string | null; address_city?: string | null; address_state?: string | null; address_zip?: string | null;
  phone?: string | null; email?: string | null; is_1099_eligible?: boolean | null;
}

const COLORS = {
  paper: '#FAF8F2', ink: '#1A1A1A', graphite: '#3D3D3D', faded: '#B8B5AC',
  rule: '#D8D2C2', green: '#1D9E75', red: '#E8443A', brass: '#B6873A',
};

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface GlMapShape {
  default: {
    income: { account: string; name: string };
    ar: { account: string; name: string };
    ap: { account: string; name: string };
    bank: { account: string; name: string };
    fallback_cogs: { account: string; name: string };
  };
  csi: Record<string, { account: string; name: string }>;
}
const GL = glMap as unknown as GlMapShape;

function accountForCsi(csi?: string | null): { account: string; name: string } {
  if (!csi) return GL.default.fallback_cogs;
  const div = csi.trim().padStart(2, '0').slice(0, 2);
  return GL.csi[div] || GL.default.fallback_cogs;
}

// IIF requires tabs as delimiter and DOS line endings. Dates as MM/DD/YYYY.
function iifDate(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

function iifEscape(s: string): string {
  // IIF: replace tabs and newlines inside fields (they break the format).
  return s.replace(/\t/g, ' ').replace(/[\r\n]+/g, ' ');
}

function buildInvoicesIif(invoices: Invoice[], vendors: Vendor[]): string {
  const vendorMap = new Map(vendors.map((v) => [v.id, v.legal_name]));
  const lines: string[] = [];
  // Account list — minimal, just the ones we reference.
  lines.push(['!ACCNT', 'NAME', 'ACCNTTYPE'].join('\t'));
  lines.push(['ACCNT', GL.default.income.name, 'INC'].join('\t'));
  lines.push(['ACCNT', GL.default.ar.name, 'AR'].join('\t'));
  lines.push(['ACCNT', GL.default.ap.name, 'AP'].join('\t'));
  for (const [, v] of Object.entries(GL.csi)) {
    lines.push(['ACCNT', v.name, 'COGS'].join('\t'));
  }
  lines.push('');

  lines.push(['!TRNS', 'TRNSTYPE', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'DOCNUM', 'MEMO'].join('\t'));
  lines.push(['!SPL', 'TRNSTYPE', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'DOCNUM', 'MEMO'].join('\t'));
  lines.push('!ENDTRNS');

  for (const inv of invoices) {
    const dir = (inv.direction || 'AR').toUpperCase();
    const trnsType = dir === 'AP' ? 'BILL' : 'INVOICE';
    const headerAcct = dir === 'AP' ? GL.default.ap.name : GL.default.ar.name;
    const counterAcct = dir === 'AP' ? null /* per-line COGS */ : GL.default.income.name;
    const name = dir === 'AP' ? (vendorMap.get(inv.vendor_id || '') || '') : (inv.project_name || '');
    const docNum = inv.invoice_number || inv.application_number || inv.id.slice(0, 8);
    const total = inv.total_amount || 0;
    const memo = iifEscape(inv.notes || '');
    const sign = dir === 'AP' ? -1 : 1; // AP: AR-side is negative

    // TRNS row — header. Amount on AR is positive (you owe me); on AP it's negative (I owe).
    lines.push([
      'TRNS', trnsType, iifDate(inv.invoice_date), headerAcct,
      iifEscape(name), (sign * total).toFixed(2), iifEscape(docNum), memo,
    ].join('\t'));

    // SPL rows — one per line item, mapped to GL account.
    const items = inv.line_items || [];
    if (items.length === 0) {
      const acct = dir === 'AP' ? GL.default.fallback_cogs.name : (counterAcct || GL.default.income.name);
      lines.push([
        'SPL', trnsType, iifDate(inv.invoice_date), acct,
        iifEscape(name), (-sign * total).toFixed(2), iifEscape(docNum), memo,
      ].join('\t'));
    } else {
      for (const li of items) {
        const amt = li.total_completed ?? li.amount ?? 0;
        const acct = dir === 'AP'
          ? accountForCsi(li.csi_division).name
          : (counterAcct || GL.default.income.name);
        lines.push([
          'SPL', trnsType, iifDate(inv.invoice_date), acct,
          iifEscape(name), (-sign * amt).toFixed(2), iifEscape(docNum), iifEscape(li.description || ''),
        ].join('\t'));
      }
    }
    lines.push('ENDTRNS');
  }
  return lines.join('\r\n') + '\r\n';
}

function buildPaymentsIif(payments: Payment[], invoices: Invoice[], vendors: Vendor[]): string {
  const invMap = new Map(invoices.map((i) => [i.id, i]));
  const vendorMap = new Map(vendors.map((v) => [v.id, v.legal_name]));
  const lines: string[] = [];
  lines.push(['!TRNS', 'TRNSTYPE', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'DOCNUM', 'MEMO'].join('\t'));
  lines.push(['!SPL', 'TRNSTYPE', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'DOCNUM', 'MEMO'].join('\t'));
  lines.push('!ENDTRNS');
  for (const p of payments) {
    const inv = invMap.get(p.invoice_id);
    const dir = (inv?.direction || 'AR').toUpperCase();
    const amt = p.amount_paid ?? p.amount ?? 0;
    const trnsType = dir === 'AP' ? 'BILLPMT' : 'PAYMENT';
    const name = dir === 'AP' ? (vendorMap.get(inv?.vendor_id || '') || '') : (inv?.project_name || '');
    const sign = dir === 'AP' ? -1 : 1;
    lines.push([
      'TRNS', trnsType, iifDate(p.payment_date), GL.default.bank.name,
      iifEscape(name), (sign * amt).toFixed(2), p.id.slice(0, 8), iifEscape(p.notes || ''),
    ].join('\t'));
    lines.push([
      'SPL', trnsType, iifDate(p.payment_date),
      dir === 'AP' ? GL.default.ap.name : GL.default.ar.name,
      iifEscape(name), (-sign * amt).toFixed(2), p.id.slice(0, 8), iifEscape(p.notes || ''),
    ].join('\t'));
    lines.push('ENDTRNS');
  }
  return lines.join('\r\n') + '\r\n';
}

function buildVendorsIif(vendors: Vendor[]): string {
  const lines: string[] = [];
  lines.push(['!VEND', 'NAME', 'COMPANYNAME', 'PRINTAS', 'ADDR1', 'ADDR2', 'PHONE1', 'EMAIL', 'TAXID', '1099'].join('\t'));
  for (const v of vendors) {
    const addr1 = [v.address_street].filter(Boolean).join(' ');
    const addr2 = [v.address_city, v.address_state, v.address_zip].filter(Boolean).join(', ');
    lines.push([
      'VEND',
      iifEscape(v.legal_name),
      iifEscape(v.dba || v.legal_name),
      iifEscape(v.dba || v.legal_name),
      iifEscape(addr1),
      iifEscape(addr2),
      iifEscape(v.phone || ''),
      iifEscape(v.email || ''),
      iifEscape(v.ein || ''),
      v.is_1099_eligible ? 'Y' : 'N',
    ].join('\t'));
  }
  return lines.join('\r\n') + '\r\n';
}

function buildCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[,"\n]/.test(s) ? `"${s}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

function inRange(d: string | null | undefined, from: string, to: string): boolean {
  if (!d) return false;
  return d >= from && d <= to;
}

export default function QuickbooksExportClient() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [type, setType] = useState<ExportType>('invoices');
  const [format, setFormat] = useState<Format>('iif');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { void (async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const [i, v] = await Promise.all([
        fetch('/api/v1/invoices', { headers }).then((r) => r.json()),
        fetch('/api/v1/vendors', { headers }).then((r) => r.json()),
      ]);
      setInvoices(i.invoices || []);
      setPayments(i.payments || []);
      setVendors(v.vendors || []);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  })(); }, []);

  function generate() {
    const fInvoices = invoices.filter((i) => inRange(i.invoice_date, from, to));
    const fPayments = payments.filter((p) => inRange(p.payment_date, from, to));

    let body = '';
    let filename = '';
    let mime = 'text/plain';

    if (format === 'iif') {
      mime = 'application/octet-stream';
      filename = `qb-${type}-${from}-to-${to}.iif`;
      body = '!HDR\tPROD\tVER\tREL\tIIFVER\tDATE\tTIME\tACCNTNT\tACCNTNTSPLITTIME\r\n';
      body += ['HDR', 'BKG Killer App', '1.0', '1', '1', iifDate(today), '00:00:00', 'N', '0'].join('\t') + '\r\n\r\n';
      if (type === 'invoices') body += buildInvoicesIif(fInvoices, vendors);
      else if (type === 'payments') body += buildPaymentsIif(fPayments, invoices, vendors);
      else body += buildVendorsIif(vendors);
    } else {
      mime = 'text/csv';
      filename = `qb-${type}-${from}-to-${to}.csv`;
      if (type === 'invoices') {
        const rows: Record<string, unknown>[] = [];
        for (const inv of fInvoices) {
          const lis = inv.line_items && inv.line_items.length > 0 ? inv.line_items : [{ description: inv.project_name || '', csi_division: null, total_completed: inv.total_amount || 0 }];
          for (const li of lis) {
            const gl = accountForCsi(li.csi_division);
            rows.push({
              invoice_number: inv.invoice_number || inv.application_number || '',
              date: inv.invoice_date,
              direction: inv.direction || 'AR',
              project: inv.project_name || '',
              vendor_id: inv.vendor_id || '',
              description: li.description || '',
              csi_division: li.csi_division || '',
              gl_account: gl.account,
              gl_account_name: gl.name,
              amount: li.total_completed ?? li.amount ?? 0,
            });
          }
        }
        body = buildCsv(rows);
      } else if (type === 'payments') {
        const invMap = new Map(invoices.map((i) => [i.id, i]));
        body = buildCsv(fPayments.map((p) => {
          const inv = invMap.get(p.invoice_id);
          return {
            payment_id: p.id,
            invoice_number: inv?.invoice_number || '',
            payment_date: p.payment_date,
            method: p.payment_method || p.method || '',
            amount: p.amount_paid ?? p.amount ?? 0,
            direction: inv?.direction || 'AR',
            gl_account: GL.default.bank.account,
            gl_account_name: GL.default.bank.name,
            notes: p.notes || '',
          };
        }));
      } else {
        body = buildCsv(vendors.map((v) => ({
          legal_name: v.legal_name, dba: v.dba || '', ein: v.ein || '',
          phone: v.phone || '', email: v.email || '',
          address: [v.address_street, v.address_city, v.address_state, v.address_zip].filter(Boolean).join(', '),
          is_1099_eligible: v.is_1099_eligible ? 'Y' : 'N',
        })));
      }
    }

    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const countIn = invoices.filter((i) => inRange(i.invoice_date, from, to)).length;
  const countPay = payments.filter((p) => inRange(p.payment_date, from, to)).length;

  return (
    <div style={{ padding: 24, background: COLORS.paper, minHeight: '100vh', color: COLORS.ink, fontFamily: 'Georgia, serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <header style={{ marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>QuickBooks export</h1>
          <p style={{ color: COLORS.graphite, marginTop: 4 }}>
            Month-end close. Export invoices, payments, or vendor master as IIF (Intuit Interchange Format) or CSV.
          </p>
        </header>

        {err && <div style={{ padding: 12, background: '#FCE9E7', border: `1px solid ${COLORS.red}`, color: COLORS.red, borderRadius: 4, marginBottom: 12 }}>{err}</div>}

        <div style={{ background: '#fff', border: `1px solid ${COLORS.rule}`, borderRadius: 4, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Configure export</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }} />
            </label>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: COLORS.graphite, marginBottom: 4 }}>Type</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['invoices', 'payments', 'vendors'] as ExportType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{ padding: '6px 12px', border: `1px solid ${type === t ? COLORS.ink : COLORS.rule}`, background: type === t ? COLORS.ink : '#fff', color: type === t ? COLORS.paper : COLORS.ink, borderRadius: 3, cursor: 'pointer', textTransform: 'capitalize' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: COLORS.graphite, marginBottom: 4 }}>Format</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['iif', 'csv'] as Format[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  style={{ padding: '6px 12px', border: `1px solid ${format === f ? COLORS.ink : COLORS.rule}`, background: format === f ? COLORS.ink : '#fff', color: format === f ? COLORS.paper : COLORS.ink, borderRadius: 3, cursor: 'pointer', textTransform: 'uppercase' }}
                >
                  {f}
                </button>
              ))}
            </div>
            {format === 'iif' && (
              <div style={{ fontSize: 12, color: COLORS.brass, marginTop: 6 }}>
                Note: QuickBooks Online no longer accepts IIF — for QBO use CSV. IIF is still supported in QuickBooks Desktop.
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12, padding: 8, background: COLORS.paper, border: `1px solid ${COLORS.rule}`, borderRadius: 3, fontSize: 12, color: COLORS.graphite }}>
            {loading ? 'Loading source data…' : (
              <>In range: {countIn} invoices, {countPay} payments, {vendors.length} vendors total.</>
            )}
          </div>

          <button
            onClick={generate}
            disabled={loading}
            style={{ padding: '10px 20px', background: COLORS.green, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 4, fontWeight: 600, fontSize: 14 }}
          >
            Generate &amp; download
          </button>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: '#fff', border: `1px solid ${COLORS.rule}`, borderRadius: 4 }}>
          <h4 style={{ marginTop: 0 }}>CSI → GL mapping (default)</h4>
          <div style={{ fontSize: 12, color: COLORS.graphite, marginBottom: 8 }}>
            Editable at <code>src/lib/quickbooks-gl-map.json</code>. Per-org override coming when we ship a chart-of-accounts admin UI.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, fontSize: 12 }}>
            {Object.entries(GL.csi).map(([div, acc]) => (
              <div key={div} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 4px', borderBottom: `1px dotted ${COLORS.rule}` }}>
                <span>CSI {div}</span>
                <span style={{ color: COLORS.graphite }}>{acc.account} — {acc.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
