'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ACCENT, ACCENT_DIM, ACCENT_GLOW, BG_PANEL, BORDER, TEXT_PRIMARY, TEXT_DIM, type GeneratedImage } from './shared';

function Btn({ label, accent, onClick }: { label: string; accent?: boolean; onClick: () => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} style={{
      background: accent ? ACCENT : 'rgba(0,0,0,0.5)', color: accent ? '#000' : TEXT_PRIMARY,
      border: `1px solid ${accent ? ACCENT : 'rgba(255,255,255,0.2)'}`,
      borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
      fontFamily: 'monospace', fontWeight: accent ? 700 : 500, backdropFilter: 'blur(4px)',
    }}>{label}</button>
  );
}

const REFINE_CHIPS = ['Change material','Warmer colors','Cooler tones','More modern','More traditional','Keep layout, change style'];

function Card({ gen, onSave, onRefine, onMoreLike, onExtract, isExtracting }: {
  gen: GeneratedImage; onSave: () => void; onRefine: (p: string) => void;
  onMoreLike: () => void; onExtract: () => void; isExtracting: boolean;
}) {
  const [showRefine, setShowRefine] = useState(false);
  const [refineText, setRefineText] = useState('');
  const [hover, setHover] = useState(false);

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: gen.saved ? `2px solid ${ACCENT}` : `1px solid ${BORDER}`, background: BG_PANEL, boxShadow: gen.saved ? `0 0 20px ${ACCENT_DIM}` : 'none' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ position: 'relative', width: '100%', paddingBottom: '75%', overflow: 'hidden' }}>
        <img src={gen.imageUrl} alt={gen.prompt} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        {gen.saved && <div style={{ position: 'absolute', top: 8, right: 8, background: ACCENT, color: '#000', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, fontFamily: 'monospace', boxShadow: `0 0 10px ${ACCENT_GLOW}` }}>SAVED</div>}
        <AnimatePresence>
          {hover && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.85))', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 12, gap: 6 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Btn label={gen.saved ? '+ Saved' : '+ Save'} accent={gen.saved} onClick={onSave} />
              <Btn label="More Like This" onClick={onMoreLike} />
              <Btn label="Refine" onClick={() => setShowRefine(!showRefine)} />
              <Btn label={isExtracting ? 'Extracting...' : 'Extract'} onClick={onExtract} />
            </div>
          </motion.div>}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {showRefine && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ padding: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {REFINE_CHIPS.map(q => <button key={q} onClick={() => { onRefine(q); setShowRefine(false); }}
                style={{ background: ACCENT_DIM, color: ACCENT, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' }}>{q}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={refineText} onChange={(e) => setRefineText(e.target.value)} placeholder="Custom refinement..."
                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', color: TEXT_PRIMARY, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, fontFamily: 'monospace', outline: 'none' }}
                onKeyDown={(e) => { if (e.key === 'Enter' && refineText) { onRefine(refineText); setShowRefine(false); }}} />
              <button onClick={() => { if (refineText) { onRefine(refineText); setShowRefine(false); }}}
                style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace' }}>Apply</button>
            </div>
          </div>
        </motion.div>}
      </AnimatePresence>
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${BORDER}` }}>
        <p style={{ fontSize: 11, color: TEXT_DIM, margin: 0, fontFamily: 'monospace', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gen.prompt}</p>
        {gen.refinements.length > 0 && <p style={{ fontSize: 10, color: ACCENT, margin: '4px 0 0', fontFamily: 'monospace', opacity: 0.7 }}>+ {gen.refinements.length} refinement{gen.refinements.length > 1 ? 's' : ''}</p>}
      </div>
    </motion.div>
  );
}

interface Props {
  generations: GeneratedImage[]; extractingId: string | null;
  onSave: (id: string) => void; onRefine: (id: string, p: string) => void;
  onMoreLike: (id: string) => void; onExtract: (id: string) => void;
}

export default function GenerationGrid({ generations, extractingId, onSave, onRefine, onMoreLike, onExtract }: Props) {
  if (!generations.length) return (
    <div style={{ textAlign: 'center', padding: 60, color: TEXT_DIM, fontFamily: 'monospace' }}>
      <p style={{ fontSize: 40, margin: '0 0 12px' }}>✏️</p>
      <p style={{ fontSize: 14 }}>Write a design brief and generate your first concepts</p>
    </div>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      <AnimatePresence>
        {generations.map(g => <Card key={g.id} gen={g} onSave={() => onSave(g.id)} onRefine={(p) => onRefine(g.id, p)} onMoreLike={() => onMoreLike(g.id)} onExtract={() => onExtract(g.id)} isExtracting={extractingId === g.id} />)}
      </AnimatePresence>
    </div>
  );
}
