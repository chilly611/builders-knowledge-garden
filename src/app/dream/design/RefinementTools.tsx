'use client';
import { motion } from 'framer-motion';
import { ACCENT, ACCENT_DIM, ACCENT_GLOW, BG_PANEL, BORDER, TEXT_PRIMARY, TEXT_DIM } from './shared';

export function BlueprintLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 24 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `3px solid ${BORDER}`, borderTopColor: ACCENT }} />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 12, borderRadius: '50%', border: `2px solid ${BORDER}`, borderBottomColor: ACCENT, opacity: 0.5 }} />
        <motion.div animate={{ scale: [0.8,1.2,0.8], opacity: [0.3,0.8,0.3] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ position: 'absolute', inset: 30, borderRadius: '50%', background: `radial-gradient(circle, ${ACCENT}33, transparent)` }} />
      </div>
      <motion.p animate={{ opacity: [0.4,1,0.4] }} transition={{ duration: 2, repeat: Infinity }}
        style={{ fontSize: 14, color: ACCENT, fontFamily: 'monospace', margin: 0 }}>Generating design concepts...</motion.p>
      <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
        {[0,1,2,3,4].map(i => <motion.div key={i} animate={{ scaleY: [1,2.5,1], opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i*0.12 }} style={{ width: 3, height: 16, background: ACCENT, borderRadius: 2 }} />)}
      </div>
    </div>
  );
}

export function WorkspaceTabs({ activeTab, generationCount, boardCount, onTabChange }: {
  activeTab: 'results'|'board'|'specs'; generationCount: number; boardCount: number; onTabChange: (t: 'results'|'board'|'specs') => void;
}) {
  const tabs = [
    { key: 'results' as const, label: 'Generated', count: generationCount },
    { key: 'board' as const, label: 'Design Board', count: boardCount },
    { key: 'specs' as const, label: 'Spec Sheet' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: BG_PANEL, borderRadius: 10, padding: 4, border: `1px solid ${BORDER}` }}>
      {tabs.map(t => <button key={t.key} onClick={() => onTabChange(t.key)} style={{
        flex: 1, padding: '10px 16px', background: activeTab === t.key ? ACCENT_DIM : 'transparent',
        color: activeTab === t.key ? ACCENT : TEXT_DIM, border: activeTab === t.key ? `1px solid ${BORDER}` : '1px solid transparent',
        borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace', position: 'relative',
      }}>{t.label}{t.count !== undefined ? ` (${t.count})` : ''}
        {activeTab === t.key && <div style={{ position: 'absolute', bottom: -1, left: '20%', right: '20%', height: 2, background: ACCENT, borderRadius: 1, boxShadow: `0 0 8px ${ACCENT_GLOW}` }} />}
      </button>)}
    </div>
  );
}

export function GenerateBar({ brief, onBriefChange, onGenerate, onAdjustSliders }: {
  brief: string; onBriefChange: (v: string) => void; onGenerate: () => void; onAdjustSliders: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'stretch' }}>
      <textarea value={brief} onChange={(e) => onBriefChange(e.target.value)} placeholder="Describe your next design concept..." rows={2}
        style={{ flex: 1, background: BG_PANEL, color: TEXT_PRIMARY, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onGenerate} disabled={!brief.trim()}
          style={{ flex: 1, padding: '10px 20px', background: brief.trim() ? `linear-gradient(135deg, ${ACCENT}, #0088AA)` : 'rgba(255,255,255,0.06)',
            color: brief.trim() ? '#000' : TEXT_DIM, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: brief.trim() ? 'pointer' : 'default', fontFamily: 'monospace', whiteSpace: 'nowrap', boxShadow: brief.trim() ? `0 0 12px ${ACCENT_GLOW}` : 'none' }}>Generate</motion.button>
        <button onClick={onAdjustSliders} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.04)', color: TEXT_DIM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' }}>Adjust Sliders</button>
      </div>
    </div>
  );
}

export function RoomPicker({ open, rooms, onSelect, onClose }: {
  open: boolean; rooms: string[]; onSelect: (r: string) => void; onClose: () => void;
}) {
  if (!open) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()}
        style={{ background: '#0F1623', borderRadius: 16, border: `1px solid ${BORDER}`, padding: 24, maxWidth: 360, width: '90%' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY }}>Save to Room</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {rooms.map(r => <motion.button key={r} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => onSelect(r)}
            style={{ padding: '12px 16px', background: ACCENT_DIM, color: TEXT_PRIMARY, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'monospace', textAlign: 'left' }}>{r}</motion.button>)}
        </div>
      </motion.div>
    </motion.div>
  );
}
