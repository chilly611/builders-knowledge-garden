'use client';

/**
 * PanelScheduleClient
 * ===================
 * Field-friendly form for MEP load calc + panel directory.
 *
 * Flow:
 *  1. User picks buildingType + sqft + optional loads.
 *  2. "Calculate" → GET /api/v1/load-calc → renders breakdown + service.
 *  3. "Generate panel directory" → client computes a 40-circuit schedule.
 *  4. "Export PDF" → jsPDF rendering.
 *
 * No LLM. All math is deterministic.
 */

import { useState } from 'react';
import {
  generatePanelDirectory,
  VA_PER_SQFT,
  type LoadCalcInput,
  type LoadCalcResult,
  type PanelDirectory,
} from '@/lib/mep-load-calc';

const BUILDING_TYPES: Array<{ value: string; label: string }> = [
  { value: 'single_family', label: 'Single-family dwelling' },
  { value: 'multi_family',  label: 'Multi-family dwelling' },
  { value: 'adu',           label: 'ADU' },
  { value: 'office',        label: 'Office (commercial)' },
  { value: 'retail',        label: 'Retail' },
  { value: 'restaurant',    label: 'Restaurant' },
  { value: 'warehouse',     label: 'Warehouse' },
  { value: 'industrial',    label: 'Industrial' },
  { value: 'medical',       label: 'Medical office' },
  { value: 'school',        label: 'School' },
  { value: 'hospital',      label: 'Hospital' },
];

const COLORS = {
  paper:    '#FAF8F2',
  ink:      '#1A1A1A',
  graphite: '#3D3D3D',
  faded:    '#B8B5AC',
  rule:     '#D8D2C2',
  green:    '#1D9E75',
  red:      '#E8443A',
  amber:    '#C4A44A',
  teal:     '#2E9E9A', // Plan stage accent
};

interface ApiResponse {
  input: LoadCalcInput;
  electrical: LoadCalcResult;
  hvac: { tons: number; rounded: number; rtuRecommendation: string; sqftPerTon: number; notes: string[] };
  plumbing: { occupants: number; wc: number; lav: number; urinal: number; drinkingFountain: number; mopSink: number; notes: string[] };
  citations: string[];
}

export default function PanelScheduleClient() {
  const [buildingType, setBuildingType] = useState('office');
  const [sqft, setSqft] = useState('4200');
  const [hvacKW, setHvacKW] = useState('');
  const [waterHeaterKW, setWaterHeaterKW] = useState('');
  const [rangeKW, setRangeKW] = useState('');
  const [evChargerKW, setEvChargerKW] = useState('');
  const [smallAppliance, setSmallAppliance] = useState('');
  const [laundry, setLaundry] = useState('');

  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [panel, setPanel] = useState<PanelDirectory | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function calculate() {
    setCalculating(true);
    setError(null);
    setPanel(null);
    try {
      const params = new URLSearchParams({
        buildingType,
        sqft: String(Number(sqft) || 0),
      });
      if (hvacKW)         params.set('hvacKW', hvacKW);
      if (waterHeaterKW)  params.set('waterHeaterKW', waterHeaterKW);
      if (rangeKW)        params.set('rangeKW', rangeKW);
      if (evChargerKW)    params.set('evChargerKW', evChargerKW);
      if (smallAppliance) params.set('smallAppliance', smallAppliance);
      if (laundry)        params.set('laundry', laundry);

      const r = await fetch(`/api/v1/load-calc?${params.toString()}`);
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${r.status}`);
      }
      const data = (await r.json()) as ApiResponse;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  }

  function generatePanel() {
    if (!result) return;
    const directory = generatePanelDirectory(result.electrical, result.input);
    setPanel(directory);
  }

  async function exportPDF() {
    if (!result || !panel) return;
    // Lazy-load jsPDF — same pattern as contract PDF.
    const jsPDF = (await import('jspdf')).default;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

    doc.setFontSize(16);
    doc.text('Panel Schedule', 18, 22);
    doc.setFontSize(10);
    doc.text(
      `${panel.panelName} — ${panel.serviceAmps}A ${panel.voltage}`,
      18,
      29
    );
    doc.text(`Generated ${new Date().toLocaleDateString()}`, 18, 34);

    // Load summary
    doc.setFontSize(12);
    doc.text('Service-load calculation (NEC Article 220)', 18, 44);
    doc.setFontSize(9);
    let y = 50;
    const lines = [
      `Building type: ${result.input.buildingType}    Sqft: ${result.input.sqft}`,
      `General lighting (220.12): ${result.electrical.generalLightingVA} VA`,
      `Small appliance:           ${result.electrical.smallApplianceVA} VA`,
      `Laundry:                   ${result.electrical.laundryVA} VA`,
      `HVAC (×1.25 per 220.50):   ${result.electrical.hvacVA} VA`,
      `Water heater:              ${result.electrical.waterHeaterVA} VA`,
      `Range (220.55):            ${result.electrical.rangeVA} VA`,
      `EV charger (625.42 ×1.25): ${result.electrical.evChargerVA} VA`,
      `--`,
      `Total connected:           ${result.electrical.totalConnectedVA} VA`,
      `Total demand (${result.electrical.method}): ${result.electrical.totalDemandVA} VA`,
      `Calculated current:        ${result.electrical.calculatedAmps} A`,
      `Recommended service:       ${result.electrical.serviceDescription}`,
    ];
    for (const line of lines) {
      doc.text(line, 18, y);
      y += 5;
    }

    // Panel directory header
    y += 6;
    doc.setFontSize(12);
    doc.text('Panel directory (40 circuits)', 18, y);
    y += 6;
    doc.setFontSize(8);
    doc.text('#', 18, y);
    doc.text('Leg', 26, y);
    doc.text('Description', 38, y);
    doc.text('Brkr', 130, y);
    doc.text('Wire', 145, y);
    doc.text('Load VA', 168, y);
    y += 4;
    doc.line(18, y, 195, y);
    y += 4;

    for (const c of panel.circuits) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(String(c.number), 18, y);
      doc.text(c.leg, 26, y);
      doc.text(c.description.slice(0, 55), 38, y);
      doc.text(`${c.breakerAmps}A`, 130, y);
      doc.text(c.wireSize, 145, y);
      doc.text(String(c.loadVA), 168, y);
      y += 4.5;
    }

    // Notes
    if (y > 240) { doc.addPage(); y = 20; }
    y += 6;
    doc.setFontSize(11);
    doc.text('Notes', 18, y);
    y += 5;
    doc.setFontSize(8);
    for (const note of [...panel.notes, ...result.electrical.notes]) {
      const wrapped = doc.splitTextToSize(note, 170);
      doc.text(wrapped, 18, y);
      y += 4 * wrapped.length;
    }

    // Citations footer
    if (y > 240) { doc.addPage(); y = 20; }
    y += 6;
    doc.setFontSize(11);
    doc.text('Code citations', 18, y);
    y += 5;
    doc.setFontSize(8);
    for (const c of result.citations) {
      doc.text(c, 18, y);
      y += 4;
    }

    doc.save(`panel-schedule-${result.input.buildingType}-${result.input.sqft}sqft.pdf`);
  }

  return (
    <div style={{ background: COLORS.paper, minHeight: '100vh', padding: '32px 24px', color: COLORS.ink, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: COLORS.teal, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Plan · MEP
          </span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px' }}>Panel schedule generator</h1>
        <p style={{ color: COLORS.graphite, margin: '0 0 24px', maxWidth: 780 }}>
          NEC Article 220 service-load calc with auto-balanced 40-circuit panel directory.
          All math is deterministic — no LLM, every number reproducible on paper.
          Citations included.
        </p>

        {/* Form card */}
        <section style={{ background: '#fff', border: `1px solid ${COLORS.rule}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 16px' }}>1. Project inputs</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Building type">
              <select
                value={buildingType}
                onChange={(e) => setBuildingType(e.target.value)}
                style={inputStyle}
              >
                {BUILDING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} ({VA_PER_SQFT[t.value]} VA/sqft)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Square footage">
              <input
                type="number"
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                placeholder="4200"
                style={inputStyle}
              />
            </Field>
            <Field label="HVAC load (kW) — optional">
              <input type="number" value={hvacKW} onChange={(e) => setHvacKW(e.target.value)} placeholder="e.g. 12" style={inputStyle} />
            </Field>
            <Field label="Water heater (kW) — optional">
              <input type="number" value={waterHeaterKW} onChange={(e) => setWaterHeaterKW(e.target.value)} placeholder="e.g. 4.5" style={inputStyle} />
            </Field>
            <Field label="Range (kW) — optional">
              <input type="number" value={rangeKW} onChange={(e) => setRangeKW(e.target.value)} placeholder="e.g. 8" style={inputStyle} />
            </Field>
            <Field label="EV charger (kW) — optional">
              <input type="number" value={evChargerKW} onChange={(e) => setEvChargerKW(e.target.value)} placeholder="e.g. 7.7" style={inputStyle} />
            </Field>
            <Field label="Small-appliance circuits (1500 VA ea.)">
              <input type="number" value={smallAppliance} onChange={(e) => setSmallAppliance(e.target.value)} placeholder="e.g. 2 for residential" style={inputStyle} />
            </Field>
            <Field label="Laundry circuits (1500 VA ea.)">
              <input type="number" value={laundry} onChange={(e) => setLaundry(e.target.value)} placeholder="e.g. 1" style={inputStyle} />
            </Field>
          </div>
          <button
            onClick={calculate}
            disabled={calculating || !sqft}
            style={{
              marginTop: 20,
              background: COLORS.teal,
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 600,
              cursor: calculating ? 'wait' : 'pointer',
              opacity: calculating ? 0.6 : 1,
            }}
          >
            {calculating ? 'Calculating…' : 'Calculate load'}
          </button>
          {error && <div style={{ marginTop: 12, color: COLORS.red }}>{error}</div>}
        </section>

        {/* Results */}
        {result && (
          <section style={{ background: '#fff', border: `1px solid ${COLORS.rule}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, margin: '0 0 16px' }}>2. Load calculation</h2>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: '#F4EFE4' }}>
                  <th style={th}>Load</th>
                  <th style={{ ...th, textAlign: 'right' }}>Connected VA</th>
                  <th style={{ ...th, textAlign: 'left' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                <Row label="General lighting" va={result.electrical.generalLightingVA} src="NEC 220.12" />
                <Row label="Small appliance" va={result.electrical.smallApplianceVA} src="NEC 220.52(A)" />
                <Row label="Laundry" va={result.electrical.laundryVA} src="NEC 220.52(B)" />
                <Row label="HVAC (×1.25)" va={result.electrical.hvacVA} src="NEC 220.50 / 430.24" />
                <Row label="Water heater" va={result.electrical.waterHeaterVA} src="Nameplate" />
                <Row label="Range" va={result.electrical.rangeVA} src="NEC 220.55" />
                <Row label="EV charger (×1.25)" va={result.electrical.evChargerVA} src="NEC 625.42" />
                <tr style={{ borderTop: `2px solid ${COLORS.rule}`, fontWeight: 700 }}>
                  <td style={td}>Total connected</td>
                  <td style={{ ...td, textAlign: 'right' }}>{result.electrical.totalConnectedVA.toLocaleString()} VA</td>
                  <td style={td} />
                </tr>
                <tr style={{ fontWeight: 700, color: COLORS.teal }}>
                  <td style={td}>Total demand ({result.electrical.method})</td>
                  <td style={{ ...td, textAlign: 'right' }}>{result.electrical.totalDemandVA.toLocaleString()} VA</td>
                  <td style={td}>NEC {result.electrical.method}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: 20, padding: 16, background: '#F4EFE4', borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: COLORS.graphite, marginBottom: 4 }}>Recommended service</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.teal }}>
                {result.electrical.serviceDescription}
              </div>
              <div style={{ fontSize: 13, color: COLORS.graphite, marginTop: 4 }}>
                Calculated current: {result.electrical.calculatedAmps} A — rounded up to next standard size.
              </div>
            </div>

            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', color: COLORS.graphite, fontSize: 13 }}>
                Show calculation notes ({result.electrical.notes.length})
              </summary>
              <ul style={{ marginTop: 8, fontSize: 13, color: COLORS.graphite }}>
                {result.electrical.notes.map((n, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{n}</li>
                ))}
              </ul>
            </details>

            <div style={{ marginTop: 16, fontSize: 12, color: COLORS.graphite }}>
              <strong>Citations:</strong> {result.citations.join(' · ')}
            </div>

            <button
              onClick={generatePanel}
              style={{
                marginTop: 20,
                background: COLORS.ink,
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Generate panel directory →
            </button>
          </section>
        )}

        {/* Panel directory */}
        {panel && (
          <section style={{ background: '#fff', border: `1px solid ${COLORS.rule}`, borderRadius: 10, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>
                3. {panel.panelName} — {panel.serviceAmps}A {panel.voltage}
              </h2>
              <button
                onClick={exportPDF}
                style={{
                  background: COLORS.green,
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Export to PDF
              </button>
            </div>
            <div style={{ fontSize: 13, color: COLORS.graphite, marginBottom: 12 }}>
              Leg balance: A = {panel.legALoadVA.toLocaleString()} VA, B = {panel.legBLoadVA.toLocaleString()} VA
              (imbalance {panel.imbalancePct}%)
            </div>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: '#F4EFE4' }}>
                  <th style={th}>#</th>
                  <th style={th}>Leg</th>
                  <th style={{ ...th, textAlign: 'left' }}>Description</th>
                  <th style={th}>Breaker</th>
                  <th style={th}>Wire</th>
                  <th style={{ ...th, textAlign: 'right' }}>Load VA</th>
                </tr>
              </thead>
              <tbody>
                {panel.circuits.map((c) => (
                  <tr key={c.number} style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
                    <td style={td}>{c.number}</td>
                    <td style={td}>{c.leg}</td>
                    <td style={{ ...td, textAlign: 'left' }}>{c.description}</td>
                    <td style={td}>{c.breakerAmps}A</td>
                    <td style={td}>{c.wireSize}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{c.loadVA.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul style={{ marginTop: 16, fontSize: 12, color: COLORS.graphite }}>
              {panel.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: `1px solid ${COLORS.rule}`,
  borderRadius: 6,
  fontSize: 14,
  background: '#fff',
  color: COLORS.ink,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
};

const th: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'center',
  fontWeight: 600,
  color: COLORS.graphite,
  borderBottom: `1px solid ${COLORS.rule}`,
};

const td: React.CSSProperties = {
  padding: '6px 10px',
  textAlign: 'center',
  color: COLORS.ink,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 13, color: COLORS.graphite }}>
      <span style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  );
}

function Row({ label, va, src }: { label: string; va: number; src: string }) {
  return (
    <tr style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
      <td style={td}>{label}</td>
      <td style={{ ...td, textAlign: 'right' }}>{va.toLocaleString()}</td>
      <td style={{ ...td, textAlign: 'left', color: COLORS.graphite, fontSize: 12 }}>{src}</td>
    </tr>
  );
}
