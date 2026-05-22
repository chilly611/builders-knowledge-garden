'use client';

/**
 * EquipmentScheduleClient
 * =======================
 * HVAC tonnage rule-of-thumb + UPC 422.1 plumbing fixture count.
 *
 * All math runs client-side via src/lib/mep-load-calc helpers.
 * No LLM. No network calls unless the user exports a PDF.
 */

import { useState } from 'react';
import {
  calculateHvacTons,
  calculatePlumbingFixtures,
  SQFT_PER_TON,
  type HvacTonsResult,
  type PlumbingFixtureResult,
} from '@/lib/mep-load-calc';

const BUILDING_TYPES: Array<{ value: string; label: string }> = [
  { value: 'office',      label: 'Office (Class B commercial)' },
  { value: 'retail',      label: 'Retail' },
  { value: 'restaurant',  label: 'Restaurant' },
  { value: 'warehouse',   label: 'Warehouse' },
  { value: 'industrial',  label: 'Industrial / light manufacturing' },
  { value: 'medical',     label: 'Medical office' },
  { value: 'school',      label: 'School' },
  { value: 'hospital',    label: 'Hospital' },
  { value: 'single_family', label: 'Single-family dwelling' },
  { value: 'multi_family',  label: 'Multi-family dwelling' },
];

const COLORS = {
  paper:    '#FAF8F2',
  ink:      '#1A1A1A',
  graphite: '#3D3D3D',
  faded:    '#B8B5AC',
  rule:     '#D8D2C2',
  green:    '#1D9E75',
  amber:    '#C4A44A',
  red:      '#E8443A',
  teal:     '#2E9E9A', // Plan stage accent
};

export default function EquipmentScheduleClient() {
  const [buildingType, setBuildingType] = useState('office');
  const [sqft, setSqft] = useState('4200');
  const [occupantsOverride, setOccupantsOverride] = useState('');

  const [hvac, setHvac] = useState<HvacTonsResult | null>(null);
  const [plumbing, setPlumbing] = useState<PlumbingFixtureResult | null>(null);

  function calculate() {
    const sqftNum = Number(sqft) || 0;
    const occ = occupantsOverride ? Number(occupantsOverride) : undefined;
    setHvac(calculateHvacTons(buildingType, sqftNum));
    setPlumbing(calculatePlumbingFixtures(buildingType, sqftNum, occ));
  }

  async function exportPDF() {
    if (!hvac || !plumbing) return;
    const jsPDF = (await import('jspdf')).default;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

    doc.setFontSize(16);
    doc.text('Equipment Schedule', 18, 22);
    doc.setFontSize(10);
    doc.text(`${buildingType} · ${sqft} sqft`, 18, 29);
    doc.text(`Generated ${new Date().toLocaleDateString()}`, 18, 34);

    let y = 46;
    doc.setFontSize(12);
    doc.text('HVAC tonnage (rule-of-thumb)', 18, y); y += 6;
    doc.setFontSize(9);
    const hvacLines = [
      `Calculated: ${hvac.tons.toFixed(2)} tons (${hvac.sqftPerTon} sqft/ton)`,
      `Rounded: ${hvac.rounded} tons`,
      `Recommendation: ${hvac.rtuRecommendation}`,
    ];
    for (const l of hvacLines) { doc.text(l, 18, y); y += 5; }

    y += 4;
    doc.setFontSize(12);
    doc.text('Plumbing fixture count (UPC 422.1)', 18, y); y += 6;
    doc.setFontSize(9);
    const plumbLines = [
      `Occupant load: ${plumbing.occupants}`,
      `Water closets: ${plumbing.wc}`,
      `Lavatories:    ${plumbing.lav}`,
      `Urinals:       ${plumbing.urinal}`,
      `Drinking fountains: ${plumbing.drinkingFountain}`,
      `Mop sinks:     ${plumbing.mopSink}`,
    ];
    for (const l of plumbLines) { doc.text(l, 18, y); y += 5; }

    y += 4;
    doc.setFontSize(11);
    doc.text('Notes', 18, y); y += 5;
    doc.setFontSize(8);
    for (const n of [...hvac.notes, ...plumbing.notes]) {
      const wrapped = doc.splitTextToSize(n, 170);
      doc.text(wrapped, 18, y);
      y += 4 * wrapped.length;
    }

    y += 4;
    doc.setFontSize(11);
    doc.text('Code citations', 18, y); y += 5;
    doc.setFontSize(8);
    const citations = [
      'ASHRAE 90.1 — Energy Standard for Buildings Except Low-Rise Residential',
      'ASHRAE 62.1 — Ventilation for Acceptable Indoor Air Quality',
      'UPC 422.1 — Minimum Plumbing Fixture Count',
      'CPC Table 4-1 — Minimum Plumbing Facilities (California)',
      'CBC 1004.5 — Occupant Load Factors',
      'ACCA Manual J / Manual N — Recommended for permit-grade HVAC sizing',
    ];
    for (const c of citations) { doc.text(c, 18, y); y += 4; }

    doc.save(`equipment-schedule-${buildingType}-${sqft}sqft.pdf`);
  }

  return (
    <div style={{ background: COLORS.paper, minHeight: '100vh', padding: '32px 24px', color: COLORS.ink, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: COLORS.teal, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Plan · MEP
          </span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px' }}>Equipment schedule</h1>
        <p style={{ color: COLORS.graphite, margin: '0 0 24px', maxWidth: 780 }}>
          HVAC tonnage rule-of-thumb sizing plus UPC plumbing fixture count
          for commercial TI / new build. Deterministic math, code citations
          included.
        </p>

        <div style={{ background: '#FFF4D6', border: `1px solid ${COLORS.amber}`, borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 13 }}>
          <strong>Rule-of-thumb only.</strong> Permit-grade HVAC selection requires ACCA
          Manual J (residential) or Manual N (commercial). UPC 422.1 fixture
          counts here use a simplified combined-occupancy ratio — the real
          standard separates M/F counts and applies several footnotes. Use
          this for early MEP scoping, not for signed drawings.
        </div>

        <section style={{ background: '#fff', border: `1px solid ${COLORS.rule}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 16px' }}>Inputs</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Field label="Building type">
              <select value={buildingType} onChange={(e) => setBuildingType(e.target.value)} style={inputStyle}>
                {BUILDING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} ({SQFT_PER_TON[t.value]} sqft/ton)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Square footage">
              <input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="4200" style={inputStyle} />
            </Field>
            <Field label="Occupant load (optional override)">
              <input type="number" value={occupantsOverride} onChange={(e) => setOccupantsOverride(e.target.value)} placeholder="leave blank to derive" style={inputStyle} />
            </Field>
          </div>
          <button
            onClick={calculate}
            disabled={!sqft}
            style={{
              marginTop: 20,
              background: COLORS.teal,
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Calculate
          </button>
        </section>

        {hvac && (
          <section style={{ background: '#fff', border: `1px solid ${COLORS.rule}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, margin: '0 0 16px' }}>HVAC tonnage</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <Stat label="Calculated" value={`${hvac.tons.toFixed(2)} tons`} sub={`${sqft} sqft / ${hvac.sqftPerTon} sqft per ton`} />
              <Stat label="Recommended" value={`${hvac.rounded} tons`} sub={hvac.rtuRecommendation} accent />
            </div>
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', color: COLORS.graphite, fontSize: 13 }}>Notes ({hvac.notes.length})</summary>
              <ul style={{ marginTop: 8, fontSize: 13, color: COLORS.graphite }}>
                {hvac.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </details>
          </section>
        )}

        {plumbing && (
          <section style={{ background: '#fff', border: `1px solid ${COLORS.rule}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, margin: '0 0 16px' }}>
              Plumbing fixtures {plumbing.occupants > 0 && <span style={{ fontSize: 14, color: COLORS.graphite, fontWeight: 400 }}>· {plumbing.occupants} occupants</span>}
            </h2>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: '#F4EFE4' }}>
                  <th style={th}>Fixture</th>
                  <th style={{ ...th, textAlign: 'right' }}>Required count</th>
                  <th style={{ ...th, textAlign: 'left' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                <FRow label="Water closets" count={plumbing.wc} src="UPC 422.1" />
                <FRow label="Lavatories" count={plumbing.lav} src="UPC 422.1" />
                <FRow label="Urinals" count={plumbing.urinal} src="UPC 422.2 (substitution)" />
                <FRow label="Drinking fountains" count={plumbing.drinkingFountain} src="UPC 422.1 / CPC 4-1" />
                <FRow label="Mop sinks" count={plumbing.mopSink} src="UPC 422.1 (1 per floor min)" />
              </tbody>
            </table>
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', color: COLORS.graphite, fontSize: 13 }}>Notes ({plumbing.notes.length})</summary>
              <ul style={{ marginTop: 8, fontSize: 13, color: COLORS.graphite }}>
                {plumbing.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </details>
          </section>
        )}

        {hvac && plumbing && (
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={exportPDF}
              style={{
                background: COLORS.green,
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Export equipment schedule (PDF)
            </button>
            <div style={{ alignSelf: 'center', fontSize: 12, color: COLORS.graphite }}>
              Citations: ASHRAE 90.1 · ASHRAE 62.1 · UPC 422.1 · CPC Table 4-1 · CBC 1004.5 · ACCA Manual J/N
            </div>
          </div>
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
  padding: '8px 10px',
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

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{ background: accent ? '#F4EFE4' : 'transparent', borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 13, color: COLORS.graphite, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ? COLORS.teal : COLORS.ink }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: COLORS.graphite, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function FRow({ label, count, src }: { label: string; count: number; src: string }) {
  return (
    <tr style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
      <td style={{ ...td, textAlign: 'left' }}>{label}</td>
      <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{count}</td>
      <td style={{ ...td, textAlign: 'left', color: COLORS.graphite, fontSize: 12 }}>{src}</td>
    </tr>
  );
}
