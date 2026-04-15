'use client';
import { motion } from 'framer-motion';
import { ACCENT, ACCENT_DIM, ACCENT_GLOW, BORDER, TEXT_PRIMARY, TEXT_DIM, type BoardItem, type DesignToken, type StyleControlValues } from './shared';

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color: ACCENT, margin: '0 0 12px', fontFamily: 'monospace', letterSpacing: '2px', paddingBottom: 6, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }} />{title}
      </h3>{children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (<div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
    <span style={{ fontSize: 12, color: TEXT_DIM, fontFamily: 'monospace' }}>{label}</span>
    <span style={{ fontSize: 12, color: TEXT_PRIMARY, fontWeight: 600, fontFamily: 'monospace' }}>{value}</span>
  </div>);
}

function label(v: number, lo: string, hi: string) { return v < 30 ? lo : v > 70 ? hi : 'Contemporary'; }

export default function SpecSheet({ board, tokens, brief, controls, onBuildBlueprint }: {
  board: BoardItem[]; tokens: DesignToken[]; brief: string; controls: StyleControlValues; onBuildBlueprint: () => void;
}) {
  const rooms = [...new Set(board.map(b => b.room))];
  const categories = [...new Set(tokens.map(t => t.category))];
  const cost = Math.round((50000 + board.length * 15000) * (0.5 + (controls.budgetLevel / 100) * 2));

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32, padding: '24px 0', borderBottom: `2px solid ${ACCENT}`, position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent 0%, ${ACCENT} 30%, ${ACCENT} 70%, transparent 100%)`, boxShadow: `0 0 12px ${ACCENT_GLOW}` }} />
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: TEXT_PRIMARY, letterSpacing: '-0.5px' }}>DESIGN SPECIFICATION SHEET</h2>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: TEXT_DIM, fontFamily: 'monospace' }}>Generated from AI Design Studio</p>
      </div>

      <Sec title="DESIGN BRIEF"><p style={{ fontSize: 14, color: TEXT_PRIMARY, lineHeight: 1.6, margin: 0 }}>{brief || 'No brief provided'}</p></Sec>

      <Sec title="STYLE PARAMETERS">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
          <Row label="Architectural Style" value={label(controls.architecturalStyle, 'Traditional', 'Avant-Garde')} />
          <Row label="Color Direction" value={label(controls.colorWarmth, 'Cool Palette', 'Warm Palette')} />
          <Row label="Material Preference" value={label(controls.materialPreference, 'Natural', 'Synthetic')} />
          <Row label="Budget Tier" value={label(controls.budgetLevel, 'Budget-Conscious', 'Premium/Luxury')} />
          <Row label="Era Influence" value={label(controls.eraInfluence, 'Classic', 'Futuristic')} />
        </div>
      </Sec>

      <Sec title="ROOMS & SPACES">
        {!rooms.length ? <p style={{ fontSize: 13, color: TEXT_DIM, fontStyle: 'italic' }}>No rooms configured yet.</p>
         : rooms.map(room => <div key={room} style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: ACCENT, margin: '0 0 6px', fontFamily: 'monospace' }}>{room}</h4>
            <p style={{ fontSize: 12, color: TEXT_DIM, margin: 0, fontFamily: 'monospace' }}>{board.filter(b => b.room === room).length} concept(s) saved</p>
          </div>)}
      </Sec>

      <Sec title="MATERIALS PALETTE">
        {!tokens.length ? <p style={{ fontSize: 13, color: TEXT_DIM, fontStyle: 'italic' }}>Extract elements from designs to populate this.</p>
         : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {categories.map(cat => <div key={cat} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 10, border: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: 11, color: TEXT_DIM, margin: '0 0 6px', fontFamily: 'monospace' }}>{cat}</p>
              {tokens.filter(t => t.category === cat).map(t => <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: t.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: TEXT_PRIMARY, fontFamily: 'monospace' }}>{t.label}</span>
              </div>)}
            </div>)}
          </div>}
      </Sec>

      <Sec title="ESTIMATED COST">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: 16, background: ACCENT_DIM, borderRadius: 8, border: `1px solid ${BORDER}` }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: ACCENT }}>${cost.toLocaleString()}</span>
          <span style={{ fontSize: 13, color: TEXT_DIM, fontFamily: 'monospace' }}>estimated total</span>
        </div>
        <p style={{ fontSize: 11, color: TEXT_DIM, marginTop: 8, fontFamily: 'monospace' }}>* Preliminary AI estimate. Actual costs vary by region and market.</p>
      </Sec>

      <motion.button whileHover={{ scale: 1.02, boxShadow: `0 0 50px ${ACCENT_GLOW}` }} whileTap={{ scale: 0.98 }} onClick={onBuildBlueprint}
        style={{ width: '100%', padding: '18px 24px', marginTop: 32, background: `linear-gradient(135deg, ${ACCENT}, #0088AA)`, color: '#000', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.5px', boxShadow: `0 0 30px ${ACCENT_GLOW}`, position: 'relative', overflow: 'hidden' }}>
        <span style={{ position: 'relative' }}>BUILD BLUEPRINT</span>
      </motion.button>
      <p style={{ textAlign: 'center', fontSize: 11, color: TEXT_DIM, marginTop: 8, fontFamily: 'monospace' }}>Compile your design board into a spec for the 3D visualization pipeline</p>
    </div>
  );
}
